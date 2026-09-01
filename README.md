# Anon — Full-Stack eCommerce Website

A complete, working online store: responsive storefront, real user accounts, a database-backed cart and wishlist, and checkout through real Stripe payments (test mode) — not just a static template.

## Demo

![Anon Desktop Demo](./website-demo-image/desktop.png "Desktop Demo")
![Anon Mobile Demo](./website-demo-image/mobile.png "Mobile Demo")

## Features

| Area | What it does |
|---|---|
| Accounts | Register/login with salted, hashed passwords and server-side session tokens |
| Cart | Add/remove/adjust quantity, persisted per account in the database (not just the browser) |
| Wishlist | Save items to a wishlist tied to your account |
| Checkout | Real Stripe Checkout (test mode) — order is only recorded after Stripe confirms payment |
| Orders | Full order history under "My Account", with line items and totals |
| Search | Live product search/filtering as you type |
| Quick view | Preview a product without leaving the page |
| Product catalog | Served from SQLite, seeded from the original 42-item catalog |

## Tech stack

- **Frontend:** vanilla HTML/CSS/JS (no framework, no build step)
- **Backend:** [Express](https://expressjs.com/)
- **Database:** SQLite via Node's built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html) — no separate database server to install or run
- **Payments:** [Stripe Checkout](https://stripe.com/docs/payments/checkout) (test mode)
- **Auth:** `node:crypto` scrypt password hashing + random session tokens (no third-party auth service)

## Prerequisites

- [Node.js](https://nodejs.org/) 22.5 or newer
- [Git](https://git-scm.com/downloads)
- A free [Stripe](https://dashboard.stripe.com/register) account, for checkout (test mode — no real charges, no card required to sign up)

## Getting started

```bash
git clone https://github.com/rahuldabola/E-commerce-Website.git
cd E-commerce-Website
npm install
npm run seed    # creates store.db and loads the product catalog + a demo account
```

Then set up Stripe (test mode, no real charges):

1. Sign in to the [Stripe dashboard](https://dashboard.stripe.com/test/apikeys) and copy your **test** secret key (starts with `sk_test_`).
2. Copy `.env.example` to `.env` and paste the key in as `STRIPE_SECRET_KEY`.

```bash
npm start        # runs the server at http://localhost:3000
```

Open http://localhost:3000 in your browser. At checkout, use [any Stripe test card](https://docs.stripe.com/testing#cards) — e.g. `4242 4242 4242 4242`, any future expiry date, any 3-digit CVC.

If `STRIPE_SECRET_KEY` isn't set, the rest of the site (accounts, cart, wishlist, search) still works fully — checkout will just show a clear error instead of crashing.

### Demo account

The seed script creates a ready-to-use login:

- **Email:** demo@anon.com
- **Password:** password123

Or click the account icon in the header to register your own.

## Project structure

```
public/            static front-end (HTML/CSS/JS), served by Express
  index.html       storefront markup — each product carries a stable data-product-id
  assets/          styles, scripts, images
server/
  app.js           Express app + every /api route (auth, cart, wishlist, checkout, orders)
  db.js            SQLite schema and connection
  auth.js          password hashing + session tokens
  seed.js          seeds the product catalog (parsed from index.html) + demo account
.env.example       template for local Stripe configuration
store.db           SQLite database file (created by `npm run seed`, gitignored)
```

## API overview

All routes are under `/api`. Cart, wishlist, checkout, and order routes require an `Authorization: Bearer <token>` header from `/api/auth/login` or `/api/auth/register`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in, get a session token |
| POST | `/api/auth/logout` | Invalidate the current session |
| GET | `/api/auth/me` | Get the logged-in user |
| GET | `/api/products` | List the product catalog |
| GET/POST | `/api/cart` | View / add to cart |
| PATCH/DELETE | `/api/cart/:productId` | Adjust quantity / remove an item |
| GET/POST | `/api/wishlist` | View / toggle a wishlist item |
| DELETE | `/api/wishlist/:productId` | Remove a wishlist item |
| POST | `/api/checkout/create-session` | Start a Stripe Checkout session for the current cart |
| GET | `/api/checkout/confirm` | Confirm a completed Stripe session and record the order |
| GET | `/api/orders` | List the logged-in user's past orders |

## Known limitations

Being upfront about what's still out of scope:

- No deployment yet — it's built to run locally via `npm start`. Deploying to a host (e.g. Render, Railway) is a reasonable next step.
- Icon-only buttons (cart, wishlist, search) don't yet have `aria-label`s for screen readers.
- No admin panel for managing products — the catalog is fixed at seed time.

## Contact

Questions or issues — open one on [this repo](https://github.com/rahuldabola/E-commerce-Website/issues) or reach out via [github.com/rahuldabola](https://github.com/rahuldabola).

## License

This project is **free to use** and does not contain a license.
