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

// PROMISE DEMO: the cart operation visibly stays pending before it completes.
function addToCartWithPromise(id, qty = 1){
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        addToCart(id, qty);
        resolve(true);
      } catch (error) {
        reject(error);
      }
    }, 1800);
  });
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

// ---------- Helpers ----------
function escapeHTML(str){
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
}

// Small synchronous SHA-256 (pure JS, works on http, https and file://)
function sha256(message){
  const rotr = (v, n) => (v >>> n) | (v << (32 - n));
  const bytes = Array.from(new TextEncoder().encode(message));
  // Round constants / initial hash derived from primes (standard SHA-256 definition)
  const primes = [];
  for(let n = 2; primes.length < 64; n++){
    if(primes.every(p => n % p !== 0)) primes.push(n);
  }
  const frac = x => Math.floor((x - Math.floor(x)) * 4294967296);
  const K = primes.map(p => frac(Math.cbrt(p)));
  let H = primes.slice(0, 8).map(p => frac(Math.sqrt(p)));

  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while(bytes.length % 64 !== 56) bytes.push(0);
  const hi = Math.floor(bitLen / 4294967296), lo = bitLen >>> 0;
  for(let i = 3; i >= 0; i--) bytes.push((hi >>> (i * 8)) & 255);
  for(let i = 3; i >= 0; i--) bytes.push((lo >>> (i * 8)) & 255);

  for(let off = 0; off < bytes.length; off += 64){
    const w = new Array(64);
    for(let i = 0; i < 16; i++){
      w[i] = (bytes[off+i*4] << 24) | (bytes[off+i*4+1] << 16) | (bytes[off+i*4+2] << 8) | bytes[off+i*4+3];
    }
    for(let i = 16; i < 64; i++){
      const s0 = rotr(w[i-15], 7) ^ rotr(w[i-15], 18) ^ (w[i-15] >>> 3);
      const s1 = rotr(w[i-2], 17) ^ rotr(w[i-2], 19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for(let i = 0; i < 64; i++){
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H = [H[0]+a|0, H[1]+b|0, H[2]+c|0, H[3]+d|0, H[4]+e|0, H[5]+f|0, H[6]+g|0, H[7]+h|0];
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
function makeSalt(){
  try{
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }catch(e){
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }
}
// Salted + repeated hashing so the real password is never stored.
// NOTE: this is client-side only. A real production site must do this on a server.
function hashPassword(password, salt){
  let h = sha256(salt + ':' + password);
  for(let i = 0; i < 2000; i++) h = sha256(h + salt);
  return h;
}

// ---------- Auth ----------
const AUTH_KEY = 'technest_auth_user';
const USERS_KEY = 'technest_registered_users';
const ORDERS_KEY = 'technest_orders';
const ADDR_KEY_PREFIX = 'technest_saved_address_';

function getRegisteredUsers(){
  try{ return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
  catch(e){ return []; }
}
function saveRegisteredUsers(users){
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
// Session lives in localStorage when "Remember me" is on, otherwise in sessionStorage
function getAuthUser(){
  try{
    const raw = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function setAuthUser(user, remember = true){
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
  (remember ? localStorage : sessionStorage).setItem(AUTH_KEY, JSON.stringify(user));
  syncAuthUI();
}
function logoutUser(){
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
  syncAuthUI();
  showToast('Logged out successfully');
}
function sessionFromUser(u){
  return { id: u.id, name: u.name, email: u.email, joinedAt: u.joinedAt };
}
function registerUser(name, email, password, remember = true){
  name = (name || '').trim();
  const normalizedEmail = (email || '').trim().toLowerCase();
  if(!name) return { success: false, message: 'Please enter your name.' };
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return { success: false, message: 'Please enter a valid email address.' };
  if(!password || password.length < 6) return { success: false, message: 'Password must be at least 6 characters.' };

  const users = getRegisteredUsers();
  if(users.find(u => u.email.toLowerCase() === normalizedEmail)){
    return { success: false, message: 'An account with this email already exists. Try logging in.' };
  }
  const salt = makeSalt();
  const newUser = {
    id: 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name,
    email: normalizedEmail,
    salt,
    passHash: hashPassword(password, salt),
    joinedAt: new Date().toLocaleDateString('en-US', { month:'short', year:'numeric' })
  };
  users.push(newUser);
  saveRegisteredUsers(users);
  const session = sessionFromUser(newUser);
  setAuthUser(session, remember);
  return { success: true, user: session };
}
function authenticateUser(email, password, remember = true){
  const normalizedEmail = (email || '').trim().toLowerCase();
  const genericFail = { success: false, message: 'Invalid email or password.' };
  const users = getRegisteredUsers();
  const idx = users.findIndex(u => u.email.toLowerCase() === normalizedEmail);
  if(idx === -1 || !password) return genericFail;
  const user = users[idx];

  let ok = false;
  if(user.passHash && user.salt){
    ok = hashPassword(password, user.salt) === user.passHash;
  } else if(typeof user.password === 'string' && user.provider == null){
    // Legacy account created by the old version (plain-text password): verify, then upgrade it
    ok = user.password === password;
    if(ok){
      user.salt = makeSalt();
      user.passHash = hashPassword(password, user.salt);
      delete user.password;
      delete user.orders;
      users[idx] = user;
      saveRegisteredUsers(users);
    }
  }
  if(!ok) return genericFail;

  const session = sessionFromUser(user);
  setAuthUser(session, remember);
  return { success: true, user: session };
}
// Demo social sign-in: creates (or reuses) a real account record so orders/address attach to it
function loginWithProvider(provider){
  const name = provider === 'google' ? 'Google User' : 'Apple User';
  const email = provider + '.user@example.com';
  const users = getRegisteredUsers();
  let user = users.find(u => u.email === email);
  if(!user){
    user = {
      id: provider + '_user', name, email, provider,
      joinedAt: new Date().toLocaleDateString('en-US', { month:'short', year:'numeric' })
    };
    users.push(user);
    saveRegisteredUsers(users);
  }
  const session = sessionFromUser(user);
  setAuthUser(session, true);
  return { success: true, user: session };
}

// ---------- Orders & saved address (always scoped to the logged-in account) ----------
function getAllOrders(){
  try{ return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; }
  catch(e){ return []; }
}
function saveOrder(order){
  const orders = getAllOrders();
  orders.unshift(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}
function getUserOrders(){
  const user = getAuthUser();
  if(!user) return [];
  return getAllOrders().filter(o => o.userId === user.id);
}
function getSavedAddress(){
  const user = getAuthUser();
  if(!user) return null;
  try{ return JSON.parse(localStorage.getItem(ADDR_KEY_PREFIX + user.id)) || null; }
  catch(e){ return null; }
}
function saveAddress(addr){
  const user = getAuthUser();
  if(user) localStorage.setItem(ADDR_KEY_PREFIX + user.id, JSON.stringify(addr));
}
function clearSavedAddress(){
  const user = getAuthUser();
  if(user) localStorage.removeItem(ADDR_KEY_PREFIX + user.id);
}
// Demo order tracking: status moves forward with time since the order was placed
function getOrderStatus(order){
  const t = order && order.placedAt ? Date.parse(order.placedAt) : NaN;
  const steps = ['Order confirmed', 'Shipped', 'Out for delivery', 'Delivered'];
  if(isNaN(t)) return { label: steps[0], step: 1, steps };
  const days = (Date.now() - t) / 86400000;
  const step = days >= 3 ? 4 : days >= 2 ? 3 : days >= 1 ? 2 : 1;
  return { label: steps[step - 1], step, steps };
}
function normalizeOrderId(id){
  return String(id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
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
            <span>No results for "${escapeHTML(q)}"</span>
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
          View all results for "${escapeHTML(q)}" →
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

window.addEventListener('storage', () => { syncBadges(); });

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
