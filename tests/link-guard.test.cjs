const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../extension/core.js');
const index=require('../extension/chapter-index.js');
const {install}=require('../extension/link-guard.js');
const catalogue='https://www.novelcool.com/novel/Marquis-of-Grand-Xia.html';
const ad='https://mechanismexplained.com/go/rds/?data=encrypted';
function anchor(text,href=ad,extra={}) {
  const attrs={href,...extra};
  return {tagName:'A',textContent:text,getAttribute:k=>attrs[k]??null,setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k],hasAttribute:k=>k in attrs};
}
function harness(anchors,base=catalogue,active=true) {
  const listeners={};const navigated=[];
  const win={location:{href:base,assign:u=>navigated.push(u)},addEventListener:(name,fn)=>listeners[name]=fn,MutationObserver:class{constructor(fn){this.callback=fn;}observe(){}}};
  const doc={readyState:'complete',getElementById:()=>({textContent:ad}),querySelectorAll:()=>anchors};
  const guard=install(win,doc,core,index,{enabled:()=>active});
  function click(a,extra={}) {
    const e={type:'click',button:0,composedPath:()=>[{tagName:'SPAN'},a],preventDefault(){this.cancelled=true},stopImmediatePropagation(){this.stopped=true},...extra};
    listeners[e.type](e);return e;
  }
  return {click,navigated,guard};
}
test('server-wrapped catalogue link is repaired and a tap navigates',()=>{
  const a=anchor('Marquis of Grand Xia Chapter 61',ad,{target:'_blank'});
  const h=harness([a]);assert.equal(a.getAttribute('href'),index[61]);assert.equal(a.getAttribute('target'),null);
  const e=h.click(a,{defaultPrevented:true});assert.deepEqual(h.navigated,[index[61]]);assert.ok(e.cancelled&&e.stopped);
});
test('both encrypted previous/next metadata fields recover using the current chapter',()=>{
  const prev=anchor('<<Prev'),next=anchor('Next>>');const h=harness([prev,next],index[61]);
  h.click(prev);h.click(next);assert.deepEqual(h.navigated,[index[60],index[62]]);
});
test('all 132 indexed chapter titles resolve, including every chapter 61 to 80',()=>{
  assert.equal(Object.keys(index).length,132);
  for(const [n,url] of Object.entries(index))assert.equal(core.destination({href:ad,title:`Marquis of Grand Xia Chapter ${n}`,text:'date'},catalogue,{},index),url);
  for(let n=61;n<=80;n++)assert.ok(index[n]);
});
test('late ad rewrite is repaired at click time',()=>{
  const a=anchor('Next>>',index[62]);const h=harness([a],index[61]);a.setAttribute('href',ad);h.click(a);assert.deepEqual(h.navigated,[index[62]]);
});
test('unknown ads remain blocked without navigating to an invented destination',()=>{
  const a=anchor('Advertisement');const h=harness([a]);assert.ok(h.click(a).cancelled);assert.deepEqual(h.navigated,[]);
  assert.equal(core.destination({href:ad,text:'Next>>'},index[86],{},index),null);
  assert.equal(core.destination({href:ad,text:'Marquis of Grand Xia Chapter 61'},'https://www.novelcool.com/novel/Other.html',{},index),null);
});
test('valid metadata works for another novel and rejects malicious metadata',()=>{
  const base='https://www.novelcool.com/chapter/Other-1/123/';
  assert.equal(core.destination({href:ad,text:'Next>>'},base,{next:'/chapter/Other-2/987/'},index),'https://www.novelcool.com/chapter/Other-2/987/');
  assert.equal(core.destination({href:ad,text:'Next>>'},base,{next:'javascript:alert(1)'},index),null);
});
test('disabled protection leaves links and events unchanged',()=>{
  const a=anchor('Marquis of Grand Xia Chapter 61');const h=harness([a],catalogue,false);const e=h.click(a);
  assert.equal(a.getAttribute('href'),ad);assert.equal(e.cancelled,undefined);assert.deepEqual(h.navigated,[]);
});
test('modified clicks retain native new-tab behavior with the repaired href',()=>{
  const a=anchor('Marquis of Grand Xia Chapter 61');const h=harness([a]);const e=h.click(a,{metaKey:true});
  assert.equal(e.cancelled,undefined);assert.equal(a.getAttribute('href'),index[61]);assert.deepEqual(h.navigated,[]);
});
test('html chapter links navigate and Start Reading uses a verified first chapter',()=>{
  const a=anchor('Cover',index[134].replace(/\/$/,'.html')),b=anchor('Start Reading');const h=harness([a,b]);
  h.click(a);h.click(b);assert.deepEqual(h.navigated,[index[134].replace(/\/$/,'.html'),index[1]]);
});
