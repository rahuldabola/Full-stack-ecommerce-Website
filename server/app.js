require('dotenv').config();
const express = require('express');
const path = require('path');
const Stripe = require('stripe');
const db = require('./db');
const { hashPassword, verifyPassword, createSession, destroySession, requireAuth } = require('./auth');

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

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

// ---- orders / checkout (Stripe) ----

function placeOrderFromCart(userId, stripeSessionId) {
  const items = getCart(userId);
  if (!items.length) return null;

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const placeOrder = db.transaction(() => {
    const orderInfo = db.prepare('INSERT INTO orders (user_id, total, status, stripe_session_id) VALUES (?, ?, ?, ?)')
      .run(userId, total, 'paid', stripeSessionId);
    const orderId = orderInfo.lastInsertRowid;
    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)');
    items.forEach((item) => insertItem.run(orderId, item.id, item.name, item.price, item.qty));
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
    return orderId;
  });

  const orderId = placeOrder();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  return { ...order, items: orderItems };
}

app.post('/api/checkout/create-session', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Payments are not configured on this server. Set STRIPE_SECRET_KEY in .env.' });
  }

  const items = getCart(req.user.id);
  if (!items.length) return res.status(400).json({ error: 'Your cart is empty.' });

  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: req.user.email,
      line_items: items.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.qty,
      })),
      success_url: `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?checkout=cancel`,
      metadata: { user_id: String(req.user.id) },
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not start checkout: ' + err.message });
  }
});

app.get('/api/checkout/confirm', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Payments are not configured on this server.' });
  }

  const sessionId = req.query.session_id;
  if (!sessionId) return res.status(400).json({ error: 'Missing session_id.' });

  const existingOrder = db.prepare('SELECT * FROM orders WHERE stripe_session_id = ?').get(sessionId);
  if (existingOrder) {
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(existingOrder.id);
    return res.json({ ...existingOrder, items: orderItems });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment was not completed.' });
    }
    if (String(session.metadata.user_id) !== String(req.user.id)) {
      return res.status(403).json({ error: 'This checkout session does not belong to you.' });
    }

    const order = placeOrderFromCart(req.user.id, sessionId);
    if (!order) return res.status(400).json({ error: 'Nothing left to confirm — cart was already checked out.' });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not confirm payment: ' + err.message });
  }
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
app.listen(PORT, () => {
  console.log(`Anon eCommerce running at http://localhost:${PORT}`);
  if (!stripe) console.log('Note: STRIPE_SECRET_KEY is not set — checkout will be disabled until it is.');
});
