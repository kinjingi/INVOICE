const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Fix Modal Structure
html = html.replace(
  '<div class="modal" id="markAsFiledModal">\n      <div class="modal__overlay" tabindex="-1">\n        <div class="modal__container" role="dialog" style="max-width:500px;">',
  '<div class="modal-overlay" id="markAsFiledModal">\n      <div class="modal" style="max-width:500px;">'
);

html = html.replace(
  '          <footer class="modal__footer" style="display:flex; justify-content:flex-end; gap:12px;">\n            <button class="btn btn-outline" onclick="document.getElementById(\'markAsFiledModal\').classList.remove(\'is-open\')">Cancel</button>\n            <button class="btn btn-primary" onclick="window.submitMarkAsFiled()">Mark as Filed</button>\n          </footer>\n        </div>\n      </div>\n    </div>',
  '          <footer class="modal__footer" style="display:flex; justify-content:flex-end; gap:12px;">\n            <button class="btn btn-outline" onclick="document.getElementById(\'markAsFiledModal\').classList.remove(\'is-open\')">Cancel</button>\n            <button class="btn btn-primary" onclick="window.submitMarkAsFiled()">Mark as Filed</button>\n          </footer>\n      </div>\n    </div>'
);

// Add missing KPIs
const oldKpis = `<div class="kpi-grid">
        <div class="kpi-card" style="border-bottom-color:var(--primary);">
          <div class="kpi-card__header">
            <span class="kpi-card__label">Total Taxable Value</span>
          </div>
          <div class="kpi-card__value" id="gstDashTaxable">₹0.00</div>
        </div>
        <div class="kpi-card" style="border-bottom-color:var(--info);">
          <div class="kpi-card__header">
            <span class="kpi-card__label">Total GST Collected</span>
          </div>
          <div class="kpi-card__value" id="gstDashCollected">₹0.00</div>
        </div>
        <div class="kpi-card" style="border-bottom-color:var(--success);">
          <div class="kpi-card__header">
            <span class="kpi-card__label">GSTR-1 Status</span>
          </div>
          <div class="kpi-card__value" id="gstDashStatus">Not Ready</div>
        </div>
      </div>`;

const newKpis = `<div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr);">
        <div class="kpi-card">
          <div class="kpi-card__header">
            <span class="kpi-card__label">Total Invoices</span>
            <span class="material-icons-outlined" style="color:var(--primary); background:rgba(0,87,217,0.1); padding:4px; border-radius:4px; font-size:16px;">receipt</span>
          </div>
          <div class="kpi-card__value" id="gstDashTotalInv">0</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__header">
            <span class="kpi-card__label">B2B Sales</span>
            <span class="material-icons-outlined" style="color:var(--success); background:rgba(39,174,96,0.1); padding:4px; border-radius:4px; font-size:16px;">business</span>
          </div>
          <div class="kpi-card__value" id="gstDashB2B">0</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__header">
            <span class="kpi-card__label">B2C Sales</span>
            <span class="material-icons-outlined" style="color:var(--warning); background:rgba(242,153,74,0.1); padding:4px; border-radius:4px; font-size:16px;">person</span>
          </div>
          <div class="kpi-card__value" id="gstDashB2C">0</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__header">
            <span class="kpi-card__label">Cancelled Invoices</span>
            <span class="material-icons-outlined" style="color:var(--danger); background:rgba(235,87,87,0.1); padding:4px; border-radius:4px; font-size:16px;">cancel</span>
          </div>
          <div class="kpi-card__value" id="gstDashCancelled">0</div>
        </div>
        <div class="kpi-card" style="border-bottom-color:var(--primary);">
          <div class="kpi-card__header">
            <span class="kpi-card__label">Total Taxable Value</span>
          </div>
          <div class="kpi-card__value" id="gstDashTaxable">₹0.00</div>
        </div>
        <div class="kpi-card" style="border-bottom-color:var(--info);">
          <div class="kpi-card__header">
            <span class="kpi-card__label">Total GST Collected</span>
          </div>
          <div class="kpi-card__value" id="gstDashGSTCollected">₹0.00</div>
        </div>
        <div class="kpi-card" style="border-bottom-color:var(--warning);">
          <div class="kpi-card__header">
            <span class="kpi-card__label">GST Liability</span>
          </div>
          <div class="kpi-card__value" id="gstDashLiability">₹0.00</div>
        </div>
        <div class="kpi-card" style="border-bottom-color:var(--success);">
          <div class="kpi-card__header">
            <span class="kpi-card__label">GSTR-1 Status</span>
          </div>
          <div class="kpi-card__value" id="gstDashStatus">Not Ready</div>
        </div>
      </div>
      
      <!-- Hidden IDs needed by gst-module.js but not visible in KPI grid -->
      <span style="display:none;" id="gstDashCN"></span>
      <span style="display:none;" id="gstDashDN"></span>
      <span style="display:none;" id="gstDashPeriodLabel"></span>
      <span style="display:none;" id="gstDashDueDate"></span>
      <span style="display:none;" id="rsCurrentStatus"></span>
      `;

html = html.replace(oldKpis, newKpis);

fs.writeFileSync('index.html', html);
console.log('Fixed index.html structure');
