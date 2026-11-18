import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=(f)=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const home=text('public/index.html');
const pages=['specialty-coffee-nagpur.html','orthodox-tea-nagpur.html','coffee-tea-packages-nagpur.html'];
test('Nagpur homepage features quality-led identity and user service intents',()=>{
 assert.match(home,/hard for/);
 assert.match(home,/what you consume/i);
 assert.match(home,/takeaway/i);
 assert.match(home,/gym packs/i);
 assert.match(home,/office packages/i);
 assert.match(home,/specialty-coffee-nagpur\.html/);
 assert.match(home,/orthodox-tea-nagpur\.html/);
 assert.match(home,/coffee-tea-packages-nagpur\.html/);
});
test('all three location landing pages have crawlable SEO tags and internal links',()=>{
 for(const page of pages){
  const doc=text('public/'+page),url='https://houseofverona.in/'+page;
  assert.ok(doc.includes('<title>')&&doc.includes('<h1>'));
  assert.ok(doc.includes('name="description"'));
  assert.ok(doc.includes('rel="canonical" href="'+url+'"'));
  assert.ok(doc.includes('"@type":"WebPage"'));
  assert.ok(doc.includes('Nagpur'));
  assert.ok(doc.includes('href="/#contact"'));
  assert.doesNotMatch(doc,/<meta\s+name="keywords"/i);
  assert.doesNotMatch(doc,/only café in India|only cafe in India|every estate is stocked/i);
 }
});
test('live dynamic Worker sitemap and static fallback discover Nagpur pages',()=>{
 const worker=text('src/index.js');
 const sitemap=text('public/sitemap.xml');
 for(const page of pages){
  assert.ok(worker.includes("https://houseofverona.in/"+page));
  assert.ok(sitemap.includes("https://houseofverona.in/"+page));
 }
});
test('public release payment flags are preserved unchanged in new SEO branch',()=>{
 const config=JSON.parse(text('wrangler.jsonc'));
 assert.equal(config.vars.MEMBERSHIP_PAYMENTS_ENABLED,'true');
 assert.equal(config.vars.MEMBERSHIP_LIVE_PILOT_ONLY,'false');
 assert.equal(config.vars.ADMIN_ONE_RUPEE_TEST_ENABLED,'false');
 assert.equal(config.keep_vars,true);
});
test('SEO pages have no invented fixed prices for gym or office packs',()=>{
 const doc=text('public/coffee-tea-packages-nagpur.html');
 assert.match(doc,/pricing and availability are confirmed|prices are confirmed|pricing are confirmed/i);
 assert.doesNotMatch(doc,/₹[0-9]/);
});
