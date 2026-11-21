import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../src/index.js';

const load = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const canonical = 'https://houseofverona.in/';
function jsonld(html) {
  const startTag = '<script type="application/ld+json">';
  const start = html.indexOf(startTag);
  assert.ok(start >= 0, 'Structured data script must exist');
  const end = html.indexOf('</script>', start + startTag.length);
  assert.ok(end > start, 'Structured data must be closed');
  return JSON.parse(html.slice(start + startTag.length, end));
}

test('official logo identified consistently as House of Verona', () => {
  const home = jsonld(load('public/index.html'));
  const brand = jsonld(load('public/brand.html'));
  const org = home['@graph'].find(item => item['@type'] === 'Organization');
  const orgBrand = brand['@graph'].find(item => item['@type'] === 'Organization');
  const image = brand['@graph'].find(item => item['@type'] === 'ImageObject');
  assert.equal(org['@id'], orgBrand['@id']);
  assert.equal(org.logo['@id'], image['@id']);
  assert.equal(image.contentUrl, canonical + 'assets/house-of-verona-official-logo-nagpur.png');
  assert.ok(image.description.includes('official logo of House of Verona'));
  assert.ok(load('public/brand.html').includes('Scan to Visit the Official House'));
  assert.ok(load('public/brand.html').includes('house-of-verona-official-website-qr.png'));
});

test('existing storefront controls and canonical identity links remain', () => {
  const home = load('public/index.html');
  for (const id of ['bagBtn', 'accountBtn', 'products', 'membershipBtn', 'franchiseBtn']) {
    assert.ok(home.includes('id="' + id + '"'), id);
  }
  assert.ok(home.includes('src="/tea-collection.js"'));
  assert.ok(home.includes('href="/brand"'));
  assert.ok(load('public/robots.txt').includes('Sitemap: ' + canonical + 'sitemap.xml'));
});

test('official logo images appear in both static and dynamic sitemaps', async () => {
  const staticXml = load('public/sitemap.xml');
  assert.ok(staticXml.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'));
  const env = {
    DB: {
      prepare(sql) {
        if (sql.startsWith('SELECT COUNT')) return { first: async () => ({ n: 0 }) };
        return { all: async () => ({ results: [] }) };
      },
    },
    ASSETS: { fetch: async () => new Response(null, { status: 404 }) },
    STORE_OPEN: 'true',
  };
  const response = await worker.fetch(new Request(canonical + 'sitemap.xml'), env);
  assert.equal(response.status, 200);
  const dynamic = await response.text();
  for (const file of ['house-of-verona-official-logo-nagpur.png', 'house-of-verona-gold-emblem-nagpur.png']) {
    assert.ok(staticXml.includes(file), file);
    assert.ok(dynamic.includes(file), file);
  }
});
