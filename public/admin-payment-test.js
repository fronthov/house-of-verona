const $=id=>document.getElementById(id);
const dt=sec=>new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',
 day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',
 hour12:true}).format(new Date(sec*1000))+' IST';
async function api(path,method='GET',data){
 const r=await fetch(path,{method,credentials:'same-origin',
   ...(data?{headers:{'content-type':'application/json'},body:JSON.stringify(data)}:{})});
 let result;try{result=await r.json()}catch{throw Error('Unexpected server response')}
 if(!r.ok)throw Error(result.error||'Request failed');
 return result;
}
async function loadRazorpay(){
 if(window.Razorpay)return window.Razorpay;
 await new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';
  s.onload=resolve;s.onerror=()=>reject(Error('Unable to load secure Razorpay checkout'));
  document.head.appendChild(s);
 });
 if(!window.Razorpay)throw Error('Razorpay could not initialise');
 return window.Razorpay;
}
function renderCard(card){
 $('checkoutSection').hidden=true;
 $('verifiedName').textContent=card.name;
 $('verifiedNumber').textContent=card.id;
 $('verifiedFrom').textContent=dt(card.purchasedAt);
 $('verifiedUntil').textContent=dt(card.expiresAt);
 $('verifiedSection').hidden=false;
 $('status').textContent='Razorpay captured ₹1 and the founder verification card was generated. No member benefits were activated.';
 $('emailStatus').textContent=card.emailAccepted?'Card email submitted to Resend. Confirm it arrived in your inbox.':
 'Card email not confirmed. Use the email button after checking Resend configuration.';
 $('printCard').onclick=()=>window.print();
 $('resendCard').onclick=async()=>{
  $('resendCard').disabled=true;
  try{
   const result=await api('/api/admin/membership-test/email','POST',{});
   $('emailStatus').textContent=result.emailAccepted?
     'Card email accepted for delivery. Check your inbox.':
     'Email delivery not confirmed; please check Resend logs.';
  }catch(e){$('emailStatus').textContent=e.message}
  finally{$('resendCard').disabled=false}
 };
}
async function start(){
 try{
  const info=await api('/api/admin/membership-test/status');
  if(info.card){renderCard(info.card);return}
  if(!info.enabled){$('status').textContent='Founder ₹1 test is disabled. Set ADMIN_ONE_RUPEE_TEST_ENABLED=true in the Worker to enable it.';return}
  $('status').textContent='Only your signed-in founder account can make this real ₹1 verification charge.';
  $('checkoutSection').hidden=false;
  $('payOneRupee').onclick=async()=>{
   const name=$('cardNameInput').value.trim();
   if(name.length<2||name.length>80){$('status').textContent='Enter the full name to put on the verification card.';return}
   $('payOneRupee').disabled=true;
   try{
    const order=await api('/api/admin/membership-test/checkout','POST',{name});
    const Razorpay=await loadRazorpay();
    new Razorpay({
     key:order.keyId,order_id:order.orderId,amount:100,currency:'INR',
     name:'House of Verona',description:'Founder ₹1 Verification — Not Membership',
     prefill:{email:info.email},theme:{color:'#073c2d'},
     handler:async response=>{
      try{
       const outcome=await api('/api/admin/membership-test/verify','POST',{
        razorpay_order_id:response.razorpay_order_id,
        razorpay_payment_id:response.razorpay_payment_id,
        razorpay_signature:response.razorpay_signature
       });
       renderCard(outcome.card);
      }catch(e){
       $('status').textContent='Verification pending: '+e.message+
       '. If money was deducted, DO NOT PAY AGAIN. Inspect Razorpay and webhook logs.';
      }
     },
     modal:{ondismiss:()=>{$('payOneRupee').disabled=false}}
    }).open();
   }catch(e){$('status').textContent=e.message;$('payOneRupee').disabled=false}
  };
 }catch(e){
  $('status').textContent=e.message+' Sign in as the House of Verona founder first.';
 }
}
start();
