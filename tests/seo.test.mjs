import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { catalog } from '../src/catalog.js';

const site = 'https://houseofverona.in';
const publicFile = name => readFileSync(new URL('../public/' + name, import.meta.url), 'utf8');
const rows = catalog.map(product => ({
  id: product.id, name: product.name, category: product.category, origin: product.origin,
  description: product.description, price_json: JSON.stringify(product.prices), sort_order: product.sort,
  enabled: Number(product.enabled !== 0),
  image_key: product.id === 'andhra' ? 'images/01234567-abcd.webp' : null,
}));
const env = {
  STORE_OPEN: 'true',
  DB: {
    prepare(sql) {
      if (sql.startsWith('SELECT COUNT')) return { first: async () => ({ n: rows.length }) };
      assert.match(sql, /WHERE enabled=1/);
      return { all: async () => ({ results: rows.filter(row => row.enabled) }) };
    },
  },
  ASSETS: {
    async fetch(request) {
      const path = new URL(request.url).pathname;
      const files = { '/': 'index.html', '/brand': 'brand.html', '/franchise': 'franchise.html' };
      return files[path] ? new Response(publicFile(files[path])) : new Response(null, { status: 404 });
    },
  },
};
const get = (path, method) => worker.fetch(new Request(site + path, { method }), env);
const locations = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);

test('sitemap URLs return 200 and are self-canonical, with only enabled products', async () => {
  const sitemap = await get('/sitemap.xml');
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers.get('content-type'), /^application\/xml/);
  const urls = locations(await sitemap.text());
  const fallback = locations(publicFile('sitemap.xml'));
  assert.deepEqual(urls.slice(0, fallback.length), fallback);
  assert.equal(urls.length, fallback.length + 9);
  assert.equal(new Set(urls).size, urls.length);
  for (const url of urls) {
    const response = await worker.fetch(new Request(url), env);
    assert.equal(response.status, 200, url);
    assert.ok((await response.text()).includes(`rel="canonical" href="${url}"`), url);
  }
});

test('canonical redirects preserve query parameters and HEAD returns no body', async () => {
  for (const [from, to] of [
    ['/index.html', '/'], ['/brand.html', '/brand'], ['/franchise.html', '/franchise'],
    ['/specialty-coffee-nagpur.html', '/specialty-coffee-nagpur'],
    ['/orthodox-tea-nagpur.html', '/indian-loose-leaf-tea'],
    ['/indian-coffee-origins/', '/indian-coffee-origins'], ['/product/andhra/', '/product/andhra'],
    ['/product/%61ndhra', '/product/andhra'],
  ]) {
    const response = await get(from + '?utm_source=google');
    assert.equal(response.status, 308, from);
    assert.equal(response.headers.get('location'), site + to + '?utm_source=google', from);
  }
  const head = await get('/product/andhra', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  for (const unavailable of ['/product/sikkim', '/product/unknown', '/product/%Z']) {
    assert.equal((await get(unavailable)).status, 404);
  }
});

test('collections expose product links in HTML and structured data reflects available catalogue data', async () => {
  const collection = await (await get('/indian-specialty-coffee')).text();
  for (const id of ['tamil', 'kerala', 'karnataka', 'andhra']) {
    assert.ok(collection.includes(`href="/product/${id}"`));
  }
  assert.doesNotMatch(collection, /href="\/product\/assam"/);
  const tea = await (await get('/indian-loose-leaf-tea')).text();
  assert.match(tea, /href="\/product\/assam"/);
  assert.doesNotMatch(tea, /href="\/product\/sikkim"/);
  const product = await (await get('/product/andhra')).text();
  assert.match(product, /₹179/);
  assert.match(product, /href="\/#shop"/);
  const data = JSON.parse(product.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(data['@type'], 'Product');
  assert.deepEqual(data.image, [site + '/media/images%2F01234567-abcd.webp']);
  assert.equal(data.offers.lowPrice, 179);
  assert.equal(data.offers.highPrice, 2899);
  assert.equal(data.offers.priceCurrency, 'INR');
  assert.equal(data.offers.availability, undefined);
});

test('the API and original storefront entry points still respond', async () => {
  const response = await get('/api/health');
  assert.deepEqual(await response.json(), { healthy: true, storeOpen: true });
  assert.equal((await get('/api/catalog')).status, 200);
  const home = await (await get('/')).text();
  for (const id of ['accountBtn', 'bagBtn', 'membershipBtn', 'dialog']) {
    assert.ok(home.includes(`id="${id}"`));
  }
  for (const path of ['/indian-specialty-coffee', '/indian-loose-leaf-tea', '/indian-coffee-origins', '/specialty-coffee-nagpur']) {
    assert.ok(home.includes(`href="${path}"`));
  }
});
