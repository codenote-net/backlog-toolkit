import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/background.js', import.meta.url), 'utf8');
test('only our matched rules notify the originating tab and frame without URL data', () => {
  let listener;
  const sent = [];
  vm.runInNewContext(source, { chrome: {
    declarativeNetRequest: { onRuleMatchedDebug: { addListener(fn) { listener = fn; } } },
    tabs: { sendMessage(...args) { sent.push(args); return Promise.resolve(); } },
  } });
  listener({rule:{rulesetId:'other'},request:{tabId:7,frameId:0}});
  listener({rule:{rulesetId:'upload_blocking'},request:{tabId:-1,frameId:0}});
  assert.equal(sent.length,0);
  listener({rule:{rulesetId:'upload_blocking'},request:{tabId:7,frameId:2,url:'https://private.invalid/?secret'}});
  assert.deepEqual(JSON.parse(JSON.stringify(sent)),[[7,{type:'backlog-toolkit:upload-blocked'},{frameId:2}]]);
});
test('absence of the unpacked-only event does not crash the worker',()=>{
  assert.doesNotThrow(()=>vm.runInNewContext(source,{chrome:{declarativeNetRequest:{}}}));
});
