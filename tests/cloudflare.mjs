import assert from 'node:assert/strict';
import worker from '../cloudflare/entry.mjs';
let assetCalls=0;const env={ASSETS:{fetch:async()=>{assetCalls++;return new Response('store')}}};
for(const path of ['/api/account','/api/commerce/stock','/api/commerce/create']){
 const r=await worker.fetch(new Request('https://example.test'+path,{headers:{'oai-authenticated-user-id':'admin','oai-authenticated-user-email':'owner@example.com'}}),env);
 assert.equal(r.status,503);
}
assert.equal((await worker.fetch(new Request('https://example.test/'),env)).status,503);assert.equal(assetCalls,0);
assert.equal((await worker.fetch(new Request('https://example.test/'),{...env,PREVIEW_ENABLED:'true'})).status,200);assert.equal(assetCalls,1);
assert.equal((await (await worker.fetch(new Request('https://example.test/api/health'),env)).json()).checkout,false);
console.log('PASS: forged identity cannot unlock APIs; maintenance gate precedes assets; preview is explicit; checkout remains closed.');
