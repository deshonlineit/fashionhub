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
  const byId = id => products.find(p => Number(p.id) === Number(id));
  const readCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch (_) { return {}; } };
  const writeCart = cart => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (_) {} };

  const state = {
    mode: 'login',
    loggedIn: false,
    customer: null,
    shippingMethod: '',
    paymentMethod: ''
  };

  function cartEntries() {
    return Object.entries(readCart()).map(([id,qty]) => ({product:byId(id),qty:Number(qty)})).filter(x => x.product && x.qty > 0);
  }
  function subtotal() { return cartEntries().reduce((sum,x)=>sum + x.product.price * x.qty,0); }
  function shippingCost() {
    if (!state.shippingMethod) return 0;
    if (state.shippingMethod === 'standard') return subtotal() >= 3000 ? 0 : 120;
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
    setTimeout(()=>el.remove(),2800);
  }
  async function jsonFetch(url, options = {}) {
    const response = await fetch(url, {credentials:'same-origin', ...options});
    const data = await response.json().catch(()=>({}));
    if (!response.ok || !data.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  function customerName(customer) {
    return customer?.display_name || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || customer?.email || 'Customer';
  }
  function initials(customer) {
    const name = customerName(customer).split(/\s+/).filter(Boolean);
    return (name[0]?.[0] || 'C') + (name[1]?.[0] || '');
  }

  function authMarkup() {
    if (state.loggedIn && state.customer) {
      return `<section class="checkout-card checkout-signed-card">
        <div class="checkout-signed-in">
          <span class="checkout-signed-avatar">${esc(initials(state.customer).toUpperCase())}</span>
          <div><small>Logged in as</small><b>${esc(customerName(state.customer))}</b><span>${esc(state.customer.email || '')}</span></div>
          <button type="button" class="checkout-logout-btn" data-checkout-logout>Log out</button>
        </div>
      </section>`;
    }

    return `<section class="checkout-card">
      <div class="checkout-auth-tabs" role="tablist" aria-label="Checkout account option">
        <button class="checkout-auth-tab${state.mode==='login'?' is-active':''}" type="button" data-checkout-mode="login" role="tab" aria-selected="${state.mode==='login'}">Login</button>
        <button class="checkout-auth-tab${state.mode==='create'?' is-active':''}" type="button" data-checkout-mode="create" role="tab" aria-selected="${state.mode==='create'}">Create new account</button>
        <button class="checkout-auth-tab${state.mode==='guest'?' is-active':''}" type="button" data-checkout-mode="guest" role="tab" aria-selected="${state.mode==='guest'}">Guest checkout</button>
      </div>
      <div class="checkout-auth-panel${state.mode==='login'?' is-active':''}" data-auth-panel="login">
        <div class="checkout-login-grid">
          <div class="checkout-field"><label for="loginEmail">Email address</label><input id="loginEmail" type="email" autocomplete="username" placeholder="you@example.com"></div>
          <div class="checkout-field"><label for="loginPassword">Password</label><input id="loginPassword" type="password" autocomplete="current-password" placeholder="Password"></div>
          <button class="checkout-login-btn" id="checkoutLoginBtn" type="button">Login</button>
          <p class="checkout-login-status" id="checkoutLoginStatus">Login to automatically load your saved customer and address details.</p>
        </div>
      </div>
      <div class="checkout-auth-panel${state.mode==='create'?' is-active':''}" data-auth-panel="create">
        <p class="checkout-account-note">Fill the customer fields below, choose a password, then shipping and payment will unlock automatically.</p>
        <div class="checkout-form-grid checkout-password-grid">
          <div class="checkout-field"><label for="newPassword">Create password</label><input id="newPassword" type="password" autocomplete="new-password" minlength="6" placeholder="Minimum 6 characters"></div>
          <div class="checkout-field"><label for="confirmPassword">Confirm password</label><input id="confirmPassword" type="password" autocomplete="new-password" minlength="6" placeholder="Repeat password"></div>
        </div>
      </div>
      <div class="checkout-auth-panel${state.mode==='guest'?' is-active':''}" data-auth-panel="guest">
        <p class="checkout-account-note">Continue without creating an account. Your details are used only for this checkout.</p>
      </div>
    </section>`;
  }

  function customerMarkup() {
    return `<section class="checkout-card">
      <h2>Customer information</h2>
      <div class="checkout-form-grid" id="billingFields">
        <div class="checkout-field"><label for="billingFirst">First name</label><input id="billingFirst" data-billing-required autocomplete="given-name" placeholder="First name"></div>
        <div class="checkout-field"><label for="billingLast">Last name</label><input id="billingLast" data-billing-required autocomplete="family-name" placeholder="Last name"></div>
        <div class="checkout-field"><label for="billingEmail">Email address</label><input id="billingEmail" data-billing-required type="email" autocomplete="email" placeholder="you@example.com"></div>
        <div class="checkout-field"><label for="billingPhone">Phone number</label><input id="billingPhone" data-billing-required type="tel" autocomplete="tel" placeholder="01XXXXXXXXX"></div>
        <div class="checkout-field checkout-field--full"><label for="billingAddress">Street address</label><input id="billingAddress" data-billing-required autocomplete="street-address" placeholder="House, road, area"></div>
        <div class="checkout-field"><label for="billingDistrict">District</label><select id="billingDistrict" data-billing-required autocomplete="address-level1"><option value="">Select district</option><option>Dhaka</option><option>Chattogram</option><option>Sylhet</option><option>Rajshahi</option><option>Khulna</option><option>Barishal</option><option>Rangpur</option><option>Mymensingh</option></select></div>
        <div class="checkout-field"><label for="billingPostcode">Postcode <small>(optional)</small></label><input id="billingPostcode" autocomplete="postal-code" placeholder="Postcode"></div>
      </div>
      <label class="ship-different"><input id="shipDifferent" type="checkbox"> Ship to a different address</label>
      <div class="checkout-shipping-address" id="shippingAddressWrap">
        <h3>Shipping address</h3>
        <div class="checkout-form-grid">
          <div class="checkout-field"><label for="shippingFirst">First name</label><input id="shippingFirst" data-shipping-required placeholder="First name"></div>
          <div class="checkout-field"><label for="shippingLast">Last name</label><input id="shippingLast" data-shipping-required placeholder="Last name"></div>
          <div class="checkout-field checkout-field--full"><label for="shippingAddress">Street address</label><input id="shippingAddress" data-shipping-required placeholder="House, road, area"></div>
          <div class="checkout-field"><label for="shippingDistrict">District</label><select id="shippingDistrict" data-shipping-required><option value="">Select district</option><option>Dhaka</option><option>Chattogram</option><option>Sylhet</option><option>Rajshahi</option><option>Khulna</option><option>Barishal</option><option>Rangpur</option><option>Mymensingh</option></select></div>
          <div class="checkout-field"><label for="shippingPostcode">Postcode <small>(optional)</small></label><input id="shippingPostcode" placeholder="Postcode"></div>
        </div>
      </div>
    </section>`;
  }

  function renderPage() {
    const root = $('#pageRoot');
    if (!root) return;
    root.innerHTML = `<div class="page-shell">
      <nav class="page-crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a>${icon('chevron-right')}<a href="cart.html">Cart</a>${icon('chevron-right')}<span>Checkout</span></nav>
      <div class="page-titlebar"><div><h1>Secure Checkout</h1><p>Confirm your account and address, then choose shipping and payment.</p></div><div class="page-titlebar__meta"><span class="soft-pill">${icon('shield')} Secure checkout</span></div></div>
      <div class="checkout-shell"><div class="checkout-left">${authMarkup()}${customerMarkup()}</div><aside class="checkout-summary" id="checkoutSummary"></aside></div>
    </div>`;
    fillCustomer(state.customer);
    renderSummary();
    document.body.classList.add('checkout-ready');
    validateCheckout();
  }

  function renderSummary() {
    const wrap = $('#checkoutSummary');
    if (!wrap) return;
    const entries = cartEntries();
    const sub = subtotal();
    const ship = shippingCost();
    const total = sub + ship;
    const itemCount = entries.reduce((s,x)=>s+x.qty,0);

    wrap.innerHTML = `<div class="checkout-summary__head"><h2>Order summary</h2><span>${itemCount} item${itemCount===1?'':'s'}</span></div>
      ${entries.length ? `<div class="checkout-order-items">${entries.map(({product:p,qty})=>`<article class="checkout-order-item" data-checkout-item="${p.id}"><img src="${esc(p.image)}" alt="${esc(p.name)}"><div class="checkout-order-item__copy"><b>${esc(p.name)}</b><small>Qty ${qty} · ${esc(p.category)}</small></div><strong>${money(p.price*qty)}</strong><button class="checkout-remove" type="button" data-checkout-remove="${p.id}" aria-label="Remove ${esc(p.name)}">${icon('close')}</button></article>`).join('')}</div>` : `<div class="checkout-empty">${icon('cart')}<h3>Your cart is empty</h3><p>Add products before continuing to checkout.</p><a class="primary-button" href="shop.html">Continue shopping</a></div>`}
      <div class="checkout-summary__totals"><div class="checkout-total-line"><span>Subtotal</span><b>${money(sub)}</b></div><div class="checkout-total-line"><span>Shipping</span><b>${state.shippingMethod ? (ship ? money(ship) : 'Free') : '—'}</b></div><div class="checkout-total-line checkout-total-line--grand"><span>Total</span><b>${money(total)}</b></div></div>
      <div class="checkout-final-options" id="checkoutFinalOptions">
        <h3>Shipping method</h3>
        <select id="checkoutShippingMethod" aria-label="Shipping method"><option value="">Select shipping</option><option value="standard" ${state.shippingMethod==='standard'?'selected':''}>Standard delivery — ${sub>=3000?'Free':'৳120'}</option><option value="express" ${state.shippingMethod==='express'?'selected':''}>Express delivery — ৳220</option><option value="pickup" ${state.shippingMethod==='pickup'?'selected':''}>Store pickup — Free</option></select>
        <h3>Payment gateway</h3>
        <div class="checkout-payment-list"><label class="checkout-payment"><input type="radio" name="checkoutPayment" value="cod" ${state.paymentMethod==='cod'?'checked':''}><span><b>Cash on Delivery</b><small>Eligible physical products</small></span>${icon('box')}</label><label class="checkout-payment"><input type="radio" name="checkoutPayment" value="mobile" ${state.paymentMethod==='mobile'?'checked':''}><span><b>bKash / Nagad</b><small>Mobile payment gateway</small></span>${icon('phone')}</label><label class="checkout-payment"><input type="radio" name="checkoutPayment" value="card" ${state.paymentMethod==='card'?'checked':''}><span><b>Credit / Debit Card</b><small>Visa and Mastercard</small></span>${icon('shield')}</label></div>
        <div class="checkout-gate" id="checkoutGateText">Complete customer information to unlock shipping and payment.</div>
        <button class="checkout-submit" id="placeOrderBtn" type="button" disabled>Place order</button>
        <p class="checkout-lock-note">${icon('shield')} The button unlocks when address, shipping and payment are complete.</p>
      </div>`;
    validateCheckout();
  }

  function fillCustomer(customer) {
    if (!customer) return;
    const map = {
      billingFirst:customer.first_name,
      billingLast:customer.last_name,
      billingEmail:customer.email,
      billingPhone:customer.phone,
      billingAddress:customer.address,
      billingDistrict:customer.district,
      billingPostcode:customer.postcode,
      shippingFirst:customer.shipping_first_name,
      shippingLast:customer.shipping_last_name,
      shippingAddress:customer.shipping_address,
      shippingDistrict:customer.shipping_district,
      shippingPostcode:customer.shipping_postcode
    };
    Object.entries(map).forEach(([id,value])=>{ const el=document.getElementById(id); if(el && value != null) el.value=value; });
  }

  function validFields(selector) {
    return $$(selector).every(input => {
      const value = String(input.value || '').trim();
      const valid = value !== '' && (input.type !== 'email' || input.checkValidity());
      input.closest('.checkout-field')?.classList.toggle('has-error', !valid && document.activeElement !== input);
      return valid;
    });
  }

  function customerReady() {
    if (!validFields('[data-billing-required]')) return false;
    if ($('#shipDifferent')?.checked && !validFields('[data-shipping-required]')) return false;
    if (state.loggedIn) return true;
    if (state.mode === 'login') return false;
    if (state.mode === 'guest') return true;
    if (state.mode === 'create') {
      const a = $('#newPassword')?.value || '';
      const b = $('#confirmPassword')?.value || '';
      return a.length >= 6 && a === b;
    }
    return false;
  }

  function validateCheckout() {
    const ready = customerReady() && cartEntries().length > 0;
    const options = $('#checkoutFinalOptions');
    options?.classList.toggle('is-ready', ready);
    const allSet = ready && !!state.shippingMethod && !!state.paymentMethod;
    const button = $('#placeOrderBtn');
    if (button) button.disabled = !allSet;
    const gate = $('#checkoutGateText');
    if (gate) gate.textContent = allSet ? 'Everything is ready. You can place your order.' : ready ? 'Choose a shipping method and payment gateway.' : (state.mode==='login' && !state.loggedIn ? 'Login first, or choose Create new account / Guest checkout.' : 'Complete the required customer information to continue.');
  }

  function setMode(mode) {
    if (state.loggedIn) return;
    state.mode = mode;
    $$('[data-checkout-mode]').forEach(button=>{
      const active = button.dataset.checkoutMode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    $$('[data-auth-panel]').forEach(panel=>panel.classList.toggle('is-active',panel.dataset.authPanel===mode));
    validateCheckout();
  }

  function removeItem(id) {
    const cart = readCart();
    delete cart[id];
    writeCart(cart);
    const badge = $('#cartCount');
    if (badge) badge.textContent = String(Object.values(cart).reduce((s,n)=>s+Number(n||0),0));
    renderSummary();
    toast('Item removed. Order total updated.');
  }

  async function login() {
    const email = $('#loginEmail')?.value.trim();
    const password = $('#loginPassword')?.value || '';
    const status = $('#checkoutLoginStatus');
    const button = $('#checkoutLoginBtn');
    if (!email || !password) {
      if (status) { status.textContent='Enter your email and password.'; status.className='checkout-login-status is-error'; }
      return;
    }
    if (button) button.disabled = true;
    if (status) { status.textContent='Signing in…'; status.className='checkout-login-status'; }
    try {
      const data = await jsonFetch('backend-examples/php/checkout-login.php',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({email,password})});
      state.loggedIn = true;
      state.customer = data.customer;
      state.mode = 'login';
      renderPage();
      toast(`Welcome back, ${customerName(data.customer)}.`);
    } catch (error) {
      if (status) { status.textContent=`${error.message}. Demo: customer@example.com / demo123`; status.className='checkout-login-status is-error'; }
    } finally {
      if (button && document.body.contains(button)) button.disabled = false;
    }
  }

  async function logout() {
    try { await jsonFetch('backend-examples/php/customer-logout.php',{method:'POST'}); } catch (_) {}
    state.loggedIn = false;
    state.customer = null;
    state.mode = 'login';
    renderPage();
    toast('You are now logged out.');
  }

  function checkoutCustomerPayload() {
    return {
      first_name:$('#billingFirst')?.value.trim() || '',
      last_name:$('#billingLast')?.value.trim() || '',
      email:$('#billingEmail')?.value.trim() || '',
      phone:$('#billingPhone')?.value.trim() || '',
      address:$('#billingAddress')?.value.trim() || '',
      district:$('#billingDistrict')?.value || '',
      postcode:$('#billingPostcode')?.value.trim() || '',
      shipping_first_name:$('#shippingFirst')?.value.trim() || '',
      shipping_last_name:$('#shippingLast')?.value.trim() || '',
      shipping_address:$('#shippingAddress')?.value.trim() || '',
      shipping_district:$('#shippingDistrict')?.value || '',
      shipping_postcode:$('#shippingPostcode')?.value.trim() || ''
    };
  }

  async function submitOrder() {
    if (!customerReady() || !state.shippingMethod || !state.paymentMethod || !cartEntries().length) return;
    const button = $('#placeOrderBtn');
    if (button) { button.disabled=true; button.textContent='Processing…'; }
    try {
      if (!state.loggedIn && state.mode === 'create') {
        const payload = {...checkoutCustomerPayload(),password:$('#newPassword')?.value || ''};
        const data = await jsonFetch('backend-examples/php/customer-register.php',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
        state.loggedIn = true;
        state.customer = data.customer;
        state.mode = 'login';
      }
      toast('Checkout is complete and ready to connect to your order API.');
      if (state.loggedIn) setTimeout(()=>renderPage(),500);
    } catch (error) {
      toast(error.message || 'Could not complete checkout.');
      validateCheckout();
    }
  }

  function bind() {
    document.addEventListener('click', e => {
      const mode = e.target.closest('[data-checkout-mode]');
      if (mode) { setMode(mode.dataset.checkoutMode); return; }
      if (e.target.closest('#checkoutLoginBtn')) { login(); return; }
      if (e.target.closest('[data-checkout-logout]')) { logout(); return; }
      const remove = e.target.closest('[data-checkout-remove]');
      if (remove) { removeItem(remove.dataset.checkoutRemove); return; }
      if (e.target.closest('#placeOrderBtn')) { submitOrder(); return; }
    });
    document.addEventListener('input', e => {
      if (e.target.closest('#billingFields,#shippingAddressWrap,[data-auth-panel="create"]')) validateCheckout();
    });
    document.addEventListener('change', e => {
      if (e.target.id === 'shipDifferent') {
        $('#shippingAddressWrap')?.classList.toggle('is-open', e.target.checked);
        if (e.target.checked && state.customer) fillCustomer(state.customer);
        validateCheckout();
        return;
      }
      if (e.target.id === 'checkoutShippingMethod') {
        state.shippingMethod = e.target.value;
        renderSummary();
        return;
      }
      if (e.target.name === 'checkoutPayment') {
        state.paymentMethod = e.target.value;
        validateCheckout();
        return;
      }
      if (e.target.closest('#billingFields,#shippingAddressWrap')) validateCheckout();
    });
  }

  async function init() {
    bind();
    try {
      const session = await jsonFetch('backend-examples/php/customer-session.php');
      state.loggedIn = !!session.logged_in;
      state.customer = session.customer || null;
    } catch (_) {
      state.loggedIn = false;
      state.customer = null;
    }
    renderPage();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();