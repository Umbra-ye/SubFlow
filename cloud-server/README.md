# ☁️ SubFlow Server 云端多用户服务器版

面向站长、团队与多用户部署的跨平台订阅流体转换中枢。支持部署在 Linux VPS 与 Windows 云服务器上。

---

## 🌟 核心特性
- 🛡️ **安全登录门禁**：物理拦截未授权爬虫扫描与恶意流量盗刷；
- 🎟️ **注册邀请码体系**：支持签发普通计次码、限时定时码，保护站长服务器资源；
- 👥 **多租户数据隔离**：每位用户拥有独立加密的历史订阅与私有聚合流；
- 🖥️ **专属运维控制中心 (/admin)**：在线体检、用户管理、邀请码签发与作废、系统热重启；
- 🌐 **无穿透负担**：直接绑定自有公网域名或服务器 IP，轻量高效，零外部穿透依赖。

---

## 🚀 部署指南 (根据您的服务器操作系统选择)

### 🐧 方案 A：Linux 云服务器 (Ubuntu / Debian / CentOS)
Linux 服务器通过专属脚本一键注册为 **Systemd 系统级后台守护进程**：
```bash
git clone https://github.com/Umbra-ye/SubFlow.git
cd SubFlow/cloud-server
chmod +x install_linux.sh && sudo ./install_linux.sh
```
- 服务状态管理：`systemctl status subflow`
- 用户前台地址：`http://<您的服务器IP>:25588/`
- 运维管理后台：`http://<您的服务器IP>:25588/admin`
- 初始凭据：账号 `admin` / 密码 `admin123456`（首次登录后请在控制台右上角修改）

---

### 🪟 方案 B：Windows 云服务器 (Windows Server 2016 / 2019 / 2022)
Windows 云服务器使用专属批处理或 PowerShell 脚本启动：
1. 安装 Python 3.8+ 并勾选 `Add to PATH`；
2. 安装依赖：`pip install flask requests pbkdf2`；
3. 运行启动脚本：
```powershell
cd SubFlow\cloud-server
.\install_windows_server.ps1
```
- 用户前台地址：`http://<您的服务器IP>:25588/`
- 运维管理后台：`http://<您的服务器IP>:25588/admin`
- 初始凭据：账号 `admin` / 密码 `admin123456`（首次登录后请在控制台右上角修改）
