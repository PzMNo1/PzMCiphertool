/* 39_nonogram.js — window.solveNonogram({rows,cols,rowClues,colClues}) → {solutions,timeout}
 * rowClues = [[2,1],[3],...], colClues = [[1],[2,2],...]
 * solution = bool[R][C] (true=filled) */
window.solveNonogram = function ({ rows: R, cols: C, rowClues: rc, colClues: cc }) {
    const TM = 3500, MX = 20, t0 = performance.now();
    let out = false;
    const g = Array.from({ length: R }, () => new Int8Array(C)); // 0=unk,1=filled,-1=empty

    function countGroups(arr, len) {
        const res = []; let cnt = 0;
        for (let i = 0; i < len; i++) {
            if (arr[i] === 1) cnt++;
            else if (cnt > 0) { res.push(cnt); cnt = 0; }
        }
        if (cnt > 0) res.push(cnt);
        return res.length ? res : [0];
    }

    function rowOK(r) {
        const clue = rc[r] || [0];
        const groups = []; let cnt = 0, unk = false;
        for (let c = 0; c < C; c++) {
            if (g[r][c] === 1) cnt++;
            else { if (cnt > 0) groups.push(cnt); cnt = 0; if (g[r][c] === 0) unk = true; }
        }
        if (cnt > 0) groups.push(cnt);
        if (!unk) {
            const gg = groups.length ? groups : [0];
            if (gg.length !== clue.length) return false;
            for (let i = 0; i < gg.length; i++) if (gg[i] !== clue[i]) return false;
            return true;
        }
        // partial: groups so far can't exceed clue
        if (groups.length > clue.length) return false;
        for (let i = 0; i < groups.length - 1; i++) if (groups[i] !== clue[i]) return false;
        if (groups.length > 0 && groups[groups.length - 1] > clue[groups.length - 1]) return false;
        // total filled can't exceed sum of clues
        let filled = 0; for (let c = 0; c < C; c++) if (g[r][c] === 1) filled++;
        let clueSum = 0; for (const v of clue) clueSum += v;
        if (filled > clueSum) return false;
        return true;
    }

    function colOK(c) {
        const clue = cc[c] || [0];
        const groups = []; let cnt = 0, unk = false;
        for (let r = 0; r < R; r++) {
            if (g[r][c] === 1) cnt++;
            else { if (cnt > 0) groups.push(cnt); cnt = 0; if (g[r][c] === 0) unk = true; }
        }
        if (cnt > 0) groups.push(cnt);
        if (!unk) {
            const gg = groups.length ? groups : [0];
            if (gg.length !== clue.length) return false;
            for (let i = 0; i < gg.length; i++) if (gg[i] !== clue[i]) return false;
            return true;
        }
        if (groups.length > clue.length) return false;
        for (let i = 0; i < groups.length - 1; i++) if (groups[i] !== clue[i]) return false;
        if (groups.length > 0 && groups[groups.length - 1] > clue[groups.length - 1]) return false;
        let filled = 0; for (let r = 0; r < R; r++) if (g[r][c] === 1) filled++;
        let clueSum = 0; for (const v of clue) clueSum += v;
        if (filled > clueSum) return false;
        return true;
    }

    const res = [];
    function solve(pos) {
        if (out || res.length >= MX) return;
        if (!(pos & 63) && performance.now() - t0 > TM) { out = true; return; }
        if (pos === R * C) {
            // final column checks
            for (let c = 0; c < C; c++) if (!colOK(c)) return;
            res.push(g.map(r => Array.from(r)));
            return;
        }
        const r = pos / C | 0, c = pos % C;
        // try filled
        g[r][c] = 1;
        if (rowOK(r) && colOK(c)) solve(pos + 1);
        if (out || res.length >= MX) { g[r][c] = 0; return; }
        // try empty
        g[r][c] = -1;
        if (rowOK(r) && colOK(c)) solve(pos + 1);
        g[r][c] = 0;
    }
    solve(0);
    return {
        solutions: res.map(s => s.map(row => row.map(v => v === 1))),
        timeout: out
    };
};