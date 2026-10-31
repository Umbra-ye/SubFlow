# -*- coding: utf-8 -*-
"""
SubFlow GitHub 极速增量脱敏同步工具 (支持 Umbra-ye 身份签名与 Conventional Commits 规范)
"""
import os
import sys
import json
import base64
import urllib.request
import urllib.error
from datetime import datetime, timezone

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

EXCLUDE_DIRS = {
    '.git', '.gemini', '.system_generated', '__pycache__', 
    'cache', 'logs', 'temp', 'tmp', 'data', 'backups',
    'venv', '.venv', 'env', 'node_modules', 'bin'
}

EXCLUDE_EXTS = {
    '.pyc', '.pyo', '.pyd', '.db', '.sqlite', '.sqlite3',
    '.log', '.tmp', '.bak', '.swp', '.user', '.suo'
}

EXCLUDE_FILES = {
    'subflow.db', 'users.db', 'traffic.db',
    'cloudflared.exe', 'temp_test.js', 'temp_test.py'
}

MAX_FILE_SIZE = 25 * 1024 * 1024

def read_file_bytes(filepath):
    with open(filepath, 'rb') as f:
        return f.read()

def is_text_file(filepath):
    ext = os.path.splitext(filepath)[1].lower()
    text_exts = {
        '.py', '.html', '.css', '.js', '.json', '.md', '.txt', 
        '.sh', '.ps1', '.yml', '.yaml', '.ini', '.conf', '.cs',
        '.gitignore', '.toml', '.xml'
    }
    return ext in text_exts

def get_clean_files(root_dir):
    file_list = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS and not d.startswith('.')]
        
        rel_dir = os.path.relpath(dirpath, root_dir)
        if rel_dir == 'tools':
            filenames = [f for f in filenames if f in {
                'deploy_to_cloud.py', 'push_to_github.py', 'inspect_users.py'
            }]

        for f in filenames:
            if f in EXCLUDE_FILES or f.startswith('.'):
                continue
            ext = os.path.splitext(f)[1].lower()
            if ext in EXCLUDE_EXTS:
                continue
            
            full_path = os.path.join(dirpath, f)
            rel_path = os.path.relpath(full_path, root_dir).replace('\\', '/')
            
            size = os.path.getsize(full_path)
            if size > MAX_FILE_SIZE:
                continue
                
            file_list.append((rel_path, full_path, size))
            
    return file_list

def github_api_request(url, token, data=None, method='GET'):
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SubFlow-Deployment-Agent'
    }
    encoded_data = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))

def push_to_github(repo='Umbra-ye/SubFlow', token='', commit_message=None):
    if not commit_message:
        commit_message = (
            "feat: 升级独立合并订阅页、修复导航文字并优化门禁微晶等高\n\n"
            "- web/index.html:\n"
            "  * 升级顶部三段式流体导航 (万能转换 / 合并订阅 / 历史与测活 全部完整呈现)\n"
            "  * 新增独立合并订阅中心 (支持多行多源输入、历史快速点选与一键生成)\n"
            "  * 历史订阅支持点击铅笔图标与双击就地重命名 (LocalStorage 持久化)\n"
            "  * 测活周期全面升级为「小时」时间单位\n"
            "  * 登录门禁 Tab 全面升级为 2026 Liquid Glass 极简微晶滑块\n"
            "  * 门禁卡片锁定 520px 统一黄金等高，消除切换登录与注册时的高度跳动\n"
            "- country_enricher.py: 强化两遍国家识别与国旗前缀富集引擎\n"
            "- gateway.py: 挂载全平台客户端自适应与国家识别钩子"
        )

    print(f"[INFO] 目标仓库: {repo}")
    api_base = f"https://api.github.com/repos/{repo}"
    
    # 1. 获取默认分支与最新 Commit
    repo_info = github_api_request(api_base, token)
    default_branch = repo_info.get('default_branch', 'main')
    print(f"[SUCCESS] 仓库鉴权成功，默认分支: {default_branch}")
    
    ref_info = github_api_request(f"{api_base}/git/ref/heads/{default_branch}", token)
    parent_commit_sha = ref_info['object']['sha']
    parent_commit = github_api_request(f"{api_base}/git/commits/{parent_commit_sha}", token)
    base_tree_sha = parent_commit['tree']['sha']

    # 获取远程已有 Tree 中的 blobs 映射 (rel_path -> sha)，实现毫秒级增量比对
    print("[INFO] 正在拉取远程目录树结构进行增量计算...")
    base_tree_info = github_api_request(f"{api_base}/git/trees/{base_tree_sha}?recursive=1", token)
    remote_tree_map = {item['path']: item['sha'] for item in base_tree_info.get('tree', []) if item['type'] == 'blob'}
    
    # 2. 收集本地文件
    clean_files = get_clean_files(PROJECT_ROOT)
    print(f"[SUCCESS] 审查通过，共有 {len(clean_files)} 个纯净源码文件准备比对")
    
    # 3. 极速增量上传：只上传修改过的 Blobs
    tree_items = []
    uploaded_count = 0
    reused_count = 0

    import hashlib
    def git_sha1(data_bytes):
        header = f"blob {len(data_bytes)}\0".encode('ascii')
        return hashlib.sha1(header + data_bytes).hexdigest()

    for idx, (rel_path, full_path, size) in enumerate(clean_files, 1):
        content_bytes = read_file_bytes(full_path)
        local_sha = git_sha1(content_bytes)

        if rel_path in remote_tree_map and remote_tree_map[rel_path] == local_sha:
            # 远程已有且内容 100% 相同，直接复用 SHA，0 网络传输耗时
            tree_items.append({
                "path": rel_path,
                "mode": "100644",
                "type": "blob",
                "sha": local_sha
            })
            reused_count += 1
        else:
            # 文件有变动，上传新 Blob
            if is_text_file(full_path):
                try:
                    content_str = content_bytes.decode('utf-8')
                    blob_payload = {"content": content_str, "encoding": "utf-8"}
                except UnicodeDecodeError:
                    blob_payload = {"content": base64.b64encode(content_bytes).decode('ascii'), "encoding": "base64"}
            else:
                blob_payload = {"content": base64.b64encode(content_bytes).decode('ascii'), "encoding": "base64"}
                
            blob_resp = github_api_request(f"{api_base}/git/blobs", token, data=blob_payload, method='POST')
            tree_items.append({
                "path": rel_path,
                "mode": "100644",
                "type": "blob",
                "sha": blob_resp['sha']
            })
            uploaded_count += 1
            print(f"[INFO]   + 增量更新: {rel_path} -> {blob_resp['sha'][:8]}")

    print(f"[SUCCESS] 增量比对完成：上传变更 {uploaded_count} 个文件，极速复用 {reused_count} 个未改动文件")
            
    # 4. 构建 Tree
    print("[INFO] 正在构建 Git 目录树 (Tree)...")
    tree_payload = {
        "base_tree": base_tree_sha,
        "tree": tree_items
    }
    tree_resp = github_api_request(f"{api_base}/git/trees", token, data=tree_payload, method='POST')
    new_tree_sha = tree_resp['sha']
    
    # 5. 创建带 Umbra-ye 签名的 Commit
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    author_meta = {
        "name": "Umbra",
        "email": "321832347+Umbra-ye@users.noreply.github.com",
        "date": now_iso
    }

    title_line = commit_message.strip().split('\n')[0]
    print(f"[INFO] 正在创建 Commit: '{title_line}' (作者: Umbra-ye)...")
    commit_payload = {
        "message": commit_message,
        "tree": new_tree_sha,
        "parents": [parent_commit_sha],
        "author": author_meta,
        "committer": author_meta
    }
    commit_resp = github_api_request(f"{api_base}/git/commits", token, data=commit_payload, method='POST')
    new_commit_sha = commit_resp['sha']
    print(f"[SUCCESS] Commit 生成成功: {new_commit_sha[:8]}")
    
    # 6. 更新分支引用
    update_ref_payload = {"sha": new_commit_sha, "force": True}
    github_api_request(f"{api_base}/git/refs/heads/{default_branch}", token, data=update_ref_payload, method='PATCH')
    
    print("[SUCCESS] ====================================================")
    print(f"[SUCCESS] [OK] 最新规范 Commit 已成功推送至 GitHub: https://github.com/{repo}")
    print(f"[SUCCESS] [OK] 提交作者已绑定为: Umbra-ye (Umbra)")
    print("[SUCCESS] ====================================================")

if __name__ == '__main__':
    repo = sys.argv[1] if len(sys.argv) > 1 else 'Umbra-ye/SubFlow'
    token = sys.argv[2] if len(sys.argv) > 2 else ''
    custom_msg = sys.argv[3] if len(sys.argv) > 3 else None
    push_to_github(repo, token, custom_msg)
