(function () {
  'use strict';

  const SECTION = 'fenxiqu';

  function mainInput() {
    const el = document.querySelector('#fenxiqu #mainInput');
    return el ? el.value : '';
  }

  function setResult(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(text || '');
  }

  function paramValue(id, fallback = '') {
    const el = document.getElementById(id);
    return el ? (el.value || fallback) : fallback;
  }

  function paramInt(id, fallback) {
    const n = parseInt(paramValue(id, ''), 10);
    return Number.isFinite(n) ? n : fallback;
  }

  if (typeof window.AnalyzeTools === 'undefined') {
    console.error('AnalyzeTools not loaded');
    return;
  }

  const AT = window.AnalyzeTools;

  /* 1. 批量索引器 —— badge / resultId / listens 与 HTML 对齐 */
  window.registerCard({
    id: 'analyzeIndexer',
    badge: '批量索引器',
    section: SECTION,
    needsMainInput: true,
    resultId: 'anIndexerResult',
    listens: ['anIndices', 'anIndexMode', 'anSortKey', 'anIndexBase'],
    compute() {
      const src = mainInput();
      const indices = paramValue('anIndices', '');
      const base = paramInt('anIndexBase', 1);
      const mode = paramValue('anIndexMode', 'nth');
      const sortKey = paramValue('anSortKey', 'none');
      setResult('anIndexerResult', AT.computeIndexer(src, indices, base, mode, sortKey));
    }
  });

  /* 2. 口味分析 */
  window.registerCard({
    id: 'analyzeFlavor',
    badge: '口味分析',
    section: SECTION,
    needsMainInput: true,
    resultId: 'anFlavorResult',
    listens: [],
    compute() {
      setResult('anFlavorResult', AT.computeFlavor(mainInput()));
    }
  });

  /* 3. 枚举查验 —— HTML 里的两个 input id 是 anEnumSpec / anEnumAnswer */
  window.registerCard({
    id: 'analyzeEnum',
    badge: '枚举查验',
    section: SECTION,
    needsMainInput: false,
    resultId: 'anEnumResult',
    listens: ['anEnumSpec', 'anEnumAnswer'],
    compute() {
      const spec = paramValue('anEnumSpec', '');
      const answer = paramValue('anEnumAnswer', '');
      setResult('anEnumResult', AT.computeEnum(spec, answer));
    }
  });

  /* 4. 字母审计 —— HTML 里只有一个参数 anAuditUsed */
  window.registerCard({
    id: 'analyzeAudit',
    badge: '字母审计',
    section: SECTION,
    needsMainInput: true,
    resultId: 'anAuditResult',
    listens: ['anAuditUsed'],
    compute() {
      setResult('anAuditResult', AT.computeAudit(mainInput()));
    }
  });

  /* 5. 米格密码 —— HTML 的 result id 是 migeResult */
  window.registerCard({
    id: 'puzzleMige',
    badge: '米格密码',
    section: SECTION,
    needsMainInput: true,
    resultId: 'migeResult',
    listens: ['migeSelect'],
    compute() {
      setResult('migeResult', AT.computePuzzleMige(mainInput()));
    }
  });

  /* 6. 拼音工具 —— HTML 的 result id 是 pyResult，参数是 pyMode */
  window.registerCard({
    id: 'puzzlePinyin',
    badge: '拼音工具',
    section: SECTION,
    needsMainInput: true,
    resultId: 'pyResult',
    listens: ['pyMode'],
    compute() {
      setResult('pyResult', AT.computePuzzlePinyin(mainInput()));
    }
  });

  /* 7. 汉字属性 —— HTML 的 result id 是 hzAttrResult，参数是 hzAttrMode */
  window.registerCard({
    id: 'puzzleHanziAttr',
    badge: '汉字属性',
    section: SECTION,
    needsMainInput: true,
    resultId: 'hzAttrResult',
    listens: ['hzAttrMode'],
    compute() {
      setResult('hzAttrResult', AT.computePuzzleHanziAttr(mainInput()));
    }
  });

  /* 8. XOR 破解 —— HTML 的参数是 xorInputMode / xorMaxLen / xorCrib，result 是 xorResult */
  window.registerCard({
    id: 'attackXor',
    badge: 'XOR 破解',
    section: SECTION,
    needsMainInput: true,
    resultId: 'xorResult',
    listens: ['xorInputMode', 'xorMaxLen', 'xorCrib'],
    compute() {
      const keyLen = paramInt('xorMaxLen', 32);
      setResult('xorResult', AT.xorBruteforce(mainInput(), keyLen));
    }
  });

  /* 9. 统计分析 —— HTML 的参数是 statsInputMode，result 是 statsResult */
  window.registerCard({
    id: 'attackStats',
    badge: '统计分析',
    section: SECTION,
    needsMainInput: true,
    resultId: 'statsResult',
    listens: ['statsInputMode'],
    compute() {
      setResult('statsResult', AT.frequencyAnalysis(mainInput()));
    }
  });

  /* 10. 维吉尼亚分析 —— HTML 的参数是 vigInputMode / vigMaxLen，result 是 vigResult */
  window.registerCard({
    id: 'attackVigenere',
    badge: '维吉尼亚分析',
    section: SECTION,
    needsMainInput: true,
    resultId: 'vigResult',
    listens: ['vigInputMode', 'vigMaxLen'],
    compute() {
      const keyLen = paramInt('vigMaxLen', 20);
      setResult('vigResult', AT.vigenereBruteforce(mainInput(), keyLen));
    }
  });

  /* 11. 卡辛斯基检验 —— HTML 的参数是 kasMinLen / kasMaxSeq，result 是 kasResult */
  window.registerCard({
    id: 'attackKasiski',
    badge: '卡辛斯基检验',
    section: SECTION,
    needsMainInput: true,
    resultId: 'kasResult',
    listens: ['kasMinLen', 'kasMaxSeq'],
    compute() {
      setResult('kasResult', AT.kasiskiExamination(mainInput()));
    }
  });

  /* 12. 自动解密 —— HTML 的参数是 autoDepth / autoBeam / autoCustomFlag，result 是 autoResult */
  window.registerCard({
    id: 'autoDecode',
    badge: '自动解密',
    section: SECTION,
    needsMainInput: true,
    resultId: 'autoResult',
    listens: ['autoDepth', 'autoBeam', 'autoCustomFlag'],
    compute() {
      setResult('autoResult', AT.autoDecode(mainInput()));
    }
  });

  /* 13. 图像识别 —— HTML 参数是 imgFile / imgOp / imgGridCols / imgGridRows / imgGain / imgLsbChannel / imgLsbBit */
  window.registerCard({
    id: 'imageTools',
    badge: '图像识别',
    section: SECTION,
    needsMainInput: false,
    resultId: 'imgResult',
    listens: ['imgFile', 'imgOp', 'imgGridCols', 'imgGridRows', 'imgGain', 'imgLsbChannel', 'imgLsbBit'],
    compute() {
      const fileInput = document.getElementById('imgFile');
      const resultEl = document.getElementById('imgResult');
      const outputEl = document.getElementById('imgOutput');
      const infoEl = document.getElementById('imgInfo');

      if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        if (resultEl) resultEl.textContent = '';
        if (outputEl) outputEl.innerHTML = '';
        if (infoEl) infoEl.textContent = '尚未载入图片';
        return;
      }

      const file = fileInput.files[0];
      const operation = paramValue('imgOp', '');
      const gain = paramInt('imgGain', 4);
      const lsbChannel = paramInt('imgLsbChannel', 0);
      const lsbBit = paramInt('imgLsbBit', 0);

      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);

          if (infoEl) {
            infoEl.textContent = `已载入：${file.name}（${img.width}×${img.height}）`;
          }

          let resultCanvas = canvas;

          switch (operation) {
            case 'rot90': resultCanvas = AT.rotate(canvas, 90); break;
            case 'rot180': resultCanvas = AT.rotate(canvas, 180); break;
            case 'rot270': resultCanvas = AT.rotate(canvas, 270); break;
            case 'fliph': resultCanvas = AT.flip(canvas, 'h'); break;
            case 'flipv': resultCanvas = AT.flip(canvas, 'v'); break;
            case 'invert': resultCanvas = AT.mapPixels(canvas, (r, g, b, a) => [255 - r, 255 - g, 255 - b, a]); break;
            case 'gray': resultCanvas = AT.mapPixels(canvas, (r, g, b, a) => {
              const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
              return [y, y, y, a];
            }); break;
            case 'bright': resultCanvas = AT.mapPixels(canvas, (r, g, b, a) => [
              Math.min(255, r + 40), Math.min(255, g + 40), Math.min(255, b + 40), a
            ]); break;
            case 'dark': resultCanvas = AT.mapPixels(canvas, (r, g, b, a) => [
              Math.max(0, r - 40), Math.max(0, g - 40), Math.max(0, b - 40), a
            ]); break;
            case 'boost': resultCanvas = AT.mapPixels(canvas, (r, g, b, a) => {
              const f = v => Math.max(0, Math.min(255, Math.round((v - 128) * 1.8 + 128)));
              return [f(r), f(g), f(b), a];
            }); break;
            case 'chR': resultCanvas = AT.channelImage(canvas, 'r'); break;
            case 'chG': resultCanvas = AT.channelImage(canvas, 'g'); break;
            case 'chB': resultCanvas = AT.channelImage(canvas, 'b'); break;
            case 'chA': resultCanvas = AT.channelImage(canvas, 'a'); break;
            case 'diffRG': resultCanvas = AT.channelDiff(canvas, 'r', 'g', gain); break;
            case 'diffRB': resultCanvas = AT.channelDiff(canvas, 'r', 'b', gain); break;
            case 'diffGB': resultCanvas = AT.channelDiff(canvas, 'g', 'b', gain); break;
            case 'bit0': case 'bit1': case 'bit2': case 'bit3':
            case 'bit4': case 'bit5': case 'bit6': case 'bit7': {
              const bit = parseInt(operation.slice(3), 10);
              resultCanvas = AT.bitPlane(canvas, bit, 'all');
              break;
            }
            case 'grid': {
              // 叠加网格
              resultCanvas = AT.mapPixels(canvas, (r, g, b, a) => [r, g, b, a]);
              const ctx = resultCanvas.getContext('2d');
              const cols = paramInt('imgGridCols', 8);
              const rows = paramInt('imgGridRows', 8);
              ctx.strokeStyle = 'rgba(0,255,255,0.9)';
              ctx.lineWidth = 1;
              for (let i = 1; i < cols; i++) {
                const x = (resultCanvas.width / cols) * i;
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, resultCanvas.height); ctx.stroke();
              }
              for (let j = 1; j < rows; j++) {
                const y = (resultCanvas.height / rows) * j;
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(resultCanvas.width, y); ctx.stroke();
              }
              break;
            }
            case 'reset':
            default:
              resultCanvas = canvas;
          }

          if (outputEl) {
            outputEl.innerHTML = '';
            outputEl.appendChild(resultCanvas);
          }

          // LSB 文本提取（顺带跑一遍，结果写进 result）
          let lsbText = '';
          try { lsbText = AT.extractLsbText(canvas, lsbChannel, lsbBit) || ''; } catch (err) { lsbText = ''; }
          if (resultEl) {
            resultEl.textContent = lsbText
              ? `LSB 提取文本（通道 ${lsbChannel}，位 ${lsbBit}）：\n${lsbText}`
              : '';
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  console.log('✓ 分析区 13 个卡片已注册');
})();