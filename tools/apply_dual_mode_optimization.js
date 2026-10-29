const fs = require('fs');

let html = fs.readFileSync('web/index.html', 'utf8');

// 1. 注入双端差异化 CSS
const dualCss = `
    /* ==========================================================================
       双端智能差异化分离样式 (Cloud Edition vs Desktop Local Edition)
       ========================================================================== */
    body.env-cloud .local-only {
      display: none !important;
    }
    body.env-local .cloud-only {
      display: none !important;
    }
`;

if (!html.includes('body.env-cloud .local-only')) {
  html = html.replace('</style>', `${dualCss}\n  </style>`);
  console.log('✓ Injected dual-mode CSS');
}

// 2. 为扫码弹窗中的本地穿透工具栏标记 .local-only
html = html.replace(
  '<div style="width: 100%; display: flex; background: var(--bg-base); padding: 3px; border-radius: 8px; border: 1px solid var(--border-subtle);">',
  '<div id="qr-segmenter-box" class="local-only" style="width: 100%; display: flex; background: var(--bg-base); padding: 3px; border-radius: 8px; border: 1px solid var(--border-subtle);">'
);

html = html.replace(
  '<div id="tunnel-control-row" style="display:none; width:100%; flex-direction:column; align-items:center; gap:8px;">',
  '<div id="tunnel-control-row" class="local-only" style="display:none; width:100%; flex-direction:column; align-items:center; gap:8px;">'
);

// 3. 在扫码弹窗中注入主流客户端 Deep Link 一键唤醒组件
const deepLinkSnippet = `
        <!-- 📱 全平台客户端一键唤醒快捷栏 (iOS / Android / Mac / Windows) -->
        <div id="qr-client-schemes" style="width:100%; display:flex; flex-direction:column; gap:6px; background:var(--bg-base); padding:10px; border-radius:10px; border:1px solid var(--border-subtle);">
          <div style="font-size:0.72rem; font-weight:700; color:var(--text-secondary); display:flex; align-items:center; justify-content:space-between;">
            <span>⚡ 一键唤醒本机客户端导入</span>
            <span style="font-size:0.65rem; color:var(--text-muted);">手机/电脑均适用</span>
          </div>
          <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:6px;">
            <button class="secondary-btn" style="padding:6px 0; font-size:0.72rem; color:#38bdf8; font-weight:700;" onclick="launchClientScheme('clash')">⚡ Clash</button>
            <button class="secondary-btn" style="padding:6px 0; font-size:0.72rem; color:#34d399; font-weight:700;" onclick="launchClientScheme('shadowrocket')">🍏 小火箭</button>
            <button class="secondary-btn" style="padding:6px 0; font-size:0.72rem; color:#a78bfa; font-weight:700;" onclick="launchClientScheme('singbox')">📦 Sing-box</button>
            <button class="secondary-btn" style="padding:6px 0; font-size:0.72rem; color:#fb923c; font-weight:700;" onclick="launchClientScheme('surge')">🌊 Surge</button>
          </div>
        </div>
`;

if (!html.includes('qr-client-schemes')) {
  html = html.replace(
    '<!-- 短链展示与复制 (Token 脱敏，绝不向公网暴露机场真实 Token) -->',
    `${deepLinkSnippet}\n        <!-- 短链展示与复制 (Token 脱敏，绝不向公网暴露机场真实 Token) -->`
  );
  console.log('✓ Injected Deep Link client schemes to qr-modal');
}

fs.writeFileSync('web/index.html', html, 'utf8');

// 4. 更新 web/subflow_v2.js 注入 launchClientScheme 与双端模式自动打标
let js = fs.readFileSync('web/subflow_v2.js', 'utf8');

const clientSchemeFuncs = `
// ==========================================================================
// 🚀 全平台客户端一键唤醒引擎 (URL Schemes: Shadowrocket / Clash / Sing-box / Surge)
// ==========================================================================
function launchClientScheme(type) {
  let subUrl = typeof buildCurrentSubscriptionUrl === 'function' ? buildCurrentSubscriptionUrl() : '';
  if (!subUrl) {
    const resInput = document.getElementById('result-link');
    if (resInput && resInput.value) subUrl = resInput.value.trim();
  }
  if (!subUrl) {
    showSonnerToast('⚠️ 请先生成或选择要导入的订阅链接！');
    return;
  }

  const notify = typeof showSonnerToast === 'function' ? showSonnerToast : alert;
  let scheme = '';

  if (type === 'clash') {
    // 强制适配 clash 格式
    let clashUrl = subUrl;
    if (!clashUrl.includes('target=clash')) {
      clashUrl = clashUrl.replace(/target=[^&]+/, 'target=clash');
    }
    scheme = \`clash://install-config?url=\${encodeURIComponent(clashUrl)}&name=SubFlow\`;
    notify('⚡ 正在唤醒 Clash / FlClash / Clash Verge 客户端...');
  } else if (type === 'shadowrocket') {
    try {
      const b64 = btoa(unescape(encodeURIComponent(subUrl)));
      scheme = \`sub://\${b64}\`;
    } catch(e) {
      scheme = \`sub://\${btoa(subUrl)}\`;
    }
    notify('🍏 正在唤醒 iOS 小火箭 (Shadowrocket)...');
  } else if (type === 'singbox') {
    let sbUrl = subUrl;
    if (!sbUrl.includes('target=singbox')) {
      sbUrl = sbUrl.replace(/target=[^&]+/, 'target=singbox');
    }
    scheme = \`sing-box://import-remote-profile?url=\${encodeURIComponent(sbUrl)}#SubFlow\`;
    notify('📦 正在唤醒 Sing-box 客户端...');
  } else if (type === 'surge') {
    let surgeUrl = subUrl;
    if (!surgeUrl.includes('target=surge')) {
      surgeUrl = surgeUrl.replace(/target=[^&]+/, 'target=surge&ver=4');
    }
    scheme = \`surge:///install-config?url=\${encodeURIComponent(surgeUrl)}\`;
    notify('🌊 正在唤醒 Surge 客户端...');
  }

  if (scheme) {
    window.location.href = scheme;
  }
}
`;

if (!js.includes('function launchClientScheme')) {
  js += '\n' + clientSchemeFuncs;
  console.log('✓ Injected launchClientScheme into subflow_v2.js');
}

// 5. 增强 checkAuthStatus 中的双端模式标记
const oldAuthStatusPattern = `    const res = await fetch(apiUrl('/api/auth/me'));`;
const newAuthStatusPattern = `    const isRemote = window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost' && window.location.protocol !== 'file:';
    if (isRemote) {
      document.body.classList.add('env-cloud');
      document.body.classList.remove('env-local');
    } else {
      document.body.classList.add('env-local');
      document.body.classList.remove('env-cloud');
    }

    const res = await fetch(apiUrl('/api/auth/me'));`;

if (!js.includes('document.body.classList.add(\'env-cloud\')')) {
  js = js.replace(oldAuthStatusPattern, newAuthStatusPattern);
  console.log('✓ Injected env-cloud/env-local body taggers to checkAuthStatus');
}

fs.writeFileSync('web/subflow_v2.js', js, 'utf8');
console.log('Dual-mode optimization completed!');
