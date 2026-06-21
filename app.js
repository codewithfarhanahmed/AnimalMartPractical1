// ============================================================
//  ANIMAL MART — APP LOGIC (demo / frontend only)
//  State lives in memory. In production, swap the State.* and
//  checkout functions for backend API calls. See INTEGRATION-GUIDE.md
// ============================================================

const PKR = n => 'Rs ' + n.toLocaleString('en-PK');
const $ = s => document.querySelector(s);

// ---------- ICONS (Lucide — free open-source SVG icon set, themed via CSS) ----------
// icon('truck') -> <i data-lucide="truck" class="lic"></i>; Lucide swaps these for inline SVGs.
function icon(name, cls){ return `<i data-lucide="${name}" class="lic ${cls||''}"></i>`; }
// Paint only the placeholders that haven't been converted yet. lucide.createIcons()
// replaces <i data-lucide> with <svg>, so re-running it is cheap and idempotent.
let _painting=false;
function paintIcons(){
  if(_painting) return;                 // guard against re-entrancy
  if(window.lucide && window.lucide.createIcons){
    _painting=true;
    try{ window.lucide.createIcons(); }catch(e){ console.warn('icon paint failed',e); }
    _painting=false;
  }
}
window.addEventListener('DOMContentLoaded', paintIcons);

// ---------- STATE ----------
const State = {
  products: JSON.parse(JSON.stringify(window.SEED_PRODUCTS)),
  reviews: JSON.parse(JSON.stringify(window.SEED_REVIEWS)),
  articles: JSON.parse(JSON.stringify(window.SEED_ARTICLES)),
  cart: [],        // {id, qty}
  orders: [],      // placed orders
  isAdmin: false,
  orderCounter: 1042,
  adClosed: false   // homepage ad banner dismissed?
};

// ---------- DEMO SEED ORDERS (so the tracking flow is ready to try) ----------
State.orders = [
  {
    id:'AM-1041', customer:'Ayesha Khan', email:'ayesha@email.com', phone:'+92 300 1234567',
    address:'12 Gulberg III, Lahore', city:'Lahore', zip:'54000',
    items:[{id:'p05',qty:2,name:'Whisker Licker Tuna Pâté',price:1299},{id:'p14',qty:1,name:'Feather Wand Teaser',price:799}],
    subtotal:3397, shipping:0, total:3397, pay:'cod', status:'Shipped',
    tracking:'AMK7K2QX', courier:'TCS', eta:'Sat 21 Jun',
    history:[
      {status:'Confirmed', note:'Order placed and confirmed', at:'17/06/2026, 10:14'},
      {status:'Packed', note:'Items boxed at Lahore hub', at:'17/06/2026, 16:40'},
      {status:'Shipped', note:'Handed to TCS', at:'18/06/2026, 09:05'}
    ],
    date:'17/06/2026'
  },
  {
    id:'AM-1042', customer:'Bilal Ahmed', email:'bilal@email.com', phone:'+92 321 7654321',
    address:'House 7, DHA Phase 5, Karachi', city:'Karachi', zip:'75500',
    items:[{id:'p01',qty:1,name:'Royal Chompers Dry Food',price:3499}],
    subtotal:3499, shipping:0, total:3499, pay:'easypaisa', status:'Awaiting payment',
    tracking:'', courier:'', eta:'',
    history:[{status:'Awaiting payment', note:'Order placed — awaiting payment verification', at:'19/06/2026, 11:22'}],
    date:'19/06/2026'
  }
];

// ---------- TOAST ----------
function toast(msg){
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="dot"></span>${msg}`;
  $('#toasts').appendChild(el);
  setTimeout(()=>{el.style.opacity='0';el.style.transition='.3s';setTimeout(()=>el.remove(),300)},2600);
}

// ---------- HELPERS ----------
function starHtml(r){
  let s='<span class="starline">';
  for(let i=1;i<=5;i++) s+=`<span class="rate-star${i<=r?'':' empty'}">${icon('star')}</span>`;
  return s+'</span>';
}
// inline star icons for table cells (count of filled stars)
function starsInline(r){ let s='<span class="starline">'; for(let i=0;i<r;i++)s+=`<span class="rate-star">${icon('star')}</span>`; return s+'</span>'; }
function findProduct(id){return State.products.find(p=>p.id===id)}
function cartCount(){return State.cart.reduce((a,c)=>a+c.qty,0)}
function cartTotal(){return State.cart.reduce((a,c)=>{const p=findProduct(c.id);return a+(p?p.price*c.qty:0)},0)}

// ============================================================
//  ROUTER
// ============================================================
const Router = {
  routes:{},
  add(path,fn){this.routes[path]=fn},
  resolve(){
    const hash = location.hash.slice(1) || '/';
    const [path, ...rest] = hash.split('/').filter(Boolean);
    const base = '/' + (path||'');
    window.scrollTo(0,0);
    if(base==='/admin'){ AdminPage.render(); }
    else if(path==='product'){ ProductPage(rest[0]); }
    else if(path==='article'){ ArticlePage(rest[0]); }
    else if(path==='track'){ TrackPage(rest[0]); }
    else {
      const fn = this.routes[base] || this.routes['/'];
      fn();
      setActiveNav(base);
    }
    paintIcons();   // convert any <i data-lucide> placeholders this render produced
  }
};
window.addEventListener('hashchange',()=>Router.resolve());

function go(path){location.hash=path}
function setActiveNav(base){
  document.querySelectorAll('.navlinks a').forEach(a=>{
    a.classList.toggle('active', a.dataset.route===base);
  });
}

// ============================================================
//  SHARED CHROME (nav + footer)
// ============================================================
function navHtml(){
  return `
  <div class="topbar">Free delivery on orders over Rs 3,000 — across Pakistan</div>
  <header class="nav">
    <div class="wrap nav-inner">
      <a href="#/" class="logo"><span class="mark">${icon('paw-print')}</span>Animal Mart</a>
      <nav class="navlinks">
        <a href="#/" data-route="/">Home</a>
        <a href="#/shop" data-route="/shop">Shop</a>
        <a href="#/articles" data-route="/articles">Articles</a>
        <a href="#/track" data-route="/track">Track Order</a>
        <a href="#/about" data-route="/about">About</a>
        <a href="#/contact" data-route="/contact">Contact</a>
      </nav>
      <div class="nav-actions">
        <div class="searchbox">
          <span>${icon('search')}</span>
          <input placeholder="Search products…" onkeydown="if(event.key==='Enter'){go('/shop');setTimeout(()=>{const i=document.querySelector('.shop-search input');if(i){i.value=this.value;ShopPage.search=this.value;ShopPage.render();}},60)}">
        </div>
        <a href="#/admin" class="adminlink">Admin</a>
        <button class="cartbtn" onclick="App.openCart()">${icon('shopping-bag')}<span class="cart-count" id="cc">${cartCount()}</span></button>
        <button class="hamburger" onclick="document.getElementById('mobileMenu').classList.add('open')">${icon('menu')}</button>
      </div>
    </div>
  </header>
  <div class="mobile-menu" id="mobileMenu">
    <button class="mm-close" onclick="document.getElementById('mobileMenu').classList.remove('open')">${icon('x')}</button>
    <a href="#/" onclick="closeMM()">Home</a>
    <a href="#/shop" onclick="closeMM()">Shop</a>
    <a href="#/articles" onclick="closeMM()">Articles</a>
    <a href="#/track" onclick="closeMM()">Track Order</a>
    <a href="#/about" onclick="closeMM()">About</a>
    <a href="#/contact" onclick="closeMM()">Contact</a>
    <a href="#/admin" onclick="closeMM()">Admin Panel</a>
  </div>`;
}
function closeMM(){document.getElementById('mobileMenu').classList.remove('open')}
function closeAd(){
  State.adClosed=true;
  const b=document.getElementById('adBanner');
  if(b){ b.style.transition='.3s'; b.style.opacity='0'; b.style.maxHeight='0'; setTimeout(()=>b.remove(),300); }
}

function footerHtml(){
  return `
  <footer>
    <div class="wrap">
      <div class="foot-grid">
        <div>
          <div class="logo"><span class="mark">${icon('paw-print')}</span>Animal Mart</div>
          <p class="fdesc">Wholesome food and joyful toys for the cats and dogs who run your home. Made for Pakistani pet parents.</p>
        </div>
        <div>
          <h5>Shop</h5>
          <ul>
            <li><a href="#/shop">All Products</a></li>
            <li><a href="#/shop">Dog Food</a></li>
            <li><a href="#/shop">Cat Food</a></li>
            <li><a href="#/shop">Toys</a></li>
          </ul>
        </div>
        <div>
          <h5>Company</h5>
          <ul>
            <li><a href="#/about">About Us</a></li>
            <li><a href="#/articles">Articles</a></li>
            <li><a href="#/contact">Contact</a></li>
            <li><a href="#/contact">Shipping & Returns</a></li>
          </ul>
        </div>
        <div class="news">
          <h5>Get pet tips & offers</h5>
          <input placeholder="Your email address">
          <button class="btn" style="width:100%;justify-content:center" onclick="toast('Subscribed! Welcome to the pack')">Subscribe</button>
        </div>
      </div>
      <div class="foot-bot">© 2026 Animal Mart. Built with love for good boys and girls everywhere.</div>
    </div>
  </footer>`;
}

function shell(content){
  return navHtml() + content + footerHtml();
}

// ============================================================
//  PRODUCT CARD COMPONENT
// ============================================================
function productCard(p){
  const save = Math.round((1-p.price/p.old)*100);
  return `
  <div class="pcard fade-in">
    <div class="imgwrap" onclick="go('/product/${p.id}')">
      ${save>0?`<span class="badge">Save ${save}%</span>`:''}
      <span class="badge sold">${p.sold.toLocaleString()} sold</span>
      <img src="${p.img}" alt="${p.name}" loading="lazy">
    </div>
    <div class="body">
      <span class="cat-tag">${p.cat}</span>
      <h3 onclick="go('/product/${p.id}')">${p.name}</h3>
      <div class="stars">${starHtml(p.rating)}</div>
      <div class="priceline">
        <span class="now">${PKR(p.price)}</span>
        ${p.old>p.price?`<span class="old">${PKR(p.old)}</span>`:''}
      </div>
      <button class="btn add" onclick="App.addToCart('${p.id}')">Add to Basket</button>
    </div>
  </div>`;
}

// ============================================================
//  HOME PAGE
// ============================================================
Router.add('/', function(){
  const bestSellers = [...State.products].sort((a,b)=>b.sold-a.sold).slice(0,4);
  const cats = [
    {name:'Dog Food', sub:'Tails wag for these', img:'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&q=80', f:'Dog Food'},
    {name:'Cat Food', sub:'Purr-fect nutrition', img:'https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=400&q=80', f:'Cat Food'},
    {name:'Toys', sub:'Endless playtime', img:'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=400&q=80', f:'Toys'},
    {name:'Beds & More', sub:'Comfy & cosy', img:'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=400&q=80', f:'Beds'}
  ];
  const feat = State.articles.filter(a=>a.featured);
  const content = `
  ${State.adClosed?'':`
  <div class="ad-banner" id="adBanner">
    <a href="#/shop" class="ad-link" aria-label="View offers">
      <img src="images/adbanner.png" alt="Special offer"
        onerror="this.onerror=null;this.parentElement.parentElement.classList.add('ad-fallback');this.remove()">
      <div class="ad-fallback-text">
        <b>Mega Pet Sale is live</b>
        <span>Up to 30% off food &amp; toys — free delivery over Rs 3,000</span>
      </div>
    </a>
    <button class="ad-close" onclick="closeAd()" aria-label="Close ad">${icon('x')}</button>
  </div>`}
  <section class="hero">
    <div class="wrap hero-grid">
      <div>
        <span class="eyebrow"><span class="pawdot"></span>Pakistan's playful pet store</span>
        <h1>Happy bowls,<br>happier <span class="wink">zoomies</span>.</h1>
        <p class="lead">Premium food and joyful toys for the cats and dogs who own your heart — delivered to your door.</p>
        <div class="hero-cta">
          <a href="#/shop" class="btn">Shop the store</a>
          <a href="#/articles" class="btn ghost">Read pet tips</a>
        </div>
        <div class="hero-stats">
          <div class="s"><b>15,000+</b><span>Happy pet parents</span></div>
          <div class="s"><b>24</b><span>Curated products</span></div>
          <div class="s"><b style="display:inline-flex;align-items:center;gap:3px">4.9${icon('star','rate-star')}</b><span>Average rating</span></div>
        </div>
      </div>
      <div class="hero-art">
        <div class="blob"></div>
        <img src="images/hero.jpg" alt="Happy pet" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=900&q=80'">
        <div class="float-card one"><span class="ic">${icon('truck')}</span>Fast delivery<br>nationwide</div>
        <div class="float-card two"><span class="ic">${icon('heart-handshake')}</span>15k+ happy<br>customers</div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="sec-head">
        <span class="eyebrow"><span class="pawdot"></span>Browse by category</span>
        <h2>What is your buddy craving?</h2>
        <p>From dinner bowls to squeaky toys, everything sorted for cats and dogs.</p>
      </div>
      <div class="cat-grid">
        ${cats.map(c=>`
          <div class="cat-card" onclick="go('/shop');setTimeout(()=>{ShopPage.filter='${c.f}';ShopPage.render()},50)">
            <img class="thumb" src="${c.img}" alt="${c.name}">
            <h4>${c.name}</h4><span>${c.sub}</span>
          </div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section" style="background:var(--cream-2)">
    <div class="wrap">
      <div class="sec-head">
        <span class="eyebrow"><span class="pawdot"></span>Best sellers</span>
        <h2>The crowd favourites</h2>
        <p>The food and toys that keep selling out. Loved by thousands of pets.</p>
      </div>
      <div class="prod-grid">${bestSellers.map(productCard).join('')}</div>
      <div style="text-align:center;margin-top:38px"><a href="#/shop" class="btn">See all products</a></div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="sec-head">
        <span class="eyebrow"><span class="pawdot"></span>From the journal</span>
        <h2>Top articles, hand-picked</h2>
        <p>Quick, vet-informed reads to keep your best friend thriving.</p>
      </div>
      <div class="art-feature">
        ${feat.map(a=>`
          <div class="art-big" onclick="go('/article/${a.id}')">
            <img src="${a.img}" alt="${a.title}">
            <div class="ov">
              <span class="tag">${a.tag} · ${a.read}</span>
              <h3>${a.title}</h3>
              <p>${a.excerpt}</p>
            </div>
          </div>`).join('')}
      </div>
      <div style="text-align:center;margin-top:30px"><a href="#/articles" class="btn ghost">Read all articles</a></div>
    </div>
  </section>

  <section class="section" style="background:var(--cream-2)">
    <div class="wrap">
      <div class="sec-head">
        <span class="eyebrow"><span class="pawdot"></span>Real reviews</span>
        <h2>Join 15,000+ happy customers</h2>
      </div>
      <div class="rev-grid">${State.reviews.slice(0,6).map(reviewCard).join('')}</div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="trust">
        <div class="t"><div class="ic">${icon('truck')}</div><b>Fast Shipping</b><span>1–3 days nationwide</span></div>
        <div class="t"><div class="ic">${icon('message-circle')}</div><b>Support That Cares</b><span>WhatsApp us anytime</span></div>
        <div class="t"><div class="ic">${icon('rotate-ccw')}</div><b>7-Day Returns</b><span>Money-back guarantee</span></div>
        <div class="t"><div class="ic">${icon('shield-check')}</div><b>Secure Checkout</b><span>Safe & encrypted</span></div>
      </div>
    </div>
  </section>`;
  $('#app').innerHTML = shell(content);
});

function reviewCard(r){
  return `
  <div class="rev-card">
    <div class="stars">${starHtml(r.rating)}</div>
    <p>"${r.text}"</p>
    <div class="rev-meta">
      <div class="av">${r.name[0].toUpperCase()}</div>
      <div><b>${r.name}</b>${r.verified?`<span class="v">${icon('check')} Verified buyer</span>`:`<span>on ${r.product}</span>`}</div>
    </div>
  </div>`;
}

// ============================================================
//  SHOP PAGE
// ============================================================
const ShopPage = {
  filter:'All', search:'', sort:'popular',
  render(){
    let list = State.products.slice();
    if(this.filter!=='All'){
      if(this.filter==='Toys') list = list.filter(p=>p.cat.includes('Toys'));
      else if(this.filter==='Dog') list = list.filter(p=>p.pet==='dog');
      else if(this.filter==='Cat') list = list.filter(p=>p.pet==='cat');
      else list = list.filter(p=>p.cat===this.filter);
    }
    if(this.search.trim()){
      const q=this.search.toLowerCase();
      list = list.filter(p=>p.name.toLowerCase().includes(q)||p.cat.toLowerCase().includes(q)||p.desc.toLowerCase().includes(q));
    }
    if(this.sort==='low') list.sort((a,b)=>a.price-b.price);
    else if(this.sort==='high') list.sort((a,b)=>b.price-a.price);
    else list.sort((a,b)=>b.sold-a.sold);

    const cats=['All','Dog','Cat','Dog Food','Cat Food','Dog Toys','Cat Toys','Beds','Accessories'];
    const content = `
    <div class="page-head">
      <div class="wrap">
        <span class="eyebrow" style="margin-bottom:14px"><span class="pawdot"></span>The whole store</span>
        <h1>Shop everything</h1>
        <p>Food, toys, beds and gear — for the very good boys and girls.</p>
      </div>
    </div>
    <div class="wrap">
      <div class="shop-layout">
        <aside class="filters">
          <h4>Categories</h4>
          <div class="filter-row">
            ${cats.map(c=>`<button class="filter-pill ${this.filter===c?'on':''}" onclick="ShopPage.filter='${c}';ShopPage.render()">${c==='Dog'?'Dogs':c==='Cat'?'Cats':c}</button>`).join('')}
          </div>
        </aside>
        <div>
          <div class="shop-top">
            <span class="count">${list.length} product${list.length!==1?'s':''}</span>
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <div class="shop-search">
                <span>${icon('search')}</span>
                <input placeholder="Search products…" value="${this.search}" oninput="ShopPage.search=this.value;ShopPage.render();this.focus()">
              </div>
              <select class="field" style="width:auto;padding:10px 16px;border-radius:50px" onchange="ShopPage.sort=this.value;ShopPage.render()">
                <option value="popular" ${this.sort==='popular'?'selected':''}>Most popular</option>
                <option value="low" ${this.sort==='low'?'selected':''}>Price: low to high</option>
                <option value="high" ${this.sort==='high'?'selected':''}>Price: high to low</option>
              </select>
            </div>
          </div>
          ${list.length?`<div class="prod-grid">${list.map(productCard).join('')}</div>`
            :`<div class="empty">No products match "${this.search}". Try a different search.</div>`}
        </div>
      </div>
    </div>`;
    $('#app').innerHTML = shell(content);
    setActiveNav('/shop');
  }
};
Router.add('/shop', ()=>ShopPage.render());

// ============================================================
//  PRODUCT DETAIL PAGE
// ============================================================
let pdpQty = 1;
function ProductPage(id){
  const p = findProduct(id);
  if(!p){ go('/shop'); return; }
  pdpQty = 1;
  const save = Math.round((1-p.price/p.old)*100);
  const related = State.products.filter(x=>x.pet===p.pet && x.id!==p.id).slice(0,4);
  const prodReviews = State.reviews.filter(r=>r.product===p.name);
  const content = `
  <div class="wrap">
    <div style="padding:24px 0;font-weight:700;color:var(--ink-soft);font-size:14px">
      <a href="#/shop" style="color:var(--blush-deep)">Shop</a> / ${p.cat} / ${p.name}
    </div>
    <div class="pdp">
      <div class="gallery"><img src="${p.img}" alt="${p.name}"></div>
      <div class="info">
        <span class="cat-tag">${p.cat}</span>
        <h1>${p.name}</h1>
        <div class="stars" style="font-size:17px;color:var(--blush-deep)">${starHtml(p.rating)} <span style="color:var(--ink-soft);font-weight:700;font-size:14px">· ${p.sold.toLocaleString()} sold</span></div>
        <div class="price-big">
          <span class="now">${PKR(p.price)}</span>
          ${p.old>p.price?`<span class="old">${PKR(p.old)}</span><span class="save">Save ${save}%</span>`:''}
        </div>
        <p class="desc">${p.desc}</p>
        <div class="pdp-actions">
          <div class="qty">
            <button onclick="pdpQty=Math.max(1,pdpQty-1);document.getElementById('pq').textContent=pdpQty">−</button>
            <span id="pq">1</span>
            <button onclick="pdpQty++;document.getElementById('pq').textContent=pdpQty">+</button>
          </div>
          <button class="btn" onclick="App.addToCart('${p.id}',pdpQty)">Add to Basket</button>
          <button class="btn ghost" onclick="App.addToCart('${p.id}',pdpQty);App.openCart()">Buy Now</button>
        </div>
        <div class="pdp-feats">
          <div class="f">${icon('truck')} Free delivery over Rs 3,000</div>
          <div class="f">${icon('rotate-ccw')} 7-day returns</div>
          <div class="f">${icon('shield-check')} Secure payment</div>
        </div>
      </div>
    </div>
    ${prodReviews.length?`
    <section class="section" style="padding-top:20px">
      <h2 style="font-size:28px;margin-bottom:24px">What buyers say</h2>
      <div class="rev-grid">${prodReviews.map(reviewCard).join('')}</div>
    </section>`:''}
    <section class="section">
      <h2 style="font-size:28px;margin-bottom:24px">You might also love</h2>
      <div class="prod-grid">${related.map(productCard).join('')}</div>
    </section>
  </div>`;
  $('#app').innerHTML = shell(content);
}

// ============================================================
//  ARTICLES PAGE
// ============================================================
Router.add('/articles', function(){
  const feat = State.articles.filter(a=>a.featured);
  const rest = State.articles.filter(a=>!a.featured);
  const content = `
  <div class="page-head">
    <div class="wrap">
      <span class="eyebrow" style="margin-bottom:14px"><span class="pawdot"></span>The Animal Mart journal</span>
      <h1>Pet tips & stories</h1>
      <p>Short, practical reads to help your buddy live their best life.</p>
    </div>
  </div>
  <div class="wrap section">
    <div class="sec-head" style="margin-bottom:30px"><h2 style="font-size:30px">Featured reads</h2></div>
    <div class="art-feature">
      ${feat.map(a=>`
        <div class="art-big" onclick="go('/article/${a.id}')">
          <img src="${a.img}" alt="${a.title}">
          <div class="ov"><span class="tag">${a.tag} · ${a.read}</span><h3>${a.title}</h3><p>${a.excerpt}</p></div>
        </div>`).join('')}
    </div>
    <div class="sec-head" style="margin:50px 0 24px"><h2 style="font-size:30px">More articles</h2></div>
    <div class="art-list">
      ${rest.map(a=>`
        <div class="art-row" onclick="go('/article/${a.id}')">
          <img src="${a.img}" alt="${a.title}">
          <div><span class="tag">${a.tag} · ${a.read}</span><h4>${a.title}</h4><span>${a.excerpt}</span></div>
        </div>`).join('')}
    </div>
  </div>`;
  $('#app').innerHTML = shell(content);
});

function ArticlePage(id){
  const a = State.articles.find(x=>x.id===id);
  if(!a){ go('/articles'); return; }
  const more = State.articles.filter(x=>x.id!==id).slice(0,2);
  const content = `
  <div class="wrap" style="max-width:780px">
    <div style="padding:30px 0 0;font-weight:700;color:var(--ink-soft);font-size:14px">
      <a href="#/articles" style="color:var(--blush-deep)">Articles</a> / ${a.tag}
    </div>
    <article style="padding:20px 0 40px">
      <span class="eyebrow" style="margin-bottom:16px"><span class="pawdot"></span>${a.tag} · ${a.read} read</span>
      <h1 style="font-size:clamp(30px,5vw,46px);margin-bottom:20px">${a.title}</h1>
      <img src="${a.img}" alt="${a.title}" style="width:100%;height:380px;object-fit:cover;border-radius:var(--radius-lg);margin-bottom:28px">
      <p style="font-size:19px;font-weight:700;color:var(--ink);margin-bottom:20px">${a.excerpt}</p>
      <p style="font-size:17px;color:var(--ink-soft);font-weight:500;line-height:1.8">${a.body}</p>
    </article>
  </div>
  <div class="wrap section">
    <h2 style="font-size:28px;margin-bottom:24px">Keep reading</h2>
    <div class="art-list">
      ${more.map(x=>`
        <div class="art-row" onclick="go('/article/${x.id}')">
          <img src="${x.img}" alt="${x.title}">
          <div><span class="tag">${x.tag} · ${x.read}</span><h4>${x.title}</h4><span>${x.excerpt}</span></div>
        </div>`).join('')}
    </div>
  </div>`;
  $('#app').innerHTML = shell(content);
}

// ============================================================
//  ABOUT + CONTACT
// ============================================================
Router.add('/about', function(){
  const content = `
  <div class="page-head"><div class="wrap">
    <span class="eyebrow" style="margin-bottom:14px"><span class="pawdot"></span>Our story</span>
    <h1>Made for pet parents</h1>
    <p>Because the good boys and girls deserve the very best.</p>
  </div></div>
  <div class="wrap section">
    <div class="pdp" style="padding-top:0">
      <div class="gallery"><img src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=900&q=80" alt="Pets"></div>
      <div class="info" style="display:flex;flex-direction:column;justify-content:center">
        <h2 style="font-size:34px;margin-bottom:16px">Animal Mart started with a simple idea</h2>
        <p class="desc" style="font-size:17px">Every pet parent in Pakistan deserves easy access to wholesome food and joyful toys — without the guesswork. We hand-pick every product, test it on our own very opinionated pets, and deliver it to your door.</p>
        <p class="desc" style="font-size:17px">From grain-free dinners to catnip kickers, our shelves only carry what we would give our own animals. That is the whole promise.</p>
        <div class="hero-stats" style="margin-top:10px">
          <div class="s"><b>15k+</b><span>Happy customers</span></div>
          <div class="s"><b>24</b><span>Curated products</span></div>
          <div class="s"><b style="display:inline-flex;align-items:center;gap:3px">4.9${icon('star','rate-star')}</b><span>Average rating</span></div>
        </div>
      </div>
    </div>
    <div class="trust" style="margin-top:40px">
      <div class="t"><div class="ic">${icon('paw-print')}</div><b>Pet-first</b><span>Quality we trust</span></div>
      <div class="t"><div class="ic">${icon('truck')}</div><b>Nationwide</b><span>Delivered to your door</span></div>
      <div class="t"><div class="ic">${icon('message-circle')}</div><b>Real support</b><span>WhatsApp anytime</span></div>
      <div class="t"><div class="ic">${icon('heart-handshake')}</div><b>Loved</b><span>15k+ happy homes</span></div>
    </div>
  </div>`;
  $('#app').innerHTML = shell(content);
});

Router.add('/contact', function(){
  const content = `
  <div class="page-head"><div class="wrap">
    <span class="eyebrow" style="margin-bottom:14px"><span class="pawdot"></span>Say hello</span>
    <h1>Get in touch</h1>
    <p>Questions about an order or a product? We are quick to reply.</p>
  </div></div>
  <div class="wrap section">
    <div class="checkout" style="padding-top:0">
      <div class="co-card">
        <h3>Send us a message</h3>
        <p class="sub">We typically reply within a few hours.</p>
        <div class="field"><label>Your name</label><input id="cf-name" placeholder="Ali Khan"></div>
        <div class="field"><label>Email</label><input id="cf-email" placeholder="you@email.com"></div>
        <div class="field"><label>Message</label><textarea rows="5" placeholder="How can we help?"></textarea></div>
        <button class="btn" onclick="toast('Thanks! Your message is on its way')">Send message</button>
      </div>
      <div>
        <div class="co-card">
          <h3>Reach us directly</h3>
          <div style="display:flex;flex-direction:column;gap:18px;margin-top:16px">
            <div class="pdp-feats" style="margin:0"><div class="f">${icon('message-circle')} WhatsApp: +92 300 1234567</div></div>
            <div class="pdp-feats" style="margin:0"><div class="f">${icon('mail')} hello@animalmart.pk</div></div>
            <div class="pdp-feats" style="margin:0"><div class="f">${icon('map-pin')} Lahore, Pakistan</div></div>
            <div class="pdp-feats" style="margin:0"><div class="f">${icon('clock')} Mon–Sat, 10am – 8pm</div></div>
          </div>
        </div>
        <div class="co-card" style="background:var(--blush-soft)">
          <h3>Need help with an order?</h3>
          <p class="sub" style="color:var(--ink)">Have your order number ready and message us on WhatsApp for the fastest help.</p>
          <button class="btn" onclick="toast('Opening WhatsApp… (demo)')">Chat on WhatsApp</button>
        </div>
      </div>
    </div>
  </div>`;
  $('#app').innerHTML = shell(content);
});

// ============================================================
//  CART
// ============================================================
const App = {
  addToCart(id, qty=1){
    const item = State.cart.find(c=>c.id===id);
    if(item) item.qty+=qty; else State.cart.push({id,qty});
    this.refreshCart();
    const p=findProduct(id);
    toast(`${p.name} added to basket`);
  },
  changeQty(id,d){
    const item=State.cart.find(c=>c.id===id);
    if(!item)return;
    item.qty+=d;
    if(item.qty<=0) State.cart=State.cart.filter(c=>c.id!==id);
    this.refreshCart();
  },
  removeItem(id){State.cart=State.cart.filter(c=>c.id!==id);this.refreshCart();toast('Removed from basket')},
  openCart(){$('#cartOverlay').classList.add('open');$('#cartDrawer').classList.add('open');this.refreshCart()},
  closeCart(){$('#cartOverlay').classList.remove('open');$('#cartDrawer').classList.remove('open')},
  refreshCart(){
    const cc=document.getElementById('cc'); if(cc) cc.textContent=cartCount();
    const body=$('#cartBody'), foot=$('#cartFoot');
    if(!State.cart.length){
      body.innerHTML=`<div class="cart-empty"><div class="big">${icon('shopping-bag')}</div><h3 style="margin-bottom:8px">Your basket is empty</h3><p style="color:var(--ink-soft);font-weight:600;margin-bottom:20px">Add some treats your pet will love.</p><button class="btn" onclick="App.closeCart();go('/shop')">Start shopping</button></div>`;
      foot.innerHTML='';
      paintIcons();
      return;
    }
    body.innerHTML = State.cart.map(c=>{
      const p=findProduct(c.id);
      return `<div class="cart-item">
        <img src="${p.img}" alt="${p.name}">
        <div class="ci-info">
          <h4>${p.name}</h4>
          <div class="ci-price">${PKR(p.price*c.qty)}</div>
          <div class="ci-controls">
            <div class="q">
              <button onclick="App.changeQty('${c.id}',-1)">−</button>
              <span style="font-weight:800;min-width:18px;text-align:center">${c.qty}</span>
              <button onclick="App.changeQty('${c.id}',1)">+</button>
            </div>
            <button class="ci-remove" onclick="App.removeItem('${c.id}')">Remove</button>
          </div>
        </div>
      </div>`;
    }).join('');
    const total=cartTotal();
    const ship = total>=3000?0:250;
    foot.innerHTML = `
      <div class="row"><span>Subtotal</span><span>${PKR(total)}</span></div>
      <div class="row"><span>Delivery</span><span>${ship?PKR(ship):'Free'}</span></div>
      <div class="row total"><span>Total</span><span>${PKR(total+ship)}</span></div>
      <button class="btn" style="width:100%;justify-content:center" onclick="App.closeCart();go('/checkout')">Checkout →</button>`;
    paintIcons();
  }
};
window.App = App;

// ============================================================
//  CHECKOUT  (DEMO — see INTEGRATION-GUIDE.md for real payments)
// ============================================================
let checkoutPay = 'cod';
Router.add('/checkout', function(){
  if(!State.cart.length){ go('/shop'); return; }
  const total=cartTotal(); const ship=total>=3000?0:250;
  const content = `
  <div class="page-head"><div class="wrap">
    <h1>Checkout</h1><p>Almost there — just a few details.</p>
  </div></div>
  <div class="wrap">
    <div class="checkout">
      <div>
        <div class="co-card">
          <h3>Delivery details</h3>
          <p class="sub">Where should we send the goodies?</p>
          <div class="field two">
            <div><label>First name</label><input id="ck-fname" placeholder="Ali"></div>
            <div><label>Last name</label><input id="ck-lname" placeholder="Khan"></div>
          </div>
          <div class="field"><label>Email</label><input id="ck-email" type="email" placeholder="you@email.com"></div>
          <div class="field"><label>WhatsApp number</label><input id="ck-phone" placeholder="+92 3XX XXXXXXX"></div>
          <div class="field"><label>Address</label><input id="ck-addr" placeholder="House, street, area"></div>
          <div class="field two">
            <div><label>City</label><input id="ck-city" placeholder="Lahore"></div>
            <div><label>Postal code</label><input id="ck-zip" placeholder="54000"></div>
          </div>
        </div>
        <div class="co-card">
          <h3>Payment method</h3>
          <p class="sub">Choose how you would like to pay.</p>
          <div class="pay-options">
            <div class="pay-opt on" id="pay-cod" onclick="selectPay('cod')">
              <div class="logo-badge" style="background:var(--ink)">COD</div>
              <div><b>Cash on Delivery</b><span>Pay when it arrives</span></div>
            </div>
            <div class="pay-opt" id="pay-easypaisa" onclick="selectPay('easypaisa')">
              <div class="logo-badge" style="background:#2db34a">EP</div>
              <div><b>Easypaisa</b><span>Mobile wallet transfer</span></div>
            </div>
            <div class="pay-opt" id="pay-jazzcash" onclick="selectPay('jazzcash')">
              <div class="logo-badge" style="background:#c0202d">JC</div>
              <div><b>JazzCash</b><span>Mobile wallet transfer</span></div>
            </div>
            <div class="pay-opt" id="pay-bank" onclick="selectPay('bank')">
              <div class="logo-badge" style="background:#1a56db">BNK</div>
              <div><b>Bank Transfer</b><span>Direct to our account</span></div>
            </div>
          </div>
          <div id="payDetail"></div>
        </div>
      </div>
      <div class="summary">
        <h3>Order summary</h3>
        ${State.cart.map(c=>{const p=findProduct(c.id);return `
          <div class="sum-item">
            <img src="${p.img}" alt="${p.name}">
            <div class="si-name">${p.name}<div class="si-qty">Qty ${c.qty}</div></div>
            <div class="si-price">${PKR(p.price*c.qty)}</div>
          </div>`}).join('')}
        <div class="sum-row"><span>Subtotal</span><span>${PKR(total)}</span></div>
        <div class="sum-row"><span>Delivery</span><span>${ship?PKR(ship):'Free'}</span></div>
        <div class="sum-row total"><span>Total</span><span>${PKR(total+ship)}</span></div>
        <button class="btn" style="width:100%;justify-content:center;margin-top:8px" onclick="placeOrder()">Place order · ${PKR(total+ship)}</button>
        <p style="text-align:center;font-size:12px;color:var(--ink-soft);font-weight:700;margin-top:14px">${icon('shield-check')} Secure checkout · 7-day returns</p>
      </div>
    </div>
  </div>`;
  $('#app').innerHTML = shell(content);
  checkoutPay='cod';
  renderPayDetail();
});

function selectPay(m){
  checkoutPay=m;
  ['cod','easypaisa','jazzcash','bank'].forEach(x=>{
    document.getElementById('pay-'+x).classList.toggle('on',x===m);
  });
  renderPayDetail();
}
function renderPayDetail(){
  const el=document.getElementById('payDetail'); if(!el)return;
  const map={
    cod:`<div class="pay-detail">Pay <b>cash to the courier</b> when your order arrives. No advance needed.</div>`,
    easypaisa:`<div class="pay-detail">Send the total to Easypaisa account <b>0300-1234567</b> (Animal Mart). After placing the order you'll get the confirmation steps on WhatsApp & email.<br><br><i>Demo note: real Easypaisa auto-verification connects via the merchant API — see INTEGRATION-GUIDE.md.</i></div>`,
    jazzcash:`<div class="pay-detail">Send the total to JazzCash account <b>0300-7654321</b> (Animal Mart). Confirmation steps follow on WhatsApp & email.<br><br><i>Demo note: real JazzCash auto-verification connects via the merchant API — see INTEGRATION-GUIDE.md.</i></div>`,
    bank:`<div class="pay-detail">Transfer to <b>Meezan Bank</b> · Animal Mart · Acct <b>0123 4567 8910</b> · IBAN <b>PK00MEZN0000123456789</b>. Upload the receipt after ordering.<br><br><i>Demo note: real bank reconciliation is handled by your backend — see INTEGRATION-GUIDE.md.</i></div>`
  };
  el.innerHTML=map[checkoutPay];
}

// ============================================================
//  ORDER TRACKING MODEL
// ============================================================
// The fulfilment pipeline. Admin advances an order through these stages.
const TRACK_STEPS = [
  {key:'Confirmed',        label:'Order confirmed',   icon:'clipboard-check', sub:'We received your order'},
  {key:'Packed',           label:'Packed',            icon:'package',         sub:'Your items are boxed up'},
  {key:'Shipped',          label:'Shipped',           icon:'truck',           sub:'Handed to the courier'},
  {key:'Out for delivery', label:'Out for delivery',  icon:'bike',            sub:'On its way to you today'},
  {key:'Delivered',        label:'Delivered',         icon:'home',            sub:'Enjoy! Thanks for shopping'}
];
const COURIERS = ['TCS','Leopards','M&P','PostEx','Trax','BlueEX'];
function stepIndex(status){ return TRACK_STEPS.findIndex(s=>s.key===status); }
function genTracking(){ return 'AMK' + Math.random().toString(36).slice(2,8).toUpperCase(); }
function logHistory(order, note){
  order.history = order.history || [];
  order.history.push({ status: order.status, note, at: new Date().toLocaleString('en-GB') });
}

function placeOrder(){
  const fname=document.getElementById('ck-fname').value.trim();
  const email=document.getElementById('ck-email').value.trim();
  const phone=document.getElementById('ck-phone').value.trim();
  const addr=document.getElementById('ck-addr').value.trim();
  if(!fname||!email||!phone||!addr){ toast('Please fill in your name, email, phone and address'); return; }

  const total=cartTotal(); const ship=total>=3000?0:250;
  const order={
    id:'AM-'+(++State.orderCounter),
    customer:fname+' '+document.getElementById('ck-lname').value.trim(),
    email, phone,
    address:addr+', '+document.getElementById('ck-city').value.trim(),
    city:document.getElementById('ck-city').value.trim()||'—',
    zip:document.getElementById('ck-zip').value.trim()||'—',
    items:State.cart.map(c=>({...c,name:findProduct(c.id).name,price:findProduct(c.id).price})),
    subtotal:total, shipping:ship,
    total:total+ship,
    pay:checkoutPay,
    status: checkoutPay==='cod' ? 'Confirmed' : 'Awaiting payment',
    // ---- tracking fields ----
    tracking: checkoutPay==='cod' ? genTracking() : '',
    courier:  checkoutPay==='cod' ? COURIERS[Math.floor(Math.random()*COURIERS.length)] : '',
    eta:'',
    history:[],
    date:new Date().toLocaleDateString('en-GB')
  };
  logHistory(order, order.status==='Confirmed'?'Order placed and confirmed':'Order placed — awaiting payment verification');
  State.orders.unshift(order);

  // ---- DEMO: simulate auto payment check + notifications ----
  // In production these are backend webhooks. See INTEGRATION-GUIDE.md
  ConfirmPage(order);
  State.cart=[];
  App.refreshCart();
}

function ConfirmPage(order){
  const paid = order.pay!=='cod';
  const content = `
  <div class="wrap">
    <div class="confirm">
      <div class="check">${icon('check')}</div>
      <h1>Order placed!</h1>
      <div class="oid">Order ${order.id}</div>
      <p>Thank you, ${order.customer.split(' ')[0]}! Your order has been received${order.status==='Confirmed'?' and confirmed':''}.</p>
      ${paid?`<p>Once your ${order.pay==='bank'?'bank transfer':order.pay} payment is verified, we'll start packing. You'll be notified at each step.</p>`:`<p>Pay cash when your order arrives. We're packing it now!</p>`}
      <div class="notif-row">
        <div class="notif-chip"><span class="dot"></span>${icon('mail')} Confirmation sent to ${order.email}</div>
        <div class="notif-chip"><span class="dot"></span>${icon('message-circle')} WhatsApp update to ${order.phone}</div>
      </div>
      <div class="co-card" style="text-align:left;max-width:460px;margin:0 auto 24px">
        <h3 style="font-size:18px;margin-bottom:14px">Order summary</h3>
        ${order.items.map(i=>`<div class="sum-row" style="margin:6px 0"><span>${i.name} × ${i.qty}</span><span>${PKR(i.price*i.qty)}</span></div>`).join('')}
        <div class="sum-row total" style="font-size:20px"><span>Total</span><span>${PKR(order.total)}</span></div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <span class="tag-pill ${order.status==='Confirmed'?'green':'amber'}">${order.status}</span>
          ${order.tracking?`<span class="tag-pill pink">${icon('truck')} ${order.courier} · ${order.tracking}</span>`:''}
        </div>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <a href="#/track/${order.id}" class="btn">${icon('map-pin')} Track order</a>
        <button class="btn ghost" onclick="downloadReceipt('${order.id}')">${icon('download')} Download receipt</button>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:12px">
        <a href="#/shop" class="btn ghost">Continue shopping</a>
        <a href="#/" class="btn ghost">Back to home</a>
      </div>
      <div class="login-hint" style="max-width:480px;margin:24px auto 0">
        ${icon('info')} Demo: the email/WhatsApp confirmations and automatic payment verification are simulated here. Your developer wires the real services using INTEGRATION-GUIDE.md — the order already appears in the Admin panel.
      </div>
    </div>
  </div>`;
  $('#app').innerHTML = shell(content);
  paintIcons();
}

// ============================================================
//  CUSTOMER ORDER TRACKING
// ============================================================
function findOrder(id){ return State.orders.find(o=>o.id===id || o.tracking===id); }

// Renders the visual timeline for an order.
function trackTimeline(order){
  const cancelled = order.status==='Cancelled';
  const curr = stepIndex(order.status); // -1 if Awaiting payment / Cancelled
  return `<div class="timeline">
    ${TRACK_STEPS.map((s,i)=>{
      let cls='pending';
      if(!cancelled){
        if(i<curr) cls='done';
        else if(i===curr) cls='current';
      }
      const ic = cls==='done'?icon('check'):(cls==='current'?icon(s.icon):icon(s.icon));
      return `<div class="tl-step ${cls}">
        <div class="tl-dot">${ic}</div>
        <b>${s.label}</b>
        <div class="tl-sub">${cls==='pending'?'Pending':s.sub}</div>
      </div>`;
    }).join('')}
  </div>`;
}

function TrackPage(id){
  const order = id ? findOrder(id) : null;
  let body;
  if(id && !order){
    body = `<div class="track-card"><p class="muted" style="margin:0">No order found for <b>${id}</b>. Check the order ID (e.g. AM-1043) or tracking number and try again.</p></div>`;
  } else if(order){
    const awaiting = order.status==='Awaiting payment';
    const cancelled = order.status==='Cancelled';
    body = `
      <div class="track-card">
        <div class="track-head">
          <div>
            <h2 style="font-size:24px">Order ${order.id}</h2>
            <div class="track-meta">
              <span>${icon('calendar')} ${order.date}</span>
              ${order.courier?`<span>${icon('truck')} ${order.courier}</span>`:''}
              ${order.tracking?`<span>${icon('hash')} ${order.tracking}</span>`:''}
              ${order.eta?`<span>${icon('clock')} ETA ${order.eta}</span>`:''}
            </div>
          </div>
          <span class="tag-pill ${cancelled?'pink':order.status==='Delivered'?'green':awaiting?'amber':'pink'}" style="font-size:13px">${order.status}</span>
        </div>
        ${awaiting?`<p class="muted">We're waiting for your ${order.pay} payment to be verified. Tracking begins once it's confirmed.</p>`
          :cancelled?`<p class="muted">This order was cancelled. If this is unexpected, contact us on WhatsApp.</p>`
          :trackTimeline(order)}
      </div>
      <div class="track-card">
        <h3 style="margin-bottom:12px">Delivery to</h3>
        <p style="font-weight:800">${order.customer}</p>
        <p class="muted">${order.address} ${order.zip&&order.zip!=='—'?'· '+order.zip:''}</p>
        <p class="muted">${order.phone}</p>
        <h3 style="margin:18px 0 12px">Items</h3>
        ${order.items.map(i=>`<div class="sum-row" style="margin:5px 0"><span>${i.name} × ${i.qty}</span><span>${PKR(i.price*i.qty)}</span></div>`).join('')}
        <div class="sum-row total"><span>Total</span><span>${PKR(order.total)}</span></div>
        <div class="doc-actions">
          <button class="btn" onclick="downloadReceipt('${order.id}')">${icon('download')} Download receipt</button>
        </div>
      </div>`;
  } else {
    body = `<div class="track-card"><p class="muted" style="margin:0">Enter your order ID (looks like <b>AM-1043</b>) or tracking number above to see live progress.</p></div>`;
  }

  const content = `
  <div class="page-head"><div class="wrap">
    <h1>Track your order</h1><p>Live updates from our shelf to your doorstep.</p>
  </div></div>
  <div class="wrap" style="padding:30px 0 60px">
    <div class="track-wrap">
      <div class="track-search">
        <input id="track-input" placeholder="Order ID or tracking number…" value="${id&&order?order.id:''}"
          onkeydown="if(event.key==='Enter')doTrack()">
        <button class="btn" onclick="doTrack()">${icon('search')} Track</button>
      </div>
      ${body}
    </div>
  </div>`;
  $('#app').innerHTML = shell(content);
}
function doTrack(){
  const v=document.getElementById('track-input').value.trim();
  if(!v){ toast('Enter an order ID or tracking number'); return; }
  go('/track/'+v);
}

// ============================================================
//  RECEIPT  (downloadable HTML — opens print/save-as-PDF dialog)
// ============================================================
function receiptHtml(order){
  return `
  <div class="doc-sheet">
    <div class="receipt-head">
      <div class="receipt-logo"><span class="mark">${icon('paw-print')}</span>Animal Mart</div>
      <div style="text-align:right">
        <div style="font-family:'Fraunces';font-weight:900;font-size:18px">RECEIPT</div>
        <div class="muted" style="font-size:13px">${order.id}</div>
      </div>
    </div>
    <div class="rc-grid">
      <div><span>Billed to</span><b>${order.customer}</b></div>
      <div><span>Date</span><b>${order.date}</b></div>
      <div><span>Phone</span><b>${order.phone}</b></div>
      <div><span>Payment</span><b>${order.pay.toUpperCase()}</b></div>
      <div style="grid-column:1/3"><span>Delivery address</span><b>${order.address}${order.zip&&order.zip!=='—'?' · '+order.zip:''}</b></div>
      ${order.tracking?`<div style="grid-column:1/3"><span>Tracking</span><b>${order.courier} · ${order.tracking}</b></div>`:''}
    </div>
    ${order.items.map(i=>`<div class="rc-row"><span>${i.name} × ${i.qty}</span><span>${PKR(i.price*i.qty)}</span></div>`).join('')}
    <div class="rc-row"><span>Subtotal</span><span>${PKR(order.subtotal!=null?order.subtotal:order.total)}</span></div>
    <div class="rc-row"><span>Delivery</span><span>${order.shipping?PKR(order.shipping):'Free'}</span></div>
    <div class="rc-row total"><span>Total paid</span><span>${PKR(order.total)}</span></div>
    <p style="text-align:center;color:#7A6A66;font-weight:700;font-size:13px;margin-top:22px">Thank you for shopping with Animal Mart — hello@animalmart.pk</p>
  </div>`;
}

// Opens a clean printable window the customer can Save as PDF or print.
function downloadReceipt(id){
  const order = findOrder(id);
  if(!order){ toast('Order not found'); return; }
  openDocWindow(`Receipt ${order.id}`, receiptHtml(order));
}

// ============================================================
//  PARCEL TAG  (admin — delivery label for the courier)
// ============================================================
function parcelTagHtml(order){
  const codDue = order.pay==='cod';
  return `
  <div class="parcel-tag">
    <div class="pt-band">
      <span>${icon('paw-print')} ANIMAL MART</span>
      <span class="pt-id">${order.id}</span>
    </div>
    <div class="pt-body">
      <div class="pt-section">
        <div class="lbl">${icon('user')} Deliver to</div>
        <div class="val">${order.customer}</div>
      </div>
      <div class="pt-section">
        <div class="lbl">${icon('map-pin')} Address</div>
        <div class="val" style="font-size:15px">${order.address}${order.zip&&order.zip!=='—'?', '+order.zip:''}</div>
      </div>
      <div class="pt-cols">
        <div class="pt-section" style="margin:0">
          <div class="lbl">${icon('phone')} Phone</div>
          <div class="val" style="font-size:15px">${order.phone}</div>
        </div>
        <div class="pt-section" style="margin:0">
          <div class="lbl">${icon('truck')} Courier</div>
          <div class="val" style="font-size:15px">${order.courier||'—'}</div>
        </div>
        <div class="pt-section" style="margin:0">
          <div class="lbl">${icon('hash')} Tracking</div>
          <div class="val" style="font-size:15px">${order.tracking||'—'}</div>
        </div>
        <div class="pt-section" style="margin:0">
          <div class="lbl">${icon('package')} Items</div>
          <div class="val" style="font-size:15px">${order.items.reduce((a,i)=>a+i.qty,0)} pcs</div>
        </div>
      </div>
      <div class="pt-section" style="margin:14px 0 0">
        <div class="lbl">${icon('barcode')} Scan</div>
        <div class="barcode"></div>
      </div>
    </div>
    <div class="pt-foot">
      <span>${icon('warehouse')} From: Animal Mart, Lahore</span>
      ${codDue?`<span class="pt-cod">COD ${PKR(order.total)}</span>`:`<span class="tag-pill green">PREPAID</span>`}
    </div>
  </div>`;
}
function printParcelTag(id){
  const order = State.orders.find(o=>o.id===id);
  if(!order){ toast('Order not found'); return; }
  openDocWindow(`Parcel Tag ${order.id}`, parcelTagHtml(order));
}

// Shared: build an in-page printable area + open the browser print/save dialog.
function openDocWindow(title, innerHtml){
  // Pull the page's own stylesheet so the document looks identical.
  const css = document.querySelector('style') ? document.querySelector('style').innerHTML : '';
  let area = document.getElementById('printArea');
  if(area) area.remove();
  area = document.createElement('div');
  area.id='printArea';
  area.innerHTML = `<div style="padding:30px;background:var(--cream)">
      ${innerHtml}
      <div class="doc-actions no-print">
        <button class="btn" onclick="window.print()">${icon('printer')} Print / Save as PDF</button>
        <button class="btn ghost" onclick="document.getElementById('printArea').remove()">${icon('x')} Close</button>
      </div>
    </div>`;
  area.style.cssText='position:fixed;inset:0;z-index:9999;background:var(--cream);overflow:auto';
  document.body.appendChild(area);
  paintIcons();
}

// ============================================================
//  ADMIN PANEL
// ============================================================
const AdminPage = {
  tab:'dashboard',
  search:'',
  render(){
    if(!State.isAdmin){ return this.loginScreen(); }
    const body = this[this.tab+'Tab']();
    const html = `
    <div class="admin-shell">
      <aside class="admin-side">
        <div class="logo"><span class="mark">${icon('paw-print')}</span>Animal Mart</div>
        <nav class="admin-nav">
          <button class="${this.tab==='dashboard'?'on':''}" onclick="AdminPage.tab='dashboard';AdminPage.search='';AdminPage.render()">${icon('layout-dashboard')} Dashboard</button>
          <button class="${this.tab==='products'?'on':''}" onclick="AdminPage.tab='products';AdminPage.search='';AdminPage.render()">${icon('package')} Products</button>
          <button class="${this.tab==='orders'?'on':''}" onclick="AdminPage.tab='orders';AdminPage.search='';AdminPage.render()">${icon('receipt')} Orders</button>
          <button class="${this.tab==='reviews'?'on':''}" onclick="AdminPage.tab='reviews';AdminPage.search='';AdminPage.render()">${icon('star')} Reviews</button>
          <button class="${this.tab==='articles'?'on':''}" onclick="AdminPage.tab='articles';AdminPage.search='';AdminPage.render()">${icon('file-text')} Articles</button>
          <button onclick="State.isAdmin=false;go('/')">${icon('rotate-ccw')} Exit to store</button>
        </nav>
      </aside>
      <main class="admin-main">${body}</main>
    </div>`;
    $('#app').innerHTML = html;
    paintIcons();
  },

  loginScreen(){
    $('#app').innerHTML = shell(`
    <div class="login-wrap">
      <div class="login-card">
        <div class="mark">${icon('paw-print')}</div>
        <h2>Admin Login</h2>
        <p>Sign in to manage Animal Mart.</p>
        <div class="field" style="text-align:left"><label>Email</label><input id="adm-email" placeholder="admin@animalmart.pk" value="admin@animalmart.pk"></div>
        <div class="field" style="text-align:left"><label>Password</label><input id="adm-pass" type="password" placeholder="••••••••" value="admin123"></div>
        <button class="btn" style="width:100%;justify-content:center" onclick="AdminPage.login()">Sign in</button>
        <div class="login-hint">Demo credentials are pre-filled. In production this checks against your backend auth (see INTEGRATION-GUIDE.md).</div>
      </div>
    </div>`);
    paintIcons();
  },
  login(){
    // DEMO auth only. Replace with real backend auth.
    const pass=document.getElementById('adm-pass').value;
    if(pass==='admin123'){ State.isAdmin=true; this.tab='dashboard'; this.render(); toast('Welcome back, admin'); }
    else toast('Wrong password. Demo password is admin123');
  },

  dashboardTab(){
    const revenue = State.orders.reduce((a,o)=>a+o.total,0);
    const pending = State.orders.filter(o=>o.status==='Awaiting payment').length;
    return `
    <h1>Dashboard</h1>
    <p class="muted">Welcome back. Here's how the store is doing.</p>
    <div class="stat-grid">
      <div class="stat-card"><div class="l">Products</div><div class="v">${State.products.length}</div></div>
      <div class="stat-card"><div class="l">Orders</div><div class="v pink">${State.orders.length}</div></div>
      <div class="stat-card"><div class="l">Revenue</div><div class="v">${PKR(revenue)}</div></div>
      <div class="stat-card"><div class="l">Awaiting payment</div><div class="v pink">${pending}</div></div>
    </div>
    <h3 style="font-family:'Fraunces';font-size:22px;margin-bottom:16px">Recent orders</h3>
    ${State.orders.length?`<table class="adtable">
      <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
      <tbody>${State.orders.slice(0,6).map(o=>`<tr>
        <td><b>${o.id}</b></td><td>${o.customer}</td><td>${PKR(o.total)}</td>
        <td>${o.pay.toUpperCase()}</td>
        <td><span class="tag-pill ${o.status==='Confirmed'?'green':o.status==='Awaiting payment'?'amber':'pink'}">${o.status}</span></td>
      </tr>`).join('')}</tbody></table>`
    :`<div class="co-card"><p class="muted" style="margin:0">No orders yet. Place a test order from the store to see it appear here.</p></div>`}`;
  },

  productsTab(){
    let list=State.products;
    if(this.search) list=list.filter(p=>p.name.toLowerCase().includes(this.search.toLowerCase())||p.cat.toLowerCase().includes(this.search.toLowerCase()));
    return `
    <div class="admin-bar">
      <div><h1>Products</h1><p class="muted" style="margin:0">${State.products.length} items in the catalogue</p></div>
      <div style="display:flex;gap:12px">
        <div class="admin-search"><span>${icon('search')}</span><input placeholder="Search products…" value="${this.search}" oninput="AdminPage.search=this.value;AdminPage.render();this.focus()"></div>
        <button class="btn" onclick="AdminPage.editProduct()">+ Add product</button>
      </div>
    </div>
    <table class="adtable">
      <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Sold</th><th>Rating</th><th>Actions</th></tr></thead>
      <tbody>${list.map(p=>`<tr>
        <td><div style="display:flex;align-items:center;gap:12px"><img src="${p.img}"><b>${p.name}</b></div></td>
        <td>${p.cat}</td><td>${PKR(p.price)}</td><td>${p.sold.toLocaleString()}</td>
        <td>${starsInline(p.rating)}</td>
        <td>
          <button class="ic-btn" title="Edit" onclick="AdminPage.editProduct('${p.id}')">${icon('pencil')}</button>
          <button class="ic-btn del" title="Delete" onclick="AdminPage.deleteProduct('${p.id}')">${icon('trash-2')}</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
  },
  editProduct(id){
    const p = id?findProduct(id):{id:'',name:'',cat:'Dog Food',pet:'dog',price:'',old:'',sold:0,rating:5,img:'',desc:''};
    openModal(`
      <h3>${id?'Edit':'Add'} product</h3>
      <div class="field"><label>Name</label><input id="m-name" value="${p.name}"></div>
      <div class="field two">
        <div><label>Category</label>
          <select id="m-cat">${['Dog Food','Cat Food','Dog Toys','Cat Toys','Beds','Accessories'].map(c=>`<option ${p.cat===c?'selected':''}>${c}</option>`).join('')}</select>
        </div>
        <div><label>Pet</label><select id="m-pet"><option value="dog" ${p.pet==='dog'?'selected':''}>Dog</option><option value="cat" ${p.pet==='cat'?'selected':''}>Cat</option></select></div>
      </div>
      <div class="field two">
        <div><label>Price (Rs)</label><input id="m-price" type="number" value="${p.price}"></div>
        <div><label>Old price (Rs)</label><input id="m-old" type="number" value="${p.old}"></div>
      </div>
      <div class="field two">
        <div><label>Units sold</label><input id="m-sold" type="number" value="${p.sold}"></div>
        <div><label>Rating (1–5)</label><input id="m-rating" type="number" min="1" max="5" value="${p.rating}"></div>
      </div>
      <div class="field"><label>Image URL</label><input id="m-img" value="${p.img}" placeholder="https://…"></div>
      <div class="field"><label>Description</label><textarea id="m-desc" rows="3">${p.desc}</textarea></div>
      <div class="modal-actions">
        <button class="btn ghost" onclick="closeModal()">Cancel</button>
        <button class="btn" onclick="AdminPage.saveProduct('${id||''}')">Save product</button>
      </div>
    `);
  },
  saveProduct(id){
    const data={
      name:document.getElementById('m-name').value.trim(),
      cat:document.getElementById('m-cat').value,
      pet:document.getElementById('m-pet').value,
      price:+document.getElementById('m-price').value,
      old:+document.getElementById('m-old').value,
      sold:+document.getElementById('m-sold').value,
      rating:+document.getElementById('m-rating').value,
      img:document.getElementById('m-img').value.trim()||'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&q=80',
      desc:document.getElementById('m-desc').value.trim()
    };
    if(!data.name||!data.price){ toast('Name and price are required'); return; }
    if(id){ Object.assign(findProduct(id),data); toast('Product updated'); }
    else { data.id='p'+Date.now(); State.products.push(data); toast('Product added'); }
    closeModal(); this.render();
  },
  deleteProduct(id){
    const p=findProduct(id);
    openModal(`<h3>Delete product?</h3><p style="color:var(--ink-soft);font-weight:600;margin-bottom:20px">"${p.name}" will be removed from the catalogue. This cannot be undone.</p>
      <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Cancel</button>
      <button class="btn" style="background:#e23b3b" onclick="State.products=State.products.filter(x=>x.id!=='${id}');closeModal();AdminPage.render();toast('Product deleted')">Delete</button></div>`);
  },

  ordersTab(){
    return `
    <h1>Orders</h1><p class="muted">Approve payments, update tracking manually, and print parcel tags.</p>
    ${State.orders.length?`<table class="adtable">
      <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Pay</th><th>Tracking</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${State.orders.map(o=>`<tr>
        <td><b>${o.id}</b><br><span style="font-size:12px;color:var(--ink-soft)">${o.date}</span></td>
        <td>${o.customer}<br><span style="font-size:12px;color:var(--ink-soft)">${o.phone}</span></td>
        <td>${PKR(o.total)}</td>
        <td>${o.pay.toUpperCase()}</td>
        <td style="font-size:12px">${o.tracking?`<b>${o.courier}</b><br><span style="color:var(--ink-soft)">${o.tracking}</span>`:`<span class="muted">—</span>`}</td>
        <td><span class="tag-pill ${o.status==='Delivered'?'green':o.status==='Confirmed'?'green':o.status==='Awaiting payment'?'amber':o.status==='Cancelled'?'pink':'pink'}">${o.status}</span></td>
        <td style="white-space:nowrap">
          ${o.status==='Awaiting payment'
            ? `<button class="btn sm" onclick="AdminPage.approveOrder('${o.id}')">Approve</button>`
            : `<button class="btn sm ghost" onclick="AdminPage.advanceOrder('${o.id}')" title="Advance to next stage">${icon('chevron-right')} Advance</button>`}
          <button class="ic-btn" title="Update tracking" onclick="AdminPage.manageOrder('${o.id}')">${icon('settings')}</button>
          <button class="ic-btn" title="Parcel tag" onclick="printParcelTag('${o.id}')">${icon('tag')}</button>
          <button class="ic-btn" title="Receipt" onclick="downloadReceipt('${o.id}')">${icon('receipt')}</button>
        </td>
      </tr>`).join('')}</tbody></table>`
    :`<div class="co-card"><p class="muted" style="margin:0">No orders yet. Place a test order from the store to try the tracking flow.</p></div>`}`;
  },

  approveOrder(id){
    const o=State.orders.find(x=>x.id===id);
    o.status='Confirmed';
    if(!o.tracking) o.tracking=genTracking();
    if(!o.courier) o.courier=COURIERS[Math.floor(Math.random()*COURIERS.length)];
    logHistory(o,'Payment verified — order confirmed');
    this.render();
    toast(`${id} approved — customer notified by email & WhatsApp (demo)`);
  },

  // Quick one-click advance to the next stage in the pipeline.
  advanceOrder(id){
    const o=State.orders.find(x=>x.id===id);
    const idx=stepIndex(o.status);
    if(idx<0){ o.status='Confirmed'; }
    else if(idx>=TRACK_STEPS.length-1){ toast('Order already delivered'); return; }
    else { o.status=TRACK_STEPS[idx+1].key; }
    if(!o.tracking){ o.tracking=genTracking(); o.courier=o.courier||COURIERS[0]; }
    logHistory(o,`Status updated to "${o.status}"`);
    this.render();
    toast(`${id} → ${o.status} (customer notified, demo)`);
  },

  // Full manual tracking editor.
  manageOrder(id){
    const o=State.orders.find(x=>x.id===id);
    const statuses=['Awaiting payment',...TRACK_STEPS.map(s=>s.key),'Cancelled'];
    openModal(`
      <h3>Update tracking · ${o.id}</h3>
      <p class="sub" style="color:var(--ink-soft);font-weight:600;margin-bottom:14px">Changes here are what the customer sees on the Track Order page.</p>
      <div class="field"><label>Status</label>
        <select id="trk-status">${statuses.map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}</select>
      </div>
      <div class="field two">
        <div><label>Courier</label>
          <select id="trk-courier"><option value="">— none —</option>${COURIERS.map(c=>`<option ${o.courier===c?'selected':''}>${c}</option>`).join('')}</select>
        </div>
        <div><label>Tracking number</label><input id="trk-no" value="${o.tracking||''}" placeholder="AMK…"></div>
      </div>
      <div class="field"><label>Estimated delivery (ETA)</label><input id="trk-eta" value="${o.eta||''}" placeholder="e.g. Tue 24 Jun"></div>
      <div class="field"><label>Note for history log (optional)</label><input id="trk-note" placeholder="e.g. Left depot, Lahore hub"></div>
      ${o.history&&o.history.length?`<div class="co-card" style="background:var(--cream-2);box-shadow:none;margin-top:6px">
        <b style="font-size:13px">History</b>
        ${o.history.slice().reverse().map(h=>`<div style="font-size:12px;color:var(--ink-soft);margin-top:6px">${h.at} — ${h.status}${h.note?' · '+h.note:''}</div>`).join('')}
      </div>`:''}
      <div class="modal-actions">
        <button class="btn ghost" onclick="closeModal()">Cancel</button>
        <button class="btn ghost" onclick="closeModal();printParcelTag('${o.id}')">${icon('tag')} Parcel tag</button>
        <button class="btn" onclick="AdminPage.saveTracking('${o.id}')">Save tracking</button>
      </div>
    `);
  },
  saveTracking(id){
    const o=State.orders.find(x=>x.id===id);
    const newStatus=document.getElementById('trk-status').value;
    const note=document.getElementById('trk-note').value.trim();
    o.courier=document.getElementById('trk-courier').value;
    o.tracking=document.getElementById('trk-no').value.trim();
    o.eta=document.getElementById('trk-eta').value.trim();
    const changed = newStatus!==o.status;
    o.status=newStatus;
    logHistory(o, note || (changed?`Status set to "${newStatus}"`:'Tracking details updated'));
    closeModal(); this.render();
    toast(`${id} tracking updated (customer notified, demo)`);
  },

  reviewsTab(){
    return `
    <div class="admin-bar">
      <div><h1>Reviews</h1><p class="muted" style="margin:0">${State.reviews.length} customer reviews</p></div>
      <button class="btn" onclick="AdminPage.editReview()">+ Add review</button>
    </div>
    <table class="adtable">
      <thead><tr><th>Customer</th><th>Product</th><th>Rating</th><th>Review</th><th>Actions</th></tr></thead>
      <tbody>${State.reviews.map(r=>`<tr>
        <td><b>${r.name}</b> ${r.verified?`<span class="tag-pill green">${icon('check')}</span>`:''}</td>
        <td>${r.product}</td><td>${starsInline(r.rating)}</td>
        <td style="max-width:320px">${r.text}</td>
        <td>
          <button class="ic-btn" onclick="AdminPage.editReview('${r.id}')">${icon('pencil')}</button>
          <button class="ic-btn del" onclick="AdminPage.deleteReview('${r.id}')">${icon('trash-2')}</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
  },
  editReview(id){
    const r=id?State.reviews.find(x=>x.id===id):{id:'',name:'',product:State.products[0].name,rating:5,text:'',verified:true};
    openModal(`
      <h3>${id?'Edit':'Add'} review</h3>
      <div class="field two">
        <div><label>Customer name</label><input id="r-name" value="${r.name}"></div>
        <div><label>Rating</label><input id="r-rating" type="number" min="1" max="5" value="${r.rating}"></div>
      </div>
      <div class="field"><label>Product</label>
        <select id="r-product">${State.products.map(p=>`<option ${r.product===p.name?'selected':''}>${p.name}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Review text</label><textarea id="r-text" rows="3">${r.text}</textarea></div>
      <div class="field"><label><input type="checkbox" id="r-verified" ${r.verified?'checked':''} style="width:auto"> Verified buyer</label></div>
      <div class="modal-actions">
        <button class="btn ghost" onclick="closeModal()">Cancel</button>
        <button class="btn" onclick="AdminPage.saveReview('${id||''}')">Save review</button>
      </div>`);
  },
  saveReview(id){
    const data={
      name:document.getElementById('r-name').value.trim(),
      product:document.getElementById('r-product').value,
      rating:+document.getElementById('r-rating').value,
      text:document.getElementById('r-text').value.trim(),
      verified:document.getElementById('r-verified').checked
    };
    if(!data.name||!data.text){ toast('Name and review text are required'); return; }
    if(id){ Object.assign(State.reviews.find(x=>x.id===id),data); toast('Review updated'); }
    else { data.id='r'+Date.now(); State.reviews.push(data); toast('Review added'); }
    closeModal(); this.render();
  },
  deleteReview(id){
    State.reviews=State.reviews.filter(x=>x.id!==id);
    this.render(); toast('Review deleted');
  },

  articlesTab(){
    return `
    <div class="admin-bar">
      <div><h1>Articles</h1><p class="muted" style="margin:0">${State.articles.length} published · featured ones show on the homepage</p></div>
      <button class="btn" onclick="AdminPage.editArticle()">+ Add article</button>
    </div>
    <table class="adtable">
      <thead><tr><th>Title</th><th>Tag</th><th>Read</th><th>Featured</th><th>Actions</th></tr></thead>
      <tbody>${State.articles.map(a=>`<tr>
        <td style="max-width:360px"><b>${a.title}</b></td>
        <td>${a.tag}</td><td>${a.read}</td>
        <td>${a.featured?'<span class="tag-pill pink">Featured</span>':'<span class="tag-pill" style="background:var(--cream-2);color:var(--ink-soft)">No</span>'}</td>
        <td>
          <button class="ic-btn" onclick="AdminPage.editArticle('${a.id}')">${icon('pencil')}</button>
          <button class="ic-btn del" onclick="AdminPage.deleteArticle('${a.id}')">${icon('trash-2')}</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
  },
  editArticle(id){
    const a=id?State.articles.find(x=>x.id===id):{id:'',title:'',tag:'Nutrition',read:'4 min',featured:false,img:'',excerpt:'',body:''};
    openModal(`
      <h3>${id?'Edit':'Add'} article</h3>
      <div class="field"><label>Title</label><input id="a-title" value="${a.title}"></div>
      <div class="field two">
        <div><label>Tag</label><select id="a-tag">${['Nutrition','Behaviour','Wellness','Training'].map(t=>`<option ${a.tag===t?'selected':''}>${t}</option>`).join('')}</select></div>
        <div><label>Read time</label><input id="a-read" value="${a.read}"></div>
      </div>
      <div class="field"><label>Image URL</label><input id="a-img" value="${a.img}" placeholder="https://…"></div>
      <div class="field"><label>Excerpt</label><textarea id="a-excerpt" rows="2">${a.excerpt}</textarea></div>
      <div class="field"><label>Body</label><textarea id="a-body" rows="4">${a.body}</textarea></div>
      <div class="field"><label><input type="checkbox" id="a-featured" ${a.featured?'checked':''} style="width:auto"> Feature on homepage</label></div>
      <div class="modal-actions">
        <button class="btn ghost" onclick="closeModal()">Cancel</button>
        <button class="btn" onclick="AdminPage.saveArticle('${id||''}')">Save article</button>
      </div>`);
  },
  saveArticle(id){
    const data={
      title:document.getElementById('a-title').value.trim(),
      tag:document.getElementById('a-tag').value,
      read:document.getElementById('a-read').value.trim()||'4 min',
      img:document.getElementById('a-img').value.trim()||'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&q=80',
      excerpt:document.getElementById('a-excerpt').value.trim(),
      body:document.getElementById('a-body').value.trim(),
      featured:document.getElementById('a-featured').checked
    };
    if(!data.title){ toast('Title is required'); return; }
    if(id){ Object.assign(State.articles.find(x=>x.id===id),data); toast('Article updated'); }
    else { data.id='a'+Date.now(); State.articles.push(data); toast('Article added'); }
    closeModal(); this.render();
  },
  deleteArticle(id){
    State.articles=State.articles.filter(x=>x.id!==id);
    this.render(); toast('Article deleted');
  }
};
window.AdminPage = AdminPage;

// ---------- MODAL ----------
function openModal(html){ $('#modalBox').innerHTML=html; $('#modalOv').classList.add('open'); paintIcons(); }
function closeModal(){ $('#modalOv').classList.remove('open'); }
$('#modalOv').addEventListener('click',e=>{if(e.target.id==='modalOv')closeModal()});

// ---------- BOOT ----------
Router.resolve();
