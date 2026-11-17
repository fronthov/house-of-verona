import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('franchise public site consistently uses 800 sq ft and 2% yearly royalty',()=>{
 const home=read('../public/index.html');
 const franchise=read('../public/franchise.html');
 const app=read('../public/app.js');
 const backend=read('../src/commerce-expansion.js');
 const sql=read('../sql/expansion.sql');
 for(const content of [home,franchise,app]) {
   assert.match(content,/800 sq ft/);
   assert.doesNotMatch(content,/800 sq m|5% brand-support fee|5% annual royalty/i);
 }
 assert.match(backend,/area_sqft/);
 assert.match(backend,/area<800/);
 assert.match(sql,/area_sqft INTEGER NOT NULL CHECK\(area_sqft>=800\)/);
});
test('confidential initial franchise fee is never shipped in the website repository code',()=>{
 const paths=['../public/index.html','../public/franchise.html','../public/vision.html','../public/app.js','../src/commerce-expansion.js','../sql/expansion.sql'];
 for(const path of paths){
   const content=read(path);
   assert.doesNotMatch(content,/20\s*(?:lakh|lac|lakhs|lacs)|20,00,000|2,000,000|2000000/i);
 }
});
test('founder story reinforces quality over heavy interiors and premium all-day positioning',()=>{
 const founder=read('../public/vision.html');
 assert.match(founder,/interiors/);
 assert.match(founder,/beans/);
 assert.match(founder,/premium all-day café/);
 assert.match(founder,/Dishant RD/);
 assert.match(founder,/The World Can Wait/i);
});
test('membership payments remain off until manually enabled and a verified provider is configured',()=>{
 const moduleSource=read('../src/commerce-expansion.js');
 assert.match(moduleSource,/MEMBERSHIP_PAYMENTS_ENABLED==='true'/);
 assert.match(moduleSource,/verifiedCapturedPayment/);
 assert.match(moduleSource,/razorpay_payment_id/);
 assert.match(moduleSource,/RAZORPAY_WEBHOOK_SECRET/);
});
