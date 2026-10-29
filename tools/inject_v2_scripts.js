const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'web', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const jsLogic = `
    // ==========================================================================
    // 🌐 V2.0 云端多租户、自适应公网 IP 与域名绑定中枢引擎 (Domain & IP Adaptive)
    // ==========================================================================
    window.SUBFLOW_BOUND_DOMAIN = '';
    window.SUBFLOW_USER = null;
    window.SUBFLOW_CHALLENGE_TICKET = null;
    let currentAuthMode = 'login';
    let isVerifyingChallenge = false;
    let targetResetUser = '';

    // 智能 BaseURL 动态解析引擎 (绑定域名优先 > 当前公网IP > 127.0.0.1)
    function getEffectiveBaseUrl() {
      // 1. 最高优先级：管理员绑定的专属公网域名
      if (window.SUBFLOW_BOUND_DOMAIN && window.SUBFLOW_BOUND_DOMAIN.trim()) {
        return window.SUBFLOW_BOUND_DOMAIN.trim().replace(/\\/$/, '');
      }
      const cachedDomain = localStorage.getItem('subflow_bound_domain');
      if (cachedDomain && cachedDomain.trim()) {
        return cachedDomain.trim().replace(/\\/$/, '');
      }
      // 2. 第二优先级：若在浏览器中以云端公网 IP 或域名访问，直接自适应为当前访问来源 (Origin)
      if (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file://')) {
        return window.location.origin;
      }
      // 3. 兜底为本地网关
      return 'http://127.0.0.1:25588';
    }

    function apiUrl(endpoint) {
      if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
      if (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file://')) {
        return endpoint;
      }
      return 'http://127.0.0.1:25588' + endpoint;
    }

    function updateBrandStatusUI() {
      const statusEl = document.querySelector('.brand-status span:last-child');
      if (!statusEl) return;
      const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.protocol === 'file:';
      if (window.SUBFLOW_BOUND_DOMAIN && window.SUBFLOW_BOUND_DOMAIN.trim()) {
        const cleanDomain = window.SUBFLOW_BOUND_DOMAIN.replace(/^https?:\\/\\//, '');
        statusEl.innerHTML = '专属域名 <strong style=\"color:#38bdf8;\">' + cleanDomain + '</strong> 在线';
      } else if (!isLocal && window.location.host) {
        statusEl.innerHTML = '云端公网 <strong style=\"color:#10b981;\">' + window.location.host + '</strong> 在线';
      } else {
        statusEl.innerHTML = '本地网关 <strong>127.0.0.1:25588</strong> 在线';
      }
    }

    // 显隐密码通用切换器
    function togglePasswordVisibility(inputId, btn) {
      const el = document.getElementById(inputId);
      if (!el) return;
      if (el.type === 'password') {
        el.type = 'text';
        btn.style.color = '#38bdf8';
      } else {
        el.type = 'password';
        btn.style.color = 'var(--text-muted)';
      }
    }

    // ==========================================================================
    // 🔑 登录 / 注册与用户状态管理体系
    // ==========================================================================
    async function checkAuthStatus() {
      try {
        const res = await fetch(apiUrl('/api/auth/me'));
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.logged_in && data.user) {
            window.SUBFLOW_USER = data.user;
            if (data.server_domain) {
              window.SUBFLOW_BOUND_DOMAIN = data.server_domain;
              localStorage.setItem('subflow_bound_domain', data.server_domain);
            }
            renderAuthHeader(true);
            updateBrandStatusUI();
            return;
          }
        }
      } catch (e) {}

      // 未登录状态
      window.SUBFLOW_USER = null;
      renderAuthHeader(false);
      updateBrandStatusUI();
    }

    function renderAuthHeader(isLoggedIn) {
      const btnLogin = document.getElementById('btn-header-login');
      const btnUser = document.getElementById('btn-header-user');
      const btnAdmin = document.getElementById('btn-header-admin');
      const txtUsername = document.getElementById('header-username');

      if (!btnLogin) return;

      if (isLoggedIn && window.SUBFLOW_USER) {
        btnLogin.style.display = 'none';
        btnUser.style.display = 'inline-flex';
        txtUsername.textContent = window.SUBFLOW_USER.username;

        if (window.SUBFLOW_USER.role === 'admin') {
          btnAdmin.style.display = 'inline-flex';
        } else {
          btnAdmin.style.display = 'none';
        }
      } else {
        btnLogin.style.display = 'inline-flex';
        btnUser.style.display = 'none';
        btnAdmin.style.display = 'none';
      }
    }

    function openAuthModal(mode) {
      currentAuthMode = mode || 'login';
      switchAuthTab(currentAuthMode);
      resetChallengeBox();
      hideAuthAlert();
      const modal = document.getElementById('auth-modal');
      if (modal) {
        modal.style.display = 'flex';
        document.getElementById('auth-username').focus();
      }
    }

    function closeAuthModal() {
      const modal = document.getElementById('auth-modal');
      if (modal) modal.style.display = 'none';
    }

    function switchAuthTab(tab) {
      currentAuthMode = tab;
      const tabLogin = document.getElementById('auth-tab-login');
      const tabRegister = document.getElementById('auth-tab-register');
      const groupConfirm = document.getElementById('group-confirm-pwd');
      const submitText = document.getElementById('auth-btn-text');
      const modalTitle = document.getElementById('auth-modal-title');

      hideAuthAlert();
      resetChallengeBox();

      if (tab === 'register') {
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
        groupConfirm.style.display = 'flex';
        submitText.textContent = '立即注册新账户';
        modalTitle.textContent = 'SubFlow 快速注册';
      } else {
        tabRegister.classList.remove('active');
        tabLogin.classList.add('active');
        groupConfirm.style.display = 'none';
        submitText.textContent = '立即登录';
        modalTitle.textContent = 'SubFlow 账户登录';
      }
    }

    function showAuthAlert(msg, type) {
      const box = document.getElementById('auth-alert-box');
      const msgEl = document.getElementById('auth-alert-msg');
      const iconEl = document.getElementById('auth-alert-icon');
      if (!box || !msgEl) return;
      box.className = 'auth-alert ' + (type || 'error');
      iconEl.textContent = type === 'success' ? '✓' : '⚠️';
      msgEl.textContent = msg;
      box.style.display = 'flex';
    }

    function hideAuthAlert() {
      const box = document.getElementById('auth-alert-box');
      if (box) box.style.display = 'none';
    }

    // ==========================================================================
    // 🛡️ 智能真人核验 (Smart Human Challenge) 交互生命周期
    // ==========================================================================
    function resetChallengeBox() {
      window.SUBFLOW_CHALLENGE_TICKET = null;
      isVerifyingChallenge = false;
      const box = document.getElementById('challenge-box');
      const spinner = document.getElementById('challenge-spinner');
      const checkSvg = document.getElementById('challenge-check-svg');
      const title = document.getElementById('challenge-status-title');
      const sub = document.getElementById('challenge-status-sub');

      if (!box) return;
      box.classList.remove('checking', 'verified');
      spinner.style.display = 'none';
      checkSvg.style.display = 'none';
      title.textContent = '进行真人身份核验';
      title.style.color = 'var(--text-primary)';
      sub.textContent = '点击完成防爆破安全检验';
    }

    async function triggerHumanChallenge() {
      if (window.SUBFLOW_CHALLENGE_TICKET) return; // 已核验通过
      if (isVerifyingChallenge) return;

      isVerifyingChallenge = true;
      hideAuthAlert();

      const box = document.getElementById('challenge-box');
      const spinner = document.getElementById('challenge-spinner');
      const checkSvg = document.getElementById('challenge-check-svg');
      const title = document.getElementById('challenge-status-title');
      const sub = document.getElementById('challenge-status-sub');

      box.classList.add('checking');
      spinner.style.display = 'block';
      title.textContent = '正在核验环境安全...';
      sub.textContent = '进行真人微动力学与行为熵分析';

      const startTime = Date.now();

      try {
        // 1. 获取核验挑战
        const res1 = await fetch(apiUrl('/api/auth/challenge'));
        const chalData = await res1.json();
        
        if (chalData.mode === 'off') {
          // 若管理员关闭了人机验证，直接放行
          window.SUBFLOW_CHALLENGE_TICKET = 'bypass-off';
          box.classList.remove('checking');
          box.classList.add('verified');
          spinner.style.display = 'none';
          checkSvg.style.display = 'block';
          title.textContent = '核验通过 (免检模式)';
          sub.textContent = '当前安全等级：标准';
          return;
        }

        // 真实模拟人类微动力学交互延迟 (至少 320ms 避免瞬间机器点击)
        const elapsed = Date.now() - startTime;
        if (elapsed < 320) {
          await new Promise(r => setTimeout(r, 320 - elapsed));
        }

        // 2. 提交微动力学凭证验证
        const res2 = await fetch(apiUrl('/api/auth/verify-challenge'), {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            id: chalData.id,
            answer: chalData.challenge,
            duration_ms: Date.now() - startTime
          })
        });

        const vData = await res2.json();
        if (vData.ok && vData.ticket) {
          window.SUBFLOW_CHALLENGE_TICKET = vData.ticket;
          box.classList.remove('checking');
          box.classList.add('verified');
          spinner.style.display = 'none';
          checkSvg.style.display = 'block';
          title.textContent = '✓ 真人核验已通过';
          title.style.color = '#10b981';
          sub.textContent = '安全凭证即时签发 · 单次有效';
        } else {
          throw new Error(vData.error || '人机核验未通过，请重试');
        }
      } catch (err) {
        box.classList.remove('checking');
        spinner.style.display = 'none';
        title.textContent = '核验未通过';
        title.style.color = '#f43f5e';
        sub.textContent = '请再次点击重新核验';
        showAuthAlert(err.message, 'error');
      } finally {
        isVerifyingChallenge = false;
      }
    }

    async function submitAuthForm() {
      const username = document.getElementById('auth-username').value.trim();
      const password = document.getElementById('auth-password').value;
      const confirmPwd = document.getElementById('auth-confirm-password').value;

      if (!username) {
        showAuthAlert('请输入用户名 / 账号', 'error');
        return;
      }
      if (!password) {
        showAuthAlert('请输入登录密码', 'error');
        return;
      }

      if (currentAuthMode === 'register') {
        if (password.length < 6) {
          showAuthAlert('密码长度至少需要 6 个字符', 'error');
          return;
        }
        if (password !== confirmPwd) {
          showAuthAlert('两次输入的密码不一致，请核对', 'error');
          return;
        }
      }

      // 验证防爆破 Ticket
      if (!window.SUBFLOW_CHALLENGE_TICKET) {
        showAuthAlert('请先点击完成真人身份防爆破核验', 'error');
        return;
      }

      const submitBtn = document.getElementById('btn-auth-submit');
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';

      try {
        const endpoint = currentAuthMode === 'register' ? '/api/auth/register' : '/api/auth/login';
        const res = await fetch(apiUrl(endpoint), {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            username: username,
            password: password,
            challenge_ticket: window.SUBFLOW_CHALLENGE_TICKET
          })
        });

        const data = await res.json();
        if (!data.ok) {
          throw new Error(data.error || '操作失败');
        }

        // 成功处理
        showAuthAlert(currentAuthMode === 'register' ? '🎉 注册成功，正在进入系统...' : '✓ 登录成功！', 'success');
        setTimeout(async () => {
          closeAuthModal();
          await checkAuthStatus();
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
        }, 600);
      } catch (err) {
        showAuthAlert(err.message, 'error');
        resetChallengeBox();
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
      }
    }

    // ==========================================================================
    // 👤 用户个人中心与密码修改体系
    // ==========================================================================
    function openUserModal() {
      if (!window.SUBFLOW_USER) {
        openAuthModal('login');
        return;
      }
      document.getElementById('profile-display-name').textContent = window.SUBFLOW_USER.username;
      const roleBadge = document.getElementById('profile-role-badge');
      if (window.SUBFLOW_USER.role === 'admin') {
        roleBadge.textContent = '👑 系统管理员';
        roleBadge.style.color = '#34d399';
        roleBadge.style.background = 'rgba(16,185,129,0.15)';
      } else {
        roleBadge.textContent = '👤 订阅用户';
        roleBadge.style.color = '#38bdf8';
        roleBadge.style.background = 'rgba(56,189,248,0.15)';
      }

      document.getElementById('profile-token-box').value = window.SUBFLOW_USER.token || '';
      document.getElementById('pwd-old').value = '';
      document.getElementById('pwd-new').value = '';
      document.getElementById('pwd-confirm').value = '';
      hidePwdAlert();

      const modal = document.getElementById('user-profile-modal');
      if (modal) modal.style.display = 'flex';
    }

    function closeUserModal() {
      const modal = document.getElementById('user-profile-modal');
      if (modal) modal.style.display = 'none';
    }

    function copyUserToken() {
      const tokenBox = document.getElementById('profile-token-box');
      if (!tokenBox.value) return;
      tokenBox.select();
      navigator.clipboard.writeText(tokenBox.value).then(() => {
        showToast('✓ 专属拉取 Token 已复制到剪贴板！');
      }).catch(() => {
        document.execCommand('copy');
        showToast('✓ 专属拉取 Token 已复制！');
      });
    }

    function showPwdAlert(msg, type) {
      const box = document.getElementById('pwd-alert-box');
      const msgEl = document.getElementById('pwd-alert-msg');
      const iconEl = document.getElementById('pwd-alert-icon');
      if (!box || !msgEl) return;
      box.className = 'auth-alert ' + (type || 'error');
      iconEl.textContent = type === 'success' ? '✓' : '⚠️';
      msgEl.textContent = msg;
      box.style.display = 'flex';
    }

    function hidePwdAlert() {
      const box = document.getElementById('pwd-alert-box');
      if (box) box.style.display = 'none';
    }

    async function submitChangePassword() {
      const oldPwd = document.getElementById('pwd-old').value;
      const newPwd = document.getElementById('pwd-new').value;
      const confirmPwd = document.getElementById('pwd-confirm').value;

      if (!oldPwd) {
        showPwdAlert('请输入当前原密码', 'error');
        return;
      }
      if (newPwd.length < 6) {
        showPwdAlert('新密码长度不能少于 6 位', 'error');
        return;
      }
      if (newPwd !== confirmPwd) {
        showPwdAlert('两次输入的新密码不一致', 'error');
        return;
      }

      try {
        const res = await fetch(apiUrl('/api/auth/change-password'), {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            old_password: oldPwd,
            new_password: newPwd
          })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || '修改密码失败');

        showPwdAlert('🎉 密码修改成功！请牢记您的新密码。', 'success');
        document.getElementById('pwd-old').value = '';
        document.getElementById('pwd-new').value = '';
        document.getElementById('pwd-confirm').value = '';
      } catch (err) {
        showPwdAlert(err.message, 'error');
      }
    }

    async function doLogout() {
      try {
        await fetch(apiUrl('/api/auth/logout'), {method: 'POST'});
      } catch(e) {}
      window.SUBFLOW_USER = null;
      closeUserModal();
      renderAuthHeader(false);
      showToast('已安全退出登录');
    }

    // ==========================================================================
    // 🛡️ 云端管理后台 (Admin Console) 控制引擎
    // ==========================================================================
    async function openAdminModal() {
      if (!window.SUBFLOW_USER || window.SUBFLOW_USER.role !== 'admin') {
        showToast('⚠️ 需要管理员权限方可访问管理后台');
        return;
      }
      const modal = document.getElementById('admin-modal');
      if (modal) modal.style.display = 'flex';
      switchAdminTab('domain');
      await loadAdminSettings();
    }

    function closeAdminModal() {
      const modal = document.getElementById('admin-modal');
      if (modal) modal.style.display = 'none';
    }

    function switchAdminTab(tab) {
      const tabDomain = document.getElementById('admin-tab-domain');
      const tabSecurity = document.getElementById('admin-tab-security');
      const tabUsers = document.getElementById('admin-tab-users');
      const pDomain = document.getElementById('admin-panel-domain');
      const pSecurity = document.getElementById('admin-panel-security');
      const pUsers = document.getElementById('admin-panel-users');

      [tabDomain, tabSecurity, tabUsers].forEach(t => t.classList.remove('active'));
      [pDomain, pSecurity, pUsers].forEach(p => p.style.display = 'none');

      if (tab === 'domain') {
        tabDomain.classList.add('active');
        pDomain.style.display = 'flex';
      } else if (tab === 'security') {
        tabSecurity.classList.add('active');
        pSecurity.style.display = 'flex';
      } else if (tab === 'users') {
        tabUsers.classList.add('active');
        pUsers.style.display = 'flex';
        loadAdminUsers();
      }
    }

    async function loadAdminSettings() {
      try {
        const res = await fetch(apiUrl('/api/admin/settings'));
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            document.getElementById('admin-bound-domain').value = data.bound_domain || '';
            document.getElementById('admin-force-redirect').checked = !!data.force_redirect;
            document.getElementById('admin-allow-register').checked = data.allow_register !== false;

            const mode = data.captcha_mode || 'internal';
            const radio = document.querySelector('input[name=\"captcha-mode-radio\"][value=\"' + mode + '\"]');
            if (radio) radio.checked = true;
            document.getElementById('admin-turnstile-sitekey').value = data.turnstile_site_key || '';

            toggleTurnstileBox(mode === 'turnstile');
          }
        }
      } catch (e) {}
    }

    function toggleTurnstileBox(show) {
      const box = document.getElementById('turnstile-config-box');
      if (box) box.style.display = show ? 'flex' : 'none';
    }

    document.addEventListener('change', function(e) {
      if (e.target && e.target.name === 'captcha-mode-radio') {
        toggleTurnstileBox(e.target.value === 'turnstile');
      }
    });

    async function saveAdminDomainSettings() {
      const domain = document.getElementById('admin-bound-domain').value.trim();
      const forceRedirect = document.getElementById('admin-force-redirect').checked;
      const allowRegister = document.getElementById('admin-allow-register').checked;

      try {
        const res = await fetch(apiUrl('/api/admin/settings'), {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            bound_domain: domain,
            force_domain_redirect: forceRedirect,
            allow_public_register: allowRegister
          })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || '保存域名设置失败');

        window.SUBFLOW_BOUND_DOMAIN = domain;
        localStorage.setItem('subflow_bound_domain', domain);
        updateBrandStatusUI();
        showToast('✓ 专属公网域名配置已生效并落库！');
      } catch (err) {
        showToast('⚠️ ' + err.message);
      }
    }

    async function saveAdminSecuritySettings() {
      const selectedRadio = document.querySelector('input[name=\"captcha-mode-radio\"]:checked');
      const mode = selectedRadio ? selectedRadio.value : 'internal';
      const siteKey = document.getElementById('admin-turnstile-sitekey').value.trim();
      const secretKey = document.getElementById('admin-turnstile-secret').value.trim();

      try {
        const res = await fetch(apiUrl('/api/admin/settings'), {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            captcha_mode: mode,
            turnstile_site_key: siteKey,
            turnstile_secret_key: secretKey
          })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || '保存防爆破设置失败');
        showToast('✓ 防爆破人机核验设置已保存并生效！');
      } catch (err) {
        showToast('⚠️ ' + err.message);
      }
    }

    async function loadAdminUsers() {
      const tbody = document.getElementById('admin-users-tbody');
      tbody.innerHTML = '<tr><td colspan=\"5\" style=\"text-align:center; color:var(--text-muted); padding:16px;\">正在加载数据...</td></tr>';

      try {
        const res = await fetch(apiUrl('/api/admin/users'));
        const data = await res.json();
        if (!data.ok || !data.users) throw new Error(data.error || '加载用户失败');

        if (data.users.length === 0) {
          tbody.innerHTML = '<tr><td colspan=\"5\" style=\"text-align:center; color:var(--text-muted); padding:16px;\">暂无租户用户</td></tr>';
          return;
        }

        let rowsHtml = '';
        data.users.forEach(u => {
          const roleTag = u.role === 'admin' 
            ? '<span class=\"detect-badge\" style=\"background:rgba(16,185,129,0.15); color:#34d399;\">管理员</span>'
            : '<span class=\"detect-badge\" style=\"background:rgba(56,189,248,0.15); color:#38bdf8;\">租户用户</span>';
          rowsHtml += '<tr>' +
            '<td style=\"font-weight:600;\">' + u.username + '</td>' +
            '<td>' + roleTag + '</td>' +
            '<td><span style=\"font-family:var(--font-mono); color:#10b981; font-weight:700;\">' + (u.subscription_count || 0) + '</span> 条</td>' +
            '<td style=\"color:var(--text-muted); font-size:0.72rem;\">' + (u.created_at ? u.created_at.slice(0, 16) : '-') + '</td>' +
            '<td style=\"text-align:right;\">' +
              '<button class=\"secondary-btn\" style=\"font-size:0.72rem; padding:4px 8px;\" onclick=\"openAdminResetModal(\\'' + u.username + '\\')\">🔑 重置密码</button>' +
            '</td>' +
          '</tr>';
        });
        tbody.innerHTML = rowsHtml;
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan=\"5\" style=\"text-align:center; color:#f43f5e; padding:16px;\">' + err.message + '</td></tr>';
      }
    }

    function openAdminResetModal(username) {
      targetResetUser = username;
      document.getElementById('reset-target-user').textContent = username;
      document.getElementById('admin-new-user-pwd').value = '';
      const modal = document.getElementById('admin-reset-pwd-modal');
      if (modal) modal.style.display = 'flex';
    }

    function closeAdminResetModal() {
      const modal = document.getElementById('admin-reset-pwd-modal');
      if (modal) modal.style.display = 'none';
      targetResetUser = '';
    }

    async function confirmAdminResetPassword() {
      const newPwd = document.getElementById('admin-new-user-pwd').value;
      if (!newPwd || newPwd.length < 6) {
        showToast('⚠️ 设定的新密码不能少于 6 位');
        return;
      }
      try {
        const res = await fetch(apiUrl('/api/admin/users/reset-password'), {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            username: targetResetUser,
            new_password: newPwd
          })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || '重置失败');

        showToast('✓ 已成功将用户 ' + targetResetUser + ' 的密码重置！');
        closeAdminResetModal();
      } catch (err) {
        showToast('⚠️ ' + err.message);
      }
    }

    // ==========================================================================
    // ⚙️ 强化版偏好设置弹窗 (确保点击百分之百即时响应)
    // ==========================================================================
    window.openSettingsModal = function(e) {
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
    };

    window.closeSettingsModal = function() {
      const modal = document.getElementById('settings-modal');
      if (modal) {
        modal.classList.remove('active');
        modal.style.setProperty('display', 'none', 'important');
      }
    };

    // 页面初始化自启
    window.addEventListener('DOMContentLoaded', () => {
      // 保证偏好设置按钮 100% 可靠绑定
      const btnSettings = document.getElementById('settings-btn');
      if (btnSettings) {
        btnSettings.onclick = window.openSettingsModal;
      }
      // 鉴权检查与公网自适应
      checkAuthStatus();
    });
`;

// 替换原有旧版的 getEffectiveBaseUrl / apiUrl 定义
const oldBaseUrlRegex = /\/\/\s*={10,}\s*\n\s*\/\/\s*🌐\s*云端版自适应[\s\S]*?function\s+apiUrl\s*\([\s\S]*?\n\s*\}/;
if (oldBaseUrlRegex.test(html)) {
  html = html.replace(oldBaseUrlRegex, jsLogic);
  console.log('✓ Replaced old getEffectiveBaseUrl and injected V2 logic');
} else {
  // 如果没匹配到，直接在 </body> 之前注入
  html = html.replace('</body>', `<script>\n${jsLogic}\n</script>\n</body>`);
  console.log('✓ Injected V2 logic before </body>');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Finished stage 2 of script injection.');
