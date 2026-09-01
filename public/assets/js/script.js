'use strict';

// modal variables
const modal = document.querySelector('[data-modal]');
const modalCloseBtn = document.querySelector('[data-modal-close]');
const modalCloseOverlay = document.querySelector('[data-modal-overlay]');

// modal function
const modalCloseFunc = function () { modal.classList.add('closed') }

// modal eventListener
modalCloseOverlay.addEventListener('click', modalCloseFunc);
modalCloseBtn.addEventListener('click', modalCloseFunc);





// notification toast variables
const notificationToast = document.querySelector('[data-toast]');
const toastCloseBtn = document.querySelector('[data-toast-close]');

// notification toast eventListener
toastCloseBtn.addEventListener('click', function () {
  notificationToast.classList.add('closed');
});





// mobile menu variables
const mobileMenuOpenBtn = document.querySelectorAll('[data-mobile-menu-open-btn]');
const mobileMenu = document.querySelectorAll('[data-mobile-menu]');
const mobileMenuCloseBtn = document.querySelectorAll('[data-mobile-menu-close-btn]');
const overlay = document.querySelector('[data-overlay]');

for (let i = 0; i < mobileMenuOpenBtn.length; i++) {

  // mobile menu function
  const mobileMenuCloseFunc = function () {
    mobileMenu[i].classList.remove('active');
    overlay.classList.remove('active');
  }

  mobileMenuOpenBtn[i].addEventListener('click', function () {
    mobileMenu[i].classList.add('active');
    overlay.classList.add('active');
  });

  mobileMenuCloseBtn[i].addEventListener('click', mobileMenuCloseFunc);
  overlay.addEventListener('click', mobileMenuCloseFunc);

}





// accordion variables
const accordionBtn = document.querySelectorAll('[data-accordion-btn]');
const accordion = document.querySelectorAll('[data-accordion]');

for (let i = 0; i < accordionBtn.length; i++) {

  accordionBtn[i].addEventListener('click', function () {

    const clickedBtn = this.nextElementSibling.classList.contains('active');

    for (let i = 0; i < accordion.length; i++) {

      if (clickedBtn) break;

      if (accordion[i].classList.contains('active')) {

        accordion[i].classList.remove('active');
        accordionBtn[i].classList.remove('active');

      }

    }

    this.nextElementSibling.classList.toggle('active');
    this.classList.toggle('active');

  });

}





/**
 * CART / WISHLIST / SEARCH / QUICK VIEW / NEWSLETTER
 */

// ---- helpers ----

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getProductFromShowcase(showcaseEl) {
  const id = showcaseEl.getAttribute('data-product-id');
  const titleEl = showcaseEl.querySelector('.showcase-title');
  const priceEl = showcaseEl.querySelector('.price-box .price');
  const imgEl = showcaseEl.querySelector('.product-img.default')
    || showcaseEl.querySelector('.showcase-banner img')
    || showcaseEl.querySelector('img');

  if (!id || !titleEl || !priceEl || !imgEl) return null;

  const name = titleEl.textContent.trim();
  const price = parseFloat(priceEl.textContent.replace(/[^0-9.]/g, '')) || 0;
  const image = imgEl.getAttribute('src');

  return { id: id, name: name, price: price, image: image };
}

const TOKEN_KEY = 'anon-token';
let currentUser = null;

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(token) { localStorage.setItem(TOKEN_KEY, token); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

async function api(path, options) {
  options = options || {};
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  const res = await fetch(path, Object.assign({}, options, { headers: headers }));
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

// ---- feedback toast ----

const feedbackToastContainer = document.querySelector('[data-feedback-toast]');

function showFeedback(message) {
  const item = document.createElement('div');
  item.className = 'feedback-toast-item';
  item.textContent = message;
  feedbackToastContainer.appendChild(item);

  requestAnimationFrame(function () { item.classList.add('show'); });

  setTimeout(function () {
    item.classList.remove('show');
    setTimeout(function () { item.remove(); }, 300);
  }, 2500);
}

// ---- cart ----

let cartCache = [];
const cartPanel = document.querySelector('[data-cart-panel]');
const cartBody = document.querySelector('[data-cart-body]');
const cartSubtotalEl = document.querySelector('[data-cart-subtotal]');
const cartCheckoutBtn = document.querySelector('[data-cart-checkout]');
const cartOverlay = document.querySelector('[data-cart-overlay]');
const cartCloseBtn = document.querySelector('[data-cart-close]');

async function loadCart() {
  if (!currentUser) { cartCache = []; renderCart(); return; }
  try {
    cartCache = await api('/api/cart');
  } catch (e) {
    cartCache = [];
  }
  renderCart();
}

async function addToCart(product) {
  if (!currentUser) {
    showFeedback('Please log in to add items to your cart.');
    openAccountPanel();
    return;
  }
  try {
    cartCache = await api('/api/cart', { method: 'POST', body: JSON.stringify({ product_id: product.id }) });
    renderCart();
    showFeedback(product.name + ' added to cart');
  } catch (e) {
    showFeedback(e.message);
  }
}

async function changeQty(id, delta) {
  try {
    cartCache = await api('/api/cart/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify({ delta: delta }) });
    renderCart();
  } catch (e) {
    showFeedback(e.message);
  }
}

async function removeFromCart(id) {
  try {
    cartCache = await api('/api/cart/' + encodeURIComponent(id), { method: 'DELETE' });
    renderCart();
  } catch (e) {
    showFeedback(e.message);
  }
}

function cartSubtotal(cart) {
  return cart.reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
}

function cartCount(cart) {
  return cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
}

function updateCartBadges() {
  const count = cartCount(cartCache);
  document.querySelectorAll('.action-btn').forEach(function (btn) {
    const icon = btn.querySelector('ion-icon[name="bag-handle-outline"]');
    if (icon) {
      const badge = btn.querySelector('.count');
      if (badge) badge.textContent = count;
    }
  });
}

function renderCart() {
  const cart = cartCache;

  if (cart.length === 0) {
    cartBody.innerHTML = '<p class="side-panel-empty-msg">Your cart is empty.</p>';
    cartCheckoutBtn.setAttribute('disabled', '');
  } else {
    cartCheckoutBtn.removeAttribute('disabled');
    cartBody.innerHTML = cart.map(function (item) {
      return '' +
        '<div class="side-panel-item">' +
        '<img src="' + item.image + '" alt="' + escapeHtml(item.name) + '">' +
        '<div class="side-panel-item-info">' +
        '<p class="side-panel-item-title">' + escapeHtml(item.name) + '</p>' +
        '<p class="side-panel-item-price">$' + item.price.toFixed(2) + '</p>' +
        '<div class="side-panel-item-actions">' +
        '<button class="qty-btn" data-qty-decrease="' + item.id + '">-</button>' +
        '<span class="qty-value">' + item.qty + '</span>' +
        '<button class="qty-btn" data-qty-increase="' + item.id + '">+</button>' +
        '<button class="side-panel-remove-btn" data-cart-remove="' + item.id + '">Remove</button>' +
        '</div></div></div>';
    }).join('');
  }

  cartSubtotalEl.textContent = '$' + cartSubtotal(cart).toFixed(2);
  updateCartBadges();
}

function openCartPanel() { cartPanel.classList.add('active'); }
function closeCartPanel() { cartPanel.classList.remove('active'); }

cartOverlay.addEventListener('click', closeCartPanel);
cartCloseBtn.addEventListener('click', closeCartPanel);

cartBody.addEventListener('click', function (e) {
  const incBtn = e.target.closest('[data-qty-increase]');
  const decBtn = e.target.closest('[data-qty-decrease]');
  const removeBtn = e.target.closest('[data-cart-remove]');

  if (incBtn) changeQty(incBtn.getAttribute('data-qty-increase'), 1);
  if (decBtn) changeQty(decBtn.getAttribute('data-qty-decrease'), -1);
  if (removeBtn) removeFromCart(removeBtn.getAttribute('data-cart-remove'));
});

cartCheckoutBtn.addEventListener('click', async function () {
  if (!currentUser) {
    showFeedback('Please log in to checkout.');
    openAccountPanel();
    return;
  }
  if (cartCache.length === 0) return;

  cartCheckoutBtn.setAttribute('disabled', '');
  try {
    const data = await api('/api/checkout/create-session', { method: 'POST' });
    window.location.href = data.url;
  } catch (e) {
    cartCheckoutBtn.removeAttribute('disabled');
    showFeedback(e.message);
  }
});

async function handleCheckoutRedirect() {
  const params = new URLSearchParams(window.location.search);
  const checkout = params.get('checkout');
  if (!checkout) return;

  if (checkout === 'success') {
    const sessionId = params.get('session_id');
    try {
      await api('/api/checkout/confirm?session_id=' + encodeURIComponent(sessionId));
      showFeedback('Payment successful! Thank you for shopping with Anon.');
      await Promise.all([loadCart(), loadWishlist()]);
    } catch (e) {
      showFeedback(e.message);
    }
  } else if (checkout === 'cancel') {
    showFeedback('Checkout was cancelled — your cart is still here.');
  }

  params.delete('checkout');
  params.delete('session_id');
  const query = params.toString();
  window.history.replaceState({}, '', window.location.pathname + (query ? '?' + query : ''));
}

// ---- wishlist ----

let wishlistCache = [];
const wishlistPanel = document.querySelector('[data-wishlist-panel]');
const wishlistBody = document.querySelector('[data-wishlist-body]');
const wishlistOverlay = document.querySelector('[data-wishlist-overlay]');
const wishlistCloseBtn = document.querySelector('[data-wishlist-close]');

async function loadWishlist() {
  if (!currentUser) { wishlistCache = []; renderWishlist(); return; }
  try {
    wishlistCache = await api('/api/wishlist');
  } catch (e) {
    wishlistCache = [];
  }
  renderWishlist();
}

async function toggleWishlist(product, heartIcon) {
  if (!currentUser) {
    showFeedback('Please log in to use your wishlist.');
    openAccountPanel();
    return;
  }
  try {
    wishlistCache = await api('/api/wishlist', { method: 'POST', body: JSON.stringify({ product_id: product.id }) });
    renderWishlist();
    const inWishlist = wishlistCache.some(function (i) { return i.id === product.id; });
    if (heartIcon) heartIcon.setAttribute('name', inWishlist ? 'heart' : 'heart-outline');
    showFeedback(product.name + (inWishlist ? ' added to wishlist' : ' removed from wishlist'));
  } catch (e) {
    showFeedback(e.message);
  }
}

async function removeFromWishlist(id) {
  try {
    wishlistCache = await api('/api/wishlist/' + encodeURIComponent(id), { method: 'DELETE' });
    renderWishlist();
  } catch (e) {
    showFeedback(e.message);
  }
}

function updateWishlistBadges() {
  const count = wishlistCache.length;
  document.querySelectorAll('.header-user-actions .action-btn, .mobile-bottom-navigation .action-btn').forEach(function (btn) {
    const icon = btn.querySelector('ion-icon[name="heart-outline"], ion-icon[name="heart"]');
    if (icon) {
      const badge = btn.querySelector('.count');
      if (badge) badge.textContent = count;
    }
  });
}

function renderWishlist() {
  const list = wishlistCache;

  if (list.length === 0) {
    wishlistBody.innerHTML = '<p class="side-panel-empty-msg">Your wishlist is empty.</p>';
  } else {
    wishlistBody.innerHTML = list.map(function (item) {
      return '' +
        '<div class="side-panel-item">' +
        '<img src="' + item.image + '" alt="' + escapeHtml(item.name) + '">' +
        '<div class="side-panel-item-info">' +
        '<p class="side-panel-item-title">' + escapeHtml(item.name) + '</p>' +
        '<p class="side-panel-item-price">$' + item.price.toFixed(2) + '</p>' +
        '<div class="side-panel-item-actions">' +
        '<button class="side-panel-item-wishlist-add" data-wishlist-add-cart="' + item.id + '">Add to cart</button>' +
        '<button class="side-panel-remove-btn" data-wishlist-remove="' + item.id + '">Remove</button>' +
        '</div></div></div>';
    }).join('');
  }

  updateWishlistBadges();
}

function openWishlistPanel() { wishlistPanel.classList.add('active'); }
function closeWishlistPanel() { wishlistPanel.classList.remove('active'); }

wishlistOverlay.addEventListener('click', closeWishlistPanel);
wishlistCloseBtn.addEventListener('click', closeWishlistPanel);

wishlistBody.addEventListener('click', function (e) {
  const addBtn = e.target.closest('[data-wishlist-add-cart]');
  const removeBtn = e.target.closest('[data-wishlist-remove]');

  if (addBtn) {
    const id = addBtn.getAttribute('data-wishlist-add-cart');
    const product = wishlistCache.find(function (i) { return i.id === id; });
    if (product) addToCart(product);
  }

  if (removeBtn) {
    removeFromWishlist(removeBtn.getAttribute('data-wishlist-remove'));
  }
});

// ---- account panel (login / register / orders) ----

const accountPanel = document.querySelector('[data-account-panel]');
const accountBody = document.querySelector('[data-account-body]');
const accountOverlay = document.querySelector('[data-account-overlay]');
const accountCloseBtn = document.querySelector('[data-account-close]');

let accountMode = 'login';

function openAccountPanel() {
  accountPanel.classList.add('active');
  renderAccountPanel();
}
function closeAccountPanel() {
  accountPanel.classList.remove('active');
  accountMode = 'login';
}

accountOverlay.addEventListener('click', closeAccountPanel);
accountCloseBtn.addEventListener('click', closeAccountPanel);

function renderAccountPanel() {
  if (currentUser) {
    renderAccountLoggedIn();
  } else {
    renderAuthForm();
  }
}

function renderAuthForm() {
  const isLogin = accountMode === 'login';

  accountBody.innerHTML = '' +
    '<p class="auth-error" data-auth-error></p>' +
    '<form class="auth-form" data-auth-form>' +
    (isLogin ? '' : '<input type="text" class="auth-field" name="name" placeholder="Full name" required>') +
    '<input type="email" class="auth-field" name="email" placeholder="Email address" required>' +
    '<input type="password" class="auth-field" name="password" placeholder="Password" required minlength="6">' +
    '<button type="submit" class="btn-newsletter">' + (isLogin ? 'Log In' : 'Create Account') + '</button>' +
    '</form>' +
    '<p class="auth-switch">' +
    (isLogin ? 'Don’t have an account? ' : 'Already have an account? ') +
    '<button type="button" data-auth-switch>' + (isLogin ? 'Sign up' : 'Log in') + '</button>' +
    '</p>';

  accountBody.querySelector('[data-auth-switch]').addEventListener('click', function () {
    accountMode = isLogin ? 'register' : 'login';
    renderAuthForm();
  });

  accountBody.querySelector('[data-auth-form]').addEventListener('submit', async function (e) {
    e.preventDefault();
    const errorEl = accountBody.querySelector('[data-auth-error]');
    errorEl.classList.remove('show');

    const formData = new FormData(this);
    const payload = { email: formData.get('email'), password: formData.get('password') };
    if (!isLogin) payload.name = formData.get('name');

    try {
      const data = await api(isLogin ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setToken(data.token);
      currentUser = data.user;
      showFeedback('Welcome, ' + currentUser.name + '!');
      await Promise.all([loadCart(), loadWishlist()]);
      renderAccountPanel();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.add('show');
    }
  });
}

async function renderAccountLoggedIn() {
  accountBody.innerHTML = '' +
    '<div class="account-info">' +
    '<p class="account-info-name">' + escapeHtml(currentUser.name) + '</p>' +
    '<p class="account-info-email">' + escapeHtml(currentUser.email) + '</p>' +
    '<button class="btn-logout" data-logout-btn>Log Out</button>' +
    '</div>' +
    '<h4 class="account-orders-title">Order History</h4>' +
    '<div data-orders-list><p class="side-panel-empty-msg">Loading orders...</p></div>';

  accountBody.querySelector('[data-logout-btn]').addEventListener('click', async function () {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) { /* token already invalid */ }
    clearToken();
    currentUser = null;
    cartCache = [];
    wishlistCache = [];
    accountMode = 'login';
    renderCart();
    renderWishlist();
    showFeedback('Logged out.');
    renderAccountPanel();
  });

  try {
    const orders = await api('/api/orders');
    const ordersList = accountBody.querySelector('[data-orders-list]');
    if (!ordersList) return;

    if (orders.length === 0) {
      ordersList.innerHTML = '<p class="side-panel-empty-msg">No orders yet.</p>';
    } else {
      ordersList.innerHTML = orders.map(function (order) {
        const itemsHtml = order.items.map(function (item) {
          return '<div class="order-card-item"><span>' + escapeHtml(item.name) + ' x' + item.qty + '</span><span>$' + (item.price * item.qty).toFixed(2) + '</span></div>';
        }).join('');
        return '' +
          '<div class="order-card">' +
          '<div class="order-card-header"><span>Order #' + order.id + '</span><span>' + new Date(order.created_at).toLocaleDateString() + '</span></div>' +
          itemsHtml +
          '<div class="order-card-total">Total: $' + order.total.toFixed(2) + '</div>' +
          '</div>';
      }).join('');
    }
  } catch (e) {
    // account panel may have been closed/re-rendered before this resolved
  }
}

// ---- quick view ----

const quickviewModal = document.querySelector('[data-quickview-modal]');
const quickviewOverlay = document.querySelector('[data-quickview-overlay]');
const quickviewCloseBtn = document.querySelector('[data-quickview-close]');
const quickviewImg = document.querySelector('[data-quickview-img]');
const quickviewTitle = document.querySelector('[data-quickview-title]');
const quickviewPrice = document.querySelector('[data-quickview-price]');
const quickviewAddBtn = document.querySelector('[data-quickview-add]');

let quickviewProduct = null;

function openQuickview(product) {
  quickviewProduct = product;
  quickviewImg.setAttribute('src', product.image);
  quickviewImg.setAttribute('alt', product.name);
  quickviewTitle.textContent = product.name;
  quickviewPrice.textContent = '$' + product.price.toFixed(2);
  quickviewModal.classList.add('active');
}

function closeQuickview() { quickviewModal.classList.remove('active'); }

quickviewOverlay.addEventListener('click', closeQuickview);
quickviewCloseBtn.addEventListener('click', closeQuickview);
quickviewAddBtn.addEventListener('click', function () {
  if (quickviewProduct) addToCart(quickviewProduct);
  closeQuickview();
});

// ---- product actions (event delegation) ----

document.addEventListener('click', function (e) {

  const addCartBtn = e.target.closest('.add-cart-btn');
  if (addCartBtn) {
    const showcase = addCartBtn.closest('.showcase');
    const product = showcase && getProductFromShowcase(showcase);
    if (product) addToCart(product);
    return;
  }

  const actionBtn = e.target.closest('.showcase-actions .btn-action');
  if (actionBtn) {
    const showcase = actionBtn.closest('.showcase');
    const product = showcase && getProductFromShowcase(showcase);
    if (!product) return;

    const icon = actionBtn.querySelector('ion-icon');
    const iconName = icon && icon.getAttribute('name');

    if (iconName === 'heart-outline' || iconName === 'heart') {
      toggleWishlist(product, icon);
    } else if (iconName === 'eye-outline') {
      openQuickview(product);
    } else if (iconName === 'repeat-outline') {
      showFeedback('Compare feature is coming soon!');
    } else if (iconName === 'bag-add-outline') {
      addToCart(product);
    }
    return;
  }

  const headerActionBtn = e.target.closest('.header-user-actions .action-btn, .mobile-bottom-navigation .action-btn');
  if (headerActionBtn) {
    const icon = headerActionBtn.querySelector('ion-icon');
    const iconName = icon && icon.getAttribute('name');

    if (iconName === 'bag-handle-outline') {
      openCartPanel();
    } else if (iconName === 'heart-outline' || iconName === 'heart') {
      openWishlistPanel();
    } else if (iconName === 'person-outline') {
      openAccountPanel();
    } else if (iconName === 'home-outline') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return;
  }

});

async function initAuth() {
  const token = getToken();
  if (!token) { renderCart(); renderWishlist(); return; }

  try {
    const data = await api('/api/auth/me');
    currentUser = data.user;
  } catch (e) {
    clearToken();
    currentUser = null;
  }

  await Promise.all([loadCart(), loadWishlist()]);
}

initAuth().then(handleCheckoutRedirect);

// ---- search ----

const searchFields = document.querySelectorAll('.search-field');
const searchBtns = document.querySelectorAll('.search-btn');

function runSearch(query) {
  const term = query.trim().toLowerCase();
  const showcases = document.querySelectorAll('.showcase');
  let matches = 0;

  showcases.forEach(function (showcase) {
    const titleEl = showcase.querySelector('.showcase-title');
    const title = titleEl ? titleEl.textContent.trim().toLowerCase() : '';
    const isMatch = term === '' || title.indexOf(term) !== -1;
    showcase.classList.toggle('search-hidden', !isMatch);
    if (isMatch) matches += 1;
  });

  if (term !== '' && matches === 0) {
    showFeedback('No products found for "' + query.trim() + '"');
  }
}

searchFields.forEach(function (field) {
  field.addEventListener('input', function () { runSearch(this.value); });
  field.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch(this.value);
    }
  });
});

searchBtns.forEach(function (btn) {
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    const field = document.querySelector('.search-field');
    if (field) runSearch(field.value);
  });
});

// ---- newsletter ----

const newsletterForm = document.querySelector('[data-newsletter-form]');

if (newsletterForm) {
  newsletterForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const emailField = this.querySelector('.email-field');
    const email = emailField.value.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValidEmail) {
      showFeedback('Please enter a valid email address.');
      return;
    }

    showFeedback('Thanks for subscribing, ' + email + '!');
    emailField.value = '';
    modalCloseFunc();
  });
}