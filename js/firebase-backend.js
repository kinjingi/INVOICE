import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB8IfJRDxH6doI7FUz5HuxryXeL2WSem3Y",
  authDomain: "padowa-healthcare-invoice.firebaseapp.com",
  projectId: "padowa-healthcare-invoice",
  storageBucket: "padowa-healthcare-invoice.firebasestorage.app",
  messagingSenderId: "606715360476",
  appId: "1:606715360476:web:55961b7a5ae2a73a20f019",
  measurementId: "G-WP1HZC64MJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

        console.log("Firebase data loaded successfully");
    } catch(e) {
        console.error("Firebase init failed:", e);
    }
};

window.saveCustomerToDB = async function(customer) {
    if (!customer.id) customer.id = 'CUST' + Date.now();
    try {
        await setDoc(doc(db, "customers", customer.id), customer);
    } catch(e) { console.error("Error saving customer", e); }
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

window.saveInvoiceToDB = async function(invoice) {
    try {
        await setDoc(doc(db, "invoices", invoice.id), invoice);
        await setDoc(doc(db, "metadata", "invoice_seq"), { value: window.PH_DATA.nextInvoiceSeq });
    } catch(e) { console.error("Error saving invoice", e); }
};
