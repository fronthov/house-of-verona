import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
for(const file of ['public/app.js','public/launch.js','public/commerce.js','public/cloudflare.js','worker/index.mjs','worker/commerce.mjs','cloudflare/entry.mjs']){
 const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(r.status!==0)process.exit(1);
}
const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
if(config.main!=='cloudflare/entry.mjs'||config.assets.run_worker_first!==true)throw Error('Unsafe Cloudflare entry point or asset routing');
if(!existsSync('public/assets/hov-official-logo.png'))throw Error('Missing official logo');
console.log('Source syntax, logo and guarded Cloudflare configuration checked. No hosted services were tested.');
