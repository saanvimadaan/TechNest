// ===== TechNest shared header + storage layer =====
// Runs on every page. Depends on data.js being loaded first for cart totals.

const CART_KEY = 'technest_cart';
const WISH_KEY = 'technest_wishlist';
const THEME_KEY = 'technest_theme';

// ---------- Cart ----------
function getCart(){
  try{ return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch(e){ return []; }
}
function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  syncBadges();
}
function addToCart(id, qty = 1){
  const cart = getCart();
  const line = cart.find(l => l.id === id);
  if(line) line.qty += qty;
  else cart.push({ id, qty });
  saveCart(cart);
}
function setCartQty(id, qty){
  let cart = getCart();
  if(qty <= 0){ cart = cart.filter(l => l.id !== id); }
  else { const line = cart.find(l => l.id === id); if(line) line.qty = qty; }
  saveCart(cart);
}
function removeFromCart(id){
  saveCart(getCart().filter(l => l.id !== id));
}
function cartCount(){
  return getCart().reduce((sum, l) => sum + l.qty, 0);
}
function cartLines(){
  return getCart()
    .map(l => ({ ...l, product: typeof getProductById === 'function' ? getProductById(l.id) : null }))
    .filter(l => l.product);
}
function cartSubtotal(){
  return cartLines().reduce((sum, l) => sum + l.product.price * l.qty, 0);
}

// ---------- Wishlist ----------
function getWishlist(){
  try{ return JSON.parse(localStorage.getItem(WISH_KEY)) || []; }
  catch(e){ return []; }
}
function isWished(id){ return getWishlist().includes(id); }
function toggleWishlist(id){
  let list = getWishlist();
  const wished = list.includes(id);
  list = wished ? list.filter(x => x !== id) : [...list, id];
  localStorage.setItem(WISH_KEY, JSON.stringify(list));
  syncBadges();
  return !wished;
}

// ---------- Auth ----------
const AUTH_KEY = 'technest_auth_user';
const USERS_KEY = 'technest_registered_users';

function getRegisteredUsers(){
  try{ return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
  catch(e){ return []; }
}
function saveRegisteredUsers(users){
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function getAuthUser(){
  try{ return JSON.parse(localStorage.getItem(AUTH_KEY)) || null; }
  catch(e){ return null; }
}
function setAuthUser(user){
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  syncAuthUI();
}
function logoutUser(){
  localStorage.removeItem(AUTH_KEY);
  syncAuthUI();
  showToast('Logged out successfully');
}
function registerUser(name, email, password){
  const users = getRegisteredUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
  if(existing){
    return { success: false, message: 'An account with this email already exists.' };
  }
  const newUser = {
    id: 'user_' + Date.now(),
    name: name.trim(),
    email: normalizedEmail,
    password: password,
    joinedAt: new Date().toLocaleDateString('en-US', { month:'short', year:'numeric' }),
    orders: []
  };
  users.push(newUser);
  saveRegisteredUsers(users);
  setAuthUser({ id: newUser.id, name: newUser.name, email: newUser.email, joinedAt: newUser.joinedAt });
  return { success: true, user: newUser };
}
function authenticateUser(email, password){
  const users = getRegisteredUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find(u => u.email.toLowerCase() === normalizedEmail && u.password === password);
  if(user){
    const session = { id: user.id, name: user.name, email: user.email, joinedAt: user.joinedAt };
    setAuthUser(session);
    return { success: true, user: session };
  }
  // Demo fallback for instant ease-of-use if user types any demo email
  if(password && password.length >= 6){
    const demoName = normalizedEmail.split('@')[0];
    const capitalized = demoName.charAt(0).toUpperCase() + demoName.slice(1);
    const demoSession = { id: 'user_demo', name: capitalized || 'Technest User', email: normalizedEmail, joinedAt: 'Aug 2026' };
    setAuthUser(demoSession);
    return { success: true, user: demoSession };
  }
  return { success: false, message: 'Invalid email or password (min 6 chars).' };
}

function syncAuthUI(){
  const user = getAuthUser();
  document.querySelectorAll('a[href="login.html"], a[href="login.html"].icon-btn').forEach(btn => {
    if(user){
      btn.title = `Logged in as ${user.name}`;
      btn.classList.add('logged-in');
      const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
      btn.innerHTML = `<span class="user-avatar-badge">${initial}</span>`;
    } else {
      btn.title = 'Account';
      btn.classList.remove('logged-in');
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>`;
    }
  });
}

// ---------- Badge sync (cart + wishlist counts in the header) ----------
function syncBadges(){
  document.querySelectorAll('#cartCount, .js-cart-count').forEach(el => { el.textContent = cartCount(); });
  document.querySelectorAll('#wishCount, .js-wish-count').forEach(el => { el.textContent = getWishlist().length; });
  syncAuthUI();
}

// ---------- Toast ----------
let toastTimer;
function showToast(msg){
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if(!toast || !toastMsg) return;
  toastMsg.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ---------- Theme (persisted across pages) ----------
function applyStoredTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  if(saved === 'light') document.body.classList.add('light-mode');
}
applyStoredTheme();

// ---------- Live Header Search ----------
function setupHeaderSearch(){
  const searchBoxes = document.querySelectorAll('.search-box');
  searchBoxes.forEach(box => {
    const input = box.querySelector('input');
    if(!input) return;

    // Create dropdown container if not present
    let dropdown = box.querySelector('.search-dropdown');
    if(!dropdown){
      dropdown = document.createElement('div');
      dropdown.className = 'search-dropdown';
      box.appendChild(dropdown);
    }

    function renderDropdown(q){
      if(!q || q.length < 1){
        dropdown.innerHTML = '';
        dropdown.classList.remove('open');
        return;
      }
      const matches = typeof products !== 'undefined' ? products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.catLabel.toLowerCase().includes(q) ||
        (p.tagline && p.tagline.toLowerCase().includes(q))
      ).slice(0, 5) : [];

      if(!matches.length){
        dropdown.innerHTML = `
          <div class="search-drop-empty">
            <span>No results for "${q}"</span>
            <a href="shop.html?search=${encodeURIComponent(q)}" class="search-drop-link">Browse full shop →</a>
          </div>
        `;
        dropdown.classList.add('open');
        return;
      }

      dropdown.innerHTML = `
        <div class="search-drop-header">Found ${matches.length} matches</div>
        ${matches.map(p => `
          <a href="product.html?id=${p.id}" class="search-drop-item">
            <div class="search-drop-thumb"><img src="${p.photo}" alt="${p.name}"></div>
            <div class="search-drop-info">
              <span class="search-drop-name">${p.name}</span>
              <span class="search-drop-cat">${p.catLabel}</span>
            </div>
            <span class="search-drop-price">₹${formatINR(p.price)}</span>
          </a>
        `).join('')}
        <a href="shop.html?search=${encodeURIComponent(q)}" class="search-drop-all">
          View all results for "${q}" →
        </a>
      `;
      dropdown.classList.add('open');
    }

    input.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      renderDropdown(q);
    });

    input.addEventListener('focus', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if(q) renderDropdown(q);
    });

    input.addEventListener('keydown', (e) => {
      if(e.key === 'Enter'){
        e.preventDefault();
        const q = input.value.trim();
        if(q){
          window.location.href = `shop.html?search=${encodeURIComponent(q)}`;
        } else {
          window.location.href = `shop.html`;
        }
      } else if(e.key === 'Escape'){
        dropdown.classList.remove('open');
      }
    });

    document.addEventListener('click', (e) => {
      if(!box.contains(e.target)){
        dropdown.classList.remove('open');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  syncBadges();
  setupHeaderSearch();

  const themeToggle = document.getElementById('themeToggle');
  if(themeToggle){
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      localStorage.setItem(THEME_KEY, document.body.classList.contains('light-mode') ? 'light' : 'dark');
    });
  }

  // Wishlist icon in the header (navigates or scrolls to wishlist)
  document.querySelectorAll('#navWish, #navWish2, .js-nav-wish').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const wishSection = document.getElementById('wishlist') || document.getElementById('wishGrid');
      if(wishSection){
        wishSection.scrollIntoView({ behavior:'smooth', block:'start' });
      } else {
        window.location.href = 'shop.html#wishlist';
      }
    });
  });

  // ---------- Mobile menu ----------
  const burgerBtn = document.getElementById('burgerBtn');
  const navLinks = document.getElementById('navLinks');
  if(burgerBtn && navLinks){
    function closeMenu(){
      navLinks.classList.remove('open');
      burgerBtn.classList.remove('active');
      burgerBtn.setAttribute('aria-expanded', 'false');
    }
    function toggleMenu(){
      const isOpen = navLinks.classList.toggle('open');
      burgerBtn.classList.toggle('active', isOpen);
      burgerBtn.setAttribute('aria-expanded', String(isOpen));
    }
    burgerBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
    navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('click', (e) => {
      if(navLinks.classList.contains('open') && !navLinks.contains(e.target) && e.target !== burgerBtn){
        closeMenu();
      }
    });
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if(window.innerWidth > 860) closeMenu(); });
  }

  // ---------- Scroll-reveal ----------
  const revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && revealEls.length){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in-view'));
  }
});
