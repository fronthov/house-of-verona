const $=id=>document.getElementById(id);
const indianDate=sec=>new Intl.DateTimeFormat('en-IN',{
 timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true
}).format(new Date(sec*1000))+' IST';
async function loadCard(){
 try{
  const response=await fetch('/api/membership/card',{credentials:'same-origin'});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'Unable to load your membership card. Sign in to your account first.');
  const card=result.card;
  $('cardName').textContent=card.name;
  $('cardNumber').textContent=card.id;
  $('cardStart').textContent=indianDate(card.purchasedAt);
  $('cardEnd').textContent=indianDate(card.expiresAt);
  $('cardStatus').textContent=card.status.toUpperCase();
  if(card.status!=='active')$('cardArea').classList.add('card-expired');
  $('cardArea').hidden=false;
  $('cardMessage').textContent=card.status==='active'?'Your verified one-year membership card is ready.':
   'This card has expired. New purchases are required to continue member benefits.';
  $('printCard').onclick=()=>window.print();
  $('emailCard').disabled=card.status!=='active';
  $('emailCard').onclick=async()=>{
   $('emailCard').disabled=true;
   $('emailMessage').textContent='Sending your card…';
   try{
    const res=await fetch('/api/membership/card/email',{method:'POST',credentials:'same-origin',
      headers:{'content-type':'application/json'},body:'{}'});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Card email failed');
    $('emailMessage').textContent=data.message||'Card email sent.';
   }catch(e){$('emailMessage').textContent=e.message}
   finally{$('emailCard').disabled=card.status!=='active'}
  };
 }catch(e){
  $('cardMessage').textContent=e.message+' Visit the home page to sign in, or contact info@houseofverona.in.';
 }
}
loadCard();
