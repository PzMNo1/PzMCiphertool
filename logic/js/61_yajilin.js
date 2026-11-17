// Yajilin solver — window.solveYajilin({ rows, cols, clues })
// clues: { "r,c": { val, dir } }  Returns { solutions:[{shaded,h,v}], timeout }
window.solveYajilin = function (puzzle) {
    const { rows: R, cols: C, clues } = puzzle;
    const TL = 3500, MX = 20, t0 = performance.now(), NN = R * C;
    let timeout = false;

    const isClue = new Uint8Array(NN), conn = new Uint8Array(NN), st = new Uint8Array(NN);
    const cls = [];
    for (const k in clues) {
        const [r, c] = k.split(',').map(Number), idx = r * C + c;
        isClue[idx] = 1;
        const { val, dir } = clues[k], seen = [];
        if (dir === 'u') for (let i = 0; i < r; i++) seen.push(i * C + c);
        else if (dir === 'd') for (let i = r + 1; i < R; i++) seen.push(i * C + c);
        else if (dir === 'l') for (let j = 0; j < c; j++) seen.push(r * C + j);
        else for (let j = c + 1; j < C; j++) seen.push(r * C + j);
        cls.push({ val, seen });
    }

    // Early reject: clue with no seen cells must have val=0
    for (const cl of cls) if (!cl.seen.length && cl.val) return { solutions: [], timeout: false };

    // Precompute: trigger final clue check at last seen cell
    const finalAt = new Array(NN).fill(null).map(() => []);
    cls.forEach((cl, i) => { if (cl.seen.length) finalAt[Math.max(...cl.seen)].push(i); });

    function clueOk(flatIdx) {
        for (const i of finalAt[flatIdx]) {
            let cnt = 0;
            for (const p of cls[i].seen) if (st[p] === 1) cnt++;
            if (cnt !== cls[i].val) return false;
        }
        for (const cl of cls) {
            let cnt = 0, rem = 0;
            for (const p of cl.seen) p <= flatIdx ? (st[p] === 1 && cnt++) : rem++;
            if (cnt > cl.val || cnt + rem < cl.val) return false;
        }
        return true;
    }

    const res = [];
    function dfs(idx) {
        if (timeout || res.length >= MX) return;
        if (!(idx & 31) && performance.now() - t0 > TL) { timeout = true; return; }
        if (idx >= NN) {
            for (let i = 0; i < NN; i++) if (st[i] === 2 && ((conn[i]&1)+((conn[i]>>1)&1)+((conn[i]>>2)&1)+((conn[i]>>3)&1)) !== 2) return;
            // Single-loop check
            let s = -1, tot = 0;
            for (let i = 0; i < NN; i++) if (st[i] === 2) { if (s < 0) s = i; tot++; }
            if (tot < 4) return;
            const vis = new Uint8Array(NN), q = [s]; vis[s] = 1; let f = 0;
            while (q.length) { const p = q.pop(); f++; const m = conn[p];
                if (m&1){const n=p-C;if(n>=0&&!vis[n]){vis[n]=1;q.push(n)}} if(m&2){const n=p+1;if(!vis[n]){vis[n]=1;q.push(n)}}
                if(m&4){const n=p+C;if(!vis[n]){vis[n]=1;q.push(n)}} if(m&8){const n=p-1;if(n>=0&&!vis[n]){vis[n]=1;q.push(n)}} }
            if (f !== tot) return;
            const sh=[], h=[], v=[];
            for (let r=0;r<R;r++){const sr=[],hr=[];for(let c=0;c<C;c++)sr.push(st[r*C+c]===1);sh.push(sr);
                for(let c=0;c<C-1;c++)hr.push(!!(conn[r*C+c]&2));h.push(hr);
                if(r<R-1){const vr=[];for(let c=0;c<C;c++)vr.push(!!(conn[r*C+c]&4));v.push(vr);}}
            res.push({shaded:sh,h,v}); return;
        }
        const r=(idx/C)|0, c=idx%C;
        const up=r>0&&st[idx-C]===2?((conn[idx-C]>>2)&1):0, lf=c>0&&st[idx-1]===2?((conn[idx-1]>>1)&1):0;
        if (isClue[idx]) { if(up||lf)return; st[idx]=0; if(clueOk(idx))dfs(idx+1); st[idx]=0; return; }
        const inh = up+lf;
        // Shade option
        if (inh===0 && !(r>0&&st[idx-C]===1) && !(c>0&&st[idx-1]===1)) {
            st[idx]=1; if(clueOk(idx))dfs(idx+1); st[idx]=0;
            if(timeout||res.length>=MX)return; }
        // Loop option
        if(inh>2)return;
        const cR=c<C-1&&!isClue[idx+1], cD=r<R-1&&!isClue[idx+C];
        for(let b=0;b<4;b++){const aR=b&1,aD=(b>>1)&1,deg=inh+aR+aD;
            if(deg!==0&&deg!==2)continue; if(aR&&!cR||aD&&!cD)continue;
            st[idx]=2; conn[idx]=(up?1:0)|(aR?2:0)|(aD?4:0)|(lf?8:0);
            if(clueOk(idx))dfs(idx+1); conn[idx]=0;st[idx]=0;
            if(timeout||res.length>=MX)return;}
    }
    dfs(0);
    return { solutions: res, timeout };
};
