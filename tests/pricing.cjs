const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('public/app.js','utf8').replace("window.addEventListener('hashchange',route);count();route();",'');
const context={localStorage:{getItem:()=>null}};vm.createContext(context);vm.runInContext(src,context);
vm.runInContext(`
for(const entries of Object.values(priceBook))for(const [regular,member] of Object.values(entries)){if(regular%10!==9||member%10!==9||member>=regular)throw Error('Invalid price');}
cart=[{id:'orthodox',weight:100,qty:1}];memberPreview=false;if(totals().subtotal!==299||totals().weight!==100)throw Error('Tea regular');memberPreview=true;if(totals().net!==249)throw Error('Tea member');
cart=[{id:'nilgiri',weight:250,qty:1}];if(totals().net!==549)throw Error('Coffee 250 member');memberPreview=false;if(totals().net!==599)throw Error('Coffee 250 regular');
cart=[{id:'nilgiri',weight:500,qty:1}];if(totals().net!==1299)throw Error('Coffee 500 regular');memberPreview=true;if(totals().net!==1099)throw Error('Coffee 500 member');
cart=[{id:'orthodox',weight:100,qty:2},{id:'orthodox',weight:50,qty:1}];if(totals().weight!==250||totals().net!==647)throw Error('Mixed tea packs');
cart=[{id:'nilgiri',weight:250,qty:4}];if(totals().net!==2196||totals().shipping!==0)throw Error('No stacked percentage discount');
`,context);console.log('PASS: price endings, member eligibility simulation, 100/250/500 g prices, mixed tea basket, no tier stacking, free shipping');
