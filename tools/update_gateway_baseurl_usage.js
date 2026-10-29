const fs = require('fs');

function update(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');
    
    // 更新 /api/lan-ip
    const oldLan = `        if path == "/api/lan-ip":
            self.send_json({
                "ip": CACHED_PUBLIC_IP,
                "port": LISTEN_PORT,
                "full": f"http://{CACHED_PUBLIC_IP}:{LISTEN_PORT}"
            })
            return`;

    const newLan = `        if path == "/api/lan-ip":
            base = self.get_base_url()
            self.send_json({
                "ip": CACHED_PUBLIC_IP,
                "port": LISTEN_PORT,
                "base_url": base,
                "full": f"{base}/sub"
            })
            return`;

    if (code.includes(oldLan)) {
        code = code.replace(oldLan, newLan);
    }

    // 更新 /api/settings
    const oldSet = `"bound_domain": server_config.get("bound_domain", ""),`;
    const newSet = `"bound_domain": server_config.get("bound_domain", ""),
                "public_ip": CACHED_PUBLIC_IP,
                "base_url": self.get_base_url(),`;
    if (code.includes(oldSet)) {
        code = code.replace(oldSet, newSet);
    }

    // 更新 /api/auth/me
    const oldMe = `"server_domain": server_config.get("bound_domain", "")`;
    const newMe = `"server_domain": server_config.get("bound_domain", ""),
                "public_ip": CACHED_PUBLIC_IP,
                "base_url": self.get_base_url()`;
    if (code.includes(oldMe)) {
        code = code.replace(oldMe, newMe);
    }

    fs.writeFileSync(filePath, code, 'utf8');
    console.log('✓ Updated base_url in ' + filePath);
}

update('gateway.py');
update('linux/gateway.py');
