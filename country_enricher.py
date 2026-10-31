# -*- coding: utf-8 -*-
"""
SubFlow 节点国家智能识别与富集中间件 (Country Enricher)

功能与规则：
1. 第一遍同步检测：
   若节点名称已包含中文国家/地区关键词（如“香港”、“日本”、“美国”、“新加坡”等）或国旗 Emoji，
   100% 保持原名，绝不重复添加。
2. 第二遍自动补全：
   若第一遍未检测到国家信息（如“CF官方优选7”、“CF官方优选8”等），
   自动提取节点服务器 Host/IP，通过 GeoIP 数据库、纯真库或 Cloudflare / CDN 优选网段识别，
   精准补齐对应国旗与中文国家前缀（如：“🇺🇸 美国 - CF官方优选7”）。
3. 支持 Clash YAML、Base64 单链接列表 (v2rayN / Shadowrocket / Quantumult X) 等全生态客户端。
"""

import re
import json
import base64
import urllib.parse
import urllib.request
import concurrent.futures
import time
import os
import sys

# 国旗 Emoji 匹配
FLAG_REGEX = re.compile(r'[\U0001F1E6-\U0001F1FF]{2}')

# 常见国家及地区中文关键词库 (第一遍判定命中即放行)
COUNTRY_KEYWORDS = [
    '🇭🇰', '🇨🇳', '🇹🇼', '🇯🇵', '🇰🇷', '🇸🇬', '🇺🇸', '🇨🇦', '🇬🇧', '🇩🇪', '🇫🇷', '🇦🇺',
    '🇷🇺', '🇳🇱', '🇮🇳', '🇲🇾', '🇹🇭', '🇵🇭', '🇻🇳', '🇮🇩', '🇹🇷', '🇦🇷', '🇧🇷', '🇿🇦',
    '🇸🇪', '🇨🇭', '挪威', '芬兰', '波兰', '乌克兰',
    '香港', '台湾', '台北', '日本', '东京', '大阪', '韩国', '首尔', '新加坡', '狮城',
    '美国', '洛杉矶', '圣何塞', '西雅图', '加拿大', '温哥华', '英国', '伦敦', '德国',
    '法兰克福', '法国', '巴黎', '澳大利亚', '澳洲', '悉尼', '俄罗斯', '莫斯科', '荷兰',
    '阿姆斯特丹', '印度', '孟买', '马来西亚', '泰国', '曼谷', '菲律宾', '越南', '印尼',
    '印度尼西亚', '土耳其', '阿根廷', '巴西', '南非', '瑞典', '瑞士', '专线', 'IEPL', 'IPLC',
    '广港', '沪日', '京德', '深港', '沪韩'
]

# 英文地区代码匹配 (带词边界或分隔符，防止误伤普通单词)
CODE_REGEX = re.compile(r'(?i)(?:\b|_|-)(?:HK|TW|JP|KR|SG|US|CA|UK|GB|DE|FR|AU|RU|NL|IN|MY|TH|PH|VN|ID|TR|AR|BR|ZA|SE|CH|NO|FI|PL|UA)(?:\b|_|-|\d)')

# 常见国家代码到国旗与中文名的映射
COUNTRY_CODE_MAP = {
    'HK': ('🇭🇰', '香港'),
    'CN': ('🇨🇳', '中国'),
    'TW': ('🇹🇼', '台湾'),
    'JP': ('🇯🇵', '日本'),
    'KR': ('🇰🇷', '韩国'),
    'SG': ('🇸🇬', '新加坡'),
    'US': ('🇺🇸', '美国'),
    'CA': ('🇨🇦', '加拿大'),
    'GB': ('🇬🇧', '英国'),
    'UK': ('🇬🇧', '英国'),
    'DE': ('🇩🇪', '德国'),
    'FR': ('🇫🇷', '法国'),
    'AU': ('🇦🇺', '澳大利亚'),
    'RU': ('🇷🇺', '俄罗斯'),
    'NL': ('🇳🇱', '荷兰'),
    'IN': ('🇮🇳', '印度'),
    'MY': ('🇲🇾', '马来西亚'),
    'TH': ('🇹🇭', '泰国'),
    'PH': ('🇵🇭', '菲律宾'),
    'VN': ('🇻🇳', '越南'),
    'ID': ('🇮🇩', '印尼'),
    'TR': ('🇹🇷', '土耳其'),
    'AR': ('🇦🇷', '阿根廷'),
    'BR': ('🇧🇷', '巴西'),
    'SE': ('🇸🇪', '瑞典'),
    'CH': ('🇨🇭', '瑞士'),
    'NO': ('🇳🇴', '挪威'),
    'FI': ('🇫🇮', '芬兰'),
    'PL': ('🇵🇱', '波兰'),
    'UA': ('🇺🇦', '乌克兰'),
    'ZA': ('🇿🇦', '南非'),
}

# 内存快速缓存
_GEOIP_MEM_CACHE = {}

def has_country_info(name: str) -> bool:
    """
    第一遍同步判定：
    检查节点名称是否已经含有中文国家、国旗 Emoji 或标准大写代码。
    若含有，返回 True，表示无需额外添加。
    """
    if not name:
        return False
    name = name.strip()
    if FLAG_REGEX.search(name):
        return True
    if any(k in name for k in COUNTRY_KEYWORDS):
        return True
    if CODE_REGEX.search(name):
        return True
    return False

def resolve_single_host(host: str) -> tuple:
    """单个 Host / IP 归属地判定 (优先内存缓存与已知网段)"""
    if not host or host in ['127.0.0.1', 'localhost', '::1']:
        return ('🇺🇸', '美国')
    
    if host in _GEOIP_MEM_CACHE:
        return _GEOIP_MEM_CACHE[host]

    low_host = host.lower()

    # 1. 域名关键词预判定
    for code, (fl, cn) in COUNTRY_CODE_MAP.items():
        low_c = code.lower()
        if f"-{low_c}." in low_host or f".{low_c}." in low_host or low_host.startswith(f"{low_c}."):
            _GEOIP_MEM_CACHE[host] = (fl, cn)
            return (fl, cn)

    # 2. Cloudflare Anycast / 官方优选 IP 网段识别
    cf_prefixes = [
        '104.16.', '104.17.', '104.18.', '104.19.', '104.20.', '104.21.', '104.22.',
        '104.23.', '104.24.', '104.25.', '104.26.', '104.27.', '104.28.', '104.29.',
        '104.30.', '104.31.', '172.64.', '172.65.', '172.66.', '172.67.', '172.68.',
        '172.69.', '172.70.', '172.71.', '162.158.', '162.159.', '198.41.', '197.234.',
        '188.114.', '190.93.', '108.162.', '131.0.72.', '141.101.'
    ]
    if any(host.startswith(pfx) for pfx in cf_prefixes) or 'cloudflare' in low_host or 'workers.dev' in low_host or 'pages.dev' in low_host:
        val = ('🇺🇸', '美国')
        _GEOIP_MEM_CACHE[host] = val
        return val

    # 3. 在线接口查询 (限时防阻塞)
    try:
        url = f"http://ip-api.com/json/{host}?fields=countryCode"
        req = urllib.request.Request(url, headers={'User-Agent': 'curl/7.88'})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            cc = data.get('countryCode', '')
            if cc in COUNTRY_CODE_MAP:
                val = COUNTRY_CODE_MAP[cc]
                _GEOIP_MEM_CACHE[host] = val
                return val
    except Exception:
        pass

    # 兜底
    val = ('🇺🇸', '美国')
    _GEOIP_MEM_CACHE[host] = val
    return val

def batch_resolve_geoip_fast(hosts: list) -> dict:
    """并发批量解析 Host / IP 归属地"""
    result = {}
    missing = set()

    for h in hosts:
        if not h or h in ['127.0.0.1', 'localhost', '::1']:
            continue
        if h in _GEOIP_MEM_CACHE:
            result[h] = _GEOIP_MEM_CACHE[h]
        else:
            missing.add(h)

    if missing:
        with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
            future_to_host = {executor.submit(resolve_single_host, h): h for h in missing}
            for fut in concurrent.futures.as_completed(future_to_host, timeout=2.0):
                h = future_to_host[fut]
                try:
                    res = fut.result()
                    result[h] = res
                    _GEOIP_MEM_CACHE[h] = res
                except Exception:
                    result[h] = ('🇺🇸', '美国')

    return result

def enrich_node_name_fast(orig_name: str, host: str, geo_map: dict = None) -> str:
    """
    两遍同步判定核心函数：
    1. 第一遍：若已有中文国家或国旗，直接返回原名；
    2. 第二遍：若无国家，自动通过 GeoIP / 优选网段识别并追加前缀。
    """
    if not orig_name:
        orig_name = "Node"
    orig_name = orig_name.strip()
    if has_country_info(orig_name):
        return orig_name
    
    if geo_map and host in geo_map:
        flag, cname = geo_map[host]
    else:
        flag, cname = resolve_single_host(host)

    return f"{flag} {cname} - {orig_name}"

def enrich_base64_payload(data: bytes) -> bytes:
    """针对 Base64 / 单节点链接订阅执行两遍国家名称识别与补充"""
    try:
        raw_text = data.decode('utf-8', errors='ignore').strip()
        missing = len(raw_text) % 4
        if missing:
            raw_text += '=' * (4 - missing)
        decoded = base64.b64decode(raw_text).decode('utf-8', errors='ignore')
        lines = [l.strip() for l in decoded.splitlines() if l.strip()]
        if not lines or not any('://' in l for l in lines):
            return data
    except Exception:
        return data

    entries = []
    hosts_to_resolve = set()

    for line in lines:
        if line.startswith(('vless://', 'trojan://', 'hysteria2://', 'hy2://', 'tuic://', 'anytls://')):
            parts = line.split('#', 1)
            orig_name = urllib.parse.unquote(parts[1]) if len(parts) > 1 else ''
            m = re.search(r'@([^:/?#]+)', parts[0])
            host = m.group(1) if m else ''
            entries.append(('url_hash', line, orig_name, host, parts[0]))
            if not has_country_info(orig_name) and host:
                hosts_to_resolve.add(host)
        elif line.startswith('ss://'):
            parts = line.split('#', 1)
            orig_name = urllib.parse.unquote(parts[1]) if len(parts) > 1 else ''
            main = parts[0][5:]
            host = ''
            if '@' in main:
                m = re.search(r'@([^:/?#]+)', main)
                if m: host = m.group(1)
            else:
                b64 = main.split('?')[0]
                m_b64 = len(b64) % 4
                if m_b64: b64 += '=' * (4 - m_b64)
                try:
                    dec = base64.b64decode(b64).decode('utf-8', errors='ignore')
                    if '@' in dec: host = dec.split('@', 1)[1].split(':', 1)[0]
                except Exception:
                    pass
            entries.append(('ss', line, orig_name, host, parts[0]))
            if not has_country_info(orig_name) and host:
                hosts_to_resolve.add(host)
        elif line.startswith('vmess://'):
            b64_v = line[8:]
            m_v = len(b64_v) % 4
            if m_v: b64_v += '=' * (4 - m_v)
            try:
                v_obj = json.loads(base64.b64decode(b64_v).decode('utf-8', errors='ignore'))
                orig_name = v_obj.get('ps', '')
                host = v_obj.get('add', '')
                entries.append(('vmess', line, orig_name, host, v_obj))
                if not has_country_info(orig_name) and host:
                    hosts_to_resolve.add(host)
            except Exception:
                entries.append(('raw', line, '', '', None))
        else:
            entries.append(('raw', line, '', '', None))

    geo_map = batch_resolve_geoip_fast(list(hosts_to_resolve))

    new_lines = []
    for kind, raw_line, orig_name, host, extra in entries:
        if kind == 'raw':
            new_lines.append(raw_line)
            continue
        # 第一遍：已有国家中文或国旗，直接保留原名
        if has_country_info(orig_name):
            new_lines.append(raw_line)
            continue
        # 第二遍：自动补齐国家与国旗
        flag, cname = geo_map.get(host, ('🇺🇸', '美国'))
        new_name = f"{flag} {cname} - {orig_name}" if orig_name else f"{flag} {cname} 节点"
        if kind in ('url_hash', 'ss'):
            new_lines.append(f"{extra}#{urllib.parse.quote(new_name)}")
        elif kind == 'vmess':
            extra['ps'] = new_name
            new_lines.append('vmess://' + base64.b64encode(json.dumps(extra, ensure_ascii=False).encode('utf-8')).decode('utf-8'))

    return base64.b64encode('\n'.join(new_lines).encode('utf-8'))

def enrich_yaml_payload(data: bytes) -> bytes:
    """针对 Clash YAML 订阅文本执行两遍国家名称识别与补充"""
    try:
        raw_text = data.decode('utf-8', errors='ignore')
        if 'proxies:' not in raw_text:
            return data
    except Exception:
        return data

    replacements = {}
    hosts_to_resolve = set()
    found_proxies = []

    # 1. Flow matches: - {name: ..., server: ...}
    for m in re.finditer(r'-\s*\{([^}]+)\}', raw_text):
        c = m.group(1)
        nm = re.search(r'name:\s*[\'"]?([^\'",\n\r]+)[\'"]?', c)
        sm = re.search(r'server:\s*[\'"]?([^\'",\n\r]+)[\'"]?', c)
        if nm and sm:
            n = nm.group(1).strip()
            s = sm.group(1).strip()
            found_proxies.append((n, s))
            if not has_country_info(n) and s:
                hosts_to_resolve.add(s)

    # 2. Block matches:
    # - name: ...
    #   server: ...
    for m in re.finditer(r'-\s+name:\s*[\'"]?([^\'",\n\r]+)[\'"]?\s*\n\s+server:\s*[\'"]?([^\'",\n\r]+)[\'"]?', raw_text):
        n = m.group(1).strip()
        s = m.group(2).strip()
        found_proxies.append((n, s))
        if not has_country_info(n) and s:
            hosts_to_resolve.add(s)

    geo_map = batch_resolve_geoip_fast(list(hosts_to_resolve))

    for name, server in found_proxies:
        if not has_country_info(name):
            flag, cname = geo_map.get(server, ('🇺🇸', '美国'))
            new_name = f"{flag} {cname} - {name}"
            replacements[name] = new_name

    if not replacements:
        return data

    out_text = raw_text
    for old_name, new_name in replacements.items():
        pattern1 = re.compile(rf'(\bname:\s*[\'"]?){re.escape(old_name)}([\'"]?[\s,\n\r])')
        out_text = pattern1.sub(rf'\g<1>{new_name}\g<2>', out_text)
        pattern2 = re.compile(rf'(\n\s*-\s*[\'"]?){re.escape(old_name)}([\'"]?[\s,\n\r])')
        out_text = pattern2.sub(rf'\g<1>{new_name}\g<2>', out_text)

    return out_text.encode('utf-8')

def enrich_subscription_payload(data: bytes, target_format: str = "") -> bytes:
    """全格式两遍同步过滤中间件"""
    if not data:
        return data
    try:
        # Clash YAML 格式
        if b"proxies:" in data or b"proxy-groups:" in data:
            return enrich_yaml_payload(data)
        # Base64 节点格式
        try:
            trimmed = data.strip()
            missing = len(trimmed) % 4
            if missing:
                trimmed += b"=" * (4 - missing)
            dec = base64.b64decode(trimmed).decode('utf-8', errors='ignore')
            if any(proto in dec for proto in ['vless://', 'vmess://', 'trojan://', 'ss://', 'hysteria2://', 'hy2://', 'tuic://', 'anytls://']):
                return enrich_base64_payload(data)
        except Exception:
            pass
    except Exception as e:
        sys.stdout.write(f"[enrich_subscription_payload Warning] {e}\n")
    return data
