const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Remove the GST sidebar
const sidebarRegex = /[\s]*<span class="sidebar-section-label">GST Compliance<\/span>[\s\S]*?<div class="nav-item" data-page="gstSettings"[^>]*>[\s\S]*?<\/div>/;
html = html.replace(sidebarRegex, '');

// 2. Remove the GST pages
// Find the start of GST Dashboard
const gstStart = html.indexOf('<!-- GST Dashboard -->');
if (gstStart !== -1) {
    // Find where the GST section ends. Let's look for the closing tags of GST Settings.
    // In our previous search, the GST Settings module ends around line 2110, followed by `<!-- Mark as Filed Modal -->` or similar.
    // Or we can just find `<!-- Mark as Filed Modal -->` and cut everything before it up to `<!-- GST Dashboard -->`.
    const gstEnd1 = html.indexOf('<!-- Mark as Filed Modal -->');
    if (gstEnd1 !== -1) {
        html = html.substring(0, gstStart) + html.substring(gstEnd1);
    } else {
        // Fallback: look for </main> near the end
        const gstEnd2 = html.indexOf('</main>', gstStart);
        if (gstEnd2 !== -1) {
            html = html.substring(0, gstStart) + html.substring(gstEnd2);
        }
    }
}

// 3. Remove the Mark as Filed modal because it's only used for GST returns
const modalStart = html.indexOf('<!-- Mark as Filed Modal -->');
if (modalStart !== -1) {
    const nextSection = html.indexOf('<!-- ADD NEW CUSTOMER MODAL', modalStart) !== -1 
                        ? html.indexOf('<!-- ADD NEW CUSTOMER MODAL', modalStart)
                        : html.indexOf('<!-- /app-main -->', modalStart);
    if (nextSection !== -1) {
        // If there's an `<!-- /app-main -->` before ADD NEW CUSTOMER MODAL, remove up to that
        const appMain = html.indexOf('<!-- /app-main -->', modalStart);
        const endOfModal = (appMain !== -1 && appMain < nextSection) ? appMain : nextSection;
        
        html = html.substring(0, modalStart) + html.substring(endOfModal);
    }
}

fs.writeFileSync('index.html', html);
console.log('GST modules removed successfully.');
