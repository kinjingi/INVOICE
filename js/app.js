/* ════════════════════════════════════════════════
   PADOWA Healthcare – App Router & Navigation
   Toast, Page switching, Keyboard shortcuts, Reports
════════════════════════════════════════════════ */

// ── Toast System ──────────────────────────────
const AppToast = {
  show(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = { success:'check_circle', error:'error', warning:'warning', info:'info' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="material-icons-outlined toast-icon">${icons[type] || 'info'}</span>
      <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4200);
  },
};

// ── Customer Add Modal ─────────────────────────
function openCustomerAddModal() {
  // Set next auto-generated customer code
  const nextNum = PH_DATA.customers.length + 1;
  const codeEl  = document.getElementById('nc_code');
  if (codeEl) codeEl.value = 'C' + String(nextNum).padStart(3, '0');

  // Live GSTIN validation hint
  const gstinEl = document.getElementById('nc_gstin');
  const hint    = document.getElementById('nc_gstin_hint');
  if (gstinEl && hint) {
    gstinEl.oninput = () => {
      const val = gstinEl.value.trim();
      if (!val) { hint.textContent = ''; return; }
      const re = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (re.test(val)) {
        hint.textContent = '✓ Valid GSTIN';
        hint.style.color = 'var(--success)';
      } else if (val.length < 15) {
        hint.textContent = val.length + '/15 chars';
        hint.style.color = 'var(--text-muted)';
      } else {
        hint.textContent = '⚠ Invalid GSTIN format';
        hint.style.color = 'var(--danger)';
      }
    };
  }

  document.getElementById('customerAddModal').classList.add('is-open');
}

function syncStateCode() {
  const stateEl = document.getElementById('nc_state');
  const codeEl  = document.getElementById('nc_state_code');
  if (!stateEl || !codeEl) return;
  const parts = stateEl.value.split('|');
  codeEl.value = parts[1] || '';
}

function resetCustomerAddForm() {
  ['nc_name','nc_gstin','nc_dl','nc_fssai','nc_contact','nc_phone','nc_email','nc_address','nc_city','nc_pincode']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const hint = document.getElementById('nc_gstin_hint');
  if (hint) hint.textContent = '';
  const stateEl = document.getElementById('nc_state');
  if (stateEl) stateEl.value = 'Karnataka|29';
  syncStateCode();
  const d = document.getElementById('nc_credit_days');  if (d) d.value = '30';
  const l = document.getElementById('nc_credit_limit'); if (l) l.value = '100000';
  const o = document.getElementById('nc_outstanding');  if (o) o.value = '0';
  const t = document.getElementById('nc_type');         if (t) t.value = 'B2B';
  const pt = document.getElementById('nc_payment_type'); if (pt) pt.value = 'Credit';
  const nextNum = PH_DATA.customers.length + 1;
  const c = document.getElementById('nc_code');
  if (c) c.value = 'C' + String(nextNum).padStart(3, '0');
}

// ── Products Master ──────────────────────────────────
window.renderProductsMaster = function() {
  const tbody = document.getElementById('productsTbody');
  const countEl = document.getElementById('productsCount');
  if (!tbody) return;

  const searchTerm = (document.getElementById('productsSearchInput')?.value || '').toLowerCase();

  const filtered = PH_DATA.products.filter(p => {
    return p.name.toLowerCase().includes(searchTerm) ||
           p.code.toLowerCase().includes(searchTerm) ||
           (p.composition && p.composition.toLowerCase().includes(searchTerm));
  });

  tbody.innerHTML = '';
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:40px; color:var(--text-muted);">No products found. Add a product to get started.</td></tr>`;
    if(countEl) countEl.textContent = `0 products`;
    return;
  }

  const formatCurrency = val => '₹ ' + parseFloat(val||0).toLocaleString('en-IN', {minimumFractionDigits:2});

  filtered.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:var(--font-mono); font-weight:600; color:var(--primary);">${p.code}</td>
      <td>
        <div style="font-weight:600; color:var(--text-dark);">${p.name}</div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
          ${p.composition ? p.composition : 'No composition specified'}
        </div>
      </td>
      <td>${p.pack}</td>
      <td class="text-right" style="font-weight:600; color:var(--primary);">
        ${p.stock !== undefined ? p.stock : 100}
      </td>
      <td class="text-right">${formatCurrency(p.mrp)}</td>
      <td class="text-right" style="font-weight:600;">${formatCurrency(p.rate || p.pts)}</td>
      <td class="text-center">
        <span style="background:var(--bg-light); padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600;">${p.gst}%</span>
      </td>
      <td class="text-center">
        <button class="btn btn-outline btn-sm" onclick="AppToast.show('Edit product disabled in demo','info')" style="padding:4px 8px; margin-right:4px;" title="Edit">
          <span class="material-icons-outlined" style="font-size:16px;">edit</span>
        </button>
        <button class="btn btn-outline btn-sm" onclick="deleteProduct('${p.code}')" style="padding:4px 8px; color:var(--danger); border-color:var(--danger);" title="Delete">
          <span class="material-icons-outlined" style="font-size:16px;">delete</span>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if(countEl) countEl.textContent = `${filtered.length} products`;
};

window.openProductAddModal = function() {
  resetProductAddForm();
  document.getElementById('productAddModal').classList.add('is-open');
  setTimeout(() => document.getElementById('np_name')?.focus(), 100);
};

window.resetProductAddForm = function() {
  document.getElementById('productAddForm')?.reset();
  const nextNum = PH_DATA.products.length + 1;
  const c = document.getElementById('np_code');
  if (c) c.value = 'PRD' + String(nextNum).padStart(3, '0');
};

window.saveNewProduct = function() {
  const nameInput = document.getElementById('np_name');
  const codeInput = document.getElementById('np_code');
  const packInput = document.getElementById('np_pack');
  const mrpInput = document.getElementById('np_mrp');
  const ptrInput = document.getElementById('np_ptr');
  const rateInput = document.getElementById('np_rate');
  const gstInput = document.getElementById('np_gst');

  if (!nameInput.value.trim() || !codeInput.value.trim()) {
    AppToast.show('Please fill the required Product Name and Item Code.', 'error');
    return;
  }

  const newProduct = {
    code: codeInput.value.trim(),
    name: nameInput.value.trim(),
    composition: document.getElementById('np_composition')?.value || '',
    manufacturer: document.getElementById('np_manufacturer')?.value || '',
    strength: document.getElementById('np_strength')?.value || '',
    dosageForm: document.getElementById('np_dosageForm')?.value || 'Tablets',
    pack: packInput.value.trim(),
    category: document.getElementById('np_category')?.value || 'General',
    hsn: document.getElementById('np_hsn')?.value || '30049099',
    gst: parseFloat(gstInput.value) || 12,
    mrp: parseFloat(mrpInput.value) || 0,
    ptr: parseFloat(ptrInput.value) || 0,
    rate: parseFloat(rateInput.value) || 0, // PTS
    stock: 100 // Default stock
  };

  PH_DATA.products.unshift(newProduct);
  
  if (typeof window.saveProductToDB === 'function') {
    window.saveProductToDB(newProduct);
  }

  document.getElementById('productAddModal').classList.remove('is-open');
  AppToast.show('✓ Product "' + newProduct.name + '" added successfully!', 'success');
  
  if (typeof window.renderProductsMaster === 'function') {
    window.renderProductsMaster();
  }
};

window.deleteProduct = function(code) {
  if (confirm('Are you sure you want to delete this product?')) {
    PH_DATA.products = PH_DATA.products.filter(p => p.code !== code);
    if (typeof window.deleteProductFromDB === 'function') {
      window.deleteProductFromDB(code);
    }
    window.renderProductsMaster();
    AppToast.show('Product deleted.', 'info');
  }
};

document.getElementById('productsSearchInput')?.addEventListener('input', window.renderProductsMaster);

function saveNewCustomer() {
  const get = id => (document.getElementById(id)?.value || '').trim();

  const name     = get('nc_name');
  const dl       = get('nc_dl');
  const contact  = get('nc_contact');
  const phone    = get('nc_phone');
  const address  = get('nc_address');
  let shippingAddress = get('nc_shipping_address');
  if (document.getElementById('nc_same_shipping')?.checked || !shippingAddress) {
    shippingAddress = address;
  }
  const city     = get('nc_city');
  const pincode  = get('nc_pincode');
  const stateEl  = document.getElementById('nc_state');
  const parts    = (stateEl?.value || 'Karnataka|29').split('|');
  const stateName = parts[0] || 'Karnataka';
  const stateCode = parts[1] || '29';

  // Required validations
  if (!name) {
    AppToast.show('Customer name is required', 'error');
    document.getElementById('nc_name')?.focus(); return;
  }
  if (!dl) {
    AppToast.show('Drug License number is required', 'error');
    document.getElementById('nc_dl')?.focus(); return;
  }
  if (!contact) {
    AppToast.show('Contact person name is required', 'error');
    document.getElementById('nc_contact')?.focus(); return;
  }
  if (!phone || phone.replace(/\D/g,'').length < 10) {
    AppToast.show('Valid 10-digit phone number is required', 'error');
    document.getElementById('nc_phone')?.focus(); return;
  }
  if (!address) {
    AppToast.show('Address is required', 'error');
    document.getElementById('nc_address')?.focus(); return;
  }
  if (!city) {
    AppToast.show('City is required', 'error');
    document.getElementById('nc_city')?.focus(); return;
  }
  if (!stateEl?.value) {
    AppToast.show('Please select a state', 'error'); return;
  }
  if (!pincode || pincode.replace(/\D/g,'').length < 6) {
    AppToast.show('Valid 6-digit pincode is required', 'error');
    document.getElementById('nc_pincode')?.focus(); return;
  }

  // Duplicate name check
  if (PH_DATA.customers.find(c => c.name.toLowerCase() === name.toLowerCase() && c.phone === phone)) {
    AppToast.show('A customer with this name and phone number already exists', 'warning');
    return;
  }

  // Build and add customer
  const nextNum = PH_DATA.customers.length + 1;
  const code    = 'C' + String(nextNum).padStart(3, '0');

  const newCustomer = {
    id: code, code, name,
    gstin:       get('nc_gstin'),
    drugLicense: dl,
    fssai:       get('nc_fssai'),
    contact, phone,
    email:       get('nc_email'),
    address, shippingAddress, city,
    state:       stateName,
    stateCode,
    pincode,
    placeOfSupply: stateName,
    creditDays:  parseInt(document.getElementById('nc_credit_days')?.value)    || 30,
    creditLimit: parseFloat(document.getElementById('nc_credit_limit')?.value) || 100000,
    outstanding: parseFloat(document.getElementById('nc_outstanding')?.value)  || 0,
    status:      'verified',
    type:        document.getElementById('nc_type')?.value || 'B2B',
    paymentType: document.getElementById('nc_payment_type')?.value || 'Credit',
  };

  // Live update the master list
  PH_DATA.customers.push(newCustomer);
  if (typeof window.saveCustomerToDB === 'function') {
    window.saveCustomerToDB(newCustomer);
  }

  // Close modal
  document.getElementById('customerAddModal').classList.remove('is-open');

  // Auto-select the new customer in the invoice form
  if (typeof InvoiceModule !== 'undefined') {
    InvoiceModule.selectCustomerById(code);
  }

  AppToast.show('✓ Customer "' + name + '" added & selected!', 'success');
  setTimeout(resetCustomerAddForm, 300);
}

// ── App Router ────────────────────────────────
const App = (() => {

  const pages = [
    'dashboard', 'newInvoice', 'invoiceHistory',
    'drafts', 'cancelled', 'printQueue', 'reports', 'settings', 'customers', 'products'
  ];

  let currentPage = 'dashboard';

  function navigate(page) {
    if (!pages.includes(page)) return;

    // Hide all pages
    pages.forEach(p => {
      const el = document.getElementById('page-' + p);
      if (el) el.classList.remove('is-active');
    });

    // Deactivate nav items
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('is-active'));

    // Show target page
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('is-active');

    // Activate nav item
    const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navEl) navEl.classList.add('is-active');

    // Show/hide toolbar (only on new invoice)
    const toolbar = document.getElementById('invoiceToolbar');
    if (toolbar) toolbar.style.display = page === 'newInvoice' ? 'flex' : 'none';

    currentPage = page;

    // Page-specific init
    if (page === 'dashboard')       renderDashboard();
    if (page === 'invoiceHistory')  renderInvoiceHistory();
    if (page === 'drafts')          renderDrafts();
    if (page === 'cancelled')       renderCancelled();
    if (page === 'newInvoice')      InvoiceModule.init();
    if (page === 'reports')         Reports.init();
    if (page === 'printQueue')      renderPrintQueue();
    if (page === 'customers')       renderCustomersLedger();
    if (page === 'products')        renderProductsMaster();
  }

  function init() {
    // Nav item clicks
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.page));
    });

    // Header search
    const hs = document.getElementById('headerSearch');
    if (hs) hs.addEventListener('keydown', e => {
      if (e.key === 'Enter') { 
        const val = hs.value.trim().toLowerCase();
        if (!val) return;
        
        const custMatches = PH_DATA.customers.filter(c => 
          c.name.toLowerCase().includes(val) || 
          c.code.toLowerCase().includes(val) || 
          (c.phone && c.phone.includes(val)) || 
          (c.gstin && c.gstin.toLowerCase().includes(val))
        );
        
        if (custMatches.length > 0) {
            const csInput = document.getElementById('customersSearchInput');
            if (csInput) csInput.value = hs.value;
            navigate('customers');
            AppToast.show('Found in Customers Ledger', 'success');
        } else {
            navigate('invoiceHistory'); 
            AppToast.show('Searching Invoices: ' + hs.value, 'info'); 
        }
      }
    });

    // Print preview close
    const ppClose = document.getElementById('closePrintPreview');
    if (ppClose) ppClose.addEventListener('click', () => {
      document.getElementById('printPreviewModal').classList.remove('is-open');
    });

    const ppPrint = document.getElementById('doPrint');
    if (ppPrint) ppPrint.addEventListener('click', () => window.print());

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); navigate('newInvoice'); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault();
        if (currentPage === 'newInvoice') document.getElementById('toolSaveInvoice')?.click(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault();
        if (currentPage === 'newInvoice') document.getElementById('toolPrint')?.click(); }
      if (e.key === 'F2') navigate('newInvoice');
    });

    // Close print modal on overlay click
    document.getElementById('printPreviewModal')?.addEventListener('click', function(e) {
      if (e.target === this) this.classList.remove('is-open');
    });

    // Close customer add modal on overlay click
    document.getElementById('customerAddModal')?.addEventListener('click', function(e) {
      if (e.target === this) this.classList.remove('is-open');
    });

    // Wire the customer add button
    const openBtn = document.getElementById('openCustAddModal');
    if (openBtn) openBtn.onclick = openCustomerAddModal;

    // Default page
    navigate('dashboard');
  }

  return { navigate, init, getCurrentPage: () => currentPage };
})();

// ── Dashboard ─────────────────────────────────
function renderDashboard() {
  const stats = PH_DATA.getDashboardStats();

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setEl('dash-today-count',   stats.todayCount);
  setEl('dash-today-rev',     PH_DATA.formatCurrency(stats.todayRevenue));
  setEl('dash-pending',       PH_DATA.formatCurrency(stats.pendingPayments));
  setEl('dash-credit',        PH_DATA.formatCurrency(stats.creditSales));
  setEl('dash-cash',          PH_DATA.formatCurrency(stats.cashSales));
  setEl('dash-cancelled',     stats.cancelled);
  setEl('dash-gst',           PH_DATA.formatCurrency(stats.gstCollected));
  setEl('dash-avg',           PH_DATA.formatCurrency(stats.avgInvoice));

  renderActivityFeed();
  renderDashMiniChart();
  renderDashRecentInvoices();
}

function renderActivityFeed() {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;

  const activities = [
    { type:'success', text: '<strong>PH260700001</strong> — Apollo Pharmacy — ₹30,324 <span style="color:var(--success)">[PAID]</span>', time: '47 mins ago' },
    { type:'info',    text: 'New invoice <strong>PH260700002</strong> created for MedPlus — ₹69,872', time: '1 hr ago' },
    { type:'danger',  text: '<strong>PH260700006</strong> — Wellness Forever — CANCELLED', time: '3 hrs ago' },
    { type:'success', text: 'Payment received from <strong>Manipal Hospitals</strong> — ₹4,11,640', time: '5 hrs ago' },
    { type:'warning', text: 'Max Healthcare invoice pending — ₹1,53,088', time: 'Yesterday' },
    { type:'info',    text: 'Auto-backup completed successfully', time: '02:00 AM' },
    { type:'success', text: '<strong>Hetero Healthcare</strong> invoice paid via UPI — ₹19,683', time: 'Yesterday' },
  ];

  feed.innerHTML = activities.map(a => `
    <div class="activity-item">
      <div class="activity-dot ${a.type}"></div>
      <div>
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${a.time}</div>
      </div>
    </div>`).join('');
}

function renderDashMiniChart() {
  const chart = document.getElementById('dashMiniChart');
  if (!chart) return;

  const hours = ['9','10','11','12','13','14','15','16'];
  const vals  = [0, 12, 30, 18, 45, 28, 52, 20];
  const max   = Math.max(...vals);

  chart.innerHTML = hours.map((h, i) => `
    <div class="mini-bar-wrap">
      <div class="mini-bar" style="height:${max > 0 ? (vals[i]/max*100) : 4}%"></div>
      <span class="mini-bar-label">${h}</span>
    </div>`).join('');
}

function renderDashRecentInvoices() {
  const tbody = document.getElementById('dashRecentTbody');
  if (!tbody) return;

  const recent = PH_DATA.invoices.slice(0, 6);
  tbody.innerHTML = recent.map(inv => {
    const payMap = { Paid:'badge-success', Pending:'badge-warning', Partial:'badge-warning', Cancelled:'badge-danger' };
    return `<tr>
      <td class="mono"><a href="#" onclick="App.navigate('invoiceHistory')">${inv.number}</a></td>
      <td>${inv.date}</td>
      <td>${inv.custName}</td>
      <td><span class="badge badge-primary">${inv.paymentMode}</span></td>
      <td class="amount">${PH_DATA.formatNum(inv.taxable)}</td>
      <td class="amount">${PH_DATA.formatNum(inv.cgst + inv.sgst + inv.igst)}</td>
      <td class="amount total">${PH_DATA.formatNum(inv.grandTotal)}</td>
      <td><span class="badge ${payMap[inv.paymentStatus] || 'badge-neutral'}">${inv.paymentStatus}</span></td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn btn-outline btn-sm" onclick="AppToast.show('Opening invoice...','info')">View</button>
          <button class="btn btn-outline btn-sm" onclick="AppToast.show('Printing...','info')">Print</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── Invoice History ───────────────────────────
function renderInvoiceHistory(filter = 'all') {
  const tbody = document.getElementById('historyTbody');
  if (!tbody) return;

  let invoices = [...PH_DATA.invoices];

  if (filter === 'paid')      invoices = invoices.filter(i => i.paymentStatus === 'Paid');
  if (filter === 'pending')   invoices = invoices.filter(i => i.paymentStatus === 'Pending');
  if (filter === 'partial')   invoices = invoices.filter(i => i.paymentStatus === 'Partial');
  if (filter === 'cancelled') invoices = invoices.filter(i => i.status === 'cancelled');

  const payMap = { Paid:'badge-success', Pending:'badge-warning', Partial:'badge-warning', Cancelled:'badge-danger' };

  tbody.innerHTML = invoices.map(inv => `
    <tr>
      <td class="tbl-check"><input type="checkbox" class="row-checkbox"></td>
      <td class="mono"><strong>${inv.number}</strong></td>
      <td>${inv.date}</td>
      <td>${inv.time}</td>
      <td><strong>${inv.custName}</strong></td>
      <td><span class="badge badge-neutral">${inv.type || 'Tax Invoice'}</span></td>
      <td>${inv.exec || '—'}</td>
      <td class="text-center"><span class="badge badge-primary">${inv.paymentMode}</span></td>
      <td class="text-center">${inv.items}</td>
      <td class="amount">${PH_DATA.formatNum(inv.taxable)}</td>
      <td class="amount">${PH_DATA.formatNum(inv.cgst + inv.sgst + inv.igst)}</td>
      <td class="amount total">${PH_DATA.formatNum(inv.grandTotal)}</td>
      <td><span class="badge ${payMap[inv.paymentStatus] || 'badge-neutral'}">${inv.paymentStatus}</span></td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn btn-outline btn-sm" onclick="viewInvoice('${inv.number}')">View</button>
          <button class="btn btn-outline btn-sm" onclick="printInvoice('${inv.number}')">Print</button>
          <button class="btn btn-outline btn-sm btn-outline-danger" onclick="cancelInvoice('${inv.number}')" ${inv.status === 'cancelled' ? 'disabled' : ''}>Cancel</button>
          <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="deleteInvoice('${inv.number}')">Delete</button>
        </div>
      </td>
    </tr>`).join('');

  const countEl = document.getElementById('historyCount');
  if (countEl) countEl.textContent = invoices.length + ' invoices';
}

window.viewInvoice = function(invNumber) {
    AppToast.show('Opening preview for invoice ' + invNumber, 'info');
    window.open('preview.html?id=' + encodeURIComponent(invNumber), '_blank');
};

window.printInvoice = function(invNumber) {
    AppToast.show('Opening print view for invoice ' + invNumber, 'info');
    // Open the preview page and trigger print automatically
    const win = window.open('preview.html?id=' + encodeURIComponent(invNumber), '_blank');
    if (win) {
        win.onload = function() {
            setTimeout(() => { win.print(); }, 500);
        };
    }
};

window.cancelInvoice = function(invNumber) {
    const inv = PH_DATA.invoices.find(i => i.number === invNumber);
    if (inv && inv.status !== 'cancelled') {
        inv.status = 'cancelled';
        inv.paymentStatus = 'Cancelled';
        AppToast.show('Invoice ' + invNumber + ' has been cancelled', 'warning');
        renderInvoiceHistory();
        if(typeof renderDashRecentInvoices === 'function') renderDashRecentInvoices();
        if(typeof renderCancelled === 'function') renderCancelled();
    }
};

window.deleteInvoice = function(invNumber) {
    if(confirm('Are you sure you want to permanently delete invoice ' + invNumber + '?')) {
        PH_DATA.invoices = PH_DATA.invoices.filter(i => i.number !== invNumber);
        AppToast.show('Invoice ' + invNumber + ' deleted successfully', 'error');
        renderInvoiceHistory();
        if(typeof renderDashRecentInvoices === 'function') renderDashRecentInvoices();
        if(typeof renderCancelled === 'function') renderCancelled();
    }
};

// ── Drafts ────────────────────────────────────
function renderDrafts() {
  const tbody = document.getElementById('draftsTbody');
  if (!tbody) return;

  tbody.innerHTML = PH_DATA.drafts.map(d => `
    <tr>
      <td class="mono">${d.number}</td>
      <td>${d.date}</td>
      <td>${d.customer}</td>
      <td>${d.items}</td>
      <td><span class="badge badge-warning">Draft</span></td>
      <td style="color:var(--text-muted)">${d.lastSaved}</td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn btn-primary btn-sm" onclick="App.navigate('newInvoice');AppToast.show('Draft loaded','info')">
            <span class="material-icons-outlined">edit</span> Continue
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="AppToast.show('Draft deleted','error')">
            <span class="material-icons-outlined">delete</span>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

// ── Cancelled ─────────────────────────────────
function renderCancelled() {
  const tbody = document.getElementById('cancelledTbody');
  if (!tbody) return;

  const cancelled = PH_DATA.invoices.filter(i => i.status === 'cancelled');
  tbody.innerHTML = cancelled.length > 0 ? cancelled.map(inv => `
    <tr>
      <td class="mono">${inv.number}</td>
      <td>${inv.date}</td>
      <td>${inv.custName}</td>
      <td class="amount total">${PH_DATA.formatNum(inv.grandTotal)}</td>
      <td><span class="badge badge-danger">Cancelled</span></td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn btn-outline btn-sm" onclick="AppToast.show('Viewing cancelled invoice','info')">View</button>
          <button class="btn btn-outline btn-sm" onclick="AppToast.show('Duplicating as new invoice','info')">Duplicate</button>
        </div>
      </td>
    </tr>`).join('') : '<tr><td colspan="6" class="text-center text-muted" style="padding:40px">No cancelled invoices</td></tr>';
}

// ── Print Queue ───────────────────────────────
function renderPrintQueue() {
  const tbody = document.getElementById('printQueueTbody');
  if (!tbody) return;

  const pending = PH_DATA.invoices.filter(i => i.status !== 'cancelled').slice(0, 5);
  tbody.innerHTML = pending.map(inv => `
    <tr>
      <td><input type="checkbox" class="row-checkbox" checked></td>
      <td class="mono">${inv.number}</td>
      <td>${inv.custName}</td>
      <td>${inv.date}</td>
      <td class="amount total">${PH_DATA.formatNum(inv.grandTotal)}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="AppToast.show('Printing ${inv.number}...','info')">
          <span class="material-icons-outlined">print</span> Print
        </button>
      </td>
    </tr>`).join('');
}

// ── Reports ───────────────────────────────────
const Reports = {
  init() {
    this.renderSummaryCards();
    this.renderDailyReport();
  },

  renderSummaryCards() {
    const stats = PH_DATA.getDashboardStats();
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('rep-total-inv',  PH_DATA.invoices.filter(i => i.status !== 'cancelled').length);
    setEl('rep-total-rev',  PH_DATA.formatCurrency(PH_DATA.invoices.filter(i => i.status !== 'cancelled').reduce((s,i) => s+i.grandTotal, 0)));
    setEl('rep-total-gst',  PH_DATA.formatCurrency(stats.gstCollected));
    setEl('rep-total-pend', PH_DATA.formatCurrency(stats.pendingPayments));
  },

  renderDailyReport() {
    const tbody = document.getElementById('repDailyTbody');
    if (!tbody) return;

    const byDate = {};
    PH_DATA.invoices.filter(i => i.status !== 'cancelled').forEach(inv => {
      if (!byDate[inv.date]) byDate[inv.date] = { count:0, gross:0, gst:0, total:0 };
      byDate[inv.date].count++;
      byDate[inv.date].gross += inv.taxable;
      byDate[inv.date].gst   += inv.cgst + inv.sgst + inv.igst;
      byDate[inv.date].total += inv.grandTotal;
    });

    tbody.innerHTML = Object.entries(byDate).sort((a,b) => b[0].localeCompare(a[0])).map(([date, d]) => `
      <tr>
        <td><strong>${date}</strong></td>
        <td class="text-center">${d.count}</td>
        <td class="amount">${PH_DATA.formatNum(d.gross)}</td>
        <td class="amount">${PH_DATA.formatNum(d.gst)}</td>
        <td class="amount total">${PH_DATA.formatNum(d.total)}</td>
      </tr>`).join('');
  },

  renderGstReport() {
    const tbody = document.getElementById('repGstTbody');
    if (!tbody) return;

    const gstByType = { cgst:0, sgst:0, igst:0 };
    PH_DATA.invoices.filter(i => i.status !== 'cancelled').forEach(inv => {
      gstByType.cgst += inv.cgst;
      gstByType.sgst += inv.sgst;
      gstByType.igst += inv.igst;
    });

    tbody.innerHTML = `
      <tr><td>CGST Output</td><td class="amount">${PH_DATA.formatNum(gstByType.cgst)}</td><td><span class="badge badge-success">Intra-State Sales</span></td></tr>
      <tr><td>SGST Output</td><td class="amount">${PH_DATA.formatNum(gstByType.sgst)}</td><td><span class="badge badge-success">Intra-State Sales</span></td></tr>
      <tr><td>IGST Output</td><td class="amount">${PH_DATA.formatNum(gstByType.igst)}</td><td><span class="badge badge-warning">Inter-State Sales</span></td></tr>
      <tr style="background:var(--primary-light)">
        <td><strong>Total GST</strong></td>
        <td class="amount total">${PH_DATA.formatNum(gstByType.cgst+gstByType.sgst+gstByType.igst)}</td>
        <td></td>
      </tr>`;
  },

  renderTopCustomers() {
    const tbody = document.getElementById('repTopCustTbody');
    if (!tbody) return;

    const byCustomer = {};
    PH_DATA.invoices.filter(i => i.status !== 'cancelled').forEach(inv => {
      if (!byCustomer[inv.custName]) byCustomer[inv.custName] = { count:0, total:0 };
      byCustomer[inv.custName].count++;
      byCustomer[inv.custName].total += inv.grandTotal;
    });

    tbody.innerHTML = Object.entries(byCustomer)
      .sort((a,b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([name, d], i) => `
        <tr>
          <td>${i+1}</td>
          <td><strong>${name}</strong></td>
          <td class="text-center">${d.count}</td>
          <td class="amount total">${PH_DATA.formatNum(d.total)}</td>
        </tr>`).join('');
  },
};

// ── AUTHENTICATION ─────────────────────────────
window.handleLogin = function(e) {
    e.preventDefault();
    const user = document.getElementById('loginUsername').value;
    const pass = document.getElementById('loginPassword').value;
    
    // Get correct credentials from settings or defaults
    const savedSettingsStr = localStorage.getItem('padowa_invoice_settings');
    let correctUser = 'admin';
    let correctPass = 'admin';
    if (savedSettingsStr) {
        try {
            const settings = JSON.parse(savedSettingsStr);
            if (settings.authUser) correctUser = settings.authUser;
            if (settings.authPass) correctPass = settings.authPass;
        } catch(err) {}
    }

    if (user === correctUser && pass === correctPass) {
        sessionStorage.setItem('padowa_auth_status', 'true');
        document.getElementById('loginOverlay').style.display = 'none';
        AppToast.show('Login successful', 'success');
    } else {
        AppToast.show('Invalid username or password', 'error');
    }
};

window.handleLogout = function() {
    sessionStorage.removeItem('padowa_auth_status');
    document.getElementById('profileDropdown').classList.remove('is-open');
    
    // Clear password field just in case
    document.getElementById('loginPassword').value = '';
    
    checkAuth();
    AppToast.show('Logged out successfully', 'info');
};

function checkAuth() {
    if (sessionStorage.getItem('padowa_auth_status') !== 'true') {
        document.getElementById('loginOverlay').style.display = 'flex';
    } else {
        document.getElementById('loginOverlay').style.display = 'none';
    }
}

// ── KEYBOARD SHORTCUTS ────────────────────────
document.addEventListener('keydown', (e) => {
    // Ignore shortcuts if in input fields (unless Ctrl/Cmd is pressed)
    const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';
    
    // Ctrl + N (New Invoice)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        window.switchTab('newInvoice');
    }
    // Ctrl + S (Save Invoice)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (typeof InvoiceModule !== 'undefined' && typeof InvoiceModule.saveInvoice === 'function') {
            InvoiceModule.saveInvoice();
        }
    }
    // Ctrl + P (Print Preview)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        // Since Ctrl+P is native browser print, we intercept and open our preview if on invoice tab
        const activeTab = document.querySelector('.nav-item.active').dataset.tab;
        if (activeTab === 'newInvoice') {
            document.getElementById('btnDoPrint')?.click();
        } else {
            window.print(); // let it be normal print otherwise
        }
    }
    // Alt + C (Add Customer)
    if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        window.switchTab('customers');
        document.getElementById('btnNewCustomer')?.click();
    }
    // Alt + F (Global Search)
    if (e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        document.getElementById('globalSearch')?.focus();
    }
});

// ── DOMContentLoaded ──────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for Firebase module to fully load (it's a type="module" so loads after regular scripts)
  let waited = 0;
  while (typeof window.initFirebaseDB !== 'function' && waited < 5000) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
  }
  if (typeof window.initFirebaseDB === 'function') {
      await window.initFirebaseDB();
  }

  App.init();

  // Tab system for Invoice History
  document.querySelectorAll('[data-hist-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-hist-tab]').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      renderInvoiceHistory(btn.dataset.histTab);
    });
  });

  // Reports tab system
  document.querySelectorAll('[data-rep-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-rep-tab]').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      document.querySelectorAll('.rep-tab-pane').forEach(p => p.classList.remove('is-active'));
      const target = document.getElementById('rep-' + btn.dataset.repTab);
      if (target) target.classList.add('is-active');

      if (btn.dataset.repTab === 'daily')     Reports.renderDailyReport();
      if (btn.dataset.repTab === 'gst')       Reports.renderGstReport();
      if (btn.dataset.repTab === 'customers') Reports.renderTopCustomers();
    });
  });

  // Invoice History search
  const histSearch = document.getElementById('histSearchInput');
  if (histSearch) {
    histSearch.addEventListener('input', () => {
      const q = histSearch.value.toLowerCase();
      document.querySelectorAll('#historyTbody tr').forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

// Print button in toolbar
  document.getElementById('doPrint')?.addEventListener('click', () => window.print());
  
  // UPI QR Code Upload
  const qrInput = document.getElementById('settingUPIQR');
  if (qrInput) {
      qrInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
              const reader = new FileReader();
              reader.onload = (evt) => {
                  window.currentUpiQrBase64 = evt.target.result;
              };
              reader.readAsDataURL(file);
          }
      });
  }
});

window.autoSaveSettings = function() {
    const compName = document.getElementById('settingCompName')?.value || 'PADOWA Healthcare';
    const branchName = document.getElementById('settingBranchName')?.value || 'Ethical Pharmaceutical Marketing';
    const compPhone = document.getElementById('settingCompPhone')?.value || '+91 80 4123 5678';
    const compGSTIN = document.getElementById('settingCompGSTIN')?.value || '29AABCP1234A1Z5';
    const compDL = document.getElementById('settingCompDL')?.value || 'KA-B20-123456 / KA-B21-123457';
    const compEmail = document.getElementById('settingCompEmail')?.value || 'billing@padowahealthcare.com';
    
    const bankName = document.getElementById('settingBankName')?.value || 'HDFC Bank';
    const bankBranch = document.getElementById('settingBankBranch')?.value || 'Indiranagar Branch';
    const accNo = document.getElementById('settingAccount')?.value || '50200012345678';
    const ifsc = document.getElementById('settingIFSC')?.value || 'HDFC0001234';
    const address = document.getElementById('settingAddress')?.value || '';
    
    const state = document.getElementById('settingState')?.value || 'Karnataka (29)';
    const defaultGST = document.getElementById('settingDefaultGST')?.value || '12';
    
    const terms = document.getElementById('settingTerms')?.value || document.getElementById('invTerms')?.value || 'Subject to Bengaluru jurisdiction. Goods once sold will not be taken back or exchanged without valid reason. All disputes subject to arbitration per Company Policy. E.&O.E.';
    const upi = document.getElementById('settingUPI')?.value || 'padowahealthcare@hdfcbank';

    const printPaperSize = document.getElementById('settingPrintPaperSize')?.value || 'A4 Portrait';
    const printCopies = document.getElementById('settingPrintCopies')?.value || '1';
    const printWatermark = document.getElementById('settingPrintWatermark') ? document.getElementById('settingPrintWatermark').checked : true;
    const printLogo = document.getElementById('settingPrintLogo') ? document.getElementById('settingPrintLogo').checked : true;
    
    const authUser = document.getElementById('settingAuthUser')?.value || 'admin';
    const authPass = document.getElementById('settingAuthPass')?.value || 'admin';
    const adminName = document.getElementById('settingAdminName')?.value || 'Dr. PRASANTH KINJINGI';
    const creditDays = document.getElementById('settingCreditDays')?.value || '30';

    const settings = {
        compName, branchName, compPhone, compGSTIN, compDL, compEmail,
        bankName, bankBranch, accNo, ifsc, address, terms, upi, state, defaultGST,
        printPaperSize, printCopies, printWatermark, printLogo,
        authUser, authPass, adminName, creditDays
    };
    
    if (window.currentUpiQrBase64) {
        settings.upiQR = window.currentUpiQrBase64;
    } else {
        const existingStr = localStorage.getItem('padowa_invoice_settings');
        if (existingStr) {
            try {
                const existing = JSON.parse(existingStr);
                if (existing.upiQR) settings.upiQR = existing.upiQR;
            } catch(e){}
        }
    }
    
    localStorage.setItem('padowa_invoice_settings', JSON.stringify(settings));
    if (typeof window.saveSettingsToDB === 'function') {
        window.saveSettingsToDB(settings);
    }
    
    if (window.PH_DATA && window.PH_DATA.company) {
        window.PH_DATA.company.state = settings.state;
        const match = settings.state.match(/\((\d+)\)/);
        if (match) {
            window.PH_DATA.company.stateCode = match[1];
        }
    }
    
    if (window.InvoiceModule) {
        InvoiceModule.populateStep6Settings();
        if (typeof InvoiceModule.updateSummaryPanel === 'function') {
            InvoiceModule.updateSummaryPanel();
        }
    }

    const prefix = document.getElementById('settingInvPrefix')?.value || 'PH';
    const seq = document.getElementById('settingInvSeq')?.value || '9';
    const d = new Date();
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yy = d.getFullYear().toString().slice(-2);
    const numStr = seq.toString().padStart(5, '0');
    const previewEl = document.getElementById('settingInvPreview');
    if (previewEl) {
        previewEl.textContent = `${prefix}${yy}${mm}${numStr}`;
    }
    
    // Update Profile Name in Header dynamically
    if (settings.adminName) {
        const headerName = document.getElementById('headerProfileName');
        const dropdownName = document.getElementById('dropdownProfileName');
        const headerAvatar = document.getElementById('headerProfileAvatar');
        if (headerName) headerName.textContent = settings.adminName;
        if (dropdownName) dropdownName.textContent = settings.adminName;
        if (headerAvatar) {
            const initials = settings.adminName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
            headerAvatar.textContent = initials;
        }
    }
};

window.saveSettings = function() {
    window.autoSaveSettings();
    AppToast.show('Settings saved successfully', 'success');
};

document.addEventListener('DOMContentLoaded', () => {
    const settingIds = [
        'settingCompName', 'settingBranchName', 'settingCompPhone', 'settingCompGSTIN', 'settingCompDL', 'settingCompEmail',
        'settingBankName', 'settingBankBranch', 'settingAccount', 'settingIFSC', 'settingAddress', 'settingUPI', 'settingState',
        'settingInvPrefix', 'settingInvSeq', 'invTerms', 'settingTerms',
        'settingDefaultGST', 'settingPrintPaperSize', 'settingPrintCopies', 'settingPrintWatermark', 'settingPrintLogo',
        'settingAuthUser', 'settingAuthPass', 'settingAdminName', 'settingCreditDays'
    ];
    settingIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', window.autoSaveSettings);
            el.addEventListener('change', window.autoSaveSettings);
        }
    });
    // Also bind the GST config fields
    ['settingGSTIN', 'settingDefaultGST'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', window.autoSaveSettings);
            el.addEventListener('change', window.autoSaveSettings);
        }
    });
});

window.loadSettings = async function() {
    try {
        let settings = null;
        // Use pre-fetched settings from Firebase (loaded in initFirebaseDB)
        if (window._firebaseSettings) {
            settings = window._firebaseSettings;
        } else if (typeof window.loadSettingsFromDB === 'function') {
            settings = await window.loadSettingsFromDB();
        }
        if (!settings) {
            const savedSettings = localStorage.getItem('padowa_invoice_settings');
            if (savedSettings) settings = JSON.parse(savedSettings);
        }
        
        if (settings) {
            const setCompName = document.getElementById('settingCompName');
            const setBranchName = document.getElementById('settingBranchName');
            const setCompPhone = document.getElementById('settingCompPhone');
            const setCompGSTIN = document.getElementById('settingCompGSTIN');
            const setCompDL = document.getElementById('settingCompDL');
            const setCompEmail = document.getElementById('settingCompEmail');
            const setBankName = document.getElementById('settingBankName');
            const setBankBranch = document.getElementById('settingBankBranch');
            const setAccount = document.getElementById('settingAccount');
            const setIFSC = document.getElementById('settingIFSC');
            const setAddress = document.getElementById('settingAddress');
            const setUPI = document.getElementById('settingUPI');
            const setState = document.getElementById('settingState');
            
            if (setCompName && settings.compName) setCompName.value = settings.compName;
            if (setBranchName && settings.branchName) setBranchName.value = settings.branchName;
            if (setCompPhone && settings.compPhone) setCompPhone.value = settings.compPhone;
            if (setCompGSTIN && settings.compGSTIN) setCompGSTIN.value = settings.compGSTIN;
            if (setCompDL && settings.compDL) setCompDL.value = settings.compDL;
            if (setCompEmail && settings.compEmail) setCompEmail.value = settings.compEmail;
            
            if (setBankName && settings.bankName) setBankName.value = settings.bankName;
            if (setBankBranch && settings.bankBranch) setBankBranch.value = settings.bankBranch;
            if (setAccount && settings.accNo) setAccount.value = settings.accNo;
            if (setIFSC && settings.ifsc) setIFSC.value = settings.ifsc;
            if (setAddress && settings.address) setAddress.value = settings.address;
            if (setUPI && settings.upi) setUPI.value = settings.upi;
            if (setState && settings.state) setState.value = settings.state;

            // GST Config section
            const setDefaultGST = document.getElementById('settingDefaultGST');
            if (setDefaultGST && settings.defaultGST) setDefaultGST.value = settings.defaultGST;
            
            const setPrintPaperSize = document.getElementById('settingPrintPaperSize');
            if (setPrintPaperSize && settings.printPaperSize) setPrintPaperSize.value = settings.printPaperSize;
            const setPrintCopies = document.getElementById('settingPrintCopies');
            if (setPrintCopies && settings.printCopies) setPrintCopies.value = settings.printCopies;
            const setPrintWatermark = document.getElementById('settingPrintWatermark');
            if (setPrintWatermark && settings.printWatermark !== undefined) setPrintWatermark.checked = settings.printWatermark;
            const setPrintLogo = document.getElementById('settingPrintLogo');
            if (setPrintLogo && settings.printLogo !== undefined) setPrintLogo.checked = settings.printLogo;

            const setAuthUser = document.getElementById('settingAuthUser');
            if (setAuthUser && settings.authUser) setAuthUser.value = settings.authUser;
            const setAuthPass = document.getElementById('settingAuthPass');
            if (setAuthPass && settings.authPass) setAuthPass.value = settings.authPass;
            const setAdminName = document.getElementById('settingAdminName');
            if (setAdminName && settings.adminName) setAdminName.value = settings.adminName;
            const setCreditDays = document.getElementById('settingCreditDays');
            if (setCreditDays && settings.creditDays) setCreditDays.value = settings.creditDays;
            
            // Update Profile Name in Header
            if (settings.adminName) {
                const headerName = document.getElementById('headerProfileName');
                const dropdownName = document.getElementById('dropdownProfileName');
                const headerAvatar = document.getElementById('headerProfileAvatar');
                if (headerName) headerName.textContent = settings.adminName;
                if (dropdownName) dropdownName.textContent = settings.adminName;
                if (headerAvatar) {
                    const initials = settings.adminName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
                    headerAvatar.textContent = initials;
                }
            }
            
            const setTerms = document.getElementById('settingTerms');
            if (setTerms && settings.terms) setTerms.value = settings.terms;
            const invTerms = document.getElementById('invTerms');
            if (invTerms && settings.terms) invTerms.value = settings.terms;
            
            // Also override the PH_DATA company object for live behavior
            if (window.PH_DATA && window.PH_DATA.company) {
                if (settings.state) {
                    window.PH_DATA.company.state = settings.state;
                    const match = settings.state.match(/\((\d+)\)/);
                    if (match) {
                        window.PH_DATA.company.stateCode = match[1];
                    }
                }
            }
        }
    } catch(e) {}
};

// loadSettings is called from initFirebaseDB after Firebase loads

window.autoIncrementInvoiceNumber = function() {
    // Use same counter as data.js (padowa_next_invoice_seq) to avoid sequence gaps
    if (window.PH_DATA && typeof window.PH_DATA.generateInvoiceNumber === 'function') {
        return window.PH_DATA.generateInvoiceNumber();
    }
    // Fallback if PH_DATA not available
    let currentSeq = parseInt(localStorage.getItem('padowa_next_invoice_seq') || '9');
    currentSeq++;
    localStorage.setItem('padowa_next_invoice_seq', currentSeq.toString());
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const padded = currentSeq.toString().padStart(5, '0');
    return `PH${yy}${mm}${padded}`;
};

// ── Customers Ledger ─────────────────────────────────
window.renderCustomersLedger = function() {
  const tbody = document.getElementById('customersTbody');
  const countEl = document.getElementById('customersCount');
  if (!tbody) return;

  const searchTerm = (document.getElementById('customersSearchInput')?.value || '').toLowerCase();

  const filtered = PH_DATA.customers.filter(c => {
    return c.name.toLowerCase().includes(searchTerm) ||
           c.code.toLowerCase().includes(searchTerm) ||
           c.phone.includes(searchTerm) ||
           (c.gstin && c.gstin.toLowerCase().includes(searchTerm));
  });

  tbody.innerHTML = '';
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:40px; color:var(--text-muted);">No customers found.</td></tr>`;
    countEl.textContent = `0 customers`;
    return;
  }

  const formatCurrency = val => '₹ ' + parseFloat(val||0).toLocaleString('en-IN', {minimumFractionDigits:2});

  filtered.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:var(--font-mono); font-weight:600; color:var(--primary);">${c.code}</td>
      <td>
        <div style="font-weight:600; color:var(--text-dark);">${c.name}</div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
          ${c.gstin ? 'GSTIN: ' + c.gstin : 'Unregistered'}
        </div>
      </td>
      <td>${c.phone}</td>
      <td>${c.city}</td>
      <td style="font-weight:600; font-size:12px; text-transform:uppercase;">
        <span style="background:var(--bg-light); padding:4px 8px; border-radius:4px; color:var(--text-dark); border:1px solid var(--border-color);">${c.paymentType || 'CREDIT'}</span>
      </td>
      <td class="text-right">${formatCurrency(c.creditLimit)}</td>
      <td class="text-right" style="font-weight:600; color:${c.outstanding > 0 ? '#b91c1c' : 'var(--text-muted)'}">${formatCurrency(c.outstanding)}</td>
      <td class="text-center">
        <button class="btn btn-outline btn-sm" onclick="openViewCustomer('${c.code}')" style="padding:4px 8px; margin-right:4px;" title="View">
          <span class="material-icons-outlined" style="font-size:16px;">visibility</span>
        </button>
        <button class="btn btn-outline btn-sm" onclick="openEditCustomer('${c.code}')" style="padding:4px 8px; margin-right:4px;" title="Edit">
          <span class="material-icons-outlined" style="font-size:16px;">edit</span>
        </button>
        <button class="btn btn-outline btn-sm" onclick="deleteCustomer('${c.code}')" style="padding:4px 8px; color:var(--danger); border-color:var(--danger);" title="Delete">
          <span class="material-icons-outlined" style="font-size:16px;">delete</span>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  countEl.textContent = `${filtered.length} customers total`;
};

window.deleteCustomer = function(code) {
  if (confirm('Are you sure you want to delete customer ' + code + '? This action cannot be undone.')) {
      PH_DATA.customers = PH_DATA.customers.filter(c => c.code !== code);
      AppToast.show('Customer ' + code + ' deleted.', 'info');
      window.renderCustomersLedger();
  }
};

window.openViewCustomer = function(code) {
  const c = PH_DATA.customers.find(x => x.code === code);
  if (!c) return;

  const formatCurrency = val => '₹ ' + parseFloat(val||0).toLocaleString('en-IN', {minimumFractionDigits:2});

  document.getElementById('vc_name').textContent = c.name || 'N/A';
  document.getElementById('vc_type').textContent = c.type === 'B2B' ? 'Business (B2B)' : 'Retail (B2C)';
  document.getElementById('vc_code').textContent = c.code || '';
  
  document.getElementById('vc_gstin').textContent = c.gstin || 'Unregistered';
  document.getElementById('vc_dl').textContent = c.drugLicense || 'N/A';
  document.getElementById('vc_fssai').textContent = c.fssai || 'N/A';
  
  document.getElementById('vc_contact').textContent = c.contact || 'N/A';
  document.getElementById('vc_phone').textContent = c.phone || 'N/A';
  document.getElementById('vc_email').textContent = c.email || '—';
  
  document.getElementById('vc_address').textContent = c.address || '';
  document.getElementById('vc_shipping_address').textContent = c.shippingAddress || c.address || 'Same as billing';
  document.getElementById('vc_city_state').textContent = `${c.city || ''}, ${c.state || ''} - ${c.pincode || ''}`;
  
  document.getElementById('vc_credit_days').textContent = c.creditDays || 0;
  document.getElementById('vc_credit_limit').textContent = formatCurrency(c.creditLimit);
  document.getElementById('vc_outstanding').textContent = formatCurrency(c.outstanding);

  document.getElementById('customerViewModal').classList.add('is-open');
};

document.getElementById('customersSearchInput')?.addEventListener('input', window.renderCustomersLedger);

window.openEditCustomer = function(code) {
  const c = PH_DATA.customers.find(x => x.code === code);
  if (!c) return;

  document.getElementById('ec_id').value = c.code;
  document.getElementById('ec_name').value = c.name || '';
  document.getElementById('ec_type').value = c.type || 'B2B';
  document.getElementById('ec_gstin').value = c.gstin || '';
  document.getElementById('ec_dl').value = c.drugLicense || '';
  document.getElementById('ec_fssai').value = c.fssai || '';
  document.getElementById('ec_code').value = c.code || '';
  document.getElementById('ec_contact').value = c.contact || '';
  document.getElementById('ec_phone').value = c.phone || '';
  document.getElementById('ec_email').value = c.email || '';
  document.getElementById('ec_address').value = c.address || '';
  document.getElementById('ec_shipping_address').value = c.shippingAddress || '';
  document.getElementById('ec_city').value = c.city || '';
  
  // State dropdown matches 'Name|Code'
  const stateVal = `${c.state}|${c.stateCode}`;
  const stSelect = document.getElementById('ec_state');
  for(let i=0; i<stSelect.options.length; i++) {
    if(stSelect.options[i].value === stateVal || stSelect.options[i].value.startsWith(c.state + '|')) {
      stSelect.selectedIndex = i;
      break;
    }
  }

  document.getElementById('ec_state_code').value = c.stateCode || '';
  document.getElementById('ec_pincode').value = c.pincode || '';
  document.getElementById('ec_credit_days').value = c.creditDays || 0;
  document.getElementById('ec_credit_limit').value = c.creditLimit || 0;
  document.getElementById('ec_outstanding').value = c.outstanding || 0;

  document.getElementById('customerEditModal').classList.add('is-open');
};

window.syncEditStateCode = function() {
  const val = document.getElementById('ec_state').value;
  if (val && val.includes('|')) {
    document.getElementById('ec_state_code').value = val.split('|')[1];
  } else {
    document.getElementById('ec_state_code').value = '';
  }
};

window.updateCustomer = function() {
  const code = document.getElementById('ec_id').value;
  const c = PH_DATA.customers.find(x => x.code === code);
  if (!c) return;

  if(!document.getElementById('customerEditForm').reportValidity()) return;

  const stateVal = document.getElementById('ec_state').value;
  const stateName = stateVal ? stateVal.split('|')[0] : '';
  const stateCode = document.getElementById('ec_state_code').value;

  c.name = document.getElementById('ec_name').value;
  c.type = document.getElementById('ec_type').value;
  c.gstin = document.getElementById('ec_gstin').value;
  c.drugLicense = document.getElementById('ec_dl').value;
  c.fssai = document.getElementById('ec_fssai').value;
  c.contact = document.getElementById('ec_contact').value;
  c.phone = document.getElementById('ec_phone').value;
  c.email = document.getElementById('ec_email').value;
  c.address = document.getElementById('ec_address').value;
  c.shippingAddress = document.getElementById('ec_shipping_address').value || c.address;
  c.city = document.getElementById('ec_city').value;
  c.state = stateName;
  c.stateCode = stateCode;
  c.pincode = document.getElementById('ec_pincode').value;
  c.creditDays = parseInt(document.getElementById('ec_credit_days').value) || 0;
  c.creditLimit = parseFloat(document.getElementById('ec_credit_limit').value) || 0;
  c.outstanding = parseFloat(document.getElementById('ec_outstanding').value) || 0;

  document.getElementById('customerEditModal').classList.remove('is-open');
  AppToast.show('Customer ' + c.name + ' updated successfully.', 'success');
  window.renderCustomersLedger();
  
  // If editing currently selected customer in new invoice, update the card
  if (typeof InvoiceModule !== 'undefined' && window.InvoiceModule) {
      const invState = window.InvoiceModule.getState(); // assuming we can access or just trigger update
      if (invState && invState.customer && invState.customer.code === c.code) {
          InvoiceModule.selectCustomerById(c.code);
      }
  }
};

// ── Calculator Logic ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const calcInputs = ['calc_mrp', 'calc_gst', 'calc_rm', 'calc_sm', 'calc_buy', 'calc_free', 'calc_td'];
    
    function calculatePharmaPrice() {
        const mrp = parseFloat(document.getElementById('calc_mrp')?.value) || 0;
        const gst = parseFloat(document.getElementById('calc_gst')?.value) || 0;
        const rm = parseFloat(document.getElementById('calc_rm')?.value) || 0;
        const sm = parseFloat(document.getElementById('calc_sm')?.value) || 0;
        const buy = parseFloat(document.getElementById('calc_buy')?.value) || 0;
        const free = parseFloat(document.getElementById('calc_free')?.value) || 0;
        const td = parseFloat(document.getElementById('calc_td')?.value) || 0;

        // Base Price = MRP Excl GST
        const basePrice = mrp / (1 + (gst / 100));
        
        // PTR = Base Price - Retail Margin
        const ptr = basePrice * (1 - (rm / 100));
        
        // PTS = PTR - Stockist Margin
        const pts = ptr * (1 - (sm / 100));

        // Effective Rate (After Scheme)
        let effRate = pts;
        if (buy > 0 && free > 0) {
            effRate = (pts * buy) / (buy + free);
        }

        // Billing Price (After Trade Discount)
        const billPrice = effRate * (1 - (td / 100));

        // Final Invoice Amount
        const finalAmount = billPrice * (1 + (gst / 100));

        const format = val => '₹ ' + val.toFixed(2);
        
        const setEl = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = format(val);
        };

        setEl('calc_out_base', basePrice);
        setEl('calc_out_ptr', ptr);
        setEl('calc_out_pts', pts);
        setEl('calc_out_eff', effRate);
        setEl('calc_out_bill', billPrice);
        setEl('calc_out_final', finalAmount);
    }

    calcInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', calculatePharmaPrice);
            el.addEventListener('change', calculatePharmaPrice);
        }
    });

    // Initial calculation
    calculatePharmaPrice();
});
