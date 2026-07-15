const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Remove duplicate or old scripts
html = html.replace(/<script src="js\/data\.js\?v=7"><\/script>/g, '');
html = html.replace(/<script src="js\/invoice\.js\?v=7"><\/script>/g, '');
html = html.replace(/<script src="js\/app\.js\?v=7"><\/script>/g, '');
html = html.replace(/<script src="js\/local-backend\.js"><\/script>/g, '');

// Remove css links
html = html.replace(/<link rel="stylesheet" href="css\/invoice\.css\?v=6">/g, '');
html = html.replace(/<link rel="stylesheet" href="print\/invoice-print\.css">/g, '<link rel="stylesheet" href="/src/print/invoice-print.css" media="print">');

// Add the vite module script before closing body tag if not already there
if (!html.includes('<script type="module" src="/src/main.js"></script>')) {
    html = html.replace('</body>', '  <script type="module" src="/src/main.js"></script>\n</body>');
}

fs.writeFileSync('index.html', html);
console.log('Updated index.html');
