const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const db = require('./db');
const { hashPassword } = require('./auth');

function slugify(str) {
  return str.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function extractProducts() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const $ = cheerio.load(html);
  const products = [];
  const seenIds = new Set();

  $('.showcase').each((_, el) => {
    const $showcase = $(el);
    const name = $showcase.find('.showcase-title').first().text().trim();
    const priceText = $showcase.find('.price-box .price').first().text().trim();
    const image = $showcase.find('.product-img.default').attr('src')
      || $showcase.find('.showcase-banner img').first().attr('src')
      || $showcase.find('img').first().attr('src');

    if (!name || !priceText || !image) return;

    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
    let id = slugify(name);
    let suffix = 2;
    while (seenIds.has(id)) {
      id = `${slugify(name)}-${suffix}`;
      suffix += 1;
    }
    seenIds.add(id);

    products.push({ id, name, price, image });
  });

  return products;
}

function seed() {
  const products = extractProducts();

  const upsert = db.prepare(`
    INSERT INTO products (id, name, price, image) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price, image = excluded.image
  `);
  const insertAll = db.transaction((rows) => {
    for (const p of rows) upsert.run(p.id, p.name, p.price, p.image);
  });
  insertAll(products);

  const demoEmail = 'demo@anon.com';
  const existingDemo = db.prepare('SELECT id FROM users WHERE email = ?').get(demoEmail);
  if (!existingDemo) {
    db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run('Demo Shopper', demoEmail, hashPassword('password123'));
  }

  return { products: products.length };
}

if (require.main === module) {
  const result = seed();
  console.log('Seed complete:', result);
  console.log('Demo login: demo@anon.com / password123');
}

module.exports = { seed, extractProducts, slugify };
