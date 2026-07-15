const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html lang="en"><body><div id="toastContainer"></div></body></html>', { runScripts: 'dangerously' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = { getItem:()=>null, setItem:()=>{} };
global.sessionStorage = { getItem:()=>null, setItem:()=>{} };
global.navigator = dom.window.navigator;
try {
  require('./dist/assets/index-D6fcUVGN.js');
  console.log('Bundle loaded successfully! handleLogin is:', typeof window.handleLogin);
} catch(e) {
  console.error('ERROR:', e);
}
