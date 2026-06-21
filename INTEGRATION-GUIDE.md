# Animal Mart — Developer Integration Guide

This site is a **fully working frontend**. Everything you can click works as a demo:
browsing, search, cart, checkout flow, order confirmation, and a complete admin panel
(add / edit / delete products, reviews, articles; approve & ship orders).

The pieces that **require a backend** are simulated in the browser and clearly marked.
This guide tells you exactly where and how to connect the real services.

---

## 1. Run it locally

No build step. Just open `index.html` in a browser, **or** serve the folder:

```bash
# any static server works
python3 -m http.server 8080
# then open http://localhost:8080
```

Files:
- `index.html` — markup + all styles
- `data.js`    — seed products / reviews / articles (replace with API data)
- `app.js`     — router, cart, checkout, admin logic

**Admin panel:** go to `#/admin`. Demo login is pre-filled (`admin@animalmart.pk` / `admin123`).

---

## 2. What is real vs simulated

| Feature | Status in demo | Needs backend? |
|---|---|---|
| Browse / search / filter products | ✅ Fully working | No |
| Add to cart / quantities / buy now | ✅ Fully working | No |
| Checkout form + order summary | ✅ Fully working | No |
| Admin CRUD (products/reviews/articles) | ✅ Fully working (in-memory) | Yes, to persist |
| Order approval / ship status | ✅ Fully working (in-memory) | Yes, to persist |
| **Easypaisa / JazzCash / Bank payment** | ⚠️ Shows account details only | **Yes** |
| **Auto payment verification** | ⚠️ Simulated | **Yes** |
| **Email order confirmation** | ⚠️ Simulated (shows on screen) | **Yes** |
| **WhatsApp order confirmation** | ⚠️ Simulated | **Yes** |

> Why these need a backend: payment APIs and messaging APIs require **secret keys**.
> If those keys sit in `app.js`, anyone viewing source can steal them and fake payments.
> They must live on a server you control.

---

## 3. Suggested backend shape

Any stack works (Node/Express, Laravel, Django, Firebase…). You need:

- A **database** (products, reviews, articles, orders, admin users)
- A few **API endpoints** the frontend calls instead of using `data.js`
- **Webhook endpoints** the payment providers call when money arrives

Replace the in-memory `State` object in `app.js` with `fetch()` calls:

```js
// Instead of: State.products = SEED_PRODUCTS
const res = await fetch('/api/products');
State.products = await res.json();

// Admin save product → POST/PUT
await fetch('/api/products', { method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify(data) });
```

Endpoints to build:
```
GET    /api/products            list
POST   /api/products            create (admin)
PUT    /api/products/:id        update (admin)
DELETE /api/products/:id        delete (admin)
GET    /api/reviews   POST/PUT/DELETE …same pattern
GET    /api/articles  POST/PUT/DELETE …same pattern
POST   /api/orders              place order  → returns {orderId}
GET    /api/orders              list (admin)
POST   /api/orders/:id/approve  approve (admin)
POST   /api/auth/login          admin login → returns session/JWT
```

---

## 4. Payments (Easypaisa, JazzCash, Bank)

### Easypaisa & JazzCash
Both offer merchant APIs in Pakistan. The flow:

1. Frontend posts the order to `POST /api/orders` → backend creates order as `Awaiting payment`.
2. Backend calls the provider's **Initiate Transaction** API and returns a payment URL / token.
3. Customer pays in the Easypaisa/JazzCash flow.
4. Provider calls your **webhook** (`POST /api/payments/webhook`) when payment succeeds.
5. Webhook verifies the signature, marks the order `Confirmed`, and triggers notifications (section 5).

Get merchant credentials from:
- **Easypaisa**: Telenor Microfinance Bank merchant onboarding
- **JazzCash**: JazzCash merchant portal (sandbox + production keys)

Keep `MERCHANT_ID`, `INTEGRITY_SALT`, and API keys in server environment variables — never in frontend code.

### Bank transfer
Manual reconciliation: customer uploads a receipt, admin verifies in the Orders tab and clicks **Approve**.
For automatic matching, use a bank that offers transaction webhooks/IBAN virtual accounts.

### "Auto payment check"
This is the webhook in step 4 above — the provider tells your server the moment payment clears,
and your server flips the order to `Confirmed` automatically. The demo simulates this; wire the real
webhook to `AdminPage.approveOrder()`-equivalent logic on the server.

---

## 5. Email + WhatsApp confirmations

Trigger these from the backend **after** payment is confirmed (or immediately for COD).

**Email** — use any transactional provider:
- Resend, SendGrid, Mailgun, or Amazon SES
- Send an order-confirmation template with the order ID, items, total, and status.

**WhatsApp** — use the official WhatsApp Business Cloud API (via Meta) or a provider like Twilio:
- Register a sender number and an approved message template.
- On order confirmation, POST to the API with the customer's number and order details.

```
Order placed → backend confirms payment
            → send email (Resend/SendGrid)
            → send WhatsApp (Cloud API/Twilio)
            → update order status in DB
```

In the demo, look for comments marked `DEMO:` in `app.js` (`placeOrder`, `ConfirmPage`,
`approveOrder`) — those are the exact spots to call your backend.

---

## 6. Admin authentication

The demo accepts `admin123` client-side. Replace `AdminPage.login()` with a real call to
`POST /api/auth/login` that returns a session cookie or JWT, and protect every `/api/...admin`
endpoint on the server. Never trust `State.isAdmin` for security — it's only for showing/hiding UI.

---

## 7. Images

Product/article images currently use free Unsplash URLs for the demo look. Swap the `img`
fields for your client's real product photography (upload to your own CDN or storage bucket).

---

## 8. Going live checklist

- [ ] Stand up backend + database, move `data.js` content into it
- [ ] Point frontend `State` loads at your API
- [ ] Easypaisa + JazzCash merchant accounts (sandbox → production)
- [ ] Payment webhook verifying signatures
- [ ] Email provider + WhatsApp Business API
- [ ] Real admin auth with hashed passwords
- [ ] Replace demo images with real product photos
- [ ] Add SSL (https) — required for payment providers
- [ ] Privacy policy, terms, shipping & refund pages (stubs exist in the footer)

---

Questions on any specific provider's API? Each of Easypaisa, JazzCash, Resend, and the
WhatsApp Cloud API publishes step-by-step docs — start there with the credentials above.
