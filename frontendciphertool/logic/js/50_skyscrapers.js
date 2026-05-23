window.solveSkyscrapers = function (puzzle) {
    const { n, clues, fixed } = puzzle;
    const TL = 3500, MX = 20, t0 = performance.now();
    let timeout = false;
    const g = new Int8Array(n * n), tmp = new Int8Array(n);

    for (const k in fixed) { const [r, c] = k.split(',').map(Number); g[r * n + c] = fixed[k]; }

    function ok(r, c, v) {
        for (let j = 0; j < n; j++) if (g[r * n + j] === v) return false;
        for (let i = 0; i < n; i++) if (g[i * n + c] === v) return false;
        return true;
    }
    function vis(arr, len) { let mx = 0, cnt = 0; for (let k = 0; k < len; k++) if (arr[k] > mx) { mx = arr[k]; cnt++; } return cnt; }
    function visR(arr, len) { let mx = 0, cnt = 0; for (let k = len - 1; k >= 0; k--) if (arr[k] > mx) { mx = arr[k]; cnt++; } return cnt; }
    function chk(cl, v) { return cl == null || cl === v; }
    function gt(cl, v) { return cl != null && v > cl; }

    function partOk(r, c) {
        let rowF = true; for (let j = 0; j < n; j++) { tmp[j] = g[r * n + j]; if (!tmp[j]) rowF = false; }
        if (rowF) { if (!chk(clues.left[r], vis(tmp, n)) || !chk(clues.right[r], visR(tmp, n))) return false; }
        else if (gt(clues.left[r], vis(tmp, c + 1))) return false;
        let colF = true; for (let i = 0; i < n; i++) { tmp[i] = g[i * n + c]; if (!tmp[i]) colF = false; }
        if (colF) { if (!chk(clues.top[c], vis(tmp, n)) || !chk(clues.bottom[c], visR(tmp, n))) return false; }
        else if (gt(clues.top[c], vis(tmp, r + 1))) return false;
        return true;
    }

    for (let i = 0; i < n * n; i++) { if (!g[i]) continue; const v = g[i]; g[i] = 0; if (!ok((i / n) | 0, i % n, v)) return { solutions: [], timeout: false }; g[i] = v; }

    const order = []; for (let i = 0; i < n * n; i++) if (!g[i]) order.push(i);
    const res = [];
    (function dfs(idx) {
        if (timeout || res.length >= MX) return;
        if (!(idx & 31) && performance.now() - t0 > TL) { timeout = true; return; }
        if (idx >= order.length) { const b = []; for (let r = 0; r < n; r++) { const row = []; for (let c = 0; c < n; c++) row.push(g[r * n + c]); b.push(row); } res.push(b); return; }
        const p = order[idx], r = (p / n) | 0, c = p % n;
        for (let v = 1; v <= n; v++) { if (ok(r, c, v)) { g[p] = v; if (partOk(r, c)) dfs(idx + 1); g[p] = 0; if (timeout || res.length >= MX) return; } }
    })(0);
    return { solutions: res, timeout };
};
