import {catalog,calculate} from './catalog.js';
import {searchResponse} from './seo.js';
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extra}});
const fail=(message,status=400)=>json({error:message},status);
const now=()=>Math.floor(Date.now()/1000);
const rid=()=>crypto.randomUUID();
const normEmail=s=>String(s||'').trim().toLowerCase();
const clean=(v,max=250)=>String(v||'').trim().slice(0,max);
const hex=arr=>Array.from(new Uint8Array(arr),b=>b.toString(16).padStart(2,'0')).join('');
async function digest(s){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))}
const secureHeaders={'x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','x-frame-options':'DENY','permissions-policy':'camera=(), microphone=(), geolocation=()'};
function cookie(request){return (request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(x=>x.startsWith('hov_session='))?.slice(12)||''}
async function currentUser(request,env){const token=cookie(request);if(!token)return null;const hash=await digest(token+(env.AUTH_PEPPER||''));const u=await env.DB.prepare('SELECT u.id,u.email, COALESCE(m.status,\'inactive\') membership FROM hov_sessions s JOIN hov_users u ON s.user_id=u.id LEFT JOIN hov_memberships m ON m.user_id=u.id WHERE s.hash=? AND s.expires_at>?').bind(hash,now()).first();if(!u)return null;return {...u,admin:!!env.ADMIN_EMAIL&&u.email===normEmail(env.ADMIN_EMAIL)}}
async function requireUser(req,env){const u=await currentUser(req,env);if(!u)throw Object.assign(new Error('Please sign in first'),{status:401});return u}
async function requireAdmin(req,env){const u=await requireUser(req,env);if(!u.admin)throw Object.assign(new Error('Administrator access required'),{status:403});return u}
async function body(req){if(Number(req.headers.get('content-length')||0)>30000)throw Error('Request too large');try{return await req.json()}catch{throw Error('Invalid request data')}}
function validateOrigin(req){const o=req.headers.get('origin');return !o||o===new URL(req.url).origin}
async function limit(env,key,max,windowSec){const timestamp=now();await env.DB.prepare('INSERT INTO hov_rate_limits(key,n,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=CASE WHEN expires_at<? THEN 1 ELSE n+1 END,expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END').bind(key,timestamp+windowSec,timestamp,timestamp).run();const row=await env.DB.prepare('SELECT n FROM hov_rate_limits WHERE key=?').bind(key).first();return row.n<=max}
async function sendEmail(env,to,subject,html){if(!env.RESEND_API_KEY||!env.FROM_EMAIL)throw Object.assign(new Error('Email sending not configured'),{status:503});const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':rid()},body:JSON.stringify({from:env.FROM_EMAIL,to:[to],subject,html})});if(!r.ok){console.error('Resend failed',r.status);throw Object.assign(new Error('Email provider unavailable'),{status:503})}}
async function seed(env){const count=await env.DB.prepare('SELECT COUNT(*) n FROM hov_products').first();if(count.n)return;await env.DB.batch(catalog.map(p=>env.DB.prepare('INSERT OR IGNORE INTO hov_products (id,name,category,origin,description,price_json,enabled,sort_order) VALUES(?,?,?,?,?,?,?,?)').bind(p.id,p.name,p.category,p.origin,p.description,JSON.stringify(p.prices),p.enabled===0?0:1,p.sort)))}
async function products(env,includeDisabled=false){await seed(env);const r=await env.DB.prepare('SELECT * FROM hov_products '+(includeDisabled?'':'WHERE enabled=1 ')+'ORDER BY sort_order ASC').all();return r.results.map(x=>({id:x.id,name:x.name,category:x.category,origin:x.origin,description:x.description,prices:JSON.parse(x.price_json),image:x.image_key?'/media/'+encodeURIComponent(x.image_key):null,enabled:!!x.enabled,sort:x.sort_order}))}
function safeStatus(status){return ['awaiting_whatsapp','pending_review','approved','payment_pending','paid','packed','shipped','delivered','cancelled'].includes(status)}
function orderShape(x){return {...x,lines:JSON.parse(x.lines_json),lines_json:undefined}}
async function api(req,env,url){const path=url.pathname,method=req.method;
 if(path==='/api/health')return json({healthy:true,storeOpen:env.STORE_OPEN==='true'});
 if(path==='/api/catalog'&&method==='GET')return json({products:await products(env),storeOpen:env.STORE_OPEN==='true',shippingThreshold:1999,openingHours:'8:00 AM – 2:00 AM'});
 if(path==='/api/gallery'&&method==='GET'){const rows=await env.DB.prepare('SELECT id,image_key,caption FROM hov_gallery ORDER BY created_at DESC LIMIT 40').all();return json({images:rows.results.map(x=>({id:x.id,url:'/media/'+encodeURIComponent(x.image_key),caption:x.caption}))})}
 if(path==='/api/me'&&method==='GET'){const u=await currentUser(req,env);return json({user:u})}
 if(path==='/api/auth/request'&&method==='POST'){
  const d=await body(req),email=normEmail(d.email);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>180)return fail('Enter a valid email');
  if(!env.AUTH_PEPPER||env.AUTH_PEPPER.length<32)return fail('Authentication not configured',503);
  const ip=req.headers.get('cf-connecting-ip')||'local';if(!await limit(env,'otp-ip:'+ip,12,3600)||!await limit(env,'otp-email:'+email,5,3600))return fail('Too many code requests. Try again later.',429);
  const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');const hash=await digest(email+':'+code+':'+env.AUTH_PEPPER);
  await env.DB.prepare('INSERT INTO hov_logins(email,hash,expires_at,attempts,requested_at) VALUES(?,?,?,0,?) ON CONFLICT(email) DO UPDATE SET hash=excluded.hash,expires_at=excluded.expires_at,attempts=0,requested_at=excluded.requested_at').bind(email,hash,now()+600,now()).run();
  await sendEmail(env,email,'Your House of Verona sign-in code',`<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto"><h2>House of Verona</h2><p>Your secure sign-in code is:</p><h1>${code}</h1><p>Expires in 10 minutes. If you did not request it, ignore this email.</p></div>`);return json({sent:true});
 }
 if(path==='/api/auth/verify'&&method==='POST'){
  const d=await body(req),email=normEmail(d.email),code=clean(d.code,8);if(!/^\d{6}$/.test(code))return fail('Enter the six-digit code');
  const ip=req.headers.get('cf-connecting-ip')||'local';if(!await limit(env,'verify-ip:'+ip,30,3600))return fail('Too many sign-in attempts',429);
  const hashed=await digest(email+':'+code+':'+env.AUTH_PEPPER);const row=await env.DB.prepare('SELECT hash,expires_at,attempts FROM hov_logins WHERE email=?').bind(email).first();
  if(!row||row.expires_at<now()||row.attempts>=5||row.hash!==hashed){await env.DB.prepare('UPDATE hov_logins SET attempts=attempts+1 WHERE email=?').bind(email).run();return fail('Invalid or expired code',401)}
  await env.DB.prepare('DELETE FROM hov_logins WHERE email=?').bind(email).run();const id=rid();await env.DB.prepare('INSERT OR IGNORE INTO hov_users(id,email) VALUES(?,?)').bind(id,email).run();const user=await env.DB.prepare('SELECT id FROM hov_users WHERE email=?').bind(email).first();
  const token=rid()+rid();await env.DB.prepare('INSERT INTO hov_sessions(hash,user_id,expires_at) VALUES(?,?,?)').bind(await digest(token+env.AUTH_PEPPER),user.id,now()+60*60*24*30).run();
  return json({signedIn:true},200,{'set-cookie':`hov_session=${token}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`});
 }
 if(path==='/api/auth/logout'&&method==='POST'){const token=cookie(req);if(token)await env.DB.prepare('DELETE FROM hov_sessions WHERE hash=?').bind(await digest(token+(env.AUTH_PEPPER||''))).run();return json({signedOut:true},200,{'set-cookie':'hov_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'})}
 if(path==='/api/quote'&&method==='POST'){
  const d=await body(req),u=await currentUser(req,env),prods=await products(env);return json(calculate(d.items,prods,u?.membership==='active',{standardShipping:Number(env.STANDARD_SHIPPING_INR||150),bookShipping:Number(env.BOOK_SHIPPING_INR||0)}));
 }
 if(path==='/api/orders'&&method==='POST'){
  const u=await requireUser(req,env);if(env.STORE_OPEN!=='true')return fail('Ordering is not open yet',503);
  const ip=req.headers.get('cf-connecting-ip')||'local';if(!await limit(env,'orders:'+u.id,10,86400)||!await limit(env,'orders-ip:'+ip,30,86400))return fail('Order limit reached; contact us',429);
  const d=await body(req),name=clean(d.name,90),phone=clean(d.phone,20),address=clean(d.address,500),pincode=clean(d.pincode,12);
  if(name.length<2||!/^[+\d\s()-]{8,20}$/.test(phone)||address.length<12||!/^\d{6}$/.test(pincode))return fail('Complete name, Indian phone, delivery address and six-digit PIN code');
  const quote=calculate(d.items,await products(env),u.membership==='active',{standardShipping:Number(env.STANDARD_SHIPPING_INR||150),bookShipping:Number(env.BOOK_SHIPPING_INR||0)});
  const id='HOV-'+Date.now().toString(36).toUpperCase()+'-'+rid().slice(0,6).toUpperCase();
  await env.DB.prepare('INSERT INTO hov_orders (id,user_id,email,customer_name,phone,address,pincode,lines_json,subtotal,discount,shipping,total,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,u.id,u.email,name,phone,address,pincode,JSON.stringify(quote.lines),quote.subtotal,quote.discount,quote.shipping,quote.total,'awaiting_whatsapp').run();
  await env.DB.prepare('INSERT INTO hov_events(id,order_id,actor,status,notes) VALUES(?,?,?,?,?)').bind(rid(),id,u.id,'awaiting_whatsapp','Order recorded before WhatsApp handoff').run();
  const lines=quote.lines.map(x=>`${x.qty} x ${x.name} ${x.grams}g ${x.roast||''} ${x.grind||''} — Rs.${x.amount}`).join('\n');
  const message=`Hello House of Verona. Please review my order ${id}.\n${lines}\nSubtotal: Rs.${quote.subtotal}\nVeronates discount: Rs.${quote.discount}\nDelivery: Rs.${quote.shipping}\nEstimated total: Rs.${quote.total}\nName: ${name}\nPhone: ${phone}\nPIN: ${pincode}\nPlease confirm stock, shipping and payment instructions.`;
  return json({id,status:'awaiting_whatsapp',total:quote.total,whatsappUrl:'https://wa.me/'+(env.WHATSAPP_NUMBER||'918799817395')+'?text='+encodeURIComponent(message)},201);
 }
 if(path==='/api/orders/mine'&&method==='GET'){const u=await requireUser(req,env);const r=await env.DB.prepare('SELECT id,email,lines_json,subtotal,discount,shipping,total,status,created_at,updated_at,payment_link FROM hov_orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(u.id).all();return json({orders:r.results.map(orderShape)})}
 if(path==='/api/admin/orders'&&method==='GET'){await requireAdmin(req,env);const r=await env.DB.prepare('SELECT * FROM hov_orders ORDER BY created_at DESC LIMIT 200').all();return json({orders:r.results.map(orderShape)})}
 if(path==='/api/admin/orders/update'&&method==='POST'){
  const admin=await requireAdmin(req,env),d=await body(req),id=clean(d.id,80),status=clean(d.status,40),link=clean(d.paymentLink,500),reference=clean(d.paymentReference,120);if(!safeStatus(status))return fail('Invalid order status');
  if(link&&(!/^https:\/\//.test(link)||link.length>500))return fail('Only HTTPS payment links are allowed');
  const result=await env.DB.prepare('UPDATE hov_orders SET status=?,payment_link=CASE WHEN ? != \'\' THEN ? ELSE payment_link END,payment_reference=CASE WHEN ? != \'\' THEN ? ELSE payment_reference END,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(status,link,link,reference,reference,id).run();if(!result.meta.changes)return fail('Order not found',404);
  await env.DB.prepare('INSERT INTO hov_events(id,order_id,actor,status,notes) VALUES(?,?,?,?,?)').bind(rid(),id,admin.email,status,clean(d.notes,300)).run();return json({saved:true});
 }
 if(path==='/api/admin/membership'&&method==='POST'){await requireAdmin(req,env);const d=await body(req),email=normEmail(d.email),status=clean(d.status,12);if(!['active','inactive'].includes(status))return fail('Invalid membership');const u=await env.DB.prepare('SELECT id FROM hov_users WHERE email=?').bind(email).first();if(!u)return fail('Customer must sign in once before membership can be activated',404);await env.DB.prepare('INSERT INTO hov_memberships(user_id,status) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET status=excluded.status,updated_at=CURRENT_TIMESTAMP').bind(u.id,status).run();return json({saved:true})}
 if(path==='/api/admin/products'&&method==='GET'){await requireAdmin(req,env);return json({products:await products(env,true)})}
 if(path==='/api/admin/products/update'&&method==='POST'){
  await requireAdmin(req,env);const d=await body(req),p=(await products(env,true)).find(x=>x.id===d.id);if(!p)return fail('Product not found',404);
  const name=clean(d.name,120),description=clean(d.description,800),origin=clean(d.origin,180),enabled=d.enabled?1:0,prices=d.prices;
  if(name.length<2||description.length<4||!prices||typeof prices!=='object'||!Object.keys(prices).length)return fail('Complete all product details');
  for(const [size,price] of Object.entries(prices)){if(!/^\d+$/.test(size)||Number(size)<1||Number(size)>10000||!Number.isSafeInteger(price)||price<9||price>99999||price%10!==9)return fail('Pack weights and prices invalid: all selling prices must end in 9')}
  await env.DB.prepare('UPDATE hov_products SET name=?,description=?,origin=?,enabled=?,price_json=? WHERE id=?').bind(name,description,origin,enabled,JSON.stringify(prices),p.id).run();return json({saved:true});
 }
 if(path==='/api/admin/gallery/add'&&method==='POST'){await requireAdmin(req,env);const d=await body(req),key=clean(d.key,120),caption=clean(d.caption,150);if(!/^images\/[a-f0-9-]+\.(jpg|png|webp)$/.test(key))return fail('Invalid image reference');if(!await env.MEDIA.head(key))return fail('Image does not exist',404);await env.DB.prepare('INSERT INTO hov_gallery(id,image_key,caption) VALUES(?,?,?)').bind(rid(),key,caption).run();return json({added:true})}
 if(path==='/api/admin/gallery/delete'&&method==='POST'){await requireAdmin(req,env);const d=await body(req);await env.DB.prepare('DELETE FROM hov_gallery WHERE id=?').bind(clean(d.id,50)).run();return json({deleted:true})}
 if(path==='/api/admin/images/upload'&&method==='POST'){
  await requireAdmin(req,env);const length=Number(req.headers.get('content-length')||0),type=req.headers.get('content-type')||'';
  if(length<1||length>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(type))return fail('Use JPG, PNG or WEBP under 5 MB');
  const data=await req.arrayBuffer();if(data.byteLength>5*1024*1024)return fail('Image exceeds 5 MB');const bytes=new Uint8Array(data);
  const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
  const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if(!((jpg&&type==='image/jpeg')||(png&&type==='image/png')||(webp&&type==='image/webp')))return fail('Image file signature is invalid');
  const ext=jpg?'jpg':png?'png':'webp',key='images/'+rid()+'.'+ext;await env.MEDIA.put(key,data,{httpMetadata:{contentType:type,cacheControl:'public, max-age=31536000, immutable'}});return json({key,url:'/media/'+key},201);
 }
 if(path==='/api/admin/products/image'&&method==='POST'){await requireAdmin(req,env);const d=await body(req),key=clean(d.key,120),id=clean(d.id,50);if(!/^images\/[a-f0-9-]+\.(jpg|png|webp)$/.test(key)||!await env.MEDIA.head(key))return fail('Upload an image first');const res=await env.DB.prepare('UPDATE hov_products SET image_key=? WHERE id=?').bind(key,id).run();if(!res.meta.changes)return fail('Product not found',404);return json({saved:true})}
 return fail('Route not found',404);
}
export default {async fetch(request,env){const url=new URL(request.url);try{
 const seo=await searchResponse(request,()=>products(env));
 if(seo)return seo;
 if(url.pathname.startsWith('/media/')){if(request.method!=='GET'&&request.method!=='HEAD')return fail('Method not allowed',405);const key=decodeURIComponent(url.pathname.slice(7));if(!/^images\/[a-f0-9-]+\.(jpg|png|webp)$/.test(key))return fail('Not found',404);const file=await env.MEDIA.get(key);if(!file)return fail('Not found',404);return new Response(request.method==='HEAD'?null:file.body,{headers:{'content-type':file.httpMetadata?.contentType||'image/jpeg','cache-control':'public, max-age=31536000, immutable',...secureHeaders}})}
 if(url.pathname.startsWith('/api/')){if(!env.DB)return fail('Database binding missing',503);if(!['GET','HEAD'].includes(request.method)&&!validateOrigin(request))return fail('Invalid request origin',403);const response=await api(request,env,url);for(const [k,v] of Object.entries(secureHeaders))response.headers.set(k,v);return response}
 if(!['GET','HEAD'].includes(request.method))return fail('Method not allowed',405);const result=await env.ASSETS.fetch(request);const response=new Response(result.body,result);for(const [k,v] of Object.entries(secureHeaders))response.headers.set(k,v);response.headers.set('content-security-policy',"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");return response;
 }catch(e){console.error('HoV request failure',e.message);return fail(e.status?e.message:'Unexpected server error',e.status||500)}}};
