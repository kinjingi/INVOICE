const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const stack = [];
const regex = /<div([^>]*)>|<\/div>/g;
let match;
while ((match = regex.exec(html)) !== null) {
  if (match[0].startsWith('<div')) {
    stack.push(match[1]);
  } else {
    stack.pop();
  }
  if (html.substring(match.index, match.index + 80).includes('card-title">Autosave')) {
    console.log(stack.slice(-8));
    break;
  }
}
