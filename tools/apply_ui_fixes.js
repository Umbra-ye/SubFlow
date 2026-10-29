const fs = require('fs');

let html = fs.readFileSync('web/index.html', 'utf8');

// 1. 修复 platform-desc 和 platform-grid 的 CSS，防止文字溢出顶穿右边框
const oldPlatformCss = `    .platform-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
      gap: 10px;
    }

    .platform-card {
      position: relative;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px 12px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: transform var(--duration-fast) var(--ease-out),
                  border-color var(--duration-fast) var(--ease-out),
                  background var(--duration-fast) var(--ease-out);
    }

    .platform-card:hover {
      background: var(--bg-surface-hover);
      border-color: var(--border-hover);
      transform: translateY(-1px);
    }

    .platform-card:active {
      transform: scale(0.98);
    }

    .platform-card.selected {
      background: rgba(37, 99, 235, 0.12);
      border-color: var(--primary);
      box-shadow: 0 0 0 1px var(--primary), 0 4px 16px var(--primary-glow);
    }

    .platform-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .platform-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .platform-check {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1.5px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--duration-fast) var(--ease-out);
    }

    .platform-card.selected .platform-check {
      background: var(--primary);
      border-color: var(--primary);
    }

    .platform-card.selected .platform-check::after {
      content: "";
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: white;
    }

    .platform-desc {
      font-size: 0.72rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }`;

const newPlatformCss = `    .platform-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }

    .platform-card {
      position: relative;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px 14px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      box-sizing: border-box;
      transition: transform var(--duration-fast) var(--ease-out),
                  border-color var(--duration-fast) var(--ease-out),
                  background var(--duration-fast) var(--ease-out);
    }

    .platform-card:hover {
      background: var(--bg-surface-hover);
      border-color: var(--border-hover);
      transform: translateY(-1px);
    }

    .platform-card:active {
      transform: scale(0.98);
    }

    .platform-card.selected {
      background: rgba(37, 99, 235, 0.12);
      border-color: var(--primary);
      box-shadow: 0 0 0 1px var(--primary), 0 4px 16px var(--primary-glow);
    }

    .platform-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .platform-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .platform-check {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1.5px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all var(--duration-fast) var(--ease-out);
    }

    .platform-card.selected .platform-check {
      background: var(--primary);
      border-color: var(--primary);
    }

    .platform-card.selected .platform-check::after {
      content: "";
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: white;
    }

    .platform-desc {
      font-size: 0.72rem;
      color: var(--text-secondary);
      line-height: 1.45;
      overflow-wrap: anywhere;
      word-break: break-word;
      hyphens: auto;
    }`;

if (html.includes(oldPlatformCss)) {
  html = html.replace(oldPlatformCss, newPlatformCss);
  console.log('✓ Updated platform CSS with overflow-wrap and minmax(150px)');
} else {
  console.log('oldPlatformCss not matched verbatim, let us check regex.');
}

// 2. 优化卡片内文字，给斜杠前后加空格避免粘连
html = html.replace(
  '纯节点直通 · 支持小火箭/ClashX/OpenClash/Verge',
  '纯节点直通 · 支持小火箭 / Clash / OpenClash / Verge'
);
html = html.replace(
  '一链通天下 · 贴进 Clash/v2/小火箭通通秒获订阅',
  '一链通天下 · 贴进 Clash / v2 / 小火箭秒获订阅'
);
html = html.replace(
  '全协议 Base64 · 支持 v2rayNG/小火箭/PassWall',
  '全协议 Base64 · 支持 v2rayNG / 小火箭 / PassWall'
);
html = html.replace(
  'Proxy Provider · 纯 YAML · 支持 Stash/Surge/Loon',
  'Proxy Provider · 纯 YAML · 支持 Stash / Surge / Loon'
);
html = html.replace(
  '新一代内核 · 纯 JSON · 支持 NekoBox/全平台原生',
  '新一代内核 · 纯 JSON · 支持 NekoBox / 原生平台'
);
console.log('✓ Formatted card description strings');

// 3. 将“定时自动测活”升级为自定义时间下拉框
const oldAutoRefreshMarkup = `<label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:0.8rem; color:var(--text-secondary); user-select:none;" title="开启后每 15 分钟后台自动静默测活并刷新各订阅最新状态">
              <input type="checkbox" id="chk-auto-refresh" onchange="toggleAutoRefresh(this.checked)" style="cursor:pointer; accent-color: var(--primary);">
              <span id="label-auto-refresh">⏱️ 定时自动测活 (每15分钟)</span>
            </label>`;

const newAutoRefreshMarkup = `<div style="display:flex; align-items:center; gap:6px; background:var(--bg-base); padding:3px 8px; border-radius:8px; border:1px solid var(--border-subtle);">
              <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:0.78rem; color:var(--text-secondary); user-select:none;" title="开启后按设定的时间周期自动静默测活各订阅最新状态">
                <input type="checkbox" id="chk-auto-refresh" onchange="toggleAutoRefresh(this.checked)" style="cursor:pointer; accent-color: var(--primary);">
                <span id="label-auto-refresh" style="font-weight:600; color:var(--text-primary);">⏱️ 定时自动测活</span>
              </label>
              <select id="select-refresh-interval" onchange="changeAutoRefreshInterval(this.value)" style="background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); color:#38bdf8; border-radius:6px; font-size:0.72rem; font-weight:600; padding:2px 6px; cursor:pointer; outline:none; height:24px;">
                <option value="5">每 5 分钟</option>
                <option value="10">每 10 分钟</option>
                <option value="15" selected>每 15 分钟 (默认)</option>
                <option value="30">每 30 分钟</option>
                <option value="60">每 1 小时</option>
                <option value="120">每 2 小时</option>
                <option value="360">每 6 小时</option>
              </select>
            </div>`;

if (html.includes(oldAutoRefreshMarkup)) {
  html = html.replace(oldAutoRefreshMarkup, newAutoRefreshMarkup);
  console.log('✓ Replaced auto-refresh with custom interval select');
} else {
  console.log('oldAutoRefreshMarkup not found verbatim, checking regex...');
  const regAuto = /<label[\s\S]*?id="chk-auto-refresh"[\s\S]*?<\/label>/;
  if (regAuto.test(html)) {
    html = html.replace(regAuto, newAutoRefreshMarkup);
    console.log('✓ Replaced via regex!');
  }
}

// 4. 升级 toggleAutoRefresh 与新增 changeAutoRefreshInterval 函数
const oldToggleFunc = `    let autoRefreshTimer = null;
    function toggleAutoRefresh(enable) {
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
      }
      if (enable) {
        showSonnerToast('⏱️ 已开启定时自动测活：每 15 分钟后台自动更新最新状态！');
        pingAllHistory();
        autoRefreshTimer = setInterval(() => {
          pingAllHistory(true);
        }, 15 * 60 * 1000);
      } else {
        showSonnerToast('已关闭定时自动测活。');
      }
      try { localStorage.setItem('subflow_auto_refresh', enable ? 'true' : 'false'); } catch (e) {}
    }`;

const newToggleFunc = `    let autoRefreshTimer = null;
    function getAutoRefreshInterval() {
      try {
        const val = parseInt(localStorage.getItem('subflow_auto_refresh_mins'), 10);
        if (!isNaN(val) && val > 0) return val;
      } catch(e) {}
      return 15;
    }

    function changeAutoRefreshInterval(mins) {
      const intervalMins = parseInt(mins, 10) || 15;
      try { localStorage.setItem('subflow_auto_refresh_mins', intervalMins.toString()); } catch(e) {}
      
      const chk = document.getElementById('chk-auto-refresh');
      if (chk && chk.checked) {
        if (autoRefreshTimer) clearInterval(autoRefreshTimer);
        showSonnerToast('⏱️ 测活周期已更新为每 ' + intervalMins + ' 分钟自动更新！');
        autoRefreshTimer = setInterval(() => {
          pingAllHistory(true);
        }, intervalMins * 60 * 1000);
      } else {
        showSonnerToast('⏱️ 已设置测活周期为每 ' + intervalMins + ' 分钟 (勾选左侧开关后生效)');
      }
    }

    function toggleAutoRefresh(enable) {
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
      }
      const intervalMins = getAutoRefreshInterval();
      if (enable) {
        showSonnerToast('⏱️ 已开启定时自动测活：每 ' + intervalMins + ' 分钟后台自动更新最新状态！');
        pingAllHistory();
        autoRefreshTimer = setInterval(() => {
          pingAllHistory(true);
        }, intervalMins * 60 * 1000);
      } else {
        showSonnerToast('已关闭定时自动测活。');
      }
      try { localStorage.setItem('subflow_auto_refresh', enable ? 'true' : 'false'); } catch (e) {}
    }

    // 初始化测活周期下拉框记忆
    window.addEventListener('DOMContentLoaded', () => {
      const savedMins = getAutoRefreshInterval();
      const sel = document.getElementById('select-refresh-interval');
      if (sel) sel.value = savedMins.toString();
      const savedAuto = localStorage.getItem('subflow_auto_refresh') === 'true';
      const chk = document.getElementById('chk-auto-refresh');
      if (chk && savedAuto) {
        chk.checked = true;
        toggleAutoRefresh(true);
      }
    });`;

if (html.includes(oldToggleFunc)) {
  html = html.replace(oldToggleFunc, newToggleFunc);
  console.log('✓ Injected changeAutoRefreshInterval and dynamic timer logic');
} else {
  console.log('oldToggleFunc not matched verbatim, checking regex...');
  const regToggle = /let autoRefreshTimer = null;[\s\S]*?try \{ localStorage\.setItem\('subflow_auto_refresh', enable \? 'true' : 'false'\); \} catch \(e\) \{\}\s*\}/;
  if (regToggle.test(html)) {
    html = html.replace(regToggle, newToggleFunc);
    console.log('✓ Replaced toggleAutoRefresh via regex!');
  }
}

fs.writeFileSync('web/index.html', html, 'utf8');
console.log('All changes written to web/index.html');
