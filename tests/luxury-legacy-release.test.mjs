import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=(s)=>readFileSync(new URL('../'+s,import.meta.url),'utf8');
test('legacy live checkout remains intact and payment release not introduced',()=>{const src=read('src/index.js');assert.match(src,/\/api\/orders/);assert.doesNotMatch(src,/\/api\/membership\/offer/);assert.doesNotMatch(src,/RAZORPAY_KEY_SECRET/);assert.match(src,/\/api\/health/);});
test('store configuration follows live legacy site and retains secrets',()=>{const cfg=JSON.parse(read('wrangler.jsonc'));assert.equal(cfg.name,'house-of-verona');assert.equal(cfg.vars.STORE_OPEN,'true');assert.equal(cfg.keep_vars,true);assert.ok(!('MEMBERSHIP_PAYMENTS_ENABLED' in cfg.vars));});
test('luxury homepage includes coffee and tea imagery and all existing buttons',()=>{const s=read('public/index.html');for(const x of ['id="hov-luxe-hero-heading"','id="roast-profiles"','id="tea-collection"','A Taste of India,','id="shop"','id="products"','id="accountBtn"','id="bagBtn"','id="membershipBtn"','id="franchiseBtn"'])assert.ok(s.includes(x),x);});
test('brand and franchise pages have canonical URLs and real enquiry links',()=>{
 const brand=read('public/brand.html'),franchise=read('public/franchise.html');
 assert.match(brand,/<link rel="canonical" href="https:\/\/houseofverona\.in\/brand">/);
 assert.match(franchise,/<link rel="canonical" href="https:\/\/houseofverona\.in\/franchise">/);
 assert.match(franchise,/wa.me\/918799817395/);
});
