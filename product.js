// ===== Product detail page =====

const params = new URLSearchParams(window.location.search);
const requestedId = params.get('id');
const product = getProductById(requestedId) || products[0];

document.title = `${product.name} — TechNest`;

const breadcrumb = document.getElementById('breadcrumb');
if(breadcrumb){
  breadcrumb.innerHTML = `<a href="index.html">Home</a><span>/</span><a href="shop.html">Shop</a><span>/</span><a href="shop.html?cat=${product.cat}">${product.catLabel}</a><span>/</span><span>${product.name}</span>`;
}

const photoList = (product.photos && product.photos.length) ? product.photos : [product.photo];

const pdGrid = document.getElementById('pdGrid');
pdGrid.innerHTML = `
  <div class="pd-media reveal">
    <div class="photo main-photo-frame"><img id="pdMainImg" src="${photoList[0]}" alt="${product.name}"></div>
    <div class="pd-thumbs" id="pdThumbs">
      ${photoList.map((src, i) => `
        <button type="button" class="pd-thumb${i === 0 ? ' active' : ''}" data-src="${src}" aria-label="View picture ${i+1}">
          <div class="photo"><img src="${src}" alt="${product.name} view ${i+1}"></div>
        </button>
      `).join('')}
    </div>
  </div>

  <div class="pd-info reveal">
    <a href="shop.html?cat=${product.cat}" class="pd-cat">${product.catLabel}</a>
    <h1>${product.name}</h1>
    <div class="pd-rating"><span class="stars">${stars(product.rating)}</span> ${product.rating} · ${product.reviews} reviews</div>
    <p class="pd-tagline">${product.tagline}</p>

    <div class="pd-price-row">
      <span class="pd-price">₹${formatINR(product.price)}</span>
      ${product.old ? `<span class="pd-price-old">₹${formatINR(product.old)}</span>` : ''}
    </div>
    ${product.old ? `<div class="pd-save">You save ₹${formatINR(product.old - product.price)} (${Math.round(100 - (product.price/product.old)*100)}%)</div>` : '<div style="margin-bottom:24px;"></div>'}
    <div class="pd-stock">${product.stock ? 'In stock, ships in 2–4 days' : 'Out of stock'}</div>

    <div class="pd-actions">
      <div class="qty-control">
        <button type="button" id="qtyMinus" aria-label="Decrease quantity">−</button>
        <span class="qty-val" id="qtyVal">1</span>
        <button type="button" id="qtyPlus" aria-label="Increase quantity">+</button>
      </div>
      <button class="btn btn-primary" id="pdAddBtn">
        Add to cart
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <button class="icon-btn wish-btn${isWished(product.id) ? ' active' : ''}" id="pdWishBtn" aria-label="Save to wishlist">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>
      </button>
    </div>

    <div class="pd-trust">
      <div class="trust-item"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg>Free shipping over ₹4,999</div>
      <div class="trust-item"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg>2-year warranty</div>
      <div class="trust-item"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg>30-day returns</div>
    </div>
  </div>
`;

// Thumbnail swap
document.querySelectorAll('.pd-thumb').forEach(thumb => {
  thumb.addEventListener('click', () => {
    document.querySelectorAll('.pd-thumb').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
    const mainImg = document.getElementById('pdMainImg');
    if(mainImg){
      mainImg.src = thumb.dataset.src;
    }
  });
});

// Wishlist button state
const pdWishBtn = document.getElementById('pdWishBtn');
function refreshWishBtn(){
  if(pdWishBtn) pdWishBtn.classList.toggle('active', isWished(product.id));
}
refreshWishBtn();
if(pdWishBtn){
  pdWishBtn.addEventListener('click', () => {
    const nowWished = toggleWishlist(product.id);
    refreshWishBtn();
    showToast(nowWished ? `${product.name} saved to wishlist` : `${product.name} removed from wishlist`);
  });
}

// Quantity stepper
let qty = 1;
const qtyVal = document.getElementById('qtyVal');
document.getElementById('qtyMinus').addEventListener('click', () => { qty = Math.max(1, qty - 1); qtyVal.textContent = qty; });
document.getElementById('qtyPlus').addEventListener('click', () => { qty = Math.min(10, qty + 1); qtyVal.textContent = qty; });

// Add to cart
document.getElementById('pdAddBtn').addEventListener('click', () => {
  addToCart(product.id, qty);
  showToast(`${qty} × ${product.name} added to cart`);
  const cartBtn = document.getElementById('navCart');
  if(cartBtn){ cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump'); }
});

// Tabs
document.getElementById('pdDesc').textContent = product.desc;
document.getElementById('pdReviews').textContent = `${product.reviews} customers have rated this ${product.rating} out of 5 stars on average. 100% verified customer ratings.`;
const specsTable = document.getElementById('pdSpecs');
specsTable.innerHTML = product.specs.map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');

document.querySelectorAll('.pd-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pd-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.pd-tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// Related products (same category, excluding this one)
const relatedGrid = document.getElementById('relatedGrid');
const related = products.filter(p => p.cat === product.cat && p.id !== product.id).slice(0, 4);
const fallback = related.length ? related : products.filter(p => p.id !== product.id).slice(0, 4);
fallback.forEach((p, i) => {
  const card = document.createElement('div');
  card.className = 'prod-card';
  card.style.animationDelay = (i * 60) + 'ms';
  card.innerHTML = `
    <a href="product.html?id=${p.id}" class="prod-media photo">
      <img src="${p.photo}" alt="${p.name}">
      ${p.badge ? `<span class="badge ${p.badgeType === 'blue' ? 'blue' : ''}">${p.badge}</span>` : ''}
      <button class="wish-btn${isWished(p.id) ? ' active' : ''}" aria-label="Save to wishlist" data-id="${p.id}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>
      </button>
    </a>
    <div class="prod-info">
      <a href="shop.html?cat=${p.cat}" class="prod-cat">${p.catLabel}</a>
      <a href="product.html?id=${p.id}"><h4 class="prod-name">${p.name}</h4></a>
      <div class="prod-rating"><span class="stars">${stars(p.rating)}</span> ${p.rating} (${p.reviews})</div>
      <div class="prod-bottom">
        <div class="price-row">
          <span class="price">₹${formatINR(p.price)}</span>
          ${p.old ? `<span class="price-old">₹${formatINR(p.old)}</span>` : ''}
        </div>
        <button class="add-btn" aria-label="Add to cart" data-id="${p.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    </div>
  `;
  card.querySelector('.wish-btn').addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    const btn = e.currentTarget;
    const nowWished = toggleWishlist(p.id);
    btn.classList.toggle('active', nowWished);
    showToast(nowWished ? `${p.name} saved to wishlist` : `${p.name} removed from wishlist`);
  });
  card.querySelector('.add-btn').addEventListener('click', () => {
    addToCart(p.id, 1);
    showToast(`${p.name} added to cart`);
    const cartBtn = document.getElementById('navCart');
    if(cartBtn){ cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump'); }
  });
  relatedGrid.appendChild(card);
});

// Re-run reveal observer for content injected after common.js's DOMContentLoaded pass
document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));

