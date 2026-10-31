import ssl
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
SubFlow (订阅流) · 统一多租户云端网关与微服务核心 (V2.0)
一套核心 · 三端自适应 (Windows 本地单机 / Windows Server / Linux VPS Docker)
基于 Python 3 原生标准库 + SQLite 3，零外部依赖，极省资源 (内存 < 20MB)
==============================================================================
"""

import os
import sys
import json
import time
import uuid
import socket
import sqlite3
import hashlib
import hmac
import secrets
import threading
import base64
import re
import subprocess
import urllib.request
import urllib.error
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

__version__ = "2.0.0"
__product__ = "SubFlow Cloud Matrix"


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
CACHE_DIR = os.path.join(DATA_DIR, "cache")
WEB_DIR = os.path.join(BASE_DIR, "web")
CONFIG_FILE = os.path.join(DATA_DIR, "server_config.json")
DB_FILE = os.path.join(DATA_DIR, "subflow.db")
SECRET_KEY_FILE = os.path.join(DATA_DIR, ".master.key")

for d in [DATA_DIR, CACHE_DIR]:
    if not os.path.exists(d):
        os.makedirs(d, exist_ok=True)

# 命令行解析模式 (默认 cloud，支持 --mode=local)
RUN_MODE = "cloud"
LISTEN_PORT = 25588
CORE_URL = "http://127.0.0.1:25500"

for arg in sys.argv[1:]:
    if arg.startswith("--mode="):
        RUN_MODE = arg.split("=", 1)[1].strip().lower()
    elif arg.startswith("--port="):
        try:
            LISTEN_PORT = int(arg.split("=", 1)[1].strip())
        except ValueError:
            pass
    elif arg.startswith("--core="):
        CORE_URL = arg.split("=", 1)[1].strip().rstrip("/")

START_TIME = time.time()

# ==============================================================================
# 2. 金融级加解密与安全体系 (Master Key & AES/HMAC 密文封包)
# ==============================================================================
def get_or_create_master_key():
    env_key = os.environ.get("SUBFLOW_SECRET_KEY")
    if env_key and len(env_key.strip()) >= 32:
        return env_key.strip().encode("utf-8")
    if os.path.exists(SECRET_KEY_FILE):
        try:
            with open(SECRET_KEY_FILE, "rb") as f:
                k = f.read().strip()
                if len(k) >= 32:
                    return k
        except Exception:
            pass
    new_key = secrets.token_hex(32).encode("utf-8")
    try:
        with open(SECRET_KEY_FILE, "wb") as f:
            f.write(new_key)
        if hasattr(os, "chmod"):
            os.chmod(SECRET_KEY_FILE, 0o600)
    except Exception:
        pass
    return new_key

MASTER_KEY = get_or_create_master_key()

def hash_password(password: str) -> tuple:
    """PBKDF2-HMAC-SHA256 100,000次加盐安全散列"""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return pwd_hash, salt

def verify_password(password: str, pwd_hash: str, salt: str) -> bool:
    """恒定时间防侧信道比对"""
    check_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return secrets.compare_digest(check_hash, pwd_hash)

def encrypt_secret(plain_text: str) -> str:
    """
    零外部依赖工业级密文入库 (HMAC-SHA256 密钥派生 + 带防篡改 MAC 的流密流)
    存储格式: nonce_hex:mac_hex:cipher_hex
    """
    if not plain_text:
        return ""
    nonce = os.urandom(16)
    raw_key = hashlib.sha256(MASTER_KEY + nonce).digest()
    plain_bytes = plain_text.encode('utf-8')
    # 纯原生异或加密
    keystream = hashlib.sha512(raw_key).digest()
    while len(keystream) < len(plain_bytes):
        keystream += hashlib.sha512(keystream).digest()
    cipher = bytes([b ^ keystream[i] for i, b in enumerate(plain_bytes)])
    mac = hmac.new(raw_key, cipher, hashlib.sha256).hexdigest()
    return f"{nonce.hex()}:{mac}:{cipher.hex()}"

def decrypt_secret(cipher_text: str) -> str:
    """内存解密 (仅在转发给 subconverter 核心瞬间在内存完成)"""
    if not cipher_text:
        return ""
    try:
        parts = cipher_text.split(":")
        if len(parts) != 3:
            return cipher_text
        nonce = bytes.fromhex(parts[0])
        expected_mac = parts[1]
        cipher = bytes.fromhex(parts[2])
        raw_key = hashlib.sha256(MASTER_KEY + nonce).digest()
        calc_mac = hmac.new(raw_key, cipher, hashlib.sha256).hexdigest()
        if not secrets.compare_digest(expected_mac, calc_mac):
            return ""
        keystream = hashlib.sha512(raw_key).digest()
        while len(keystream) < len(cipher):
            keystream += hashlib.sha512(keystream).digest()
        plain = bytes([b ^ keystream[i] for i, b in enumerate(cipher)])
        return plain.decode('utf-8')
    except Exception:
        return ""

# ==============================================================================
# 3. 数据库与数据模型 (SQLite 3 强租户隔离)
# ==============================================================================
db_lock = threading.Lock()

def get_db():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    with db_lock:
        conn = get_db()
        c = conn.cursor()
        c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(128) NOT NULL,
            salt VARCHAR(32) NOT NULL,
            user_token VARCHAR(64) UNIQUE NOT NULL,
            role VARCHAR(10) DEFAULT 'user',
            status VARCHAR(10) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        c.execute("""
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            alias_name VARCHAR(100),
            source_url TEXT NOT NULL,
            target_format VARCHAR(20) DEFAULT 'clash',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)
        c.execute("""
        CREATE TABLE IF NOT EXISTS guest_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token VARCHAR(64) UNIQUE NOT NULL,
            max_uses INTEGER DEFAULT 3,
            used_count INTEGER DEFAULT 0,
            expires_at INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_user_subs ON subscriptions(user_id);")
        c.execute("CREATE INDEX IF NOT EXISTS idx_user_token ON users(user_token);")
        c.execute("CREATE INDEX IF NOT EXISTS idx_guest_token ON guest_tokens(token);")

        # 默认初始化管理员 (admin / admin123456)
        c.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1;")
        admin_row = c.fetchone()
        if not admin_row:
            p_hash, salt = hash_password("admin123456")
            adm_token = secrets.token_hex(32)
            c.execute("""
            INSERT INTO users (username, password_hash, salt, user_token, role, status)
            VALUES (?, ?, ?, ?, 'admin', 'active');
            """, ("admin", p_hash, salt, adm_token))
            conn.commit()
            print("[Init] Default administrator created: admin / admin123456")

        conn.commit()
        conn.close()

init_database()

# ==============================================================================
# 4. 全局服务器配置与网络探测
# ==============================================================================
def load_server_config():
    default_cfg = {
        "bound_domain": "",
        "tunnel_token": "",
        "force_domain_redirect": False,
        "allow_public_register": True,
        "announcement": "",
        "close_to_tray": True,
        "captcha_mode": "internal",
        "turnstile_site_key": "",
        "turnstile_secret_key": ""
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                default_cfg.update(data)
        except Exception:
            pass
    return default_cfg

def save_server_config(cfg):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

server_config = load_server_config()

def get_public_ip():
    for api in ["https://api.ipify.org", "https://icanhazip.com", "https://ifconfig.me/ip"]:
        try:
            req = urllib.request.Request(api, headers={"User-Agent": "curl/7.68.0"})
            with urllib.request.urlopen(req, timeout=3) as resp:
                return resp.read().decode("utf-8").strip()
        except Exception:
            continue
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

CACHED_PUBLIC_IP = get_public_ip()

# ==============================================================================
# 5. 会话与安全防刷拦截 (Session & Anti-Brute-Force)
# ==============================================================================
sessions = {}  # session_token -> {"user_id": int, "username": str, "role": str, "exp": int}
login_failures = {}  # ip -> {"count": int, "locked_until": int}
rate_limit_map = {}  # ip -> [timestamps]

def clean_expired_sessions():
    now = time.time()
    for tok in list(sessions.keys()):
        if sessions[tok]["exp"] < now:
            sessions.pop(tok, None)

def check_login_attempts(ip: str) -> bool:
    now = time.time()
    record = login_failures.get(ip)
    if record and record.get("locked_until", 0) > now:
        return False
    return True

def record_login_failure(ip: str):
    now = time.time()
    record = login_failures.get(ip, {"count": 0, "locked_until": 0})
    record["count"] += 1
    if record["count"] >= 5:
        record["locked_until"] = now + 900  # 锁定 15 分钟
        record["count"] = 0
    login_failures[ip] = record

def clear_login_failure(ip: str):
    login_failures.pop(ip, None)

def check_rate_limit(ip: str, max_per_sec: int = 5) -> bool:
    now = time.time()
    records = rate_limit_map.get(ip, [])
    records = [t for t in records if now - t < 1.0]
    if len(records) >= max_per_sec:
        return False
    records.append(now)
    rate_limit_map[ip] = records
    return True


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

# ==============================================================================
# 6. HTTP 多线程请求处理器 (BaseHTTPRequestHandler)
# ==============================================================================

# ==============================================================================
# 🌐 GeoIP 智能地理归属地引擎 (高并发异步查询 + SQLite 持久化秒级缓存)
# ==============================================================================
_GEOIP_MEM_CACHE = {}

COUNTRY_CODE_MAP = {
    'HK': ('🇭🇰', '香港'),
    'TW': ('🇨🇳', '台湾'),
    'MO': ('🇲🇴', '澳门'),
    'JP': ('🇯🇵', '日本'),
    'KR': ('🇰🇷', '韩国'),
    'SG': ('🇸🇬', '新加坡'),
    'US': ('🇺🇸', '美国'),
    'CA': ('🇨🇦', '加拿大'),
    'GB': ('🇬🇧', '英国'),
    'UK': ('🇬🇧', '英国'),
    'DE': ('🇩🇪', '德国'),
    'FR': ('🇫🇷', '法国'),
    'RU': ('🇷🇺', '俄罗斯'),
    'NL': ('🇳🇱', '荷兰'),
    'AU': ('🇦🇺', '澳大利亚'),
    'IN': ('🇮🇳', '印度'),
    'MY': ('🇲🇾', '马来西亚'),
    'TH': ('🇹🇭', '泰国'),
    'VN': ('🇻🇳', '越南'),
    'PH': ('🇵🇭', '菲律宾'),
    'ID': ('🇮🇩', '印尼'),
    'TR': ('🇹🇷', '土耳其'),
    'BR': ('🇧🇷', '巴西'),
    'AR': ('🇦🇷', '阿根廷'),
    'IT': ('🇮🇹', '意大利'),
    'ES': ('🇪🇸', '西班牙'),
    'CH': ('🇨🇭', '瑞士'),
    'SE': ('🇸🇪', '瑞典'),
    'NO': ('🇳🇴', '挪威'),
    'FI': ('🇫🇮', '芬兰'),
    'PL': ('🇵🇱', '波兰'),
    'UA': ('🇺🇦', '乌克兰'),
    'ZA': ('🇿🇦', '南非'),
}

COUNTRY_KEYWORDS = [
    '🇭🇰', '🇨🇳', '🇯🇵', '🇰🇷', '🇸🇬', '🇺🇸', '🇨🇦', '🇬🇧', '🇩🇪', '🇫🇷', '🇦🇺',
    '香港', '台湾', '日本', '韩国', '新加坡', '美国', '加拿大', '英国', '德国', '法国',
    '澳大利亚', '澳洲', '俄罗斯', '荷兰', '印度', '马来西亚', '泰国', '专线', 'IEPL', 'IPLC',
    '广港', '沪日', '京德', '深港', '沪韩'
]

def init_geoip_db():
    try:
        con = get_db()
        con.execute("""
            CREATE TABLE IF NOT EXISTS geoip_cache (
                ip TEXT PRIMARY KEY,
                flag TEXT,
                country_name TEXT,
                updated_at INTEGER
            );
        """)
        con.commit()
        con.close()
    except Exception:
        pass

def batch_resolve_geoip(ips: list) -> dict:
    """批量高效解析 IP 归属地，优先查内存与 SQLite，未命中才并发查询"""
    init_geoip_db()
    result = {}
    missing_ips = set()

    # 1. 查内存
    for ip in ips:
        if not ip or ip in ['127.0.0.1', 'localhost', '::1']:
            continue
        if ip in _GEOIP_MEM_CACHE:
            result[ip] = _GEOIP_MEM_CACHE[ip]
        else:
            missing_ips.add(ip)

    # 2. 查 SQLite
    if missing_ips:
        try:
            con = get_db()
            c = con.cursor()
            placeholders = ','.join(['?'] * len(missing_ips))
            c.execute(f"SELECT ip, flag, country_name FROM geoip_cache WHERE ip IN ({placeholders})", list(missing_ips))
            rows = c.fetchall()
            con.close()
            for r in rows:
                val = (r['flag'], r['country_name'])
                result[r['ip']] = val
                _GEOIP_MEM_CACHE[r['ip']] = val
                missing_ips.discard(r['ip'])
        except Exception:
            pass

    # 3. 对仍然缺失的 IP 进行并发请求 (限时 1.8 秒防阻塞)
    if missing_ips:
        def fetch_single(target_ip):
            # 域名特判
            low_host = target_ip.lower()
            for code, (fl, cn) in COUNTRY_CODE_MAP.items():
                if f"-{code.lower()}." in low_host or f".{code.lower()}." in low_host or low_host.startswith(f"{code.lower()}."):
                    return target_ip, fl, cn
            try:
                url = f"http://ip-api.com/json/{target_ip}?fields=countryCode"
                req = urllib.request.Request(url, headers={'User-Agent': 'curl/7.88'})
                with urllib.request.urlopen(req, timeout=1.5) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    cc = data.get('countryCode', '')
                    if cc in COUNTRY_CODE_MAP:
                        fl, cn = COUNTRY_CODE_MAP[cc]
                        return target_ip, fl, cn
            except Exception:
                pass
            # Cloudflare Anycast 网段兜底
            if any(target_ip.startswith(cf) for cf in ['172.64.', '104.19.', '104.17.', '104.20.']):
                return target_ip, '🇨🇦', '加拿大'
            return target_ip, '🇺🇸', '美国'

        new_entries = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            for tip, fl, cn in executor.map(fetch_single, list(missing_ips)):
                val = (fl, cn)
                result[tip] = val
                _GEOIP_MEM_CACHE[tip] = val
                new_entries.append((tip, fl, cn, int(time.time())))

        # 写入 SQLite
        if new_entries:
            try:
                con = get_db()
                con.executemany("INSERT OR REPLACE INTO geoip_cache (ip, flag, country_name, updated_at) VALUES (?, ?, ?, ?)", new_entries)
                con.commit()
                con.close()
            except Exception:
                pass

    return result

def enrich_node_name_fast(orig_name: str, host: str, geo_map: dict) -> str:
    if not orig_name: orig_name = "Node"
    orig_name = orig_name.strip()
    if any(k in orig_name for k in COUNTRY_KEYWORDS):
        return orig_name
    flag, cname = geo_map.get(host, ('🇺🇸', '美国'))
    return f"{flag} {cname} | {orig_name}"

class NativeSubEngine:
    @staticmethod
    def is_invalid_upstream_response(data: str) -> bool:
        if not data or len(data.strip()) < 15:
            return True
        low = data[:500].lower()
        if '<html' in low or '<!doctype' in low or '<head' in low:
            return True
        bad_keywords = [
            '\u4e0d\u652f\u6301\u6b64\u5ba2\u6237\u7aef',
            'unsupported-client',
            'unsupported client',
            '\u8bf7\u524d\u5f80\u5b98\u7f51',
            '\u8bf7\u66f4\u65b0\u5ba2\u6237\u7aef',
            '\u5ba2\u6237\u7aef\u7248\u672c\u8fc7\u4f4e',
            'token invalid'
        ]
        if any(kw in data for kw in bad_keywords):
            return True
        if '127.0.0.1:1' in data or '127.0.0.1:8888' in data:
            return True
        try:
            b64_str = data.strip()
            missing = len(b64_str) % 4
            if missing:
                b64_str += '=' * (4 - missing)
            decoded = base64.b64decode(b64_str).decode('utf-8', errors='ignore')
            if any(kw in decoded for kw in bad_keywords) or '127.0.0.1:1' in decoded:
                return True
        except Exception:
            pass
        return False

    @staticmethod
    def fetch_upstream(url: str, client_ua: str = ''):
        uas = [
            'ClashMeta',
            'clash.meta',
            'mihomo/1.18.1',
            'Shadowrocket/2.2.35',
            'sing-box/1.9.0',
            'v2rayN/6.23',
            'Quantumult%20X/1.0.30',
            'Surge/4.0.0',
            'curl/7.88.1'
        ]
        if client_ua and client_ua not in uas:
            uas.insert(0, client_ua)

        for ua in uas:
            try:
                req = urllib.request.Request(url, headers={'User-Agent': ua})
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
                    data = resp.read().decode('utf-8', errors='ignore')
                    if NativeSubEngine.is_invalid_upstream_response(data):
                        continue
                    uinfo = resp.headers.get('Subscription-Userinfo') or resp.headers.get('subscription-userinfo') or ''
                    return data, uinfo
            except Exception:
                continue
        return None, None

    @staticmethod
    def parse_vless_share(line: str):
        proto = "vless"
        if line.startswith('vless://'):
            rest = line[8:]
        elif line.startswith('anytls://'):
            proto = "anytls"
            rest = line[9:]
        else:
            return None
        name = f"{proto.upper()} 节点"
        if '#' in rest:
            rest, name_part = rest.split('#', 1)
            name = urllib.parse.unquote(name_part).strip()
        name = enrich_node_name(name, host)
        query = {}
        if '?' in rest:
            rest, q_part = rest.split('?', 1)
            query = urllib.parse.parse_qs(q_part)
        if '@' not in rest:
            return None
        uuid, host_port = rest.split('@', 1)
        host_port = host_port.rstrip('/')
        if ':' in host_port:
            host, port_str = host_port.split(':', 1)
            try: port = int(port_str.rstrip('/'))
            except ValueError: port = 443
        else:
            host, port = host_port, 443
        security = query.get('security', [''])[0]
        net_type = query.get('type', ['tcp'])[0]
        sni = query.get('sni', [''])[0]
        host_header = query.get('host', [''])[0]
        path = query.get('path', ['/'])[0]
        path = urllib.parse.unquote(path)
        fp = query.get('fp', [''])[0]
        proxy = {
            'name': name,
            'type': proto,
            'server': host,
            'port': port,
            'uuid': uuid,
            'udp': True,
            'tls': (security == 'tls' or proto == 'anytls'),
            'skip-cert-verify': True
        }
        if sni: proxy['servername'] = sni
        if fp: proxy['client-fingerprint'] = fp
        if net_type == 'ws':
            proxy['network'] = 'ws'
            ws_opts = {'path': path}
            if host_header: ws_opts['headers'] = {'Host': host_header}
            proxy['ws-opts'] = ws_opts
        return proxy, line, name, host, rest

    @staticmethod
    @staticmethod
    @staticmethod
    def parse_yaml_proxy(line: str, geo_map: dict = None):
        try:
            server_m = re.search(r'server:\s*([^\s,}]+)', line)
            server = server_m.group(1).strip() if server_m else ""

            name_m = re.search(r'(?<![a-zA-Z0-9_-])name:\s*["']?([^"',}]+)["']?', line)
            raw_name = name_m.group(1).strip() if name_m else "Node"
            if geo_map:
                enriched_name = enrich_node_name_fast(raw_name, server, geo_map)
            else:
                enriched_name = enrich_node_name(raw_name, server)

            port_m = re.search(r'port:\s*([0-9]+)', line)
            port = int(port_m.group(1)) if port_m else 443
            uuid_m = re.search(r'(?:uuid|password):\s*([^\s,}]+)', line)
            uuid = uuid_m.group(1).strip() if uuid_m else ""
            type_m = re.search(r'type:\s*([^\s,}]+)', line)
            p_type = type_m.group(1).strip() if type_m else "anytls"
            sni_m = re.search(r'servername:\s*([^\s,}]+)', line) or re.search(r'sni:\s*([^\s,}]+)', line)
            sni = sni_m.group(1).strip() if sni_m else ""
            fp_m = re.search(r'client-fingerprint:\s*([^\s,}]+)', line)
            fp = fp_m.group(1).strip() if fp_m else "chrome"

            # 精准替换节点名称，绝对不误伤 servername
            new_line = re.sub(r'(?<![a-zA-Z0-9_-])name:\s*["']?[^"',}]+["']?', f'name: "{enriched_name}"', line)

            share_link = ""
            if p_type == 'anytls' and server and uuid:
                share_link = f"anytls://{uuid}@{server}:{port}?type=tcp&fp={fp}&security=tls&sni={sni}&alpn=h2,http/1.1&allowInsecure=1&insecure=1&udp=1&tfo=0#{urllib.parse.quote(enriched_name)}"
            elif p_type == 'hysteria2' and server and uuid:
                share_link = f"hysteria2://{uuid}@{server}:{port}/?sni={sni}#{urllib.parse.quote(enriched_name)}"
            elif p_type == 'trojan' and server and uuid:
                share_link = f"trojan://{uuid}@{server}:{port}?security=tls&sni={sni}#{urllib.parse.quote(enriched_name)}"
            elif p_type == 'vless' and server and uuid:
                host_m = re.search(r'Host:\s*([^\s,}]+)', line) or re.search(r'host:\s*([^\s,}]+)', line)
                host = host_m.group(1).strip() if host_m else sni
                path_m = re.search(r'path:\s*["']?([^"',}]+)["']?', line)
                path = path_m.group(1).strip() if path_m else "/"
                net_m = re.search(r'network:\s*([^\s,}]+)', line)
                net = net_m.group(1).strip() if net_m else "tcp"
                tls = "tls" if ("tls: true" in line or "security: tls" in line) else "none"
                share_link = f"vless://{uuid}@{server}:{port}?type={net}&security={tls}&path={urllib.parse.quote(path)}&host={host}&sni={sni}&fp={fp}#{urllib.parse.quote(enriched_name)}"
            elif p_type == 'ss' and server and uuid:
                cipher_m = re.search(r'cipher:\s*([^\s,}]+)', line)
                cipher = cipher_m.group(1).strip() if cipher_m else "aes-256-gcm"
                auth = base64.b64encode(f"{cipher}:{uuid}".encode('utf-8')).decode('utf-8')
                share_link = f"ss://{auth}@{server}:{port}#{urllib.parse.quote(enriched_name)}"
            return new_line.strip(), share_link, enriched_name
        except Exception:
            return None, "", ""

    def convert(cls, source_urls, target_format='clash', client_ua=''):
        all_yaml_proxies = []
        all_share_links = []
        all_names = []
        combined_userinfo = ''

        for u in source_urls:
            u = u.strip()
            if not u: continue
            raw = None
            if u.startswith('http://') or u.startswith('https://'):
                raw, uinfo = cls.fetch_upstream(u, client_ua)
                if uinfo and not combined_userinfo:
                    combined_userinfo = uinfo
            else:
                raw = u

            if not raw:
                continue

            # Case A: Already Clash YAML with proxies
            if 'proxies:' in raw or 'proxy-groups:' in raw:
                matches = re.findall(r'-\s*\{[^\n]+\}', raw)
                hosts_to_resolve = set()
                for m in matches:
                    sm = re.search(r'server:\s*([^\s,}]+)', m)
                    if sm:
                        hosts_to_resolve.add(sm.group(1).strip())
                geo_map = batch_resolve_geoip(list(hosts_to_resolve))

                for m in matches:
                    if any(bad in m for bad in ['剩余流量', '套餐到期', '重置', '通知', '过期时间']):
                        continue
                    y_line, s_link, n_name = cls.parse_yaml_proxy(m, geo_map)
                    if y_line:
                        all_yaml_proxies.append(y_line)
                        if s_link: all_share_links.append(s_link)
                        all_names.append(n_name)
                continue

            # Case B: Base64 or plain lines
            text_lines = []
            try:
                b64_str = raw.strip()
                missing = len(b64_str) % 4
                if missing: b64_str += '=' * (4 - missing)
                decoded = base64.b64decode(b64_str).decode('utf-8', errors='ignore')
                text_lines = [l.strip() for l in decoded.splitlines() if l.strip()]
            except Exception:
                text_lines = [l.strip() for l in raw.splitlines() if l.strip()]

            # 预提取所有节点 IP 并进行批量并发 GeoIP 识别
            parsed_vless_list = []
            hosts_to_resolve = set()
            for line in text_lines:
                if line.startswith('vless://') or line.startswith('anytls://'):
                    res = cls.parse_vless_share(line)
                    if res:
                        p_dict, orig_link, n_name, s_host, s_rest = res
                        parsed_vless_list.append((p_dict, orig_link, n_name, s_host, s_rest))
                        hosts_to_resolve.add(s_host)
                elif line.startswith('vmess://') or line.startswith('ss://') or line.startswith('trojan://') or line.startswith('hysteria2://') or line.startswith('hy2://') or line.startswith('tuic://'):
                    all_share_links.append(line)

            # 批量解析 IP 归属地 (带缓存)
            geo_map = batch_resolve_geoip(list(hosts_to_resolve))

            for p_dict, orig_link, n_name, s_host, s_rest in parsed_vless_list:
                enriched_name = enrich_node_name_fast(n_name, s_host, geo_map)
                p_dict['name'] = enriched_name
                p_json = json.dumps(p_dict, ensure_ascii=False)
                all_yaml_proxies.append(f"- {p_json}")
                all_names.append(enriched_name)
                # 重新构建带国家国旗的分享链接 (供 v2rayN 等客户端直接显示)
                proto_prefix = 'vless://' if orig_link.startswith('vless://') else 'anytls://'
                rebuilt_link = f"{proto_prefix}{s_rest}#{urllib.parse.quote(enriched_name)}"
                all_share_links.append(rebuilt_link)

        if not all_yaml_proxies and not all_share_links:
            return None, None, ''

        # Target: clash
        if target_format == 'clash' or target_format == 'clashmeta':
            if not all_yaml_proxies and all_share_links:
                for sl in all_share_links:
                    if sl.startswith('vless://'):
                        res = cls.parse_vless_share(sl)
                        if res:
                            all_yaml_proxies.append(f"- {json.dumps(res[0], ensure_ascii=False)}")
                            all_names.append(res[0]['name'])

            quoted_names = [json.dumps(n, ensure_ascii=False) for n in all_names if n]
            sb = [
                "port: 7890",
                "socks-port: 7891",
                "allow-lan: true",
                "mode: rule",
                "log-level: info",
                "external-controller: 127.0.0.1:9090",
                "",
                "proxies:"
            ]
            for p in all_yaml_proxies:
                if not p.startswith('-'):
                    sb.append(f"  - {p}")
                else:
                    sb.append(f"  {p}")
            sb.extend([
                "",
                "proxy-groups:",
                "  - name: 🚀 节点选择",
                "    type: select",
                "    proxies:",
                "      - ⚡ 自动优选",
                "      - 🎯 全球直连",
            ] + [f"      - {name}" for name in quoted_names] + [
                "",
                "  - name: ⚡ 自动优选",
                "    type: url-test",
                "    url: http://www.gstatic.com/generate_204",
                "    interval: 300",
                "    proxies:"
            ] + [f"      - {name}" for name in quoted_names] + [
                "",
                "  - name: 🎯 全球直连",
                "    type: select",
                "    proxies:",
                "      - DIRECT",
                "",
                "rules:",
                "  - GEOIP,CN,🎯 全球直连",
                "  - MATCH,🚀 节点选择"
            ])
            yaml_content = "\n".join(sb).encode('utf-8')
            return yaml_content, 'text/yaml; charset=utf-8', combined_userinfo

        # Target: mixed / shadowrocket / v2ray
        plain_links = "\n".join(all_share_links)
        b64_output = base64.b64encode(plain_links.encode('utf-8')).decode('utf-8')
        return b64_output.encode('utf-8'), 'text/plain; charset=utf-8', combined_userinfo

# ==============================================================================
# 6. HTTP 多线程请求处理器 (BaseHTTPRequestHandler)
# ==============================================================================
class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class SubFlowGatewayHandler(BaseHTTPRequestHandler):
    def get_base_url(self):
        # 1. 管理员绑定的专属域名最高优先
        bound = server_config.get('bound_domain', '').strip()
        if bound:
            return bound.rstrip('/')
        # 2. 客户端请求携带的 Host (公网 IP 或反代域名)
        req_host = self.headers.get('X-Forwarded-Host') or self.headers.get('Host')
        if req_host:
            proto = self.headers.get('X-Forwarded-Proto', 'http')
            return f"{proto}://{req_host}"
        # 3. 服务器探测到的公网出口 IP
        if CACHED_PUBLIC_IP and CACHED_PUBLIC_IP != '127.0.0.1':
            return f"http://{CACHED_PUBLIC_IP}:{LISTEN_PORT}"
        return f"http://127.0.0.1:{LISTEN_PORT}"

    server_version = f"SubFlow/{__version__}"

    def log_message(self, format, *args):
        # 规整化日志
        sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), format % args))

    def get_client_ip(self):
        cf_ip = self.headers.get("CF-Connecting-IP")
        if cf_ip:
            return cf_ip.strip()
        x_real = self.headers.get("X-Real-IP")
        if x_real:
            return x_real.strip()
        x_forwarded = self.headers.get("X-Forwarded-For")
        if x_forwarded:
            return x_forwarded.split(",")[0].strip()
        return self.client_address[0]

    def get_current_user(self):
        """解析 Bearer Token 或 Cookie 中的 Session"""
        auth_header = self.headers.get("Authorization", "")
        token = ""
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
        if not token:
            cookie_str = self.headers.get("Cookie", "")
            for cookie in cookie_str.split(";"):
                if "=" in cookie:
                    k, v = cookie.strip().split("=", 1)
                    if k == "subflow_session":
                        token = v
                        break
        if not token:
            return None
        clean_expired_sessions()
        sess = sessions.get(token)
        if sess and sess["exp"] > time.time():
            return sess
        return None

    def read_json_body(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            if length == 0:
                return {}
            raw = self.rfile.read(length).decode('utf-8')
            return json.loads(raw)
        except Exception:
            return {}

    def send_json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.end_headers()

    # ==========================================================================
    # 7. GET 请求处理
    # ==========================================================================
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = parsed.query
        client_ip = self.get_client_ip()

        # 301 域名强制重定向检查
        bound_domain = server_config.get("bound_domain", "").strip()
        if bound_domain and server_config.get("force_domain_redirect", False):
            host = self.headers.get("Host", "")
            domain_parsed = urllib.parse.urlparse(bound_domain)
            if host and domain_parsed.netloc and host != domain_parsed.netloc:
                target_url = f"{bound_domain.rstrip('/')}{self.path}"
                self.send_response(301)
                self.send_header("Location", target_url)
                self.end_headers()
                return

        # 1. 静态前端资源与专属管理员独立页面 (/admin 物理解耦)
        if path == "/admin" or path == "/admin/" or path == "/admin.html":
            admin_path = os.path.join(WEB_DIR, "admin.html")
            if os.path.exists(admin_path):
                self.serve_file(admin_path, "text/html; charset=utf-8")
                return
            else:
                self.serve_file(os.path.join(WEB_DIR, "index.html"), "text/html; charset=utf-8")
                return

        # 普通用户前台页面
        if path == "/" or path == "/index.html":
            self.serve_file(os.path.join(WEB_DIR, "index.html"), "text/html; charset=utf-8")
            return

        # 通用静态前端资源安全托管 (.js, .css, .png, .ico, .svg)
        clean_name = os.path.basename(path.lstrip("/"))
        if clean_name:
            static_file = os.path.join(WEB_DIR, clean_name)
            if os.path.exists(static_file) and os.path.isfile(static_file):
                mime = "application/octet-stream"
                if static_file.endswith(".js"): mime = "application/javascript; charset=utf-8"
                elif static_file.endswith(".html"): mime = "text/html; charset=utf-8"
                elif static_file.endswith(".css"): mime = "text/css; charset=utf-8"
                elif static_file.endswith(".png"): mime = "image/png"
                elif static_file.endswith(".ico"): mime = "image/x-icon"
                elif static_file.endswith(".svg"): mime = "image/svg+xml"
                elif static_file.endswith(".json"): mime = "application/json; charset=utf-8"
                self.serve_file(static_file, mime)
                return

        # 2. 核心订阅分发与容灾兜底 (/sub)
        if path == "/sub":
            self.handle_sub_request(query, client_ip)
            return

        # 3. 基础健康检查与版本自适应
        if path == "/api/health" or path == "/api/status":
            self.send_json({
                "status": "ok",
                "app": "SubFlow",
                "version": __version__,
                "mode": RUN_MODE,
                "uptime_seconds": int(time.time() - START_TIME)
            })
            return

        # 管理员专属: 获取系统版本与 Git 协同状态 (/api/admin/system/version)
        if path == "/api/admin/system/version":
            user = self.get_current_user()
            if not user or user["role"] != "admin":
                self.send_json({"error": "Forbidden: Admin required"}, code=403)
                return
            is_git = os.path.exists(os.path.join(BASE_DIR, ".git"))
            git_commit = ""
            git_branch = ""
            if is_git:
                try:
                    res_c = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=BASE_DIR, capture_output=True, text=True, timeout=3)
                    git_commit = res_c.stdout.strip()
                    res_b = subprocess.run(["git", "branch", "--show-current"], cwd=BASE_DIR, capture_output=True, text=True, timeout=3)
                    git_branch = res_b.stdout.strip()
                except Exception:
                    pass
            self.send_json({
                "ok": True,
                "version": __version__,
                "build": "20261030",
                "is_git": is_git,
                "git_commit": git_commit or "release",
                "git_branch": git_branch or "main",
                "git_repo": server_config.get("git_repo", "https://github.com/yeying130/SubFlow.git"),
                "uptime": int(time.time() - START_TIME)
            })
            return

        # 人机验证挑战签发 (/api/auth/challenge)
        if path == "/api/auth/challenge":
            mode = server_config.get("captcha_mode", "internal")
            cid, nonce = create_challenge(client_ip)
            self.send_json({
                "ok": True,
                "captcha_mode": mode,
                "mode": mode,
                "turnstile_site_key": server_config.get("turnstile_site_key", ""),
                "challenge_id": cid,
                "id": cid,
                "nonce": nonce
            })
            return

        # 4. 本地网络与设置接口 (兼容本地单机模式)
        if path == "/api/lan-ip":
            base = self.get_base_url()
            self.send_json({
                "ip": CACHED_PUBLIC_IP,
                "port": LISTEN_PORT,
                "base_url": base,
                "full": f"{base}/sub"
            })
            return

        if path == "/api/settings":
            self.send_json({
                "ok": True,
                "mode": RUN_MODE,
                "version": __version__,
                "closeToTray": server_config.get("close_to_tray", True),
                "port": LISTEN_PORT,
                "bound_domain": server_config.get("bound_domain", ""),
                "public_ip": CACHED_PUBLIC_IP,
                "base_url": self.get_base_url(),
                "allow_public_register": server_config.get("allow_public_register", True),
                "announcement": server_config.get("announcement", "")
            })
            return

        # 5. 用户鉴权状态查询 (/api/auth/me)
        if path == "/api/auth/me":
            user = self.get_current_user()
            if not user:
                # 若是 local 模式，免登录直接返回虚拟主用户
                if RUN_MODE == "local":
                    self.send_json({
                        "ok": True,
                        "logged_in": True,
                        "user": {"username": "LocalUser", "role": "admin", "token": "local-device-token"}
                    })
                    return
                self.send_json({"ok": False, "logged_in": False}, code=401)
                return
            # 获取用户最新 Token
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT user_token FROM users WHERE id = ?;", (user["user_id"],))
            row = c.fetchone()
            conn.close()
            user_token = row["user_token"] if row else ""
            self.send_json({
                "ok": True,
                "logged_in": True,
                "user": {
                    "id": user["user_id"],
                    "username": user["username"],
                    "role": user["role"],
                    "token": user_token
                },
                "server_domain": server_config.get("bound_domain", ""),
                "public_ip": CACHED_PUBLIC_IP,
                "base_url": self.get_base_url()
            })
            return

        # 6. 用户私有订阅列表 (/api/user/subscriptions)
        if path == "/api/user/subscriptions":
            user = self.get_current_user()
            if not user and RUN_MODE != "local":
                self.send_json({"error": "Unauthorized"}, code=401)
                return
            user_id = user["user_id"] if user else 1
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT id, alias_name, source_url, target_format, updated_at FROM subscriptions WHERE user_id = ? ORDER BY id DESC;", (user_id,))
            rows = c.fetchall()
            subs = []
            for r in rows:
                decrypted_url = decrypt_secret(r["source_url"])
                # 脱敏掩码
                masked_url = decrypted_url
                if len(decrypted_url) > 20:
                    masked_url = decrypted_url[:12] + "..." + decrypted_url[-6:]
                subs.append({
                    "id": r["id"],
                    "alias": r["alias_name"] or "未命名订阅",
                    "raw_url": decrypted_url,
                    "masked_url": masked_url,
                    "target": r["target_format"] or "clash",
                    "updated_at": r["updated_at"]
                })
            conn.close()
            self.send_json({"ok": True, "subscriptions": subs})
            return

        # 7. 管理员专属 API: 仪表盘概览与用户列表 (/api/admin/overview & /api/admin/users)
        if path == "/api/admin/overview":
            user = self.get_current_user()
            if not user or user["role"] != "admin":
                self.send_json({"error": "Forbidden: Admin required"}, code=403)
                return
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT COUNT(*) AS c FROM users;")
            user_count = c.fetchone()["c"]
            c.execute("SELECT COUNT(*) AS c FROM subscriptions;")
            sub_count = c.fetchone()["c"]
            conn.close()
            self.send_json({
                "ok": True,
                "user_count": user_count,
                "sub_count": sub_count,
                "public_ip": CACHED_PUBLIC_IP,
                "bound_domain": server_config.get("bound_domain", ""),
                "force_redirect": server_config.get("force_domain_redirect", False),
                "allow_register": server_config.get("allow_public_register", True),
                "uptime": int(time.time() - START_TIME)
            })
            return

        if path == "/api/admin/users":
            user = self.get_current_user()
            if not user or user["role"] != "admin":
                self.send_json({"error": "Forbidden"}, code=403)
                return
            conn = get_db()
            c = conn.cursor()
            # 零知识脱敏原则: 仅查统计与元信息，绝不查出任何订阅明文或密文 URL
            c.execute("""
            SELECT u.id, u.username, u.role, u.status, u.created_at,
                   COUNT(s.id) AS sub_count
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id
            GROUP BY u.id
            ORDER BY u.id ASC;
            """)
            rows = c.fetchall()
            user_list = [dict(r) for r in rows]
            conn.close()
            self.send_json({"ok": True, "users": user_list})
            return

        # 8. 管理员体检诊断 (/api/admin/diagnostics)
        if path == "/api/admin/diagnostics":
            user = self.get_current_user()
            if not user or user["role"] != "admin":
                self.send_json({"error": "Forbidden"}, code=403)
                return
            # 测试 core 连通
            core_ok = False
            core_latency = -1
            try:
                t0 = time.time()
                with urllib.request.urlopen(f"{CORE_URL}/version", timeout=2) as r:
                    if r.status == 200:
                        core_ok = True
                        core_latency = int((time.time() - t0) * 1000)
            except Exception:
                pass

            self.send_json({
                "ok": True,
                "gateway_port": LISTEN_PORT,
                "core_reachable": core_ok,
                "core_latency_ms": core_latency,
                "public_ip": CACHED_PUBLIC_IP,
                "domain_configured": bool(server_config.get("bound_domain")),
                "database_size_bytes": os.path.getsize(DB_FILE) if os.path.exists(DB_FILE) else 0
            })
            return

        
        # 管理员全量数据库快照下载 (/api/admin/backup/download-db)
        if path == "/api/admin/backup/download-db":
            user = self.get_current_user()
            if not user or user["role"] != "admin":
                self.send_json({"error": "Forbidden"}, code=403)
                return
            db_path = os.path.join(DATA_DIR, "subflow.db")
            if not os.path.exists(db_path):
                self.send_json({"error": "Database file not found"}, code=404)
                return
            with open(db_path, "rb") as f:
                db_data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Disposition", f'attachment; filename="subflow_backup_{time.strftime("%Y%m%d_%H%M%S")}.db"')
            self.send_header("Content-Length", str(len(db_data)))
            self.end_headers()
            self.wfile.write(db_data)
            return

        # 管理员全量结构化 JSON 导出 (/api/admin/backup/export-json)
        if path == "/api/admin/backup/export-json":
            user = self.get_current_user()
            if not user or user["role"] != "admin":
                self.send_json({"error": "Forbidden"}, code=403)
                return
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT id, username, password_hash, salt, user_token, role, status, created_at FROM users;")
            users_rows = [dict(r) for r in c.fetchall()]
            c.execute("""
            SELECT s.id, u.username, s.alias_name, s.source_url, s.target_format, s.created_at, s.updated_at
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id;
            """)
            subs_rows = [dict(r) for r in c.fetchall()]
            conn.close()
            export_payload = {
                "version": __version__,
                "format": "subflow_backup_v2",
                "exported_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "server_config": server_config,
                "users": users_rows,
                "subscriptions": subs_rows
            }
            json_bytes = json.dumps(export_payload, ensure_ascii=False, indent=2).encode('utf-8')
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Disposition", f'attachment; filename="subflow_export_{time.strftime("%Y%m%d_%H%M%S")}.json"')
            self.send_header("Content-Length", str(len(json_bytes)))
            self.end_headers()
            self.wfile.write(json_bytes)
        # 单次别名记录缓存兼容接口 (/api/save-alias)
        if path == "/api/save-alias":
            self.send_json({"ok": True, "message": "Saved"})
            return

        # 兼容桌面端/客户端辅助接口
        if path in ["/api/import-flclash", "/api/sync-v2rayn", "/api/set-custom-tunnel", "/api/set-pin", "/api/tunnel/start", "/api/tunnel/stop", "/api/exit", "/api/emergency-kill"]:
            self.send_json({"ok": True, "message": "Processed in cloud mode"})
            return

        self.send_error(404, "API endpoint not found")

    # ==========================================================================
    # 8. POST 请求处理
    # ==========================================================================
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        client_ip = self.get_client_ip()
        body = self.read_json_body()

        
        # 人机验证核验接口 (/api/auth/verify-challenge)
        if path == "/api/auth/verify-challenge":
            cid = body.get("challenge_id", "") or body.get("id", "")
            turnstile_token = body.get("turnstile_token", "")
            client_data = {"turnstile_token": turnstile_token}
            ok, ticket_or_err = verify_challenge_solution(cid, client_ip, client_data)
            if ok:
                self.send_json({"ok": True, "ticket": ticket_or_err, "message": "人机身份验证通过"})
            else:
                self.send_json({"ok": False, "error": ticket_or_err}, code=400)
            return

        # 1. 注册接口 (/api/auth/register)
        if path == "/api/auth/register":
            if not server_config.get("allow_public_register", True):
                self.send_json({"error": "全站公开注册已由管理员关闭"}, code=403)
                return
            username = body.get("username", "").strip()
            password = body.get("password", "").strip()
            if len(username) < 3 or len(password) < 6:
                self.send_json({"error": "用户名至少3位，密码至少6位"}, code=400)
                return
            p_hash, salt = hash_password(password)
            user_token = secrets.token_hex(32)
            try:
                with db_lock:
                    conn = get_db()
                    c = conn.cursor()
                    c.execute("""
                    INSERT INTO users (username, password_hash, salt, user_token, role, status)
                    VALUES (?, ?, ?, ?, 'user', 'active');
                    """, (username, p_hash, salt, user_token))
                    conn.commit()
                    conn.close()
                self.send_json({"ok": True, "message": "注册成功，请使用新账号登录"})
            except sqlite3.IntegrityError:
                self.send_json({"error": "用户名已存在，请换一个重试"}, code=409)
            return

        # 2. 登录接口 (/api/auth/login)
        if path == "/api/auth/login":
            if not check_login_attempts(client_ip):
                self.send_json({"error": "连续登录失败次数过多，该 IP 已被临时锁定 15 分钟"}, code=429)
                return
            username = body.get("username", "").strip()
            password = body.get("password", "").strip()
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT id, username, password_hash, salt, role, status, user_token FROM users WHERE username = ?;", (username,))
            user_row = c.fetchone()
            conn.close()
            if not user_row or not verify_password(password, user_row["password_hash"], user_row["salt"]):
                record_login_failure(client_ip)
                self.send_json({"error": "用户名或密码错误"}, code=401)
                return
            if user_row["status"] == "frozen":
                self.send_json({"error": "该账号已被管理员封禁，请联系站长"}, code=403)
                return
            clear_login_failure(client_ip)
            # 生成 Session
            session_token = secrets.token_hex(24)
            sessions[session_token] = {
                "user_id": user_row["id"],
                "username": user_row["username"],
                "role": user_row["role"],
                "exp": time.time() + 86400 * 7  # 7 天有效
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Set-Cookie", f"subflow_session={session_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800")
            self.send_header("Access-Control-Allow-Origin", "*")
            resp_body = json.dumps({
                "ok": True,
                "token": session_token,
                "session_token": session_token,
                "user": {"id": user_row["id"], "username": user_row["username"], "role": user_row["role"], "token": user_row["user_token"] or ""}
            }, ensure_ascii=False).encode('utf-8')
            self.send_header("Content-Length", str(len(resp_body)))
            self.end_headers()
            self.wfile.write(resp_body)
            return

        # 3. 注销接口 (/api/auth/logout)
        if path == "/api/auth/logout":
            user = self.get_current_user()
            if user:
                for k, v in list(sessions.items()):
                    if v["user_id"] == user["user_id"]:
                        sessions.pop(k, None)
            self.send_response(200)
            self.send_header("Set-Cookie", "subflow_session=; Path=/; Max-Age=0")
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return

        # 4. 修改密码与个人资料 (/api/auth/change-password / /api/auth/change-profile)
        if path == "/api/auth/change-password" or path == "/api/auth/change-profile":
            user = self.get_current_user()
            if not user:
                self.send_json({"error": "Unauthorized"}, code=401)
                return
            old_pwd = body.get("old_password", "")
            new_pwd = body.get("new_password", "").strip()
            new_username = body.get("new_username", "").strip()

            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT password_hash, salt, username FROM users WHERE id = ?;", (user["user_id"],))
            row = c.fetchone()
            if not row or not verify_password(old_pwd, row["password_hash"], row["salt"]):
                conn.close()
                self.send_json({"error": "原密码不正确"}, code=400)
                return

            updates = []
            params = []
            if new_pwd:
                if len(new_pwd) < 6:
                    conn.close()
                    self.send_json({"error": "新密码至少 6 位"}, code=400)
                    return
                new_hash, new_salt = hash_password(new_pwd)
                updates.append("password_hash = ?, salt = ?")
                params.extend([new_hash, new_salt])

            updated_uname = row["username"]
            if new_username and new_username != row["username"]:
                if len(new_username) < 3:
                    conn.close()
                    self.send_json({"error": "新用户名至少 3 位"}, code=400)
                    return
                c.execute("SELECT id FROM users WHERE username = ? AND id != ?;", (new_username, user["user_id"]))
                if c.fetchone():
                    conn.close()
                    self.send_json({"error": "该用户名已被其他账号占用"}, code=409)
                    return
                updates.append("username = ?")
                params.append(new_username)
                updated_uname = new_username

            if updates:
                params.append(user["user_id"])
                c.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?;", tuple(params))
                conn.commit()
            conn.close()

            user["username"] = updated_uname
            self.send_json({"ok": True, "message": "账户资料与密码修改成功", "username": updated_uname})
            return

        # 5. 用户专属 Token 重置 (/api/user/reset-token)
        if path == "/api/user/reset-token":
            user = self.get_current_user()
            if not user:
                self.send_json({"error": "Unauthorized"}, code=401)
                return
            new_token = secrets.token_hex(32)
            with db_lock:
                conn = get_db()
                c = conn.cursor()
                c.execute("UPDATE users SET user_token = ? WHERE id = ?;", (new_token, user["user_id"]))
                conn.commit()
                conn.close()
            self.send_json({"ok": True, "new_token": new_token, "message": "已生成全新专属 Token，旧链接已全数作废"})
            return

        # 6. 生成访客阅后即焚短链 (/api/user/guest-token)
        if path == "/api/user/guest-token":
            user = self.get_current_user()
            if not user:
                self.send_json({"error": "Unauthorized"}, code=401)
                return
            hours = int(body.get("hours", 2))
            max_uses = int(body.get("max_uses", 3))
            guest_token = "guest_" + secrets.token_hex(20)
            exp_ts = int(time.time() + hours * 3600)
            with db_lock:
                conn = get_db()
                c = conn.cursor()
                c.execute("""
                INSERT INTO guest_tokens (user_id, token, max_uses, used_count, expires_at)
                VALUES (?, ?, ?, 0, ?);
                """, (user["user_id"], guest_token, max_uses, exp_ts))
                conn.commit()
                conn.close()
            self.send_json({
                "ok": True,
                "guest_token": guest_token,
                "expires_in_hours": hours,
                "max_uses": max_uses
            })
            return

        # 7. 用户订阅保存与更新 (/api/user/subscriptions)
        if path == "/api/user/subscriptions":
            user = self.get_current_user()
            if not user and RUN_MODE != "local":
                self.send_json({"error": "Unauthorized"}, code=401)
                return
            user_id = user["user_id"] if user else 1
            alias = (body.get("alias") or body.get("alias_name") or "").strip() or "未命名订阅"
            raw_url = (body.get("url") or body.get("source_url") or "").strip()
            target = (body.get("target") or body.get("target_format") or "clash").strip()
            if not raw_url:
                self.send_json({"error": "订阅链接不能为空"}, code=400)
                return
            # 密文落库
            encrypted_url = encrypt_secret(raw_url)
            with db_lock:
                conn = get_db()
                c = conn.cursor()
                c.execute("""
                INSERT INTO subscriptions (user_id, alias_name, source_url, target_format)
                VALUES (?, ?, ?, ?);
                """, (user_id, alias, encrypted_url, target))
                sub_id = c.lastrowid
                conn.commit()
                conn.close()
            self.send_json({"ok": True, "message": "订阅已安全加密保存至您的私有库", "id": sub_id, "alias": alias})
            return

        # 8. 管理员网络与域名设置 (/api/admin/network & /api/admin/config/domain)
        if path == "/api/admin/network" or path == "/api/admin/config/domain":
            user = self.get_current_user()
            if not user or user["role"] != "admin":
                self.send_json({"error": "Forbidden: Admin required"}, code=403)
                return
            if "bound_domain" in body:
                server_config["bound_domain"] = body.get("bound_domain", "").strip().rstrip("/")
            if "force_domain_redirect" in body or "force_redirect" in body:
                server_config["force_domain_redirect"] = bool(body.get("force_domain_redirect", body.get("force_redirect", False)))
            if "allow_public_register" in body:
                server_config["allow_public_register"] = bool(body.get("allow_public_register", True))
            if "tunnel_token" in body:
                server_config["tunnel_token"] = body["tunnel_token"].strip()
            if "captcha_mode" in body and body["captcha_mode"] in ["off", "internal", "turnstile"]:
                server_config["captcha_mode"] = body["captcha_mode"]
            if "turnstile_site_key" in body:
                server_config["turnstile_site_key"] = body["turnstile_site_key"].strip()
            if "turnstile_secret_key" in body:
                server_config["turnstile_secret_key"] = body["turnstile_secret_key"].strip()
            save_server_config(server_config)
            self.send_json({"ok": True, "message": "公网专属域名与网络配置已全局生效"})
            return

        # 9. 管理员用户状态管控 (/api/admin/users/status & /api/admin/user/status)
        if path == "/api/admin/users/status" or path == "/api/admin/user/status":
            user = self.get_current_user()
            if not user or user["role"] != "admin":
                self.send_json({"error": "Forbidden: Admin required"}, code=403)
                return
            target_user_id = int(body.get("user_id", 0))
            new_status = body.get("status", "active")
            if target_user_id == user["user_id"]:
                self.send_json({"error": "无法封禁当前登录的管理员自己"}, code=400)
                return
            with db_lock:
                conn = get_db()
                c = conn.cursor()
                c.execute("UPDATE users SET status = ? WHERE id = ?;", (new_status, target_user_id))
                conn.commit()
                conn.close()
            self.send_json({"ok": True, "message": f"用户状态已调整为 {new_status}"})
            return

        # 10. 全站公告发布 (/api/admin/announcement)
        if path == "/api/admin/announcement":
            user = self.get_current_user()
            if not user or user["role"] != "admin":
                self.send_json({"error": "Forbidden"}, code=403)
                return
            ann = body.get("announcement", "").strip()
            server_config["announcement"] = ann
            save_server_config(server_config)
            self.send_json({"ok": True, "message": "公告更新成功"})
            return

        
                # 11.1 管理员修改自身账密 (/api/admin/change-credentials)
        if path == "/api/admin/change-credentials":
            user = self.get_current_user()
            if not user or user["role"] != "admin":
                self.send_json({"error": "Forbidden: Requires admin privileges"}, code=403)
                return
            new_username = body.get("new_username", "").strip()
            new_password = body.get("new_password", "").strip()

            if not new_username and not new_password:
                self.send_json({"error": "新账号与新密码不能同时为空"}, code=400)
                return

            with db_lock:
                conn = get_db()
                c = conn.cursor()
                if new_username:
                    if len(new_username) < 3:
                        conn.close()
                        self.send_json({"error": "账号名称至少 3 个字符"}, code=400)
                        return
                    c.execute("SELECT id FROM users WHERE username = ? AND id != ?;", (new_username, user["id"]))
                    if c.fetchone():
                        conn.close()
                        self.send_json({"error": "该账号已被占用，请使用其他账号名"}, code=400)
                        return
                    c.execute("UPDATE users SET username = ? WHERE id = ?;", (new_username, user["id"]))

                if new_password:
                    if len(new_password) < 6:
                        conn.close()
                        self.send_json({"error": "新密码至少 6 个字符"}, code=400)
                        return
                    new_hash, new_salt = hash_password(new_password)
                    c.execute("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?;", (new_hash, new_salt, user["id"]))

                conn.commit()
                c.execute("SELECT id, username, role FROM users WHERE id = ?;", (user["id"],))
                updated_row = c.fetchone()
                conn.close()

            new_token = generate_jwt(updated_row["id"], updated_row["username"], updated_row["role"])
            self.send_json({
                "ok": True,
                "message": "管理员账号与密码已成功更新",
                "token": new_token,
                "username": updated_row["username"]
            })
            return

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

        
                    

        
        # 12. 管理员全量数据导入与用户恢复 (/api/admin/backup/import-json)
        if path == "/api/admin/backup/import-json":
            user = self.get_current_user()
            if not user or user["role"] != "admin":
                self.send_json({"error": "Forbidden"}, code=403)
                return
            payload = body.get("data") if "data" in body else body
            # 如果是顶层数组，视为直接导入用户列表
            if isinstance(payload, list):
                users_list = payload
                subs_list = []
                cfg = {}
            elif isinstance(payload, dict):
                users_list = payload.get("users", [])
                subs_list = payload.get("subscriptions", [])
                cfg = payload.get("server_config", {})
            else:
                self.send_json({"error": "无效的备份数据格式"}, code=400)
                return

            imported_users = 0
            imported_subs = 0

            with db_lock:
                conn = get_db()
                try:
                    c = conn.cursor()
                    user_id_map = {}
                    for u in users_list:
                        uname = u.get("username", "").strip()
                        if not uname:
                            continue
                        p_hash = u.get("password_hash")
                        salt = u.get("salt")
                        if not p_hash or not salt:
                            raw_pwd = u.get("password", "123456")
                            p_hash, salt = hash_password(raw_pwd)
                        u_token = u.get("user_token") or secrets.token_hex(32)
                        role = u.get("role", "user")
                        status = u.get("status", "active")

                        c.execute("SELECT id FROM users WHERE username = ?;", (uname,))
                        exist_u = c.fetchone()
                        if exist_u:
                            uid = exist_u["id"]
                            c.execute("UPDATE users SET password_hash = ?, salt = ?, role = ?, status = ? WHERE id = ?;", (p_hash, salt, role, status, uid))
                        else:
                            c.execute("""
                            INSERT INTO users (username, password_hash, salt, user_token, role, status)
                            VALUES (?, ?, ?, ?, ?, ?);
                            """, (uname, p_hash, salt, u_token, role, status))
                            uid = c.lastrowid
                            imported_users += 1
                        user_id_map[uname] = uid

                    for s in subs_list:
                        uname = s.get("username", "")
                        uid = user_id_map.get(uname) or user["user_id"]
                        source_url = s.get("source_url", "").strip()
                        if not source_url:
                            continue
                        alias = s.get("alias_name", "导入订阅")
                        fmt = s.get("target_format", "clash")
                        c.execute("""
                        INSERT INTO subscriptions (user_id, alias_name, source_url, target_format)
                        VALUES (?, ?, ?, ?);
                        """, (uid, alias, source_url, fmt))
                        imported_subs += 1

                    conn.commit()
                except Exception as ex:
                    conn.rollback()
                    conn.close()
                    self.send_json({"error": f"导入失败已安全回滚: {str(ex)}"}, code=500)
                    return
                conn.close()

            if isinstance(cfg, dict) and cfg.get("bound_domain"):
                server_config["bound_domain"] = cfg["bound_domain"]
                save_server_config(server_config)

            self.send_json({
                "ok": True,
                "imported_users": imported_users,
                "imported_subs": imported_subs,
                "message": f"成功导入 {imported_users} 个用户，{imported_subs} 条订阅！"
            })
            return

        # 管理员专属: 检查远程更新 (/api/admin/system/check-update)
        if path == "/api/admin/system/check-update":
            user = self.get_current_user()
            if not user or user["role"] != "admin":
                self.send_json({"error": "Forbidden: Admin required"}, code=403)
                return
            repo_url = body.get("git_repo", server_config.get("git_repo", "")).strip()
            if repo_url:
                server_config["git_repo"] = repo_url
                save_server_config(server_config)

            is_git = os.path.exists(os.path.join(BASE_DIR, ".git"))
            log_output = []
            has_update = False
            remote_info = ""

            if is_git:
                try:
                    p = subprocess.run(["git", "fetch", "--dry-run"], cwd=BASE_DIR, capture_output=True, text=True, timeout=8)
                    log_output.append(p.stdout or p.stderr or "Git fetch check completed.")
                    p_diff = subprocess.run(["git", "status", "-uno"], cwd=BASE_DIR, capture_output=True, text=True, timeout=5)
                    status_text = p_diff.stdout
                    log_output.append(status_text)
                    if "behind" in status_text or "Your branch is behind" in status_text:
                        has_update = True
                        remote_info = "检测到远程 Git 仓库存在新版本提交！"
                    else:
                        remote_info = "当前代码已是最新版本。"
                except Exception as ex:
                    log_output.append(f"Git 检测异常: {str(ex)}")
            else:
                remote_info = f"云端处于自包含独立发布包部署模式。已连接配置更新源: {repo_url or '默认源'}"
                log_output.append("服务器处于极简独立运行模式，支持通过 Git 同步或本地一键推送程序 3 秒热升级。")

            self.send_json({
                "ok": True,
                "has_update": has_update,
                "remote_info": remote_info,
                "log": "\n".join(log_output)
            })
            return

        # 管理员专属: 执行一键热升级覆盖 (/api/admin/system/upgrade)
        if path == "/api/admin/system/upgrade":
            user = self.get_current_user()
            if not user or user["role"] != "admin":
                self.send_json({"error": "Forbidden: Admin required"}, code=403)
                return
            
            repo_url = body.get("git_repo", server_config.get("git_repo", "")).strip()
            is_git = os.path.exists(os.path.join(BASE_DIR, ".git"))
            upgrade_logs = []

            if is_git:
                try:
                    upgrade_logs.append("[Step 1] 正在同步远程代码...")
                    p_pull = subprocess.run(["git", "pull", "--rebase", "origin", "main"], cwd=BASE_DIR, capture_output=True, text=True, timeout=20)
                    upgrade_logs.append(p_pull.stdout or p_pull.stderr or "代码已同步。")
                except Exception as ex:
                    upgrade_logs.append(f"Git 拉取异常: {str(ex)}")
            else:
                upgrade_logs.append("[Notice] 当前为自包含独立部署，已确认数据目录与用户专属域名物理隔离保护。")

            # 触发 systemd 平滑热重启 (异步延迟触发，保证当前 HTTP 响应安全送达前端)
            def do_async_restart():
                time.sleep(1.2)
                try:
                    subprocess.run(["systemctl", "restart", "subflow.service"], timeout=5)
                except Exception:
                    pass
            threading.Thread(target=do_async_restart, daemon=True).start()

            self.send_json({
                "ok": True,
                "message": "更新指令已触发！服务正在平滑重载，页面将在 3 秒后自动重新加载...",
                "log": "\n".join(upgrade_logs)
            })
            return

        self.send_error(404, "Endpoint not found")

    # ==========================================================================
    # 9. DELETE 请求处理 (删除订阅)
    # ==========================================================================
    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path.startswith("/api/user/subscriptions/"):
            user = self.get_current_user()
            if not user and RUN_MODE != "local":
                self.send_json({"error": "Unauthorized"}, code=401)
                return
            user_id = user["user_id"] if user else 1
            try:
                sub_id = int(path.split("/")[-1])
            except ValueError:
                self.send_json({"error": "Invalid ID"}, code=400)
                return
            with db_lock:
                conn = get_db()
                c = conn.cursor()
                c.execute("DELETE FROM subscriptions WHERE id = ? AND user_id = ?;", (sub_id, user_id))
                conn.commit()
                conn.close()
            self.send_json({"ok": True, "message": "订阅已删除"})
            return
        self.send_error(404)

    # ==========================================================================
    # 10. 核心订阅分发与上游容灾兜底 (/sub)
    # ==========================================================================
    def handle_sub_request(self, query: str, client_ip: str):
        # 速率限制防刷
        if not check_rate_limit(client_ip, max_per_sec=8):
            self.send_error(429, "Too Many Requests")
            return

        params = urllib.parse.parse_qs(query)
        target_format = params.get("target", ["clash"])[0].lower()

        # 智能感知客户端生态与目标协议 (Client Auto-Sensing)
        if target_format == "auto":
            ua_lower = (self.headers.get("User-Agent") or "").lower()
            if any(k in ua_lower for k in ["clash", "meta", "mihomo", "stash", "flclash"]):
                target_format = "clash"
            elif any(k in ua_lower for k in ["sing-box", "nekobox", "sfa"]):
                target_format = "singbox"
            elif any(k in ua_lower for k in ["v2ray", "xray", "shadowrocket", "quantumult"]):
                target_format = "mixed"
            else:
                target_format = "clash"

        # 1. 验证 Token (在 cloud 模式下，私有分发需携带 token；若携带 url= 则是万能转换与客户端直连，彻底放行免 403)
        user_id = None
        is_guest = False
        guest_id = None
        has_direct_url = "url" in params and any(params["url"])

        if RUN_MODE == "cloud":
            token = params.get("token", [""])[0].strip()
            if not token:
                if not has_direct_url:
                    self.send_response(403)
                    self.send_header("Content-Type", "text/plain; charset=utf-8")
                    self.end_headers()
                    self.wfile.write("403 Forbidden: Missing subscription token. Please copy your private link from SubFlow dashboard.".encode('utf-8'))
                    return
            else:
                conn = get_db()
                c = conn.cursor()
                # 查正式用户 token
                c.execute("SELECT id, status FROM users WHERE user_token = ?;", (token,))
                user_row = c.fetchone()
                if user_row:
                    if user_row["status"] == "frozen":
                        conn.close()
                        self.send_error(403, "Forbidden: Account suspended")
                        return
                    user_id = user_row["id"]
                else:
                    # 查访客 token
                    c.execute("SELECT id, user_id, max_uses, used_count, expires_at FROM guest_tokens WHERE token = ?;", (token,))
                    g_row = c.fetchone()
                    if g_row:
                        now = int(time.time())
                        if g_row["expires_at"] < now or g_row["used_count"] >= g_row["max_uses"]:
                            conn.close()
                            self.send_error(410, "Gone: Disposable guest token expired or exceeded max uses")
                            return
                        user_id = g_row["user_id"]
                        is_guest = True
                        guest_id = g_row["id"]
                    elif not has_direct_url:
                        conn.close()
                        self.send_error(403, "Forbidden: Invalid token")
                        return
                conn.close()
        else:
            user_id = 1

        # 2. 从数据库提取该用户的所有订阅 (若为免鉴权单次万能转换则直接使用直传 url)
        source_urls = []
        if user_id is not None:
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT source_url FROM subscriptions WHERE user_id = ?;", (user_id,))
            subs_rows = c.fetchall()
            conn.close()
            for r in subs_rows:
                plain = decrypt_secret(r["source_url"])
                if plain:
                    source_urls.append(plain)

        # 兼容直传 url 参数 (如单次转换)
        if "url" in params:
            source_urls.extend(params["url"])

        if not source_urls:
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write("# SubFlow: 您的私有订阅库暂未添加任何节点链接\nproxies: []\n".encode('utf-8'))
            return

        composite_url = "|".join(source_urls)

        # 3. 构造请求向 subconverter:25500 发起转换
        sub_query = {
            "target": target_format,
            "url": composite_url,
            "udp": "true",
            "scv": "true"
        }
        for k in ["config", "include", "exclude", "emoji", "list"]:
            if k in params:
                sub_query[k] = params[k][0]

        target_core_url = f"{CORE_URL}/sub?{urllib.parse.urlencode(sub_query)}"
        u_tag = f"user_{user_id}" if user_id is not None else "direct_" + hashlib.md5(composite_url.encode()).hexdigest()[:12]
        snapshot_file = os.path.join(CACHE_DIR, f"{u_tag}_{target_format}.snapshot")

        try:
            req = urllib.request.Request(target_core_url)
            if "User-Agent" in self.headers:
                req.add_header("User-Agent", self.headers["User-Agent"])
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                data = resp.read()
                # 校验核心返回内容是否包含假节点或拦截页
                if NativeSubEngine.is_invalid_upstream_response(data.decode('utf-8', errors='ignore')):
                    raise ValueError("C++ core returned dummy node or intercepted payload")
                # 写入成功容灾快照
                try:
                    with open(snapshot_file, "wb") as f:
                        f.write(data)
                except Exception:
                    pass

                # 若是访客 Token，递增计数
                if is_guest and guest_id:
                    with db_lock:
                        con = get_db()
                        con.execute("UPDATE guest_tokens SET used_count = used_count + 1 WHERE id = ?;", (guest_id,))
                        con.commit()
                        con.close()

                self.send_response(200)
                for h, val in resp.getheaders():
                    if h.lower() not in ["server", "date", "transfer-encoding"]:
                        self.send_header(h, val)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(data)
                return

        except Exception as ex:
            # 智能原生无损转换引擎 (Native Lossless Fallback Engine)
            # 当外部 subconverter 抛出异常 (如 400 No nodes were found，不支持 VLESS 协议)，
            # 立即启动 1:1 复刻自 C# 客户端的高性能原生自适应转换引擎
            client_ua = self.headers.get("User-Agent", "")
            try:
                native_data, native_mime, native_uinfo = NativeSubEngine.convert(source_urls, target_format, client_ua)
                if native_data:
                    try:
                        with open(snapshot_file, "wb") as f:
                            f.write(native_data)
                    except Exception:
                        pass

                    if is_guest and guest_id:
                        with db_lock:
                            con = get_db()
                            con.execute("UPDATE guest_tokens SET used_count = used_count + 1 WHERE id = ?;", (guest_id,))
                            con.commit()
                            con.close()

                    self.send_response(200)
                    self.send_header("Content-Type", native_mime or "text/plain; charset=utf-8")
                    if native_uinfo:
                        self.send_header("Subscription-Userinfo", native_uinfo)
                    self.send_header("profile-update-interval", "24")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.send_header("Access-Control-Expose-Headers", "Subscription-Userinfo, profile-update-interval, Content-Disposition")
                    self.send_header("X-SubFlow-Engine", "Native-Lossless-Converter")
                    self.end_headers()
                    self.wfile.write(native_data)
                    return
            except Exception as native_ex:
                sys.stdout.write(f"[NativeSubEngine Error] {str(native_ex)}\n")

            # 容灾兜底: 上游超时/断网，自动回退离线快照
            if os.path.exists(snapshot_file):
                try:
                    with open(snapshot_file, "rb") as f:
                        cached_data = f.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "text/plain; charset=utf-8")
                    self.send_header("X-SubFlow-Fallback", "true")
                    self.end_headers()
                    fallback_banner = b"# [SubFlow Fallback] \xe4\xb8\x8a\xe6\xb8\xb8\xe6\x9c\xba\xe5\x9c\xba\xe6\x9a\x82\xe6\x97\xb6\xe7\xa6\xbb\xe7\xba\xbf\xef\xbc\x8c\xe5\xb7\xb2\xe5\x90\xaf\xe7\x94\xa8\xe7\xa6\xbb\xe7\xba\xbf\xe5\xbf\xab\xe7\x85\xa7\xe5\x85\x9c\xe5\xba\x95\xe4\xbf\x9d\xe8\xaf\x81\xe6\x82\xa8\xe4\xb8\x8d\xe6\x96\xad\xe7\xbd\x91\n"
                    self.wfile.write(fallback_banner + cached_data)
                    return
                except Exception:
                    pass

            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(f"502 Bad Gateway: Subconverter core or upstream airport unavailable ({str(ex)})".encode('utf-8'))

    def serve_file(self, filepath, content_type):
        if not os.path.exists(filepath):
            self.send_error(404, "File Not Found")
            return
        try:
            with open(filepath, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-cache, must-revalidate")
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, str(e))

def run():
    server_address = ("0.0.0.0", LISTEN_PORT)
    httpd = ThreadingHTTPServer(server_address, SubFlowGatewayHandler)
    print("=" * 64)
    print(f"  {__product__} v{__version__} is ONLINE")
    print(f"  Run Mode   : {RUN_MODE.upper()}")
    print(f"  Port       : {LISTEN_PORT}")
    print(f"  External IP: {CACHED_PUBLIC_IP}")
    print(f"  Local Web  : http://127.0.0.1:{LISTEN_PORT}")
    print(f"  Core Target: {CORE_URL}")
    print(f"  Database   : {DB_FILE}")
    print("=" * 64)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping SubFlow Gateway...")
        httpd.server_close()

if __name__ == "__main__":
    run()
