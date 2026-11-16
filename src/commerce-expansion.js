// House of Verona — franchise enquiries and payment-verified annual memberships.
// Keep Razorpay keys and webhook secret in Cloudflare Worker secrets, never GitHub.
import {oneCalendarYearAfter,cardNumberFromPayment,cardName,cardForUser,notifyCardByEmail,isAnnualCardActive} from './member-cards.js';
const stamp = ()=>Math.floor(Date.now()/1000);
const cutoff = Date.parse('2027-10-27T23:59:59+05:30')/1000;
export const PROMO_END_AT=cutoff;
export const membershipPriceAt = (timestamp=stamp()) => timestamp<=cutoff ? 999 : 9999;
export const MEMBER_TIERS = [
 {weight:'500 g to 999 g',percent:5},
 {weight:'1 kg to 2 kg',percent:7},
 {weight:'More than 2 kg to 5 kg',percent:15},
 {weight:'More than 5 kg',percent:25}
];
const html = s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[x]));
const basic = env=>'Basic '+btoa(env.RAZORPAY_KEY_ID+':'+env.RAZORPAY_KEY_SECRET);
export function membershipPaymentMode(env,user=null){
 const hasSecrets=!!env.RAZORPAY_KEY_ID&&!!env.RAZORPAY_KEY_SECRET&&!!env.RAZORPAY_WEBHOOK_SECRET;
 if(!hasSecrets)return 'disabled';
 if(env.MEMBERSHIP_PAYMENTS_ENABLED==='true' && String(env.RAZORPAY_KEY_ID).startsWith('rzp_live_'))return 'live';
 if(env.MEMBERSHIP_PAYMENTS_ENABLED!=='true'&&env.MEMBERSHIP_TEST_MODE==='true'&&user?.admin===true&&String(env.RAZORPAY_KEY_ID).startsWith('rzp_test_'))return 'test';
 return 'disabled';
}
const isRazorpayReady = (env,user)=>membershipPaymentMode(env,user)!=='disabled';
const isTestTransaction=env=>String(env.RAZORPAY_KEY_ID||'').startsWith('rzp_test_');
export async function hmacHex(key,payload){
 const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(payload));
 return Array.from(new Uint8Array(sig),x=>x.toString(16).padStart(2,'0')).join('');
}
function constantHexEqual(a,b){
 if(!/^[a-f0-9]{64}$/i.test(String(a))||!/^[a-f0-9]{64}$/i.test(String(b)))return false;
 let diff=0;
 for(let i=0;i<64;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
async function razorpayRequest(env,verb,path,data){
 const r=await fetch('https://api.razorpay.com/v1/'+path,{
   method:verb,headers:{authorization:basic(env),'content-type':'application/json','accept':'application/json'},
   ...(data?{body:JSON.stringify(data)}:{})
 });
 if(!r.ok){console.error('Razorpay returned',r.status);throw Object.assign(new Error('Payment provider unavailable; please try later'),{status:502})}
 return r.json();
}
async function verifiedCapturedPayment(env,paymentId,attempt){
 const result=await razorpayRequest(env,'GET','payments/'+encodeURIComponent(paymentId));
 return result.status==='captured'&&result.order_id===attempt.razorpay_order_id
   &&result.currency==='INR'&&result.amount===attempt.amount_paise&&result.id===paymentId;
}
async function markMembershipPaid(env,attempt,paymentId,eventId=''){
 const payment=String(paymentId);
 if(!/^pay_[A-Za-z0-9]+$/.test(payment))return false;
 if(attempt.status==='paid')return attempt.razorpay_payment_id===payment;
 if(attempt.status!=='created')return false;
 const isTest=isTestTransaction(env),capturedAt=stamp();
 let request=null;
 if(!isTest){
   request=await env.DB.prepare('SELECT member_name FROM hov_member_card_requests WHERE razorpay_order_id=? AND user_id=?')
     .bind(attempt.razorpay_order_id,attempt.user_id).first();
   if(!request?.member_name)throw Object.assign(new Error('Membership card request needs manual review'),{status:409});
 }
 const statements=[
   env.DB.prepare("UPDATE hov_membership_payments SET status='paid',razorpay_payment_id=?,verified_at=CURRENT_TIMESTAMP WHERE id=? AND status='created'")
     .bind(payment,attempt.id)
 ];
 if(!isTest){
   const cardId=cardNumberFromPayment(attempt.id),expires=oneCalendarYearAfter(capturedAt);
   // One card per user. Expired cards can be replaced on renewed, verified purchase.
   statements.push(env.DB.prepare(
     'INSERT INTO hov_member_cards(card_id,user_id,member_name,razorpay_order_id,razorpay_payment_id,purchased_at,expires_at) '+
     'VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET card_id=excluded.card_id,member_name=excluded.member_name,'+
     'razorpay_order_id=excluded.razorpay_order_id,razorpay_payment_id=excluded.razorpay_payment_id,'+
     'purchased_at=excluded.purchased_at,expires_at=excluded.expires_at,email_sent_at=NULL,email_claimed_at=NULL '+
     'WHERE hov_member_cards.expires_at<=excluded.purchased_at')
     .bind(cardId,attempt.user_id,request.member_name,attempt.razorpay_order_id,payment,capturedAt,expires)
   );
 }
 if(eventId)statements.push(env.DB.prepare(
   'INSERT OR IGNORE INTO hov_payment_events(event_id,razorpay_order_id) VALUES(?,?)')
   .bind(eventId,attempt.razorpay_order_id));
 await env.DB.batch(statements);
 return true;
}
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits=s=>String(s).replace(/\D/g,'');
export async function handleExpansion(req,env,url,deps){
 const {json,fail,requireUser,currentUser,limit,sendEmail,clean,normEmail,rid}=deps;
 const path=url.pathname,method=req.method;
 if(path==='/api/membership/offer'&&method==='GET'){
   const u=await currentUser(req,env);
   return json({annual:true,validity:'One calendar year from verified payment',price:membershipPriceAt(),
     currency:'INR',promotionEnds:'2027-10-27T23:59:59+05:30',afterOfferPrice:9999,
     checkoutEnabled:isRazorpayReady(env,u),testMode:membershipPaymentMode(env,u)==='test',
     memberActive:u?.membership==='active',cardAvailable:!!u?.cardId,
     expiresAt:u?.memberUntil||null,tiers:MEMBER_TIERS,
     eligibleProducts:'Eligible tea and coffee only. Weight-based tiers; no food or book discount.'});
 }
 if(path==='/api/membership/card'&&method==='GET'){
   const u=await requireUser(req,env),card=await cardForUser(env,u.id);
   if(!card)return fail('No paid membership card is associated with this account',404);
   return json({card:{id:card.card_id,name:card.member_name,email:u.email,
       purchasedAt:card.purchased_at,expiresAt:card.expires_at,
       status:isAnnualCardActive(card)?'active':'expired'}});
 }
 if(path==='/api/membership/card/email'&&method==='POST'){
   const u=await requireUser(req,env);
   if(!await limit(env,'member-card-email:'+u.id,3,86400))return fail('Too many card email requests. Try again tomorrow.',429);
   const card=await cardForUser(env,u.id);
   if(!card)return fail('No paid membership card on this account',404);
   if(!isAnnualCardActive(card))return fail('This membership card has expired',409);
   const sent=await notifyCardByEmail(env,card,u.email,sendEmail,{force:true});
   if(!sent)return fail('Could not send the card email now. Your card remains available online.',503);
   return json({sent:true,message:'Membership card email sent or already delivered today.'});
 }
 if(path==='/api/franchise/enquiry'&&method==='POST'){
   const ip=req.headers.get('cf-connecting-ip')||'local';
   if(!await limit(env,'franchise-ip:'+ip,3,3600))return fail('Too many enquiries from this connection',429);
   const d=await req.json().catch(()=>null);
   if(!d||typeof d!=='object')return fail('Invalid form data');
   if(clean(d.website,120))return json({received:true}); // honeypot
   const name=clean(d.name,90),email=normEmail(d.email),phone=clean(d.phone,25),
     city=clean(d.city,100),state=clean(d.state,90),
     area=Number(d.areaSqft),location=clean(d.locationType,70),
     experience=clean(d.experience,800),investment=clean(d.investment,100),
     notes=clean(d.notes,1200),consent=d.consent===true;
   if(name.length<3||email.length>180||!emailPattern.test(email)||digits(phone).length<10||
      city.length<2||state.length<2||!Number.isFinite(area)||area<800||area>100000||
      location.length<3||experience.length<10||investment.length<2||!consent)return fail('Please complete the required fields. Proposed site area must be at least 800 sq ft.');
   if(!await limit(env,'franchise-email:'+email,2,86400))return fail('Your enquiry was already submitted. Contact us for updates.',429);
   const id='HOV-FR-'+rid().slice(0,8).toUpperCase();
   await env.DB.prepare("INSERT INTO hov_franchise_enquiries(id,name,email,phone,city,state,area_sqft,location_type,experience,investment,notes,consent,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,1,'new')")
     .bind(id,name,email,phone,city,state,Math.round(area),location,experience,investment,notes).run();
   let notificationSent=false;
   try{
     await sendEmail(env,'info@houseofverona.in','New House of Verona franchise enquiry '+id,
       '<h2>Franchise enquiry '+html(id)+'</h2><p><strong>Applicant:</strong> '+html(name)+'</p><p><strong>Email:</strong> '+html(email)+'</p>'+
       '<p><strong>Phone:</strong> '+html(phone)+'</p><p><strong>Location:</strong> '+html(city+', '+state)+'</p>'+
       '<p><strong>Area:</strong> '+Math.round(area)+' sq ft</p><p><strong>Site:</strong> '+html(location)+'</p>'+
       '<p><strong>Experience:</strong> '+html(experience)+'</p><p><strong>Investment:</strong> '+html(investment)+'</p><p><strong>Notes:</strong> '+html(notes)+'</p>'+
       '<p>Applicant consent recorded; application is non-binding and fee-free.</p>');
     notificationSent=true;
     await env.DB.prepare("UPDATE hov_franchise_enquiries SET emailed_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
   }catch(e){console.error('Franchise notification deferred',id);}
   return json({received:true,reference:id,notificationSent,
     message:notificationSent?'Enquiry received. Our team will review it.':'Enquiry safely recorded. Email notification is pending; please contact us using the published details if urgent.'},202);
 }
 if(path==='/api/membership/checkout'&&method==='POST'){
   const user=await requireUser(req,env);
   const input=await req.json().catch(()=>null);
   const name=cardName(input?.name);
   if(name.length<2||!/^[\\p{L}\\p{M} .'-]+$/u.test(name))
     return fail('Enter your full name for the membership card');
   if(user.membership==='active')return fail('Your lifetime Veronates membership is already active',409);
   if(!isRazorpayReady(env,user))return fail('Secure membership payments are not open yet. Please contact the House.',503);
   if(!await limit(env,'member-pay:'+user.id,5,3600))return fail('Too many checkout attempts',429);
   // Reuse a recently created order, preventing repeat taps from producing multiple charges.
   const latest=await env.DB.prepare("SELECT * FROM hov_membership_payments WHERE user_id=? AND status='created' AND created_at_unix>? ORDER BY created_at_unix DESC LIMIT 1").bind(user.id,stamp()-900).first();
   if(latest){
     const previous=await env.DB.prepare('SELECT member_name FROM hov_member_card_requests WHERE razorpay_order_id=?').bind(latest.razorpay_order_id).first();
     if(previous?.member_name!==name)return fail('An earlier checkout has a different card name. Please try again after 15 minutes.',409);
     return json({orderId:latest.razorpay_order_id,keyId:env.RAZORPAY_KEY_ID,amount:latest.amount_paise,currency:'INR',purchase:'annual'});
   }
   const amount=membershipPriceAt()*100,receipt='HOVM-'+rid().replace(/-/g,'').slice(0,25);
   const order=await razorpayRequest(env,'POST','orders',{amount,currency:'INR',receipt,
     notes:{product:'veronates_lifetime',account_id:user.id}});
   if(!/^order_[A-Za-z0-9]+$/.test(String(order.id))||order.amount!==amount||order.currency!=='INR')
      return fail('Payment provider returned an unexpected order',502);
   await env.DB.batch([
     env.DB.prepare("INSERT INTO hov_membership_payments(id,user_id,razorpay_order_id,amount_paise,currency,status,created_at_unix) VALUES(?,?,?,?,'INR','created',?)")
       .bind(rid(),user.id,order.id,amount,stamp()),
     env.DB.prepare('INSERT INTO hov_member_card_requests(razorpay_order_id,user_id,member_name) VALUES(?,?,?)')
       .bind(order.id,user.id,name)
   ]);
   return json({orderId:order.id,keyId:env.RAZORPAY_KEY_ID,amount,currency:'INR',purchase:'annual'},201);
 }
 if(path==='/api/membership/verify'&&method==='POST'){
   const user=await requireUser(req,env);
   if(!isRazorpayReady(env,user))return fail('Membership verification unavailable',503);
   if(!await limit(env,'member-verify:'+user.id,15,3600))return fail('Too many verification attempts',429);
   const d=await req.json().catch(()=>null);
   if(!d)return fail('Invalid checkout response');
   const paymentId=clean(d.razorpay_payment_id,90),orderId=clean(d.razorpay_order_id,90),signature=clean(d.razorpay_signature,90);
   if(!/^pay_[A-Za-z0-9]+$/.test(paymentId)||!/^order_[A-Za-z0-9]+$/.test(orderId)||!signature)return fail('Invalid payment identifiers');
   const attempt=await env.DB.prepare('SELECT * FROM hov_membership_payments WHERE user_id=? AND razorpay_order_id=?').bind(user.id,orderId).first();
   if(!attempt)return fail('Membership payment order not found',404);
   // Verify exact server-recorded order ID, not an order ID trusted from the browser.
   const expected=await hmacHex(env.RAZORPAY_KEY_SECRET,attempt.razorpay_order_id+'|'+paymentId);
   if(!constantHexEqual(expected,signature))return fail('Payment signature verification failed',403);
   if(!await verifiedCapturedPayment(env,paymentId,attempt))
      return fail('Payment not yet captured. Membership activates only after verified capture.',409);
   if(!await markMembershipPaid(env,attempt,paymentId))return fail('Membership payment verification conflict',409);
   if(isTestTransaction(env))return json({paid:true,membership:'test_verified',testMode:true});
   const card=await cardForUser(env,user.id);
   if(!card||card.razorpay_payment_id!==paymentId)return fail('Payment captured; card needs manual review. Do not pay again.',409);
   const emailSent=await notifyCardByEmail(env,card,user.email,sendEmail);
   return json({paid:true,membership:'active',annual:true,cardId:card.card_id,
     purchasedAt:card.purchased_at,expiresAt:card.expires_at,emailSent});
 }
 if(path==='/api/membership/webhook'&&method==='POST'){
   if(!env.RAZORPAY_WEBHOOK_SECRET)return fail('Webhook not configured',503);
   if(Number(req.headers.get('content-length')||0)>65536)return fail('Webhook too large',413);
   const raw=await req.text();
   if(new TextEncoder().encode(raw).length>65536)return fail('Webhook too large',413);
   const got=clean(req.headers.get('x-razorpay-signature'),90);
   const expected=await hmacHex(env.RAZORPAY_WEBHOOK_SECRET,raw);
   if(!constantHexEqual(expected,got))return fail('Invalid webhook signature',403);
   const payload=JSON.parse(raw);
   const event=payload.event;
   if(!['payment.captured','order.paid'].includes(event))return json({accepted:true});
   const payment=payload.payload?.payment?.entity;
   if(!payment?.id||!payment.order_id)return json({accepted:true});
   const attempt=await env.DB.prepare('SELECT * FROM hov_membership_payments WHERE razorpay_order_id=?').bind(payment.order_id).first();
   if(!attempt)return json({accepted:true}); // unrelated Razorpay event
   if(!isRazorpayReady(env,{admin:true}))return fail('Membership verification not configured',503);
   // Webhook signature authenticates notification; API recheck confirms capture and amount.
   if(!await verifiedCapturedPayment(env,payment.id,attempt))return fail('Payment capture not verified',409);
   const eventId=clean(req.headers.get('x-razorpay-event-id'),120);
   if(!await markMembershipPaid(env,attempt,payment.id,eventId))return fail('Payment already linked to a different record',409);
   if(!isTestTransaction(env)){
     const card=await cardForUser(env,attempt.user_id);
     if(card?.razorpay_payment_id===payment.id){
       const u=await env.DB.prepare('SELECT email FROM hov_users WHERE id=?').bind(attempt.user_id).first();
       if(u?.email)await notifyCardByEmail(env,card,u.email,sendEmail);
     }
   }
   return json({accepted:true});
 }
 return null;
}