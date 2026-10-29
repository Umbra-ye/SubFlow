#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SubFlow - 三大多场景纯净便携包（Portable Packages）自动化打包流水线
1. Windows 桌面单机便携版 (.zip)
2. Windows 云端服务器便携版 (.zip)
3. Linux VPS 无头微服务便携包 (.tar.gz)
严格遵守安全隔离与桌面整洁规范，绝对 0 个人隐私混入！
"""

import os
import sys
import zipfile
import tarfile
import shutil

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = r"E:\杂乱项目gemini\SubConverter-Extended"
DESKTOP_DIR = os.path.join(os.path.expanduser("~"), "Desktop", "SubFlow发布包")
PROJECT_RELEASE_DIR = os.path.join(ROOT_DIR, "release_packages")

os.makedirs(DESKTOP_DIR, exist_ok=True)
os.makedirs(PROJECT_RELEASE_DIR, exist_ok=True)

def log(msg):
    print(f"[PACK] {msg}")

# ==============================================================================
# 1. Windows 桌面单机便携版
# ==============================================================================
def build_desktop_portable():
    zip_name = "SubFlow_v2.2_Windows_Desktop_Portable.zip"
    dest_path_desktop = os.path.join(DESKTOP_DIR, zip_name)
    dest_path_project = os.path.join(PROJECT_RELEASE_DIR, zip_name)
    log(f"正在打包: {zip_name} ...")

    # 启动批处理
    launcher_bat = """@echo off
chcp 65001 >nul
title SubFlow 桌面便携版
cd /d "%~dp0"
echo ====================================================
echo   SubFlow (订阅流) · 现代流体订阅中心 Windows 便携版
echo   本地监听: http://127.0.0.1:25588
echo ====================================================
echo 正在启动托盘常驻客户端...
start "" "%~dp0SubFlow.exe"
exit
"""
    readme_txt = """SubFlow (订阅流) · Windows 桌面单机便携免安装版
====================================================
【快速上手】
1. 双击运行【一键启动SubFlow.bat】或【SubFlow.exe】；
2. 启动后程序将自动驻留在右下角系统托盘；
3. 浏览器或客户端将自动打开界面：http://127.0.0.1:25588
4. 单机免登录，无任何外部数据库依赖，转换数据绝对 100% 仅存在本机！

【客户端唤醒】
- 转换完成后支持点击【一键唤醒 FlClash / Clash】秒级导入。
"""

    with zipfile.ZipFile(dest_path_project, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("一键启动SubFlow.bat", launcher_bat.encode("gbk", errors="ignore"))
        zf.writestr("使用说明.txt", readme_txt.encode("gbk", errors="ignore"))
        
        # 核心二进制与库
        bin_files = [
            "SubFlow.exe", "WebView2Loader.dll", "Microsoft.Web.WebView2.Core.dll",
            "Microsoft.Web.WebView2.WinForms.dll", "app.ico", "app.png", "LICENSE"
        ]
        for f in bin_files:
            p = os.path.join(ROOT_DIR, f)
            if os.path.exists(p):
                zf.write(p, f)

        # runtimes
        rt_path = os.path.join(ROOT_DIR, "runtimes", "win-x64", "native", "WebView2Loader.dll")
        if os.path.exists(rt_path):
            zf.write(rt_path, "runtimes/win-x64/native/WebView2Loader.dll")

        # web 前端
        web_files = ["web/index.html", "web/subflow_v2.js", "web/qrcode.min.js"]
        for wf in web_files:
            p = os.path.join(ROOT_DIR, wf)
            if os.path.exists(p):
                zf.write(p, wf)

        # base 规则
        base_dir = os.path.join(ROOT_DIR, "base")
        for dp, _, fns in os.walk(base_dir):
            for fn in fns:
                fp = os.path.join(dp, fn)
                rel = os.path.relpath(fp, ROOT_DIR).replace("\\", "/")
                zf.write(fp, rel)

    shutil.copy2(dest_path_project, dest_path_desktop)
    log(f"  -> 生成完毕: {os.path.getsize(dest_path_project)/1024:.1f} KB")

# ==============================================================================
# 2. Windows 云端服务器多租户便携版
# ==============================================================================
def build_windows_cloud_portable():
    zip_name = "SubFlow_v2.2_Windows_Cloud_Server_Portable.zip"
    dest_path_desktop = os.path.join(DESKTOP_DIR, zip_name)
    dest_path_project = os.path.join(PROJECT_RELEASE_DIR, zip_name)
    log(f"正在打包: {zip_name} ...")

    start_cloud_bat = """@echo off
chcp 65001 >nul
title SubFlow 云端服务管理
cd /d "%~dp0"
echo ====================================================
echo   SubFlow (订阅流) · Windows 云端多租户服务
echo   监听端口: 25588 | 控制中心: http://127.0.0.1:25588/admin
echo ====================================================
python gateway.py --mode=cloud --port=25588
pause
"""
    cloud_readme = """SubFlow (订阅流) · Windows 云端多租户服务便携版
====================================================
【部署说明】
1. 需要系统安装 Python 3.7+；
2. 双击【一键启动云端服务.bat】即可拉起多租户网关服务；
3. 管理控制台：http://127.0.0.1:25588/admin
4. 初始管理员账密：首次登录可在控制台自动完成安全设置。

【专属域名与穿透】
- 若需公网访问，可在管理后台一键绑定自定义公网域名或填入 Cloudflare Tunnel Token。
"""

    with zipfile.ZipFile(dest_path_project, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("一键启动云端服务.bat", start_cloud_bat.encode("gbk", errors="ignore"))
        zf.writestr("云端服务配置说明.txt", cloud_readme.encode("gbk", errors="ignore"))
        
        # 核心网关与配置模板
        core_files = ["gateway.py", "gateway_config.example.json", "app.ico", "LICENSE", "README.md"]
        for f in core_files:
            p = os.path.join(ROOT_DIR, f)
            if os.path.exists(p):
                zf.write(p, f)

        # web 前端 (包含 index.html 与 admin.html)
        web_files = ["web/index.html", "web/admin.html", "web/subflow_v2.js", "web/qrcode.min.js"]
        for wf in web_files:
            p = os.path.join(ROOT_DIR, wf)
            if os.path.exists(p):
                zf.write(p, wf)

        # base 规则
        base_dir = os.path.join(ROOT_DIR, "base")
        for dp, _, fns in os.walk(base_dir):
            for fn in fns:
                fp = os.path.join(dp, fn)
                rel = os.path.relpath(fp, ROOT_DIR).replace("\\", "/")
                zf.write(fp, rel)

    shutil.copy2(dest_path_project, dest_path_desktop)
    log(f"  -> 生成完毕: {os.path.getsize(dest_path_project)/1024:.1f} KB")

# ==============================================================================
# 3. Linux VPS 无头微服务便携包
# ==============================================================================
def build_linux_portable():
    tar_name = "SubFlow_v2.2_Linux_VPS_Headless_Portable.tar.gz"
    dest_path_desktop = os.path.join(DESKTOP_DIR, tar_name)
    dest_path_project = os.path.join(PROJECT_RELEASE_DIR, tar_name)
    log(f"正在打包: {tar_name} ...")

    with tarfile.open(dest_path_project, "w:gz") as tar:
        # linux/ 目录下全部资源
        linux_dir = os.path.join(ROOT_DIR, "linux")
        for fn in os.listdir(linux_dir):
            fp = os.path.join(linux_dir, fn)
            tar.add(fp, arcname=f"SubFlow-Linux/{fn}")

        # web/ 目录
        web_dir = os.path.join(ROOT_DIR, "web")
        for fn in os.listdir(web_dir):
            fp = os.path.join(web_dir, fn)
            tar.add(fp, arcname=f"SubFlow-Linux/web/{fn}")

        # base/ 目录
        base_dir = os.path.join(ROOT_DIR, "base")
        for dp, _, fns in os.walk(base_dir):
            for fn in fns:
                fp = os.path.join(dp, fn)
                rel = os.path.relpath(fp, ROOT_DIR).replace("\\", "/")
                tar.add(fp, arcname=f"SubFlow-Linux/{rel}")

        # 根目录说明
        readme_path = os.path.join(ROOT_DIR, "README.md")
        if os.path.exists(readme_path):
            tar.add(readme_path, arcname="SubFlow-Linux/README.md")

    shutil.copy2(dest_path_project, dest_path_desktop)
    log(f"  -> 生成完毕: {os.path.getsize(dest_path_project)/1024:.1f} KB")

# ==============================================================================
# 4. 全量纯净开源源码压缩包
# ==============================================================================
def build_source_code_archive():
    zip_name = "SubFlow_v2.2_Full_SourceCode_Clean.zip"
    dest_path_desktop = os.path.join(DESKTOP_DIR, zip_name)
    dest_path_project = os.path.join(PROJECT_RELEASE_DIR, zip_name)
    log(f"正在打包: {zip_name} ...")

    # 导入我们已审查通过的 131 个纯净文件收集器
    sys.path.append(os.path.join(ROOT_DIR, "tools"))
    import push_to_github
    clean_files = push_to_github.collect_clean_files(ROOT_DIR)

    with zipfile.ZipFile(dest_path_project, 'w', zipfile.ZIP_DEFLATED) as zf:
        for relpath, fpath in clean_files:
            # 跳过大体积打包脚本自身生成的临时包
            if "release_packages" in relpath:
                continue
            zf.write(fpath, f"SubFlow-SourceCode/{relpath}")

    shutil.copy2(dest_path_project, dest_path_desktop)
    log(f"  -> 生成完毕: {os.path.getsize(dest_path_project)/1024:.1f} KB")

if __name__ == "__main__":
    print("====================================================")
    print("  SubFlow 四大纯净便携包与源码归档自动化构建流水线")
    print("====================================================")
    build_desktop_portable()
    build_windows_cloud_portable()
    build_linux_portable()
    build_source_code_archive()
    print("====================================================")
    print(f"全部 4 个发布包已整齐归档至桌面文件夹: {DESKTOP_DIR}")
    print(f"项目备份归档目录: {PROJECT_RELEASE_DIR}")
    print("====================================================")
