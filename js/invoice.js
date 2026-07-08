/* ════════════════════════════════════════════════
   PADOWA Healthcare – Invoice Logic
   Create Invoice: All 6 Sections + Live Calculations
════════════════════════════════════════════════ */

const InvoiceModule = (() => {

  // ── State ─────────────────────────────────────
  let state = {
    invoiceNumber: '',
    invoiceDate:   '',
    invoiceDueDate:'',
    invoiceTime:   '',
    invoiceType:   'Tax Invoice',
    paymentMode:   'Credit',
    refNumber:     '',
    remarks:       '',
    executive:     '',
    fy:            '2026-27',
    customer:      null,
    rows:          [],
    transport:     0,
    otherCharges:  0,
    termsText:     'Subject to Bengaluru jurisdiction. Goods once sold will not be taken back or exchanged. E.&O.E.',
    amtReceived:   0,
    notes:         '',
    txnId:         '',
    isDraft:       false,
    autosaveTimer: null,
    lastSaved:     null,
  };

  let rowCounter = 0;

  // ── Init ──────────────────────────────────────
  function init() {
    if (!state.invoiceNumber) {
      state.invoiceNumber = (typeof window.autoIncrementInvoiceNumber === 'function') 
                              ? window.autoIncrementInvoiceNumber() 
                              : PH_DATA.generateInvoiceNumber();
    }
    const now = new Date();
    state.invoiceDate = now.toISOString().split('T')[0];
    state.invoiceTime = now.toTimeString().slice(0,5);
    calculateDueDate();

    renderInvoiceNumber();
    renderDateTimeFields();
    populateExecutives();
    renderProductGrid();
    bindSection1Events();
    bindSection2Events();
    bindSection5Events();
    bindToolbarEvents();
    startAutosave();
    updateSummaryPanel();
    populateStep6Settings();

    // Set financial year display
    const el = document.getElementById('invFinYear');
    if (el) el.textContent = PH_DATA.company.fy;
  }

  function populateStep6Settings() {
    try {
        const savedSettings = localStorage.getItem('padowa_invoice_settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            const step6BankDetails = document.getElementById('step6BankDetails');
            const step6UPI = document.getElementById('step6UPI');
            const invTerms = document.getElementById('invTerms');
            
            if (step6BankDetails) {
                step6BankDetails.innerHTML = `
                  <strong style="color:var(--text-primary)">${settings.bankName || 'HDFC Bank'}</strong> – ${settings.bankBranch || 'Indiranagar Branch'}<br>
                  A/C No: <strong>${settings.accNo || '50200012345678'}</strong><br>
                  IFSC: <strong>${settings.ifsc || 'HDFC0001234'}</strong><br>
                  UPI: <strong>${settings.upi || 'padowahealthcare@hdfcbank'}</strong>
                `;
            }
            if (step6UPI) {
                let qrHtml = `
                  <span class="material-icons-outlined" style="font-size:28px; color:var(--border-2);">qr_code_2</span>
                  QR Code<br>Placeholder
                `;
                if (settings.upiQR) {
                    qrHtml = `<img src="${settings.upiQR}" style="width:100px;height:100px;object-fit:cover;border-radius:4px;">`;
                }
                
                const qrPlaceholder = document.querySelector('.qr-placeholder');
                if (qrPlaceholder) {
                    qrPlaceholder.innerHTML = qrHtml;
                    qrPlaceholder.style.border = settings.upiQR ? 'none' : '';
                }
            
                step6UPI.innerHTML = `
                  <strong>${settings.upi || 'padowahealthcare@hdfcbank'}</strong><br>
                  ${settings.compName || 'PADOWA Healthcare Pvt Ltd'}<br>
                  Scan to pay via any UPI app<br>
                  <span class="badge badge-success" style="margin-top:6px">UPI Enabled</span>
                `;
            }
            if (invTerms && settings.terms) {
                invTerms.value = settings.terms;
            }
        }
    } catch(e) {}
  }

  // ── Section 1: Invoice Info ───────────────────
  function renderInvoiceNumber() {
    const el = document.getElementById('invNumberBadge');
    if (el) el.textContent = state.invoiceNumber;
    const el2 = document.getElementById('invNumberBadge2');
    if (el2) el2.textContent = state.invoiceNumber;
  }

  function renderDateTimeFields() {
    const dateEl = document.getElementById('invDate');
    const timeEl = document.getElementById('invTime');
    const dueEl = document.getElementById('invDueDate');
    if (dateEl) dateEl.value = state.invoiceDate;
    if (timeEl) timeEl.value = state.invoiceTime;
    if (dueEl) dueEl.value = state.invoiceDueDate;
  }

  function populateExecutives() {
    const sel = document.getElementById('invExec');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Executive --</option>';
    PH_DATA.executives.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = e.name + ' (' + e.region + ')';
      sel.appendChild(opt);
    });
  }

  function bindSection1Events() {
    // Payment mode toggles
    document.querySelectorAll('.payment-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.payment-toggle').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        state.paymentMode = btn.dataset.mode;
        toggleRefFieldVisibility();
      });
    });

    // Invoice type
    const invType = document.getElementById('invType');
    if (invType) invType.addEventListener('change', e => { state.invoiceType = e.target.value; });

    // Exec
    const exec = document.getElementById('invExec');
    if (exec) exec.addEventListener('change', e => { state.executive = e.target.value; });

    // Date / Time
    const dEl = document.getElementById('invDate');
    if (dEl) dEl.addEventListener('change', e => { 
        state.invoiceDate = e.target.value; 
        calculateDueDate();
    });

    const dueEl = document.getElementById('invDueDate');
    if (dueEl) dueEl.addEventListener('change', e => { state.invoiceDueDate = e.target.value; });

    const tEl = document.getElementById('invTime');
    if (tEl) tEl.addEventListener('change', e => { state.invoiceTime = e.target.value; });

    // Remarks
    const remEl = document.getElementById('invRemarks');
    if (remEl) remEl.addEventListener('input', e => { state.remarks = e.target.value; });

    // Dispatch Details
    const orderNoEl = document.getElementById('invOrderNo');
    if (orderNoEl) orderNoEl.addEventListener('input', e => { state.orderNo = e.target.value; });

    const transportEl = document.getElementById('invTransport');
    if (transportEl) transportEl.addEventListener('input', e => { state.transportName = e.target.value; });

    const lrNoEl = document.getElementById('invLRNo');
    if (lrNoEl) lrNoEl.addEventListener('input', e => { state.lrNo = e.target.value; });

    const ewayBillEl = document.getElementById('invEwayBill');
    if (ewayBillEl) ewayBillEl.addEventListener('input', e => { state.ewayBill = e.target.value; });
  }

  function toggleRefFieldVisibility() {
    const refRow = document.getElementById('refNumberRow');
    if (!refRow) return;
    const showFor = ['UPI','Bank Transfer','Cheque'];
    refRow.style.display = showFor.includes(state.paymentMode) ? 'flex' : 'none';
  }

  // ── Section 2: Customer ───────────────────────
  function bindSection2Events() {
    const searchInput = document.getElementById('custSearch');
    const dropdown    = document.getElementById('custDropdown');
    if (!searchInput) return;

    searchInput.addEventListener('input', debounce(() => {
      const results = PH_DATA.searchCustomers(searchInput.value);
      renderCustomerDropdown(results, dropdown);
    }, 250));

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeDropdown(dropdown);
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.autocomplete-wrap')) closeDropdown(dropdown);
    });
  }

  function renderCustomerDropdown(results, dropdown) {
    if (!dropdown) return;
    dropdown.innerHTML = '';
    if (results.length === 0) {
      closeDropdown(dropdown);
      return;
    }
    results.forEach(cust => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.innerHTML = `
        <div class="autocomplete-item__name">${cust.name}</div>
        <div class="autocomplete-item__sub">
          Code: <strong>${cust.code}</strong> &nbsp;|&nbsp;
          ${cust.gstin ? 'GSTIN: <strong>' + cust.gstin + '</strong>' : '<em>Unregistered</em>'}
          &nbsp;|&nbsp; ${cust.city}, ${cust.state}
        </div>`;
      item.addEventListener('click', () => {
        selectCustomer(cust);
        closeDropdown(dropdown);
        const si = document.getElementById('custSearch');
        if (si) si.value = cust.name;
      });
      dropdown.appendChild(item);
    });
    dropdown.classList.add('is-open');
  }

  function closeDropdown(dropdown) {
    if (dropdown) dropdown.classList.remove('is-open');
  }

  function selectCustomer(cust) {
    state.customer = cust;
    renderCustomerCard(cust);
    calculateDueDate();
    updateSummaryPanel();
    AppToast.show('Customer selected: ' + cust.name, 'success');
  }

  function calculateDueDate() {
    if (!state.invoiceDate) return;
    const dateObj = new Date(state.invoiceDate);
    if (isNaN(dateObj.getTime())) return;
    
    let days = 30; // default
    if (state.customer && state.customer.creditDays) {
        days = parseInt(state.customer.creditDays, 10);
    } else {
        const settingsStr = localStorage.getItem('padowa_invoice_settings');
        if (settingsStr) {
            try {
                const settings = JSON.parse(settingsStr);
                if (settings.creditDays) days = parseInt(settings.creditDays, 10);
            } catch(e) {}
        }
    }
    dateObj.setDate(dateObj.getDate() + days);
    state.invoiceDueDate = dateObj.toISOString().split('T')[0];
    const dueEl = document.getElementById('invDueDate');
    if (dueEl) dueEl.value = state.invoiceDueDate;
  }

  function renderCustomerCard(c) {
    const card = document.getElementById('customerInfoCard');
    if (!card) return;

    const usedPct = c.creditLimit > 0 ? Math.min((c.outstanding / c.creditLimit) * 100, 100) : 0;
    const statusClass = { verified:'verified', blocked:'blocked', inactive:'inactive' }[c.status] || 'neutral';
    const statusLabel  = c.status.charAt(0).toUpperCase() + c.status.slice(1);
    const isInterState = c.stateCode !== PH_DATA.company.stateCode;

    card.innerHTML = `
      <div class="d-flex align-center justify-between mb-3">
        <div>
          <div class="cust-name">${c.name}</div>
          <div class="cust-code">${c.code} &nbsp;·&nbsp; ${c.city}, ${c.state} (${c.stateCode})</div>
        </div>
        <div class="d-flex gap-2 align-center">
          <span class="badge badge-${isInterState ? 'warning' : 'success'}">${isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</span>
          <span class="cust-status-badge ${statusClass}">${statusLabel}</span>
        </div>
      </div>
      <div class="cust-detail-grid">
        <div class="cust-detail-item">
          <label>GSTIN</label>
          <span>${c.gstin || '<em style="color:var(--text-muted)">Unregistered</em>'}</span>
        </div>
        <div class="cust-detail-item">
          <label>Drug License</label>
          <div class="val">${c.drugLicense || 'N/A'}</div>
          <label>FSSAI No.</label>
          <div class="val">${c.fssai || 'N/A'}</div>
        </div>
        <div class="cust-detail-item">
          <label>Contact Person</label>
          <span>${c.contact}</span>
        </div>
        <div class="cust-detail-item">
          <label>Phone</label>
          <span>${c.phone}</span>
        </div>
        <div class="cust-detail-item">
          <label>Email</label>
          <span style="font-size:11px">${c.email || '—'}</span>
        </div>
        <div class="cust-detail-item">
          <label>Place of Supply</label>
          <span>${c.placeOfSupply} (${c.stateCode})</span>
        </div>
        <div class="cust-detail-item">
          <label>Billing Address</label>
          <span style="font-size:11px">${c.address}, ${c.pincode}</span>
        </div>
        <div class="cust-detail-item">
          <label>Shipping Address</label>
          <span style="font-size:11px">${c.shippingAddress || c.address || 'Same as billing'}, ${c.pincode}</span>
        </div>
        <div class="cust-detail-item">
          <label>Credit Days</label>
          <span>${c.creditDays} Days</span>
        </div>
        <div class="cust-detail-item">
          <label>Outstanding</label>
          <span class="outstanding-amount">${PH_DATA.formatCurrency(c.outstanding)}</span>
        </div>
      </div>
      <div class="credit-bar-wrap">
        <div class="credit-bar-label">
          <span>Credit Limit: ${PH_DATA.formatCurrency(c.creditLimit)}</span>
          <span style="font-weight:700; color:${usedPct > 80 ? 'var(--danger)' : 'var(--text-muted)'}">Used: ${usedPct.toFixed(0)}%</span>
        </div>
        <div class="credit-bar-track">
          <div class="credit-bar-fill" style="width:${usedPct}%;${usedPct>80?'background:linear-gradient(90deg,var(--warning),var(--danger));':''}"></div>
        </div>
      </div>`;
    card.classList.add('is-visible');

    // Update state with supply type for GST calculation
    state.isInterState = isInterState;
  }

  // ── Section 3: Product Grid ───────────────────
  function renderProductGrid() {
    const tbody = document.getElementById('productTbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    rowCounter = 0;
    state.rows.forEach((row, idx) => {
        row._id = ++rowCounter;
        const tr = renderRow(row, idx);
        tbody.appendChild(tr);
    });
    if (state.rows.length === 0) addRow();
  }

  function addRow(prefill = {}) {
    rowCounter++;
    const row = {
      _id:          rowCounter,
      productCode:  prefill.code        || '',
      productName:  prefill.name        || '',
      composition:  prefill.composition || '',
      strength:     prefill.strength    || '',
      dosageForm:   prefill.dosageForm  || '',
      pack:         prefill.pack        || '',
      manufacturer: prefill.manufacturer|| '',
      batchNo:      '',
      mfgDate:      '',
      expiryDate:   '',
      hsn:          prefill.hsn        || '',
      gstPct:       prefill.gst        || 12,
      qty:          0,
      freeQty:      0,
      rate:         prefill.rate        || 0,
      mrp:          prefill.mrp         || 0,
      ptr:          prefill.ptr         || 0,
      discountPct:  0,
      discountAmt:  0,
      taxableValue: 0,
      cgst:         0,
      sgst:         0,
      igst:         0,
      total:        0,
    };
    state.rows.push(row);
    const tbody = document.getElementById('productTbody');
    if (tbody) {
      const tr = renderRow(row, state.rows.length - 1);
      tbody.appendChild(tr);
      tr.classList.add('row-new-added');
      setTimeout(() => tr.classList.remove('row-new-added'), 1200);
    }
    return row;
  }

  function renderRow(row, idx) {
    const isInterState = state.isInterState || false;

    const tr = document.createElement('tr');
    tr.id = 'product-row-' + row._id;
    tr.dataset.rowId = row._id;

    tr.innerHTML = `
      <td class="row-num">${idx + 1}</td>
      <td><input class="grid-input" data-field="productCode" value="${row.productCode}" placeholder="Code" style="width:70px"></td>
      <td>
        <div class="autocomplete-wrap" style="min-width:160px">
          <input class="grid-input" data-field="productName" value="${row.productName}" placeholder="Search product..." style="width:100%">
        </div>
      </td>
      <td><input class="grid-input" data-field="composition" value="${row.composition}" placeholder="Composition" style="width:130px"></td>
      <td><input class="grid-input" data-field="strength" value="${row.strength}" placeholder="Strength" style="width:70px"></td>
      <td><input class="grid-input" data-field="dosageForm" value="${row.dosageForm}" placeholder="Form" style="width:80px"></td>
      <td><input class="grid-input" data-field="pack" value="${row.pack}" placeholder="Pack" style="width:90px"></td>
      <td><input class="grid-input" data-field="manufacturer" value="${row.manufacturer}" placeholder="Mfr" style="width:100px"></td>
      <td><input class="grid-input" data-field="batchNo" value="${row.batchNo}" placeholder="Batch" style="width:80px"></td>
      <td><input class="grid-input" data-field="mfgDate" type="month" value="${row.mfgDate}" style="width:110px"></td>
      <td><input class="grid-input" data-field="expiryDate" type="month" value="${row.expiryDate}" style="width:110px" id="expiry-${row._id}"></td>
      <td><input class="grid-input" data-field="hsn" value="${row.hsn}" placeholder="HSN" style="width:70px"></td>
      <td>
        <select class="grid-input" data-field="gstPct" style="width:70px">
          <option value="0" ${row.gstPct==0?'selected':''}>0%</option>
          <option value="5" ${row.gstPct==5?'selected':''}>5%</option>
          <option value="12" ${row.gstPct==12?'selected':''}>12%</option>
          <option value="18" ${row.gstPct==18?'selected':''}>18%</option>
          <option value="28" ${row.gstPct==28?'selected':''}>28%</option>
        </select>
      </td>
      <td><input class="grid-input text-right" data-field="qty" type="number" value="${row.qty||''}" placeholder="0" min="0" style="width:60px"></td>
      <td><input class="grid-input text-right" data-field="freeQty" type="number" value="${row.freeQty||''}" placeholder="0" min="0" style="width:55px"></td>
      <td><input class="grid-input text-right" data-field="rate" type="number" value="${row.rate||''}" placeholder="PTS" min="0" step="0.01" style="width:80px"></td>
      <td><input class="grid-input text-right" data-field="mrp" type="number" value="${row.mrp||''}" placeholder="0.00" min="0" step="0.01" style="width:75px"></td>
      <td><input class="grid-input text-right" data-field="ptr" type="number" value="${row.ptr||''}" placeholder="0.00" min="0" step="0.01" style="width:75px"></td>
      <td><input class="grid-input text-right" data-field="discountPct" type="number" value="${row.discountPct||''}" placeholder="0" min="0" max="100" step="0.01" style="width:65px"></td>
      <td><input class="grid-input text-right readonly" data-field="discountAmt" value="${row.discountAmt ? PH_DATA.formatNum(row.discountAmt) : ''}" placeholder="0.00" readonly style="width:80px"></td>
      <td><input class="grid-input text-right readonly" data-field="taxableValue" value="${row.taxableValue ? PH_DATA.formatNum(row.taxableValue) : ''}" placeholder="0.00" readonly style="width:90px"></td>
      <td><input class="grid-input text-right readonly" data-field="cgst" value="${row.cgst ? PH_DATA.formatNum(row.cgst) : ''}" placeholder="0.00" readonly style="width:75px" ${isInterState?'style="opacity:0.4"':''}></td>
      <td><input class="grid-input text-right readonly" data-field="sgst" value="${row.sgst ? PH_DATA.formatNum(row.sgst) : ''}" placeholder="0.00" readonly style="width:75px" ${isInterState?'style="opacity:0.4"':''}></td>
      <td><input class="grid-input text-right readonly" data-field="igst" value="${row.igst ? PH_DATA.formatNum(row.igst) : ''}" placeholder="0.00" readonly style="width:75px" ${!isInterState?'style="opacity:0.4"':''}></td>
      <td><input class="grid-input text-right readonly" data-field="total" value="${row.total ? PH_DATA.formatNum(row.total) : ''}" placeholder="0.00" readonly style="width:90px; font-weight:700; color:var(--primary);"></td>
      <td>
        <div class="row-actions">
          <button class="row-action-btn move-up" title="Move row up" onclick="InvoiceModule.moveRowUp(${row._id})">
            <span class="material-icons-outlined">arrow_upward</span>
          </button>
          <button class="row-action-btn move-down" title="Move row down" onclick="InvoiceModule.moveRowDown(${row._id})">
            <span class="material-icons-outlined">arrow_downward</span>
          </button>
          <button class="row-action-btn del" title="Delete row" onclick="InvoiceModule.deleteRow(${row._id})">
            <span class="material-icons-outlined">delete</span>
          </button>
        </div>
      </td>`;

    // Bind cell events
    tr.querySelectorAll('.grid-input').forEach(input => {
      input.addEventListener('change', () => onCellChange(input, row._id));
      input.addEventListener('input',  () => {
        if (['qty','rate','discountPct','gstPct'].includes(input.dataset.field)) {
          onCellChange(input, row._id);
        }
      });
      input.addEventListener('keydown', e => handleGridKeydown(e, tr));
    });

    // Product name autocomplete
    const nameInput = tr.querySelector('[data-field="productName"]');
    if (nameInput) {
      nameInput.addEventListener('input', debounce(() => {
        const results = PH_DATA.searchProducts(nameInput.value);
        showProductDropdown(results, nameInput, row._id);
      }, 250));
    }

    // Expiry date validation
    const expiryInput = tr.querySelector('[data-field="expiryDate"]');
    if (expiryInput) {
      expiryInput.addEventListener('change', () => validateExpiry(expiryInput, row.expiryDate));
    }

    return tr;
  }

  function onCellChange(input, rowId) {
    const row = state.rows.find(r => r._id === rowId);
    if (!row) return;

    const field = input.dataset.field;
    let val = input.value;

    if (['qty','freeQty','rate','mrp','ptr','discountPct','gstPct'].includes(field)) {
      val = parseFloat(val) || 0;
    }

    row[field] = val;

    // Recalculate
    if (['qty','rate','discountPct','gstPct'].includes(field)) {
      calculateRow(row, rowId);
    }

    updateSummaryPanel();
  }

  function calculateRow(row, rowId) {
    const isInterState = state.isInterState || false;
    const qty      = parseFloat(row.qty)         || 0;
    const rate     = parseFloat(row.rate)         || 0;
    const discPct  = parseFloat(row.discountPct)  || 0;
    const gstPct   = parseFloat(row.gstPct)       || 0;

    const gross       = qty * rate;
    const discAmt     = gross * (discPct / 100);
    const taxable     = gross - discAmt;
    const cgst        = isInterState ? 0 : taxable * (gstPct / 200);
    const sgst        = isInterState ? 0 : taxable * (gstPct / 200);
    const igst        = isInterState ? taxable * (gstPct / 100) : 0;
    const total       = taxable + cgst + sgst + igst;

    row.discountAmt  = discAmt;
    row.taxableValue = taxable;
    row.cgst         = cgst;
    row.sgst         = sgst;
    row.igst         = igst;
    row.total        = total;

    // Update readonly cells in the row
    const tr = document.getElementById('product-row-' + rowId);
    if (!tr) return;

    const update = (field, val) => {
      const el = tr.querySelector(`[data-field="${field}"]`);
      if (el) el.value = val > 0 ? PH_DATA.formatNum(val) : '';
    };

    update('discountAmt',  discAmt);
    update('taxableValue', taxable);
    update('cgst',         cgst);
    update('sgst',         sgst);
    update('igst',         igst);
    update('total',        total);
  }

  function validateExpiry(input, val) {
    if (!val) return;
    const today = new Date();
    const exp   = new Date(val + '-01');
    const threeMonths = new Date(); threeMonths.setMonth(today.getMonth() + 3);

    input.classList.remove('expiry-warn','expiry-danger');
    if (exp < today) {
      input.classList.add('expiry-danger');
      AppToast.show('⚠️ Expired product detected!', 'error');
    } else if (exp < threeMonths) {
      input.classList.add('expiry-warn');
      AppToast.show('Product expires within 3 months', 'warning');
    }
  }

  function showProductDropdown(results, input, rowId) {
    // Remove existing
    const existingDd = input.closest('.autocomplete-wrap').querySelector('.autocomplete-dropdown');
    if (existingDd) existingDd.remove();

    if (!results.length) return;

    const dd = document.createElement('div');
    dd.className = 'autocomplete-dropdown is-open';
    dd.style.minWidth = '280px';

    results.forEach(prod => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.innerHTML = `
        <div class="autocomplete-item__name">${prod.name}</div>
        <div class="autocomplete-item__sub">${prod.code} · ${prod.strength} · ${prod.pack} · GST ${prod.gst}%</div>`;
      item.addEventListener('click', () => {
        fillProductRow(rowId, prod);
        dd.remove();
      });
      dd.appendChild(item);
    });

    input.closest('.autocomplete-wrap').appendChild(dd);

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!e.target.closest('.autocomplete-wrap')) { dd.remove(); document.removeEventListener('click', handler); }
      });
    }, 0);
  }

  function fillProductRow(rowId, prod) {
    const row = state.rows.find(r => r._id === rowId);
    if (!row) return;

    Object.assign(row, {
      productCode:  prod.code,
      productName:  prod.name,
      composition:  prod.composition,
      strength:     prod.strength,
      dosageForm:   prod.dosageForm,
      pack:         prod.pack,
      manufacturer: prod.manufacturer,
      hsn:          prod.hsn,
      gstPct:       prod.gst,
      rate:         prod.rate,
      mrp:          prod.mrp,
      ptr:          prod.ptr,
    });

    const tr = document.getElementById('product-row-' + rowId);
    if (!tr) return;

    const setField = (f, v) => {
      const el = tr.querySelector(`[data-field="${f}"]`);
      if (el) el.value = v;
    };

    setField('productCode',  prod.code);
    setField('productName',  prod.name);
    setField('composition',  prod.composition);
    setField('strength',     prod.strength);
    setField('dosageForm',   prod.dosageForm);
    setField('pack',         prod.pack);
    setField('manufacturer', prod.manufacturer);
    setField('hsn',          prod.hsn);
    setField('gstPct',       prod.gst);
    setField('rate',         prod.rate);
    setField('mrp',          prod.mrp);
    setField('ptr',          prod.ptr);

    const qtyEl = tr.querySelector('[data-field="qty"]');
    if (qtyEl) { qtyEl.focus(); qtyEl.select(); }
  }

  function handleGridKeydown(e, tr) {
    const allInputs = Array.from(tr.querySelectorAll('.grid-input:not([readonly])'));
    const idx = allInputs.indexOf(e.target);

    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      if (idx < allInputs.length - 1) {
        allInputs[idx + 1].focus();
        allInputs[idx + 1].select();
      } else {
        // Last cell — go to next row
        const allRows = Array.from(document.querySelectorAll('#productTbody tr'));
        const rowIdx  = allRows.indexOf(tr);
        if (rowIdx < allRows.length - 1) {
          const nextInputs = allRows[rowIdx + 1].querySelectorAll('.grid-input:not([readonly])');
          if (nextInputs.length) { nextInputs[0].focus(); nextInputs[0].select(); }
        } else {
          addRow();
          setTimeout(() => {
            const newRow = document.querySelector('#productTbody tr:last-child .grid-input');
            if (newRow) newRow.focus();
          }, 50);
        }
      }
    }

    if (e.key === 'ArrowDown') {
      const allRows = Array.from(document.querySelectorAll('#productTbody tr'));
      const rowIdx  = allRows.indexOf(tr);
      if (rowIdx < allRows.length - 1) {
        const nextRow    = allRows[rowIdx + 1];
        const nextInputs = nextRow.querySelectorAll('.grid-input:not([readonly])');
        if (nextInputs[idx]) { nextInputs[idx].focus(); e.preventDefault(); }
      }
    }

    if (e.key === 'ArrowUp') {
      const allRows = Array.from(document.querySelectorAll('#productTbody tr'));
      const rowIdx  = allRows.indexOf(tr);
      if (rowIdx > 0) {
        const prevRow    = allRows[rowIdx - 1];
        const prevInputs = prevRow.querySelectorAll('.grid-input:not([readonly])');
        if (prevInputs[idx]) { prevInputs[idx].focus(); e.preventDefault(); }
      }
    }
  }

  // Public: duplicate row
  function duplicateRow(rowId) {
    const row = state.rows.find(r => r._id === rowId);
    if (!row) return;
    const copy = { ...row };
    addRow(copy);
    AppToast.show('Row duplicated', 'info');
  }

  // ── Re-render entire tbody (used by move up/down) ────
  function reRenderTbody() {
    const tbody = document.getElementById('productTbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    state.rows.forEach((row, idx) => {
      const tr = renderRow(row, idx);
      tbody.appendChild(tr);
    });
    updateSummaryPanel();
  }

  // Public: move row up
  function moveRowUp(rowId) {
    const idx = state.rows.findIndex(r => r._id === rowId);
    if (idx <= 0) { AppToast.show('Row is already at the top', 'info'); return; }
    [state.rows[idx - 1], state.rows[idx]] = [state.rows[idx], state.rows[idx - 1]];
    reRenderTbody();
    // Re-focus moved row
    const movedTr = document.getElementById('product-row-' + rowId);
    if (movedTr) {
      movedTr.classList.add('row-flash');
      setTimeout(() => movedTr.classList.remove('row-flash'), 600);
    }
  }

  // Public: move row down
  function moveRowDown(rowId) {
    const idx = state.rows.findIndex(r => r._id === rowId);
    if (idx >= state.rows.length - 1) { AppToast.show('Row is already at the bottom', 'info'); return; }
    [state.rows[idx], state.rows[idx + 1]] = [state.rows[idx + 1], state.rows[idx]];
    reRenderTbody();
    const movedTr = document.getElementById('product-row-' + rowId);
    if (movedTr) {
      movedTr.classList.add('row-flash');
      setTimeout(() => movedTr.classList.remove('row-flash'), 600);
    }
  }

  // Public: delete row
  function deleteRow(rowId) {
    const idx = state.rows.findIndex(r => r._id === rowId);
    if (idx === -1) return;
    state.rows.splice(idx, 1);
    reRenderTbody();
    if (state.rows.length === 0) {
      addRow(); // always keep at least 1 empty row
    }
    AppToast.show('Row deleted', 'info');
  }

  // ── Totals Calculation ────────────────────────
  function calcTotals() {
    let totalItems   = state.rows.filter(r => r.qty > 0).length;
    let totalQty     = 0, freeQty = 0, gross = 0, discAmt = 0;
    let taxable      = 0, cgst = 0, sgst = 0, igst = 0;

    state.rows.forEach(r => {
      totalQty += parseFloat(r.qty) || 0;
      freeQty  += parseFloat(r.freeQty) || 0;
      gross    += (parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0);
      discAmt  += parseFloat(r.discountAmt) || 0;
      taxable  += parseFloat(r.taxableValue) || 0;
      cgst     += parseFloat(r.cgst) || 0;
      sgst     += parseFloat(r.sgst) || 0;
      igst     += parseFloat(r.igst) || 0;
    });

    const tEl = document.getElementById('invTransportCharges');
    const oEl = document.getElementById('invOtherCharges');
    state.transport = tEl ? (parseFloat(tEl.value) || 0) : (parseFloat(state.transport) || 0);
    state.otherCharges = oEl ? (parseFloat(oEl.value) || 0) : (parseFloat(state.otherCharges) || 0);

    const transport  = state.transport;
    const other      = state.otherCharges;
    const preRound   = taxable + cgst + sgst + igst + transport + other;
    const roundOff   = Math.round(preRound) - preRound;
    const grandTotal = preRound + roundOff;

    return { totalItems, totalQty, freeQty, gross, discAmt, taxable, cgst, sgst, igst,
             transport, other, roundOff, grandTotal, preRound };
  }

  // ── Section 4: Invoice Summary ────────────────
  function renderInvoiceSummary(t) {
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('sumTotalItems',    t.totalItems);
    setEl('sumTotalQty',      t.totalQty.toFixed(0));
    setEl('sumFreeQty',       t.freeQty.toFixed(0));
    setEl('sumGross',         PH_DATA.formatCurrency(t.gross));
    setEl('sumDiscount',      PH_DATA.formatCurrency(t.discAmt));
    setEl('sumTaxable',       PH_DATA.formatCurrency(t.taxable));
    setEl('sumCGST',          PH_DATA.formatCurrency(t.cgst));
    setEl('sumSGST',          PH_DATA.formatCurrency(t.sgst));
    setEl('sumIGST',          PH_DATA.formatCurrency(t.igst));
    setEl('sumRoundOff',      (t.roundOff >= 0 ? '+' : '') + PH_DATA.formatNum(t.roundOff));
    setEl('sumTransport',     PH_DATA.formatCurrency(t.transport));
    setEl('sumOther',         PH_DATA.formatCurrency(t.other));
    setEl('sumGrandTotal',    PH_DATA.formatCurrency(t.grandTotal));
    setEl('sumAmtWords',      'Rupees ' + PH_DATA.numberToWords(t.grandTotal).replace('Rupees ',''));

    updatePaymentSummary(t.grandTotal);
  }

  function updatePaymentSummary(grandTotal) {
    const amtReceived = parseFloat(state.amtReceived) || 0;
    const balance = grandTotal - amtReceived;

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('payBalanceDue', PH_DATA.formatCurrency(balance));

    const statusEl = document.getElementById('payStatus');
    if (statusEl) {
      if (balance <= 0)           { statusEl.textContent = 'Paid'; statusEl.className = 'badge badge-success'; }
      else if (amtReceived > 0)   { statusEl.textContent = 'Partial'; statusEl.className = 'badge badge-warning'; }
      else                        { statusEl.textContent = 'Pending'; statusEl.className = 'badge badge-danger'; }
    }
  }

  function updateSummaryPanel() {
    const t = calcTotals();
    renderInvoiceSummary(t);

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    setEl('sp-items',    t.totalItems);
    setEl('sp-qty',      t.totalQty.toFixed(0));
    setEl('sp-free',     t.freeQty.toFixed(0));
    setEl('sp-subtotal', PH_DATA.formatCurrency(t.gross));
    setEl('sp-discount', '– ' + PH_DATA.formatCurrency(t.discAmt));
    setEl('sp-gst',      PH_DATA.formatCurrency(t.cgst + t.sgst + t.igst));
    setEl('sp-roundoff', (t.roundOff >= 0 ? '+' : '') + PH_DATA.formatNum(t.roundOff));
    setEl('sp-grand',    PH_DATA.formatCurrency(t.grandTotal));

    if (state.customer) {
      const osEl = document.getElementById('sp-outstanding');
      if (osEl) osEl.textContent = PH_DATA.formatCurrency(state.customer.outstanding);
    }
  }

  // ── Section 5: Payment ────────────────────────
  function bindSection5Events() {
    const amtEl = document.getElementById('payAmtReceived');
    if (amtEl) amtEl.addEventListener('input', e => {
      state.amtReceived = parseFloat(e.target.value) || 0;
      const t = calcTotals();
      updatePaymentSummary(t.grandTotal);
    });

    const txnEl = document.getElementById('payTxnId');
    if (txnEl) txnEl.addEventListener('input', e => { state.txnId = e.target.value; });

    const noteEl = document.getElementById('payNotes');
    if (noteEl) noteEl.addEventListener('input', e => { state.notes = e.target.value; });
  }

  // ── Toolbar / Save ────────────────────────────
  function bindToolbarEvents() {
    const btn = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    btn('toolSaveDraft',   saveDraft);
    btn('toolSaveInvoice', saveInvoice);
    btn('toolPrint',       printInvoice);
    btn('toolPDF',         printInvoice);  // same as print
    btn('toolEmail',       emailInvoice);
    btn('toolWhatsApp',    whatsappInvoice);
    btn('toolCancel',      cancelInvoice);
    btn('toolDuplicate',   duplicateInvoice);
    btn('toolPreview',     openPreview);
    btn('toolAddRow',      () => { addRow(); AppToast.show('New row added', 'info'); });
  }

  function validate() {
    const errors = [];
    if (!state.customer)           errors.push('Please select a customer');
    const activeRows = state.rows.filter(r => r.qty > 0 && r.productName);
    if (activeRows.length === 0)   errors.push('Add at least one product with quantity');

    activeRows.forEach((r, i) => {
      if (!r.hsn)       errors.push(`Row ${i+1}: HSN Code is required`);
      if (r.qty <= 0)   errors.push(`Row ${i+1}: Quantity must be > 0`);
      if (r.rate <= 0)  errors.push(`Row ${i+1}: Rate must be > 0`);
      if (r.discountPct > 100) errors.push(`Row ${i+1}: Discount cannot exceed 100%`);
    });

    return errors;
  }

  function saveInvoice() {
    const errors = validate();
    if (errors.length > 0) {
      AppToast.show(errors[0], 'error');
      return;
    }
    const t = calcTotals();
    
    // Grab dispatch details
    const orderNo = document.getElementById('invOrderNo')?.value || '';
    const transportName = document.getElementById('invTransport')?.value || '';
    const lrNo = document.getElementById('invLRNo')?.value || '';
    const ewayBill = document.getElementById('invEwayBill')?.value || '';

    // Update state so it is accessible elsewhere
    state.orderNo = orderNo;
    state.transportName = transportName;
    state.lrNo = lrNo;
    state.ewayBill = ewayBill;

    const invoice = {
      id:     'INV' + Date.now(),
      number: state.invoiceNumber,
      date:   state.invoiceDate,
      dueDate:state.invoiceDueDate,
      time:   state.invoiceTime,
      customerId: state.customer.id,
      customer: state.customer,
      custName: state.customer.name,
      type:   state.invoiceType,
      paymentMode: state.paymentMode,
      exec:   state.executive,
      orderNo: orderNo,
      transport: transportName,
      lrNo: lrNo,
      ewayBill: ewayBill,
      items:  t.totalItems,
      qty:    t.totalQty,
      gross:  t.gross,
      discount: t.discAmt,
      taxable: t.taxable,
      cgst:   t.cgst,
      sgst:   t.sgst,
      igst:   t.igst,
      roundOff: t.roundOff,
      transportCharge: t.transport,
      grandTotal: t.grandTotal,
      status: 'paid',
      paymentStatus: state.amtReceived >= t.grandTotal ? 'Paid' : (state.amtReceived > 0 ? 'Partial' : 'Pending'),
      amtReceived: state.amtReceived,
      fy:     PH_DATA.company.fy,
    };

    // Filter only active rows (with qty > 0 and productName)
    const activeRows = state.rows.filter(r => r.qty > 0 && r.productName);
    
    // Attach products to the invoice object so Firebase saves them
    invoice.products = activeRows;

    PH_DATA.invoices.unshift(invoice);
    // Save per-invoice and latest invoice to localStorage so preview page can load it
    localStorage.setItem('padowa_invoice_' + invoice.number, JSON.stringify({ ...invoice, products: activeRows }));
    localStorage.setItem('padowa_last_invoice', JSON.stringify({ ...invoice, products: activeRows }));
    
    
    // Update customer outstanding
    if (state.customer && state.customer.id) {
        const cust = PH_DATA.getCustomerById(state.customer.id);
        if (cust) {
            const balanceDue = t.grandTotal - (state.amtReceived || 0);
            if (balanceDue !== 0) {
                cust.outstanding = (cust.outstanding || 0) + balanceDue;
                if (typeof window.saveCustomerToDB === 'function') window.saveCustomerToDB(cust);
            }
        }
    }
    
    // Save to Firebase
    if (typeof window.saveInvoiceToDB === 'function') {
        window.saveInvoiceToDB(invoice);
    }
    
    AppToast.show('✓ Invoice ' + state.invoiceNumber + ' saved successfully!', 'success');
    setAutosaveStatus('saved');

    // Reset for new invoice and navigate
    resetForm();
    if (window.App && typeof App.navigate === 'function') {
        App.navigate('invoiceHistory');
    }
  }

  function saveDraft() {
    state.isDraft = true;
    const t = calcTotals();
    AppToast.show('Draft saved – ' + PH_DATA.formatCurrency(t.grandTotal), 'info');
    setAutosaveStatus('saved');
  }

  function printInvoice() {
    const errors = validate();
    if (errors.length > 0) { AppToast.show('Please complete the invoice before printing', 'warning'); return; }
    buildPrintPreview();
    document.getElementById('printPreviewModal').classList.add('is-open');
  }

  function emailInvoice() {
    AppToast.show('Email feature: connect to mail service API', 'info');
  }

  async function whatsappInvoice() {
    const btn = document.getElementById('toolWhatsApp');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = '<span class="material-icons-outlined">hourglass_empty</span> Gen PDF...';
      btn.disabled = true;
    }
    
    try {
      buildPrintPreview();
      const element = document.getElementById('printableInvoice');
      const invoiceId = state.invoiceNumber || 'Invoice';
      const opt = {
          margin:       0,
          filename:     `Invoice_${invoiceId}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
              files: [file],
              title: `Invoice ${invoiceId}`,
              text: `Please find attached Invoice ${invoiceId} from PADOWA Healthcare.`,
          });
      } else {
          // Fallback
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = opt.filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          alert("Your browser doesn't support direct PDF sharing to WhatsApp. The PDF has been downloaded. You can now open WhatsApp Web and attach this file.");
      }
    } catch(err) {
      console.error('PDF generation failed:', err);
      AppToast.show('Failed to generate PDF for sharing.', 'error');
    } finally {
      if (btn) {
        btn.innerHTML = originalText || '<span class="material-icons-outlined">chat</span> WhatsApp';
        btn.disabled = false;
      }
    }
  }

  function cancelInvoice() {
    if (confirm('Cancel this invoice? This action cannot be undone.')) {
      AppToast.show('Invoice cancelled', 'error');
      resetForm();
      init();
    }
  }

  function duplicateInvoice() {
    AppToast.show('Duplicating invoice...', 'info');
    // Keep rows and customer, just generate new number
    state.invoiceNumber = PH_DATA.generateInvoiceNumber();
    state.invoiceDate   = new Date().toISOString().split('T')[0];
    renderInvoiceNumber();
    renderDateTimeFields();
    AppToast.show('New invoice created as duplicate', 'success');
  }

  function openPreview() {
    buildPrintPreview();
    document.getElementById('printPreviewModal').classList.add('is-open');
  }

  function resetForm() {
    state.customer     = null;
    state.rows         = [];
    state.amtReceived  = 0;
    state.transport    = 0;
    state.otherCharges = 0;
    rowCounter         = 0;

    const tEl = document.getElementById('invTransportCharges');
    if (tEl) tEl.value = '0';
    const oEl = document.getElementById('invOtherCharges');
    if (oEl) oEl.value = '0';
    state.invoiceNumber = '';

    const custCard = document.getElementById('customerInfoCard');
    if (custCard) { custCard.classList.remove('is-visible'); custCard.innerHTML = ''; }
    const custSearch = document.getElementById('custSearch');
    if (custSearch) custSearch.value = '';

    renderProductGrid();
    renderInvoiceNumber();
    updateSummaryPanel();
  }

  // ── Print Preview Builder ─────────────────────
  function buildPrintPreview() {
    const t = calcTotals();
    const c = state.customer || {};
    let co = PH_DATA.company;
    
    let printCopies = 1;
    let printWatermark = true;
    let printLogo = true;

    // Override 'co' with settings from localStorage
    try {
        const savedSettings = localStorage.getItem('padowa_invoice_settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            co = {
                ...co,
                name: settings.compName || co.name,
                tagline: settings.branchName || co.tagline,
                phone: settings.compPhone || co.phone,
                email: settings.compEmail || co.email,
                gstin: settings.compGSTIN || co.gstin,
                drugLicense: settings.compDL || co.drugLicense,
                address: settings.address || co.address,
            };
            if (settings.printCopies) printCopies = parseInt(settings.printCopies) || 1;
            if (settings.printWatermark !== undefined) printWatermark = settings.printWatermark;
            if (settings.printLogo !== undefined) printLogo = settings.printLogo;
        }
    } catch(e) {}
    const isInter = state.isInterState || false;

    // GST summary by rate
    const gstByRate = {};
    state.rows.forEach(r => {
      if (!r.qty || !r.taxableValue) return;
      const pct = r.gstPct || 0;
      if (!gstByRate[pct]) gstByRate[pct] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      gstByRate[pct].taxable += r.taxableValue;
      gstByRate[pct].cgst    += r.cgst;
      gstByRate[pct].sgst    += r.sgst;
      gstByRate[pct].igst    += r.igst;
    });

    const gstRows = Object.entries(gstByRate).map(([pct, g]) => `
      <tr>
        <td>${pct}%</td>
        <td>${PH_DATA.formatNum(g.taxable)}</td>
        <td>${PH_DATA.formatNum(g.cgst)}</td>
        <td>${PH_DATA.formatNum(g.sgst)}</td>
        <td>${PH_DATA.formatNum(g.igst)}</td>
        <td>${PH_DATA.formatNum(g.cgst + g.sgst + g.igst)}</td>
      </tr>`).join('');

    const productRows = state.rows.filter(r => r.qty > 0).map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td class="text-l mono">${r.productCode || 'PRD'}</td>
        <td class="text-l" style="font-weight:700;">${r.productName || ''}</td>
        <td class="text-l">${r.composition || ''}</td>
        <td>${r.strength || ''}</td>
        <td>${r.dosageForm || ''}</td>
        <td>${r.pack || ''}</td>
        <td class="mono">${r.batchNo || ''}</td>
        <td>${r.mfgDate ? r.mfgDate.substring(0,7).replace('-','/') : ''}</td>
        <td>${r.expiryDate ? r.expiryDate.substring(0,7).replace('-','/') : ''}</td>
        <td class="mono">${r.hsn || ''}</td>
        <td>${r.gstPct || 0}%</td>
        <td class="mono">${r.qty || 0}</td>
        <td class="mono">${r.freeQty || 0}</td>
        <td class="text-r mono">${PH_DATA.formatNum(r.rate || 0)}</td>
        <td class="text-r mono">${PH_DATA.formatNum(r.mrp || 0)}</td>
        <td class="text-r mono">${PH_DATA.formatNum(r.ptr || 0)}</td>
        <td class="text-r mono">${r.discountPct > 0 ? r.discountPct+'%' : ''}</td>
        <td class="text-r mono">${PH_DATA.formatNum(r.discountAmt || 0)}</td>
        <td class="text-r mono">${PH_DATA.formatNum(r.taxableValue || 0)}</td>
        <td class="text-r mono">${isInter ? '-' : ((r.gstPct||0)/2)+'%'}</td>
        <td class="text-r mono">${isInter ? '-' : PH_DATA.formatNum(r.cgst || 0)}</td>
        <td class="text-r mono">${isInter ? '-' : ((r.gstPct||0)/2)+'%'}</td>
        <td class="text-r mono">${isInter ? '-' : PH_DATA.formatNum(r.sgst || 0)}</td>
        <td class="text-r mono">${!isInter ? '-' : (r.gstPct||0)+'%'}</td>
        <td class="text-r mono">${!isInter ? '-' : PH_DATA.formatNum(r.igst || 0)}</td>
        <td class="text-r mono" style="font-weight:700">${PH_DATA.formatNum(r.total || 0)}</td>
        <td class="text-l">${r.remarks || ''}</td>
      </tr>`).join('');

    let savedBank = PH_DATA.company.bank;
    let savedBranch = 'Indiranagar Branch';
    let savedAcc = PH_DATA.company.accNo;
    let savedIFSC = PH_DATA.company.ifsc;
    let savedUPI = PH_DATA.company.upi;
    let savedTerms = `
      <ol style="margin-top:6px; padding-left:18px;">
        <li>Subject to Bengaluru jurisdiction only.</li>
        <li>Interest @24% per annum will be charged after due date.</li>
        <li>Please verify goods immediately upon delivery.</li>
        <li>E.&O.E.</li>
        <li>Payment within agreed credit period.</li>
        <li>Damaged goods accepted only with approval.</li>
        <li>Company reserves the right to change prices without notice.</li>
      </ol>
    `;
    let upiQRHtml = `<div class="print-qr">QR<br>Code</div>`;

    try {
        const setStr = localStorage.getItem('padowa_invoice_settings');
        if (setStr) {
            const settings = JSON.parse(setStr);
            if (settings.bankName) savedBank = settings.bankName;
            if (settings.bankBranch) savedBranch = settings.bankBranch;
            if (settings.accNo) savedAcc = settings.accNo;
            if (settings.ifsc) savedIFSC = settings.ifsc;
            if (settings.upi) savedUPI = settings.upi;
            if (settings.terms) savedTerms = `<div style="white-space: pre-wrap;">${settings.terms}</div>`;
            if (settings.upiQR) {
                upiQRHtml = `<img src="${settings.upiQR}" style="width:75px;height:75px;object-fit:cover;">`;
            }
        }
    } catch(e) {}

    let html = '';
    const copyLabels = ['Original for Recipient', 'Duplicate for Transporter', 'Triplicate for Supplier', 'Quadruplicate', 'Quintuplicate'];
    
    for (let copyIdx = 0; copyIdx < printCopies; copyIdx++) {
      const copyLabel = copyLabels[copyIdx] || ('Copy ' + (copyIdx+1));
      let watermarkHtml = '';
      if (printWatermark) {
          const logoUrl = settings.watermarkImage || co.logo || 'https://cdn-icons-png.flaticon.com/512/3004/3004451.png';
          watermarkHtml = `<div class="invoice-watermark" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;background-image:url('${logoUrl}');background-size:contain;background-repeat:no-repeat;background-position:center;opacity:0.05;z-index:0;pointer-events:none;"></div>`;
          if (state.isDraft) {
              watermarkHtml += `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:120px;color:rgba(0,0,0,0.06);font-weight:900;z-index:1;pointer-events:none;white-space:nowrap;">DRAFT</div>`;
          }
      }
      
      html += `
      <div class="print-doc" ${copyIdx===0 ? 'id="printableInvoice"' : ''} style="${copyIdx > 0 ? 'page-break-before: always;' : ''} position:relative;">
        ${watermarkHtml}
        <!-- HEADER -->
        <div class="print-header" style="position:relative;z-index:1;">
          <div class="print-company-col">
            <div class="print-company-logo-wrap">
              ${printLogo ? '<div class="print-logo-box">PH</div>' : ''}
              <div>
                <div class="print-company-name">${co.name}</div>
                <div class="print-tagline">${co.tagline}</div>
              </div>
            </div>
            <div class="print-co-details">
              <strong>Reg Office:</strong> ${co.address}<br>
              <strong>Phone:</strong> ${co.phone} | <strong>Email:</strong> ${co.email}<br>
              <strong>GSTIN:</strong> ${co.gstin} | <strong>DL No:</strong> ${co.drugLicense}
            </div>
          </div>
          <div class="print-title-col">
            <div class="print-title-text">GST TAX INVOICE</div>
            <div class="print-copy-type">${copyLabel}</div>
            <div class="print-inv-type">${state.invoiceType || 'Tax Invoice'}</div>
            <div class="print-barcode-box">*${state.invoiceNumber}*</div>
          </div>
          <div class="print-info-col">
            <table class="print-info-table">
              <tr><td class="lbl">Invoice No</td><td class="val">${state.invoiceNumber}</td></tr>
              <tr><td class="lbl">Date</td><td class="val">${state.invoiceDate}</td></tr>
              <tr><td class="lbl">Due Date</td><td class="val">${state.invoiceDueDate || 'N/A'}</td></tr>
              <tr><td class="lbl">Time</td><td class="val">${state.invoiceTime}</td></tr>
              <tr><td class="lbl">Fin Year</td><td class="val">${co.fy}</td></tr>
              <tr><td class="lbl">Order No</td><td class="val">${state.orderNo || 'N/A'}</td></tr>
              <tr><td class="lbl">E-Way Bill</td><td class="val">${state.ewayBill || 'N/A'}</td></tr>
              <tr><td class="lbl">LR No</td><td class="val">${state.lrNo || 'N/A'}</td></tr>
              <tr><td class="lbl">Transport</td><td class="val">${state.transportName || 'N/A'}</td></tr>
              <tr><td class="lbl">Sales Exec</td><td class="val">${state.executive || 'Admin'}</td></tr>
            </table>
          </div>
        </div>

        <!-- CUSTOMER DETAILS -->
        <div class="print-customer-details">
          <div class="print-cust-col">
            <div class="print-cust-title">Billed To</div>
            <table class="cust-grid-table">
              <tr><td class="lbl">Customer</td><td class="val cust-name-val">${c.name || ''}</td></tr>
              <tr><td class="lbl">Address</td><td class="val">${c.address || ''}, ${c.city || ''} - ${c.pincode || ''}</td></tr>
              <tr><td class="lbl">Contact</td><td class="val">${c.phone || ''}</td></tr>
              <tr><td class="lbl">GSTIN</td><td class="val" style="font-weight:700;">${c.gstin || 'Unregistered'}</td></tr>
              <tr><td class="lbl">Drug Lic</td><td class="val">${c.drugLicense || ''}</td></tr>
              <tr><td class="lbl">FSSAI</td><td class="val">${c.fssai || ''}</td></tr>
            </table>
          </div>
          <div class="print-cust-col">
            <div class="print-cust-title">Shipped To (Place of Supply)</div>
            <table class="cust-grid-table">
              <tr><td class="lbl">Customer</td><td class="val cust-name-val">${c.name || ''}</td></tr>
              <tr><td class="lbl">Address</td><td class="val">${c.shippingAddress || c.address || ''}, ${c.city || ''} - ${c.pincode || ''}</td></tr>
              <tr><td class="lbl">State</td><td class="val">${c.state || ''} (${c.stateCode || ''})</td></tr>
              <tr><td class="lbl">Place of Supply</td><td class="val">${c.placeOfSupply || c.state || ''}</td></tr>
              <tr><td class="lbl">Credit Days</td><td class="val">${c.creditDays || '30'} Days</td></tr>
              <tr><td class="lbl">Outstanding</td><td class="val">₹ ${PH_DATA.formatNum(c.outstanding || 0)}</td></tr>
            </table>
          </div>
        </div>

        <!-- PRODUCT TABLE -->
        <table class="print-product-table print-border-table">
          <thead>
            <tr>
              <th>S.No</th><th>Code</th><th>Product Name</th><th>Composition</th>
              <th>Str</th><th>Form</th><th>Pack</th><th>Batch</th><th>Mfg</th><th>Exp</th>
              <th>HSN</th><th>GST%</th><th>Qty</th><th>Free</th><th>Rate</th><th>MRP</th>
              <th>PTR</th><th>Disc%</th><th>DiscAmt</th><th>Taxable</th>
              <th>CGST%</th><th>CGST(₹)</th><th>SGST%</th><th>SGST(₹)</th><th>IGST%</th>
              <th>IGST(₹)</th><th>Total</th><th>Remarks</th>
            </tr>
          </thead>
          <tbody>${productRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="12" class="text-r" style="font-weight:700;">TOTAL</td>
              <td class="mono" style="font-weight:700;">${t.totalQty}</td>
              <td class="mono" style="font-weight:700;">${t.freeQty}</td>
              <td colspan="6"></td>
              <td class="text-r mono" style="font-weight:700;">${PH_DATA.formatNum(t.taxable)}</td>
              <td colspan="6"></td>
              <td class="text-r mono" style="font-weight:800;color:#0057D9;">${PH_DATA.formatNum(t.preRound)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <!-- SUMMARY AREA -->
        <div class="print-summary-wrap">
          <div class="print-summary-left">
            <div class="print-amt-words">
              Amount in words: Rupees ${PH_DATA.numberToWords(t.grandTotal)}
            </div>
            <table class="gst-box-table print-border-table">
              <thead>
                <tr>
                  <th>GST %</th><th>Taxable(₹)</th><th>CGST(₹)</th><th>SGST(₹)</th><th>IGST(₹)</th><th>Total GST(₹)</th>
                </tr>
              </thead>
              <tbody>${gstRows}</tbody>
              <tfoot>
                <tr>
                  <th style="text-align:center">Total</th>
                  <th>${PH_DATA.formatNum(t.taxable)}</th>
                  <th>${PH_DATA.formatNum(t.cgst)}</th>
                  <th>${PH_DATA.formatNum(t.sgst)}</th>
                  <th>${PH_DATA.formatNum(t.igst)}</th>
                  <th>${PH_DATA.formatNum(t.cgst+t.sgst+t.igst)}</th>
                </tr>
              </tfoot>
            </table>
          </div>
          <div class="print-summary-right">
            <table class="inv-summary-table">
              <tr><td class="lbl">Total Products</td><td class="val">${t.totalItems}</td></tr>
              <tr><td class="lbl">Total Qty (Incl. Free)</td><td class="val">${t.totalQty + t.freeQty}</td></tr>
              <tr><td class="lbl">Gross Amount</td><td class="val">${PH_DATA.formatNum(t.gross)}</td></tr>
              <tr><td class="lbl">Discount</td><td class="val">- ${PH_DATA.formatNum(t.discAmt)}</td></tr>
              <tr><td class="lbl">Taxable Amount</td><td class="val">${PH_DATA.formatNum(t.taxable)}</td></tr>
              <tr><td class="lbl">CGST</td><td class="val">${PH_DATA.formatNum(t.cgst)}</td></tr>
              <tr><td class="lbl">SGST</td><td class="val">${PH_DATA.formatNum(t.sgst)}</td></tr>
              <tr><td class="lbl">IGST</td><td class="val">${PH_DATA.formatNum(t.igst)}</td></tr>
              <tr><td class="lbl">Transport Charges</td><td class="val">${PH_DATA.formatNum(state.transport||0)}</td></tr>
              <tr><td class="lbl">Other Charges</td><td class="val">${PH_DATA.formatNum(state.otherCharges||0)}</td></tr>
              <tr><td class="lbl">Round Off</td><td class="val">${t.roundOff >= 0 ? '+' : ''}${PH_DATA.formatNum(t.roundOff)}</td></tr>
              <tr class="grand-total-row"><td class="lbl">GRAND TOTAL</td><td class="val">₹ ${PH_DATA.formatNum(t.grandTotal)}</td></tr>
              <tr><td class="lbl">Amount Received</td><td class="val">${PH_DATA.formatNum(state.amtReceived||0)}</td></tr>
              <tr><td class="lbl">Balance Due</td><td class="val" style="color:#d32f2f;">${PH_DATA.formatNum(t.grandTotal - (state.amtReceived||0))}</td></tr>
            </table>
          </div>
        </div>

        <!-- FOOTER: BANK, TERMS, SIGNATURES -->
        <div class="print-footer-grid">
          <div class="print-bank-details">
            <div style="font-weight:700;margin-bottom:4px;text-transform:uppercase;">Bank Details</div>
            <strong>A/C Name:</strong> ${co.name}<br>
            <strong>Bank:</strong> ${savedBank}<br>
            <strong>Branch:</strong> ${savedBranch}<br>
            <strong>A/C No:</strong> ${savedAcc}<br>
            <strong>IFSC:</strong> ${savedIFSC}<br>
            <strong>UPI ID:</strong> ${savedUPI}<br>
            ${upiQRHtml}
          </div>
          <div class="print-terms">
            <div style="font-weight:700;margin-bottom:4px;text-transform:uppercase;">Terms & Conditions</div>
            ${savedTerms}
          </div>
          <div class="print-signature-box">
            <div>
              <div class="company-for">For ${co.name}</div>
            </div>
            <div>
              <div class="sign-line">Authorized Signatory<br>& Company Seal</div>
            </div>
          </div>
        </div>

      </div>
    `;
    } // end for loop

    const frame = document.getElementById('printPreviewFrame');
    if (frame) frame.innerHTML = html;
  }

  // ── Autosave ──────────────────────────────────
  function startAutosave() {
    if (state.autosaveTimer) clearInterval(state.autosaveTimer);
    state.autosaveTimer = setInterval(() => {
      if (state.rows.some(r => r.qty > 0)) {
        setAutosaveStatus('saving');
        setTimeout(() => {
          try {
            localStorage.setItem('padowa_invoice_draft', JSON.stringify({
              state: { ...state, autosaveTimer: null },
              ts: Date.now(),
            }));
          } catch(e) {}
          state.lastSaved = new Date();
          setAutosaveStatus('saved');
        }, 600);
      }
    }, 30000);
  }

  function setAutosaveStatus(status) {
    const dot  = document.getElementById('autosaveDot');
    const text = document.getElementById('autosaveText');
    if (!dot || !text) return;

    if (status === 'saving') {
      dot.className = 'autosave-dot saving';
      text.textContent = 'Saving...';
    } else {
      dot.className = 'autosave-dot';
      const t = state.lastSaved;
      text.textContent = t ? 'Saved ' + t.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}) : 'Auto-saved';
    }
  }

  // ── Utilities ─────────────────────────────────
  function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  // ── Public API ────────────────────────────────
  return {
    init, addRow, duplicateRow, deleteRow,
    moveRowUp, moveRowDown,
    updateSummaryPanel, buildPrintPreview, printInvoice, populateStep6Settings,
    // Called by customer add modal to auto-select the new customer
    selectCustomerById(id) {
      const cust = PH_DATA.getCustomerById(id);
      if (cust) {
        selectCustomer(cust);
        const si = document.getElementById('custSearch');
        if (si) si.value = cust.name;
      }
    },
  };

})();
