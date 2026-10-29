const fs = require('fs');

let html = fs.readFileSync('web/index.html', 'utf8');

// 1. 将 select 下拉框替换为可自由输入的数字输入框
const oldIntervalMarkupRegex = /<div style="display:flex; align-items:center; gap:6px; background:var\(--bg-base\);[\s\S]*?<\/div>/;

const newCustomMinutesMarkup = `<div style="display:flex; align-items:center; gap:8px; background:var(--bg-base); padding:3px 10px; border-radius:8px; border:1px solid var(--border-subtle);">
              <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:0.78rem; color:var(--text-secondary); user-select:none;" title="开启后按设定的时间周期自动静默测活">
                <input type="checkbox" id="chk-auto-refresh" onchange="toggleAutoRefresh(this.checked)" style="cursor:pointer; accent-color: var(--primary);">
                <span id="label-auto-refresh" style="font-weight:600; color:var(--text-primary);">⏱️ 定时自动测活</span>
              </label>
              <div style="display:inline-flex; align-items:center; gap:4px; font-size:0.74rem; color:var(--text-muted);">
                <span>每</span>
                <input type="number" id="input-refresh-interval" min="1" max="1440" value="15" onchange="changeAutoRefreshMinutes(this.value)" oninput="if(this.value<1)this.value=1" style="width:52px; height:24px; text-align:center; background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:6px; color:#38bdf8; font-size:0.75rem; font-weight:700; font-family:var(--font-mono); outline:none; transition:border-color 0.15s;" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border-subtle)'">
                <span>分钟</span>
              </div>
            </div>`;

if (oldIntervalMarkupRegex.test(html)) {
  html = html.replace(oldIntervalMarkupRegex, newCustomMinutesMarkup);
  console.log('✓ Replaced with custom minutes numeric input markup');
} else {
  console.log('oldIntervalMarkupRegex did not match, let us inspect.');
}

// 2. 更新对应 JS 函数为 changeAutoRefreshMinutes
const oldTimerJsRegex = /let autoRefreshTimer = null;[\s\S]*?chk\.checked = true;\s*toggleAutoRefresh\(true\);\s*\}\s*\}\);/;

const newTimerJs = `let autoRefreshTimer = null;
    function getAutoRefreshInterval() {
      try {
        const val = parseInt(localStorage.getItem('subflow_auto_refresh_mins'), 10);
        if (!isNaN(val) && val > 0) return val;
      } catch(e) {}
      return 15;
    }

    function changeAutoRefreshMinutes(mins) {
      let intervalMins = parseInt(mins, 10);
      if (isNaN(intervalMins) || intervalMins < 1) intervalMins = 1;
      const input = document.getElementById('input-refresh-interval');
      if (input) input.value = intervalMins;

      try { localStorage.setItem('subflow_auto_refresh_mins', intervalMins.toString()); } catch(e) {}
      
      const chk = document.getElementById('chk-auto-refresh');
      if (chk && chk.checked) {
        if (autoRefreshTimer) clearInterval(autoRefreshTimer);
        showSonnerToast('⏱️ 自动测活周期已更新为：每 ' + intervalMins + ' 分钟运行一次！');
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

    // 初始化测活周期输入框记忆
    window.addEventListener('DOMContentLoaded', () => {
      const savedMins = getAutoRefreshInterval();
      const input = document.getElementById('input-refresh-interval');
      if (input) input.value = savedMins.toString();
      const savedAuto = localStorage.getItem('subflow_auto_refresh') === 'true';
      const chk = document.getElementById('chk-auto-refresh');
      if (chk && savedAuto) {
        chk.checked = true;
        toggleAutoRefresh(true);
      }
    });`;

if (oldTimerJsRegex.test(html)) {
  html = html.replace(oldTimerJsRegex, newTimerJs);
  console.log('✓ Replaced JS timer logic with changeAutoRefreshMinutes');
} else {
  console.log('oldTimerJsRegex did not match, let us inspect.');
}

fs.writeFileSync('web/index.html', html, 'utf8');
