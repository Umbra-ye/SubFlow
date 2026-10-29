# SubFlow (订阅流) · Linux VPS 一键部署指南

打造 24 小时全天候私人订阅分发网关，告别公共转换隐私泄漏，任何手机与电脑随时随地秒拉取。

---

## ⚡ 方案 A：原生一键极速安装（超推荐 · 极低资源）

适用于 **Ubuntu / Debian / CentOS / Rocky / Alpine**。  
内存仅占 **15~25 MB**，CPU 几乎 0%，甚至连一年几美元的玩具 VPS / 512MB 内存机器都能飞速运行。

### 1. 登录 VPS 终端，复制并执行一行命令：
```bash
bash <(curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/SubFlow/main/linux/install.sh)
```
*(如果是本地上传的文件，直接进入项目目录运行 `sudo bash linux/install.sh` 即可)*

### 2. 安装完成后：
- 脚本会自动配置后台守护与开机自启；
- 终端会高亮输出你的 Web 面板地址：`http://你的VPS公网IP:25588`；
- 手机、电脑浏览器打开即可开始转换；在客户端填入 `http://你的VPS公网IP:25588/sub?target=clash&url=...` 即可 24 小时随时拉取！

### 常用管理命令：
- 查看运行状态：`systemctl status subflow`
- 重启服务：`systemctl restart subflow`
- 停止服务：`systemctl stop subflow`

---

## 🐳 方案 B：Docker Compose 一键部署

适合习惯用 Docker 的运维玩家：

```bash
# 1. 启动容器
docker compose -f linux/docker-compose.yml up -d

# 2. 查看日志
docker compose -f linux/docker-compose.yml logs -f
```

---

## ⚠️ 常见排坑提示：
1. **打不开网页？**
   - 请检查 VPS 云服务商（阿里云、腾讯云、搬瓦工、Oracle、AWS 等）的安全组/防火墙设置，确保入站方向放行了 **25588** 端口（TCP）。
2. **需要配域名与 HTTPS 吗？**
   - 如果你有域名，可以用 Nginx 或 Caddy 反代 `127.0.0.1:25588`，申请免费 Let's Encrypt 证书后即可通过 `https://sub.yourdomain.com` 优雅访问。
