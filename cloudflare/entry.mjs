// Independent Cloudflare entry point. Never trust caller-supplied Sites identity headers.
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
export default {
 async fetch(request,env){
  const path=new URL(request.url).pathname;
  if(path==='/api/health')return json({service:'House of Verona',stage:'migration',checkout:false,accounts:false});
  if(path==='/api'||path.startsWith('/api/'))return json({error:'HoV customer accounts and checkout are being connected. No purchase has been made.'},503);
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  if(env.PREVIEW_ENABLED!=='true')return new Response(request.method==='HEAD'?null:'House of Verona — our online store is being prepared. Orders are not open yet.',{status:503,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','retry-after':'3600','x-robots-tag':'noindex, nofollow'}});
  const result=await env.ASSETS.fetch(request);
  const response=new Response(result.body,result);response.headers.set('x-robots-tag','noindex, nofollow');response.headers.set('x-content-type-options','nosniff');response.headers.set('referrer-policy','strict-origin-when-cross-origin');return response;
 }
};
