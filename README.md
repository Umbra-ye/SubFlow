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
| **安装方式** | Windows 绿色免安装便携版 (`.exe`) | Linux / Windows VPS Systemd 守护安装 |
| **身份认证** | **0 门禁、0 注册、0 密码** (随开即用) | **全屏安全防盗门禁 + PBKDF2 密文鉴权** |
| **邀请机制** | ❌ 无需邀请码 | ✅ 支持管理员签发普通计次码 / 限时定时码 |
| **外网访问** | ✅ **内置 Cloudflare 穿透 (手机扫码直连)** | ✅ 绑定自有独立域名或公网 IP |
| **运维后台** | ❌ 无多用户后台 (专注个人轻量) | ✅ **独立运维控制中心 (`/admin`)** |
| **数据存储** | 本地计算机独立私有存储 | SQLite / 多租户数据独立隔离 |

---

## 💻 1. 我想在自己电脑上直接用 (客户端)
👉 请前往 [desktop-client](./desktop-client/) 目录，或直接在 [Releases](https://github.com/Umbra-ye/SubFlow/releases) 下载 Windows 便携版解压即用。

## ☁️ 2. 我想在 VPS 服务器上建站自用或供好友使用 (云端版)
👉 请前往 [cloud-server](./cloud-server/) 目录，按照指南执行一行命令即可部署。

---

## ⚖️ 开源协议
本项目采用 [MIT License](LICENSE) 开源。
