const fs = require('fs');
let html = fs.readFileSync('web/index.html', 'utf8');

// 1. 确保引入 subflow_v2.js
if (!html.includes('<script src="subflow_v2.js"></script>')) {
  html = html.replace(
    '<script src="qrcode.min.js"></script>',
    '<script src="qrcode.min.js"></script>\n  <script src="subflow_v2.js"></script>'
  );
  console.log('✓ Added <script src="subflow_v2.js"></script>');
}

// 2. 清理在 index.html 内联 script 里被截断的代码
// 查找从 `// 🌐 V2.0 云端多租户` 到 `// ⚙️ 偏好设置相关逻辑` 或者清理多余截断的 `function apiUrl(endpoint) { ...`
const cutSnippetRegex = /\/\/\s*={10,}\s*\n\s*\/\/\s*🌐\s*V2\.0\s*云端多租户[\s\S]*?function\s+apiUrl\s*\(endpoint\)\s*\{[\s\S]*?(?=\/\/\s*={10,}\s*\n\s*\/\/\s*双语国际化引擎)/;

if (cutSnippetRegex.test(html)) {
  html = html.replace(cutSnippetRegex, '');
  console.log('✓ Cleaned incomplete inline V2 snippet in favor of subflow_v2.js');
} else {
  console.log('Regex did not match, let us inspect.');
}

fs.writeFileSync('web/index.html', html, 'utf8');
