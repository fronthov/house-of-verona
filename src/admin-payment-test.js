// Razorpay's ₹1 live admin verification is separate from actual Veronates membership.
// A test receipt/card never grants paid tea/coffee discounts.
import {oneCalendarYearAfter,formatIndianDate} from './member-cards.js';
export const adminTestEnabled=(env,user)=>
  user?.admin===true && env.ADMIN_ONE_RUPEE_TEST_ENABLED==='true' &&
  env.MEMBERSHIP_PAYMENTS_ENABLED==='true' &&
  String(env.RAZORPAY_KEY_ID||'').startsWith('rzp_live_') &&
  !!env.RAZORPAY_KEY_SECRET && !!env.RAZORPAY_WEBHOOK_SECRET;
export const adminTestCardNumber=(id)=>'HOV-T-'+String(id).replace(/[^a-zA-Z0-9]/g,'').slice(0,19).toUpperCase();
export const adminTestCard=(r)=>r?.status==='paid'&&r?.card_id?{
  id:r.card_id,name:r.member_name,
  purchasedAt:r.purchased_at,expiresAt:r.expires_at,
  status:r.revoked_at?'refunded':'verification_only',
  paymentVerified:true,emailAccepted:!!r.email_sent_at,amount:1,
  grantsMembership:false
}:null;
export const annualAdminTestExpiry=oneCalendarYearAfter;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
export function adminTestEmailHtml(r){
 const name=escape(r.member_name),id=escape(r.card_id);
 return '<div style="background:#f6f2e9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#251c17">'+
 '<div style="max-width:560px;margin:auto">'+
 '<h2>HOUSE OF VERONA</h2><p>Razorpay LIVE verification completed: ₹1 captured.</p>'+
 '<div style="background:#073c2d;color:#f1ddb6;border:2px solid #caa86c;border-radius:18px;padding:27px">'+
 '<img src="https://houseofverona.in/assets/hov-emblem.webp" alt="House of Verona" width="60" height="60">'+
 '<h3 style="color:#f8e5c4">VERONATES — VERIFICATION CARD</h3>'+
 '<p style="font-size:20px;color:white">'+name+'</p><p>Verification ID: '+id+'</p>'+
 '<p>Payment verified: '+escape(formatIndianDate(r.purchased_at))+' IST</p>'+
 '<p>Anniversary example: '+escape(formatIndianDate(r.expires_at))+' IST</p>'+
 '<p><b>ADMIN TEST ONLY · NOT A PAID MEMBERSHIP</b></p></div>'+
 '<p>This card verifies the ₹1 Razorpay live payment, automatic card generation and email workflow. '+
 'It does not activate Veronates discounts or substitute for a ₹999 one-year membership.</p>'+
 '<p><a href="https://houseofverona.in/admin-payment-test.html">View or print your verification card</a> (admin login required).</p>'+
 '<small>India in Every Sip · House of Verona</small></div></div>';
}
export async function emailAdminTestCard(env,r,email,sendEmail){
 if(!r||r.status!=='paid'||!r.card_id)return false;
 if(r.email_sent_at)return true;
 const send=await sendEmail(env,email,'House of Verona — ₹1 Razorpay verification card',adminTestEmailHtml(r))
   .then(()=>true).catch(()=>false);
 if(!send)return false;
 await env.DB.prepare(
   'UPDATE hov_admin_payment_tests SET email_sent_at=COALESCE(email_sent_at,?) WHERE id=? AND status=?'
 ).bind(Math.floor(Date.now()/1000),r.id,'paid').run();
 return true;
}
