# ☁️ SubFlow Server 云端多用户服务器版

面向站长、团队与多用户部署的跨平台订阅流体转换中枢。部署在 Linux VPS 或 Windows 云服务器上。

## 🌟 核心特性
- 🛡️ **安全登录门禁**：物理拦截未授权爬虫扫描与恶意盗刷流量；
- 🎟️ **注册邀请码体系**：支持签发普通计次码、限时定时码，保护站长服务器带宽；
- 👥 **多租户数据隔离**：每位用户拥有独立加密的历史订阅与私有聚合流；
- 🖥️ **专属运维控制中心 (`/admin`)**：在线体检、用户管理、邀请码签发与作废、系统日志与热重启；
- ⚡ **无穿透负担**：直接绑定公网域名或服务器 IP，轻量高效，零多余内网穿透依赖。

## 🚀 一键快速部署 (Ubuntu / Debian)
```bash
git clone https://github.com/Umbra-ye/SubFlow.git
cd SubFlow/cloud-server
chmod +x install.sh && sudo ./install.sh
```
- 用户前台地址：`http://您的公网IP:25588/`
- 运维管理地址：`http://您的公网IP:25588/admin` (初始账号: `admin`)
