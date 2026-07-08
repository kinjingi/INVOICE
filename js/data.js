/* ════════════════════════════════════════════════
   PADOWA Healthcare – Mock Data Layer
   Customers, Products, Invoices, Sales Executives
════════════════════════════════════════════════ */

window.PH_DATA = {

  // ── Company ──────────────────────────────────
  company: {
    name:       'PADOWA Healthcare',
    tagline:    'Ethical Pharmaceutical Marketing',
    address:    '42, Pharma Tower, MG Road, Bengaluru – 560001, Karnataka',
    gstin:      '29AABCP1234A1Z5',
    drugLicense:'DL-KA-2024-00145 | DL-KA-2024-00146',
    phone:      '+91 80 4567 8901',
    email:      'billing@padowahealthcare.com',
    website:    'www.padowahealthcare.com',
    bank:       'HDFC Bank, Indiranagar Branch',
    accNo:      '50200012345678',
    ifsc:       'HDFC0001234',
    upi:        'padowahealthcare@hdfcbank',
    state:      'Karnataka',
    stateCode:  '29',
    fy:         '2026-27',
  },

  // ── Sales Executives ─────────────────────────
  executives: [
    { id: 'MR001', name: 'Dr. PRASANTH KINJINGI',   region: 'Bengaluru North' },
    { id: 'MR002', name: 'Priya Sharma',   region: 'Bengaluru South' },
    { id: 'MR003', name: 'Suresh Nair',    region: 'Mysuru / Hubballi' },
    { id: 'MR004', name: 'Anita Rao',      region: 'Chennai Tamil Nadu' },
    { id: 'MR005', name: 'Mohammed Imran', region: 'Hyderabad Telangana' },
    { id: 'MR006', name: 'Lakshmi Devi',   region: 'Mangaluru Coastal' },
  ],

  // ── Customers ────────────────────────────────
  customers: [],

  // ── Products ─────────────────────────────────
  products: [],

  // ── Invoice History ───────────────────────────
  invoices: [],

  // ── Draft Invoices ────────────────────────────
  drafts: [],

  // ── Invoice counter (for auto-generating numbers) ──
  nextInvoiceSeq: 9,

  // ── Helper methods ─────────────────────────────
  generateInvoiceNumber() {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    
    // Find the highest sequence number for this month
    const prefix = `PH${yy}${mm}`;
    let maxSeq = 0;
    
    if (this.invoices && this.invoices.length > 0) {
        for (const inv of this.invoices) {
            if (inv.number && inv.number.startsWith(prefix)) {
                const seqStr = inv.number.substring(prefix.length);
                const seqNum = parseInt(seqStr, 10);
                if (!isNaN(seqNum) && seqNum > maxSeq) {
                    maxSeq = seqNum;
                }
            }
        }
    }
    
    const seq = String(maxSeq + 1).padStart(5, '0');
    return `${prefix}${seq}`;
  },

  searchCustomers(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return this.customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.gstin && c.gstin.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    ).slice(0, 8);
  },

  searchProducts(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return this.products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.composition.toLowerCase().includes(q)
    ).slice(0, 10);
  },

  getCustomerById(id) {
    return this.customers.find(c => c.id === id) || null;
  },

  // Convert number to words (Indian system)
  numberToWords(num) {
    if (num === 0) return 'Zero Rupees Only';
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
      'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
      'Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

    const toWords = (n) => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
      if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + toWords(n%100) : '');
      return '';
    };

    const rupees = Math.floor(num);
    const paise  = Math.round((num - rupees) * 100);

    let result = '';
    const cr = Math.floor(rupees / 10000000);
    const lac = Math.floor((rupees % 10000000) / 100000);
    const thou = Math.floor((rupees % 100000) / 1000);
    const rest = rupees % 1000;

    if (cr)   result += toWords(cr)   + ' Crore ';
    if (lac)  result += toWords(lac)  + ' Lakh ';
    if (thou) result += toWords(thou) + ' Thousand ';
    if (rest) result += toWords(rest);

    result = result.trim() + ' Rupees';
    if (paise) result += ' and ' + toWords(paise) + ' Paise';
    result += ' Only';
    return result;
  },

  // Format currency (Indian system)
  formatCurrency(num) {
    if (isNaN(num)) return '0.00';
    return '₹ ' + parseFloat(num).toLocaleString('en-IN', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  },

  formatNum(num) {
    if (isNaN(num)) return '0.00';
    return parseFloat(num).toLocaleString('en-IN', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  },

  // Dashboard stats
  getDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayInv = this.invoices.filter(i => i.date === today);
    const todayRev = todayInv.filter(i => i.status !== 'cancelled').reduce((s, i) => s + i.grandTotal, 0);
    const pending  = this.invoices.filter(i => i.paymentStatus === 'Pending' || i.paymentStatus === 'Partial');
    const pendingAmt = pending.reduce((s, i) => s + (i.grandTotal - i.amtReceived), 0);
    const credit = this.invoices.filter(i => i.paymentMode === 'Credit' && i.status !== 'cancelled');
    const cash   = this.invoices.filter(i => i.paymentMode === 'Cash'   && i.status !== 'cancelled');
    const cancelled = this.invoices.filter(i => i.status === 'cancelled');
    const gstTotal = this.invoices.filter(i => i.status !== 'cancelled')
      .reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);
    const avgInv = this.invoices.filter(i => i.status !== 'cancelled').length > 0
      ? this.invoices.filter(i => i.status !== 'cancelled').reduce((s, i) => s + i.grandTotal, 0)
        / this.invoices.filter(i => i.status !== 'cancelled').length
      : 0;

    return {
      todayCount:    todayInv.length,
      todayRevenue:  todayRev,
      pendingPayments: pendingAmt,
      creditSales:   credit.reduce((s, i) => s + i.grandTotal, 0),
      cashSales:     cash.reduce((s, i) => s + i.grandTotal, 0),
      cancelled:     cancelled.length,
      gstCollected:  gstTotal,
      avgInvoice:    avgInv,
    };
  },

};
