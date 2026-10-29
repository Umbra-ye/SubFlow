const fs = require('fs');

let code = fs.readFileSync('gateway.py', 'utf8');

const getBaseUrlFunc = `
    def get_base_url(self):
        # 1. 管理员绑定的专属域名最高优先
        bound = server_config.get('bound_domain', '').strip()
        if bound:
            return bound.rstrip('/')
        # 2. 客户端请求携带的 Host (公网 IP 或反代域名)
        req_host = self.headers.get('X-Forwarded-Host') or self.headers.get('Host')
        if req_host:
            proto = self.headers.get('X-Forwarded-Proto', 'http')
            return f"{proto}://{req_host}"
        # 3. 服务器探测到的公网出口 IP
        if CACHED_PUBLIC_IP and CACHED_PUBLIC_IP != '127.0.0.1':
            return f"http://{CACHED_PUBLIC_IP}:{LISTEN_PORT}"
        return f"http://127.0.0.1:{LISTEN_PORT}"
`;

if (!code.includes('def get_base_url(self):')) {
    code = code.replace('class SubFlowHandler(BaseHTTPRequestHandler):', 'class SubFlowHandler(BaseHTTPRequestHandler):' + getBaseUrlFunc);
    fs.writeFileSync('gateway.py', code, 'utf8');
    fs.writeFileSync('linux/gateway.py', code, 'utf8');
    console.log('✓ Injected get_base_url into gateway.py and linux/gateway.py');
} else {
    console.log('get_base_url already present.');
}
