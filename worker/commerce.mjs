import {priceBook} from './prices.mjs';
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const statement=(env,sql,...args)=>env.DB.prepare(sql).bind(...args);
export const paymentReady=env=>env.CHECKOUT_MODE==='test'&&/^rzp_test_/.test(env.RAZORPAY_KEY_ID||'')&&!!env.RAZORPAY_KEY_SECRET;
export function normalizeItems(items){
 if(!Array.isArray(items)||!items.length||items.length>50)fail('Choose between 1 and 50 bag lines.');
 const lines=new Map();let grams=0;
 for(const x of items){
  if(!x||!Object.hasOwn(priceBook,x.id)||!Object.hasOwn(priceBook[x.id],x.weight)||!Number.isInteger(x.qty)||x.qty<1||x.qty>99)fail('Invalid product, pack or quantity.');
  const tea=['orthodox','gunpowder','himalayan'].includes(x.id);
  const roast=tea?'Loose leaf':x.roast,grind=tea?'Not applicable':x.grind;
  if(!tea&&(!['Light','Medium','Medium-dark','Dark'].includes(roast)||!['Whole beans','Espresso','Moka pot','Pour-over','French press'].includes(grind)))fail('Choose a valid roast and grind.');
  // Stock represents finished packs by roast and grind; no substitutions are assumed.
  const sku=[x.id,Number(x.weight),roast,grind].join('|');
  const previous=lines.get(sku);const qty=(previous?.qty||0)+x.qty;if(qty>99)fail('Maximum 99 units of each pack.');
  lines.set(sku,{id:x.id,weight:Number(x.weight),roast,grind,sku,qty});grams+=Number(x.weight)*x.qty;
 }
 if(grams<250)fail('Minimum combined order weight is 250 g.');
 return {lines:[...lines.values()],grams};
}
export async function signatureOK(secret,message,signature){
 if(typeof signature!=='string'||!/^[a-f0-9]{64}$/i.test(signature))return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const bytes=Uint8Array.from(signature.match(/../g),h=>parseInt(h,16));
 return crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(message));
}
async function provider(env,path,body){
 const response=await fetch('https://api.razorpay.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Basic '+btoa(env.RAZORPAY_KEY_ID+':'+env.RAZORPAY_KEY_SECRET),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)fail('Razorpay could not complete the request. Check configuration or retry the existing order.',502);
 return response.json();
}
async function readBody(request){const text=await request.text();if(text.length>20000)fail('Request too large.',413);try{return JSON.parse(text)}catch{fail('Invalid request.')}}
export async function finalize(env,purchase,payment){
 if(payment.order_id!==purchase.provider_order||payment.amount!==purchase.amount||payment.currency!=='INR'||payment.status!=='captured'||payment.refunded===true||Number(payment.amount_refunded||0)>0)fail('Payment is not a matching captured payment. Membership and order remain unconfirmed.',409);
 const now=new Date().toISOString();
 const commands=[statement(env,"UPDATE purchases SET status='paid_test',payment_id=? WHERE id=? AND status IN ('awaiting_payment','paid_test')",payment.id,purchase.id),statement(env,"INSERT OR IGNORE INTO confirmations (purchase_id,status,updated_at) SELECT id,'pending',? FROM purchases WHERE id=? AND status='paid_test'",now,purchase.id)];
 if(purchase.kind==='membership')commands.push(statement(env,"INSERT OR IGNORE INTO test_memberships (user_id,purchase_id,activated_at) SELECT user_id,id,? FROM purchases WHERE id=? AND status='paid_test'",now,purchase.id));
 await env.DB.batch(commands);
 return {status:'paid_test',message:'Test payment verified. No real order or paid membership was created.'};
}
async function sendConfirmation(env,purchase){
 const row=await statement(env,'SELECT * FROM confirmations WHERE purchase_id=?',purchase.id).first();
 if(!row||row.status==='sent')return row?.status||'pending';
 if(!env.RESEND_API_KEY||!env.EMAIL_FROM||env.EMAIL_SEND_ENABLED!=='true')return 'not_connected';
 // Provider idempotency protects retries for 24h. Older ambiguous sends require review.
 if(row.status==='sending'||row.status==='needs_review')return row.status;
 const claim=await statement(env,"UPDATE confirmations SET status='sending',updated_at=? WHERE purchase_id=? AND status='pending'",new Date().toISOString(),purchase.id).run();
 if(!claim.meta?.changes)return 'sending';
 try{
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'hov-test-'+purchase.id},body:JSON.stringify({from:env.EMAIL_FROM,to:[purchase.email],subject:'[TEST] House of Verona payment confirmation',text:`TEST ONLY — No real purchase.\nReference: ${purchase.id}\nAmount: INR ${(purchase.amount/100).toFixed(2)}\nYour test payment was verified. This does not activate a real membership or arrange delivery.`}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error('Provider error');const result=await r.json();
  await statement(env,"UPDATE confirmations SET status='sent',provider_id=?,updated_at=? WHERE purchase_id=?",result.id,new Date().toISOString(),purchase.id).run();return 'sent';
 }catch{await statement(env,"UPDATE confirmations SET status='needs_review',updated_at=? WHERE purchase_id=?",new Date().toISOString(),purchase.id).run();return 'needs_review'}
}
export async function commerce(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith('/api/commerce/'))return null;
 const uid=request.headers.get('oai-authenticated-user-id');if(!uid)return reply({error:'Sign in to continue.'},401);
 if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed.'},405);
 if(request.method==='POST'&&request.headers.get('origin')!==url.origin)return reply({error:'Invalid request origin.'},403);
 const admin=(!!env.HOV_ADMIN_USER_ID&&uid===env.HOV_ADMIN_USER_ID)||(!!env.HOV_ADMIN_EMAIL&&request.headers.get('oai-authenticated-user-email')?.toLowerCase()===env.HOV_ADMIN_EMAIL.toLowerCase());
 if(!env.DB)return reply({error:'Database is unavailable.'},503);
 try{
 if(path==='/api/commerce/status')return reply({payments:paymentReady(env)?'test_ready':'not_connected',email:env.RESEND_API_KEY&&env.EMAIL_FROM?'configured_unverified':'not_connected',emailSending:env.EMAIL_SEND_ENABLED==='true',whatsapp:'not_connected',liveCheckout:false,admin,signIn:'ChatGPT',inventory:'Database-backed; quantities require merchant entry. Test and live stock are separate.'});
 if(path==='/api/commerce/stock'&&request.method==='GET'){
  const r=await statement(env,'SELECT sku,available,revision FROM stock ORDER BY sku LIMIT 1000').all();return reply({stock:r.results,admin});
 }
 if(path==='/api/commerce/stock'&&request.method==='POST'){
  if(!admin)fail('Only the configured store administrator can edit stock.',403);
  const b=await readBody(request);if(!['test','live'].includes(b.mode))fail('Choose test or live stock.');
  // Validate the individual pack without applying basket minimum.
  normalizeItems([{...b,qty:Math.ceil(250/Number(b.weight))}]);
  if(!Number.isInteger(b.available)||b.available<0||b.available>100000||!Number.isInteger(b.revision)||b.revision<0)fail('Enter valid stock and revision.');
  const tea=['orthodox','gunpowder','himalayan'].includes(b.id);
  const sku=[b.mode,b.id,Number(b.weight),tea?'Loose leaf':b.roast,tea?'Not applicable':b.grind].join('|');
  const r=await statement(env,'INSERT INTO stock (sku,available,revision) VALUES (?,?,1) ON CONFLICT(sku) DO UPDATE SET available=excluded.available,revision=stock.revision+1 WHERE stock.revision=?',sku,b.available,b.revision).run();
  if(!r.meta?.changes)fail('Stock changed since you opened it. Refresh and retry.',409);
  await statement(env,'INSERT INTO stock_audit VALUES (?,?,?,?,?)',crypto.randomUUID(),uid,sku,b.available,new Date().toISOString()).run();return reply({saved:true});
 }
 if(path==='/api/commerce/history'){
  const r=await statement(env,'SELECT p.id,p.kind,p.status,p.amount,p.provider_order,p.created_at,c.status AS email_status FROM purchases p LEFT JOIN confirmations c ON c.purchase_id=p.id WHERE p.user_id=? ORDER BY p.created_at DESC LIMIT 50',uid).all();return reply({purchases:r.results});
 }
 if(path==='/api/commerce/create'&&request.method==='POST'){
  if(!paymentReady(env))fail('Razorpay test keys must be connected first. Live checkout remains disabled.',503);
  const b=await readBody(request);if(!/^[a-f0-9-]{36}$/i.test(b.request_key||''))fail('Invalid checkout request ID.');
  if(!['products','membership'].includes(b.kind))fail('Invalid purchase type.');
  const email=request.headers.get('oai-authenticated-user-email');if(!email||!email.includes('@'))fail('Your signed-in account needs an email address.');
  const existing=await statement(env,'SELECT * FROM purchases WHERE user_id=? AND request_key=?',uid,b.request_key).first();
  if(existing){if(existing.provider_order)return reply({id:existing.id,provider_order:existing.provider_order,amount:existing.amount,key:env.RAZORPAY_KEY_ID,status:existing.status});fail('This payment attempt requires reconciliation. Do not create another payment.',409)}
  let lines=[],amount=99900;
  if(b.kind==='membership'){
   if(await statement(env,'SELECT user_id FROM test_memberships WHERE user_id=?',uid).first())fail('A test membership already exists. No additional payment is needed.',409);
  }else{
   lines=normalizeItems(b.items).lines;
   const m=await statement(env,'SELECT user_id FROM test_memberships WHERE user_id=?',uid).first();
   lines=lines.map(x=>({...x,unit:priceBook[x.id][x.weight][m?1:0]*100}));amount=lines.reduce((n,x)=>n+x.unit*x.qty,0);amount+=amount>199900?0:15000;
  }
  if(amount>50000000)fail('Order exceeds the supported test amount.');
  const id=crypto.randomUUID(),now=new Date().toISOString();
  const commands=[statement(env,"INSERT OR IGNORE INTO customers(user_id,display_name,updated_at) VALUES (?,'',?)",uid,now),statement(env,'INSERT INTO purchases(id,user_id,request_key,kind,amount,email,created_at) VALUES (?,?,?,?,?,?,?)',id,uid,b.request_key,b.kind,amount,email,now),...lines.map(x=>statement(env,'INSERT INTO purchase_lines(purchase_id,sku,qty,unit_paise) VALUES (?,?,?,?)',id,'test|'+x.sku,x.qty,x.unit))];
  try{await env.DB.batch(commands)}catch{fail('Stock is insufficient or this request already exists. Refresh before retrying.',409)}
  let order;try{order=await provider(env,'orders',{amount,currency:'INR',receipt:id,notes:{hov_purchase_id:id,mode:'test'}})}catch(e){await statement(env,"UPDATE purchases SET status='needs_review' WHERE id=?",id).run();throw e}
  await statement(env,"UPDATE purchases SET provider_order=?,status='awaiting_payment' WHERE id=?",order.id,id).run();
  return reply({id,provider_order:order.id,amount,key:env.RAZORPAY_KEY_ID,status:'awaiting_payment'});
 }
 if(path==='/api/commerce/verify'&&request.method==='POST'){
  if(!paymentReady(env))fail('Test payment connection is unavailable.',503);
  const b=await readBody(request);const p=await statement(env,'SELECT * FROM purchases WHERE id=? AND user_id=?',b.id,uid).first();
  if(!p?.provider_order)fail('Order not found.',404);
  if(!/^pay_[A-Za-z0-9]+$/.test(b.razorpay_payment_id||''))fail('Invalid payment reference.');
  if(b.razorpay_order_id!==p.provider_order||!await signatureOK(env.RAZORPAY_KEY_SECRET,p.provider_order+'|'+b.razorpay_payment_id,b.razorpay_signature))fail('Payment signature could not be verified.',400);
  const payment=await provider(env,'payments/'+b.razorpay_payment_id);
  const result=await finalize(env,p,payment);result.email=await sendConfirmation(env,p);return reply(result);
 }
 if(path==='/api/commerce/reconcile'&&request.method==='POST'){
  if(!paymentReady(env))fail('Test payment connection is unavailable.',503);
  const b=await readBody(request),p=await statement(env,'SELECT * FROM purchases WHERE id=? AND user_id=?',b.id,uid).first();
  if(!p?.provider_order)fail('No recoverable provider order found. Developer review is required.',409);
  const data=await provider(env,'orders/'+encodeURIComponent(p.provider_order)+'/payments');
  const paid=data.items?.find(x=>x.status==='captured'&&x.amount===p.amount&&x.currency==='INR'&&!x.amount_refunded);
  if(!paid)return reply({status:p.status,message:'No captured payment found. No order or membership has been confirmed.'});
  const result=await finalize(env,p,paid);result.email=await sendConfirmation(env,p);return reply(result);
 }
 return reply({error:'Not found.'},404);
 }catch(e){return reply({error:e.status?e.message:'The service could not complete this action. Please retry the existing request.'},e.status||503)}
}
