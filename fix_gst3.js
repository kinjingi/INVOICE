const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The marker for the end of main-content
const endMainContentMarker = '</div><!-- /main-content -->';
const mainMarker = '</main>';

const startIndex = html.indexOf(endMainContentMarker);
const endIndex = html.indexOf(mainMarker);

if (startIndex !== -1 && endIndex !== -1) {
    let wrongBlock = html.substring(startIndex + endMainContentMarker.length, endIndex);
    
    // We want to remove wrongBlock from its current position
    html = html.substring(0, startIndex + endMainContentMarker.length) + html.substring(endIndex);
    
    // Now let's separate the modal from the page modules
    const modalMarker = '<!-- Mark as Filed Modal -->';
    const modalIndex = wrongBlock.indexOf(modalMarker);
    let pageModules = wrongBlock;
    let modalBlock = '';
    
    if (modalIndex !== -1) {
        pageModules = wrongBlock.substring(0, modalIndex);
        modalBlock = wrongBlock.substring(modalIndex);
    }
    
    // Add page-inner to each page module
    pageModules = pageModules.replace(/<div id="page-gstDashboard" class="page-module">/g, '<div id="page-gstDashboard" class="page-module">\n<div class="page-inner">');
    pageModules = pageModules.replace(/<div id="page-gstr1Register" class="page-module">/g, '<div id="page-gstr1Register" class="page-module">\n<div class="page-inner">');
    pageModules = pageModules.replace(/<div id="page-gstr3bSummary" class="page-module">/g, '<div id="page-gstr3bSummary" class="page-module">\n<div class="page-inner">');
    pageModules = pageModules.replace(/<div id="page-gstReports" class="page-module">/g, '<div id="page-gstReports" class="page-module">\n<div class="page-inner">');
    pageModules = pageModules.replace(/<div id="page-filingHistory" class="page-module">/g, '<div id="page-filingHistory" class="page-module">\n<div class="page-inner">');
    pageModules = pageModules.replace(/<div id="page-gstSettings" class="page-module">/g, '<div id="page-gstSettings" class="page-module">\n<div class="page-inner">');

    // Add closing </div> for page-inner before the next section comment
    pageModules = pageModules.replace(/<!-- GSTR-1 Register -->/g, '</div>\n<!-- GSTR-1 Register -->');
    pageModules = pageModules.replace(/<!-- GSTR-3B Summary -->/g, '</div>\n<!-- GSTR-3B Summary -->');
    pageModules = pageModules.replace(/<!-- GST Reports -->/g, '</div>\n<!-- GST Reports -->');
    pageModules = pageModules.replace(/<!-- Filing History -->/g, '</div>\n<!-- Filing History -->');
    pageModules = pageModules.replace(/<!-- GST Settings -->/g, '</div>\n<!-- GST Settings -->');
    
    // The last module (GST Settings) needs its page-inner closed at the very end of pageModules
    pageModules = pageModules.trimEnd() + '\n</div>\n';

    // Now insert pageModules BEFORE endMainContentMarker
    html = html.replace(endMainContentMarker, pageModules + endMainContentMarker);
    
    // Insert modalBlock AFTER </main>
    html = html.replace(mainMarker, mainMarker + '\n' + modalBlock);
    
    fs.writeFileSync('index.html', html);
    console.log('Successfully fixed GST layout!');
} else {
    console.log('Could not find markers');
}
