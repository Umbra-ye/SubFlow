# ⚡ SubFlow 订阅流 (v2.0)

> 现代跨平台流体订阅转换平台 · 桌面客户端与云端服务器双产品线

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/badge/Release-v2.0.0-emerald.svg)](https://github.com/Umbra-ye/SubFlow/releases)

SubFlow 拥有两条完全独立解耦的产品线，请根据您的实际需求选择：

---

## 🧭 产品线快速导航

| 比较维度 | 💻 [本地桌面客户端 (`desktop-client`)](./desktop-client/) | ☁️ [云端多用户服务器版 (`cloud-server`)](./cloud-server/) |
| :--- | :--- | :--- |
| **主要定位** | 个人电脑本地使用、随开即用 | 公网 VPS / 站长多用户托管服务 |
| **适用系统** | Windows 10 / 11 个人电脑 | Linux VPS (Ubuntu/Debian/CentOS) 或 Windows Server |
| **部署方式** | **绿色免安装便携版 (`.exe`)，解压双击即用** | **Linux 使用 Systemd 守护；Windows Server 使用后台批处理脚本** |
| **身份认证** | **0 门禁、0 注册、0 密码** (随开即用) | **全屏安全访问门禁 + 强散列密码保护** |
| **邀请机制** | ❌ 无需邀请码 | ✅ 支持管理员签发普通计次码 / 限时定时码 |
| **外网访问** | ✅ **内置 Cloudflare 穿透 (手机扫码直连)** | ✅ 绑定自有独立域名或公网 IP |
| **运维后台** | ❌ 无多用户后台 (专注个人轻量) | ✅ **独立运维控制中心 (`/admin`)** |
| **数据存储** | 本地计算机独立私有存储 | SQLite / 多租户数据独立加密隔离 |

---

## 💻 1. 我想在自己电脑上直接用 (客户端)
👉 请前往 [desktop-client](./desktop-client/) 目录，或直接在 [Releases](https://github.com/Umbra-ye/SubFlow/releases) 下载 Windows 便携版解压即用。无需任何服务器与配置。

## ☁️ 2. 我想在云服务器上搭建站点自用或供好友使用 (云端版)
👉 请前往 [cloud-server](./cloud-server/) 目录：
- **Linux 用户**：执行 `sudo ./install_linux.sh` 一键注册为后台守护服务；
- **Windows Server 用户**：双击运行 `start_windows_server.bat` 即可启动服务。

---

## ⚖️ 开源协议
本项目采用 [MIT License](LICENSE) 开源。
