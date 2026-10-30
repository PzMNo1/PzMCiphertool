import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const VIEW_DIR = new THREE.Vector3(1, -1.35, 0.95).normalize();

export function createIndustrialViewer(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-label', '工业模型三维视口');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.up.set(0, 0, 1);

  const camera = new THREE.PerspectiveCamera(38, 1, 1, 10000);
  camera.up.set(0, 0, 1);
  camera.position.set(260, -330, 240);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.screenSpacePanning = true;
  controls.minDistance = 1;
  controls.maxDistance = 6000;
  controls.autoRotateSpeed = 1.1;

  const hemi = new THREE.HemisphereLight(0xc7ecff, 0x071018, 0.85);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(320, -220, 380);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x40e0ff, 0.95);
  fill.position.set(-320, 260, 140);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x00ff88, 0.6);
  rim.position.set(60, 180, -320);
  scene.add(rim);

  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.82;
    pmrem.dispose();
  } catch (error) {
    scene.environment = null;
  }

  const partRoot = new THREE.Group();
  scene.add(partRoot);

  const partMaterial = new THREE.MeshStandardMaterial({
    color: 0xa9c8d8,
    metalness: 0.68,
    roughness: 0.33,
    envMapIntensity: 0.9,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x8ceeff,
    transparent: true,
    opacity: 0.6,
    depthWrite: false
  });

  let grid = null;
  let boxHelper = null;
  let partMesh = null;
  let partEdges = null;
  let currentBounds = null;
  let resizeObserver = null;
  let frame = 0;
  let visible = false;

  const options = { edges: true, grid: true, bbox: false };

  function disposeObject(object) {
    if (!object) return;
    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(material => {
      if (material && material !== partMaterial && material !== edgeMaterial) material.dispose();
    });
  }

  function rebuildGrid(bounds) {
    if (grid) {
      scene.remove(grid);
      disposeObject(grid);
      grid = null;
    }
    if (!bounds) return;
    const size = new THREE.Vector3().subVectors(bounds.max, bounds.min);
    const maxDim = Math.max(size.x, size.y, size.z, 10);
    const cell = maxDim > 900 ? 100 : maxDim > 450 ? 50 : maxDim > 180 ? 25 : 10;
    const span = Math.max(400, Math.ceil((maxDim * 2.6) / cell) * cell);
    grid = new THREE.GridHelper(span, Math.round(span / cell), 0x2f8496, 0x13313b);
    grid.rotation.x = Math.PI / 2;
    grid.position.set(bounds.min.x / 2 + bounds.max.x / 2, bounds.min.y / 2 + bounds.max.y / 2, 0);
    grid.material.transparent = true;
    grid.material.opacity = 0.5;
    grid.material.depthWrite = false;
    grid.visible = options.grid;
    scene.add(grid);
  }

  function setPart(mesh, edges, bounds, { fit = false } = {}) {
    partRoot.clear();
    disposeObject(partMesh);
    disposeObject(partEdges);
    partMesh = null;
    partEdges = null;

    if (!mesh || !mesh.vertices || !mesh.vertices.length) {
      currentBounds = null;
      return;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(mesh.vertices, 3));
    if (mesh.normals && mesh.normals.length === mesh.vertices.length) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.normals, 3));
    } else {
      geometry.computeVertexNormals();
    }
    geometry.setIndex(mesh.triangles || []);
    geometry.computeBoundingSphere();

    partMesh = new THREE.Mesh(geometry, partMaterial);
    partMesh.frustumCulled = false;
    partRoot.add(partMesh);

    if (edges && edges.lines && edges.lines.length) {
      const edgeGeometry = new THREE.BufferGeometry();
      edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edges.lines, 3));
      partEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      partEdges.frustumCulled = false;
      partEdges.visible = options.edges;
      partRoot.add(partEdges);
    }

    if (bounds) {
      currentBounds = new THREE.Box3(
        new THREE.Vector3(bounds[0][0], bounds[0][1], bounds[0][2]),
        new THREE.Vector3(bounds[1][0], bounds[1][1], bounds[1][2])
      );
      rebuildGrid(currentBounds);
      updateBoxHelper();
      if (fit) fitView();
    }
  }

  function updateBoxHelper() {
    if (boxHelper) {
      scene.remove(boxHelper);
      disposeObject(boxHelper);
      boxHelper = null;
    }
    if (!currentBounds) return;
    boxHelper = new THREE.Box3Helper(currentBounds, 0x40e0ff);
    boxHelper.material.transparent = true;
    boxHelper.material.opacity = 0.32;
    boxHelper.material.depthWrite = false;
    boxHelper.visible = options.bbox;
    scene.add(boxHelper);
  }

  function fitView() {
    if (!currentBounds) return;
    const center = currentBounds.getCenter(new THREE.Vector3());
    const radius = Math.max(currentBounds.getBoundingSphere(new THREE.Sphere()).radius, 1);
    const distance = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.16;
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(VIEW_DIR, distance);
    camera.near = Math.max(0.05, distance / 400);
    camera.far = distance * 40;
    camera.updateProjectionMatrix();
    controls.update();
  }

  function setOption(name, value) {
    if (!(name in options)) return;
    options[name] = value;
    if (name === 'edges' && partEdges) partEdges.visible = value;
    if (name === 'grid' && grid) grid.visible = value;
    if (name === 'bbox' && boxHelper) boxHelper.visible = value;
  }

  function setAutoRotate(value) {
    controls.autoRotate = Boolean(value);
  }

  function resize() {
    const rect = host.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) {
      visible = false;
      return;
    }
    visible = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }

  function tick() {
    frame = requestAnimationFrame(tick);
    if (!visible) return;
    controls.update();
    renderer.render(scene, camera);
  }

  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();
  tick();

  return {
    setPart,
    fitView,
    setOption,
    setAutoRotate,
    resize,
    getBounds: () => currentBounds,
    dispose() {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      disposeObject(partMesh);
      disposeObject(partEdges);
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
