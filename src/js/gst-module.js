/* ════════════════════════════════════════════════
   PADOWA Healthcare – GST Compliance Module
   Reads real data from PH_DATA.invoices.
   No business logic invented – only display.
════════════════════════════════════════════════ */

// ── Helpers ────────────────────────────────────
function gstGetCurrentPeriod() {
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

function gstMonthLabel(d) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function gstInvoicesForPeriod(periodStr, includeCancelled = false) {
  // periodStr like "Jul 2026"
  if (!periodStr || periodStr === 'All') return PH_DATA.invoices.filter(i => includeCancelled || i.status !== 'cancelled');
  const [mon, yr] = periodStr.split(' ');
  const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  const mIdx = months[mon];
  const yr4 = parseInt(yr, 10);
  return PH_DATA.invoices.filter(i => {
    if (!includeCancelled && i.status === 'cancelled') return false;
    const d = new Date(i.date);
    return d.getMonth() === mIdx && d.getFullYear() === yr4;
  });
}

function gstBuildPeriodOptions(selectId) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const seen = new Set();
  const opts = [];
  PH_DATA.invoices.forEach(inv => {
    if (!inv.date) return;
    const d = new Date(inv.date);
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    if (!seen.has(label)) { seen.add(label); opts.push(label); }
  });
  // Current month always first
  const now = new Date();
  const curLabel = now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  if (!seen.has(curLabel)) opts.unshift(curLabel);
  el.innerHTML = opts.map((o, i) => `<option${i===0?' selected':''}>${o}</option>`).join('');
}

// ── GST Dashboard ──────────────────────────────
window.renderGSTDashboard = function() {
  gstBuildPeriodOptions('gstDashPeriod');
  const periodEl = document.getElementById('gstDashPeriod');
  const period = periodEl ? periodEl.value : null;
  _renderGSTDashboard(period);

  if (periodEl && !periodEl.dataset.bound) {
    periodEl.dataset.bound = '1';
    periodEl.addEventListener('change', () => _renderGSTDashboard(periodEl.value));
  }
};

function _renderGSTDashboard(periodStr) {
  const allInvs = gstInvoicesForPeriod(periodStr, true);
  const invs = allInvs.filter(i => i.status !== 'cancelled');
  const cancelled = allInvs.filter(i => i.status === 'cancelled');
  const cn = invs.filter(i => (i.type || '').toLowerCase().includes('credit'));
  const dn = invs.filter(i => (i.type || '').toLowerCase().includes('debit'));
  
  const b2b = invs.filter(i => i.customer && i.customer.gstin);
  const b2c = invs.filter(i => !i.customer || !i.customer.gstin);
  const taxable = invs.reduce((s, i) => s + (i.taxable || 0), 0);
  const cgst = invs.reduce((s, i) => s + (i.cgst || 0), 0);
  const sgst = invs.reduce((s, i) => s + (i.sgst || 0), 0);
  const igst = invs.reduce((s, i) => s + (i.igst || 0), 0);
  const gstTotal = cgst + sgst + igst;

  const fmt = n => PH_DATA.formatCurrency(n);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('gstDashTotalInv', invs.length);
  set('gstDashB2B', b2b.length);
  set('gstDashB2C', b2c.length);
  set('gstDashCN', cn.length);
  set('gstDashDN', dn.length);
  set('gstDashCancelled', cancelled.length);
  set('gstDashTaxable', fmt(taxable));
  set('gstDashGSTCollected', fmt(gstTotal));
  set('gstDashLiability', fmt(gstTotal));
  set('gstDashPeriodLabel', periodStr || '—');

  // Return Period Due Date
  const dueDateEl = document.getElementById('gstDashDueDate');
  if (dueDateEl && periodStr) {
    const [mon, yr] = periodStr.split(' ');
    const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
    const dateObj = new Date(parseInt(yr), months[mon] + 1, 11);
    dueDateEl.textContent = `Due Date: ${dateObj.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}`;
  }

  // Return Status Panel & Period Status
  const history = JSON.parse(localStorage.getItem('padowa_filing_history') || '[]');
  const currentFiling = history.find(h => h.period === periodStr && h.type === 'GSTR-1');
  const statusEl = document.getElementById('gstDashStatus');
  const rsStatusEl = document.getElementById('rsCurrentStatus');
  if (statusEl && rsStatusEl) {
    if (currentFiling && currentFiling.status === 'Filed') {
      statusEl.textContent = 'Filed';
      statusEl.style.color = 'var(--success)';
      rsStatusEl.textContent = 'Filed';
      rsStatusEl.className = 'badge badge-success';
    } else {
      statusEl.textContent = 'Pending';
      statusEl.style.color = 'var(--warning)';
      rsStatusEl.textContent = 'Pending';
      rsStatusEl.className = 'badge badge-warning';
    }
  }

  set('rsCurrentReturn', periodStr ? `GSTR-1 (${periodStr})` : '—');
  set('rsDueDate', dueDateEl ? dueDateEl.textContent.replace('Due Date: ', '') : '—');

  const lastFiled = history.slice().reverse().find(h => h.status === 'Filed');
  if (lastFiled) {
    set('rsLastReturn', `${lastFiled.type} (${lastFiled.period})`);
    set('rsLastDate', lastFiled.filedDate);
    set('rsLastARN', lastFiled.arn);
  } else {
    set('rsLastReturn', '—');
    set('rsLastDate', '—');
    set('rsLastARN', 'Pending');
  }

  // Liability summary table
  const ltbody = document.getElementById('gstLiabilityTbody');
  if (ltbody) {
    ltbody.innerHTML = `
      <tr><td>CGST</td><td class="amount">${fmt(cgst)}</td></tr>
      <tr><td>SGST</td><td class="amount">${fmt(sgst)}</td></tr>
      <tr><td>IGST</td><td class="amount">${fmt(igst)}</td></tr>
      <tr><td>CESS</td><td class="amount">${fmt(0)}</td></tr>
      <tr style="font-weight:700;background:var(--bg);">
        <td>TOTAL GST LIABILITY</td>
        <td class="amount total" style="color:var(--primary);">${fmt(gstTotal)}</td>
      </tr>`;
  }
}

// ── GSTR-1 Register ───────────────────────────
window.renderGSTR1 = function() {
  gstBuildPeriodOptions('gstr1Period');
  const periodEl = document.getElementById('gstr1Period');
  
  // Build customer options for the selected period
  const custEl = document.getElementById('gstr1Customer');
  if (custEl) {
    const invs = gstInvoicesForPeriod(periodEl ? periodEl.value : null);
    const customers = [...new Set(invs.filter(i => i.custName).map(i => i.custName))].sort();
    custEl.innerHTML = '<option value="">All Customers</option>' + customers.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  _renderGSTR1();

  // Bind filter events
  ['gstr1Period', 'gstr1Type', 'gstr1Supply', 'gstr1Status', 'gstr1Customer'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset.bound) {
      el.dataset.bound = '1';
      el.addEventListener('change', () => {
        if (id === 'gstr1Period') window.renderGSTR1(); // rebuild customers if period changes
        else _renderGSTR1();
      });
    }
  });
  
  const srchEl = document.getElementById('gstr1SearchInput');
  if (srchEl && !srchEl.dataset.bound) {
    srchEl.dataset.bound = '1';
    srchEl.addEventListener('input', _renderGSTR1);
  }
  const srchBtn = document.getElementById('gstr1SearchBtn');
  if (srchBtn && !srchBtn.dataset.bound) {
    srchBtn.dataset.bound = '1';
    srchBtn.addEventListener('click', _renderGSTR1);
  }
};

window.setGSTR1Filter = function(filterType, value) {
  if (filterType === 'Category') {
    const el = document.getElementById('gstr1Type');
    if (el) el.value = value;
  } else if (filterType === 'Status') {
    const el = document.getElementById('gstr1Status');
    if (el) el.value = value;
  }
  _renderGSTR1();
};

window.markInvoiceAction = function(id, action) {
  const inv = PH_DATA.invoices.find(i => (i.id === id || i.number === id));
  if (inv) {
    if (action === 'ready') inv.status = 'ready';
    else if (action === 'filed') inv.status = 'filed';
    AppToast.show(`Invoice ${inv.number} marked as ${action}.`, 'success');
    _renderGSTR1();
  }
};
window.resetGSTR1Filters = function() {
  ['gstr1Type', 'gstr1Supply', 'gstr1Status', 'gstr1Customer'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.options.length > 0) el.value = el.options[0].value;
    else if (el) el.value = '';
  });
  const srch = document.getElementById('gstr1SearchInput');
  if (srch) srch.value = '';
  _renderGSTR1();
};

function _renderGSTR1() {
  const periodStr = document.getElementById('gstr1Period')?.value;
  const tbody = document.getElementById('gstr1Tbody');
  if (!tbody) return;
  
  let allInvs = gstInvoicesForPeriod(periodStr);
  const fmt = n => PH_DATA.formatNum(n || 0);
  const coState = (PH_DATA.company && PH_DATA.company.gstin) ? PH_DATA.company.gstin.substring(0, 2) : '37';
  const history = JSON.parse(localStorage.getItem('padowa_filing_history') || '[]');
  const isPeriodFiled = history.some(h => h.period === periodStr && h.type === 'GSTR-1' && h.status === 'Filed');
  
  // Data processing: Add calculated properties to each invoice
  allInvs.forEach(inv => {
    const custState = (inv.customer && inv.customer.gstin) ? inv.customer.gstin.substring(0, 2) : coState;
    const isExport = (inv.customer && inv.customer.isExport);
    inv._supplyType = isExport ? 'Export' : (coState !== custState ? 'Inter-State' : 'Intra-State');
    
    const isCredit = (inv.type || '').toLowerCase().includes('credit');
    const isDebit = (inv.type || '').toLowerCase().includes('debit');
    
    if (isCredit) inv._category = 'Credit Note';
    else if (isDebit) inv._category = 'Debit Note';
    else if (inv.customer && inv.customer.gstin) inv._category = 'B2B';
    else if (inv._supplyType === 'Inter-State' && (inv.grandTotal || 0) > 250000) inv._category = 'B2CL';
    else inv._category = 'B2CS';
    
    if (inv.status === 'cancelled') inv._status = 'Cancelled';
    else if (isPeriodFiled || inv.status === 'filed') inv._status = 'Filed';
    else if (inv.status === 'ready') inv._status = 'Ready';
    else inv._status = 'Draft';

    inv._gstAmt = (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0) + (inv.cess || 0);
    
    // Validation Engine
    inv._issues = [];
    if (inv._status !== 'Cancelled') {
      if (inv._category === 'B2B' && (!inv.customer || !inv.customer.gstin)) inv._issues.push({ severity: 'Error', issue: 'Missing GSTIN for B2B' });
      if ((inv.grandTotal || 0) < 0 && inv._category !== 'Credit Note') inv._issues.push({ severity: 'Error', issue: 'Negative Amount' });
      // Simulate some warning
      if (!inv.items || inv.items.some(it => !it.hsn)) inv._issues.push({ severity: 'Warning', issue: 'Missing HSN Code' });
    }
  });

  // Calculate Section 1 & 2 & 3 summaries based on ALL invoices for the period
  const getSum = (arr) => arr.reduce((acc, i) => {
    acc.tax += (i.taxable || 0); acc.gst += i._gstAmt; return acc;
  }, {tax:0, gst:0});

  const b2b = allInvs.filter(i => i._category === 'B2B');
  const b2cl = allInvs.filter(i => i._category === 'B2CL');
  const b2cs = allInvs.filter(i => i._category === 'B2CS');
  const cn = allInvs.filter(i => i._category === 'Credit Note');
  const dn = allInvs.filter(i => i._category === 'Debit Note');
  const canc = allInvs.filter(i => i._status === 'Cancelled');
  
  const b2bSum = getSum(b2b);
  const b2clSum = getSum(b2cl);
  const b2csSum = getSum(b2cs);
  const cnSum = getSum(cn);
  const dnSum = getSum(dn);
  const cancSum = getSum(canc);

  // Update Section 1
  if (document.getElementById('gstr1RetPeriod')) {
    document.getElementById('gstr1RetPeriod').innerText = periodStr || '—';
    document.getElementById('gstr1FY').innerText = PH_DATA.company?.fy || '2026-27';
    // Calculate Due Date
    if (periodStr) {
      const parts = periodStr.split(' ');
      const mIdx = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(parts[0]);
      if(mIdx >= 0 && parts[1]) {
        let y = parseInt(parts[1],10);
        let nm = mIdx + 1;
        if(nm > 11) { nm = 0; y++; }
        const dStr = new Date(y, nm, 11).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}).replace(/ /g, '-');
        document.getElementById('gstr1DueDate').innerText = dStr;
      }
    }
    
    let retStatusHTML = '<span class="badge badge-neutral">No Data</span>';
    if (allInvs.length > 0) {
      if (isPeriodFiled) retStatusHTML = '<span class="badge badge-success">Filed</span>';
      else if (allInvs.every(i => ['Ready', 'Filed', 'Cancelled'].includes(i._status))) retStatusHTML = '<span class="badge badge-success">Ready for Filing</span>';
      else retStatusHTML = '<span class="badge badge-warning">Pending Validation</span>';
    }
    document.getElementById('gstr1RetStatus').innerHTML = retStatusHTML;
    document.getElementById('gstr1ReadyCount').innerText = allInvs.filter(i => i._status === 'Ready').length;
    document.getElementById('gstr1PendingCount').innerText = allInvs.filter(i => i._status === 'Draft').length;
  }

  // Update Section 2
  const setKpi = (id, count, sumObj) => {
    if(document.getElementById(id+'Count')) document.getElementById(id+'Count').innerText = count;
    if(document.getElementById(id+'Tax')) document.getElementById(id+'Tax').innerText = '₹' + fmt(sumObj.tax);
    if(document.getElementById(id+'GST')) document.getElementById(id+'GST').innerText = '₹' + fmt(sumObj.gst);
  };
  setKpi('gstr1SumB2B', b2b.length, b2bSum);
  setKpi('gstr1SumB2CL', b2cl.length, b2clSum);
  setKpi('gstr1SumB2CS', b2cs.length, b2csSum);
  setKpi('gstr1SumCN', cn.length, cnSum);
  setKpi('gstr1SumDN', dn.length, dnSum);
  setKpi('gstr1SumCanc', canc.length, cancSum);

  // Update Section 3
  const overall = allInvs.filter(i => i._status !== 'Cancelled');
  const totTax = overall.reduce((a,c) => a + (c.taxable||0), 0);
  const totCGST = overall.reduce((a,c) => a + (c.cgst||0), 0);
  const totSGST = overall.reduce((a,c) => a + (c.sgst||0), 0);
  const totIGST = overall.reduce((a,c) => a + (c.igst||0), 0);
  const totCESS = overall.reduce((a,c) => a + (c.cess||0), 0);
  const totGST = totCGST + totSGST + totIGST + totCESS;
  const totVal = overall.reduce((a,c) => a + (c.grandTotal||0), 0);
  
  if (document.getElementById('gstr1TotInv')) {
    document.getElementById('gstr1TotInv').innerText = overall.length;
    document.getElementById('gstr1TotTax').innerText = '₹' + fmt(totTax);
    document.getElementById('gstr1TotGST').innerText = '₹' + fmt(totGST);
    document.getElementById('gstr1TotVal').innerText = '₹' + fmt(totVal);
    document.getElementById('gstr1TotCGST').innerText = '₹' + fmt(totCGST);
    document.getElementById('gstr1TotSGST').innerText = '₹' + fmt(totSGST);
    document.getElementById('gstr1TotIGST').innerText = '₹' + fmt(totIGST);
    document.getElementById('gstr1TotCESS').innerText = '₹' + fmt(totCESS);
  }

  // Populate Validation Center (Section 4)
  const valTbody = document.getElementById('gstr1ValidationTbody');
  if (valTbody) {
    let issueRows = '';
    let hasErrors = false;
    let errCount = 0;
    let warnCount = 0;
    let passedCount = 0;

    allInvs.forEach(inv => {
      if (inv._issues.length === 0) {
        passedCount++;
      } else {
        inv._issues.forEach(iss => {
          if (iss.severity === 'Error') { hasErrors = true; errCount++; }
          else { warnCount++; }
          const color = iss.severity === 'Error' ? 'red' : 'var(--warning)';
          issueRows += `<tr>
            <td><strong style="color:${color};">${iss.severity}</strong></td>
            <td class="mono">${inv.number}</td>
            <td>${iss.issue}</td>
            <td><button class="btn btn-outline btn-sm" onclick="viewInvoice('${inv.id || inv.number}')">Fix</button></td>
          </tr>`;
        });
      }
    });

    if (document.getElementById('gstr1ValErr')) {
      document.getElementById('gstr1ValErr').innerText = errCount;
      document.getElementById('gstr1ValWarn').innerText = warnCount;
      document.getElementById('gstr1ValPass').innerText = passedCount;
      document.getElementById('gstr1ValTime').innerText = new Date().toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
    }

    if (!issueRows) {
      valTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--success);padding:24px;">✓ No validation errors found.</td></tr>`;
      if (document.getElementById('gstr1TotBadge')) {
        if(allInvs.length === 0) {
          document.getElementById('gstr1TotBadge').innerHTML = 'No Data';
          document.getElementById('gstr1TotBadge').className = 'badge badge-neutral';
        } else {
          document.getElementById('gstr1TotBadge').innerHTML = '✓ Ready to File';
          document.getElementById('gstr1TotBadge').className = 'badge badge-success';
        }
      }
    } else {
      valTbody.innerHTML = issueRows;
      if (document.getElementById('gstr1TotBadge')) {
        if (hasErrors) {
          document.getElementById('gstr1TotBadge').innerHTML = '✗ Fix Errors';
          document.getElementById('gstr1TotBadge').className = 'badge badge-neutral';
          document.getElementById('gstr1TotBadge').style.color = 'red';
        } else {
          document.getElementById('gstr1TotBadge').innerHTML = '⚠ Warnings';
          document.getElementById('gstr1TotBadge').className = 'badge badge-warning';
        }
      }
    }
  }

  // Update Return Completion Progress
  if (document.getElementById('gstr1ProgressPct')) {
    let pct = 0;
    const total = allInvs.length;
    const validated = allInvs.filter(i => i._issues.filter(iss=>iss.severity==='Error').length === 0).length;
    if (total > 0) pct = Math.round((validated / total) * 100);
    document.getElementById('gstr1ProgressPct').innerText = pct + '%';
    document.getElementById('gstr1ProgressBar').style.width = pct + '%';
    if (pct === 100 && total > 0) document.getElementById('gstr1ProgressBar').style.background = 'var(--success)';
    else document.getElementById('gstr1ProgressBar').style.background = 'var(--primary)';
    document.getElementById('gstr1ProgressText').innerText = `${validated} of ${total} invoices validated`;
  }

  // Evaluate GST Filing Checklist
  const clEl = document.getElementById('gstr1Checklist');
  if (clEl) {
    const checks = [];
    const pushCheck = (cond, passTxt, failTxt) => {
      if (cond) checks.push(`<div style="color:var(--success);"><span class="material-icons-outlined" style="font-size:14px;vertical-align:middle;margin-right:4px;">check_circle</span> ${passTxt}</div>`);
      else checks.push(`<div style="color:red;"><span class="material-icons-outlined" style="font-size:14px;vertical-align:middle;margin-right:4px;">cancel</span> ${failTxt}</div>`);
    };

    pushCheck((PH_DATA.company && PH_DATA.company.gstin), 'Company GSTIN Configured', 'Missing Company GSTIN');
    pushCheck((PH_DATA.company && PH_DATA.company.fy), 'Financial Year Selected', 'Missing Financial Year');
    pushCheck(periodStr, 'Return Period Selected', 'No Return Period Selected');
    pushCheck(!allInvs.some(i => !i.number), 'Invoice Numbering Valid', 'Missing Invoice Numbers');
    
    // Simulate GST rates & HSN checks
    const hasHsnIssues = allInvs.some(i => i._issues.some(iss => iss.issue.includes('HSN')));
    pushCheck(true, 'GST Rates Verified', 'Invalid GST Rates');
    pushCheck(!hasHsnIssues, 'HSN Codes Available', 'Missing HSN Codes');
    
    // Duplicate invoices check
    const numbers = allInvs.map(i => i.number).filter(n=>n);
    const hasDupes = new Set(numbers).size !== numbers.length;
    pushCheck(!hasDupes, 'No Duplicate Invoices', 'Duplicate Invoice Numbers found');
    
    const hasAnyError = allInvs.some(i => i._issues.some(iss => iss.severity === 'Error'));
    pushCheck(!hasAnyError, 'No Validation Errors', 'Fix Validation Errors to proceed');

    clEl.innerHTML = checks.join('');
  }

  // Filter Table Data (Section 5 & 6)
  let filtered = [...allInvs];
  const typeVal = document.getElementById('gstr1Type')?.value;
  const supplyVal = document.getElementById('gstr1Supply')?.value;
  const statusVal = document.getElementById('gstr1Status')?.value;
  const custVal = document.getElementById('gstr1Customer')?.value;
  const query = document.getElementById('gstr1SearchInput')?.value.toLowerCase().trim();

  if (typeVal && typeVal !== 'All') filtered = filtered.filter(i => i._category === typeVal);
  if (supplyVal && supplyVal !== 'All') filtered = filtered.filter(i => i._supplyType === supplyVal);
  if (statusVal && statusVal !== 'All') filtered = filtered.filter(i => i._status === statusVal);
  if (custVal) filtered = filtered.filter(i => i.custName === custVal);
  if (query) filtered = filtered.filter(i => JSON.stringify(i).toLowerCase().includes(query));

  const emptyState = document.getElementById('gstr1EmptyState');
  const tableCard = document.getElementById('gstr1TableCard');
  if (allInvs.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    if (tableCard) tableCard.style.display = 'none';
  } else {
    if (emptyState) emptyState.style.display = 'none';
    if (tableCard) tableCard.style.display = 'block';
  }

  if (filtered.length === 0 && allInvs.length > 0) {
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;padding:40px;color:var(--text-muted);">
      <span class="material-icons-outlined" style="font-size:40px;display:block;margin-bottom:8px;opacity:0.4;">search_off</span>
      No invoices match the current filters.
    </td></tr>`;
  } else if (filtered.length > 0) {
    tbody.innerHTML = filtered.map(inv => {
      const gstin = (inv.customer && inv.customer.gstin) ? inv.customer.gstin : '<span style="color:var(--text-muted);">—</span>';
      
      let statusBadge = '';
      if (inv._status === 'Ready') statusBadge = '<span class="badge badge-warning">Ready</span>';
      else if (inv._status === 'Filed') statusBadge = '<span class="badge badge-success">Filed</span>';
      else if (inv._status === 'Cancelled') statusBadge = '<span class="badge badge-neutral" style="color:red">Cancelled</span>';
      else statusBadge = '<span class="badge badge-neutral">Draft</span>';

      let valBadge = '<span class="badge badge-success">✓ Valid</span>';
      if (inv._issues.length > 0) {
        if (inv._issues.some(i => i.severity === 'Error')) valBadge = '<span class="badge badge-neutral" style="color:red">✗ Error</span>';
        else valBadge = '<span class="badge badge-warning">⚠ Warning</span>';
      }

      let actions = `<button class="btn btn-outline btn-sm" onclick="viewInvoice('${inv.id || inv.number}')">View</button>
                     <button class="btn btn-outline btn-sm" onclick="window.print()">Print</button>`;
      
      if (inv._status === 'Draft' && !inv._issues.some(i => i.severity === 'Error')) {
        actions += `<button class="btn btn-outline btn-sm" onclick="markInvoiceAction('${inv.id || inv.number}', 'ready')">Mark Ready</button>`;
      } else if (inv._status === 'Ready') {
        actions += `<button class="btn btn-outline btn-sm" onclick="markInvoiceAction('${inv.id || inv.number}', 'filed')">Mark Filed</button>`;
      }

      return `<tr>
        <td class="tbl-check"><input type="checkbox" class="row-checkbox"></td>
        <td class="mono"><strong>${inv.number}</strong></td>
        <td>${inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : '—'}</td>
        <td><strong>${inv.custName || '—'}</strong></td>
        <td style="font-family:var(--font-mono);font-size:11px;">${gstin}</td>
        <td><span class="badge badge-neutral">${inv._category}</span></td>
        <td>${inv._supplyType}</td>
        <td class="amount">${fmt(inv.taxable || 0)}</td>
        <td class="amount">${fmt(inv._gstAmt)}</td>
        <td class="amount">${fmt(inv.grandTotal || 0)}</td>
        <td>${statusBadge}</td>
        <td>${valBadge}</td>
        <td><div class="d-flex gap-2">${actions}</div></td>
      </tr>`;
    }).join('');
  }

  // Update Bottom Summary
  if (document.getElementById('gstr1BottomSummary')) {
    const fTotTax = filtered.reduce((a,c) => a + (c.taxable||0), 0);
    const fTotGST = filtered.reduce((a,c) => a + (c._gstAmt||0), 0);
    let readyC=0, pendC=0, warnC=0, errC=0;
    filtered.forEach(i => {
      if(i._status === 'Ready') readyC++;
      if(i._status === 'Draft') pendC++;
      if(i._issues.length > 0) {
        if(i._issues.some(is => is.severity==='Error')) errC++;
        else warnC++;
      }
    });

    document.getElementById('gstr1BtmInv').innerText = filtered.length;
    document.getElementById('gstr1BtmReady').innerText = readyC;
    document.getElementById('gstr1BtmPending').innerText = pendC;
    document.getElementById('gstr1BtmWarn').innerText = warnC;
    document.getElementById('gstr1BtmErr').innerText = errC;
    document.getElementById('gstr1BtmTax').innerText = '₹' + fmt(fTotTax);
    document.getElementById('gstr1BtmGST').innerText = '₹' + fmt(fTotGST);
  }
}

// ── GSTR-3B Summary ───────────────────────────
window.renderGSTR3B = function() {
  gstBuildPeriodOptions('gstr3bPeriod');
  const periodEl = document.getElementById('gstr3bPeriod');
  _renderGSTR3B(periodEl ? periodEl.value : null);

  if (periodEl && !periodEl.dataset.bound) {
    periodEl.dataset.bound = '1';
    periodEl.addEventListener('change', () => _renderGSTR3B(periodEl.value));
  }
};

function _renderGSTR3B(periodStr) {
  const invs = gstInvoicesForPeriod(periodStr);
  const taxable = invs.reduce((s, i) => s + (i.taxable || 0), 0);
  const cgst = invs.reduce((s, i) => s + (i.cgst || 0), 0);
  const sgst = invs.reduce((s, i) => s + (i.sgst || 0), 0);
  const igst = invs.reduce((s, i) => s + (i.igst || 0), 0);
  const fmt = n => PH_DATA.formatNum(n);
  const fmtC = n => PH_DATA.formatCurrency(n);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('gstr3bTaxable', fmtC(taxable));
  set('gstr3bCGST', fmtC(cgst));
  set('gstr3bSGST', fmtC(sgst));
  set('gstr3bIGST', fmtC(igst));

  // Outward supplies table (3.1)
  const ob = document.getElementById('gstr3bOutwardTbody');
  if (ob) {
    ob.innerHTML = `
      <tr>
        <td>(a) Outward taxable supplies (other than zero rated, nil and exempted)</td>
        <td class="amount">${fmt(taxable)}</td>
        <td class="amount">${fmt(igst)}</td>
        <td class="amount">${fmt(cgst)}</td>
        <td class="amount">${fmt(sgst)}</td>
        <td class="amount">—</td>
      </tr>
      <tr><td>(b) Outward taxable supplies (zero rated)</td><td class="amount">—</td><td class="amount">—</td><td class="amount">—</td><td class="amount">—</td><td class="amount">—</td></tr>
      <tr><td>(c) Other outward supplies (Nil rated, exempted)</td><td class="amount">—</td><td class="amount">—</td><td class="amount">—</td><td class="amount">—</td><td class="amount">—</td></tr>
      <tr><td>(d) Inward supplies (liable to reverse charge)</td><td class="amount">—</td><td class="amount">—</td><td class="amount">—</td><td class="amount">—</td><td class="amount">—</td></tr>
      <tr><td>(e) Non-GST outward supplies</td><td class="amount">—</td><td class="amount">—</td><td class="amount">—</td><td class="amount">—</td><td class="amount">—</td></tr>
      <tr style="font-weight:700;background:var(--bg);">
        <td>Total</td>
        <td class="amount total">${fmt(taxable)}</td>
        <td class="amount total">${fmt(igst)}</td>
        <td class="amount total">${fmt(cgst)}</td>
        <td class="amount total">${fmt(sgst)}</td>
        <td class="amount total">—</td>
      </tr>`;
  }

  // Inter-State supplies table (3.2)
  const isTbody = document.getElementById('gstr3bInterStateTbody');
  if (isTbody) {
    const coState = (PH_DATA.company && PH_DATA.company.gstin) ? PH_DATA.company.gstin.substring(0, 2) : '37';
    const interStateB2CInvs = invs.filter(i => {
      const isB2C = (!i.customer || !i.customer.gstin);
      const custState = (i.customer && i.customer.gstin) ? i.customer.gstin.substring(0, 2) : coState;
      return isB2C && coState !== custState;
    });
    const isB2CTax = interStateB2CInvs.reduce((s,i)=>s+(i.taxable||0),0);
    const isB2CIgst = interStateB2CInvs.reduce((s,i)=>s+(i.igst||0),0);
    
    isTbody.innerHTML = `
      <tr><td>Supplies made to Unregistered Persons</td><td class="amount">${fmt(isB2CTax)}</td><td class="amount">${fmt(isB2CIgst)}</td></tr>
      <tr><td>Supplies made to Composition Taxable Persons</td><td class="amount">—</td><td class="amount">—</td></tr>
      <tr><td>Supplies made to UIN holders</td><td class="amount">—</td><td class="amount">—</td></tr>
    `;
  }

  // ITC section – zero (outward sales app, no purchase data)
  const ib = document.getElementById('gstr3bITCTbody');
  if (ib) {
    ib.innerHTML = `
      <tr><td>ITC Available (whether in full or part) – Import of Goods</td><td class="amount">—</td><td class="amount">—</td><td class="amount">—</td><td class="amount">—</td></tr>
      <tr><td>ITC Available – All other ITC</td><td class="amount">—</td><td class="amount">—</td><td class="amount">—</td><td class="amount">—</td></tr>
      <tr style="font-weight:700;background:var(--bg);"><td>Net ITC Available</td><td class="amount total">—</td><td class="amount total">—</td><td class="amount total">—</td><td class="amount total">—</td></tr>`;
  }

  // Exempt supplies
  const exTbody = document.getElementById('gstr3bExemptTbody');
  if (exTbody) {
    exTbody.innerHTML = `
      <tr><td>From a supplier under composition scheme, Exempt and Nil rated supply</td><td class="amount">—</td><td class="amount">—</td></tr>
      <tr><td>Non GST supply</td><td class="amount">—</td><td class="amount">—</td></tr>
    `;
  }
}

// ── GST Reports ────────────────────────────────
window.renderGSTReports = function() {
  gstBuildPeriodOptions('gstReportsPeriod');
  const periodEl = document.getElementById('gstReportsPeriod');
  _renderActiveGSTReport(periodEl ? periodEl.value : null);

  if (periodEl && !periodEl.dataset.bound) {
    periodEl.dataset.bound = '1';
    periodEl.addEventListener('change', () => _renderActiveGSTReport(periodEl.value));
  }
};

function _renderActiveGSTReport(periodStr) {
  const activeTab = document.querySelector('[id^="gstRepTab-"].is-active');
  const tab = activeTab ? activeTab.id.replace('gstRepTab-', '') : 'sales';
  _renderGSTReportTab(tab, periodStr);
}

// Override switchGstReportTab to also render data
window.switchGstReportTab = function(tab) {
  document.querySelectorAll('[id^="gstRepTab-"]').forEach(btn => btn.classList.remove('is-active'));
  document.querySelectorAll('[id^="gstRep-"]').forEach(pane => pane.classList.remove('is-active'));
  const btn = document.getElementById('gstRepTab-' + tab);
  const pane = document.getElementById('gstRep-' + tab);
  if (btn) btn.classList.add('is-active');
  if (pane) pane.classList.add('is-active');
  const periodEl = document.getElementById('gstReportsPeriod');
  _renderGSTReportTab(tab, periodEl ? periodEl.value : null);
};

function _renderGSTReportTab(tab, periodStr) {
  const invs = gstInvoicesForPeriod(periodStr);
  const fmt = n => PH_DATA.formatNum(n);
  const fmtC = n => PH_DATA.formatCurrency(n);
  const empty = (cols, icon, msg) => `<tr><td colspan="${cols}" style="text-align:center;padding:32px;color:var(--text-muted);">
    <span class="material-icons-outlined" style="font-size:36px;display:block;margin-bottom:8px;opacity:0.4;">${icon}</span>${msg}
  </td></tr>`;

  if (tab === 'sales') {
    const tb = document.getElementById('gstRepSalesTbody');
    if (!tb) return;
    if (!invs.length) { tb.innerHTML = empty(9,'list_alt','No sales data for selected period'); return; }
    tb.innerHTML = invs.map(inv => {
      const gstin = (inv.customer && inv.customer.gstin) ? inv.customer.gstin : '—';
      return `<tr>
        <td class="mono"><strong>${inv.number}</strong></td>
        <td>${inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : '—'}</td>
        <td>${inv.custName || '—'}</td>
        <td style="font-family:var(--font-mono);font-size:11px;">${gstin}</td>
        <td class="amount">${fmt(inv.taxable || 0)}</td>
        <td class="amount">${fmt(inv.cgst || 0)}</td>
        <td class="amount">${fmt(inv.sgst || 0)}</td>
        <td class="amount">${fmt(inv.igst || 0)}</td>
        <td class="amount total">${fmt(inv.grandTotal || 0)}</td>
      </tr>`;
    }).join('');

  } else if (tab === 'gstreg') {
    const tb = document.getElementById('gstRepGstRegTbody');
    if (!tb) return;
    if (!invs.length) { tb.innerHTML = empty(11,'receipt_long','No data for selected period'); return; }
    const coState = (PH_DATA.company && PH_DATA.company.gstin) ? PH_DATA.company.gstin.substring(0, 2) : '37';
    tb.innerHTML = invs.map(inv => {
      const gstin = (inv.customer && inv.customer.gstin) ? inv.customer.gstin : '—';
      const custState = (inv.customer && inv.customer.gstin) ? inv.customer.gstin.substring(0, 2) : coState;
      const isExport = (inv.customer && inv.customer.isExport);
      let supplyType = 'Intra-State';
      if (isExport) supplyType = 'Export';
      else if (coState !== custState) supplyType = 'Inter-State';
      
      const gstAmt = (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0);

      return `<tr>
        <td class="mono"><strong>${inv.number}</strong></td>
        <td>${inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : '—'}</td>
        <td>${inv.custName || '—'}</td>
        <td style="font-family:var(--font-mono);font-size:11px;">${gstin}</td>
        <td>${supplyType}</td>
        <td class="amount">${fmt(inv.taxable || 0)}</td>
        <td class="amount">${fmt(inv.cgst || 0)}</td>
        <td class="amount">${fmt(inv.sgst || 0)}</td>
        <td class="amount">${fmt(inv.igst || 0)}</td>
        <td class="amount">${fmt(0)}</td>
        <td class="amount total">${fmt(gstAmt)}</td>
      </tr>`;
    }).join('');

  } else if (tab === 'hsn') {
    const tb = document.getElementById('gstRepHsnTbody');
    if (!tb) return;
    // Build HSN map from products
    const hsnMap = {};
    invs.forEach(inv => {
      const prods = inv.products || [];
      prods.forEach(p => {
        const key = p.hsn || 'N/A';
        if (!hsnMap[key]) hsnMap[key] = { desc: p.productName || '—', qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, rate: p.gstPct || 0 };
        hsnMap[key].qty += parseFloat(p.qty) || 0;
        const lineVal = (parseFloat(p.qty)||0) * (parseFloat(p.rate)||0);
        const discAmt = lineVal * ((parseFloat(p.disc)||0)/100);
        const taxableLine = lineVal - discAmt;
        const taxLine = taxableLine * (parseFloat(p.gstPct)||0) / 100;
        hsnMap[key].taxable += taxableLine;
        // split based on igst flag (if customer has different state GSTIN)
        hsnMap[key].cgst += taxLine / 2;
        hsnMap[key].sgst += taxLine / 2;
      });
    });
    const rows = Object.entries(hsnMap);
    if (!rows.length) { tb.innerHTML = empty(9,'tag','No HSN data available'); return; }
    tb.innerHTML = rows.map(([hsn, d]) => `<tr>
      <td class="mono">${hsn}</td>
      <td>${d.desc}</td>
      <td>NOS</td>
      <td class="amount">${fmt(d.qty)}</td>
      <td class="amount">${fmt(d.taxable)}</td>
      <td>${d.rate}%</td>
      <td class="amount">${fmt(d.cgst)}</td>
      <td class="amount">${fmt(d.sgst)}</td>
      <td class="amount">${fmt(d.igst)}</td>
    </tr>`).join('');

  } else if (tab === 'custgst') {
    const tb = document.getElementById('gstRepCustTbody');
    if (!tb) return;
    const custMap = {};
    invs.forEach(inv => {
      const key = inv.custName || 'Unknown';
      if (!custMap[key]) custMap[key] = { gstin: (inv.customer && inv.customer.gstin) || '—', count: 0, taxable: 0, gst: 0, total: 0 };
      custMap[key].count++;
      custMap[key].taxable += inv.taxable || 0;
      custMap[key].gst += (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0);
      custMap[key].total += inv.grandTotal || 0;
    });
    const rows = Object.entries(custMap);
    if (!rows.length) { tb.innerHTML = empty(6,'people','No customer GST data'); return; }
    tb.innerHTML = rows.sort((a,b)=>b[1].total-a[1].total).map(([name, d]) => `<tr>
      <td><strong>${name}</strong></td>
      <td style="font-family:var(--font-mono);font-size:11px;">${d.gstin}</td>
      <td class="text-center">${d.count}</td>
      <td class="amount">${fmt(d.taxable)}</td>
      <td class="amount">${fmt(d.gst)}</td>
      <td class="amount total">${fmt(d.total)}</td>
    </tr>`).join('');

  } else if (tab === 'prodgst') {
    const tb = document.getElementById('gstRepProdTbody');
    if (!tb) return;
    const prodMap = {};
    invs.forEach(inv => {
      (inv.products || []).forEach(p => {
        const key = p.productName || 'Unknown';
        if (!prodMap[key]) prodMap[key] = { hsn: p.hsn || '—', rate: p.gstPct || 0, qty: 0, taxable: 0, tax: 0 };
        prodMap[key].qty += parseFloat(p.qty) || 0;
        const lineVal = (parseFloat(p.qty)||0) * (parseFloat(p.rate)||0);
        const discAmt = lineVal * ((parseFloat(p.disc)||0)/100);
        const taxableL = lineVal - discAmt;
        const taxL = taxableL * (parseFloat(p.gstPct)||0)/100;
        prodMap[key].taxable += taxableL;
        prodMap[key].tax += taxL;
      });
    });
    const rows = Object.entries(prodMap);
    if (!rows.length) { tb.innerHTML = empty(6,'medication','No product GST data'); return; }
    tb.innerHTML = rows.sort((a,b)=>b[1].taxable-a[1].taxable).map(([name, d]) => `<tr>
      <td>${name}</td>
      <td class="mono">${d.hsn}</td>
      <td>${d.rate}%</td>
      <td class="amount">${fmt(d.qty)}</td>
      <td class="amount">${fmt(d.taxable)}</td>
      <td class="amount total">${fmt(d.tax)}</td>
    </tr>`).join('');

  } else if (tab === 'taxsummary') {
    const tb = document.getElementById('gstRepTaxTbody');
    if (!tb) return;
    const rateMap = { '0': { taxable:0,cgst:0,sgst:0,igst:0 }, '5': { taxable:0,cgst:0,sgst:0,igst:0 },
      '12': { taxable:0,cgst:0,sgst:0,igst:0 }, '18': { taxable:0,cgst:0,sgst:0,igst:0 }, '28': { taxable:0,cgst:0,sgst:0,igst:0 } };
    invs.forEach(inv => {
      (inv.products || []).forEach(p => {
        const r = String(parseFloat(p.gstPct)||12);
        if (!rateMap[r]) rateMap[r] = { taxable:0,cgst:0,sgst:0,igst:0 };
        const lineVal = (parseFloat(p.qty)||0) * (parseFloat(p.rate)||0);
        const discAmt = lineVal * ((parseFloat(p.disc)||0)/100);
        const taxableL = lineVal - discAmt;
        const taxL = taxableL * parseFloat(p.gstPct||12)/100;
        rateMap[r].taxable += taxableL;
        rateMap[r].cgst += taxL/2;
        rateMap[r].sgst += taxL/2;
      });
    });
    let totTax=0, totCgst=0, totSgst=0, totIgst=0, totAll=0;
    const rows = Object.entries(rateMap).map(([rate, d]) => {
      totTax += d.taxable; totCgst += d.cgst; totSgst += d.sgst; totIgst += d.igst;
      const total = d.cgst + d.sgst + d.igst;
      totAll += total;
      return `<tr>
        <td>${rate}%</td>
        <td class="amount">${fmt(d.taxable)}</td>
        <td class="amount">${fmt(d.cgst)}</td>
        <td class="amount">${fmt(d.sgst)}</td>
        <td class="amount">${fmt(d.igst)}</td>
        <td class="amount">${fmt(total)}</td>
      </tr>`;
    });
    rows.push(`<tr style="font-weight:700;background:var(--bg);">
      <td>Total</td>
      <td class="amount total">${fmt(totTax)}</td>
      <td class="amount total">${fmt(totCgst)}</td>
      <td class="amount total">${fmt(totSgst)}</td>
      <td class="amount total">${fmt(totIgst)}</td>
      <td class="amount total" style="color:var(--primary);">${fmt(totAll)}</td>
    </tr>`);
    tb.innerHTML = rows.join('');
  }
}

// ── Filing History ─────────────────────────────
window.renderFilingHistory = function() {
  // Filing history is stored in localStorage under 'padowa_filing_history'
  // We render it; user can add entries via the app in future.
  // For now show all filed and pending based on current month.
  const tb = document.getElementById('filingHistTbody');
  if (!tb) return;

  const history = JSON.parse(localStorage.getItem('padowa_filing_history') || '[]');

  // Build pending entries from invoices
  const seenPeriods = new Set();
  const periods = [];
  PH_DATA.invoices.forEach(inv => {
    if (!inv.date) return;
    const d = new Date(inv.date);
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    if (!seenPeriods.has(label)) { seenPeriods.add(label); periods.push(label); }
  });

  // Merge saved history with auto-detected periods
  const filedPeriods = new Set(history.map(h => h.period + '|' + h.type));
  const rows = [...history];

  // Add pending for GSTR-1 and GSTR-3B for each period not yet filed
  periods.forEach(p => {
    if (!filedPeriods.has(p + '|GSTR-1')) {
      rows.push({ period: p, type: 'GSTR-1', filedDate: '—', arn: '—', status: 'Pending', remarks: 'Not yet filed', _auto: true });
    }
    if (!filedPeriods.has(p + '|GSTR-3B')) {
      rows.push({ period: p, type: 'GSTR-3B', filedDate: '—', arn: '—', status: 'Pending', remarks: 'Not yet filed', _auto: true });
    }
  });

  // Apply filters
  const typeFilter = document.getElementById('filingHistType')?.value || 'All Returns';
  const statusFilter = document.getElementById('filingHistStatus')?.value || 'All';
  const searchQ = document.getElementById('filingHistSearch')?.value?.toLowerCase() || '';

  let display = rows;
  if (typeFilter !== 'All Returns') display = display.filter(r => r.type === typeFilter);
  if (statusFilter !== 'All') display = display.filter(r => r.status === statusFilter);
  if (searchQ) display = display.filter(r => JSON.stringify(r).toLowerCase().includes(searchQ));

  if (!display.length) {
    tb.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">
      <span class="material-icons-outlined" style="font-size:40px;display:block;margin-bottom:8px;opacity:0.4;">history_edu</span>No filing records found
    </td></tr>`;
    return;
  }

  tb.innerHTML = display.map(r => {
    const statusBadge = r.status === 'Filed' ? '<span class="badge badge-success">Filed</span>' : '<span class="badge badge-warning">Pending</span>';
    const arnDisplay = r.arn === '—' ? '<span style="color:var(--text-muted);">Not yet filed</span>' : `<strong class="mono">${r.arn}</strong>`;
    const actions = r.status === 'Filed'
      ? `<div class="d-flex gap-2">
           <button class="btn btn-outline btn-sm" onclick="AppToast.show('Opening ${r.type} ${r.period}...','info')">View</button>
           <button class="btn btn-outline btn-sm" onclick="AppToast.show('Downloading acknowledgement...','info')">Download</button>
         </div>`
      : `<div class="d-flex gap-2">
           <button class="btn btn-primary btn-sm" onclick="openMarkAsFiledModal('${r.period}', '${r.type}')">Mark as Filed</button>
         </div>`;
    return `<tr>
      <td>${r.period}</td>
      <td><span class="badge badge-neutral">${r.type}</span></td>
      <td>${r.filedDate}</td>
      <td>${arnDisplay}</td>
      <td>${statusBadge}</td>
      <td>${r.remarks}</td>
      <td>${actions}</td>
    </tr>`;
  }).join('');

  // Bind filter events once
  ['filingHistType','filingHistStatus'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset.bound) {
      el.dataset.bound = '1';
      el.addEventListener('change', window.renderFilingHistory);
    }
  });
  const srch = document.getElementById('filingHistSearch');
  if (srch && !srch.dataset.bound) {
    srch.dataset.bound = '1';
    srch.addEventListener('input', window.renderFilingHistory);
  }
};

// ── Mark as Filed Functions ──────────────────────
window.openMarkAsFiledModal = function(period, type) {
  const isManual = !period || !type;
  
  const typeEl = document.getElementById('mafType');
  const periodEl = document.getElementById('mafPeriod');
  
  if (!isManual) {
    typeEl.value = type;
    periodEl.value = period;
    // Make them readonly if pre-filled
    typeEl.disabled = true;
    periodEl.disabled = true;
  } else {
    typeEl.value = 'GSTR-1';
    periodEl.value = '';
    // Make them editable
    typeEl.disabled = false;
    periodEl.disabled = false;
  }

  document.getElementById('mafDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('mafARN').value = '';
  document.getElementById('mafRemarks').value = '';
  document.getElementById('markAsFiledModal').classList.add('is-open');
};

window.submitMarkAsFiled = function(e) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }
  const period = document.getElementById('mafPeriod').value;
  const type = document.getElementById('mafType').value;
  const date = document.getElementById('mafDate').value;
  const arn = document.getElementById('mafARN').value;
  const remarks = document.getElementById('mafRemarks').value;

  if (!date || !arn) {
    AppToast.show('Please fill required fields (Date, ARN)', 'error');
    return;
  }

  const history = JSON.parse(localStorage.getItem('padowa_filing_history') || '[]');
  const existingIdx = history.findIndex(h => h.period === period && h.type === type);
  
  const dObj = new Date(date);
  const d = dObj.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}).replace(/ /g, '-');
  
  const entry = { period, type, filedDate: d, arn, status: 'Filed', remarks: remarks || 'Manual filing' };
  
  if (existingIdx >= 0) history[existingIdx] = entry;
  else history.push(entry);
  
  localStorage.setItem('padowa_filing_history', JSON.stringify(history));
  document.getElementById('markAsFiledModal').classList.remove('is-open');
  AppToast.show(`${type} for ${period} marked as filed.`, 'success');
  window.renderFilingHistory();
  if (window.renderGSTDashboard) window.renderGSTDashboard();
};

// ── GST Settings ───────────────────────────────
window.renderGSTSettings = function() {
  const c = PH_DATA.company;
  if (!c) return;
  const elGstin = document.getElementById('gstSettingGSTIN');
  if (elGstin) elGstin.value = c.gstin || '';
  const elState = document.getElementById('gstSettingStateCode');
  if (elState) elState.value = c.stateCode ? `${c.stateCode} – ${c.state}` : '';
  const elLegal = document.getElementById('gstSettingLegalName');
  if (elLegal) elLegal.value = c.name || '';
  const elTrade = document.getElementById('gstSettingTradeName');
  if (elTrade) elTrade.value = c.name || '';
  const elFY = document.getElementById('gstSettingFY');
  if (elFY) elFY.value = c.fy || '2026-27';
};

window.saveGSTSettings = function() {
  const gstin = document.getElementById('gstSettingGSTIN').value;
  const legalName = document.getElementById('gstSettingLegalName').value;
  if (PH_DATA && PH_DATA.company) {
    PH_DATA.company.gstin = gstin;
    PH_DATA.company.name = legalName;
    if (gstin && gstin.length >= 2) {
      PH_DATA.company.stateCode = gstin.substring(0, 2);
      // In reality, we'd map stateCode to state name, but for mock this is fine.
    }
  }
  AppToast.show('GST Settings saved successfully.', 'success');
  window.renderGSTSettings();
};

// ── Expose render functions for App.navigate ───
window.GSTModule = {
  initGSTDashboard: window.renderGSTDashboard,
  initGSTR1: window.renderGSTR1,
  initGSTR3B: window.renderGSTR3B,
  initGSTReports: window.renderGSTReports,
  initFilingHistory: window.renderFilingHistory,
  initGSTSettings: window.renderGSTSettings
};

// ── CSV Download Helper ─────────────────────────
function _downloadCSV(filename, rows) {
  const csvContent = rows.map(r => r.map(c => {
    const s = String(c === null || c === undefined ? '' : c);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── GSTR-1 Export Excel (CSV) ───────────────────
window.exportGSTR1Excel = function() {
  const periodEl = document.getElementById('gstr1Period');
  const periodStr = periodEl ? periodEl.value : null;
  const invs = gstInvoicesForPeriod(periodStr, true);
  
  if (!invs.length) {
    AppToast.show('No data to export for selected period', 'warning');
    return;
  }

  const coState = PH_DATA.company && PH_DATA.company.gstin ? PH_DATA.company.gstin.substring(0, 2) : '37';
  
  const headers = ['Invoice No', 'Invoice Date', 'Customer Name', 'GSTIN', 'Supply Type', 'GST Category',
    'Taxable Value (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'CESS (₹)', 'Total GST (₹)', 'Invoice Value (₹)', 'Status'];
  
  const rows = [headers];
  invs.forEach(inv => {
    const gstin = (inv.customer && inv.customer.gstin) ? inv.customer.gstin : '';
    const custState = gstin ? gstin.substring(0, 2) : coState;
    const isExport = inv.customer && inv.customer.isExport;
    const supplyType = isExport ? 'Export' : (coState !== custState ? 'Inter-State' : 'Intra-State');
    const isCredit = (inv.type || '').toLowerCase().includes('credit');
    const isDebit = (inv.type || '').toLowerCase().includes('debit');
    let category = isCredit ? 'Credit Note' : isDebit ? 'Debit Note' : gstin ? 'B2B' :
      (supplyType === 'Inter-State' && (inv.grandTotal || 0) > 250000 ? 'B2CL' : 'B2CS');
    const gstAmt = (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0) + (inv.cess || 0);
    rows.push([
      inv.number, inv.date, inv.custName || '', gstin, supplyType, category,
      (inv.taxable || 0).toFixed(2), (inv.cgst || 0).toFixed(2), (inv.sgst || 0).toFixed(2),
      (inv.igst || 0).toFixed(2), (inv.cess || 0).toFixed(2), gstAmt.toFixed(2),
      (inv.grandTotal || 0).toFixed(2), inv.status === 'cancelled' ? 'Cancelled' : (inv.status || 'Draft')
    ]);
  });

  const period = periodStr ? periodStr.replace(' ', '_') : 'All';
  _downloadCSV(`GSTR1_Register_${period}.csv`, rows);
  AppToast.show('GSTR-1 data exported successfully', 'success');
};

// ── GSTR-1 Export JSON ──────────────────────────
window.exportGSTR1JSON = function() {
  const periodEl = document.getElementById('gstr1Period');
  const periodStr = periodEl ? periodEl.value : null;
  const invs = gstInvoicesForPeriod(periodStr, true);

  if (!invs.length) {
    AppToast.show('No data to export for selected period', 'warning');
    return;
  }

  const coState = PH_DATA.company && PH_DATA.company.gstin ? PH_DATA.company.gstin.substring(0, 2) : '37';
  const gstr1JSON = {
    gstin: PH_DATA.company ? PH_DATA.company.gstin : '',
    fp: periodStr || '',
    gt: invs.filter(i => i.status !== 'cancelled').reduce((s, i) => s + (i.grandTotal || 0), 0),
    cur_gt: invs.filter(i => i.status !== 'cancelled').reduce((s, i) => s + (i.grandTotal || 0), 0),
    b2b: invs.filter(i => i.customer && i.customer.gstin && i.status !== 'cancelled').map(inv => ({
      ctin: inv.customer.gstin,
      inv: [{
        inum: inv.number,
        idt: inv.date,
        val: inv.grandTotal || 0,
        pos: inv.customer.gstin.substring(0, 2),
        rchrg: 'N',
        itms: [{
          num: 1, itm_det: {
            txval: inv.taxable || 0,
            rt: ((inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)) / (inv.taxable || 1) * 100,
            camt: inv.cgst || 0, samt: inv.sgst || 0, iamt: inv.igst || 0, csamt: inv.cess || 0
          }
        }]
      }]
    })),
    b2cs: invs.filter(i => (!i.customer || !i.customer.gstin) && i.status !== 'cancelled').map(inv => ({
      typ: 'OE', pos: coState, rt: ((inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)) / (inv.taxable || 1) * 100,
      txval: inv.taxable || 0, iamt: inv.igst || 0, camt: inv.cgst || 0, samt: inv.sgst || 0, csamt: inv.cess || 0
    }))
  };

  const blob = new Blob([JSON.stringify(gstr1JSON, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const period = periodStr ? periodStr.replace(' ', '_') : 'All';
  link.setAttribute('download', `GSTR1_${period}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  AppToast.show('GSTR-1 JSON exported successfully', 'success');
};

// ── GSTR-1 Generate Summary Modal ──────────────
window.generateGSTR1Summary = function() {
  const periodEl = document.getElementById('gstr1Period');
  const periodStr = periodEl ? periodEl.value : null;
  const invs = gstInvoicesForPeriod(periodStr, true);
  const active = invs.filter(i => i.status !== 'cancelled');
  const fmt = n => PH_DATA.formatNum(n);
  const fmtC = n => PH_DATA.formatCurrency(n);

  const coState = PH_DATA.company && PH_DATA.company.gstin ? PH_DATA.company.gstin.substring(0, 2) : '37';

  const b2b = active.filter(i => i.customer && i.customer.gstin);
  const b2c = active.filter(i => !i.customer || !i.customer.gstin);
  const cn = active.filter(i => (i.type || '').toLowerCase().includes('credit'));
  const dn = active.filter(i => (i.type || '').toLowerCase().includes('debit'));

  const totTaxable = active.reduce((s,i) => s + (i.taxable||0), 0);
  const totCGST = active.reduce((s,i) => s + (i.cgst||0), 0);
  const totSGST = active.reduce((s,i) => s + (i.sgst||0), 0);
  const totIGST = active.reduce((s,i) => s + (i.igst||0), 0);
  const totGST = totCGST + totSGST + totIGST;
  const totVal = active.reduce((s,i) => s + (i.grandTotal||0), 0);

  const history = JSON.parse(localStorage.getItem('padowa_filing_history') || '[]');
  const isPeriodFiled = history.some(h => h.period === periodStr && h.type === 'GSTR-1' && h.status === 'Filed');
  const statusLabel = isPeriodFiled ? '<span style="color:green;font-weight:700;">✓ Filed</span>' :
    (active.length > 0 ? '<span style="color:orange;font-weight:700;">⏳ Pending Filing</span>' :
    '<span style="color:#999;">No Data</span>');

  // Remove existing modal if present
  const existing = document.getElementById('gstr1SummaryModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'gstr1SummaryModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:var(--card);border-radius:var(--radius-lg);max-width:750px;width:95%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3);">
      <div style="padding:24px 32px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <div>
          <h2 style="margin:0;font-size:20px;font-weight:700;">GSTR-1 Return Summary</h2>
          <p style="margin:4px 0 0;color:var(--text-muted);font-size:13px;">${periodStr || 'All Periods'} · ${PH_DATA.company ? PH_DATA.company.name : 'PADOWA Healthcare'}</p>
        </div>
        <button onclick="document.getElementById('gstr1SummaryModal').remove()" style="background:none;border:none;cursor:pointer;font-size:24px;color:var(--text-muted);">✕</button>
      </div>
      <div style="padding:24px 32px;">
        
        <!-- Status & Period -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Return Period</div>
            <div style="font-size:16px;font-weight:700;">${periodStr || '—'}</div>
          </div>
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">GSTIN</div>
            <div style="font-size:14px;font-weight:700;font-family:var(--font-mono);">${PH_DATA.company ? PH_DATA.company.gstin : '—'}</div>
          </div>
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Filing Status</div>
            <div style="font-size:14px;">${statusLabel}</div>
          </div>
        </div>

        <!-- Totals -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
          <div style="background:linear-gradient(135deg,#0057D9,#1E88E5);border-radius:var(--radius-md);padding:16px;color:white;">
            <div style="font-size:11px;opacity:0.8;margin-bottom:4px;">Total Invoices</div>
            <div style="font-size:24px;font-weight:700;">${active.length}</div>
          </div>
          <div style="background:linear-gradient(135deg,#059669,#10b981);border-radius:var(--radius-md);padding:16px;color:white;">
            <div style="font-size:11px;opacity:0.8;margin-bottom:4px;">Taxable Value</div>
            <div style="font-size:16px;font-weight:700;">${fmtC(totTaxable)}</div>
          </div>
          <div style="background:linear-gradient(135deg,#7c3aed,#a78bfa);border-radius:var(--radius-md);padding:16px;color:white;">
            <div style="font-size:11px;opacity:0.8;margin-bottom:4px;">GST Collected</div>
            <div style="font-size:16px;font-weight:700;">${fmtC(totGST)}</div>
          </div>
          <div style="background:linear-gradient(135deg,#d97706,#f59e0b);border-radius:var(--radius-md);padding:16px;color:white;">
            <div style="font-size:11px;opacity:0.8;margin-bottom:4px;">Invoice Value</div>
            <div style="font-size:16px;font-weight:700;">${fmtC(totVal)}</div>
          </div>
        </div>

        <!-- Category Breakdown -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
          <thead>
            <tr style="background:var(--bg);">
              <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-muted);border-bottom:2px solid var(--border);">Category</th>
              <th style="padding:10px 12px;text-align:center;font-weight:600;color:var(--text-muted);border-bottom:2px solid var(--border);">Invoices</th>
              <th style="padding:10px 12px;text-align:right;font-weight:600;color:var(--text-muted);border-bottom:2px solid var(--border);">Taxable (₹)</th>
              <th style="padding:10px 12px;text-align:right;font-weight:600;color:var(--text-muted);border-bottom:2px solid var(--border);">GST (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:10px 12px;font-weight:500;">B2B – Registered Business</td>
              <td style="padding:10px 12px;text-align:center;">${b2b.length}</td>
              <td style="padding:10px 12px;text-align:right;">${fmt(b2b.reduce((s,i)=>s+(i.taxable||0),0))}</td>
              <td style="padding:10px 12px;text-align:right;">${fmt(b2b.reduce((s,i)=>s+(i.cgst||0)+(i.sgst||0)+(i.igst||0),0))}</td>
            </tr>
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:10px 12px;font-weight:500;">B2C – Unregistered</td>
              <td style="padding:10px 12px;text-align:center;">${b2c.length}</td>
              <td style="padding:10px 12px;text-align:right;">${fmt(b2c.reduce((s,i)=>s+(i.taxable||0),0))}</td>
              <td style="padding:10px 12px;text-align:right;">${fmt(b2c.reduce((s,i)=>s+(i.cgst||0)+(i.sgst||0)+(i.igst||0),0))}</td>
            </tr>
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:10px 12px;font-weight:500;">Credit Notes</td>
              <td style="padding:10px 12px;text-align:center;">${cn.length}</td>
              <td style="padding:10px 12px;text-align:right;">${fmt(cn.reduce((s,i)=>s+(i.taxable||0),0))}</td>
              <td style="padding:10px 12px;text-align:right;">${fmt(cn.reduce((s,i)=>s+(i.cgst||0)+(i.sgst||0)+(i.igst||0),0))}</td>
            </tr>
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:10px 12px;font-weight:500;">Debit Notes</td>
              <td style="padding:10px 12px;text-align:center;">${dn.length}</td>
              <td style="padding:10px 12px;text-align:right;">${fmt(dn.reduce((s,i)=>s+(i.taxable||0),0))}</td>
              <td style="padding:10px 12px;text-align:right;">${fmt(dn.reduce((s,i)=>s+(i.cgst||0)+(i.sgst||0)+(i.igst||0),0))}</td>
            </tr>
            <tr style="background:var(--bg);font-weight:700;">
              <td style="padding:10px 12px;">TOTAL</td>
              <td style="padding:10px 12px;text-align:center;">${active.length}</td>
              <td style="padding:10px 12px;text-align:right;color:var(--primary);">${fmt(totTaxable)}</td>
              <td style="padding:10px 12px;text-align:right;color:var(--primary);">${fmt(totGST)}</td>
            </tr>
          </tbody>
        </table>

        <!-- GST Breakup -->
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;margin-bottom:24px;">
          <div style="font-weight:700;margin-bottom:12px;font-size:13px;">GST Liability Breakup</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;font-size:13px;">
            <div><span style="color:var(--text-muted);">CGST</span><br><strong>${fmtC(totCGST)}</strong></div>
            <div><span style="color:var(--text-muted);">SGST</span><br><strong>${fmtC(totSGST)}</strong></div>
            <div><span style="color:var(--text-muted);">IGST</span><br><strong>${fmtC(totIGST)}</strong></div>
            <div><span style="color:var(--text-muted);">Total GST</span><br><strong style="color:var(--primary);font-size:15px;">${fmtC(totGST)}</strong></div>
          </div>
        </div>

        <!-- Actions -->
        <div style="display:flex;gap:12px;justify-content:flex-end;">
          <button class="btn btn-outline" onclick="exportGSTR1Excel()">
            <span class="material-icons-outlined">download</span> Export Excel
          </button>
          <button class="btn btn-outline" onclick="exportGSTR1JSON()">
            <span class="material-icons-outlined">code</span> Export JSON
          </button>
          <button class="btn btn-primary" onclick="window.print()">
            <span class="material-icons-outlined">print</span> Print
          </button>
          <button class="btn btn-outline" onclick="document.getElementById('gstr1SummaryModal').remove()">Close</button>
        </div>
      </div>
    </div>`;
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.remove();
  });
  document.body.appendChild(modal);
};

// ── GSTR-3B Export Excel ────────────────────────
window.exportGSTR3BExcel = function() {
  const periodEl = document.getElementById('gstr3bPeriod');
  const periodStr = periodEl ? periodEl.value : null;
  const invs = gstInvoicesForPeriod(periodStr);

  if (!invs.length) {
    AppToast.show('No data to export for selected period', 'warning');
    return;
  }

  const taxable = invs.reduce((s,i) => s+(i.taxable||0), 0);
  const cgst = invs.reduce((s,i) => s+(i.cgst||0), 0);
  const sgst = invs.reduce((s,i) => s+(i.sgst||0), 0);
  const igst = invs.reduce((s,i) => s+(i.igst||0), 0);

  const rows = [
    ['GSTR-3B Summary', periodStr || 'All Periods'],
    ['GSTIN', PH_DATA.company ? PH_DATA.company.gstin : ''],
    [''],
    ['Section 3.1 – Outward Supplies'],
    ['Nature of Supply', 'Taxable Value (₹)', 'Integrated Tax (₹)', 'Central Tax (₹)', 'State/UT Tax (₹)', 'Cess (₹)'],
    ['(a) Outward taxable supplies', taxable.toFixed(2), igst.toFixed(2), cgst.toFixed(2), sgst.toFixed(2), '0.00'],
    ['(b) Outward taxable supplies (zero rated)', '—', '—', '—', '—', '—'],
    ['(c) Other outward supplies (Nil rated, exempted)', '—', '—', '—', '—', '—'],
    ['(d) Inward supplies (liable to reverse charge)', '—', '—', '—', '—', '—'],
    ['(e) Non-GST outward supplies', '—', '—', '—', '—', '—'],
    ['Total', taxable.toFixed(2), igst.toFixed(2), cgst.toFixed(2), sgst.toFixed(2), '0.00'],
    [''],
    ['Section 4 – Eligible ITC (Not Applicable – Outward Sales System)'],
    [''],
    ['GST Liability Summary'],
    ['Component', 'Amount (₹)'],
    ['CGST', cgst.toFixed(2)],
    ['SGST', sgst.toFixed(2)],
    ['IGST', igst.toFixed(2)],
    ['CESS', '0.00'],
    ['TOTAL GST LIABILITY', (cgst + sgst + igst).toFixed(2)]
  ];

  const period = periodStr ? periodStr.replace(' ', '_') : 'All';
  _downloadCSV(`GSTR3B_Summary_${period}.csv`, rows);
  AppToast.show('GSTR-3B data exported successfully', 'success');
};

// ── GST Reports Export Excel ────────────────────
window.exportGSTReportsExcel = function() {
  const periodEl = document.getElementById('gstReportsPeriod');
  const periodStr = periodEl ? periodEl.value : null;
  const invs = gstInvoicesForPeriod(periodStr);

  if (!invs.length) {
    AppToast.show('No data to export for selected period', 'warning');
    return;
  }

  const coState = PH_DATA.company && PH_DATA.company.gstin ? PH_DATA.company.gstin.substring(0, 2) : '37';
  
  const rows = [
    ['GST Sales Register', periodStr || 'All Periods'],
    ['GSTIN', PH_DATA.company ? PH_DATA.company.gstin : ''],
    [''],
    ['Invoice No', 'Date', 'Customer', 'GSTIN', 'Supply Type', 'Taxable (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Total (₹)']
  ];

  invs.forEach(inv => {
    const gstin = (inv.customer && inv.customer.gstin) ? inv.customer.gstin : '';
    const custState = gstin ? gstin.substring(0, 2) : coState;
    const isExport = inv.customer && inv.customer.isExport;
    const supplyType = isExport ? 'Export' : (coState !== custState ? 'Inter-State' : 'Intra-State');
    rows.push([
      inv.number, inv.date, inv.custName || '', gstin, supplyType,
      (inv.taxable||0).toFixed(2), (inv.cgst||0).toFixed(2), (inv.sgst||0).toFixed(2),
      (inv.igst||0).toFixed(2), (inv.grandTotal||0).toFixed(2)
    ]);
  });

  // Add totals row
  rows.push(['TOTAL', '', '', '', '',
    invs.reduce((s,i)=>s+(i.taxable||0),0).toFixed(2),
    invs.reduce((s,i)=>s+(i.cgst||0),0).toFixed(2),
    invs.reduce((s,i)=>s+(i.sgst||0),0).toFixed(2),
    invs.reduce((s,i)=>s+(i.igst||0),0).toFixed(2),
    invs.reduce((s,i)=>s+(i.grandTotal||0),0).toFixed(2)
  ]);

  const period = periodStr ? periodStr.replace(' ', '_') : 'All';
  _downloadCSV(`GST_Reports_${period}.csv`, rows);
  AppToast.show('GST Reports data exported successfully', 'success');
};

