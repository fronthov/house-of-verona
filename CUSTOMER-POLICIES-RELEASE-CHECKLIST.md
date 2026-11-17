# House of Verona — customer policy release checklist

Prepared 16 November 2026 on a review branch. **Do not merge into main or deploy the policy pages until the business contact and operational details below are checked.** The six pages are customer-facing draft HTML and the checkout/footer links are added in this branch.

## Verified from the current site and founder confirmation
- Confirmed paid orders: dispatch within **3–5 working days after payment verification** (NOT a delivery-time guarantee).
- Standard tea/coffee shipping: ₹150; free only when the eligible after-discount tea-and-coffee subtotal is **strictly above ₹1,999**, not equal.
- Tea+coffee baskets require 250 g eligible weight; combined-weight Veronates member pricing applies with thresholds exactly as defined in src/catalog.js.
- Orders are submitted as requests; founder approval and manual payment coordination happen before fulfilment. No on-site automated card checkout.
- House of Verona public support WhatsApp: +91 8799817395.
- Founder-designated public email for all general information, orders, support and franchise enquiries: info@houseofverona.in. Same WhatsApp number for all: +91 8799817395. Inbox delivery has **not** been independently tested.
- Public-facing location supplied by founder: Beside Aradhya Jewellers, Verona St., Nandanvan, Nagpur, Maharashtra 440024, India. Google Maps: https://maps.app.goo.gl/tVNhdPCAdc9PGngu5. The map destination has not been independently checked. Book remains enquiry only.

## Must confirm before public promotion and publication
1. **Registered legal entity/trading name** for legal policies and invoices still needs verification. Public-facing name: House of Verona. Public location supplied: Beside Aradhya Jewellers, Verona St., Nandanvan, Nagpur, Maharashtra 440024, India. Confirm whether this is the legal principal business address.
2. **Designated grievance officer name, contact email and number**; operational system to acknowledge complaints within 48 hours and resolve within 1 month.
3. **Send a test message to info@houseofverona.in** and confirm replies arrive. The founder designated this address for general information, franchise and customer support, and +91 8799817395 as the shared WhatsApp number.
4. Confirm **FSSAI category/licence coverage for online packaged food orders**, seller/packer details, mandated food labelling (FSSAI number, batch, packed-on/best-before, MRP etc. as applicable).
5. Confirm packaging, eligible PIN codes, carrier shipping/service terms; choose a **specific refund processing timeframe** and a workable refund/return logistics SOP.
6. Review privacy handling and **document data-retention schedule** / response procedures (email, addresses, orders); third-party service-provider disclosures.
7. Homepage map link updated to the founder-supplied URL; verify its destination and replace the still-generic Instagram link before announcing café opening.
8. Verify that running a GitHub deployment will **not overwrite** live secrets/bindings or unintentionally change the deployed Cloudflare worker. Check preview and staging tests before merging.

## Rules and legal research — check current applicability with adviser
- Consumer Protection (E-Commerce) Rules, 2020: transparency on payments, returns, refunds, shipment and complaint handling. Source: https://consumeraffairs.gov.in/public/upload/files/E%20commerce%20rules_1732703966.pdf
- 2026 amendment published September 2026 takes effect **1 January 2027**, not yet in force on 16 Nov 2026. Source: https://consumeraffairs.gov.in/public/upload/files/E%20Commerce%20Amendment%20Rules%202026_1789128659.pdf
- DPDP Rules, 2025 have staged commencement. Source: https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf
- FSSAI licensing and specific e-commerce FBO obligations should be validated against the actual legal operating model, not guessed from the café licence. Sources: https://fssai.gov.in/business/registration and https://www.fssai.gov.in/upload/advisories/2026/03/69baca7e9787aCompliance%20Obligation%20ONDC%20Model.pdf

Public-facing House of Verona name, location and WhatsApp are provided by the founder. Registered legal entity identity, legal principal address status, FSSAI number, grievance identity and guaranteed refund timetable remain to be confirmed.

## Brand identity and future logo
- Founder vision and franchise overview pages have been drafted. Preserve precise Indian-origin claims and premium all-day café positioning.
- **Do not replace the current wordmark or design packaging until the founder provides the final approved logo artwork.** After upload, update navbar, footer, social OG, favicon, product pack templates and downloadable brand references consistently. Uploaded logo must be a real authorized brand asset.
- The confidential initial franchise fee must not be stored in the public repository, client JavaScript, static HTML or metadata. Only provide commercial details in response to an explicit prospect request.

## Expanded website release gates (founder, franchise and Veronates)
- [ ] New public SEO pages /vision.html and /franchise.html and founder homepage section reviewed for accurate claims, typography and mobile layout.
- [ ] Official final logo file NOT yet supplied. Continue using current provisional text identity until approved master artwork is provided. When received, update all brand touchpoints and package mockups deliberately.
- [ ] Franchise minimum **800 sq ft**, royalty **2% of total sales yearly**, five-year initial term; keep initial franchise fee confidential in all public files. See FRANCHISE-LEGAL-REVIEW.md.
- [ ] Grievance Officer Rohit Wanjari, +91 9657452160, info@houseofverona.in. Confirm he accepts direct complaints and test contact inbox and calls.
- [ ] Verify the registered legal operator and House of Verona's trademark ownership for public legal disclosures and franchise contracts.
- [ ] Apply sql/expansion.sql to Cloudflare D1 **before** deploying expanded Worker. Back up the production DB first; never remove existing tables.
- [ ] Add Razorpay key ID, key secret and webhook secret as Cloudflare Worker **secrets**. Never paste API secret into chat, a public Git repo or HTML. Do not assume account activation is complete.
- [ ] Keep **MEMBERSHIP_PAYMENTS_ENABLED** absent or false until approved by founder, test-mode integration works and webhook delivery is validated. Membership amount is computed on the server and must be checked against the captured payment.
- [ ] Verify Razorpay signature with server-recorded order ID, verify amount/currency/status via API, test webhook duplicate and out-of-order delivery and refund/chargeback reconciliation. Only then consider live enablement. Consult Razorpay's published checklist: https://razorpay.com/security/checklist/
- [ ] Confirm member purchase provisions, consent and valid refund rules. Verify opening price ₹999 until 27 October 2027, ₹9,999 from 28 October 2027; lifetime eligibility applies to both.
- [ ] Confirm franchise email delivery from Resend and application persistence, rate limiting, consent receipt and staff assignment.
- [ ] Complete review of privacy retention and franchising terms with qualified legal adviser; no agreement is 'loophole-free'.
- [ ] Run existing and expansion automated tests, production-data migration check, preview browser tests, Razorpay test transactions, security regression tests, website responsive and accessibility tests.
- [ ] Do not merge into main or redeploy live site automatically before the above conditions and deployment settings are confirmed.

## Uploaded founder logo / origins
- Approved gold-on-deep-green logo is committed as an optimized `public/assets/hov-emblem.webp`. Original 1254px PNG remains the print-artwork source; do not upscale small web image for physical packages.
- The asset is applied to nav/footer, page favicons and OG image metadata, product display mockups, Veronates and founder book.
- Nine origin examples: Chikkamagaluru, Wayanad, Yercaud, Araku Valley; Dibrugarh, Darjeeling, Temi, Namsai and Kangra. These are geography examples, NOT unverified stock/supplier claims.

## One-year card change, 16 November 2026
- New paid Veronates membership is one calendar year, superseding earlier lifetime marketing. INR 999 through 27 Oct 2027; INR 9999 from 28 Oct 2027 for one year. No automatic renewal.
- D1 sql/member-cards.sql must run before production Worker deployment.
- Verified captured live payment generates named unique digital card with start/end timestamps, automatic Resend email attempt and member account link.
- Expired/revoked cards cannot grant discounts; payment.refunded must be subscribed in Razorpay Live Webhooks.
- Pilot real-money checkout is limited to founder or configured pilot member until verified. Merchant keys remain private in Cloudflare.
- See RAZORPAY-MEMBERSHIP-RELEASE.md for controlled activation steps.
