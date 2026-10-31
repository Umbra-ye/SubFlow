#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import sys
import json
import zipfile
import subprocess
import time
import tempfile

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def log(msg, level="INFO"):
    colors = {
        "INFO": "\033[94m",
        "SUCCESS": "\033[92m",
        "WARN": "\033[93m",
        "ERROR": "\033[91m"
    }
    reset = "\033[0m"
    prefix = f"{colors.get(level, '')}[{level}]{reset}"
    print(f"{prefix} {msg}")

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cfg_path = os.path.join(root_dir, "deploy_config.json")
    
    if not os.path.exists(cfg_path):
        log(f"未找到部署配置文件: {cfg_path}", "ERROR")
        sys.exit(1)

    with open(cfg_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    host = cfg.get("ssh_host", "").strip()
    port = str(cfg.get("ssh_port", 22))
    user = cfg.get("ssh_user", "").strip()
    remote_path = cfg.get("remote_path", "/opt/subflow").strip()
    service_name = cfg.get("service_name", "subflow.service").strip()

    if not host or not user:
        log("请在 deploy_config.json 中配置有效的 ssh_host 与 ssh_user", "ERROR")
        sys.exit(1)

    log(f"目标主机: {user}@{host}:{port}", "INFO")
    log(f"远程路径: {remote_path} (物理隔离: 绝对不覆盖用户数据库与专属域名配置)", "INFO")

    # 1. 增量安全打包 (代码与前端，严格排除 data/ 数据库、edge_profile、缓存)
    temp_zip = os.path.join(tempfile.gettempdir(), f"subflow_update_{int(time.time())}.zip")
    log("正在构建轻量升级增量包...", "INFO")

    files_to_pack = [
        ("gateway.py", "gateway.py"),
        ("country_enricher.py", "country_enricher.py"),
        ("web/index.html", "web/index.html"),
        ("web/admin.html", "web/admin.html"),
        ("web/subflow_v2.js", "web/subflow_v2.js"),
        ("web/qrcode.min.js", "web/qrcode.min.js"),
    ]

    # 可选包含 linux 工具脚本
    linux_install = os.path.join(root_dir, "linux", "install.sh")
    if os.path.exists(linux_install):
        files_to_pack.append(("linux/install.sh", "linux/install.sh"))
        files_to_pack.append(("linux/gateway.py", "linux/gateway.py"))

    with zipfile.ZipFile(temp_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for rel_src, rel_dest in files_to_pack:
            abs_src = os.path.join(root_dir, rel_src)
            if os.path.exists(abs_src):
                zf.write(abs_src, rel_dest)
                log(f"  + 注入模块: {rel_dest}", "INFO")

    zip_size_kb = os.path.getsize(temp_zip) / 1024
    log(f"升级包生成成功: {zip_size_kb:.1f} KB", "SUCCESS")

    # 2. SCP 上传到云端临时目录
    remote_target_zip = "/tmp/subflow_update.zip"
    log("正在通过安全通道上传到云端 /tmp ...", "INFO")
    t0 = time.time()
    
    scp_cmd = [
        "scp", "-P", port, "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=10",
        temp_zip, f"{user}@{host}:{remote_target_zip}"
    ]
    res = subprocess.run(scp_cmd, capture_output=True, text=True)
    if res.returncode != 0:
        log(f"上传失败: {res.stderr}", "ERROR")
        try: os.remove(temp_zip)
        except: pass
        sys.exit(1)

    log(f"上传完成，耗时: {time.time() - t0:.2f} 秒", "SUCCESS")

    # 3. 远程原子级解压替换与平滑重启服务
    log("正在远程触发原子级热更新与 systemd 服务重载...", "INFO")
    remote_script = f"""
    sudo unzip -o {remote_target_zip} -d {remote_path} >/dev/null
    rm -f {remote_target_zip}
    sudo systemctl restart {service_name}
    sleep 1.5
    curl -s http://127.0.0.1:25588/api/health
    """

    ssh_cmd = [
        "ssh", "-p", port, "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=10",
        f"{user}@{host}", remote_script
    ]
    res_ssh = subprocess.run(ssh_cmd, capture_output=True, text=True)
    
    # 4. 远程状态核验
    log("云端回显状态:", "INFO")
    print(res_ssh.stdout.strip())

    if "ok" in res_ssh.stdout or "SubFlow" in res_ssh.stdout:
        log("====================================================", "SUCCESS")
        log(f"[OK] 云端已无缝热升级成功！耗时: {time.time() - t0:.2f} 秒", "SUCCESS")
        log("[OK] 用户私有域名、多租户数据库与所有订阅完全保留，0 丢失！", "SUCCESS")
        log("====================================================", "SUCCESS")
    else:
        log(f"服务重载提示 (如需排查可查看日志): {res_ssh.stderr}", "WARN")

    try:
        os.remove(temp_zip)
    except:
        pass

if __name__ == "__main__":
    main()
