// ===== Shop page: filter, sort, search, wishlist =====

const shopGrid = document.getElementById('shopGrid');
const shopEmpty = document.getElementById('shopEmpty');
const resultCount = document.getElementById('resultCount');
const sortSelect = document.getElementById('sortSelect');
const searchInputs = [document.getElementById('shopSearchInput'), document.getElementById('mobileSearchInput')].filter(Boolean);

let activeFilter = 'all';
let activeSearch = '';

function productCardHTML(p, inWishlist = false){
  return `
    <a href="product.html?id=${p.id}" class="prod-media photo">
      <img src="${p.photo}" alt="${p.name}">
      ${p.badge ? `<span class="badge ${p.badgeType === 'blue' ? 'blue' : ''}">${p.badge}</span>` : ''}
      <button class="wish-btn${isWished(p.id) ? ' active' : ''}" aria-label="${inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}" data-id="${p.id}">
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
}

function wireCard(card, p, isWishlistContainer = false){
  const wishBtn = card.querySelector('.wish-btn');
  if(wishBtn){
    wishBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const nowWished = toggleWishlist(p.id);
      showToast(nowWished ? `${p.name} saved to wishlist` : `${p.name} removed from wishlist`);
      renderWishlist();
      // update heart state on all cards with this product id
      document.querySelectorAll(`.wish-btn[data-id="${p.id}"]`).forEach(b => {
        b.classList.toggle('active', nowWished);
      });
    });
  }

  const addBtn = card.querySelector('.add-btn');
  if(addBtn){
    addBtn.addEventListener('click', () => {
      // Visible Promise demonstration: pending -> fulfilled/rejected.
      const originalHTML = addBtn.innerHTML;
      addBtn.disabled = true;
      addBtn.setAttribute('aria-label', `Adding ${p.name} to cart`);
      addBtn.innerHTML = '<span style="font-size:10px;font-weight:700;white-space:nowrap;">Wait...</span>';
      showToast(`PROMISE PENDING: Adding ${p.name}...`);

      addToCartWithPromise(p.id, 1)
        .then(() => {
          showToast(`PROMISE FULFILLED: ${p.name} added to cart`);
          addBtn.innerHTML = '<span style="font-size:10px;font-weight:700;white-space:nowrap;">Added!</span>';
          addBtn.setAttribute('aria-label', `${p.name} added to cart`);
          const cartBtn = document.getElementById('navCart');
          if(cartBtn){ cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump'); }
        })
        .catch((error) => {
          showToast('PROMISE REJECTED: Unable to add product');
          console.error('Promise cart error:', error);
        })
        .finally(() => {
          setTimeout(() => {
            addBtn.disabled = false;
            addBtn.innerHTML = originalHTML;
            addBtn.setAttribute('aria-label', 'Add to cart');
          }, 900);
        });
    });
  }
}

function sortList(list){
  const list2 = [...list];
  if(sortSelect.value === 'price-low') list2.sort((a,b) => a.price - b.price);
  else if(sortSelect.value === 'price-high') list2.sort((a,b) => b.price - a.price);
  else if(sortSelect.value === 'rating') list2.sort((a,b) => b.rating - a.rating);
  else list2.sort((a,b) => b.reviews - a.reviews);
  return list2;
}

function renderShop(){
  let list = activeFilter === 'all' ? products : products.filter(p => p.cat === activeFilter);
  if(activeSearch.trim()){
    const q = activeSearch.trim().toLowerCase();
    list = list.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.catLabel.toLowerCase().includes(q) ||
      (p.tagline && p.tagline.toLowerCase().includes(q)) ||
      (p.desc && p.desc.toLowerCase().includes(q))
    );
  }
  list = sortList(list);

  resultCount.textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
  shopGrid.style.display = list.length ? '' : 'none';
  shopEmpty.style.display = list.length ? 'none' : '';

  shopGrid.innerHTML = '';
  list.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'prod-card';
    card.style.animationDelay = (i * 40) + 'ms';
    card.innerHTML = productCardHTML(p, false);
    wireCard(card, p, false);
    shopGrid.appendChild(card);
  });
}

function renderWishlist(){
  const wishGrid = document.getElementById('wishGrid');
  const wishEmpty = document.getElementById('wishEmpty');
  if(!wishGrid || !wishEmpty) return;

  const ids = getWishlist();
  const list = ids.map(id => getProductById(id)).filter(Boolean);

  wishGrid.style.display = list.length ? '' : 'none';
  wishEmpty.style.display = list.length ? 'none' : '';

  wishGrid.innerHTML = '';
  list.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'prod-card';
    card.style.animationDelay = (i * 40) + 'ms';
    card.innerHTML = productCardHTML(p, true);
    wireCard(card, p, true);
    wishGrid.appendChild(card);
  });
}

function setFilter(cat){
  activeFilter = cat;
  document.querySelectorAll('#shopTabs .tab').forEach(t => {
    t.classList.toggle('active', t.dataset.filter === cat);
  });
  if(window.history.replaceState){
    const url = new URL(window.location);
    if(cat === 'all') url.searchParams.delete('cat');
    else url.searchParams.set('cat', cat);
    window.history.replaceState({}, '', url);
  }
  renderShop();
}

document.querySelectorAll('#shopTabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    setFilter(tab.dataset.filter);
  });
});

if(sortSelect){
  sortSelect.addEventListener('change', renderShop);
}

searchInputs.forEach(input => {
  input.addEventListener('input', (e) => {
    activeSearch = e.target.value;
    searchInputs.forEach(i => { if(i !== e.target) i.value = e.target.value; });
    renderShop();
  });
});

const clearBtn = document.getElementById('clearFiltersBtn');
if(clearBtn){
  clearBtn.addEventListener('click', () => {
    activeSearch = '';
    searchInputs.forEach(i => i.value = '');
    setFilter('all');
  });
}

// Preselect category from ?cat= query param
const params = new URLSearchParams(window.location.search);
const catParam = params.get('cat');
if(catParam){
  const validCat = ['phones', 'computing', 'audio', 'wearables', 'home', 'gaming'].includes(catParam);
  if(validCat){
    activeFilter = catParam;
    document.querySelectorAll('#shopTabs .tab').forEach(t => {
      t.classList.toggle('active', t.dataset.filter === catParam);
    });
  }
}

// Preselect search from ?search= query param
const searchParam = params.get('search');
if(searchParam){
  activeSearch = searchParam;
  searchInputs.forEach(i => { i.value = searchParam; });
}

renderShop();
renderWishlist();

// Check if loaded with #wishlist hash
if(window.location.hash === '#wishlist'){
  setTimeout(() => {
    const wishSection = document.getElementById('wishlist') || document.getElementById('wishGrid');
    if(wishSection){
      wishSection.scrollIntoView({ behavior:'smooth', block:'start' });
    }
  }, 150);
}

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

