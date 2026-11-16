// House of Verona — purchased Veronates membership: exactly one calendar year.
// No card is granted on test payments or client-side payment screens.
export function oneCalendarYearAfter(purchasedAt) {
 const n=Number(purchasedAt);
 if(!Number.isSafeInteger(n)||n<=0)throw new Error('Invalid membership purchase time');
 // Convert to local IST wall-clock time before moving the calendar forward.
 // This matters for leap-day purchases between midnight and 05:29 IST:
 // UTC would still be 28 February, which incorrectly expires on 1 March.
 const istSeconds=19800;
 const local=new Date((n+istSeconds)*1000);
 const year=local.getUTCFullYear()+1,month=local.getUTCMonth();
 const lastDay=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 const endAsLocalUTC=Date.UTC(year,month,Math.min(local.getUTCDate(),lastDay),
   local.getUTCHours(),local.getUTCMinutes(),local.getUTCSeconds());
 return Math.floor(endAsLocalUTC/1000)-istSeconds;
}
export const isAnnualCardActive=(card,at=Math.floor(Date.now()/1000))=>
 !!card&&card.revoked_at==null&&Number(card.purchased_at)<=at&&Number(card.expires_at)>at;
export const cardNumberFromPayment = paymentAttemptId =>
  'HOV-V-'+String(paymentAttemptId).replace(/[^A-Za-z0-9]/g,'').slice(0,19).toUpperCase();
export const cardName = input=>String(input??'').trim().replace(/\s+/g,' ').slice(0,80);
export const formatIndianDate = sec=>new Date(sec*1000).toLocaleString('en-IN',{
 timeZone:'Asia/Kolkata',day:'2-digit',month:'long',year:'numeric',
 hour:'2-digit',minute:'2-digit',hour12:true
});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
export function cardEmailHtml(card) {
 const name=esc(card.member_name),number=esc(card.card_id);
 return '<div style="background:#f6f2e9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#251c17">'+
 '<div style="max-width:560px;margin:0 auto"><h2 style="margin:0 0 18px">HOUSE OF VERONA</h2>'+
 '<p>Your verified Veronates membership card is ready.</p>'+
 '<div style="background:#063c2e;color:#f0d2a0;border:2px solid #c9a461;border-radius:18px;padding:25px">'+
 '<img src="https://houseofverona.in/assets/hov-emblem.webp" width="64" height="64" alt="House of Verona" style="border-radius:50%;display:block;margin-bottom:14px">'+
 '<div style="font-size:12px;letter-spacing:3px">VERONATES · ANNUAL MEMBER</div>'+
 '<h2 style="color:#fff6e5;margin:12px 0">'+name+'</h2>'+
 '<p>Member ID: <strong>'+number+'</strong></p>'+
 '<p>Activated: '+esc(formatIndianDate(card.purchased_at))+' IST</p>'+
 '<p>Expires: '+esc(formatIndianDate(card.expires_at))+' IST</p></div>'+
 '<p>Membership discounts are available on eligible tea and coffee weight tiers until the expiry time above. No automatic renewal is scheduled.</p>'+
 '<p><a href="https://houseofverona.in/membership-card.html">Open, print or save your membership card</a> (sign in with the email used to purchase).</p>'+
 '<p>For assistance: <a href="mailto:info@houseofverona.in">info@houseofverona.in</a></p>'+
 '<small>India in Every Sip · Fairness in Every Cup</small></div></div>';
}
export async function cardForUser(env,userId) {
 return env.DB.prepare('SELECT card_id,user_id,member_name,razorpay_order_id,razorpay_payment_id,purchased_at,expires_at,email_sent_at,email_claimed_at,revoked_at FROM hov_member_cards WHERE user_id=?')
  .bind(userId).first();
}
export async function notifyCardByEmail(env,card,email,sendEmail,{force=false}={}){
 if(!card)return false;
 const now=Math.floor(Date.now()/1000);
 // Prevent repeated notifications; a customer may request at most one re-email per 24 hours.
 if(!force&&card.email_sent_at)return true;
 if(force&&card.email_sent_at&&now-card.email_sent_at<86400)return true;
 const claim=await env.DB.prepare(
   'UPDATE hov_member_cards SET email_claimed_at=? WHERE card_id=? AND (email_claimed_at IS NULL OR email_claimed_at<?)')
   .bind(now,card.card_id,now-300).run();
 if(!claim.meta.changes)return false;
 try{
   await sendEmail(env,email,'Your House of Verona Veronates membership card',cardEmailHtml(card));
   await env.DB.prepare('UPDATE hov_member_cards SET email_sent_at=?, email_claimed_at=NULL WHERE card_id=?')
    .bind(now,card.card_id).run();
   return true;
 }catch(e){
   await env.DB.prepare('UPDATE hov_member_cards SET email_claimed_at=NULL WHERE card_id=?').bind(card.card_id).run();
   console.error('Membership card email delivery deferred',card.card_id);
   return false;
 }
}
