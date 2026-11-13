# HoV connection handover

This deployment is PRIVATE and LIVE CHECKOUT IS DISABLED. No real orders, memberships, emails or WhatsApp messages have been sent by development tests.

## Implemented
- Platform ChatGPT accounts and SQL profiles. HoV email/password registration remains unimplemented.
- Administrator stock editor, optimistic revision checks, separate test/live stock, audit rows.
- Razorpay test Orders API, server amounts, idempotent local request IDs, HMAC verification plus fetched captured-payment checks, manual recovery from provider order payments.
- Database transaction reserves test stock and creates line snapshots. Test purchases cannot change live stock or real memberships.
- Test order history and test-only membership activation.
- Resend test confirmation adapter. Sending requires an explicit enable flag. Provider errors become needs_review; no blind resend after ambiguous outcomes.

## Secure runtime settings (not source files)
- HOV_ADMIN_EMAIL: configured from the verified Site owner; not exposed to visitors.
- CHECKOUT_MODE: currently disabled. Set to test only after configuring test keys.
- RAZORPAY_KEY_ID: test key ID for the correct Razorpay account.
- RAZORPAY_KEY_SECRET: SECRET from the same test key pair.
- RESEND_API_KEY: SECRET from the verified sending-domain account.
- EMAIL_FROM: verified sender, e.g. House of Verona <noreply@houseofverona.in>, only once domain verification succeeds.
- EMAIL_SEND_ENABLED: true only when the owner is ready to send test confirmations.
Never paste secrets into chat or commit them to Git. Configure runtime secrets through supported secure hosting controls. Redeploy to apply environment revisions.

## Merchant actions
1. Configure Razorpay test credentials securely.
2. In Connections > Manage stock, enter test packs for the exact roast/grind/weight.
3. Complete a test purchase and check Test orders. Confirm no real membership activated.
4. Configure verified email sender and test a confirmation to the signed-in account.
5. Supply actual live inventory; dispatch and support details; confirm product sourcing, tax treatment and policies.
6. Choose and connect a WhatsApp Business API provider, verify the number and approve templates. No WhatsApp adapter is currently enabled.

## Before real sales
- Live order/shipping-address capture, PIN-code validation, fulfilment/admin order tools, invoice/refund workflow.
- Signed webhooks on an accessible endpoint with event deduplication and reconciliation; private Site access currently blocks third-party callbacks.
- Safe cancellation/expiration of reservations: unpaid test stock is intentionally held for manual review; never restore it while the provider could still capture payment.
- Resolve ambiguous provider-order creation timeouts before another payment.
- Background confirmation delivery and recovery; WhatsApp consent/templates/status handling.
- Final policies, tax and catalogue approval; mobile/browser tests; hosted account isolation tests; capacity/backups/monitoring.
- No code path currently accepts rzp_live keys. Live release requires a later reviewed implementation and provider tests.

References consulted: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps and https://resend.com/docs/api-reference/emails/send-email
