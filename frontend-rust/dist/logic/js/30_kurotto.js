/**
 * 30_kurotto.js — Kurotto 纯算法求解器
 * window.solveKurotto(puzzle) → { solutions, timeout }
 * puzzle = { rows, cols, clues: { "r,c": number } }
 *
 * 规则：
 *  - 线索格(白)的数字 = 与其正交相邻的所有黑格连通分量的大小之和
 *  - 线索格本身必须为白
 *  - 非线索格可黑可白
 */
window.solveKurotto = function (puzzle) {
    const { rows: R, cols: C, clues } = puzzle;
    const TIMEOUT = 3500, MAX = 100, t0 = performance.now();
    const N = R * C;
    let timedOut = false;

    // 解析线索
    const cp = []; // [{pos, val}]
    const isClue = new Uint8Array(N);
    for (const k in clues) {
        const [r, c] = k.split(',').map(Number);
        const p = r * C + c;
        cp.push({ pos: p, val: clues[k] });
        isClue[p] = 1;
    }

    // 棋盘: -1=未定, 0=白, 1=黑
    const G = new Int8Array(N).fill(-1);
    for (const { pos } of cp) G[pos] = 0; // 线索格强制白

    // 检查某线索格的黑格连通约束（剪枝用）
    // 从线索格的四邻域出发，BFS 收集所有相连黑格；未知格标记为"可能扩展"
    function checkClue(ci) {
        const { pos, val } = cp[ci];
        const r0 = pos / C | 0, c0 = pos % C;
        const seen = new Uint8Array(N);
        let count = 0, canGrow = false;

        const q = [];
        // 种子：线索格的四邻域中的黑格
        const addNeighbor = (nr, nc) => {
            if (nr < 0 || nr >= R || nc < 0 || nc >= C) return;
            const np = nr * C + nc;
            const v = G[np];
            if (v === 1 && !seen[np]) { seen[np] = 1; q.push(np); }
            if (v === -1) canGrow = true; // 邻居是未知格，可能将来变黑
        };
        addNeighbor(r0 - 1, c0);
        addNeighbor(r0 + 1, c0);
        addNeighbor(r0, c0 - 1);
        addNeighbor(r0, c0 + 1);

        // BFS 扩展黑格连通区
        let h = 0;
        while (h < q.length) {
            const p = q[h++];
            count++;
            if (count > val) return false; // 已超过目标
            const pr = p / C | 0, pc = p % C;
            const tryExpand = (nr, nc) => {
                if (nr < 0 || nr >= R || nc < 0 || nc >= C) return;
                const np = nr * C + nc;
                if (seen[np]) return;
                if (G[np] === 1) { seen[np] = 1; q.push(np); }
                else if (G[np] === -1) canGrow = true;
            };
            tryExpand(pr - 1, pc);
            tryExpand(pr + 1, pc);
            tryExpand(pr, pc - 1);
            tryExpand(pr, pc + 1);
        }

        if (count > val) return false;
        if (!canGrow && count !== val) return false; // 已封闭但不等于目标
        return true;
    }

    // 终局严格检查
    function strictCheck(ci) {
        const { pos, val } = cp[ci];
        const r0 = pos / C | 0, c0 = pos % C;
        const seen = new Uint8Array(N);
        let count = 0;
        const q = [];
        const tryAdd = (nr, nc) => {
            if (nr < 0 || nr >= R || nc < 0 || nc >= C) return;
            const np = nr * C + nc;
            if (G[np] === 1 && !seen[np]) { seen[np] = 1; q.push(np); }
        };
        tryAdd(r0 - 1, c0); tryAdd(r0 + 1, c0); tryAdd(r0, c0 - 1); tryAdd(r0, c0 + 1);
        let h = 0;
        while (h < q.length) {
            const p = q[h++]; count++;
            const pr = p / C | 0, pc = p % C;
            tryAdd(pr - 1, pc); tryAdd(pr + 1, pc); tryAdd(pr, pc - 1); tryAdd(pr, pc + 1);
        }
        return count === val;
    }

    const res = [];

    function solve(idx) {
        if (timedOut || res.length >= MAX) return;
        if (!(idx & 63) && performance.now() - t0 > TIMEOUT) { timedOut = true; return; }

        if (idx === N) {
            for (let i = 0; i < cp.length; i++) if (!strictCheck(i)) return;
            const sol = [];
            for (let r = 0; r < R; r++) sol.push(Array.from(G.subarray(r * C, r * C + C)));
            res.push(sol);
            return;
        }

        if (G[idx] !== -1) { solve(idx + 1); return; }

        // 尝试白(0)
        G[idx] = 0;
        let ok = true;
        for (let i = 0; i < cp.length; i++) if (!checkClue(i)) { ok = false; break; }
        if (ok) solve(idx + 1);
        G[idx] = -1;

        if (timedOut || res.length >= MAX) return;

        // 尝试黑(1)
        G[idx] = 1;
        ok = true;
        for (let i = 0; i < cp.length; i++) if (!checkClue(i)) { ok = false; break; }
        if (ok) solve(idx + 1);
        G[idx] = -1;
    }

    solve(0);
    return { solutions: res, timeout: timedOut };
};
