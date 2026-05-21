(function() {
    window.solveHotaru = function(puzzle) {
        const startTime = performance.now();
        const TIMEOUT = 3500;
        let isTimeout = false;

        const R = puzzle.rows, C = puzzle.cols, g = puzzle.grid;
        const dots = [], solutions = [];

        for (let r=0;r<R;r++) for (let c=0;c<C;c++) if (g[r][c]) dots.push({ r, c, dir:g[r][c].dir, num:g[r][c].num, id:dots.length });

        const used = Array(R).fill().map(()=>Array(C).fill(false));
        const path = Array(R).fill().map(()=>Array(C).fill(null));
        for (const d of dots) used[d.r][d.c] = true;

        const hasIn = new Uint8Array(dots.length);
        const par = new Int32Array(dots.length).fill(-1);

        function find(i) { while(par[i]>=0) i=par[i]; return i; }
        function unite(a,b) {
            a=find(a); b=find(b);
            if (a===b) return null;
            if (par[a]>par[b]) { const t=a; a=b; b=t; }
            const old=par[b]; par[a]+=par[b]; par[b]=a;
            return {p:a, ch:b, ov:old};
        }
        function undoUnite(u) { if(u){ par[u.p]-=u.ov; par[u.ch]=u.ov; } }

        const DR={'u':-1,'d':1,'l':0,'r':0}, DC={'u':0,'d':0,'l':-1,'r':1};
        const DIRS=['u','r','d','l'];
        const FM={'u':'b','d':'t','l':'r','r':'l'}, TM={'u':'t','d':'b','l':'l','r':'r'};

        function turnType(inD, outD) {
            const s=[FM[inD],TM[outD]].sort().join('');
            return s==='lt'?'ul':s==='rt'?'ur':s==='bl'?'dl':'dr';
        }

        function solve(di) {
            if (solutions.length>=5||isTimeout) return;
            if (di===dots.length) { if (-par[find(0)]===dots.length) solutions.push(path.map(r=>[...r])); return; }
            trace(di, dots[di].r, dots[di].c, dots[di].dir, 0, dots[di].num, []);
        }

        let visits = 0;
        function trace(di, r, c, dir, turns, target, cells) {
            if (solutions.length>=5||isTimeout) return;
            if (++visits%500===0 && performance.now()-startTime>TIMEOUT) { isTimeout=true; return; }

            const nr=r+DR[dir], nc=c+DC[dir];
            if (nr<0||nr>=R||nc<0||nc>=C) return;

            if (g[nr][nc]) {
                const ti=dots.findIndex(d=>d.r===nr&&d.c===nc);
                if (ti!==di && !hasIn[ti] && (target===null||turns===target)) {
                    hasIn[ti]=1;
                    for (const cl of cells) path[cl.r][cl.c]=cl.t;
                    const u=unite(di,ti);
                    solve(di+1);
                    undoUnite(u);
                    for (const cl of cells) path[cl.r][cl.c]=null;
                    hasIn[ti]=0;
                }
                return;
            }

            if (used[nr][nc]) return;
            if (target!==null && turns>target) return;

            used[nr][nc] = true;
            const di2=DIRS.indexOf(dir);

            // Straight
            cells.push({r:nr,c:nc,t:(dir==='u'||dir==='d')?'v':'h'});
            trace(di,nr,nc,dir,turns,target,cells);
            cells.pop();
            // Turns
            if (target===null||turns+1<=target) {
                const lD=DIRS[(di2+3)%4], rD=DIRS[(di2+1)%4];
                cells.push({r:nr,c:nc,t:turnType(dir,lD)});
                trace(di,nr,nc,lD,turns+1,target,cells);
                cells.pop();
                cells.push({r:nr,c:nc,t:turnType(dir,rD)});
                trace(di,nr,nc,rD,turns+1,target,cells);
                cells.pop();
            }

            used[nr][nc] = false;
        }

        solve(0);
        return { solutions, timeout:isTimeout };
    };
})();
