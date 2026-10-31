# SubFlow (订阅流) · 现代流体订阅中心与全平台网关

<p align="center">
  <img src="app.ico" width="88" height="88" alt="SubFlow Logo">
</p>

<p align="center">
  <strong>专为 Windows 与 Linux 打造的下一代私有化无损订阅转换与全平台分发网关</strong><br>
  <em>Next-Generation Private Lossless Subscription Converter & Distribution Gateway</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%207%2F10%2F11%20%7C%20Linux%20VPS%20%7C%20Docker-0078D6?style=flat-square&logo=windows" alt="Platform">
  <img src="https://img.shields.io/badge/Architecture-C%23%20Native%20%7C%20Python%20Async%20Gateway%20%7C%20C%2B%2B%20Core-512BD4?style=flat-square" alt="Architecture">
  <img src="https://img.shields.io/badge/Engine-Lossless%20VLESS%20%2F%20Trojan%20%2F%20Shadowrocket-10b981?style=flat-square" alt="Engine">
  <img src="https://img.shields.io/badge/UI-2026%20Liquid%20Glass-0078D7?style=flat-square&logo=microsoftedge" alt="Frontend">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

---

## 🌟 为什么选择 SubFlow？

传统的开源订阅转换前端大多依赖第三方的远端公共后端（如公开转换站或老旧的转换核心），普遍存在三大痛点：
1. **隐私安全隐患**：所有机场 Token 与节点信息会明文发送给第三方服务器，存在被嗅探、窃取或日志留存的风险；
2. **现代协议不兼容与超时**：老版开源二进制对现代新式协议（如 VLESS、Reality、Hysteria 2）支持不足，容易出现 `No nodes were found!` 错误；遇到 Cloudflare WAF 保护的上游时易触发 524 响应超时；
3. **交互界面老旧**：大部分工具界面停留在一代 Web 表单风格，缺乏跨设备自适应与现代审美。

**SubFlow (订阅流)** 专为解决上述痛点而生，带来真正的私有化、现代化与无损转换体验：
- **100% 私有化安全网关**：内置高性能原生异步服务（`127.0.0.1:25588`），所有转换在本地或私有云端毫秒级完成，数据绝对不出私有域；
- **自研原生无损转换引擎（Native Lossless Engine）**：深度支持 VLESS / Trojan / SS / VMess / Hysteria 2 协议，支持小火箭与 Clash Meta 标准双向直出；
- **多 UA 智能穿透队列**：内置多级客户端 User-Agent 智能调度，极速穿透 Cloudflare WAF 与反爬机制，彻底告别 524 错误；
- **2026 Liquid Glass 流体美学**：全量毛玻璃半透明流体质感，支持深色曜石/明亮晨曦双主题毫秒级平滑转场，完美联动操作系统原生标题栏；
- **全平台多形态部署**：支持 Windows 托盘极简后台驻留、Linux VPS 一键部署（开机自启）、Docker 容器编排与多租户权限控制。

---

## 🚀 核心功能详情 (Feature Matrix)

### 1. ⚡ 双核驱动与无损协议转换
* **自研 NativeSubEngine 原生引擎**：当上游节点为现代协议或老旧核心无法识别时，系统自动无缝切入原生解析通道，100% 提取并保留节点全部参数（UUID、Path、Host、SNI、Fingerprint、TLS）；
* **双向格式自适应直出**：
  * **Clash Meta (Mihomo) 标准 YAML**：自动格式化为标准代理节点列表，可自由追加策略组与精简分流规则；
  * **小火箭 / 通用节点列表**：直接生成标准 Base64 编码，供 Shadowrocket、v2rayN、Sing-box 等客户端秒级拉取；
* **防封穿透调度**：采用 `Shadowrocket/1982` 与标准浏览器多 UA 优选队列，上游请求通常在 0.4 秒内高速直出，杜绝拉取超时。

### 2. 💎 2026 Liquid Glass 现代交互美学
* **单文件自包含（零外部 CDN）**：所有样式与交互完全内嵌离线打包，不依赖任何第三方 CDN，任何弱网或局域网环境下均可毫秒级加载；
* **微交互弹性动效**：基于现代前端弹性动效（Emil Kowalski 风格），支持日间/夜间模式毫秒级平滑过渡；
* **沉浸式系统原生暗色**：在 Windows 桌面端实时联动 Windows 10/11 原生 DWM 标题栏，浑然一体；
* **节点明文可视化预览**：内置独立毛玻璃配置查看器，支持语法高亮与一键全选复制；
* **一键唤醒客户端互通**：支持通过 `clash://` 等系统协议一键唤醒并拉起客户端导入弹窗；
* **跨设备二维码即扫即用**：局域网内手机打开相机扫描即可免输入同步订阅配置。

### 3. 🛡️ 云端多租户与数据物理隔离
* **多租户权限隔离体系**：支持超级管理员与普通用户多账户分级，每个用户的订阅数据物理隔离存储于 SQLite 数据库；
* **专属公网域名与 Cloudflare 隧道**：支持公网反向代理绑定与 Cloudflare Tunnel 无公网 IP 内网穿透；
* **可视化超级管理中心 (`/admin`)**：
  * **租户控制台**：支持租户启停封禁与订阅用量审计；
  * **核心健康体检**：实时检测 SubConverter 核心连通性、网关延迟、数据库体积与当前公网 IP；
  * **配置与资产备份**：支持一键导出包含租户与订阅全量元数据的 JSON 资产备份，或直接下载 SQLite 数据库；
  * **防盗链 PIN 码保护**：支持自定义提取暗号，并具备紧急一键熔断机制，重置后旧外链即刻全量失效。

### 4. 🔄 在线热更新与无感平滑重载
* **管理后台一键协同**：在 Web 管理页面直接对比本地与 GitHub 远程最新版本；
* **3 秒无感热重启**：调用 systemd 守护进程平滑重载，当前 HTTP 请求不受干扰；
* **物理级数据保护**：更新程序与 Git 同步白名单严格隔离 `data/` 目录，用户的私有域名配置、多租户数据库与 TLS 凭证绝对免除覆盖，保障资产 100% 安全。

---

## 🏗️ 架构拓扑原理 (Architecture)

```text
       ┌────────────────────────┐
       │   各类客户端设备       │
       │ (Clash / Shadowrocket) │
       └───────────┬────────────┘
                   │ HTTP GET /sub?target=clash&url=...
                   ▼
       ┌────────────────────────┐
       │ SubFlow 自适应网关     │ (端口: 25588)
       │ - 多租户鉴权与访问控制 │
       │ - 物理隔离数据层 (data/)│
       └─────┬────────────┬─────┘
             │            │
   [常规规则转换]   [现代协议/防超时穿透]
             ▼            ▼
   ┌──────────────┐  ┌───────────────────────────────────┐
   │ SubConverter │  │ NativeSubEngine 原生无损转换引擎  │
   │ C++ 基础核心 │  │ - 多 UA 穿透 WAF (0.4s 直出)       │
   │              │  │ - VLESS / Trojan / Hysteria 2 解析│
   │              │  │ - Clash Meta YAML / Base64 输出   │
   └──────────────┘  └─────────────────┬─────────────────┘
                                       │
                                       ▼
                             ┌───────────────────┐
                             │    上游机场节点   │
                             └───────────────────┘
```

---

## 🐧 Linux VPS 24小时私有化部署指南

支持系统：**Ubuntu / Debian / CentOS / Rocky / Alpine** (支持 x86_64 与 aarch64 架构)。

### ⚡ 极速一行全自动化部署命令（免下载、免配置、自开放行端口）：
只需登录 VPS 终端，复制粘贴并执行：

```bash
bash <(curl -sSL https://raw.githubusercontent.com/yeying130/SubFlow/main/linux/install.sh)
```
*(国内加速镜像备份：`bash <(curl -sSL https://ghproxy.net/https://raw.githubusercontent.com/yeying130/SubFlow/main/linux/install.sh)`)*

#### 🚀 全自动流程包括：
1. **自动检测硬件架构**（自动匹配 amd64 / arm64 高性能核心）；
2. **自动拉取纯净代码**并构建部署至 `/opt/subflow`；
3. **自动配置 Systemd 服务**守护（开机自启，故障 3 秒自动重拉）；
4. **仅精准放行 25588/tcp 单一业务端口**（SSH 等其他 65534 个端口维持严密封闭，绝不碰任何多余端口）；
5. **自动获取公网 IP 并打印可访问面板地址与管理员账密**：
   - 🌐 用户主页：`http://你的VPS_IP:25588`
   - ⚙️ 管理后台：`http://你的VPS_IP:25588/admin`
   - 👤 默认账号：`admin`
   - 🔑 初始密码：`admin123456` *(登录后台后可随时修改)*

- **极致低占用**：内存仅占 **15~25 MB**，CPU 几乎 0%，年付几美元的小内存机器也能流畅运行。

### 常用运维命令：
```bash
# 查看服务状态
systemctl status subflow

# 重启网关服务
systemctl restart subflow

# 停止服务
systemctl stop subflow
```

*(同时支持 Docker：进入 `linux/` 目录运行 `docker compose up -d` 即可拉起容器)*

---

## 🛠️ Windows 本地极速编译 (零外部依赖)

本项目依托 Windows 自带的原生 C# 编译器，无需庞大的 Visual Studio，直接在 PowerShell 编译：

```powershell
# 1. 运行编译脚本
.\compile.ps1

# 2. 编译成功后生成 SubFlow.exe，双击即可直接运行！
```

---

## 📂 项目目录规范

```text
SubFlow/
├── gateway.py                 # SubFlow 核心网关 (含 NativeSubEngine 原生无损引擎)
├── SubConverterApp.cs         # Windows C# 原生系统托盘与桌面程序源码
├── compile.ps1                # Windows 原生极速编译脚本
├── gateway_config.example.json# 出厂纯净网关配置文件模板
├── app.ico                    # 现代流体专属图标
├── 一键上传到GitHub.bat       # 纯净版 GitHub REST API 快速推送脚本
├── 一键启动可视化界面.bat     # Windows 便捷启动批处理
├── web/                       # 2026 Liquid Glass 现代毛玻璃前端
│   ├── index.html             # 单文件流体控制台 (零第三方CDN，离线秒开)
│   ├── admin.html             # 超级管理后台 (多租户、公网域名绑定、在线升级)
│   ├── subflow_v2.js          # 前端核心业务与动效逻辑
│   └── qrcode.min.js          # 本地离线二维码生成库
├── linux/                     # Linux VPS 一键部署套件
│   ├── install.sh             # Linux 全自动一键安装与 systemd 守护配置脚本
│   ├── gateway.py             # Linux 微服务网关
│   ├── docker-compose.yml     # Docker 容器编排文件
│   └── Dockerfile             # 容器镜像构建文件
├── tools/                     # 运维辅助与自动化推送工具包
│   └── push_to_github.py      # 带敏感词审查的 GitHub API 直传工具
├── base/                      # 预置分流规则集与配置基础底包
└── docs/                      # 详细技术架构规范文档
```

---

## 🛡️ 生产环境安全防御矩阵 (防域名攻击与源站保护)

针对公网部署可能面临的域名攻击、DDoS、恶意撞库与接口刷量，SubFlow 提供全方位的工业级安全防护策略：

### 1. 终极 0 开放端口架构：Cloudflare Tunnel（强烈推荐）
* **原理**：VPS 本地仅监听 `127.0.0.1:25588`，防火墙关闭所有公网入站端口，无需对外开放任何端口。
* **效果**：由官方轻量守护进程 `cloudflared` 主动向 Cloudflare 发起单向加密隧道。公网端口扫描器对服务器完全“雷达隐形”，任何针对域名的恶意扫描与攻击均在 Cloudflare 边缘被清洗，根本碰不到 VPS 真实硬件。

### 2. 隐藏真实源站 IP（Cloudflare 代理 / 小黄云开启）
* 自定义域名解析至 VPS 时开启 **Proxy（小黄云）**。
* 攻击者仅能探测到 Cloudflare Anycast 全球节点 IP，百 G / T 级流量洪峰由全球骨干网免费吸收，且支持一键开启 Under Attack（五秒盾）拦截恶意脚本。

### 3. 底层防暴力撞库与 IP 熔断机制
* **密码防爆破**：任何 IP 连续输错 5 次管理员密码，自动列入黑名单封禁 15 分钟并重置网络连接。
* **接口频控**：对 `/sub` 转换接口内置自适应速率限制，有效遏制爬虫疯狂遍历刷取带宽。

### 4. SSRF 私网探测阻断
* 原生解析引擎内置保留网段过滤器，严禁回环至 `127.0.0.1`、`10.0.0.0/8`、`192.168.0.0/16` 等内网地址，彻底杜绝服务器被当成内网渗透跳板。

---

## 💖 致敬与鸣谢 (Special Acknowledgments)

SubFlow 的诞生与演进，离不开开源社区众多前辈项目的卓越贡献。我们在此向以下杰出的开源项目及其开发者致以最诚挚的崇高敬意：

1. **[tindy2013/subconverter](https://github.com/tindy2013/subconverter)**  
   *高性能的 C++ 订阅转换核心。感谢作者为规则转换生态打下的坚实技术基石。*
2. **[CareyWang/sub-web](https://github.com/CareyWang/sub-web)**  
   *经典的开源订阅转换 Web 前端项目，引领并启发了现代订阅转换工具的界面交互设计。*
3. **[ACL4SSR / ACL4SSR Rules](https://github.com/ACL4SSR/ACL4SSR)**  
   *业界最权威、最全面的中文互联网分流规则集，为本项目的默认规则与策略组提供了极具价值的生态标准。*
4. **[MetaCubeX/mihomo](https://github.com/MetaCubeX/mihomo)** & **[FlClash](https://github.com/chen08209/FlClash)**  
   *现代、强大且优雅的跨平台代理客户端生态，为本项目的一键唤醒拉取提供了完美的协同支持。*
5. **[2dust/v2rayN](https://github.com/2dust/v2rayN)** & **[XTLS/Xray-core](https://github.com/XTLS/Xray-core)**  
   *卓越的协议标准普及者与网络工具先驱，其通用格式标准为本项目的 Native 协议解析提供了标准参照。*

---

## 📄 开源许可证 (License)

本项目基于 **MIT License** 开放源代码。欢迎提交 Pull Request、Issue 或 Fork，共同构建更安全、更现代、更纯粹的私有化网络工具！
