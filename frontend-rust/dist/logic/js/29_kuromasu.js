/**
 * 29_kuromasu.js — Kuromasu 纯算法求解器
 * window.solveKuromasu(puzzle) → { solutions, timeout }
 * puzzle = { rows, cols, grid: number[][]  (null=空, number=线索) }
 * solutions: Array<Int8Array-like 0=白 1=黑>
 */
window.solveKuromasu = function (puzzle) {
    const { rows: R, cols: C, grid: clues } = puzzle;
    const TIMEOUT = 3500, MAX = 100, t0 = performance.now();
    const N = R * C;
    let timedOut = false;

    // 线索列表
    const cp = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (clues[r][c] != null) cp.push(r * C + c);

    // 棋盘: -1=未赋值, 0=白, 1=黑
    const G = new Int8Array(N).fill(-1);
    // 线索格强制为白
    for (const p of cp) G[p] = 0;

    const DIRS = [-C, C, -1, 1]; // 上下左右

    // 视野检查（含剪枝）
    // count = 确定可见的白格数（从线索格开始连续白格）
    // possible = 最多可能可见的白格数（所有未被黑格阻断的格）
    function checkClue(pos) {
        const r0 = pos / C | 0, c0 = pos % C, val = clues[r0][c0];
        let count = 1, possible = 1;
        let certain;
        // 上
        certain = true;
        for (let r = r0 - 1; r >= 0; r--) { const v = G[r * C + c0]; if (v === 1) break; possible++; if (v === 0 && certain) count++; else certain = false; }
        // 下
        certain = true;
        for (let r = r0 + 1; r < R; r++) { const v = G[r * C + c0]; if (v === 1) break; possible++; if (v === 0 && certain) count++; else certain = false; }
        // 左
        certain = true;
        for (let c = c0 - 1; c >= 0; c--) { const v = G[r0 * C + c]; if (v === 1) break; possible++; if (v === 0 && certain) count++; else certain = false; }
        // 右
        certain = true;
        for (let c = c0 + 1; c < C; c++) { const v = G[r0 * C + c]; if (v === 1) break; possible++; if (v === 0 && certain) count++; else certain = false; }
        if (count > val) return false;
        if (possible < val) return false;
        return true;
    }

    // 严格视野（全填完时）
    function strictVis(pos) {
        const r0 = pos / C | 0, c0 = pos % C;
        let v = 1;
        for (let r = r0 - 1; r >= 0 && G[r * C + c0] !== 1; r--) v++;
        for (let r = r0 + 1; r < R && G[r * C + c0] !== 1; r++) v++;
        for (let c = c0 - 1; c >= 0 && G[r0 * C + c] !== 1; c--) v++;
        for (let c = c0 + 1; c < C && G[r0 * C + c] !== 1; c++) v++;
        return v;
    }

    // 白格连通性检查（BFS）
    function connected() {
        let start = -1, total = 0;
        for (let i = 0; i < N; i++) if (G[i] === 0) { total++; if (start < 0) start = i; }
        if (total === 0) return false;
        const seen = new Uint8Array(N);
        const q = [start]; seen[start] = 1; let cnt = 1, h = 0;
        while (h < q.length) {
            const p = q[h++], r = p / C | 0, c = p % C;
            if (r > 0 && G[p - C] === 0 && !seen[p - C]) { seen[p - C] = 1; cnt++; q.push(p - C); }
            if (r < R - 1 && G[p + C] === 0 && !seen[p + C]) { seen[p + C] = 1; cnt++; q.push(p + C); }
            if (c > 0 && G[p - 1] === 0 && !seen[p - 1]) { seen[p - 1] = 1; cnt++; q.push(p - 1); }
            if (c < C - 1 && G[p + 1] === 0 && !seen[p + 1]) { seen[p + 1] = 1; cnt++; q.push(p + 1); }
        }
        return cnt === total;
    }

    // 黑格不相邻检查（检查四个方向，已赋值的邻居都需要检查）
    function noAdj(idx) {
        const r = idx / C | 0, c = idx % C;
        if (r > 0 && G[idx - C] === 1) return false;
        if (r < R - 1 && G[idx + C] === 1) return false;
        if (c > 0 && G[idx - 1] === 1) return false;
        if (c < C - 1 && G[idx + 1] === 1) return false;
        return true;
    }

    const res = [];

    function solve(idx) {
        if (timedOut || res.length >= MAX) return;
        if (!(idx & 63) && performance.now() - t0 > TIMEOUT) { timedOut = true; return; }

        if (idx === N) {
            // 终局校验：严格视野 + 连通性
            for (const p of cp) if (strictVis(p) !== clues[p / C | 0][p % C]) return;
            if (!connected()) return;
            // 转为 R×C 二维数组
            const sol = [];
            for (let r = 0; r < R; r++) { sol.push(Array.from(G.subarray(r * C, r * C + C))); }
            res.push(sol);
            return;
        }

        if (G[idx] !== -1) { solve(idx + 1); return; }

        // 尝试白(0) — 先尝试白，Kuromasu 中白格占多数
        G[idx] = 0;
        let ok = true;
        for (const p of cp) if (!checkClue(p)) { ok = false; break; }
        if (ok) solve(idx + 1);
        G[idx] = -1;

        if (timedOut || res.length >= MAX) return;

        // 尝试黑(1)
        if (noAdj(idx)) {
            G[idx] = 1;
            let ok2 = true;
            for (const p of cp) if (!checkClue(p)) { ok2 = false; break; }
            if (ok2) solve(idx + 1);
            G[idx] = -1;
        }
    }

    solve(0);
    return { solutions: res, timeout: timedOut };
};
