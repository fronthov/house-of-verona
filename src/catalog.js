// Public regular prices, in rupees. All SKU prices end in 9.
// House anchors from HoV's November 11 pricing reference; other items are proposed.
export const catalog = [
  {id:'tamil',name:'Tamil Nadu Hills Coffee',category:'coffee',origin:'Tamil Nadu',description:'Indian-origin whole bean coffee. Producer and batch notes will accompany verified stock.',prices:{50:149,250:599,500:1299,1000:2299},sort:1},
  {id:'kerala',name:'Kerala Reserve Coffee',category:'coffee',origin:'Kerala',description:'A coffee collection inspired by Kerala, available in your preferred roast.',prices:{50:149,250:599,500:1299,1000:2299},sort:2},
  {id:'karnataka',name:'Karnataka Estate Coffee',category:'coffee',origin:'Karnataka',description:'Speciality coffee selected from Karnataka. Estate-level details disclosed after verification.',prices:{50:169,250:699,500:1499,1000:2699},sort:3},
  {id:'andhra',name:'Andhra Araku Coffee',category:'coffee',origin:'Andhra Pradesh',description:'Coffee from the Andhra Pradesh collection; batch traceability added as stock is verified.',prices:{50:179,250:749,500:1599,1000:2899},sort:4},
  {id:'orthodox',name:'House Orthodox Black Tea',category:'tea',origin:'Source confirmation pending',description:'Whole-leaf orthodox black tea for a clean, expressive infusion.',prices:{50:169,100:299,250:699,500:1299,1000:2399},sort:10},
  {id:'assam',name:'Assam Black Tea',category:'tea',origin:'Assam · source verification pending',description:'Black tea collection. Individual estate and harvest credentials will be displayed once verified.',prices:{50:179,100:329,250:749,500:1399,1000:2599},sort:11},
  {id:'gunpowder',name:'Gunpowder Green Tea',category:'tea',origin:'Source confirmation pending',description:'Rolled green tea leaves for a refreshing, structured cup.',prices:{50:199,100:349,250:799,500:1499,1000:2799},sort:12},
  {id:'himalayan',name:'Himalayan Orthodox Black Tea',category:'tea',origin:'Himalayan region · source verification pending',description:'A mountain-inspired loose leaf selection. Specific source pending verification.',prices:{50:229,100:399,250:899,500:1699,1000:3199},sort:13},
  {id:'kanchenjunga',name:'Kanchenjunga Black Tea',category:'tea',origin:'Origin verification pending',description:'A black tea selection inspired by Himalayan tea traditions; specific producer and region to be verified before claim.',prices:{50:219,100:379,250:849,500:1599,1000:2999},sort:14},
  {id:'sikkim',name:'Sikkim Tea Collection',category:'tea',origin:'Sikkim · source verification pending',description:'Reserved for a verified Sikkim-origin tea lot; not for sale until sourced.',prices:{50:249,100:449,250:999,500:1899,1000:3599},enabled:0,sort:14},
  {id:'coffee-book',name:'Beyond the Cup — Founder’s Coffee Book',category:'book',origin:'By Dishant RD',description:'A premium founder-authored coffee reference. Availability and physical edition specifications must be confirmed before fulfilment.',prices:{1:9999},enabled:0,sort:20}
];
export const discountPercent=grams=>grams>5000?25:grams>2000?15:grams>=1000?7:grams>=500?5:0;
export const calculate=(items,products,member,{standardShipping=150,bookShipping=0}={})=>{
 if(!Array.isArray(items)||!items.length||items.length>30)throw Error('Cart must contain 1–30 products');
 const lines=[];let subtotal=0,eligible=0,hasGoods=false,hasBook=false;
 for(const i of items){const p=products.find(x=>x.id===i.id&&x.enabled);const grams=Number(i.grams),qty=Number(i.qty);if(!p||!Number.isSafeInteger(grams)||!Number.isSafeInteger(qty)||qty<1||qty>20)throw Error('Invalid or unavailable product');const price=p.prices[String(grams)];if(!Number.isSafeInteger(price)||price<1)throw Error('Invalid pack size');
  const roast=p.category==='coffee'?String(i.roast||'Medium'):'',grind=p.category==='coffee'?String(i.grind||'Whole bean'):'';
  if(p.category==='coffee'&&(!['Light','Medium','Medium-dark','Dark'].includes(roast)||!['Whole bean','Espresso','Pour-over','French press','Moka pot'].includes(grind)))throw Error('Invalid coffee preparation');
  const amount=price*qty;subtotal+=amount;if(p.category!=='book'){hasGoods=true;eligible+=grams*qty}else hasBook=true;
  lines.push({id:p.id,name:p.name,category:p.category,grams,qty,roast,grind,unitPrice:price,amount});
 }
 if(hasGoods&&eligible<250)throw Error('Tea and coffee must total at least 250 g');
 const rate=member?discountPercent(eligible):0;
 const eligibleSubtotal=lines.filter(x=>x.category!=='book').reduce((s,x)=>s+x.amount,0);
 const discount=Math.round(eligibleSubtotal*rate/100);
 const goodsNet=eligibleSubtotal-discount;
 const shipping=(hasGoods&&goodsNet<=1999?standardShipping:0)+(hasBook?bookShipping:0);
 const total=subtotal-discount+shipping;
 if(total<1||total>1000000)throw Error('Order amount exceeds allowed limits');
 return {lines,subtotal,discount,shipping,total,memberDiscountPercent:rate,eligibleWeight:eligible,freeGoodsShipping:hasGoods&&goodsNet>1999};
};
