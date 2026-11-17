# House of Verona — public Veronates release (17 November 2026)

## Founder-approved configuration
- `MEMBERSHIP_PAYMENTS_ENABLED=true` — live Razorpay only.
- `MEMBERSHIP_LIVE_PILOT_ONLY=false` — real INR 999 one-year membership available to all signed-in customers.
- `ADMIN_ONE_RUPEE_TEST_ENABLED=false` — no more INR 1 admin payment creation. Existing test verification receipts remain accessible only to the founder.
- INR 999 introductory annual rate through 27 October 2027 IST; from 28 October 2027 it changes to INR 9999 for one year under the existing pricing code.
- Coffee/tea quantities continue to use the same membership discounts; this release does not modify other product checkout.

## Verified and unverified
- Founder reports INR 1 REAL Razorpay payment succeeded, a verification card was generated, and an email arrived.
- This tests live capture, HMAC verification, card/email plumbing, and the separate founder test table.
- The real INR 999 membership purchase path, actual `hov_member_cards` creation and customer discount entitlements remain untested end-to-end by a real captured customer payment. Never describe this as fully verified.
- The first real customer purchase should be monitored in Razorpay, production `hov_membership_payments`, `hov_member_cards`, and Resend. Resolve captured-but-unfulfilled orders without recharging.

## Controlled release and code freeze
1. Use the reviewed, pinned commit (or release branch pointing to it), never a changing download of `main`.
2. Run `npm.cmd install` and `scripts/release-to-cloudflare.ps1` on Windows; the script tests code, backs up D1, applies idempotent SQL migrations, deploys the existing Worker and checks live public checkout API, card page and admin test assets.
3. Confirm unauthenticated `GET /api/membership/offer` returns `annual=true`, `price=999`, `checkoutEnabled=true`, `testMode=false`.
4. Sign in with a normal customer account to confirm checkout is visible. The admin test status should report `enabled:false`.
5. Do not change this release branch after launch. Future changes need a new review branch, tests, production backup, PR, and separately versioned release.
6. Enable GitHub branch protection/rulesets for the release branch through GitHub Settings: restrict force pushes and deletion; require pull request approval and CI. A branch alone is a snapshot, not technical edit protection.
7. Maintain Cloudflare Secrets for LIVE Razorpay keys, webhook secret, Resend sender, auth pepper and admin email; do not put secrets in GitHub.
8. Keep customer support ready for captured but unfulfilled membership payments.
