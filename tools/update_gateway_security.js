const fs = require('fs');
const path = require('path');

const gwFile = path.join(__dirname, 'gateway.py');
let code = fs.readFileSync(gwFile, 'utf8');

// 1. Update default_cfg
code = code.replace(
  '"close_to_tray": True\n    }',
  '"close_to_tray": True,\n        "captcha_mode": "internal",\n        "turnstile_site_key": "",\n        "turnstile_secret_key": ""\n    }'
);

// 2. Add challenge & ticket engine right above ThreadingHTTPServer
const challengeEngine = `
# ==============================================================================
# 5.1 智能人机核验引擎 (Smart Human Challenge & Turnstile Integration)
# ==============================================================================
active_challenges = {}  # token -> {"created": float, "ip": str, "nonce": str, "ticket": str}
challenge_lock = threading.Lock()

def clean_expired_challenges():
    now = time.time()
    with challenge_lock:
        for cid in list(active_challenges.keys()):
            if now - active_challenges[cid]["created"] > 300:
                active_challenges.pop(cid, None)

def create_challenge(ip: str):
    clean_expired_challenges()
    cid = "chal_" + secrets.token_hex(16)
    nonce = secrets.token_hex(8)
    with challenge_lock:
        active_challenges[cid] = {
            "created": time.time(),
            "ip": ip,
            "nonce": nonce,
            "ticket": None
        }
    return cid, nonce

def verify_challenge_solution(cid: str, ip: str, client_data: dict):
    clean_expired_challenges()
    mode = server_config.get("captcha_mode", "internal")
    if mode == "off":
        return True, "bypass_ticket"

    if mode == "turnstile":
        turnstile_resp = client_data.get("turnstile_token", "")
        secret = server_config.get("turnstile_secret_key", "").strip()
        if not secret:
            mode = "internal"
        else:
            if not turnstile_resp:
                return False, "缺少 Cloudflare Turnstile 人机核验凭证"
            try:
                verify_data = urllib.parse.urlencode({
                    "secret": secret,
                    "response": turnstile_resp,
                    "remoteip": ip
                }).encode('utf-8')
                req = urllib.request.Request("https://challenges.cloudflare.com/turnstile/v0/siteverify", data=verify_data)
                with urllib.request.urlopen(req, timeout=5) as resp:
                    res_json = json.loads(resp.read().decode('utf-8'))
                    if res_json.get("success"):
                        ticket = "tkt_" + secrets.token_hex(20)
                        with challenge_lock:
                            active_challenges[ticket] = {"created": time.time(), "ip": ip, "ticket": ticket}
                        return True, ticket
                    else:
                        return False, "Cloudflare Turnstile 官方人机核验未通过"
            except Exception as ex:
                return False, f"Turnstile 服务调用异常: {str(ex)}"

    # 内置原生智能人机挑战核验 (行为动力学微延迟)
    with challenge_lock:
        rec = active_challenges.get(cid)
        if not rec:
            return False, "人机核验挑战已过期，请重新点击"
        time_elapsed = time.time() - rec["created"]
        if time_elapsed < 0.25:
            return False, "操作过快，判定为自动化脚本拦截"
        ticket = "tkt_" + secrets.token_hex(20)
        active_challenges[ticket] = {
            "created": time.time(),
            "ip": ip,
            "ticket": ticket
        }
        active_challenges.pop(cid, None)
        return True, ticket

def consume_captcha_ticket(ticket: str, ip: str) -> bool:
    mode = server_config.get("captcha_mode", "internal")
    if mode == "off":
        return True
    if not ticket:
        return False
    clean_expired_challenges()
    with challenge_lock:
        rec = active_challenges.get(ticket)
        if not rec:
            return False
        active_challenges.pop(ticket, None)
        return True
`;

code = code.replace(
  '# ==============================================================================\n# 6. HTTP 多线程请求处理器 (BaseHTTPRequestHandler)',
  challengeEngine + '\n# ==============================================================================\n# 6. HTTP 多线程请求处理器 (BaseHTTPRequestHandler)'
);

// 3. In do_GET, add /api/auth/challenge
const challengeRoute = `
        # 人机验证挑战签发 (/api/auth/challenge)
        if path == "/api/auth/challenge":
            mode = server_config.get("captcha_mode", "internal")
            cid, nonce = create_challenge(client_ip)
            self.send_json({
                "ok": True,
                "captcha_mode": mode,
                "turnstile_site_key": server_config.get("turnstile_site_key", ""),
                "challenge_id": cid,
                "nonce": nonce
            })
            return
`;

code = code.replace(
  '# 4. 本地网络与设置接口 (兼容本地单机模式)',
  challengeRoute + '\n        # 4. 本地网络与设置接口 (兼容本地单机模式)'
);

// 4. In do_POST, add /api/auth/verify-challenge
const verifyChallengeRoute = `
        # 人机验证核验接口 (/api/auth/verify-challenge)
        if path == "/api/auth/verify-challenge":
            cid = body.get("challenge_id", "")
            turnstile_token = body.get("turnstile_token", "")
            client_data = {"turnstile_token": turnstile_token}
            ok, ticket_or_err = verify_challenge_solution(cid, client_ip, client_data)
            if ok:
                self.send_json({"ok": True, "ticket": ticket_or_err, "message": "人机身份验证通过"})
            else:
                self.send_json({"ok": False, "error": ticket_or_err}, code=400)
            return
`;

code = code.replace(
  '# 1. 注册接口 (/api/auth/register)',
  verifyChallengeRoute + '\n        # 1. 注册接口 (/api/auth/register)'
);

// 5. Intercept in register & login
code = code.replace(
  'if len(username) < 3 or len(password) < 6:\n                self.send_json({"error": "用户名至少3位，密码至少6位"}, code=400)\n                return',
  'if len(username) < 3 or len(password) < 6:\n                self.send_json({"error": "用户名至少3位，密码至少6位"}, code=400)\n                return\n            ticket = body.get("captcha_ticket", "")\n            if not consume_captcha_ticket(ticket, client_ip):\n                self.send_json({"error": "请先点击完成人机身份验证 (防脚本爆破)"}, code=403)\n                return'
);

code = code.replace(
  'if not check_login_attempts(client_ip):\n                self.send_json({"error": "连续登录失败次数过多，该 IP 已被临时锁定 15 分钟"}, code=429)\n                return',
  'if not check_login_attempts(client_ip):\n                self.send_json({"error": "连续登录失败次数过多，该 IP 已被临时锁定 15 分钟"}, code=429)\n                return\n            ticket = body.get("captcha_ticket", "")\n            if not consume_captcha_ticket(ticket, client_ip):\n                self.send_json({"error": "请先点击完成人机身份验证 (防脚本爆破)"}, code=403)\n                return'
);

// 6. In do_POST, add admin reset password and handle captcha settings in network
const adminResetRoute = `
        # 11. 管理员为用户重设密码 (/api/admin/users/reset-password)
        if path == "/api/admin/users/reset-password":
            user = self.get_current_user()
            if not user or user["role"] != "admin":
                self.send_json({"error": "Forbidden"}, code=403)
                return
            target_user_id = int(body.get("user_id", 0))
            new_password = body.get("new_password", "").strip()
            if len(new_password) < 6:
                self.send_json({"error": "新密码至少 6 位"}, code=400)
                return
            new_hash, new_salt = hash_password(new_password)
            with db_lock:
                conn = get_db()
                c = conn.cursor()
                c.execute("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?;", (new_hash, new_salt, target_user_id))
                conn.commit()
                conn.close()
            self.send_json({"ok": True, "message": "该用户的登录密码已重置成功"})
            return
`;

code = code.replace(
  'self.send_error(404, "Endpoint not found")',
  adminResetRoute + '\n        self.send_error(404, "Endpoint not found")'
);

// Update network handler to accept captcha config
code = code.replace(
  'server_config["allow_public_register"] = allow_reg\n            save_server_config(server_config)',
  `server_config["allow_public_register"] = allow_reg
            if "captcha_mode" in body and body["captcha_mode"] in ["off", "internal", "turnstile"]:
                server_config["captcha_mode"] = body["captcha_mode"]
            if "turnstile_site_key" in body:
                server_config["turnstile_site_key"] = body["turnstile_site_key"].strip()
            if "turnstile_secret_key" in body:
                server_config["turnstile_secret_key"] = body["turnstile_secret_key"].strip()
            save_server_config(server_config)`
);

fs.writeFileSync(gwFile, code, 'utf8');
fs.writeFileSync(path.join(__dirname, 'linux', 'gateway.py'), code, 'utf8');
console.log('gateway.py updated with Human Challenge & Password Reset features!');
