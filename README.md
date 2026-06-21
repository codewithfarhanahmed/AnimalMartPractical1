# Animal Mart 🐾

A playful e-commerce website for selling cat & dog food and toys, themed around the
brand's soft blush-pink logo. Built as a complete, working frontend demo.

## Open it
Just open `index.html` in any browser. No installation needed.
(For payment providers later you'll need to serve it over https — see the guide.)

## Two panels
- **Store (users):** browse, search, filter, add to cart, checkout, order confirmation.
- **Admin:** go to the "Admin" link in the nav (or `#/admin`).
  Demo login is pre-filled — password `admin123`.
  Full control over products, reviews, articles, and order approvals.

## Pages
Home · Shop (with search + category filters) · Product detail · Articles · Article detail ·
About · Contact · Checkout · Order confirmation · Admin (dashboard, products, orders,
reviews, articles).

## Features in this demo
- Add to cart, quantity controls, "Buy now", slide-out basket
- Product search (navbar + shop page) and category filtering + sorting
- Checkout with Easypaisa / JazzCash / Bank transfer / Cash on Delivery options
- Order confirmation with simulated email + WhatsApp notices
- Top articles highlighted separately on the homepage
- Admin: add / edit / delete products, reviews, and articles; approve & ship orders
- **Order tracking** — customers track by order ID or tracking number on a live timeline
- **Admin tracking control** — manually set status, courier, tracking number & ETA, with a history log
- **Downloadable receipt** — print / Save-as-PDF from the confirmation or tracking page
- **Parcel Tag** — admin prints a courier-ready delivery label (address, COD amount, barcode)
- **Themed icons** — all emojis replaced with Lucide SVG icons coloured to match the brand
- Fully responsive (mobile menu, adaptive grids)

## Icons
Emojis were replaced with [Lucide](https://lucide.dev) SVG icons, loaded from their free CDN
(`unpkg.com/lucide`). Icons inherit the theme colour via CSS, so they always match the palette.
The site needs an internet connection for icons to appear; to run fully offline, download
`lucide.min.js` next to the other files and change the `<script src>` in `index.html` to point to it.

## Tracking, receipts & parcel tags
- Customers: **Track Order** in the nav → enter `AM-1043` or a tracking number → live timeline.
- Admin → **Orders** tab: *Advance* moves an order to the next stage; the gear (Settings) icon opens
  a full editor for status / courier / tracking no. / ETA + history; the tag icon prints the Parcel Tag;
  the receipt icon downloads the receipt. In this demo, status/tracking are stored in memory — wire them
  to your backend so real couriers and customers stay in sync (see INTEGRATION-GUIDE.md).

## Important: what needs a backend
Real money movement (Easypaisa/JazzCash/bank), automatic payment verification, and
real email/WhatsApp messages require a server with secret API keys — they cannot live
safely in browser code. Those are **simulated** here and clearly labelled.

➡️ See **INTEGRATION-GUIDE.md** for exactly how your developer connects the real services.

## Files
- `index.html` — page shell + all styling
- `data.js` — demo products / reviews / articles
- `app.js` — all app logic (router, cart, checkout, admin)
- `INTEGRATION-GUIDE.md` — backend wiring instructions
