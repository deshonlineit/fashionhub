(() => {
  'use strict';

  if (document.body.dataset.page !== 'account') return;

  const $ = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => Array.from(r.querySelectorAll(s));
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const state = { loggedIn:false, customer:null, tab:'dashboard' };

  const orders = [
    {number:'#FH-20481',date:'Aug 28, 2026',status:'Delivered',total:'৳6,180',items:2},
    {number:'#FH-20452',date:'Aug 21, 2026',status:'Processing',total:'৳3,490',items:1},
    {number:'#FH-20398',date:'Aug 12, 2026',status:'Delivered',total:'৳2,490',items:1}
  ];
  const downloads = [
    {name:'Premium WordPress Shop Theme',expires:'Never',remaining:'Unlimited',file:'Theme package'},
    {name:'Advanced SEO Toolkit Plugin',expires:'Never',remaining:'Unlimited',file:'Plugin package'}
  ];

  async function jsonFetch(url, options = {}) {
    const response = await fetch(url,{credentials:'same-origin',...options});
    const data = await response.json().catch(()=>({}));
    if (!response.ok || !data.ok) throw new Error(data.message || 'Request failed');
    return data;
  }
  function customerName(c) { return c?.display_name || [c?.first_name,c?.last_name].filter(Boolean).join(' ') || c?.email || 'Customer'; }
  function initials(c) {
    const parts = customerName(c).split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || 'C') + (parts[1]?.[0] || '')).toUpperCase();
  }
  function breadcrumb() { return `<nav class="page-crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a>${icon('chevron-right')}<span>My account</span></nav>`; }
  function toast(message,type='success') {
    const region = $('#toastRegion');
    if (!region) return;
    const el = document.createElement('div');
    el.className = `toast account-toast account-toast--${type}`;
    el.textContent = message;
    region.append(el);
    setTimeout(()=>el.remove(),2800);
  }

  function authMarkup() {
    return `<div class="page-shell account-page-shell">${breadcrumb()}
      <div class="page-titlebar"><div><h1>My account</h1><p>Login to manage orders and addresses, or create a new customer account.</p></div></div>
      <div class="wc-auth-grid">
        <section class="wc-auth-card">
          <h2>Login</h2>
          <form id="accountLoginForm" class="wc-form">
            <label>Email address <span>*</span><input id="accountLoginEmail" type="email" required autocomplete="username"></label>
            <label>Password <span>*</span><input id="accountLoginPassword" type="password" required autocomplete="current-password"></label>
            <div class="wc-form-row"><button class="primary-button" type="submit">Log in</button><label class="wc-remember"><input type="checkbox"> Remember me</label></div>
            <p class="wc-form-message" id="accountLoginMessage">Demo login: customer@example.com / demo123</p>
          </form>
        </section>
        <section class="wc-auth-card">
          <h2>Register</h2>
          <form id="accountRegisterForm" class="wc-form">
            <div class="wc-form-two"><label>First name <span>*</span><input id="registerFirst" required autocomplete="given-name"></label><label>Last name <span>*</span><input id="registerLast" required autocomplete="family-name"></label></div>
            <label>Email address <span>*</span><input id="registerEmail" type="email" required autocomplete="email"></label>
            <label>Password <span>*</span><input id="registerPassword" type="password" required minlength="6" autocomplete="new-password"></label>
            <p class="wc-help">Your account will be created securely and you can complete addresses afterward.</p>
            <button class="primary-button" type="submit">Register</button>
            <p class="wc-form-message" id="accountRegisterMessage"></p>
          </form>
        </section>
      </div>
    </div>`;
  }

  function accountNav() {
    const items = [
      ['dashboard','Dashboard','grid'],
      ['orders','Orders','box'],
      ['downloads','Downloads','bolt'],
      ['addresses','Addresses','location'],
      ['details','Account details','user']
    ];
    return `<aside class="wc-account-nav">
      <div class="wc-account-user"><span class="wc-avatar">${esc(initials(state.customer))}</span><div><b>${esc(customerName(state.customer))}</b><small>${esc(state.customer?.email || '')}</small></div></div>
      <nav>${items.map(([key,label,ico])=>`<button type="button" class="wc-nav-item${state.tab===key?' is-active':''}" data-account-tab="${key}">${icon(ico)}<span>${label}</span>${icon('chevron-right')}</button>`).join('')}<button type="button" class="wc-nav-item wc-nav-logout" data-account-logout>${icon('return')}<span>Logout</span></button></nav>
    </aside>`;
  }

  function dashboardPanel() {
    const c = state.customer;
    return `<section class="wc-panel"><p class="wc-hello">Hello <strong>${esc(c.first_name || customerName(c))}</strong> <span>(not ${esc(c.first_name || customerName(c))}? <button type="button" data-account-logout>Log out</button>)</span></p><p>From your account dashboard you can view your <button type="button" class="wc-inline-link" data-account-tab="orders">recent orders</button>, manage your <button type="button" class="wc-inline-link" data-account-tab="addresses">shipping and billing addresses</button>, and edit your <button type="button" class="wc-inline-link" data-account-tab="details">password and account details</button>.</p>
      <div class="wc-dashboard-links"><button data-account-tab="orders">${icon('box')}<span><b>Orders</b><small>View order history</small></span>${icon('chevron-right')}</button><button data-account-tab="addresses">${icon('location')}<span><b>Addresses</b><small>Billing & shipping</small></span>${icon('chevron-right')}</button><button data-account-tab="details">${icon('user')}<span><b>Account details</b><small>Name, email & password</small></span>${icon('chevron-right')}</button></div>
    </section>`;
  }

  function ordersPanel() {
    return `<section class="wc-panel"><div class="wc-panel-head"><div><h2>Orders</h2><p>Your recent purchases and current order status.</p></div></div><div class="wc-table-wrap"><table class="wc-table"><thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead><tbody>${orders.map(o=>`<tr><td><strong>${o.number}</strong></td><td>${o.date}</td><td><span class="wc-status wc-status--${o.status.toLowerCase()}">${o.status}</span></td><td>${o.total} for ${o.items} item${o.items===1?'':'s'}</td><td><button class="wc-small-btn" type="button">View</button></td></tr>`).join('')}</tbody></table></div></section>`;
  }

  function downloadsPanel() {
    return `<section class="wc-panel"><div class="wc-panel-head"><div><h2>Downloads</h2><p>Your available digital products.</p></div></div><div class="wc-table-wrap"><table class="wc-table"><thead><tr><th>Product</th><th>Downloads remaining</th><th>Expires</th><th>Download</th></tr></thead><tbody>${downloads.map(d=>`<tr><td><strong>${esc(d.name)}</strong></td><td>${d.remaining}</td><td>${d.expires}</td><td><button class="wc-small-btn" type="button">${esc(d.file)}</button></td></tr>`).join('')}</tbody></table></div></section>`;
  }

  function addressText(type) {
    const c = state.customer || {};
    const shipping = type === 'shipping';
    const name = shipping ? [c.shipping_first_name,c.shipping_last_name].filter(Boolean).join(' ') : [c.first_name,c.last_name].filter(Boolean).join(' ');
    const address = shipping ? c.shipping_address : c.address;
    const district = shipping ? c.shipping_district : c.district;
    const postcode = shipping ? c.shipping_postcode : c.postcode;
    if (!name && !address && !district) return '<em>You have not set up this address yet.</em>';
    return [name,address,[district,postcode].filter(Boolean).join(' ')].filter(Boolean).map(esc).join('<br>');
  }

  function addressesPanel() {
    const c = state.customer || {};
    return `<section class="wc-panel"><div class="wc-panel-head"><div><h2>Addresses</h2><p>The following addresses are used by default on the checkout page.</p></div></div>
      <div class="wc-address-cards"><article><header><h3>Billing address</h3><button type="button" data-address-edit="billing">Edit</button></header><address>${addressText('billing')}</address></article><article><header><h3>Shipping address</h3><button type="button" data-address-edit="shipping">Edit</button></header><address>${addressText('shipping')}</address></article></div>
      <form id="addressForm" class="wc-edit-address" hidden>
        <div class="wc-panel-head"><div><h3 id="addressFormTitle">Edit address</h3></div><button type="button" class="wc-cancel-edit" data-address-cancel>Cancel</button></div>
        <input type="hidden" id="addressType" value="billing">
        <div class="wc-form-two"><label>First name <span>*</span><input id="addressFirst" required></label><label>Last name <span>*</span><input id="addressLast" required></label></div>
        <label>Street address <span>*</span><input id="addressStreet" required></label>
        <div class="wc-form-two"><label>District <span>*</span><input id="addressDistrict" required></label><label>Postcode<input id="addressPostcode"></label></div>
        <button class="primary-button" type="submit">Save address</button>
      </form>
    </section>`;
  }

  function detailsPanel() {
    const c = state.customer || {};
    return `<section class="wc-panel"><div class="wc-panel-head"><div><h2>Account details</h2><p>Update your name, display name, email address or password.</p></div></div><form id="accountDetailsForm" class="wc-account-form">
      <div class="wc-form-two"><label>First name <span>*</span><input id="detailFirst" required value="${esc(c.first_name || '')}"></label><label>Last name <span>*</span><input id="detailLast" required value="${esc(c.last_name || '')}"></label></div>
      <label>Display name <span>*</span><input id="detailDisplay" required value="${esc(c.display_name || customerName(c))}"><small>This is how your name will be displayed in the account section.</small></label>
      <label>Email address <span>*</span><input id="detailEmail" type="email" required value="${esc(c.email || '')}"></label>
      <fieldset><legend>Password change</legend><label>New password <small>(leave blank to keep current password)</small><input id="detailPassword" type="password" minlength="6" autocomplete="new-password"></label><label>Confirm new password<input id="detailPasswordConfirm" type="password" minlength="6" autocomplete="new-password"></label></fieldset>
      <button class="primary-button" type="submit">Save changes</button>
    </form></section>`;
  }

  function panelMarkup() {
    if (state.tab === 'orders') return ordersPanel();
    if (state.tab === 'downloads') return downloadsPanel();
    if (state.tab === 'addresses') return addressesPanel();
    if (state.tab === 'details') return detailsPanel();
    return dashboardPanel();
  }

  function accountMarkup() {
    return `<div class="page-shell account-page-shell">${breadcrumb()}<div class="page-titlebar"><div><h1>My account</h1><p>Manage orders, downloads, addresses and account information.</p></div></div><div class="wc-account-layout">${accountNav()}<main class="wc-account-content" id="accountContent">${panelMarkup()}</main></div></div>`;
  }

  function render() {
    const root = $('#pageRoot');
    if (!root) return;
    root.innerHTML = state.loggedIn && state.customer ? accountMarkup() : authMarkup();
    document.body.classList.add('account-ready');
  }

  async function login(form) {
    const email = $('#accountLoginEmail')?.value.trim() || '';
    const password = $('#accountLoginPassword')?.value || '';
    const msg = $('#accountLoginMessage');
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    if (msg) { msg.textContent='Signing in…'; msg.className='wc-form-message'; }
    try {
      const data = await jsonFetch('backend-examples/php/checkout-login.php',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({email,password})});
      state.loggedIn = true; state.customer = data.customer; state.tab='dashboard'; render(); toast('Welcome back.');
    } catch (error) {
      if (msg) { msg.textContent=error.message; msg.className='wc-form-message is-error'; }
    } finally { if (button && document.body.contains(button)) button.disabled=false; }
  }

  async function register(form) {
    const payload = {first_name:$('#registerFirst')?.value.trim()||'',last_name:$('#registerLast')?.value.trim()||'',email:$('#registerEmail')?.value.trim()||'',password:$('#registerPassword')?.value||'',phone:'',address:'',district:'',postcode:''};
    const msg = $('#accountRegisterMessage');
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled=true;
    try {
      if (!payload.first_name || !payload.last_name || !payload.email || payload.password.length < 6) throw new Error('Complete all required fields.');
      // Account-page registration starts with identity only; use safe placeholders and immediately open Account details/Addresses.
      payload.phone = 'Not set'; payload.address = 'Not set'; payload.district = 'Not set';
      const data = await jsonFetch('backend-examples/php/customer-register.php',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
      state.loggedIn=true; state.customer=data.customer; state.tab='details'; render(); toast('Account created. Add your address details next.');
    } catch (error) {
      if (msg) { msg.textContent=error.message; msg.className='wc-form-message is-error'; }
    } finally { if (button && document.body.contains(button)) button.disabled=false; }
  }

  async function logout() {
    try { await jsonFetch('backend-examples/php/customer-logout.php',{method:'POST'}); } catch (_) {}
    state.loggedIn=false; state.customer=null; state.tab='dashboard'; render(); toast('You have been logged out.');
  }

  function editAddress(type) {
    const form = $('#addressForm');
    if (!form) return;
    const c = state.customer || {};
    const shipping = type === 'shipping';
    $('#addressType').value = type;
    $('#addressFormTitle').textContent = shipping ? 'Edit shipping address' : 'Edit billing address';
    $('#addressFirst').value = shipping ? (c.shipping_first_name || '') : (c.first_name || '');
    $('#addressLast').value = shipping ? (c.shipping_last_name || '') : (c.last_name || '');
    $('#addressStreet').value = shipping ? (c.shipping_address || '') : (c.address || '');
    $('#addressDistrict').value = shipping ? (c.shipping_district || '') : (c.district || '');
    $('#addressPostcode').value = shipping ? (c.shipping_postcode || '') : (c.postcode || '');
    form.hidden = false;
    form.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  async function saveAddress(form) {
    const type = $('#addressType')?.value || 'billing';
    const shipping = type === 'shipping';
    const payload = shipping ? {
      shipping_first_name:$('#addressFirst').value.trim(),shipping_last_name:$('#addressLast').value.trim(),shipping_address:$('#addressStreet').value.trim(),shipping_district:$('#addressDistrict').value.trim(),shipping_postcode:$('#addressPostcode').value.trim()
    } : {
      first_name:$('#addressFirst').value.trim(),last_name:$('#addressLast').value.trim(),address:$('#addressStreet').value.trim(),district:$('#addressDistrict').value.trim(),postcode:$('#addressPostcode').value.trim()
    };
    try {
      const data = await jsonFetch('backend-examples/php/customer-profile.php',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
      state.customer=data.customer; render(); state.tab='addresses'; render(); toast('Address saved.');
    } catch (error) { toast(error.message,'error'); }
  }

  async function saveDetails(form) {
    const password = $('#detailPassword')?.value || '';
    const confirm = $('#detailPasswordConfirm')?.value || '';
    if (password && password !== confirm) { toast('New passwords do not match.','error'); return; }
    const payload = {first_name:$('#detailFirst').value.trim(),last_name:$('#detailLast').value.trim(),display_name:$('#detailDisplay').value.trim(),email:$('#detailEmail').value.trim(),new_password:password};
    try {
      const data = await jsonFetch('backend-examples/php/customer-profile.php',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
      state.customer=data.customer; render(); state.tab='details'; render(); toast('Account details saved.');
    } catch (error) { toast(error.message,'error'); }
  }

  function bind() {
    document.addEventListener('click', e => {
      const tab = e.target.closest('[data-account-tab]');
      if (tab) { state.tab=tab.dataset.accountTab; render(); return; }
      if (e.target.closest('[data-account-logout]')) { logout(); return; }
      const edit = e.target.closest('[data-address-edit]');
      if (edit) { editAddress(edit.dataset.addressEdit); return; }
      if (e.target.closest('[data-address-cancel]')) { const form=$('#addressForm'); if(form) form.hidden=true; }
    });
    document.addEventListener('submit', e => {
      if (e.target.id === 'accountLoginForm') { e.preventDefault(); login(e.target); }
      if (e.target.id === 'accountRegisterForm') { e.preventDefault(); register(e.target); }
      if (e.target.id === 'addressForm') { e.preventDefault(); saveAddress(e.target); }
      if (e.target.id === 'accountDetailsForm') { e.preventDefault(); saveDetails(e.target); }
    });
  }

  async function init() {
    bind();
    try {
      const data = await jsonFetch('backend-examples/php/customer-session.php');
      state.loggedIn=!!data.logged_in; state.customer=data.customer || null;
    } catch (_) { state.loggedIn=false; state.customer=null; }
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();