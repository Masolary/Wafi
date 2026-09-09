const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const core=require('../extension/core.js');
const base='https://www.novelcool.com/chapter/Marquis-of-Grand-Xia-Chapter-44/1080153/';
test('relative chapter links resolve without guessing IDs',()=>assert.equal(core.chapter('/chapter/Marquis-of-Grand-Xia-Chapter-46/1083330/',base),'https://www.novelcool.com/chapter/Marquis-of-Grand-Xia-Chapter-46/1083330/'));
test('reject unsafe or foreign URLs',()=>{
  for(const value of ['javascript:alert(1)','data:text/html,bad','https://novelcool.com.evil.test/chapter/A/1/','https://novelcool.com@evil.test/chapter/A/1/','https://user@novelcool.com/chapter/A/1/','https://novelcool.com:123/chapter/A/1/','https://novelcool.com/chapter/A/not-id/']) assert.equal(core.chapter(value,base),null,value);
});
test('legitimate NovelCool subdomain is accepted',()=>assert.ok(core.chapter('https://es.novelcool.com/chapter/A/12/',base)));
test('recognize both observed redirect domains and rotated /go/rds links',()=>{
  for(const value of ['https://mechanismexplained.com/go/rds/?data=x','https://explorefunctionality.com/go/rds/?data=x','https://new.example/go/rds/?data=x']) assert.equal(core.isRedirect(value,base),true);
  assert.equal(core.isRedirect(base,base),false);
});
test('navigation uses actual targets and deduplicates',()=>{
  const prev='/chapter/Story-Chapter-43/444/';const next='/chapter/Story-Chapter-45/987/';
  const nav=core.navigation([{href:prev,text:'<<Prev'},{href:next,text:'Next>>'},{href:next,text:'Chapter 45'},{href:'/novel/Story.html',text:'Story'},{href:'https://evil.test/',text:'Next'}],base);
  assert.equal(nav.chapters.length,2);assert.equal(nav.next,new URL(next,base).href);assert.equal(nav.previous,new URL(prev,base).href);assert.equal(nav.catalogue,'https://www.novelcool.com/novel/Story.html');
  assert.equal(nav.chapters[1].label,'Chapter 45');
});
test('malformed URL escapes do not crash navigation',()=>assert.doesNotThrow(()=>core.navigation([{href:'/chapter/%E0%A4%A/1/',text:''}],base)));
test('missing navigation is null; never invent chapter URLs',()=>assert.deepEqual(core.navigation([],base),{previous:null,next:null,catalogue:null,chapters:[]}));
test('preferences clamp font size and reject unknown themes',()=>{
  assert.deepEqual(core.preferences({fontSize:999,theme:'evil'}),{fontSize:32,theme:'paper'});
  assert.equal(core.preferences({fontSize:-3}).fontSize,16);
  assert.equal(core.preferences({fontSize:'oops'}).fontSize,20);
});
test('protection only matches NovelCool chapter and novel documents',()=>{
  const [rule]=require('../extension/rules.json');const re=new RegExp(rule.condition.regexFilter);
  for(const u of [base,'http://novelcool.com/novel/A.html','https://es.novelcool.com/chapter/A/1/'])assert.ok(re.test(u));
  for(const u of ['https://evil.test/novel/A','https://novelcool.com.evil.test/chapter/A/1/','https://novelcool.com/login','https://novelcool.com/'])assert.equal(re.test(u),false);
  assert.deepEqual(rule.condition.resourceTypes,['main_frame']);
  assert.equal(rule.action.responseHeaders[0].operation,'append');
  assert.match(rule.action.responseHeaders[0].value,/script-src 'none'/);
});
test('all manifest resources exist and permissions are narrow',()=>{
  const m=require('../extension/manifest.json');assert.equal(m.manifest_version,3);
  assert.deepEqual(m.host_permissions,['*://*.novelcool.com/*']);
  assert.ok(!m.permissions.includes('tabs'));assert.ok(!m.permissions.includes('cookies'));
  for(const resource of [...m.content_scripts.flatMap(x=>x.js),...Object.values(m.icons),m.action.default_popup,...m.declarative_net_request.rule_resources.map(x=>x.path)])assert.ok(fs.existsSync(path.join(__dirname,'../extension',resource)));
});
test('JavaScript files parse',()=>{
  for(const f of ['chapter-index.js','core.js','link-guard.js','content.js','popup.js'])new vm.Script(fs.readFileSync(path.join(__dirname,'../extension',f),'utf8'));
});
