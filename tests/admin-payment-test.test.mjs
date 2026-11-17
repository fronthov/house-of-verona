import test from 'node:test';
import assert from 'node:assert/strict';
import {adminTestEnabled,adminTestCard,adminTestEmailHtml,annualAdminTestExpiry} from '../src/admin-payment-test.js';
test('₹1 live test is founder-only with explicit feature flag and real live keys',()=>{
 const env={ADMIN_ONE_RUPEE_TEST_ENABLED:'true',MEMBERSHIP_PAYMENTS_ENABLED:'true',
 RAZORPAY_KEY_ID:'rzp_live_example',RAZORPAY_KEY_SECRET:'secret',RAZORPAY_WEBHOOK_SECRET:'secret'};
 assert.equal(adminTestEnabled(env,{admin:true}),true);
 assert.equal(adminTestEnabled(env,{admin:false}),false);
 assert.equal(adminTestEnabled(env,null),false);
 env.RAZORPAY_KEY_ID='rzp_test_example';assert.equal(adminTestEnabled(env,{admin:true}),false);
 env.RAZORPAY_KEY_ID='rzp_live_example';env.ADMIN_ONE_RUPEE_TEST_ENABLED='false';
 assert.equal(adminTestEnabled(env,{admin:true}),false);
});
test('admin verification card cannot be treated as a membership',()=>{
 const created=Date.parse('2026-11-17T14:00:00+05:30')/1000;
 const c=adminTestCard({status:'paid',member_name:'<Admin>',card_id:'HOV-T-EXAMPLE',
 purchased_at:created,expires_at:annualAdminTestExpiry(created),email_sent_at:created,revoked_at:null});
 assert.equal(c.amount,1);
 assert.equal(c.grantsMembership,false);
 assert.equal(c.status,'verification_only');
 const html=adminTestEmailHtml({member_name:'<Admin>',card_id:c.id,purchased_at:created,expires_at:c.expiresAt});
 assert.match(html,/&lt;Admin&gt;/);
 assert.match(html,/NOT A PAID MEMBERSHIP/);
 assert.doesNotMatch(html,/<Admin>/);
 assert.equal(adminTestCard({status:'created'}),null);
});

test('frozen public release disables old ₹1 founder payment feature',()=>{
 const env={RAZORPAY_KEY_ID:'rzp_live_example',RAZORPAY_KEY_SECRET:'secret',RAZORPAY_WEBHOOK_SECRET:'secret',
  MEMBERSHIP_PAYMENTS_ENABLED:'true',MEMBERSHIP_LIVE_PILOT_ONLY:'false',ADMIN_ONE_RUPEE_TEST_ENABLED:'false'};
 assert.equal(adminTestEnabled(env,{admin:true}),false);
});
