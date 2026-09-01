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

function slugify(str) {
  return str.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getProductFromShowcase(showcaseEl) {
  const titleEl = showcaseEl.querySelector('.showcase-title');
  const priceEl = showcaseEl.querySelector('.price-box .price');
  const imgEl = showcaseEl.querySelector('.product-img.default')
    || showcaseEl.querySelector('.showcase-banner img')
    || showcaseEl.querySelector('img');

  if (!titleEl || !priceEl || !imgEl) return null;

  const name = titleEl.textContent.trim();
  const price = parseFloat(priceEl.textContent.replace(/[^0-9.]/g, '')) || 0;
  const image = imgEl.getAttribute('src');

  return { id: slugify(name), name: name, price: price, image: image };
}

function readStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    return [];
  }
}

function writeStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
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

const CART_KEY = 'anon-cart';
const cartPanel = document.querySelector('[data-cart-panel]');
const cartBody = document.querySelector('[data-cart-body]');
const cartSubtotalEl = document.querySelector('[data-cart-subtotal]');
const cartCheckoutBtn = document.querySelector('[data-cart-checkout]');
const cartOverlay = document.querySelector('[data-cart-overlay]');
const cartCloseBtn = document.querySelector('[data-cart-close]');

function getCart() { return readStore(CART_KEY); }

function saveCart(cart) {
  writeStore(CART_KEY, cart);
  renderCart();
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find(function (item) { return item.id === product.id; });

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty: 1 });
  }

  saveCart(cart);
  showFeedback(product.name + ' added to cart');
}

function changeQty(id, delta) {
  const cart = getCart();
  const item = cart.find(function (i) { return i.id === id; });
  if (!item) return;

  item.qty += delta;
  const updated = item.qty <= 0 ? cart.filter(function (i) { return i.id !== id; }) : cart;
  saveCart(updated);
}

function removeFromCart(id) {
  saveCart(getCart().filter(function (i) { return i.id !== id; }));
}

function cartSubtotal(cart) {
  return cart.reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
}

function cartCount(cart) {
  return cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
}

function updateCartBadges(cart) {
  const count = cartCount(cart);
  document.querySelectorAll('.action-btn').forEach(function (btn) {
    const icon = btn.querySelector('ion-icon[name="bag-handle-outline"]');
    if (icon) {
      const badge = btn.querySelector('.count');
      if (badge) badge.textContent = count;
    }
  });
}

function renderCart() {
  const cart = getCart();

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
  updateCartBadges(cart);
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

cartCheckoutBtn.addEventListener('click', function () {
  if (getCart().length === 0) return;
  saveCart([]);
  closeCartPanel();
  showFeedback('Order placed! Thank you for shopping with Anon.');
});

// ---- wishlist ----

const WISHLIST_KEY = 'anon-wishlist';
const wishlistPanel = document.querySelector('[data-wishlist-panel]');
const wishlistBody = document.querySelector('[data-wishlist-body]');
const wishlistOverlay = document.querySelector('[data-wishlist-overlay]');
const wishlistCloseBtn = document.querySelector('[data-wishlist-close]');

function getWishlist() { return readStore(WISHLIST_KEY); }

function saveWishlist(list) {
  writeStore(WISHLIST_KEY, list);
  renderWishlist();
}

function toggleWishlist(product, heartIcon) {
  const list = getWishlist();
  const idx = list.findIndex(function (i) { return i.id === product.id; });

  if (idx > -1) {
    list.splice(idx, 1);
    if (heartIcon) heartIcon.setAttribute('name', 'heart-outline');
    showFeedback(product.name + ' removed from wishlist');
  } else {
    list.push(product);
    if (heartIcon) heartIcon.setAttribute('name', 'heart');
    showFeedback(product.name + ' added to wishlist');
  }

  saveWishlist(list);
}

function updateWishlistBadges() {
  const count = getWishlist().length;
  document.querySelectorAll('.header-user-actions .action-btn, .mobile-bottom-navigation .action-btn').forEach(function (btn) {
    const icon = btn.querySelector('ion-icon[name="heart-outline"], ion-icon[name="heart"]');
    if (icon) {
      const badge = btn.querySelector('.count');
      if (badge) badge.textContent = count;
    }
  });
}

function renderWishlist() {
  const list = getWishlist();

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
    const product = getWishlist().find(function (i) { return i.id === id; });
    if (product) addToCart(product);
  }

  if (removeBtn) {
    saveWishlist(getWishlist().filter(function (i) { return i.id !== removeBtn.getAttribute('data-wishlist-remove'); }));
  }
});

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
      showFeedback('Login / account features are coming soon!');
    } else if (iconName === 'home-outline') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return;
  }

});

renderCart();
renderWishlist();

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