#!/usr/bin/env bash
# SubFlow Server VPS 一键安装启动脚本 (Linux Ubuntu/Debian/CentOS)
set -e

echo "=== 正在安装 SubFlow 云端多用户服务器 ==="
sudo apt-get update && sudo apt-get install -y python3 python3-pip curl

# 创建工作目录
sudo mkdir -p /opt/subflow
sudo cp -r . /opt/subflow/
cd /opt/subflow

# 安装 Python 依赖
pip3 install flask requests pbkdf2

# 注册 Systemd 守护进程
sudo bash -c 'cat > /etc/systemd/system/subflow.service << "EOF"
[Unit]
Description=SubFlow Multi-user Subscription Gateway
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/subflow/cloud-server
ExecStart=/usr/bin/python3 gateway.py --port 25588
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF'

sudo systemctl daemon-reload
sudo systemctl enable subflow
sudo systemctl restart subflow

echo ""
echo "=========================================================="
echo "🎉 SubFlow 云端多用户网关已成功启动！运行端口: 25588"
echo "🌐 用户前台: http://<你的服务器IP>:25588/"
echo "⚙️  管理后台: http://<你的服务器IP>:25588/admin"
echo ""
echo "👤 初始管理员账号: admin"
echo "🔑 初始管理员密码: admin123456"
echo "⚠️  安全提醒: 登录后请立即在后台右上角修改管理员密码！"
echo "=========================================================="
