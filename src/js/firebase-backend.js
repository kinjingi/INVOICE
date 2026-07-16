import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firestore.js';

window.initFirebaseDB = async function() {
    try {
        const [custSnap, prodSnap, invSnap, seqSnap] = await Promise.all([
            getDocs(collection(db, "customers")),
            getDocs(collection(db, "products")),
            getDocs(collection(db, "invoices")),
            getDocs(collection(db, "metadata"))
        ]);

        window.PH_DATA.customers = custSnap.docs.map(d => d.data());
        window.PH_DATA.products = prodSnap.docs.map(d => d.data());
        window.PH_DATA.invoices = invSnap.docs.map(d => d.data()).sort((a,b) => b.number.localeCompare(a.number));
        
        const seqDoc = seqSnap.docs.find(d => d.id === 'invoice_seq');
        if (seqDoc) {
            window.PH_DATA.nextInvoiceSeq = seqDoc.data().value || 1;
        }

        // Load settings from Firebase and apply them
        const settingsDoc = seqSnap.docs.find(d => d.id === 'app_settings');
        if (settingsDoc) {
            window._firebaseSettings = settingsDoc.data();
        }
        window.renderDashboard();
    } catch(e) {
        console.error("Firebase init failed:", e);
    }

    // Now load settings (Firebase ones take priority over localStorage)
    if (typeof window.loadSettings === 'function') {
        await window.loadSettings();
    }
    // Ensure auth check runs after settings are applied
    if (typeof window.checkAuth === 'function') {
        window.checkAuth();
    }
};

window.saveCustomerToDB = async function(customer) {
    if (!customer.id) customer.id = 'CUST' + Date.now();
    try {
        await setDoc(doc(db, "customers", customer.id), customer);
    } catch(e) { console.error("Error saving customer", e); }
};

window.deleteCustomerFromDB = async function(id) {
    try {
        await deleteDoc(doc(db, "customers", id));
    } catch(e) { console.error("Error deleting customer", e); }
};

window.saveProductToDB = async function(product) {
    const id = product.code;
    try {
        await setDoc(doc(db, "products", id), product);
    } catch(e) { console.error("Error saving product", e); }
};

window.deleteProductFromDB = async function(code) {
    try {
        await deleteDoc(doc(db, "products", code));
    } catch(e) { console.error("Error deleting product", e); }
};

window.saveInvoiceToDB = async function(invoice, isUpdate = false) {
    try {
        await setDoc(doc(db, "invoices", invoice.id), invoice);
        
        if (!isUpdate) {
            window.PH_DATA.nextInvoiceSeq++;
            await setDoc(doc(db, "metadata", "invoice_seq"), { value: window.PH_DATA.nextInvoiceSeq });
        }
    } catch(e) { console.error("Error saving invoice", e); }
};

window.deleteInvoiceFromDB = async function(invId) {
    try {
        await deleteDoc(doc(db, "invoices", invId));
    } catch(e) { console.error("Error deleting invoice", e); }
};

window.saveSettingsToDB = async function(settings) {
    try {
        await setDoc(doc(db, "metadata", "app_settings"), settings);
    } catch(e) { console.error("Error saving settings", e); }
};

window.loadSettingsFromDB = async function() {
    try {
        const snap = await getDoc(doc(db, "metadata", "app_settings"));
        if (snap.exists()) {
            return snap.data();
        }
    } catch(e) { console.error("Error loading settings", e); }
    return null;
};
