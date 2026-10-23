(function () {
  'use strict';

  const SECTION = 'fenxiqu';
  const AT = window.AnalyzeTools;

  if (!AT) {
    console.error('AnalyzeTools not loaded');
    return;
  }

  const mainInput = () => document.querySelector('#fenxiqu #mainInput')?.value || '';
  const param = (id, fallback = '') => document.getElementById(id)?.value ?? fallback;
  const paramInt = (id, fallback) => {
    const n = parseInt(param(id, ''), 10);
    return Number.isFinite(n) ? n : fallback;
  };
  const setResult = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text == null ? '' : String(text);
  };

  window.registerCard({
    id: 'analyzeXor',
    badge: 'XOR 工具',
    section: SECTION,
    needsMainInput: true,
    resultId: 'xorResult',
    listens: ['xorMode', 'xorKey', 'xorMaxLen', 'xorCrib', 'xorInputMode'],
    compute() {
      if (!mainInput().trim()) { setResult('xorResult', ''); return; }
      setResult('xorResult', AT.xorTool(
        mainInput(),
        param('xorMode', 'single'),
        param('xorKey', ''),
        paramInt('xorMaxLen', 32),
        param('xorCrib', ''),
        param('xorInputMode', 'text')
      ));
    }
  });

  window.registerCard({
    id: 'analyzeFrequency',
    badge: '频率分析',
    section: SECTION,
    needsMainInput: true,
    resultId: 'freqResult',
    listens: [],
    compute() {
      if (!mainInput().trim()) { setResult('freqResult', ''); return; }
      setResult('freqResult', AT.frequency(mainInput()));
    }
  });

  window.registerCard({
    id: 'analyzeVigenere',
    badge: 'Vigenère 分析',
    section: SECTION,
    needsMainInput: true,
    resultId: 'vigResult',
    listens: ['vigMaxLen', 'vigKey'],
    compute() {
      if (!mainInput().trim()) { setResult('vigResult', ''); return; }
      setResult('vigResult', AT.vigenereAnalyze(mainInput(), paramInt('vigMaxLen', 20), param('vigKey', '')));
    }
  });

  window.registerCard({
    id: 'analyzeTransposition',
    badge: '换位爆破',
    section: SECTION,
    needsMainInput: true,
    resultId: 'transResult',
    listens: ['transMax'],
    compute() {
      if (!mainInput().trim()) { setResult('transResult', ''); return; }
      setResult('transResult', AT.transpositionBrute(mainInput(), paramInt('transMax', 10)));
    }
  });

  window.registerCard({
    id: 'analyzeIndex',
    badge: '索引提取',
    section: SECTION,
    needsMainInput: true,
    resultId: 'indexResult',
    listens: ['indexMode', 'indexN'],
    compute() {
      if (!mainInput().trim()) { setResult('indexResult', ''); return; }
      setResult('indexResult', AT.indexExtract(mainInput(), param('indexMode', 'first'), paramInt('indexN', 1)));
    }
  });

  window.registerCard({
    id: 'analyzeAuto',
    badge: '自动解码链',
    section: SECTION,
    needsMainInput: true,
    resultId: 'autoResult',
    listens: [],
    compute() {
      if (!mainInput().trim()) { setResult('autoResult', ''); return; }
      setResult('autoResult', AT.autoDecode(mainInput()));
    }
  });

  window.registerCard({
    id: 'analyzeMige',
    badge: '谜格',
    section: SECTION,
    needsMainInput: true,
    resultId: 'migeResult',
    listens: [],
    compute() {
      if (!mainInput().trim()) { setResult('migeResult', ''); return; }
      setResult('migeResult', AT.mige(mainInput()));
    }
  });

  window.registerCard({
    id: 'analyzeImage',
    badge: '图片隐写',
    section: SECTION,
    needsMainInput: false,
    resultId: 'imgResult',
    listens: ['imgFile', 'imgOp', 'imgGain', 'imgLsbChannel', 'imgLsbBit'],
    compute() {
      const fileInput = document.getElementById('imgFile');
      const outputEl = document.getElementById('imgOutput');
      const infoEl = document.getElementById('imgInfo');
      const resultEl = document.getElementById('imgResult');
      if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        if (outputEl) outputEl.innerHTML = '';
        if (infoEl) infoEl.textContent = '尚未载入图片';
        if (resultEl) resultEl.textContent = '';
        return;
      }

      const file = fileInput.files[0];
      const operation = param('imgOp', 'reset');
      const gain = paramInt('imgGain', 4);
      const channel = paramInt('imgLsbChannel', 0);
      const bit = paramInt('imgLsbBit', 0);
      const reader = new FileReader();

      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          if (infoEl) infoEl.textContent = `已载入：${file.name}（${img.width}×${img.height}）`;

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
            case 'bit4': case 'bit5': case 'bit6': case 'bit7':
              resultCanvas = AT.bitPlane(canvas, parseInt(operation.slice(3), 10));
              break;
            default: resultCanvas = canvas;
          }

          if (outputEl) {
            outputEl.innerHTML = '';
            outputEl.appendChild(resultCanvas);
          }
          if (resultEl) {
            let text = '';
            try { text = AT.extractLsbText(canvas, channel, bit) || ''; } catch { }
            resultEl.textContent = text ? `LSB 提取（通道 ${channel}，位 ${bit}）：\n${text}` : '';
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  console.log('✓ 分析区 8 个卡片已注册');
})();
