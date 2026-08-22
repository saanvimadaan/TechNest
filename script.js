// ===== Homepage-only behavior =====
// Product data now lives in data.js, shared header/cart/wishlist logic in common.js.

const grid = document.getElementById('prodGrid');

function renderProducts(filter){
  if(!grid) return;
  grid.innerHTML = '';
  const list = filter === 'all' ? products : products.filter(p => p.cat === filter);
  list.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'prod-card';
    card.style.animationDelay = (i * 50) + 'ms';
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
      e.preventDefault();
      e.stopPropagation();
      const btn = e.currentTarget;
      const nowWished = toggleWishlist(p.id);
      btn.classList.toggle('active', nowWished);
      showToast(nowWished ? `${p.name} saved to wishlist` : `${p.name} removed from wishlist`);
    });
    card.querySelector('.add-btn').addEventListener('click', () => {
      addToCart(p.id, 1);
      showToast(`${p.name} added to cart`);
      const cartBtn = document.getElementById('navCart');
      if(cartBtn){
        cartBtn.classList.remove('bump');
        void cartBtn.offsetWidth;
        cartBtn.classList.add('bump');
      }
    });
    grid.appendChild(card);
  });
}
renderProducts('all');

// ---------- Hero product ticker ----------
function renderHeroMarquee(){
  const track = document.getElementById('heroMarqueeTrack');
  if(!track) return;
  const itemHTML = products.map(p => {
    let delta;
    if(p.old){
      const pct = Math.round(100 - (p.price/p.old)*100);
      delta = `<span class="mm-delta down">−${pct}%</span>`;
    } else if(p.badge === 'New'){
      delta = `<span class="mm-delta new">NEW</span>`;
    } else {
      delta = `<span class="mm-delta flat">★ ${p.rating}</span>`;
    }
    return `
      <a class="hero-marquee-item" href="product.html?id=${p.id}">
        <img src="${p.photo}" alt="${p.name}">
        <div class="mm-info">
          <span class="mm-name">${p.name}</span>
          <span class="mm-cat">${p.catLabel}</span>
        </div>
        <span class="mm-price">₹${formatINR(p.price)}</span>
        ${delta}
      </a>
    `;
  }).join('');
  // duplicate the set so the loop scrolls seamlessly
  track.innerHTML = itemHTML + itemHTML;
}
renderHeroMarquee();

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderProducts(tab.dataset.filter);
  });
});

// Countdown timer — deal ends 2d 14h 36m 9s from page load
const SECOND = 1000, MINUTE = 60 * SECOND, HOUR = 60 * MINUTE, DAY = 24 * HOUR;
const dealEnd = Date.now() + 2 * DAY + 14 * HOUR + 36 * MINUTE + 9 * SECOND;
const pad = n => n.toString().padStart(2, '0');

function tickTimer(){
  const diff = Math.max(0, dealEnd - Date.now());
  document.getElementById('t-days').textContent = pad(Math.floor(diff / DAY));
  document.getElementById('t-hours').textContent = pad(Math.floor(diff / HOUR) % 24);
  document.getElementById('t-mins').textContent = pad(Math.floor(diff / MINUTE) % 60);
  document.getElementById('t-secs').textContent = pad(Math.floor(diff / SECOND) % 60);
}
tickTimer();
setInterval(tickTimer, SECOND);

// Newsletter form
const newsForm = document.getElementById('newsForm');
if(newsForm){
  newsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    const note = document.getElementById('formNote');
    note.textContent = `You're in! Confirmation sent to ${input.value}`;
    note.classList.add('show');
    input.value = '';
  });
}
