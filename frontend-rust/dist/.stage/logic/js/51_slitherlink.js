// Slitherlink Solver — DOM-free. Input: {rows,cols,clues{"r,c":0-3}} → {solutions:[{h,v}],timeout}
window.solveSlitherlink = function(p) {
    const R = p.rows, C = p.cols, TL = 4000, MX = 10, t0 = performance.now();
    let to = false;
    const cl = new Array(R*C).fill(null);
    for (const k in p.clues) { const q = k.split(','); cl[+q[0]*C+ +q[1]] = p.clues[k]; }
    const hN = (R+1)*C, T = hN+R*(C+1), es = new Int8Array(T).fill(-1);
    const hI = (i,j) => i*C+j, vI = (i,j) => hN+i*(C+1)+j;
    const ce=new Array(R*C), ec=new Array(T), ve=new Array((R+1)*(C+1)), ev=new Array(T);
    for(let r=0;r<R;r++) for(let c=0;c<C;c++) ce[r*C+c]=[hI(r,c),hI(r+1,c),vI(r,c),vI(r,c+1)];
    for(let i=0;i<=R;i++) for(let j=0;j<C;j++){const a=[];if(i>0)a.push((i-1)*C+j);if(i<R)a.push(i*C+j);ec[hI(i,j)]=a;}
    for(let i=0;i<R;i++) for(let j=0;j<=C;j++){const a=[];if(j>0)a.push(i*C+j-1);if(j<C)a.push(i*C+j);ec[vI(i,j)]=a;}
    for(let i=0;i<=R;i++) for(let j=0;j<=C;j++){const a=[];if(i>0)a.push(vI(i-1,j));if(i<R)a.push(vI(i,j));if(j>0)a.push(hI(i,j-1));if(j<C)a.push(hI(i,j));ve[i*(C+1)+j]=a;}
    for(let i=0;i<=R;i++) for(let j=0;j<C;j++) ev[hI(i,j)]=[i*(C+1)+j,i*(C+1)+j+1];
    for(let i=0;i<R;i++) for(let j=0;j<=C;j++) ev[vI(i,j)]=[i*(C+1)+j,(i+1)*(C+1)+j];
    const order=Array.from({length:T},(_,i)=>i);
    order.sort((a,b)=>{let ma=5,mb=5;for(const c of ec[a])if(cl[c]!==null&&cl[c]<ma)ma=cl[c];for(const c of ec[b])if(cl[c]!==null&&cl[c]<mb)mb=cl[c];return ma-mb;});
    function ok(e){
        for(const ci of ec[e]){const k=cl[ci];if(k===null)continue;let l=0,u=0;for(const x of ce[ci]){const s=es[x];if(s===1)l++;else if(s<0)u++;}if(l>k||l+u<k)return false;}
        for(const vi of ev[e]){let l=0,u=0;for(const x of ve[vi]){const s=es[x];if(s===1)l++;else if(s<0)u++;}if(l>2||(!u&&l!==0&&l!==2))return false;}
        return true;}
    function conn(){
        const n=(R+1)*(C+1);let s=-1,t=0;
        for(let i=0;i<n;i++){let d=0;for(const x of ve[i])if(es[x]===1)d++;if(d&1||d>2)return false;if(d){t++;if(s<0)s=i;}}
        if(s<0)return false;const vi=new Uint8Array(n),q=[s];vi[s]=1;let c=1;
        while(q.length){const u=q.pop();for(const x of ve[u]){if(es[x]!==1)continue;const[a,b]=ev[x],nb=a===u?b:a;if(!vi[nb]){vi[nb]=1;q.push(nb);c++;}}}
        return c===t;}
    const res=[];
    (function dfs(i){
        if(to||res.length>=MX)return;if(!(i&63)&&performance.now()-t0>TL){to=true;return;}
        if(i>=T){if(conn()){const h=[],v=[];for(let i=0;i<=R;i++){const r=[];for(let j=0;j<C;j++)r.push(es[hI(i,j)]===1?1:0);h.push(r);}for(let i=0;i<R;i++){const r=[];for(let j=0;j<=C;j++)r.push(es[vI(i,j)]===1?1:0);v.push(r);}res.push({h,v});}return;}
        const e=order[i];es[e]=1;if(ok(e))dfs(i+1);if(to||res.length>=MX){es[e]=-1;return;}
        es[e]=0;if(ok(e))dfs(i+1);es[e]=-1;
    })(0);
    return{solutions:res,timeout:to};
};
