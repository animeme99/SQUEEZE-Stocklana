import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createDemoServer} from '../scripts/serve.mjs';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('demo forces sample mode and blocks network connections',()=>{
  const html=read('demo/index.html');
  assert.match(html,/data-sample-only="true"/);
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/form-action 'none'/);
  assert.match(html,/script-src 'self'/);
  assert.doesNotMatch(html,/\/src\/app\.mjs/);
});
test('delivered client parses and contains the real sample-only entry boundary',()=>{
  const code=read('demo/preview.js');
  new vm.Script(code);
  assert.match(code,/dataset\.sampleOnly/);
  assert.match(code,/createSampleSession/);
});
test('submission fields fit the supplied form limits',()=>{
  const info=JSON.parse(read('submission/project-info.json'));
  assert.equal(info.projectName,'SQUEEZE');
  assert.ok(info.shortDescription.length>0&&info.shortDescription.length<=280);
  assert.ok(info.fullDescription.length>0&&info.fullDescription.length<=5000);
});
test('local server serves demo assets and denies non-demo/private paths',async()=>{
  const server=createDemoServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try{
    assert.equal((await fetch(base+'/')).status,200);
    assert.match((await fetch(base+'/preview.js')).headers.get('content-type'),/javascript/);
    assert.equal((await fetch(base+'/assets/brand/logo.webp')).status,200);
    for(const path of ['/../README.md','/%2e%2e%2fREADME.md','/.env','/.git/config','/api/wallet','/src/amounts.mjs','/_headers'])assert.equal((await fetch(base+path)).status,404,path);
    assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
