const fs = require('fs');

function patch(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');

    // 1. /api/auth/challenge 输出 id 和 mode 别名
    const oldChal = `            self.send_json({
                "ok": True,
                "captcha_mode": mode,
                "turnstile_site_key": server_config.get("turnstile_site_key", ""),
                "challenge_id": cid,
                "nonce": nonce
            })`;

    const newChal = `            self.send_json({
                "ok": True,
                "captcha_mode": mode,
                "mode": mode,
                "turnstile_site_key": server_config.get("turnstile_site_key", ""),
                "challenge_id": cid,
                "id": cid,
                "nonce": nonce
            })`;

    if (code.includes(oldChal)) {
        code = code.replace(oldChal, newChal);
    }

    // 2. /api/auth/verify-challenge 兼容 id 和 challenge_id
    const oldVer = `            cid = body.get("challenge_id", "")`;
    const newVer = `            cid = body.get("challenge_id", "") or body.get("id", "")`;
    if (code.includes(oldVer)) {
        code = code.replace(oldVer, newVer);
    }

    // 3. /api/auth/login 与 register 兼容 ticket 字段名
    const oldTkt = `            ticket = body.get("captcha_ticket", "")`;
    const newTkt = `            ticket = body.get("captcha_ticket", "") or body.get("challenge_ticket", "") or body.get("ticket", "")`;
    code = code.replaceAll(oldTkt, newTkt);

    fs.writeFileSync(filePath, code, 'utf8');
    console.log('✓ Patched ' + filePath);
}

patch('gateway.py');
patch('linux/gateway.py');
