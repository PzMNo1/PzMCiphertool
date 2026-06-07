(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const GRID = 24;
  const STORAGE_KEY = "pzm-electronic-simulator-v3";
  const VIEW_WIDTH = 1200;
  const VIEW_HEIGHT = 720;

  const $ = (selector) => document.querySelector(selector);

  const els = {
    canvas: $("#circuit-canvas"),
    canvasHud: $("#canvas-hud"),
    wireLayer: $("#wire-layer"),
    componentLayer: $("#component-layer"),
    overlayLayer: $("#overlay-layer"),
    componentList: $("#component-list"),
    exampleList: $("#example-list"),
    statusText: $("#status-text"),
    selectionText: $("#selection-text"),
    simStatus: $("#simulation-status"),
    canvasMeta: $("#canvas-meta"),
    runToggle: $("#run-toggle"),
    stepOnce: $("#step-once"),
    resetSim: $("#reset-sim"),
    undoAction: $("#undo-action"),
    redoAction: $("#redo-action"),
    rotateSelected: $("#rotate-selected"),
    duplicateSelected: $("#duplicate-selected"),
    deleteSelected: $("#delete-selected"),
    zoomOut: $("#zoom-out"),
    zoomIn: $("#zoom-in"),
    zoomFit: $("#zoom-fit"),
    newCircuit: $("#new-circuit"),
    exportCircuit: $("#export-circuit"),
    importCircuit: $("#import-circuit"),
    componentFilter: $("#component-filter"),
    propertiesContent: $("#properties-content"),
    warningList: $("#warning-list"),
    meterSummary: $("#meter-summary"),
    measurementBody: $("#measurement-body"),
    scopeCanvas: $("#scope-canvas"),
    jsonDialog: $("#json-dialog"),
    jsonTitle: $("#json-dialog-title"),
    jsonTextarea: $("#json-textarea"),
    copyJson: $("#copy-json"),
    applyJson: $("#apply-json"),
    settingDt: $("#setting-dt"),
    settingSpeed: $("#setting-speed"),
    settingSamples: $("#setting-samples"),
    settingAutosave: $("#setting-autosave"),
    settingOrthogonalWire: $("#setting-orthogonal-wire")
  };

  const TWO_PIN = [
    { x: -72, y: 0, name: "A" },
    { x: 72, y: 0, name: "B" }
  ];

  const COMPONENTS = {
    resistor: {
      name: "电阻",
      icon: "R",
      desc: "欧姆负载",
      prefix: "R",
      unit: "Ω",
      defaultValue: 1000,
      pins: TWO_PIN
    },
    capacitor: {
      name: "电容",
      icon: "C",
      desc: "瞬态储能",
      prefix: "C",
      unit: "F",
      defaultValue: 0.00047,
      pins: TWO_PIN
    },
    inductor: {
      name: "电感",
      icon: "L",
      desc: "电流惯性",
      prefix: "L",
      unit: "H",
      defaultValue: 0.08,
      pins: TWO_PIN
    },
    potentiometer: {
      name: "可变电阻",
      icon: "VR",
      desc: "三端分压",
      prefix: "VR",
      unit: "Ω",
      defaultValue: 10000,
      pins: [
        { x: -72, y: 0, name: "A" },
        { x: 0, y: -54, name: "W" },
        { x: 72, y: 0, name: "B" }
      ]
    },
    vsource: {
      name: "电压源",
      icon: "V",
      desc: "DC / AC / 方波",
      prefix: "V",
      unit: "V",
      defaultValue: 5,
      pins: TWO_PIN
    },
    isource: {
      name: "电流源",
      icon: "I",
      desc: "恒流或波形",
      prefix: "I",
      unit: "A",
      defaultValue: 0.01,
      pins: TWO_PIN
    },
    ground: {
      name: "地",
      icon: "⏚",
      desc: "0 V 参考点",
      prefix: "GND",
      unit: "",
      defaultValue: 0,
      pins: [{ x: 0, y: -48, name: "GND" }]
    },
    switch: {
      name: "开关",
      icon: "S",
      desc: "开路 / 闭合",
      prefix: "S",
      unit: "",
      defaultValue: 0,
      pins: TWO_PIN
    },
    diode: {
      name: "二极管",
      icon: "D",
      desc: "单向导通",
      prefix: "D",
      unit: "V",
      defaultValue: 0.7,
      pins: TWO_PIN
    },
    zener: {
      name: "齐纳二极管",
      icon: "ZD",
      desc: "反向稳压",
      prefix: "ZD",
      unit: "V",
      defaultValue: 5.1,
      pins: TWO_PIN
    },
    led: {
      name: "LED",
      icon: "LED",
      desc: "带亮度显示",
      prefix: "LED",
      unit: "V",
      defaultValue: 2,
      pins: TWO_PIN
    },
    lamp: {
      name: "灯泡",
      icon: "B",
      desc: "功率亮度",
      prefix: "B",
      unit: "Ω",
      defaultValue: 60,
      pins: TWO_PIN
    },
    voltmeter: {
      name: "电压表",
      icon: "Vm",
      desc: "高阻测量",
      prefix: "VM",
      unit: "",
      defaultValue: 0,
      pins: TWO_PIN
    },
    ammeter: {
      name: "电流表",
      icon: "Am",
      desc: "串联测量",
      prefix: "AM",
      unit: "",
      defaultValue: 0,
      pins: TWO_PIN
    },
    vcvs: {
      name: "VCVS",
      icon: "E",
      desc: "压控电压源",
      prefix: "E",
      unit: "V/V",
      defaultValue: 10,
      pins: [
        { x: -72, y: -32, name: "IN+" },
        { x: -72, y: 32, name: "IN-" },
        { x: 72, y: -32, name: "OUT+" },
        { x: 72, y: 32, name: "OUT-" }
      ]
    },
    vccs: {
      name: "VCCS",
      icon: "G",
      desc: "压控电流源",
      prefix: "G",
      unit: "A/V",
      defaultValue: 0.002,
      pins: [
        { x: -72, y: -32, name: "IN+" },
        { x: -72, y: 32, name: "IN-" },
        { x: 72, y: -32, name: "OUT+" },
        { x: 72, y: 32, name: "OUT-" }
      ]
    },
    probe: {
      name: "探针",
      icon: "P",
      desc: "示波器节点",
      prefix: "P",
      unit: "",
      defaultValue: 0,
      pins: [{ x: 0, y: 0, name: "P" }]
    }
  };

  const state = {
    components: [],
    wires: [],
    selection: null,
    tool: "select",
    placingType: null,
    wireStart: null,
    pointer: { x: 0, y: 0 },
    drag: null,
    pan: null,
    spaceDown: false,
    paletteFilter: "",
    jsonMode: "export",
    settings: {
      dt: 0.002,
      speed: 8,
      samples: 320,
      autosave: true,
      orthogonalWire: true
    },
    viewport: {
      x: 0,
      y: 0,
      width: VIEW_WIDTH,
      height: VIEW_HEIGHT
    },
    history: {
      undo: [],
      redo: [],
      limit: 80,
      loading: false
    },
    sim: {
      running: true,
      time: 0,
      lastResult: null,
      warnings: [],
      scope: [],
      dirty: true
    }
  };

  const examples = [
    {
      name: "LED 限流",
      description: "5 V 电源、330 Ω 电阻、LED 回路",
      create: () => shiftCircuit({
        components: [
          comp("vsource", 240, 312, 90, { id: "V1", label: "V1", value: 5 }),
          comp("ground", 240, 432, 0, { id: "GND1", label: "GND" }),
          comp("resistor", 432, 240, 0, { id: "R1", label: "R1", value: 330 }),
          comp("led", 624, 240, 0, { id: "LED1", label: "LED1", threshold: 2, ron: 20 })
        ],
        wires: [
          wire(240, 240, 360, 240),
          wire(504, 240, 552, 240),
          wire(696, 240, 696, 384),
          wire(696, 384, 240, 384)
        ]
      }, 144, 48)
    },
    {
      name: "RC 方波",
      description: "电容充放电与示波器",
      create: () => shiftCircuit({
        components: [
          comp("vsource", 240, 312, 90, {
            id: "V1",
            label: "V1",
            value: 5,
            waveform: "square",
            amplitude: 5,
            offset: 0,
            frequency: 1,
            duty: 0.5
          }),
          comp("ground", 240, 432, 0, { id: "GND1", label: "GND" }),
          comp("resistor", 432, 240, 0, { id: "R1", label: "R1", value: 1200 }),
          comp("capacitor", 600, 312, 90, { id: "C1", label: "C1", value: 0.00047 }),
          comp("probe", 600, 240, 0, { id: "P1", label: "P1" })
        ],
        wires: [
          wire(240, 240, 360, 240),
          wire(504, 240, 600, 240),
          wire(600, 384, 240, 384)
        ]
      }, 144, 48)
    },
    {
      name: "分压器",
      description: "两只电阻分压和电压表",
      create: () => shiftCircuit({
        components: [
          comp("vsource", 240, 312, 90, { id: "V1", label: "V1", value: 12 }),
          comp("ground", 240, 576, 0, { id: "GND1", label: "GND" }),
          comp("resistor", 432, 312, 90, { id: "R1", label: "R1", value: 2200 }),
          comp("resistor", 432, 456, 90, { id: "R2", label: "R2", value: 1000 }),
          comp("voltmeter", 648, 456, 90, { id: "VM1", label: "VM1" }),
          comp("probe", 432, 384, 0, { id: "P1", label: "P1" })
        ],
        wires: [
          wire(240, 240, 432, 240),
          wire(240, 384, 240, 528),
          wire(240, 528, 432, 528),
          wire(432, 384, 648, 384),
          wire(648, 528, 432, 528)
        ]
      }, 144, 48)
    },
    {
      name: "RLC 脉冲",
      description: "电感电容的瞬态响应",
      create: () => shiftCircuit({
        components: [
          comp("vsource", 216, 312, 90, {
            id: "V1",
            label: "V1",
            value: 6,
            waveform: "square",
            amplitude: 6,
            offset: 0,
            frequency: 2,
            duty: 0.35
          }),
          comp("ground", 216, 432, 0, { id: "GND1", label: "GND" }),
          comp("resistor", 384, 240, 0, { id: "R1", label: "R1", value: 80 }),
          comp("inductor", 552, 240, 0, { id: "L1", label: "L1", value: 0.04 }),
          comp("capacitor", 744, 312, 90, { id: "C1", label: "C1", value: 0.00068 }),
          comp("probe", 744, 240, 0, { id: "P1", label: "P1" })
        ],
        wires: [
          wire(216, 240, 312, 240),
          wire(456, 240, 480, 240),
          wire(624, 240, 744, 240),
          wire(744, 384, 216, 384)
        ]
      }, 144, 48)
    },
    {
      name: "可变分压",
      description: "三端电位器输出可调节点",
      create: () => shiftCircuit({
        components: [
          comp("vsource", 216, 336, 90, { id: "V1", label: "V1", value: 9 }),
          comp("ground", 216, 456, 0, { id: "GND1", label: "GND" }),
          comp("potentiometer", 480, 336, 0, { id: "VR1", label: "VR1", value: 10000, wiper: 0.35 }),
          comp("voltmeter", 720, 336, 90, { id: "VM1", label: "VM1" }),
          comp("probe", 480, 240, 0, { id: "P1", label: "P1" })
        ],
        wires: [
          wire(216, 264, 408, 264),
          wire(408, 264, 408, 336),
          wire(216, 408, 552, 408),
          wire(552, 408, 552, 336),
          wire(480, 282, 480, 240),
          wire(480, 282, 720, 282),
          wire(720, 282, 720, 264),
          wire(720, 408, 552, 408)
        ]
      }, 120, 24)
    },
    {
      name: "齐纳稳压",
      description: "限流电阻、齐纳管和负载",
      create: () => shiftCircuit({
        components: [
          comp("vsource", 216, 336, 90, { id: "V1", label: "V1", value: 12 }),
          comp("ground", 216, 456, 0, { id: "GND1", label: "GND" }),
          comp("resistor", 408, 264, 0, { id: "R1", label: "R1", value: 470 }),
          comp("zener", 600, 336, 270, { id: "ZD1", label: "ZD1", zenerVoltage: 5.1, ron: 8, rz: 6 }),
          comp("resistor", 768, 336, 90, { id: "R2", label: "LOAD", value: 1000 }),
          comp("probe", 600, 264, 0, { id: "P1", label: "P1" })
        ],
        wires: [
          wire(216, 264, 336, 264),
          wire(480, 264, 768, 264),
          wire(216, 408, 768, 408),
          wire(600, 264, 600, 264),
          wire(600, 408, 600, 408)
        ]
      }, 120, 24)
    },
    {
      name: "VCVS 放大",
      description: "正弦输入经受控源放大",
      create: () => shiftCircuit({
        components: [
          comp("vsource", 216, 384, 90, {
            id: "V1",
            label: "VIN",
            value: 0,
            waveform: "sine",
            amplitude: 0.35,
            offset: 0,
            frequency: 3
          }),
          comp("ground", 216, 504, 0, { id: "GND1", label: "GND" }),
          comp("vcvs", 552, 384, 0, { id: "E1", label: "E1", gain: 6 }),
          comp("resistor", 768, 384, 90, { id: "R1", label: "RLOAD", value: 1000 }),
          comp("probe", 768, 312, 0, { id: "P1", label: "OUT" })
        ],
        wires: [
          wire(216, 312, 480, 312),
          wire(480, 312, 480, 352),
          wire(216, 456, 480, 456),
          wire(480, 456, 480, 416),
          wire(624, 352, 624, 312),
          wire(624, 312, 768, 312),
          wire(624, 416, 624, 456),
          wire(624, 456, 768, 456),
          wire(216, 456, 216, 456)
        ]
      }, 120, -8)
    }
  ];

  function init() {
    renderPalette();
    renderExamples();
    bindEvents();
    syncSettingsToInputs();
    setViewBox(state.viewport);

    const saved = loadSavedCircuit();
    if (saved) {
      loadCircuit(saved, { resetTime: true, silent: true });
      setStatus("已恢复上次保存的电路。");
    } else {
      loadExample(0);
    }

    commitHistory({ replace: true });
    renderAll();
    requestAnimationFrame(animationLoop);
  }

  function renderPalette() {
    const order = [
      "resistor",
      "capacitor",
      "inductor",
      "potentiometer",
      "vsource",
      "isource",
      "ground",
      "switch",
      "diode",
      "zener",
      "led",
      "lamp",
      "voltmeter",
      "ammeter",
      "vcvs",
      "vccs",
      "probe"
    ];

    els.componentList.innerHTML = "";
    const filter = state.paletteFilter.trim().toLowerCase();
    const visibleTypes = order.filter((type) => {
      if (!filter) return true;
      const def = COMPONENTS[type];
      return [type, def.name, def.desc, def.prefix]
        .some((item) => String(item).toLowerCase().includes(filter));
    });

    visibleTypes.forEach((type) => {
      const def = COMPONENTS[type];
      const button = document.createElement("button");
      button.className = "component-button";
      button.type = "button";
      button.dataset.type = type;
      button.innerHTML = `
        <span class="component-icon">${escapeHtml(def.icon)}</span>
        <span>
          <span class="component-name">${escapeHtml(def.name)}</span>
          <span class="component-desc">${escapeHtml(def.desc)}</span>
        </span>
      `;
      button.addEventListener("click", () => {
        state.placingType = type;
        setTool("place");
        setStatus(`在画布上点击放置：${def.name}`);
        renderPaletteActiveState();
        renderOverlay();
      });
      els.componentList.appendChild(button);
    });

    if (!visibleTypes.length) {
      els.componentList.innerHTML = `<div class="empty-state compact">没有匹配的元件。</div>`;
    }
  }

  function renderPaletteActiveState() {
    els.componentList.querySelectorAll(".component-button").forEach((button) => {
      button.classList.toggle("active", state.tool === "place" && button.dataset.type === state.placingType);
    });
  }

  function renderExamples() {
    els.exampleList.innerHTML = "";
    examples.forEach((example, index) => {
      const button = document.createElement("button");
      button.className = "example-button";
      button.type = "button";
      button.innerHTML = `
        <span class="component-icon">${index + 1}</span>
        <span>
          <span class="component-name">${escapeHtml(example.name)}</span>
          <span class="component-desc">${escapeHtml(example.description)}</span>
        </span>
      `;
      button.addEventListener("click", () => loadExample(index));
      els.exampleList.appendChild(button);
    });
  }

  function bindEvents() {
    document.querySelectorAll("[data-tool]").forEach((button) => {
      button.addEventListener("click", () => {
        state.placingType = null;
        setTool(button.dataset.tool);
      });
    });

    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => activateTab(tab.dataset.tab));
    });

    els.canvas.addEventListener("pointerdown", onCanvasPointerDown);
    els.canvas.addEventListener("pointermove", onCanvasPointerMove);
    els.canvas.addEventListener("pointerup", onCanvasPointerUp);
    els.canvas.addEventListener("pointerleave", onCanvasPointerLeave);
    els.canvas.addEventListener("dblclick", onCanvasDoubleClick);
    els.canvas.addEventListener("wheel", onCanvasWheel, { passive: false });

    els.undoAction.addEventListener("click", undoHistory);
    els.redoAction.addEventListener("click", redoHistory);
    els.rotateSelected.addEventListener("click", rotateSelection);
    els.duplicateSelected.addEventListener("click", duplicateSelection);
    els.deleteSelected.addEventListener("click", deleteSelection);
    els.zoomOut.addEventListener("click", () => zoomCanvas(1.18));
    els.zoomIn.addEventListener("click", () => zoomCanvas(0.85));
    els.zoomFit.addEventListener("click", fitViewToCircuit);
    els.newCircuit.addEventListener("click", newCircuit);
    els.componentFilter.addEventListener("input", () => {
      state.paletteFilter = els.componentFilter.value;
      renderPalette();
      renderPaletteActiveState();
    });

    els.runToggle.addEventListener("click", () => {
      state.sim.running = !state.sim.running;
      updateSimulationStatus();
    });
    els.stepOnce.addEventListener("click", () => {
      simulateFrames(1);
      renderSimulationFrame();
    });
    els.resetSim.addEventListener("click", () => resetSimulation());

    els.exportCircuit.addEventListener("click", openExportDialog);
    els.importCircuit.addEventListener("click", openImportDialog);
    els.copyJson.addEventListener("click", copyDialogJson);
    els.applyJson.addEventListener("click", applyDialogJson);

    els.settingDt.addEventListener("change", () => {
      state.settings.dt = clamp(Number(els.settingDt.value) || 0.002, 0.0001, 1);
      syncSettingsToInputs();
      resetSimulation(false);
      scheduleAutosave();
      commitHistory();
    });
    els.settingSpeed.addEventListener("change", () => {
      state.settings.speed = Math.round(clamp(Number(els.settingSpeed.value) || 8, 1, 200));
      syncSettingsToInputs();
      scheduleAutosave();
      commitHistory();
    });
    els.settingSamples.addEventListener("change", () => {
      state.settings.samples = Math.round(clamp(Number(els.settingSamples.value) || 320, 80, 1000));
      state.sim.scope = state.sim.scope.slice(-state.settings.samples);
      syncSettingsToInputs();
      scheduleAutosave();
      commitHistory();
      renderMeasurements();
    });
    els.settingAutosave.addEventListener("change", () => {
      state.settings.autosave = els.settingAutosave.checked;
      scheduleAutosave();
      commitHistory();
    });
    els.settingOrthogonalWire.addEventListener("change", () => {
      state.settings.orthogonalWire = els.settingOrthogonalWire.checked;
      scheduleAutosave();
      commitHistory();
      renderOverlay();
    });

    document.addEventListener("keydown", (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redoHistory();
        else undoHistory();
      } else if ((event.ctrlKey || event.metaKey) && key === "y") {
        event.preventDefault();
        redoHistory();
      } else if (event.key === " ") {
        event.preventDefault();
        state.spaceDown = true;
        els.canvas.classList.add("space-pan");
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelection();
      } else if (key === "r") {
        rotateSelection();
      } else if (key === "w") {
        state.placingType = null;
        setTool("wire");
      } else if (key === "f") {
        fitViewToCircuit();
      } else if (event.key === "Escape") {
        state.wireStart = null;
        state.placingType = null;
        setTool("select");
        renderAll();
      }
    });

    document.addEventListener("keyup", (event) => {
      if (event.key === " ") {
        state.spaceDown = false;
        els.canvas.classList.remove("space-pan");
      }
    });
  }

  function activateTab(tabName) {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `tab-${tabName}`);
    });
  }

  function setTool(tool) {
    state.tool = tool;
    state.wireStart = null;
    document.querySelectorAll("[data-tool]").forEach((button) => {
      button.classList.toggle("active", button.dataset.tool === tool);
    });
    renderPaletteActiveState();
    if (tool === "wire") {
      setStatus("点击一个引脚或网格点作为导线起点，再点击终点。");
    } else if (tool === "select") {
      setStatus("选择、拖动、旋转或删除对象。");
    }
    renderOverlay();
  }

  function onCanvasPointerDown(event) {
    const point = getCanvasPoint(event);
    state.pointer = point;

    if (event.button === 1 || (state.spaceDown && state.tool === "select")) {
      event.preventDefault();
      state.pan = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        viewBox: { ...state.viewport }
      };
      els.canvas.setPointerCapture(event.pointerId);
      els.canvas.classList.add("panning");
      return;
    }

    const pinTarget = event.target.closest?.("[data-pin-id]");
    const componentTarget = event.target.closest?.("[data-component-id]");
    const wireTarget = event.target.closest?.("[data-wire-id]");

    if (state.tool === "place" && state.placingType) {
      placeComponent(state.placingType, snapPoint(point));
      return;
    }

    if (state.tool === "wire") {
      const startPoint = pinTarget ? getPinWorldPoint(pinTarget.dataset.componentId, Number(pinTarget.dataset.pinIndex)) : snapPoint(point);
      handleWireClick(startPoint, { straight: event.altKey });
      return;
    }

    if (pinTarget && event.shiftKey) {
      state.tool = "wire";
      document.querySelectorAll("[data-tool]").forEach((button) => {
        button.classList.toggle("active", button.dataset.tool === "wire");
      });
      handleWireClick(getPinWorldPoint(pinTarget.dataset.componentId, Number(pinTarget.dataset.pinIndex)), { straight: event.altKey });
      return;
    }

    if (componentTarget) {
      const id = componentTarget.dataset.componentId;
      selectObject("component", id);
      const component = getComponent(id);
      if (component) {
        state.drag = {
          id,
          pointerId: event.pointerId,
          offset: { x: point.x - component.x, y: point.y - component.y }
        };
        els.canvas.setPointerCapture(event.pointerId);
      }
      renderAll();
      return;
    }

    if (wireTarget) {
      selectObject("wire", wireTarget.dataset.wireId);
      renderAll();
      return;
    }

    selectObject(null, null);
    renderAll();
  }

  function onCanvasPointerMove(event) {
    const point = getCanvasPoint(event);
    state.pointer = point;

    if (state.pan) {
      const rect = els.canvas.getBoundingClientRect();
      const dx = ((event.clientX - state.pan.clientX) / Math.max(rect.width, 1)) * state.pan.viewBox.width;
      const dy = ((event.clientY - state.pan.clientY) / Math.max(rect.height, 1)) * state.pan.viewBox.height;
      setViewBox({
        ...state.pan.viewBox,
        x: state.pan.viewBox.x - dx,
        y: state.pan.viewBox.y - dy
      });
      return;
    }

    if (state.drag) {
      const component = getComponent(state.drag.id);
      if (component) {
        const next = snapPoint({ x: point.x - state.drag.offset.x, y: point.y - state.drag.offset.y });
        component.x = clamp(next.x, 36, VIEW_WIDTH - 36);
        component.y = clamp(next.y, 36, VIEW_HEIGHT - 36);
        state.sim.dirty = true;
        renderAll();
      }
      return;
    }

    if (state.tool === "wire" || state.tool === "place") {
      renderOverlay();
    }
  }

  function onCanvasPointerUp(event) {
    if (state.pan) {
      try {
        els.canvas.releasePointerCapture(state.pan.pointerId);
      } catch {
        // Pointer capture may already be released by the browser.
      }
      state.pan = null;
      els.canvas.classList.remove("panning");
      return;
    }

    if (state.drag) {
      try {
        els.canvas.releasePointerCapture(state.drag.pointerId);
      } catch {
        // Pointer capture may already be released by the browser.
      }
      state.drag = null;
      resetSimulation(false);
      scheduleAutosave();
      commitHistory();
      renderAll();
    }
  }

  function onCanvasPointerLeave() {
    if (!state.drag && (state.tool === "wire" || state.tool === "place")) {
      renderOverlay();
    }
  }

  function onCanvasDoubleClick(event) {
    const componentTarget = event.target.closest?.("[data-component-id]");
    if (!componentTarget) return;
    const component = getComponent(componentTarget.dataset.componentId);
    if (component?.type === "switch") {
      component.closed = !component.closed;
      resetSimulation(false);
      scheduleAutosave();
      commitHistory();
      renderAll();
      setStatus(`${component.label} 已${component.closed ? "闭合" : "断开"}。`);
    }
  }

  function placeComponent(type, point) {
    const component = createComponent(type, point.x, point.y);
    state.components.push(component);
    selectObject("component", component.id);
    state.sim.dirty = true;
    resetSimulation(false);
    scheduleAutosave();
    commitHistory();
    renderAll();
    setStatus(`已放置 ${COMPONENTS[type].name}。`);
  }

  function handleWireClick(point, options = {}) {
    const snapped = snapPoint(point);
    if (!state.wireStart) {
      state.wireStart = snapped;
      setStatus(`导线起点：${formatPoint(snapped)}。`);
      renderOverlay();
      return;
    }

    if (distance(state.wireStart, snapped) < 1) {
      state.wireStart = null;
      renderOverlay();
      return;
    }

    const segments = wireSegmentsFrom(state.wireStart, snapped, options.straight);
    let lastWire = null;
    segments.forEach((segment) => {
      if (distance(segment.a, segment.b) < 1) return;
      lastWire = {
        id: uniqueId("W"),
        a: { ...segment.a },
        b: { ...segment.b }
      };
      state.wires.push(lastWire);
    });
    state.wireStart = snapped;
    if (lastWire) selectObject("wire", lastWire.id);
    state.sim.dirty = true;
    resetSimulation(false);
    scheduleAutosave();
    commitHistory();
    renderAll();
    setStatus(segments.length > 1 ? "已创建正交导线。继续点击可连续布线，Alt 可拉直线。" : "导线已连接。继续点击可连续布线，按 Esc 结束。");
  }

  function selectObject(kind, id) {
    state.selection = kind && id ? { kind, id } : null;
    if (state.selection) {
      activateTab("properties");
    } else {
      activateTab("measurements");
    }
    renderProperties();
    updateSelectionText();
  }

  function rotateSelection() {
    if (state.selection?.kind !== "component") return;
    const component = getComponent(state.selection.id);
    if (!component || component.type === "ground") return;
    component.rotation = normalizeRotation((component.rotation || 0) + 90);
    state.sim.dirty = true;
    resetSimulation(false);
    scheduleAutosave();
    commitHistory();
    renderAll();
  }

  function duplicateSelection() {
    if (state.selection?.kind !== "component") return;
    const component = getComponent(state.selection.id);
    if (!component) return;
    const clone = normalizeComponent({
      ...deepClone(component),
      id: uniqueId(COMPONENTS[component.type].prefix),
      label: nextLabel(component.type),
      x: clamp(component.x + GRID * 2, 36, VIEW_WIDTH - 36),
      y: clamp(component.y + GRID * 2, 36, VIEW_HEIGHT - 36),
      state: {}
    });
    state.components.push(clone);
    selectObject("component", clone.id);
    state.sim.dirty = true;
    resetSimulation(false);
    scheduleAutosave();
    commitHistory();
    renderAll();
  }

  function deleteSelection() {
    if (!state.selection) return;
    if (state.selection.kind === "component") {
      state.components = state.components.filter((component) => component.id !== state.selection.id);
    } else if (state.selection.kind === "wire") {
      state.wires = state.wires.filter((wireItem) => wireItem.id !== state.selection.id);
    }
    state.selection = null;
    state.sim.dirty = true;
    resetSimulation(false);
    scheduleAutosave();
    commitHistory();
    renderAll();
  }

  function newCircuit() {
    state.components = [];
    state.wires = [];
    state.selection = null;
    state.wireStart = null;
    resetSimulation(false);
    scheduleAutosave();
    commitHistory();
    renderAll();
    setStatus("已新建空白电路。");
  }

  function resetSimulation(shouldRender = true) {
    state.sim.time = 0;
    state.sim.scope = [];
    state.sim.warnings = [];
    state.sim.lastResult = null;
    state.components.forEach((component) => {
      component.state = {};
    });
    state.sim.dirty = true;
    if (shouldRender) renderAll();
  }

  function loadExample(index) {
    const example = examples[index];
    if (!example) return;
    loadCircuit(example.create(), { resetTime: true });
    activateTab("measurements");
    setStatus(`已载入示例：${example.name}`);
  }

  function loadCircuit(circuit, options = {}) {
    const normalized = normalizeCircuit(circuit);
    state.components = normalized.components;
    state.wires = normalized.wires;
    state.settings = { ...state.settings, ...normalized.settings };
    state.selection = null;
    state.wireStart = null;
    state.placingType = null;
    setTool("select");
    syncSettingsToInputs();
    if (options.resetTime !== false) resetSimulation(false);
    state.sim.dirty = true;
    if (!options.silent) scheduleAutosave();
    if (options.history !== false) commitHistory();
    renderAll();
  }

  function loadSavedCircuit() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  let saveTimer = null;
  function scheduleAutosave() {
    if (!state.settings.autosave) return;
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(exportCircuitData()));
      } catch {
        setStatus("自动保存失败，浏览器可能限制了本地存储。");
      }
    }, 120);
  }

  function exportCircuitData() {
    return {
      version: 1,
      settings: { ...state.settings },
      components: state.components.map((component) => {
        const copy = deepClone(component);
        copy.state = {};
        return copy;
      }),
      wires: deepClone(state.wires)
    };
  }

  function openExportDialog() {
    state.jsonMode = "export";
    els.jsonTitle.textContent = "导出电路 JSON";
    els.jsonTextarea.value = JSON.stringify(exportCircuitData(), null, 2);
    els.applyJson.textContent = "关闭";
    openDialog();
  }

  function openImportDialog() {
    state.jsonMode = "import";
    els.jsonTitle.textContent = "导入电路 JSON";
    els.jsonTextarea.value = JSON.stringify(exportCircuitData(), null, 2);
    els.applyJson.textContent = "应用";
    openDialog();
  }

  function openDialog() {
    if (typeof els.jsonDialog.showModal === "function") {
      els.jsonDialog.showModal();
    } else {
      els.jsonDialog.setAttribute("open", "open");
    }
    els.jsonTextarea.focus();
    els.jsonTextarea.select();
  }

  async function copyDialogJson() {
    try {
      await navigator.clipboard.writeText(els.jsonTextarea.value);
      setStatus("JSON 已复制到剪贴板。");
    } catch {
      els.jsonTextarea.select();
      document.execCommand("copy");
      setStatus("JSON 已复制。");
    }
  }

  function applyDialogJson() {
    if (state.jsonMode === "export") {
      closeDialog();
      return;
    }
    try {
      const parsed = JSON.parse(els.jsonTextarea.value);
      loadCircuit(parsed, { resetTime: true });
      closeDialog();
      setStatus("JSON 电路已导入。");
    } catch (error) {
      setStatus(`导入失败：${error.message}`);
    }
  }

  function closeDialog() {
    if (typeof els.jsonDialog.close === "function") {
      els.jsonDialog.close();
    } else {
      els.jsonDialog.removeAttribute("open");
    }
  }

  function commitHistory(options = {}) {
    if (state.history.loading) return;
    const snapshot = JSON.stringify(exportCircuitData());
    const last = state.history.undo[state.history.undo.length - 1];

    if (options.replace && state.history.undo.length) {
      state.history.undo[state.history.undo.length - 1] = snapshot;
    } else if (snapshot !== last) {
      state.history.undo.push(snapshot);
      if (state.history.undo.length > state.history.limit) {
        state.history.undo.splice(0, state.history.undo.length - state.history.limit);
      }
    }

    if (!options.keepRedo) state.history.redo = [];
    refreshHistoryButtons();
  }

  function undoHistory() {
    if (state.history.undo.length <= 1) {
      setStatus("没有可撤销的操作。");
      refreshHistoryButtons();
      return;
    }

    const current = state.history.undo.pop();
    state.history.redo.push(current);
    loadHistorySnapshot(state.history.undo[state.history.undo.length - 1]);
    setStatus("已撤销。");
  }

  function redoHistory() {
    const snapshot = state.history.redo.pop();
    if (!snapshot) {
      setStatus("没有可重做的操作。");
      refreshHistoryButtons();
      return;
    }

    state.history.undo.push(snapshot);
    loadHistorySnapshot(snapshot);
    setStatus("已重做。");
  }

  function loadHistorySnapshot(snapshot) {
    try {
      state.history.loading = true;
      loadCircuit(JSON.parse(snapshot), { resetTime: true, silent: true, history: false });
      scheduleAutosave();
    } catch (error) {
      setStatus(`历史记录恢复失败：${error.message}`);
    } finally {
      state.history.loading = false;
      refreshHistoryButtons();
    }
  }

  function refreshHistoryButtons() {
    els.undoAction.disabled = state.history.undo.length <= 1;
    els.redoAction.disabled = state.history.redo.length === 0;
  }

  function animationLoop() {
    if (state.sim.running) {
      simulateFrames(state.settings.speed);
      renderSimulationFrame();
    }
    requestAnimationFrame(animationLoop);
  }

  function simulateFrames(count) {
    for (let i = 0; i < count; i += 1) {
      const result = solveCircuit(state.settings.dt);
      state.sim.lastResult = result;
      state.sim.warnings = result.warnings;
      if (!result.ok) {
        state.sim.running = false;
        break;
      }
      updateDynamicStates(result);
      state.sim.time += state.settings.dt;
      addScopeSample(result);
    }
    updateSimulationStatus();
  }

  function updateDynamicStates(result) {
    state.components.forEach((component) => {
      if (component.type === "capacitor") {
        const voltage = getComponentVoltage(component, result);
        component.state.voltage = finiteOrZero(voltage);
      } else if (component.type === "inductor") {
        const measurement = result.measurements.get(component.id);
        component.state.current = finiteOrZero(measurement?.current || 0);
      } else if (component.type === "diode" || component.type === "led" || component.type === "zener") {
        component.state.voltage = finiteOrZero(getComponentVoltage(component, result));
      }
    });
  }

  function addScopeSample(result) {
    const target = getScopeTarget(result);
    state.sim.scope.push({ t: state.sim.time, value: target.value, label: target.label });
    if (state.sim.scope.length > state.settings.samples) {
      state.sim.scope.splice(0, state.sim.scope.length - state.settings.samples);
    }
  }

  function getScopeTarget(result) {
    if (state.selection?.kind === "component") {
      const component = getComponent(state.selection.id);
      if (component) {
        return { label: `${component.label} 电压`, value: getComponentVoltage(component, result) };
      }
    }
    const probe = state.components.find((component) => component.type === "probe");
    if (probe) {
      return { label: `${probe.label} 节点`, value: getPinVoltage(probe, 0, result) };
    }
    const first = state.components.find((component) => getPins(component).length > 0);
    if (first) {
      return { label: `${first.label} 节点`, value: getPinVoltage(first, 0, result) };
    }
    return { label: "无信号", value: 0 };
  }

  function solveCircuit(dt) {
    const connectivity = buildConnectivity();
    const warnings = [...connectivity.warnings];

    if (connectivity.nodeRoots.length === 0) {
      return emptySolveResult(connectivity, warnings);
    }

    const branches = collectBranches(connectivity, warnings);
    const diodeGuess = {};
    state.components.forEach((component) => {
      if (component.type === "diode" || component.type === "led" || component.type === "zener") {
        diodeGuess[component.id] = finiteOrZero(component.state?.voltage || 0);
      }
    });

    let solved = null;
    let built = null;
    for (let iteration = 0; iteration < 18; iteration += 1) {
      built = buildMatrix(connectivity, branches, diodeGuess, dt, state.sim.time);
      const solution = solveLinearSystem(built.matrix, built.vector);
      if (!solution) {
        warnings.push({ type: "error", text: "矩阵不可解。请检查理想电压源短路、缺少回路或完全悬空的节点。" });
        return {
          ok: false,
          warnings,
          connectivity,
          measurements: new Map(),
          nodeVoltages: new Map(),
          branchIndex: built.branchIndex,
          solution: []
        };
      }

      solved = solution;
      let maxDelta = 0;
      state.components.forEach((component) => {
        if (component.type !== "diode" && component.type !== "led" && component.type !== "zener") return;
        const voltage = readComponentVoltageFromSolution(component, connectivity, solution);
        maxDelta = Math.max(maxDelta, Math.abs(voltage - diodeGuess[component.id]));
        diodeGuess[component.id] = voltage;
      });

      if (maxDelta < 0.00001) break;
    }

    const nodeVoltages = makeNodeVoltageMap(connectivity, solved);
    const measurements = measureComponents(connectivity, branches, built.branchIndex, solved, dt, diodeGuess);

    return {
      ok: true,
      warnings,
      connectivity,
      measurements,
      nodeVoltages,
      branchIndex: built.branchIndex,
      solution: solved
    };
  }

  function emptySolveResult(connectivity, warnings) {
    return {
      ok: true,
      warnings,
      connectivity,
      measurements: new Map(),
      nodeVoltages: new Map(),
      branchIndex: new Map(),
      solution: []
    };
  }

  function collectBranches(connectivity, warnings) {
    const branches = [];
    state.components.forEach((component) => {
      if (!["vsource", "ammeter", "inductor", "vcvs"].includes(component.type)) return;
      const nodes = getComponentNodes(component, connectivity);
      const [a, b] = getBranchNodePair(component, nodes);
      if (!a || !b) return;
      if (a === b) {
        warnings.push({ type: "error", text: `${component.label} 输出两端连接在同一节点上。` });
        return;
      }
      branches.push({ id: component.id, component });
    });
    return branches;
  }

  function buildMatrix(connectivity, branches, diodeGuess, dt, time) {
    const nodeCount = connectivity.nodeIndex.size;
    const size = nodeCount + branches.length;
    const matrix = Array.from({ length: size }, () => Array(size).fill(0));
    const vector = Array(size).fill(0);
    const branchIndex = new Map();

    branches.forEach((branch, index) => {
      branchIndex.set(branch.id, nodeCount + index);
    });

    for (let i = 0; i < nodeCount; i += 1) {
      matrix[i][i] += 1e-12;
    }

    const idx = (root) => {
      if (!root || connectivity.groundRoots.has(root)) return -1;
      return connectivity.nodeIndex.get(root) ?? -1;
    };

    const stampConductance = (rootA, rootB, conductance) => {
      if (!Number.isFinite(conductance) || conductance <= 0 || rootA === rootB) return;
      const a = idx(rootA);
      const b = idx(rootB);
      if (a >= 0) matrix[a][a] += conductance;
      if (b >= 0) matrix[b][b] += conductance;
      if (a >= 0 && b >= 0) {
        matrix[a][b] -= conductance;
        matrix[b][a] -= conductance;
      }
    };

    const stampCurrent = (rootA, rootB, current) => {
      if (!Number.isFinite(current) || current === 0 || rootA === rootB) return;
      const a = idx(rootA);
      const b = idx(rootB);
      if (a >= 0) vector[a] -= current;
      if (b >= 0) vector[b] += current;
    };

    const stampVoltageSource = (rootA, rootB, voltage, branchRow) => {
      const a = idx(rootA);
      const b = idx(rootB);
      if (a >= 0) {
        matrix[a][branchRow] += 1;
        matrix[branchRow][a] += 1;
      }
      if (b >= 0) {
        matrix[b][branchRow] -= 1;
        matrix[branchRow][b] -= 1;
      }
      vector[branchRow] += finiteOrZero(voltage);
    };

    const stampInductor = (rootA, rootB, component, branchRow) => {
      const a = idx(rootA);
      const b = idx(rootB);
      const resistance = Math.max((Number(component.value) || 0) / Math.max(dt, 1e-9), 1e-9);
      const previousCurrent = finiteOrZero(component.state?.current || 0);
      if (a >= 0) {
        matrix[a][branchRow] += 1;
        matrix[branchRow][a] += 1;
      }
      if (b >= 0) {
        matrix[b][branchRow] -= 1;
        matrix[branchRow][b] -= 1;
      }
      matrix[branchRow][branchRow] -= resistance;
      vector[branchRow] -= resistance * previousCurrent;
    };

    const stampVccs = (outP, outN, ctrlP, ctrlN, gain) => {
      const op = idx(outP);
      const on = idx(outN);
      const cp = idx(ctrlP);
      const cn = idx(ctrlN);
      const gm = finiteOrZero(gain);
      if (!gm || outP === outN) return;

      if (op >= 0 && cp >= 0) matrix[op][cp] -= gm;
      if (op >= 0 && cn >= 0) matrix[op][cn] += gm;
      if (on >= 0 && cp >= 0) matrix[on][cp] += gm;
      if (on >= 0 && cn >= 0) matrix[on][cn] -= gm;
    };

    const stampVcvs = (outP, outN, ctrlP, ctrlN, gain, branchRow) => {
      const op = idx(outP);
      const on = idx(outN);
      const cp = idx(ctrlP);
      const cn = idx(ctrlN);
      const factor = finiteOrZero(gain);

      if (op >= 0) {
        matrix[op][branchRow] += 1;
        matrix[branchRow][op] += 1;
      }
      if (on >= 0) {
        matrix[on][branchRow] -= 1;
        matrix[branchRow][on] -= 1;
      }
      if (cp >= 0) matrix[branchRow][cp] -= factor;
      if (cn >= 0) matrix[branchRow][cn] += factor;
    };

    state.components.forEach((component) => {
      const nodes = getComponentNodes(component, connectivity);
      const a = nodes[0];
      const b = nodes[1];

      switch (component.type) {
        case "resistor":
        case "lamp":
          stampConductance(a, b, 1 / Math.max(Number(component.value) || 1, 1e-9));
          break;
        case "potentiometer": {
          const parts = potentiometerParts(component);
          stampConductance(nodes[0], nodes[1], 1 / parts.r1);
          stampConductance(nodes[1], nodes[2], 1 / parts.r2);
          break;
        }
        case "voltmeter":
          stampConductance(a, b, 1e-9);
          break;
        case "capacitor": {
          const capacitance = Math.max(Number(component.value) || 0, 0);
          if (capacitance > 0) {
            const conductance = capacitance / Math.max(dt, 1e-9);
            const previousVoltage = finiteOrZero(component.state?.voltage || 0);
            stampConductance(a, b, conductance);
            stampCurrent(a, b, -conductance * previousVoltage);
          }
          break;
        }
        case "switch": {
          const resistance = component.closed ? Number(component.onResistance) || 0.05 : Number(component.offResistance) || 1e9;
          stampConductance(a, b, 1 / Math.max(resistance, 1e-9));
          break;
        }
        case "diode":
        case "led":
        case "zener": {
          const threshold = getDiodeThreshold(component);
          const ron = Math.max(Number(component.ron) || (component.type === "led" ? 20 : 8), 1e-6);
          const roff = Math.max(Number(component.roff) || 1e9, 1);
          const previousVoltage = diodeGuess[component.id] ?? 0;
          if (previousVoltage > threshold) {
            const conductance = 1 / ron;
            stampConductance(a, b, conductance);
            stampCurrent(a, b, -conductance * threshold);
          } else if (component.type === "zener" && previousVoltage < -getZenerVoltage(component)) {
            const rz = Math.max(Number(component.rz) || 6, 1e-6);
            const conductance = 1 / rz;
            stampConductance(a, b, conductance);
            stampCurrent(a, b, conductance * getZenerVoltage(component));
          } else {
            stampConductance(a, b, 1 / roff);
          }
          break;
        }
        case "vsource": {
          const branchRow = branchIndex.get(component.id);
          if (branchRow !== undefined) stampVoltageSource(a, b, sourceSignal(component, time), branchRow);
          break;
        }
        case "isource":
          stampCurrent(a, b, sourceSignal(component, time));
          break;
        case "ammeter": {
          const branchRow = branchIndex.get(component.id);
          if (branchRow !== undefined) stampVoltageSource(a, b, 0, branchRow);
          break;
        }
        case "inductor": {
          const branchRow = branchIndex.get(component.id);
          if (branchRow !== undefined) stampInductor(a, b, component, branchRow);
          break;
        }
        case "vcvs": {
          const branchRow = branchIndex.get(component.id);
          if (branchRow !== undefined) stampVcvs(nodes[2], nodes[3], nodes[0], nodes[1], component.gain, branchRow);
          break;
        }
        case "vccs":
          stampVccs(nodes[2], nodes[3], nodes[0], nodes[1], component.gain);
          break;
        default:
          break;
      }
    });

    return { matrix, vector, branchIndex };
  }

  function measureComponents(connectivity, branches, branchIndex, solution, dt, diodeGuess) {
    const measurements = new Map();
    const branchIds = new Set(branches.map((branch) => branch.id));

    state.components.forEach((component) => {
      const pins = getPins(component);
      const voltage = pins.length >= 2
        ? readComponentVoltageFromSolution(component, connectivity, solution)
        : getPinVoltageFromSolution(component, 0, connectivity, solution);
      let current = 0;
      let power = null;

      switch (component.type) {
        case "resistor":
        case "lamp":
          current = voltage / Math.max(Number(component.value) || 1, 1e-9);
          break;
        case "potentiometer": {
          const parts = potentiometerParts(component);
          const va = getPinVoltageFromSolution(component, 0, connectivity, solution);
          const vw = getPinVoltageFromSolution(component, 1, connectivity, solution);
          const vb = getPinVoltageFromSolution(component, 2, connectivity, solution);
          const i1 = (va - vw) / parts.r1;
          const i2 = (vw - vb) / parts.r2;
          current = i1;
          power = i1 * i1 * parts.r1 + i2 * i2 * parts.r2;
          break;
        }
        case "voltmeter":
          current = voltage * 1e-9;
          break;
        case "capacitor": {
          const previousVoltage = finiteOrZero(component.state?.voltage || 0);
          current = (Math.max(Number(component.value) || 0, 0) / Math.max(dt, 1e-9)) * (voltage - previousVoltage);
          break;
        }
        case "switch": {
          const resistance = component.closed ? Number(component.onResistance) || 0.05 : Number(component.offResistance) || 1e9;
          current = voltage / Math.max(resistance, 1e-9);
          break;
        }
        case "diode":
        case "led":
        case "zener":
          current = diodeCurrent(component, diodeGuess[component.id] ?? voltage);
          break;
        case "isource":
          current = sourceSignal(component, state.sim.time);
          break;
        case "vccs":
          current = controlledSourceCurrent(component, connectivity, solution);
          break;
        default:
          if (branchIds.has(component.id)) {
            const row = branchIndex.get(component.id);
            current = row === undefined ? 0 : finiteOrZero(solution[row]);
          }
          break;
      }

      measurements.set(component.id, {
        id: component.id,
        label: component.label,
        type: component.type,
        voltage: finiteOrZero(voltage),
        current: finiteOrZero(current),
        power: finiteOrZero(power ?? voltage * current)
      });
    });

    return measurements;
  }

  function buildConnectivity() {
    const uf = new UnionFind();
    const allKeys = new Set();
    const pinKey = new Map();

    state.components.forEach((component) => {
      getPinWorldPoints(component).forEach((point, index) => {
        const key = pointKey(point);
        uf.add(key);
        allKeys.add(key);
        pinKey.set(`${component.id}:${index}`, key);
      });
    });

    state.wires.forEach((wireItem) => {
      const a = pointKey(wireItem.a);
      const b = pointKey(wireItem.b);
      uf.add(a);
      uf.add(b);
      allKeys.add(a);
      allKeys.add(b);
      uf.union(a, b);
    });

    state.wires.forEach((wireItem) => {
      const pointsOnWire = [...allKeys].filter((key) => pointOnSegment(keyToPoint(key), wireItem.a, wireItem.b));
      for (let i = 1; i < pointsOnWire.length; i += 1) {
        uf.union(pointsOnWire[0], pointsOnWire[i]);
      }
    });

    const groundRoots = new Set();
    state.components.forEach((component) => {
      if (component.type !== "ground") return;
      const key = pinKey.get(`${component.id}:0`);
      if (key) groundRoots.add(uf.find(key));
    });

    const roots = [...allKeys].map((key) => uf.find(key));
    const uniqueRoots = [...new Set(roots)];
    const warnings = [];

    if (groundRoots.size === 0 && uniqueRoots.length > 0) {
      groundRoots.add(uniqueRoots[0]);
      warnings.push({ type: "warning", text: "未放置地，系统已临时选择一个节点作为 0 V 参考。" });
    }

    const nodeRoots = uniqueRoots.filter((root) => !groundRoots.has(root));
    const nodeIndex = new Map();
    nodeRoots.forEach((root, index) => nodeIndex.set(root, index));

    const coordRoots = new Map();
    allKeys.forEach((key) => coordRoots.set(key, uf.find(key)));

    const pinRoots = new Map();
    pinKey.forEach((key, id) => pinRoots.set(id, uf.find(key)));

    return {
      uf,
      allKeys,
      pinKey,
      pinRoots,
      coordRoots,
      groundRoots,
      nodeRoots,
      nodeIndex,
      warnings
    };
  }

  function solveLinearSystem(matrix, vector) {
    const n = vector.length;
    if (n === 0) return [];
    const a = matrix.map((row, index) => [...row, vector[index]]);

    for (let col = 0; col < n; col += 1) {
      let pivot = col;
      for (let row = col + 1; row < n; row += 1) {
        if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
      }

      if (Math.abs(a[pivot][col]) < 1e-14) return null;
      if (pivot !== col) {
        const temp = a[col];
        a[col] = a[pivot];
        a[pivot] = temp;
      }

      const pivotValue = a[col][col];
      for (let j = col; j <= n; j += 1) a[col][j] /= pivotValue;

      for (let row = 0; row < n; row += 1) {
        if (row === col) continue;
        const factor = a[row][col];
        if (Math.abs(factor) < 1e-18) continue;
        for (let j = col; j <= n; j += 1) {
          a[row][j] -= factor * a[col][j];
        }
      }
    }

    return a.map((row) => finiteOrZero(row[n]));
  }

  class UnionFind {
    constructor() {
      this.parent = new Map();
    }

    add(key) {
      if (!this.parent.has(key)) this.parent.set(key, key);
    }

    find(key) {
      this.add(key);
      const parent = this.parent.get(key);
      if (parent === key) return key;
      const root = this.find(parent);
      this.parent.set(key, root);
      return root;
    }

    union(a, b) {
      const rootA = this.find(a);
      const rootB = this.find(b);
      if (rootA !== rootB) this.parent.set(rootB, rootA);
    }
  }

  function renderAll() {
    renderSimulationFrame();
    renderProperties();
  }

  function renderSimulationFrame() {
    renderWires();
    renderComponents();
    renderOverlay();
    renderMeasurements();
    renderCanvasHud();
    updateSimulationStatus();
    updateSelectionText();
  }

  function renderWires() {
    clearSvg(els.wireLayer);
    state.wires.forEach((wireItem) => {
      const line = svgEl("line", {
        x1: wireItem.a.x,
        y1: wireItem.a.y,
        x2: wireItem.b.x,
        y2: wireItem.b.y,
        class: `wire ${state.selection?.kind === "wire" && state.selection.id === wireItem.id ? "selected" : ""}`,
        "data-wire-id": wireItem.id
      });
      els.wireLayer.appendChild(line);
    });
    renderWireFlows();
  }

  function renderWireFlows() {
    const segments = buildWireFlowSegments();
    segments.forEach((segment) => {
      appendFlowLine(els.wireLayer, segment, "wire-flow");
    });
  }

  function renderComponents() {
    clearSvg(els.componentLayer);
    state.components.forEach((component) => {
      const group = svgEl("g", {
        class: `component ${state.selection?.kind === "component" && state.selection.id === component.id ? "selected" : ""}`,
        transform: `translate(${component.x} ${component.y}) rotate(${component.rotation || 0})`,
        "data-component-id": component.id
      });

      group.appendChild(svgEl("rect", {
        x: -82,
        y: -58,
        width: 164,
        height: 116,
        rx: 8,
        class: "selection-box"
      }));

      group.appendChild(svgEl("rect", {
        x: -86,
        y: -62,
        width: 172,
        height: 124,
        class: "component-hit",
        "data-component-id": component.id
      }));

      drawComponentSymbol(group, component);

      const labelY = component.type === "ground" ? 28 : 68;
      group.appendChild(svgText(0, labelY, component.label || component.id, "component-label"));

      const reading = componentReading(component);
      if (reading) {
        group.appendChild(svgText(0, labelY + 18, reading, "component-reading"));
      }

      getPins(component).forEach((pin, index) => {
        const pinCircle = svgEl("circle", {
          cx: pin.x,
          cy: pin.y,
          r: 7,
          class: "pin",
          "data-component-id": component.id,
          "data-pin-id": `${component.id}:${index}`,
          "data-pin-index": index
        });
        group.appendChild(pinCircle);
      });

      els.componentLayer.appendChild(group);
    });
  }

  function drawComponentSymbol(group, component) {
    switch (component.type) {
      case "resistor":
        group.appendChild(svgPath("M -72 0 L -52 0 L -44 -17 L -28 17 L -12 -17 L 4 17 L 20 -17 L 36 17 L 52 0 L 72 0"));
        break;
      case "capacitor":
        group.appendChild(svgPath("M -72 0 L -18 0 M -18 -28 L -18 28 M 18 -28 L 18 28 M 18 0 L 72 0"));
        break;
      case "inductor":
        group.appendChild(svgPath("M -72 0 L -54 0 C -54 -24 -30 -24 -30 0 C -30 -24 -6 -24 -6 0 C -6 -24 18 -24 18 0 C 18 -24 42 -24 42 0 C 42 -24 66 -24 66 0 L 72 0"));
        break;
      case "vsource":
        group.appendChild(svgLine(-72, 0, -34, 0));
        group.appendChild(svgLine(34, 0, 72, 0));
        group.appendChild(svgEl("circle", { cx: 0, cy: 0, r: 34, class: "component-fill" }));
        group.appendChild(svgText(-14, -2, "+", "component-symbol-text"));
        group.appendChild(svgText(16, 0, "−", "component-symbol-text"));
        break;
      case "isource":
        group.appendChild(svgLine(-72, 0, -34, 0));
        group.appendChild(svgLine(34, 0, 72, 0));
        group.appendChild(svgEl("circle", { cx: 0, cy: 0, r: 34, class: "component-fill" }));
        group.appendChild(svgPath("M -12 0 L 15 0 M 6 -9 L 15 0 L 6 9"));
        break;
      case "ground":
        group.appendChild(svgPath("M 0 -48 L 0 -18 M -30 -18 L 30 -18 M -20 -4 L 20 -4 M -10 10 L 10 10"));
        break;
      case "switch":
        group.appendChild(svgLine(-72, 0, -22, 0));
        group.appendChild(svgLine(22, 0, 72, 0));
        group.appendChild(svgEl("circle", { cx: -22, cy: 0, r: 5, class: "component-fill" }));
        group.appendChild(svgEl("circle", { cx: 22, cy: 0, r: 5, class: "component-fill" }));
        group.appendChild(svgLine(-18, 0, component.closed ? 22 : 12, component.closed ? 0 : -26));
        break;
      case "diode":
      case "led":
        group.appendChild(svgLine(-72, 0, -22, 0));
        group.appendChild(svgLine(24, 0, 72, 0));
        group.appendChild(svgPath("M -22 -28 L -22 28 L 22 0 Z", "component-fill"));
        group.appendChild(svgLine(24, -28, 24, 28));
        if (component.type === "led") {
          const brightness = ledBrightness(component);
          const bulb = svgEl("circle", {
            cx: 0,
            cy: 0,
            r: 18,
            fill: `rgba(232, 72, 79, ${0.15 + brightness * 0.55})`,
            stroke: "none"
          });
          group.insertBefore(bulb, group.firstChild);
          group.appendChild(svgPath("M 12 -38 L 30 -56 M 25 -54 L 30 -56 L 28 -49"));
          group.appendChild(svgPath("M 30 -30 L 48 -48 M 43 -46 L 48 -48 L 46 -41"));
        }
        break;
      case "lamp": {
        const brightness = lampBrightness(component);
        group.appendChild(svgLine(-72, 0, -34, 0));
        group.appendChild(svgLine(34, 0, 72, 0));
        group.appendChild(svgEl("circle", {
          cx: 0,
          cy: 0,
          r: 34,
          class: "component-fill",
          fill: `rgba(255, 193, 79, ${0.12 + brightness * 0.52})`
        }));
        group.appendChild(svgLine(-20, -20, 20, 20));
        group.appendChild(svgLine(-20, 20, 20, -20));
        break;
      }
      case "voltmeter":
      case "ammeter":
        group.appendChild(svgLine(-72, 0, -34, 0));
        group.appendChild(svgLine(34, 0, 72, 0));
        group.appendChild(svgEl("circle", { cx: 0, cy: 0, r: 34, class: "component-fill" }));
        group.appendChild(svgText(0, 0, component.type === "voltmeter" ? "V" : "A", "component-symbol-text"));
        break;
      case "probe":
        group.appendChild(svgEl("circle", { cx: 0, cy: 0, r: 12, class: "component-fill" }));
        group.appendChild(svgLine(-28, 0, -12, 0));
        group.appendChild(svgLine(12, 0, 28, 0));
        group.appendChild(svgLine(0, -28, 0, -12));
        group.appendChild(svgLine(0, 12, 0, 28));
        break;
      default:
        group.appendChild(svgLine(-72, 0, 72, 0));
        break;
    }
  }

  function renderOverlay() {
    clearSvg(els.overlayLayer);

    renderComponentFlows();

    const connectivity = buildConnectivity();
    connectivity.coordRoots.forEach((root, key) => {
      const point = keyToPoint(key);
      const isGround = connectivity.groundRoots.has(root);
      els.overlayLayer.appendChild(svgEl("circle", {
        cx: point.x,
        cy: point.y,
        r: 5,
        class: `node-dot ${isGround ? "ground" : ""}`
      }));

      const voltage = state.sim.lastResult?.nodeVoltages.get(root);
      if (Number.isFinite(voltage) && Math.abs(voltage) > 0.01) {
        els.overlayLayer.appendChild(svgText(point.x, point.y - 12, formatVoltage(voltage), "node-voltage"));
      }
    });

    if (state.wireStart && state.tool === "wire") {
      const end = snapPoint(state.pointer);
      wireSegmentsFrom(state.wireStart, end).forEach((segment) => {
        els.overlayLayer.appendChild(svgEl("line", {
          x1: segment.a.x,
          y1: segment.a.y,
          x2: segment.b.x,
          y2: segment.b.y,
          class: "wire-preview"
        }));
      });
      els.overlayLayer.appendChild(svgEl("circle", {
        cx: end.x,
        cy: end.y,
        r: 6,
        class: "cursor-dot"
      }));
    }

    if (state.tool === "place" && state.placingType) {
      const point = snapPoint(state.pointer);
      els.overlayLayer.appendChild(svgEl("circle", {
        cx: point.x,
        cy: point.y,
        r: 6,
        class: "cursor-dot"
      }));
      const preview = createComponent(state.placingType, point.x, point.y);
      preview.label = COMPONENTS[state.placingType].name;
      const group = svgEl("g", {
        class: "placement-preview",
        transform: `translate(${preview.x} ${preview.y}) rotate(${preview.rotation || 0})`
      });
      drawComponentSymbol(group, preview);
      els.overlayLayer.appendChild(group);
    }
  }

  function renderComponentFlows() {
    const result = state.sim.lastResult;
    if (!result?.ok) return;
    state.components.forEach((component) => {
      const pins = getPinWorldPoints(component);
      if (pins.length < 2) return;
      const measurement = result.measurements.get(component.id);
      const current = measurement?.current || 0;
      if (!isVisibleCurrent(current)) return;
      const segment = current >= 0
        ? { a: pins[0], b: pins[1], current }
        : { a: pins[1], b: pins[0], current: Math.abs(current) };
      appendFlowLine(els.overlayLayer, segment, "component-flow");
    });
  }

  function buildWireFlowSegments() {
    const result = state.sim.lastResult;
    if (!result?.ok || !state.wires.length) return [];

    const graph = buildWireGraph();
    if (!graph.nodes.size || !graph.edges.size) return [];

    const sources = [];
    const sinks = [];

    state.components.forEach((component) => {
      const pins = getPinWorldPoints(component);
      if (pins.length < 2) return;
      const measurement = result.measurements.get(component.id);
      const current = measurement?.current || 0;
      if (!isVisibleCurrent(current)) return;

      const amount = Math.abs(current);
      const pin0 = pointKey(pins[0]);
      const pin1 = pointKey(pins[1]);
      if (!graph.nodes.has(pin0) || !graph.nodes.has(pin1)) return;

      if (current > 0) {
        sinks.push({ key: pin0, amount });
        sources.push({ key: pin1, amount });
      } else {
        sources.push({ key: pin0, amount });
        sinks.push({ key: pin1, amount });
      }
    });

    const remainingSinks = sinks.map((sink) => ({ ...sink }));
    const netSegments = new Map();

    sources.forEach((source) => {
      let remaining = source.amount;
      while (remaining > 1e-12) {
        const candidates = remainingSinks
          .filter((sink) => sink.amount > 1e-12 && sink.key !== source.key)
          .map((sink) => ({ sink, path: shortestWirePath(graph, source.key, sink.key) }))
          .filter((candidate) => candidate.path);
        if (!candidates.length) break;

        candidates.sort((a, b) => a.path.distance - b.path.distance);
        const target = candidates[0].sink;
        const path = candidates[0].path.nodes;
        const amount = Math.min(remaining, target.amount);
        addPathFlow(netSegments, path, amount);
        remaining -= amount;
        target.amount -= amount;
      }
    });

    return [...netSegments.entries()]
      .map(([key, amount]) => {
        if (!isVisibleCurrent(amount)) return null;
        const [aKey, bKey] = key.split("|");
        const a = keyToPoint(aKey);
        const b = keyToPoint(bKey);
        return amount > 0
          ? { a, b, current: Math.abs(amount) }
          : { a: b, b: a, current: Math.abs(amount) };
      })
      .filter(Boolean);
  }

  function buildWireGraph() {
    const nodes = new Set();
    const adjacency = new Map();
    const allKeys = new Set();

    state.components.forEach((component) => {
      getPinWorldPoints(component).forEach((point) => {
        const key = pointKey(point);
        nodes.add(key);
        allKeys.add(key);
      });
    });

    state.wires.forEach((wireItem) => {
      const a = pointKey(wireItem.a);
      const b = pointKey(wireItem.b);
      nodes.add(a);
      nodes.add(b);
      allKeys.add(a);
      allKeys.add(b);
    });

    const addEdge = (from, to) => {
      if (from === to) return;
      const a = keyToPoint(from);
      const b = keyToPoint(to);
      const weight = distance(a, b);
      if (!adjacency.has(from)) adjacency.set(from, []);
      if (!adjacency.has(to)) adjacency.set(to, []);
      adjacency.get(from).push({ to, weight });
      adjacency.get(to).push({ to: from, weight });
    };

    state.wires.forEach((wireItem) => {
      const points = [...allKeys]
        .filter((key) => pointOnSegment(keyToPoint(key), wireItem.a, wireItem.b))
        .sort((left, right) => {
          const lp = keyToPoint(left);
          const rp = keyToPoint(right);
          const dx = wireItem.b.x - wireItem.a.x;
          const dy = wireItem.b.y - wireItem.a.y;
          return ((lp.x - wireItem.a.x) * dx + (lp.y - wireItem.a.y) * dy)
            - ((rp.x - wireItem.a.x) * dx + (rp.y - wireItem.a.y) * dy);
        });

      for (let index = 1; index < points.length; index += 1) {
        addEdge(points[index - 1], points[index]);
      }
    });

    return { nodes, edges: adjacency };
  }

  function shortestWirePath(graph, start, end) {
    if (!graph.nodes.has(start) || !graph.nodes.has(end)) return null;
    const distances = new Map([[start, 0]]);
    const previous = new Map();
    const queue = new Set(graph.nodes);

    while (queue.size) {
      let current = null;
      let best = Infinity;
      queue.forEach((key) => {
        const value = distances.get(key) ?? Infinity;
        if (value < best) {
          best = value;
          current = key;
        }
      });

      if (current === null || best === Infinity) break;
      queue.delete(current);
      if (current === end) break;

      (graph.edges.get(current) || []).forEach((edge) => {
        if (!queue.has(edge.to)) return;
        const next = best + edge.weight;
        if (next < (distances.get(edge.to) ?? Infinity)) {
          distances.set(edge.to, next);
          previous.set(edge.to, current);
        }
      });
    }

    if (!distances.has(end)) return null;
    const nodes = [];
    let cursor = end;
    while (cursor) {
      nodes.unshift(cursor);
      if (cursor === start) break;
      cursor = previous.get(cursor);
    }
    if (nodes[0] !== start) return null;
    return { nodes, distance: distances.get(end) };
  }

  function addPathFlow(netSegments, path, amount) {
    for (let index = 1; index < path.length; index += 1) {
      const from = path[index - 1];
      const to = path[index];
      const ordered = [from, to].sort();
      const key = `${ordered[0]}|${ordered[1]}`;
      const sign = from === ordered[0] ? 1 : -1;
      netSegments.set(key, (netSegments.get(key) || 0) + sign * amount);
    }
  }

  function appendFlowLine(layer, segment, className) {
    const magnitude = Math.abs(segment.current || 0);
    const width = clamp(2.6 + Math.log10(1 + magnitude * 8000), 2.8, 8.5);
    const speed = clamp(1.25 - Math.log10(1 + magnitude * 12000) * 0.18, 0.42, 1.2);
    const dashOffset = -((state.sim.time / speed) * 64) % 64;
    const attrs = {
      x1: segment.a.x,
      y1: segment.a.y,
      x2: segment.b.x,
      y2: segment.b.y,
      class: `${className} flow-line`,
      style: `--flow-width:${width.toFixed(2)};--flow-speed:${speed.toFixed(2)}s;stroke-dashoffset:${dashOffset.toFixed(2)}`
    };
    layer.appendChild(svgEl("line", { ...attrs, class: `${className} flow-line flow-glow` }));
    layer.appendChild(svgEl("line", attrs));
  }

  function isVisibleCurrent(current) {
    return Number.isFinite(Number(current)) && Math.abs(Number(current)) > 1e-9;
  }

  function renderProperties() {
    if (!state.selection) {
      els.propertiesContent.innerHTML = `
        <div class="empty-state">
          <div>未选中对象。<br>从左侧选择元件放置，或用导线工具连接引脚。</div>
        </div>
      `;
      return;
    }

    if (state.selection.kind === "wire") {
      const wireItem = state.wires.find((item) => item.id === state.selection.id);
      if (!wireItem) return;
      els.propertiesContent.innerHTML = `
        <div class="inspector-card">
          <h3 class="inspector-title">导线 ${escapeHtml(wireItem.id)}</h3>
          <div class="form-grid">
            <label>起点 X<input data-wire-field="a.x" type="number" value="${wireItem.a.x}"></label>
            <label>起点 Y<input data-wire-field="a.y" type="number" value="${wireItem.a.y}"></label>
            <label>终点 X<input data-wire-field="b.x" type="number" value="${wireItem.b.x}"></label>
            <label>终点 Y<input data-wire-field="b.y" type="number" value="${wireItem.b.y}"></label>
          </div>
          <div class="mini-actions">
            <button class="secondary-button" id="snap-wire" type="button">吸附网格</button>
            <button class="secondary-button" id="remove-wire" type="button">删除</button>
          </div>
        </div>
      `;
      els.propertiesContent.querySelectorAll("[data-wire-field]").forEach((input) => {
        input.addEventListener("change", () => {
          setNestedWireField(wireItem, input.dataset.wireField, snap(Number(input.value) || 0));
          resetSimulation(false);
          scheduleAutosave();
          commitHistory();
          renderAll();
        });
      });
      $("#snap-wire")?.addEventListener("click", () => {
        wireItem.a = snapPoint(wireItem.a);
        wireItem.b = snapPoint(wireItem.b);
        resetSimulation(false);
        scheduleAutosave();
        commitHistory();
        renderAll();
      });
      $("#remove-wire")?.addEventListener("click", deleteSelection);
      return;
    }

    const component = getComponent(state.selection.id);
    if (!component) return;
    const def = COMPONENTS[component.type];
    const measurement = state.sim.lastResult?.measurements.get(component.id);
    const valueControl = component.type !== "ground" && component.type !== "probe" && component.type !== "switch" && component.type !== "voltmeter" && component.type !== "ammeter"
      ? `<label>数值 ${escapeHtml(def.unit)}<input data-component-field="value" type="number" step="any" value="${Number(component.value) || 0}"></label>`
      : "";
    const sourceControls = ["vsource", "isource"].includes(component.type) ? sourcePropertiesHtml(component) : "";
    const switchControls = component.type === "switch" ? switchPropertiesHtml(component) : "";
    const diodeControls = ["diode", "led"].includes(component.type) ? diodePropertiesHtml(component) : "";

    els.propertiesContent.innerHTML = `
      <div class="inspector-card">
        <h3 class="inspector-title">${escapeHtml(def.name)} ${escapeHtml(component.label)}</h3>
        <div class="form-grid">
          <label>标签<input data-component-field="label" type="text" value="${escapeHtml(component.label)}"></label>
          <label>X<input data-component-field="x" type="number" value="${component.x}"></label>
          <label>Y<input data-component-field="y" type="number" value="${component.y}"></label>
          <label>角度
            <select data-component-field="rotation">
              ${[0, 90, 180, 270].map((angle) => `<option value="${angle}" ${normalizeRotation(component.rotation) === angle ? "selected" : ""}>${angle}°</option>`).join("")}
            </select>
          </label>
          ${valueControl}
          ${sourceControls}
          ${switchControls}
          ${diodeControls}
        </div>
      </div>
      <div class="inspector-card">
        <h3 class="inspector-title">实时读数</h3>
        <div class="meter-summary">
          <div class="meter"><div class="meter-label">电压</div><div class="meter-value">${formatVoltage(measurement?.voltage || 0)}</div></div>
          <div class="meter"><div class="meter-label">电流</div><div class="meter-value">${formatCurrent(measurement?.current || 0)}</div></div>
          <div class="meter"><div class="meter-label">功率</div><div class="meter-value">${formatPower(measurement?.power || 0)}</div></div>
          <div class="meter"><div class="meter-label">类型</div><div class="meter-value">${escapeHtml(def.name)}</div></div>
        </div>
        <div class="mini-actions">
          <button class="secondary-button" id="duplicate-current" type="button">复制</button>
          <button class="secondary-button" id="remove-current" type="button">删除</button>
        </div>
      </div>
    `;

    els.propertiesContent.querySelectorAll("[data-component-field]").forEach((input) => {
      input.addEventListener("change", () => {
        applyComponentField(component, input.dataset.componentField, input);
        resetSimulation(false);
        scheduleAutosave();
        commitHistory();
        renderAll();
      });
    });
    $("#duplicate-current")?.addEventListener("click", duplicateSelection);
    $("#remove-current")?.addEventListener("click", deleteSelection);
  }

  function sourcePropertiesHtml(component) {
    return `
      <label>波形
        <select data-component-field="waveform">
          ${["dc", "sine", "square", "triangle"].map((waveform) => `<option value="${waveform}" ${component.waveform === waveform ? "selected" : ""}>${waveformLabel(waveform)}</option>`).join("")}
        </select>
      </label>
      <label>幅度<input data-component-field="amplitude" type="number" step="any" value="${Number(component.amplitude) || Number(component.value) || 0}"></label>
      <label>偏置<input data-component-field="offset" type="number" step="any" value="${Number(component.offset) || 0}"></label>
      <label>频率 Hz<input data-component-field="frequency" type="number" step="any" min="0" value="${Number(component.frequency) || 1}"></label>
      <label>占空比<input data-component-field="duty" type="number" step="0.05" min="0.01" max="0.99" value="${Number(component.duty) || 0.5}"></label>
    `;
  }

  function switchPropertiesHtml(component) {
    return `
      <label class="check-row"><input data-component-field="closed" type="checkbox" ${component.closed ? "checked" : ""}>闭合</label>
      <label>闭合电阻 Ω<input data-component-field="onResistance" type="number" step="any" value="${Number(component.onResistance) || 0.05}"></label>
      <label>断开电阻 Ω<input data-component-field="offResistance" type="number" step="any" value="${Number(component.offResistance) || 1e9}"></label>
    `;
  }

  function diodePropertiesHtml(component) {
    return `
      <label>导通压降 V<input data-component-field="threshold" type="number" step="any" value="${getDiodeThreshold(component)}"></label>
      <label>导通电阻 Ω<input data-component-field="ron" type="number" step="any" value="${Number(component.ron) || (component.type === "led" ? 20 : 8)}"></label>
      <label>截止电阻 Ω<input data-component-field="roff" type="number" step="any" value="${Number(component.roff) || 1e9}"></label>
    `;
  }

  function applyComponentField(component, field, input) {
    if (field === "label" || field === "waveform") {
      component[field] = input.value.trim() || component[field];
      return;
    }
    if (field === "closed") {
      component.closed = input.checked;
      return;
    }
    const numeric = Number(input.value);
    if (field === "rotation") {
      component.rotation = normalizeRotation(numeric || 0);
    } else if (field === "x" || field === "y") {
      component[field] = clamp(snap(numeric || 0), 0, field === "x" ? VIEW_WIDTH : VIEW_HEIGHT);
    } else if (field === "duty") {
      component.duty = clamp(numeric || 0.5, 0.01, 0.99);
    } else {
      component[field] = Number.isFinite(numeric) ? numeric : component[field];
    }
  }

  function setNestedWireField(wireItem, field, value) {
    const [side, axis] = field.split(".");
    wireItem[side][axis] = value;
  }

  function renderMeasurements() {
    const result = state.sim.lastResult;
    const measurements = result?.measurements || new Map();
    const warnings = state.sim.warnings || [];

    els.warningList.innerHTML = warnings.length
      ? warnings.map((warning) => `<div class="warning-item ${warning.type === "error" ? "error" : ""}">${escapeHtml(warning.text)}</div>`).join("")
      : `<div class="warning-item">仿真正常。当前求解器适合低频集总参数电路，二极管采用分段线性模型。</div>`;

    const nodeCount = result?.connectivity.nodeIndex.size || 0;
    const groundCount = result?.connectivity.groundRoots.size || 0;
    const totalPower = [...measurements.values()].reduce((sum, item) => sum + item.power, 0);
    const scopeLabel = state.sim.scope.at(-1)?.label || "无信号";

    els.meterSummary.innerHTML = `
      <div class="meter"><div class="meter-label">节点</div><div class="meter-value">${nodeCount + groundCount}</div></div>
      <div class="meter"><div class="meter-label">元件</div><div class="meter-value">${state.components.length}</div></div>
      <div class="meter"><div class="meter-label">净功率</div><div class="meter-value">${formatPower(totalPower)}</div></div>
      <div class="meter"><div class="meter-label">示波器</div><div class="meter-value">${escapeHtml(scopeLabel)}</div></div>
    `;

    els.measurementBody.innerHTML = state.components.map((component) => {
      const item = measurements.get(component.id);
      return `
        <tr>
          <td>${escapeHtml(component.label)}</td>
          <td>${formatVoltage(item?.voltage || 0)}</td>
          <td>${formatCurrent(item?.current || 0)}</td>
          <td>${formatPower(item?.power || 0)}</td>
        </tr>
      `;
    }).join("");

    drawScope();
  }

  function renderCanvasHud() {
    if (!els.canvasHud) return;

    if (!state.components.length) {
      els.canvasHud.innerHTML = `
        <div class="hud-panel empty">
          <div class="hud-title">空白电路</div>
          <div class="hud-line">先载入左侧演示，或放置电源、电阻和地。</div>
        </div>
      `;
      return;
    }

    const result = state.sim.lastResult;
    const measurements = result?.measurements || new Map();
    const currents = [...measurements.values()].map((item) => Math.abs(item.current || 0));
    const maxCurrent = currents.length ? Math.max(...currents) : 0;
    const flowSegments = buildWireFlowSegments().length + countComponentFlowSegments();
    const nodeCount = result ? result.nodeVoltages.size : 0;
    const toolText = toolLabel();
    const health = result?.ok ? (flowSegments > 0 ? "有电流" : "待通路") : "检查电路";

    els.canvasHud.innerHTML = `
      <div class="hud-panel">
        <div class="hud-title">${escapeHtml(health)}</div>
        <div class="hud-grid">
          <span>流动段</span><strong>${flowSegments}</strong>
          <span>峰值电流</span><strong>${formatCurrent(maxCurrent)}</strong>
          <span>节点</span><strong>${nodeCount}</strong>
          <span>工具</span><strong>${escapeHtml(toolText)}</strong>
        </div>
      </div>
    `;
  }

  function countComponentFlowSegments() {
    const result = state.sim.lastResult;
    if (!result?.ok) return 0;
    return state.components.filter((component) => {
      if (getPins(component).length < 2) return false;
      const current = result.measurements.get(component.id)?.current || 0;
      return isVisibleCurrent(current);
    }).length;
  }

  function toolLabel() {
    if (state.tool === "wire") return state.wireStart ? "布线中" : "导线";
    if (state.tool === "place" && state.placingType) return COMPONENTS[state.placingType]?.name || "放置";
    return "选择";
  }

  function drawScope() {
    const canvas = els.scopeCanvas;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#111816";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += width / 8) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += height / 5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const samples = state.sim.scope;
    if (samples.length < 2) {
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.font = "13px Microsoft YaHei, Arial";
      ctx.fillText("等待仿真数据", 14, 26);
      return;
    }

    const values = samples.map((sample) => sample.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (Math.abs(max - min) < 1e-9) {
      min -= 1;
      max += 1;
    }
    const pad = (max - min) * 0.12;
    min -= pad;
    max += pad;

    const mapX = (index) => (index / (samples.length - 1)) * width;
    const mapY = (value) => height - ((value - min) / (max - min)) * height;

    ctx.strokeStyle = "#48d6bd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    samples.forEach((sample, index) => {
      const x = mapX(index);
      const y = mapY(sample.value);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "12px Microsoft YaHei, Arial";
    ctx.fillText(`${samples.at(-1).label}: ${formatVoltage(samples.at(-1).value)}`, 12, 20);
    ctx.fillText(`${formatVoltage(max)} / ${formatVoltage(min)}`, 12, height - 12);
  }

  function updateSimulationStatus() {
    const hasError = state.sim.warnings?.some((warning) => warning.type === "error");
    els.simStatus.classList.toggle("paused", !state.sim.running && !hasError);
    els.simStatus.classList.toggle("error", Boolean(hasError));
    els.simStatus.textContent = hasError ? "错误" : state.sim.running ? "运行中" : "已暂停";
    els.runToggle.textContent = state.sim.running ? "暂停" : "运行";
    els.canvasMeta.textContent = `t = ${state.sim.time.toFixed(3)} s`;
  }

  function updateSelectionText() {
    if (!state.selection) {
      els.selectionText.textContent = "未选中";
      return;
    }
    if (state.selection.kind === "wire") {
      els.selectionText.textContent = `导线 ${state.selection.id}`;
      return;
    }
    const component = getComponent(state.selection.id);
    els.selectionText.textContent = component ? `${COMPONENTS[component.type].name} ${component.label}` : "未选中";
  }

  function setStatus(text) {
    els.statusText.textContent = text;
  }

  function syncSettingsToInputs() {
    els.settingDt.value = state.settings.dt;
    els.settingSpeed.value = state.settings.speed;
    els.settingSamples.value = state.settings.samples;
    els.settingAutosave.checked = state.settings.autosave;
  }

  function createComponent(type, x, y) {
    return normalizeComponent({
      id: uniqueId(COMPONENTS[type].prefix),
      type,
      x,
      y,
      rotation: 0,
      label: nextLabel(type),
      value: COMPONENTS[type].defaultValue,
      state: {}
    });
  }

  function normalizeComponent(raw) {
    const type = COMPONENTS[raw.type] ? raw.type : "resistor";
    const base = {
      id: raw.id || uniqueId(COMPONENTS[type].prefix),
      type,
      x: snap(Number(raw.x) || VIEW_WIDTH / 2),
      y: snap(Number(raw.y) || VIEW_HEIGHT / 2),
      rotation: normalizeRotation(Number(raw.rotation) || 0),
      label: raw.label || nextLabel(type),
      value: Number(raw.value),
      state: {}
    };
    if (!Number.isFinite(base.value)) base.value = COMPONENTS[type].defaultValue;

    if (type === "vsource" || type === "isource") {
      base.waveform = raw.waveform || "dc";
      base.amplitude = Number.isFinite(Number(raw.amplitude)) ? Number(raw.amplitude) : Math.abs(base.value || 1);
      base.offset = Number.isFinite(Number(raw.offset)) ? Number(raw.offset) : 0;
      base.frequency = Number.isFinite(Number(raw.frequency)) ? Number(raw.frequency) : 1;
      base.duty = clamp(Number.isFinite(Number(raw.duty)) ? Number(raw.duty) : 0.5, 0.01, 0.99);
    }
    if (type === "switch") {
      base.closed = raw.closed !== false;
      base.onResistance = Number.isFinite(Number(raw.onResistance)) ? Number(raw.onResistance) : 0.05;
      base.offResistance = Number.isFinite(Number(raw.offResistance)) ? Number(raw.offResistance) : 1e9;
    }
    if (type === "diode" || type === "led") {
      base.threshold = Number.isFinite(Number(raw.threshold)) ? Number(raw.threshold) : (type === "led" ? 2 : 0.7);
      base.ron = Number.isFinite(Number(raw.ron)) ? Number(raw.ron) : (type === "led" ? 20 : 8);
      base.roff = Number.isFinite(Number(raw.roff)) ? Number(raw.roff) : 1e9;
    }

    return base;
  }

  function normalizeCircuit(raw) {
    const input = raw && typeof raw === "object" ? raw : {};
    const usedIds = new Set();
    const components = Array.isArray(input.components) ? input.components.map((item) => {
      const component = normalizeComponent(item);
      while (usedIds.has(component.id)) component.id = uniqueId(COMPONENTS[component.type].prefix);
      usedIds.add(component.id);
      return component;
    }) : [];

    const usedWireIds = new Set();
    const wires = Array.isArray(input.wires) ? input.wires.map((item, index) => {
      let id = item.id || `W${index + 1}`;
      if (usedWireIds.has(id)) id = nextLocalId("W", usedWireIds);
      usedWireIds.add(id);
      return {
        id,
        a: snapPoint(item.a || { x: 0, y: 0 }),
        b: snapPoint(item.b || { x: GRID, y: 0 })
      };
    }).filter((item) => distance(item.a, item.b) > 0) : [];

    return {
      components,
      wires,
      settings: input.settings && typeof input.settings === "object" ? input.settings : {}
    };
  }

  function comp(type, x, y, rotation, extra = {}) {
    return normalizeComponent({ type, x, y, rotation, ...extra });
  }

  function wire(x1, y1, x2, y2) {
    return {
      id: uniqueId("W"),
      a: { x: x1, y: y1 },
      b: { x: x2, y: y2 }
    };
  }

  function shiftCircuit(circuit, dx, dy) {
    return {
      ...circuit,
      components: circuit.components.map((component) => ({
        ...component,
        x: component.x + dx,
        y: component.y + dy
      })),
      wires: circuit.wires.map((wireItem) => ({
        ...wireItem,
        a: { x: wireItem.a.x + dx, y: wireItem.a.y + dy },
        b: { x: wireItem.b.x + dx, y: wireItem.b.y + dy }
      }))
    };
  }

  function getComponent(id) {
    return state.components.find((component) => component.id === id);
  }

  function getPins(component) {
    return COMPONENTS[component.type]?.pins || TWO_PIN;
  }

  function getPinWorldPoints(component) {
    return getPins(component).map((pin) => {
      const rotated = rotatePoint(pin, component.rotation || 0);
      return {
        x: Math.round(component.x + rotated.x),
        y: Math.round(component.y + rotated.y)
      };
    });
  }

  function getPinWorldPoint(componentId, pinIndex) {
    const component = getComponent(componentId);
    if (!component) return { x: 0, y: 0 };
    return getPinWorldPoints(component)[pinIndex] || { x: component.x, y: component.y };
  }

  function getComponentNodes(component, connectivity) {
    return getPins(component).map((_, index) => connectivity.pinRoots.get(`${component.id}:${index}`));
  }

  function measurementPinPair(component) {
    if (component.type === "potentiometer") return [0, 2];
    if (component.type === "vcvs" || component.type === "vccs") return [2, 3];
    return [0, 1];
  }

  function getBranchNodePair(component, nodes) {
    if (component.type === "vcvs") return [nodes[2], nodes[3]];
    return [nodes[0], nodes[1]];
  }

  function potentiometerParts(component) {
    const total = Math.max(Number(component.value) || COMPONENTS.potentiometer.defaultValue, 1e-6);
    const wiper = clamp(Number.isFinite(Number(component.wiper)) ? Number(component.wiper) : 0.5, 0.001, 0.999);
    return {
      total,
      wiper,
      r1: Math.max(total * wiper, 1e-6),
      r2: Math.max(total * (1 - wiper), 1e-6)
    };
  }

  function controlledSourceCurrent(component, connectivity, solution) {
    const vc = getPinVoltageFromSolution(component, 0, connectivity, solution)
      - getPinVoltageFromSolution(component, 1, connectivity, solution);
    return finiteOrZero(component.gain) * vc;
  }

  function getComponentVoltage(component, result) {
    if (!result) return 0;
    if (getPins(component).length < 2) return getPinVoltage(component, 0, result);
    const [positive, negative] = measurementPinPair(component);
    return getPinVoltage(component, positive, result) - getPinVoltage(component, negative, result);
  }

  function getPinVoltage(component, pinIndex, result) {
    if (!result) return 0;
    const root = result.connectivity.pinRoots.get(`${component.id}:${pinIndex}`);
    if (!root) return 0;
    return result.nodeVoltages.get(root) || 0;
  }

  function readComponentVoltageFromSolution(component, connectivity, solution) {
    const [positive, negative] = measurementPinPair(component);
    return getPinVoltageFromSolution(component, positive, connectivity, solution) - getPinVoltageFromSolution(component, negative, connectivity, solution);
  }

  function getPinVoltageFromSolution(component, pinIndex, connectivity, solution) {
    const root = connectivity.pinRoots.get(`${component.id}:${pinIndex}`);
    if (!root || connectivity.groundRoots.has(root)) return 0;
    const index = connectivity.nodeIndex.get(root);
    return index === undefined ? 0 : finiteOrZero(solution[index]);
  }

  function makeNodeVoltageMap(connectivity, solution) {
    const map = new Map();
    connectivity.groundRoots.forEach((root) => map.set(root, 0));
    connectivity.nodeIndex.forEach((index, root) => {
      map.set(root, finiteOrZero(solution[index]));
    });
    return map;
  }

  function sourceSignal(component, time) {
    const waveform = component.waveform || "dc";
    const base = Number(component.value) || 0;
    const amplitude = Number(component.amplitude) || base || 0;
    const offset = Number(component.offset) || 0;
    const frequency = Math.max(Number(component.frequency) || 0, 0);
    const phase = frequency > 0 ? (time * frequency) % 1 : 0;

    if (waveform === "sine") {
      return offset + amplitude * Math.sin(2 * Math.PI * frequency * time);
    }
    if (waveform === "square") {
      return offset + (phase < (Number(component.duty) || 0.5) ? amplitude : 0);
    }
    if (waveform === "triangle") {
      const triangle = phase < 0.5 ? phase * 4 - 1 : 3 - phase * 4;
      return offset + amplitude * triangle;
    }
    return base;
  }

  function diodeCurrent(component, voltage) {
    const threshold = getDiodeThreshold(component);
    const ron = Math.max(Number(component.ron) || (component.type === "led" ? 20 : 8), 1e-6);
    const roff = Math.max(Number(component.roff) || 1e9, 1);
    return voltage > threshold ? (voltage - threshold) / ron : voltage / roff;
  }

  function getDiodeThreshold(component) {
    return Number.isFinite(Number(component.threshold)) ? Number(component.threshold) : (component.type === "led" ? 2 : 0.7);
  }

  function componentReading(component) {
    const measurement = state.sim.lastResult?.measurements.get(component.id);
    if (!measurement) return "";
    if (component.type === "probe") return formatVoltage(measurement.voltage);
    if (component.type === "voltmeter") return formatVoltage(measurement.voltage);
    if (component.type === "ammeter") return formatCurrent(measurement.current);
    if (component.type === "vsource") return formatCurrent(measurement.current);
    if (component.type === "led" || component.type === "lamp") return formatPower(Math.abs(measurement.power));
    return `${formatVoltage(measurement.voltage)} ${formatCurrent(measurement.current)}`;
  }

  function ledBrightness(component) {
    const current = Math.abs(state.sim.lastResult?.measurements.get(component.id)?.current || 0);
    return clamp(current / 0.018, 0, 1);
  }

  function lampBrightness(component) {
    const power = Math.abs(state.sim.lastResult?.measurements.get(component.id)?.power || 0);
    return clamp(power / 1.2, 0, 1);
  }

  function onCanvasWheel(event) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    zoomCanvas(event.deltaY < 0 ? 0.85 : 1.18, getCanvasPoint(event));
  }

  function zoomCanvas(factor, anchor = null) {
    const current = state.viewport;
    const focus = anchor || {
      x: current.x + current.width / 2,
      y: current.y + current.height / 2
    };
    const nextWidth = current.width * factor;
    const nextHeight = current.height * factor;
    const scaleX = nextWidth / current.width;
    const scaleY = nextHeight / current.height;

    setViewBox({
      x: focus.x - (focus.x - current.x) * scaleX,
      y: focus.y - (focus.y - current.y) * scaleY,
      width: nextWidth,
      height: nextHeight
    });
  }

  function fitViewToCircuit() {
    const bounds = getCircuitBounds();
    if (!bounds) {
      setViewBox({ x: 0, y: 0, width: VIEW_WIDTH, height: VIEW_HEIGHT });
      setStatus("已显示完整画布。");
      return;
    }

    const padding = 92;
    let x = clamp(bounds.minX - padding, 0, VIEW_WIDTH);
    let y = clamp(bounds.minY - padding, 0, VIEW_HEIGHT);
    let width = clamp((bounds.maxX - bounds.minX) + padding * 2, 220, VIEW_WIDTH);
    let height = clamp((bounds.maxY - bounds.minY) + padding * 2, 160, VIEW_HEIGHT);
    const rect = els.canvas.getBoundingClientRect();
    const aspect = rect.width > 0 && rect.height > 0 ? rect.width / rect.height : VIEW_WIDTH / VIEW_HEIGHT;
    const currentAspect = width / height;

    if (currentAspect > aspect) {
      const targetHeight = width / aspect;
      y -= (targetHeight - height) / 2;
      height = targetHeight;
    } else {
      const targetWidth = height * aspect;
      x -= (targetWidth - width) / 2;
      width = targetWidth;
    }

    setViewBox({ x, y, width, height });
    setStatus("已适配当前电路。");
  }

  function getCircuitBounds() {
    const points = [];
    state.components.forEach((component) => {
      points.push(
        { x: component.x - 110, y: component.y - 92 },
        { x: component.x + 110, y: component.y + 92 },
        ...getPinWorldPoints(component)
      );
    });
    state.wires.forEach((wireItem) => {
      points.push(wireItem.a, wireItem.b);
    });
    if (!points.length) return null;

    return {
      minX: Math.min(...points.map((point) => point.x)),
      minY: Math.min(...points.map((point) => point.y)),
      maxX: Math.max(...points.map((point) => point.x)),
      maxY: Math.max(...points.map((point) => point.y))
    };
  }

  function setViewBox(viewBox) {
    const next = constrainViewBox(viewBox);
    state.viewport = next;
    els.canvas.setAttribute("viewBox", `${trimNumber(next.x)} ${trimNumber(next.y)} ${trimNumber(next.width)} ${trimNumber(next.height)}`);
    updateSimulationStatus();
  }

  function constrainViewBox(viewBox) {
    const width = clamp(Number(viewBox.width) || VIEW_WIDTH, 180, VIEW_WIDTH);
    const height = clamp(Number(viewBox.height) || VIEW_HEIGHT, 120, VIEW_HEIGHT);
    const maxX = Math.max(0, VIEW_WIDTH - width);
    const maxY = Math.max(0, VIEW_HEIGHT - height);
    return {
      x: clamp(Number(viewBox.x) || 0, 0, maxX),
      y: clamp(Number(viewBox.y) || 0, 0, maxY),
      width,
      height
    };
  }

  function getCanvasPoint(event) {
    const point = els.canvas.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(els.canvas.getScreenCTM().inverse());
    return { x: transformed.x, y: transformed.y };
  }

  function snap(value) {
    return Math.round(value / GRID) * GRID;
  }

  function snapPoint(point) {
    return {
      x: clamp(snap(Number(point.x) || 0), 0, VIEW_WIDTH),
      y: clamp(snap(Number(point.y) || 0), 0, VIEW_HEIGHT)
    };
  }

  function wireSegmentsFrom(start, end, straight = false) {
    const a = snapPoint(start);
    const b = snapPoint(end);
    if (straight || !state.settings.orthogonalWire || a.x === b.x || a.y === b.y) {
      return [{ a, b }];
    }

    const horizontalFirst = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
    const elbow = horizontalFirst ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
    return [
      { a, b: elbow },
      { a: elbow, b }
    ];
  }

  function pointKey(point) {
    const snapped = snapPoint(point);
    return `${snapped.x},${snapped.y}`;
  }

  function keyToPoint(key) {
    const [x, y] = key.split(",").map(Number);
    return { x, y };
  }

  function pointOnSegment(point, a, b) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = point.x - a.x;
    const apy = point.y - a.y;
    const lengthSq = abx * abx + aby * aby;
    if (lengthSq < 1e-9) return distance(point, a) < 1;
    const cross = Math.abs(apx * aby - apy * abx);
    if (cross > 0.01 * Math.sqrt(lengthSq)) return false;
    const dot = apx * abx + apy * aby;
    return dot >= -0.01 && dot <= lengthSq + 0.01;
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function rotatePoint(point, rotation) {
    const angle = normalizeRotation(rotation);
    if (angle === 90) return { x: -point.y, y: point.x };
    if (angle === 180) return { x: -point.x, y: -point.y };
    if (angle === 270) return { x: point.y, y: -point.x };
    return { x: point.x, y: point.y };
  }

  function normalizeRotation(rotation) {
    return ((Math.round(rotation / 90) * 90) % 360 + 360) % 360;
  }

  function formatPoint(point) {
    return `${point.x}, ${point.y}`;
  }

  function uniqueId(prefix) {
    const safePrefix = String(prefix || "ID").replace(/[^a-zA-Z0-9]/g, "") || "ID";
    let index = 1;
    const exists = (id) => state.components.some((component) => component.id === id) || state.wires.some((wireItem) => wireItem.id === id);
    while (exists(`${safePrefix}${index}`)) index += 1;
    return `${safePrefix}${index}`;
  }

  function nextLocalId(prefix, usedIds) {
    let index = 1;
    while (usedIds.has(`${prefix}${index}`)) index += 1;
    return `${prefix}${index}`;
  }

  function nextLabel(type) {
    const prefix = COMPONENTS[type]?.prefix || "X";
    let index = 1;
    const exists = (label) => state.components.some((component) => component.label === label);
    while (exists(`${prefix}${index}`)) index += 1;
    return `${prefix}${index}`;
  }

  function formatVoltage(value) {
    return `${formatSi(value, "V")}`;
  }

  function formatCurrent(value) {
    return `${formatSi(value, "A")}`;
  }

  function formatPower(value) {
    return `${formatSi(value, "W")}`;
  }

  function formatSi(value, unit) {
    const number = finiteOrZero(value);
    const abs = Math.abs(number);
    if (abs >= 1e6) return `${trimNumber(number / 1e6)} M${unit}`;
    if (abs >= 1e3) return `${trimNumber(number / 1e3)} k${unit}`;
    if (abs >= 1) return `${trimNumber(number)} ${unit}`;
    if (abs >= 1e-3) return `${trimNumber(number * 1e3)} m${unit}`;
    if (abs >= 1e-6) return `${trimNumber(number * 1e6)} μ${unit}`;
    if (abs >= 1e-9) return `${trimNumber(number * 1e9)} n${unit}`;
    return `0 ${unit}`;
  }

  function trimNumber(value) {
    if (Math.abs(value) >= 100) return value.toFixed(1).replace(/\.0$/, "");
    if (Math.abs(value) >= 10) return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  }

  function waveformLabel(waveform) {
    return {
      dc: "直流",
      sine: "正弦",
      square: "方波",
      triangle: "三角"
    }[waveform] || waveform;
  }

  function finiteOrZero(value) {
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function svgEl(tag, attrs = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      element.setAttribute(key, String(value));
    });
    return element;
  }

  function svgPath(d, className = "component-body") {
    return svgEl("path", { d, class: className });
  }

  function svgLine(x1, y1, x2, y2, className = "component-body") {
    return svgEl("line", { x1, y1, x2, y2, class: className });
  }

  function svgText(x, y, text, className) {
    const element = svgEl("text", { x, y, class: className });
    element.textContent = text;
    return element;
  }

  function clearSvg(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  }

  window.PzElectronicSimulator = {
    exportCircuit: exportCircuitData,
    loadCircuit,
    resetSimulation,
    solveOnce: () => solveCircuit(state.settings.dt),
    state
  };

  init();
})();
