(() => {
  'use strict';

  if (document.body.dataset.page !== 'checkout') return;

  const DATA = window.FASHIONHUB_DATA || {};
  const products = DATA.products || [];
  const CART_KEY = 'fashionhub-demo-cart-v2';
  const $ = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => Array.from(r.querySelectorAll(s));
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const money = n => `৳${Number(n || 0).toLocaleString('en-BD')}`;
  const readCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch (_) { return {}; } };
  const writeCart = cart => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (_) {} };
  const byId = id => products.find(p => Number(p.id) === Number(id));

  const state = {
    mode: 'login',
    loggedIn: false,
    customer: null,
    shippingMethod: '',
    paymentMethod: ''
  };

  function cartEntries() {
    return Object.entries(readCart()).map(([id, qty]) => ({ product: byId(id), qty: Number(qty) })).filter(x => x.product && x.qty > 0);
  }

  function subtotal() {
    return cartEntries().reduce((sum, item) => sum + item.product.price * item.qty, 0);
  }

  function shippingCost() {
    const sub = subtotal();
    if (!state.shippingMethod) return 0;
    if (state.shippingMethod === 'standard') return sub >= 3000 ? 0 : 120;
    if (state.shippingMethod === 'express') return 220;
    return 0;
  }

  function toast(message) {
    const region = $('#toastRegion');
    if (!region) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    region.append(el);
    setTimeout(() => el.remove(), 2800);
  }

  function authMarkup() {
    return `
      <section class="checkout-card">
        <div class="checkout-auth-tabs" role="tablist" aria-label="Checkout account option">
          <button class="checkout-auth-tab is-active" type="button" data-checkout-mode="login" role="tab" aria-selected="true">Login</button>
          <button class="checkout-auth-tab" type="button" data-checkout-mode="create" role="tab" aria-selected="false">Create new account</button>
          <button class="checkout-auth-tab" type="button" data-checkout-mode="guest" role="tab" aria-selected="false">Guest checkout</button>
        </div>
        <div class="checkout-auth-panel is-active" data-auth-panel="login">
          <div class="checkout-login-grid">
            <div class="checkout-field"><label for="loginEmail">Email address</label><input id="loginEmail" type="email" autocomplete="username" placeholder="you@example.com"></div>
            <div class="checkout-field"><label for="loginPassword">Password</label><input id="loginPassword" type="password" autocomplete="current-password" placeholder="Password"></div>
            <button class="checkout-login-btn" id="checkoutLoginBtn" type="button">Login</button>
            <p class="checkout-login-status" id="checkoutLoginStatus">Login securely to load your saved billing and delivery details.</p>
          </div>
        </div>
        <div class="checkout-auth-panel" data-auth-panel="create">
          <p class="checkout-account-note">Enter your customer information below and choose a password. Your account can be created together with the order.</p>
          <div class="checkout-form-grid" style="margin-top:12px">
            <div class="checkout-field"><label for="newPassword">Create password</label><input id="newPassword" type="password" autocomplete="new-password" minlength="6" placeholder="Minimum 6 characters"></div>
            <div class="checkout-field"><label for="confirmPassword">Confirm password</label><input id="confirmPassword" type="password" autocomplete="new-password" minlength="6" placeholder="Repeat password"></div>
          </div>
        </div>
        <div class="checkout-auth-panel" data-auth-panel="guest">
          <p class="checkout-account-note">Continue without creating an account. We will only use your details to process this order.</p>
        </div>
      </section>`;
  }

  function customerMarkup() {
    return `
      <section class="checkout-card">
        <h2>Customer information</h2>
        <div class="checkout-form-grid" id="billingFields">
          <div class="checkout-field"><label for="billingFirst">First name</label><input id="billingFirst" data-billing-required autocomplete="given-name" placeholder="First name"></div>
          <div class="checkout-field"><label for="billingLast">Last name</label><input id="billingLast" data-billing-required autocomplete="family-name" placeholder="Last name"></div>
          <div class="checkout-field"><label for="billingEmail">Email address</label><input id="billingEmail" data-billing-required type="email" autocomplete="email" placeholder="you@example.com"></div>
          <div class="checkout-field"><label for="billingPhone">Phone number</label><input id="billingPhone" data-billing-required type="tel" autocomplete="tel" placeholder="01XXXXXXXXX"></div>
          <div class="checkout-field checkout-field--full"><label for="billingAddress">Street address</label><input id="billingAddress" data-billing-required autocomplete="street-address" placeholder="House, road, area"></div>
          <div class="checkout-field"><label for="billingDistrict">District</label><select id="billingDistrict" data-billing-required autocomplete="address-level1"><option value="">Select district</option><option>Dhaka</option><option>Chattogram</option><option>Sylhet</option><option>Rajshahi</option><option>Khulna</option><option>Barishal</option><option>Rangpur</option><option>Mymensingh</option></select></div>
          <div class="checkout-field"><label for="billingPostcode">Postcode</label><input id="billingPostcode" data-billing-required autocomplete="postal-code" placeholder="Postcode"></div>
        </div>
        <label class="ship-different"><input id="shipDifferent" type="checkbox"> Ship to a different address</label>
        <div class="checkout-shipping-address" id="shippingAddressWrap">
          <h3>Shipping address</h3>
          <div class="checkout-form-grid">
            <div class="checkout-field"><label for="shippingFirst">First name</label><input id="shippingFirst" data-shipping-required placeholder="First name"></div>
            <div class="checkout-field"><label for="shippingLast">Last name</label><input id="shippingLast" data-shipping-required placeholder="Last name"></div>
            <div class="checkout-field checkout-field--full"><label for="shippingAddress">Street address</label><input id="shippingAddress" data-shipping-required placeholder="House, road, area"></div>
            <div class="checkout-field"><label for="shippingDistrict">District</label><select id="shippingDistrict" data-shipping-required><option value="">Select district</option><option>Dhaka</option><option>Chattogram</option><option>Sylhet</option><option>Rajshahi</option><option>Khulna</option><option>Barishal</option><option>Rangpur</option><option>Mymensingh</option></select></div>
            <div class="checkout-field"><label for="shippingPostcode">Postcode</label><input id="shippingPostcode" data-shipping-required placeholder="Postcode"></div>
          </div>
        </div>
      </section>`;
  }

  function renderPage() {
    const root = $('#pageRoot');
    if (!root) return;
    root.innerHTML = `<div class="page-shell">
      <nav class="page-crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a>${icon('chevron-right')}<a href="cart.html">Cart</a>${icon('chevron-right')}<span>Checkout</span></nav>
      <div class="page-titlebar"><div><h1>Secure Checkout</h1><p>Choose how you want to checkout, confirm your address, then select shipping and payment.</p></div><div class="page-titlebar__meta"><span class="soft-pill">${icon('shield')} Secure checkout</span></div></div>
      <div class="checkout-shell">
        <div class="checkout-left">${authMarkup()}${customerMarkup()}</div>
        <aside class="checkout-summary" id="checkoutSummary"></aside>
      </div>
    </div>`;
    document.body.classList.add('checkout-ready');
    renderSummary();
    bindCheckout();
    validateCheckout();
  }

  function renderSummary() {
    const wrap = $('#checkoutSummary');
    if (!wrap) return;
    const entries = cartEntries();
    const sub = subtotal();
    const ship = shippingCost();
    const total = sub + ship;

    wrap.innerHTML = `
      <div class="checkout-summary__head"><h2>Order summary</h2><span>${entries.reduce((s,x)=>s+x.qty,0)} item${entries.reduce((s,x)=>s+x.qty,0)===1?'':'s'}</span></div>
      ${entries.length ? `<div class="checkout-order-items">${entries.map(({product:p,qty})=>`
        <article class="checkout-order-item" data-checkout-item="${p.id}">
          <img src="${esc(p.image)}" alt="${esc(p.name)}">
          <div class="checkout-order-item__copy"><b>${esc(p.name)}</b><small>Qty ${qty} · ${esc(p.category)}</small></div>
          <strong>${money(p.price * qty)}</strong>
          <button class="checkout-remove" type="button" data-checkout-remove="${p.id}" aria-label="Remove ${esc(p.name)}">${icon('close')}</button>
        </article>`).join('')}</div>` : `<div class="checkout-empty">${icon('cart')}<h3>Your cart is empty</h3><p>Add products before continuing to checkout.</p><a class="primary-button" href="shop.html">Continue shopping</a></div>`}
      <div class="checkout-summary__totals">
        <div class="checkout-total-line"><span>Subtotal</span><b>${money(sub)}</b></div>
        <div class="checkout-total-line"><span>Shipping</span><b>${state.shippingMethod ? (ship ? money(ship) : 'Free') : '—'}</b></div>
        <div class="checkout-total-line checkout-total-line--grand"><span>Total</span><b>${money(total)}</b></div>
      </div>
      <div class="checkout-final-options" id="checkoutFinalOptions">
        <h3>Shipping method</h3>
        <select id="checkoutShippingMethod" aria-label="Shipping method">
          <option value="">Select shipping</option>
          <option value="standard" ${state.shippingMethod==='standard'?'selected':''}>Standard delivery — ${sub>=3000?'Free':'৳120'}</option>
          <option value="express" ${state.shippingMethod==='express'?'selected':''}>Express delivery — ৳220</option>
          <option value="pickup" ${state.shippingMethod==='pickup'?'selected':''}>Store pickup — Free</option>
        </select>
        <h3>Payment gateway</h3>
        <div class="checkout-payment-list">
          <label class="checkout-payment"><input type="radio" name="checkoutPayment" value="cod" ${state.paymentMethod==='cod'?'checked':''}><span><b>Cash on Delivery</b><small>Eligible physical products</small></span>${icon('box')}</label>
          <label class="checkout-payment"><input type="radio" name="checkoutPayment" value="mobile" ${state.paymentMethod==='mobile'?'checked':''}><span><b>bKash / Nagad</b><small>Mobile payment gateway</small></span>${icon('phone')}</label>
          <label class="checkout-payment"><input type="radio" name="checkoutPayment" value="card" ${state.paymentMethod==='card'?'checked':''}><span><b>Credit / Debit Card</b><small>Visa and Mastercard</small></span>${icon('shield')}</label>
        </div>
        <div class="checkout-gate" id="checkoutGateText">Complete customer information, shipping and payment to continue.</div>
        <button class="checkout-submit" id="placeOrderBtn" type="button" disabled>Place order</button>
        <p class="checkout-lock-note">${icon('shield')} Your order button unlocks only when all required checkout details are complete.</p>
      </div>`;

    const shipping = $('#checkoutShippingMethod');
    if (shipping) shipping.addEventListener('change', e => { state.shippingMethod = e.target.value; renderSummary(); validateCheckout(); });
    $$('input[name="checkoutPayment"]').forEach(input => input.addEventListener('change', e => { state.paymentMethod = e.target.value; validateCheckout(); }));
    $$('[data-checkout-remove]').forEach(button => button.addEventListener('click', () => removeItem(button.dataset.checkoutRemove)));
    $('#placeOrderBtn')?.addEventListener('click', submitOrder);
    validateCheckout();
  }

  function removeItem(id) {
    const cart = readCart();
    delete cart[id];
    writeCart(cart);
    const count = Object.values(cart).reduce((s,n)=>s+Number(n||0),0);
    const badge = $('#cartCount'); if (badge) badge.textContent = String(count);
    renderSummary();
    toast('Item removed. Order total updated.');
  }

  function setMode(mode) {
    state.mode = mode;
    state.loggedIn = mode === 'login' ? state.loggedIn : false;
    $$('[data-checkout-mode]').forEach(button => {
      const active = button.dataset.checkoutMode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    $$('[data-auth-panel]').forEach(panel => panel.classList.toggle('is-active', panel.dataset.authPanel === mode));
    validateCheckout();
  }

  function requiredFieldsValid(selector) {
    return $$(selector).every(input => {
      const valid = String(input.value || '').trim() !== '' && (input.type !== 'email' || input.checkValidity());
      input.closest('.checkout-field')?.classList.toggle('has-error', false);
      return valid;
    });
  }

  function customerReady() {
    if (!requiredFieldsValid('[data-billing-required]')) return false;
    if ($('#shipDifferent')?.checked && !requiredFieldsValid('[data-shipping-required]')) return false;
    if (state.mode === 'login' && !state.loggedIn) return false;
    if (state.mode === 'create') {
      const a = $('#newPassword')?.value || '';
      const b = $('#confirmPassword')?.value || '';
      if (a.length < 6 || a !== b) return false;
    }
    return true;
  }

  function validateCheckout() {
    const ready = customerReady();
    const options = $('#checkoutFinalOptions');
    if (options) options.classList.toggle('is-ready', ready && cartEntries().length > 0);
    const button = $('#placeOrderBtn');
    const allSet = ready && !!state.shippingMethod && !!state.paymentMethod && cartEntries().length > 0;
    if (button) button.disabled = !allSet;
    const gate = $('#checkoutGateText');
    if (gate) gate.textContent = allSet ? 'Everything is ready. You can place your order.' : 'Complete customer information, shipping and payment to continue.';
  }

  function fillCustomer(customer) {
    const map = {
      billingFirst: customer.first_name,
      billingLast: customer.last_name,
      billingEmail: customer.email,
      billingPhone: customer.phone,
      billingAddress: customer.address,
      billingDistrict: customer.district,
      billingPostcode: customer.postcode
    };
    Object.entries(map).forEach(([id,value]) => { const el = document.getElementById(id); if (el) el.value = value || ''; });
  }

  async function login() {
    const email = $('#loginEmail')?.value.trim();
    const password = $('#loginPassword')?.value || '';
    const status = $('#checkoutLoginStatus');
    const button = $('#checkoutLoginBtn');
    if (!email || !password) {
      status.textContent = 'Enter your email and password.';
      status.className = 'checkout-login-status is-error';
      return;
    }
    button.disabled = true;
    status.textContent = 'Signing in…';
    status.className = 'checkout-login-status';
    try {
      const response = await fetch('backend-examples/php/checkout-login.php', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Accept':'application/json'},
        body: JSON.stringify({email,password})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || 'Login failed');
      state.loggedIn = true;
      state.customer = data.customer;
      fillCustomer(data.customer);
      status.textContent = `Welcome back, ${data.customer.first_name}. Your saved details were loaded.`;
      status.className = 'checkout-login-status is-success';
      validateCheckout();
    } catch (error) {
      state.loggedIn = false;
      status.textContent = `${error.message}. Demo: customer@example.com / demo123`;
      status.className = 'checkout-login-status is-error';
      validateCheckout();
    } finally {
      button.disabled = false;
    }
  }

  function submitOrder() {
    if (!customerReady() || !state.shippingMethod || !state.paymentMethod || !cartEntries().length) return;
    toast('Checkout is valid and ready to connect to your order API.');
  }

  function bindCheckout() {
    $$('[data-checkout-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.checkoutMode)));
    $('#checkoutLoginBtn')?.addEventListener('click', login);
    $('#shipDifferent')?.addEventListener('change', e => {
      $('#shippingAddressWrap')?.classList.toggle('is-open', e.target.checked);
      validateCheckout();
    });
    document.addEventListener('input', e => {
      if (e.target.closest('#billingFields,#shippingAddressWrap,[data-auth-panel="create"]')) validateCheckout();
    });
    document.addEventListener('change', e => {
      if (e.target.closest('#billingFields,#shippingAddressWrap')) validateCheckout();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderPage, {once:true});
  else renderPage();
})();
