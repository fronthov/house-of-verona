import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import {membershipPriceAt,PROMO_END_AT,hmacHex,membershipPaymentMode} from '../src/commerce-expansion.js';
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

test('public checkout stays disabled with test keys',()=>{
 const env={RAZORPAY_KEY_ID:'rzp_test_123',RAZORPAY_KEY_SECRET:'testsecret',RAZORPAY_WEBHOOK_SECRET:'webhook',MEMBERSHIP_TEST_MODE:'true'};
 assert.equal(membershipPaymentMode(env), 'disabled');
 assert.equal(membershipPaymentMode(env,{admin:false}), 'disabled');
 assert.equal(membershipPaymentMode(env,{admin:true}), 'test');
 env.MEMBERSHIP_PAYMENTS_ENABLED='true';
 assert.equal(membershipPaymentMode(env,{admin:true}), 'disabled');
});
test('live checkout requires live credentials and explicit flag',()=>{
 const env={RAZORPAY_KEY_ID:'rzp_live_123',RAZORPAY_KEY_SECRET:'livesecret',RAZORPAY_WEBHOOK_SECRET:'webhook'};
 assert.equal(membershipPaymentMode(env,{admin:true}), 'disabled');
 env.MEMBERSHIP_PAYMENTS_ENABLED='true';
 assert.equal(membershipPaymentMode(env,{admin:false}), 'live');
});
test('test payments cannot grant live member benefit in the activation routine',()=>{
 const source=readFileSync(new URL('../src/commerce-expansion.js',import.meta.url),'utf8');
 assert.match(source,/if\(!isTest\)\{/);
 assert.match(source,/INSERT INTO hov_member_cards/);
 assert.match(source,/if\(isTestTransaction\(env\)\)return json/);
 assert.match(source,/test_verified/);
});

test('live pilot is restricted to founder or explicitly selected pilot email',()=>{
 const env={
   RAZORPAY_KEY_ID:'rzp_live_teststub',RAZORPAY_KEY_SECRET:'example',RAZORPAY_WEBHOOK_SECRET:'example',
   MEMBERSHIP_PAYMENTS_ENABLED:'true',MEMBERSHIP_LIVE_PILOT_ONLY:'true',
   MEMBERSHIP_LIVE_PILOT_EMAIL:'pilot@example.com'
 };
 assert.equal(membershipPaymentMode(env,{admin:false,email:'stranger@example.com'}),'disabled');
 assert.equal(membershipPaymentMode(env,{admin:true,email:'owner@example.com'}),'live');
 assert.equal(membershipPaymentMode(env,{admin:false,email:'pilot@example.com'}),'live');
 env.MEMBERSHIP_LIVE_PILOT_ONLY='false';
 assert.equal(membershipPaymentMode(env,{admin:false,email:'stranger@example.com'}),'live');
});

// Frozen public-launch access rules: ₹999 live memberships allowed, founder ₹1 checkout disabled.
test('public annual membership accepts live payments without founder pilot gate',()=>{
 const env={RAZORPAY_KEY_ID:'rzp_live_sample',RAZORPAY_KEY_SECRET:'secret',RAZORPAY_WEBHOOK_SECRET:'secret',
  MEMBERSHIP_PAYMENTS_ENABLED:'true',MEMBERSHIP_LIVE_PILOT_ONLY:'false',ADMIN_ONE_RUPEE_TEST_ENABLED:'false'};
 assert.equal(membershipPaymentMode(env,null),'live');
 assert.equal(membershipPaymentMode(env,{email:'customer@example.com',admin:false}),'live');
});
