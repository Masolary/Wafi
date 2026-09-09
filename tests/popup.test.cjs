const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync(require('node:path').join(__dirname,'../extension/popup.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup({enabled=true,rulesFail=false,storageFail=false,initFail=false}={}) {
  let ids=enabled?['protection']:[];
  let saved;
  const elements={enabled:{checked:false,disabled:false,addEventListener:(type,fn)=>{elements.enabled.change=fn;}},status:{textContent:''}};
  const browser={declarativeNetRequest:{getEnabledRulesets:async()=>{if(initFail)throw Error('unsupported');return ids;},updateEnabledRulesets:async args=>{if(rulesFail)throw Error('denied');ids=args.enableRulesetIds.slice();}},storage:{local:{set:async value=>{if(storageFail)throw Error('full');saved=value;}}}};
  vm.runInNewContext(code,{browser,document:{getElementById:id=>elements[id]}});
  return {elements,get ids(){return ids},get saved(){return saved}};
}
test('popup reflects active protection',async()=>{const t=setup();await tick();assert.equal(t.elements.enabled.checked,true);assert.equal(t.elements.enabled.disabled,false)});
test('disabling updates rules and content-script preference together',async()=>{const t=setup();await tick();t.elements.enabled.checked=false;await t.elements.enabled.change();assert.equal(t.ids.length,0);assert.equal(t.saved.disabled,true);assert.match(t.elements.status.textContent,/Reload/)});
test('enabling updates rules and preference',async()=>{const t=setup({enabled:false});await tick();t.elements.enabled.checked=true;await t.elements.enabled.change();assert.equal(t.ids[0],'protection');assert.equal(t.saved.disabled,false)});
test('rule update failure restores the checkbox',async()=>{const t=setup({rulesFail:true});await tick();t.elements.enabled.checked=false;await t.elements.enabled.change();assert.equal(t.elements.enabled.checked,true);assert.match(t.elements.status.textContent,/failed/)});
test('storage failure rolls back rules',async()=>{const t=setup({storageFail:true});await tick();t.elements.enabled.checked=false;await t.elements.enabled.change();assert.equal(t.ids[0],'protection');assert.equal(t.elements.enabled.checked,true)});
test('unavailable DNR API keeps toggle disabled and explains error',async()=>{const t=setup({initFail:true});await tick();assert.equal(t.elements.enabled.disabled,true);assert.match(t.elements.status.textContent,/Could not/)});
test('disabled content script makes no DOM changes and needs no DNR access',async()=>{
  const content=fs.readFileSync(require('node:path').join(__dirname,'../extension/content.js'),'utf8');
  let queries=0;
  const window={NovelCoolGuard:require('../extension/core.js'),addEventListener:()=>{}};
  vm.runInNewContext(content,{window,browser:{storage:{local:{get:async()=>({disabled:true})}}},document:{querySelectorAll:()=>{queries++;throw Error('unexpected DOM change')}},console});
  await tick();assert.equal(queries,0);
});
