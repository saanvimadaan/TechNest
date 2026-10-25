// ===== TechNest Cart & Multi-Step Checkout Flow =====

let currentStep = 1;
let selectedPayment = 'upi';
let selectedAddrType = 'Home';
let selectedBank = 'HDFC';
let selectedUpiApp = 'gpay';
let codCaptcha = '7492';

const FREE_SHIP_THRESHOLD = 4999;
const SHIP_COST = 199;
let promoDiscount = 0;
const VALID_PROMOS = { NEST10: 0.10, WELCOME5: 0.05, TECH15: 0.15 };

// DOM Elements
const cartGrid = document.getElementById('cartGrid');
const cartList = document.getElementById('cartList');
const cartEmpty = document.getElementById('cartEmpty');
const orderPlaced = document.getElementById('orderPlaced');
const checkoutStepper = document.getElementById('checkoutStepper');

const stepBagContainer = document.getElementById('stepBagContainer');
const stepAddressContainer = document.getElementById('stepAddressContainer');
const stepPaymentContainer = document.getElementById('stepPaymentContainer');

const mainCheckoutBtn = document.getElementById('mainCheckoutBtn');
const backStepBtn = document.getElementById('backStepBtn');
const summaryTitle = document.getElementById('summaryTitle');
const summaryItemsList = document.getElementById('summaryItemsList');
const promoRow = document.getElementById('promoRow');

// ---------- Login gate ----------
function requireLogin(){
  if(getAuthUser()) return true;
  showToast('Please log in to continue checkout');
  setTimeout(() => { window.location.href = 'login.html?next=cart.html'; }, 900);
  return false;
}

// ---------- Cart Lines Render ----------
function lineHTML(line){
  const p = line.product;
  return `
    <div class="photo"><img src="${p.photo}" alt="${p.name}"></div>
    <div>
      <div class="cart-line-name">${p.name}</div>
      <div class="cart-line-cat">${p.catLabel}</div>
      <div class="cart-line-price">₹${formatINR(p.price)} <span style="color:var(--text-faint); font-weight:400;">× ${line.qty} = ₹${formatINR(p.price * line.qty)}</span></div>
    </div>
    <div class="cart-line-qty">
      <div class="qty-control">
        <button type="button" class="q-minus" data-id="${p.id}" aria-label="Decrease quantity">−</button>
        <span class="qty-val">${line.qty}</span>
        <button type="button" class="q-plus" data-id="${p.id}" aria-label="Increase quantity">+</button>
      </div>
    </div>
    <button class="cart-line-remove" data-id="${p.id}" aria-label="Remove item">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>
    </button>
  `;
}

function renderCart(){
  const lines = cartLines();
  if(currentStep === 4) return;

  if(!lines.length){
    cartGrid.style.display = 'none';
    if(checkoutStepper) checkoutStepper.style.display = 'none';
    cartEmpty.style.display = '';
    orderPlaced.style.display = 'none';
    return;
  }

  cartGrid.style.display = '';
  if(checkoutStepper) checkoutStepper.style.display = 'flex';
  cartEmpty.style.display = 'none';
  orderPlaced.style.display = 'none';

  cartList.innerHTML = '';
  lines.forEach(line => {
    const el = document.createElement('div');
    el.className = 'cart-line';
    el.innerHTML = lineHTML(line);
    cartList.appendChild(el);
  });

  cartList.querySelectorAll('.q-plus').forEach(btn => btn.addEventListener('click', () => {
    const line = getCart().find(l => l.id === btn.dataset.id);
    setCartQty(btn.dataset.id, (line ? line.qty : 0) + 1);
    renderCart();
  }));
  cartList.querySelectorAll('.q-minus').forEach(btn => btn.addEventListener('click', () => {
    const line = getCart().find(l => l.id === btn.dataset.id);
    setCartQty(btn.dataset.id, (line ? line.qty : 1) - 1);
    renderCart();
  }));
  cartList.querySelectorAll('.cart-line-remove').forEach(btn => btn.addEventListener('click', () => {
    const p = getProductById(btn.dataset.id);
    removeFromCart(btn.dataset.id);
    showToast(p ? `${p.name} removed from cart` : 'Item removed');
    renderCart();
  }));

  updateSummary();
}

function updateSummary(){
  const lines = cartLines();
  const subtotal = cartSubtotal();
  const shipping = subtotal === 0 ? 0 : (subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIP_COST);
  const discountAmt = Math.round(subtotal * promoDiscount);
  const total = subtotal + shipping - discountAmt;

  document.getElementById('sumSubtotal').textContent = `₹${formatINR(subtotal)}`;
  document.getElementById('sumShipping').textContent = shipping === 0 ? 'Free' : `₹${formatINR(shipping)}`;
  const discountRow = document.getElementById('sumDiscountRow');
  if(discountAmt > 0){
    discountRow.style.display = '';
    document.getElementById('sumDiscount').textContent = `−₹${formatINR(discountAmt)}`;
  } else {
    discountRow.style.display = 'none';
  }
  document.getElementById('sumTotal').textContent = `₹${formatINR(Math.max(0, total))}`;

  // Mini summary preview in steps 2 & 3
  if(currentStep > 1 && lines.length){
    summaryItemsList.style.display = 'block';
    summaryItemsList.innerHTML = `
      <div style="font-size:11.5px; font-family:'IBM Plex Mono', monospace; text-transform:uppercase; color:var(--text-faint); margin-bottom:8px;">
        Items in order (${lines.reduce((s, l) => s + l.qty, 0)})
      </div>
      <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:6px;">
        ${lines.map(l => `
          <div style="position:relative; flex-shrink:0;">
            <img src="${l.product.photo}" alt="${l.product.name}" style="width:40px; height:40px; border-radius:8px; object-fit:cover; border:1px solid var(--border);">
            <span style="position:absolute; top:-4px; right:-4px; background:var(--violet); color:#fff; font-size:9.5px; font-weight:700; width:16px; height:16px; border-radius:50%; display:flex; align-items:center; justify-content:center;">${l.qty}</span>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    summaryItemsList.style.display = 'none';
  }

  // Update Main Action Button text
  if(currentStep === 1){
    mainCheckoutBtn.textContent = getAuthUser() ? 'Proceed to Address →' : 'Log in to Checkout →';
    backStepBtn.style.display = 'none';
    summaryTitle.textContent = 'Order summary';
  } else if(currentStep === 2){
    mainCheckoutBtn.textContent = 'Continue to Payment →';
    backStepBtn.style.display = 'block';
    backStepBtn.textContent = '← Back to Bag';
    summaryTitle.textContent = 'Review & summary';
  } else if(currentStep === 3){
    const formattedTotal = formatINR(Math.max(0, total));
    mainCheckoutBtn.textContent = `Place Order & Pay ₹${formattedTotal}`;
    backStepBtn.style.display = 'block';
    backStepBtn.textContent = '← Change Address';
    summaryTitle.textContent = 'Final payment';
  }
}

// ---------- Stepper & Navigation ----------
function goToStep(step){
  const lines = cartLines();
  if(!lines.length && step < 4){
    showToast('Your cart is empty');
    return;
  }

  if(step === 2 && currentStep === 1){
    // Move to Address
  } else if(step === 3){
    // Validate Address first
    const address = getAddressData();
    if(!address.fullName || !address.phone || !address.street || !address.city || !address.state || !address.pin){
      showToast('Please fill in all required delivery address fields');
      return;
    }
    if(address.phone.replace(/\D/g, '').length !== 10){
      showToast('Please enter a valid 10-digit mobile number');
      return;
    }
    if(address.pin.replace(/\D/g, '').length !== 6){
      showToast('Please enter a valid 6-digit PIN code');
      return;
    }
    // Update recap strip in payment step
    const addrSummary = document.getElementById('paymentAddrSummary');
    if(addrSummary){
      addrSummary.textContent = `${address.fullName}, ${address.city} (${address.pin})`;
    }
    if(document.getElementById('saveAddrCheck').checked){
      saveAddress(address);
    }
  }

  currentStep = step;

  // Update step indicators
  for(let i = 1; i <= 4; i++){
    const indicator = document.getElementById(`stepIndicator${i}`);
    if(!indicator) continue;
    indicator.classList.remove('active', 'done');
    if(i < currentStep) indicator.classList.add('done');
    else if(i === currentStep) indicator.classList.add('active');
  }

  // Toggle Step Containers
  stepBagContainer.style.display = currentStep === 1 ? '' : 'none';
  stepAddressContainer.style.display = currentStep === 2 ? '' : 'none';
  stepPaymentContainer.style.display = currentStep === 3 ? '' : 'none';

  if(currentStep <= 3){
    window.scrollTo({ top: 120, behavior: 'smooth' });
  }

  updateSummary();
}

// ---------- Address Handling ----------
function getAddressData(){
  return {
    fullName: document.getElementById('addrFullName').value.trim(),
    phone: document.getElementById('addrPhone').value.trim(),
    street: document.getElementById('addrStreet').value.trim(),
    landmark: document.getElementById('addrLandmark').value.trim(),
    pin: document.getElementById('addrPin').value.trim(),
    city: document.getElementById('addrCity').value.trim(),
    state: document.getElementById('addrState').value,
    type: selectedAddrType || 'Home'
  };
}

function initAddressFields(){
  // Auto-fill from saved address or auth user
  const saved = getSavedAddress();
  const authUser = typeof getAuthUser === 'function' ? getAuthUser() : null;

  const fullNameInput = document.getElementById('addrFullName');
  const phoneInput = document.getElementById('addrPhone');
  const streetInput = document.getElementById('addrStreet');
  const landmarkInput = document.getElementById('addrLandmark');
  const pinInput = document.getElementById('addrPin');
  const cityInput = document.getElementById('addrCity');
  const stateInput = document.getElementById('addrState');

  if(saved){
    if(fullNameInput) fullNameInput.value = saved.fullName || '';
    if(phoneInput) phoneInput.value = saved.phone || '';
    if(streetInput) streetInput.value = saved.street || '';
    if(landmarkInput) landmarkInput.value = saved.landmark || '';
    if(pinInput) pinInput.value = saved.pin || '';
    if(cityInput) cityInput.value = saved.city || '';
    if(stateInput) stateInput.value = saved.state || '';
    if(saved.type) selectAddrType(saved.type);
  } else if(authUser){
    if(fullNameInput) fullNameInput.value = authUser.name || '';
  }

  // Address Type Pills
  document.querySelectorAll('.addr-type-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      selectAddrType(pill.dataset.type);
    });
  });
}

function selectAddrType(type){
  selectedAddrType = type;
  document.querySelectorAll('.addr-type-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.type === type);
  });
}

// ---------- Payment Methods ----------
function selectPaymentMethod(method){
  selectedPayment = method;
  document.querySelectorAll('.payment-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.method === method);
  });
}

function generateNewCaptcha(){
  codCaptcha = Math.floor(1000 + Math.random() * 9000).toString();
  const display = document.getElementById('codCaptchaDisplay');
  if(display) display.textContent = codCaptcha;
  const input = document.getElementById('codCaptchaInput');
  if(input) input.value = '';
}

function setupPaymentHandlers(){
  // UPI Apps Switcher
  document.querySelectorAll('.upi-app-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.upi-app-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedUpiApp = btn.dataset.app;
      const upiIdForm = document.getElementById('upiIdForm');
      const upiQrForm = document.getElementById('upiQrForm');
      if(selectedUpiApp === 'qr'){
        if(upiIdForm) upiIdForm.style.display = 'none';
        if(upiQrForm) upiQrForm.style.display = 'block';
      } else {
        if(upiIdForm) upiIdForm.style.display = 'block';
        if(upiQrForm) upiQrForm.style.display = 'none';
        const upiInput = document.getElementById('upiIdInput');
        if(upiInput){
          if(selectedUpiApp === 'gpay') upiInput.value = 'user@okaxis';
          else if(selectedUpiApp === 'phonepe') upiInput.value = 'user@ybl';
          else if(selectedUpiApp === 'paytm') upiInput.value = '9876543210@paytm';
        }
      }
    });
  });

  // Verify UPI button
  const verifyBtn = document.getElementById('verifyUpiBtn');
  const verifyBadge = document.getElementById('upiVerifyBadge');
  if(verifyBtn && verifyBadge){
    verifyBtn.addEventListener('click', () => {
      const upiVal = document.getElementById('upiIdInput').value.trim();
      if(!upiVal || !upiVal.includes('@')){
        showToast('Please enter a valid UPI ID (e.g. name@okhdfcbank)');
        return;
      }
      verifyBtn.textContent = 'Verifying...';
      setTimeout(() => {
        verifyBtn.textContent = 'Verified ✓';
        verifyBadge.style.display = 'flex';
        showToast('UPI ID successfully verified');
      }, 500);
    });
  }

  // Card formatting
  const cardNum = document.getElementById('cardNumInput');
  if(cardNum){
    cardNum.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 16);
      let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
      e.target.value = formatted;
    });
  }
  const cardExp = document.getElementById('cardExpInput');
  if(cardExp){
    cardExp.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 4);
      if(val.length >= 2){
        e.target.value = val.substring(0, 2) + '/' + val.substring(2);
      } else {
        e.target.value = val;
      }
    });
  }

  // Bank Pills
  document.querySelectorAll('.bank-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bank-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedBank = btn.dataset.bank;
    });
  });

  // Captcha refresh
  const refreshCaptcha = document.getElementById('refreshCaptchaBtn');
  if(refreshCaptcha){
    refreshCaptcha.addEventListener('click', generateNewCaptcha);
  }
  generateNewCaptcha();
}

// ---------- Order Placement ----------
function processOrderPlacement(){
  if(!requireLogin()) return;
  const user = getAuthUser();
  const lines = cartLines();
  if(!lines.length){
    showToast('Your cart is empty');
    return;
  }

  // Address check
  const addr = getAddressData();
  if(!addr.fullName || !addr.phone || !addr.street || !addr.city || !addr.pin){
    goToStep(2);
    showToast('Please complete your delivery address');
    return;
  }

  // Payment method validation
  let paymentLabel = 'UPI';
  let paymentStatus = 'Paid / Verified';

  if(selectedPayment === 'upi'){
    const upiVal = document.getElementById('upiIdInput')?.value.trim() || 'user@okhdfcbank';
    paymentLabel = selectedUpiApp === 'qr' ? 'UPI (Scanned QR Code)' : `UPI (${upiVal})`;
  } else if(selectedPayment === 'card'){
    const cardNumVal = document.getElementById('cardNumInput')?.value.trim();
    const last4 = cardNumVal ? cardNumVal.slice(-4) : '8920';
    paymentLabel = `Credit/Debit Card (ending in ${last4})`;
  } else if(selectedPayment === 'netbanking'){
    const otherBank = document.getElementById('otherBanksSelect')?.value;
    paymentLabel = `Net Banking (${otherBank || selectedBank + ' Bank'})`;
  } else if(selectedPayment === 'cod'){
    const enteredCode = document.getElementById('codCaptchaInput')?.value.trim();
    if(enteredCode !== codCaptcha){
      showToast('Please enter the correct 4-digit verification code for COD');
      return;
    }
    paymentLabel = 'Cash on Delivery (Pay at Doorstep)';
    paymentStatus = 'Pending (Pay on Delivery)';
  } else if(selectedPayment === 'emi'){
    paymentLabel = 'No Cost EMI (3 Months Plan)';
  }

  // UI Placing Feedback
  mainCheckoutBtn.disabled = true;
  mainCheckoutBtn.textContent = 'Confirming Order...';

  setTimeout(() => {
    mainCheckoutBtn.disabled = false;
    const existingIds = new Set(getAllOrders().map(o => o.orderId));
    let orderNum;
    do { orderNum = 'TN-' + Math.floor(100000 + Math.random() * 900000); } while(existingIds.has(orderNum));
    const subtotal = cartSubtotal();
    const shipping = subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIP_COST;
    const discountAmt = Math.round(subtotal * promoDiscount);
    const total = Math.max(0, subtotal + shipping - discountAmt);

    // Delivery calculation (3 days ahead)
    const deliveryDateObj = new Date();
    deliveryDateObj.setDate(deliveryDateObj.getDate() + 3);
    const deliveryDateStr = deliveryDateObj.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
    const todayStr = new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });

    const orderRecord = {
      orderId: orderNum,
      userId: user.id,
      userEmail: user.email,
      placedAt: new Date().toISOString(),
      datePlaced: todayStr,
      estimatedDelivery: deliveryDateStr,
      subtotal, shipping, discount: discountAmt, total,
      address: addr,
      payment: { method: paymentLabel, status: paymentStatus },
      items: lines.map(l => ({
        id: l.product.id,
        name: l.product.name,
        catLabel: l.product.catLabel,
        price: l.product.price,
        qty: l.qty,
        photo: l.product.photo
      }))
    };

    // Save to technest_orders history
    try { saveOrder(orderRecord); } catch(err){ console.error('Could not save order', err); }

    // Clear cart
    saveCart([]);
    promoDiscount = 0;

    // Render Confirmation Screen
    renderOrderConfirmation(orderRecord);

    currentStep = 4;
    for(let i = 1; i <= 4; i++){
      const ind = document.getElementById(`stepIndicator${i}`);
      if(ind){
        ind.classList.remove('active');
        if(i <= 4) ind.classList.add('done');
      }
    }
    if(checkoutStepper) checkoutStepper.style.display = 'none';
    cartGrid.style.display = 'none';
    orderPlaced.style.display = 'block';

    window.scrollTo({ top: 80, behavior: 'smooth' });
    showToast(`Order #${orderNum} placed successfully!`);
  }, 750);
}

function renderOrderConfirmation(order){
  document.getElementById('confirmedOrderNum').textContent = order.orderId;
  document.getElementById('otDatePlaced').textContent = order.datePlaced;
  document.getElementById('otDateDelivery').textContent = order.estimatedDelivery;

  // Address
  document.getElementById('confirmedName').textContent = order.address.fullName;
  document.getElementById('confirmedType').textContent = order.address.type.toUpperCase();
  document.getElementById('confirmedStreet').textContent = `${order.address.street}${order.address.landmark ? ', ' + order.address.landmark : ''}`;
  document.getElementById('confirmedCity').textContent = `${order.address.city}, ${order.address.state} - ${order.address.pin}`;
  document.getElementById('confirmedPhone').textContent = `Phone: +91 ${order.address.phone}`;

  // Payment
  document.getElementById('confirmedPaymentMode').textContent = order.payment.method;
  const statusEl = document.getElementById('confirmedPaymentStatus');
  statusEl.textContent = order.payment.status;
  statusEl.style.color = order.payment.status.includes('Paid') ? 'var(--good)' : 'var(--coral)';
  document.getElementById('confirmedTotal').textContent = `₹${formatINR(order.total)}`;

  // Items List
  const itemsContainer = document.getElementById('confirmedItemsList');
  itemsContainer.innerHTML = order.items.map(item => `
    <div class="order-item-row">
      <div class="order-item-left">
        <img class="order-item-thumb" src="${item.photo}" alt="${item.name}">
        <div>
          <div class="order-item-name">${item.name}</div>
          <div class="order-item-qty">Qty: ${item.qty} × ₹${formatINR(item.price)}</div>
        </div>
      </div>
      <div class="order-item-price">₹${formatINR(item.price * item.qty)}</div>
    </div>
  `).join('');

  // Setup Track Order Link
  const trackBtn = document.getElementById('trackOrderBtn');
  if(trackBtn){
    trackBtn.href = `contact.html?order=${order.orderId}`;
  }

  // Setup Copy Button
  const copyBtn = document.getElementById('copyOrderBtn');
  if(copyBtn){
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(order.orderId).then(() => {
        showToast(`Order ID ${order.orderId} copied!`);
      }).catch(() => {
        showToast(`Order ID: ${order.orderId}`);
      });
    };
  }
}

// ---------- Event Listeners ----------
document.addEventListener('DOMContentLoaded', () => {
  initAddressFields();
  setupPaymentHandlers();

  mainCheckoutBtn.addEventListener('click', () => {
    if(currentStep === 1){
      if(!requireLogin()) return;
      goToStep(2);
    } else if(currentStep === 2){
      goToStep(3);
    } else if(currentStep === 3){
      processOrderPlacement();
    }
  });

  backStepBtn.addEventListener('click', () => {
    if(currentStep === 2){
      goToStep(1);
    } else if(currentStep === 3){
      goToStep(2);
    }
  });

  document.getElementById('promoBtn').addEventListener('click', () => {
    const code = document.getElementById('promoInput').value.trim().toUpperCase();
    if(VALID_PROMOS[code]){
      promoDiscount = VALID_PROMOS[code];
      showToast(`Promo ${code} applied — ${Math.round(promoDiscount*100)}% off!`);
    } else {
      promoDiscount = 0;
      showToast(code ? 'That promo code isn’t valid' : 'Enter a promo code first');
    }
    updateSummary();
  });

  renderCart();
});
