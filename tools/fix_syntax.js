const fs = require('fs');
let html = fs.readFileSync('web/index.html', 'utf8');

const reg = /return\s+'http:\/\/127\.0\.0\.1:25588'\s*\+\s*endpoint;\s*\}[\s\S]*?document\.addEventListener\('DOMContentLoaded'\s*,\s*\(\)\s*=>\s*\{[\s\S]*?btn\.onclick\s*=\s*window\.openSettingsModal;\s*\}\);/;

if (reg.test(html)) {
  html = html.replace(reg, '');
  fs.writeFileSync('web/index.html', html, 'utf8');
  console.log('✓ Successfully removed duplicate block and dangling syntax error!');
} else {
  console.log('Could not match regex, manual inspection needed.');
}
