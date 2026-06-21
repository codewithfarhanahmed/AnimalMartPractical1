# Animal Mart — System & Code Documentation

A single-page pet-store web app (food, toys & accessories for cats and dogs) built with
**vanilla HTML, CSS and JavaScript** — no framework, no build step. Open `index.html` in a
browser and it runs. All state lives in memory; a backend is only needed for real payments,
notifications and persistence (see `INTEGRATION-GUIDE.md`).

---

## 1. Table of Contents

1. [Overview](#2-overview)
2. [File Structure](#3-file-structure)
3. [How It Loads & Runs](#4-how-it-loads--runs)
4. [State Model](#5-state-model)
5. [Routing](#6-routing)
6. [Page Modules](#7-page-modules)
7. [Cart System](#8-cart-system)
8. [Checkout & Orders](#9-checkout--orders)
9. [Order Tracking System](#10-order-tracking-system)
10. [Receipts & Parcel Tags](#11-receipts--parcel-tags)
11. [Admin Panel](#12-admin-panel)
12. [Icon System (Lucide)](#13-icon-system-lucide)
13. [Ad Banner](#14-ad-banner)
14. [Fonts & Theming](#15-fonts--theming)
15. [Function Reference](#16-function-reference)
16. [Known Constraints / Going to Production](#17-known-constraints--going-to-production)

---

## 2. Overview

| Property        | Value                                                            |
|-----------------|-----------------------------------------------------------------|
| Type            | Single-page application (SPA), hash-based routing                |
| Stack           | HTML5 + CSS (in `<style>`) + vanilla JS                          |
| Dependencies    | [Lucide](https://lucide.dev) icons (CDN), Google Fonts          |
| Persistence     | In-memory only (resets on reload)                               |
| Currency        | PKR (`Rs`), formatted via `Intl`                                |
| Admin password  | `admin123` (demo only)                                          |

**Key features:** product catalogue with search/filter/sort, product detail pages, slide-out
cart, multi-method checkout (COD / Easypaisa / JazzCash / Bank), order confirmation, a full
**order-tracking system** (customer timeline + admin manual updates), **downloadable receipts**,
**printable parcel tags**, an **admin panel** (CRUD for products/reviews/articles + order
management), a **closable ad banner**, articles/blog, and contact/about pages.

---

## 3. File Structure

```
Animal_Mart/
├── index.html            # Page shell + ALL CSS (in a <style> block) + script tags
├── app.js                # ALL application logic (~1430 lines)
├── data.js               # Seed data: products, reviews, articles
├── images/
│   ├── hero.jpg          # Hero section banner image
│   └── ad-banner.jpg     # Homepage ad-banner image
├── README.md             # Quick-start & feature summary
├── INTEGRATION-GUIDE.md  # How to wire a real backend
└── DOCUMENTATION.md      # This file
```

### What each file is responsible for

- **`index.html`** — the static skeleton: `<head>` (fonts, Lucide CDN, the entire stylesheet),
  the `#app` mount point, the cart drawer, the admin modal container, the toast container, and
  the `<script>` tags. It contains **no page content** — every screen is rendered by JS into `#app`.
- **`data.js`** — three global arrays seeded onto `window`: `SEED_PRODUCTS`, `SEED_REVIEWS`,
  `SEED_ARTICLES`. Swap these for API calls in production.
- **`app.js`** — everything else: state, router, all page renderers, cart, checkout, tracking,
  receipts, parcel tags and the admin panel.

---

## 4. How It Loads & Runs

Load order matters (set in `index.html`):

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<script src="data.js"></script>   <!-- defines window.SEED_* -->
<script src="app.js"></script>    <!-- reads SEED_*, builds State, starts router -->
```

Boot sequence:

1. `data.js` puts seed arrays on `window`.
2. `app.js` builds the `State` object (deep-copying the seed data so edits don't mutate seeds).
3. `Router.resolve()` is called once to render the initial screen based on the URL hash.
4. A `hashchange` listener re-runs `Router.resolve()` on every navigation.
5. After each render, `paintIcons()` converts icon placeholders into SVGs.

> **Important:** the app does **not** depend on Lucide being available. If the CDN is blocked,
> `paintIcons()` no-ops and the app still works — only the icon glyphs are missing.

---

## 5. State Model

A single in-memory object holds all runtime data (`app.js`, near top):

```js
const State = {
  products: [...SEED_PRODUCTS],   // deep-copied
  reviews:  [...SEED_REVIEWS],
  articles: [...SEED_ARTICLES],
  cart:     [],                   // [{ id, qty }]
  orders:   [ /* 2 demo orders seeded */ ],
  isAdmin:  false,
  orderCounter: 1042,             // next order id = AM-1043…
  adClosed: false                 // homepage ad banner dismissed this session?
};
```

### Product shape (`data.js`)
```js
{ id, name, cat, pet, price, old, sold, rating, img, desc }
```
- `cat` — category ("Dog Food", "Cat Food", "Dog Toys", "Cat Toys", "Beds", "Accessories")
- `pet` — `"dog"` or `"cat"`
- `price` / `old` — current & strike-through price (Rupees)
- `rating` — 1–5

### Order shape (built in `placeOrder`)
```js
{
  id:'AM-1043', customer, email, phone, address, city, zip,
  items:[{ id, qty, name, price }],
  subtotal, shipping, total,
  pay:'cod'|'easypaisa'|'jazzcash'|'bank',
  status,                      // see tracking pipeline
  tracking, courier, eta,      // tracking fields
  history:[{ status, note, at }],
  date
}
```

---

## 6. Routing

Hash-based router in `app.js`. Navigation never reloads the page — it just changes
`location.hash` and re-renders `#app`.

```js
const Router = {
  routes:{},
  add(path, fn){ this.routes[path]=fn; },
  resolve(){ /* parse hash, dispatch, then paintIcons() */ }
};
window.addEventListener('hashchange', ()=>Router.resolve());
function go(path){ location.hash = path; }   // programmatic navigation
```

### Route table

| Hash                | Handler                  | Screen                              |
|---------------------|--------------------------|-------------------------------------|
| `#/`                | `Router.routes['/']`     | Home (ad banner, hero, categories…) |
| `#/shop`            | `ShopPage.render()`      | Catalogue + search/filter/sort      |
| `#/product/:id`     | `ProductPage(id)`        | Product detail                      |
| `#/articles`        | articles list            | Blog index                          |
| `#/article/:id`     | `ArticlePage(id)`        | Single article                      |
| `#/about`           | about page               | Static content                      |
| `#/contact`         | contact page             | Static content + form               |
| `#/checkout`        | checkout                 | Delivery + payment form             |
| `#/track`           | `TrackPage()`            | Track-order search                  |
| `#/track/:id`       | `TrackPage(id)`          | Live tracking for one order         |
| `#/admin`           | `AdminPage.render()`     | Admin (login-gated)                 |

`:id` segments are parsed from the hash and passed to the handler. Unknown routes fall back to home.

---

## 7. Page Modules

Every screen is a function (or object method) that builds an HTML string and assigns it to
`#app`. Pages wrap content in `shell(content)` which adds the nav + footer.

- **`shell(content)`** — wraps page content with `navHtml()` (top bar, nav links, search, cart,
  hamburger) and `footerHtml()`.
- **`navHtml()`** — the sticky header. Contains the logo, nav links (Home / Shop / Articles /
  **Track Order** / About / Contact), search box, Admin link, cart button, mobile hamburger.
- **`productCard(p)`** / **`reviewCard(r)`** — reusable card renderers.
- **`ShopPage`** — object with `search`, `cat`, `sort` state and a `render()` method; filters
  `State.products` and lays out the grid with a sidebar of controls.
- **`ProductPage(id)`** — gallery, price, rating, quantity stepper, Add-to-cart / Buy-now.
- **`ArticlePage(id)`** — single blog post.

---

## 8. Cart System

The cart is the `App` object plus the slide-out drawer (markup in `index.html`).

```js
const App = {
  addToCart(id, qty=1){ … State.cart … this.refreshCart(); toast(…); },
  changeQty(id, d){ … },          // +/- ; removes at qty 0
  removeItem(id){ … },
  openCart(){ … },  closeCart(){ … },
  refreshCart(){ /* re-renders #cartBody + #cartFoot, updates count, paintIcons() */ }
};
window.App = App;   // exposed so inline onclick="App.addToCart(...)" works
```

Helpers: `cartCount()` (sum of quantities, shown on the cart badge) and `cartTotal()`
(sum of `price × qty`). Delivery is **free over Rs 3,000**, otherwise **Rs 250**.

---

## 9. Checkout & Orders

Route `#/checkout` (`app.js`). Empty carts redirect to `#/shop`.

- Collects name, email, WhatsApp number, address, city, postcode.
- Payment method selector: **COD / Easypaisa / JazzCash / Bank Transfer**
  (`selectPay()` + `renderPayDetail()` show per-method instructions).
- **`placeOrder()`** validates required fields, builds the order object, assigns an id
  (`AM-` + `++orderCounter`), sets the initial status, generates a tracking number + courier
  for COD orders, logs the first history entry, unshifts it onto `State.orders`, then shows
  **`ConfirmPage(order)`** and clears the cart.

`ConfirmPage` shows the order summary, a simulated email/WhatsApp notice, the tracking badge,
and buttons to **Track order** and **Download receipt**.

> Payments here are **simulated**. Real money movement and auto-verification must happen on a
> server with secret keys — see `INTEGRATION-GUIDE.md`.

---

## 10. Order Tracking System

### Pipeline
Defined once as `TRACK_STEPS` (`app.js`):

```
Confirmed → Packed → Shipped → Out for delivery → Delivered
```
Plus two off-pipeline states: **Awaiting payment** (before confirmation) and **Cancelled**.

Couriers available: `TCS, Leopards, M&P, PostEx, Trax, BlueEX` (`COURIERS`).

### Helper functions
- `stepIndex(status)` — index of a status in the pipeline (`-1` if off-pipeline).
- `genTracking()` — random tracking number, e.g. `AMK7K2QX`.
- `logHistory(order, note)` — appends `{ status, note, at:timestamp }` to `order.history`.
- `findOrder(id)` — looks up by order id **or** tracking number.

### Customer view — `TrackPage(id)` (`#/track` & `#/track/:id`)
- Search box accepts an order id (`AM-1043`) or tracking number.
- Renders a **visual timeline** (`trackTimeline(order)`) with done / current / pending states.
- Shows delivery details, items, total, and a **Download receipt** button.
- Handles "not found", "awaiting payment", and "cancelled" states gracefully.

### Admin control
In the admin **Orders** tab, each order has:
- **Advance** — one-click move to the next pipeline stage (`advanceOrder(id)`).
- **Gear / Settings** — opens `manageOrder(id)`: a modal to **manually edit** status, courier,
  tracking number, ETA, and add a history note; saved via `saveTracking(id)`.
- History log is shown inside the editor.

Customers always see whatever the admin last set, because both read the same `State.orders`.

---

## 11. Receipts & Parcel Tags

Both are generated client-side and opened in a clean, printable overlay
(`openDocWindow(title, html)`), where the user can **Print** or **Save as PDF**.
A `@media print` block in the stylesheet isolates `#printArea` so only the document prints.

### Receipt — `receiptHtml(order)` / `downloadReceipt(id)`
Branded receipt with billed-to details, payment method, delivery address, tracking,
line items, subtotal, delivery, and total. Available on the confirmation and tracking pages.

### Parcel Tag — `parcelTagHtml(order)` / `printParcelTag(id)`
A courier-ready delivery label (admin only). Includes:
- Recipient name, full address, phone
- Courier + tracking number, item count
- A decorative **barcode** strip
- From-address footer
- A highlighted **COD amount** badge (or **PREPAID** for paid orders)

---

## 12. Admin Panel

`AdminPage` object (`app.js`), route `#/admin`. Login-gated (`isAdmin`); demo password `admin123`.

| Tab        | Method            | Capability                                                  |
|------------|-------------------|-------------------------------------------------------------|
| Dashboard  | `dashboardTab()`  | Stats (products, orders, revenue, pending) + recent orders  |
| Products   | `productsTab()`   | Search, **add/edit/delete** products                        |
| Orders     | `ordersTab()`     | Approve payment, **advance/track**, parcel tag, receipt     |
| Reviews    | `reviewsTab()`    | Add/edit/delete reviews                                     |
| Articles   | `articlesTab()`   | Add/edit/delete blog articles                              |

Order handlers: `approveOrder`, `advanceOrder`, `manageOrder`, `saveTracking`.
CRUD handlers follow the pattern `editX` (opens modal) → `saveX` / `deleteX`.
All admin re-renders call `paintIcons()` so icons appear after each tab switch.

---

## 13. Icon System (Lucide)

All emojis were replaced with [Lucide](https://lucide.dev) SVG icons, themed to the brand
palette via CSS (they inherit `currentColor`).

```js
function icon(name, cls){ return `<i data-lucide="${name}" class="lic ${cls||''}"></i>`; }
```

`icon('truck')` outputs a placeholder `<i data-lucide="truck">`. After each render,
**`paintIcons()`** calls `lucide.createIcons()`, which swaps every placeholder for an inline
`<svg>`.

### ⚠️ Why there is NO MutationObserver (important history)
An earlier version watched the DOM with a `MutationObserver` and repainted on any change.
But `lucide.createIcons()` *changes the DOM* (replacing `<i>` with `<svg>`), which re-triggered
the observer → **infinite loop** → frozen tab ("page unresponsive"), spinning favicon, and a
dead router/cart. The fix: **no observer**; instead `paintIcons()` is called explicitly after
each render point (router resolve, cart refresh, modal open, confirm page, admin render, doc
window), guarded by a re-entrancy flag (`_painting`) so it can never loop.

Repaint call sites: `Router.resolve()`, `App.refreshCart()` (both branches), `openModal()`,
`ConfirmPage()`, `AdminPage.render()`, `AdminPage.loginScreen()`, `openDocWindow()`, and on
`DOMContentLoaded`.

---

## 14. Ad Banner

A **closable, image-based** promo banner shown only on the homepage, above the hero.

- Markup is injected at the top of the home route when `State.adClosed` is `false`.
- Image source: `images/ad-banner.jpg`, linking to `#/shop`.
- If the image fails to load (`onerror`), it falls back to a styled gradient strip with text
  ("Mega Pet Sale…") so it never appears broken.
- The **×** button calls `closeAd()`, which sets `State.adClosed = true` and animates the
  banner away. Dismissal lasts for the session (resets on reload — change `adClosed` handling
  + use storage to persist).

---

## 15. Fonts & Theming

### Fonts
- **Body:** Nunito (Google Fonts).
- **Display / headings:** the brand requested *Super Starfish* (a commercial font not on Google
  Fonts). The closest free match, **Fredoka**, is used. A CSS variable makes this swappable:

  ```css
  --display: 'Super Starfish', 'Fredoka', 'Fraunces', serif;
  ```
  An `@font-face { font-family:'Super Starfish'; src: local('Super Starfish'); }` stub is first
  in the stack — drop the real font file in and add its `src` URL to use it automatically.
- **Numbers / document totals:** Fraunces (serif) is kept for prices, receipts and parcel tags.

### Colour tokens (CSS `:root`)
```
--blush #F7B7B5  --blush-soft #FAD4D2  --blush-deep #E98A87
--cream #FFF8F4  --cream-2 #FFF1EB
--ink   #3A2E2C  --ink-soft #7A6A66
--mint  #BFE3D4  --sun #FFE0A3
--radius 26px    --radius-lg 40px
```
The whole site is themed from these — change them once to re-skin everything.

---

## 16. Function Reference

### Core / helpers
| Function | Purpose |
|---|---|
| `icon(name, cls)` | Returns a Lucide icon placeholder |
| `paintIcons()` | Converts placeholders to SVGs (re-entrancy guarded) |
| `toast(msg)` | Shows a transient notification |
| `starHtml(r)` / `starsInline(r)` | Star-rating renderers |
| `findProduct(id)` | Look up a product by id |
| `cartCount()` / `cartTotal()` | Cart aggregates |
| `PKR(n)` | Format a number as `Rs …` |
| `go(path)` | Navigate (set hash) |
| `shell(content)` | Wrap content with nav + footer |

### Pages
`navHtml`, `footerHtml`, `productCard`, `reviewCard`, `ProductPage`, `ArticlePage`,
plus route handlers for `/`, `/shop` (`ShopPage`), `/articles`, `/about`, `/contact`, `/checkout`.

### Cart
`App.addToCart`, `App.changeQty`, `App.removeItem`, `App.openCart`, `App.closeCart`,
`App.refreshCart`.

### Checkout / orders
`selectPay`, `renderPayDetail`, `placeOrder`, `ConfirmPage`.

### Tracking
`TRACK_STEPS`, `COURIERS`, `stepIndex`, `genTracking`, `logHistory`, `findOrder`,
`trackTimeline`, `TrackPage`, `doTrack`.

### Documents
`receiptHtml`, `downloadReceipt`, `parcelTagHtml`, `printParcelTag`, `openDocWindow`.

### Admin
`AdminPage.render`, `loginScreen`, `login`, `dashboardTab`, `productsTab`, `editProduct`,
`saveProduct`, `deleteProduct`, `ordersTab`, `approveOrder`, `advanceOrder`, `manageOrder`,
`saveTracking`, `reviewsTab`, `editReview`, `saveReview`, `deleteReview`, `articlesTab`,
`editArticle`, `saveArticle`, `deleteArticle`.

### Modals / UI
`openModal`, `closeModal`, `closeMM`, `closeAd`, `setActiveNav`.

---

## 17. Known Constraints / Going to Production

This is a **frontend demo**. Before launch, a developer should wire a backend (see
`INTEGRATION-GUIDE.md`). Specifically:

1. **Persistence** — `State` is in memory and resets on reload. Move products, orders, reviews
   and articles to a database, read/write via an API.
2. **Payments** — Easypaisa / JazzCash / bank verification must run server-side with secret
   keys. Never put those keys in browser code.
3. **Notifications** — real email / WhatsApp confirmations are server jobs (the in-app notices
   are simulated).
4. **Auth** — `admin123` is a placeholder. Replace with real authentication + session handling.
5. **Tracking sync** — admin tracking updates currently live in memory; persist them and
   optionally push live courier updates so customers always see the latest.
6. **Icons offline** — Lucide loads from `unpkg.com`. To run fully offline, download
   `lucide.min.js` next to the other files and point the `<script src>` at it.
7. **Images** — `images/hero.jpg` and `images/ad-banner.jpg` are placeholders; replace with
   your own (same filenames) or update the paths.

---

*Generated documentation for the Animal Mart system. Pair with `README.md` (quick start) and
`INTEGRATION-GUIDE.md` (backend wiring).*
