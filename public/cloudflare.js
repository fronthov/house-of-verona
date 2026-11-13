// Cloudflare migration messaging. No account or payment data is collected.
const pendingAccount=()=>modal('<span class="eyebrow">HOUSE OF VERONA</span><h2>Your account is coming.</h2><p>We’re connecting HoV customer sign-in and email verification. Accounts and purchases are unavailable in this migration preview.</p><button class="primary" onclick="closeModal()">Continue browsing</button>');
account=pendingAccount;
setupPanel=()=>modal('<h2>Store setup in progress.</h2><p>The storefront has moved into our own code repository. Customer login, database binding, payments and confirmations still need connecting on Cloudflare.</p><div class="notice">No order or membership purchase can be made here yet.</div>');
checkout=()=>modal('<h2>Your bag is saved.</h2><p>Checkout is not open yet. Your bag stays in this browser; no payment or order has been created.</p><button class="primary" onclick="showCart()">Back to bag</button>');
join=()=>modal('<h2>Veronates · ₹999 lifetime</h2><p>Membership sales will open after customer accounts and payment verification are ready.</p><div class="notice">No membership has been activated.</div>');
if(location.hash==='#account')account();if(location.hash==='#connections')setupPanel();
