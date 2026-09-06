#!/usr/bin/env python3
import glob
import json
import lzma
import sqlite3
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parts = sorted((ROOT / "Dictionary" / "payload").glob("alwafi_compact.part*"))
if not parts:
    raise SystemExit("No dictionary payload parts found")

compressed = b"".join(p.read_bytes() for p in parts)
raw = lzma.decompress(compressed)
view = memoryview(raw)
pos = 0

(meta_len,) = struct.unpack_from("<I", view, pos)
pos += 4
meta = json.loads(bytes(view[pos:pos+meta_len]).decode("utf-8"))
pos += meta_len

domains = meta["domains"]
codes = meta["codes"]
quals = meta["quals"]
expected = int(meta["count"])

def read_varint():
    global pos
    value = 0
    shift = 0
    while True:
        b = view[pos]
        pos += 1
        value |= (b & 0x7F) << shift
        if not (b & 0x80):
            return value
        shift += 7

def read_text():
    global pos
    n = read_varint()
    s = bytes(view[pos:pos+n]).decode("utf-8")
    pos += n
    return s

out = ROOT / "AlWafi" / "Resources" / "alwafi_ios.sqlite"
out.parent.mkdir(parents=True, exist_ok=True)
if out.exists():
    out.unlink()

con = sqlite3.connect(out)
con.executescript("""
PRAGMA journal_mode=OFF;
PRAGMA synchronous=OFF;
CREATE TABLE entries(
 id INTEGER PRIMARY KEY,
 direction TEXT NOT NULL,
 domain_en TEXT NOT NULL,
 domain_ar TEXT NOT NULL,
 source_term TEXT NOT NULL,
 target_term TEXT NOT NULL,
 code TEXT NOT NULL,
 qualifier_ar TEXT NOT NULL
);
CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
""")

batch = []
count = 0
while pos < len(view):
    direction_i = int(view[pos]); domain_i = int(view[pos+1]); code_i = int(view[pos+2]); qual_i = int(view[pos+3])
    pos += 4
    source = read_text()
    target = read_text()
    direction = "ar-en" if direction_i == 0 else "en-ar"
    domain_en, domain_ar = domains[domain_i]
    code = codes[code_i]
    qualifier = quals[qual_i]
    count += 1
    batch.append((count, direction, domain_en, domain_ar, source, target, code, qualifier))
    if len(batch) >= 5000:
        con.executemany("INSERT INTO entries VALUES (?,?,?,?,?,?,?,?)", batch)
        batch.clear()

if batch:
    con.executemany("INSERT INTO entries VALUES (?,?,?,?,?,?,?,?)", batch)

if count != expected:
    raise SystemExit(f"Record count mismatch: got {count}, expected {expected}")

con.executescript("""
CREATE INDEX idx_entries_source_nocase ON entries(source_term COLLATE NOCASE);
CREATE INDEX idx_entries_target_nocase ON entries(target_term COLLATE NOCASE);
CREATE INDEX idx_entries_direction ON entries(direction);
""")
con.executemany("INSERT INTO metadata(key,value) VALUES (?,?)", [
    ("name", "Golden Al-Wafi mobile dictionary"),
    ("translation_rows", str(count)),
    ("ar_en_rows", "234700"),
    ("specialist_en_ar_rows", "44393"),
    ("format", "Unicode SQLite"),
    ("build", "self-contained iOS release"),
])
con.commit()
integrity = con.execute("PRAGMA integrity_check").fetchone()[0]
actual = con.execute("SELECT COUNT(*) FROM entries").fetchone()[0]
con.close()

if integrity != "ok" or actual != expected:
    raise SystemExit(f"Database validation failed: integrity={integrity}, count={actual}")

print(f"Built {out} with {actual} translation rows")
