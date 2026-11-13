# House of Verona

Private source repository for the HoV storefront: official logo, coffee and tea catalogue, regular/Veronates pricing, shopping bag and launch roadmap.

**Stage: Cloudflare migration scaffold. Not a functioning public shop.** No live orders, payments, independent customer login or messaging are enabled. The existing private Sites preview is unchanged.

## What this repository contains
- `public/`: existing storefront and official logo; Cloudflare-specific unavailable-feature messaging.
- `cloudflare/entry.mjs`: Cloudflare entry point; maintenance mode by default, all account/payment APIs disabled.
- `worker/`: preserved Sites-specific backend reference and simulated integration tests. **Do not use `worker/index.mjs` as the Cloudflare entry point.** Its identity headers were supplied by Sites and are not trustworthy on an ordinary public Worker.
- `drizzle/`: preserved SQL schemas; no customer/order data or credentials.
- `tests/`: price, account isolation, SQLite stock/payment simulations and Cloudflare migration guards.
- `docs/CLOUDFLARE_SETUP.md`: next setup steps.

## Local Windows development
Install Node.js 24 LTS and Git, clone this repository, then open PowerShell in the repository folder:

```powershell
npm test
npm run build
npm run dev
```
The first Wrangler run may request permission to download the official `wrangler` npm package. The project currently has no npm dependencies. Wrangler is invoked using major version 4; pin an exact version and lockfile when deployment tooling is installed.

Development starts in maintenance mode. For a design preview only, locally set `PREVIEW_ENABLED` to `true` in `wrangler.jsonc`. This does not activate APIs, payments or accounts. Do not enable a public preview until its intended audience is agreed.

## Next milestones
1. Connect Cloudflare to this GitHub repository and deploy the maintenance build.
2. Create a D1 database and add its actual binding; apply migrations to a fresh database only.
3. Replace Sites sign-in with independent HoV authentication and verified email flow.
4. Reconnect/test stock management, Razorpay and membership using the new authenticated identity.
5. Add real shipping/fulfilment, signed payment webhooks, refunds and confirmations.
6. Confirm catalogue, policies, security and capacity tests; attach the GoDaddy-owned domain and launch.

Never commit passwords, payment secrets, email API keys, customer exports or `.dev.vars`. No secrets are included here.
