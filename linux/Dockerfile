FROM python:3.11-alpine

WORKDIR /app

# 复制前端与网关
COPY web/ /app/web/
COPY linux/gateway.py /app/gateway.py

# 设置环境变量指向 subflow-core 容器
ENV CORE_URL="http://subflow-core:25500"

EXPOSE 25588

CMD ["python3", "/app/gateway.py"]
