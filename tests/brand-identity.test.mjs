import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
const root=new URL('../public/',import.meta.url);
const docs=readdirSync(root).filter(n=>n.endsWith('.html'));
test('official House of Verona tagline is fixed in every website wordmark',()=>{
 for(const doc of docs){
   const page=readFileSync(new URL(doc,root),'utf8');
   const wordmarks=[...page.matchAll(/<span class="brand-wordmark">([^<]+)<small>([^<]+)<\/small>/g)];
   assert.ok(wordmarks.length>0,'missing wordmark in '+doc);
   for(const [,brand,tagline] of wordmarks){
     assert.equal(brand,'HOUSE OF VERONA','brand identity changed in '+doc);
     assert.equal(tagline,'INDIA IN EVERY SIP','tagline changed in '+doc);
   }
   assert.match(page,/INDIA IN EVERY SIP/,'missing tagline '+doc);
   assert.doesNotMatch(page,/<small>(?:THE WORLD CAN WAIT|FAIRNESS IN EVERY CUP)<\/small>/);
 }
});
test('SEO pages retain explicit local targeting without replacing brand name',()=>{
 for(const doc of ['specialty-coffee-nagpur.html','orthodox-tea-nagpur.html','coffee-tea-packages-nagpur.html']){
   const s=readFileSync(new URL(doc,root),'utf8');
   assert.match(s,/<title>[^<]*Nagpur[^<]*House of Verona<\/title>/);
   assert.match(s,/HOUSE OF VERONA<small>INDIA IN EVERY SIP<\/small>/);
 }
});

test('India beyond luxury experience preserves truthful origins and permanent tagline',()=>{
 const home=readFileSync(new URL('index.html',root),'utf8');
 assert.match(home,/A Taste of India,<br><em>Beyond Luxury\./);
 assert.match(home,/ONE LAND · DISTINCT ORIGINS · REMARKABLE CUPS/);
 assert.match(home,/Western Ghats/);
 assert.match(home,/KARNATAKA · MANJARABAD/);
 assert.match(home,/ASSAM · BRAHMAPUTRA VALLEY/);
 assert.match(home,/HOUSE OF VERONA<small>INDIA IN EVERY SIP<\/small>/);
 assert.doesNotMatch(home,/pending verification/i);
});
