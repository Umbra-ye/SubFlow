/**
 * SubFlow V2 前端升级与双端一体化脚本
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'web', 'index.html');
let html = fs.readFileSync(file, 'utf8');

console.log('Original index.html length:', html.length);

// 1. 版本号升级为 v2.0
html = html.replace(/<title>SubFlow · 现代订阅流中心<\/title>/g, '<title>SubFlow v2.0 · 现代多租户订阅流中心</title>');
html = html.replace(/<div class="brand-title">SubFlow 订阅流<\/div>/g, '<div class="brand-title">SubFlow 订阅流 <span style="font-size:0.68rem; background:linear-gradient(135deg,#2563eb,#10b981); color:#fff; padding:2px 7px; border-radius:12px; font-weight:700; vertical-align:middle; margin-left:4px;">v2.0</span></div>');
html = html.replace(/<span style="color:var\(--text-secondary\);" id="label-ver-val">SubFlow v1.0<\/span>/g, '<span style="color:var(--text-secondary);" id="label-ver-val">SubFlow v2.0 (Cloud Matrix)</span>');

// 2. 拔除 DEFAULT_HISTORY_SAMPLES 假数据
const demoBlockRegex = /const DEFAULT_HISTORY_SAMPLES = \[[\s\S]*?\];\s*let currentPlatform = 'auto';\s*let historyList = \[\];\s*try\s*\{\s*const saved = localStorage\.getItem\('subflow_history'\);\s*if \(saved\) historyList = JSON\.parse\(saved\);\s*\}\s*catch\(e\)\{\}\s*if \(!historyList \|\| historyList\.length === 0\) \{\s*historyList = JSON\.parse\(JSON\.stringify\(DEFAULT_HISTORY_SAMPLES\)\);\s*try \{ localStorage\.setItem\('subflow_history', JSON\.stringify\(historyList\)\); \} catch\(e\) \{\}\s*\}/;

const cleanHistoryInit = `const DEFAULT_HISTORY_SAMPLES = [];
    let currentPlatform = 'auto';
    let historyList = [];
    try {
      const saved = localStorage.getItem('subflow_history');
      if (saved) {
        // 彻底清除历史开发期残留的 demo 假数据
        historyList = JSON.parse(saved).filter(item => item && !String(item.id || '').startsWith('sub_demo_'));
      }
    } catch(e) {}`;

if (demoBlockRegex.test(html)) {
  html = html.replace(demoBlockRegex, cleanHistoryInit);
  console.log('Replaced DEFAULT_HISTORY_SAMPLES with clean state');
} else {
  console.warn('Could not match demoBlockRegex exactly, checking lines');
}

// 3. 抽取全局基准 URL 与 API 路由计算器
const apiHelpers = `
    // ==========================================================================
    // 🌐 云端版自适应 BaseURL 与 API 路由计算器 (Domain Adaptive Engine)
    // ==========================================================================
    function getEffectiveBaseUrl() {
      if (window.SUBFLOW_GLOBAL_DOMAIN && window.SUBFLOW_GLOBAL_DOMAIN.trim()) {
        return window.SUBFLOW_GLOBAL_DOMAIN.trim().replace(/\\/$/, '');
      }
      const preset = localStorage.getItem('subflow_cloud_domain');
      if (preset && preset.trim()) {
        return preset.trim().replace(/\\/$/, '');
      }
      if (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file://')) {
        return window.location.origin;
      }
      return 'http://127.0.0.1:25588';
    }

    function apiUrl(endpoint) {
      if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
      if (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file://')) {
        return endpoint;
      }
      return 'http://127.0.0.1:25588' + endpoint;
    }
`;

// 将 apiHelpers 注入到 script 顶部
html = html.replace("window.openSettingsModal = function() {", apiHelpers + "\n    window.openSettingsModal = function() {");

// 4. 将所有绝对路径 fetch 改为 apiUrl(...)
html = html.replace(/fetch\(['"]http:\/\/127\.0\.0\.1:25588(\/api\/[^'"]+)['"]\)/g, "fetch(apiUrl('$1'))");
html = html.replace(/fetch\(`http:\/\/127\.0\.0\.1:25588(\/api\/[^`]+)`\)/g, "fetch(apiUrl(`$1`))");

// 5. 将订阅生成链接改为依赖 getEffectiveBaseUrl()
html = html.replace(/`http:\/\/127\.0\.0\.1:25588\/sub\?/g, "`${getEffectiveBaseUrl()}/sub?");
html = html.replace(/'http:\/\/127\.0\.0\.1:25588\/sub\?/g, "`${getEffectiveBaseUrl()}/sub?");

fs.writeFileSync(file, html, 'utf8');
console.log('Updated index.html successfully. New size:', html.length);
