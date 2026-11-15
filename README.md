# ⚡ SubFlow 订阅流 (v3.2.0)

> **工业级现代化跨平台订阅流中枢 · 多源无损聚合 · 万能协议自适应分发引擎**  
> 告别繁琐格式转换，打破单机场断联与多端同步壁垒，让节点与流量如流水般稳定流淌于全设备之间。

<div align="center">

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/badge/Release-v3.2.0-emerald.svg)](https://github.com/Umbra-ye/SubFlow/releases)
[![Platform](https://img.shields.io/badge/Platform-Linux%20VPS%20%7C%20Windows%2010%2B-purple.svg)](#)
[![Memory](https://img.shields.io/badge/Memory-15MB%20Ultra%20Light-orange.svg)](#)
[![Status](https://img.shields.io/badge/Engine-Active%20Production-success.svg)](#)

</div>

---

## 🚀 Linux VPS 一键极速部署（推荐）

在任何纯净的 Linux VPS（Ubuntu / Debian / CentOS / Rocky / Alpine，支持 x86_64 与 ARM64）上，只需**复制并粘贴执行以下一条命令**：

```bash
curl -fsSL https://raw.githubusercontent.com/Umbra-ye/SubFlow/main/install.sh | bash
```

> **国内服务器加速安装命令**（包含 GitHub 加速代理，秒级畅连）：
> ```bash
> bash <(curl -fsSL https://raw.githubusercontent.com/Umbra-ye/SubFlow/main/install.sh || curl -fsSL https://ghproxy.net/https://raw.githubusercontent.com/Umbra-ye/SubFlow/main/install.sh)
> ```

- ⚡ **全自动配置**：自动安装环境、部署高性能转换内核、注册 systemd 守护进程、开机自启、掉线秒级自愈；
- 🛡️ **精准防火墙**：自动放行 `25588` 端口，严密保持其余端口安全；
- ⚙️ **后台控制面板**：访问 `http://您的VPS公网IP:25588`，管理后台 `http://您的VPS公网IP:25588/admin`（默认账号 `admin` / 初始密码 `admin123456`）。

---

## 💻 Windows 个人桌面客户端（免安装便携版）

面向 Windows 个人电脑本地使用，**0 门禁、0 注册、0 密码**，双击随开即用：

- 前往 [Releases](https://github.com/Umbra-ye/SubFlow/releases) 下载 `SubFlow-v1.0-便携版.zip`；
- 解压后双击运行 **`SubFlow.exe`**，托盘常驻，双击即唤醒现代控制面板；
- 原生 C# 5 编译构建，内置全协议解析器，无需繁琐安装运行库。

---

## 🌟 核心硬核特性

### 1. 🌐 客户端生态万能自适应 (Client Auto-Sensing)
- **一条短链打通全生态**：无论复制到 **Clash Verge**、**FlClash**、**Clash Meta**、**Sing-box**、**NekoBox**、**v2rayN**、**v2rayNG** 还是 **Shadowrocket (小火箭)**，服务端智能识别客户端 User-Agent，自动输出 100% 匹配的最佳协议格式；
- **自适应降级兜底**：当高级客户端遇到格式不匹配时，智能降级为纯节点 Base64，杜绝 0 节点死锁。

### 2. 🏷️ 全球 30+ 地区【国家】方括号原生规范化引擎
- **智能地理测绘**：针对原机场纯英文、无地名、甚至仅有任意 IP 的节点，内置全球 30+ 国家与地区特征解析；
- **方括号规范排版**：自动规范前缀为醒目的国旗与地名（如 `🇭🇰【香港】HK-BGP-01`、`🇺🇸【美国】CF官方优选`、`🇯🇵【日本】Tokyo-02`），方便代理软件进行分组分流规则命中。

### 3. 🔀 多源订阅流体聚合与微晶矩阵 (Multi-Source Lossless Merge)
- **多机场合一高可用**：勾选多个不同服务商的订阅，一键合成一条永久动态“聚合流”；
- **子源无损保活**：告别节点串线与名称冲突，卡片以微晶矩阵清晰展示各个子源的健康状态、剩余流量与到期日；
- **智能去重与故障自愈**：自动剔除失效或重复节点，单个机场到期不影响全局正常上网。

### 4. 🔄 单订阅专属独立短链与密钥作废 (Token Rotate)
- **单链绝对隔离**：为每个订阅生成独立的短链凭据，告别暴露总账号或原机场私有 Token 的安全隐患；
- **秒级轮转作废**：一键点击“刷新”，旧链接在服务端物理失效并阻断，新短链即刻生效，不波及名下其他订阅。

### 5. 🩺 实时智能测活看板与前端自愈引擎
- **多客户端矩阵测活**：真实模拟多端拉取，实时监控节点数量与链路连通状态；
- **脏数据主动自愈**：前端内置防御清洗机制，自动修复历史无效或残缺链接，拒绝假数据兜底。

---

## 🧭 产品形态详细对比

| 功能特性 | 💻 Windows 个人桌面端 (`SubFlow.exe`) | 🐧 Linux 云端服务器版 (`cloud-server`) |
| :--- | :--- | :--- |
| **主要定位** | 个人电脑本地使用、离线免登随开即用 | 公网 Linux VPS 多设备/多用户聚合中枢 |
| **适用环境** | Windows 10 / 11 个人电脑 | Ubuntu / Debian / CentOS / Rocky / Alpine |
| **可执行实体** | 原生 `SubFlow.exe` 单文件便携版 | systemd 守护进程 (`subflow.service`) |
| **身份认证** | 0 门禁、0 注册、全本地化运行 | 安全门禁体系 + 强散列密码保护 |
| **管理后台** | 本地独立存储管理 | 独立运维控制中心 (`/admin`) |
| **外网拉取** | 本地局域网 `127.0.0.1` 极速直连 | 绑定公网 IP 或域名，多端随时拉取 |
| **系统开销** | 内存极小，随用随走 | 内存仅约 **15~25 MB**，CPU 几乎 0% |

---

## 🛠️ 常用运维管理命令 (Linux VPS)

```bash
# 查看 SubFlow 服务实时运行状态
systemctl status subflow

# 重启服务 (更新配置或代码后)
systemctl restart subflow

# 停止 / 启动服务
systemctl stop subflow
systemctl start subflow

# 查看系统运行日志
journalctl -u subflow -f -n 50
```

---

## 🔒 隐私与开源安全承诺

1. **0 商业后门**：全开源架构，代码透明可审计；
2. **0 订阅泄露**：所有外部订阅链接均在本地或私有服务器内存中解构，绝不上传至任何第三方收集平台；
3. **极简低碳**：完全剔除冗余依赖，C++ 转换内核与轻量 Python 网关保证在最严苛的低配 VPS（如 512MB 内存机器）上常年极速稳定运行。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 协议完全开源。
