const fs = require('fs');

// 1. 更新 web/index.html 里的 settings-modal
let html = fs.readFileSync('web/index.html', 'utf8');

const oldSettingsContent = `        <!-- 托盘化开关项 -->
        <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-base); padding:12px 14px; border-radius:10px; border:1px solid var(--border-subtle);">
          <div style="display:flex; flex-direction:column; gap:3px;">
            <span style="font-size:0.85rem; font-weight:600; color:var(--text-primary);" id="label-tray-title">关闭主窗口时最小化到系统托盘</span>
            <span style="font-size:0.72rem; color:var(--text-muted);" id="label-tray-desc">开启后点击右上角 × 保持后台静默运行；关闭则直接退出程序</span>
          </div>
          <label style="display:inline-flex; align-items:center; cursor:pointer;">
            <input type="checkbox" id="chk-close-to-tray" onchange="onCloseToTrayChange(this.checked)" style="width:18px; height:18px; accent-color:var(--primary); cursor:pointer;">
          </label>
        </div>

        <!-- 本地服务与环境信息 -->
        <div style="display:flex; flex-direction:column; gap:8px; background:var(--bg-base); padding:12px 14px; border-radius:10px; border:1px solid var(--border-subtle);">
          <div style="display:flex; justify-content:space-between; font-size:0.78rem;">
            <span style="color:var(--text-muted);" id="label-port-title">本地网关端口</span>
            <span style="font-family:Consolas, monospace; color:#38bdf8;">127.0.0.1:25588</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.78rem;">
            <span style="color:var(--text-muted);" id="label-core-title">内核驱动</span>
            <span style="color:#10b981; font-weight:600;" id="label-core-val">SubFlow 官方内核 (内嵌守护)</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.78rem;">
            <span style="color:var(--text-muted);" id="label-ver-title">版本标识</span>
            <span style="color:var(--text-secondary);" id="label-ver-val">SubFlow v2.0 (Cloud Matrix)</span>
          </div>
        </div>

        <!-- 彻底退出整套程序按钮 -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding-top:4px;">
          <button class="secondary-btn" id="btn-exit-app" style="color:#ef4444; border-color:rgba(239,68,68,0.35); background:rgba(239,68,68,0.08); font-size:0.75rem; padding:6px 12px; font-weight:600; cursor:pointer;" onclick="exitEntireApp()">
            🛑 彻底退出程序 (关闭所有进程)
          </button>
          <span style="font-size:0.68rem; color:var(--text-muted);" id="label-exit-desc">不驻留托盘 · 清理一切后台</span>
        </div>`;

const newSettingsContent = `        <!-- 云端开机自启与守护状态 (云端 Web 模式默认开启，无需手工托盘) -->
        <div id="row-setting-cloud-boot" style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-base); padding:12px 14px; border-radius:10px; border:1px solid var(--border-subtle);">
          <div style="display:flex; flex-direction:column; gap:3px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:0.85rem; font-weight:600; color:var(--text-primary);">开机自动启动云端服务</span>
              <span class="detect-badge" style="background:rgba(16,185,129,0.15); color:#34d399; font-size:0.68rem; font-weight:700;">默认自启 · 7×24h 守护</span>
            </div>
            <span style="font-size:0.72rem; color:var(--text-muted);">系统服务守护 · 服务器重启或开机后全自动静默拉起，客户端永不失联</span>
          </div>
          <span style="font-size:1.2rem; color:#10b981;">🛡️</span>
        </div>

        <!-- 桌面端单机托盘化开关项 (仅在桌面单机模式出现) -->
        <div id="row-setting-tray" class="desktop-only-setting" style="display:none; align-items:center; justify-content:space-between; background:var(--bg-base); padding:12px 14px; border-radius:10px; border:1px solid var(--border-subtle);">
          <div style="display:flex; flex-direction:column; gap:3px;">
            <span style="font-size:0.85rem; font-weight:600; color:var(--text-primary);" id="label-tray-title">关闭主窗口时最小化到系统托盘</span>
            <span style="font-size:0.72rem; color:var(--text-muted);" id="label-tray-desc">开启后点击右上角 × 保持后台静默运行；关闭则直接退出程序</span>
          </div>
          <label style="display:inline-flex; align-items:center; cursor:pointer;">
            <input type="checkbox" id="chk-close-to-tray" onchange="onCloseToTrayChange(this.checked)" style="width:18px; height:18px; accent-color:var(--primary); cursor:pointer;">
          </label>
        </div>

        <!-- 服务与环境网络信息 -->
        <div style="display:flex; flex-direction:column; gap:8px; background:var(--bg-base); padding:12px 14px; border-radius:10px; border:1px solid var(--border-subtle);">
          <div style="display:flex; justify-content:space-between; font-size:0.78rem;">
            <span style="color:var(--text-muted);" id="label-port-title">服务连接地址</span>
            <span style="font-family:Consolas, monospace; color:#38bdf8;" id="settings-service-host">127.0.0.1:25588</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.78rem;">
            <span style="color:var(--text-muted);" id="label-core-title">服务运行模式</span>
            <span style="color:#10b981; font-weight:600;" id="label-core-val">SubFlow 多租户云端矩阵 (自适应守护)</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.78rem;">
            <span style="color:var(--text-muted);" id="label-ver-title">版本标识</span>
            <span style="color:var(--text-secondary);" id="label-ver-val">SubFlow v2.0 (Cloud Matrix)</span>
          </div>
        </div>

        <!-- 彻底退出整套程序按钮 (仅在桌面单机模式显示，云端 Web 彻底隐藏保护服务不停机) -->
        <div id="row-setting-exit" class="desktop-only-setting" style="display:none; align-items:center; justify-content:space-between; padding-top:4px;">
          <button class="secondary-btn" id="btn-exit-app" style="color:#ef4444; border-color:rgba(239,68,68,0.35); background:rgba(239,68,68,0.08); font-size:0.75rem; padding:6px 12px; font-weight:600; cursor:pointer;" onclick="exitEntireApp()">
            🛑 彻底退出程序 (关闭所有进程)
          </button>
          <span style="font-size:0.68rem; color:var(--text-muted);" id="label-exit-desc">单机模式 · 退出并清理后台</span>
        </div>`;

if (html.includes(oldSettingsContent)) {
  html = html.replace(oldSettingsContent, newSettingsContent);
  console.log('✓ Successfully upgraded settings modal in index.html');
} else {
  console.log('oldSettingsContent not matched verbatim, let us check.');
}
fs.writeFileSync('web/index.html', html, 'utf8');

// 2. 更新 web/subflow_v2.js 里的 openSettingsModal 逻辑
let js = fs.readFileSync('web/subflow_v2.js', 'utf8');

const oldOpenSettings = `window.openSettingsModal = function(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  modal.classList.add('active');
  modal.style.setProperty('display', 'flex', 'important');
  modal.style.setProperty('z-index', '2147483647', 'important');
  fetch(apiUrl('/api/settings'))
    .then(r => r.json())
    .then(data => {
      const chk = document.getElementById('chk-close-to-tray');
      if (chk && typeof data.closeToTray === 'boolean') {
        chk.checked = data.closeToTray;
      }
    })
    .catch(() => {});
};`;

const newOpenSettings = `window.openSettingsModal = function(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  modal.classList.add('active');
  modal.style.setProperty('display', 'flex', 'important');
  modal.style.setProperty('z-index', '2147483647', 'important');

  fetch(apiUrl('/api/settings'))
    .then(r => r.json())
    .then(data => {
      const isCloudMode = data.mode === 'cloud' || (window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost' && window.location.protocol !== 'file:');
      
      const rowCloudBoot = document.getElementById('row-setting-cloud-boot');
      const rowTray = document.getElementById('row-setting-tray');
      const rowExit = document.getElementById('row-setting-exit');
      const labelPort = document.getElementById('label-port-title');
      const hostVal = document.getElementById('settings-service-host');
      const coreVal = document.getElementById('label-core-val');

      if (isCloudMode) {
        // 云端模式：彻底隐藏托盘开关与退出程序按钮，展示开机自启动守护与公网地址
        if (rowCloudBoot) rowCloudBoot.style.display = 'flex';
        if (rowTray) rowTray.style.display = 'none';
        if (rowExit) rowExit.style.display = 'none';
        if (labelPort) labelPort.textContent = '🌐 云端公网地址';
        if (coreVal) coreVal.textContent = 'SubFlow 云端多租户守护 (自适应公网)';
        
        let displayHost = data.bound_domain || (data.public_ip ? (data.public_ip + ':' + data.port) : window.location.host);
        if (hostVal) hostVal.textContent = displayHost || window.location.host || '公网服务在线';
      } else {
        // 桌面单机模式：展示托盘与退出
        if (rowCloudBoot) rowCloudBoot.style.display = 'none';
        if (rowTray) rowTray.style.display = 'flex';
        if (rowExit) rowExit.style.display = 'flex';
        if (labelPort) labelPort.textContent = '本地网关端口';
        if (hostVal) hostVal.textContent = '127.0.0.1:' + (data.port || 25588);
        if (coreVal) coreVal.textContent = 'SubFlow 官方内核 (内嵌守护)';

        const chk = document.getElementById('chk-close-to-tray');
        if (chk && typeof data.closeToTray === 'boolean') {
          chk.checked = data.closeToTray;
        }
      }
    })
    .catch(() => {});
};`;

if (js.includes(oldOpenSettings)) {
  js = js.replace(oldOpenSettings, newOpenSettings);
  console.log('✓ Successfully upgraded openSettingsModal in subflow_v2.js');
} else {
  console.log('oldOpenSettings not matched verbatim in subflow_v2.js');
}
fs.writeFileSync('web/subflow_v2.js', js, 'utf8');
