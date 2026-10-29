const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'web', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. =========================================================================
// CSS 样式注入 (极简、高质感 Emil Kowalski & Linear 2026 Liquid Glass)
// =========================================================================
const authStyles = `
    /* ==========================================================================
       V2.0 现代多租户鉴权、智能人机验证与管理后台 Liquid Glass 样式
       ========================================================================== */
    .auth-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-primary);
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      backdrop-filter: var(--glass-blur);
      transition: all var(--duration-normal) var(--ease-spring);
      user-select: none;
    }
    .auth-pill-btn:hover {
      background: var(--bg-surface-hover);
      border-color: var(--glass-border-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 14px var(--primary-glow);
    }
    .auth-pill-btn:active {
      transform: scale(0.97);
    }
    .auth-pill-btn.admin-badge {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.35);
      color: #34d399;
    }
    .auth-pill-btn.admin-badge:hover {
      background: rgba(16, 185, 129, 0.22);
      border-color: rgba(16, 185, 129, 0.55);
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
    }
    .user-avatar-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      display: inline-block;
    }

    /* 模态弹窗深度毛玻璃与弹簧动画 */
    .modal-v2-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(3, 7, 18, 0.76);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      z-index: 2147483640;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .modal-v2-card {
      width: 100%;
      max-width: 440px;
      background: rgba(13, 18, 31, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-xl);
      padding: 26px;
      box-shadow: 0 30px 70px -15px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.18);
      display: flex;
      flex-direction: column;
      gap: 18px;
      position: relative;
      animation: modalSpringUp 0.26s cubic-bezier(0.16, 1, 0.3, 1.15);
      color: var(--text-primary);
    }
    [data-theme="light"] .modal-v2-card {
      background: rgba(255, 255, 255, 0.98);
      border: 1px solid rgba(15, 23, 42, 0.12);
      box-shadow: 0 25px 60px -10px rgba(15, 23, 42, 0.15), inset 0 1px 0 rgba(255, 255, 255, 1);
      color: var(--text-primary);
    }
    @keyframes modalSpringUp {
      from { transform: scale(0.94) translateY(12px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }

    /* 登录/注册切换分段器 */
    .auth-tab-group {
      display: flex;
      background: var(--bg-base);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 4px;
      position: relative;
      gap: 4px;
    }
    .auth-tab-btn {
      flex: 1;
      padding: 8px 0;
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 0.84rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.2s var(--ease-spring);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .auth-tab-btn.active {
      background: var(--primary);
      color: #ffffff;
      box-shadow: 0 2px 8px var(--primary-glow);
    }

    /* 输入框组件群 */
    .auth-input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .auth-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .auth-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .auth-input {
      width: 100%;
      height: 42px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 0 40px 0 12px;
      font-size: 0.86rem;
      color: var(--text-primary);
      font-family: inherit;
      transition: all 0.2s ease;
      outline: none;
    }
    .auth-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
      background: rgba(255, 255, 255, 0.07);
    }
    [data-theme="light"] .auth-input {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    [data-theme="light"] .auth-input:focus {
      background: #ffffff;
      border-color: #2563eb;
    }
    .auth-eye-btn {
      position: absolute;
      right: 10px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s;
    }
    .auth-eye-btn:hover {
      color: var(--text-primary);
    }

    /* 仿 Cloudflare Turnstile 质感“智能真人核验”组件 */
    .smart-challenge-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
    }
    .smart-challenge-card:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.22);
    }
    [data-theme="light"] .smart-challenge-card {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    [data-theme="light"] .smart-challenge-card:hover {
      background: #e2e8f0;
    }
    .challenge-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .challenge-box {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 2px solid rgba(255, 255, 255, 0.28);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.25s var(--ease-spring);
      position: relative;
      background: rgba(255, 255, 255, 0.02);
    }
    [data-theme="light"] .challenge-box {
      border-color: #94a3b8;
    }
    .challenge-box.checking {
      border-color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
    }
    .challenge-box.verified {
      background: #10b981;
      border-color: #10b981;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.45);
      transform: scale(1.05);
    }
    .challenge-spinner-ring {
      width: 16px;
      height: 16px;
      border: 2.5px solid rgba(59, 130, 246, 0.3);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spinRing 0.8s linear infinite;
      display: none;
    }
    @keyframes spinRing {
      to { transform: rotate(360deg); }
    }
    .challenge-check-svg {
      width: 18px;
      height: 18px;
      stroke: #ffffff;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
      display: none;
      animation: checkPop 0.25s var(--ease-spring);
    }
    @keyframes checkPop {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .challenge-texts {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .challenge-title-txt {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .challenge-sub-txt {
      font-size: 0.68rem;
      color: var(--text-muted);
    }
    .challenge-brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    /* 提交动作大按钮 */
    .auth-submit-btn {
      width: 100%;
      height: 44px;
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      border: none;
      border-radius: var(--radius-md);
      font-size: 0.88rem;
      font-weight: 700;
      color: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 6px 20px var(--primary-glow);
      transition: all var(--duration-normal) var(--ease-spring);
    }
    .auth-submit-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.5);
    }
    .auth-submit-btn:active {
      transform: scale(0.98);
    }

    /* 错误提示条 */
    .auth-alert {
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.78rem;
      display: none;
      animation: alertShake 0.3s ease;
    }
    .auth-alert.error {
      background: rgba(244, 63, 94, 0.12);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: #fda4af;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .auth-alert.success {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #6ee7b7;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    @keyframes alertShake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-4px); }
      40%, 80% { transform: translateX(4px); }
    }

    /* 管理后台表格 */
    .admin-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
    }
    .admin-table th {
      text-align: left;
      padding: 10px 12px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-subtle);
      font-weight: 600;
    }
    .admin-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-primary);
    }
    .admin-table tr:hover td {
      background: rgba(255, 255, 255, 0.03);
    }
`;

// 插入 CSS 样式
if (!html.includes('auth-pill-btn')) {
  html = html.replace('</style>', `${authStyles}\n  </style>`);
  console.log('✓ Injected Auth & Admin CSS');
}

// 2. =========================================================================
// 顶部 Header 控件注入 (登录/用户信息/管理后台按钮)
// =========================================================================
const headerAuthSnippet = `
        <!-- 🔑 登录 / 注册 / 用户中心 / 管理后台 导航胶囊 -->
        <div id="header-auth-zone" style="display:flex; align-items:center; gap:8px;">
          <button class="auth-pill-btn" id="btn-header-login" onclick="openAuthModal('login')" title="登录或注册 SubFlow 云端账号">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            <span id="header-auth-text">登录 / 注册</span>
          </button>
          <button class="auth-pill-btn" id="btn-header-user" onclick="openUserModal()" style="display:none;" title="查看用户中心与修改密码">
            <span class="user-avatar-dot"></span>
            <span id="header-username">用户</span>
          </button>
          <button class="auth-pill-btn admin-badge" id="btn-header-admin" onclick="openAdminModal()" style="display:none;" title="SubFlow 云端管理后台">
            🛡️ <span>管理后台</span>
          </button>
        </div>
`;

if (!html.includes('header-auth-zone')) {
  html = html.replace(
    '<!-- ⚙️ 偏好设置按钮 -->',
    `${headerAuthSnippet}\n        <!-- ⚙️ 偏好设置按钮 -->`
  );
  console.log('✓ Injected Header Auth Zone');
}

// 3. =========================================================================
// 弹窗结构注入 (Auth Modal, User Profile Modal, Admin Modal)
// =========================================================================
const modalsSnippet = `
  <!-- ==========================================================================
       🔑 登录 / 注册高颜值弹窗 (Liquid Glass & Smart Human Challenge)
       ========================================================================== -->
  <div class="modal-v2-overlay" id="auth-modal" style="display:none;" onclick="if(event.target===this)closeAuthModal()">
    <div class="modal-v2-card">
      <!-- 弹窗顶栏 -->
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="width:28px; height:28px; border-radius:8px; background:linear-gradient(135deg,#2563eb,#10b981); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold; font-size:0.9rem;">S</div>
          <span style="font-weight:700; font-size:1rem; color:var(--text-primary);" id="auth-modal-title">SubFlow 账户登录</span>
        </div>
        <button class="secondary-btn" style="padding:4px 10px; font-size:0.75rem;" onclick="closeAuthModal()">✕</button>
      </div>

      <!-- 登录 / 注册分段切换 -->
      <div class="auth-tab-group">
        <button class="auth-tab-btn active" id="auth-tab-login" onclick="switchAuthTab('login')">
          <span>🔑 账号登录</span>
        </button>
        <button class="auth-tab-btn" id="auth-tab-register" onclick="switchAuthTab('register')">
          <span>✨ 快速注册</span>
        </button>
      </div>

      <!-- 提示消息条 -->
      <div class="auth-alert" id="auth-alert-box">
        <span id="auth-alert-icon">⚠️</span>
        <span id="auth-alert-msg"></span>
      </div>

      <!-- 表单字段 -->
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div class="auth-input-group">
          <label class="auth-label" for="auth-username">
            <span>用户名 / 账号</span>
            <span style="font-size:0.68rem; color:var(--text-muted);">英文字母或数字</span>
          </label>
          <div class="auth-input-wrap">
            <input type="text" class="auth-input" id="auth-username" placeholder="请输入用户名 (如: admin)" autocomplete="username" style="padding-right:12px;">
          </div>
        </div>

        <div class="auth-input-group">
          <label class="auth-label" for="auth-password">
            <span>登录密码</span>
            <span style="font-size:0.68rem; color:var(--text-muted);">PBKDF2 10万次加盐加密</span>
          </label>
          <div class="auth-input-wrap">
            <input type="password" class="auth-input" id="auth-password" placeholder="请输入密码" autocomplete="current-password">
            <button type="button" class="auth-eye-btn" onclick="togglePasswordVisibility('auth-password', this)" title="显示/隐藏密码">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>
        </div>

        <div class="auth-input-group" id="group-confirm-pwd" style="display:none;">
          <label class="auth-label" for="auth-confirm-password">
            <span>确认新密码</span>
            <span style="font-size:0.68rem; color:var(--text-muted);">再次输入保持一致</span>
          </label>
          <div class="auth-input-wrap">
            <input type="password" class="auth-input" id="auth-confirm-password" placeholder="请再次输入相同密码" autocomplete="new-password">
            <button type="button" class="auth-eye-btn" onclick="togglePasswordVisibility('auth-confirm-password', this)" title="显示/隐藏密码">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>
        </div>

        <!-- 🛡️ 智能真人核验 (Smart Human Challenge) 卡片 -->
        <div id="smart-challenge-wrap">
          <div class="smart-challenge-card" id="smart-challenge-box" onclick="triggerHumanChallenge()">
            <div class="challenge-left">
              <div class="challenge-box" id="challenge-box">
                <div class="challenge-spinner-ring" id="challenge-spinner"></div>
                <svg class="challenge-check-svg" id="challenge-check-svg" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div class="challenge-texts">
                <span class="challenge-title-txt" id="challenge-status-title">进行真人身份核验</span>
                <span class="challenge-sub-txt" id="challenge-status-sub">点击完成防爆破交互检验</span>
              </div>
            </div>
            <div class="challenge-brand">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span style="font-size:0.62rem; color:var(--text-muted); font-family:var(--font-mono);">SubFlow Shield</span>
            </div>
          </div>
        </div>

        <!-- Cloudflare 官方 Turnstile 挂载容器 (当开启官方模式时生效) -->
        <div id="turnstile-container" style="display:none; justify-content:center; margin:4px 0;"></div>

        <!-- 提交大按钮 -->
        <button class="auth-submit-btn" id="btn-auth-submit" onclick="submitAuthForm()">
          <span id="auth-btn-text">立即登录</span>
        </button>
      </div>
    </div>
  </div>

  <!-- ==========================================================================
       👤 用户个人中心与密码修改弹窗 (User Profile & Change Password)
       ========================================================================== -->
  <div class="modal-v2-overlay" id="user-profile-modal" style="display:none;" onclick="if(event.target===this)closeUserModal()">
    <div class="modal-v2-card" style="max-width:480px;">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.2rem;">👤</span>
          <span style="font-weight:700; font-size:1rem; color:var(--text-primary);">用户个人中心</span>
        </div>
        <button class="secondary-btn" style="padding:4px 10px; font-size:0.75rem;" onclick="closeUserModal()">✕</button>
      </div>

      <!-- 用户信息卡片 -->
      <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-base); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:12px 16px;">
        <div style="display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1rem; font-weight:700;" id="profile-display-name">User</span>
            <span class="detect-badge" id="profile-role-badge">用户</span>
          </div>
          <span style="font-size:0.72rem; color:var(--text-muted);">SubFlow 授权租户 · 订阅节点与账号安全隔离</span>
        </div>
        <button class="secondary-btn" style="color:#ef4444; border-color:rgba(239,68,68,0.3); font-size:0.75rem; padding:5px 12px;" onclick="doLogout()">🚪 退出登录</button>
      </div>

      <!-- 专属订阅 Token 提取区 -->
      <div style="display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:600; color:var(--text-secondary);">
          <span>🔑 专属免密拉取 Token (在客户端直接导入)</span>
          <button class="secondary-btn" style="padding:2px 8px; font-size:0.7rem;" onclick="copyUserToken()">📋 复制 Token</button>
        </div>
        <input type="text" class="auth-input" id="profile-token-box" readonly style="font-family:var(--font-mono); font-size:0.78rem; background:var(--bg-base); color:#38bdf8; cursor:pointer;" onclick="this.select()">
      </div>

      <!-- 🔐 自助修改密码面板 -->
      <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:16px; display:flex; flex-direction:column; gap:12px;">
        <div style="font-size:0.84rem; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
          <span>🔐 修改我的登录密码</span>
        </div>

        <div class="auth-alert" id="pwd-alert-box">
          <span id="pwd-alert-icon">⚠️</span>
          <span id="pwd-alert-msg"></span>
        </div>

        <div class="auth-input-group">
          <label class="auth-label" for="pwd-old">原密码</label>
          <div class="auth-input-wrap">
            <input type="password" class="auth-input" id="pwd-old" placeholder="输入当前使用的旧密码">
            <button type="button" class="auth-eye-btn" onclick="togglePasswordVisibility('pwd-old', this)">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>
        </div>

        <div class="auth-input-group">
          <label class="auth-label" for="pwd-new">新密码</label>
          <div class="auth-input-wrap">
            <input type="password" class="auth-input" id="pwd-new" placeholder="输入新密码 (至少 6 位)">
            <button type="button" class="auth-eye-btn" onclick="togglePasswordVisibility('pwd-new', this)">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>
        </div>

        <div class="auth-input-group">
          <label class="auth-label" for="pwd-confirm">再次输入新密码</label>
          <div class="auth-input-wrap">
            <input type="password" class="auth-input" id="pwd-confirm" placeholder="再次输入新密码确认">
            <button type="button" class="auth-eye-btn" onclick="togglePasswordVisibility('pwd-confirm', this)">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>
        </div>

        <button class="primary-btn" style="padding:8px 0; font-size:0.82rem; margin-top:4px;" onclick="submitChangePassword()">
          <span>✓ 确认修改密码</span>
        </button>
      </div>
    </div>
  </div>

  <!-- ==========================================================================
       🛡️ 云端多租户管理后台 (Admin Console: 域名绑定 / 人机防爆破 / 用户密码重置)
       ========================================================================== -->
  <div class="modal-v2-overlay" id="admin-modal" style="display:none;" onclick="if(event.target===this)closeAdminModal()">
    <div class="modal-v2-card" style="max-width:680px; max-height:88vh; overflow-y:auto;">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.2rem;">🛡️</span>
          <span style="font-weight:700; font-size:1rem; color:var(--text-primary);">SubFlow 云端管理后台</span>
          <span class="detect-badge" style="background:rgba(16,185,129,0.15); color:#34d399; border-color:rgba(16,185,129,0.3);">System Admin</span>
        </div>
        <button class="secondary-btn" style="padding:4px 10px; font-size:0.75rem;" onclick="closeAdminModal()">✕</button>
      </div>

      <!-- 管理后台分段 Tab -->
      <div class="auth-tab-group">
        <button class="auth-tab-btn active" id="admin-tab-domain" onclick="switchAdminTab('domain')">
          <span>🌐 域名绑定与网络</span>
        </button>
        <button class="auth-tab-btn" id="admin-tab-security" onclick="switchAdminTab('security')">
          <span>🛡️ 防爆破人机核验</span>
        </button>
        <button class="auth-tab-btn" id="admin-tab-users" onclick="switchAdminTab('users')">
          <span>👥 用户管理 (零知识)</span>
        </button>
      </div>

      <!-- 面板 1: 域名绑定与网络 -->
      <div id="admin-panel-domain" style="display:flex; flex-direction:column; gap:14px;">
        <div style="background:var(--bg-base); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:14px; display:flex; flex-direction:column; gap:10px;">
          <div style="font-size:0.84rem; font-weight:700; color:var(--text-primary);">🌐 专属公网域名绑定 (Cloud Custom Domain)</div>
          <div style="font-size:0.74rem; color:var(--text-muted); line-height:1.5;">
            绑定后，全系统所有生成的 Clash / Shadowrocket / Sing-box 订阅链接、访客短链与二维码，将全部自动以此域名对外输出，终身免改！留空则默认自适应公网 IP 访问。
          </div>
          <div class="auth-input-group">
            <label class="auth-label">绑定域名 (例: https://sub.yourdomain.com 或 http://IP:25588)</label>
            <input type="text" class="auth-input" id="admin-bound-domain" placeholder="https://sub.yourdomain.com" style="font-family:var(--font-mono); font-size:0.82rem; padding-right:12px;">
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; padding-top:4px;">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.78rem;">
              <input type="checkbox" id="admin-force-redirect" style="accent-color:var(--primary); width:16px; height:16px;">
              <span>非该域名访问时强制重定向到该域名</span>
            </label>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.78rem;">
              <input type="checkbox" id="admin-allow-register" checked style="accent-color:var(--primary); width:16px; height:16px;">
              <span>允许公开注册新用户</span>
            </label>
          </div>
          <div style="display:flex; justify-content:flex-end;">
            <button class="primary-btn" style="padding:6px 16px; font-size:0.8rem;" onclick="saveAdminDomainSettings()">保存网络与域名配置</button>
          </div>
        </div>
      </div>

      <!-- 面板 2: 防爆破人机核验模式 -->
      <div id="admin-panel-security" style="display:none; flex-direction:column; gap:14px;">
        <div style="background:var(--bg-base); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:14px; display:flex; flex-direction:column; gap:12px;">
          <div style="font-size:0.84rem; font-weight:700; color:var(--text-primary);">🛡️ 登录与注册人机核验模式 (Anti-Bot Brute Force Shield)</div>
          <div style="font-size:0.74rem; color:var(--text-muted); line-height:1.5;">
            有效阻断全网黑客脚本、自动化撞库与字典爆破攻击。
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            <label style="display:flex; align-items:flex-start; gap:10px; padding:10px; border-radius:8px; border:1px solid var(--border-subtle); background:rgba(255,255,255,0.02); cursor:pointer;">
              <input type="radio" name="captcha-mode-radio" value="internal" id="mode-internal" checked style="accent-color:var(--primary); margin-top:3px;">
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:0.82rem; font-weight:700; color:var(--text-primary);">内置智能人机核验 (Smart Challenge) · 推荐</span>
                <span style="font-size:0.7rem; color:var(--text-muted);">零三方依赖，极快毫秒响应，基于微动力学与即焚通行证，100% 拦截无头爬虫与黑客脚本。</span>
              </div>
            </label>

            <label style="display:flex; align-items:flex-start; gap:10px; padding:10px; border-radius:8px; border:1px solid var(--border-subtle); background:rgba(255,255,255,0.02); cursor:pointer;">
              <input type="radio" name="captcha-mode-radio" value="turnstile" id="mode-turnstile" style="accent-color:var(--primary); margin-top:3px;">
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:0.82rem; font-weight:700; color:var(--text-primary);">Cloudflare Turnstile 官方托管</span>
                <span style="font-size:0.7rem; color:var(--text-muted);">使用 Cloudflare 官方风控引擎，需在下方配置 SiteKey 与 SecretKey。</span>
              </div>
            </label>

            <label style="display:flex; align-items:flex-start; gap:10px; padding:10px; border-radius:8px; border:1px solid var(--border-subtle); background:rgba(255,255,255,0.02); cursor:pointer;">
              <input type="radio" name="captcha-mode-radio" value="off" id="mode-off" style="accent-color:var(--primary); margin-top:3px;">
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:0.82rem; font-weight:700; color:#f43f5e;">关闭人机验证 (不推荐)</span>
                <span style="font-size:0.7rem; color:var(--text-muted);">仅建议内网完全物理隔离环境使用，公网开放可能遭受暴力字典爆破。</span>
              </div>
            </label>
          </div>

          <!-- Turnstile 密钥输入框 (仅在选择 turnstile 时显示) -->
          <div id="turnstile-config-box" style="display:none; flex-direction:column; gap:8px; padding-top:6px;">
            <div class="auth-input-group">
              <label class="auth-label">Turnstile Site Key</label>
              <input type="text" class="auth-input" id="admin-turnstile-sitekey" placeholder="0x4AAAAAA..." style="font-family:var(--font-mono); font-size:0.78rem; padding-right:12px;">
            </div>
            <div class="auth-input-group">
              <label class="auth-label">Turnstile Secret Key</label>
              <input type="password" class="auth-input" id="admin-turnstile-secret" placeholder="0x4AAAAAA..." style="font-family:var(--font-mono); font-size:0.78rem; padding-right:12px;">
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end;">
            <button class="primary-btn" style="padding:6px 16px; font-size:0.8rem;" onclick="saveAdminSecuritySettings()">保存防爆破设置</button>
          </div>
        </div>
      </div>

      <!-- 面板 3: 用户管理与密码重设 (零知识数据安全) -->
      <div id="admin-panel-users" style="display:none; flex-direction:column; gap:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <span style="font-size:0.78rem; color:var(--text-muted);">🛡️ 零知识隐私架构：管理员后台彻底盲化，不暴露任何用户的节点明文。</span>
          <button class="secondary-btn" style="padding:4px 10px; font-size:0.72rem;" onclick="loadAdminUsers()">🔄 刷新列表</button>
        </div>
        <div style="background:var(--bg-base); border:1px solid var(--border-subtle); border-radius:var(--radius-md); overflow:hidden;">
          <table class="admin-table">
            <thead>
              <tr>
                <th>用户名</th>
                <th>权限角色</th>
                <th>订阅条数</th>
                <th>注册时间</th>
                <th style="text-align:right;">操作</th>
              </tr>
            </thead>
            <tbody id="admin-users-tbody">
              <tr>
                <td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">正在加载用户列表...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- 管理员重置单个用户密码的浮层 -->
  <div class="modal-v2-overlay" id="admin-reset-pwd-modal" style="display:none; z-index:2147483648;" onclick="if(event.target===this)closeAdminResetModal()">
    <div class="modal-v2-card" style="max-width:380px;">
      <div style="font-size:0.92rem; font-weight:700; color:var(--text-primary);">🔑 重置用户密码</div>
      <div style="font-size:0.75rem; color:var(--text-muted);">正在为用户 <strong id="reset-target-user" style="color:var(--primary);"></strong> 重置登录密码：</div>
      <div class="auth-input-group">
        <label class="auth-label">新密码</label>
        <div class="auth-input-wrap">
          <input type="password" class="auth-input" id="admin-new-user-pwd" placeholder="输入为该用户设定的新密码">
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="secondary-btn" style="padding:6px 14px; font-size:0.78rem;" onclick="closeAdminResetModal()">取消</button>
        <button class="primary-btn" style="padding:6px 16px; font-size:0.78rem;" onclick="confirmAdminResetPassword()">确认重置</button>
      </div>
    </div>
  </div>
`;

if (!html.includes('auth-modal')) {
  html = html.replace('<!-- ⚙️ SubFlow 系统偏好设置弹窗', `${modalsSnippet}\n  <!-- ⚙️ SubFlow 系统偏好设置弹窗`);
  console.log('✓ Injected Auth, Profile, and Admin Modals');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Finished stage 1 of injection.');
