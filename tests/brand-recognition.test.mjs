import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../src/index.js';
const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const canonical='https://houseofverona.in/';
const jsonld=html=>JSON.parse(html.match(/<script type="application\\/ld\\+json">(.*?)<\\/script>/s)[1]);
test('official HoV logo is identified as one organization in homepage and brand markup',()=>{
 const home=jsonld(load('public/index.html'));
 const brand=jsonld(load('public/brand.html'));
 const org=home['@graph'].find(x=>x['@type']==='Organization');
 const orgBrand=brand['@graph'].find(x=>x['@type']==='Organization');
 const image=brand['@graph'].find(x=>x['@type']==='ImageObject');
 assert.equal(org['@id'],orgBrand['@id']);
 assert.equal(org.logo['@id'],image['@id']);
 assert.equal(image.contentUrl,canonical+'assets/house-of-verona-official-logo-nagpur.png');
 assert.match(image.description,/official logo of House of Verona/i);
 assert.match(load('public/brand.html'),/Scan to Visit the Official House/);
 assert.match(load('public/brand.html'),/house-of-verona-official-website-qr.png/);
});
test('existing storefront and brand navigation remain',()=>{
 const home=load('public/index.html');
 for(const id of ['bagBtn','accountBtn','products','membershipBtn','franchiseBtn'])assert.ok(home.includes('id="'+id+'"'),id);
 assert.match(home,/src="\\/tea-collection\\.js"/);
 assert.match(home,/href="\\/brand"/);
 assert.match(load('public/robots.txt'),/Sitemap: https:\\/\\/houseofverona\\.in\\/sitemap\\.xml/);
});
test('image sitemaps expose both official HoV logo images without changing canonical pages',async()=>{
 const staticXml=load('public/sitemap.xml');
 assert.match(staticXml,/xmlns:image="http:\\/\\/www\\.google\\.com\\/schemas\\/sitemap-image\\/1\\.1"/);
 const env={DB:{prepare(sql){if(sql.startsWith('SELECT COUNT'))return{first:async()=>({n:0})};return {all:async()=>({results:[]})}}},ASSETS:{fetch:async()=>new Response(null,{status:404})},STORE_OPEN:'true'};
 const result=await worker.fetch(new Request(canonical+'sitemap.xml'),env);
 const dynamic=await result.text();
 assert.equal(result.status,200);
 for(const file of ['house-of-verona-official-logo-nagpur.png','house-of-verona-gold-emblem-nagpur.png']){
  assert.ok(staticXml.includes(file));assert.ok(dynamic.includes(file));
 }
});
