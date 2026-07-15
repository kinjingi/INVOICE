const fs = require('fs');
const cp = require('child_process');
const clean = cp.execSync('git show HEAD:index.html', {encoding:'utf8'});
const curr = fs.readFileSync('index.html', 'utf8');

const cs = clean.indexOf('<div id="page-settings"');
const ce = clean.indexOf('<!-- ═══ END SETTINGS ═══ -->');
const cleanSettings = clean.substring(cs, ce + 29);

const currS = curr.indexOf('<div id="page-settings"');
const currE = curr.indexOf('<!-- ═══ END SETTINGS ═══ -->');

if (currS !== -1 && currE !== -1 && cs !== -1 && ce !== -1) {
  const newHtml = curr.substring(0, currS) + cleanSettings + curr.substring(currE + 29);
  fs.writeFileSync('index.html', newHtml);
  console.log('Replaced corrupted settings with clean version from git!');
} else {
  console.log('Could not find markers:', {cs, ce, currS, currE});
}
