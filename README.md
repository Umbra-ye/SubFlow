# ⚡ SubFlow 订阅流 (v2.2.1)

> **现代化跨平台流体订阅转换中枢与多源聚合平台**  
> 告别繁琐配置，打破单机场断联与多端同步壁垒，让订阅顺畅流淌于全设备之间。

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/badge/Release-v2.2.1-emerald.svg)](https://github.com/Umbra-ye/SubFlow/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20VPS%20%7C%20macOS-purple.svg)](#)

---

## 💡 为什么选择 SubFlow？

在日常使用网络代理工具时，常见这些痛点：
- **格式繁杂各异**：Clash、Sing-box、Surge、Shadowrocket 各有配置规范，手动转换费时费力；
- **单机场容易断流**：单一机场维护或节点炸裂时，全设备断网；备用机场只能反复手动切换；
- **跨设备配置同步难**：电脑配置好的规则，手机传输繁琐且机场密码 Token 容易泄露。

**SubFlow 为此而生**。它不仅是全协议万能转换器，更是**多源流体聚合器**与**跨设备协同中枢**。

---

## 🌟 核心硬核特性

### 1. ⚡ 全协议万能极速转换
- 自动智能识别输入格式（Vmess / Vless / SS / SSR / Trojan / Hysteria2 / TUIC 等）；
- 一键自适应导出至主流客户端：**Clash (Meta / Verge / Mihomo)**、**Sing-box**、**Surge**、**Shadowrocket (小火箭)**、**Loon**、**v2rayNG**；
- 支持**一键唤醒本机客户端**协议，配置秒级同步注入客户端。

### 2. 🔀 多源订阅聚合流 (多机场合并)
- **多合一高可用**：勾选多个不同服务商的订阅，一键合成一条永久动态“聚合流”；
- **节点去重与流量汇总**：自动按机场打上专属识别前缀，智能合并总剩余流量与最长有效期；
- **冗余抗故障**：某个服务商临时故障，聚合流自动剔除故障节点，保障平滑在线。

### 3. 🩺 实时智能测活与健康看板
- **多源毫秒测活**：实时探测所有保存订阅的底层连通性与响应毫秒数（Ping Latency）；
- **动态状态指示灯**：在线绿色呼吸灯、离线告警、双击一键重命名；
- **定时后台自动体检**：支持自定义每隔若干小时静默巡检，确保主力链接始终健康。

### 4. 🌐 跨设备远程穿透 (手机扫码直连)
- **内置 Cloudflare 穿透引擎**：无需公网 IP、无需路由器端口映射，家庭电脑开着即可一键打通公网隧道；
- **手机扫码自适应识别**：在外面用手机相机或小火箭扫描屏幕二维码，自适应获取手机专属配置；
- **零密码泄露风险**：所有下发链接均经过网关脱敏与加密封装，绝不上报机场真实 Token。

---

## 🚀 三端快速使用与一键部署

SubFlow 拥有**三套专属形态**，涵盖“个人桌面随开即用”与“云端多用户建站部署”：

### 💻 1. Windows 个人电脑客户端 (含原生 `SubFlow.exe`)
> 面向个人 Windows 电脑本地使用，绿色免安装便携版，**0 门禁、0 注册、0 密码**，双击随开即用！

- **方式 A（双击运行）**：前往 [Releases](https://github.com/Umbra-ye/SubFlow/releases) 下载最新便携包解压，双击 `SubFlow.exe` 即可使用！
- **方式 B（PowerShell 一行命令获取启动）**：
  ```powershell
  irm https://raw.githubusercontent.com/Umbra-ye/SubFlow/main/desktop-client/install_client.ps1 | iex
  ```

---

### 🐧 2. Linux 云服务器版 (Ubuntu / Debian / CentOS VPS)
> 面向站长在公网 Linux VPS 上搭建多用户服务，带**全屏安全访问门禁**、**注册邀请码体系**与 **`/admin` 运维中枢**。

- **一行命令全自动部署（注册 Systemd 后台自启服务）**：
  ```bash
  curl -fsSL https://raw.githubusercontent.com/Umbra-ye/SubFlow/main/cloud-server/install_linux.sh | bash
  ```
- **用户前台地址**：`http://您的服务器IP:25588/`
- **运维管理后台**：`http://您的服务器IP:25588/admin` (初始管理员账号: `admin`)

---

### 🪟 3. Windows 云服务器版 (Windows Server 2016/2019/2022)
> 面向在 Windows 云主机上架设多用户站点的站长，原生批处理常驻后台。

- **PowerShell 一行命令启动**：
  ```powershell
  irm https://raw.githubusercontent.com/Umbra-ye/SubFlow/main/cloud-server/install_windows_server.ps1 | iex
  ```
- 或进入 `cloud-server/` 双击运行 `start_windows_server.bat` 即可常驻服务。

---

## 🧭 产品形态详细对比

| 比较维度 | 💻 本地桌面客户端 (`desktop-client`) | ☁️ Linux 云端服务器 (`cloud-server`) | 🪟 Windows 云端服务器 (`cloud-server`) |
| :--- | :--- | :--- | :--- |
| **主要定位** | 个人电脑本地使用、随开即用 | 公网 Linux VPS 多用户服务 | 公网 Windows Server 多用户服务 |
| **适用环境** | Windows 10 / 11 个人电脑 | Ubuntu / Debian / CentOS | Windows Server 2016 / 2019 / 2022 |
| **可执行实体** | **含原生 `SubFlow.exe` (便携免安装)** | Linux 原生守护进程 | Windows 后台服务脚本 |
| **身份认证** | **0 门禁、0 注册 (随开即用)** | **安全访问门禁 + 强散列密码保护** | **安全访问门禁 + 强散列密码保护** |
| **邀请机制** | ❌ 无需邀请码 | ✅ 支持签发普通计次码 / 限时定时码 | ✅ 支持签发普通计次码 / 限时定时码 |
| **外网直连** | ✅ **内置 Cloudflare 穿透 (手机扫码)** | ✅ 绑定自有独立域名或公网 IP | ✅ 绑定自有独立域名或公网 IP |
| **管理中枢** | ❌ 无多用户后台 (专注个人轻量) | ✅ **独立运维控制中心 (`/admin`)** | ✅ **独立运维控制中心 (`/admin`)** |
| **数据存储** | 本地计算机独立私有存储 | SQLite / 多租户数据独立加密隔离 | SQLite / 多租户数据独立加密隔离 |

---

## ⚖️ 开源协议
本项目采用 [MIT License](LICENSE) 开源。欢迎 Star 与 Issue 反馈！
