const fs = require('fs');
const content = fs.readFileSync('web/index.html', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);

lines.forEach((l, i) => {
  if (l.includes('<header') || l.includes('class="header') || l.includes('id="btn') || l.includes('class="modal') || l.includes('id="modal') || l.includes('nav-actions') || l.includes('class="nav') || l.includes('showSettingsModal') || l.includes('qrcode-modal') || l.includes('id="history-list"') || l.includes('id="admin') || l.includes('id="auth')) {
    console.log(`${i+1}: ${l.trim().slice(0, 100)}`);
  }
});
