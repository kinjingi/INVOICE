const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const sIdx = html.indexOf('<div id="page-settings" class="page-module">');
const eIdx = html.indexOf('<!-- GST Dashboard -->');
console.log(html.substring(sIdx, eIdx));
