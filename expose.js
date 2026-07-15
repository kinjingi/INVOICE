const fs = require('fs');
const path = require('path');

function exposeGlobals(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');
    
    // Find all top level declarations
    const lines = code.split('\n');
    const exports = new Set();
    
    // Simple regex for top-level functions and const/let
    const fnRegex = /^function\s+([a-zA-Z0-9_]+)\s*\(/;
    const varRegex = /^(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=/;
    
    for (let line of lines) {
        let m = line.match(fnRegex);
        if (m) exports.add(m[1]);
        m = line.match(varRegex);
        if (m) exports.add(m[1]);
    }
    
    if (exports.size > 0) {
        let exportStr = '\n\n// --- Vite Global Expose ---\nif (typeof window !== "undefined") {\n';
        for (let name of exports) {
            exportStr += `  window.${name} = ${name};\n`;
        }
        exportStr += '}\n';
        
        fs.writeFileSync(filePath, code + exportStr);
        console.log(`Exposed globals in ${filePath}`);
    }
}

exposeGlobals(path.join(__dirname, 'src', 'js', 'app.js'));
exposeGlobals(path.join(__dirname, 'src', 'js', 'invoice.js'));
exposeGlobals(path.join(__dirname, 'src', 'js', 'local-backend.js'));
exposeGlobals(path.join(__dirname, 'src', 'js', 'preview.js'));
