/**
 * Statue Park Solver – Pure algorithm, zero DOM.
 * Input:  { rows, cols, grid (0=empty,1=black,2=white), shapeSet }
 * Output: { solutions: number[][][], timeout: boolean }
 */
window.solveStatuePark = function (puzzle) {
    const { rows: R, cols: C, grid: clues, shapeSet } = puzzle;
    const N = R * C, TL = 3500, MX = 10, t0 = performance.now();
    let timeout = false;

    const TETRO = [[[0,0],[0,1],[0,2],[0,3]],[[0,0],[0,1],[1,0],[1,1]],[[0,0],[0,1],[0,2],[1,1]],[[0,0],[1,0],[2,0],[2,1]],[[0,0],[0,1],[1,1],[1,2]]];
    const PENTO = [[[1,0],[1,1],[0,1],[0,2],[2,1]],[[0,0],[0,1],[0,2],[0,3],[0,4]],[[0,0],[1,0],[2,0],[3,0],[3,1]],[[0,0],[0,1],[1,0],[1,1],[0,2]],[[0,0],[0,1],[1,1],[1,2],[1,3]],[[0,0],[0,1],[0,2],[1,1],[2,1]],[[0,0],[0,2],[1,0],[1,1],[1,2]],[[0,0],[1,0],[2,0],[2,1],[2,2]],[[0,0],[1,0],[1,1],[2,1],[2,2]],[[1,0],[0,1],[1,1],[2,1],[1,2]],[[0,0],[1,0],[2,0],[3,0],[1,1]],[[0,0],[0,1],[1,1],[2,1],[2,2]]];

    const base = shapeSet === 'Tetrominoes' ? TETRO : PENTO;
    const SZ = base[0].length, NS = base.length;
    if (NS * SZ > N) return { solutions: [], timeout: false };

    /* Variant generation */
    const norm = co => {
        let mr = Infinity, mc = Infinity;
        for (const p of co) { if (p[0] < mr) mr = p[0]; if (p[1] < mc) mc = p[1]; }
        return co.map(([r,c]) => [r-mr,c-mc]).sort((a,b) => a[0]-b[0]||a[1]-b[1]);
    };
    const variants = b => {
        const seen = new Set(), out = []; let cur = b;
        for (let i = 0; i < 4; i++) {
            for (const v of [norm(cur), norm(cur.map(([r,c])=>[r,-c]))]) {
                const k = v.join('|'); if (!seen.has(k)) { seen.add(k); out.push(v); }
            }
            cur = cur.map(([r,c]) => [c,-r]);
        }
        return out;
    };
    const shapes = base.map((b,id) => ({ id, vars: variants(b) }));

    /* Flat clue & board */
    const cl = new Uint8Array(N), board = new Int16Array(N).fill(-1);
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) cl[r*C+c] = clues[r][c];
    const blacks = []; for (let i = 0; i < N; i++) if (cl[i] === 1) blacks.push(i);

    /* Pre-generate placements with external neighbours */
    const pls = shapes.map(s => {
        const list = [];
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const v of s.vars) {
            const cells = new Int32Array(SZ); let ok = true;
            for (let k = 0; k < SZ; k++) {
                const nr = r+v[k][0], nc = c+v[k][1];
                if (nr<0||nr>=R||nc<0||nc>=C||cl[nr*C+nc]===2) { ok = false; break; }
                cells[k] = nr*C+nc;
            }
            if (!ok) continue;
            const cs = new Set(cells), ext = new Set();
            for (const idx of cells) {
                const cr=(idx/C)|0, cc=idx%C;
                if(cr>0){const n=idx-C;if(!cs.has(n))ext.add(n)}  if(cr<R-1){const n=idx+C;if(!cs.has(n))ext.add(n)}
                if(cc>0){const n=idx-1;if(!cs.has(n))ext.add(n)}  if(cc<C-1){const n=idx+1;if(!cs.has(n))ext.add(n)}
            }
            list.push({ cells, ext: new Int32Array(ext) });
        }
        return list;
    });

    /* MCV order & connectivity check */
    const ord = [...Array(NS).keys()].sort((a,b) => pls[a].length-pls[b].length);
    const vis = new Uint8Array(N), bfsQ = new Int32Array(N);
    const conn = () => {
        let s=-1, e=0; for(let i=0;i<N;i++) if(board[i]===-1){if(s<0)s=i;e++} if(!e)return true;
        vis.fill(0); bfsQ[0]=s; vis[s]=1; let h=0,t=1,cnt=1;
        while(h<t){const p=bfsQ[h++],pr=(p/C)|0,pc=p%C;
            if(pr>0){const n=p-C;if(!vis[n]&&board[n]===-1){vis[n]=1;bfsQ[t++]=n;cnt++}}
            if(pr<R-1){const n=p+C;if(!vis[n]&&board[n]===-1){vis[n]=1;bfsQ[t++]=n;cnt++}}
            if(pc>0){const n=p-1;if(!vis[n]&&board[n]===-1){vis[n]=1;bfsQ[t++]=n;cnt++}}
            if(pc<C-1){const n=p+1;if(!vis[n]&&board[n]===-1){vis[n]=1;bfsQ[t++]=n;cnt++}}
        } return cnt===e;
    };

    /* DFS */
    const res = []; let calls = 0;
    const dfs = d => {
        if(res.length>=MX)return; if(!(++calls&2047)&&performance.now()-t0>TL){timeout=true;return}
        if(d>=NS){ for(const b of blacks)if(board[b]===-1)return; if(conn()){const s=[];for(let r=0;r<R;r++){const w=[];for(let c=0;c<C;c++)w.push(board[r*C+c]);s.push(w)}res.push(s)} return }
        let u=0; for(const b of blacks)if(board[b]===-1)u++; if(u>(NS-d)*SZ)return;
        const si=ord[d], pl=pls[si], id=shapes[si].id;
        for(let p=0;p<pl.length;p++){
            const{cells:cs,ext:ex}=pl[p]; let ok=true;
            for(let k=0;k<cs.length;k++)if(board[cs[k]]!==-1){ok=false;break} if(!ok)continue;
            for(let k=0;k<ex.length;k++)if(board[ex[k]]!==-1){ok=false;break} if(!ok)continue;
            for(let k=0;k<cs.length;k++)board[cs[k]]=id;
            dfs(d+1);
            for(let k=0;k<cs.length;k++)board[cs[k]]=-1;
            if(timeout||res.length>=MX)return;
        }
    };
    dfs(0);
    return { solutions: res, timeout };
};
