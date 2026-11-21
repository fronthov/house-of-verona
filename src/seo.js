const SITE = 'https://houseofverona.in';
const BRAND = 'House of Verona';
const LOGO = '/assets/house-of-verona-gold-emblem-nagpur.png';
const MAP = 'https://www.google.com/maps/search/?api=1&query=House+of+Verona+Nagpur';
const WHATSAPP = 'https://wa.me/918799817395';
const COFFEE = '/indian-specialty-coffee';
const TEA = '/indian-loose-leaf-tea';
const ORIGINS = '/indian-coffee-origins';
const CAFE = '/specialty-coffee-nagpur';
const staticPaths = ['/', '/brand', '/franchise', COFFEE, TEA, ORIGINS, CAFE];

export const htmlEscape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const e = htmlEscape;
const jsonLd = value => JSON.stringify(value).replace(/</g, '\\u003c');
const productPath = id => '/product/' + encodeURIComponent(id);

const guides = {
  tamil: 'Tamil Nadu’s coffee-growing landscapes include the Shevaroys, Nilgiris and Anamalais. Try a pour-over to get to know the coffee on its own. For a side-by-side comparison with other Indian origins, use the same grind and brew ratio.',
  kerala: 'Wayanad and Travancore are two of Kerala’s coffee-growing regions. When comparing roast choices, keep the brew method the same. Try a French press if you like a fuller-bodied cup, or a paper filter for a lighter texture.',
  karnataka: 'Karnataka’s coffee regions include Chikkamagaluru, Kodagu and the Bababudangiris. Try espresso or a moka pot for a concentrated cup, and ask us to confirm the estate and process for the batch you’re considering.',
  andhra: 'Araku Valley lies in the Eastern Ghats. Try a paper-filter pour-over to compare the cup with a Western Ghats coffee. Ask us for the available batch’s source, roast and processing details if you’re choosing by provenance.',
  orthodox: 'Orthodox black tea is made from leaves that are rolled before oxidation and drying. Start with about 2 g per 200 mL of water and taste after three minutes. Adjust the steep time to suit your preference.',
  assam: 'Assam is a classic region to explore if you enjoy a full cup of black tea. Taste it plain first, then try it with a splash of milk. A shorter steep is a good starting point if you prefer less astringency.',
  gunpowder: 'Gunpowder green tea takes its name from the shape of its tightly rolled leaves. Use water below boiling and start with a short steep. Leave room in your infuser for the leaves to unfurl.',
  himalayan: 'For this black tea, start with a three-minute infusion and taste before extending the steep. Ask us for the current batch’s verified garden and harvest details if you’re choosing by origin.',
  kanchenjunga: 'Try this black tea plain on the first steep, then taste it again as it cools. Ask us to confirm the current batch’s producer and growing region if provenance matters to you.',
};

function page(path, title, description, content, { data, image } = {}) {
  const canonical = SITE + path;
  const shareImage = image || SITE + '/assets/house-of-verona-official-logo-nagpur.png';
  const markup = data ? `<script type="application/ld+json">${jsonLd(data)}</script>` : '';
  return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${e(description)}">
<link rel="canonical" href="${e(canonical)}">
<link rel="icon" href="${LOGO}" type="image/png">
<link rel="stylesheet" href="/style.css">
<meta property="og:type" content="website">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:url" content="${e(canonical)}">
<meta property="og:image" content="${e(shareImage)}">
<meta name="twitter:card" content="summary_large_image">
${markup}
</head>
<body>
<div class="topbar">INDIA IN EVERY SIP</div>
<header><a class="logo" href="/"><img class="hov-brand-icon" src="${LOGO}" width="52" height="52" alt=""><span>HOUSE OF VERONA<small>INDIA IN EVERY SIP</small></span></a>
<nav aria-label="Main navigation"><a href="${COFFEE}">Coffee</a><a href="${TEA}">Tea</a><a href="${ORIGINS}">Indian origins</a><a href="${CAFE}">Nagpur café</a><a href="/#shop">Shop</a></nav></header>
<main id="main" class="section hov-search-page">${content}</main>
<footer><a class="logo" href="/">HOUSE OF VERONA</a><p>India in Every Sip.</p><a href="/brand">Our identity</a><a href="/franchise">Franchise</a></footer>
</body>
</html>`, { headers: {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'public, max-age=120',
    'x-content-type-options': 'nosniff',
  } });
}

export function searchRedirect(url) {
  const aliases = {
    '/index.html': '/',
    '/brand.html': '/brand',
    '/franchise.html': '/franchise',
    '/specialty-coffee-nagpur.html': CAFE,
    '/orthodox-tea-nagpur.html': TEA,
    '/orthodox-tea-nagpur': TEA,
  };
  const trimmed = url.pathname.replace(/\/+$/, '');
  const target = aliases[url.pathname] || (
    trimmed !== url.pathname && (staticPaths.includes(trimmed) || /^\/product\/[^/]+$/.test(trimmed))
      ? trimmed : null
  );
  if (!target) return null;
  return Response.redirect(new URL(target + url.search, url), 308);
}

export function searchProductPage(list, url) {
  let id;
  try {
    id = decodeURIComponent(url.pathname.slice('/product/'.length));
  } catch {
    return new Response('Product not found', { status: 404 });
  }
  const product = list.find(item => item.id === id);
  if (!product) return new Response('Product not found', { status: 404 });
  const path = productPath(id);
  if (url.pathname !== path) return Response.redirect(new URL(path + url.search, url), 308);
  const { name, category, description, origin, image } = product;
  const coffee = category === 'coffee';
  const beverage = coffee || category === 'tea';
  const collection = coffee ? COFFEE : TEA;
  const packs = Object.entries(product.prices);
  const prices = packs.map(([, price]) => price);
  const imageUrl = image ? new URL(image, SITE).href : null;
  const data = {
    '@context': 'https://schema.org', '@type': 'Product',
    name, description, url: SITE + path, sku: id,
    brand: { '@type': 'Brand', name: BRAND },
    ...(imageUrl ? { image: [imageUrl] } : {}),
    offers: packs.length > 1
      ? { '@type': 'AggregateOffer', lowPrice: Math.min(...prices), highPrice: Math.max(...prices),
          offerCount: packs.length, priceCurrency: 'INR', url: SITE + path }
      : { '@type': 'Offer', price: prices[0], priceCurrency: 'INR', url: SITE + path },
  };
  const related = list.filter(item => item.category === category && item.id !== id);
  return page(path, name + ' | ' + BRAND, description, `
    <p class="eyebrow">${e(origin)}</p>
    <h1>${e(name)}</h1>
    ${imageUrl ? `<img class="hov-search-image" src="${e(imageUrl)}" alt="${e(name)}" decoding="async">` : ''}
    <p class="hov-search-lead">${e(description)}</p>
    <h2>Pack sizes and prices</h2>
    <ul class="hov-search-packs">${packs.map(([weight, price]) =>
      `<li>${beverage ? e(weight) + ' g' : 'Edition'} <strong>₹${e(price)}</strong></li>`).join('')}</ul>
    <p><a class="gold-btn" href="/#shop">Choose a pack in the shop</a></p>
    ${beverage ? `<p>Delivery enquiries are welcome for Indian PIN codes. Confirm stock and delivery with us before payment.</p>` : ''}
    ${guides[id] ? `<h2>${coffee ? 'Origin and brewing' : 'Brewing this tea'}</h2><p>${e(guides[id])}</p>` : ''}
    ${related.length ? `<h2>Explore more ${coffee ? 'Indian coffee' : category === 'tea' ? 'loose-leaf tea' : 'of the collection'}</h2>
    <ul class="hov-search-links">${related.map(item => `<li><a href="${e(productPath(item.id))}">${e(item.name)}</a></li>`).join('')}</ul>` : ''}
    ${beverage ? `<p><a href="${collection}">See the full ${coffee ? 'coffee' : 'tea'} collection</a>${coffee ? ` · <a href="${ORIGINS}">Read our Indian coffee origins guide</a>` : ''}</p>` : ''}
  `, { data, image: imageUrl });
}

export function searchCollection(path, list) {
  const coffee = path === COFFEE;
  const name = coffee ? 'Indian Specialty Coffee Beans' : 'Indian Loose-Leaf Tea';
  const introduction = coffee
    ? 'Explore Indian coffee through the House of Verona collection, with coffees associated with Karnataka, Kerala, Tamil Nadu and Andhra Pradesh. Compare origin information, pack sizes and brewing guidance before you choose.'
    : 'Find orthodox black tea, Assam black tea, rolled gunpowder green tea and Himalayan-inspired selections in the House of Verona loose-leaf collection. Compare the leaf styles and see how to brew each tea.';
  const selected = list.filter(item => item.category === (coffee ? 'coffee' : 'tea'));
  return page(path, name + ' | ' + BRAND, coffee
    ? 'Explore Indian coffee beans from the House of Verona collection, with Karnataka, Kerala, Tamil Nadu and Andhra Pradesh coffees, pack sizes and brewing guidance.'
    : 'Explore House of Verona’s Indian loose-leaf tea collection, including orthodox black tea, Assam black tea and gunpowder green tea.', `
    <h1>${name}</h1>
    <p class="hov-search-lead">${introduction}</p>
    <h2>Explore the collection</h2>
    ${selected.length ? `<ul class="hov-search-list">${selected.map(item =>
      `<li><h3><a href="${e(productPath(item.id))}">${e(item.name)}</a></h3><p>${e(item.description)}</p></li>`).join('')}</ul>`
      : '<p>Contact us for current availability.</p>'}
    <h2>How to choose</h2>
    <p>${coffee
      ? 'Start with your brewing method. Medium roast is a useful first choice for comparing origins. Choose whole bean if you grind at home, or select a grind suited to your brewer in the shop.'
      : 'Choose orthodox black tea for a classic infusion, Assam if you plan to add milk, or gunpowder green tea for a lighter cup. Use a roomy strainer so the leaves can unfurl.'}</p>
    <h2>Ordering and delivery</h2>
    <p>You can mix coffees and teas to reach the 250 g minimum. The shop shows prices in Indian rupees. We confirm stock and delivery for your Indian PIN code before payment. For enquiries from outside India, <a href="${WHATSAPP}">contact the House</a>.</p>
    <p><a class="gold-btn" href="/#shop">Open the shop</a></p>
    <p>${coffee ? `<a href="${ORIGINS}">Read the Indian coffee origins guide</a>` : `<a href="${COFFEE}">Explore Indian specialty coffee</a>`} · <a href="${CAFE}">Visit our Nagpur café</a></p>
  `, { data: { '@context': 'https://schema.org', '@type': 'CollectionPage', name, url: SITE + path,
    mainEntity: { '@type': 'ItemList', itemListElement: selected.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, url: SITE + productPath(item.id), name: item.name,
    })) },
  } });
}

export function searchOrigins(list) {
  const regions = [
    ['karnataka', 'Karnataka', 'Chikkamagaluru, Kodagu and the Bababudangiris are part of Karnataka’s long coffee-growing history. Estate, variety and processing are useful details to ask for when comparing coffees from the state.'],
    ['kerala', 'Kerala', 'Wayanad and Travancore are recognised coffee-growing areas. Wayanad is particularly associated with Robusta, a species worth comparing with Arabica on its own merits.'],
    ['tamil', 'Tamil Nadu', 'The Shevaroys, Nilgiris and Anamalais are among Tamil Nadu’s recognised growing areas. Shade, elevation and processing are useful context for understanding differences between lots.'],
    ['andhra', 'Andhra Pradesh', 'Araku Valley sits in the Eastern Ghats. Compare it with coffees from the Western Ghats by brewing them with the same water, ratio and method.'],
  ];
  const title = 'Indian Coffee Origins: Karnataka, Kerala, Tamil Nadu & Araku';
  return page(ORIGINS, title + ' | ' + BRAND,
    'A guide to four Indian coffee-growing states and regions, from Karnataka and Kerala in the Western Ghats to Araku Valley in the Eastern Ghats.', `
    <h1>Where Indian coffee grows</h1>
    <p class="hov-search-lead">From the Western Ghats to Araku Valley in the Eastern Ghats, the following regions offer a starting point for understanding the coffees House of Verona brings together.</p>
    <figure class="hov-search-map"><img src="/assets/hov-india-coffee-tea-3d-map-2026-11.webp" alt="House of Verona’s illustrated map of Indian coffee and tea-growing regions" width="1690" height="931" loading="lazy" decoding="async"></figure>
    ${regions.map(([id, region, text]) => {
      const item = list.find(product => product.id === id && product.category === 'coffee');
      return `<section><h2>${region}</h2><p>${text}</p>${item ? `<p><a href="${e(productPath(id))}">See ${e(item.name)}</a></p>` : ''}</section>`;
    }).join('')}
    <h2>How to read a coffee label</h2>
    <p>Look for the growing region or estate, then the species or variety, processing method and roast. Region names describe where coffee is grown. Estate and harvest details are specific to each lot. Ask us for the lot information we can verify.</p>
    <p><a href="https://coffeeboard.gov.in/coffee-regions-india.html">Coffee-growing regions from the Coffee Board of India</a></p>
    <p><a class="gold-btn" href="${COFFEE}">Explore the House coffee collection</a></p>
  `, { data: { '@context': 'https://schema.org', '@type': 'Article', headline: title, url: SITE + ORIGINS,
    author: { '@type': 'Organization', name: BRAND, url: SITE + '/' },
    image: [SITE + '/assets/hov-india-coffee-tea-3d-map-2026-11.webp'],
  } });
}

export function searchCafe() {
  return page(CAFE, 'Specialty Coffee & All-Day Café in Nagpur | ' + BRAND,
    'Visit House of Verona near Sharda Chowk, Nagpur, for Indian specialty coffee, loose-leaf tea, vegetarian café food and takeaway.', `
    <h1>House of Verona Nagpur</h1>
    <p class="hov-search-lead">An all-day café near Sharda Chowk serving Indian specialty coffee, whole-leaf tea and vegetarian café food.</p>
    <h2>What to order</h2>
    <p>Choose espresso, an Americano or a latte, or ask the team which Indian coffee origins are available that day. We also serve orthodox and green teas. Ask about the current food menu and takeaway options.</p>
    <h2>Visit the café</h2>
    <address>Plot 855/8, Sharda Chowk, Ganesh Nagar, Nagpur, Maharashtra, India</address>
    <p>Contact the café for today’s hours, current menu and private booking availability.</p>
    <p class="hov-search-actions"><a class="gold-btn" href="${MAP}">Get directions</a> <a href="tel:+918799817395">Call the café</a> <a href="${WHATSAPP}">WhatsApp the café</a></p>
    <p><a href="${COFFEE}">Explore Indian coffee beans</a> · <a href="${TEA}">Explore loose-leaf tea</a></p>
  `, { data: { '@context': 'https://schema.org', '@type': 'CafeOrCoffeeShop', '@id': SITE + '/#cafe',
    name: BRAND, url: SITE + CAFE, image: SITE + '/assets/house-of-verona-official-logo-nagpur.png',
    telephone: '+91-87998-17395', servesCuisine: 'Vegetarian',
    address: { '@type': 'PostalAddress', streetAddress: 'Plot 855/8, Sharda Chowk, Ganesh Nagar',
      addressLocality: 'Nagpur', addressRegion: 'Maharashtra', addressCountry: 'IN' },
    hasMap: MAP,
  } });
}

export function searchSitemap(list) {
  const paths = [...staticPaths, ...list.map(product => productPath(product.id))];
  const logoPages = new Set(['/', '/brand']);
  const imgs = [SITE + '/assets/house-of-verona-official-logo-nagpur.png', SITE + '/assets/house-of-verona-gold-emblem-nagpur.png'];
  return new Response('<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' +
    paths.map(path => '<url><loc>' + e(SITE + path) + '</loc>' +
      (logoPages.has(path) ? imgs.map(image => '<image:image><image:loc>' + e(image) + '</image:loc></image:image>').join('') : '') +
      '</url>').join('') + '</urlset>',
  { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=600' } });
}

export async function searchResponse(request, getProducts) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  const path = url.pathname;
  let result = searchRedirect(url);
  if (!result) {
    if (path === '/sitemap.xml') result = searchSitemap(await getProducts());
    else if (path === CAFE) result = searchCafe();
    else if (path === ORIGINS) result = searchOrigins(await getProducts());
    else if (path === COFFEE || path === TEA) result = searchCollection(path, await getProducts());
    else if (path.startsWith('/product/')) result = searchProductPage(await getProducts(), url);
  }
  return result && request.method === 'HEAD' ? new Response(null, result) : result;
}
