import {priceBook} from './prices.mjs';
import {commerce} from './commerce.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function api(request,env){
 const commerceResponse=await commerce(request,env);if(commerceResponse)return commerceResponse;
 const url=new URL(request.url), path=url.pathname;
 const uid=request.headers.get('oai-authenticated-user-id');
 if(!uid)return json({error:'Sign in to your account.'},401);
 if(request.method==='POST'&&request.headers.get('origin')!==url.origin)return json({error:'Invalid request origin.'},403);
 if(!env.DB)return json({error:'Account database is not available yet.'},503);
 try{
 if(path==='/api/account'&&request.method==='GET'){
  const profile=await env.DB.prepare('SELECT display_name FROM customers WHERE user_id = ?').bind(uid).first();
  const membership=await env.DB.prepare('SELECT status FROM memberships WHERE user_id = ?').bind(uid).first();
  return json({profile:profile||{display_name:''},membership:membership?.status==='active'?'active':'inactive'});
 }
 if(path==='/api/account'&&request.method==='POST'){
  if(Number(request.headers.get('content-length')||0)>2048)return json({error:'Request too large.'},413);
  const raw=await request.text();if(raw.length>2048)return json({error:'Request too large.'},413);
  let body;try{body=JSON.parse(raw)}catch{return json({error:'Invalid data.'},400)}
  if(typeof body.display_name!=='string'||body.display_name.trim().length<1||body.display_name.length>100)return json({error:'Enter a name between 1 and 100 characters.'},400);
  await env.DB.prepare('INSERT INTO customers (user_id,display_name,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name, updated_at=excluded.updated_at').bind(uid,body.display_name.trim(),new Date().toISOString()).run();
  return json({saved:true});
 }
 if(path==='/api/orders'&&request.method==='GET'){
  const result=await env.DB.prepare('SELECT id,status,total_paise,created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(uid).all();
  return json({orders:result.results});
 }
 if(path==='/api/quote'&&request.method==='POST'){
  const raw=await request.text();if(raw.length>20000)return json({error:'Bag too large.'},413);
  let body;try{body=JSON.parse(raw)}catch{return json({error:'Invalid bag.'},400)}
  if(!Array.isArray(body.items)||!body.items.length||body.items.length>50)return json({error:'Choose between 1 and 50 bag lines.'},400);
  const membership=await env.DB.prepare('SELECT status FROM memberships WHERE user_id = ?').bind(uid).first();
  const member=membership?.status==='active';let grams=0,subtotal=0;
  for(const item of body.items){
   if(!Object.hasOwn(priceBook,item.id)||!Object.hasOwn(priceBook[item.id],item.weight)||!Number.isInteger(item.qty)||item.qty<1||item.qty>99)return json({error:'Invalid product, pack size or quantity.'},400);
   grams+=Number(item.weight)*item.qty;subtotal+=priceBook[item.id][item.weight][member?1:0]*100*item.qty;
  }
  if(grams<250)return json({error:'Minimum combined order weight is 250 g.'},400);
  const shipping=subtotal>199900?0:15000;
  return json({grams,member,subtotal_paise:subtotal,shipping_paise:shipping,total_paise:subtotal+shipping,payment_enabled:false});
 }
 return json({error:'Not found.'},404);
 }catch{return json({error:'Service temporarily unavailable. Please try again.'},503)}
}
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;
 if(path.startsWith('/api/'))return api(request,env);
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const file=ASSETS[path==='/'?'/index.html':path];
 if(!file)return new Response('Not found',{status:404});
 const bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0));
 return new Response(request.method==='HEAD'?null:bytes,{headers:{'content-type':file.type,'X-Content-Type-Options':'nosniff','cache-control':'no-cache'}});
}};
