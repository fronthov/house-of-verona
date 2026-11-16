# House of Verona — single production website

**This is one production codebase, not a separate trial storefront.** Keep `STORE_OPEN` set to `false` until the release checks pass. This is a release gate, not a different site version.

> The supplied code passes its local static syntax and business-rule tests. It **has not** been connected to your production Cloudflare, Resend, R2, GoDaddy email, DNS or payment account and has not passed live end-to-end checks. Do not take money until you verify the system. Neither domain nor any existing data has been changed by this package.

## What is included

- Premium responsive single-page shop; four Indian coffee collections and five current/planned tea products; founder vision and ₹9,999 book enquiry; contact, gallery, opening hours and SEO product URLs.
- Server-calculated cart totals and weight-based Veronates savings; 250 g minimum tea-and-coffee basket; free tea/bean shipping **strictly above** ₹1,999 after discount; ₹150 standard shipping as your previously documented default.
- Email OTP login; secure HttpOnly session cookie; member order history.
- Founder-only dashboard for order status, manual payment links/references, memberships, editable prices and images.
- Cloudflare D1 SQL persistence, private R2 image uploads, Resend login emails, WhatsApp order handoff; production ordering initially locked.
- Unit tests and dynamic XML sitemap / product SEO pages.

## Pricing provenance and constraints

The regular anchor prices of house tea 100 g ₹299, house coffee 250 g ₹599 and 500 g ₹1,299 are from your newer **PRICING.md**. The original 18-page menu and older Master Menu contain different prices and membership rules. The new quantity discount overrides old member-price columns; there is no double discount. Prices for additional origins, sizes and book are editable proposals; don't represent unverified origin/estate/grade as certified. Sikkim tea and ₹9,999 book are disabled for checkout until available. The world collection is 'coming soon'.

For thresholds: 500 g inclusive = 5%, 1 kg inclusive = 7%, **more than** 2 kg = 15%, **more than** 5 kg = 25%. Exactly 2 kg stays 7%, exactly 5 kg stays 15%. Book receives no member discount. Payment collection is after founder approval and verification.

## Step 1 — Back up the existing GitHub repository

[ ] Confirm you can sign in to GitHub and Cloudflare.

On your **Windows PC**, install Node.js 24 LTS (or supported Node >=22), Git for Windows, and VS Code. Launch PowerShell:

```powershell
node --version
npm --version
git --version
```

Create a private backup by cloning your existing GitHub repository, then copy the entire folder to a different backup location. **Do not delete the current repository or D1 database.**

```powershell
cd $HOME\Desktop
git clone https://github.com/fronthov/house-of-verona.git
Copy-Item -Path .\house-of-verona -Destination .\house-of-verona-backup -Recurse
```

Mark Step 1 complete only if all commands succeed. If the repository was already cloned, open its existing folder instead of cloning a duplicate. Work in the cloned `house-of-verona` folder.

## Step 2 — Copy final production code into the existing clone

[ ] Download/extract `HoV_Production_Website_Code.zip`.

Copy the **contents inside** its `hov-production` folder to your existing `house-of-verona` clone, **replacing the matching files**. Keep `.git` intact. Old files such as `public/commerce.js` may remain but are **not referenced** by the new `index.html`. Do **not** accidentally copy the package folder as an extra nested `hov-production` directory. In VS Code, open the clone and make sure `src/index.js`, `src/catalog.js`, `public/index.html`, `public/app.js`, `public/style.css`, `sql/production.sql`, `package.json` and `wrangler.jsonc` exist at the root.

From PowerShell in that root:

```powershell
npm install
npm test
```

Expected: all unit tests pass. DO NOT continue on failures. This repository is configured for direct Cloudflare Workers deployment; **do not switch it to Cloudflare Pages**.

## Step 3 — Provision Cloudflare R2 photos

[ ] In Cloudflare, go to R2 Object Storage and create a bucket named `hov-media`. If the bucket already exists, do not recreate it.

Alternative CLI:

```powershell
npx wrangler login
npx wrangler r2 bucket create hov-media
```

The Worker uses R2 via the `MEDIA` binding already specified in `wrangler.jsonc`. No public R2 bucket URL is required: photos are served securely through `/media/...`. Do not enable public uploads.

## Step 4 — Connect secure settings

[ ] In Cloudflare Workers & Pages, select the existing **house-of-verona Worker**. Under **Settings → Variables and Secrets**, add these **Secret** values to this Worker:

- `AUTH_PEPPER` = generate a unique random value of at least 32 characters; PowerShell: `[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))`
- `ADMIN_EMAIL` = your personal email address, the exact email you will use to sign in to the founder dashboard.
- `RESEND_API_KEY` = Resend secret API key for a verified sender domain.
- `FROM_EMAIL` = a validated Resend sending address, for example `House of Verona <orders@houseofverona.in>` **only if you own/verified that actual address**. It may instead use a different verified sender.

Never paste those secret values into chat or GitHub. **GoDaddy purchased email is mailbox hosting; Resend is transactional sending.** Verify Resend's SPF/DKIM DNS records in Cloudflare without removing GoDaddy mail MX/SPF/DKIM records. SPF should not be duplicated; follow the actual DNS records supplied by both providers.

You can also add the four secrets with CLI after the Worker exists:

```powershell
npx wrangler secret put AUTH_PEPPER
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put FROM_EMAIL
```

Each command prompts securely for the value. Do not put secrets in `wrangler.jsonc`. This step requires verified domain configuration; do not assume a purchased mailbox alone verifies Resend.

## Step 5 — Prepare the SQL tables (no legacy deletion)

[ ] Your existing Cloudflare D1 database is named `hov-store` with binding `DB` and database ID already populated in `wrangler.jsonc`. Keep it. In the project root run:

```powershell
npx wrangler d1 execute hov-store --remote --file=sql/production.sql
```

The migration creates new `hov_`-prefixed tables and indexes. It does not drop earlier tables. Verify under Cloudflare → D1 → `hov-store` → Console:

```sql
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'hov_%' ORDER BY name;
```

You should see `hov_users`, `hov_logins`, `hov_sessions`, `hov_products`, `hov_memberships`, `hov_orders`, `hov_events`, `hov_gallery` and `hov_rate_limits`. The first product API request will insert the new catalogue.

## Step 6 — Deploy code to the existing Worker, still closed to orders

[ ] Check that `wrangler.jsonc` still has `"STORE_OPEN":"false"`. In PowerShell run:

```powershell
npm test
npx wrangler deploy
```

Note: If the Worker is already automatically deployed from GitHub, choose **one source of deployment authority** for ongoing releases, not simultaneous manual and GitHub deployments. To use Cloudflare's Git integration, commit your code to the existing `main` branch and configure automatic deployment with `npm install` (install command), `npx wrangler deploy` (deploy command), and root `/`. Do not expose secrets in build logs. Run these after all local checks:

```powershell
git status
git add -A
git commit -m "Install House of Verona production storefront"
git push origin main
```

If GitHub is the deployment source, wait for Cloudflare's production deployment status to be successful before proceeding. GitHub push alone is not proof of a working site. Keep the Worker name `house-of-verona`.

## Step 7 — Test identity and founder access

[ ] Visit the Worker URL. Open **Account**, type your exact `ADMIN_EMAIL`, obtain the OTP in your mailbox and sign in. Confirm that **Founder dashboard** appears only for your email. Sign in with a different customer email and ensure there is no admin dashboard.

[ ] Verify that orders remain blocked while `STORE_OPEN=false` and that customer sign-in emails actually deliver. If login does not work, inspect Cloudflare Worker logs and Resend sending-domain status.

## Step 8 — Add photographs without touching code

[ ] From the website sign in as founder → **My Account** → **Founder dashboard** → **Upload photos**.

- Select a JPEG, PNG or WEBP from phone, tablet or PC, maximum 5 MB.
- Choose **A product image** and choose a product; or **Photo gallery** and enter a caption.
- Click **Upload and publish**. The image is stored in Cloudflare R2 and the D1 database references it.
- Verify the image appears on a separate browser or device.

Use photos you own or have permission to use. Product photos should be approximately square; café/gallery images work well at 4:3 or 3:2. Create a named admin photo gallery album separately if you want fine-grained image management, but the basic uploader requires no coding.

## Step 9 — Verify ordering end-to-end **without collecting payment**

[ ] On an ordinary customer login, add coffee/tea packs totalling 250 g or more. Check quote, saved address, discount and delivery. Current checkout remains closed until Step 11.

[ ] Use the founder dashboard to add inventory-ready products, confirm the four coffee states and five tea product sources, and update any provisional price that has failed landed-cost review. Disable products that cannot be supplied. The book is listed as an enquiry only until the collector's edition and delivery terms are confirmed.

[ ] Confirm that you are ready to receive orders before changing the launch gate. After opening, use a small **real** order where you control buyer and seller, and verify its full lifecycle. No fake/test payments are needed.

## Step 10 — GoDaddy domain, Cloudflare DNS, Google and contact

[ ] In Cloudflare, Worker → **Settings → Domains & Routes → Add → Custom Domain**, set `houseofverona.in` for the existing Worker. Add a redirect from `www.houseofverona.in` to the root domain; do not change GoDaddy nameservers if the domain already delegates correctly to Cloudflare. Preserve all mail records. Cloudflare will create the necessary web DNS record and certificate.

[ ] Replace the generic Instagram link in `public/index.html` with the exact HoV Instagram URL and replace the Google Maps search link with the verified Google Business Profile place link. Verify café address and opening hours, including the 2:00 AM following-day closing time. Do not claim an unverified Google location as the exact café listing.

[ ] In Google Search Console, verify `houseofverona.in` and submit `https://houseofverona.in/sitemap.xml`. Search ranking is earned over time and not guaranteed. Check live Product structured data and indexing before public announcement.

## Step 11 — Payment choices

**Working first-year mode:** Founder reviews each order, marks it `approved`, then creates a payment link in the secure Razorpay merchant dashboard (or communicates verified manual bank/UPI payment information). Paste the payment link in the order dashboard and update to `payment_pending`. Only mark `paid` after independently verifying money in the payment provider or business bank account. Never assume that opening a link means payment succeeded.

**Important:** This package does **not** contain Razorpay API integration or automatic verified webhook processing. That requires your merchant activation and a further implementation/verification within this same codebase. Do not describe manual payment-link entry as an automated gateway. This code intentionally never collects card details.

## Step 12 — Publish

[ ] When product stock, seller policies, shipping coverage, images, email delivery, admin access and checkout are verified, change **only** `"STORE_OPEN":"false"` to `"STORE_OPEN":"true"` in `wrangler.jsonc`, then deploy from the chosen deployment authority. This unlocks ordering in the same production website.

[ ] Inspect the site from mobile, tablet and PC; verify an actual order appears in the founder dashboard and the customer history, that WhatsApp message carries the same order ID, and that you can approve, record verified payment and mark dispatch.

[ ] Set a reminder to review abandoned `awaiting_whatsapp` requests and `payment_pending` orders. The app records them, but **does not automatically send WhatsApp reminders or charge payments**.

## Operational / regulatory requirements before launch

- Publish your verified business identity, physical address, contact and applicable FSSAI licence details as appropriate to packaged food sales; have shipping, refund, returns, privacy and cancellation terms professionally checked. This package has explanatory footer text, not an exhaustive legally approved policies module.
- Product catalogues must be aligned with real inventory and valid origin claims. Shipping is assumed pan-India but courier PIN-code coverage and actual charges must be confirmed manually before founder approval.
- Maintain R2/D1 backups, Cloudflare access controls, a review process for refunds and payment reconciliation, and a documented staff escalation process. Rate limiting exists but should be supplemented with Cloudflare security/WAF controls.
- No guaranteed first-place Google ranking. Search Console and product sitemaps establish a crawlable foundation.

## Troubleshooting

- Blank site: examine Cloudflare deployment logs; ensure all files are in repository root and Wrangler `assets.directory` points at `./public`.
- API 500: run the SQL migration and verify `DB` binding and R2 bucket `MEDIA`.
- OTP email fails: verify Resend domain records and `RESEND_API_KEY`/`FROM_EMAIL` secrets.
- Admin button missing: `ADMIN_EMAIL` secret must exactly match the signed-in address.
- Images not uploading: check R2 bucket/binding and image size/type.
- Prices differ from earlier menus: your latest changed Veronates discount instruction intentionally supersedes earlier fixed member prices.
- Checkout closed: intended until `STORE_OPEN` is deliberately changed and redeployed.

**Support checkpoints:** Complete Steps 1–2, verify `npm test`, then proceed through remaining steps one at a time. Never send API keys, email OTPs, passwords or secret values to an assistant.
