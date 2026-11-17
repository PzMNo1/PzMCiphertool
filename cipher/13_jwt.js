// JWT：解码、HS256/384/512 验签
const JWTTool = (() => {
  const b64uDecode = s => {
    s = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return atob(s);
  };
  const b64uEncode = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const tryJson = s => {
    try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
  };

  async function verify(header, signingInput, sig, secret) {
    if (!secret) return '未提供密钥';
    const alg = header.alg || '';
    if (alg === 'none') return 'alg=none（无签名）';
    if (!/^HS(256|384|512)$/.test(alg)) return `暂不支持 ${alg}`;
    try {
      const hash = alg === 'HS256' ? 'SHA-256' : alg === 'HS384' ? 'SHA-384' : 'SHA-512';
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash }, false, ['verify']);
      let b = sig.replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      return await crypto.subtle.verify('HMAC', key, Uint8Array.from(atob(b), c => c.charCodeAt(0)), new TextEncoder().encode(signingInput))
        ? '签名有效' : '签名无效';
    } catch (e) {
      return `验签失败: ${e.message}`;
    }
  }

  async function process(text, secret) {
    const token = String(text || '').trim();
    if (!token) return '';
    const parts = token.split('.');
    if (parts.length < 2) return '不是 JWT（至少需要 header.payload）';
    let header, payload;
    try { header = JSON.parse(b64uDecode(parts[0])); } catch { return 'header 解码失败'; }
    try { payload = JSON.parse(b64uDecode(parts[1])); } catch { return 'payload 解码失败'; }
    const out = [
      `Header:\n${tryJson(JSON.stringify(header))}`,
      `Payload:\n${tryJson(JSON.stringify(payload))}`,
      `alg: ${header.alg || '?'}`
    ];
    if (parts.length >= 3 && parts[2]) out.push(`签名: ${await verify(header, `${parts[0]}.${parts[1]}`, parts[2], secret)}`);
    else out.push('签名: 无');
    return out.join('\n');
  }

  return { process, b64uDecode, b64uEncode };
})();
