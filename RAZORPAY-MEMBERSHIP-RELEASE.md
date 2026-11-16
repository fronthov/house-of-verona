# House of Verona — Live Razorpay and one-year Veronates release
Prepared 16 November 2026. Do not store payment secrets in GitHub.

## Membership conditions
New paid membership lasts exactly one calendar year from the verified captured payment, ending at the same anniversary time in IST. For 29 February purchases, expiry is 28 February in the following year. No auto-renewal or recurring charges.
Promotional price: INR 999 through 27 October 2027 (IST); INR 9,999 from 28 October 2027 for a NEW ONE-YEAR membership (not a lifetime offer). Renewals require a new checkout. Eligible tea/coffee weight discounts remain unchanged; food and books are excluded.
Existing separately granted legacy membership entitlements need individual handling.

## Card issuance after capture
1. Customer signs into existing OTP account, enters card name, accepts one-year membership terms.
2. Worker calculates amount, creates Razorpay order and records member-name intent.
3. Razorpay handles real payment. Worker verifies signature and independently queries captured payment; verifies order ID, amount and INR currency.
4. In one D1 batch the worker marks payment paid and issues an annual member card with unique ID, member name, server-time purchase timestamp and one-year expiry. TEST payments issue no real card.
5. Worker attempts to send branded card email using Resend; self-service card is at https://houseofverona.in/membership-card.html, with print/save PDF and a limited re-email action. Email delivery errors do not change a captured payment.
6. Authentication and membership discount rules check card expiry on every request. A verified FULL refund event revokes the card, without losing its historical record.

## Secrets — Cloudflare Workers > house-of-verona > Settings > Variables and Secrets
- Secret RAZORPAY_KEY_ID: rzp_live_... LIVE key
- Secret RAZORPAY_KEY_SECRET: matching live key secret
- Secret RAZORPAY_WEBHOOK_SECRET: separately generated webhook secret, SAME as set in Razorpay dashboard
- Text MEMBERSHIP_PAYMENTS_ENABLED: true, but only once live keys, webhook and pilot are ready
- Text MEMBERSHIP_LIVE_PILOT_ONLY: true during first real-money controlled test
- Secret MEMBERSHIP_LIVE_PILOT_EMAIL: a controlled signed-in member email (optional if founder's signed-in account is suitable)
- Text MEMBERSHIP_TEST_MODE: false or remove the old test setting

Razorpay Live Mode > API Keys: generate live keys after merchant verification. Set automatic capture as supported by your account.
Razorpay Live Mode > Webhooks:
URL https://houseofverona.in/api/membership/webhook
Events payment.captured AND payment.refunded.
Webhook secret must match Cloudflare's RAZORPAY_WEBHOOK_SECRET. Inspect webhook delivery logs.

## Release and verification
- Use scripts/release-to-cloudflare.ps1 from the latest GitHub review-branch download. It backs up production D1, runs tests and dry run, runs sql/expansion.sql and sql/member-cards.sql, then deploys the SAME existing Cloudflare Worker.
- Never deploy new Worker code without first applying the member-card schema.
- Before live flags: API /api/health must return 200 healthy true storeOpen true. API /api/membership/offer must show annual true with price 999 and checkoutEnabled false. Anonymous /api/membership/card must return HTTP 401.
- With live keys, webhook and live pilot flag enabled, perform ONE real INR 999 purchase using the designated pilot account, verify Razorpay captured status, account active status, card number, exact expiry and email arrival. If a charge is captured but card delivery fails, do not pay again; reconcile with support first.
- Check the pilot restriction blocks non-pilot members; after success, set MEMBERSHIP_LIVE_PILOT_ONLY to false to open public annual membership payments.
- Configure Resend verified FROM_EMAIL, payment reconciliation, refund workflow, customer policy and statutory disclosures before advertising.
- Existing coffee/tea checkout remains founder-reviewed WhatsApp/manual payment. This checkout handles only Veronates membership payments.

## Public activation through GitHub + PowerShell
- In source code, the two NON-SECRET variables are now tracked: MEMBERSHIP_PAYMENTS_ENABLED=true and MEMBERSHIP_LIVE_PILOT_ONLY=true. This is the controlled live pilot state, NOT public checkout.
- Download the latest review-branch ZIP; run scripts/release-to-cloudflare.ps1, which backs up D1, applies migrations and deploys pilot-only access.
- If the founder session isn't recognised as admin, set MEMBERSHIP_LIVE_PILOT_EMAIL to the controlled pilot login via Cloudflare Secret. Never store API tokens or private customer emails in the public repository.
- Complete one real INR 999 pilot, check captured Razorpay status, successful annual card, and email delivered to the recipient.
- Run scripts/activate-public-memberships.ps1. This checks deployed API and card page, confirms at least one real paid annual card with server-confirmed email acceptance in D1, then requests explicit OPEN confirmation, sets MEMBERSHIP_LIVE_PILOT_ONLY=false and deploys. It verifies the public offer afterwards.
- Public activation modifies local wrangler.jsonc to PILOT_ONLY=false. Commit/sync the non-secret config back to GitHub after success to avoid future deploys reversing it. Do NOT run the general pilot release script once publicly enabled.
- You may alternatively add the two variables via Cloudflare Settings if you have direct access; never put payment API keys or webhook password in the source file.
