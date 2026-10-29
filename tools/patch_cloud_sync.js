const fs = require('fs');
let html = fs.readFileSync('web/index.html', 'utf8');

// 1. 在登录界面添加初始管理员账号密码提示
const submitBtnSnippet = `<button class="auth-submit-btn" id="btn-auth-submit" onclick="submitAuthForm()">
          <span id="auth-btn-text">立即登录</span>
        </button>`;

const submitBtnWithHint = `<button class="auth-submit-btn" id="btn-auth-submit" onclick="submitAuthForm()">
          <span id="auth-btn-text">立即登录</span>
        </button>

        <!-- 初始账号贴心提示 -->
        <div id="auth-default-hint" style="text-align:center; font-size:0.72rem; color:var(--text-muted); line-height:1.5; padding-top:4px;">
          <span>💡 系统默认初始管理员：<code style="color:#38bdf8; background:rgba(56,189,248,0.1); padding:2px 6px; border-radius:4px; font-weight:700;">admin</code> / <code style="color:#38bdf8; background:rgba(56,189,248,0.1); padding:2px 6px; border-radius:4px; font-weight:700;">admin123456</code></span><br>
          <span style="font-size:0.68rem; color:var(--text-muted); opacity:0.85;">登录后可随时在【个人中心】修改为您的专属私密密码</span>
        </div>`;

if (!html.includes('auth-default-hint')) {
  html = html.replace(submitBtnSnippet, submitBtnWithHint);
  console.log('✓ Added admin credentials hint to auth modal');
}

// 2. 升级 buildCurrentSubscriptionUrl 为完全公网自适应
const oldBuildUrl = `    function buildCurrentSubscriptionUrl() {
      const pin = (document.getElementById('chk-enable-pin')?.checked)
        ? (document.getElementById('security-pin-input')?.value.trim() || '')
        : '';

      if (currentSyncMode === 'tunnel') {
        if (!isTunnelRunning || !currentTunnelUrl) return '';
        let url = \`\${currentTunnelUrl}/sub?id=auto\`;
        if (pin) url += \`&pin=\${encodeURIComponent(pin)}\`;
        return url;
      } else {
        let url = \`http://\${currentLanIp}:25588/sub?id=auto\`;
        if (pin) url += \`&pin=\${encodeURIComponent(pin)}\`;
        return url;
      }
    }`;

const newBuildUrl = `    function buildCurrentSubscriptionUrl() {
      const pin = (document.getElementById('chk-enable-pin')?.checked)
        ? (document.getElementById('security-pin-input')?.value.trim() || '')
        : '';

      if (currentSyncMode === 'tunnel') {
        if (!isTunnelRunning || !currentTunnelUrl) return '';
        let url = \`\${currentTunnelUrl}/sub?id=auto\`;
        if (window.SUBFLOW_USER && window.SUBFLOW_USER.token) {
          url += \`&token=\${window.SUBFLOW_USER.token}\`;
        }
        if (pin) url += \`&pin=\${encodeURIComponent(pin)}\`;
        return url;
      } else {
        // 云端模式或公网访问时：优先使用绑定域名或当前公网 IP，绝不使用死局域网 IP
        const baseUrl = typeof getEffectiveBaseUrl === 'function' ? getEffectiveBaseUrl() : \`http://\${currentLanIp}:25588\`;
        let url = \`\${baseUrl}/sub?id=auto\`;
        if (window.SUBFLOW_USER && window.SUBFLOW_USER.token) {
          url += \`&token=\${window.SUBFLOW_USER.token}\`;
        }
        if (pin) url += \`&pin=\${encodeURIComponent(pin)}\`;
        return url;
      }
    }`;

if (html.includes(oldBuildUrl)) {
  html = html.replace(oldBuildUrl, newBuildUrl);
  console.log('✓ Upgraded buildCurrentSubscriptionUrl to cloud & public IP adaptive');
}

// 3. 升级 switchSyncMode 云端文案
const oldSwitchSync = `        if (badgeText) badgeText.innerText = '家庭/办公 WiFi 直连 · 100% 物理隔离零外网泄露';
        if (label) label.innerText = '局域网自适应短链 (已自动脱敏，不含机场密码 Token)';
        if (highlight) highlight.innerText = '手机与电脑连入同一 WiFi 即可全自动拉取自适应配置！';`;

const newSwitchSync = `        const isRemote = window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost' && window.location.protocol !== 'file:';
        if (isRemote || (window.SUBFLOW_BOUND_DOMAIN && window.SUBFLOW_BOUND_DOMAIN.trim())) {
          if (badgeText) badgeText.innerText = '🌐 云端公网直连 · 全球客户端即扫即连';
          if (label) label.innerText = '云端公网自适应直链 (自动适配小火箭 / Clash / Sing-box)';
          if (highlight) highlight.innerText = '手机小火箭 / Clash / v2ray 扫码即可跨公网全自动拉取云端订阅！';
          if (btnLan) btnLan.innerText = '🌐 云端公网直连 (推荐)';
        } else {
          if (badgeText) badgeText.innerText = '家庭/办公 WiFi 直连 · 100% 物理隔离零外网泄露';
          if (label) label.innerText = '局域网自适应短链 (已自动脱敏，不含机场密码 Token)';
          if (highlight) highlight.innerText = '手机与电脑连入同一 WiFi 即可全自动拉取自适应配置！';
          if (btnLan) btnLan.innerText = '🏠 WiFi 局域网直连 (第1名)';
        }`;

if (html.includes(oldSwitchSync)) {
  html = html.replace(oldSwitchSync, newSwitchSync);
  console.log('✓ Upgraded switchSyncMode for remote cloud mode');
}

fs.writeFileSync('web/index.html', html, 'utf8');
