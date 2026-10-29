# SubFlow (订阅流) · 全平台产品矩阵与架构改进技术规格书
> **适用版本**：
> 1. **Windows 客户本地版 (Windows Desktop)**：单机极简、无缝离线
> 2. **云端 Windows 版 (Windows Server Cloud)**：双击自启、NSSM 系统服务、可视化隧道
> 3. **云端 Linux 版 (Linux Cloud / VPS / Docker)**：微服务化、极省资源、Systemd 守护
> 
> **文档目的**：供开发项目组作为产品矩阵排期、双端解耦与多平台部署的标准实施规范  
> **归档位置**：`SubFlow-Extended/docs/SPEC_V2_FULL_MATRIX.md`  
> **发布日期**：2026 年 10 月

---

## 零、 核心工程铁律：历史源码保护与迭代全量备份机制（Mandatory Archiving Policy）

> [!CAUTION]
> **开发团队必须严格遵守的工程底线（违反直接拒收交付件）**：
> 1. **严禁破坏性重构**：严禁在现有正常运行的单机版代码上直接覆盖重写！开发新特性前，必须先将当前源码打标签封存；
> 2. **历史源码永久存档**：项目必须完整保留 `v1.0-windows-legacy` 原始单机版本代码，保证随时能够回滚至最初形态；
> 3. **迭代版本全量备份**：每一次代码迭代、里程碑发布、或交付测试包时，必须同步导出包含完整依赖的物理源码快照 ZIP 压缩包；
> 4. **数据库变更可逆性**：任何数据库表结构改动，必须附带向上迁移（`migrate.sql`）与向下回滚（`rollback.sql`）脚本。

### 1. Git 分支管理与 Tag 规范
* **`master` / `main`**：生产环境绝对稳定分支，仅在经过完整实测后方可合并；
* **`release-v1-windows-legacy` (永久归档分支 / Tag: `v1.0.0`)**：**永久封存**，保留现有 Windows 本地单机稳定代码；
* **`dev-v2-cloud-matrix`**：本次重构主力开发分支（多租户、云端双端分离、三端适配）；
* **里程碑标签 Tag**：每次功能验证通过必须打带语义的版本号 Tag（如 `v2.0.0-alpha1`、`v2.0.0-rc1`），绝不丢失任何一次提交记录。

### 2. 物理源码快照归档（ZIP Snapshot Archive）
开发团队在项目根目录必须维护 `archives/` 目录，每次交付给需求方时必须同步提交带时间戳的全量备份包：
```text
SubFlow-Extended/
├── archives/                                 # 历史迭代全量源码归档区 (永久备份)
│   ├── SubFlow_v1.0_20261029_WindowsBaseline.zip   # 原始 Windows 单机版基线备份
│   ├── SubFlow_v2.0_YYYYMMDD_CloudAlpha.zip        # 云端多租户初版快照
│   └── SubFlow_v2.0_YYYYMMDD_FullRelease.zip       # 全平台正式交付版
```

---

## 一、 三大版本产品矩阵与定位对照

| 维度 | ① Windows 客户本地版 | ② 云端 Windows 版 | ③ 云端 Linux 版 (如 InstaBox / VPS) |
| :--- | :--- | :--- | :--- |
| **部署宿主** | Win10 / Win11 个人电脑 | Windows Server / 云电脑 | Debian / Ubuntu / Alpine / MicroVM / Docker |
| **核心定位** | 个人私有、开箱即用、无感单机 | 站长无 Linux 基础、图形化云部署 | 专业站长、极省内存微服务、高并发多租户 |
| **用户体系** | **纯单机免登录**（0 账号体系，开机即用） | **双端分离 + 多租户强隔离**（需注册登录） | **双端分离 + 多租户强隔离**（需注册登录） |
| **后台守护** | Windows 系统托盘常驻 / 开机启动项 | **NSSM 注册 Windows 服务** (后台无黑框) | **Systemd 服务** (`subflow.service`) |
| **网络模式** | 本地 `127.0.0.1:25588` 独享 | 固定公网域名 / Cloudflare Tunnel / 端口映射 | 固定公网域名 / Cloudflare Tunnel / 反向代理 |
| **隧道管理** | 无需公网穿透 | 内置 `cloudflared.exe`，后台静默接管 | 系统安装 `cloudflared`，后台静默接管 |
| **内存开销** | 约 30MB | 约 25MB | 约 18MB (极致轻量) |
| **数据加密** | 本地明文或简易 AES 本机加解密 | 零知识 AES-256-GCM 密文入库，管理员不可见 | 零知识 AES-256-GCM 密文入库，管理员不可见 |

---

## 二、 核心架构解耦法则（一套核心，三端自适应）

开发团队严禁为三个版本维护三份不同代码！必须遵循**“一套前端 + 统一网关 + 差异化平台胶水层”**的解耦架构：

```
                      ┌──────────────────────────────────────────────┐
                      │    统一前端 (Vanilla HTML5 / Modern CSS)     │
                      │   - 自动探测环境变量 (Mode: Local / Cloud)     │
                      │   - 相对路径 API，自动根据域名自适应 BaseURL    │
                      └──────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────▼───────────────────────┐
                      │     统一网关核心 (gateway.py / 编译二进制)    │
                      │   - 模式 A (Local): 单机免登录，读本地 config │
                      │   - 模式 B (Cloud): 鉴权拦截、多租户 SQLite    │
                      └──────┬───────────────────────────────┬───────┘
                             │                               │
              ┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
              │    Windows 平台适配层       │ │     Linux 平台适配层        │
              │ - 二进制: subconverter.exe   │ │ - 二进制: subconverter (ELF)│
              │ - 服务管理: NSSM 服务注册器  │ │ - 服务管理: systemd / init  │
              │ - 隧道引擎: cloudflared.exe │ │ - 隧道引擎: cloudflared     │
              └─────────────────────────────┘ └─────────────────────────────┘
```

---

## 三、 双端分离架构设计（Admin Portal vs Client Portal）

为了彻底理清系统职责并杜绝权限混乱，云端版正式拆分为独立的**两大业务前端**：

```
                              ┌──────────────────────────────────────────────┐
                              │         访问入口: https://sub.example-airport.com   │
                              └──────────────────────┬───────────────────────┘
                                                     │
                         ┌───────────────────────────┴───────────────────────────┐
                         ▼                                                       ▼
            【客户端 / 用户前台】                                       【管理端 / 站长后台】
              路由: / 或 /app                                             路由: /admin
    ┌─────────────────────────────────┐                         ┌─────────────────────────────────┐
    │ 适用人群: 普通用户 / 朋友 / 访客  │                         │ 适用人群: 站长 / 系统管理员 (你)  │
    ├─────────────────────────────────┤                         ├─────────────────────────────────┤
    │ 1. 极简机场订阅一键转换与聚合    │                         │ 1. 域名与 Cloudflare 隧道管理   │
    │ 2. 个人私有订阅库 (数据物理隔离) │                         │ 2. 全站用户列表与状态管控       │
    │ 3. 手机端一键扫码 / 专属短链拉取 │                         │ 3. 注册开放开关 / 邀请码生成器  │
    │ 4. 个人登录密码与专属 Token 重置│                         │ 4. 核心进程健康度 / 实时日志监控 │
    │ 5. 0 底层配置暴露 (极致纯净小白)│                         │ 5. 全站 API 频次与安全风控配置  │
    └─────────────────────────────────┘                         └─────────────────────────────────┘
```

---

### 1. 客户端前台（Client Portal · 路由 `/`）

面向普通终端用户的极简日常使用端，设计语言参考 Linear / Vercel 极简现代风，**严禁暴露任何系统参数与网络底层配置**。

* **核心功能模块**：
  1. **极简转换工作台**：输入框自动识别单节点或订阅 URL，一键切换 Clash / V2Ray / Sing-box / Surge 目标格式；
  2. **个人私有订阅库**：
     * 保存常用机场别名（如“我的主力 1 号”、“备用节点”）；
     * 多源自动去重与合并拉取；
     * **严格租户隔离**：通过当前用户的登录 JWT 过滤，用户仅能看到自己的数据；
  3. **手机一键秒拉取（小白闭环）**：
     * 专属长效短链：`https://sub.example-airport.com/sub?token=<个人Token>&target=clash`；
     * 屏幕正中央高亮显示动态二维码，手机打开相机或微信直接扫码导入；
  4. **个人安全中心**：
     * 修改个人密码；
     * **【一键重置专属 Token】**（若手机丢失或订阅短链被意外泄露，点击一秒作废旧 Token 并生成新链接）。

---

### 2. 管理员后台（Admin Portal · 路由 `/admin`）

仅限管理员身份（`role = 'admin'`）通过管理员账号密码登录，负责整个云端系统的运行中枢。

* **核心功能模块**：
  1. **域名与公网隧道配置面板**：
     * 专属公网域名填空：`https://sub.example-airport.com`；
     * Cloudflare 隧道 Token 填空与开机自启安装按钮；
     * 状态仪表盘：`🟢 专线已连通 | QUIC 延迟: 18ms | 边缘节点: pdx03`；
     * 小白保底开关：`【免配置临时外网一键开启/关闭】`；
  2. **用户与租户管理中心**：
     * 用户列表查阅（用户名、注册时间、名下订阅数量、最后活跃时间）；
     * 账号状态控制（一键冻结违规账号、强制重置用户 Token、强制注销下线）；
     * **注册权限策略开关**：
       * `[开启 / 关闭 全网公开注册]`；
       * `[生成管理员专属注册邀请码]`（防恶意刷机）。
  3. **系统服务与核心监控**：
     * subconverter 核心与 Python 网关运行状态（CPU、内存占用、已运行时长）；
     * 服务一键重启（Restart SubFlow Core）；
     * 核心规则与缓存一键粉碎（Clear Cache）。
  4. **安全与防刷策略设置**：
     * 登录失败锁定阈值设置（默认连续 5 次封禁 IP 15 分钟）；
     * `/sub` 接口速率限制调节（默认 5 次/秒/IP）。

---

### 3. 双端权限控制矩阵（RBAC）

| 访问路径 | 访客 (未登录) | 普通用户 (User) | 系统管理员 (Admin) |
| :--- | :--- | :--- | :--- |
| **`/` (客户端主页)** | 可访问（显示登录/注册引导） | 允许访问（加载个人工作台） | 允许访问（顶部显示【进入管理后台】入口） |
| **`/api/user/*`** | 401 Unauthorized | 仅能读写自身 `user_id` 的记录 | 可读写自身记录 |
| **`/admin` (后台页面)** | 强制重定向至 `/admin/login` | 403 Forbidden (无权进入) | 允许访问完整管理后台 |
| **`/api/admin/*`** | 401 Unauthorized | 403 Forbidden | 允许执行系统级管理操作 |
| **`/sub?token=...`** | 校验 Token 合法性后放行 | 校验 Token 合法性后放行 | 校验 Token 合法性后放行 |

---

## 四、 总体架构设计（Architecture Overview）


```
                         【外网公网多端设备】
                    (手机 Clash / 平板 / 电脑浏览器)
                                │
                                ▼ HTTPS 域名访问 (https://sub.example-airport.com)
                    ┌────────────────────────┐
                    │   Cloudflare Tunnel    │
                    └───────────┬────────────┘
                                │ 本地隧道代理 (HTTP:25588)
                                ▼
         ┌────────────────────────────────────────────────────────┐
         │             SubFlow Linux Gateway (gateway.py)         │
         │   - 自动透传反向代理头 (CF-Connecting-IP / X-Forwarded-*)   │
         │   - JWT / Session 鉴权拦截器                           │
         │   - 基于 SQLite 3 的多租户逻辑强隔离                   │
         └─────────────┬────────────────────────────┬─────────────┘
                       │                            │
        ┌──────────────┴──────────────┐      ┌──────┴─────────────────────────┐
        ▼                             ▼      ▼                                ▼
  用户认证中心 (/api/auth)    用户订阅中心 (/api/user)  客户端无感拉取 (/sub?token=...)   静态前端资源 (/index.html)
        │                             │                      │                (相对路径/自适应 BaseURL)
        ▼                             ▼                      ▼
┌──────────────────┐          ┌──────────────────┐     ┌──────────────────┐
│  SQLite 数据库   │          │  SQLite 数据库   │     │   subconverter   │
│  (users 表)      │          │(subscriptions 表)│     │   核心 (25500)   │
└──────────────────┘          └──────────────────┘     └──────────────────┘
```

---

### 1. 前端（`web/index.html`）域名完全自适应改造

#### ① 所有 API 请求全面转换为相对路径
* **规范**：彻底移除所有接口中的 `http://127.0.0.1:25588` 前缀；
* **示例**：
  ```javascript
  // 改造前 ❌
  fetch('http://127.0.0.1:25588/api/status')
  
  // 改造后 ✅
  fetch('/api/status')
  ```

#### ② 抽取统一的 `getEffectiveBaseUrl()` 动态域名解析器
在前端主脚本中注入全局基准 URL 计算函数：
```javascript
/**
 * 云端版统一基准 URL 计算函数
 * 逻辑: 优先当前域名 > 优先用户手动指定域名 > 仅单机本地回退 127.0.0.1
 */
function getEffectiveBaseUrl() {
  // 1. 若当前正是通过公网域名/非 localhost 打开 (如 https://sub.example-airport.com)
  if (window.location.hostname && 
      window.location.hostname !== '127.0.0.1' && 
      window.location.hostname !== 'localhost') {
    return window.location.origin;
  }

  // 2. 检查管理员或用户在设置里预设的公网域名
  const preset = localStorage.getItem('subflow_cloud_domain');
  if (preset && preset.trim()) {
    return preset.trim().replace(/\/$/, '');
  }

  // 3. 兜底回退
  return 'http://127.0.0.1:25588';
}
```

#### ③ 所有订阅生成函数统一依赖动态 Base URL
* **个人订阅短链生成**：
  ```javascript
  function buildSubscriptionUrl(userToken) {
    const baseUrl = getEffectiveBaseUrl();
    return `${baseUrl}/sub?token=${encodeURIComponent(userToken)}&target=clash`;
  }
  ```
* **单次节点转换生成**：
  ```javascript
  function buildSingleConvertUrl(target, sourceUrl) {
    const baseUrl = getEffectiveBaseUrl();
    return `${baseUrl}/sub?target=${target}&url=${encodeURIComponent(sourceUrl)}&udp=true&scv=true`;
  }
  ```

#### ④ 彻底清除预置 Demo 假数据与纯净空状态（Empty State）规范
* **历史遗留问题（严重误导）**：
  原版代码在 `web/index.html`（第 1932 ~ 1964 行）硬编码了 `DEFAULT_HISTORY_SAMPLES`，包含 **“极速云 (主用高速)”** 和 **“魔戒 (备用中转)”** 两条演示数据。当新用户初次打开网页时，代码会自动将其塞入浏览器的 `localStorage`，导致用户产生“账号被他人使用”或“泄露他人节点”的严重误解！
* **重构改造要求**：
  1. **彻底拔除硬编码假数据**：
     ```javascript
     // 改造前 (有硬编码演示假数据) ❌
     const DEFAULT_HISTORY_SAMPLES = [
       { id: 'sub_demo_1', name: '极速云 (主用高速)', ... },
       { id: 'sub_demo_2', name: '魔戒 (备用中转)', ... }
     ];
     if (!historyList || historyList.length === 0) {
       historyList = JSON.parse(JSON.stringify(DEFAULT_HISTORY_SAMPLES));
       localStorage.setItem('subflow_history', JSON.stringify(historyList));
     }

     // 改造后 (100% 纯净初始态) ✅
     const DEFAULT_HISTORY_SAMPLES = [];
     let historyList = [];
     // 云端版一律由后端 /api/user/subscriptions 动态拉取当前用户真实数据，严禁自动塞入任何测试占位符！
     ```
  2. **优雅的空状态（Empty State）UI 呈现**：
     当新用户注册进入，且订阅列表为空（`historyList.length === 0`）时，界面渲染现代极简空状态卡片：
     ```html
     <div class="empty-state-card" style="text-align: center; padding: 48px 20px; color: #888;">
       <div style="font-size: 40px; margin-bottom: 12px;">📦</div>
       <div style="font-weight: 600; font-size: 16px; color: #eee; margin-bottom: 6px;">暂无已保存的订阅</div>
       <div style="font-size: 13px;">请在上方输入机场链接完成转换，或点击【+ 添加订阅】保存至您的私有库</div>
     </div>
     ```
  3. **验收效果**：新用户界面绝对纯净，0 预置残留、0 假数据污染。

---

### 2. 后端（`gateway.py`）多租户数据隔离设计

云端版推荐基于 Python 原生内置的 **SQLite 3**（单文件数据库 `/opt/subflow/subflow.db`），**零配置、零外部依赖、极省内存**。

#### ① 数据库表设计（Schema DDL）
```sql
-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,       -- 用户名
    password_hash VARCHAR(128) NOT NULL,        -- PBKDF2 加盐安全哈希 (严禁存明文)
    salt VARCHAR(32) NOT NULL,                  -- 随机盐值
    user_token VARCHAR(64) UNIQUE NOT NULL,     -- 手机端无密码拉取订阅专用长效 Token
    role VARCHAR(10) DEFAULT 'user',            -- 角色: admin / user
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 个人专属订阅表 (租户严格隔离)
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,                   -- 强关联所属用户 ID
    alias_name VARCHAR(100),                    -- 机场别名 (如: 极速云/魔戒)
    source_url TEXT NOT NULL,                   -- 原始机场订阅链接
    target_format VARCHAR(20) DEFAULT 'clash',  -- 偏好格式
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_subs ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_token ON users(user_token);
```

#### ② 密码安全加盐散列（Python 3 原生标准库）
```python
import hashlib
import secrets

def hash_password(password: str) -> tuple[str, str]:
    """生成加盐密码哈希"""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode('utf-8'), 
        salt.encode('utf-8'), 
        100000
    ).hex()
    return pwd_hash, salt

def verify_password(password: str, pwd_hash: str, salt: str) -> bool:
    """验证密码一致性"""
    check_hash = hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode('utf-8'), 
        salt.encode('utf-8'), 
        100000
    ).hex()
    return secrets.compare_digest(check_hash, pwd_hash)
```

---

### 3. 多租户专属 API 接口与权限矩阵

| 接口路径 | 方法 | 鉴权要求 | 说明 |
| :--- | :--- | :--- | :--- |
| **`/api/auth/register`** | `POST` | 公开 (可控开关) | 注册账号，自动签发 32 位唯一拉取 Token |
| **`/api/auth/login`** | `POST` | 公开 | 登录成功后发放 Session 鉴权凭证 |
| **`/api/auth/me`** | `GET` | 需登录态 | 获取当前用户信息及专有 Token |
| **`/api/user/subscriptions`** | `GET` | 需登录态 | **严密隔离：强制 `WHERE user_id = ?`，仅查自己名下订阅** |
| **`/api/user/subscriptions`** | `POST` | 需登录态 | 添加/更新当前登录用户专属订阅 |
| **`/api/user/subscriptions/<id>`** | `DELETE` | 需登录态 | 删除个人名下指定的订阅记录 |
| **`/sub`** | `GET` | **验证 `token`** | **移动端核心接口：免登录拉取，根据 Token 聚合对应用户的全部节点** |

---

### 4. 移动端专属 Token 拉取机制（零密码极速拉取）

手机 Clash、Shadowrocket 等客户端无法输入用户名密码，必须通过安全 Token 免密更新：

1. **生成给手机的订阅格式**：
   ```text
   https://sub.example-airport.com/sub?token=8f9a2b7c4d1e6f0a3b5c7d9e1f3a5b7c&target=clash
   ```
2. **云端网关处理管线**：
   * 网关拦截到 `/sub` 请求，提取 query 中的 `token`；
   * 执行 SQL：`SELECT id FROM users WHERE user_token = ?`；
   * **校验成功**：提取该用户下所有有效的 `source_url`，拼接为复合订阅源，并向本地 `subconverter:25500` 核心请求转换并吐出结果；
   * **校验失败/未携带**：直接返回 `HTTP 403 Forbidden - Invalid Token`，彻底封死未授权盗刷与爬取。

### 5. 零知识隐私架构：管理员绝对零权限原则（Zero-Knowledge Privacy）

> **最高安全铁律**：**“We couldn't read your data even if we wanted to”**  
> 哪怕是拥有最高系统权限的站长/超级管理员，在管理后台或直接登录数据库，也**绝对 100% 无法查看、还原、导出任何客户的真实订阅链接与节点！**

```
┌────────────────────────────────────────────────────────────────────────┐
│                        用户浏览器 / 手机客户端                          │
│                                                                        │
│  [原始机场链接]                                                         │
│        │                                                               │
│        ▼ (使用用户自身密码派生的 Key 在本地完成 AES-256-GCM 强加密)         │
│  [密文: a7f9...:9f48...]                                               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ 仅上传密文
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     云端服务器 & 数据库 /opt/subflow/subflow.db          │
│                                                                        │
│  存储内容: 密文字符串 (无用户密码，服务端在数学上绝对无法解密)             │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    【管理员后台 Admin Portal】                    │  │
│  │                                                                  │  │
│  │  • 仅展示: 客户用户名、注册时间、订阅数量统计: 2 条               │  │
│  │  • 严禁项: 物理剥离任何查询明文订阅的 API 与前端详情卡片          │  │
│  │  • 盲化效果: 无论管理员如何点击或抓包，看到的永远是密文或数量     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

#### ① 管理员后台“数据完全盲化”规范：
* **接口盲化**：后端代码中，任何属于 `/api/admin/*` 的路由，**严禁提供查询其他用户 `source_url` 的 SQL 语句**；
* **界面脱敏**：在管理员用户列表表格中：
  * 显示字段：`用户 ID`、`用户名`、`订阅记录总数 (Count)`、`注册时间`、`账号状态 (正常/冻结)`；
  * **绝不提供“查看订阅列表”按钮**；
* **用户专属拉取机制**：
  * 当客户端拉取 `/sub?token=xxx` 时，解密动作仅由受保护的内部转发进程在**内存中瞬时完成**并直接喂给 subconverter，整个过程绝不留存明文日志、绝不暴露给任何 Web 管理页面。

---

## 六、 金融级抗破解与数据加密安全规范（Anti-Crack & Cryptography）


> **安全底线原则**：假设在最极端的恶劣情况下——VPS 被黑客攻破、数据库文件 `/opt/subflow/subflow.db` 被整库拖走，黑客也**绝对无法还原出任何一个用户的明文密码与机场订阅链接**！

---

### 1. 原始订阅链接：AES-256-GCM 军工级密文入库
* **致命风险**：若数据库里的 `source_url` 存的是明文链接，数据库一旦被偷，所有节点瞬间泄露；
* **解决方案**：在存入数据库前，使用 **AES-256-GCM（带认证标签的对称加密）** 加密，数据库里只存密文十六进制串。

#### Python 3 原生安全加解密实现标准：
```python
import os
from base64 import b64encode, b64decode
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# 1. 服务端主密钥 (从环境变量读取，或首次运行生成在 0600 权限的独立 secret.key 中)
# 严禁将主密钥直接写死在代码或数据库中！
MASTER_KEY_HEX = os.environ.get("SUBFLOW_SECRET_KEY")
if not MASTER_KEY_HEX:
    SECRET_FILE = "/opt/subflow/.master.key"
    if os.path.exists(SECRET_FILE):
        with open(SECRET_FILE, "r") as f:
            MASTER_KEY_HEX = f.read().strip()
    else:
        MASTER_KEY_HEX = os.urandom(32).hex()
        with open(SECRET_FILE, "w") as f:
            f.write(MASTER_KEY_HEX)
        os.chmod(SECRET_FILE, 0o600)

AES_KEY = bytes.fromhex(MASTER_KEY_HEX)

def encrypt_airport_url(plain_url: str) -> str:
    """AES-256-GCM 加密机场链接 (防脱库核心)"""
    aesgcm = AESGCM(AES_KEY)
    nonce = os.urandom(12)  # 每次加密随机 12 字节 Nonce，相同明文每次生成的密文都不一样
    ciphertext = aesgcm.encrypt(nonce, plain_url.encode('utf-8'), None)
    # 存储格式: nonce_hex:ciphertext_hex
    return f"{nonce.hex()}:{ciphertext.hex()}"

def decrypt_airport_url(cipher_str: str) -> str:
    """解密还原机场链接 (仅在转发核心前瞬间在内存解密)"""
    try:
        parts = cipher_str.split(":")
        if len(parts) != 2:
            return cipher_str
        nonce = bytes.fromhex(parts[0])
        ciphertext = bytes.fromhex(parts[1])
        aesgcm = AESGCM(AES_KEY)
        return aesgcm.decrypt(nonce, ciphertext, None).decode('utf-8')
    except Exception:
        return ""
```
* **效果**：数据库 `subscriptions` 表里的 `source_url` 显示为：
  `a7f9b2c8e10d:9f48ac77b1029c...`，黑客脱库拿到的全是天书。

---

### 2. 密码防破解：PBKDF2-HMAC-SHA256 (100,000 次高强度迭代)
* **加盐计算**：每个用户拥有独一无二的 16 字节随机 Salt；
* **抗 GPU 爆破**：迭代 100,000 次，强制提升哈希计算的 CPU/时间成本，彻底废掉黑客的彩虹表与 GPU 离线暴力穷举。

---

### 3. 用户专属 Token：256 位密码学真随机数
* **Token 长度**：64 位十六进制字符（`secrets.token_hex(32)`）；
* **抗撞库**：具备 $2^{256}$ 种可能，即使黑客每秒发起 10 亿次探测，也需要 $10^{60}$ 年才能猜中一个有效 Token，数学上杜绝撞库遍历。

---

### 4. 接口层抗爆破防线（Brute-force Protection）
* **登录防刷拦截**：
  * 同一 IP 连续输错密码 5 次，锁定该 IP 登录请求 15 分钟；
* **敏感路由频次限制（Rate Limit）**：
  * `/sub` 接口单个 IP 限制每秒最多 5 次请求，防止黑客对聚合转换接口发起 DDOS 穿透攻击。

---

## 七、 默认云端 IP 兜底与域名平滑转换规范（管理员专权接管 · 免 AI 纯可视化）

> **核心设计哲学**：
> 1. **开箱即用（IP 兜底）**：新机器刚部署好尚未绑定域名时，系统**默认且自动使用当前云端服务器的真实公网 IP**（如 `http://1.2.3.4:25588`），用户一秒测通，无需等待 DNS 解析；
> 2. **进阶绑定（域名锁定）**：一旦管理员在后台绑定了专属域名（如 `https://sub.example-airport.com`），系统全局广播，**所有用户前台生成的订阅短链瞬间无缝切换为域名前缀**；
> 3. **职责绝对收敛**：**普通用户端完全隐藏所有网络底层信息；域名与 IP 的探测、切换、绑定、重定向，100% 由【/admin 管理员后台】专权负责！**

---

### 1. 域名与 IP 转换的全生命周期流程（Dual-Phase Lifecycle）

```
                        ┌──────────────────────────────────────┐
                        │   新部署/未绑定域名阶段 (IP 兜底模式)   │
                        └──────────────────┬───────────────────┘
                                           │
          ┌────────────────────────────────┴────────────────────────────────┐
          ▼                                                                 ▼
【管理员在后台查看当前公网 IP】                                     【用户在前台直接转换使用】
显示: 1.2.3.4 (自动从网关透传探测)                                  生成的链接: http://1.2.3.4:25588/sub?token=xxx
                                                                    (开箱即用，0 门槛，手机直接扫码)
                                           │
                                           │ 管理员登录 /admin 后台
                                           │ 填写绑定域名: https://sub.example-airport.com
                                           ▼
                        ┌──────────────────────────────────────┐
                        │     进阶正式运营阶段 (域名锁定模式)     │
                        └──────────────────┬───────────────────┘
                                           │
          ┌────────────────────────────────┴────────────────────────────────┐
          ▼                                                                 ▼
【全站生成的订阅链接瞬间无缝切换】                                 【可选: 开启 IP 访问 301 强制跳转】
前台生成的订阅链接 100% 自动变为:                                  若有人通过裸 IP http://1.2.3.4:25588 访问，
https://sub.example-airport.com/sub?token=xxx                             系统自动 301 强跳至 https 域名，防黑客扫 IP
```

---

### 2. 管理员专属控制台界面交互（Admin Network Console Mockup）

此面板仅在 `/admin` 路由（且角色为 `admin`）展示，**普通用户端完全无权查看**：

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🌐 全局网络入口与域名绑定中枢 (仅系统管理员可见)                         │
├────────────────────────────────────────────────────────────────────────┤
│ 1. 服务器当前探测 IP : 🟢 1.2.3.4:25588 (已放行公网入站)                 │
│                                                                        │
│ 2. 当前运行模式      : [ ● 域名优先模式 (推荐) ]  [ ○ 裸 IP 兼容模式 ] │
│                                                                        │
│ 3. 专属绑定域名 (为空则默认使用上方 IP) :                              │
│ [ https://sub.example-airport.com                                    ]       │
│ 提示: 绑定后，所有用户前台生成的订阅短链将自动转换为本域名             │
│                                                                        │
│ 4. Cloudflare 隧道 Token (专线穿透可选) :                              │
│ [ eyJhIjoiNWEyZTAwNjQ5OGFiZWI5ZWI4OWYxYWVhNTk3NzI1ZWIiLCJ0... ]       │
│                                                                        │
│ 5. 安全防护选项 :                                                      │
│ [√] 开启 301 强制跳转 (当访客通过纯 IP 访问时，自动重定向至安全域名)    │
│ [√] 开启 HTTPS 强制升级 (自动抹除 Mixed Content 风险)                  │
│                                                                        │
│ [  💾 保存网络设置并全局生效  ]     [  ⚡ 一键生成免配置临时公网 (3秒开通) ] │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 3. 前后端实现标准（自适应 BaseURL 与 301 强跳）

#### ① 前端动态基准 URL 解析逻辑（`web/index.html`）
```javascript
/**
 * 云端版统一基准 URL 计算函数 (自动处理 IP ➔ 域名平滑切换)
 */
function getEffectiveBaseUrl() {
  // 1. 优先读取系统后台下发的全局配置 (由管理员绑定)
  if (window.SUBFLOW_GLOBAL_DOMAIN && window.SUBFLOW_GLOBAL_DOMAIN.trim()) {
    return window.SUBFLOW_GLOBAL_DOMAIN.trim().replace(/\/$/, '');
  }

  // 2. 若未绑定域名，则取当前浏览器实际访问的地址 (如 http://1.2.3.4:25588)
  if (window.location.origin) {
    return window.location.origin;
  }

  // 3. 兜底本地回退
  return 'http://127.0.0.1:25588';
}
```

#### ② 后端网关自动探测 IP 与 301 强跳（`gateway.py`）
```python
# 存储于 data/server_config.json
server_config = {
    "bound_domain": "https://sub.example-airport.com",  # 为空则为 IP 模式
    "tunnel_token": "",
    "force_domain_redirect": True                 # IP 强跳域名开关
}

def request_filter(req):
    """全局请求过滤器: 处理 IP ➔ 域名 301 重定向"""
    bound_domain = server_config.get("bound_domain")
    force_redirect = server_config.get("force_domain_redirect")
    
    if bound_domain and force_redirect:
        host = req.headers.get("Host", "")
        # 如果当前是用纯 IP 访问，但系统已绑定正式域名，自动 301 强跳到域名
        if is_pure_ip_or_different_host(host, bound_domain):
            target_url = f"{bound_domain}{req.path}"
            return redirect_301(target_url)
    return None
```

#### ③ 双模式极简向导（去 AI 依赖 · 纯傻瓜开箱）
1. **正式绑定模式（填空即生效）**：
   * 管理员只需在网页输入框粘贴域名和 Cloudflare Token，点击保存；
   * 后端后台静默更新服务，无需敲任何黑底命令。
2. **极速体验模式（零域名小白 · 纯傻瓜）**：
   * 管理员点击 **“一键生成免配置临时公网”**；
   * 后端自动拉起临时 Quick Tunnel，3 秒内自动抓取生成的临时 HTTPS 链接并弹窗高亮显示，直接扫码拉取。

---

## 八、 三端独立交付与部署启动规范（Platform Packaging & Startup）

针对三大产品形态，工程打包结构与启动规范必须严格区分：

### 1. Windows 客户本地版（Windows Desktop Edition）
* **定位**：给普通终端用户在个人电脑双击运行，纯本地转换。
* **交付目录结构**：
  ```text
  SubFlow-Windows-Client/
  ├── SubFlow.exe               # (可选) WebView2 轻量壳程序 / 托盘管理程序
  ├── start_client.bat          # 双击一键启动脚本 (自动打开浏览器 http://127.0.0.1:25588)
  ├── gateway.exe / gateway.py  # 启动参数: --mode=local (免登录、读本地配置)
  ├── subconverter.exe          # Windows x64 核心二进制
  ├── base/                     # subconverter 基础规则库与模板
  └── web/                      # 前端静态资源 (强制加载本地单机模式 UI)
  ```
* **运行特征**：
  * 启动后检测到 `--mode=local`，界面隐藏【登录/注册/管理后台】按钮；
  * 订阅直接保存在本地 `config.json`，不生成任何用户数据库，不联网验证。

---

### 2. 云端 Windows 版（Windows Server Cloud Edition）
* **定位**：部署在 Windows Server VPS、云主机或 Windows 软路由上，提供 7×24 小时公网多租户服务。
* **交付目录结构**：
  ```text
  SubFlow-Windows-Cloud/
  ├── 1-一键安装系统服务.bat     # 必须右键以管理员运行 (基于 NSSM 自动注册开机自启服务)
  ├── 2-一键停止与卸载服务.bat   # 卸载清理脚本
  ├── bin/
  │   ├── nssm.exe              # Windows 专用可靠服务守护器 (无黑框、崩掉秒重启)
  │   ├── cloudflared.exe       # Windows 原生 Cloudflare 隧道二进制
  │   └── subconverter.exe      # Windows x64 核心二进制
  ├── gateway.exe / gateway.py  # 启动参数: --mode=cloud (加载 SQLite 多租户与管理员后台)
  ├── data/                     # 存放 subflow.db (SQLite) 与 .master.key
  └── web/                      # 前端静态资源 (含用户前台与 /admin 站长后台)
  ```
* **一键服务注册脚本规范 (`1-一键安装系统服务.bat`)**：
  ```bat
  @echo off
  cd /d "%~dp0"
  echo [*] 正在为 SubFlow 注册 Windows 后台服务...
  bin\nssm.exe install SubFlowCloudService "%~dp0gateway.exe" "--mode=cloud"
  bin\nssm.exe set SubFlowCloudService AppDirectory "%~dp0"
  bin\nssm.exe set SubFlowCloudService Start SERVICE_AUTO_START
  bin\nssm.exe start SubFlowCloudService
  echo [√] SubFlow 云端服务已成功在 Windows 后台启动并设为开机自启！
  pause
  ```

---

### 3. 云端 Linux 版（Linux Cloud Edition · 如 InstaBox / VPS / Docker）
* **定位**：轻量级 Linux 服务器、MicroVM 或容器环境，极度追求内存与 CPU 效率。
* **交付目录结构**：
  ```text
  /opt/subflow/
  ├── subflow                   # ELF Linux x86_64 转换核心 (chmod +x)
  ├── gateway.py                # Python 3 高性能网关 (异步多租户)
  ├── install.sh                # Linux 一键安装脚本 (配置 systemd 与开机自启)
  ├── subflow.service           # systemd 单元文件
  ├── Dockerfile                # Docker 容器镜像编译规范 (Alpine 基础镜像)
  ├── docker-compose.yml        # 一键拉起配置文件
  ├── data/subflow.db           # SQLite 数据库
  └── web/                      # 前端静态资源
  ```
* **systemd 单元规范 (`/etc/systemd/system/subflow.service`)**：
  ```ini
  [Unit]
  Description=SubFlow Cloud Multi-Tenant Service
  After=network.target

  [Service]
  Type=simple
  User=root
  WorkingDirectory=/opt/subflow
  ExecStart=/usr/bin/python3 /opt/subflow/gateway.py --mode=cloud
  Restart=always
  RestartSec=3
  LimitNOFILE=65535

  [Install]
  WantedBy=multi-user.target
  ```

---

## 九、 生产级稳定性与商业级体验进阶规范（Production Enhancements）

为确保交付给用户的产品达到商业级稳定度，开发团队必须落实以下 5 项进阶机制：

### 1. 上游机场宕机兜底容灾（Upstream Fallback Snapshot Cache）
* **业务痛点**：若上游机场因官网维护、被墙或 Cloudflare 盾拦截而返回 502/超时，传统转换器直接报错抛出空配置，导致手机 Clash 订阅更新后**所有节点被清空、瞬间断网**。
* **实现规范**：
  1. 网关每次成功完成一次 `/sub` 转换后，将生成的 YAML 节点配置快照缓存至本地（按用户 ID 隔离，保留最新 3 份成功快照）；
  2. 当下一次手机客户端拉取请求触发，若上游机场在 8 秒内未响应或返回非 200 状态码：
     * **绝不向手机抛出 500 错误**；
     * 自动从缓存中提取上一份健康节点快照返回；
     * 自动在节点列表最顶端注入一个温馨提示节点：`💡 提示: 上游机场暂时离线，已启用离线快照兜底`；
  3. 彻底实现**手机端 365 天 24 小时永不断网**。

---

### 2. 移动端 App 一键免复制唤醒导入（Deep Link Scheme）
* **业务痛点**：手机浏览器长按复制超长订阅 URL，常出现选词截断、误触、格式混乱等操作门槛。
* **实现规范**：在用户前台订阅卡片中，提供各大主流代理软件的专属唤醒协议按钮：
  * **Shadowrocket (小火箭)**：
    ```text
    sub://<base64_encoded_sub_url>
    ```
  * **Clash / Clash Verge / Clash Meta**：
    ```text
    clash://install-config?url=<url_encoded_sub_url>&name=SubFlow
    ```
  * **Sing-box**：
    ```text
    sing-box://import-remote-profile?url=<url_encoded_sub_url>#SubFlow
    ```
  * **Surge**：
    ```text
    surge:///install-config?url=<url_encoded_sub_url>
    ```
  * **效果**：手机浏览器点击对应客户端图标，直接自动跳转打开 App 并完成订阅下载导入，**0 复制粘贴，极致小白化**。

---

### 3. 访客临时借用 / 阅后即焚短链（Disposable Guest Token）
* **业务痛点**：朋友临时借节点应急，或需在公共电脑临时转换一次，既不想让朋友注册账号，又绝不能把自己的长效 Token 给对方。
* **实现规范**：
  1. 用户在客户端前台点击【生成临时分享码】；
  2. 可配置失效条件：
     * `[限时失效]`：如 2 小时 / 24 小时后自动销毁；
     * `[限次失效]`：如拉取 3 次后自动焚毁（阅后即焚）；
  3. 数据库新增 `guest_tokens` 临时表，记录创建人、过期时间、剩余可用次数；
  4. 到期或达到次数后，网关直接返回 410 Gone，主用户原生的长期 Token 丝毫不受影响。

---

### 4. 零知识架构下的密码修改密钥轮转规范（Key Rotation）
* **技术隐患**：在零知识端到端加密体系中，由于订阅密文是由用户登录密码派生的 Key 加密的，如果用户修改了密码而服务端不知情，用户的历史订阅将永久沦为“不可解密死锁乱码”。
* **实现规范**：
  ```
  [用户在网页点击修改密码 (输入旧密码 Pwd_Old 与新密码 Pwd_New)]
                            │
                            ▼
  1. 浏览器前端在本地内存中，用 Pwd_Old 派生 Key_Old 解密名下全部订阅密文
                            │
                            ▼
  2. 浏览器前端立即在本地内存中，用 Pwd_New 派生 Key_New 重新加密全部订阅
                            │
                            ▼
  3. 将 [新加盐密码哈希] + [新密码加密后的订阅密文包] 一次性 POST 提交后端
                            │
                            ▼
  4. 后端开启数据库事务 (Transaction)，原子性完成密码哈希与密文批量替换
  ```
* **效果**：既保持“服务端和管理员 100% 盲化（零知识）”，又保证用户无论如何修改密码，数据永远平滑迁移无损。

---

### 5. 敏感链接脱敏与离线加密备份（Privacy Masking & Backup）
* **脱敏展示**：
  * 界面上的机场原始 URL 默认掩码打码显示：`https://airport.com/api/v1/client/sub?token=****`；
  * 提供“👁 查看 / 隐藏”小眼睛切换按钮，防止在公共办公区域截屏或被身旁他人窥视。
* **离线加密冷备**：
  * 用户中心提供【导出我的私有加密备份 (.subflow.json)】按钮；
  * 文件经本地 AES 加密后打包导出；即使用户自建新服务器或迁移主机，点击【导入备份】一键无损还原。

---

## 十、 对标市面顶级转换面板的体验细节优化（Market Benchmarking & UX Polish）

参考主流成熟产品（Sub-Store、ACL4SSR、V2Board/Xboard、Metacubexd）的商业运营经验，开发团队需在前后端落实以下 8 项体验细节：

### 1. 用户前台（Client Portal）体验细节

#### ① 智能地区筛选与节点广告一键清洗（Node Filter & Clean）
* **行业痛点**：大量机场节点名充斥各种长串推广广告（如 `👑【VIP-01】[0.5x] 香港 01 - 官网防失联加群...`），手机客户端展示极度杂乱拥挤。
* **开发规范**：
  * **一键净化开关**：自动通过预设正则清洗“官网”、“防失联”、“测速”、“交流群”等杂质文字；
  * **地区快捷点选**：提供快捷标签卡片（🇭🇰 香港、🇯🇵 日本、🇸🇬 新加坡、🇺🇸 美国），点击点亮即可只保留目标地区的节点；
  * **倍率过滤**：支持勾选“自动排除 > 2.0x 高倍率节点”，防止用户误耗流量。

#### ② 机场真实流量与到期倒计时可视化（UserInfo Header Parsing）
* **行业痛点**：用户无法直观了解当前机场还能用多久、还剩多少流量。
* **开发规范**：
  * 网关请求上游机场时，抓取 HTTP 响应头中的 `subscription-userinfo` 字段（`upload=...; download=...; total=...; expire=...`）；
  * 前台卡片自动换算为人类可读的 GB/TB，并渲染彩色进度条：
    * 剩余 > 30%：🟢 绿色健康
    * 剩余 10% ~ 30%：🟡 黄色预警
    * 剩余 < 10% 或已过期：🔴 红色高亮告警
  * 若上游机场不支持该响应头，则前端优雅不显示该卡片，**严禁渲染出 `NaN` 或空白占位**。

#### ③ 多机场多源一键合并聚合（Multi-Source Aggregation）
* **开发规范**：
  * 用户前台的订阅列表支持复选框多选；
  * 勾选 2 个或多个机场（如“主力香港” + “备用中转”），右下角浮现【⚡ 一键生成多源合并短链】；
  * 手机端只需导入这一条聚合短链，即可同时拥有两家机场的全部节点。

#### ④ 移动端触感震动反馈与 Toast 浮窗（Haptic & Micro-interactions）
* **开发规范**：
  * 手机端用户点击“复制链接”或“扫码”时，调用 Web 原生震动 API：
    ```javascript
    if (navigator.vibrate) { navigator.vibrate(40); } // 40ms 轻微触觉反馈
    ```
  * 屏幕正上方滑出 2 秒平滑 Toast 浮窗 `✅ 订阅短链已成功复制至剪贴板`，彻底消除手机用户因无感反馈而疯狂重复点击的问题。

---

### 2. 管理员后台（Admin Portal）运维细节

#### ① 全站维护/通知横幅广播（System Announcement Banner）
* **行业痛点**：站长进行系统升级、节点规则调优、或服务器维护时，缺乏通知朋友和用户的手段。
* **开发规范**：
  * 管理员后台提供【公告发布器】（支持纯文本或超链接、过期时间设置）；
  * 用户前台顶部展示现代轻量彩色通知条（如 `📢 维护通知: 今晚 23:00 将进行节点分流规则优化，期间不影响正常拉取`）；
  * 用户点击右侧【✕】按钮后，存入本地关闭状态，本次会话不再重复弹窗打扰。

#### ② 内置主流分流规则集下拉选择（Preset Ruleset Library）
* **行业痛点**：绝大多数小白用户根本不懂如何编写自定义 ACL4SSR 规则，一旦选错，可能导致淘宝、微信全部走代理变卡，或 Netflix、Disney+ 无法解锁。
* **开发规范**：
  * 管理员后台内置 4 组经典经过长期验证的规则预设：
    1. `ACL4SSR 极简精简版 (推荐 · 国内直连+国外科学)`
    2. `ACL4SSR 全分组版 (全地区细分+流媒体分流)`
    3. `回国专用免流版 (海外华人访问国内服务)`
    4. `广告过滤与隐私保护增强版`
  * 用户前台转换时，只需在下拉菜单一键点选，彻底免去手动到处寻找 GitHub raw 链接的麻烦。

#### ③ 防恶意刷流与单 IP 频次配额（Abuse & Rate Limiting）
* **行业痛点**：公网暴露端口后，常有外部爬虫或异常客户端以几秒一次的死循环疯狂请求转换接口，导致 VPS 内存被挤爆或流量被刷干。
* **开发规范**：
  * 管理员后台提供【频次防护控制】开关；
  * 支持配置：`单个 IP 每日最大请求数 (默认 200 次)`、`单个 IP 每秒最大突发数 (默认 3 次)`；
  * 触发阈值后自动返回 `HTTP 429 Too Many Requests`，并在后台【拦截日志】中记录风险 IP 与时间戳。

#### ④ 一键系统健康度智能体检（One-Click Health Diagnostics）
* **开发规范**：
  * 后台仪表盘提供【🔍 一键系统体检】按钮；
  * 3 秒内全自动巡检核心链路：
    * `[√] 25588 网关服务状态 (正常/常驻)`
    * `[√] 25500 subconverter 核心通信 (RTT: 2ms)`
    * `[√] 公网 DNS 与外网连通性 (8.8.8.8 握手延迟: 28ms)`
    * `[√] Cloudflare 隧道边缘状态 (边缘节点连通)`
    * `[√] 系统资源水线 (内存已用: 18MB / 剩余: 7.8GB | 磁盘剩余: 85%)`
  * 任何一项异常均给出针对性的中文排错提示。

---

## 十一、 全功能交付验收标准清单（Comprehensive Acceptance Criteria）

- [ ] **三大产品形态无缝覆盖**：
  * **Windows 本地版**：双击即可启动，纯单机离线运行，无登录注册门槛；
  * **Windows 云端版**：管理员双击批处理即可通过 NSSM 注册为无黑框系统服务，开机自启；
  * **Linux 云端版**：systemd 服务正常托管，内存占用稳定在 20MB 以内。
- [ ] **域名与隧道完全自适应**：
  * 通过公网域名（如 `https://sub.example-airport.com`）访问，F12 控制台 **0 个 Mixed Content 警告、0 个 404/CORS 报错**；
  * 页面所有输入框生成的订阅链接，前缀**100% 自动显示为当前公网域名**。
- [ ] **双端权限与数据强隔离**：
  * 用户端仅能读写自身记录，无法越权访问他人订阅；
  * 管理员端只有系统运维权限，**绝对无法查阅任何用户的真实订阅明文（数据彻底盲化）**。
- [ ] **金融级密文脱库安全性**：
  * 打开数据库 `sqlite3 subflow.db "SELECT source_url FROM subscriptions;"`；
  * **输出必须全为 AES-256-GCM 乱码密文，绝对看不到任何明文节点字符**。
- [ ] **高可用容灾与唤醒体验**：
  * 模拟上游机场断网，手机 Clash 拉取依然能拿到健康离线快照，不断网；
  * 手机端点击 Shadowrocket / Clash 图标，能直接唤醒 App 完成一键导入。
- [ ] **纯可视化免命令向导**：
  * 在 Web 设置中输入自定义域名和 Cloudflare Token，点击保存；
  * 后台全自动接管隧道启停，**整个过程用户无需打开黑底终端敲任何命令**。
- [ ] **纯净初始态（0 假数据污染）**：
  * 新用户注册或使用无痕浏览器首次打开网页，历史订阅存单列表必须呈现优雅的“暂无已保存订阅”空状态；
  * **100% 杜绝出现“极速云”、“魔戒”等任何开发期硬编码假数据**。




