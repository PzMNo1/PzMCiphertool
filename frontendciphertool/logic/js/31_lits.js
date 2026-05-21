/* 31_lits.js — LITS solver: window.solveLITS({rows,cols,hBorders,vBorders}) → {solutions,timeout} */
window.solveLITS = function ({ rows: R, cols: C, hBorders: hB, vBorders: vB }) {
    const TM = 3500, MX = 100, t0 = performance.now(), N = R * C;
    let out = false;
    const SH = {
        L: [[[0,0],[1,0],[2,0],[2,1]],[[0,0],[0,1],[0,2],[1,0]],[[0,0],[0,1],[1,1],[2,1]],[[0,2],[1,0],[1,1],[1,2]],
            [[0,1],[1,1],[2,1],[2,0]],[[0,0],[1,0],[1,1],[1,2]],[[0,0],[0,1],[1,0],[2,0]],[[0,0],[0,1],[0,2],[1,2]]],
        I: [[[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[0,3]]],
        T: [[[0,0],[0,1],[0,2],[1,1]],[[0,0],[1,0],[2,0],[1,1]],[[1,0],[1,1],[1,2],[0,1]],[[1,0],[0,1],[1,1],[2,1]]],
        S: [[[0,1],[0,2],[1,0],[1,1]],[[0,0],[1,0],[1,1],[2,1]],[[0,0],[0,1],[1,1],[1,2]],[[0,1],[1,0],[1,1],[2,0]]]
    };
    // BFS区域
    const vis = new Uint8Array(N), regs = [];
    for (let i = 0; i < N; i++) {
        if (vis[i]) continue;
        const q = [i], cells = []; vis[i] = 1;
        while (q.length) {
            const p = q.shift(), r = p / C | 0, c = p % C; cells.push(p);
            const add = n => { if (!vis[n]) { vis[n] = 1; q.push(n); } };
            if (r > 0 && !hB[r-1][c]) add(p-C);
            if (r < R-1 && !hB[r][c]) add(p+C);
            if (c > 0 && !vB[r][c-1]) add(p-1);
            if (c < C-1 && !vB[r][c]) add(p+1);
        }
        regs.push(cells);
    }
    // 枚举每区域合法放置
    const opts = [];
    for (const reg of regs) {
        if (reg.length < 4) return { solutions: [], timeout: false };
        const rs = new Set(reg), o = [], sg = new Set();
        for (const t in SH) for (const sh of SH[t]) for (const a of reg) {
            const ar = a/C|0, ac = a%C, cs = [];
            let ok = true;
            for (const [dr,dc] of sh) { const n = (ar+dr)*C+ac+dc; if (ar+dr<0||ar+dr>=R||ac+dc<0||ac+dc>=C||!rs.has(n)){ok=false;break;} cs.push(n); }
            if (!ok) continue;
            const s = new Set(cs);
            if (cs.some(p => { const r=p/C|0,c=p%C; return r<R-1&&c<C-1&&s.has(p+1)&&s.has(p+C)&&s.has(p+C+1); })) continue;
            cs.sort((a,b) => a-b); const k = cs.join(',');
            if (sg.has(k)) continue; sg.add(k); o.push({t,cs});
        }
        if (!o.length) return { solutions: [], timeout: false };
        opts.push(o);
    }
    const G = new Int8Array(N), TG = new Array(N).fill(null), res = [];
    function valid(cs, tp) {
        for (const p of cs) {
            const r = p/C|0, c = p%C;
            if (r>0&&c>0&&G[p-C-1]&&G[p-C]&&G[p-1]) return false;
            if (r>0&&c<C-1&&G[p-C+1]&&G[p-C]&&G[p+1]) return false;
            if (r<R-1&&c>0&&G[p+C-1]&&G[p+C]&&G[p-1]) return false;
            if (r<R-1&&c<C-1&&G[p+C+1]&&G[p+C]&&G[p+1]) return false;
            if (r>0&&G[p-C]&&TG[p-C]===tp) return false;
            if (r<R-1&&G[p+C]&&TG[p+C]===tp) return false;
            if (c>0&&G[p-1]&&TG[p-1]===tp) return false;
            if (c<C-1&&G[p+1]&&TG[p+1]===tp) return false;
        }
        return true;
    }
    function conn() {
        let s=-1, tot=0;
        for (let i=0;i<N;i++) if(G[i]){tot++;if(s<0)s=i;}
        if (!tot) return false;
        const seen=new Uint8Array(N), q=[s]; seen[s]=1; let cnt=1,h=0;
        while(h<q.length){const p=q[h++],r=p/C|0,c=p%C;const tv=n=>{if(G[n]&&!seen[n]){seen[n]=1;cnt++;q.push(n);}};if(r>0)tv(p-C);if(r<R-1)tv(p+C);if(c>0)tv(p-1);if(c<C-1)tv(p+1);}
        return cnt===tot;
    }
    function solve(i) {
        if (out||res.length>=MX) return;
        if (!(i&7)&&performance.now()-t0>TM){out=true;return;}
        if (i===opts.length){if(conn())res.push(G.slice());return;}
        for (const o of opts[i]) {
            if (!valid(o.cs,o.t)) continue;
            for(const p of o.cs){G[p]=1;TG[p]=o.t;} solve(i+1); for(const p of o.cs){G[p]=0;TG[p]=null;}
            if(out||res.length>=MX)return;
        }
    }
    solve(0);
    return { solutions: res.map(g => { const s=[]; for(let r=0;r<R;r++) s.push(Array.from(g.subarray(r*C,r*C+C))); return s; }), timeout: out };
};
