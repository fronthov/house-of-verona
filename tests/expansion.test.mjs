import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import {membershipPriceAt,PROMO_END_AT,hmacHex} from '../src/commerce-expansion.js';
test('2027 promotional membership boundary uses Indian Standard Time',()=>{
 assert.equal(membershipPriceAt(PROMO_END_AT-1),999);
 assert.equal(membershipPriceAt(PROMO_END_AT),999);
 assert.equal(membershipPriceAt(PROMO_END_AT+1),9999);
});
test('membership signature uses HMAC SHA256, no payment activation by browser',async()=>{
 const key='test-secret-do-not-use-in-production';
 const message='order_abc|pay_123';
 const a=await hmacHex(key,message);
 assert.match(a,/^[a-f0-9]{64}$/);
 assert.notEqual(a,await hmacHex(key,'order_fake|pay_123'));
});
