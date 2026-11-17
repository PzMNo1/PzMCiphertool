/**
 * 62_yajisankazusan.js — Yajisan-Kazusan 纯算法求解器
 * window.solveYajisanKazusan({ rows, cols, clues }) → { solutions, timeout }
 */
window.solveYajisanKazusan = function (puzzle) {
    const { rows: R, cols: C, clues } = puzzle;
    const TL = 3500, MX = 50, t0 = performance.now(), N = R * C;
    let timeout = false;
    const G = new Int8Array(N);

    // 预处理线索 → [{ pos, val, seen: Int32Array }]
    const cls = [];
    for (const k in clues) {
        const [r, c] = k.split(',').map(Number);
        const { val, dir } = clues[k], s = [];
        if (dir === 'u') for (let i = r - 1; i >= 0; i--) s.push(i * C + c);
        else if (dir === 'd') for (let i = r + 1; i < R; i++) s.push(i * C + c);
        else if (dir === 'l') for (let j = c - 1; j >= 0; j--) s.push(r * C + j);
        else if (dir === 'r') for (let j = c + 1; j < C; j++) s.push(r * C + j);
        cls.push({ pos: r * C + c, val, seen: new Int32Array(s) });
    }

    function noAdj(i) {
        const r = i / C | 0, c = i % C;
        return !(r > 0 && G[i - C] === 1) && !(c > 0 && G[i - 1] === 1);
    }

    function connected() {
        let s = -1, tot = 0;
        for (let i = 0; i < N; i++) if (!G[i]) { tot++; if (s < 0) s = i; }
        if (!tot) return false;
        const v = new Uint8Array(N), q = new Int32Array(N);
        q[0] = s; v[s] = 1; let cnt = 1, h = 0, t = 1;
        while (h < t) {
            const p = q[h++], pr = p / C | 0, pc = p % C;
            const nb = [pr > 0 ? p - C : -1, pr < R - 1 ? p + C : -1, pc > 0 ? p - 1 : -1, pc < C - 1 ? p + 1 : -1];
            for (const n of nb) if (n >= 0 && !G[n] && !v[n]) { v[n] = 1; cnt++; q[t++] = n; }
        }
        return cnt === tot;
    }

    function clueOk() {
        for (const cl of cls) {
            if (G[cl.pos]) continue;
            let cnt = 0;
            for (let i = 0; i < cl.seen.length; i++) if (G[cl.seen[i]]) cnt++;
            if (cnt !== cl.val) return false;
        }
        return true;
    }

    function prune(idx) {
        for (const cl of cls) {
            if (G[cl.pos]) continue;
            let cnt = 0, rem = 0;
            for (let i = 0; i < cl.seen.length; i++) {
                if (G[cl.seen[i]]) cnt++;
                else if (cl.seen[i] > idx) rem++;
            }
            if (cnt > cl.val || cnt + rem < cl.val) return false;
        }
        return true;
    }

    const res = [];
    (function dfs(idx) {
        if (timeout || res.length >= MX) return;
        if (!(idx & 63) && performance.now() - t0 > TL) { timeout = true; return; }
        if (idx === N) {
            if (clueOk() && connected()) {
                const sol = [];
                for (let r = 0; r < R; r++) sol.push(Array.from(G.subarray(r * C, r * C + C)));
                res.push(sol);
            }
            return;
        }
        G[idx] = 0;
        if (prune(idx)) dfs(idx + 1);
        if (timeout || res.length >= MX) return;
        G[idx] = 1;
        if (noAdj(idx) && prune(idx)) dfs(idx + 1);
        G[idx] = 0;
    })(0);

    return { solutions: res, timeout };
};
