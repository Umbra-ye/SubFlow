#!/usr/bin/env bash
# ==============================================================================
# SubFlow (订阅流) - Linux VPS 一键全自动极速部署程序
# 官方开源仓库: https://github.com/Umbra-ye/SubFlow
# 支持系统: Ubuntu / Debian / CentOS / Rocky / Alma / Alpine
# 支持架构: x86_64 (amd64) / aarch64 (arm64)
# 特性: 0 门槛极速构建 · 15MB 超低内存 · systemd 守护进程开机自启
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}====================================================${NC}"
echo -e "${GREEN}      SubFlow · 现代订阅流中心 一键安装程序         ${NC}"
echo -e "${CYAN}====================================================${NC}"

# 1. 检查 root 权限
if [ "$(id -u)" != "0" ]; then
   echo -e "${RED}[错误] 必须使用 root 权限执行此脚本！请运行: sudo bash $0${NC}"
   exit 1
fi

INSTALL_DIR="/opt/subflow"
mkdir -p "$INSTALL_DIR"

# 2. 检查并安装基础系统依赖 (curl, tar, python3)
echo -e "${BLUE}[1/5] 检查系统环境与基础依赖...${NC}"
if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y >/dev/null 2>&1 || true
    apt-get install -y curl tar python3 >/dev/null 2>&1
elif command -v yum >/dev/null 2>&1; then
    yum install -y curl tar python3 >/dev/null 2>&1
elif command -v dnf >/dev/null 2>&1; then
    dnf install -y curl tar python3 >/dev/null 2>&1
elif command -v apk >/dev/null 2>&1; then
    apk add --no-cache curl tar python3
fi

# 3. 架构检测与核心下载
ARCH=$(uname -m)
echo -e "${BLUE}[2/5] 检测到系统架构: ${YELLOW}${ARCH}${NC}"

CORE_URL=""
if [ "$ARCH" = "x86_64" ]; then
    CORE_URL="https://github.com/tindy2013/subconverter/releases/latest/download/subconverter_linux64.tar.gz"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    CORE_URL="https://github.com/tindy2013/subconverter/releases/latest/download/subconverter_aarch64.tar.gz"
else
    echo -e "${RED}[错误] 暂不支持的架构: ${ARCH}${NC}"
    exit 1
fi

echo -e "${BLUE}[3/5] 下载并配置高性能 Linux 转换核心...${NC}"
TMP_TAR="/tmp/subconverter.tar.gz"

# 尝试主源或镜像加速下载
if ! curl -sSL -f --connect-timeout 10 "$CORE_URL" -o "$TMP_TAR"; then
    echo -e "${YELLOW}主源连接超时，正在尝试加速镜像源下载...${NC}"
    curl -sSL -f "https://ghproxy.net/$CORE_URL" -o "$TMP_TAR" || curl -sSL -f "https://mirror.ghproxy.com/$CORE_URL" -o "$TMP_TAR"
fi

tar -xzf "$TMP_TAR" -C "$INSTALL_DIR" --strip-components=1 2>/dev/null || tar -xzf "$TMP_TAR" -C "$INSTALL_DIR"
rm -f "$TMP_TAR"
chmod +x "$INSTALL_DIR/subconverter" 2>/dev/null || true

# 4. 部署 Web 前端与轻量网关 (支持本地目录与远程单行 Curl 执行)
echo -e "${BLUE}[4/5] 部署 SubFlow 现代前端与自适应网关...${NC}"
mkdir -p "$INSTALL_DIR/web"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/gateway.py" ]; then
    cp "$SCRIPT_DIR/gateway.py" "$INSTALL_DIR/gateway.py"
    [ -f "$SCRIPT_DIR/country_enricher.py" ] && cp "$SCRIPT_DIR/country_enricher.py" "$INSTALL_DIR/"
    if [ -d "$SCRIPT_DIR/web" ]; then
        cp -r "$SCRIPT_DIR/web"/* "$INSTALL_DIR/web/"
    elif [ -d "$SCRIPT_DIR/cloud-server/web" ]; then
        cp -r "$SCRIPT_DIR/cloud-server/web"/* "$INSTALL_DIR/web/"
    fi
else
    # 远程单行管道 curl 执行时，自动从 GitHub 官方源拉取纯净代码
    echo -e "${YELLOW}检测到远程一键管道执行，正在从 GitHub 官方仓库同步最新纯净资源...${NC}"
    REPO_API="https://github.com/Umbra-ye/SubFlow/archive/refs/heads/main.tar.gz"
    TMP_SRC="/tmp/subflow_src.tar.gz"
    if curl -sSL -f --connect-timeout 15 "$REPO_API" -o "$TMP_SRC" 2>/dev/null || curl -sSL -f "https://ghproxy.net/$REPO_API" -o "$TMP_SRC"; then
        tar -xzf "$TMP_SRC" -C /tmp/
        SRC_DIR="/tmp/SubFlow-main"
        [ -f "$SRC_DIR/gateway.py" ] && cp "$SRC_DIR/gateway.py" "$INSTALL_DIR/gateway.py"
        [ -f "$SRC_DIR/country_enricher.py" ] && cp "$SRC_DIR/country_enricher.py" "$INSTALL_DIR/country_enricher.py"
        if [ -d "$SRC_DIR/cloud-server/web" ]; then
            cp -r "$SRC_DIR/cloud-server/web"/* "$INSTALL_DIR/web/"
        elif [ -d "$SRC_DIR/web" ]; then
            cp -r "$SRC_DIR/web"/* "$INSTALL_DIR/web/"
        fi
        if [ -d "$SRC_DIR/base" ]; then
            cp -r "$SRC_DIR/base" "$INSTALL_DIR/"
        fi
        rm -rf "$TMP_SRC" "$SRC_DIR"
    else
        echo -e "${RED}[错误] 无法连接 GitHub 拉取代码，请检查 VPS 国际网络连接！${NC}"
        exit 1
    fi
fi

# 确保前端 index.html 存在 (若只有 cloud.html 则自动符号链接或拷贝为 index.html)
if [ ! -f "$INSTALL_DIR/web/index.html" ] && [ -f "$INSTALL_DIR/web/cloud.html" ]; then
    cp "$INSTALL_DIR/web/cloud.html" "$INSTALL_DIR/web/index.html"
fi

# 确保网关服务启动脚本存在
cat > "$INSTALL_DIR/start.sh" << 'EOF'
#!/usr/bin/env bash
cd /opt/subflow
killall -9 subconverter >/dev/null 2>&1 || true
nohup ./subconverter >/dev/null 2>&1 &
exec /usr/bin/python3 /opt/subflow/gateway.py
EOF
chmod +x "$INSTALL_DIR/start.sh"

# 5. 配置 systemd 开机自启服务
echo -e "${BLUE}[5/5] 配置 systemd 开机自启守护...${NC}"
cat > /etc/systemd/system/subflow.service << EOF
[Unit]
Description=SubFlow 2026 Subscription Gateway
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/subflow
ExecStart=/opt/subflow/start.sh
Restart=always
RestartSec=3
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable subflow >/dev/null 2>&1
systemctl restart subflow

# 6. 全自动放行防火墙端口 25588 (UFW / Firewalld / iptables 双栈)
echo -e "${BLUE}[6/6] 自动放行 25588 端口防火墙...${NC}"
if command -v ufw >/dev/null 2>&1; then
    ufw allow 25588/tcp >/dev/null 2>&1 || true
fi
if command -v firewall-cmd >/dev/null 2>&1; then
    firewall-cmd --zone=public --add-port=25588/tcp --permanent >/dev/null 2>&1 || true
    firewall-cmd --reload >/dev/null 2>&1 || true
fi
if command -v iptables >/dev/null 2>&1; then
    iptables -I INPUT -p tcp --dport 25588 -j ACCEPT >/dev/null 2>&1 || true
fi
if command -v ip6tables >/dev/null 2>&1; then
    ip6tables -I INPUT -p tcp --dport 25588 -j ACCEPT >/dev/null 2>&1 || true
fi

# 获取公网 IP (多源优选)
SERVER_IP=$(curl -sSL --connect-timeout 3 https://api.ipify.org 2>/dev/null || curl -sSL --connect-timeout 3 https://icanhazip.com 2>/dev/null || curl -sSL --connect-timeout 3 https://checkip.amazonaws.com 2>/dev/null || echo "您的VPS公网IP")

echo -e ""
echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}  🎉 恭喜！SubFlow 订阅流 Linux VPS 部署成功！       ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "  🌐 网页端控制面板:   ${CYAN}http://${SERVER_IP}:25588${NC}"
echo -e "  ⚙️ 管理员控制台:     ${CYAN}http://${SERVER_IP}:25588/admin${NC}"
echo -e "  👤 默认管理账号:     ${YELLOW}admin${NC}"
echo -e "  🔑 初始管理密码:     ${YELLOW}admin123456${NC} ${GREEN}(登录后台后可在控制台修改)${NC}"
echo -e "  ⚡ 转换接口示例:     ${CYAN}http://${SERVER_IP}:25588/sub?target=auto&url=...${NC}"
echo -e "  📁 安装根目录:       ${YELLOW}/opt/subflow${NC}"
echo -e "  🔄 常用维护命令:     ${YELLOW}systemctl status subflow${NC} (重启: restart / 停止: stop)"
echo -e "  🔒 安全防护:         ${GREEN}精准放行 25588 端口，SSH 与其余端口持续保持受控${NC}"
echo -e "  ⚡ 内存资源开销:     仅约 ${GREEN}15~25 MB${NC}，CPU 占用几乎 0%"
echo -e "${GREEN}====================================================${NC}"
echo -e "${YELLOW}温馨提示: 若您的 VPS 托管于阿里云、腾讯云、华为云、AWS 或甲骨文等云厂商，请务必在云平台网页控制台的“安全组”中放行入站 TCP 25588 端口！${NC}"
