/**
 * JS Logic for Pharmaceutical GST Invoice Preview
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Get Invoice ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    let invoiceId = urlParams.get('id') || 'PH260700009';
    
    // Set title
    document.getElementById('previewTitle').textContent = `Invoice Preview - ${invoiceId}`;
    document.title = `Invoice ${invoiceId} - PADOWA`;

    // 2. Fetch/Mock Data (In future, fetch from ERP API)
    const invoiceData = mockFetchInvoiceData(invoiceId);
    
    // 3. Render Header
    renderHeader(invoiceData);
    
    // 4. Render Customer
    renderCustomer(invoiceData);
    
    // 5. Render Products & Calculate Totals
    const totals = renderProducts(invoiceData.products);
    
    // 6. Render Summaries
    renderGstSummary(totals.gstBreakdown);
    renderBillSummary(totals);

    // 7. Bind WhatsApp PDF Share
    const btnWhatsApp = document.getElementById('btnWhatsAppShare');
    if (btnWhatsApp) {
        btnWhatsApp.addEventListener('click', async () => {
            try {
                btnWhatsApp.innerHTML = '<span class="material-icons-outlined">hourglass_empty</span> Generating...';
                btnWhatsApp.disabled = true;

                const element = document.querySelector('.a4-page');
                const opt = {
                    margin:       0,
                    filename:     `Invoice_${invoiceId}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true },
                    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                };

                // Generate PDF as blob
                const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
                const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `Invoice ${invoiceId}`,
                        text: `Please find attached Invoice ${invoiceId} from PADOWA Healthcare.`,
                    });
                } else {
                    // Fallback for desktops that don't support native file sharing
                    const url = URL.createObjectURL(pdfBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = opt.filename;
                    a.click();
                    URL.revokeObjectURL(url);
                    alert("Your browser doesn't support direct PDF sharing to WhatsApp. The PDF has been downloaded. You can now open WhatsApp Web and attach this file.");
                }
            } catch (err) {
                console.error("Error sharing PDF:", err);
                alert("Could not generate or share PDF.");
            } finally {
                btnWhatsApp.innerHTML = '<span class="material-icons-outlined">chat</span> WhatsApp';
                btnWhatsApp.disabled = false;
            }
        });
    }
    // 8. Handle Print Preferences
    applyPrintPreferences(invoiceId, invoiceData.status !== 'paid' && invoiceData.status !== 'pending');
});

function applyPrintPreferences(invoiceId, isDraft) {
    let copies = 1;
    let watermark = true;
    let logo = true;
    try {
        const setStr = localStorage.getItem('padowa_invoice_settings');
        if (setStr) {
            const settings = JSON.parse(setStr);
            if (settings.printCopies) copies = parseInt(settings.printCopies) || 1;
            if (settings.printWatermark !== undefined) watermark = settings.printWatermark;
            if (settings.printLogo !== undefined) logo = settings.printLogo;
        }
    } catch(e){}

    const container = document.querySelector('.page-container');
    const originalPage = document.querySelector('.a4-page');
    
    // Apply logo to original
    if (!logo) {
        const compName = originalPage.querySelector('.company-name');
        if (compName) compName.style.display = 'none'; // Basic way to hide "logo" here since it's text-based in preview
    }

    // Apply watermark to original
    if (watermark) {
        const wm = document.createElement('div');
        wm.className = 'invoice-watermark';
        
        const logoUrl = (window.opener && window.opener.PH_DATA && window.opener.PH_DATA.company && window.opener.PH_DATA.company.logo) 
                        ? window.opener.PH_DATA.company.logo 
                        : 'https://cdn-icons-png.flaticon.com/512/3004/3004451.png';
                        
        wm.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;background-image:url('${logoUrl}');background-size:contain;background-repeat:no-repeat;background-position:center;opacity:0.05;z-index:0;pointer-events:none;`;
        
        if (isDraft) {
             const draftText = document.createElement('div');
             draftText.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:120px;color:rgba(0,0,0,0.06);font-weight:900;white-space:nowrap;';
             draftText.textContent = 'DRAFT';
             wm.appendChild(draftText);
        }
        
        originalPage.style.position = 'relative';
        originalPage.appendChild(wm);
    }

    // Generate copies
    const copyLabels = ['ORIGINAL FOR BUYER', 'DUPLICATE FOR TRANSPORTER', 'TRIPLICATE FOR SUPPLIER', 'QUADRUPLICATE', 'QUINTUPLICATE'];
    
    // Update label on first copy
    const firstLabel = originalPage.querySelector('.invoice-copy');
    if (firstLabel) firstLabel.textContent = copyLabels[0] || 'COPY 1';

    for (let i = 1; i < copies; i++) {
        const clone = originalPage.cloneNode(true);
        const label = clone.querySelector('.invoice-copy');
        if (label) {
            label.textContent = copyLabels[i] || ('COPY ' + (i + 1));
        }
        // Force page break
        clone.style.pageBreakBefore = 'always';
        container.appendChild(clone);
    }
}

function renderHeader(data) {
    // Apply Settings dynamically from localStorage
    try {
        const savedSettings = localStorage.getItem('padowa_invoice_settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            const elBankName = document.getElementById('lblBankName');
            const elBankAcc = document.getElementById('lblBankAcc');
            const elBankIFSC = document.getElementById('lblBankIFSC');
            const elBankUPI = document.getElementById('lblBankUPI');
            const elTerms = document.getElementById('lblTerms');
            
            const elCompName = document.getElementById('lblCompName');
            const elBranchName = document.getElementById('lblBranchName');
            const elCompAddress = document.getElementById('lblCompAddress');
            const elCompPhone = document.getElementById('lblCompPhone');
            const elCompEmail = document.getElementById('lblCompEmail');
            const elCompGSTIN = document.getElementById('lblCompGSTIN');
            const elCompDL = document.getElementById('lblCompDL');
            
            if (elBankName) elBankName.textContent = settings.bankName || 'HDFC Bank';
            if (elBankAcc) elBankAcc.textContent = settings.accNo || '50200012345678';
            if (elBankIFSC) elBankIFSC.textContent = settings.ifsc || 'HDFC0001234';
            if (elBankUPI) elBankUPI.textContent = settings.upi || 'padowahealthcare@hdfcbank';
            if (elTerms) elTerms.textContent = settings.terms || 'Subject to Bengaluru jurisdiction. Goods once sold will not be taken back or exchanged without valid reason. All disputes subject to arbitration per Company Policy. E.&O.E.';
            
            if (elCompName && settings.compName) elCompName.textContent = settings.compName;
            if (elBranchName && settings.branchName) elBranchName.textContent = settings.branchName;
            if (elCompAddress && settings.address) elCompAddress.innerHTML = settings.address.replace(/\n/g, '<br>');
            if (elCompPhone && settings.compPhone) elCompPhone.textContent = settings.compPhone;
            if (elCompEmail && settings.compEmail) elCompEmail.textContent = settings.compEmail;
            if (elCompGSTIN && settings.compGSTIN) elCompGSTIN.textContent = settings.compGSTIN;
            if (elCompDL && settings.compDL) elCompDL.textContent = settings.compDL;
        }
    } catch(e) {
        console.error('Error applying settings to preview:', e);
    }

    document.getElementById('lblInvNo').textContent = data.number;
    document.getElementById('lblInvDate').textContent = data.date;
    const lblDue = document.getElementById('lblInvDueDate');
    if (lblDue) lblDue.textContent = data.dueDate || 'N/A';
    document.getElementById('lblInvTime').textContent = data.time || '10:00 AM';
    document.getElementById('lblOrderNo').textContent = data.orderNo || 'N/A';
    document.getElementById('lblEwayBill').textContent = data.ewayBill || 'N/A';
    document.getElementById('lblTransport').textContent = data.transport || 'N/A';
    document.getElementById('lblLRNo').textContent = data.lrNo || 'N/A';
    document.getElementById('lblVehicle').textContent = data.vehicle || 'N/A';
    document.getElementById('lblPaymentMode').textContent = data.paymentMode || 'Credit';
    document.getElementById('lblExec').textContent = data.executive || 'House Account';
}

function renderCustomer(data) {
    // Bill To
    document.getElementById('lblBillName').textContent = data.customer.name;
    document.getElementById('lblBillAddress').innerHTML = data.customer.address;
    document.getElementById('lblBillPhone').textContent = data.customer.phone;
    document.getElementById('lblBillGST').textContent = data.customer.gstin || 'Unregistered';
    document.getElementById('lblBillDL').textContent = data.customer.dl || data.customer.drugLicense || 'N/A';
    document.getElementById('lblBillFSSAI').textContent = data.customer.fssai || 'N/A';
    
    const lblType = document.getElementById('lblBillType');
    if (lblType) {
        lblType.textContent = (data.customer.paymentType || data.customer.type || 'CREDIT').toUpperCase();
    }

    // Ship To
    document.getElementById('lblShipName').textContent = data.customer.name;
    document.getElementById('lblShipAddress').innerHTML = (data.customer.shippingAddress || data.customer.address).replace(/\n/g, '<br>');
    document.getElementById('lblPlaceOfSupply').textContent = data.customer.state;
    document.getElementById('lblCreditDays').textContent = data.customer.creditDays || '30 Days';
    document.getElementById('lblOutstanding').textContent = `Rs. ${data.customer.outstanding || '0.00'}`;
}

function renderProducts(products) {
    const tbody = document.getElementById('productTbody');
    let html = '';
    
    let totals = {
        items: products.length,
        saleQty: 0,
        freeQty: 0,
        mrpValue: 0,
        ptsValue: 0,
        gross: 0,
        discount: 0,
        taxable: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        gstBreakdown: {
            '0': { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
            '5': { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
            '12': { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
            '18': { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
            '28': { taxable: 0, cgst: 0, sgst: 0, igst: 0 }
        }
    };

    products.forEach((p, index) => {
        // Calculations based purely on PTS
        const grossAmount = p.saleQty * p.pts;
        const discountAmount = grossAmount * (p.discountPercent / 100);
        const taxableValue = grossAmount - discountAmount;
        
        // GST Calculation (Assuming intra-state CGST/SGST for this example)
        const gstAmount = taxableValue * (p.gstPercent / 100);
        const cgstAmount = gstAmount / 2;
        const sgstAmount = gstAmount / 2;
        const igstAmount = 0; // If inter-state, cgst/sgst would be 0 and igst = gstAmount
        
        const netAmount = taxableValue + gstAmount;

        // Stock tracking note (Backend logic):
        // stockReduce = p.saleQty + p.freeQty;
        
        // Accumulate totals
        totals.saleQty += p.saleQty;
        totals.freeQty += p.freeQty;
        totals.mrpValue += (p.saleQty + p.freeQty) * p.mrp;
        totals.ptsValue += (p.saleQty + p.freeQty) * p.pts; // PTS value of total goods
        totals.gross += grossAmount;
        totals.discount += discountAmount;
        totals.taxable += taxableValue;
        totals.cgst += cgstAmount;
        totals.sgst += sgstAmount;
        totals.igst += igstAmount;

        // Update GST Breakdown
        let rateKey = p.gstPercent.toString();
        if(!totals.gstBreakdown[rateKey]) totals.gstBreakdown[rateKey] = { taxable:0, cgst:0, sgst:0, igst:0 };
        totals.gstBreakdown[rateKey].taxable += taxableValue;
        totals.gstBreakdown[rateKey].cgst += cgstAmount;
        totals.gstBreakdown[rateKey].sgst += sgstAmount;
        totals.gstBreakdown[rateKey].igst += igstAmount;

        html += `
        <tr>
            <td class="text-center">${index + 1}</td>
            <td>${p.code}</td>
            <td>
                <div class="item-name">${p.name}</div>
                <div class="item-comp">${p.composition}</div>
            </td>
            <td class="text-center">${p.pack}</td>
            <td>${p.batch}</td>
            <td>${p.mfg}</td>
            <td>${p.exp}</td>
            <td>${p.hsn}</td>
            <td class="text-right bold">${p.saleQty}</td>
            <td class="text-right">${p.freeQty}</td>
            <td class="text-right">${p.mrp.toFixed(2)}</td>
            <td class="text-right">${p.ptr.toFixed(2)}</td>
            <td class="text-right bold">${p.pts.toFixed(2)}</td>
            <td class="text-right">${p.discountPercent}%</td>
            <td class="text-right">${taxableValue.toFixed(2)}</td>
            <td class="text-right">${p.gstPercent}%</td>
            <td class="text-right bold">${netAmount.toFixed(2)}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
    return totals;
}

function renderGstSummary(breakdown) {
    const tbody = document.getElementById('gstSummaryTbody');
    let html = '';
    
    let tTax = 0, tCgst = 0, tSgst = 0, tIgst = 0, tTotal = 0;

    ['0', '5', '12', '18', '28'].forEach(rate => {
        const b = breakdown[rate];
        if(b && (b.taxable > 0 || rate === '12')) { // always show 12% as example, or only those > 0
            const totalRowGst = b.cgst + b.sgst + b.igst;
            html += `
            <tr>
                <td>${rate}%</td>
                <td>${b.taxable.toFixed(2)}</td>
                <td>${b.cgst.toFixed(2)}</td>
                <td>${b.sgst.toFixed(2)}</td>
                <td>${b.igst.toFixed(2)}</td>
                <td class="bold">${totalRowGst.toFixed(2)}</td>
            </tr>`;
            
            tTax += b.taxable;
            tCgst += b.cgst;
            tSgst += b.sgst;
            tIgst += b.igst;
            tTotal += totalRowGst;
        }
    });

    html += `
    <tr class="bold" style="background:#f8fafc;">
        <td>TOTAL</td>
        <td>${tTax.toFixed(2)}</td>
        <td>${tCgst.toFixed(2)}</td>
        <td>${tSgst.toFixed(2)}</td>
        <td>${tIgst.toFixed(2)}</td>
        <td>${tTotal.toFixed(2)}</td>
    </tr>`;

    tbody.innerHTML = html;
}

function renderBillSummary(totals) {
    const totalGst = totals.cgst + totals.sgst + totals.igst;
    const exactGrand = totals.taxable + totalGst;
    const roundedGrand = Math.round(exactGrand);
    const roundOff = roundedGrand - exactGrand;

    document.getElementById('sumItems').textContent = totals.items;
    document.getElementById('sumQty').textContent = totals.saleQty + totals.freeQty;
    document.getElementById('sumMRP').textContent = totals.mrpValue.toFixed(2);
    document.getElementById('sumPTS').textContent = totals.ptsValue.toFixed(2);
    
    document.getElementById('sumGross').textContent = totals.gross.toFixed(2);
    document.getElementById('sumDisc').textContent = totals.discount.toFixed(2);
    document.getElementById('sumTaxable').textContent = totals.taxable.toFixed(2);
    
    document.getElementById('sumCGST').textContent = totals.cgst.toFixed(2);
    document.getElementById('sumSGST').textContent = totals.sgst.toFixed(2);
    document.getElementById('sumIGST').textContent = totals.igst.toFixed(2);
    
    document.getElementById('sumRoundOff').textContent = roundOff.toFixed(2);
    document.getElementById('sumGrand').textContent = `₹ ${roundedGrand.toFixed(2)}`;

    document.getElementById('lblAmountWords').textContent = `Rupees ${numberToWords(roundedGrand)} Only`;
}


// Utility: Number to Words
function numberToWords(num) {
    if (num === 0) return 'Zero';
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

    if ((num = num.toString()).length > 9) return 'overflow';
    n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return; var str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim();
}

// Data Provider
function mockFetchInvoiceData(id) {
    try {
        const lastInv = localStorage.getItem('padowa_last_invoice');
        if (lastInv) {
            const parsed = JSON.parse(lastInv);
            if (parsed.number === id || id === 'live') {
                const cust = parsed.customer || {};
                // Build a properly formatted address from the customer object
                const addrParts = [cust.address, cust.city, cust.state].filter(Boolean);
                const formattedAddress = addrParts.join(', ');

                return {
                    number: parsed.number,
                    date: parsed.date,
                    dueDate: parsed.dueDate || 'N/A',
                    time: parsed.time,
                    orderNo: parsed.orderNo || 'N/A',
                    transport: parsed.transport || 'N/A',
                    lrNo: parsed.lrNo || 'N/A',
                    ewayBill: parsed.ewayBill || 'N/A',
                    vehicle: parsed.vehicle || 'N/A',
                    paymentMode: parsed.paymentMode,
                    executive: parsed.exec || 'N/A',
                    customer: {
                        name: cust.name || parsed.custName || 'N/A',
                        address: formattedAddress || 'N/A',
                        phone: cust.phone || 'N/A',
                        gstin: cust.gstin || 'Unregistered',
                        dl: cust.drugLicense || cust.dl || 'N/A',
                        fssai: cust.fssai || 'N/A',
                        state: (cust.state ? cust.state + (cust.stateCode ? ' (' + cust.stateCode + ')' : '') : 'N/A'),
                        creditDays: cust.creditDays ? cust.creditDays + ' Days' : 'N/A',
                        outstanding: cust.outstanding !== undefined ? cust.outstanding.toFixed(2) : '0.00',
                        paymentType: cust.paymentType || cust.type || 'Credit'
                    },
                    products: (parsed.products || []).map(p => ({
                        code: p.productCode || 'N/A',
                        name: p.productName || 'Product',
                        composition: p.composition || '',
                        pack: p.pack || '1x1',
                        batch: p.batchNo || 'N/A',
                        mfg: p.mfgDate || 'N/A',
                        exp: p.expiryDate || 'N/A',
                        hsn: p.hsn || '0000',
                        saleQty: p.qty || 0,
                        freeQty: p.freeQty || 0,
                        mrp: parseFloat(p.mrp) || 0,
                        ptr: parseFloat(p.ptr) || 0,
                        pts: parseFloat(p.rate) || 0,
                        discountPercent: parseFloat(p.discountPct) || 0,
                        gstPercent: parseFloat(p.gstPct) || 0
                    }))
                };
            }
        }
    } catch(e) { console.error('Preview parse error:', e); }


    // Fallback Mock
    return {
        number: id,
        date: '06/07/2026',
        time: '14:30',
        orderNo: 'PO-9912',
        transport: 'VRL Logistics',
        lrNo: 'LR-88231',
        ewayBill: 'N/A',
        vehicle: 'KA 01 AB 1234',
        paymentMode: 'Credit',
        executive: 'Rajesh Kumar',
        customer: {
            name: 'Apollo Pharmacy Pvt Ltd',
            address: '1st Cross, Gandhi Bazaar<br>Bengaluru, Karnataka 560004',
            phone: '9876543210',
            gstin: '29AABCP9999Z1Z5',
            dl: 'KA-B20-111111',
            state: 'Karnataka (29)',
            creditDays: '30 Days',
            outstanding: '25,450.00'
        },
        products: [
            {
                code: 'P001', name: 'Amoxicillin 500mg', composition: 'Amoxicillin Trihydrate IP',
                pack: '10x10', batch: 'AMX2601', mfg: '01/26', exp: '12/28', hsn: '3004',
                saleQty: 100, freeQty: 10, mrp: 120.00, ptr: 85.00, pts: 75.00, discountPercent: 2, gstPercent: 12
            },
            {
                code: 'P002', name: 'Paracetamol 650mg', composition: 'Paracetamol IP 650mg',
                pack: '15x10', batch: 'PAR2602', mfg: '02/26', exp: '01/29', hsn: '3004',
                saleQty: 50, freeQty: 5, mrp: 45.00, ptr: 32.00, pts: 28.00, discountPercent: 0, gstPercent: 12
            },
            {
                code: 'P045', name: 'Cough Syrup 100ml', composition: 'Dextromethorphan + CPM',
                pack: '100ml', batch: 'SYR2603', mfg: '03/26', exp: '02/28', hsn: '3004',
                saleQty: 200, freeQty: 20, mrp: 95.00, ptr: 68.00, pts: 60.00, discountPercent: 5, gstPercent: 12
            }
        ]
    };
}
