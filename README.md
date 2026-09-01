# Anon - A Full-Stack eCommerce Website

Anon is a fully responsive eCommerce site — Node/Express + SQLite backend, real user accounts, and a database-backed cart, wishlist, and order history.

## Demo

![Anon Desktop Demo](./website-demo-image/desktop.png "Desktop Demo")
![Anon Mobile Demo](./website-demo-image/mobile.png "Mobile Demo")

## Features

- Product catalog served from a SQLite database
- User registration & login (password hashing, session tokens)
- Cart and wishlist persisted per account, not just in the browser
- Checkout via real Stripe Checkout (test mode) — order history under "My Account"
- Live product search, quick view, and all the interactive UI polish from the original template

## Prerequisites

- [Node.js](https://nodejs.org/) 22.5 or newer (uses the built-in `node:sqlite` module — no external database to install)
- [Git](https://git-scm.com/downloads)
- A free [Stripe](https://dashboard.stripe.com/register) account, for checkout

## Getting started

```bash
git clone https://github.com/rahuldabola/E-commerce-Website.git
cd E-commerce-Website
npm install
npm run seed    # creates store.db and loads the product catalog + a demo account
```

Then set up Stripe (test mode, no real charges):

1. Log in to the [Stripe dashboard](https://dashboard.stripe.com/test/apikeys) and copy your **test** secret key (starts with `sk_test_`).
2. Copy `.env.example` to `.env` and paste the key in as `STRIPE_SECRET_KEY`.

```bash
npm start        # runs the server at http://localhost:3000
```

Then open http://localhost:3000 in your browser. At checkout, use [any Stripe test card](https://docs.stripe.com/testing#cards) — e.g. card number `4242 4242 4242 4242`, any future expiry date, any 3-digit CVC.

If `STRIPE_SECRET_KEY` isn't set, the rest of the site (accounts, cart, wishlist) still works — checkout will just show a clear error instead of crashing.

### Demo account

The seed script creates a ready-to-use login:

- **Email:** demo@anon.com
- **Password:** password123

Or click the account icon in the header to register your own account.

## Project structure

```
public/          static front-end (HTML/CSS/JS), served by Express
server/
  app.js         Express app + all /api routes
  db.js          SQLite schema and connection
  auth.js        password hashing + session tokens
  seed.js        seeds the product catalog and demo account
store.db         SQLite database file (created after `npm run seed`, gitignored)
```

## Contact

If you want to contact me you can reach me at [Twitter](https://www.twitter.com/codewithsadee).

## License

This project is **free to use** and does not contains any license.
