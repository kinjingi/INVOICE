// local-backend.js
window.initFirebaseDB = async function() {
    // We are using local storage instead of Firebase
    try {
        const custStr = localStorage.getItem('ph_customers');
        if (custStr) window.PH_DATA.customers = JSON.parse(custStr);
        else window.PH_DATA.customers = [];

        const prodStr = localStorage.getItem('ph_products');
        if (prodStr) window.PH_DATA.products = JSON.parse(prodStr);
        else window.PH_DATA.products = [];

        const invStr = localStorage.getItem('ph_invoices');
        if (invStr) window.PH_DATA.invoices = JSON.parse(invStr);
        else window.PH_DATA.invoices = [];

        const seqStr = localStorage.getItem('padowa_next_invoice_seq');
        if (seqStr) window.PH_DATA.nextInvoiceSeq = parseInt(seqStr, 10);
    } catch(e) {
        console.error("Local init failed:", e);
    }

    if (typeof window.loadSettings === 'function') {
        await window.loadSettings();
    }
    if (typeof window.checkAuth === 'function') {
        window.checkAuth();
    }
};

window.saveCustomerToDB = async function(customer) {
    if (!customer.id) customer.id = 'CUST' + Date.now();
    
    // Add or update customer in local data
    const idx = window.PH_DATA.customers.findIndex(c => c.id === customer.id);
    if (idx !== -1) window.PH_DATA.customers[idx] = customer;
    else window.PH_DATA.customers.push(customer);
    
    localStorage.setItem('ph_customers', JSON.stringify(window.PH_DATA.customers));
};

window.deleteCustomerFromDB = async function(id) {
    window.PH_DATA.customers = window.PH_DATA.customers.filter(c => c.id !== id);
    localStorage.setItem('ph_customers', JSON.stringify(window.PH_DATA.customers));
};

window.saveProductToDB = async function(product) {
    if (!product.id) product.id = 'PROD' + Date.now();
    const idx = window.PH_DATA.products.findIndex(p => p.id === product.id);
    if (idx !== -1) window.PH_DATA.products[idx] = product;
    else window.PH_DATA.products.push(product);
    localStorage.setItem('ph_products', JSON.stringify(window.PH_DATA.products));
};

window.deleteProductFromDB = async function(id) {
    window.PH_DATA.products = window.PH_DATA.products.filter(p => p.id !== id);
    localStorage.setItem('ph_products', JSON.stringify(window.PH_DATA.products));
};

window.deleteInvoiceFromDB = async function(invId) {
    window.PH_DATA.invoices = window.PH_DATA.invoices.filter(i => i.id !== invId && i.number !== invId);
    localStorage.setItem('ph_invoices', JSON.stringify(window.PH_DATA.invoices));
};

window.saveInvoiceToDB = async function(invoice) {
    localStorage.setItem('ph_invoices', JSON.stringify(window.PH_DATA.invoices));
    
    // Increment invoice sequence and save it
    window.PH_DATA.nextInvoiceSeq++;
    localStorage.setItem('padowa_next_invoice_seq', window.PH_DATA.nextInvoiceSeq.toString());
    
    // Save new customer if it doesn't exist
    if (invoice.customer && invoice.customer.name) {
        let existingCust = window.PH_DATA.customers.find(c => c.id === invoice.customer.id || c.name.toLowerCase() === invoice.customer.name.toLowerCase());
        if (!existingCust) {
            const newCust = { ...invoice.customer, id: 'CUST' + Date.now() };
            window.saveCustomerToDB(newCust);
        }
    }

    // Save new products from items if they don't exist
    if (invoice.products && invoice.products.length > 0) {
        invoice.products.forEach(p => {
            if (!p.productName) return;
            const existingProd = window.PH_DATA.products.find(prod => prod.code === p.productCode || prod.name.toLowerCase() === p.productName.toLowerCase());
            if (!existingProd) {
                const newProduct = {
                    id: 'PROD' + Date.now() + Math.random(),
                    code: p.productCode || 'PRD' + Date.now(),
                    name: p.productName,
                    pack: p.pack || '',
                    hsn: p.hsn || '',
                    mrp: parseFloat(p.mrp) || 0,
                    ptr: parseFloat(p.ptr) || 0,
                    pts: parseFloat(p.pts) || 0,
                    gst: parseFloat(p.gst) || 12,
                    composition: ''
                };
                window.saveProductToDB(newProduct);
            }
        });
    }
};

window.saveSettingsToDB = async function(settings) {
    // We already save settings to localStorage in app.js via padowa_invoice_settings
};

window.loadSettingsFromDB = async function() {
    return null;
};
