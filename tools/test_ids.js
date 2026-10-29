const fs = require('fs');
const html = fs.readFileSync('E:/杂乱项目gemini/SubConverter-Extended/web/index.html', 'utf8');
const scripts = html.match(/<script[\s\S]*?<\/script>/gi) || [];
const mainScript = scripts.find(s => !s.includes('src='));
const code = mainScript.replace(/<\/?script[^>]*>/gi, '');

const idRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let m;
const usedIds = new Set();
while ((m = idRegex.exec(code)) !== null) {
  usedIds.add(m[1]);
}

const missing = [];
for (const id of usedIds) {
  if (!html.includes('id="' + id + '"') && !html.includes("id='" + id + "'")) {
    missing.push(id);
  }
}
console.log('Total IDs found in JS:', usedIds.size);
console.log('Missing IDs:', missing);
