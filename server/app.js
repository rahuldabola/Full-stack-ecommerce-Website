const express = require('express');
const path = require('path');
const db = require('./db');
const { hashPassword, verifyPassword, createSession, destroySession, requireAuth } = require('./auth');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---- auth ----

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Name, a valid email, and a password of at least 6 characters are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const info = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name.trim(), normalizedEmail, hashPassword(password));

  const token = createSession(info.lastInsertRowid);
  res.json({ token, user: { id: info.lastInsertRowid, name: name.trim(), email: normalizedEmail } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get((email || '').trim().toLowerCase());
  if (!user || !verifyPassword(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = createSession(user.id);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  destroySession(req.token);
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ---- products ----

app.get('/api/products', (req, res) => {
  res.json(db.prepare('SELECT * FROM products').all());
});

// ---- cart ----

function getCart(userId) {
  return db.prepare(`
    SELECT c.product_id as id, p.name, p.price, p.image, c.qty
    FROM cart_items c JOIN products p ON p.id = c.product_id
    WHERE c.user_id = ?
    ORDER BY c.id
  `).all(userId);
}

app.get('/api/cart', requireAuth, (req, res) => {
  res.json(getCart(req.user.id));
});

app.post('/api/cart', requireAuth, (req, res) => {
  const { product_id } = req.body || {};
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
  if (existing) {
    db.prepare('UPDATE cart_items SET qty = qty + 1 WHERE id = ?').run(existing.id);
  } else {
    db.prepare('INSERT INTO cart_items (user_id, product_id, qty) VALUES (?, ?, 1)').run(req.user.id, product_id);
  }
  res.json(getCart(req.user.id));
});

app.patch('/api/cart/:productId', requireAuth, (req, res) => {
  const delta = Number((req.body || {}).delta) || 0;
  const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, req.params.productId);
  if (!existing) return res.status(404).json({ error: 'Item not in cart.' });

  const newQty = existing.qty + delta;
  if (newQty <= 0) {
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(existing.id);
  } else {
    db.prepare('UPDATE cart_items SET qty = ? WHERE id = ?').run(newQty, existing.id);
  }
  res.json(getCart(req.user.id));
});

app.delete('/api/cart/:productId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
  res.json(getCart(req.user.id));
});

// ---- wishlist ----

function getWishlist(userId) {
  return db.prepare(`
    SELECT p.id, p.name, p.price, p.image
    FROM wishlist_items w JOIN products p ON p.id = w.product_id
    WHERE w.user_id = ?
    ORDER BY w.id
  `).all(userId);
}

app.get('/api/wishlist', requireAuth, (req, res) => {
  res.json(getWishlist(req.user.id));
});

app.post('/api/wishlist', requireAuth, (req, res) => {
  const { product_id } = req.body || {};
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const existing = db.prepare('SELECT * FROM wishlist_items WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
  if (existing) {
    db.prepare('DELETE FROM wishlist_items WHERE id = ?').run(existing.id);
  } else {
    db.prepare('INSERT INTO wishlist_items (user_id, product_id) VALUES (?, ?)').run(req.user.id, product_id);
  }
  res.json(getWishlist(req.user.id));
});

app.delete('/api/wishlist/:productId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
  res.json(getWishlist(req.user.id));
});

// ---- orders ----

app.post('/api/orders', requireAuth, (req, res) => {
  const items = getCart(req.user.id);
  if (!items.length) return res.status(400).json({ error: 'Your cart is empty.' });

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const placeOrder = db.transaction(() => {
    const orderInfo = db.prepare('INSERT INTO orders (user_id, total) VALUES (?, ?)').run(req.user.id, total);
    const orderId = orderInfo.lastInsertRowid;
    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)');
    items.forEach((item) => insertItem.run(orderId, item.id, item.name, item.price, item.qty));
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    return orderId;
  });

  const orderId = placeOrder();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  res.json({ ...order, items: orderItems });
});

app.get('/api/orders', requireAuth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  const withItems = orders.map((order) => ({
    ...order,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id),
  }));
  res.json(withItems);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Anon eCommerce running at http://localhost:${PORT}`));
