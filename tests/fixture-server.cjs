// Local, synthetic fixtures only. Does not download or redistribute novel text.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost:8765');
  if(u.pathname.startsWith('/extension/')) {
    const name=path.basename(u.pathname);
    const file=path.join(root,'extension',name);
    if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'image/svg+xml');
    return res.end(fs.readFileSync(file));
  }
  if(u.pathname==='/csp') {
    res.setHeader('Content-Security-Policy',require('../extension/rules.json')[0].action.responseHeaders[0].value);
    res.setHeader('Content-Type','text/html');
    return res.end('<h1 id="result">Page scripts blocked successfully</h1><script>document.getElementById("result").textContent="FAIL: script executed"</script><iframe src="/frame"></iframe>');
  }
  const mode=u.searchParams.get('mode')||'normal';
  if(!['normal','unwrapped','gated','disabled','listing','rewritten'].includes(mode)){res.writeHead(400);return res.end();}
  res.setHeader('Content-Type','text/html');
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reader Guard synthetic fixture</title><link rel="stylesheet" href="/extension/page.css"><style>body{margin:0;font:16px system-ui}main{max-width:860px;margin:auto;padding:24px}.hidden{display:none}</style><script>
  window.browser={storage:{local:{get:async()=>({disabled:${mode==='disabled'}}),set:async value=>{window.savedPreferences=value}}}};
  </script><script src="/extension/core.js"></script><script src="/extension/content.js"></script></head><body>
  <main><a href="https://www.novelcool.com/novel/Example.html">Example novel</a>
  <a href="${mode==='rewritten'?'https://mechanismexplained.com/go/rds/?data=opaque':'https://www.novelcool.com/chapter/Example-Chapter-43/301/'}">&lt;&lt;Prev</a>
  <a href="https://www.novelcool.com/chapter/Example-Chapter-45/909/">Next&gt;&gt;</a>
  <div class="hidden" id="prev_chp_url">https://www.novelcool.com/chapter/Example-Chapter-43/301/</div>
  ${mode==='gated'?'<div role="dialog">Please verify your age. You must be 18.</div>':''}
  ${mode==='listing'?'':`<div class="${mode==='unwrapped'?'overflow-hidden':'chapter-reading-section'}"><h2 class="chapter-title">Example Chapter 44</h2>
  <p>This is synthetic test prose, not text from a published novel. The reader must retain the entire paragraph and keep punctuation intact.</p><p>Another paragraph tests wrapping, spacing and comfortable reading. A literal &lt;script&gt; tag must remain text, never executable markup.</p><p>Final paragraph. The last line must appear before the bottom navigation.</p><p style="display:none">HIDDEN CONTENT MUST NOT APPEAR</p></div>`}
  <a href="https://www.novelcool.com/chapter/Example-Chapter-44/502/">Chapter 44</a><a href="https://www.novelcool.com/chapter/Example-Chapter-45/909/">Chapter 45</a>
  <p><a href="https://rotated.example/go/rds/?data=opaque">Synthetic advertising link</a></p>
  <pre id="test-result">Checking…</pre></main><script>
  setTimeout(()=>{
    const shadow=document.getElementById('novelcool-reader-guard')?.shadowRoot;
    const assert=(ok,text)=>{if(!ok)throw Error(text)};
    try {
      if(${mode==='disabled'})assert(!shadow,'Disabled extension changed the page');
      else {
        assert(shadow,'Toolbar missing');
        const dialog=shadow.querySelector('dialog');
        assert(!dialog.textContent.includes('HIDDEN CONTENT'),'Hidden content leaked');
        const clean=[...shadow.querySelectorAll('button')].find(x=>x.textContent==='Clean reading');
        assert(clean.disabled===${mode==='gated'||mode==='listing'},'Clean reader availability is wrong');
        assert(shadow.querySelector('a').href==='https://www.novelcool.com/chapter/Example-Chapter-43/301/','Previous URL not recovered');
        if(!clean.disabled){
          assert(dialog.querySelectorAll('article > p').length===3,'Paragraphs lost');
          clean.click();assert(dialog.open,'Reader did not open');
          const increase=shadow.querySelector('[aria-label="Larger text"]');increase.click();
          assert(dialog.querySelector('article').style.fontSize==='22px','Font size failed');
          [...shadow.querySelectorAll('button')].find(x=>x.textContent==='Close reader').click();assert(!dialog.open,'Reader did not close');
        }
      }
      document.getElementById('test-result').textContent='PASS: ${mode} fixture';
    }catch(e){document.getElementById('test-result').textContent='FAIL: '+e.message}
  },500);</script></body></html>`);
}).listen(8765,'0.0.0.0',()=>console.log('Synthetic UI fixtures: http://localhost:8765/'));
