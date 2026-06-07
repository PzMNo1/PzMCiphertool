(function(){
    window.logicWorkspaceHTMLs = window.logicWorkspaceHTMLs || [];
    window.logicWorkspaceHTMLs.push(window.LogicUI.workspace('slitherlink-workspace','slitherlink-layout',
        window.LogicUI.backButton('slitherlink-workspace')+
        window.LogicUI.title('SLITHERLINK',{color:'var(--neon-cyan)'})+
        window.LogicUI.sizeInputs('sll-rows','sll-cols',{rowVal:7,colVal:7,rowMin:2,colMin:2,rowMax:15,colMax:15})+
        window.LogicUI.actionGrid4([
            {label:'重置网格',onclick:'window.initSlitherlinkGrid&&window.initSlitherlinkGrid()'},
            {label:'计算核心分析',onclick:'window.solveSlitherlinkUI&&window.solveSlitherlinkUI()',id:'sll-solve-btn',glow:true},
            {label:'清空填涂',onclick:'window.clearSlitherlinkGrid&&window.clearSlitherlinkGrid()'},
            {label:'简单示例',onclick:'window.buildSimpleSlitherlinkExample&&window.buildSimpleSlitherlinkExample()'}
        ])+
        window.LogicUI.statsPanel('sll',{countLabel:'解记录数',timeLabel:'AI thinking耗时',accent:'#00e5ff'})+
        window.LogicUI.solutionNav('sll','showSlitherlinkSolution',{accent:'var(--neon-cyan)'})+
        window.LogicUI.instructions(['点击格子循环线索(空→0→1→2→3→空)','点击/拖拽边线绘制(空→线→叉→空)','线段须构成单一闭合回路'],{accent:'var(--neon-cyan)',title:'系统法则'}),
        '<div id="sll-grid-container"></div>',
        `#sll-grid-container{display:inline-grid;gap:0;background:rgba(0,0,0,.55);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);user-select:none;padding:4px}
        .sll-dot{background:radial-gradient(circle,#fff 40%,transparent 60%);border-radius:50%}
        .sll-cell{display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1.1rem;font-weight:700;color:var(--hologram-purple,#b388ff);background:rgba(255,255,255,.03);transition:background .12s}
        .sll-cell:hover{background:rgba(179,136,255,.1)}
        .sll-edge{cursor:pointer;transition:background .12s;border-radius:2px;position:relative}
        .sll-edge.e0{background:rgba(255,255,255,.06)}.sll-edge.e0:hover{background:rgba(255,255,255,.25)}
        .sll-edge.e1{background:var(--neon-cyan,#00ffe7);box-shadow:0 0 6px var(--neon-cyan,#00ffe7)}
        .sll-edge.e2{background:rgba(255,60,60,.12)}.sll-edge.e2::after{content:'×';color:#ff4444;font-size:11px;font-weight:700;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}
        .sll-edge.sol{background:#0f0;box-shadow:0 0 8px rgba(0,255,0,.5)}`
    ));
    const $=id=>document.getElementById(id);
    let R=7,C=7,cl={},sols=[],si=0,sw=false,hP,vP,drg=false,dv=1;
    const EC=['e0','e1','e2'],rs=()=>{sols=[];si=0;sw=false;};
    const st=(c,t)=>{const a=$('sll-solutionsCount'),b=$('sll-timeElapsed');if(a)a.textContent=c;if(b)b.textContent=t;};
    const nv=v=>{const n=$('sll-solution-nav');if(n)n.style.display=v?'flex':'none';};
    const rdSz=()=>{const a=$('sll-rows'),b=$('sll-cols');if(a&&b){R=Math.max(2,Math.min(15,+a.value||7));C=Math.max(2,Math.min(15,+b.value||7));a.value=R;b.value=C;}};
    const mkE=()=>{hP=Array.from({length:R+1},()=>Array(C).fill(0));vP=Array.from({length:R},()=>Array(C+1).fill(0));};
    document.addEventListener('mouseup',()=>{drg=false;});
    document.addEventListener('touchend',()=>{drg=false;});
    function eEv(el,t,i,j,ev){
        if(sw)return;const a=t==='h'?hP:vP;
        if(ev==='d'){a[i][j]=(a[i][j]+1)%3;drg=true;dv=a[i][j];}
        else if(ev==='e'&&drg)a[i][j]=dv;else return;
        el.className='sll-edge '+EC[a[i][j]];
    }
    function mkEdge(g,t,i,j,sol){
        const el=document.createElement('div'),v=sol?(t==='h'?sol.h[i][j]:sol.v[i][j]):null;
        el.className='sll-edge '+(sol?(v?'sol':'e0'):EC[(t==='h'?hP:vP)[i][j]]);
        el.onmousedown=e=>{e.preventDefault();eEv(el,t,i,j,'d');};
        el.onmouseenter=()=>eEv(el,t,i,j,'e');
        el.ontouchstart=e=>{e.preventDefault();eEv(el,t,i,j,'d');};
        g.appendChild(el);
    }
    function render(){
        const g=$('sll-grid-container');if(!g)return;g.innerHTML='';
        const D='6px',Z='36px',co=[],ro=[];
        for(let j=0;j<2*C+1;j++)co.push(j%2?Z:D);
        for(let i=0;i<2*R+1;i++)ro.push(i%2?Z:D);
        g.style.gridTemplateColumns=co.join(' ');g.style.gridTemplateRows=ro.join(' ');
        const sol=sw&&sols[si];
        for(let gi=0;gi<2*R+1;gi++)for(let gj=0;gj<2*C+1;gj++){
            const rd=!(gi%2),cd=!(gj%2);
            if(rd&&cd){const d=document.createElement('div');d.className='sll-dot';g.appendChild(d);}
            else if(rd)mkEdge(g,'h',gi/2,(gj-1)/2,sol);
            else if(cd)mkEdge(g,'v',(gi-1)/2,gj/2,sol);
            else{const r=(gi-1)/2,c=(gj-1)/2,k=r+','+c,cell=document.createElement('div');
                cell.className='sll-cell';if(k in cl)cell.textContent=cl[k];
                cell.onclick=()=>{if(sw)return;if(!(k in cl))cl[k]=0;else if(cl[k]<3)cl[k]++;else delete cl[k];render();};
                g.appendChild(cell);}
        }
    }
    window.initSlitherlinkGrid=()=>{rdSz();rs();cl={};mkE();render();st('-','-');nv(false);};
    window.clearSlitherlinkGrid=()=>{rs();mkE();render();st('-','-');nv(false);};
    window.buildSimpleSlitherlinkExample=()=>{R=3;C=3;const a=$('sll-rows'),b=$('sll-cols');if(a)a.value=3;if(b)b.value=3;rs();cl={'0,0':2,'0,2':2,'1,1':0,'2,0':2,'2,2':2};mkE();render();st('-','-');nv(false);};
    window.solveSlitherlinkUI=()=>{
        if(!window.solveSlitherlink)return st('模块未加载','-');if(!Object.keys(cl).length)return st('请先输入线索','-');
        const t0=performance.now(),res=window.solveSlitherlink({rows:R,cols:C,clues:cl}),ms=LogicUI.formatElapsed(performance.now() - t0);
        sols=res.solutions||[];st(res.timeout?sols.length+'+ (超时)':(sols.length||'未找到解'),ms);
        if(sols.length){sw=true;si=0;nv(true);window.showSlitherlinkSolution(0);}else{sw=false;nv(false);render();}
    };
    window.showSlitherlinkSolution=d=>{if(!sols.length)return;si=(si+d+sols.length)%sols.length;const c=$('sll-solution-counter');if(c)c.textContent=(si+1)+' / '+sols.length;render();};
})();
