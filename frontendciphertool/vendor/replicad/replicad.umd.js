/*! replicad v1.2.0 | MIT License | https://github.com/sgenoud/replicad | OpenCascade OCCT is loaded separately under LGPL-2.1 */
(function(global, factory) {
	typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.replicad = {}));
})(this, function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: ((k) => from[k]).bind(null, key),
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	//#endregion
	//#region src/oclib.ts
	var OC = { library: null };
	var setOC = (oc) => {
		OC.library = oc;
	};
	var getOC = () => {
		if (!OC.library) throw new Error("oppencascade has not been loaded");
		return OC.library;
	};
	//#endregion
	//#region src/register.ts
	if (!globalThis.FinalizationRegistry) {
		console.log("Garbage collection will not work");
		globalThis.FinalizationRegistry = (() => ({
			register: () => null,
			unregister: () => null
		}));
	}
	var deletetableRegistry = new globalThis.FinalizationRegistry((heldValue) => {
		if (!heldValue) return;
		try {
			heldValue.delete();
		} catch (e) {
			console.error(e);
		}
	});
	var WrappingObj = class {
		constructor(wrapped) {
			this.oc = getOC();
			if (wrapped) deletetableRegistry.register(this, wrapped, wrapped);
			this._wrapped = wrapped;
		}
		get wrapped() {
			if (this._wrapped === null) throw new Error("This object has been deleted");
			return this._wrapped;
		}
		set wrapped(newWrapped) {
			if (this._wrapped) {
				deletetableRegistry.unregister(this._wrapped);
				this._wrapped.delete();
			}
			if (newWrapped) deletetableRegistry.register(this, newWrapped, newWrapped);
			this._wrapped = newWrapped;
		}
		delete() {
			const wrapped = this._wrapped;
			if (wrapped === null) return;
			this._wrapped = null;
			deletetableRegistry.unregister(wrapped);
			wrapped.delete();
		}
	};
	if (typeof Symbol.dispose === "symbol") Object.defineProperty(WrappingObj.prototype, Symbol.dispose, {
		configurable: true,
		writable: true,
		value() {
			this.delete();
		}
	});
	var GCWithScope = () => {
		function gcWithScope(value) {
			if (value) deletetableRegistry.register(gcWithScope, value);
			return value;
		}
		return gcWithScope;
	};
	var GCWithObject = (obj) => {
		function registerForGC(value) {
			if (value) deletetableRegistry.register(obj, value);
			return value;
		}
		return registerForGC;
	};
	var localGC = (debug) => {
		const cleaner = /* @__PURE__ */ new Set();
		return [
			(v) => {
				cleaner.add(v);
				return v;
			},
			() => {
				[...cleaner.values()].forEach((d) => d.delete());
				cleaner.clear();
			},
			debug ? cleaner : void 0
		];
	};
	//#endregion
	//#region src/constants.ts
	var HASH_CODE_MAX = 2147483647;
	var DEG2RAD = Math.PI / 180;
	var RAD2DEG = 180 / Math.PI;
	//#endregion
	//#region src/geom.ts
	var round3 = (v) => Math.round(v * 1e3) / 1e3;
	function isPoint(p) {
		if (Array.isArray(p)) return p.length === 3 || p.length === 2;
		else if (p instanceof Vector) return true;
		else if (p && typeof p?.XYZ === "function") return true;
		return false;
	}
	var makeAx3 = (center, dir, xDir) => {
		const oc = getOC();
		const origin = asPnt(center);
		const direction = asDir(dir);
		let axis;
		if (xDir) {
			const xDirection = asDir(xDir);
			axis = new oc.gp_Ax3(origin, direction, xDirection);
			xDirection.delete();
		} else axis = new oc.gp_Ax3(origin, direction);
		origin.delete();
		direction.delete();
		return axis;
	};
	function makePln(origin, dir) {
		const orig = asPnt(origin);
		const direction = asDir(dir);
		const pln = new (getOC()).gp_Pln(orig, direction);
		orig.delete();
		direction.delete();
		return pln;
	}
	var makeAx2 = (center, dir, xDir) => {
		const oc = getOC();
		const origin = asPnt(center);
		const direction = asDir(dir);
		let axis;
		if (xDir) {
			const xDirection = asDir(xDir);
			axis = new oc.gp_Ax2(origin, direction, xDirection);
			xDirection.delete();
		} else axis = new oc.gp_Ax2(origin, direction);
		origin.delete();
		direction.delete();
		return axis;
	};
	var makeAx1 = (center, dir) => {
		const oc = getOC();
		const origin = asPnt(center);
		const direction = asDir(dir);
		const axis = new oc.gp_Ax1(origin, direction);
		origin.delete();
		direction.delete();
		return axis;
	};
	var makeVec = (vector = [
		0,
		0,
		0
	]) => {
		const oc = getOC();
		if (Array.isArray(vector)) {
			if (vector.length === 3) return new oc.gp_Vec(...vector);
			else if (vector.length === 2) return new oc.gp_Vec(...vector, 0);
		} else if (vector instanceof Vector) return new oc.gp_Vec(vector.wrapped.XYZ());
		else if (vector.XYZ) return new oc.gp_Vec(vector.XYZ());
		return new oc.gp_Vec(0, 0, 0);
	};
	var Vector = class Vector extends WrappingObj {
		constructor(vector = [
			0,
			0,
			0
		]) {
			super(makeVec(vector));
		}
		get repr() {
			return `x: ${round3(this.x)}, y: ${round3(this.y)}, z: ${round3(this.z)}`;
		}
		get x() {
			return this.wrapped.X();
		}
		get y() {
			return this.wrapped.Y();
		}
		get z() {
			return this.wrapped.Z();
		}
		get Length() {
			return this.wrapped.Magnitude();
		}
		toTuple() {
			return [
				this.x,
				this.y,
				this.z
			];
		}
		cross(v) {
			return new Vector(this.wrapped.Crossed(v.wrapped));
		}
		dot(v) {
			return this.wrapped.Dot(v.wrapped);
		}
		sub(v) {
			return new Vector(this.wrapped.Subtracted(v.wrapped));
		}
		add(v) {
			return new Vector(this.wrapped.Added(v.wrapped));
		}
		multiply(scale) {
			return new Vector(this.wrapped.Multiplied(scale));
		}
		normalized() {
			return new Vector(this.wrapped.Normalized());
		}
		normalize() {
			this.wrapped.Normalize();
			return this;
		}
		getCenter() {
			return this;
		}
		getAngle(v) {
			return this.wrapped.Angle(v.wrapped) * RAD2DEG;
		}
		projectToPlane(plane) {
			const base = plane.origin;
			const normal = plane.zDir;
			const v1 = this.sub(base);
			const v2 = normal.multiply(v1.dot(normal) / normal.Length ** 2);
			const projection = this.sub(v2);
			v1.delete();
			v2.delete();
			return projection;
		}
		equals(other) {
			return this.wrapped.IsEqual(other.wrapped, 1e-5, 1e-5);
		}
		toPnt() {
			return new this.oc.gp_Pnt(this.wrapped.XYZ());
		}
		toDir() {
			return new this.oc.gp_Dir(this.wrapped.XYZ());
		}
		rotate(angle, center = [
			0,
			0,
			0
		], direction = [
			0,
			0,
			1
		]) {
			const ax = makeAx1(center, direction);
			this.wrapped.Rotate(ax, angle * DEG2RAD);
			ax.delete();
			return this;
		}
	};
	var AXIS_NAMES = [
		"X",
		"Y",
		"Z",
		"-X",
		"-Y",
		"-Z"
	];
	var DIRECTIONS = {
		X: [
			1,
			0,
			0
		],
		Y: [
			0,
			1,
			0
		],
		Z: [
			0,
			0,
			1
		],
		"-X": [
			-1,
			0,
			0
		],
		"-Y": [
			0,
			-1,
			0
		],
		"-Z": [
			0,
			0,
			-1
		]
	};
	function resolveDirection(direction) {
		if (typeof direction !== "string") return direction;
		const resolved = DIRECTIONS[direction];
		if (!resolved) throw new Error(`Invalid direction "${direction}". Expected one of: ${AXIS_NAMES.join(", ")}.`);
		return resolved;
	}
	var makeDirection = resolveDirection;
	function makeDirVector(direction) {
		return new Vector(resolveDirection(direction));
	}
	function asPnt(coords) {
		const v = new Vector(coords);
		const pnt = v.toPnt();
		v.delete();
		return pnt;
	}
	function asDir(direction) {
		const v = makeDirVector(direction);
		const dir = v.toDir();
		v.delete();
		return dir;
	}
	var Transformation = class Transformation extends WrappingObj {
		constructor(transform) {
			const oc = getOC();
			super(transform || new oc.gp_Trsf());
		}
		clone() {
			const clone = this.wrapped.Inverted();
			clone.Invert();
			return new Transformation(clone);
		}
		translate(xDistOrVector, yDist = 0, zDist = 0) {
			const translation = new Vector(typeof xDistOrVector === "number" ? [
				xDistOrVector,
				yDist,
				zDist
			] : xDistOrVector);
			this.wrapped.SetTranslation(translation.wrapped);
			return this;
		}
		rotate(angle, position = [
			0,
			0,
			0
		], direction = [
			0,
			0,
			1
		]) {
			const dir = asDir(direction);
			const origin = asPnt(position);
			const axis = new this.oc.gp_Ax1(origin, dir);
			this.wrapped.SetRotation(axis, angle * DEG2RAD);
			axis.delete();
			dir.delete();
			origin.delete();
			return this;
		}
		mirror(inputPlane = "YZ", inputOrigin) {
			const r = GCWithScope();
			let origin;
			let direction;
			if (typeof inputPlane === "string") {
				const plane = r(createNamedPlane(inputPlane, inputOrigin));
				origin = plane.origin;
				direction = plane.zDir;
			} else if (inputPlane instanceof Plane) {
				origin = inputOrigin || inputPlane.origin;
				direction = inputPlane.zDir;
			} else {
				origin = inputOrigin || [
					0,
					0,
					0
				];
				direction = inputPlane;
			}
			const mirrorAxis = r(makeAx2(origin, direction));
			this.wrapped.SetMirror(mirrorAxis);
			return this;
		}
		scale(center, scale) {
			const pnt = asPnt(center);
			this.wrapped.SetScale(pnt, scale);
			pnt.delete();
			return this;
		}
		inverse() {
			this.wrapped.Invert();
			return this;
		}
		inverted() {
			return new Transformation(this.wrapped.Inverted());
		}
		coordSystemChange(fromSystem, toSystem) {
			const r = GCWithScope();
			const fromAx = r(fromSystem === "reference" ? new this.oc.gp_Ax3() : makeAx3(fromSystem.origin, fromSystem.zDir, fromSystem.xDir));
			const toAx = r(toSystem === "reference" ? new this.oc.gp_Ax3() : makeAx3(toSystem.origin, toSystem.zDir, toSystem.xDir));
			this.wrapped.SetTransformation(fromAx, toAx);
			return this;
		}
		transformPoint(point) {
			const pnt = asPnt(point);
			const newPoint = pnt.Transformed(this.wrapped);
			pnt.delete();
			return newPoint;
		}
		transform(shape) {
			return new this.oc.BRepBuilderAPI_Transform(shape, this.wrapped, true, false).ModifiedShape(shape);
		}
	};
	var Plane = class Plane {
		constructor(origin, xDirection = null, normal = [
			0,
			0,
			1
		]) {
			this.oc = getOC();
			const zDir = makeDirVector(normal);
			if (zDir.Length === 0) throw new Error("normal should be non null");
			this.zDir = zDir.normalize();
			let xDir;
			if (!xDirection) {
				const ax3 = makeAx3(origin, this.zDir);
				const defaultXDirection = ax3.XDirection();
				xDir = makeDirVector(defaultXDirection);
				defaultXDirection.delete();
				ax3.delete();
			} else xDir = makeDirVector(xDirection);
			if (xDir.Length === 0) throw new Error("xDir should be non null");
			this.xDir = xDir.normalize();
			this.yDir = this.zDir.cross(this.xDir).normalize();
			this.origin = new Vector(origin);
		}
		delete() {
			this.localToGlobal.delete();
			this.xDir.delete();
			this.yDir.delete();
			this.zDir.delete();
			this._origin.delete();
		}
		clone() {
			return new Plane(this.origin, this.xDir, this.zDir);
		}
		get origin() {
			return this._origin;
		}
		set origin(newOrigin) {
			this._origin = newOrigin;
			this._calcTransforms();
		}
		translateTo(point) {
			const newPlane = this.clone();
			newPlane.origin = new Vector(point);
			return newPlane;
		}
		translate(xDistOrVector, yDist = 0, zDist = 0) {
			const translation = new Vector(typeof xDistOrVector === "number" ? [
				xDistOrVector,
				yDist,
				zDist
			] : xDistOrVector);
			return this.translateTo(this.origin.add(translation));
		}
		translateX(xDist) {
			return this.translate(xDist, 0, 0);
		}
		translateY(yDist) {
			return this.translate(0, yDist, 0);
		}
		translateZ(zDist) {
			return this.translate(0, 0, zDist);
		}
		pivot(angle, direction = [
			1,
			0,
			0
		]) {
			const zDir = new Vector(this.zDir).rotate(angle, [
				0,
				0,
				0
			], direction);
			const xDir = new Vector(this.xDir).rotate(angle, [
				0,
				0,
				0
			], direction);
			return new Plane(this.origin, xDir, zDir);
		}
		rotate2DAxes(angle) {
			const xDir = new Vector(this.xDir).rotate(angle, [
				0,
				0,
				0
			], this.zDir);
			return new Plane(this.origin, xDir, this.zDir);
		}
		_calcTransforms() {
			const globalCoordSystem = new this.oc.gp_Ax3();
			const localCoordSystem = makeAx3(this.origin, this.zDir, this.xDir);
			new this.oc.gp_Trsf().SetTransformation(globalCoordSystem, localCoordSystem);
			this.globalToLocal = new Transformation();
			this.globalToLocal.coordSystemChange("reference", {
				origin: this.origin,
				zDir: this.zDir,
				xDir: this.xDir
			});
			this.localToGlobal = new Transformation();
			this.localToGlobal.coordSystemChange({
				origin: this.origin,
				zDir: this.zDir,
				xDir: this.xDir
			}, "reference");
		}
		setOrigin2d(x, y) {
			this.origin = this.toWorldCoords([x, y]);
		}
		toLocalCoords(vec) {
			const pnt = this.globalToLocal.transformPoint(vec);
			const newVec = new Vector(pnt);
			pnt.delete();
			return newVec;
		}
		toWorldCoords(v) {
			const pnt = this.localToGlobal.transformPoint(v);
			const newVec = new Vector(pnt);
			pnt.delete();
			return newVec;
		}
	};
	var PLANES_CONFIG = {
		XY: {
			xDir: [
				1,
				0,
				0
			],
			normal: [
				0,
				0,
				1
			]
		},
		YZ: {
			xDir: [
				0,
				1,
				0
			],
			normal: [
				1,
				0,
				0
			]
		},
		ZX: {
			xDir: [
				0,
				0,
				1
			],
			normal: [
				0,
				1,
				0
			]
		},
		XZ: {
			xDir: [
				1,
				0,
				0
			],
			normal: [
				0,
				-1,
				0
			]
		},
		YX: {
			xDir: [
				0,
				1,
				0
			],
			normal: [
				0,
				0,
				-1
			]
		},
		ZY: {
			xDir: [
				0,
				0,
				1
			],
			normal: [
				-1,
				0,
				0
			]
		},
		front: {
			xDir: [
				1,
				0,
				0
			],
			normal: [
				0,
				0,
				1
			]
		},
		back: {
			xDir: [
				-1,
				0,
				0
			],
			normal: [
				0,
				0,
				-1
			]
		},
		left: {
			xDir: [
				0,
				0,
				1
			],
			normal: [
				-1,
				0,
				0
			]
		},
		right: {
			xDir: [
				0,
				0,
				-1
			],
			normal: [
				1,
				0,
				0
			]
		},
		top: {
			xDir: [
				1,
				0,
				0
			],
			normal: [
				0,
				1,
				0
			]
		},
		bottom: {
			xDir: [
				1,
				0,
				0
			],
			normal: [
				0,
				-1,
				0
			]
		}
	};
	var createNamedPlane = (plane, sourceOrigin = [
		0,
		0,
		0
	]) => {
		const config = PLANES_CONFIG[plane];
		if (!config) throw new Error(`Could not find plane ${plane}`);
		let origin;
		if (typeof sourceOrigin === "number") origin = config.normal.map((v) => v * sourceOrigin);
		else origin = sourceOrigin;
		return new Plane(origin, config.xDir, config.normal);
	};
	var BoundingBox = class BoundingBox extends WrappingObj {
		constructor(wrapped) {
			const oc = getOC();
			let boundBox = wrapped;
			if (!boundBox) boundBox = new oc.Bnd_Box();
			super(boundBox);
		}
		static fromBounds(min, max) {
			const box = new BoundingBox();
			box.wrapped.Update(min[0], min[1], min[2], max[0], max[1], max[2]);
			return box;
		}
		get repr() {
			const [min, max] = this.bounds;
			return `${new Vector(min).repr} - ${new Vector(max).repr}`;
		}
		get bounds() {
			const cornerMin = this.wrapped.CornerMin();
			const cornerMax = this.wrapped.CornerMax();
			const result = [[
				cornerMin.X(),
				cornerMin.Y(),
				cornerMin.Z()
			], [
				cornerMax.X(),
				cornerMax.Y(),
				cornerMax.Z()
			]];
			cornerMin.delete();
			cornerMax.delete();
			return result;
		}
		get center() {
			const [[xmin, ymin, zmin], [xmax, ymax, zmax]] = this.bounds;
			return [
				xmin + (xmax - xmin) / 2,
				ymin + (ymax - ymin) / 2,
				zmin + (zmax - zmin) / 2
			];
		}
		get width() {
			const [[xmin], [xmax]] = this.bounds;
			return Math.abs(xmax - xmin);
		}
		get height() {
			const [[, ymin], [, ymax]] = this.bounds;
			return Math.abs(ymax - ymin);
		}
		get depth() {
			const [[, , zmin], [, , zmax]] = this.bounds;
			return Math.abs(zmax - zmin);
		}
		add(other) {
			this.wrapped.Add(other.wrapped);
		}
		isOut(other) {
			return this.wrapped.IsOut(other.wrapped);
		}
	};
	//#endregion
	//#region src/geomHelpers.ts
	var makePlaneFromFace = (face, originOnSurface = [0, 0]) => {
		const originPoint = face.pointOnSurface(...originOnSurface);
		const normal = face.normalAt(originPoint);
		const v = new Vector([
			0,
			0,
			1
		]);
		let xd = v.cross(normal);
		if (xd.Length < 1e-8) {
			xd.delete();
			xd = new Vector([
				1,
				0,
				0
			]);
		}
		v.delete();
		return new Plane(originPoint, xd, normal);
	};
	function makePlane(plane = "XY", origin = [
		0,
		0,
		0
	]) {
		if (plane instanceof Plane) return plane.clone();
		else return createNamedPlane(plane, origin);
	}
	function rotate(shape, angle, position = [
		0,
		0,
		0
	], direction = [
		0,
		0,
		1
	]) {
		const transformation = new Transformation();
		transformation.rotate(angle, position, direction);
		const newShape = transformation.transform(shape);
		transformation.delete();
		return newShape;
	}
	function translate(shape, vector) {
		const transformation = new Transformation();
		transformation.translate(vector);
		const newShape = transformation.transform(shape);
		transformation.delete();
		return newShape;
	}
	function mirror(shape, inputPlane, origin) {
		const transformation = new Transformation();
		transformation.mirror(inputPlane, origin);
		const newShape = transformation.transform(shape);
		transformation.delete();
		return newShape;
	}
	function scale(shape, center, scale) {
		const transformation = new Transformation();
		transformation.scale(center, scale);
		const newShape = transformation.transform(shape);
		transformation.delete();
		return newShape;
	}
	//#endregion
	//#region src/lib2d/definitions.ts
	function isPoint2D(point) {
		return Array.isArray(point) && point.length === 2;
	}
	//#endregion
	//#region src/definitionMaps.ts
	var CURVE_TYPES_MAP = null;
	var getCurveTypesMap = (refresh) => {
		if (CURVE_TYPES_MAP && !refresh) return CURVE_TYPES_MAP;
		const ga = getOC().GeomAbs_CurveType;
		CURVE_TYPES_MAP = /* @__PURE__ */ new Map([
			[ga.GeomAbs_Line, "LINE"],
			[ga.GeomAbs_Circle, "CIRCLE"],
			[ga.GeomAbs_Ellipse, "ELLIPSE"],
			[ga.GeomAbs_Hyperbola, "HYPERBOLA"],
			[ga.GeomAbs_Parabola, "PARABOLA"],
			[ga.GeomAbs_BezierCurve, "BEZIER_CURVE"],
			[ga.GeomAbs_BSplineCurve, "BSPLINE_CURVE"],
			[ga.GeomAbs_OffsetCurve, "OFFSET_CURVE"],
			[ga.GeomAbs_OtherCurve, "OTHER_CURVE"]
		]);
		return CURVE_TYPES_MAP;
	};
	var findCurveType = (type) => {
		let shapeType = getCurveTypesMap().get(type);
		if (!shapeType) shapeType = getCurveTypesMap(true).get(type);
		if (!shapeType) throw new Error("unknown type");
		return shapeType;
	};
	//#endregion
	//#region src/utils/precisionRound.ts
	function precisionRound(number, precision) {
		const factor = Math.pow(10, precision);
		const n = precision < 0 ? number : .01 / factor + number;
		return Math.round(n * factor) / factor;
	}
	//#endregion
	//#region src/utils/range.ts
	function range(len) {
		return Array.from(Array(len).keys());
	}
	//#endregion
	//#region src/utils/zip.ts
	function zip(arrays) {
		return range(Math.min(...arrays.map((arr) => arr.length))).map((i) => arrays.map((arr) => arr[i]));
	}
	//#endregion
	//#region src/utils/round2.ts
	function round2(v) {
		return Math.round(v * 100) / 100;
	}
	//#endregion
	//#region src/lib2d/utils.ts
	var reprPnt = ([x, y]) => {
		return `(${round2(x)},${round2(y)})`;
	};
	var asFixed = (p, precision = 1e-9) => {
		let num = p;
		if (Math.abs(p) < precision) num = 0;
		return num.toFixed(-Math.log10(precision));
	};
	var removeDuplicatePoints = (points, precision = 1e-9) => {
		return Array.from(new Map(points.map(([p0, p1]) => [`[${asFixed(p0, precision)},${asFixed(p1, precision)}]`, [p0, p1]])).values());
	};
	//#endregion
	//#region src/lib2d/ocWrapper.ts
	var pnt = ([x, y]) => {
		return new (getOC()).gp_Pnt2d(x, y);
	};
	var direction2d = ([x, y]) => {
		return new (getOC()).gp_Dir2d(x, y);
	};
	var vec = ([x, y]) => {
		return new (getOC()).gp_Vec2d(x, y);
	};
	var axis2d = (point, direction) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const axis = new oc.gp_Ax2d(r(pnt(point)), r(direction2d(direction)));
		gc();
		return axis;
	};
	//#endregion
	//#region src/lib2d/BoundingBox2d.ts
	var BoundingBox2d = class extends WrappingObj {
		constructor(wrapped) {
			const oc = getOC();
			let boundBox = wrapped;
			if (!boundBox) boundBox = new oc.Bnd_Box2d();
			super(boundBox);
		}
		get repr() {
			const [min, max] = this.bounds;
			return `${reprPnt(min)} - ${reprPnt(max)}`;
		}
		get bounds() {
			return [[this.wrapped.GetXMin(), this.wrapped.GetYMin()], [this.wrapped.GetXMax(), this.wrapped.GetYMax()]];
		}
		get center() {
			const [[xmin, ymin], [xmax, ymax]] = this.bounds;
			return [xmin + (xmax - xmin) / 2, ymin + (ymax - ymin) / 2];
		}
		get width() {
			const [[xmin], [xmax]] = this.bounds;
			return Math.abs(xmax - xmin);
		}
		get height() {
			const [[, ymin], [, ymax]] = this.bounds;
			return Math.abs(ymax - ymin);
		}
		outsidePoint(paddingPercent = 1) {
			const [min, max] = this.bounds;
			const width = max[0] - min[0];
			const height = max[1] - min[1];
			return [max[0] + width / 100 * paddingPercent, max[1] + height / 100 * paddingPercent * .9];
		}
		add(other) {
			this.wrapped.Add(other.wrapped);
		}
		isOut(other) {
			return this.wrapped.IsOut(other.wrapped);
		}
		containsPoint(other) {
			const point = GCWithScope()(pnt(other));
			return !this.wrapped.IsOut(point);
		}
	};
	//#endregion
	//#region src/lib2d/vectorOperations.ts
	var samePoint$2 = ([x0, y0], [x1, y1], precision = 1e-6) => {
		return Math.abs(x0 - x1) <= precision && Math.abs(y0 - y1) <= precision;
	};
	var add2d = ([x0, y0], [x1, y1]) => {
		return [x0 + x1, y0 + y1];
	};
	var subtract2d = ([x0, y0], [x1, y1]) => {
		return [x0 - x1, y0 - y1];
	};
	var scalarMultiply2d = ([x0, y0], scalar) => {
		return [x0 * scalar, y0 * scalar];
	};
	var distance2d = ([x0, y0], [x1, y1] = [0, 0]) => {
		return Math.sqrt((x0 - x1) ** 2 + (y0 - y1) ** 2);
	};
	var squareDistance2d = ([x0, y0], [x1, y1] = [0, 0]) => {
		return (x0 - x1) ** 2 + (y0 - y1) ** 2;
	};
	function crossProduct2d([x0, y0], [x1, y1]) {
		return x0 * y1 - y0 * x1;
	}
	var angle2d = ([x0, y0], [x1, y1] = [0, 0]) => {
		return Math.atan2(y1 * x0 - y0 * x1, x0 * x1 + y0 * y1);
	};
	var polarAngle2d = ([x0, y0], [x1, y1] = [0, 0]) => {
		return Math.atan2(y1 - y0, x1 - x0);
	};
	var normalize2d = ([x0, y0]) => {
		const l = distance2d([x0, y0]);
		return [x0 / l, y0 / l];
	};
	var rotate2d = (point, angle, center = [0, 0]) => {
		const [px0, py0] = point;
		const [cx, cy] = center;
		const px = px0 - cx;
		const py = py0 - cy;
		const sinA = Math.sin(angle);
		const cosA = Math.cos(angle);
		const xnew = px * cosA - py * sinA;
		const ynew = px * sinA + py * cosA;
		return [xnew + cx, ynew + cy];
	};
	var polarToCartesian = (r, theta) => {
		return [Math.cos(theta) * r, Math.sin(theta) * r];
	};
	var cartesianToPolar = ([x, y]) => {
		return [distance2d([x, y]), Math.atan2(y, x)];
	};
	var determinant2x2 = (matrix) => {
		return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
	};
	//#endregion
	//#region src/lib2d/Curve2D.ts
	function deserializeCurve2D(data) {
		return new Curve2D(getOC().GeomToolsWrapper.Read(data));
	}
	var Curve2D = class Curve2D extends WrappingObj {
		constructor(handle) {
			super(handle);
			this._boundingBox = null;
		}
		get boundingBox() {
			if (this._boundingBox) return this._boundingBox;
			const oc = getOC();
			const boundBox = new oc.Bnd_Box2d();
			oc.BndLib_Add2dCurve.Add(this.wrapped, 1e-6, boundBox);
			this._boundingBox = new BoundingBox2d(boundBox);
			return this._boundingBox;
		}
		get repr() {
			return `${this.geomType} ${reprPnt(this.firstPoint)} - ${reprPnt(this.lastPoint)}`;
		}
		get innerCurve() {
			return this.wrapped;
		}
		serialize() {
			return getOC().GeomToolsWrapper.Write(this.wrapped);
		}
		value(parameter) {
			const pnt = this.innerCurve.Value(parameter);
			const vec = [pnt.X(), pnt.Y()];
			pnt.delete();
			return vec;
		}
		get firstPoint() {
			return this.value(this.firstParameter);
		}
		get lastPoint() {
			return this.value(this.lastParameter);
		}
		get firstParameter() {
			return this.innerCurve.FirstParameter();
		}
		get lastParameter() {
			return this.innerCurve.LastParameter();
		}
		adaptor() {
			return new (getOC()).Geom2dAdaptor_Curve(this.wrapped);
		}
		get geomType() {
			const adaptor = this.adaptor();
			const curveType = findCurveType(adaptor.GetType());
			adaptor.delete();
			return curveType;
		}
		clone() {
			return new Curve2D(this.innerCurve.Copy());
		}
		reverse() {
			this.innerCurve.Reverse();
		}
		distanceFromPoint(point) {
			const oc = getOC();
			const r = GCWithScope();
			const projector = r(new oc.Geom2dAPI_ProjectPointOnCurve(r(pnt(point)), this.wrapped));
			let curveToPoint = Infinity;
			try {
				curveToPoint = projector.LowerDistance();
			} catch (e) {
				curveToPoint = Infinity;
			}
			return Math.min(curveToPoint, distance2d(point, this.firstPoint), distance2d(point, this.lastPoint));
		}
		distanceFromCurve(curve) {
			const oc = getOC();
			const r = GCWithScope();
			let curveDistance = Infinity;
			const projector = r(new oc.Geom2dAPI_ExtremaCurveCurve(this.wrapped, curve.wrapped, this.firstParameter, this.lastParameter, curve.firstParameter, curve.lastParameter));
			try {
				curveDistance = projector.LowerDistance();
			} catch (e) {
				curveDistance = Infinity;
			}
			return Math.min(curveDistance, this.distanceFromPoint(curve.firstPoint), this.distanceFromPoint(curve.lastPoint), curve.distanceFromPoint(this.firstPoint), curve.distanceFromPoint(this.lastPoint));
		}
		distanceFrom(element) {
			if (isPoint2D(element)) return this.distanceFromPoint(element);
			return this.distanceFromCurve(element);
		}
		isOnCurve(point) {
			return this.distanceFromPoint(point) < 1e-9;
		}
		parameter(point, precision = 1e-9) {
			const oc = getOC();
			const r = GCWithScope();
			let lowerDistance;
			let lowerDistanceParameter;
			try {
				const projector = r(new oc.Geom2dAPI_ProjectPointOnCurve(r(pnt(point)), this.wrapped));
				lowerDistance = projector.LowerDistance();
				lowerDistanceParameter = projector.LowerDistanceParameter();
			} catch (e) {
				if (samePoint$2(point, this.firstPoint, precision)) return this.firstParameter;
				if (samePoint$2(point, this.lastPoint, precision)) return this.lastParameter;
				throw new Error("Failed to find parameter");
			}
			if (lowerDistance > precision) throw new Error(`Point ${reprPnt(point)} not on curve ${this.repr}, ${lowerDistance.toFixed(9)}`);
			return lowerDistanceParameter;
		}
		tangentAt(index) {
			const oc = getOC();
			const [r, gc] = localGC();
			let param;
			if (Array.isArray(index)) param = this.parameter(index);
			else param = (this.innerCurve.LastParameter() - this.innerCurve.FirstParameter()) * index + this.innerCurve.FirstParameter();
			const point = r(new oc.gp_Pnt2d());
			const dir = r(new oc.gp_Vec2d());
			this.innerCurve.D1(param, point, dir);
			const tgtVec = [dir.X(), dir.Y()];
			gc();
			return tgtVec;
		}
		splitAt(points, precision = 1e-9) {
			const oc = getOC();
			const r = GCWithScope();
			let parameters = points.map((point) => {
				if (isPoint2D(point)) return this.parameter(point, precision);
				return point;
			});
			parameters = Array.from(new Map(parameters.map((p) => [precisionRound(p, -Math.log10(precision)), p])).values()).sort((a, b) => a - b);
			const firstParam = this.firstParameter;
			const lastParam = this.lastParameter;
			if (firstParam > lastParam) parameters.reverse();
			if (Math.abs(parameters[0] - firstParam) < precision * 100) parameters = parameters.slice(1);
			if (!parameters.length) return [this];
			if (Math.abs(parameters[parameters.length - 1] - lastParam) < precision * 100) parameters = parameters.slice(0, -1);
			if (!parameters.length) return [this];
			return zip([[firstParam, ...parameters], [...parameters, lastParam]]).map(([first, last]) => {
				try {
					if (this.geomType === "BEZIER_CURVE") {
						const curveCopy = new oc.Geom2d_BezierCurve(r(this.adaptor()).Bezier().Poles());
						curveCopy.Segment(first, last);
						return new Curve2D(curveCopy);
					}
					if (this.geomType === "BSPLINE_CURVE") {
						const adapted = r(this.adaptor()).BSpline();
						const curveCopy = new oc.Geom2d_BSplineCurve(adapted.Poles(), adapted.Knots(), adapted.Multiplicities(), adapted.Degree(), adapted.IsPeriodic());
						curveCopy.Segment(first, last, precision);
						return new Curve2D(curveCopy);
					}
					const trimmed = new oc.Geom2d_TrimmedCurve(this.wrapped, first, last, true, true);
					return new Curve2D(trimmed);
				} catch (e) {
					throw new Error("Failed to split the curve");
				}
			});
		}
	};
	//#endregion
	//#region src/lib2d/approximations.ts
	var approximateAsBSpline = (adaptor, tolerance = 1e-4, continuity = "C0", maxSegments = 200) => {
		const oc = getOC();
		const r = GCWithScope();
		const continuities = {
			C0: oc.GeomAbs_Shape.GeomAbs_C0,
			C1: oc.GeomAbs_Shape.GeomAbs_C1,
			C2: oc.GeomAbs_Shape.GeomAbs_C2,
			C3: oc.GeomAbs_Shape.GeomAbs_C3
		};
		return new Curve2D(r(new oc.Geom2dConvert_ApproxCurve(adaptor.ShallowCopy(), tolerance, continuities[continuity], maxSegments, 3)).Curve());
	};
	var BSplineToBezier = (adaptor) => {
		if (findCurveType(adaptor.GetType()) !== "BSPLINE_CURVE") throw new Error("You can only convert a Bspline");
		const handle = adaptor.BSpline();
		const firstParameter = adaptor.FirstParameter();
		const lastParameter = adaptor.LastParameter();
		const convert = new (getOC()).Geom2dConvert_BSplineCurveToBezierCurve(handle, firstParameter, lastParameter, 1e-9);
		function* bezierCurves() {
			const nArcs = convert.NbArcs();
			if (!nArcs) return;
			for (let i = 1; i <= nArcs; i++) yield new Curve2D(convert.Arc(i));
		}
		const curves = Array.from(bezierCurves());
		convert.delete();
		return curves;
	};
	function approximateAsSvgCompatibleCurve(curves, options = {
		tolerance: 1e-4,
		continuity: "C0",
		maxSegments: 300
	}) {
		const r = GCWithScope();
		return curves.flatMap((curve) => {
			const adaptor = r(curve.adaptor());
			const curveType = findCurveType(adaptor.GetType());
			const midpointParameter = .5 * (curve.firstParameter + curve.lastParameter);
			if (curveType === "ELLIPSE" || curveType === "CIRCLE" && samePoint$2(curve.firstPoint, curve.lastPoint)) return curve.splitAt([midpointParameter]);
			if ([
				"LINE",
				"ELLIPSE",
				"CIRCLE"
			].includes(curveType)) return curve;
			if (curveType === "BEZIER_CURVE") {
				const b = adaptor.Bezier();
				const deg = b.Degree();
				if (!b.IsRational() && [
					1,
					2,
					3
				].includes(deg)) return curve;
			}
			if (curveType === "BSPLINE_CURVE") {
				if (!adaptor.BSpline().IsRational()) return approximateAsSvgCompatibleCurve(BSplineToBezier(adaptor), options);
			}
			const bspline = approximateAsBSpline(adaptor, options.tolerance, options.continuity, options.maxSegments);
			return approximateAsSvgCompatibleCurve(BSplineToBezier(r(bspline.adaptor())), options);
		});
	}
	//#endregion
	//#region src/lib2d/intersections.ts
	function* pointsIteration(intersector) {
		const nPoints = intersector.NbPoints();
		if (!nPoints) return;
		for (let i = 1; i <= nPoints; i++) {
			const point = intersector.Point(i);
			yield [point.X(), point.Y()];
		}
	}
	function* commonSegmentsIteration(intersector) {
		const nSegments = intersector.NbSegments();
		if (!nSegments) return;
		for (let i = 1; i <= nSegments; i++) try {
			const { Curve1, Curve2 } = intersector.Segment(i);
			Curve2.delete();
			yield new Curve2D(Curve1);
		} catch (e) {
			continue;
		}
	}
	var intersectCurves = (first, second, precision = 1e-9) => {
		if (first.boundingBox.isOut(second.boundingBox)) return {
			intersections: [],
			commonSegments: [],
			commonSegmentsPoints: []
		};
		const intersector = new (getOC()).Geom2dAPI_InterCurveCurve();
		let intersections;
		let commonSegments;
		try {
			intersector.Init(first.wrapped, second.wrapped, precision);
			intersections = Array.from(pointsIteration(intersector));
			commonSegments = Array.from(commonSegmentsIteration(intersector));
		} catch (e) {
			console.error(first, second, e);
			throw new Error("Intersections failed between curves");
		} finally {
			intersector.delete();
		}
		const segmentsAsPoints = commonSegments.filter((c) => samePoint$2(c.firstPoint, c.lastPoint, precision)).map((c) => c.firstPoint);
		if (segmentsAsPoints.length) {
			intersections.push(...segmentsAsPoints);
			commonSegments = commonSegments.filter((c) => !samePoint$2(c.firstPoint, c.lastPoint, precision));
		}
		const commonSegmentsPoints = commonSegments.flatMap((c) => [c.firstPoint, c.lastPoint]);
		return {
			intersections,
			commonSegments,
			commonSegmentsPoints
		};
	};
	var selfIntersections = (curve, precision = 1e-9) => {
		const intersector = new (getOC()).Geom2dAPI_InterCurveCurve();
		let intersections;
		try {
			intersector.Init(curve.wrapped, curve.wrapped, precision);
			intersections = Array.from(pointsIteration(intersector));
		} catch (e) {
			throw new Error("Self intersection failed");
		} finally {
			intersector.delete();
		}
		return intersections;
	};
	//#endregion
	//#region src/lib2d/makeCurves.ts
	/**
	* Creates a 2D segment curve between two points.
	*
	* @param startPoint - The starting point of the segment.
	* @param endPoint - The ending point of the segment.
	*
	* @returns A Curve2D object representing the segment.
	*
	* @category Planar curves
	*/
	var make2dSegmentCurve = (startPoint, endPoint) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const curve = new Curve2D(r(new oc.GC_MakeSegment2d(r(pnt(startPoint)), r(pnt(endPoint)))).Value());
		if (!samePoint$2(curve.firstPoint, startPoint)) curve.reverse();
		gc();
		return curve;
	};
	/**
	* Creates a 2D arc curve defined by three points.
	*
	* @param startPoint - The starting point of the arc.
	* @param midPoint - The midpoint of the arc.
	* @param endPoint - The ending point of the arc.
	*
	* @returns A Curve2D object representing the arc.
	*
	* @category Planar curves
	*/
	var make2dThreePointArc = (startPoint, midPoint, endPoint) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const segment = r(new oc.GC_MakeArcOfCircle2d(r(pnt(startPoint)), r(pnt(midPoint)), r(pnt(endPoint)))).Value();
		const firstPoint = r(segment.Value(segment.FirstParameter()));
		if (!samePoint$2([firstPoint.X(), firstPoint.Y()], startPoint)) segment.SetTrim(segment.LastParameter(), segment.FirstParameter(), true, true);
		gc();
		return new Curve2D(segment);
	};
	/**
	* Creates a 2D tangent arc curve defined by three points.
	*
	* @param startPoint - The starting point of the arc.
	* @param tangent - The tangent vector at the starting point.
	* @param endPoint - The ending point of the arc.
	*
	* @returns A Curve2D object representing the tangent arc.
	*
	* @category Planar curves
	*/
	var make2dTangentArc = (startPoint, tangent, endPoint) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const segment = r(new oc.GC_MakeArcOfCircle2d(r(pnt(startPoint)), r(vec(tangent)), r(pnt(endPoint)))).Value();
		const firstPoint = r(segment.Value(segment.FirstParameter()));
		if (!samePoint$2([firstPoint.X(), firstPoint.Y()], startPoint)) segment.SetTrim(segment.LastParameter(), segment.FirstParameter(), true, true);
		gc();
		return new Curve2D(segment);
	};
	/**
	* Creates a 2D circle curve.
	*
	* @param radius - The radius of the circle.
	* @param center - The center point of the circle (default is [0, 0]).
	*
	* @returns A Curve2D object representing the circle.
	*
	* @category Planar curves
	*/
	var make2dCircle = (radius, center = [0, 0]) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const segment = r(new oc.GC_MakeCircle2d(r(pnt(center)), radius, true)).Value();
		gc();
		return new Curve2D(segment);
	};
	/**
	* Creates a 2D ellipse curve.
	*
	* @param majorRadius - The major radius of the ellipse.
	* @param minorRadius - The minor radius of the ellipse.
	* @param xDir - The direction vector for the major axis (default is [1, 0]).
	* @param center - The center point of the ellipse (default is [0, 0]).
	* @param direct - Whether the ellipse is direct (default is true).
	*
	* @returns A Curve2D object representing the ellipse.
	*
	* @category Planar curves
	*/
	var make2dEllipse = (majorRadius, minorRadius, xDir = [1, 0], center = [0, 0], direct = true) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const ellipse = r(new oc.gp_Elips2d(r(axis2d(center, xDir)), majorRadius, minorRadius, direct));
		const segment = r(new oc.GC_MakeEllipse2d(ellipse)).Value();
		gc();
		return new Curve2D(segment);
	};
	/**
	* Creates a 2D ellipse arc curve.
	*
	* @param majorRadius - The major radius of the ellipse.
	* @param minorRadius - The minor radius of the ellipse.
	* @param startAngle - The starting angle of the arc.
	* @param endAngle - The ending angle of the arc.
	* @param center - The center point of the ellipse (default is [0, 0]).
	* @param xDir - The direction vector for the major axis (default is [1, 0]).
	* @param direct - Whether the ellipse is direct (default is true).
	*
	* @returns A Curve2D object representing the ellipse arc.
	*
	* @category Planar curves
	*/
	var make2dEllipseArc = (majorRadius, minorRadius, startAngle, endAngle, center = [0, 0], xDir, direct = true) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const ellipse = r(new oc.gp_Elips2d(r(axis2d(center, xDir)), majorRadius, minorRadius, true));
		const segment = r(new oc.GC_MakeArcOfEllipse2d(ellipse, startAngle, endAngle, direct)).Value();
		gc();
		return new Curve2D(segment);
	};
	/**
	* Creates a 2D Bezier curve defined by a start point, control points, and an end point.
	*
	* @param startPoint - The starting point of the Bezier curve.
	* @param controls - An array of control points for the Bezier curve.
	* @param endPoint - The ending point of the Bezier curve.
	*
	* @returns A Curve2D object representing the Bezier curve.
	*
	* @category Planar curves
	*/
	var make2dBezierCurve = (startPoint, controls, endPoint) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const arrayOfPoints = r(new oc.NCollection_Array1_gp_Pnt2d(1, controls.length + 2));
		arrayOfPoints.SetValue(1, r(pnt(startPoint)));
		controls.forEach((p, i) => {
			arrayOfPoints.SetValue(i + 2, r(pnt(p)));
		});
		arrayOfPoints.SetValue(controls.length + 2, r(pnt(endPoint)));
		const bezCurve = new oc.Geom2d_BezierCurve(arrayOfPoints);
		gc();
		return new Curve2D(bezCurve);
	};
	/**
	* Creates a 2D B-spline curve defined by a set of points.
	*
	* @param points - An array of points defining the B-spline curve.
	* @param options - Options for the B-spline curve.
	* @param options.tolerance - The tolerance for the approximation (default is 1e-3).
	* @param options.smoothing - Smoothing parameters for the B-spline curve (default is null).
	* @param options.degMax - Maximum degree of the B-spline curve (default is 3).
	* @param options.degMin - Minimum degree of the B-spline curve (default is 1).
	*
	* @returns A Curve2D object representing the B-spline curve.
	*
	* @category Planar curves
	*/
	function make2dInerpolatedBSplineCurve(points, { tolerance = .001, smoothing = null, degMax = 3, degMin = 1 } = {}) {
		const r = GCWithScope();
		const oc = getOC();
		const pnts = r(new oc.NCollection_Array1_gp_Pnt2d(1, points.length));
		points.forEach((point, index) => {
			pnts.SetValue(index + 1, r(pnt(point)));
		});
		let splineBuilder;
		if (smoothing) {
			splineBuilder = r(new oc.Geom2dAPI_PointsToBSpline());
			splineBuilder.Init(pnts, smoothing[0], smoothing[1], smoothing[2], degMax, oc.GeomAbs_Shape.GeomAbs_C2, tolerance);
		} else {
			splineBuilder = r(new oc.Geom2dAPI_PointsToBSpline());
			splineBuilder.Init(pnts, degMin, degMax, oc.GeomAbs_Shape.GeomAbs_C2, tolerance);
		}
		if (!splineBuilder.IsDone()) throw new Error("B-spline approximation failed");
		return new Curve2D(splineBuilder.Curve());
	}
	var make2dArcFromCenter = (startPoint, endPoint, center, longArc = false) => {
		const midChord = scalarMultiply2d(add2d(startPoint, endPoint), .5);
		const orientedRadius = distance2d(center, startPoint) * (longArc ? -1 : 1);
		return make2dThreePointArc(startPoint, add2d(scalarMultiply2d(normalize2d(subtract2d(midChord, center)), orientedRadius), center), endPoint);
	};
	//#endregion
	//#region src/lib2d/offset.ts
	var offsetEndPoints = (firstPoint, lastPoint, offset) => {
		const tangent = normalize2d(subtract2d(lastPoint, firstPoint));
		const normal = [tangent[1], -tangent[0]];
		const offsetVec = [normal[0] * offset, normal[1] * offset];
		return {
			firstPoint: add2d(firstPoint, offsetVec),
			lastPoint: add2d(lastPoint, offsetVec)
		};
	};
	var make2dOffset = (curve, offset) => {
		const r = GCWithScope();
		const curveType = curve.geomType;
		if (curveType === "CIRCLE") {
			const circle = r(r(curve.adaptor()).Circle());
			const radius = circle.Radius();
			const orientedOffset = offset * (circle.IsDirect() ? 1 : -1);
			const newRadius = radius + orientedOffset;
			if (newRadius < 1e-10) {
				const centerPos = r(circle.Location());
				const center = [centerPos.X(), centerPos.Y()];
				const offsetViaCenter = (point) => {
					const [x, y] = normalize2d(subtract2d(point, center));
					return add2d(point, [orientedOffset * x, orientedOffset * y]);
				};
				return {
					collapsed: true,
					firstPoint: offsetViaCenter(curve.firstPoint),
					lastPoint: offsetViaCenter(curve.lastPoint)
				};
			}
			const oc = getOC();
			const newCircle = new oc.gp_Circ2d(circle.Axis(), newRadius);
			const newInnerCurve = new oc.Geom2d_Circle(newCircle);
			return new Curve2D(new oc.Geom2d_TrimmedCurve(newInnerCurve, curve.firstParameter, curve.lastParameter, true, true));
		}
		if (curveType === "LINE") {
			const { firstPoint, lastPoint } = offsetEndPoints(curve.firstPoint, curve.lastPoint, offset);
			return make2dSegmentCurve(firstPoint, lastPoint);
		}
		const approximation = approximateAsBSpline(new Curve2D(new (getOC()).Geom2d_OffsetCurve(curve.wrapped, offset, true)).adaptor());
		if (selfIntersections(approximation).length) return {
			collapsed: true,
			firstPoint: approximation.firstPoint,
			lastPoint: approximation.lastPoint
		};
		return approximation;
	};
	//#endregion
	//#region src/lib2d/customCorners.ts
	function removeCorner(firstCurve, secondCurve, radius) {
		const sinAngle = crossProduct2d(firstCurve.tangentAt(1), secondCurve.tangentAt(0));
		if (Math.abs(sinAngle) < 1e-10) return null;
		const offset = Math.abs(radius) * (sinAngle > 0 ? -1 : 1);
		const firstOffset = make2dOffset(firstCurve, offset);
		const secondOffset = make2dOffset(secondCurve, offset);
		if (!(firstOffset instanceof Curve2D) || !(secondOffset instanceof Curve2D)) return null;
		let potentialCenter;
		try {
			const { intersections } = intersectCurves(firstOffset, secondOffset, 1e-9);
			potentialCenter = intersections.at(-1);
		} catch (e) {
			return null;
		}
		if (!isPoint2D(potentialCenter)) return null;
		const center = potentialCenter;
		const splitForFillet = (curve, offsetCurve) => {
			const [x, y] = offsetCurve.tangentAt(center);
			const normal = normalize2d([-y, x]);
			const splitPoint = add2d(center, scalarMultiply2d(normal, offset));
			const splitParam = curve.parameter(splitPoint, 1e-6);
			return curve.splitAt([splitParam]);
		};
		const [first] = splitForFillet(firstCurve, firstOffset);
		const [, second] = splitForFillet(secondCurve, secondOffset);
		return {
			first,
			second,
			center
		};
	}
	function filletCurves(firstCurve, secondCurve, radius) {
		const cornerRemoved = removeCorner(firstCurve, secondCurve, radius);
		if (!cornerRemoved) {
			console.warn("Cannot fillet between curves", firstCurve.repr, secondCurve.repr);
			return [firstCurve, secondCurve];
		}
		const { first, second, center } = cornerRemoved;
		return [
			first,
			make2dArcFromCenter(first.lastPoint, second.firstPoint, center),
			second
		];
	}
	function chamferCurves(firstCurve, secondCurve, radius) {
		const cornerRemoved = removeCorner(firstCurve, secondCurve, radius);
		if (!cornerRemoved) {
			console.warn("Cannot chamfer between curves", firstCurve.repr, secondCurve.repr);
			return [firstCurve, secondCurve];
		}
		const { first, second } = cornerRemoved;
		return [
			first,
			make2dSegmentCurve(first.lastPoint, second.firstPoint),
			second
		];
	}
	function dogboneFilletCurves(firstCurve, secondCurve, radius) {
		const sinAngle = crossProduct2d(normalize2d(firstCurve.tangentAt(1)), normalize2d(secondCurve.tangentAt(0)));
		const a = Math.asin(sinAngle);
		if (Math.abs(sinAngle) < 1e-10) return [firstCurve, secondCurve];
		const orientationCorrection = sinAngle > 0 ? -1 : 1;
		const offset = Math.abs(radius) * Math.sin(a / 2) * orientationCorrection;
		const firstOffset = make2dOffset(firstCurve, offset);
		const secondOffset = make2dOffset(secondCurve, offset);
		if (!(firstOffset instanceof Curve2D) || !(secondOffset instanceof Curve2D)) return [firstCurve, secondCurve];
		let potentialCenter;
		try {
			const { intersections } = intersectCurves(firstOffset, secondOffset, 1e-9);
			potentialCenter = intersections.at(-1);
		} catch (e) {
			return [firstCurve, secondCurve];
		}
		if (!isPoint2D(potentialCenter)) return [firstCurve, secondCurve];
		const circle = make2dCircle(radius, potentialCenter);
		const firstInt = intersectCurves(firstCurve, circle).intersections[0];
		const secondInt = intersectCurves(secondCurve, circle).intersections.at(-1);
		if (!firstInt || !secondInt) return [firstCurve, secondCurve];
		const firstPart = firstCurve.splitAt([firstInt])[0];
		const secondPart = secondCurve.splitAt([secondInt]).at(-1);
		if (!firstPart || !secondPart) return [firstCurve, secondCurve];
		try {
			return [
				firstPart,
				make2dThreePointArc(firstPart.lastPoint, firstCurve.lastPoint, secondPart.firstPoint),
				secondPart
			];
		} catch (e) {
			return [firstCurve, secondCurve];
		}
	}
	//#endregion
	//#region ../../node_modules/flatqueue/index.js
	/**
	* @typedef {Float64ArrayConstructor | Float32ArrayConstructor |
	*   Uint32ArrayConstructor | Int32ArrayConstructor | Uint16ArrayConstructor |
	*   Int16ArrayConstructor | Uint8ArrayConstructor | Int8ArrayConstructor} TypedArrayConstructor
	*/
	/** @template [T=number] */
	var FlatQueue = class {
		/**
		* Creates an empty queue. If `capacity` is provided, the queue is backed by fixed-size typed
		* arrays for better performance and memory use, but can't grow beyond `capacity`. `values` uses
		* `ValuesArray` (default `Float64Array`) and `ids` uses `IdsArray` (default `Uint32Array`); pass
		* narrower constructors like `Uint16Array` if your values or ids are known to fit them.
		*
		* @param {number} [capacity]
		* @param {TypedArrayConstructor} [ValuesArray]
		* @param {TypedArrayConstructor} [IdsArray]
		*/
		constructor(capacity = Infinity, ValuesArray = Float64Array, IdsArray = Uint32Array) {
			const fixed = capacity !== Infinity;
			/** @type {T[]} */
			this.ids = fixed ? new IdsArray(capacity) : [];
			/** @type {number[]} */
			this.values = fixed ? new ValuesArray(capacity) : [];
			/** Maximum number of items the queue can hold; `Infinity` for regular-array queues, which grow on demand. */
			this.capacity = capacity;
			/** Number of items in the queue. */
			this.length = 0;
		}
		/** Removes all items from the queue. */
		clear() {
			this.length = 0;
		}
		/**
		* Adds `item` to the queue with the specified `priority`.
		*
		* `priority` must be a number. Items are sorted and returned from low to high priority. Multiple items
		* with the same priority value can be added to the queue, but there is no guaranteed order between these items.
		*
		* For fixed-capacity queues, throws a `RangeError` if the queue is already full.
		*
		* @param {T} item
		* @param {number} priority
		*/
		push(item, priority) {
			if (this.length === this.capacity) throw new RangeError("Queue is at capacity.");
			let pos = this.length++;
			while (pos > 0) {
				const parent = pos - 1 >> 1;
				const parentValue = this.values[parent];
				if (priority >= parentValue) break;
				this.ids[pos] = this.ids[parent];
				this.values[pos] = parentValue;
				pos = parent;
			}
			this.ids[pos] = item;
			this.values[pos] = priority;
		}
		/**
		* Removes and returns the item from the head of this queue, which is one of
		* the items with the lowest priority. If this queue is empty, returns `undefined`.
		*/
		pop() {
			if (this.length === 0) return void 0;
			const ids = this.ids, values = this.values, top = ids[0], last = --this.length;
			if (last > 0) {
				const id = ids[last];
				const value = values[last];
				let pos = 0;
				const halfLen = last >> 1;
				while (pos < halfLen) {
					const left = (pos << 1) + 1;
					const right = left + 1;
					const child = left + (+(right < last) & +(values[right] < values[left]));
					if (values[child] >= value) break;
					ids[pos] = ids[child];
					values[pos] = values[child];
					pos = child;
				}
				ids[pos] = id;
				values[pos] = value;
			}
			return top;
		}
		/** Returns the item from the head of this queue without removing it. If this queue is empty, returns `undefined`. */
		peek() {
			return this.length > 0 ? this.ids[0] : void 0;
		}
		/**
		* Returns the priority value of the item at the head of this queue without
		* removing it. If this queue is empty, returns `undefined`.
		*/
		peekValue() {
			return this.length > 0 ? this.values[0] : void 0;
		}
		/**
		* Shrinks the internal arrays to `this.length`. No-op for queues with fixed capacity.
		*
		* `pop()` and `clear()` calls don't free memory automatically to avoid unnecessary resize operations.
		* This also means that items that have been added to the queue can't be garbage collected until
		* a new item is pushed in their place, or this method is called.
		*/
		shrink() {
			if (Array.isArray(this.ids)) this.ids.length = this.length;
			if (Array.isArray(this.values)) this.values.length = this.length;
		}
	};
	//#endregion
	//#region ../../node_modules/flatbush/index.js
	var ARRAY_TYPES = [
		Int8Array,
		Uint8Array,
		Uint8ClampedArray,
		Int16Array,
		Uint16Array,
		Int32Array,
		Uint32Array,
		Float32Array,
		Float64Array
	];
	var VERSION = 3;
	/** @typedef {Int8ArrayConstructor | Uint8ArrayConstructor | Uint8ClampedArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Float32ArrayConstructor | Float64ArrayConstructor} TypedArrayConstructor */
	/** @typedef {Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array} TypedArray */
	var Flatbush = class Flatbush {
		/**
		* Recreate a Flatbush index from raw `ArrayBuffer` or `SharedArrayBuffer` data.
		* @param {ArrayBufferLike} data
		* @param {number} [byteOffset=0] byte offset to the start of the Flatbush buffer in the referenced ArrayBuffer.
		* @returns {Flatbush} index
		*/
		static from(data, byteOffset = 0) {
			if (byteOffset % 8 !== 0) throw new Error("byteOffset must be 8-byte aligned.");
			if (!data || data.byteLength === void 0 || "buffer" in data) throw new Error("Data must be an instance of ArrayBuffer or SharedArrayBuffer.");
			const [magic, versionAndType] = new Uint8Array(data, byteOffset + 0, 2);
			if (magic !== 251) throw new Error("Data does not appear to be in a Flatbush format.");
			const version = versionAndType >> 4;
			if (version !== VERSION) throw new Error(`Got v${version} data when expected v${VERSION}.`);
			const ArrayType = ARRAY_TYPES[versionAndType & 15];
			if (!ArrayType) throw new Error("Unrecognized array type.");
			const [nodeSize] = new Uint16Array(data, byteOffset + 2, 1);
			const [numItems] = new Uint32Array(data, byteOffset + 4, 1);
			return new Flatbush(numItems, nodeSize, ArrayType, void 0, data, byteOffset);
		}
		/**
		* Create a Flatbush index that will hold a given number of items.
		* @param {number} numItems
		* @param {number} [nodeSize=16] Size of the tree node (16 by default).
		* @param {TypedArrayConstructor} [ArrayType=Float64Array] The array type used for coordinates storage (`Float64Array` by default).
		* @param {ArrayBufferConstructor | SharedArrayBufferConstructor} [ArrayBufferType=ArrayBuffer] The array buffer type used to store data (`ArrayBuffer` by default).
		* @param {ArrayBufferLike} [data] (Only used internally)
		* @param {number} [byteOffset=0] (Only used internally)
		*/
		constructor(numItems, nodeSize = 16, ArrayType = Float64Array, ArrayBufferType = ArrayBuffer, data, byteOffset = 0) {
			if (numItems === void 0) throw new Error("Missing required argument: numItems.");
			if (isNaN(numItems) || numItems <= 0) throw new Error(`Unexpected numItems value: ${numItems}.`);
			this.numItems = +numItems;
			this.nodeSize = Math.min(Math.max(+nodeSize, 2), 65535);
			this.byteOffset = byteOffset;
			let n = numItems;
			let numNodes = n;
			this._levelBounds = [n * 4];
			do {
				n = Math.ceil(n / this.nodeSize);
				numNodes += n;
				this._levelBounds.push(numNodes * 4);
			} while (n !== 1);
			this.ArrayType = ArrayType;
			this.IndexArrayType = numNodes < 16384 ? Uint16Array : Uint32Array;
			const arrayTypeIndex = ARRAY_TYPES.indexOf(ArrayType);
			const nodesByteSize = numNodes * 4 * ArrayType.BYTES_PER_ELEMENT;
			if (arrayTypeIndex < 0) throw new Error(`Unexpected typed array class: ${ArrayType}.`);
			/** @type {new(b: ArrayBufferLike, o: number, l: number) => TypedArray} */
			const BoxCtor = ArrayType;
			/** @type {new(b: ArrayBufferLike, o: number, l: number) => Uint16Array | Uint32Array} */
			const IdxCtor = this.IndexArrayType;
			if (data) {
				this.data = data;
				this._boxes = new BoxCtor(data, byteOffset + 8, numNodes * 4);
				this._indices = new IdxCtor(data, byteOffset + 8 + nodesByteSize, numNodes);
				this._pos = numNodes * 4;
				this.minX = this._boxes[this._pos - 4];
				this.minY = this._boxes[this._pos - 3];
				this.maxX = this._boxes[this._pos - 2];
				this.maxY = this._boxes[this._pos - 1];
			} else {
				const data = this.data = new ArrayBufferType(8 + nodesByteSize + numNodes * this.IndexArrayType.BYTES_PER_ELEMENT);
				this._boxes = new BoxCtor(data, 8, numNodes * 4);
				this._indices = new IdxCtor(data, 8 + nodesByteSize, numNodes);
				this._pos = 0;
				this.minX = Infinity;
				this.minY = Infinity;
				this.maxX = -Infinity;
				this.maxY = -Infinity;
				new Uint8Array(data, 0, 2).set([251, 48 + arrayTypeIndex]);
				new Uint16Array(data, 2, 1)[0] = nodeSize;
				new Uint32Array(data, 4, 1)[0] = numItems;
			}
			/** @type FlatQueue<number> */
			this._queue = new FlatQueue();
		}
		/**
		* Add a given rectangle to the index.
		* @param {number} minX
		* @param {number} minY
		* @param {number} maxX
		* @param {number} maxY
		* @returns {number} A zero-based, incremental number that represents the newly added rectangle.
		*/
		add(minX, minY, maxX = minX, maxY = minY) {
			const pos = this._pos;
			const index = pos >> 2;
			const boxes = this._boxes;
			this._indices[index] = index;
			boxes[pos] = minX;
			boxes[pos + 1] = minY;
			boxes[pos + 2] = maxX;
			boxes[pos + 3] = maxY;
			this._pos = pos + 4;
			if (minX < this.minX) this.minX = minX;
			if (minY < this.minY) this.minY = minY;
			if (maxX > this.maxX) this.maxX = maxX;
			if (maxY > this.maxY) this.maxY = maxY;
			return index;
		}
		/** Perform indexing of the added rectangles. */
		finish() {
			if (this._pos >> 2 !== this.numItems) throw new Error(`Added ${this._pos >> 2} items when expected ${this.numItems}.`);
			const boxes = this._boxes;
			if (this.numItems <= this.nodeSize) {
				boxes[this._pos++] = this.minX;
				boxes[this._pos++] = this.minY;
				boxes[this._pos++] = this.maxX;
				boxes[this._pos++] = this.maxY;
				return;
			}
			const { numItems, minX, minY, nodeSize, _indices: indices, _levelBounds: levelBounds } = this;
			const width = this.maxX - minX || 1;
			const height = this.maxY - minY || 1;
			const hilbertValues = new Int32Array(numItems);
			const hilbertMax = 65535;
			const sx = hilbertMax / width;
			const sy = hilbertMax / height;
			for (let i = 0, pos = 0; i < numItems; i++) {
				const itemMinX = boxes[pos++];
				const itemMinY = boxes[pos++];
				const itemMaxX = boxes[pos++];
				const itemMaxY = boxes[pos++];
				const x = sx * ((itemMinX + itemMaxX) / 2 - minX) | 0;
				const y = sy * ((itemMinY + itemMaxY) / 2 - minY) | 0;
				hilbertValues[i] = hilbert(x, y);
			}
			sort(hilbertValues, boxes, indices, 0, numItems - 1, nodeSize);
			let pos = numItems * 4;
			for (let i = 0, readPos = 0; i < levelBounds.length - 1; i++) {
				const end = levelBounds[i];
				while (readPos < end) {
					const nodeIndex = readPos;
					let nodeMinX = boxes[readPos++];
					let nodeMinY = boxes[readPos++];
					let nodeMaxX = boxes[readPos++];
					let nodeMaxY = boxes[readPos++];
					for (let j = 1; j < nodeSize && readPos < end; j++) {
						nodeMinX = Math.min(nodeMinX, boxes[readPos++]);
						nodeMinY = Math.min(nodeMinY, boxes[readPos++]);
						nodeMaxX = Math.max(nodeMaxX, boxes[readPos++]);
						nodeMaxY = Math.max(nodeMaxY, boxes[readPos++]);
					}
					indices[pos >> 2] = nodeIndex;
					boxes[pos++] = nodeMinX;
					boxes[pos++] = nodeMinY;
					boxes[pos++] = nodeMaxX;
					boxes[pos++] = nodeMaxY;
				}
			}
			this._pos = pos;
		}
		/**
		* Search the index by a bounding box.
		* @param {number} minX
		* @param {number} minY
		* @param {number} maxX
		* @param {number} maxY
		* @param {(index: number, x0: number, y0: number, x1: number, y1: number) => boolean} [filterFn] An optional function that is called on every found item; if supplied, only items for which this function returns true will be included in the results array.
		* @returns {number[]} An array of indices of items intersecting or touching the given bounding box.
		*/
		search(minX, minY, maxX, maxY, filterFn) {
			if (this._pos !== this._boxes.length) throw new Error("Data not yet indexed - call index.finish().");
			const { _boxes: boxes, _levelBounds: levelBounds, _indices: indices, nodeSize } = this;
			const numItems4 = this.numItems * 4;
			/** @type number | undefined */
			let nodeIndex = boxes.length - 4;
			let level = levelBounds.length - 1;
			const q = [];
			const results = [];
			let contained = false;
			while (nodeIndex !== void 0) {
				const end = Math.min(nodeIndex + nodeSize * 4, levelBounds[level]);
				const isNode = nodeIndex >= numItems4;
				if (contained) this._collectContained(nodeIndex, end, level, numItems4, results, filterFn);
				else for (let pos = nodeIndex; pos < end; pos += 4) {
					const x0 = boxes[pos];
					if (maxX < x0) continue;
					const y0 = boxes[pos + 1];
					if (maxY < y0) continue;
					const x1 = boxes[pos + 2];
					if (minX > x1) continue;
					const y1 = boxes[pos + 3];
					if (minY > y1) continue;
					const index = indices[pos >> 2] | 0;
					if (isNode) {
						const c = +(minX <= x0 && minY <= y0 && maxX >= x1 && maxY >= y1);
						q.push(index | c, level - 1);
					} else if (filterFn === void 0 || filterFn(index, x0, y0, x1, y1)) results.push(index);
				}
				level = q.pop();
				nodeIndex = q.pop();
				if (nodeIndex !== void 0) {
					contained = (nodeIndex & 1) === 1;
					nodeIndex &= -2;
				}
			}
			return results;
		}
		/**
		* Collect all leaves of a subtree that's fully inside the query, skipping intersection tests.
		* Because the tree is packed bottom-up, those leaves occupy one contiguous block of the leaf
		* level, so we skip traversal entirely: descend to the first leaf, then sweep the flat range.
		* @param {number} nodeIndex
		* @param {number} end
		* @param {number} level
		* @param {number} numItems4
		* @param {number[]} results
		* @param {((index: number, x0: number, y0: number, x1: number, y1: number) => boolean) | undefined} filterFn
		*/
		_collectContained(nodeIndex, end, level, numItems4, results, filterFn) {
			const boxes = this._boxes;
			const indices = this._indices;
			let pos = nodeIndex;
			for (let l = level; l > 0; l--) pos = indices[pos >> 2];
			const leafEnd = Math.min(pos + (end - nodeIndex) * this.nodeSize ** level, numItems4);
			if (filterFn === void 0) for (; pos < leafEnd; pos += 4) results.push(indices[pos >> 2] | 0);
			else for (; pos < leafEnd; pos += 4) {
				const index = indices[pos >> 2] | 0;
				if (filterFn(index, boxes[pos], boxes[pos + 1], boxes[pos + 2], boxes[pos + 3])) results.push(index);
			}
		}
		/**
		* Search items in order of distance from the given point.
		* @param {number} x
		* @param {number} y
		* @param {number} [maxResults=Infinity]
		* @param {number} [maxDistance=Infinity]
		* @param {(index: number) => boolean} [filterFn] An optional function for filtering the results.
		* @returns {number[]} An array of indices of items found.
		*/
		neighbors(x, y, maxResults = Infinity, maxDistance = Infinity, filterFn) {
			if (this._pos !== this._boxes.length) throw new Error("Data not yet indexed - call index.finish().");
			const { _boxes: boxes, _levelBounds: levelBounds, _indices: indices, _queue: q, nodeSize } = this;
			const numItems4 = this.numItems * 4;
			const nodeSize4 = nodeSize * 4;
			const results = [];
			const maxDistSquared = maxDistance * maxDistance;
			const trackNearest = maxResults === 1;
			let bound = maxDistSquared;
			q.push(boxes.length - 4 << 1, 0);
			while (q.length) {
				const top = q.ids[0];
				if (top & 1) {
					q.pop();
					results.push(top >> 1);
					if (results.length === maxResults) break;
					continue;
				}
				q.pop();
				const nodeIndex = top >> 1;
				const isLeafLevel = nodeIndex < numItems4;
				const end = Math.min(nodeIndex + nodeSize4, upperBound(nodeIndex, levelBounds));
				for (let pos = nodeIndex; pos < end; pos += 4) {
					const minX = boxes[pos];
					const minY = boxes[pos + 1];
					const maxX = boxes[pos + 2];
					const maxY = boxes[pos + 3];
					const dx = Math.max(Math.max(minX - x, x - maxX), 0);
					const dy = Math.max(Math.max(minY - y, y - maxY), 0);
					const dist = dx * dx + dy * dy;
					if (dist > bound) continue;
					const childIndex = indices[pos >> 2] | 0;
					if (isLeafLevel) {
						if (filterFn === void 0 || filterFn(childIndex)) {
							q.push(childIndex << 1 | 1, dist);
							if (trackNearest && dist < bound) bound = dist;
						}
					} else q.push(childIndex << 1, dist);
				}
			}
			q.clear();
			return results;
		}
	};
	/**
	* Binary search for the first value in the array bigger than the given.
	* @param {number} value
	* @param {number[]} arr
	*/
	function upperBound(value, arr) {
		let i = 0;
		let j = arr.length - 1;
		while (i < j) {
			const m = i + j >> 1;
			if (arr[m] > value) j = m;
			else i = m + 1;
		}
		return arr[i];
	}
	/**
	* Custom quicksort that partially sorts bbox data alongside the hilbert values.
	* @param {Int32Array} values
	* @param {TypedArray} boxes
	* @param {Uint16Array | Uint32Array} indices
	* @param {number} left
	* @param {number} right
	* @param {number} nodeSize
	*/
	function sort(values, boxes, indices, left, right, nodeSize) {
		const stack = [left, right];
		while (stack.length) {
			const r = stack.pop() || 0;
			const l = stack.pop() || 0;
			if (r - l <= nodeSize && Math.floor(l / nodeSize) >= Math.floor(r / nodeSize)) continue;
			const a = values[l];
			const b = values[l + r >> 1];
			const c = values[r];
			const pivot = a > b !== a > c ? a : b < a !== b < c ? b : c;
			let i = l - 1;
			let j = r + 1;
			while (true) {
				do
					i++;
				while (values[i] < pivot);
				do
					j--;
				while (values[j] > pivot);
				if (i >= j) break;
				swap(values, boxes, indices, i, j);
			}
			stack.push(l, j, j + 1, r);
		}
	}
	/**
	* Swap two values and two corresponding boxes.
	* @param {Int32Array} values
	* @param {TypedArray} boxes
	* @param {Uint16Array | Uint32Array} indices
	* @param {number} i
	* @param {number} j
	*/
	function swap(values, boxes, indices, i, j) {
		const temp = values[i];
		values[i] = values[j];
		values[j] = temp;
		const k = 4 * i;
		const m = 4 * j;
		const a = boxes[k];
		const b = boxes[k + 1];
		const c = boxes[k + 2];
		const d = boxes[k + 3];
		boxes[k] = boxes[m];
		boxes[k + 1] = boxes[m + 1];
		boxes[k + 2] = boxes[m + 2];
		boxes[k + 3] = boxes[m + 3];
		boxes[m] = a;
		boxes[m + 1] = b;
		boxes[m + 2] = c;
		boxes[m + 3] = d;
		const e = indices[i];
		indices[i] = indices[j];
		indices[j] = e;
	}
	/**
	* Fast Hilbert curve algorithm by http://threadlocalmutex.com/
	* Ported from C++ https://github.com/rawrunprotected/hilbert_curves (public domain)
	* @param {number} x
	* @param {number} y
	*/
	function hilbert(x, y) {
		let a = x ^ y;
		let b = 65535 ^ a;
		let c = 65535 ^ (x | y);
		let d = x & (y ^ 65535);
		let A = a | b >> 1;
		let B = a >> 1 ^ a;
		let C = c ^ (c >> 1 ^ b & d >> 1);
		let D = d ^ (a & c >> 1 ^ d >> 1);
		a = A & A >> 2 ^ B & B >> 2;
		b = A & B >> 2 ^ B & (A ^ B) >> 2;
		c = C ^ (A & C >> 2 ^ B & D >> 2);
		d = D ^ (B & C >> 2 ^ (A ^ B) & D >> 2);
		A = a & a >> 4 ^ b & b >> 4;
		B = a & b >> 4 ^ b & (a ^ b) >> 4;
		C = c ^ (a & c >> 4 ^ b & d >> 4);
		D = d ^ (b & c >> 4 ^ (a ^ b) & d >> 4);
		c = C ^ (A & C >> 8 ^ B & D >> 8);
		d = D ^ (B & C >> 8 ^ (A ^ B) & D >> 8);
		c ^= c >> 1;
		d ^= d >> 1;
		a = x ^ y;
		b = d | 65535 ^ (a | c);
		a = (a | a << 8) & 16711935;
		a = (a | a << 4) & 252645135;
		a = (a | a << 2) & 858993459;
		a = (a | a << 1) & 1431655765;
		b = (b | b << 8) & 16711935;
		b = (b | b << 4) & 252645135;
		b = (b | b << 2) & 858993459;
		b = (b | b << 1) & 1431655765;
		return ((b << 1 | a) >>> 0) - 2147483648;
	}
	//#endregion
	//#region src/lib2d/stitching.ts
	var stitchCurves = (curves, precision = 1e-7) => {
		const startPoints = new Flatbush(curves.length);
		curves.forEach((c) => {
			const [x, y] = c.firstPoint;
			startPoints.add(x - precision, y - precision, x + precision, y + precision);
		});
		startPoints.finish();
		const stitchedCurves = [];
		const visited = /* @__PURE__ */ new Set();
		curves.forEach((curve, index) => {
			if (visited.has(index)) return;
			const connectedCurves = [curve];
			let currentIndex = index;
			visited.add(index);
			let maxLoops = curves.length;
			while (true) {
				if (maxLoops-- < 0) throw new Error("Infinite loop detected");
				const [x, y] = connectedCurves[connectedCurves.length - 1].lastPoint;
				const neighbors = startPoints.search(x - precision, y - precision, x + precision, y + precision);
				const indexDistance = (otherIndex) => Math.abs((currentIndex - otherIndex) % curves.length);
				const potentialNextCurves = neighbors.filter((neighborIndex) => !visited.has(neighborIndex)).map((neighborIndex) => [
					curves[neighborIndex],
					neighborIndex,
					indexDistance(neighborIndex)
				]).sort(([, , a], [, , b]) => indexDistance(a) - indexDistance(b));
				if (potentialNextCurves.length === 0) {
					stitchedCurves.push(connectedCurves);
					break;
				}
				const [nextCurve, nextCurveIndex] = potentialNextCurves[0];
				connectedCurves.push(nextCurve);
				visited.add(nextCurveIndex);
				currentIndex = nextCurveIndex;
			}
		});
		return stitchedCurves;
	};
	//#endregion
	//#region src/utils/round5.ts
	function round5(v) {
		return Math.round(v * 1e5) / 1e5;
	}
	//#endregion
	//#region src/lib2d/svgPath.ts
	var fromPnt = (pnt) => `${round5(pnt.X())} ${round5(pnt.Y())}`;
	var adaptedCurveToPathElem = (adaptor, lastPoint) => {
		const oc = getOC();
		const curveType = findCurveType(adaptor.GetType());
		const [endX, endY] = lastPoint;
		const endpoint = `${round5(endX)} ${round5(endY)}`;
		if (curveType === "LINE") return `L ${endpoint}`;
		if (curveType === "BEZIER_CURVE") {
			const curve = adaptor.Bezier();
			const deg = curve.Degree();
			if (deg === 1) return `L ${endpoint}`;
			if (deg === 2) return `Q ${fromPnt(curve.Pole(2))} ${endpoint}`;
			if (deg === 3) return `C ${fromPnt(curve.Pole(2))} ${fromPnt(curve.Pole(3))} ${endpoint}`;
		}
		if (curveType === "CIRCLE") {
			const curve = adaptor.Circle();
			const radius = curve.Radius();
			const p1 = adaptor.FirstParameter();
			const paramAngle = (adaptor.LastParameter() - p1) * RAD2DEG;
			const end = paramAngle !== 360 ? endpoint : `${round5(endX)} ${round5(endY + 1e-4)}`;
			return `A ${radius} ${radius} 0 ${Math.abs(paramAngle) > 180 ? "1" : "0"} ${curve.IsDirect() ? "1" : "0"} ${end}`;
		}
		if (curveType === "ELLIPSE") {
			const curve = adaptor.Ellipse();
			const rx = curve.MajorRadius();
			const ry = curve.MinorRadius();
			const p1 = adaptor.FirstParameter();
			const paramAngle = (adaptor.LastParameter() - p1) * RAD2DEG;
			const end = paramAngle !== 360 ? endpoint : `${round5(endX)} ${round5(endY + 1e-4)}`;
			const dir0 = new oc.gp_Dir2d();
			const angle = 180 - curve.XAxis().Direction().Angle(dir0) * RAD2DEG;
			dir0.delete();
			return `A ${round5(rx)} ${round5(ry)} ${round5(angle)} ${Math.abs(paramAngle) > 180 ? "1" : "0"} ${curve.IsDirect() ? "1" : "0"} ${end}`;
		}
		throw new Error(`Unsupported curve type: ${curveType}`);
	};
	//#endregion
	//#region src/manifoldlib.ts
	var MANIFOLD = { library: null };
	var setManifold = (manifold) => {
		manifold?.setup?.();
		MANIFOLD.library = manifold;
	};
	var getManifold = () => {
		if (!MANIFOLD.library) throw new Error("manifold has not been loaded");
		return MANIFOLD.library;
	};
	//#endregion
	//#region src/meshShapes.ts
	var asVec3 = (v) => {
		const vec = new Vector(v);
		return [
			vec.x,
			vec.y,
			vec.z
		];
	};
	var manifoldTransformFromTransformation = (t) => {
		const transform = t.inverted();
		const origin = transform.transformPoint([
			0,
			0,
			0
		]);
		const xPoint = transform.transformPoint([
			1,
			0,
			0
		]);
		const yPoint = transform.transformPoint([
			0,
			1,
			0
		]);
		const zPoint = transform.transformPoint([
			0,
			0,
			1
		]);
		const o = [
			origin.X(),
			origin.Y(),
			origin.Z()
		];
		const x = [
			xPoint.X() - o[0],
			xPoint.Y() - o[1],
			xPoint.Z() - o[2]
		];
		const y = [
			yPoint.X() - o[0],
			yPoint.Y() - o[1],
			yPoint.Z() - o[2]
		];
		const z = [
			zPoint.X() - o[0],
			zPoint.Y() - o[1],
			zPoint.Z() - o[2]
		];
		origin.delete();
		xPoint.delete();
		yPoint.delete();
		zPoint.delete();
		return [
			x[0],
			y[0],
			z[0],
			o[0],
			x[1],
			y[1],
			z[1],
			o[1],
			x[2],
			y[2],
			z[2],
			o[2]
		];
	};
	var applyTransformation = (shape, transform) => {
		const manifoldTransform = manifoldTransformFromTransformation(transform);
		return shape.transform(manifoldTransform);
	};
	var MeshShape = class MeshShape extends WrappingObj {
		constructor(manifoldShape) {
			super(manifoldShape);
			manifoldShape.numVert();
		}
		clone() {
			const mesh = this.wrapped.getMesh();
			const copy = new (getManifold()).Manifold(mesh);
			return new MeshShape(copy);
		}
		fuse(other, _options) {
			const newShape = this.wrapped.add(other.wrapped);
			return new MeshShape(newShape);
		}
		cut(other, _options) {
			const newShape = this.wrapped.subtract(other.wrapped);
			return new MeshShape(newShape);
		}
		intersect(other) {
			const newShape = this.wrapped.intersect(other.wrapped);
			return new MeshShape(newShape);
		}
		translate(vectorOrxDist, yDist = 0, zDist = 0) {
			const translation = typeof vectorOrxDist === "number" ? [
				vectorOrxDist,
				yDist,
				zDist
			] : asVec3(vectorOrxDist);
			const newShape = this.wrapped.translate(translation);
			return new MeshShape(newShape);
		}
		translateX(distance) {
			return this.translate([
				distance,
				0,
				0
			]);
		}
		translateY(distance) {
			return this.translate([
				0,
				distance,
				0
			]);
		}
		translateZ(distance) {
			return this.translate([
				0,
				0,
				distance
			]);
		}
		rotate(angleOrVector, position = [
			0,
			0,
			0
		], direction = [
			0,
			0,
			1
		]) {
			if (typeof angleOrVector !== "number") {
				const newShape = this.wrapped.rotate(asVec3(angleOrVector));
				return new MeshShape(newShape);
			}
			const transform = new Transformation();
			transform.rotate(angleOrVector, position, direction);
			const newShape = applyTransformation(this.wrapped, transform);
			return new MeshShape(newShape);
		}
		scale(scale, center) {
			const transform = new Transformation();
			transform.scale(center ?? [
				0,
				0,
				0
			], scale);
			const newShape = applyTransformation(this.wrapped, transform);
			return new MeshShape(newShape);
		}
		mirror(inputPlane, origin) {
			const transform = new Transformation();
			transform.mirror(inputPlane, origin);
			const newShape = applyTransformation(this.wrapped, transform);
			return new MeshShape(newShape);
		}
		simplify(tolerance) {
			const newShape = this.wrapped.simplify(tolerance);
			return new MeshShape(newShape);
		}
		refine(n) {
			return new MeshShape(this.wrapped.refine(n));
		}
		refineToLength(length) {
			return new MeshShape(this.wrapped.refineToLength(length));
		}
		refineToTolerance(tolerance) {
			return new MeshShape(this.wrapped.refineToTolerance(tolerance));
		}
		hull() {
			return new MeshShape(this.wrapped.hull());
		}
		asOriginal() {
			return new MeshShape(this.wrapped.asOriginal());
		}
		mesh() {
			const mesh = this.wrapped.calculateNormals(0, .1).getMesh();
			const numProp = mesh.numProp ?? 3;
			const vertProperties = Array.from(mesh.vertProperties);
			const triangles = Array.from(mesh.triVerts);
			const vertices = [];
			const numVert = mesh.numVert ?? Math.floor(vertProperties.length / numProp);
			const normalOffset = numProp >= 6 ? 3 : -1;
			const normals = [];
			for (let i = 0; i < numVert; i++) {
				const base = i * numProp;
				vertices.push(vertProperties[base], vertProperties[base + 1], vertProperties[base + 2]);
				if (normalOffset >= 0 && normalOffset + 2 < numProp) normals.push(vertProperties[base + normalOffset], vertProperties[base + normalOffset + 1], vertProperties[base + normalOffset + 2]);
			}
			return {
				vertices,
				triangles,
				normals,
				vertProperties,
				numProp
			};
		}
		get boundingBox() {
			const bbox = this.wrapped.boundingBox();
			return BoundingBox.fromBounds([
				bbox.min[0],
				bbox.min[1],
				bbox.min[2]
			], [
				bbox.max[0],
				bbox.max[1],
				bbox.max[2]
			]);
		}
		volume() {
			return this.wrapped.volume();
		}
		surfaceArea() {
			return this.wrapped.surfaceArea();
		}
		numTri() {
			return this.wrapped.numTri();
		}
		numVert() {
			return this.wrapped.numVert();
		}
		numEdge() {
			return this.wrapped.numEdge();
		}
		get isEmpty() {
			return this.wrapped.isEmpty();
		}
		/**
		* Exports the mesh shape as an STL file Blob.
		*
		* Since MeshShape is already a triangle mesh, no tessellation parameters
		* are needed (tolerance/angularTolerance are accepted but ignored for
		* API compatibility).
		*
		* @category Shape Export
		*/
		blobSTL({ binary = false } = {}) {
			const { vertices, triangles } = this.mesh();
			const numTriangles = triangles.length / 3;
			if (binary) {
				const bufferSize = 84 + numTriangles * 50;
				const buffer = new ArrayBuffer(bufferSize);
				const view = new DataView(buffer);
				view.setUint32(80, numTriangles, true);
				let offset = 84;
				for (let i = 0; i < numTriangles; i++) {
					const i0 = triangles[i * 3];
					const i1 = triangles[i * 3 + 1];
					const i2 = triangles[i * 3 + 2];
					const ax = vertices[i0 * 3], ay = vertices[i0 * 3 + 1], az = vertices[i0 * 3 + 2];
					const bx = vertices[i1 * 3], by = vertices[i1 * 3 + 1], bz = vertices[i1 * 3 + 2];
					const cx = vertices[i2 * 3], cy = vertices[i2 * 3 + 1], cz = vertices[i2 * 3 + 2];
					const ux = bx - ax, uy = by - ay, uz = bz - az;
					const vx = cx - ax, vy = cy - ay, vz = cz - az;
					let nx = uy * vz - uz * vy;
					let ny = uz * vx - ux * vz;
					let nz = ux * vy - uy * vx;
					const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
					if (len > 0) {
						nx /= len;
						ny /= len;
						nz /= len;
					}
					view.setFloat32(offset, nx, true);
					offset += 4;
					view.setFloat32(offset, ny, true);
					offset += 4;
					view.setFloat32(offset, nz, true);
					offset += 4;
					view.setFloat32(offset, ax, true);
					offset += 4;
					view.setFloat32(offset, ay, true);
					offset += 4;
					view.setFloat32(offset, az, true);
					offset += 4;
					view.setFloat32(offset, bx, true);
					offset += 4;
					view.setFloat32(offset, by, true);
					offset += 4;
					view.setFloat32(offset, bz, true);
					offset += 4;
					view.setFloat32(offset, cx, true);
					offset += 4;
					view.setFloat32(offset, cy, true);
					offset += 4;
					view.setFloat32(offset, cz, true);
					offset += 4;
					view.setUint16(offset, 0, true);
					offset += 2;
				}
				return new Blob([buffer], { type: "application/sla" });
			}
			const lines = ["solid mesh"];
			for (let i = 0; i < numTriangles; i++) {
				const i0 = triangles[i * 3];
				const i1 = triangles[i * 3 + 1];
				const i2 = triangles[i * 3 + 2];
				const ax = vertices[i0 * 3], ay = vertices[i0 * 3 + 1], az = vertices[i0 * 3 + 2];
				const bx = vertices[i1 * 3], by = vertices[i1 * 3 + 1], bz = vertices[i1 * 3 + 2];
				const cx = vertices[i2 * 3], cy = vertices[i2 * 3 + 1], cz = vertices[i2 * 3 + 2];
				const ux = bx - ax, uy = by - ay, uz = bz - az;
				const vx = cx - ax, vy = cy - ay, vz = cz - az;
				let nx = uy * vz - uz * vy;
				let ny = uz * vx - ux * vz;
				let nz = ux * vy - uy * vx;
				const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
				if (len > 0) {
					nx /= len;
					ny /= len;
					nz /= len;
				}
				lines.push(`facet normal ${nx} ${ny} ${nz}`);
				lines.push("  outer loop");
				lines.push(`    vertex ${ax} ${ay} ${az}`);
				lines.push(`    vertex ${bx} ${by} ${bz}`);
				lines.push(`    vertex ${cx} ${cy} ${cz}`);
				lines.push("  endloop");
				lines.push("endfacet");
			}
			lines.push("endsolid mesh");
			return new Blob([lines.join("\n")], { type: "application/sla" });
		}
	};
	//#endregion
	//#region src/shapeFunctions/shapeInput.ts
	var unwrapShape = (shape) => {
		return "wrapped" in shape ? shape.wrapped : shape;
	};
	//#endregion
	//#region src/shapeFunctions/mesh.ts
	var extractFromPointer = (heap, pointer, size) => {
		const start = (pointer >>> 0) / heap.BYTES_PER_ELEMENT;
		return Array.from(heap.subarray(start, start + size));
	};
	function prepareShapeForMesh(shapeInput, { tolerance = .001, angularTolerance = .1 } = {}) {
		const oc = getOC();
		const shape = unwrapShape(shapeInput);
		oc.ReplicadMeshExtractor.mesh(shape, tolerance, angularTolerance);
	}
	/**
	* Exports a shape as triangles suitable for use by rendering libraries.
	*
	* @category Shape Export
	*/
	function mesh(shapeInput, { tolerance = .001, angularTolerance = .1 } = {}) {
		const oc = getOC();
		const shape = unwrapShape(shapeInput);
		const raw = oc.ReplicadMeshExtractor.extract(shape, tolerance, angularTolerance, false);
		const buffer = oc.wasmMemory.buffer;
		const heapF32 = new Float32Array(buffer);
		const heapU32 = new Uint32Array(buffer);
		const heapI32 = new Int32Array(buffer);
		const vertices = extractFromPointer(heapF32, raw.getVerticesPtr(), raw.getVerticesSize());
		const normals = extractFromPointer(heapF32, raw.getNormalsPtr(), raw.getNormalsSize());
		const triangles = extractFromPointer(heapU32, raw.getTrianglesPtr(), raw.getTrianglesSize());
		const groupsRaw = extractFromPointer(heapI32, raw.getFaceGroupsPtr(), raw.getFaceGroupsSize());
		const faceGroups = [];
		for (let i = 0; i < groupsRaw.length; i += 3) faceGroups.push({
			start: groupsRaw[i],
			count: groupsRaw[i + 1],
			faceId: groupsRaw[i + 2]
		});
		raw.delete();
		return {
			triangles,
			vertices,
			normals,
			faceGroups
		};
	}
	/**
	* Exports a shape's edges as lines suitable for use by rendering libraries.
	*
	* @category Shape Export
	*/
	function meshEdges(shapeInput, { tolerance = .001, angularTolerance = .1 } = {}) {
		const oc = getOC();
		const shape = unwrapShape(shapeInput);
		const raw = oc.ReplicadEdgeMeshExtractor.extract(shape, tolerance, angularTolerance);
		const buffer = oc.wasmMemory.buffer;
		const heapF32 = new Float32Array(buffer);
		const heapI32 = new Int32Array(buffer);
		const lines = extractFromPointer(heapF32, raw.getLinesPtr(), raw.getLinesSize());
		const groupsRaw = extractFromPointer(heapI32, raw.getEdgeGroupsPtr(), raw.getEdgeGroupsSize());
		const edgeGroups = [];
		for (let i = 0; i < groupsRaw.length; i += 3) edgeGroups.push({
			start: groupsRaw[i],
			count: groupsRaw[i + 1],
			edgeId: groupsRaw[i + 2]
		});
		raw.delete();
		return {
			lines,
			edgeGroups
		};
	}
	/**
	* Returns the cached triangulation of a face, if one is available.
	*
	* @category Shape Export
	*/
	function triangulateFace(faceInput, index0 = 0) {
		const oc = getOC();
		const face = unwrapShape(faceInput);
		const r = GCWithScope();
		const location = r(new oc.TopLoc_Location());
		const triangulation = r(oc.BRep_Tool.Triangulation(face, location, 0));
		if (!triangulation || triangulation.isNull()) return null;
		const transformation = r(location.Transformation());
		const result = {
			vertices: [],
			trianglesIndexes: [],
			verticesNormals: []
		};
		const nbNodes = triangulation.NbNodes();
		result.vertices = new Array(nbNodes * 3);
		for (let i = 1; i <= nbNodes; i++) {
			const point = r(r(triangulation.Node(i)).Transformed(transformation));
			result.vertices[(i - 1) * 3] = point.X();
			result.vertices[(i - 1) * 3 + 1] = point.Y();
			result.vertices[(i - 1) * 3 + 2] = point.Z();
		}
		const isForward = face.Orientation() === oc.TopAbs_Orientation.TopAbs_FORWARD;
		const normalSign = isForward ? 1 : -1;
		if (!triangulation.HasNormals()) triangulation.ComputeNormals();
		result.verticesNormals = new Array(nbNodes * 3);
		for (let i = 1; i <= nbNodes; i++) {
			const normal = r(r(triangulation.Normal(i)).Transformed(transformation));
			result.verticesNormals[(i - 1) * 3] = normal.X() * normalSign;
			result.verticesNormals[(i - 1) * 3 + 1] = normal.Y() * normalSign;
			result.verticesNormals[(i - 1) * 3 + 2] = normal.Z() * normalSign;
		}
		const nbTriangles = triangulation.NbTriangles();
		result.trianglesIndexes = new Array(nbTriangles * 3);
		for (let nt = 1; nt <= nbTriangles; nt++) {
			const triangle = r(triangulation.Triangle(nt));
			let n1 = triangle.Value(1);
			let n2 = triangle.Value(2);
			const n3 = triangle.Value(3);
			if (!isForward) [n1, n2] = [n2, n1];
			result.trianglesIndexes[(nt - 1) * 3] = n1 - 1 + index0;
			result.trianglesIndexes[(nt - 1) * 3 + 1] = n2 - 1 + index0;
			result.trianglesIndexes[(nt - 1) * 3 + 2] = n3 - 1 + index0;
		}
		return result;
	}
	//#endregion
	//#region src/shapeFunctions/export.ts
	/**
	* Serializes a shape to OpenCascade's BRep text representation.
	*
	* @category Shape Export
	*/
	function serializeShape(shapeInput) {
		return getOC().BRepToolsWrapper.Write(unwrapShape(shapeInput));
	}
	function deserializeTopoShape(data) {
		return getOC().BRepToolsWrapper.Read(data);
	}
	/**
	* Exports a single shape as a STEP file.
	*
	* For named or colored assemblies, use `exportSTEP` instead.
	*
	* @category Shape Export
	*/
	function exportShapeSTEP(shapeInput) {
		const oc = getOC();
		const shape = unwrapShape(shapeInput);
		const filename = "blob.step";
		const writer = new oc.STEPControl_Writer();
		oc.Interface_Static.SetIVal("write.step.schema", 5);
		const progress = new oc.Message_ProgressRange();
		writer.Transfer(shape, oc.STEPControl_StepModelType.STEPControl_AsIs, true, progress);
		const done = writer.Write(filename);
		writer.delete();
		progress.delete();
		if (done === oc.IFSelect_ReturnStatus.IFSelect_RetDone) {
			const file = oc.FS.readFile("/blob.step");
			oc.FS.unlink("/blob.step");
			return new Blob([file], { type: "application/STEP" });
		}
		throw new Error("WRITE STEP FILE FAILED.");
	}
	/**
	* Exports a shape as an STL file.
	*
	* @category Shape Export
	*/
	function exportShapeSTL(shapeInput, { tolerance = .001, angularTolerance = .1, binary = false } = {}) {
		const oc = getOC();
		const shape = unwrapShape(shapeInput);
		prepareShapeForMesh(shape, {
			tolerance,
			angularTolerance
		});
		if (oc.StlAPI.Write(shape, "blob.stl", !binary)) {
			const file = oc.FS.readFile("/blob.stl");
			oc.FS.unlink("/blob.stl");
			return new Blob([file], { type: "application/sla" });
		}
		throw new Error("WRITE STL FILE FAILED.");
	}
	//#endregion
	//#region src/shapeFunctions/geometry.ts
	var unwrapCurve = (curve) => "wrapped" in curve ? curve.wrapped : curve;
	var mapCurveParameter = (curve, position) => {
		const firstParam = curve.FirstParameter();
		return firstParam + (curve.LastParameter() - firstParam) * position;
	};
	function curveType(curveInput) {
		const curve = unwrapCurve(curveInput);
		return findCurveType(curve.GetType && curve.GetType());
	}
	function curvePointAt(curveInput, position = .5) {
		const curve = unwrapCurve(curveInput);
		return new Vector(curve.Value(mapCurveParameter(curve, position)));
	}
	function curveTangentAt(curveInput, position = .5) {
		const oc = getOC();
		const curve = unwrapCurve(curveInput);
		const parameter = mapCurveParameter(curve, position);
		const point = new oc.gp_Pnt();
		const derivative = new oc.gp_Vec();
		curve.D1(parameter, point, derivative);
		const tangent = new Vector(derivative);
		point.delete();
		derivative.delete();
		return tangent;
	}
	var Curve = class extends WrappingObj {
		get repr() {
			const { startPoint, endPoint } = this;
			const retVal = `start: (${this.startPoint.repr}) end:(${this.endPoint.repr}}`;
			startPoint.delete();
			endPoint.delete();
			return retVal;
		}
		get curveType() {
			return curveType(this);
		}
		get startPoint() {
			return new Vector(this.wrapped.Value(this.wrapped.FirstParameter()));
		}
		get endPoint() {
			return new Vector(this.wrapped.Value(this.wrapped.LastParameter()));
		}
		pointAt(position = .5) {
			return curvePointAt(this, position);
		}
		tangentAt(position = .5) {
			return curveTangentAt(this, position);
		}
		get isClosed() {
			return this.wrapped.IsClosed();
		}
		get isPeriodic() {
			return this.wrapped.IsPeriodic();
		}
		get period() {
			return this.wrapped.Period();
		}
	};
	var unwrapSurface = (surface) => "wrapped" in surface ? surface.wrapped : surface;
	function surfaceType(surfaceInput) {
		const ga = getOC().GeomAbs_SurfaceType;
		const type = (/* @__PURE__ */ new Map([
			[ga.GeomAbs_Plane, "PLANE"],
			[ga.GeomAbs_Cylinder, "CYLINDRE"],
			[ga.GeomAbs_Cone, "CONE"],
			[ga.GeomAbs_Sphere, "SPHERE"],
			[ga.GeomAbs_Torus, "TORUS"],
			[ga.GeomAbs_BezierSurface, "BEZIER_SURFACE"],
			[ga.GeomAbs_BSplineSurface, "BSPLINE_SURFACE"],
			[ga.GeomAbs_SurfaceOfRevolution, "REVOLUTION_SURFACE"],
			[ga.GeomAbs_SurfaceOfExtrusion, "EXTRUSION_SURFACE"],
			[ga.GeomAbs_OffsetSurface, "OFFSET_SURFACE"],
			[ga.GeomAbs_OtherSurface, "OTHER_SURFACE"]
		])).get(unwrapSurface(surfaceInput).GetType());
		if (!type) throw new Error("surface type not found");
		return type;
	}
	var Surface = class extends WrappingObj {
		get surfaceType() {
			return surfaceType(this);
		}
	};
	//#endregion
	//#region src/shapeFunctions/faceGeometry.ts
	function faceUVBounds(faceInput) {
		const result = getOC().BRepTools.UVBounds(unwrapShape(faceInput), 0, 0, 0, 0);
		return {
			uMin: result.UMin,
			uMax: result.UMax,
			vMin: result.VMin,
			vMax: result.VMax
		};
	}
	function pointOnFace(faceInput, u, v) {
		const oc = getOC();
		const face = unwrapShape(faceInput);
		const { uMin, uMax, vMin, vMax } = faceUVBounds(face);
		const surface = new oc.BRepAdaptor_Surface(face, false);
		const point = new oc.gp_Pnt();
		const absoluteU = u * (uMax - uMin) + uMin;
		const absoluteV = v * (vMax - vMin) + vMin;
		surface.D0(absoluteU, absoluteV, point);
		const result = new Vector(point);
		surface.delete();
		point.delete();
		return result;
	}
	function faceUVCoordinates(faceInput, point) {
		const oc = getOC();
		const face = unwrapShape(faceInput);
		const r = GCWithScope();
		const surface = r(oc.BRep_Tool.Surface(face));
		const { U, V } = r(new oc.GeomAPI_ProjectPointOnSurf(r(asPnt(point)), surface, oc.Extrema_ExtAlgo.Extrema_ExtAlgo_Grad)).LowerDistanceParameters(0, 0);
		return [U, V];
	}
	function faceNormalAt(faceInput, location) {
		const oc = getOC();
		const face = unwrapShape(faceInput);
		let u;
		let v;
		if (location) [u, v] = faceUVCoordinates(face, location);
		else {
			const { uMin, uMax, vMin, vMax } = faceUVBounds(face);
			u = .5 * (uMin + uMax);
			v = .5 * (vMin + vMax);
		}
		const r = GCWithScope();
		const point = r(new oc.gp_Pnt());
		const normal = r(new oc.gp_Vec());
		r(new oc.BRepGProp_Face(face, false)).Normal(u, v, point, normal);
		return new Vector(normal);
	}
	function faceCenter(faceInput) {
		const oc = getOC();
		const properties = new oc.GProp_GProps();
		oc.BRepGProp.SurfaceProperties(unwrapShape(faceInput), properties, 1e-7, true);
		const center = new Vector(properties.CentreOfMass());
		properties.delete();
		return center;
	}
	//#endregion
	//#region src/shapeFunctions/topology.ts
	var TOPOLOGY_KINDS = [
		"vertex",
		"edge",
		"wire",
		"face",
		"shell",
		"solid",
		"solidCompound",
		"compound"
	];
	var buildDefinitions = (oc) => {
		const ta = oc.TopAbs_ShapeEnum;
		const shapeEnum = {
			vertex: ta.TopAbs_VERTEX,
			edge: ta.TopAbs_EDGE,
			wire: ta.TopAbs_WIRE,
			face: ta.TopAbs_FACE,
			shell: ta.TopAbs_SHELL,
			solid: ta.TopAbs_SOLID,
			solidCompound: ta.TopAbs_COMPSOLID,
			compound: ta.TopAbs_COMPOUND,
			shape: ta.TopAbs_SHAPE
		};
		return {
			shapeEnum,
			kindOf: new Map(TOPOLOGY_KINDS.map((kind) => [shapeEnum[kind], kind])),
			downcast: {
				shape: (shape) => shape,
				vertex: (shape) => oc.TopoDS.Vertex(shape),
				edge: (shape) => oc.TopoDS.Edge(shape),
				wire: (shape) => oc.TopoDS.Wire(shape),
				face: (shape) => oc.TopoDS.Face(shape),
				shell: (shape) => oc.TopoDS.Shell(shape),
				solid: (shape) => oc.TopoDS.Solid(shape),
				solidCompound: (shape) => oc.ReplicadShapeCaster.CompSolid(shape),
				compound: (shape) => oc.TopoDS.Compound(shape)
			}
		};
	};
	var cache = null;
	var definitions = () => {
		const oc = getOC();
		if (cache?.oc !== oc) cache = {
			oc,
			definitions: buildDefinitions(oc)
		};
		return cache.definitions;
	};
	var asTopo = (entity) => definitions().shapeEnum[entity];
	var downcastTo = (shape, entity) => definitions().downcast[entity](shape);
	function* iterTopo(shape, topo) {
		const explorer = new (getOC()).TopExp_Explorer(shape, asTopo(topo), asTopo("shape"));
		try {
			const seen = [];
			while (explorer.More()) {
				const item = explorer.Current();
				if (!seen.some((s) => s.IsSame(item))) {
					seen.push(item);
					yield downcastTo(item, topo);
				}
				explorer.Next();
			}
		} finally {
			explorer.delete();
		}
	}
	var shapeType = (shape) => {
		if (shape.IsNull()) throw new Error("This shape has not type, it is null");
		return shape.ShapeType();
	};
	function topologyKind(shape) {
		return definitions().kindOf.get(shapeType(shape));
	}
	function downcast(shape) {
		const kind = topologyKind(shape);
		if (!kind) throw new Error(`Unsupported topology type: ${shapeType(shape)}`);
		return definitions().downcast[kind](shape);
	}
	//#endregion
	//#region src/shapeFunctions/operations.ts
	var configureGlue = (builder, optimisation) => {
		const oc = getOC();
		if (optimisation === "commonFace") builder.SetGlue(oc.BOPAlgo_GlueEnum.BOPAlgo_GlueShift);
		if (optimisation === "sameFace") builder.SetGlue(oc.BOPAlgo_GlueEnum.BOPAlgo_GlueFull);
	};
	/** Builds a raw shape by fusing two shapes. */
	function fuseShapes(leftInput, rightInput, { optimisation = "none", simplify = true } = {}) {
		const oc = getOC();
		const builder = GCWithScope()(new oc.BRepAlgoAPI_Fuse(unwrapShape(leftInput), unwrapShape(rightInput)));
		configureGlue(builder, optimisation);
		builder.Build();
		if (simplify) builder.SimplifyResult(true, true, .001);
		return builder.Shape();
	}
	/** Builds a raw shape by cutting a tool shape from another shape. */
	function cutShape(shapeInput, toolInput, { optimisation = "none", simplify = true } = {}) {
		const oc = getOC();
		const builder = GCWithScope()(new oc.BRepAlgoAPI_Cut(unwrapShape(shapeInput), unwrapShape(toolInput)));
		configureGlue(builder, optimisation);
		builder.Build();
		if (simplify) builder.SimplifyResult(true, true, .001);
		return builder.Shape();
	}
	/** Builds a raw shape containing the intersection of two shapes. */
	function intersectShapes(leftInput, rightInput, { simplify = true } = {}) {
		const oc = getOC();
		const builder = GCWithScope()(new oc.BRepAlgoAPI_Common(unwrapShape(leftInput), unwrapShape(rightInput)));
		builder.Build();
		if (simplify) builder.SimplifyResult(true, true, .001);
		return builder.Shape();
	}
	var signedDistanceToPlane = (point, plane) => (point[0] - plane.origin.x) * plane.zDir.x + (point[1] - plane.origin.y) * plane.zDir.y + (point[2] - plane.origin.z) * plane.zDir.z;
	/**
	* Splits a shape with an oriented plane and groups pieces by side.
	*
	* `offset` translates the splitting plane along its normal. A side is null
	* when empty, the piece itself when it contains one piece, and a compound when
	* it contains multiple disconnected pieces.
	*/
	function splitShape(shapeInput, inputPlane = "XY", offset = 0, tolerance = 1e-7) {
		const oc = getOC();
		const r = GCWithScope();
		const shape = unwrapShape(shapeInput);
		const basePlane = r(makePlane(inputPlane));
		const plane = offset === 0 ? basePlane : r(basePlane.translate([
			basePlane.zDir.x * offset,
			basePlane.zDir.y * offset,
			basePlane.zDir.z * offset
		]));
		const ocPlane = r(makePln(plane.origin, plane.zDir));
		const splittingFace = r(r(new oc.BRepBuilderAPI_MakeFace(ocPlane)).Face());
		const argumentsList = r(new oc.NCollection_List_TopoDS_Shape());
		argumentsList.Append(shape);
		const toolsList = r(new oc.NCollection_List_TopoDS_Shape());
		toolsList.Append(splittingFace);
		const builder = r(new oc.BRepAlgoAPI_Splitter());
		builder.SetArguments(argumentsList);
		builder.SetTools(toolsList);
		builder.Build();
		if (builder.HasErrors()) throw new Error("Could not split shape with plane");
		const splitResult = builder.Shape();
		const pieces = splitResult.ShapeType() === oc.TopAbs_ShapeEnum.TopAbs_SOLID ? [oc.TopoDS.Solid(splitResult)] : [...iterTopo(splitResult, "solid")];
		splitResult.delete();
		const grouped = {
			positive: [],
			negative: [],
			on: []
		};
		for (const piece of pieces) {
			const bounds = r(new oc.Bnd_Box());
			oc.BRepBndLib.Add(piece, bounds, true);
			const min = r(bounds.CornerMin());
			const max = r(bounds.CornerMax());
			const distance = signedDistanceToPlane([
				(min.X() + max.X()) / 2,
				(min.Y() + max.Y()) / 2,
				(min.Z() + max.Z()) / 2
			], plane);
			if (distance > tolerance) grouped.positive.push(piece);
			else if (distance < -tolerance) grouped.negative.push(piece);
			else grouped.on.push(piece);
		}
		const asShape = (group) => {
			if (!group.length) return null;
			if (group.length === 1) return group[0];
			const compound = new oc.TopoDS_Compound();
			const compoundBuilder = r(new oc.TopoDS_Builder());
			compoundBuilder.MakeCompound(compound);
			group.forEach((piece) => compoundBuilder.Add(compound, piece));
			group.forEach((piece) => piece.delete());
			return compound;
		};
		return {
			positive: asShape(grouped.positive),
			negative: asShape(grouped.negative),
			on: asShape(grouped.on)
		};
	}
	/**
	* Cuts a shape with the half-space defined by an oriented plane.
	*
	* `keep` identifies the side that remains. Positive is the direction of the
	* plane normal. The offset translates the plane along that normal.
	*/
	function cutShapeWithPlane(shapeInput, inputPlane = "XY", offset = 0, keep = "positive") {
		const oc = getOC();
		const r = GCWithScope();
		const shape = unwrapShape(shapeInput);
		const basePlane = r(makePlane(inputPlane));
		const plane = offset === 0 ? basePlane : r(basePlane.translate([
			basePlane.zDir.x * offset,
			basePlane.zDir.y * offset,
			basePlane.zDir.z * offset
		]));
		const ocPlane = r(makePln(plane.origin, plane.zDir));
		const face = r(r(new oc.BRepBuilderAPI_MakeFace(ocPlane)).Face());
		const removedSign = keep === "negative" ? 1 : -1;
		const referencePoint = r(asPnt([
			plane.origin.x + plane.zDir.x * removedSign,
			plane.origin.y + plane.zDir.y * removedSign,
			plane.origin.z + plane.zDir.z * removedSign
		]));
		const halfSpace = r(r(new oc.BRepPrimAPI_MakeHalfSpace(face, referencePoint)).Solid());
		const builder = r(new oc.BRepAlgoAPI_Cut(shape, halfSpace));
		builder.Build();
		if (builder.HasErrors()) throw new Error("Could not cut shape with plane");
		const cutResult = builder.Shape();
		const solids = cutResult.ShapeType() === oc.TopAbs_ShapeEnum.TopAbs_SOLID ? [oc.TopoDS.Solid(cutResult)] : [...iterTopo(cutResult, "solid")];
		cutResult.delete();
		if (!solids.length) return null;
		if (solids.length === 1) return solids[0];
		const compound = new oc.TopoDS_Compound();
		const compoundBuilder = r(new oc.TopoDS_Builder());
		compoundBuilder.MakeCompound(compound);
		solids.forEach((solid) => compoundBuilder.Add(compound, solid));
		solids.forEach((solid) => solid.delete());
		return compound;
	}
	/**
	* Hollows a shape by removing the supplied faces and retaining a wall of the
	* requested thickness.
	*/
	function shellShape(shapeInput, { faces, thickness, tolerance = .001 }) {
		const oc = getOC();
		const r = GCWithScope();
		const facesToRemove = r(new oc.NCollection_List_TopoDS_Shape());
		for (const face of faces) facesToRemove.Append(unwrapShape(face));
		const builder = r(new oc.BRepOffsetAPI_MakeThickSolid());
		builder.MakeThickSolidByJoin(unwrapShape(shapeInput), facesToRemove, -thickness, tolerance, oc.BRepOffset_Mode.BRepOffset_Skin, false, false, oc.GeomAbs_JoinType.GeomAbs_Arc, false);
		return builder.Shape();
	}
	/** Applies a draft angle to the supplied faces of a shape. */
	function draftShape(shapeInput, { faces, angle, neutralPlane = "XY" }) {
		const oc = getOC();
		const shape = unwrapShape(shapeInput);
		const builder = new oc.BRepOffsetAPI_DraftAngle(shape);
		const inputPlane = makePlane(neutralPlane);
		const plane = makePln(inputPlane.origin, inputPlane.zDir);
		const direction = asDir(inputPlane.zDir);
		for (const face of faces) builder.Add(unwrapShape(face), direction, angle * DEG2RAD, plane, false);
		builder.Build();
		const result = builder.ModifiedShape(shape);
		builder.delete();
		plane.delete();
		direction.delete();
		inputPlane.delete();
		return result;
	}
	//#endregion
	//#region src/shapeFunctions/edgeOperations.ts
	function isFilletRadius(radius) {
		if (typeof radius === "number") return true;
		return Array.isArray(radius) && radius.length === 2 && radius.every((value) => typeof value === "number");
	}
	/**
	* Normalizes a radius callback, a filter configuration, or a radius applying
	* to every edge into a lazy sequence of explicit edge/radius pairs.
	*
	* Temporary edge wrappers remain alive while each yielded value is consumed
	* and are deleted before advancing to the next edge.
	*/
	function* selectEdgeRadii(shapeInput, radiusConfig, isRadius, wrapEdge) {
		const shape = unwrapShape(shapeInput);
		if (isRadius(radiusConfig)) {
			for (const edge of iterTopo(shape, "edge")) yield {
				edge,
				radius: radiusConfig
			};
			return;
		}
		let radiusForEdge;
		let filterToDelete = null;
		if (typeof radiusConfig === "function") radiusForEdge = radiusConfig;
		else {
			radiusForEdge = (edge) => radiusConfig.filter.shouldKeep(edge) ? radiusConfig.radius || 1 : null;
			if (!radiusConfig.keep) filterToDelete = radiusConfig.filter;
		}
		try {
			for (const edge of iterTopo(shape, "edge")) {
				const wrappedEdge = wrapEdge(edge);
				try {
					const radius = radiusForEdge(wrappedEdge);
					if (radius) yield {
						edge,
						radius
					};
				} finally {
					wrappedEdge.delete();
				}
			}
		} finally {
			filterToDelete?.delete();
		}
	}
	function* mapSelectedEdges(edges, map) {
		for (const selected of edges) yield map(selected);
	}
	function filletShape(shapeInput, edges) {
		const oc = getOC();
		const builder = GCWithScope()(new oc.BRepFilletAPI_MakeFillet(unwrapShape(shapeInput), oc.ChFi3d_FilletShape.ChFi3d_Rational));
		let edgeCount = 0;
		for (const { radius, edge: edgeInput } of edges) {
			const edge = unwrapShape(edgeInput);
			if (typeof radius === "number") builder.Add(radius, edge);
			else builder.Add(radius[0], radius[1], edge);
			edgeCount += 1;
		}
		if (!edgeCount) throw new Error("Could not fillet, no edge was selected");
		return builder.Shape();
	}
	function chamferShape(shapeInput, edges) {
		const oc = getOC();
		const builder = GCWithScope()(new oc.BRepFilletAPI_MakeChamfer(unwrapShape(shapeInput)));
		let edgeCount = 0;
		for (const config of edges) {
			const edge = unwrapShape(config.edge);
			if ("radius" in config) builder.Add(config.radius, edge);
			else if ("distances" in config) builder.Add(config.distances[0] ?? 1, config.distances[1] ?? 1, edge, unwrapShape(config.face));
			else builder.AddDA(config.distance, config.angle * DEG2RAD, edge, unwrapShape(config.face));
			edgeCount += 1;
		}
		if (!edgeCount) throw new Error("Could not chamfer, no edge was selected");
		return builder.Shape();
	}
	//#endregion
	//#region src/shapeFunctions/casting.ts
	/**
	* Builds a cast function from the concrete wrappers to instantiate.
	*
	* This keeps the casting module independent from the wrapper classes, while
	* letting the caller keep the mapping fully typed.
	*/
	function makeCaster(constructors) {
		return (shape) => {
			const kind = topologyKind(shape);
			if (!kind) throw new Error(`Unsupported topology type: ${shapeType(shape)}`);
			return new constructors[kind](downcast(shape));
		};
	}
	//#endregion
	//#region src/finders/definitions.ts
	var PLANE_TO_DIR = {
		YZ: "X",
		XZ: "Y",
		XY: "Z"
	};
	var Finder = class {
		constructor() {
			this.filters = [];
		}
		delete() {
			this.filters = [];
		}
		/**
		* Combine logically a set of filter with an AND operation.
		*
		* You need to pass an array of functions that take a finder as a argument
		* and return the same finder with some filters applied to it.
		*
		* Note that by default filters are applied with and AND operation, but in
		* some case you might want to create them dynamically and use this method.
		*
		* @category Filter Combination
		*/
		and(findersList) {
			findersList.forEach((f) => f(this));
			return this;
		}
		/**
		* Invert the result of a particular finder
		*
		* You need to pass a function that take a finder as a argument
		* and return the same finder with some filters applied to it.
		*
		* @category Filter Combination
		*/
		not(finderFun) {
			const finder = new this.constructor();
			finderFun(finder);
			const notFilter = ({ element }) => !finder.shouldKeep(element);
			this.filters.push(notFilter);
			return this;
		}
		/**
		* Combine logically a set of filter with an OR operation.
		*
		* You need to pass an array of functions that take a finder as a argument
		* and return the same finder with some filters applied to it.
		*
		* @category Filter Combination
		*/
		either(findersList) {
			const builtFinders = findersList.map((finderFunction) => {
				const finder = new this.constructor();
				finderFunction(finder);
				return finder;
			});
			const eitherFilter = ({ element }) => builtFinders.some((finder) => finder.shouldKeep(element));
			this.filters.push(eitherFilter);
			return this;
		}
		find(shape, { unique = false } = {}) {
			const elements = this.applyFilter(shape);
			if (unique) {
				if (elements.length !== 1) {
					console.error(elements);
					throw new Error("Finder has not found a unique solution");
				}
				return elements[0];
			}
			return elements;
		}
	};
	//#endregion
	//#region src/measureShape.ts
	var PhysicalProperties = class extends WrappingObj {
		get centerOfMass() {
			const pnt = GCWithScope()(this.wrapped.CentreOfMass());
			return [
				pnt.X(),
				pnt.Y(),
				pnt.Z()
			];
		}
	};
	var VolumePhysicalProperties = class extends PhysicalProperties {
		get volume() {
			return this.wrapped.Mass();
		}
	};
	var SurfacePhysicalProperties = class extends PhysicalProperties {
		get area() {
			return this.wrapped.Mass();
		}
	};
	var LinearPhysicalProperties = class extends PhysicalProperties {
		get length() {
			return this.wrapped.Mass();
		}
	};
	function measureShapeSurfaceProperties(shape) {
		const oc = getOC();
		const properties = new oc.GProp_GProps();
		oc.BRepGProp.SurfaceProperties(shape.wrapped, properties, false, false);
		return new SurfacePhysicalProperties(properties);
	}
	function measureShapeLinearProperties(shape) {
		const oc = getOC();
		const properties = new oc.GProp_GProps();
		oc.BRepGProp.LinearProperties(shape.wrapped, properties, false, false);
		return new LinearPhysicalProperties(properties);
	}
	function measureShapeVolumeProperties(shape) {
		const oc = getOC();
		const properties = new oc.GProp_GProps();
		oc.BRepGProp.VolumeProperties(shape.wrapped, properties, false, false, false);
		return new VolumePhysicalProperties(properties);
	}
	/**
	* Measure the volume of a shape
	*
	* @category Measure
	*/
	function measureVolume(shape) {
		return measureShapeVolumeProperties(shape).volume;
	}
	/**
	* Measure the area of a shape
	*
	* @category Measure
	*/
	function measureArea(shape) {
		return measureShapeSurfaceProperties(shape).area;
	}
	/**
	* Measure the length of a shape
	*
	* @category Measure
	*/
	function measureLength(shape) {
		return measureShapeLinearProperties(shape).length;
	}
	var DistanceTool = class extends WrappingObj {
		constructor() {
			const oc = getOC();
			super(new oc.BRepExtrema_DistShapeShape());
		}
		distanceBetween(shape1, shape2) {
			this.wrapped.LoadS1(shape1.wrapped);
			this.wrapped.LoadS2(shape2.wrapped);
			this.wrapped.Perform();
			return this.wrapped.Value();
		}
	};
	/**
	* Measure the distance between two shapes
	*
	* @category Measure
	*/
	function measureDistanceBetween(shape1, shape2) {
		return new DistanceTool().distanceBetween(shape1, shape2);
	}
	var DistanceQuery = class extends WrappingObj {
		constructor(shape) {
			const oc = getOC();
			super(new oc.BRepExtrema_DistShapeShape());
			this.wrapped.LoadS1(shape.wrapped);
		}
		distanceTo(shape) {
			this.wrapped.LoadS2(shape.wrapped);
			this.wrapped.Perform();
			return this.wrapped.Value();
		}
	};
	//#endregion
	//#region src/finders/generic3dfinder.ts
	var Finder3d = class extends Finder {
		/**
		* Filter to find elements following a custom function.
		*
		* @category Filter
		*/
		when(filter) {
			this.filters.push(filter);
			return this;
		}
		/**
		* Filter to find elements that are in the list.
		*
		* This deletes the elements in the list as the filter deletion.
		*
		* @category Filter
		*/
		inList(elementList) {
			const elementInList = ({ element }) => {
				return !!elementList.find((e) => e.isSame(element));
			};
			this.filters.push(elementInList);
			return this;
		}
		/**
		* Filter to find elements that are at a specified angle (in degrees) with
		* a direction.
		*
		* The element direction corresponds to its normal in the case of a face.
		*
		* @category Filter
		*/
		atAngleWith(direction = "Z", angle = 0) {
			const myDirection = makeDirVector(direction);
			const checkAngle = ({ normal }) => {
				if (!normal) return false;
				const angleOfNormal = Math.acos(Math.abs(normal.dot(myDirection)));
				return Math.abs(angleOfNormal - DEG2RAD * angle) < 1e-6;
			};
			this.filters.push(checkAngle);
			return this;
		}
		/**
		* Filter to find elements that are at a specified distance from a point,
		* within the given tolerance.
		*
		* @category Filter
		*/
		atDistance(distance, point = [
			0,
			0,
			0
		], tolerance = 1e-6) {
			const query = new DistanceQuery(makeVertex(point));
			const checkPoint = ({ element }) => {
				return Math.abs(query.distanceTo(element) - distance) < tolerance;
			};
			this.filters.push(checkPoint);
			return this;
		}
		/**
		* Filter to find elements that contain a certain point
		*
		* @category Filter
		*/
		containsPoint(point) {
			return this.near(point);
		}
		/**
		* Filter to find elements that are near a certain point, within the given
		* tolerance.
		*
		* @category Filter
		*/
		near(point, tolerance = 1e-6) {
			return this.atDistance(0, point, tolerance);
		}
		/**
		* Filter to find elements that are within a certain distance from a point.
		*
		* @category Filter
		*/
		withinDistance(distance, point = [
			0,
			0,
			0
		]) {
			const query = new DistanceQuery(makeVertex(point));
			const checkPoint = ({ element }) => {
				return query.distanceTo(element) - distance < 1e-6;
			};
			this.filters.push(checkPoint);
			return this;
		}
		/**
		* Filter to find elements that are within a box
		*
		* The elements that are not fully contained in the box are also found.
		*
		* @category Filter
		*/
		inBox(corner1, corner2) {
			const box = makeBox(corner1, corner2);
			return this.inShape(box);
		}
		/**
		* Filter to find elements that are within a generic shape
		*
		* The elements that are not fully contained in the shape are also found.
		*
		* @category Filter
		*/
		inShape(shape) {
			const query = new DistanceQuery(shape);
			const checkPoint = ({ element }) => {
				return query.distanceTo(element) < 1e-6;
			};
			this.filters.push(checkPoint);
			return this;
		}
	};
	//#endregion
	//#region src/finders/edgeFinder.ts
	/**
	* With an EdgeFinder you can apply a set of filters to find specific edges
	* within a shape.
	*
	* @category Finders
	*/
	var EdgeFinder = class EdgeFinder extends Finder3d {
		clone() {
			const ef = new EdgeFinder();
			ef.filters = [...this.filters];
			return ef;
		}
		/**
		* Filter to find edges that are in a certain direction
		*
		* @category Filter
		*/
		inDirection(direction) {
			return this.atAngleWith(direction, 0);
		}
		/**
		* Filter to find edges of a certain length
		*
		* @category Filter
		*/
		ofLength(length) {
			const check = ({ element }) => {
				if (typeof length === "number") return Math.abs(element.length - length) < 1e-9;
				return length(element.length);
			};
			this.filters.push(check);
			return this;
		}
		/**
		* Filter to find edges that are of a cetain curve type.
		*
		* @category Filter
		*/
		ofCurveType(curveType) {
			const check = ({ element }) => {
				return element.geomType === curveType;
			};
			this.filters.push(check);
			return this;
		}
		/**
		* Filter to find edges that are parallel to a plane.
		*
		* Note that this will work only in lines (but the method does not
		* check this assumption).
		*
		* @category Filter
		*/
		parallelTo(plane) {
			if (typeof plane === "string" && PLANE_TO_DIR[plane]) return this.atAngleWith(PLANE_TO_DIR[plane], 90);
			if (typeof plane !== "string" && plane instanceof Plane) return this.atAngleWith(plane.zDir, 90);
			if (typeof plane !== "string" && plane.normalAt) {
				const normal = plane.normalAt();
				this.atAngleWith(normal, 90);
				return this;
			}
			return this;
		}
		/**
		* Filter to find edges that within a plane.
		*
		* Note that this will work only in lines (but the method does not
		* check this assumption).
		*
		* @category Filter
		*/
		inPlane(inputPlane, origin) {
			const plane = inputPlane instanceof Plane ? makePlane(inputPlane) : makePlane(inputPlane, origin);
			this.parallelTo(plane);
			const firstPointInPlane = ({ element }) => {
				const point = element.startPoint;
				const projectedPoint = point.projectToPlane(plane);
				return point.equals(projectedPoint);
			};
			this.filters.push(firstPointInPlane);
			return this;
		}
		shouldKeep(element) {
			let normal = null;
			try {
				normal = element.tangentAt().normalized();
			} catch (error) {
				console.error("failed to compute a normal", error);
			}
			return this.filters.every((filter) => filter({
				normal,
				element
			}));
		}
		applyFilter(shape) {
			return shape.edges.filter((edge) => {
				return this.shouldKeep(edge);
			});
		}
	};
	//#endregion
	//#region src/finders/faceFinder.ts
	/**
	* With a FaceFinder you can apply a set of filters to find specific faces
	* within a shape.
	*
	* @category Finders
	*/
	var FaceFinder = class FaceFinder extends Finder3d {
		clone() {
			const ff = new FaceFinder();
			ff.filters = [...this.filters];
			return ff;
		}
		/** Filter to find faces that are parallel to plane or another face
		*
		* Note that this will work only in planar faces (but the method does not
		* check this assumption).
		*
		* @category Filter
		*/
		parallelTo(plane) {
			if (typeof plane === "string" && PLANE_TO_DIR[plane]) return this.atAngleWith(PLANE_TO_DIR[plane]);
			if (typeof plane !== "string" && plane instanceof Plane) return this.atAngleWith(plane.zDir);
			if (typeof plane !== "string" && plane.normalAt) {
				const normal = plane.normalAt();
				this.atAngleWith(normal);
				return this;
			}
			return this;
		}
		/**
		* Filter to find faces that are of a cetain surface type.
		*
		* @category Filter
		*/
		ofSurfaceType(surfaceType) {
			const check = ({ element }) => {
				return element.geomType === surfaceType;
			};
			this.filters.push(check);
			return this;
		}
		/** Filter to find faces that are contained in a plane.
		*
		* Note that this will work only in planar faces (but the method does not
		* check this assumption).
		*
		* @category Filter
		*/
		inPlane(inputPlane, origin) {
			const plane = inputPlane instanceof Plane ? makePlane(inputPlane) : makePlane(inputPlane, origin);
			this.parallelTo(plane);
			const centerInPlane = ({ element }) => {
				const point = element.center;
				const projectedPoint = point.projectToPlane(plane);
				return point.equals(projectedPoint);
			};
			this.filters.push(centerInPlane);
			return this;
		}
		shouldKeep(element) {
			const normal = element.normalAt();
			return this.filters.every((filter) => filter({
				normal,
				element
			}));
		}
		applyFilter(shape) {
			return shape.faces.filter((face) => {
				return this.shouldKeep(face);
			});
		}
	};
	//#endregion
	//#region src/finders/cornerFinder.ts
	var blueprintCorners = function(blueprint) {
		return blueprint.curves.map((curve, index) => {
			return {
				firstCurve: curve,
				secondCurve: blueprint.curves[(index + 1) % blueprint.curves.length],
				point: curve.lastPoint
			};
		});
	};
	var PI_2 = 2 * Math.PI;
	var positiveHalfAngle = (angle) => {
		const limitedAngle = angle % PI_2;
		const coterminalAngle = limitedAngle < 0 ? limitedAngle + PI_2 : limitedAngle;
		if (coterminalAngle < Math.PI) return coterminalAngle;
		if (coterminalAngle === Math.PI) return 0;
		return Math.abs(coterminalAngle - PI_2);
	};
	var CornerFinder = class CornerFinder extends Finder {
		clone() {
			const ef = new CornerFinder();
			ef.filters = [...this.filters];
			return ef;
		}
		/**
		* Filter to find corner that have their point are in the list.
		*
		* @category Filter
		*/
		inList(elementList) {
			const elementInList = ({ element }) => {
				return !!elementList.find((e) => samePoint$2(e, element.point));
			};
			this.filters.push(elementInList);
			return this;
		}
		/**
		* Filter to find elements that are at a specified distance from a point.
		*
		* @category Filter
		*/
		atDistance(distance, point = [0, 0]) {
			function elementAtDistance({ element }) {
				return Math.abs(distance2d(point, element.point) - distance) < 1e-9;
			}
			this.filters.push(elementAtDistance);
			return this;
		}
		/**
		* Filter to find elements that contain a certain point
		*
		* @category Filter
		*/
		atPoint(point) {
			function elementAtPoint({ element }) {
				return samePoint$2(point, element.point);
			}
			this.filters.push(elementAtPoint);
			return this;
		}
		/**
		* Filter to find elements that are within a box
		*
		* @category Filter
		*/
		inBox(corner1, corner2) {
			const [x1, y1] = corner1;
			const [x2, y2] = corner2;
			const minX = Math.min(x1, x2);
			const maxX = Math.max(x1, x2);
			const minY = Math.min(y1, y2);
			const maxY = Math.max(y1, y2);
			function elementInBox({ element }) {
				const [x, y] = element.point;
				return x >= minX && x <= maxX && y >= minY && y <= maxY;
			}
			this.filters.push(elementInBox);
			return this;
		}
		/**
		* Filter to find corner that a certain angle between them - only between
		* 0 and 180.
		*
		* @category Filter
		*/
		ofAngle(angle) {
			function elementOfAngle({ element }) {
				const tgt1 = element.firstCurve.tangentAt(1);
				const tgt2 = element.secondCurve.tangentAt(0);
				return Math.abs(positiveHalfAngle(angle2d(tgt1, tgt2)) - positiveHalfAngle(DEG2RAD * angle)) < 1e-9;
			}
			this.filters.push(elementOfAngle);
			return this;
		}
		shouldKeep(element) {
			return this.filters.every((filter) => filter({
				normal: null,
				element
			}));
		}
		applyFilter(blueprint) {
			return blueprintCorners(blueprint).filter((corner) => {
				return this.shouldKeep(corner);
			});
		}
	};
	//#endregion
	//#region src/finders/helpers.ts
	function getSingleFace(f, shape) {
		if (f instanceof Face) return f;
		return (f instanceof FaceFinder ? f : f(new FaceFinder(), shape)).find(shape, { unique: true });
	}
	var AXIS_INDEX = {
		X: 0,
		Y: 1,
		Z: 2
	};
	/**
	* Creates a predicate for a finder's `when` method that selects elements
	* touching an axis-aligned bounding-box extreme of a shape.
	*
	* An element is selected when its bounding-box minimum or maximum is within
	* `tolerance` of the corresponding bound of `shape`. This means that a side
	* face touching the top of a shape is considered top-most too. Combine this
	* predicate with an orientation filter when only horizontal or vertical
	* elements should be selected.
	*
	* The shape bounds are calculated once when the predicate is created. Element
	* bounds are calculated whenever the predicate is evaluated.
	*
	* @param shape - Shape whose bounds define the extremum.
	* @param axis - Cartesian axis along which to compare bounds.
	* @param extremum - Whether to compare the minimum or maximum bound.
	* @param tolerance - Maximum difference between bounds. Defaults to `1e-6`.
	* @returns A predicate that can be passed to `EdgeFinder.when` or
	* `FaceFinder.when`.
	*
	* @example
	* const topEdges = new EdgeFinder()
	*   .when(atShapeExtremum(shape, "Z", "max"))
	*   .parallelTo("XY")
	*   .find(shape);
	*
	* @category Finders
	*/
	var atShapeExtremum = (shape, axis, extremum, tolerance = 1e-6) => {
		const axisIndex = AXIS_INDEX[axis];
		const boundIndex = extremum === "min" ? 0 : 1;
		const shapeBox = shape.boundingBox;
		const shapeExtreme = shapeBox.bounds[boundIndex][axisIndex];
		shapeBox.delete();
		return ({ element }) => {
			const elementBox = element.boundingBox;
			const elementExtreme = elementBox.bounds[boundIndex][axisIndex];
			elementBox.delete();
			return Math.abs(elementExtreme - shapeExtreme) <= tolerance;
		};
	};
	/**
	* Creates a predicate selecting elements touching the shape's maximum Z bound.
	*
	* @example
	* shape.fillet(2, (finder, shape) =>
	*   finder.when(topMost(shape)).parallelTo("XY")
	* );
	*
	* @category Finders
	*/
	var topMost = (shape, tolerance = 1e-6) => atShapeExtremum(shape, "Z", "max", tolerance);
	/**
	* Creates a predicate selecting elements touching the shape's minimum Z bound.
	*
	* @example
	* finder.when(bottomMost(shape));
	*
	* @category Finders
	*/
	var bottomMost = (shape, tolerance = 1e-6) => atShapeExtremum(shape, "Z", "min", tolerance);
	/**
	* Creates a predicate selecting elements touching the shape's minimum X bound.
	*
	* @example
	* finder.when(leftMost(shape));
	*
	* @category Finders
	*/
	var leftMost = (shape, tolerance = 1e-6) => atShapeExtremum(shape, "X", "min", tolerance);
	/**
	* Creates a predicate selecting elements touching the shape's maximum X bound.
	*
	* @example
	* finder.when(rightMost(shape));
	*
	* @category Finders
	*/
	var rightMost = (shape, tolerance = 1e-6) => atShapeExtremum(shape, "X", "max", tolerance);
	/**
	* Creates a predicate selecting elements touching the shape's maximum Y bound.
	*
	* "Front" is defined as the positive Y direction.
	*
	* @example
	* finder.when(frontMost(shape));
	*
	* @category Finders
	*/
	var frontMost = (shape, tolerance = 1e-6) => atShapeExtremum(shape, "Y", "max", tolerance);
	/**
	* Creates a predicate selecting elements touching the shape's minimum Y bound.
	*
	* "Back" is defined as the negative Y direction.
	*
	* @example
	* finder.when(backMost(shape));
	*
	* @category Finders
	*/
	var backMost = (shape, tolerance = 1e-6) => atShapeExtremum(shape, "Y", "min", tolerance);
	//#endregion
	//#region src/finders/index.ts
	/**
	* Combine a set of finder filters (defined with radius) to pass as a filter
	* function.
	*
	* @param filters - An array of objects containing a filter and its radius.
	* @returns A tuple containing a filter function and a cleanup function.
	*
	* @category Finders
	*/
	var combineFinderFilters = (filters) => {
		const filter = (element) => {
			for (const { filter, radius } of filters) if (filter.shouldKeep(element)) return radius;
			return null;
		};
		return [filter, () => filters.forEach((f) => f.filter.delete())];
	};
	//#endregion
	//#region src/shapes.ts
	function isChamferRadius(r) {
		if (typeof r === "number") return true;
		if (typeof r === "object" && r !== null) {
			const obj = r;
			return "distances" in obj && Array.isArray(obj.distances) && "selectedFace" in obj || "distance" in obj && "angle" in obj && "selectedFace" in obj;
		}
		return false;
	}
	function deserializeShape(data) {
		return cast(deserializeTopoShape(data));
	}
	var Shape = class extends WrappingObj {
		constructor(ocShape) {
			super(ocShape);
		}
		clone() {
			return new this.constructor(downcast(this.wrapped));
		}
		serialize() {
			return serializeShape(this.wrapped);
		}
		get hashCode() {
			return this.oc.ReplicadShapeHasher.HashCode(this.wrapped, HASH_CODE_MAX);
		}
		get isNull() {
			return this.wrapped.IsNull();
		}
		isSame(other) {
			return this.wrapped.IsSame(other.wrapped);
		}
		isEqual(other) {
			return this.wrapped.IsEqual(other.wrapped);
		}
		/**
		* Splits the solid parts of this shape with an oriented plane and groups
		* them by side. Non-solid results are ignored.
		*
		* `offset` translates the splitting plane along its normal. Each side is
		* `null` when empty, the resulting shape when it contains one piece, or a
		* `Compound` when it contains multiple disconnected pieces. Positive is the
		* direction of the plane's normal.
		*
		* @category Shape Modifications
		*/
		split(plane = "XY", offset = 0, tolerance = 1e-7) {
			const result = splitShape(this.wrapped, plane, offset, tolerance);
			const castResult = (piece) => {
				if (!piece) return null;
				const resultShape = cast(piece);
				if (resultShape instanceof Solid || resultShape instanceof Compound) return resultShape;
				resultShape.delete();
				throw new Error("Split produced an unexpected non-solid shape");
			};
			return {
				positive: castResult(result.positive),
				negative: castResult(result.negative),
				on: castResult(result.on)
			};
		}
		/**
		* Asserts that this shape is a 3D shape (Shell, Solid, CompSolid, or
		* Compound) and returns it typed as Shape3D. Throws if the shape is not 3D.
		*
		* Useful for chaining after operations that return a generic shape type.
		*
		*/
		asShape3D() {
			if (isShape3D(this)) return this;
			throw new Error("Shape is not a 3D shape");
		}
		/**
		* Simplifies the shape by removing unnecessary edges and faces
		*/
		simplify() {
			const shapeUpgrader = new (getOC()).ShapeUpgrade_UnifySameDomain(this.wrapped, true, true, false);
			shapeUpgrader.Build();
			const newShape = cast(shapeUpgrader.Shape());
			shapeUpgrader.delete();
			if (this.constructor !== newShape.constructor) throw new Error("unexpected types mismatch");
			return newShape;
		}
		translate(vectorOrxDist, yDist = 0, zDist = 0) {
			const translation = typeof vectorOrxDist === "number" ? [
				vectorOrxDist,
				yDist,
				zDist
			] : vectorOrxDist;
			const newShape = cast(translate(this.wrapped, translation));
			this.delete();
			if (this.constructor !== newShape.constructor) throw new Error("unexpected types mismatch");
			return newShape;
		}
		/**
		* Translates the shape on the X axis
		*
		* @category Shape Transformations
		*/
		translateX(distance) {
			return this.translate([
				distance,
				0,
				0
			]);
		}
		/**
		* Translates the shape on the Y axis
		*
		* @category Shape Transformations
		*/
		translateY(distance) {
			return this.translate([
				0,
				distance,
				0
			]);
		}
		/**
		* Translates the shape on the Z axis
		*
		* @category Shape Transformations
		*/
		translateZ(distance) {
			return this.translate([
				0,
				0,
				distance
			]);
		}
		/**
		* Rotates the shape
		*
		* @category Shape Transformations
		*/
		rotate(angle, position = [
			0,
			0,
			0
		], direction = [
			0,
			0,
			1
		]) {
			const newShape = cast(rotate(this.wrapped, angle, position, direction));
			this.delete();
			if (this.constructor !== newShape.constructor) throw new Error("unexpected types mismatch");
			return newShape;
		}
		/**
		* Mirrors the shape through a plane
		*
		* @category Shape Transformations
		*/
		mirror(inputPlane, origin) {
			const newShape = cast(mirror(this.wrapped, inputPlane, origin));
			this.delete();
			if (this.constructor !== newShape.constructor) throw new Error("unexpected types mismatch");
			return newShape;
		}
		/**
		* Returns a scaled version of the shape
		*
		* @category Shape Transformations
		*/
		scale(scale$1, center = [
			0,
			0,
			0
		]) {
			const newShape = cast(scale(this.wrapped, center, scale$1));
			this.delete();
			if (this.constructor !== newShape.constructor) throw new Error("unexpected types mismatch");
			return newShape;
		}
		get edges() {
			return Array.from(iterTopo(this.wrapped, "edge"), (edge) => new Edge(edge));
		}
		get faces() {
			return Array.from(iterTopo(this.wrapped, "face"), (face) => new Face(face));
		}
		/**
		* Finds a unique edge using a finder function, which receives a fresh
		* EdgeFinder and this shape. Throws if there is not exactly one match.
		*
		* @category Finders
		*/
		findEdge(finderFcn) {
			return finderFcn(new EdgeFinder(), this).find(this, { unique: true });
		}
		/**
		* Finds all matching edges using a finder function, which receives a fresh
		* EdgeFinder and this shape.
		*
		* @category Finders
		*/
		findEdges(finderFcn) {
			return finderFcn(new EdgeFinder(), this).find(this);
		}
		/**
		* Finds a unique face using a finder function, which receives a fresh
		* FaceFinder and this shape. Throws if there is not exactly one match.
		*
		* @category Finders
		*/
		findFace(finderFcn) {
			return finderFcn(new FaceFinder(), this).find(this, { unique: true });
		}
		/**
		* Finds all matching faces using a finder function, which receives a fresh
		* FaceFinder and this shape.
		*
		* @category Finders
		*/
		findFaces(finderFcn) {
			return finderFcn(new FaceFinder(), this).find(this);
		}
		get solids() {
			return Array.from(iterTopo(this.wrapped, "solid"), (solid) => new Solid(solid));
		}
		get wires() {
			return Array.from(iterTopo(this.wrapped, "wire"), (wire) => new Wire(wire));
		}
		get boundingBox() {
			const bbox = new BoundingBox();
			this.oc.BRepBndLib.AddOptimal(this.wrapped, bbox.wrapped, false, false);
			return bbox;
		}
		/**
		* Exports the current shape as a set of triangle. These can be used by threejs
		* for instance to represent the the shape
		*
		* @category Shape Export
		*/
		mesh(options = {}) {
			return mesh(this.wrapped, options);
		}
		/**
		* Exports the current shape as a set of lines. These can be used by threejs
		* for instance to represent the edges of the shape
		*
		* @category Shape Export
		*/
		meshEdges(options = {}) {
			return meshEdges(this.wrapped, options);
		}
		/**
		* Exports the current shape as a STEP file as a Blob
		*
		* @category Shape Export
		*/
		blobSTEP() {
			return exportShapeSTEP(this.wrapped);
		}
		/**
		* Exports the current shape as a STL file as a Blob
		*
		* In order to create a STL file, the shape needs to be meshed. The
		* tolerances correspond to the values used to mesh the shape.
		*
		* @category Shape Export
		*/
		blobSTL(options = {}) {
			return exportShapeSTL(this.wrapped, options);
		}
	};
	var Vertex = class extends Shape {
		asTuple() {
			const pnt = this.oc.BRep_Tool.Pnt(this.wrapped);
			const tuple = [
				pnt.X(),
				pnt.Y(),
				pnt.Z()
			];
			pnt.delete();
			return tuple;
		}
	};
	var _1DShape = class extends Shape {
		get repr() {
			const { startPoint, endPoint } = this;
			const retVal = `start: (${this.startPoint.repr}) end:(${this.endPoint.repr})`;
			startPoint.delete();
			endPoint.delete();
			return retVal;
		}
		get curve() {
			return new Curve(this._geomAdaptor());
		}
		get startPoint() {
			return this.curve.startPoint;
		}
		get endPoint() {
			return this.curve.endPoint;
		}
		tangentAt(position = 0) {
			return this.curve.tangentAt(position);
		}
		pointAt(position = 0) {
			return this.curve.pointAt(position);
		}
		get isClosed() {
			return this.curve.isClosed;
		}
		get isPeriodic() {
			return this.curve.isPeriodic;
		}
		get period() {
			return this.curve.period;
		}
		get geomType() {
			return this.curve.curveType;
		}
		get length() {
			const properties = new this.oc.GProp_GProps();
			this.oc.BRepGProp.LinearProperties(this.wrapped, properties, true, false);
			const length = properties.Mass();
			properties.delete();
			return length;
		}
		get orientation() {
			if (this.wrapped.Orientation() === this.oc.TopAbs_Orientation.TopAbs_FORWARD) return "forward";
			return "backward";
		}
		flipOrientation() {
			return cast(this.wrapped.Reversed());
		}
	};
	var Edge = class extends _1DShape {
		_geomAdaptor() {
			return new this.oc.BRepAdaptor_Curve(this.wrapped);
		}
	};
	var Wire = class Wire extends _1DShape {
		_geomAdaptor() {
			return new this.oc.BRepAdaptor_CompCurve(this.wrapped, false);
		}
		offset2D(offset, kind = "arc") {
			const kinds = {
				arc: this.oc.GeomAbs_JoinType.GeomAbs_Arc,
				intersection: this.oc.GeomAbs_JoinType.GeomAbs_Intersection,
				tangent: this.oc.GeomAbs_JoinType.GeomAbs_Tangent
			};
			const offsetter = new this.oc.BRepOffsetAPI_MakeOffset(this.wrapped, kinds[kind], false);
			offsetter.Perform(offset, 0);
			const newShape = cast(offsetter.Shape());
			offsetter.delete();
			this.delete();
			if (!(newShape instanceof Wire)) throw new Error("Could not offset with a wire");
			return newShape;
		}
	};
	var Face = class extends Shape {
		_geomAdaptor() {
			return new this.oc.BRepAdaptor_Surface(this.wrapped, false);
		}
		get surface() {
			return new Surface(this._geomAdaptor());
		}
		get orientation() {
			if (this.wrapped.Orientation() === this.oc.TopAbs_Orientation.TopAbs_FORWARD) return "forward";
			return "backward";
		}
		flipOrientation() {
			return cast(this.wrapped.Reversed());
		}
		get geomType() {
			const surface = this.surface;
			const geomType = surface.surfaceType;
			surface.delete();
			return geomType;
		}
		get UVBounds() {
			return faceUVBounds(this.wrapped);
		}
		pointOnSurface(u, v) {
			return pointOnFace(this.wrapped, u, v);
		}
		uvCoordinates(point) {
			return faceUVCoordinates(this.wrapped, point);
		}
		normalAt(locationVector) {
			return faceNormalAt(this.wrapped, locationVector);
		}
		get center() {
			return faceCenter(this.wrapped);
		}
		outerWire() {
			const newVal = new Wire(this.oc.BRepTools.OuterWire(this.wrapped));
			this.delete();
			return newVal;
		}
		innerWires() {
			const outer = this.clone().outerWire();
			const innerWires = this.wires.filter((w) => !outer.isSame(w));
			outer.delete();
			this.delete();
			return innerWires;
		}
		triangulation(index0 = 0) {
			return triangulateFace(this.wrapped, index0);
		}
	};
	var _3DShape = class extends Shape {
		/**
		* Builds a new shape out of the two, fused, shapes
		*
		* Same-domain faces and edges are merged by default. Set
		* `options.simplify` to `false` to skip this topology cleanup.
		*
		* @category Shape Modifications
		*/
		fuse(other, options = {}) {
			const newShape = cast(fuseShapes(this.wrapped, other.wrapped, options));
			if (!isShape3D(newShape)) throw new Error("Could not fuse as a 3d shape");
			return newShape;
		}
		/**
		* Builds a new shape by removing the tool shape from this shape
		*
		* Same-domain faces and edges are merged by default. Set
		* `options.simplify` to `false` to skip this topology cleanup.
		*
		* @category Shape Modifications
		*/
		cut(tool, options = {}) {
			const newShape = cast(cutShape(this.wrapped, tool.wrapped, options));
			if (!isShape3D(newShape)) throw new Error("Could not cut as a 3d shape");
			return newShape;
		}
		/**
		* Builds a new shape by intersecting this shape and another
		*
		* Same-domain faces and edges are merged by default. Set
		* `options.simplify` to `false` to skip this topology cleanup.
		*
		* @category Shape Modifications
		*/
		intersect(tool, options) {
			const newShape = cast(intersectShapes(this.wrapped, tool.wrapped, options));
			if (!isShape3D(newShape)) throw new Error("Could not intersect as a 3d shape");
			return newShape;
		}
		/**
		* Cuts this shape with a plane and retains one of its half-spaces.
		* Positive is the direction of the plane normal and is kept by default.
		*
		* @category Shape Modifications
		*/
		cutPlane(plane = "XY", offset = 0, keep = "positive") {
			const result = cutShapeWithPlane(this.wrapped, plane, offset, keep);
			if (!result) return null;
			const newShape = cast(result);
			if (!(newShape instanceof Solid) && !(newShape instanceof Compound)) {
				newShape.delete();
				throw new Error("Could not cut plane as a solid shape");
			}
			return newShape;
		}
		meshShape(options) {
			const { triangles, vertices } = this.mesh(options);
			const tol = options?.tolerance ?? 1e-6;
			const scale = tol === 0 ? 0 : 1 / tol;
			const keyFor = (x, y, z) => {
				if (scale === 0) return `${x}|${y}|${z}`;
				return `${Math.round(x * scale)}|${Math.round(y * scale)}|${Math.round(z * scale)}`;
			};
			const mergeFrom = [];
			const mergeTo = [];
			const seen = /* @__PURE__ */ new Map();
			for (let i = 0; i < vertices.length; i += 3) {
				const x = vertices[i];
				const y = vertices[i + 1];
				const z = vertices[i + 2];
				const key = keyFor(x, y, z);
				const existing = seen.get(key);
				const idx = i / 3;
				if (existing !== void 0) {
					mergeFrom.push(idx);
					mergeTo.push(existing);
				} else seen.set(key, idx);
			}
			const meshData = {
				vertProperties: new Float32Array(vertices),
				triVerts: new Uint32Array(triangles),
				numProp: 3,
				mergeFromVert: mergeFrom.length ? new Uint32Array(mergeFrom) : void 0,
				mergeToVert: mergeTo.length ? new Uint32Array(mergeTo) : void 0
			};
			const manifold = getManifold();
			const mesh = new manifold.Mesh(meshData);
			return new MeshShape(new manifold.Manifold(mesh));
		}
		shell(thicknessOrConfig, toleranceOrFinderFcn = null, tolerance = .001) {
			const tol = typeof toleranceOrFinderFcn === "number" ? toleranceOrFinderFcn : tolerance;
			let filter;
			let thickness;
			if (typeof thicknessOrConfig === "number") {
				thickness = thicknessOrConfig;
				const ff = new FaceFinder();
				filter = typeof toleranceOrFinderFcn === "function" ? toleranceOrFinderFcn(ff, this) : ff;
			} else {
				thickness = thicknessOrConfig.thickness;
				filter = thicknessOrConfig.filter;
			}
			const filteredFaces = filter.find(this);
			const newShape = cast(shellShape(this.wrapped, {
				faces: filteredFaces,
				thickness,
				tolerance: tol
			}));
			if (!isShape3D(newShape)) throw new Error("Could not shell as a 3d shape");
			return newShape;
		}
		/**
		* Creates a new shapes with some edges filletted, as specified in the
		* radius config.
		*
		* If the radius is a filter finder object (with an EdgeFinder as filter,
		* and a radius to specifiy the fillet radius), the fillet will only be
		* applied to the edges as selected by the finder. The finder will be
		* deleted unless it is explicitly specified to `keep` it.
		*
		* If the radius is a number all the edges will be filletted.
		*
		* If the radius is a function edges will be filletted according to the
		* value returned by the function (0 or null will not add any fillet).
		*
		* @category Shape Modifications
		*/
		fillet(radiusConfig, filter) {
			let config = radiusConfig;
			if (isFilletRadius(radiusConfig) && filter) config = {
				radius: radiusConfig,
				filter: filter(new EdgeFinder(), this)
			};
			const selectedEdges = selectEdgeRadii(this.wrapped, config, isFilletRadius, (edge) => new Edge(edge));
			const newShape = cast(filletShape(this.wrapped, selectedEdges));
			if (!isShape3D(newShape)) throw new Error("Could not fillet as a 3d shape");
			return newShape;
		}
		/**
		* Creates a new shapes with some edges chamfered, as specified in the
		* radius config.
		*
		* If the radius is a filter finder object (with an EdgeFinder as filter,
		* and a radius to specifiy the chamfer radius), the fillet will only be
		* applied to the edges as selected by the finder. The finder will be
		* deleted unless it is explicitly specified to `keep` it.
		*
		* If the radius is a number all the edges will be chamfered.
		*
		* If the radius is a function edges will be chamfered according to the
		* value returned by the function (0 or null will not add any chamfer).
		*
		* @category Shape Modifications
		*/
		chamfer(radiusConfig, filter) {
			let config = radiusConfig;
			if (isChamferRadius(radiusConfig) && filter) config = {
				radius: radiusConfig,
				filter: filter(new EdgeFinder(), this)
			};
			const chamfers = mapSelectedEdges(selectEdgeRadii(this.wrapped, config, isChamferRadius, (edge) => new Edge(edge)), ({ radius, edge }) => {
				if (typeof radius === "number") return {
					radius,
					edge
				};
				const face = radius.selectedFace(new FaceFinder(), this).find(this, { unique: true });
				if (!face) throw new Error("Could not find face for chamfer");
				return "distances" in radius ? {
					edge,
					face,
					distances: radius.distances
				} : {
					edge,
					face,
					distance: radius.distance,
					angle: radius.angle
				};
			});
			const newShape = cast(chamferShape(this.wrapped, chamfers));
			if (!isShape3D(newShape)) throw new Error("Could not chamfer as a 3d shape");
			return newShape;
		}
		/**
		* Applies a draft angle to selected faces of the shape.
		*
		* A draft angle is a taper applied to faces, commonly used in moulding
		* and casting to allow parts to be released from a mould. The selected
		* faces are tilted by the given angle relative to the neutral plane.
		*
		* The face finder function receives a `FaceFinder` and should return it
		* with the desired filters applied to select which faces to draft.
		*
		* The neutral plane defines the reference from which the draft angle is
		* measured — faces are unchanged where they intersect this plane and
		* taper away from it.
		*
		* @category Shape Modifications
		*/
		draft(angle, faceFinder, neutralPlane = "XY") {
			const faces = faceFinder(new FaceFinder(), this).find(this);
			const newShape = cast(draftShape(this.wrapped, {
				faces,
				angle,
				neutralPlane
			}));
			if (!isShape3D(newShape)) throw new Error("Could not draft as a 3d shape");
			return newShape;
		}
	};
	var Shell = class extends _3DShape {};
	var Solid = class extends _3DShape {};
	var CompSolid = class extends _3DShape {};
	var Compound = class extends _3DShape {};
	function isShape3D(shape) {
		return shape instanceof Shell || shape instanceof Solid || shape instanceof CompSolid || shape instanceof Compound;
	}
	function isWire(shape) {
		return shape instanceof Wire;
	}
	var cast = makeCaster({
		vertex: Vertex,
		edge: Edge,
		wire: Wire,
		face: Face,
		shell: Shell,
		solid: Solid,
		solidCompound: CompSolid,
		compound: Compound
	});
	//#endregion
	//#region src/shapeHelpers.ts
	var makeLine = (v1, v2) => {
		return new Edge(new (getOC()).BRepBuilderAPI_MakeEdge(asPnt(v1), asPnt(v2)).Edge());
	};
	var makeCircle = (radius, center = [
		0,
		0,
		0
	], normal = [
		0,
		0,
		1
	]) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const ax = r(makeAx2(center, normal));
		const circleGp = r(new oc.gp_Circ(ax, radius));
		const shape = new Edge(r(new oc.BRepBuilderAPI_MakeEdge(circleGp)).Edge());
		gc();
		return shape;
	};
	var makeEllipse = (majorRadius, minorRadius, center = [
		0,
		0,
		0
	], normal = [
		0,
		0,
		1
	], xDir) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const ax = r(makeAx2(center, normal, xDir));
		if (minorRadius > majorRadius) throw new Error("The minor radius must be smaller than the major one");
		const ellipseGp = r(new oc.gp_Elips(ax, majorRadius, minorRadius));
		const shape = new Edge(r(new oc.BRepBuilderAPI_MakeEdge(ellipseGp)).Edge());
		gc();
		return shape;
	};
	var makeHelix = (pitch, height, radius, center = [
		0,
		0,
		0
	], dir = [
		0,
		0,
		1
	], lefthand = false) => {
		const oc = getOC();
		const [r, gc] = localGC();
		let myDir = 2 * Math.PI;
		if (lefthand) myDir = -2 * Math.PI;
		const geomLine = r(new oc.Geom2d_Line(r(new oc.gp_Pnt2d(0, 0)), r(new oc.gp_Dir2d(myDir, pitch))));
		const nTurns = height / pitch;
		const uStart = geomLine.Value(0);
		const uStop = geomLine.Value(nTurns * Math.sqrt((2 * Math.PI) ** 2 + pitch ** 2));
		const geomSeg = r(new oc.GC_MakeSegment2d(uStart, uStop));
		const geomSurf = new oc.Geom_CylindricalSurface(r(makeAx3(center, dir)), radius);
		const e = r(new oc.BRepBuilderAPI_MakeEdge(r(geomSeg.Value()), r(geomSurf))).Edge();
		const w = r(new oc.BRepBuilderAPI_MakeWire(e)).Wire();
		oc.BRepLib.BuildCurves3d(w);
		gc();
		return new Wire(w);
	};
	var makeThreePointArc = (v1, v2, v3) => {
		const oc = getOC();
		const curve = new oc.GC_MakeArcOfCircle(asPnt(v1), asPnt(v2), asPnt(v3)).Value();
		return new Edge(new oc.BRepBuilderAPI_MakeEdge(curve).Edge());
	};
	var makeEllipseArc = (majorRadius, minorRadius, startAngle, endAngle, center = [
		0,
		0,
		0
	], normal = [
		0,
		0,
		1
	], xDir) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const ax = r(makeAx2(center, normal, xDir));
		if (minorRadius > majorRadius) throw new Error("The minor radius must be smaller than the major one");
		const ellipseGp = r(new oc.gp_Elips(ax, majorRadius, minorRadius));
		const shape = new Edge(r(new oc.BRepBuilderAPI_MakeEdge(ellipseGp, startAngle, endAngle)).Edge());
		gc();
		return shape;
	};
	var makeBSplineApproximation = function makeBSplineApproximation(points, { tolerance = .001, smoothing = null, degMax = 6, degMin = 1 } = {}) {
		const oc = getOC();
		const [r, gc] = localGC();
		const pnts = r(new oc.NCollection_Array1_gp_Pnt(1, points.length));
		points.forEach((point, index) => {
			pnts.SetValue(index + 1, r(asPnt(point)));
		});
		let splineBuilder;
		if (smoothing) {
			splineBuilder = r(new oc.GeomAPI_PointsToBSpline());
			splineBuilder.Init(pnts, smoothing[0], smoothing[1], smoothing[2], degMax, oc.GeomAbs_Shape.GeomAbs_C2, tolerance);
		} else {
			splineBuilder = r(new oc.GeomAPI_PointsToBSpline());
			splineBuilder.Init(pnts, degMin, degMax, oc.GeomAbs_Shape.GeomAbs_C2, tolerance);
		}
		if (!splineBuilder.IsDone()) {
			gc();
			throw new Error("B-spline approximation failed");
		}
		const curve = r(r(splineBuilder.Curve()));
		const edge = new Edge(new oc.BRepBuilderAPI_MakeEdge(curve).Edge());
		gc();
		return edge;
	};
	var makeBezierCurve = (points) => {
		const oc = getOC();
		const arrayOfPoints = new oc.NCollection_Array1_gp_Pnt(1, points.length);
		points.forEach((p, i) => {
			arrayOfPoints.SetValue(i + 1, asPnt(p));
		});
		const curve = new oc.Geom_BezierCurve(arrayOfPoints);
		return new Edge(new oc.BRepBuilderAPI_MakeEdge(curve).Edge());
	};
	var makeTangentArc = (startPoint, startTgt, endPoint) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const curve = r(r(new oc.GC_MakeArcOfCircle(r(asPnt(startPoint)), new Vector(startTgt).wrapped, r(asPnt(endPoint))).Value()));
		const edge = new Edge(r(new oc.BRepBuilderAPI_MakeEdge(curve)).Edge());
		gc();
		return edge;
	};
	var assembleWire = (listOfEdges) => {
		const oc = getOC();
		const wireBuilder = new oc.BRepBuilderAPI_MakeWire();
		listOfEdges.forEach((e) => {
			if (e instanceof Edge) wireBuilder.Add(e.wrapped);
			if (e instanceof Wire) wireBuilder.Add(e.wrapped);
		});
		wireBuilder.Build();
		const res = wireBuilder.Error();
		if (res !== oc.BRepBuilderAPI_WireError.BRepBuilderAPI_WireDone) {
			const errorNames = /* @__PURE__ */ new Map([
				[oc.BRepBuilderAPI_WireError.BRepBuilderAPI_EmptyWire, "empty wire"],
				[oc.BRepBuilderAPI_WireError.BRepBuilderAPI_NonManifoldWire, "non manifold wire"],
				[oc.BRepBuilderAPI_WireError.BRepBuilderAPI_DisconnectedWire, "disconnected wire"]
			]);
			throw new Error(`Failed to build the wire, ${errorNames.get(res) || "unknown error"}`);
		}
		const wire = new Wire(wireBuilder.Wire());
		wireBuilder.delete();
		return wire;
	};
	var makeFace = (wire, holes) => {
		const faceBuilder = new (getOC()).BRepBuilderAPI_MakeFace(wire.wrapped, false);
		holes?.forEach((hole) => {
			faceBuilder.Add(hole.wrapped);
		});
		if (!faceBuilder.IsDone()) {
			faceBuilder.delete();
			throw new Error("Failed to build the face. Your wire might be non planar.");
		}
		const face = faceBuilder.Face();
		faceBuilder.delete();
		return new Face(face);
	};
	var makeNewFaceWithinFace = (originFace, wire) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const surface = r(oc.BRep_Tool.Surface(originFace.wrapped));
		const face = r(new oc.BRepBuilderAPI_MakeFace(surface, wire.wrapped, true)).Face();
		gc();
		return new Face(face);
	};
	var makeNonPlanarFace = (wire) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const faceBuilder = r(new oc.BRepOffsetAPI_MakeFilling(3, 15, 2, false, 1e-5, 1e-4, .01, .1, 8, 9));
		wire.edges.forEach((edge) => {
			faceBuilder.Add(r(edge).wrapped, oc.GeomAbs_Shape.GeomAbs_C0, true);
		});
		faceBuilder.Build();
		const newFace = cast(faceBuilder.Shape());
		gc();
		if (!(newFace instanceof Face)) throw new Error("Failed to create a face");
		return newFace;
	};
	/**
	* Creates a cylinder with the given radius and height.
	*
	* @category Solids
	*/
	var makeCylinder = (radius, height, location = [
		0,
		0,
		0
	], direction = [
		0,
		0,
		1
	]) => {
		const oc = getOC();
		const axis = makeAx2(location, direction);
		const cylinder = new oc.BRepPrimAPI_MakeCylinder(axis, radius, height);
		const solid = new Solid(cylinder.Shape());
		axis.delete();
		cylinder.delete();
		return solid;
	};
	/**
	* Creates a sphere with the given radius, centred on the origin.
	*
	* @category Solids
	*/
	var makeSphere = (radius) => {
		const sphereMaker = new (getOC()).BRepPrimAPI_MakeSphere(radius);
		const sphere = new Solid(sphereMaker.Shape());
		sphereMaker.delete();
		return sphere;
	};
	var EllpsoidTransform = class extends WrappingObj {
		constructor(x, y, z) {
			const oc = getOC();
			const r = GCWithScope();
			const xyRatio = Math.sqrt(x * y / z);
			const xzRatio = x / xyRatio;
			const yzRatio = y / xyRatio;
			const transform = new oc.gp_GTrsf();
			transform.SetAffinity(makeAx1([
				0,
				0,
				0
			], [
				0,
				1,
				0
			]), xzRatio);
			const xy = r(new oc.gp_GTrsf());
			xy.SetAffinity(makeAx1([
				0,
				0,
				0
			], [
				0,
				0,
				1
			]), xyRatio);
			const yz = r(new oc.gp_GTrsf());
			yz.SetAffinity(makeAx1([
				0,
				0,
				0
			], [
				1,
				0,
				0
			]), yzRatio);
			transform.Multiply(xy);
			transform.Multiply(yz);
			super(transform);
		}
		applyToPoint(p) {
			const oc = getOC();
			const coords = GCWithScope()(p.XYZ());
			this.wrapped.Transforms(coords);
			return new oc.gp_Pnt(coords);
		}
	};
	/**
	* Creates an ellipsoid with the given lengths of the axes, centred on the origin.
	*
	* @category Solids
	*/
	var makeEllipsoid = (aLength, bLength, cLength) => {
		const oc = getOC();
		const r = GCWithScope();
		const sphere = r(new oc.gp_Sphere());
		sphere.SetRadius(1);
		const sphericalSurface = r(new oc.Geom_SphericalSurface(sphere));
		const baseSurface = oc.GeomConvert.SurfaceToBSplineSurface(sphericalSurface.UReversed());
		const transform = new EllpsoidTransform(aLength, bLength, cLength);
		for (let u = 1; u <= baseSurface.NbUPoles(); u++) for (let v = 1; v <= baseSurface.NbVPoles(); v++) {
			const newPoint = transform.applyToPoint(baseSurface.Pole(u, v));
			baseSurface.SetPole(u, v, newPoint);
		}
		return makeSolid([cast(r(new oc.BRepBuilderAPI_MakeShell(baseSurface.UReversed(), false)).Shell())]);
	};
	/**
	* Creates a box with the given corner points.
	*
	* @category Solids
	*/
	var makeBox = (corner1, corner2) => {
		const boxMaker = new (getOC()).BRepPrimAPI_MakeBox(asPnt(corner1), asPnt(corner2));
		const box = new Solid(boxMaker.Solid());
		boxMaker.delete();
		return box;
	};
	var makeVertex = (point) => {
		const oc = getOC();
		const pnt = asPnt(point);
		const vertexMaker = new oc.BRepBuilderAPI_MakeVertex(pnt);
		const vertex = vertexMaker.Vertex();
		vertexMaker.delete();
		return new Vertex(vertex);
	};
	var makeOffset = (face, offset, tolerance = 1e-6) => {
		const oc = getOC();
		const offsetBuilder = new oc.BRepOffsetAPI_MakeOffsetShape();
		offsetBuilder.PerformByJoin(face.wrapped, offset, tolerance, oc.BRepOffset_Mode.BRepOffset_Skin, false, false, oc.GeomAbs_JoinType.GeomAbs_Arc, false);
		const newShape = cast(downcast(offsetBuilder.Shape()));
		offsetBuilder.delete();
		if (!isShape3D(newShape)) throw new Error("Could not offset to a 3d shape");
		return newShape;
	};
	var compoundShapes = (shapeArray) => {
		const oc = getOC();
		const builder = new oc.TopoDS_Builder();
		const compound = new oc.TopoDS_Compound();
		builder.MakeCompound(compound);
		shapeArray.forEach((s) => {
			builder.Add(compound, s.wrapped);
			s.delete();
		});
		return cast(compound);
	};
	var makeCompound = compoundShapes;
	function _weld(facesOrShells) {
		const oc = getOC();
		const shellBuilder = GCWithScope()(new oc.BRepBuilderAPI_Sewing(1e-6, true, true, true, false));
		facesOrShells.forEach(({ wrapped }) => {
			shellBuilder.Add(wrapped);
		});
		shellBuilder.Perform();
		return cast(downcast(shellBuilder.SewedShape()));
	}
	/** Welds faces and shells into a single shell.
	*
	* @param facesOrShells - An array of faces and shells to be welded.
	* @param ignoreType - If true, the function will not check if the result is
	* a shell.
	* @returns A shell that contains all the faces and shells.
	* */
	function weldShellsAndFaces(facesOrShells, ignoreType = false) {
		const shell = _weld(facesOrShells);
		if (!ignoreType && !(shell instanceof Shell)) throw new Error("Could not make a solid of faces and shells");
		return shell;
	}
	/** Welds faces and shells into a single shell and then makes a solid.
	*
	* @param facesOrShells - An array of faces and shells to be welded.
	* @returns A solid that contains all the faces and shells.
	*
	* @category Solids
	**/
	function makeSolid(facesOrShells) {
		const r = GCWithScope();
		const oc = getOC();
		const shell = _weld(facesOrShells);
		const solid = cast(r(new oc.ShapeFix_Solid()).SolidFromShell(shell.wrapped));
		if (!(solid instanceof Solid)) throw new Error("Could not make a solid of faces and shells");
		return solid;
	}
	var addHolesInFace = (face, holes) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const faceMaker = r(new oc.BRepBuilderAPI_MakeFace(face.wrapped));
		holes.forEach((wire) => {
			faceMaker.Add(wire.wrapped);
		});
		const builtFace = r(faceMaker.Face());
		const fixer = r(new oc.ShapeFix_Face(builtFace));
		fixer.FixOrientation();
		const newFace = fixer.Face();
		gc();
		return new Face(newFace);
	};
	var makePolygon = (points) => {
		if (points.length < 3) throw new Error("You need at least 3 points to make a polygon");
		return makeFace(assembleWire(zip([points, [...points.slice(1), points[0]]]).map(([p1, p2]) => makeLine(p1, p2))));
	};
	//#endregion
	//#region src/sketcherlib.ts
	var isTangent = (c) => c === "symmetric" || typeof c === "number" || Array.isArray(c) && c.length === 2;
	var defaultsSplineConfig = (config) => {
		let conf;
		if (!config) conf = { endTangent: [1, 0] };
		else if (isTangent(config)) conf = { endTangent: config };
		else conf = {
			endTangent: 0,
			...config
		};
		const { endTangent: endTgt, startFactor = 1, endFactor = 1, startTangent: startTgt } = conf;
		let endTangent;
		if (typeof endTgt === "number") endTangent = polarToCartesian(1, endTgt * DEG2RAD);
		else endTangent = endTgt;
		let startTangent;
		if (typeof startTgt === "number") startTangent = polarToCartesian(1, startTgt * DEG2RAD);
		else startTangent = startTgt;
		return {
			endTangent,
			startFactor,
			endFactor,
			startTangent
		};
	};
	function radianAngle(ux, uy, vx, vy) {
		const dot = ux * vx + uy * vy;
		const mod = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
		let rad = Math.acos(dot / mod);
		if (ux * vy - uy * vx < 0) rad = -rad;
		return rad;
	}
	function convertSvgEllipseParams([x1, y1], [x2, y2], rx, ry, phi, fA, fS) {
		const PIx2 = Math.PI * 2;
		if (rx < 0) rx = -rx;
		if (ry < 0) ry = -ry;
		if (rx == 0 || ry == 0) throw Error("rx and ry can not be 0");
		const s_phi = Math.sin(phi);
		const c_phi = Math.cos(phi);
		const hd_x = (x1 - x2) / 2;
		const hd_y = (y1 - y2) / 2;
		const hs_x = (x1 + x2) / 2;
		const hs_y = (y1 + y2) / 2;
		const x1_ = c_phi * hd_x + s_phi * hd_y;
		const y1_ = c_phi * hd_y - s_phi * hd_x;
		const lambda = x1_ * x1_ / (rx * rx) + y1_ * y1_ / (ry * ry);
		if (lambda > 1) {
			rx = rx * Math.sqrt(lambda);
			ry = ry * Math.sqrt(lambda);
		}
		const rxry = rx * ry;
		const rxy1_ = rx * y1_;
		const ryx1_ = ry * x1_;
		const sum_of_sq = rxy1_ * rxy1_ + ryx1_ * ryx1_;
		if (!sum_of_sq) throw Error("start point can not be same as end point");
		let coe = Math.sqrt(Math.abs((rxry * rxry - sum_of_sq) / sum_of_sq));
		if (fA == fS) coe = -coe;
		const cx_ = coe * rxy1_ / ry;
		const cy_ = -coe * ryx1_ / rx;
		const cx = c_phi * cx_ - s_phi * cy_ + hs_x;
		const cy = s_phi * cx_ + c_phi * cy_ + hs_y;
		const xcr1 = (x1_ - cx_) / rx;
		const xcr2 = (x1_ + cx_) / rx;
		const ycr1 = (y1_ - cy_) / ry;
		const ycr2 = (y1_ + cy_) / ry;
		const startAngle = radianAngle(1, 0, xcr1, ycr1);
		let deltaAngle = radianAngle(xcr1, ycr1, -xcr2, -ycr2);
		while (deltaAngle > PIx2) deltaAngle -= PIx2;
		while (deltaAngle < 0) deltaAngle += PIx2;
		if (!fS) deltaAngle -= PIx2;
		let endAngle = startAngle + deltaAngle;
		while (endAngle > PIx2) endAngle -= PIx2;
		while (endAngle < 0) endAngle += PIx2;
		return {
			cx,
			cy,
			startAngle,
			deltaAngle,
			endAngle,
			clockwise: !!fS,
			rx,
			ry
		};
	}
	//#endregion
	//#region src/sketches/extrudeUntil.ts
	/**
	* Splits a finite prism and keeps the solid containing its entire starting cap.
	* A valid limit must separate the prism into exactly two solids, with the
	* starting and temporary far caps in different pieces. In particular, a face
	* that misses part of the profile must not return an untrimmed prism.
	*/
	function splitPrismUntil(profile, target, extrusionVector) {
		const oc = getOC();
		const [r, gc] = localGC();
		try {
			const prism = r(new oc.BRepPrimAPI_MakePrism(profile.wrapped, extrusionVector.wrapped, false, true));
			if (!prism.IsDone()) return null;
			const argumentsList = r(new oc.NCollection_List_TopoDS_Shape());
			argumentsList.Append(r(prism.Shape()));
			const toolsList = r(new oc.NCollection_List_TopoDS_Shape());
			toolsList.Append(target.wrapped);
			const splitter = r(new oc.BRepAlgoAPI_Splitter());
			splitter.SetNonDestructive(true);
			splitter.SetArguments(argumentsList);
			splitter.SetTools(toolsList);
			splitter.Build();
			if (splitter.HasErrors() || !splitter.IsDone()) return null;
			const raw = r(splitter.Shape());
			if (raw.IsNull()) return null;
			const solids = r(cast(raw)).solids.map(r);
			if (solids.length !== 2) return null;
			const capAfterSplit = (cap) => {
				const modified = r(splitter.Modified(cap));
				if (modified.Size() === 1) return r(modified.First());
				if (!modified.IsEmpty() || splitter.IsDeleted(cap)) return null;
				return cap;
			};
			const start = capAfterSplit(r(prism.FirstShape()));
			const end = capAfterSplit(r(prism.LastShape()));
			if (!start || !end) return null;
			const pieces = solids.map((solid) => {
				const faces = solid.faces.map(r);
				return {
					solid,
					atStart: faces.some((face) => face.wrapped.IsSame(start)),
					atEnd: faces.some((face) => face.wrapped.IsSame(end))
				};
			});
			const kept = pieces.filter((piece) => piece.atStart && !piece.atEnd);
			const discarded = pieces.filter((piece) => piece.atEnd && !piece.atStart);
			if (kept.length !== 1 || discarded.length !== 1) return null;
			const solid = kept[0].solid;
			if (!r(new oc.BRepCheck_Analyzer(solid.wrapped, true)).IsValid()) return null;
			return solid.clone();
		} finally {
			gc();
		}
	}
	/**
	* Builds only the extrusion from explicit geometry and direction. No face
	* selection or sketch ownership rules are applied here. None of the inputs
	* are consumed. The finite, trimmed limiting face must fully cap the sweep once
	* and must not cross the profile. The supplied direction is preferred; its
	* reverse is tried when it cannot reach a complete cap.
	*/
	function extrudeFaceUntil(profile, target, extrusionDirection) {
		const oc = getOC();
		const [r, gc] = localGC();
		const failure = "Could not extrude the sketch to the limiting face";
		try {
			const direction = r(new Vector(extrusionDirection));
			if (!Number.isFinite(direction.Length) || direction.Length === 0) throw new Error("The extrusion direction must be a non-zero finite vector");
			direction.normalize();
			const finiteBounds = (face) => {
				const box = r(face.boundingBox);
				const bounds = box.wrapped.IsVoid() || box.wrapped.IsOpen() ? null : box.bounds;
				if (!bounds || bounds.some((corner) => corner.some((value) => !Number.isFinite(value) || oc.Precision.IsInfinite(value)))) throw new Error(`${failure}: the profile and limit must have finite bounds`);
				return bounds;
			};
			const profileBounds = finiteBounds(profile);
			const targetBounds = finiteBounds(target);
			let min = 0;
			let max = 0;
			direction.toTuple().forEach((component, axis) => {
				const low = targetBounds[0][axis] - profileBounds[1][axis];
				const high = targetBounds[1][axis] - profileBounds[0][axis];
				min += component * (component >= 0 ? low : high);
				max += component * (component >= 0 ? high : low);
			});
			if (!Number.isFinite(min) || !Number.isFinite(max)) throw new Error(`${failure}: the sweep extent must be finite`);
			const tolerance = oc.Precision.Confusion();
			const margin = Math.max(100 * tolerance, (max - min) * .001);
			for (const [sign, extent] of [[1, max], [-1, -min]]) {
				if (extent <= tolerance) continue;
				const solid = splitPrismUntil(profile, target, r(direction.multiply(sign * (extent + margin))));
				if (solid) return solid;
			}
			throw new Error(`${failure}: the face must fully cap the extrusion once without crossing the profile`);
		} finally {
			gc();
		}
	}
	//#endregion
	//#region src/addThickness.ts
	var basicFaceExtrusion = (face, extrusionVec) => {
		const solidBuilder = new (getOC()).BRepPrimAPI_MakePrism(face.wrapped, extrusionVec.wrapped, false, true);
		const solid = new Solid(downcast(solidBuilder.Shape()));
		solidBuilder.delete();
		return solid;
	};
	var revolution = (face, center = [
		0,
		0,
		0
	], direction = [
		0,
		0,
		1
	], angle = 360) => {
		const oc = getOC();
		const ax = makeAx1(center, direction);
		const revolBuilder = new oc.BRepPrimAPI_MakeRevol(face.wrapped, ax, angle * DEG2RAD, false);
		const shape = cast(revolBuilder.Shape());
		ax.delete();
		revolBuilder.delete();
		if (!isShape3D(shape)) throw new Error("Could not revolve to a 3d shape");
		return shape;
	};
	function genericSweep(wire, spine, { frenet = false, auxiliarySpine, law = null, transitionMode = "right", withContact, support, forceProfileSpineOthogonality } = {}, shellMode = false) {
		const oc = getOC();
		const withCorrection = transitionMode === "round" ? true : !!forceProfileSpineOthogonality;
		const sweepBuilder = new oc.BRepOffsetAPI_MakePipeShell(spine.wrapped);
		if (transitionMode) {
			const mode = {
				transformed: oc.BRepBuilderAPI_TransitionMode.BRepBuilderAPI_Transformed,
				round: oc.BRepBuilderAPI_TransitionMode.BRepBuilderAPI_RoundCorner,
				right: oc.BRepBuilderAPI_TransitionMode.BRepBuilderAPI_RightCorner
			}[transitionMode];
			if (mode) sweepBuilder.SetTransitionMode(mode);
		}
		if (support) sweepBuilder.SetMode(support);
		else if (frenet) sweepBuilder.SetMode(frenet);
		if (auxiliarySpine) sweepBuilder.SetMode(auxiliarySpine.wrapped, false, oc.BRepFill_TypeOfContact.BRepFill_NoContact);
		if (!law) sweepBuilder.Add(wire.wrapped, !!withContact, withCorrection);
		else sweepBuilder.SetLaw(wire.wrapped, law, !!withContact, withCorrection);
		sweepBuilder.Build();
		if (!shellMode) sweepBuilder.MakeSolid();
		const shape = cast(sweepBuilder.Shape());
		if (!isShape3D(shape)) throw new Error("Could not sweep to a 3d shape");
		if (shellMode) {
			const startWire = cast(sweepBuilder.FirstShape());
			const endWire = cast(sweepBuilder.LastShape());
			if (!isWire(startWire)) throw new Error("Could not sweep with one start wire");
			if (!isWire(endWire)) throw new Error("Could not sweep with one end wire");
			sweepBuilder.delete();
			return [
				shape,
				startWire,
				endWire
			];
		}
		sweepBuilder.delete();
		return shape;
	}
	var buildLawFromProfile = (extrusionLength, { profile, endFactor = 1 }) => {
		let law;
		const oc = getOC();
		if (profile === "s-curve") {
			law = new oc.Law_S();
			law.Set(0, 1, extrusionLength, endFactor);
		} else if (profile === "linear") {
			law = new oc.Law_Linear();
			law.Set(0, 1, extrusionLength, endFactor);
		} else throw new Error("Could not generate a law function");
		return law.Trim(0, extrusionLength, 1e-6);
	};
	var supportExtrude = (wire, center, normal, support) => {
		const centerVec = new Vector(center);
		const normalVec = new Vector(normal);
		return genericSweep(wire, assembleWire([makeLine(centerVec, centerVec.add(normalVec))]), { support });
	};
	function complexExtrude(wire, center, normal, profileShape, shellMode = false) {
		const centerVec = new Vector(center);
		const normalVec = new Vector(normal);
		const spine = assembleWire([makeLine(centerVec, centerVec.add(normalVec))]);
		const law = profileShape ? buildLawFromProfile(normalVec.Length, profileShape) : null;
		return shellMode ? genericSweep(wire, spine, { law }, shellMode) : genericSweep(wire, spine, { law }, shellMode);
	}
	function twistExtrude(wire, angleDegrees, center, normal, profileShape, shellMode = false) {
		const centerVec = new Vector(center);
		const normalVec = new Vector(normal);
		const spine = assembleWire([makeLine(centerVec, centerVec.add(normalVec))]);
		const auxiliarySpine = makeHelix(360 / angleDegrees * normalVec.Length, normalVec.Length, 1, center, normal);
		const law = profileShape ? buildLawFromProfile(normalVec.Length, profileShape) : null;
		return shellMode ? genericSweep(wire, spine, {
			auxiliarySpine,
			law
		}, shellMode) : genericSweep(wire, spine, {
			auxiliarySpine,
			law
		}, shellMode);
	}
	var loft = (wires, { ruled = true, startPoint, endPoint } = {}, returnShell = false) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const loftBuilder = r(new oc.BRepOffsetAPI_ThruSections(!returnShell, ruled, 1e-6));
		if (startPoint) loftBuilder.AddVertex(r(makeVertex(startPoint)).wrapped);
		wires.forEach((w) => loftBuilder.AddWire(w.wrapped));
		if (endPoint) loftBuilder.AddVertex(r(makeVertex(endPoint)).wrapped);
		loftBuilder.Build();
		const shape = cast(loftBuilder.Shape());
		gc();
		if (!isShape3D(shape)) throw new Error("Could not loft to a 3d shape");
		return shape;
	};
	//#endregion
	//#region src/sketches/Sketch.ts
	/**
	* A line drawing to be acted upon. It defines directions to be acted upon by
	* definition (extrusion direction for instance).
	*
	* Note that all operations will delete the sketch
	*
	* @category Sketching
	*/
	var Sketch = class Sketch {
		constructor(wire, { defaultOrigin = [
			0,
			0,
			0
		], defaultDirection = [
			0,
			0,
			1
		] } = {}) {
			this.wire = wire;
			this.defaultOrigin = defaultOrigin;
			this.defaultDirection = defaultDirection;
			this.baseFace = null;
		}
		get baseFace() {
			return this._baseFace;
		}
		set baseFace(newFace) {
			if (!newFace) this._baseFace = newFace;
			else this._baseFace = newFace.clone();
		}
		delete() {
			this.wire.delete();
			this._defaultOrigin.delete();
			this._defaultDirection.delete();
			this.baseFace && this.baseFace.delete();
		}
		clone() {
			const sketch = new Sketch(this.wire.clone(), {
				defaultOrigin: this.defaultOrigin,
				defaultDirection: this.defaultDirection
			});
			if (this.baseFace) sketch.baseFace = this.baseFace.clone();
			return sketch;
		}
		get defaultOrigin() {
			return this._defaultOrigin;
		}
		set defaultOrigin(newOrigin) {
			this._defaultOrigin = new Vector(newOrigin);
		}
		get defaultDirection() {
			return this._defaultDirection;
		}
		set defaultDirection(newDirection) {
			this._defaultDirection = new Vector(newDirection);
		}
		/**
		* Transforms the lines into a face. The lines should be closed.
		*/
		face() {
			let face;
			if (!this.baseFace) face = makeFace(this.wire);
			else face = makeNewFaceWithinFace(this.baseFace, this.wire);
			return face;
		}
		wires() {
			return this.wire.clone();
		}
		faces() {
			return this.face();
		}
		/**
		* Revolves the drawing on an axis (defined by its direction and an origin
		* (defaults to the sketch origin)
		*/
		revolve(revolutionAxis, { origin, angle } = {}) {
			const face = makeFace(this.wire);
			const solid = revolution(face, origin || this.defaultOrigin, revolutionAxis, angle);
			face.delete();
			this.delete();
			return solid;
		}
		/**
		* Extrudes this sketch up to a limiting face, returning only the new solid.
		* The face is not modified or consumed. The sketch's default direction is
		* used unless overridden; the reverse direction is tried if needed.
		* The finite, trimmed limiting face must fully cap the extrusion once
		* without crossing the profile. Use a trimmed face for closed surfaces.
		* The sketch is consumed on success, like `extrude`, but retained on failure.
		*/
		extrudeUntil(limitingFace, { extrusionDirection } = {}) {
			const [r, gc] = localGC();
			try {
				const solid = extrudeFaceUntil(r(this.face()), limitingFace, extrusionDirection ?? this.defaultDirection);
				this.delete();
				return solid;
			} finally {
				gc();
			}
		}
		/** Extrudes the sketch to a certain distance.(along the default direction
		* and origin of the sketch).
		*
		* You can define another extrusion direction or origin,
		*
		* It is also possible to twist extrude with an angle (in degrees), or to
		* give a profile to the extrusion (the endFactor will scale the face, and
		* the profile will define how the scale is applied (either linarly or with
		* a s-shape).
		*/
		extrude(extrusionDistance, { extrusionDirection, extrusionProfile, twistAngle, origin } = {}) {
			const [r, gc] = localGC();
			const extrusionVec = r(new Vector(extrusionDirection || this.defaultDirection).normalized().multiply(extrusionDistance));
			if (extrusionProfile && !twistAngle) {
				const solid = complexExtrude(this.wire, origin || this.defaultOrigin, extrusionVec, extrusionProfile);
				gc();
				this.delete();
				return solid;
			}
			if (twistAngle) {
				const solid = twistExtrude(this.wire, twistAngle, origin || this.defaultOrigin, extrusionVec, extrusionProfile);
				gc();
				this.delete();
				return solid;
			}
			const solid = basicFaceExtrusion(makeFace(this.wire), extrusionVec);
			gc();
			this.delete();
			return solid;
		}
		/**
		* Sweep along this sketch another sketch defined in the function
		* `sketchOnPlane`.
		*
		* TODO: clean the interface of the sweep config to make it more
		* understandable.
		*/
		sweepSketch(sketchOnPlane, sweepConfig = {}) {
			const startPoint = this.wire.startPoint;
			const normal = this.wire.tangentAt(1e-9).multiply(-1).normalize();
			const sketch = sketchOnPlane(new Plane(startPoint, normal.cross(this.defaultDirection).multiply(-1), normal), startPoint);
			const config = {
				forceProfileSpineOthogonality: true,
				...sweepConfig
			};
			if (this.baseFace) config.support = this.baseFace.wrapped;
			const shape = genericSweep(sketch.wire, this.wire, config);
			this.delete();
			return shape;
		}
		/** Loft between this sketch and another sketch (or an array of them)
		*
		* You can also define a `startPoint` for the loft (that will be placed
		* before this sketch) and an `endPoint` after the last one.
		*
		* You can also define if you want the loft to result in a ruled surface.
		*
		* Note that all sketches will be deleted by this operation
		*/
		loftWith(otherSketches, loftConfig = {}, returnShell = false) {
			const sketchArray = Array.isArray(otherSketches) ? [this, ...otherSketches] : [this, otherSketches];
			const shape = loft(sketchArray.map((s) => s.wire), loftConfig, returnShell);
			sketchArray.forEach((s) => s.delete());
			return shape;
		}
	};
	//#endregion
	//#region src/Sketcher.ts
	/**
	* The FaceSketcher allows you to sketch on a plane.
	*
	* @category Sketching
	*/
	var Sketcher = class {
		constructor(plane, origin) {
			this.plane = plane instanceof Plane ? makePlane(plane) : makePlane(plane, origin);
			this.pointer = new Vector(this.plane.origin);
			this.firstPoint = new Vector(this.plane.origin);
			this.pendingEdges = [];
			this._mirrorWire = false;
		}
		delete() {
			this.plane.delete();
		}
		_updatePointer(newPointer) {
			this.pointer = newPointer;
		}
		movePointerTo([x, y]) {
			if (this.pendingEdges.length) throw new Error("You can only move the pointer if there is no edge defined");
			this._updatePointer(this.plane.toWorldCoords([x, y]));
			this.firstPoint = new Vector(this.pointer);
			return this;
		}
		lineTo([x, y]) {
			const endPoint = this.plane.toWorldCoords([x, y]);
			this.pendingEdges.push(makeLine(this.pointer, endPoint));
			this._updatePointer(endPoint);
			return this;
		}
		line(xDist, yDist) {
			const pointer = this.plane.toLocalCoords(this.pointer);
			return this.lineTo([xDist + pointer.x, yDist + pointer.y]);
		}
		vLine(distance) {
			return this.line(0, distance);
		}
		hLine(distance) {
			return this.line(distance, 0);
		}
		vLineTo(yPos) {
			const pointer = this.plane.toLocalCoords(this.pointer);
			return this.lineTo([pointer.x, yPos]);
		}
		hLineTo(xPos) {
			const pointer = this.plane.toLocalCoords(this.pointer);
			return this.lineTo([xPos, pointer.y]);
		}
		polarLine(distance, angle) {
			const [x, y] = polarToCartesian(distance, angle * DEG2RAD);
			return this.line(x, y);
		}
		polarLineTo([r, theta]) {
			const point = polarToCartesian(r, theta * DEG2RAD);
			return this.lineTo(point);
		}
		tangentLine(distance) {
			const [r, gc] = localGC();
			const previousEdge = this.pendingEdges.length ? this.pendingEdges[this.pendingEdges.length - 1] : null;
			if (!previousEdge) throw new Error("you need a previous edge to create a tangent line");
			const endPoint = r(r(previousEdge.tangentAt(1)).normalized().multiply(distance)).add(this.pointer);
			this.pendingEdges.push(makeLine(this.pointer, endPoint));
			this._updatePointer(endPoint);
			gc();
			return this;
		}
		threePointsArcTo(end, innerPoint) {
			const gpoint1 = this.plane.toWorldCoords(innerPoint);
			const gpoint2 = this.plane.toWorldCoords(end);
			this.pendingEdges.push(makeThreePointArc(this.pointer, gpoint1, gpoint2));
			this._updatePointer(gpoint2);
			return this;
		}
		threePointsArc(xDist, yDist, viaXDist, viaYDist) {
			const pointer = this.plane.toLocalCoords(this.pointer);
			return this.threePointsArcTo([pointer.x + xDist, pointer.y + yDist], [pointer.x + viaXDist, pointer.y + viaYDist]);
		}
		tangentArcTo(end) {
			const endPoint = this.plane.toWorldCoords(end);
			const previousEdge = this.pendingEdges[this.pendingEdges.length - 1];
			this.pendingEdges.push(makeTangentArc(previousEdge.endPoint, previousEdge.tangentAt(1), endPoint));
			this._updatePointer(endPoint);
			return this;
		}
		tangentArc(xDist, yDist) {
			const pointer = this.plane.toLocalCoords(this.pointer);
			return this.tangentArcTo([xDist + pointer.x, yDist + pointer.y]);
		}
		sagittaArcTo(end, sagitta) {
			const startPoint = this.pointer;
			const endPoint = this.plane.toWorldCoords(end);
			let p = endPoint.add(startPoint);
			const midPoint = p.multiply(.5);
			p = endPoint.sub(startPoint);
			const sagVector = p.cross(this.plane.zDir).normalized().multiply(sagitta);
			const sagPoint = midPoint.add(sagVector);
			this.pendingEdges.push(makeThreePointArc(this.pointer, sagPoint, endPoint));
			this._updatePointer(endPoint);
			return this;
		}
		sagittaArc(xDist, yDist, sagitta) {
			const pointer = this.plane.toLocalCoords(this.pointer);
			return this.sagittaArcTo([xDist + pointer.x, yDist + pointer.y], sagitta);
		}
		vSagittaArc(distance, sagitta) {
			return this.sagittaArc(0, distance, sagitta);
		}
		hSagittaArc(distance, sagitta) {
			return this.sagittaArc(distance, 0, sagitta);
		}
		bulgeArcTo(end, bulge) {
			if (!bulge) return this.lineTo(end);
			const pointer = this.plane.toLocalCoords(this.pointer);
			const halfChord = distance2d([pointer.x, pointer.y], end) / 2;
			const bulgeAsSagitta = -bulge * halfChord;
			return this.sagittaArcTo(end, bulgeAsSagitta);
		}
		bulgeArc(xDist, yDist, bulge) {
			const pointer = this.plane.toLocalCoords(this.pointer);
			return this.bulgeArcTo([xDist + pointer.x, yDist + this.pointer.y], bulge);
		}
		vBulgeArc(distance, bulge) {
			return this.bulgeArc(0, distance, bulge);
		}
		hBulgeArc(distance, bulge) {
			return this.bulgeArc(distance, 0, bulge);
		}
		ellipseTo(end, horizontalRadius, verticalRadius, rotation = 0, longAxis = false, sweep = false) {
			const [r, gc] = localGC();
			const start = this.plane.toLocalCoords(this.pointer);
			let rotationAngle = rotation;
			let majorRadius = horizontalRadius;
			let minorRadius = verticalRadius;
			if (horizontalRadius < verticalRadius) {
				rotationAngle = rotation + 90;
				majorRadius = verticalRadius;
				minorRadius = horizontalRadius;
			}
			const { cx, cy, rx, ry, startAngle, endAngle, clockwise } = convertSvgEllipseParams([start.x, start.y], end, majorRadius, minorRadius, rotationAngle * DEG2RAD, longAxis, sweep);
			const xDir = r(new Vector(this.plane.xDir).rotate(rotationAngle, this.plane.origin, this.plane.zDir));
			const arc = makeEllipseArc(rx, ry, clockwise ? startAngle : endAngle, clockwise ? endAngle : startAngle, r(this.plane.toWorldCoords([cx, cy])), this.plane.zDir, xDir);
			if (!clockwise) arc.wrapped.Reverse();
			this.pendingEdges.push(arc);
			this._updatePointer(this.plane.toWorldCoords(end));
			gc();
			return this;
		}
		ellipse(xDist, yDist, horizontalRadius, verticalRadius, rotation = 0, longAxis = false, sweep = false) {
			const pointer = this.plane.toLocalCoords(this.pointer);
			return this.ellipseTo([xDist + pointer.x, yDist + pointer.y], horizontalRadius, verticalRadius, rotation, longAxis, sweep);
		}
		halfEllipseTo(end, verticalRadius, sweep = false) {
			const pointer = this.plane.toLocalCoords(this.pointer);
			const start = [pointer.x, pointer.y];
			const angle = polarAngle2d(end, start);
			const distance = distance2d(end, start);
			return this.ellipseTo(end, distance / 2, verticalRadius, angle * RAD2DEG, false, sweep);
		}
		halfEllipse(xDist, yDist, verticalRadius, sweep = false) {
			const pointer = this.plane.toLocalCoords(this.pointer);
			return this.halfEllipseTo([xDist + pointer.x, yDist + pointer.y], verticalRadius, sweep);
		}
		bezierCurveTo(end, controlPoints) {
			let cp;
			if (controlPoints.length === 2 && !Array.isArray(controlPoints[0])) cp = [controlPoints];
			else cp = controlPoints;
			const inWorldPoints = cp.map((p) => this.plane.toWorldCoords(p));
			const endPoint = this.plane.toWorldCoords(end);
			this.pendingEdges.push(makeBezierCurve([
				this.pointer,
				...inWorldPoints,
				endPoint
			]));
			this._updatePointer(endPoint);
			return this;
		}
		quadraticBezierCurveTo(end, controlPoint) {
			return this.bezierCurveTo(end, [controlPoint]);
		}
		cubicBezierCurveTo(end, startControlPoint, endControlPoint) {
			return this.bezierCurveTo(end, [startControlPoint, endControlPoint]);
		}
		smoothSplineTo(end, config) {
			const [r, gc] = localGC();
			const { endTangent, startTangent, startFactor, endFactor } = defaultsSplineConfig(config);
			const endPoint = this.plane.toWorldCoords(end);
			const previousEdge = this.pendingEdges.length ? this.pendingEdges[this.pendingEdges.length - 1] : null;
			const defaultDistance = r(endPoint.sub(this.pointer)).Length * .25;
			let startPoleDirection;
			if (startTangent) startPoleDirection = this.plane.toWorldCoords(startTangent);
			else if (!previousEdge) startPoleDirection = this.plane.toWorldCoords([1, 0]);
			else if (previousEdge.geomType === "BEZIER_CURVE") {
				const rawCurve = r(previousEdge.curve).wrapped.Bezier();
				const previousPole = r(new Vector(rawCurve.Pole(rawCurve.NbPoles() - 1)));
				startPoleDirection = r(this.pointer.sub(previousPole));
			} else startPoleDirection = r(previousEdge.tangentAt(1));
			const poleDistance = r(startPoleDirection.normalized().multiply(startFactor * defaultDistance));
			const startControl = r(this.pointer.add(poleDistance));
			let endPoleDirection;
			if (endTangent === "symmetric") endPoleDirection = r(startPoleDirection.multiply(-1));
			else endPoleDirection = r(this.plane.toWorldCoords(endTangent));
			const endPoleDistance = r(endPoleDirection.normalized().multiply(endFactor * defaultDistance));
			const endControl = r(endPoint.sub(endPoleDistance));
			this.pendingEdges.push(makeBezierCurve([
				this.pointer,
				startControl,
				endControl,
				endPoint
			]));
			this._updatePointer(endPoint);
			gc();
			return this;
		}
		smoothSpline(xDist, yDist, splineConfig = {}) {
			const pointer = this.plane.toLocalCoords(this.pointer);
			return this.smoothSplineTo([xDist + pointer.x, yDist + pointer.y], splineConfig);
		}
		_mirrorWireOnStartEnd(wire) {
			const normal = this.pointer.sub(this.firstPoint).normalize().cross(this.plane.zDir);
			return assembleWire([wire, wire.clone().mirror(normal, this.pointer)]);
		}
		buildWire() {
			if (!this.pendingEdges.length) throw new Error("No lines to convert into a wire");
			let wire = assembleWire(this.pendingEdges);
			if (this._mirrorWire) wire = this._mirrorWireOnStartEnd(wire);
			return wire;
		}
		_closeSketch() {
			if (!this.pointer.equals(this.firstPoint) && !this._mirrorWire) {
				const endpoint = this.plane.toLocalCoords(this.firstPoint);
				this.lineTo([endpoint.x, endpoint.y]);
			}
		}
		done() {
			return new Sketch(this.buildWire(), {
				defaultOrigin: this.plane.origin,
				defaultDirection: this.plane.zDir
			});
		}
		close() {
			this._closeSketch();
			return this.done();
		}
		closeWithMirror() {
			this._mirrorWire = true;
			return this.close();
		}
	};
	//#endregion
	//#region src/curves.ts
	var curvesBoundingBox = (curves) => {
		const oc = getOC();
		const boundBox = new oc.Bnd_Box2d();
		curves.forEach((c) => {
			oc.BndLib_Add2dCurve.Add(c.wrapped, 1e-6, boundBox);
		});
		return new BoundingBox2d(boundBox);
	};
	function curvesAsEdgesOnPlane(curves, plane) {
		const [r, gc] = localGC();
		const ax = r(makeAx2(plane.origin, plane.zDir, plane.xDir));
		const oc = getOC();
		const edges = curves.map((curve) => {
			const curve3d = oc.GeomLib.To3d(ax, curve.wrapped);
			return new Edge(new oc.BRepBuilderAPI_MakeEdge(curve3d).Edge());
		});
		gc();
		return edges;
	}
	var curvesAsEdgesOnSurface = (curves, geomSurf) => {
		const [r, gc] = localGC();
		const oc = getOC();
		const modifiedCurves = curves.map((curve) => {
			return new Edge(r(new oc.BRepBuilderAPI_MakeEdge(curve.wrapped, geomSurf)).Edge());
		});
		gc();
		return modifiedCurves;
	};
	var transformCurves = (curves, transformation) => {
		const oc = getOC();
		return curves.map((curve) => {
			if (!transformation) return curve.clone();
			return new Curve2D(oc.GeomLib.GTransform(curve.wrapped, transformation));
		});
	};
	var Transformation2D = class extends WrappingObj {
		transformCurves(curves) {
			return transformCurves(curves, this.wrapped);
		}
	};
	var stretchTransform2d = (ratio, direction, origin = [0, 0]) => {
		const oc = getOC();
		const axis = axis2d(origin, direction);
		const transform = new oc.gp_GTrsf2d();
		transform.SetAffinity(axis, ratio);
		axis.delete();
		return new Transformation2D(transform);
	};
	var translationTransform2d = (translation) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const rotation = new oc.gp_Trsf2d();
		rotation.SetTranslation(r(vec(translation)));
		const transform = new oc.gp_GTrsf2d(rotation);
		gc();
		return new Transformation2D(transform);
	};
	var mirrorTransform2d = (centerOrDirection, origin = [0, 0], mode = "center") => {
		const oc = getOC();
		const [r, gc] = localGC();
		const rotation = new oc.gp_Trsf2d();
		if (mode === "center") rotation.SetMirror(r(pnt(centerOrDirection)));
		else rotation.SetMirror(r(axis2d(origin, centerOrDirection)));
		const transform = new oc.gp_GTrsf2d(rotation);
		gc();
		return new Transformation2D(transform);
	};
	var rotateTransform2d = (angle, center = [0, 0]) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const rotation = new oc.gp_Trsf2d();
		rotation.SetRotation(r(pnt(center)), angle);
		const transform = new oc.gp_GTrsf2d(rotation);
		gc();
		return new Transformation2D(transform);
	};
	var scaleTransform2d = (scaleFactor, center = [0, 0]) => {
		const oc = getOC();
		const [r, gc] = localGC();
		const scaling = new oc.gp_Trsf2d();
		scaling.SetScale(r(pnt(center)), scaleFactor);
		const transform = new oc.gp_GTrsf2d(scaling);
		gc();
		return new Transformation2D(transform);
	};
	function curvesAsEdgesOnFace(curves, face, scale = "original") {
		const [r, gc] = localGC();
		const oc = getOC();
		let geomSurf = r(oc.BRep_Tool.Surface(face.wrapped));
		const bounds = face.UVBounds;
		let transformation = null;
		const uAxis = r(axis2d([0, 0], [0, 1]));
		const vAxis = r(axis2d([0, 0], [1, 0]));
		if (scale === "original" && face.geomType !== "PLANE") {
			if (face.geomType !== "CYLINDRE") throw new Error("Only planar and cylidrical faces can be unwrapped for sketching");
			const cylinder = r(r(new oc.BRepAdaptor_Surface(face.wrapped)).Cylinder());
			if (!cylinder.Direct()) geomSurf = geomSurf.UReversed();
			transformation = stretchTransform2d(1 / cylinder.Radius(), [0, 1]).wrapped;
		}
		if (scale === "bounds") {
			transformation = r(new oc.gp_GTrsf2d());
			transformation.SetAffinity(uAxis, bounds.uMax - bounds.uMin);
			if (bounds.uMin !== 0) {
				const translation = r(new oc.gp_GTrsf2d());
				translation.SetTranslationPart(new oc.gp_XY(0, -bounds.uMin));
				transformation.Multiply(translation);
			}
			const vTransformation = r(new oc.gp_GTrsf2d());
			vTransformation.SetAffinity(vAxis, bounds.vMax - bounds.vMin);
			transformation.Multiply(vTransformation);
			if (bounds.vMin !== 0) {
				const translation = r(new oc.gp_GTrsf2d());
				translation.SetTranslationPart(r(new oc.gp_XY(0, -bounds.vMin)));
				transformation.Multiply(translation);
			}
		}
		const edges = curvesAsEdgesOnSurface(transformCurves(curves, transformation), geomSurf);
		gc();
		return edges;
	}
	function edgeToCurve(e, face) {
		const oc = getOC();
		const adaptor = GCWithScope()(new oc.BRepAdaptor_Curve2d(e.wrapped, face.wrapped));
		const trimmed = new oc.Geom2d_TrimmedCurve(adaptor.Curve(), adaptor.FirstParameter(), adaptor.LastParameter(), true, true);
		if (e.orientation === "backward") trimmed.Reverse();
		return new Curve2D(trimmed);
	}
	var poles3dTo2d = (poles, register) => {
		const oc = getOC();
		const poles2d = register(new oc.NCollection_Array1_gp_Pnt2d(poles.Lower(), poles.Upper()));
		for (let i = poles.Lower(); i <= poles.Upper(); i++) {
			const pole = register(poles.Value(i));
			poles2d.SetValue(i, register(new oc.gp_Pnt2d(pole.X(), pole.Y())));
		}
		return poles2d;
	};
	var point3dTo2d = (point) => [point.X(), point.Y()];
	var direction3dTo2d = (direction) => [direction.X(), direction.Y()];
	var axis3dTo2d = (axis, register) => {
		const oc = getOC();
		const location = register(axis.Location());
		const xDirection = register(axis.XDirection());
		const yDirection = register(axis.YDirection());
		return register(new oc.gp_Ax22d(register(new oc.gp_Pnt2d(location.X(), location.Y())), register(new oc.gp_Dir2d(direction3dTo2d(xDirection)[0], direction3dTo2d(xDirection)[1])), register(new oc.gp_Dir2d(direction3dTo2d(yDirection)[0], direction3dTo2d(yDirection)[1]))));
	};
	var orientCurveLikeEdge = (curve, edge) => {
		if (edge.orientation === "backward") curve.reverse();
		return curve;
	};
	function edgeToCurveOnPlane(e) {
		const oc = getOC();
		const r = GCWithScope();
		const adaptor = r(new oc.BRepAdaptor_Curve(e.wrapped));
		const curveType = findCurveType(adaptor.GetType());
		const firstParameter = adaptor.FirstParameter();
		const lastParameter = adaptor.LastParameter();
		const wrapAndTrim = (curve) => orientCurveLikeEdge(new Curve2D(new oc.Geom2d_TrimmedCurve(curve, firstParameter, lastParameter, true, true)), e);
		if (curveType === "LINE") return orientCurveLikeEdge(make2dSegmentCurve(point3dTo2d(r(adaptor.Value(firstParameter))), point3dTo2d(r(adaptor.Value(lastParameter)))), e);
		if (curveType === "CIRCLE") {
			const circle = adaptor.Circle();
			return wrapAndTrim(new oc.Geom2d_Circle(r(new oc.gp_Circ2d(axis3dTo2d(r(circle.Position()), r), circle.Radius()))));
		}
		if (curveType === "ELLIPSE") {
			const ellipse = adaptor.Ellipse();
			return wrapAndTrim(new oc.Geom2d_Ellipse(r(new oc.gp_Elips2d(axis3dTo2d(r(ellipse.Position()), r), ellipse.MajorRadius(), ellipse.MinorRadius()))));
		}
		if (curveType === "BEZIER_CURVE") {
			const bezier = adaptor.Bezier();
			const poles = poles3dTo2d(r(bezier.Poles()), r);
			const curveCopy = bezier.IsRational() ? new oc.Geom2d_BezierCurve(poles, bezier.Weights()) : new oc.Geom2d_BezierCurve(poles);
			curveCopy.Segment(firstParameter, lastParameter);
			return orientCurveLikeEdge(new Curve2D(curveCopy), e);
		}
		if (curveType === "BSPLINE_CURVE") {
			const bspline = adaptor.BSpline();
			const poles = poles3dTo2d(r(bspline.Poles()), r);
			const curveCopy = bspline.IsRational() ? new oc.Geom2d_BSplineCurve(poles, bspline.Weights(), bspline.Knots(), bspline.Multiplicities(), bspline.Degree(), bspline.IsPeriodic()) : new oc.Geom2d_BSplineCurve(poles, bspline.Knots(), bspline.Multiplicities(), bspline.Degree(), bspline.IsPeriodic());
			curveCopy.Segment(firstParameter, lastParameter, 1e-9);
			return orientCurveLikeEdge(new Curve2D(curveCopy), e);
		}
		throw new Error(`Unsupported projected curve type: ${curveType}`);
	}
	//#endregion
	//#region src/blueprints/svg.ts
	var viewbox = (bbox, margin = 1) => {
		return `${bbox.bounds[0][0] - margin} ${-bbox.bounds[1][1] - margin} ${bbox.width + 2 * margin} ${bbox.height + 2 * margin}`;
	};
	var asSVG = (body, boundingBox, margin = 1) => {
		return `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="${viewbox(boundingBox, margin)}" fill="none" stroke="black" stroke-width="0.6%" vector-effect="non-scaling-stroke">
    ${body}
</svg>`;
	};
	//#endregion
	//#region src/blueprints/Blueprint.ts
	/**
	* A Blueprint is an abstract Sketch, a 2D set of curves that can then be
	* sketched on different surfaces (faces or planes)
	*
	* You should create them by "sketching" with a `BlueprintSketcher`
	*/
	var Blueprint = class Blueprint {
		constructor(curves) {
			this.curves = curves;
			this._boundingBox = null;
			this._orientation = null;
			this._guessedOrientation = null;
		}
		delete() {
			this.curves.forEach((c) => c.delete());
			if (this._boundingBox) this._boundingBox.delete();
		}
		clone() {
			return new Blueprint(this.curves);
		}
		get repr() {
			return ["Blueprint", ...this.curves.map((c) => c.repr)].join("\n");
		}
		get boundingBox() {
			if (!this._boundingBox) this._boundingBox = curvesBoundingBox(this.curves);
			return this._boundingBox;
		}
		get orientation() {
			if (this._orientation) return this._orientation;
			if (this._guessedOrientation) return this._guessedOrientation;
			const vertices = this.curves.flatMap((c) => {
				if (c.geomType !== "LINE") return [c.firstPoint, c.value(.5)];
				return [c.firstPoint];
			});
			const approximateArea = vertices.map((v1, i) => {
				const v2 = vertices[(i + 1) % vertices.length];
				return (v2[0] - v1[0]) * (v2[1] + v1[1]);
			}).reduce((a, b) => a + b, 0);
			this._guessedOrientation = approximateArea > 0 ? "clockwise" : "counterClockwise";
			return this._guessedOrientation;
		}
		stretch(ratio, direction, origin = [0, 0]) {
			const curves = stretchTransform2d(ratio, direction, origin).transformCurves(this.curves);
			return new Blueprint(curves);
		}
		scale(scaleFactor, center) {
			const curves = scaleTransform2d(scaleFactor, center || this.boundingBox.center).transformCurves(this.curves);
			return new Blueprint(curves);
		}
		rotate(angle, center) {
			const curves = rotateTransform2d(angle * DEG2RAD, center).transformCurves(this.curves);
			return new Blueprint(curves);
		}
		translate(xDistOrPoint, yDist = 0) {
			const curves = translationTransform2d(isPoint2D(xDistOrPoint) ? xDistOrPoint : [xDistOrPoint, yDist]).transformCurves(this.curves);
			return new Blueprint(curves);
		}
		mirror(centerOrDirection, origin = [0, 0], mode = "center") {
			const curves = mirrorTransform2d(centerOrDirection, origin, mode).transformCurves(this.curves);
			return new Blueprint(curves);
		}
		sketchOnPlane(inputPlane, origin) {
			const plane = inputPlane instanceof Plane ? makePlane(inputPlane) : makePlane(inputPlane, origin);
			return new Sketch(assembleWire(curvesAsEdgesOnPlane(this.curves, plane)), {
				defaultOrigin: plane.origin,
				defaultDirection: plane.zDir
			});
		}
		sketchOnFace(face, scaleMode) {
			const oc = getOC();
			const wire = assembleWire(curvesAsEdgesOnFace(this.curves, face, scaleMode));
			oc.BRepLib.BuildCurves3d(wire.wrapped);
			const wireFixer = new oc.ShapeFix_Wire(wire.wrapped, face.wrapped, 1e-9);
			wireFixer.FixEdgeCurves();
			wireFixer.delete();
			const sketch = new Sketch(wire);
			if (wire.isClosed) {
				const baseFace = sketch.clone().face();
				sketch.defaultOrigin = baseFace.pointOnSurface(.5, .5);
				sketch.defaultDirection = baseFace.normalAt();
				if (baseFace.orientation !== face.orientation) sketch.defaultDirection = sketch.defaultDirection.multiply(-1);
				sketch.baseFace = face;
			} else {
				const startPoint = wire.startPoint;
				sketch.defaultOrigin = startPoint;
				sketch.defaultDirection = face.normalAt(startPoint);
				sketch.baseFace = face;
			}
			return sketch;
		}
		subFace(face, origin) {
			let subFace = this.translate(face.uvCoordinates(origin || face.center)).sketchOnFace(face, "original").face();
			if (subFace.orientation !== face.orientation) subFace = subFace.flipOrientation();
			return subFace;
		}
		punchHole(shape, face, { height = null, origin = null, draftAngle = 0 } = {}) {
			const oc = getOC();
			const gc = GCWithScope();
			const foundFace = getSingleFace(face, shape);
			const hole = this.subFace(foundFace, origin);
			const maker = gc(new oc.BRepFeat_MakeDPrism(shape.wrapped, hole.wrapped, foundFace.wrapped, draftAngle * DEG2RAD, 0, false));
			if (height) maker.Perform(height);
			else maker.PerformThruAll();
			return cast(maker.Shape());
		}
		toSVGPathD() {
			const r = GCWithScope();
			const bp = this.clone().mirror([1, 0], [0, 0], "plane");
			const path = approximateAsSvgCompatibleCurve(bp.curves).flatMap((c) => {
				return adaptedCurveToPathElem(r(c.adaptor()), c.lastPoint);
			});
			const [startX, startY] = bp.curves[0].firstPoint;
			return `M ${round5(startX)} ${round5(startY)} ${path.join(" ")}${bp.isClosed() ? " Z" : ""}`;
		}
		toSVGPath() {
			return `<path d="${this.toSVGPathD()}" />`;
		}
		toSVGViewBox(margin = 1) {
			return viewbox(this.boundingBox, margin);
		}
		toSVGPaths() {
			return [this.toSVGPathD()];
		}
		toSVG(margin = 1) {
			return asSVG(this.toSVGPath(), this.boundingBox, margin);
		}
		get firstPoint() {
			return this.curves[0].firstPoint;
		}
		get lastPoint() {
			return this.curves[this.curves.length - 1].lastPoint;
		}
		isInside(point) {
			if (!this.boundingBox.containsPoint(point)) return false;
			const intersector = new (getOC()).Geom2dAPI_InterCurveCurve();
			const segment = make2dSegmentCurve(point, this.boundingBox.outsidePoint());
			let crossCounts = 0;
			if (this.curves.find((c) => c.isOnCurve(point))) return false;
			this.curves.forEach((c) => {
				if (c.boundingBox.isOut(segment.boundingBox)) return;
				intersector.Init(segment.wrapped, c.wrapped, 1e-9);
				crossCounts += intersector.NbPoints();
			});
			intersector.delete();
			return !!(crossCounts % 2);
		}
		isClosed() {
			return samePoint$2(this.firstPoint, this.lastPoint);
		}
		intersects(other) {
			const intersector = new (getOC()).Geom2dAPI_InterCurveCurve();
			if (this.boundingBox.isOut(other.boundingBox)) return false;
			for (const myCurve of this.curves) for (const otherCurve of other.curves) {
				if (myCurve.boundingBox.isOut(otherCurve.boundingBox)) continue;
				intersector.Init(myCurve.wrapped, otherCurve.wrapped, 1e-9);
				if (intersector.NbPoints() || intersector.NbSegments()) return true;
			}
			intersector.delete();
			return false;
		}
	};
	//#endregion
	//#region src/Sketcher2d.ts
	function buildCornerFunction(radius, mode) {
		if (typeof radius === "function") return radius;
		const makeFn = mode === "chamfer" ? chamferCurves : mode === "dogbone" ? dogboneFilletCurves : filletCurves;
		return (first, second) => makeFn(first, second, radius);
	}
	var BaseSketcher2d = class {
		constructor(origin = [0, 0]) {
			this.pointer = origin;
			this.firstPoint = origin;
			this._nextCorner = null;
			this.pendingCurves = [];
		}
		_convertToUV([x, y]) {
			return [x, y];
		}
		_convertFromUV([u, v]) {
			return [u, v];
		}
		/**
		* Returns the current pen position as [x, y] coordinates
		* 
		* Added By Ben Harper 5/12/2025 
		
		* @category Drawing State
		*/
		get penPosition() {
			return this.pointer;
		}
		/**
		* Returns the current pen angle in degrees
		*
		* The angle represents the tangent direction at the current pen position,
		* based on the last drawing operation (line, arc, bezier, etc.).
		* Returns 0 if nothing has been drawn yet.
		*
		* @category Drawing State
		*
		* Added By Ben Harper 5/12/2025 to solve issue with being unable to draw a line perpendicular
		* to the tangent extension at the end of a .tangentArc() that did not finish at a known angle.
		*/
		get penAngle() {
			if (this.pendingCurves.length === 0) return 0;
			const [dx, dy] = this.pendingCurves[this.pendingCurves.length - 1].tangentAt(1);
			return Math.atan2(dy, dx) * RAD2DEG;
		}
		movePointerTo(point) {
			if (this.pendingCurves.length) throw new Error("You can only move the pointer if there is no curve defined");
			this.pointer = point;
			this.firstPoint = point;
			return this;
		}
		saveCurve(curve) {
			if (!this._nextCorner) {
				this.pendingCurves.push(curve);
				return;
			}
			const previousCurve = this.pendingCurves.pop();
			if (!previousCurve) throw new Error("bug in the custom corner algorithm");
			this.pendingCurves.push(...this._nextCorner(previousCurve, curve));
			this._nextCorner = null;
		}
		lineTo(point) {
			const curve = make2dSegmentCurve(this._convertToUV(this.pointer), this._convertToUV(point));
			this.pointer = point;
			this.saveCurve(curve);
			return this;
		}
		line(xDist, yDist) {
			return this.lineTo([this.pointer[0] + xDist, this.pointer[1] + yDist]);
		}
		vLine(distance) {
			return this.line(0, distance);
		}
		hLine(distance) {
			return this.line(distance, 0);
		}
		vLineTo(yPos) {
			return this.lineTo([this.pointer[0], yPos]);
		}
		hLineTo(xPos) {
			return this.lineTo([xPos, this.pointer[1]]);
		}
		polarLineTo([r, theta]) {
			const point = polarToCartesian(r, theta * DEG2RAD);
			return this.lineTo(point);
		}
		polarLine(distance, angle) {
			const [x, y] = polarToCartesian(distance, angle * DEG2RAD);
			return this.line(x, y);
		}
		tangentLine(distance) {
			const previousCurve = this.pendingCurves.length ? this.pendingCurves[this.pendingCurves.length - 1] : null;
			if (!previousCurve) throw new Error("You need a previous curve to sketch a tangent line");
			const direction = normalize2d(this._convertFromUV(previousCurve.tangentAt(1)));
			return this.line(direction[0] * distance, direction[1] * distance);
		}
		threePointsArcTo(end, midPoint) {
			this.saveCurve(make2dThreePointArc(this._convertToUV(this.pointer), this._convertToUV(midPoint), this._convertToUV(end)));
			this.pointer = end;
			return this;
		}
		threePointsArc(xDist, yDist, viaXDist, viaYDist) {
			const [x0, y0] = this.pointer;
			return this.threePointsArcTo([x0 + xDist, y0 + yDist], [x0 + viaXDist, y0 + viaYDist]);
		}
		sagittaArcTo(end, sagitta) {
			const [x0, y0] = this.pointer;
			const [x1, y1] = end;
			const midPoint = [(x0 + x1) / 2, (y0 + y1) / 2];
			const sagDir = [-(y1 - y0), x1 - x0];
			const sagDirLen = Math.sqrt(sagDir[0] ** 2 + sagDir[1] ** 2);
			const sagPoint = [midPoint[0] + sagDir[0] / sagDirLen * sagitta, midPoint[1] + sagDir[1] / sagDirLen * sagitta];
			this.saveCurve(make2dThreePointArc(this._convertToUV(this.pointer), this._convertToUV(sagPoint), this._convertToUV(end)));
			this.pointer = end;
			return this;
		}
		sagittaArc(xDist, yDist, sagitta) {
			return this.sagittaArcTo([xDist + this.pointer[0], yDist + this.pointer[1]], sagitta);
		}
		vSagittaArc(distance, sagitta) {
			return this.sagittaArc(0, distance, sagitta);
		}
		hSagittaArc(distance, sagitta) {
			return this.sagittaArc(distance, 0, sagitta);
		}
		bulgeArcTo(end, bulge) {
			if (!bulge) return this.lineTo(end);
			const halfChord = distance2d(this.pointer, end) / 2;
			const bulgeAsSagitta = -bulge * halfChord;
			return this.sagittaArcTo(end, bulgeAsSagitta);
		}
		bulgeArc(xDist, yDist, bulge) {
			return this.bulgeArcTo([xDist + this.pointer[0], yDist + this.pointer[1]], bulge);
		}
		vBulgeArc(distance, bulge) {
			return this.bulgeArc(0, distance, bulge);
		}
		hBulgeArc(distance, bulge) {
			return this.bulgeArc(distance, 0, bulge);
		}
		tangentArcTo(end) {
			const previousCurve = this.pendingCurves.length ? this.pendingCurves[this.pendingCurves.length - 1] : null;
			if (!previousCurve) throw new Error("You need a previous curve to sketch a tangent arc");
			this.saveCurve(make2dTangentArc(this._convertToUV(this.pointer), previousCurve.tangentAt(1), this._convertToUV(end)));
			this.pointer = end;
			return this;
		}
		tangentArc(xDist, yDist) {
			const [x0, y0] = this.pointer;
			return this.tangentArcTo([xDist + x0, yDist + y0]);
		}
		ellipseTo(end, horizontalRadius, verticalRadius, rotation = 0, longAxis = false, sweep = false) {
			let rotationAngle = rotation;
			let majorRadius = horizontalRadius;
			let minorRadius = verticalRadius;
			if (horizontalRadius < verticalRadius) {
				rotationAngle = rotation + 90;
				majorRadius = verticalRadius;
				minorRadius = horizontalRadius;
			}
			const radRotationAngle = rotationAngle * DEG2RAD;
			const convertAxis = (ax) => distance2d(this._convertToUV(ax));
			const r1 = convertAxis(polarToCartesian(majorRadius, radRotationAngle));
			const r2 = convertAxis(polarToCartesian(minorRadius, radRotationAngle + Math.PI / 2));
			const xDir = normalize2d(this._convertToUV(rotate2d([1, 0], radRotationAngle)));
			const [, newRotationAngle] = cartesianToPolar(xDir);
			const { cx, cy, startAngle, endAngle, clockwise, rx, ry } = convertSvgEllipseParams(this._convertToUV(this.pointer), this._convertToUV(end), r1, r2, newRotationAngle, longAxis, sweep);
			const arc = make2dEllipseArc(rx, ry, clockwise ? startAngle : endAngle, clockwise ? endAngle : startAngle, [cx, cy], xDir);
			if (!clockwise) arc.reverse();
			this.saveCurve(arc);
			this.pointer = end;
			return this;
		}
		ellipse(xDist, yDist, horizontalRadius, verticalRadius, rotation = 0, longAxis = false, sweep = false) {
			const [x0, y0] = this.pointer;
			return this.ellipseTo([xDist + x0, yDist + y0], horizontalRadius, verticalRadius, rotation, longAxis, sweep);
		}
		halfEllipseTo(end, minorRadius, sweep = false) {
			const angle = polarAngle2d(end, this.pointer);
			const distance = distance2d(end, this.pointer);
			return this.ellipseTo(end, distance / 2, minorRadius, angle * RAD2DEG, true, sweep);
		}
		halfEllipse(xDist, yDist, minorRadius, sweep = false) {
			const [x0, y0] = this.pointer;
			return this.halfEllipseTo([x0 + xDist, y0 + yDist], minorRadius, sweep);
		}
		bezierCurveTo(end, controlPoints) {
			let cp;
			if (controlPoints.length === 2 && !Array.isArray(controlPoints[0])) cp = [controlPoints];
			else cp = controlPoints;
			this.saveCurve(make2dBezierCurve(this._convertToUV(this.pointer), cp.map((point) => this._convertToUV(point)), this._convertToUV(end)));
			this.pointer = end;
			return this;
		}
		quadraticBezierCurveTo(end, controlPoint) {
			return this.bezierCurveTo(end, [controlPoint]);
		}
		cubicBezierCurveTo(end, startControlPoint, endControlPoint) {
			return this.bezierCurveTo(end, [startControlPoint, endControlPoint]);
		}
		smoothSplineTo(end, config) {
			const { endTangent, startTangent, startFactor, endFactor } = defaultsSplineConfig(config);
			const previousCurve = this.pendingCurves.length ? this.pendingCurves[this.pendingCurves.length - 1] : null;
			const defaultDistance = distance2d(this.pointer, end) * .25;
			let startPoleDirection;
			if (startTangent) startPoleDirection = startTangent;
			else if (!previousCurve) startPoleDirection = [1, 0];
			else startPoleDirection = this._convertFromUV(previousCurve.tangentAt(1));
			startPoleDirection = normalize2d(startPoleDirection);
			const startControl = [this.pointer[0] + startPoleDirection[0] * startFactor * defaultDistance, this.pointer[1] + startPoleDirection[1] * startFactor * defaultDistance];
			let endPoleDirection;
			if (endTangent === "symmetric") endPoleDirection = [-startPoleDirection[0], -startPoleDirection[1]];
			else endPoleDirection = endTangent;
			endPoleDirection = normalize2d(endPoleDirection);
			const endControl = [end[0] - endPoleDirection[0] * endFactor * defaultDistance, end[1] - endPoleDirection[1] * endFactor * defaultDistance];
			return this.cubicBezierCurveTo(end, startControl, endControl);
		}
		smoothSpline(xDist, yDist, splineConfig) {
			return this.smoothSplineTo([xDist + this.pointer[0], yDist + this.pointer[1]], splineConfig);
		}
		/**
		* Changes the corner between the previous and next segments.
		*/
		customCorner(radius, mode = "fillet") {
			if (!this.pendingCurves.length) throw new Error("You need a curve defined to fillet the angle");
			this._nextCorner = buildCornerFunction(radius, mode);
			return this;
		}
		_customCornerLastWithFirst(radius, mode = "fillet") {
			if (!radius) return;
			const previousCurve = this.pendingCurves.pop();
			const curve = this.pendingCurves.shift();
			if (!previousCurve || !curve) throw new Error("Not enough curves to close and fillet");
			this.pendingCurves.push(...buildCornerFunction(radius, mode)(previousCurve, curve));
		}
		_closeSketch() {
			if (!samePoint$2(this.pointer, this.firstPoint)) this.lineTo(this.firstPoint);
		}
		_closeWithMirror() {
			if (samePoint$2(this.pointer, this.firstPoint)) throw new Error("Cannot close with a mirror when the sketch is already closed");
			const startToEndVector = [this.pointer[0] - this.firstPoint[0], this.pointer[1] - this.firstPoint[1]];
			const mirrorAxis = axis2d(this._convertToUV(this.pointer), this._convertToUV(startToEndVector));
			const mirroredCurves = this.pendingCurves.map((c) => new Curve2D(c.innerCurve.Mirrored(mirrorAxis)));
			mirroredCurves.reverse();
			mirroredCurves.map((c) => c.reverse());
			this.pendingCurves.push(...mirroredCurves);
			this.pointer = this.firstPoint;
		}
	};
	/**
	* The FaceSketcher allows you to sketch on a face that is not planar, for
	* instance the sides of a cylinder.
	*
	* The coordinates passed to the methods corresponds to normalised distances on
	* this surface, between 0 and 1 in both direction.
	*
	* Note that if you are drawing on a closed surface (typically a revolution
	* surface or a cylinder), the first parameters represents the angle and can be
	* smaller than 0 or bigger than 1.
	*
	* @category Sketching
	*/
	var FaceSketcher = class extends BaseSketcher2d {
		constructor(face, origin = [0, 0]) {
			super(origin);
			this.face = face.clone();
			this._bounds = face.UVBounds;
		}
		_convertToUV([x, y]) {
			const { uMin, uMax, vMin, vMax } = this._bounds;
			return [uMin + x * (uMax - uMin), vMin + y * (vMax - vMin)];
		}
		_convertFromUV([u, v]) {
			const { uMin, uMax, vMin, vMax } = this._bounds;
			return [(u - uMin) / (uMax - uMin), (v - vMin) / (vMax - vMin)];
		}
		_adaptSurface() {
			return getOC().BRep_Tool.Surface(this.face.wrapped);
		}
		/**
		* @ignore
		*/
		buildWire() {
			const [r, gc] = localGC();
			const oc = getOC();
			const geomSurf = r(this._adaptSurface());
			const wire = assembleWire(this.pendingCurves.map((curve) => {
				return r(new Edge(r(new oc.BRepBuilderAPI_MakeEdge(curve.wrapped, geomSurf)).Edge()));
			}));
			oc.BRepLib.BuildCurves3d(wire.wrapped);
			gc();
			return wire;
		}
		done() {
			const [r, gc] = localGC();
			const wire = this.buildWire();
			const sketch = new Sketch(wire);
			if (wire.isClosed) {
				const face = r(sketch.clone().face());
				sketch.defaultOrigin = r(face.pointOnSurface(.5, .5));
				sketch.defaultDirection = r(r(face.normalAt()).multiply(-1));
			} else {
				const startPoint = r(wire.startPoint);
				sketch.defaultOrigin = startPoint;
				sketch.defaultDirection = r(this.face.normalAt(startPoint));
			}
			sketch.baseFace = this.face;
			gc();
			return sketch;
		}
		close() {
			this._closeSketch();
			return this.done();
		}
		closeWithMirror() {
			this._closeWithMirror();
			return this.close();
		}
		/**
		* Stop drawing, make sure the sketch is closed (by adding a straight line to
		* from the last point to the first), add a fillet between the last and the
		* first segments and returns the sketch.
		*/
		closeWithCustomCorner(radius, mode = "fillet") {
			this._closeSketch();
			this._customCornerLastWithFirst(radius, mode);
			return this.done();
		}
	};
	var BlueprintSketcher = class extends BaseSketcher2d {
		constructor(origin = [0, 0]) {
			super();
			this.pointer = origin;
			this.firstPoint = origin;
			this.pendingCurves = [];
		}
		done() {
			return new Blueprint(this.pendingCurves);
		}
		close() {
			this._closeSketch();
			return this.done();
		}
		closeWithMirror() {
			this._closeWithMirror();
			return this.close();
		}
		/**
		* Stop drawing, make sure the sketch is closed (by adding a straight line to
		* from the last point to the first), add a fillet between the last and the
		* first segments and returns the sketch.
		*/
		closeWithCustomCorner(radius, mode = "fillet") {
			this._closeSketch();
			this._customCornerLastWithFirst(radius, mode);
			return this.done();
		}
	};
	//#endregion
	//#region src/shortcuts.ts
	/**
	* Builds a rectangular box of the given lengths.
	*
	* The box is centred on the origin in X and Y (spanning `[-x/2, +x/2]` and
	* `[-y/2, +y/2]`) and corner-based in Z (spanning `[0, +z]`). Translate by
	* `[0, 0, -z/2]` to centre the box fully, or use {@link makeBox} when you
	* want explicit two-corner control.
	*
	* @example
	* const slab = makeBaseBox(30, 50, 10);
	* // slab spans x: [-15, 15], y: [-25, 25], z: [0, 10]
	*
	* @category Solids
	*/
	var makeBaseBox = (xLength, yLength, zLength) => {
		return new Sketcher().movePointerTo([-xLength / 2, yLength / 2]).hLine(xLength).vLine(-yLength).hLine(-xLength).close().extrude(zLength);
	};
	//#endregion
	//#region src/sketches/CompoundSketch.ts
	var guessFaceFromWires = (wires) => {
		const oc = getOC();
		const faceBuilder = new oc.BRepOffsetAPI_MakeFilling(3, 15, 2, false, 1e-5, 1e-4, .01, .1, 8, 9);
		wires.forEach((wire, wireIndex) => {
			wire.edges.forEach((edge) => {
				faceBuilder.Add(edge.wrapped, oc.GeomAbs_Shape.GeomAbs_C0, wireIndex === 0);
			});
		});
		faceBuilder.Build();
		const newFace = cast(faceBuilder.Shape());
		faceBuilder.delete();
		if (!(newFace instanceof Face)) throw new Error("Failed to create a face");
		return newFace;
	};
	var fixWire = (wire, baseFace) => {
		const wireFixer = new (getOC()).ShapeFix_Wire(wire.wrapped, baseFace.wrapped, 1e-9);
		wireFixer.FixEdgeCurves();
		wireFixer.delete();
		return wire;
	};
	var faceFromWires = (wires) => {
		let baseFace;
		let holeWires;
		try {
			baseFace = makeFace(wires[0]);
			holeWires = wires.slice(1);
		} catch (e) {
			baseFace = guessFaceFromWires(wires);
			holeWires = wires.slice(1).map((w) => fixWire(w, baseFace));
		}
		return addHolesInFace(baseFace, holeWires);
	};
	var solidFromShellGenerator = (sketches, shellGenerator) => {
		const shells = [];
		const startWires = [];
		const endWires = [];
		sketches.forEach((sketch) => {
			const [shell, startWire, endWire] = shellGenerator(sketch);
			shells.push(shell);
			startWires.push(startWire);
			endWires.push(endWire);
		});
		const startFace = faceFromWires(startWires);
		const endFace = faceFromWires(endWires);
		return makeSolid([
			startFace,
			...shells,
			endFace
		]);
	};
	/**
	* A group of sketches that should correspond to a unique face (i.e. an outer
	* sketch, and multiple holes within this sketch.
	*
	* All the sketches should share the same base face (or surface)
	*
	* Ideally generated from a `CompoundBlueprint`
	*/
	var CompoundSketch = class {
		constructor(sketches) {
			this.sketches = sketches;
		}
		delete() {
			this.sketches.forEach((sketch) => sketch.delete());
		}
		get outerSketch() {
			return this.sketches[0];
		}
		get innerSketches() {
			return this.sketches.slice(1);
		}
		get wires() {
			return compoundShapes(this.sketches.map((s) => s.wire));
		}
		face() {
			return addHolesInFace(this.outerSketch.face(), this.innerSketches.map((s) => s.wire));
		}
		/**
		* Extrudes this sketch up to a limiting face, returning only the new solid.
		* The face is not modified or consumed. The sketch's default direction is
		* used unless overridden; the reverse direction is tried if needed.
		* The finite, trimmed limiting face must fully cap the extrusion once
		* without crossing the profile. Use a trimmed face for closed surfaces.
		* The sketch is consumed on success, but retained on failure.
		*/
		extrudeUntil(limitingFace, { extrusionDirection } = {}) {
			const [r, gc] = localGC();
			try {
				const solid = extrudeFaceUntil(r(this.face()), limitingFace, extrusionDirection ?? this.outerSketch.defaultDirection);
				this.delete();
				return solid;
			} finally {
				gc();
			}
		}
		extrude(extrusionDistance, { extrusionDirection, extrusionProfile, twistAngle, origin } = {}) {
			const extrusionVec = new Vector(extrusionDirection || this.outerSketch.defaultDirection).normalized().multiply(extrusionDistance);
			if (extrusionProfile && !twistAngle) return solidFromShellGenerator(this.sketches, (sketch) => complexExtrude(sketch.wire, origin || this.outerSketch.defaultOrigin, extrusionVec, extrusionProfile, true));
			if (twistAngle) return solidFromShellGenerator(this.sketches, (sketch) => twistExtrude(sketch.wire, twistAngle, origin || this.outerSketch.defaultOrigin, extrusionVec, extrusionProfile, true));
			return basicFaceExtrusion(this.face(), extrusionVec);
		}
		/**
		* Revolves the drawing on an axis (defined by its direction and an origin
		* (defaults to the sketch origin)
		*/
		revolve(revolutionAxis, { origin, angle } = {}) {
			return revolution(this.face(), origin || this.outerSketch.defaultOrigin, revolutionAxis, angle);
		}
		loftWith(otherCompound, loftConfig) {
			if (this.sketches.length !== otherCompound.sketches.length) throw new Error("You need to loft with another compound with the same number of sketches");
			const shells = this.sketches.map((base, cIndex) => {
				const outer = otherCompound.sketches[cIndex];
				return base.clone().loftWith(outer.clone(), { ruled: loftConfig.ruled }, true);
			});
			const baseFace = this.face().clone();
			shells.push(baseFace, otherCompound.face());
			return makeSolid(shells);
		}
	};
	//#endregion
	//#region src/blueprints/CompoundBlueprint.ts
	var CompoundBlueprint = class CompoundBlueprint {
		constructor(blueprints) {
			this.blueprints = blueprints;
			this._boundingBox = null;
		}
		clone() {
			return new CompoundBlueprint(this.blueprints);
		}
		get boundingBox() {
			if (!this._boundingBox) {
				const box = new BoundingBox2d();
				this.blueprints.forEach((b) => box.add(b.boundingBox));
				this._boundingBox = box;
			}
			return this._boundingBox;
		}
		get repr() {
			return [
				"Compound Blueprints",
				"-- Outline",
				this.blueprints[0].repr,
				"-- Holes",
				...this.blueprints.slice(1).map((b) => b.repr)
			].join("\n");
		}
		stretch(ratio, direction, origin) {
			return new CompoundBlueprint(this.blueprints.map((bp) => bp.stretch(ratio, direction, origin)));
		}
		rotate(angle, center) {
			return new CompoundBlueprint(this.blueprints.map((bp) => bp.rotate(angle, center)));
		}
		scale(scaleFactor, center) {
			const centerPoint = center || this.boundingBox.center;
			return new CompoundBlueprint(this.blueprints.map((bp) => bp.scale(scaleFactor, centerPoint)));
		}
		translate(xDistOrPoint, yDist = 0) {
			return new CompoundBlueprint(this.blueprints.map((bp) => bp.translate(xDistOrPoint, yDist)));
		}
		mirror(centerOrDirection, origin, mode) {
			return new CompoundBlueprint(this.blueprints.map((bp) => bp.mirror(centerOrDirection, origin, mode)));
		}
		sketchOnPlane(plane, origin) {
			return new CompoundSketch(this.blueprints.map((blueprint) => blueprint.sketchOnPlane(plane, origin)));
		}
		sketchOnFace(face, scaleMode) {
			return new CompoundSketch(this.blueprints.map((blueprint) => blueprint.sketchOnFace(face, scaleMode)));
		}
		punchHole(shape, face, options = {}) {
			return this.blueprints[0].punchHole(shape, face, options);
		}
		toSVGViewBox(margin = 1) {
			return viewbox(this.boundingBox, margin);
		}
		toSVGPaths() {
			return this.blueprints.flatMap((bp) => bp.toSVGPaths());
		}
		toSVGGroup() {
			return `<g>${this.blueprints.map((b) => b.toSVGPath()).join("")}</g>`;
		}
		toSVG(margin = 1) {
			return asSVG(this.toSVGGroup(), this.boundingBox, margin);
		}
	};
	//#endregion
	//#region src/sketches/Sketches.ts
	var Sketches = class {
		constructor(sketches) {
			this.sketches = sketches;
		}
		wires() {
			return compoundShapes(this.sketches.map((s) => s instanceof Sketch ? s.wire : s.wires));
		}
		faces() {
			return compoundShapes(this.sketches.map((s) => s.face()));
		}
		/**
		* Extrudes each sketch up to the same limiting face, returning only the
		* extrusions. The face is not consumed. Each sketch uses its default
		* direction unless overridden and is consumed when its extrusion succeeds.
		*/
		extrudeUntil(limitingFace, extrusionConfig = {}) {
			const [r, gc] = localGC();
			try {
				return compoundShapes(this.sketches.map((sketch) => r(sketch.extrudeUntil(limitingFace, extrusionConfig)))).asShape3D();
			} finally {
				gc();
			}
		}
		/** Extrudes the sketch to a certain distance.(along the default direction
		* and origin of the sketch).
		*
		* You can define another extrusion direction or origin,
		*
		* It is also possible to twist extrude with an angle (in degrees), or to
		* give a profile to the extrusion (the endFactor will scale the face, and
		* the profile will define how the scale is applied (either linarly or with
		* a s-shape).
		*/
		extrude(extrusionDistance, extrusionConfig = {}) {
			return compoundShapes(this.sketches.map((s) => s.extrude(extrusionDistance, extrusionConfig)));
		}
		/**
		* Revolves the drawing on an axis (defined by its direction and an origin
		* (defaults to the sketch origin)
		*/
		revolve(revolutionAxis, config) {
			return compoundShapes(this.sketches.map((s) => s.revolve(revolutionAxis, config)));
		}
	};
	//#endregion
	//#region src/blueprints/Blueprints.ts
	var Blueprints = class Blueprints {
		constructor(blueprints) {
			this.blueprints = blueprints;
			this._boundingBox = null;
		}
		get repr() {
			return ["Blueprints", ...this.blueprints.map((b) => b.repr)].join("\n");
		}
		clone() {
			return new Blueprints(this.blueprints);
		}
		get boundingBox() {
			if (!this._boundingBox) {
				const box = new BoundingBox2d();
				this.blueprints.forEach((b) => box.add(b.boundingBox));
				this._boundingBox = box;
			}
			return this._boundingBox;
		}
		stretch(ratio, direction, origin) {
			return new Blueprints(this.blueprints.map((bp) => bp.stretch(ratio, direction, origin)));
		}
		rotate(angle, center) {
			return new Blueprints(this.blueprints.map((bp) => bp.rotate(angle, center)));
		}
		scale(scaleFactor, center) {
			const centerPoint = center || this.boundingBox.center;
			return new Blueprints(this.blueprints.map((bp) => bp.scale(scaleFactor, centerPoint)));
		}
		translate(xDistOrPoint, yDist = 0) {
			return new Blueprints(this.blueprints.map((bp) => bp.translate(xDistOrPoint, yDist)));
		}
		mirror(centerOrDirection, origin, mode) {
			return new Blueprints(this.blueprints.map((bp) => bp.mirror(centerOrDirection, origin, mode)));
		}
		sketchOnPlane(plane, origin) {
			return new Sketches(this.blueprints.map((bp) => bp.sketchOnPlane(plane, origin)));
		}
		sketchOnFace(face, scaleMode) {
			return new Sketches(this.blueprints.map((bp) => bp.sketchOnFace(face, scaleMode)));
		}
		punchHole(shape, face, options = {}) {
			let outShape = shape;
			this.blueprints.forEach((b) => {
				outShape = b.punchHole(outShape, face, options);
			});
			return outShape;
		}
		toSVGViewBox(margin = 1) {
			return viewbox(this.boundingBox, margin);
		}
		toSVGPaths() {
			return this.blueprints.map((bp) => bp.toSVGPaths());
		}
		toSVG(margin = 1) {
			return asSVG(this.blueprints.map((bp) => {
				if (bp instanceof Blueprint) return bp.toSVGPath();
				else return bp.toSVGGroup();
			}).join("\n    "), this.boundingBox, margin);
		}
	};
	//#endregion
	//#region src/blueprints/lib.ts
	var groupByBoundingBoxOverlap = (blueprints) => {
		const parents = blueprints.map((_, index) => index);
		const root = (index) => {
			while (parents[index] !== index) {
				parents[index] = parents[parents[index]];
				index = parents[index];
			}
			return index;
		};
		for (let i = 0; i < blueprints.length; i++) for (let j = i + 1; j < blueprints.length; j++) if (!blueprints[i].boundingBox.isOut(blueprints[j].boundingBox)) parents[root(j)] = root(i);
		const groups = /* @__PURE__ */ new Map();
		blueprints.forEach((blueprint, index) => {
			const key = root(index);
			const group = groups.get(key);
			if (group) group.push(blueprint);
			else groups.set(key, [blueprint]);
		});
		return Array.from(groups.values());
	};
	var addContainmentInfo = (groupedBlueprints) => {
		return groupedBlueprints.map((blueprint, index) => {
			const firstCurve = blueprint.curves[0];
			const point = firstCurve.value((firstCurve.lastParameter + firstCurve.firstParameter) / 2);
			return {
				blueprint,
				isIn: groupedBlueprints.filter((potentialOuterBlueprint, j) => {
					if (index === j) return false;
					return potentialOuterBlueprint.isInside(point);
				})
			};
		});
	};
	var splitMultipleOuterBlueprints = (outerBlueprints, allBlueprints) => {
		return outerBlueprints.flatMap(({ blueprint: outerBlueprint }) => {
			return cleanEdgeCases(allBlueprints.filter(({ blueprint, isIn }) => blueprint === outerBlueprint || isIn.indexOf(outerBlueprint) !== -1));
		});
	};
	var handleNestedBlueprints = (nestedBlueprints, allBlueprints) => {
		return [allBlueprints.filter(({ isIn }) => isIn.length <= 1), ...cleanEdgeCases(addContainmentInfo(nestedBlueprints.map(({ blueprint }) => blueprint)))];
	};
	var cleanEdgeCases = (groupedBlueprints) => {
		if (!groupedBlueprints.length) return [];
		const outerBlueprints = groupedBlueprints.filter(({ isIn }) => !isIn.length);
		const nestedBlueprints = groupedBlueprints.filter(({ isIn }) => isIn.length > 1);
		if (outerBlueprints.length === 1 && nestedBlueprints.length === 0) return [groupedBlueprints];
		else if (outerBlueprints.length > 1) return splitMultipleOuterBlueprints(outerBlueprints, groupedBlueprints);
		else return handleNestedBlueprints(nestedBlueprints, groupedBlueprints);
	};
	/**
	* Groups an array of blueprints such that blueprints that correspond to holes
	* in other blueprints are set in a `CompoundBlueprint`.
	*
	* The current algorithm does not handle cases where blueprints cross each
	* other
	*/
	var organiseBlueprints = (blueprints) => {
		return new Blueprints(groupByBoundingBoxOverlap(blueprints).map(addContainmentInfo).flatMap(cleanEdgeCases).map((compounds) => {
			if (compounds.length === 1) return compounds[0].blueprint;
			compounds.sort((a, b) => a.isIn.length - b.isIn.length);
			return new CompoundBlueprint(compounds.map(({ blueprint }) => blueprint));
		}));
	};
	//#endregion
	//#region src/blueprints/cannedBlueprints.ts
	var polysidesBlueprint = (radius, sidesCount, sagitta = 0) => {
		const points = [...Array(sidesCount).keys()].map((i) => {
			const theta = -(Math.PI * 2 / sidesCount) * i;
			return [radius * Math.sin(theta), radius * Math.cos(theta)];
		});
		const blueprint = new BlueprintSketcher().movePointerTo([points[points.length - 1][0], points[points.length - 1][1]]);
		if (sagitta) points.forEach(([x, y]) => blueprint.sagittaArcTo([x, y], sagitta));
		else points.forEach(([x, y]) => blueprint.lineTo([x, y]));
		return blueprint.done();
	};
	var roundedRectangleBlueprint = (width, height, r = 0) => {
		const { rx: inputRx = 0, ry: inputRy = 0 } = typeof r === "number" ? {
			ry: r,
			rx: r
		} : r;
		let rx = Math.min(inputRx, width / 2);
		let ry = Math.min(inputRy, height / 2);
		const withRadius = rx && ry;
		if (!withRadius) {
			rx = 0;
			ry = 0;
		}
		const symmetricRadius = rx === ry;
		const sk = new BlueprintSketcher([Math.min(0, -(width / 2 - rx)), -height / 2]);
		const addFillet = (xDist, yDist) => {
			if (withRadius) {
				if (symmetricRadius) sk.tangentArc(xDist, yDist);
				else sk.ellipse(xDist, yDist, rx, ry, 0, false, true);
			}
		};
		if (rx < width / 2) sk.hLine(width - 2 * rx);
		addFillet(rx, ry);
		if (ry < height / 2) sk.vLine(height - 2 * ry);
		addFillet(-rx, ry);
		if (rx < width / 2) sk.hLine(-(width - 2 * rx));
		addFillet(-rx, -ry);
		if (ry < height / 2) sk.vLine(-(height - 2 * ry));
		addFillet(rx, -ry);
		return sk.close();
	};
	//#endregion
	//#region src/blueprints/booleanOperations.ts
	var PRECISION$1 = 1e-9;
	var samePoint$1 = (x, y) => samePoint$2(x, y, PRECISION$1);
	var curveMidPoint = (curve) => {
		const midParameter = (curve.lastParameter + curve.firstParameter) / 2;
		return curve.value(midParameter);
	};
	var rotateToStartAt = (curves, point) => {
		const startIndex = curves.findIndex((curve) => {
			return samePoint$1(point, curve.firstPoint);
		});
		const start = curves.slice(0, startIndex);
		return curves.slice(startIndex).concat(start);
	};
	var rotateToStartAtSegment = (curves, segment) => {
		const onSegment = (curve) => {
			return samePoint$1(segment.firstPoint, curve.firstPoint) && samePoint$1(segment.lastPoint, curve.lastPoint);
		};
		let startIndex = curves.findIndex(onSegment);
		if (startIndex === -1) {
			curves = reverseSegment(curves);
			startIndex = curves.findIndex(onSegment);
			if (startIndex === -1) {
				console.error(curves.map((c) => c.repr), segment.repr);
				throw new Error("Failed to rotate to segment start");
			}
		}
		const start = curves.slice(0, startIndex);
		return curves.slice(startIndex).concat(start);
	};
	function* createSegmentOnPoints(curves, allIntersections, allCommonSegments) {
		const endsAtIntersection = (curve) => {
			return !!allIntersections.find((intersection) => {
				return samePoint$1(intersection, curve.lastPoint);
			});
		};
		const isCommonSegment = (curve) => {
			return !!allCommonSegments.find((segment) => {
				return samePoint$1(segment.firstPoint, curve.firstPoint) && samePoint$1(segment.lastPoint, curve.lastPoint) || samePoint$1(segment.firstPoint, curve.lastPoint) && samePoint$1(segment.lastPoint, curve.firstPoint);
			});
		};
		let currentCurves = [];
		for (const curve of curves) if (endsAtIntersection(curve)) {
			currentCurves.push(curve);
			yield currentCurves;
			currentCurves = [];
		} else if (isCommonSegment(curve)) {
			if (currentCurves.length) {
				yield currentCurves;
				currentCurves = [];
			}
			yield [curve];
		} else currentCurves.push(curve);
		if (currentCurves.length) yield currentCurves;
	}
	var startOfSegment = (s) => {
		return s[0].firstPoint;
	};
	var endOfSegment = (s) => {
		return s[s.length - 1].lastPoint;
	};
	var reverseSegment = (segment) => {
		segment.reverse();
		return segment.map((curve) => {
			const newCurve = curve.clone();
			newCurve.reverse();
			return newCurve;
		});
	};
	var reverseSegments = (s) => {
		s.reverse();
		return s.map(reverseSegment);
	};
	function removeNonCrossingPoint(allIntersections, segmentedCurve, blueprintToCheck) {
		return allIntersections.filter((intersection) => {
			const segmentsOfIntersection = segmentedCurve.filter((s) => {
				return samePoint$1(s.firstPoint, intersection) || samePoint$1(s.lastPoint, intersection);
			});
			if (segmentsOfIntersection.length % 2) {
				console.error(segmentsOfIntersection, intersection);
				throw new Error("Bug in the intersection algo on non crossing point");
			}
			const isInside = segmentsOfIntersection.map((segment) => {
				return blueprintToCheck.isInside(curveMidPoint(segment));
			});
			return !(isInside.every((i) => i) || !isInside.some((i) => i));
		});
	}
	function blueprintsIntersectionSegments(first, second) {
		let allIntersections = [];
		const allCommonSegments = [];
		const firstCurvePoints = new Array(first.curves.length).fill(0).map(() => []);
		const secondCurvePoints = new Array(second.curves.length).fill(0).map(() => []);
		first.curves.forEach((thisCurve, firstIndex) => {
			second.curves.forEach((otherCurve, secondIndex) => {
				const { intersections, commonSegments, commonSegmentsPoints } = intersectCurves(thisCurve, otherCurve, PRECISION$1 / 100);
				allIntersections.push(...intersections);
				firstCurvePoints[firstIndex].push(...intersections);
				secondCurvePoints[secondIndex].push(...intersections);
				allCommonSegments.push(...commonSegments);
				allIntersections.push(...commonSegmentsPoints);
				firstCurvePoints[firstIndex].push(...commonSegmentsPoints);
				secondCurvePoints[secondIndex].push(...commonSegmentsPoints);
			});
		});
		allIntersections = removeDuplicatePoints(allIntersections, PRECISION$1);
		if (!allIntersections.length || allIntersections.length === 1) return null;
		const cutCurve = ([curve, intersections]) => {
			if (!intersections.length) return [curve];
			return curve.splitAt(intersections, PRECISION$1 / 100);
		};
		let firstCurveSegments = zip([first.curves, firstCurvePoints]).flatMap(cutCurve);
		let secondCurveSegments = zip([second.curves, secondCurvePoints]).flatMap(cutCurve);
		const commonSegmentsPoints = allCommonSegments.map((c) => [c.firstPoint, c.lastPoint]);
		allIntersections = removeNonCrossingPoint(allIntersections, firstCurveSegments, second);
		if (!allIntersections.length && !allCommonSegments.length) return null;
		if (!allCommonSegments.length) {
			const startAt = allIntersections[0];
			firstCurveSegments = rotateToStartAt(firstCurveSegments, startAt);
			secondCurveSegments = rotateToStartAt(secondCurveSegments, startAt);
		} else {
			const startSegment = allCommonSegments[0];
			firstCurveSegments = rotateToStartAtSegment(firstCurveSegments, startSegment);
			secondCurveSegments = rotateToStartAtSegment(secondCurveSegments, startSegment);
		}
		const firstIntersectedSegments = Array.from(createSegmentOnPoints(firstCurveSegments, allIntersections, allCommonSegments));
		let secondIntersectedSegments = Array.from(createSegmentOnPoints(secondCurveSegments, allIntersections, allCommonSegments));
		if (!samePoint$1(endOfSegment(secondIntersectedSegments[0]), endOfSegment(firstIntersectedSegments[0])) || allCommonSegments.length > 0 && secondIntersectedSegments[0].length !== 1) secondIntersectedSegments = reverseSegments(secondIntersectedSegments);
		return zip([firstIntersectedSegments, secondIntersectedSegments]).map(([first, second]) => {
			const currentStart = startOfSegment(first);
			const currentEnd = endOfSegment(first);
			if (commonSegmentsPoints.find(([startPoint, endPoint]) => {
				return samePoint$1(startPoint, currentStart) && samePoint$1(endPoint, currentEnd) || samePoint$1(startPoint, currentEnd) && samePoint$1(startPoint, currentStart);
			})) return [first, "same"];
			return [first, second];
		});
	}
	var splitPaths = (curves) => {
		const startPoints = curves.map((c) => c.firstPoint);
		let endPoints = curves.map((c) => c.lastPoint);
		endPoints = endPoints.slice(-1).concat(endPoints.slice(0, -1));
		const discontinuities = zip([startPoints, endPoints]).map(([startPoint, endPoint], index) => {
			if (!samePoint$1(startPoint, endPoint)) return index;
			return null;
		}).filter((f) => f !== null);
		if (!discontinuities.length) return [curves];
		const paths = zip([discontinuities.slice(0, -1), discontinuities.slice(1)]).map(([start, end]) => {
			return curves.slice(start, end);
		});
		let lastPath = curves.slice(discontinuities[discontinuities.length - 1]);
		if (discontinuities[0] !== 0) lastPath = lastPath.concat(curves.slice(0, discontinuities[0]));
		paths.push(lastPath);
		return paths;
	};
	function booleanOperation(first, second, { firstInside, secondInside }) {
		const segments = blueprintsIntersectionSegments(first, second);
		if (!segments) {
			const firstBlueprintPoint = curveMidPoint(first.curves[0]);
			const firstCurveInSecond = second.isInside(firstBlueprintPoint);
			const secondBlueprintPoint = curveMidPoint(second.curves[0]);
			return {
				identical: false,
				firstCurveInSecond,
				secondCurveInFirst: first.isInside(secondBlueprintPoint)
			};
		}
		if (segments.every(([, secondSegment]) => secondSegment === "same")) return { identical: true };
		let lastWasSame = null;
		let segmentsIn = null;
		const paths = splitPaths(segments.flatMap(([firstSegment, secondSegment]) => {
			let segments = [];
			let segmentsOut = 0;
			if (secondSegment === "same") {
				if (segmentsIn === 1) {
					segmentsIn = 1;
					return [...firstSegment];
				}
				if (segmentsIn === 2 || segmentsIn === 0) {
					segmentsIn = null;
					return [];
				}
				if (segmentsIn === null) {
					if (!lastWasSame) lastWasSame = firstSegment;
					else lastWasSame = [...lastWasSame, ...firstSegment];
					return [];
				}
				console.error("weird situation");
				return [];
			}
			const firstSegmentPoint = curveMidPoint(firstSegment[0]);
			const firstSegmentInSecondShape = second.isInside(firstSegmentPoint);
			if (firstInside === "keep" && firstSegmentInSecondShape || firstInside === "remove" && !firstSegmentInSecondShape) {
				segmentsOut += 1;
				segments.push(...firstSegment);
			}
			const secondSegmentPoint = curveMidPoint(secondSegment[0]);
			const secondSegmentInFirstShape = first.isInside(secondSegmentPoint);
			if (secondInside === "keep" && secondSegmentInFirstShape || secondInside === "remove" && !secondSegmentInFirstShape) {
				let segmentsToAdd = secondSegment;
				if (segmentsOut === 1) segmentsToAdd = reverseSegment(secondSegment);
				segmentsOut += 1;
				segments.push(...segmentsToAdd);
			}
			if (segmentsIn === null && segmentsOut === 1 && lastWasSame) segments = [...lastWasSame, ...segments];
			if (segmentsOut === 1) {
				segmentsIn = segmentsOut;
				lastWasSame = null;
			}
			return segments;
		})).filter((b) => b.length).map((b) => new Blueprint(b));
		if (paths.length === 0) return null;
		if (paths.length === 1) return paths[0];
		return organiseBlueprints(paths);
	}
	var fuseBlueprints = (first, second) => {
		const result = booleanOperation(first, second, {
			firstInside: "remove",
			secondInside: "remove"
		});
		if (result === null || result instanceof Blueprint || result instanceof Blueprints) return result;
		if (result.identical) return first.clone();
		if (result.firstCurveInSecond) return second.clone();
		if (result.secondCurveInFirst) return first.clone();
		return new Blueprints([first, second]);
	};
	var cutBlueprints = (first, second) => {
		const result = booleanOperation(first, second, {
			firstInside: "remove",
			secondInside: "keep"
		});
		if (result === null || result instanceof Blueprint || result instanceof Blueprints) return result;
		if (result.identical) return null;
		if (result.firstCurveInSecond) return null;
		if (result.secondCurveInFirst) return new Blueprints([new CompoundBlueprint([first, second])]);
		return first.clone();
	};
	var intersectBlueprints = (first, second) => {
		const result = booleanOperation(first, second, {
			firstInside: "keep",
			secondInside: "keep"
		});
		if (result === null || result instanceof Blueprint || result instanceof Blueprints) return result;
		if (result.identical) return first.clone();
		if (result.firstCurveInSecond) return first.clone();
		if (result.secondCurveInFirst) return second.clone();
		return null;
	};
	//#endregion
	//#region src/blueprints/boolean2D.ts
	var genericIntersects = (first, second) => {
		if (first instanceof Blueprint && second instanceof Blueprint) {
			let allIntersections = [];
			first.curves.forEach((thisCurve) => {
				second.curves.forEach((otherCurve) => {
					const { intersections, commonSegmentsPoints } = intersectCurves(thisCurve, otherCurve);
					allIntersections.push(...intersections);
					allIntersections.push(...commonSegmentsPoints);
				});
			});
			allIntersections = removeDuplicatePoints(allIntersections);
			return allIntersections.length > 1;
		}
		if (first instanceof CompoundBlueprint || first instanceof Blueprints) return first.blueprints.some((bp) => genericIntersects(bp, second));
		if (second instanceof CompoundBlueprint || second instanceof Blueprints) return second.blueprints.some((bp) => genericIntersects(first, bp));
		throw new Error("Bug in the generic intersects algorithm");
	};
	var genericFuse = (first, second) => {
		if (first instanceof CompoundBlueprint) {
			if (second instanceof Blueprint) return fuseBlueprintWithCompound(second, first);
			if (second instanceof CompoundBlueprint) return fuseCompoundWithCompound(first, second);
		}
		if (second instanceof CompoundBlueprint) {
			if (first instanceof Blueprint) return fuseBlueprintWithCompound(first, second);
			if (first instanceof CompoundBlueprint) return fuseCompoundWithCompound(first, second);
		}
		if (first instanceof Blueprint && second instanceof Blueprint) return fuseBlueprints(first, second);
		throw new Error("Bug in the generic fuse algorithm");
	};
	var fuseIntersectingBlueprints = (blueprints) => {
		const fused = /* @__PURE__ */ new Map();
		const output = [];
		blueprints.forEach((inputBlueprint, i) => {
			let savedBlueprint;
			if (fused.has(i)) savedBlueprint = fused.get(i);
			else {
				savedBlueprint = {
					current: inputBlueprint,
					fusedWith: /* @__PURE__ */ new Set([i])
				};
				output.push(savedBlueprint);
			}
			blueprints.slice(i + 1).forEach((inputOtherBlueprint, j) => {
				const blueprint = savedBlueprint.current;
				const currentIndex = i + j + 1;
				if (savedBlueprint.fusedWith.has(currentIndex)) return;
				let otherBlueprint = inputOtherBlueprint;
				let otherIsFused = false;
				if (fused.has(currentIndex)) {
					otherBlueprint = fused.get(currentIndex).current;
					otherIsFused = true;
				}
				if (blueprint.boundingBox.isOut(otherBlueprint.boundingBox)) return;
				if (!genericIntersects(blueprint, otherBlueprint)) return;
				let newFused;
				if (blueprint instanceof Blueprints || otherBlueprint instanceof Blueprints) newFused = fuse2D(blueprint, otherBlueprint);
				else newFused = genericFuse(blueprint, otherBlueprint);
				if (!(newFused instanceof Blueprint || newFused instanceof CompoundBlueprint)) {
					if (newFused instanceof Blueprints && newFused.blueprints.length === 2) return;
					else if (newFused instanceof Blueprints && newFused.blueprints.length === 1) newFused = newFused.blueprints[0];
					else if (!(newFused instanceof Blueprints)) {
						console.error(newFused);
						throw new Error("Bug in blueprint fusing algorigthm");
					}
				}
				savedBlueprint.fusedWith.add(currentIndex);
				savedBlueprint.current = newFused;
				if (!otherIsFused) fused.set(currentIndex, savedBlueprint);
			});
		});
		return organiseBlueprints(output.map(({ current }) => current).filter((a) => a).flatMap((b) => allBlueprints(b)));
	};
	var allBlueprints = (shape) => {
		if (shape instanceof Blueprint) return [shape];
		if (shape instanceof CompoundBlueprint) return shape.blueprints;
		if (shape instanceof Blueprints) return shape.blueprints.flatMap((b) => allBlueprints(b));
		return [];
	};
	var fuseBlueprintWithCompound = (blueprint, compound) => {
		const outerFused = fuseBlueprints(blueprint, compound.blueprints[0]);
		const innerFused = compound.blueprints.slice(1).map((c) => cutBlueprints(c, blueprint));
		return organiseBlueprints([...allBlueprints(outerFused), ...innerFused.flatMap((fused) => allBlueprints(fused))]);
	};
	function allPairs(list1, list2) {
		const result = [];
		for (const l1 of list1) for (const l2 of list2) result.push([l1, l2]);
		return result;
	}
	var fuseCompoundWithCompound = (first, second) => {
		const outerFused = fuseBlueprints(first.blueprints[0], second.blueprints[0]);
		const inner1Fused = second.blueprints.slice(1).map((c) => cutBlueprints(c, first.blueprints[0]));
		const inner2Fused = first.blueprints.slice(1).map((c) => cutBlueprints(c, second.blueprints[0]));
		const innerIntersections = allPairs(first.blueprints.slice(1), second.blueprints.slice(1)).flatMap(([first, second]) => {
			return allBlueprints(intersectBlueprints(first, second));
		});
		return organiseBlueprints([
			...allBlueprints(outerFused),
			...inner1Fused.flatMap((fused) => allBlueprints(fused)),
			...inner2Fused.flatMap((fused) => allBlueprints(fused)),
			...innerIntersections
		]);
	};
	var fuse2D = (first, second) => {
		if (first === null) return second && second.clone();
		if (second === null) return first && first.clone();
		if (!(first instanceof Blueprints) && second instanceof Blueprints) return fuseIntersectingBlueprints([first, ...second.blueprints]);
		if (!(second instanceof Blueprints) && first instanceof Blueprints) return fuseIntersectingBlueprints([second, ...first.blueprints]);
		if (first instanceof Blueprints && second instanceof Blueprints) {
			let out = fuse2D(first.blueprints[0], second);
			first.blueprints.slice(1).forEach((bp) => {
				out = fuse2D(bp, out);
			});
			return out;
		}
		if (first instanceof CompoundBlueprint) {
			if (second instanceof Blueprints) return fuse2D(second, first);
			if (second instanceof Blueprint) return fuseBlueprintWithCompound(second, first);
			if (second instanceof CompoundBlueprint) return fuseCompoundWithCompound(first, second);
		}
		if (second instanceof CompoundBlueprint) {
			if (first instanceof Blueprints) return fuse2D(first, second);
			if (first instanceof Blueprint) return fuseBlueprintWithCompound(first, second);
			if (first instanceof CompoundBlueprint) return fuseCompoundWithCompound(first, second);
		}
		if (first instanceof Blueprint && second instanceof Blueprint) return fuseBlueprints(first, second);
		return null;
	};
	var mergeNonIntersecting = (shapes) => {
		const exploded = shapes.flatMap((s) => {
			if (s === null) return [];
			if (s instanceof Blueprints) return s.blueprints;
			return s;
		});
		if (exploded.length === 1) return exploded[0];
		return new Blueprints(exploded);
	};
	var cut2D = (first, second) => {
		if (first === null) return null;
		if (second === null) return first.clone();
		if (second instanceof Blueprints) {
			let out = first.clone();
			for (const blueprint of second.blueprints) out = cut2D(out, blueprint);
			return out;
		}
		if (first instanceof Blueprints) return mergeNonIntersecting(first.blueprints.map((bp) => cut2D(bp, second)));
		if (first instanceof CompoundBlueprint) {
			const wrapper = first.blueprints[0];
			if (second instanceof Blueprint && !second.intersects(wrapper)) {
				if (!wrapper.isInside(second.firstPoint)) return second.isInside(wrapper.firstPoint) ? null : first.clone();
				return organiseBlueprints([wrapper, ...allBlueprints(fuse2D(second, new Blueprints(first.blueprints.slice(1))))]);
			} else {
				let out = cut2D(first.blueprints[0], second);
				first.blueprints.slice(1).forEach((bp) => {
					out = cut2D(out, bp);
				});
				return out;
			}
		}
		if (second instanceof CompoundBlueprint) {
			let out = cutBlueprints(first, second.blueprints[0]);
			second.blueprints.slice(1).forEach((bp) => {
				out = fuse2D(out, intersectBlueprints(bp, first));
			});
			return out;
		}
		return cutBlueprints(first, second);
	};
	function intersect2D(first, second) {
		if (first === null || second === null) return null;
		if (first instanceof Blueprint && second instanceof Blueprint) return intersectBlueprints(first, second);
		if (first instanceof Blueprints) return mergeNonIntersecting(first.blueprints.map((bp) => intersect2D(bp, second)));
		if (first instanceof CompoundBlueprint) {
			const wrapper = first.blueprints[0];
			const cut = first.blueprints[1];
			return cut2D(intersect2D(wrapper, second), cut);
		}
		if (second instanceof Blueprints) return mergeNonIntersecting(second.blueprints.map((bp) => intersect2D(first, bp)));
		if (second instanceof CompoundBlueprint) {
			const wrapper = second.blueprints[0];
			const cut = second.blueprints[1];
			return cut2D(intersect2D(wrapper, first), cut);
		}
		throw new Error("intersct 2D algorithm error");
	}
	//#endregion
	//#region src/sketches/cannedSketches.ts
	/**
	* Creates the `Sketch` of a circle in a defined plane
	*
	* @category Sketching
	*/
	var sketchCircle = (radius, planeConfig = {}) => {
		const plane = planeConfig.plane instanceof Plane ? makePlane(planeConfig.plane) : makePlane(planeConfig.plane, planeConfig.origin);
		const sketch = new Sketch(assembleWire([makeCircle(radius, plane.origin, plane.zDir)]), {
			defaultOrigin: plane.origin,
			defaultDirection: plane.zDir
		});
		plane.delete();
		return sketch;
	};
	/**
	* Creates the `Sketch` of an ellispe in a defined plane
	*
	* @category Sketching
	*/
	var sketchEllipse = (xRadius = 1, yRadius = 2, planeConfig = {}) => {
		const plane = planeConfig.plane instanceof Plane ? makePlane(planeConfig.plane) : makePlane(planeConfig.plane, planeConfig.origin);
		const xDir = new Vector(plane.xDir);
		let majR = xRadius;
		let minR = yRadius;
		if (yRadius > xRadius) {
			xDir.rotate(90, plane.origin, plane.zDir);
			majR = yRadius;
			minR = xRadius;
		}
		const wire = assembleWire([makeEllipse(majR, minR, plane.origin, plane.zDir, xDir)]);
		xDir.delete();
		const sketch = new Sketch(wire, {
			defaultOrigin: plane.origin,
			defaultDirection: plane.zDir
		});
		plane.delete();
		return sketch;
	};
	/**
	* Creates the `Sketch` of a rectangle in a defined plane
	*
	* @category Sketching
	*/
	var sketchRectangle = (xLength, yLength, planeConfig = {}) => {
		return (planeConfig.plane instanceof Plane ? new Sketcher(planeConfig.plane) : new Sketcher(planeConfig.plane, planeConfig.origin)).movePointerTo([-xLength / 2, -yLength / 2]).hLine(xLength).vLine(yLength).hLine(-xLength).vLine(-yLength).done();
	};
	/**
	* Creates the `Sketch` of a rounded rectangle in a defined plane
	*
	* @category Sketching
	*/
	var sketchRoundedRectangle = (width, height, r = 0, planeConfig = {}) => {
		return roundedRectangleBlueprint(width, height, r).sketchOnPlane(planeConfig.plane, planeConfig.origin);
	};
	/**
	* Creates the `Sketch` of an polygon in a defined plane
	*
	* The sides of the polygon can be arcs of circle with a defined sagitta.
	* The radius defines the out radius of the polygon without sagitta
	*
	* @category Sketching
	*/
	var sketchPolysides = (radius, sidesCount, sagitta = 0, planeConfig = {}) => {
		const points = [...Array(sidesCount).keys()].map((i) => {
			const theta = -(Math.PI * 2 / sidesCount) * i;
			return [radius * Math.sin(theta), radius * Math.cos(theta)];
		});
		const sketch = (planeConfig.plane instanceof Plane ? new Sketcher(planeConfig.plane) : new Sketcher(planeConfig.plane, planeConfig.origin)).movePointerTo([points[points.length - 1][0], points[points.length - 1][1]]);
		if (sagitta) points.forEach(([x, y]) => sketch.sagittaArcTo([x, y], sagitta));
		else points.forEach(([x, y]) => sketch.lineTo([x, y]));
		return sketch.done();
	};
	/**
	* Helper function to compute the inner radius of a polyside (even if a sagitta
	* is defined
	*/
	var polysideInnerRadius = (outerRadius, sidesCount, sagitta = 0) => {
		const innerAngle = Math.PI / sidesCount;
		const innerRadius = Math.cos(innerAngle) * outerRadius;
		if (sagitta >= 0) return innerRadius;
		return innerRadius + sagitta;
	};
	/**
	* Creates the `Sketch` of an offset of a certain face. A negative offset will
	* be within the face, a positive one outside.
	*
	* @category Sketching
	*/
	var sketchFaceOffset = (face, offset) => {
		const defaultOrigin = face.center;
		const defaultDirection = face.normalAt();
		const sketch = new Sketch(face.outerWire().offset2D(offset), {
			defaultOrigin,
			defaultDirection
		});
		defaultOrigin.delete();
		defaultDirection.delete();
		return sketch;
	};
	/**
	* Creates the `Sketch` of parametric function in a specified plane
	*
	* The sketch will be a spline approximating the function
	*
	* @category Sketching
	*/
	var sketchParametricFunction = (func, planeConfig = {}, { pointsCount = 400, start = 0, stop = 1 } = {}, approximationConfig = {}) => {
		const [r, gc] = localGC();
		const plane = r(planeConfig.plane instanceof Plane ? makePlane(planeConfig.plane) : makePlane(planeConfig.plane, planeConfig.origin));
		const stepSize = (stop - start) / pointsCount;
		const sketch = new Sketch(assembleWire([r(makeBSplineApproximation([...Array(pointsCount + 1).keys()].map((t) => {
			const point = func(start + t * stepSize);
			return r(plane.toWorldCoords(point));
		}), approximationConfig))]), {
			defaultOrigin: plane.origin,
			defaultDirection: plane.zDir
		});
		gc();
		return sketch;
	};
	/**
	* Creates the `Sketch` of a helix
	*
	* @category Sketching
	*/
	var sketchHelix = (pitch, height, radius, center = [
		0,
		0,
		0
	], dir = [
		0,
		0,
		1
	], lefthand = false) => {
		return new Sketch(assembleWire(makeHelix(pitch, height, radius, center, dir, lefthand).wires));
	};
	//#endregion
	//#region src/utils/opentype.ts
	var import_opentype = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
		var opentype = (() => {
			var __defProp = Object.defineProperty;
			var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
			var __getOwnPropNames = Object.getOwnPropertyNames;
			var __hasOwnProp = Object.prototype.hasOwnProperty;
			var __export = (target, all) => {
				for (var name in all) __defProp(target, name, {
					get: all[name],
					enumerable: true
				});
			};
			var __copyProps = (to, from, except, desc) => {
				if (from && typeof from === "object" || typeof from === "function") {
					for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
						get: () => from[key],
						enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
					});
				}
				return to;
			};
			var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
			var opentype_exports = {};
			__export(opentype_exports, {
				BoundingBox: () => bbox_default,
				Font: () => font_default,
				Glyph: () => glyph_default,
				Path: () => path_default,
				_parse: () => parse_default,
				load: () => load,
				loadSync: () => loadSync,
				parse: () => parseBuffer
			});
			var TINF_OK = 0;
			var TINF_DATA_ERROR = -3;
			function Tree() {
				this.table = /* @__PURE__ */ new Uint16Array(16);
				this.trans = /* @__PURE__ */ new Uint16Array(288);
			}
			function Data(source, dest) {
				this.source = source;
				this.sourceIndex = 0;
				this.tag = 0;
				this.bitcount = 0;
				this.dest = dest;
				this.destLen = 0;
				this.ltree = new Tree();
				this.dtree = new Tree();
			}
			var sltree = new Tree();
			var sdtree = new Tree();
			var length_bits = /* @__PURE__ */ new Uint8Array(30);
			var length_base = /* @__PURE__ */ new Uint16Array(30);
			var dist_bits = /* @__PURE__ */ new Uint8Array(30);
			var dist_base = /* @__PURE__ */ new Uint16Array(30);
			var clcidx = new Uint8Array([
				16,
				17,
				18,
				0,
				8,
				7,
				9,
				6,
				10,
				5,
				11,
				4,
				12,
				3,
				13,
				2,
				14,
				1,
				15
			]);
			var code_tree = new Tree();
			var lengths = /* @__PURE__ */ new Uint8Array(320);
			function tinf_build_bits_base(bits, base, delta, first) {
				var i, sum;
				for (i = 0; i < delta; ++i) bits[i] = 0;
				for (i = 0; i < 30 - delta; ++i) bits[i + delta] = i / delta | 0;
				for (sum = first, i = 0; i < 30; ++i) {
					base[i] = sum;
					sum += 1 << bits[i];
				}
			}
			function tinf_build_fixed_trees(lt, dt) {
				var i;
				for (i = 0; i < 7; ++i) lt.table[i] = 0;
				lt.table[7] = 24;
				lt.table[8] = 152;
				lt.table[9] = 112;
				for (i = 0; i < 24; ++i) lt.trans[i] = 256 + i;
				for (i = 0; i < 144; ++i) lt.trans[24 + i] = i;
				for (i = 0; i < 8; ++i) lt.trans[168 + i] = 280 + i;
				for (i = 0; i < 112; ++i) lt.trans[176 + i] = 144 + i;
				for (i = 0; i < 5; ++i) dt.table[i] = 0;
				dt.table[5] = 32;
				for (i = 0; i < 32; ++i) dt.trans[i] = i;
			}
			var offs = /* @__PURE__ */ new Uint16Array(16);
			function tinf_build_tree(t, lengths2, off, num) {
				var i, sum;
				for (i = 0; i < 16; ++i) t.table[i] = 0;
				for (i = 0; i < num; ++i) t.table[lengths2[off + i]]++;
				t.table[0] = 0;
				for (sum = 0, i = 0; i < 16; ++i) {
					offs[i] = sum;
					sum += t.table[i];
				}
				for (i = 0; i < num; ++i) if (lengths2[off + i]) t.trans[offs[lengths2[off + i]]++] = i;
			}
			function tinf_getbit(d) {
				if (!d.bitcount--) {
					d.tag = d.source[d.sourceIndex++];
					d.bitcount = 7;
				}
				var bit = d.tag & 1;
				d.tag >>>= 1;
				return bit;
			}
			function tinf_read_bits(d, num, base) {
				if (!num) return base;
				while (d.bitcount < 24) {
					d.tag |= d.source[d.sourceIndex++] << d.bitcount;
					d.bitcount += 8;
				}
				var val = d.tag & 65535 >>> 16 - num;
				d.tag >>>= num;
				d.bitcount -= num;
				return val + base;
			}
			function tinf_decode_symbol(d, t) {
				while (d.bitcount < 24) {
					d.tag |= d.source[d.sourceIndex++] << d.bitcount;
					d.bitcount += 8;
				}
				var sum = 0, cur = 0, len = 0;
				var tag = d.tag;
				do {
					cur = 2 * cur + (tag & 1);
					tag >>>= 1;
					++len;
					sum += t.table[len];
					cur -= t.table[len];
				} while (cur >= 0);
				d.tag = tag;
				d.bitcount -= len;
				return t.trans[sum + cur];
			}
			function tinf_decode_trees(d, lt, dt) {
				var hlit, hdist, hclen;
				var i, num, length;
				hlit = tinf_read_bits(d, 5, 257);
				hdist = tinf_read_bits(d, 5, 1);
				hclen = tinf_read_bits(d, 4, 4);
				for (i = 0; i < 19; ++i) lengths[i] = 0;
				for (i = 0; i < hclen; ++i) {
					var clen = tinf_read_bits(d, 3, 0);
					lengths[clcidx[i]] = clen;
				}
				tinf_build_tree(code_tree, lengths, 0, 19);
				for (num = 0; num < hlit + hdist;) {
					var sym = tinf_decode_symbol(d, code_tree);
					switch (sym) {
						case 16:
							var prev = lengths[num - 1];
							for (length = tinf_read_bits(d, 2, 3); length; --length) lengths[num++] = prev;
							break;
						case 17:
							for (length = tinf_read_bits(d, 3, 3); length; --length) lengths[num++] = 0;
							break;
						case 18:
							for (length = tinf_read_bits(d, 7, 11); length; --length) lengths[num++] = 0;
							break;
						default: lengths[num++] = sym;
					}
				}
				tinf_build_tree(lt, lengths, 0, hlit);
				tinf_build_tree(dt, lengths, hlit, hdist);
			}
			function tinf_inflate_block_data(d, lt, dt) {
				for (;;) {
					var sym = tinf_decode_symbol(d, lt);
					if (sym === 256) return TINF_OK;
					if (sym < 256) d.dest[d.destLen++] = sym;
					else {
						var length, dist, offs2;
						var i;
						sym -= 257;
						length = tinf_read_bits(d, length_bits[sym], length_base[sym]);
						dist = tinf_decode_symbol(d, dt);
						offs2 = d.destLen - tinf_read_bits(d, dist_bits[dist], dist_base[dist]);
						for (i = offs2; i < offs2 + length; ++i) d.dest[d.destLen++] = d.dest[i];
					}
				}
			}
			function tinf_inflate_uncompressed_block(d) {
				var length, invlength;
				var i;
				while (d.bitcount > 8) {
					d.sourceIndex--;
					d.bitcount -= 8;
				}
				length = d.source[d.sourceIndex + 1];
				length = 256 * length + d.source[d.sourceIndex];
				invlength = d.source[d.sourceIndex + 3];
				invlength = 256 * invlength + d.source[d.sourceIndex + 2];
				if (length !== (~invlength & 65535)) return TINF_DATA_ERROR;
				d.sourceIndex += 4;
				for (i = length; i; --i) d.dest[d.destLen++] = d.source[d.sourceIndex++];
				d.bitcount = 0;
				return TINF_OK;
			}
			function tinf_uncompress(source, dest) {
				var d = new Data(source, dest);
				var bfinal, btype, res;
				do {
					bfinal = tinf_getbit(d);
					btype = tinf_read_bits(d, 2, 0);
					switch (btype) {
						case 0:
							res = tinf_inflate_uncompressed_block(d);
							break;
						case 1:
							res = tinf_inflate_block_data(d, sltree, sdtree);
							break;
						case 2:
							tinf_decode_trees(d, d.ltree, d.dtree);
							res = tinf_inflate_block_data(d, d.ltree, d.dtree);
							break;
						default: res = TINF_DATA_ERROR;
					}
					if (res !== TINF_OK) throw new Error("Data error");
				} while (!bfinal);
				if (d.destLen < d.dest.length) {
					if (typeof d.dest.slice === "function") return d.dest.slice(0, d.destLen);
					else return d.dest.subarray(0, d.destLen);
				}
				return d.dest;
			}
			tinf_build_fixed_trees(sltree, sdtree);
			tinf_build_bits_base(length_bits, length_base, 4, 3);
			tinf_build_bits_base(dist_bits, dist_base, 2, 1);
			length_bits[28] = 0;
			length_base[28] = 258;
			function derive(v0, v1, v2, v3, t) {
				return Math.pow(1 - t, 3) * v0 + 3 * Math.pow(1 - t, 2) * t * v1 + 3 * (1 - t) * Math.pow(t, 2) * v2 + Math.pow(t, 3) * v3;
			}
			function BoundingBox() {
				this.x1 = NaN;
				this.y1 = NaN;
				this.x2 = NaN;
				this.y2 = NaN;
			}
			BoundingBox.prototype.isEmpty = function() {
				return isNaN(this.x1) || isNaN(this.y1) || isNaN(this.x2) || isNaN(this.y2);
			};
			BoundingBox.prototype.addPoint = function(x, y) {
				if (typeof x === "number") {
					if (isNaN(this.x1) || isNaN(this.x2)) {
						this.x1 = x;
						this.x2 = x;
					}
					if (x < this.x1) this.x1 = x;
					if (x > this.x2) this.x2 = x;
				}
				if (typeof y === "number") {
					if (isNaN(this.y1) || isNaN(this.y2)) {
						this.y1 = y;
						this.y2 = y;
					}
					if (y < this.y1) this.y1 = y;
					if (y > this.y2) this.y2 = y;
				}
			};
			BoundingBox.prototype.addX = function(x) {
				this.addPoint(x, null);
			};
			BoundingBox.prototype.addY = function(y) {
				this.addPoint(null, y);
			};
			BoundingBox.prototype.addBezier = function(x0, y0, x1, y1, x2, y2, x, y) {
				const p0 = [x0, y0];
				const p1 = [x1, y1];
				const p2 = [x2, y2];
				const p3 = [x, y];
				this.addPoint(x0, y0);
				this.addPoint(x, y);
				for (let i = 0; i <= 1; i++) {
					const b = 6 * p0[i] - 12 * p1[i] + 6 * p2[i];
					const a = -3 * p0[i] + 9 * p1[i] - 9 * p2[i] + 3 * p3[i];
					const c = 3 * p1[i] - 3 * p0[i];
					if (a === 0) {
						if (b === 0) continue;
						const t = -c / b;
						if (0 < t && t < 1) {
							if (i === 0) this.addX(derive(p0[i], p1[i], p2[i], p3[i], t));
							if (i === 1) this.addY(derive(p0[i], p1[i], p2[i], p3[i], t));
						}
						continue;
					}
					const b2ac = Math.pow(b, 2) - 4 * c * a;
					if (b2ac < 0) continue;
					const t1 = (-b + Math.sqrt(b2ac)) / (2 * a);
					if (0 < t1 && t1 < 1) {
						if (i === 0) this.addX(derive(p0[i], p1[i], p2[i], p3[i], t1));
						if (i === 1) this.addY(derive(p0[i], p1[i], p2[i], p3[i], t1));
					}
					const t2 = (-b - Math.sqrt(b2ac)) / (2 * a);
					if (0 < t2 && t2 < 1) {
						if (i === 0) this.addX(derive(p0[i], p1[i], p2[i], p3[i], t2));
						if (i === 1) this.addY(derive(p0[i], p1[i], p2[i], p3[i], t2));
					}
				}
			};
			BoundingBox.prototype.addQuad = function(x0, y0, x1, y1, x, y) {
				const cp1x = x0 + 2 / 3 * (x1 - x0);
				const cp1y = y0 + 2 / 3 * (y1 - y0);
				const cp2x = cp1x + 1 / 3 * (x - x0);
				const cp2y = cp1y + 1 / 3 * (y - y0);
				this.addBezier(x0, y0, cp1x, cp1y, cp2x, cp2y, x, y);
			};
			var bbox_default = BoundingBox;
			function Path() {
				this.commands = [];
				this.fill = "black";
				this.stroke = null;
				this.strokeWidth = 1;
			}
			var decimalRoundingCache = {};
			function roundDecimal(float, places) {
				const integerPart = Math.floor(float);
				const decimalPart = float - integerPart;
				if (!decimalRoundingCache[places]) decimalRoundingCache[places] = {};
				if (decimalRoundingCache[places][decimalPart] !== void 0) return integerPart + decimalRoundingCache[places][decimalPart];
				const roundedDecimalPart = +(Math.round(decimalPart + "e+" + places) + "e-" + places);
				decimalRoundingCache[places][decimalPart] = roundedDecimalPart;
				return integerPart + roundedDecimalPart;
			}
			function optimizeCommands(commands) {
				let subpaths = [[]];
				let startX = 0, startY = 0;
				for (let i = 0; i < commands.length; i += 1) {
					const subpath = subpaths[subpaths.length - 1];
					const cmd = commands[i];
					const firstCommand = subpath[0];
					const secondCommand = subpath[1];
					const previousCommand = subpath[subpath.length - 1];
					const nextCommand = commands[i + 1];
					subpath.push(cmd);
					if (cmd.type === "M") {
						startX = cmd.x;
						startY = cmd.y;
					} else if (cmd.type === "L" && (!nextCommand || nextCommand.type === "Z")) {
						if (!(Math.abs(cmd.x - startX) > 1 || Math.abs(cmd.y - startY) > 1)) subpath.pop();
					} else if (cmd.type === "L" && previousCommand && previousCommand.x === cmd.x && previousCommand.y === cmd.y) subpath.pop();
					else if (cmd.type === "Z") {
						if (firstCommand && secondCommand && previousCommand && firstCommand.type === "M" && secondCommand.type === "L" && previousCommand.type === "L" && previousCommand.x === firstCommand.x && previousCommand.y === firstCommand.y) {
							subpath.shift();
							subpath[0].type = "M";
						}
						if (i + 1 < commands.length) subpaths.push([]);
					}
				}
				commands = [].concat.apply([], subpaths);
				return commands;
			}
			function createSVGParsingOptions(options) {
				return Object.assign({}, {
					decimalPlaces: 2,
					optimize: true,
					flipY: true,
					flipYBase: void 0,
					scale: 1,
					x: 0,
					y: 0
				}, options);
			}
			function createSVGOutputOptions(options) {
				if (parseInt(options) === options) options = {
					decimalPlaces: options,
					flipY: false
				};
				return Object.assign({}, {
					decimalPlaces: 2,
					optimize: true,
					flipY: true,
					flipYBase: void 0
				}, options);
			}
			Path.prototype.fromSVG = function(pathData, options = {}) {
				if (typeof SVGPathElement !== "undefined" && pathData instanceof SVGPathElement) pathData = pathData.getAttribute("d");
				options = createSVGParsingOptions(options);
				this.commands = [];
				const number = "0123456789";
				const supportedCommands = "MmLlQqCcZzHhVv";
				const unsupportedCommands = "SsTtAa";
				const sign = "-+";
				let command = {};
				let buffer = [""];
				let isUnexpected = false;
				function parseBuffer2(buffer2) {
					return buffer2.filter((b) => b.length).map((b) => {
						let float = parseFloat(b);
						if (options.decimalPlaces || options.decimalPlaces === 0) float = roundDecimal(float, options.decimalPlaces);
						return float;
					});
				}
				function makeRelative(buffer2) {
					if (!this.commands.length) return buffer2;
					const lastCommand = this.commands[this.commands.length - 1];
					for (let i = 0; i < buffer2.length; i++) buffer2[i] += lastCommand[i & 1 ? "y" : "x"];
					return buffer2;
				}
				function applyCommand() {
					if (command.type === void 0) return;
					const commandType = command.type.toUpperCase();
					const relative = commandType !== "Z" && command.type.toUpperCase() !== command.type;
					let parsedBuffer = parseBuffer2(buffer);
					buffer = [""];
					if (!parsedBuffer.length && commandType !== "Z") return;
					if (relative && commandType !== "H" && commandType !== "V") parsedBuffer = makeRelative.apply(this, [parsedBuffer]);
					const currentX = this.commands.length ? this.commands[this.commands.length - 1].x || 0 : 0;
					const currentY = this.commands.length ? this.commands[this.commands.length - 1].y || 0 : 0;
					switch (commandType) {
						case "M":
							this.moveTo(...parsedBuffer);
							break;
						case "L":
							this.lineTo(...parsedBuffer);
							break;
						case "V":
							for (let i = 0; i < parsedBuffer.length; i++) {
								let offset = 0;
								if (relative) offset = this.commands.length ? this.commands[this.commands.length - 1].y || 0 : 0;
								this.lineTo(currentX, parsedBuffer[i] + offset);
							}
							break;
						case "H":
							for (let i = 0; i < parsedBuffer.length; i++) {
								let offset = 0;
								if (relative) offset = this.commands.length ? this.commands[this.commands.length - 1].x || 0 : 0;
								this.lineTo(parsedBuffer[i] + offset, currentY);
							}
							break;
						case "C":
							this.bezierCurveTo(...parsedBuffer);
							break;
						case "Q":
							this.quadraticCurveTo(...parsedBuffer);
							break;
						case "Z": if (this.commands.length < 1 || this.commands[this.commands.length - 1].type !== "Z") this.close();
					}
					if (this.commands.length) {
						for (const prop in this.commands[this.commands.length - 1]) if (this.commands[this.commands.length - 1][prop] === void 0) this.commands[this.commands.length - 1][prop] = 0;
					}
				}
				for (let i = 0; i < pathData.length; i++) {
					const token = pathData.charAt(i);
					const lastBuffer = buffer[buffer.length - 1];
					if (number.indexOf(token) > -1) buffer[buffer.length - 1] += token;
					else if (sign.indexOf(token) > -1) {
						if (!command.type && !this.commands.length) command.type = "L";
						if (token === "-") {
							if (!command.type || lastBuffer.indexOf("-") > 0) isUnexpected = true;
							else if (lastBuffer.length) buffer.push("-");
							else buffer[buffer.length - 1] = token;
						} else if (!command.type || lastBuffer.length > 0) isUnexpected = true;
						else continue;
					} else if (supportedCommands.indexOf(token) > -1) {
						if (command.type) {
							applyCommand.apply(this);
							command = { type: token };
						} else command.type = token;
					} else if (unsupportedCommands.indexOf(token) > -1) throw new Error("Unsupported path command: " + token + ". Currently supported commands are " + supportedCommands.split("").join(", ") + ".");
					else if (" ,	\n\r\f\v".indexOf(token) > -1) buffer.push("");
					else if (token === ".") {
						if (!command.type || lastBuffer.indexOf(token) > -1) isUnexpected = true;
						else buffer[buffer.length - 1] += token;
					} else isUnexpected = true;
					if (isUnexpected) throw new Error("Unexpected character: " + token + " at offset " + i);
				}
				applyCommand.apply(this);
				if (options.optimize) this.commands = optimizeCommands(this.commands);
				const flipY = options.flipY;
				let flipYBase = options.flipYBase;
				if (flipY === true && options.flipYBase === void 0) {
					const boundingBox = this.getBoundingBox();
					flipYBase = boundingBox.y1 + boundingBox.y2;
				}
				for (const i in this.commands) {
					const cmd = this.commands[i];
					for (const prop in cmd) if ([
						"x",
						"x1",
						"x2"
					].includes(prop)) this.commands[i][prop] = options.x + cmd[prop] * options.scale;
					else if ([
						"y",
						"y1",
						"y2"
					].includes(prop)) this.commands[i][prop] = options.y + (flipY ? flipYBase - cmd[prop] : cmd[prop]) * options.scale;
				}
				return this;
			};
			Path.fromSVG = function(path, options) {
				return new Path().fromSVG(path, options);
			};
			Path.prototype.moveTo = function(x, y) {
				this.commands.push({
					type: "M",
					x,
					y
				});
			};
			Path.prototype.lineTo = function(x, y) {
				this.commands.push({
					type: "L",
					x,
					y
				});
			};
			Path.prototype.curveTo = Path.prototype.bezierCurveTo = function(x1, y1, x2, y2, x, y) {
				this.commands.push({
					type: "C",
					x1,
					y1,
					x2,
					y2,
					x,
					y
				});
			};
			Path.prototype.quadTo = Path.prototype.quadraticCurveTo = function(x1, y1, x, y) {
				this.commands.push({
					type: "Q",
					x1,
					y1,
					x,
					y
				});
			};
			Path.prototype.close = Path.prototype.closePath = function() {
				this.commands.push({ type: "Z" });
			};
			Path.prototype.extend = function(pathOrCommands) {
				if (pathOrCommands.commands) pathOrCommands = pathOrCommands.commands;
				else if (pathOrCommands instanceof bbox_default) {
					const box = pathOrCommands;
					this.moveTo(box.x1, box.y1);
					this.lineTo(box.x2, box.y1);
					this.lineTo(box.x2, box.y2);
					this.lineTo(box.x1, box.y2);
					this.close();
					return;
				}
				Array.prototype.push.apply(this.commands, pathOrCommands);
			};
			Path.prototype.getBoundingBox = function() {
				const box = new bbox_default();
				let startX = 0;
				let startY = 0;
				let prevX = 0;
				let prevY = 0;
				for (let i = 0; i < this.commands.length; i++) {
					const cmd = this.commands[i];
					switch (cmd.type) {
						case "M":
							box.addPoint(cmd.x, cmd.y);
							startX = prevX = cmd.x;
							startY = prevY = cmd.y;
							break;
						case "L":
							box.addPoint(cmd.x, cmd.y);
							prevX = cmd.x;
							prevY = cmd.y;
							break;
						case "Q":
							box.addQuad(prevX, prevY, cmd.x1, cmd.y1, cmd.x, cmd.y);
							prevX = cmd.x;
							prevY = cmd.y;
							break;
						case "C":
							box.addBezier(prevX, prevY, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
							prevX = cmd.x;
							prevY = cmd.y;
							break;
						case "Z":
							prevX = startX;
							prevY = startY;
							break;
						default: throw new Error("Unexpected path command " + cmd.type);
					}
				}
				if (box.isEmpty()) box.addPoint(0, 0);
				return box;
			};
			Path.prototype.draw = function(ctx) {
				const layers = this._layers;
				if (layers && layers.length) {
					for (let l = 0; l < layers.length; l++) this.draw.call(layers[l], ctx);
					return;
				}
				const image = this._image;
				if (image) {
					ctx.drawImage(image.image, image.x, image.y, image.width, image.height);
					return;
				}
				ctx.beginPath();
				for (let i = 0; i < this.commands.length; i += 1) {
					const cmd = this.commands[i];
					if (cmd.type === "M") ctx.moveTo(cmd.x, cmd.y);
					else if (cmd.type === "L") ctx.lineTo(cmd.x, cmd.y);
					else if (cmd.type === "C") ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
					else if (cmd.type === "Q") ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
					else if (cmd.type === "Z" && this.stroke && this.strokeWidth) ctx.closePath();
				}
				if (this.fill) {
					ctx.fillStyle = this.fill;
					ctx.fill();
				}
				if (this.stroke) {
					ctx.strokeStyle = this.stroke;
					ctx.lineWidth = this.strokeWidth;
					ctx.stroke();
				}
			};
			Path.prototype.toPathData = function(options) {
				options = createSVGOutputOptions(options);
				function floatToString(v) {
					const rounded = roundDecimal(v, options.decimalPlaces);
					if (Math.round(v) === rounded) return "" + rounded;
					else return rounded.toFixed(options.decimalPlaces);
				}
				function packValues() {
					let s = "";
					for (let i = 0; i < arguments.length; i += 1) {
						const v = arguments[i];
						if (v >= 0 && i > 0) s += " ";
						s += floatToString(v);
					}
					return s;
				}
				let commandsCopy = this.commands;
				if (options.optimize) {
					commandsCopy = JSON.parse(JSON.stringify(this.commands));
					commandsCopy = optimizeCommands(commandsCopy);
				}
				const flipY = options.flipY;
				let flipYBase = options.flipYBase;
				if (flipY === true && flipYBase === void 0) {
					const tempPath = new Path();
					tempPath.extend(commandsCopy);
					const boundingBox = tempPath.getBoundingBox();
					flipYBase = boundingBox.y1 + boundingBox.y2;
				}
				let d = "";
				for (let i = 0; i < commandsCopy.length; i += 1) {
					const cmd = commandsCopy[i];
					if (cmd.type === "M") d += "M" + packValues(cmd.x, flipY ? flipYBase - cmd.y : cmd.y);
					else if (cmd.type === "L") d += "L" + packValues(cmd.x, flipY ? flipYBase - cmd.y : cmd.y);
					else if (cmd.type === "C") d += "C" + packValues(cmd.x1, flipY ? flipYBase - cmd.y1 : cmd.y1, cmd.x2, flipY ? flipYBase - cmd.y2 : cmd.y2, cmd.x, flipY ? flipYBase - cmd.y : cmd.y);
					else if (cmd.type === "Q") d += "Q" + packValues(cmd.x1, flipY ? flipYBase - cmd.y1 : cmd.y1, cmd.x, flipY ? flipYBase - cmd.y : cmd.y);
					else if (cmd.type === "Z") d += "Z";
				}
				return d;
			};
			Path.prototype.toSVG = function(options, pathData) {
				if (this._layers && this._layers.length) console.warn("toSVG() does not support colr font layers yet");
				if (this._image) console.warn("toSVG() does not support SVG glyphs yet");
				if (!pathData) pathData = this.toPathData(options);
				let svg = "<path d=\"";
				svg += pathData;
				svg += "\"";
				if (this.fill !== void 0 && this.fill !== "black") {
					if (this.fill === null) svg += " fill=\"none\"";
					else svg += " fill=\"" + this.fill + "\"";
				}
				if (this.stroke) svg += " stroke=\"" + this.stroke + "\" stroke-width=\"" + this.strokeWidth + "\"";
				svg += "/>";
				return svg;
			};
			Path.prototype.toDOMElement = function(options, pathData) {
				if (this._layers && this._layers.length) console.warn("toDOMElement() does not support colr font layers yet");
				if (!pathData) pathData = this.toPathData(options);
				const newPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
				newPath.setAttribute("d", pathData);
				if (this.fill !== void 0 && this.fill !== "black") {
					if (this.fill === null) newPath.setAttribute("fill", "none");
					else newPath.setAttribute("fill", this.fill);
				}
				if (this.stroke) {
					newPath.setAttribute("stroke", this.stroke);
					newPath.setAttribute("stroke-width", this.strokeWidth);
				}
				return newPath;
			};
			var path_default = Path;
			function fail(message) {
				throw new Error(message);
			}
			function argument(predicate, message) {
				if (!predicate) fail(message);
			}
			var check_default = {
				fail,
				argument,
				assert: argument
			};
			var LIMIT16 = 32768;
			var LIMIT32 = 2147483648;
			var MIN_16_16 = -32768;
			var MAX_16_16 = 32767 + 1 / 65536;
			var decode = {};
			var encode = {};
			var sizeOf = {};
			function constant(v) {
				return function() {
					return v;
				};
			}
			encode.BYTE = function(v) {
				check_default.argument(v >= 0 && v <= 255, "Byte value should be between 0 and 255.");
				return [v];
			};
			sizeOf.BYTE = constant(1);
			encode.CHAR = function(v) {
				return [v.charCodeAt(0)];
			};
			sizeOf.CHAR = constant(1);
			encode.CHARARRAY = function(v) {
				if (v === null || typeof v === "undefined") {
					v = "";
					console.warn("CHARARRAY with undefined or null value encountered and treated as an empty string. This is probably caused by a missing glyph name.");
				}
				const b = [];
				for (let i = 0; i < v.length; i += 1) b[i] = v.charCodeAt(i);
				return b;
			};
			sizeOf.CHARARRAY = function(v) {
				if (typeof v === "undefined") return 0;
				return v.length;
			};
			encode.USHORT = function(v) {
				return [v >> 8 & 255, v & 255];
			};
			sizeOf.USHORT = constant(2);
			encode.SHORT = function(v) {
				if (v >= LIMIT16) v = -(2 * LIMIT16 - v);
				return [v >> 8 & 255, v & 255];
			};
			sizeOf.SHORT = constant(2);
			encode.UINT24 = function(v) {
				return [
					v >> 16 & 255,
					v >> 8 & 255,
					v & 255
				];
			};
			sizeOf.UINT24 = constant(3);
			encode.ULONG = function(v) {
				return [
					v >> 24 & 255,
					v >> 16 & 255,
					v >> 8 & 255,
					v & 255
				];
			};
			sizeOf.ULONG = constant(4);
			encode.LONG = function(v) {
				if (v >= LIMIT32) v = -(2 * LIMIT32 - v);
				return [
					v >> 24 & 255,
					v >> 16 & 255,
					v >> 8 & 255,
					v & 255
				];
			};
			sizeOf.LONG = constant(4);
			encode.FLOAT = function(v) {
				if (v > MAX_16_16 || v < MIN_16_16) throw new Error(`Value ${v} is outside the range of representable values in 16.16 format`);
				const fixedValue = Math.round(v * 65536) << 0;
				return encode.ULONG(fixedValue);
			};
			sizeOf.FLOAT = sizeOf.ULONG;
			encode.FIXED = encode.ULONG;
			sizeOf.FIXED = sizeOf.ULONG;
			encode.FWORD = encode.SHORT;
			sizeOf.FWORD = sizeOf.SHORT;
			encode.UFWORD = encode.USHORT;
			sizeOf.UFWORD = sizeOf.USHORT;
			encode.F2DOT14 = function(v) {
				return encode.USHORT(v * 16384);
			};
			sizeOf.F2DOT14 = sizeOf.USHORT;
			encode.LONGDATETIME = function(v) {
				return [
					0,
					0,
					0,
					0,
					v >> 24 & 255,
					v >> 16 & 255,
					v >> 8 & 255,
					v & 255
				];
			};
			sizeOf.LONGDATETIME = constant(8);
			encode.TAG = function(v) {
				check_default.argument(v.length === 4, "Tag should be exactly 4 ASCII characters.");
				return [
					v.charCodeAt(0),
					v.charCodeAt(1),
					v.charCodeAt(2),
					v.charCodeAt(3)
				];
			};
			sizeOf.TAG = constant(4);
			encode.Card8 = encode.BYTE;
			sizeOf.Card8 = sizeOf.BYTE;
			encode.Card16 = encode.USHORT;
			sizeOf.Card16 = sizeOf.USHORT;
			encode.OffSize = encode.BYTE;
			sizeOf.OffSize = sizeOf.BYTE;
			encode.SID = encode.USHORT;
			sizeOf.SID = sizeOf.USHORT;
			encode.NUMBER = function(v) {
				if (v >= -107 && v <= 107) return [v + 139];
				else if (v >= 108 && v <= 1131) {
					v = v - 108;
					return [(v >> 8) + 247, v & 255];
				} else if (v >= -1131 && v <= -108) {
					v = -v - 108;
					return [(v >> 8) + 251, v & 255];
				} else if (v >= -32768 && v <= 32767) return encode.NUMBER16(v);
				else return encode.NUMBER32(v);
			};
			sizeOf.NUMBER = function(v) {
				return encode.NUMBER(v).length;
			};
			encode.NUMBER16 = function(v) {
				return [
					28,
					v >> 8 & 255,
					v & 255
				];
			};
			sizeOf.NUMBER16 = constant(3);
			encode.NUMBER32 = function(v) {
				return [
					29,
					v >> 24 & 255,
					v >> 16 & 255,
					v >> 8 & 255,
					v & 255
				];
			};
			sizeOf.NUMBER32 = constant(5);
			encode.REAL = function(v) {
				let value = v.toString();
				const m = /\.(\d*?)(?:9{5,20}|0{5,20})\d{0,2}(?:e(.+)|$)/.exec(value);
				if (m) {
					const epsilon = parseFloat("1e" + ((m[2] ? +m[2] : 0) + m[1].length));
					value = (Math.round(v * epsilon) / epsilon).toString();
				}
				let nibbles = "";
				for (let i = 0, ii = value.length; i < ii; i += 1) {
					const c = value[i];
					if (c === "e") nibbles += value[++i] === "-" ? "c" : "b";
					else if (c === ".") nibbles += "a";
					else if (c === "-") nibbles += "e";
					else nibbles += c;
				}
				nibbles += nibbles.length & 1 ? "f" : "ff";
				const out = [30];
				for (let i = 0, ii = nibbles.length; i < ii; i += 2) out.push(parseInt(nibbles.substr(i, 2), 16));
				return out;
			};
			sizeOf.REAL = function(v) {
				return encode.REAL(v).length;
			};
			encode.NAME = encode.CHARARRAY;
			sizeOf.NAME = sizeOf.CHARARRAY;
			encode.STRING = encode.CHARARRAY;
			sizeOf.STRING = sizeOf.CHARARRAY;
			decode.UTF8 = function(data, offset, numBytes) {
				const codePoints = [];
				const numChars = numBytes;
				for (let j = 0; j < numChars; j++, offset += 1) codePoints[j] = data.getUint8(offset);
				return String.fromCharCode.apply(null, codePoints);
			};
			decode.UTF16 = function(data, offset, numBytes) {
				const codePoints = [];
				const numChars = numBytes / 2;
				for (let j = 0; j < numChars; j++, offset += 2) codePoints[j] = data.getUint16(offset);
				return String.fromCharCode.apply(null, codePoints);
			};
			encode.UTF16 = function(v) {
				const b = [];
				for (let i = 0; i < v.length; i += 1) {
					const codepoint = v.charCodeAt(i);
					b[b.length] = codepoint >> 8 & 255;
					b[b.length] = codepoint & 255;
				}
				return b;
			};
			sizeOf.UTF16 = function(v) {
				return v.length * 2;
			};
			var eightBitMacEncodings = {
				"x-mac-croatian": "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®Š™´¨≠ŽØ∞±≤≥∆µ∂∑∏š∫ªºΩžø¿¡¬√ƒ≈Ć«Č…\xA0ÀÃÕŒœĐ—“”‘’÷◊©⁄€‹›Æ»–·‚„‰ÂćÁčÈÍÎÏÌÓÔđÒÚÛÙıˆ˜¯πË˚¸Êæˇ",
				"x-mac-cyrillic": "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ†°Ґ£§•¶І®©™Ђђ≠Ѓѓ∞±≤≥іµґЈЄєЇїЉљЊњјЅ¬√ƒ≈∆«»…\xA0ЋћЌќѕ–—“”‘’÷„ЎўЏџ№Ёёяабвгдежзийклмнопрстуфхцчшщъыьэю",
				"x-mac-gaelic": "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØḂ±≤≥ḃĊċḊḋḞḟĠġṀæøṁṖṗɼƒſṠ«»…\xA0ÀÃÕŒœ–—“”‘’ṡẛÿŸṪ€‹›Ŷŷṫ·Ỳỳ⁊ÂÊÁËÈÍÎÏÌÓÔ♣ÒÚÛÙıÝýŴŵẄẅẀẁẂẃ",
				"x-mac-greek": "Ä¹²É³ÖÜ΅àâä΄¨çéèêë£™îï•½‰ôö¦€ùûü†ΓΔΘΛΞΠß®©ΣΪ§≠°·Α±≤≥¥ΒΕΖΗΙΚΜΦΫΨΩάΝ¬ΟΡ≈Τ«»…\xA0ΥΧΆΈœ–―“”‘’÷ΉΊΌΎέήίόΏύαβψδεφγηιξκλμνοπώρστθωςχυζϊϋΐΰ­",
				"x-mac-icelandic": "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûüÝ°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»…\xA0ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€ÐðÞþý·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ",
				"x-mac-inuit": "ᐃᐄᐅᐆᐊᐋᐱᐲᐳᐴᐸᐹᑉᑎᑏᑐᑑᑕᑖᑦᑭᑮᑯᑰᑲᑳᒃᒋᒌᒍᒎᒐᒑ°ᒡᒥᒦ•¶ᒧ®©™ᒨᒪᒫᒻᓂᓃᓄᓅᓇᓈᓐᓯᓰᓱᓲᓴᓵᔅᓕᓖᓗᓘᓚᓛᓪᔨᔩᔪᔫᔭ…\xA0ᔮᔾᕕᕖᕗ–—“”‘’ᕘᕙᕚᕝᕆᕇᕈᕉᕋᕌᕐᕿᖀᖁᖂᖃᖄᖅᖏᖐᖑᖒᖓᖔᖕᙱᙲᙳᙴᙵᙶᖖᖠᖡᖢᖣᖤᖥᖦᕼŁł",
				"x-mac-ce": "ÄĀāÉĄÖÜáąČäčĆćéŹźĎíďĒēĖóėôöõúĚěü†°Ę£§•¶ß®©™ę¨≠ģĮįĪ≤≥īĶ∂∑łĻļĽľĹĺŅņŃ¬√ńŇ∆«»…\xA0ňŐÕőŌ–—“”‘’÷◊ōŔŕŘ‹›řŖŗŠ‚„šŚśÁŤťÍŽžŪÓÔūŮÚůŰűŲųÝýķŻŁżĢˇ",
				macintosh: "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»…\xA0ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ",
				"x-mac-romanian": "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ĂȘ∞±≤≥¥µ∂∑∏π∫ªºΩăș¿¡¬√ƒ≈∆«»…\xA0ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›Țț‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ",
				"x-mac-turkish": "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»…\xA0ÀÃÕŒœ–—“”‘’÷◊ÿŸĞğİıŞş‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙˆ˜¯˘˙˚¸˝˛ˇ"
			};
			decode.MACSTRING = function(dataView, offset, dataLength, encoding) {
				const table = eightBitMacEncodings[encoding];
				if (table === void 0) return;
				let result = "";
				for (let i = 0; i < dataLength; i++) {
					const c = dataView.getUint8(offset + i);
					if (c <= 127) result += String.fromCharCode(c);
					else result += table[c & 127];
				}
				return result;
			};
			var macEncodingTableCache = typeof WeakMap === "function" && /* @__PURE__ */ new WeakMap();
			var macEncodingCacheKeys;
			var getMacEncodingTable = function(encoding) {
				if (!macEncodingCacheKeys) {
					macEncodingCacheKeys = {};
					for (let e in eightBitMacEncodings) macEncodingCacheKeys[e] = new String(e);
				}
				const cacheKey = macEncodingCacheKeys[encoding];
				if (cacheKey === void 0) return;
				if (macEncodingTableCache) {
					const cachedTable = macEncodingTableCache.get(cacheKey);
					if (cachedTable !== void 0) return cachedTable;
				}
				const decodingTable = eightBitMacEncodings[encoding];
				if (decodingTable === void 0) return;
				const encodingTable = {};
				for (let i = 0; i < decodingTable.length; i++) encodingTable[decodingTable.charCodeAt(i)] = i + 128;
				if (macEncodingTableCache) macEncodingTableCache.set(cacheKey, encodingTable);
				return encodingTable;
			};
			encode.MACSTRING = function(str, encoding) {
				const table = getMacEncodingTable(encoding);
				if (table === void 0) return;
				const result = [];
				for (let i = 0; i < str.length; i++) {
					let c = str.charCodeAt(i);
					if (c >= 128) {
						c = table[c];
						if (c === void 0) return;
					}
					result[i] = c;
				}
				return result;
			};
			sizeOf.MACSTRING = function(str, encoding) {
				const b = encode.MACSTRING(str, encoding);
				if (b !== void 0) return b.length;
				else return 0;
			};
			function isByteEncodable(value) {
				return value >= -128 && value <= 127;
			}
			function encodeVarDeltaRunAsZeroes(deltas, pos, result) {
				let runLength = 0;
				const numDeltas = deltas.length;
				while (pos < numDeltas && runLength < 64 && deltas[pos] === 0) {
					++pos;
					++runLength;
				}
				result.push(128 | runLength - 1);
				return pos;
			}
			function encodeVarDeltaRunAsBytes(deltas, offset, result) {
				let runLength = 0;
				const numDeltas = deltas.length;
				let pos = offset;
				while (pos < numDeltas && runLength < 64) {
					const value = deltas[pos];
					if (!isByteEncodable(value)) break;
					if (value === 0 && pos + 1 < numDeltas && deltas[pos + 1] === 0) break;
					++pos;
					++runLength;
				}
				result.push(runLength - 1);
				for (let i = offset; i < pos; ++i) result.push(deltas[i] + 256 & 255);
				return pos;
			}
			function encodeVarDeltaRunAsWords(deltas, offset, result) {
				let runLength = 0;
				const numDeltas = deltas.length;
				let pos = offset;
				while (pos < numDeltas && runLength < 64) {
					const value = deltas[pos];
					if (value === 0) break;
					if (isByteEncodable(value) && pos + 1 < numDeltas && isByteEncodable(deltas[pos + 1])) break;
					++pos;
					++runLength;
				}
				result.push(64 | runLength - 1);
				for (let i = offset; i < pos; ++i) {
					const val = deltas[i];
					result.push(val + 65536 >> 8 & 255, val + 256 & 255);
				}
				return pos;
			}
			encode.VARDELTAS = function(deltas) {
				let pos = 0;
				const result = [];
				while (pos < deltas.length) {
					const value = deltas[pos];
					if (value === 0) pos = encodeVarDeltaRunAsZeroes(deltas, pos, result);
					else if (value >= -128 && value <= 127) pos = encodeVarDeltaRunAsBytes(deltas, pos, result);
					else pos = encodeVarDeltaRunAsWords(deltas, pos, result);
				}
				return result;
			};
			encode.INDEX = function(l) {
				let offset = 1;
				const offsets = [offset];
				const data = [];
				for (let i = 0; i < l.length; i += 1) {
					const v = encode.OBJECT(l[i]);
					Array.prototype.push.apply(data, v);
					offset += v.length;
					offsets.push(offset);
				}
				if (data.length === 0) return [0, 0];
				const encodedOffsets = [];
				const offSize = 1 + Math.floor(Math.log(offset) / Math.log(2)) / 8 | 0;
				const offsetEncoder = [
					void 0,
					encode.BYTE,
					encode.USHORT,
					encode.UINT24,
					encode.ULONG
				][offSize];
				for (let i = 0; i < offsets.length; i += 1) {
					const encodedOffset = offsetEncoder(offsets[i]);
					Array.prototype.push.apply(encodedOffsets, encodedOffset);
				}
				return Array.prototype.concat(encode.Card16(l.length), encode.OffSize(offSize), encodedOffsets, data);
			};
			sizeOf.INDEX = function(v) {
				return encode.INDEX(v).length;
			};
			encode.DICT = function(m) {
				let d = [];
				const keys = Object.keys(m);
				const length = keys.length;
				for (let i = 0; i < length; i += 1) {
					const k = parseInt(keys[i], 0);
					const v = m[k];
					const enc1 = encode.OPERAND(v.value, v.type);
					const enc2 = encode.OPERATOR(k);
					for (let j = 0; j < enc1.length; j++) d.push(enc1[j]);
					for (let j = 0; j < enc2.length; j++) d.push(enc2[j]);
				}
				return d;
			};
			sizeOf.DICT = function(m) {
				return encode.DICT(m).length;
			};
			encode.OPERATOR = function(v) {
				if (v < 1200) return [v];
				else return [12, v - 1200];
			};
			encode.OPERAND = function(v, type) {
				let d = [];
				if (Array.isArray(type)) for (let i = 0; i < type.length; i += 1) {
					check_default.argument(v.length === type.length, "Not enough arguments given for type" + type);
					const enc1 = encode.OPERAND(v[i], type[i]);
					for (let j = 0; j < enc1.length; j++) d.push(enc1[j]);
				}
				else if (type === "SID") {
					const enc1 = encode.NUMBER(v);
					for (let j = 0; j < enc1.length; j++) d.push(enc1[j]);
				} else if (type === "offset") {
					const enc1 = encode.NUMBER32(v);
					for (let j = 0; j < enc1.length; j++) d.push(enc1[j]);
				} else if (type === "number") {
					const enc1 = encode.NUMBER(v);
					for (let j = 0; j < enc1.length; j++) d.push(enc1[j]);
				} else if (type === "real") {
					const enc1 = encode.REAL(v);
					for (let j = 0; j < enc1.length; j++) d.push(enc1[j]);
				} else throw new Error("Unknown operand type " + type);
				return d;
			};
			encode.OP = encode.BYTE;
			sizeOf.OP = sizeOf.BYTE;
			var wmm = typeof WeakMap === "function" && /* @__PURE__ */ new WeakMap();
			encode.CHARSTRING = function(ops) {
				if (wmm) {
					const cachedValue = wmm.get(ops);
					if (cachedValue !== void 0) return cachedValue;
				}
				let d = [];
				const length = ops.length;
				for (let i = 0; i < length; i += 1) {
					const op = ops[i];
					const enc1 = encode[op.type](op.value);
					for (let j = 0; j < enc1.length; j++) d.push(enc1[j]);
				}
				if (wmm) wmm.set(ops, d);
				return d;
			};
			sizeOf.CHARSTRING = function(ops) {
				return encode.CHARSTRING(ops).length;
			};
			encode.OBJECT = function(v) {
				const encodingFunction = encode[v.type];
				check_default.argument(encodingFunction !== void 0, "No encoding function for type " + v.type);
				return encodingFunction(v.value);
			};
			sizeOf.OBJECT = function(v) {
				const sizeOfFunction = sizeOf[v.type];
				check_default.argument(sizeOfFunction !== void 0, "No sizeOf function for type " + v.type);
				return sizeOfFunction(v.value);
			};
			encode.TABLE = function(table) {
				let d = [];
				const length = (table.fields || []).length;
				const subtables = [];
				const subtableOffsets = [];
				for (let i = 0; i < length; i += 1) {
					const field = table.fields[i];
					const encodingFunction = encode[field.type];
					check_default.argument(encodingFunction !== void 0, "No encoding function for field type " + field.type + " (" + field.name + ")");
					let value = table[field.name];
					if (value === void 0) value = field.value;
					const bytes = encodingFunction(value);
					if (field.type === "TABLE") {
						if (value.fields !== null) {
							subtableOffsets.push(d.length);
							subtables.push(bytes);
						}
						d.push(...[0, 0]);
					} else for (let j = 0; j < bytes.length; j++) d.push(bytes[j]);
				}
				for (let i = 0; i < subtables.length; i += 1) {
					const o = subtableOffsets[i];
					const offset = d.length;
					check_default.argument(offset < 65536, "Table " + table.tableName + " too big.");
					d[o] = offset >> 8;
					d[o + 1] = offset & 255;
					for (let j = 0; j < subtables[i].length; j++) d.push(subtables[i][j]);
				}
				return d;
			};
			sizeOf.TABLE = function(table) {
				let numBytes = 0;
				const length = (table.fields || []).length;
				for (let i = 0; i < length; i += 1) {
					const field = table.fields[i];
					const sizeOfFunction = sizeOf[field.type];
					check_default.argument(sizeOfFunction !== void 0, "No sizeOf function for field type " + field.type + " (" + field.name + ")");
					let value = table[field.name];
					if (value === void 0) value = field.value;
					numBytes += sizeOfFunction(value);
					if (field.type === "TABLE") numBytes += 2;
				}
				return numBytes;
			};
			encode.RECORD = encode.TABLE;
			sizeOf.RECORD = sizeOf.TABLE;
			encode.LITERAL = function(v) {
				return v;
			};
			sizeOf.LITERAL = function(v) {
				return v.length;
			};
			function Table(tableName, fields, options) {
				if (fields && fields.length) for (let i = 0; i < fields.length; i += 1) {
					const field = fields[i];
					this[field.name] = field.value;
				}
				this.tableName = tableName;
				this.fields = fields;
				if (options) {
					const optionKeys = Object.keys(options);
					for (let i = 0; i < optionKeys.length; i += 1) {
						const k = optionKeys[i];
						const v = options[k];
						if (this[k] !== void 0) this[k] = v;
					}
				}
			}
			Table.prototype.encode = function() {
				return encode.TABLE(this);
			};
			Table.prototype.sizeOf = function() {
				return sizeOf.TABLE(this);
			};
			function ushortList(itemName, list, count) {
				if (count === void 0) count = list.length;
				const fields = new Array(list.length + 1);
				fields[0] = {
					name: itemName + "Count",
					type: "USHORT",
					value: count
				};
				for (let i = 0; i < list.length; i++) fields[i + 1] = {
					name: itemName + i,
					type: "USHORT",
					value: list[i]
				};
				return fields;
			}
			function tableList(itemName, records, itemCallback) {
				const count = records.length;
				const fields = new Array(count + 1);
				fields[0] = {
					name: itemName + "Count",
					type: "USHORT",
					value: count
				};
				for (let i = 0; i < count; i++) fields[i + 1] = {
					name: itemName + i,
					type: "TABLE",
					value: itemCallback(records[i], i)
				};
				return fields;
			}
			function recordList(itemName, records, itemCallback) {
				const count = records.length;
				let fields = [];
				fields[0] = {
					name: itemName + "Count",
					type: "USHORT",
					value: count
				};
				for (let i = 0; i < count; i++) fields = fields.concat(itemCallback(records[i], i));
				return fields;
			}
			function Coverage(coverageTable) {
				if (coverageTable.format === 1) Table.call(this, "coverageTable", [{
					name: "coverageFormat",
					type: "USHORT",
					value: 1
				}].concat(ushortList("glyph", coverageTable.glyphs)));
				else if (coverageTable.format === 2) Table.call(this, "coverageTable", [{
					name: "coverageFormat",
					type: "USHORT",
					value: 2
				}].concat(recordList("rangeRecord", coverageTable.ranges, function(RangeRecord, i) {
					return [
						{
							name: "startGlyphID" + i,
							type: "USHORT",
							value: RangeRecord.start
						},
						{
							name: "endGlyphID" + i,
							type: "USHORT",
							value: RangeRecord.end
						},
						{
							name: "startCoverageIndex" + i,
							type: "USHORT",
							value: RangeRecord.index
						}
					];
				})));
				else check_default.assert(false, "Coverage format must be 1 or 2.");
			}
			Coverage.prototype = Object.create(Table.prototype);
			Coverage.prototype.constructor = Coverage;
			function ScriptList(scriptListTable) {
				Table.call(this, "scriptListTable", recordList("scriptRecord", scriptListTable, function(scriptRecord, i) {
					const script = scriptRecord.script;
					let defaultLangSys = script.defaultLangSys;
					check_default.assert(!!defaultLangSys, "Unable to write GSUB: script " + scriptRecord.tag + " has no default language system.");
					return [{
						name: "scriptTag" + i,
						type: "TAG",
						value: scriptRecord.tag
					}, {
						name: "script" + i,
						type: "TABLE",
						value: new Table("scriptTable", [{
							name: "defaultLangSys",
							type: "TABLE",
							value: new Table("defaultLangSys", [{
								name: "lookupOrder",
								type: "USHORT",
								value: 0
							}, {
								name: "reqFeatureIndex",
								type: "USHORT",
								value: defaultLangSys.reqFeatureIndex
							}].concat(ushortList("featureIndex", defaultLangSys.featureIndexes)))
						}].concat(recordList("langSys", script.langSysRecords, function(langSysRecord, i2) {
							const langSys = langSysRecord.langSys;
							return [{
								name: "langSysTag" + i2,
								type: "TAG",
								value: langSysRecord.tag
							}, {
								name: "langSys" + i2,
								type: "TABLE",
								value: new Table("langSys", [{
									name: "lookupOrder",
									type: "USHORT",
									value: 0
								}, {
									name: "reqFeatureIndex",
									type: "USHORT",
									value: langSys.reqFeatureIndex
								}].concat(ushortList("featureIndex", langSys.featureIndexes)))
							}];
						})))
					}];
				}));
			}
			ScriptList.prototype = Object.create(Table.prototype);
			ScriptList.prototype.constructor = ScriptList;
			function FeatureList(featureListTable) {
				Table.call(this, "featureListTable", recordList("featureRecord", featureListTable, function(featureRecord, i) {
					const feature = featureRecord.feature;
					return [{
						name: "featureTag" + i,
						type: "TAG",
						value: featureRecord.tag
					}, {
						name: "feature" + i,
						type: "TABLE",
						value: new Table("featureTable", [{
							name: "featureParams",
							type: "USHORT",
							value: feature.featureParams
						}].concat(ushortList("lookupListIndex", feature.lookupListIndexes)))
					}];
				}));
			}
			FeatureList.prototype = Object.create(Table.prototype);
			FeatureList.prototype.constructor = FeatureList;
			function LookupList(lookupListTable, subtableMakers3) {
				Table.call(this, "lookupListTable", tableList("lookup", lookupListTable, function(lookupTable) {
					let subtableCallback = subtableMakers3[lookupTable.lookupType];
					check_default.assert(!!subtableCallback, "Unable to write GSUB lookup type " + lookupTable.lookupType + " tables.");
					return new Table("lookupTable", [{
						name: "lookupType",
						type: "USHORT",
						value: lookupTable.lookupType
					}, {
						name: "lookupFlag",
						type: "USHORT",
						value: lookupTable.lookupFlag
					}].concat(tableList("subtable", lookupTable.subtables, subtableCallback)));
				}));
			}
			LookupList.prototype = Object.create(Table.prototype);
			LookupList.prototype.constructor = LookupList;
			function ClassDef(classDefTable) {
				if (classDefTable.format === 1) Table.call(this, "classDefTable", [{
					name: "classFormat",
					type: "USHORT",
					value: 1
				}, {
					name: "startGlyphID",
					type: "USHORT",
					value: classDefTable.startGlyph
				}].concat(ushortList("glyph", classDefTable.classes)));
				else if (classDefTable.format === 2) Table.call(this, "classDefTable", [{
					name: "classFormat",
					type: "USHORT",
					value: 2
				}].concat(recordList("rangeRecord", classDefTable.ranges, function(RangeRecord, i) {
					return [
						{
							name: "startGlyphID" + i,
							type: "USHORT",
							value: RangeRecord.start
						},
						{
							name: "endGlyphID" + i,
							type: "USHORT",
							value: RangeRecord.end
						},
						{
							name: "class" + i,
							type: "USHORT",
							value: RangeRecord.classId
						}
					];
				})));
				else check_default.assert(false, "Class format must be 1 or 2.");
			}
			ClassDef.prototype = Object.create(Table.prototype);
			ClassDef.prototype.constructor = ClassDef;
			var table_default = {
				Table,
				Record: Table,
				Coverage,
				ClassDef,
				ScriptList,
				FeatureList,
				LookupList,
				ushortList,
				tableList,
				recordList
			};
			function getByte(dataView, offset) {
				return dataView.getUint8(offset);
			}
			function getUShort(dataView, offset) {
				return dataView.getUint16(offset, false);
			}
			function getShort(dataView, offset) {
				return dataView.getInt16(offset, false);
			}
			function getUInt24(dataView, offset) {
				return (dataView.getUint16(offset) << 8) + dataView.getUint8(offset + 2);
			}
			function getULong(dataView, offset) {
				return dataView.getUint32(offset, false);
			}
			function getLong(dataView, offset) {
				return dataView.getInt32(offset, false);
			}
			function getFixed(dataView, offset) {
				return dataView.getInt16(offset, false) + dataView.getUint16(offset + 2, false) / 65535;
			}
			function getTag(dataView, offset) {
				let tag = "";
				for (let i = offset; i < offset + 4; i += 1) tag += String.fromCharCode(dataView.getInt8(i));
				return tag;
			}
			function getOffset(dataView, offset, offSize) {
				let v = 0;
				for (let i = 0; i < offSize; i += 1) {
					v <<= 8;
					v += dataView.getUint8(offset + i);
				}
				return v;
			}
			function getBytes(dataView, startOffset, endOffset) {
				const bytes = [];
				for (let i = startOffset; i < endOffset; i += 1) bytes.push(dataView.getUint8(i));
				return bytes;
			}
			function bytesToString(bytes) {
				let s = "";
				for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
				return s;
			}
			var typeOffsets = {
				byte: 1,
				uShort: 2,
				f2dot14: 2,
				short: 2,
				uInt24: 3,
				uLong: 4,
				fixed: 4,
				longDateTime: 8,
				tag: 4
			};
			var masks = {
				LONG_WORDS: 32768,
				WORD_DELTA_COUNT_MASK: 32767,
				SHARED_POINT_NUMBERS: 32768,
				COUNT_MASK: 4095,
				EMBEDDED_PEAK_TUPLE: 32768,
				INTERMEDIATE_REGION: 16384,
				PRIVATE_POINT_NUMBERS: 8192,
				TUPLE_INDEX_MASK: 4095,
				POINTS_ARE_WORDS: 128,
				POINT_RUN_COUNT_MASK: 127,
				DELTAS_ARE_ZERO: 128,
				DELTAS_ARE_WORDS: 64,
				DELTA_RUN_COUNT_MASK: 63,
				INNER_INDEX_BIT_COUNT_MASK: 15,
				MAP_ENTRY_SIZE_MASK: 48
			};
			function Parser(data, offset) {
				this.data = data;
				this.offset = offset;
				this.relativeOffset = 0;
			}
			Parser.prototype.parseByte = function() {
				const v = this.data.getUint8(this.offset + this.relativeOffset);
				this.relativeOffset += 1;
				return v;
			};
			Parser.prototype.parseChar = function() {
				const v = this.data.getInt8(this.offset + this.relativeOffset);
				this.relativeOffset += 1;
				return v;
			};
			Parser.prototype.parseCard8 = Parser.prototype.parseByte;
			Parser.prototype.parseUShort = function() {
				const v = this.data.getUint16(this.offset + this.relativeOffset);
				this.relativeOffset += 2;
				return v;
			};
			Parser.prototype.parseCard16 = Parser.prototype.parseUShort;
			Parser.prototype.parseSID = Parser.prototype.parseUShort;
			Parser.prototype.parseOffset16 = Parser.prototype.parseUShort;
			Parser.prototype.parseShort = function() {
				const v = this.data.getInt16(this.offset + this.relativeOffset);
				this.relativeOffset += 2;
				return v;
			};
			Parser.prototype.parseF2Dot14 = function() {
				const v = this.data.getInt16(this.offset + this.relativeOffset) / 16384;
				this.relativeOffset += 2;
				return v;
			};
			Parser.prototype.parseUInt24 = function() {
				const v = getUInt24(this.data, this.offset + this.relativeOffset);
				this.relativeOffset += 3;
				return v;
			};
			Parser.prototype.parseULong = function() {
				const v = getULong(this.data, this.offset + this.relativeOffset);
				this.relativeOffset += 4;
				return v;
			};
			Parser.prototype.parseLong = function() {
				const v = getLong(this.data, this.offset + this.relativeOffset);
				this.relativeOffset += 4;
				return v;
			};
			Parser.prototype.parseOffset32 = Parser.prototype.parseULong;
			Parser.prototype.parseFixed = function() {
				const v = getFixed(this.data, this.offset + this.relativeOffset);
				this.relativeOffset += 4;
				return v;
			};
			Parser.prototype.parseString = function(length) {
				const dataView = this.data;
				const offset = this.offset + this.relativeOffset;
				let string = "";
				this.relativeOffset += length;
				for (let i = 0; i < length; i++) string += String.fromCharCode(dataView.getUint8(offset + i));
				return string;
			};
			Parser.prototype.parseTag = function() {
				return this.parseString(4);
			};
			Parser.prototype.parseLongDateTime = function() {
				let v = getULong(this.data, this.offset + this.relativeOffset + 4);
				v -= 2082844800;
				this.relativeOffset += 8;
				return v;
			};
			Parser.prototype.parseVersion = function(minorBase) {
				const major = getUShort(this.data, this.offset + this.relativeOffset);
				const minor = getUShort(this.data, this.offset + this.relativeOffset + 2);
				this.relativeOffset += 4;
				if (minorBase === void 0) minorBase = 4096;
				return major + minor / minorBase / 10;
			};
			Parser.prototype.skip = function(type, amount) {
				if (amount === void 0) amount = 1;
				this.relativeOffset += typeOffsets[type] * amount;
			};
			Parser.prototype.parseULongList = function(count) {
				if (count === void 0) count = this.parseULong();
				const offsets = new Array(count);
				const dataView = this.data;
				let offset = this.offset + this.relativeOffset;
				for (let i = 0; i < count; i++) {
					offsets[i] = dataView.getUint32(offset);
					offset += 4;
				}
				this.relativeOffset += count * 4;
				return offsets;
			};
			Parser.prototype.parseOffset16List = Parser.prototype.parseUShortList = function(count) {
				if (count === void 0) count = this.parseUShort();
				const offsets = new Array(count);
				const dataView = this.data;
				let offset = this.offset + this.relativeOffset;
				for (let i = 0; i < count; i++) {
					offsets[i] = dataView.getUint16(offset);
					offset += 2;
				}
				this.relativeOffset += count * 2;
				return offsets;
			};
			Parser.prototype.parseShortList = function(count) {
				const list = new Array(count);
				const dataView = this.data;
				let offset = this.offset + this.relativeOffset;
				for (let i = 0; i < count; i++) {
					list[i] = dataView.getInt16(offset);
					offset += 2;
				}
				this.relativeOffset += count * 2;
				return list;
			};
			Parser.prototype.parseByteList = function(count) {
				const list = new Array(count);
				const dataView = this.data;
				let offset = this.offset + this.relativeOffset;
				for (let i = 0; i < count; i++) list[i] = dataView.getUint8(offset++);
				this.relativeOffset += count;
				return list;
			};
			Parser.prototype.parseList = function(count, itemCallback) {
				if (!itemCallback) {
					itemCallback = count;
					count = this.parseUShort();
				}
				const list = new Array(count);
				for (let i = 0; i < count; i++) list[i] = itemCallback.call(this);
				return list;
			};
			Parser.prototype.parseList32 = function(count, itemCallback) {
				if (!itemCallback) {
					itemCallback = count;
					count = this.parseULong();
				}
				const list = new Array(count);
				for (let i = 0; i < count; i++) list[i] = itemCallback.call(this);
				return list;
			};
			Parser.prototype.parseRecordList = function(count, recordDescription) {
				if (!recordDescription) {
					recordDescription = count;
					count = this.parseUShort();
				}
				const records = new Array(count);
				const fields = Object.keys(recordDescription);
				for (let i = 0; i < count; i++) {
					const rec = {};
					for (let j = 0; j < fields.length; j++) {
						const fieldName = fields[j];
						rec[fieldName] = recordDescription[fieldName].call(this);
					}
					records[i] = rec;
				}
				return records;
			};
			Parser.prototype.parseRecordList32 = function(count, recordDescription) {
				if (!recordDescription) {
					recordDescription = count;
					count = this.parseULong();
				}
				const records = new Array(count);
				const fields = Object.keys(recordDescription);
				for (let i = 0; i < count; i++) {
					const rec = {};
					for (let j = 0; j < fields.length; j++) {
						const fieldName = fields[j];
						rec[fieldName] = recordDescription[fieldName].call(this);
					}
					records[i] = rec;
				}
				return records;
			};
			Parser.prototype.parseTupleRecords = function(tupleCount, axisCount) {
				let tuples = [];
				for (let i = 0; i < tupleCount; i++) {
					let tuple = [];
					for (let axisIndex = 0; axisIndex < axisCount; axisIndex++) tuple.push(this.parseF2Dot14());
					tuples.push(tuple);
				}
				return tuples;
			};
			Parser.prototype.parseStruct = function(description) {
				if (typeof description === "function") return description.call(this);
				else {
					const fields = Object.keys(description);
					const struct = {};
					for (let j = 0; j < fields.length; j++) {
						const fieldName = fields[j];
						struct[fieldName] = description[fieldName].call(this);
					}
					return struct;
				}
			};
			Parser.prototype.parseValueRecord = function(valueFormat) {
				if (valueFormat === void 0) valueFormat = this.parseUShort();
				if (valueFormat === 0) return;
				const valueRecord = {};
				if (valueFormat & 1) valueRecord.xPlacement = this.parseShort();
				if (valueFormat & 2) valueRecord.yPlacement = this.parseShort();
				if (valueFormat & 4) valueRecord.xAdvance = this.parseShort();
				if (valueFormat & 8) valueRecord.yAdvance = this.parseShort();
				if (valueFormat & 16) {
					valueRecord.xPlaDevice = void 0;
					this.parseShort();
				}
				if (valueFormat & 32) {
					valueRecord.yPlaDevice = void 0;
					this.parseShort();
				}
				if (valueFormat & 64) {
					valueRecord.xAdvDevice = void 0;
					this.parseShort();
				}
				if (valueFormat & 128) {
					valueRecord.yAdvDevice = void 0;
					this.parseShort();
				}
				return valueRecord;
			};
			Parser.prototype.parseValueRecordList = function() {
				const valueFormat = this.parseUShort();
				const valueCount = this.parseUShort();
				const values = new Array(valueCount);
				for (let i = 0; i < valueCount; i++) values[i] = this.parseValueRecord(valueFormat);
				return values;
			};
			Parser.prototype.parsePointer = function(description) {
				const structOffset = this.parseOffset16();
				if (structOffset > 0) return new Parser(this.data, this.offset + structOffset).parseStruct(description);
			};
			Parser.prototype.parsePointer32 = function(description) {
				const structOffset = this.parseOffset32();
				if (structOffset > 0) return new Parser(this.data, this.offset + structOffset).parseStruct(description);
			};
			Parser.prototype.parseListOfLists = function(itemCallback) {
				const offsets = this.parseOffset16List();
				const count = offsets.length;
				const relativeOffset = this.relativeOffset;
				const list = new Array(count);
				for (let i = 0; i < count; i++) {
					const start = offsets[i];
					if (start === 0) {
						list[i] = void 0;
						continue;
					}
					this.relativeOffset = start;
					if (itemCallback) {
						const subOffsets = this.parseOffset16List();
						const subList = new Array(subOffsets.length);
						for (let j = 0; j < subOffsets.length; j++) {
							this.relativeOffset = start + subOffsets[j];
							subList[j] = itemCallback.call(this);
						}
						list[i] = subList;
					} else list[i] = this.parseUShortList();
				}
				this.relativeOffset = relativeOffset;
				return list;
			};
			Parser.prototype.parseCoverage = function() {
				const startOffset = this.offset + this.relativeOffset;
				const format = this.parseUShort();
				const count = this.parseUShort();
				if (format === 1) return {
					format: 1,
					glyphs: this.parseUShortList(count)
				};
				else if (format === 2) {
					const ranges = new Array(count);
					for (let i = 0; i < count; i++) ranges[i] = {
						start: this.parseUShort(),
						end: this.parseUShort(),
						index: this.parseUShort()
					};
					return {
						format: 2,
						ranges
					};
				}
				throw new Error("0x" + startOffset.toString(16) + ": Coverage format must be 1 or 2.");
			};
			Parser.prototype.parseClassDef = function() {
				const startOffset = this.offset + this.relativeOffset;
				const format = this.parseUShort();
				if (format === 1) return {
					format: 1,
					startGlyph: this.parseUShort(),
					classes: this.parseUShortList()
				};
				else if (format === 2) return {
					format: 2,
					ranges: this.parseRecordList({
						start: Parser.uShort,
						end: Parser.uShort,
						classId: Parser.uShort
					})
				};
				console.warn(`0x${startOffset.toString(16)}: This font file uses an invalid ClassDef format of ${format}. It might be corrupted and should be reacquired if it doesn't display as intended.`);
				return { format };
			};
			Parser.list = function(count, itemCallback) {
				return function() {
					return this.parseList(count, itemCallback);
				};
			};
			Parser.list32 = function(count, itemCallback) {
				return function() {
					return this.parseList32(count, itemCallback);
				};
			};
			Parser.recordList = function(count, recordDescription) {
				return function() {
					return this.parseRecordList(count, recordDescription);
				};
			};
			Parser.recordList32 = function(count, recordDescription) {
				return function() {
					return this.parseRecordList32(count, recordDescription);
				};
			};
			Parser.pointer = function(description) {
				return function() {
					return this.parsePointer(description);
				};
			};
			Parser.pointer32 = function(description) {
				return function() {
					return this.parsePointer32(description);
				};
			};
			Parser.tag = Parser.prototype.parseTag;
			Parser.byte = Parser.prototype.parseByte;
			Parser.uShort = Parser.offset16 = Parser.prototype.parseUShort;
			Parser.uShortList = Parser.prototype.parseUShortList;
			Parser.uInt24 = Parser.prototype.parseUInt24;
			Parser.uLong = Parser.offset32 = Parser.prototype.parseULong;
			Parser.uLongList = Parser.prototype.parseULongList;
			Parser.fixed = Parser.prototype.parseFixed;
			Parser.f2Dot14 = Parser.prototype.parseF2Dot14;
			Parser.struct = Parser.prototype.parseStruct;
			Parser.coverage = Parser.prototype.parseCoverage;
			Parser.classDef = Parser.prototype.parseClassDef;
			var langSysTable = {
				reserved: Parser.uShort,
				reqFeatureIndex: Parser.uShort,
				featureIndexes: Parser.uShortList
			};
			Parser.prototype.parseScriptList = function() {
				return this.parsePointer(Parser.recordList({
					tag: Parser.tag,
					script: Parser.pointer({
						defaultLangSys: Parser.pointer(langSysTable),
						langSysRecords: Parser.recordList({
							tag: Parser.tag,
							langSys: Parser.pointer(langSysTable)
						})
					})
				})) || [];
			};
			Parser.prototype.parseFeatureList = function() {
				return this.parsePointer(Parser.recordList({
					tag: Parser.tag,
					feature: Parser.pointer({
						featureParams: Parser.offset16,
						lookupListIndexes: Parser.uShortList
					})
				})) || [];
			};
			Parser.prototype.parseLookupList = function(lookupTableParsers) {
				return this.parsePointer(Parser.list(Parser.pointer(function() {
					const lookupType = this.parseUShort();
					check_default.argument(1 <= lookupType && lookupType <= 9, "GPOS/GSUB lookup type " + lookupType + " unknown.");
					const lookupFlag = this.parseUShort();
					const useMarkFilteringSet = lookupFlag & 16;
					return {
						lookupType,
						lookupFlag,
						subtables: this.parseList(Parser.pointer(lookupTableParsers[lookupType])),
						markFilteringSet: useMarkFilteringSet ? this.parseUShort() : void 0
					};
				}))) || [];
			};
			Parser.prototype.parseFeatureVariationsList = function() {
				return this.parsePointer32(function() {
					const majorVersion = this.parseUShort();
					const minorVersion = this.parseUShort();
					check_default.argument(majorVersion === 1 && minorVersion < 1, "GPOS/GSUB feature variations table unknown.");
					return this.parseRecordList32({
						conditionSetOffset: Parser.offset32,
						featureTableSubstitutionOffset: Parser.offset32
					});
				}) || [];
			};
			Parser.prototype.parseVariationStore = function() {
				const vsOffset = this.relativeOffset;
				const length = this.parseUShort();
				const variationStore = { itemVariationStore: this.parseItemVariationStore() };
				this.relativeOffset = vsOffset + length + 2;
				return variationStore;
			};
			Parser.prototype.parseItemVariationStore = function() {
				const itemStoreOffset = this.relativeOffset;
				const iVStore = {
					format: this.parseUShort(),
					variationRegions: [],
					itemVariationSubtables: []
				};
				const variationRegionListOffset = this.parseOffset32();
				const itemVariationDataCount = this.parseUShort();
				const itemVariationDataOffsets = this.parseULongList(itemVariationDataCount);
				this.relativeOffset = itemStoreOffset + variationRegionListOffset;
				iVStore.variationRegions = this.parseVariationRegionList();
				for (let i = 0; i < itemVariationDataCount; i++) {
					const subtableOffset = itemVariationDataOffsets[i];
					this.relativeOffset = itemStoreOffset + subtableOffset;
					iVStore.itemVariationSubtables.push(this.parseItemVariationSubtable());
				}
				return iVStore;
			};
			Parser.prototype.parseVariationRegionList = function() {
				const axisCount = this.parseUShort();
				const regionCount = this.parseUShort();
				return this.parseRecordList(regionCount, { regionAxes: Parser.recordList(axisCount, {
					startCoord: Parser.f2Dot14,
					peakCoord: Parser.f2Dot14,
					endCoord: Parser.f2Dot14
				}) });
			};
			Parser.prototype.parseItemVariationSubtable = function() {
				const itemCount = this.parseUShort();
				const wordDeltaCount = this.parseUShort();
				const regionIndexes = this.parseUShortList();
				const regionIndexCount = regionIndexes.length;
				return {
					regionIndexes,
					deltaSets: itemCount && regionIndexCount ? this.parseDeltaSets(itemCount, wordDeltaCount, regionIndexCount) : []
				};
			};
			Parser.prototype.parseDeltaSetIndexMap = function() {
				const format = this.parseByte();
				const entryFormat = this.parseByte();
				const map = [];
				let mapCount = 0;
				switch (format) {
					case 0:
						mapCount = this.parseUShort();
						break;
					case 1:
						mapCount = this.parseULong();
						break;
					default: console.error(`unsupported DeltaSetIndexMap format ${format}`);
				}
				if (!mapCount) return {
					format,
					entryFormat
				};
				const bitCount = (entryFormat & masks.INNER_INDEX_BIT_COUNT_MASK) + 1;
				const entrySize = ((entryFormat & masks.MAP_ENTRY_SIZE_MASK) >> 4) + 1;
				for (let n = 0; n < mapCount; n++) {
					let entry;
					if (entrySize === 1) entry = this.parseByte();
					else if (entrySize === 2) entry = this.parseUShort();
					else if (entrySize === 3) entry = this.parseUInt24();
					else if (entrySize === 4) entry = this.parseULong();
					else throw new Error(`Invalid entry size of ${entrySize}`);
					const outerIndex = entry >> bitCount;
					const innerIndex = entry & (1 << bitCount) - 1;
					map.push({
						outerIndex,
						innerIndex
					});
				}
				return {
					format,
					entryFormat,
					map
				};
			};
			Parser.prototype.parseDeltaSets = function(itemCount, wordDeltaCount, regionIndexCount) {
				const deltas = Array.from({ length: itemCount }, () => []);
				const longFlag = wordDeltaCount & masks.LONG_WORDS;
				const wordCount = wordDeltaCount & masks.WORD_DELTA_COUNT_MASK;
				if (wordCount > regionIndexCount) throw Error("wordCount must be less than or equal to regionIndexCount");
				const wordParser = (longFlag ? this.parseLong : this.parseShort).bind(this);
				const restParser = (longFlag ? this.parseShort : this.parseChar).bind(this);
				for (let i = 0; i < itemCount; i++) for (let j = 0; j < regionIndexCount; j++) if (j < wordCount) deltas[i].push(wordParser());
				else deltas[i].push(restParser());
				return deltas;
			};
			Parser.prototype.parseTupleVariationStoreList = function(axisCount, flavor, glyphs) {
				const glyphCount = this.parseUShort();
				const offsetSizeIs32Bit = this.parseUShort() & 1;
				const glyphVariationDataArrayOffset = this.parseOffset32();
				const parseOffset = (offsetSizeIs32Bit ? this.parseULong : this.parseUShort).bind(this);
				const glyphVariations = {};
				let currentOffset = parseOffset();
				if (!offsetSizeIs32Bit) currentOffset *= 2;
				let nextOffset;
				for (let i = 0; i < glyphCount; i++) {
					nextOffset = parseOffset();
					if (!offsetSizeIs32Bit) nextOffset *= 2;
					const length = nextOffset - currentOffset;
					glyphVariations[i] = length ? this.parseTupleVariationStore(glyphVariationDataArrayOffset + currentOffset, axisCount, flavor, glyphs, i) : void 0;
					currentOffset = nextOffset;
				}
				return glyphVariations;
			};
			Parser.prototype.parseTupleVariationStore = function(tableOffset, axisCount, flavor, glyphs, glyphIndex) {
				const relativeOffset = this.relativeOffset;
				this.relativeOffset = tableOffset;
				if (flavor === "cvar") this.relativeOffset += 4;
				const tupleVariationCount = this.parseUShort();
				const hasSharedPoints = !!(tupleVariationCount & masks.SHARED_POINT_NUMBERS);
				const count = tupleVariationCount & masks.COUNT_MASK;
				let dataOffset = this.parseOffset16();
				const headers = [];
				let sharedPoints = [];
				for (let h = 0; h < count; h++) {
					const headerData = this.parseTupleVariationHeader(axisCount, flavor);
					headers.push(headerData);
				}
				if (this.relativeOffset !== tableOffset + dataOffset) {
					console.warn(`Unexpected offset after parsing tuple variation headers! Expected ${tableOffset + dataOffset}, actually ${this.relativeOffset}`);
					this.relativeOffset = tableOffset + dataOffset;
				}
				if (hasSharedPoints) sharedPoints = this.parsePackedPointNumbers();
				let serializedDataOffset = this.relativeOffset;
				for (let h = 0; h < count; h++) {
					const header = headers[h];
					header.privatePoints = [];
					this.relativeOffset = serializedDataOffset;
					if (flavor === "cvar" && !header.peakTuple) console.warn("An embedded peak tuple is required in TupleVariationHeaders for the cvar table.");
					if (header.flags.privatePointNumbers) header.privatePoints = this.parsePackedPointNumbers();
					delete header.flags;
					const deltasOffset = this.offset;
					const deltasRelativeOffset = this.relativeOffset;
					const defineDeltas = (propertyName) => {
						let _deltas = void 0;
						let _deltasY = void 0;
						const parseDeltas = () => {
							let pointsCount = 0;
							if (flavor === "gvar") {
								pointsCount = header.privatePoints.length || sharedPoints.length;
								if (!pointsCount) {
									const glyph = glyphs.get(glyphIndex);
									glyph.path;
									pointsCount = glyph.points.length;
									pointsCount += 4;
								}
							} else if (flavor === "cvar") pointsCount = glyphs.length;
							this.offset = deltasOffset;
							this.relativeOffset = deltasRelativeOffset;
							_deltas = this.parsePackedDeltas(pointsCount);
							if (flavor === "gvar") _deltasY = this.parsePackedDeltas(pointsCount);
						};
						return {
							configurable: true,
							get: function() {
								if (_deltas === void 0) parseDeltas();
								return propertyName === "deltasY" ? _deltasY : _deltas;
							},
							set: function(deltas) {
								if (_deltas === void 0) parseDeltas();
								if (propertyName === "deltasY") _deltasY = deltas;
								else _deltas = deltas;
							}
						};
					};
					Object.defineProperty(header, "deltas", defineDeltas.call(this, "deltas"));
					if (flavor === "gvar") Object.defineProperty(header, "deltasY", defineDeltas.call(this, "deltasY"));
					serializedDataOffset += header.variationDataSize;
					delete header.variationDataSize;
				}
				this.relativeOffset = relativeOffset;
				const result = { headers };
				result.sharedPoints = sharedPoints;
				return result;
			};
			Parser.prototype.parseTupleVariationHeader = function(axisCount, flavor) {
				const variationDataSize = this.parseUShort();
				const tupleIndex = this.parseUShort();
				const embeddedPeakTuple = !!(tupleIndex & masks.EMBEDDED_PEAK_TUPLE);
				const intermediateRegion = !!(tupleIndex & masks.INTERMEDIATE_REGION);
				const privatePointNumbers = !!(tupleIndex & masks.PRIVATE_POINT_NUMBERS);
				const sharedTupleRecordsIndex = embeddedPeakTuple ? void 0 : tupleIndex & masks.TUPLE_INDEX_MASK;
				const result = {
					variationDataSize,
					peakTuple: embeddedPeakTuple ? this.parseTupleRecords(1, axisCount)[0] : void 0,
					intermediateStartTuple: intermediateRegion ? this.parseTupleRecords(1, axisCount)[0] : void 0,
					intermediateEndTuple: intermediateRegion ? this.parseTupleRecords(1, axisCount)[0] : void 0,
					flags: {
						embeddedPeakTuple,
						intermediateRegion,
						privatePointNumbers
					}
				};
				if (flavor === "gvar") result.sharedTupleRecordsIndex = sharedTupleRecordsIndex;
				return result;
			};
			Parser.prototype.parsePackedPointNumbers = function() {
				const countByte1 = this.parseByte();
				const points = [];
				let totalPointCount = countByte1;
				if (countByte1 >= 128) {
					const countByte2 = this.parseByte();
					totalPointCount = (countByte1 & masks.POINT_RUN_COUNT_MASK) << 8 | countByte2;
				}
				let lastPoint = 0;
				while (points.length < totalPointCount) {
					const controlByte = this.parseByte();
					const numbersAre16Bit = !!(controlByte & masks.POINTS_ARE_WORDS);
					let runCount = (controlByte & masks.POINT_RUN_COUNT_MASK) + 1;
					for (let i = 0; i < runCount && points.length < totalPointCount; i++) {
						let pointDelta;
						if (numbersAre16Bit) pointDelta = this.parseUShort();
						else pointDelta = this.parseByte();
						lastPoint = lastPoint + pointDelta;
						points.push(lastPoint);
					}
				}
				return points;
			};
			Parser.prototype.parsePackedDeltas = function(expectedCount) {
				const deltas = [];
				while (deltas.length < expectedCount) {
					const controlByte = this.parseByte();
					const zeroData = !!(controlByte & masks.DELTAS_ARE_ZERO);
					const deltaWords = !!(controlByte & masks.DELTAS_ARE_WORDS);
					const runCount = (controlByte & masks.DELTA_RUN_COUNT_MASK) + 1;
					for (let i = 0; i < runCount && deltas.length < expectedCount; i++) if (zeroData) deltas.push(0);
					else if (deltaWords) deltas.push(this.parseShort());
					else deltas.push(this.parseChar());
				}
				return deltas;
			};
			var parse_default = {
				getByte,
				getCard8: getByte,
				getUShort,
				getCard16: getUShort,
				getShort,
				getUInt24,
				getULong,
				getFixed,
				getTag,
				getOffset,
				getBytes,
				bytesToString,
				Parser
			};
			var nameTableNames = [
				"copyright",
				"fontFamily",
				"fontSubfamily",
				"uniqueID",
				"fullName",
				"version",
				"postScriptName",
				"trademark",
				"manufacturer",
				"designer",
				"description",
				"manufacturerURL",
				"designerURL",
				"license",
				"licenseURL",
				"reserved",
				"preferredFamily",
				"preferredSubfamily",
				"compatibleFullName",
				"sampleText",
				"postScriptFindFontName",
				"wwsFamily",
				"wwsSubfamily"
			];
			var macLanguages = {
				0: "en",
				1: "fr",
				2: "de",
				3: "it",
				4: "nl",
				5: "sv",
				6: "es",
				7: "da",
				8: "pt",
				9: "no",
				10: "he",
				11: "ja",
				12: "ar",
				13: "fi",
				14: "el",
				15: "is",
				16: "mt",
				17: "tr",
				18: "hr",
				19: "zh-Hant",
				20: "ur",
				21: "hi",
				22: "th",
				23: "ko",
				24: "lt",
				25: "pl",
				26: "hu",
				27: "es",
				28: "lv",
				29: "se",
				30: "fo",
				31: "fa",
				32: "ru",
				33: "zh",
				34: "nl-BE",
				35: "ga",
				36: "sq",
				37: "ro",
				38: "cz",
				39: "sk",
				40: "si",
				41: "yi",
				42: "sr",
				43: "mk",
				44: "bg",
				45: "uk",
				46: "be",
				47: "uz",
				48: "kk",
				49: "az-Cyrl",
				50: "az-Arab",
				51: "hy",
				52: "ka",
				53: "mo",
				54: "ky",
				55: "tg",
				56: "tk",
				57: "mn-CN",
				58: "mn",
				59: "ps",
				60: "ks",
				61: "ku",
				62: "sd",
				63: "bo",
				64: "ne",
				65: "sa",
				66: "mr",
				67: "bn",
				68: "as",
				69: "gu",
				70: "pa",
				71: "or",
				72: "ml",
				73: "kn",
				74: "ta",
				75: "te",
				76: "si",
				77: "my",
				78: "km",
				79: "lo",
				80: "vi",
				81: "id",
				82: "tl",
				83: "ms",
				84: "ms-Arab",
				85: "am",
				86: "ti",
				87: "om",
				88: "so",
				89: "sw",
				90: "rw",
				91: "rn",
				92: "ny",
				93: "mg",
				94: "eo",
				128: "cy",
				129: "eu",
				130: "ca",
				131: "la",
				132: "qu",
				133: "gn",
				134: "ay",
				135: "tt",
				136: "ug",
				137: "dz",
				138: "jv",
				139: "su",
				140: "gl",
				141: "af",
				142: "br",
				143: "iu",
				144: "gd",
				145: "gv",
				146: "ga",
				147: "to",
				148: "el-polyton",
				149: "kl",
				150: "az",
				151: "nn"
			};
			var macLanguageToScript = {
				0: 0,
				1: 0,
				2: 0,
				3: 0,
				4: 0,
				5: 0,
				6: 0,
				7: 0,
				8: 0,
				9: 0,
				10: 5,
				11: 1,
				12: 4,
				13: 0,
				14: 6,
				15: 0,
				16: 0,
				17: 0,
				18: 0,
				19: 2,
				20: 4,
				21: 9,
				22: 21,
				23: 3,
				24: 29,
				25: 29,
				26: 29,
				27: 29,
				28: 29,
				29: 0,
				30: 0,
				31: 4,
				32: 7,
				33: 25,
				34: 0,
				35: 0,
				36: 0,
				37: 0,
				38: 29,
				39: 29,
				40: 0,
				41: 5,
				42: 7,
				43: 7,
				44: 7,
				45: 7,
				46: 7,
				47: 7,
				48: 7,
				49: 7,
				50: 4,
				51: 24,
				52: 23,
				53: 7,
				54: 7,
				55: 7,
				56: 7,
				57: 27,
				58: 7,
				59: 4,
				60: 4,
				61: 4,
				62: 4,
				63: 26,
				64: 9,
				65: 9,
				66: 9,
				67: 13,
				68: 13,
				69: 11,
				70: 10,
				71: 12,
				72: 17,
				73: 16,
				74: 14,
				75: 15,
				76: 18,
				77: 19,
				78: 20,
				79: 22,
				80: 30,
				81: 0,
				82: 0,
				83: 0,
				84: 4,
				85: 28,
				86: 28,
				87: 28,
				88: 0,
				89: 0,
				90: 0,
				91: 0,
				92: 0,
				93: 0,
				94: 0,
				128: 0,
				129: 0,
				130: 0,
				131: 0,
				132: 0,
				133: 0,
				134: 0,
				135: 7,
				136: 4,
				137: 26,
				138: 0,
				139: 0,
				140: 0,
				141: 0,
				142: 0,
				143: 28,
				144: 0,
				145: 0,
				146: 0,
				147: 0,
				148: 6,
				149: 0,
				150: 0,
				151: 0
			};
			var windowsLanguages = {
				1078: "af",
				1052: "sq",
				1156: "gsw",
				1118: "am",
				5121: "ar-DZ",
				15361: "ar-BH",
				3073: "ar",
				2049: "ar-IQ",
				11265: "ar-JO",
				13313: "ar-KW",
				12289: "ar-LB",
				4097: "ar-LY",
				6145: "ary",
				8193: "ar-OM",
				16385: "ar-QA",
				1025: "ar-SA",
				10241: "ar-SY",
				7169: "aeb",
				14337: "ar-AE",
				9217: "ar-YE",
				1067: "hy",
				1101: "as",
				2092: "az-Cyrl",
				1068: "az",
				1133: "ba",
				1069: "eu",
				1059: "be",
				2117: "bn",
				1093: "bn-IN",
				8218: "bs-Cyrl",
				5146: "bs",
				1150: "br",
				1026: "bg",
				1027: "ca",
				3076: "zh-HK",
				5124: "zh-MO",
				2052: "zh",
				4100: "zh-SG",
				1028: "zh-TW",
				1155: "co",
				1050: "hr",
				4122: "hr-BA",
				1029: "cs",
				1030: "da",
				1164: "prs",
				1125: "dv",
				2067: "nl-BE",
				1043: "nl",
				3081: "en-AU",
				10249: "en-BZ",
				4105: "en-CA",
				9225: "en-029",
				16393: "en-IN",
				6153: "en-IE",
				8201: "en-JM",
				17417: "en-MY",
				5129: "en-NZ",
				13321: "en-PH",
				18441: "en-SG",
				7177: "en-ZA",
				11273: "en-TT",
				2057: "en-GB",
				1033: "en",
				12297: "en-ZW",
				1061: "et",
				1080: "fo",
				1124: "fil",
				1035: "fi",
				2060: "fr-BE",
				3084: "fr-CA",
				1036: "fr",
				5132: "fr-LU",
				6156: "fr-MC",
				4108: "fr-CH",
				1122: "fy",
				1110: "gl",
				1079: "ka",
				3079: "de-AT",
				1031: "de",
				5127: "de-LI",
				4103: "de-LU",
				2055: "de-CH",
				1032: "el",
				1135: "kl",
				1095: "gu",
				1128: "ha",
				1037: "he",
				1081: "hi",
				1038: "hu",
				1039: "is",
				1136: "ig",
				1057: "id",
				1117: "iu",
				2141: "iu-Latn",
				2108: "ga",
				1076: "xh",
				1077: "zu",
				1040: "it",
				2064: "it-CH",
				1041: "ja",
				1099: "kn",
				1087: "kk",
				1107: "km",
				1158: "quc",
				1159: "rw",
				1089: "sw",
				1111: "kok",
				1042: "ko",
				1088: "ky",
				1108: "lo",
				1062: "lv",
				1063: "lt",
				2094: "dsb",
				1134: "lb",
				1071: "mk",
				2110: "ms-BN",
				1086: "ms",
				1100: "ml",
				1082: "mt",
				1153: "mi",
				1146: "arn",
				1102: "mr",
				1148: "moh",
				1104: "mn",
				2128: "mn-CN",
				1121: "ne",
				1044: "nb",
				2068: "nn",
				1154: "oc",
				1096: "or",
				1123: "ps",
				1045: "pl",
				1046: "pt",
				2070: "pt-PT",
				1094: "pa",
				1131: "qu-BO",
				2155: "qu-EC",
				3179: "qu",
				1048: "ro",
				1047: "rm",
				1049: "ru",
				9275: "smn",
				4155: "smj-NO",
				5179: "smj",
				3131: "se-FI",
				1083: "se",
				2107: "se-SE",
				8251: "sms",
				6203: "sma-NO",
				7227: "sms",
				1103: "sa",
				7194: "sr-Cyrl-BA",
				3098: "sr",
				6170: "sr-Latn-BA",
				2074: "sr-Latn",
				1132: "nso",
				1074: "tn",
				1115: "si",
				1051: "sk",
				1060: "sl",
				11274: "es-AR",
				16394: "es-BO",
				13322: "es-CL",
				9226: "es-CO",
				5130: "es-CR",
				7178: "es-DO",
				12298: "es-EC",
				17418: "es-SV",
				4106: "es-GT",
				18442: "es-HN",
				2058: "es-MX",
				19466: "es-NI",
				6154: "es-PA",
				15370: "es-PY",
				10250: "es-PE",
				20490: "es-PR",
				3082: "es",
				1034: "es",
				21514: "es-US",
				14346: "es-UY",
				8202: "es-VE",
				2077: "sv-FI",
				1053: "sv",
				1114: "syr",
				1064: "tg",
				2143: "tzm",
				1097: "ta",
				1092: "tt",
				1098: "te",
				1054: "th",
				1105: "bo",
				1055: "tr",
				1090: "tk",
				1152: "ug",
				1058: "uk",
				1070: "hsb",
				1056: "ur",
				2115: "uz-Cyrl",
				1091: "uz",
				1066: "vi",
				1106: "cy",
				1160: "wo",
				1157: "sah",
				1144: "ii",
				1130: "yo"
			};
			function getLanguageCode(platformID, languageID, ltag) {
				switch (platformID) {
					case 0:
						if (languageID === 65535) return "und";
						else if (ltag) return ltag[languageID];
						break;
					case 1: return macLanguages[languageID];
					case 3: return windowsLanguages[languageID];
				}
			}
			var utf16 = "utf-16";
			var macScriptEncodings = {
				0: "macintosh",
				1: "x-mac-japanese",
				2: "x-mac-chinesetrad",
				3: "x-mac-korean",
				6: "x-mac-greek",
				7: "x-mac-cyrillic",
				9: "x-mac-devanagai",
				10: "x-mac-gurmukhi",
				11: "x-mac-gujarati",
				12: "x-mac-oriya",
				13: "x-mac-bengali",
				14: "x-mac-tamil",
				15: "x-mac-telugu",
				16: "x-mac-kannada",
				17: "x-mac-malayalam",
				18: "x-mac-sinhalese",
				19: "x-mac-burmese",
				20: "x-mac-khmer",
				21: "x-mac-thai",
				22: "x-mac-lao",
				23: "x-mac-georgian",
				24: "x-mac-armenian",
				25: "x-mac-chinesesimp",
				26: "x-mac-tibetan",
				27: "x-mac-mongolian",
				28: "x-mac-ethiopic",
				29: "x-mac-ce",
				30: "x-mac-vietnamese",
				31: "x-mac-extarabic"
			};
			var macLanguageEncodings = {
				15: "x-mac-icelandic",
				17: "x-mac-turkish",
				18: "x-mac-croatian",
				24: "x-mac-ce",
				25: "x-mac-ce",
				26: "x-mac-ce",
				27: "x-mac-ce",
				28: "x-mac-ce",
				30: "x-mac-icelandic",
				37: "x-mac-romanian",
				38: "x-mac-ce",
				39: "x-mac-ce",
				40: "x-mac-ce",
				143: "x-mac-inuit",
				146: "x-mac-gaelic"
			};
			function getEncoding(platformID, encodingID, languageID) {
				switch (platformID) {
					case 0: return utf16;
					case 1: return macLanguageEncodings[languageID] || macScriptEncodings[encodingID];
					case 3: if (encodingID === 1 || encodingID === 10) return utf16;
				}
			}
			var platforms = {
				0: "unicode",
				1: "macintosh",
				2: "reserved",
				3: "windows"
			};
			function getPlatform(platformID) {
				return platforms[platformID];
			}
			function parseNameTable(data, start, ltag) {
				const name = {};
				const p = new parse_default.Parser(data, start);
				const format = p.parseUShort();
				const count = p.parseUShort();
				const stringOffset = p.offset + p.parseUShort();
				for (let i = 0; i < count; i++) {
					const platformID = p.parseUShort();
					const encodingID = p.parseUShort();
					const languageID = p.parseUShort();
					const nameID = p.parseUShort();
					const property = nameTableNames[nameID] || nameID;
					const byteLength = p.parseUShort();
					const offset = p.parseUShort();
					const language = getLanguageCode(platformID, languageID, ltag);
					const encoding = getEncoding(platformID, encodingID, languageID);
					const platformName = getPlatform(platformID);
					if (encoding !== void 0 && language !== void 0 && platformName !== void 0) {
						let text;
						if (encoding === utf16) text = decode.UTF16(data, stringOffset + offset, byteLength);
						else text = decode.MACSTRING(data, stringOffset + offset, byteLength, encoding);
						if (text) {
							let platform = name[platformName];
							if (platform === void 0) platform = name[platformName] = {};
							let translations = platform[property];
							if (translations === void 0) translations = platform[property] = {};
							translations[language] = text;
						}
					}
				}
				if (format === 1) p.parseUShort();
				return name;
			}
			function reverseDict(dict) {
				const result = {};
				for (let key in dict) result[dict[key]] = parseInt(key);
				return result;
			}
			function makeNameRecord(platformID, encodingID, languageID, nameID, length, offset) {
				return new table_default.Record("NameRecord", [
					{
						name: "platformID",
						type: "USHORT",
						value: platformID
					},
					{
						name: "encodingID",
						type: "USHORT",
						value: encodingID
					},
					{
						name: "languageID",
						type: "USHORT",
						value: languageID
					},
					{
						name: "nameID",
						type: "USHORT",
						value: nameID
					},
					{
						name: "length",
						type: "USHORT",
						value: length
					},
					{
						name: "offset",
						type: "USHORT",
						value: offset
					}
				]);
			}
			function findSubArray(needle, haystack) {
				const needleLength = needle.length;
				const limit = haystack.length - needleLength + 1;
				loop: for (let pos = 0; pos < limit; pos++) for (; pos < limit; pos++) {
					for (let k = 0; k < needleLength; k++) if (haystack[pos + k] !== needle[k]) continue loop;
					return pos;
				}
				return -1;
			}
			function addStringToPool(s, pool) {
				let offset = findSubArray(s, pool);
				if (offset < 0) {
					offset = pool.length;
					let i = 0;
					const len = s.length;
					for (; i < len; ++i) pool.push(s[i]);
				}
				return offset;
			}
			function makeNameTable(names, ltag) {
				const platformNameIds = reverseDict(platforms);
				const macLanguageIds = reverseDict(macLanguages);
				const windowsLanguageIds = reverseDict(windowsLanguages);
				const nameRecords = [];
				const stringPool = [];
				for (let platform in names) {
					let nameID;
					const nameIDs = [];
					const namesWithNumericKeys = {};
					const nameTableIds = reverseDict(nameTableNames);
					const platformID = platformNameIds[platform];
					for (let key in names[platform]) {
						let id = nameTableIds[key];
						if (id === void 0) id = key;
						nameID = parseInt(id);
						if (isNaN(nameID)) throw new Error("Name table entry \"" + key + "\" does not exist, see nameTableNames for complete list.");
						namesWithNumericKeys[nameID] = names[platform][key];
						nameIDs.push(nameID);
					}
					for (let i = 0; i < nameIDs.length; i++) {
						nameID = nameIDs[i];
						const translations = namesWithNumericKeys[nameID];
						for (let lang in translations) {
							const text = translations[lang];
							if (platformID === 1 || platformID === 0) {
								let macLanguage = macLanguageIds[lang];
								let macScript = macLanguageToScript[macLanguage];
								const macEncoding = getEncoding(platformID, macScript, macLanguage);
								let macName = encode.MACSTRING(text, macEncoding);
								if (platformID === 0) {
									macLanguage = ltag.indexOf(lang);
									if (macLanguage < 0) {
										macLanguage = ltag.length;
										ltag.push(lang);
									}
									macScript = 4;
									macName = encode.UTF16(text);
								}
								if (macName !== void 0) {
									const macNameOffset = addStringToPool(macName, stringPool);
									nameRecords.push(makeNameRecord(platformID, macScript, macLanguage, nameID, macName.length, macNameOffset));
								}
							}
							if (platformID === 3) {
								const winLanguage = windowsLanguageIds[lang];
								if (winLanguage !== void 0) {
									const winName = encode.UTF16(text);
									const winNameOffset = addStringToPool(winName, stringPool);
									nameRecords.push(makeNameRecord(3, 1, winLanguage, nameID, winName.length, winNameOffset));
								}
							}
						}
					}
				}
				nameRecords.sort(function(a, b) {
					return a.platformID - b.platformID || a.encodingID - b.encodingID || a.languageID - b.languageID || a.nameID - b.nameID;
				});
				const t = new table_default.Table("name", [
					{
						name: "format",
						type: "USHORT",
						value: 0
					},
					{
						name: "count",
						type: "USHORT",
						value: nameRecords.length
					},
					{
						name: "stringOffset",
						type: "USHORT",
						value: 6 + nameRecords.length * 12
					}
				]);
				for (let r = 0; r < nameRecords.length; r++) t.fields.push({
					name: "record_" + r,
					type: "RECORD",
					value: nameRecords[r]
				});
				t.fields.push({
					name: "strings",
					type: "LITERAL",
					value: stringPool
				});
				return t;
			}
			function getNameByID(names, nameID, allowedStandardIDs = []) {
				if (nameID < 256 && nameID in nameTableNames) {
					if (allowedStandardIDs.length && !allowedStandardIDs.includes(parseInt(nameID))) return;
					nameID = nameTableNames[nameID];
				}
				for (let platform in names) for (let nameKey in names[platform]) if (nameKey === nameID || parseInt(nameKey) === nameID) return names[platform][nameKey];
			}
			var name_default = {
				parse: parseNameTable,
				make: makeNameTable,
				getNameByID
			};
			function parseCmapTableFormat0(cmap, p, platformID, encodingID) {
				cmap.length = p.parseUShort();
				cmap.language = p.parseUShort() - 1;
				const indexMap = p.parseByteList(cmap.length);
				const glyphIndexMap = Object.assign({}, indexMap);
				const decodingTable = eightBitMacEncodings[getEncoding(platformID, encodingID, cmap.language)];
				for (let i = 0; i < decodingTable.length; i++) glyphIndexMap[decodingTable.charCodeAt(i)] = indexMap[128 + i];
				cmap.glyphIndexMap = glyphIndexMap;
			}
			function parseCmapTableFormat12or13(cmap, p, format) {
				p.parseUShort();
				cmap.length = p.parseULong();
				cmap.language = p.parseULong();
				let groupCount;
				cmap.groupCount = groupCount = p.parseULong();
				cmap.glyphIndexMap = {};
				for (let i = 0; i < groupCount; i += 1) {
					const startCharCode = p.parseULong();
					const endCharCode = p.parseULong();
					let startGlyphId = p.parseULong();
					for (let c = startCharCode; c <= endCharCode; c += 1) {
						cmap.glyphIndexMap[c] = startGlyphId;
						if (format === 12) startGlyphId++;
					}
				}
			}
			function parseCmapTableFormat4(cmap, p, data, start, offset) {
				cmap.length = p.parseUShort();
				cmap.language = p.parseUShort();
				let segCount;
				cmap.segCount = segCount = p.parseUShort() >> 1;
				p.skip("uShort", 3);
				cmap.glyphIndexMap = {};
				const endCountParser = new parse_default.Parser(data, start + offset + 14);
				const startCountParser = new parse_default.Parser(data, start + offset + 16 + segCount * 2);
				const idDeltaParser = new parse_default.Parser(data, start + offset + 16 + segCount * 4);
				const idRangeOffsetParser = new parse_default.Parser(data, start + offset + 16 + segCount * 6);
				let glyphIndexOffset = start + offset + 16 + segCount * 8;
				for (let i = 0; i < segCount - 1; i += 1) {
					let glyphIndex;
					const endCount = endCountParser.parseUShort();
					const startCount = startCountParser.parseUShort();
					const idDelta = idDeltaParser.parseShort();
					const idRangeOffset = idRangeOffsetParser.parseUShort();
					for (let c = startCount; c <= endCount; c += 1) {
						if (idRangeOffset !== 0) {
							glyphIndexOffset = idRangeOffsetParser.offset + idRangeOffsetParser.relativeOffset - 2;
							glyphIndexOffset += idRangeOffset;
							glyphIndexOffset += (c - startCount) * 2;
							glyphIndex = parse_default.getUShort(data, glyphIndexOffset);
							if (glyphIndex !== 0) glyphIndex = glyphIndex + idDelta & 65535;
						} else glyphIndex = c + idDelta & 65535;
						cmap.glyphIndexMap[c] = glyphIndex;
					}
				}
			}
			function parseCmapTableFormat14(cmap, p) {
				const varSelectorList = {};
				p.skip("uLong");
				const numVarSelectorRecords = p.parseULong();
				for (let i = 0; i < numVarSelectorRecords; i += 1) {
					const varSelector = p.parseUInt24();
					const varSelectorRecord = { varSelector };
					const defaultUVSOffset = p.parseOffset32();
					const nonDefaultUVSOffset = p.parseOffset32();
					const currentOffset = p.relativeOffset;
					if (defaultUVSOffset) {
						p.relativeOffset = defaultUVSOffset;
						varSelectorRecord.defaultUVS = p.parseStruct({ ranges: function() {
							return p.parseRecordList32({
								startUnicodeValue: p.parseUInt24,
								additionalCount: p.parseByte
							});
						} });
					}
					if (nonDefaultUVSOffset) {
						p.relativeOffset = nonDefaultUVSOffset;
						varSelectorRecord.nonDefaultUVS = p.parseStruct({ uvsMappings: function() {
							const map = {};
							const list = p.parseRecordList32({
								unicodeValue: p.parseUInt24,
								glyphID: p.parseUShort
							});
							for (let i2 = 0; i2 < list.length; i2 += 1) map[list[i2].unicodeValue] = list[i2];
							return map;
						} });
					}
					varSelectorList[varSelector] = varSelectorRecord;
					p.relativeOffset = currentOffset;
				}
				cmap.varSelectorList = varSelectorList;
			}
			function parseCmapTable(data, start) {
				const cmap = {};
				cmap.version = parse_default.getUShort(data, start);
				check_default.argument(cmap.version === 0, "cmap table version should be 0.");
				cmap.numTables = parse_default.getUShort(data, start + 2);
				let format14Parser = null;
				let format14offset = -1;
				let offset = -1;
				let platformId = null;
				let encodingId = null;
				const platform0Encodings = [
					0,
					1,
					2,
					3,
					4,
					6
				];
				const platform3Encodings = [
					0,
					1,
					10
				];
				for (let i = cmap.numTables - 1; i >= 0; i -= 1) {
					platformId = parse_default.getUShort(data, start + 4 + i * 8);
					encodingId = parse_default.getUShort(data, start + 4 + i * 8 + 2);
					if (platformId === 3 && platform3Encodings.includes(encodingId) || platformId === 0 && platform0Encodings.includes(encodingId) || platformId === 1 && encodingId === 0) {
						if (offset > 0) continue;
						offset = parse_default.getULong(data, start + 4 + i * 8 + 4);
						if (format14Parser) break;
					} else if (platformId === 0 && encodingId === 5) {
						format14offset = parse_default.getULong(data, start + 4 + i * 8 + 4);
						format14Parser = new parse_default.Parser(data, start + format14offset);
						if (format14Parser.parseUShort() !== 14) {
							format14offset = -1;
							format14Parser = null;
						} else if (offset > 0) break;
					}
				}
				if (offset === -1) throw new Error("No valid cmap sub-tables found.");
				const p = new parse_default.Parser(data, start + offset);
				cmap.format = p.parseUShort();
				if (cmap.format === 0) parseCmapTableFormat0(cmap, p, platformId, encodingId);
				else if (cmap.format === 12 || cmap.format === 13) parseCmapTableFormat12or13(cmap, p, cmap.format);
				else if (cmap.format === 4) parseCmapTableFormat4(cmap, p, data, start, offset);
				else throw new Error("Only format 0 (platformId 1, encodingId 0), 4, 12 and 14 cmap tables are supported (found format " + cmap.format + ", platformId " + platformId + ", encodingId " + encodingId + ").");
				if (format14Parser) parseCmapTableFormat14(cmap, format14Parser);
				return cmap;
			}
			function addSegment(t, code, glyphIndex) {
				t.segments.push({
					end: code,
					start: code,
					delta: -(code - glyphIndex),
					offset: 0,
					glyphIndex
				});
			}
			function addTerminatorSegment(t) {
				t.segments.push({
					end: 65535,
					start: 65535,
					delta: 1,
					offset: 0
				});
			}
			function mergeSegments(segments) {
				if (segments.length === 0) return segments;
				const merged = [segments[0]];
				for (let i = 1; i < segments.length; i++) {
					const prev = merged[merged.length - 1];
					const curr = segments[i];
					if (prev.end + 1 === curr.start && prev.delta === curr.delta && curr.end !== 65535) prev.end = curr.end;
					else merged.push(curr);
				}
				return merged;
			}
			function makeCmapTable(glyphs) {
				let isPlan0Only = true;
				let i;
				for (i = glyphs.length - 1; i > 0; i -= 1) if (glyphs.get(i).unicode > 65535) {
					isPlan0Only = false;
					break;
				}
				let cmapTable = [
					{
						name: "version",
						type: "USHORT",
						value: 0
					},
					{
						name: "numTables",
						type: "USHORT",
						value: isPlan0Only ? 1 : 2
					},
					{
						name: "platformID",
						type: "USHORT",
						value: 3
					},
					{
						name: "encodingID",
						type: "USHORT",
						value: 1
					},
					{
						name: "offset",
						type: "ULONG",
						value: isPlan0Only ? 12 : 20
					}
				];
				if (!isPlan0Only) cmapTable.push(...[
					{
						name: "cmap12PlatformID",
						type: "USHORT",
						value: 3
					},
					{
						name: "cmap12EncodingID",
						type: "USHORT",
						value: 10
					},
					{
						name: "cmap12Offset",
						type: "ULONG",
						value: 0
					}
				]);
				cmapTable.push(...[
					{
						name: "format",
						type: "USHORT",
						value: 4
					},
					{
						name: "cmap4Length",
						type: "USHORT",
						value: 0
					},
					{
						name: "language",
						type: "USHORT",
						value: 0
					},
					{
						name: "segCountX2",
						type: "USHORT",
						value: 0
					},
					{
						name: "searchRange",
						type: "USHORT",
						value: 0
					},
					{
						name: "entrySelector",
						type: "USHORT",
						value: 0
					},
					{
						name: "rangeShift",
						type: "USHORT",
						value: 0
					}
				]);
				const t = new table_default.Table("cmap", cmapTable);
				t.segments = [];
				for (i = 0; i < glyphs.length; i += 1) {
					const glyph = glyphs.get(i);
					for (let j = 0; j < glyph.unicodes.length; j += 1) addSegment(t, glyph.unicodes[j], i);
				}
				t.segments.sort(function(a, b) {
					return a.start - b.start;
				});
				t.segments = mergeSegments(t.segments);
				addTerminatorSegment(t);
				const segCount = t.segments.length;
				let segCountToRemove = 0;
				let endCounts = [];
				let startCounts = [];
				let idDeltas = [];
				let idRangeOffsets = [];
				let glyphIds = [];
				let cmap12Groups = [];
				for (i = 0; i < segCount; i += 1) {
					const segment = t.segments[i];
					if (segment.end <= 65535 && segment.start <= 65535) {
						endCounts.push({
							name: "end_" + i,
							type: "USHORT",
							value: segment.end
						});
						startCounts.push({
							name: "start_" + i,
							type: "USHORT",
							value: segment.start
						});
						idDeltas.push({
							name: "idDelta_" + i,
							type: "SHORT",
							value: segment.delta
						});
						idRangeOffsets.push({
							name: "idRangeOffset_" + i,
							type: "USHORT",
							value: segment.offset
						});
						if (segment.glyphId !== void 0) glyphIds.push({
							name: "glyph_" + i,
							type: "USHORT",
							value: segment.glyphId
						});
					} else segCountToRemove += 1;
					if (!isPlan0Only && segment.glyphIndex !== void 0) {
						cmap12Groups.push({
							name: "cmap12Start_" + i,
							type: "ULONG",
							value: segment.start
						});
						cmap12Groups.push({
							name: "cmap12End_" + i,
							type: "ULONG",
							value: segment.end
						});
						cmap12Groups.push({
							name: "cmap12Glyph_" + i,
							type: "ULONG",
							value: segment.glyphIndex
						});
					}
				}
				t.segCountX2 = (segCount - segCountToRemove) * 2;
				t.searchRange = Math.pow(2, Math.floor(Math.log(segCount - segCountToRemove) / Math.log(2))) * 2;
				t.entrySelector = Math.log(t.searchRange / 2) / Math.log(2);
				t.rangeShift = t.segCountX2 - t.searchRange;
				for (let i2 = 0; i2 < endCounts.length; i2++) t.fields.push(endCounts[i2]);
				t.fields.push({
					name: "reservedPad",
					type: "USHORT",
					value: 0
				});
				for (let i2 = 0; i2 < startCounts.length; i2++) t.fields.push(startCounts[i2]);
				for (let i2 = 0; i2 < idDeltas.length; i2++) t.fields.push(idDeltas[i2]);
				for (let i2 = 0; i2 < idRangeOffsets.length; i2++) t.fields.push(idRangeOffsets[i2]);
				for (let i2 = 0; i2 < glyphIds.length; i2++) t.fields.push(glyphIds[i2]);
				t.cmap4Length = 14 + endCounts.length * 2 + 2 + startCounts.length * 2 + idDeltas.length * 2 + idRangeOffsets.length * 2 + glyphIds.length * 2;
				if (!isPlan0Only) {
					const cmap12Length = 16 + cmap12Groups.length * 4;
					t.cmap12Offset = 20 + t.cmap4Length;
					t.fields.push(...[
						{
							name: "cmap12Format",
							type: "USHORT",
							value: 12
						},
						{
							name: "cmap12Reserved",
							type: "USHORT",
							value: 0
						},
						{
							name: "cmap12Length",
							type: "ULONG",
							value: cmap12Length
						},
						{
							name: "cmap12Language",
							type: "ULONG",
							value: 0
						},
						{
							name: "cmap12nGroups",
							type: "ULONG",
							value: cmap12Groups.length / 3
						}
					]);
					for (let i2 = 0; i2 < cmap12Groups.length; i2++) t.fields.push(cmap12Groups[i2]);
				}
				return t;
			}
			var cmap_default = {
				parse: parseCmapTable,
				make: makeCmapTable
			};
			var cffStandardStrings = [
				".notdef",
				"space",
				"exclam",
				"quotedbl",
				"numbersign",
				"dollar",
				"percent",
				"ampersand",
				"quoteright",
				"parenleft",
				"parenright",
				"asterisk",
				"plus",
				"comma",
				"hyphen",
				"period",
				"slash",
				"zero",
				"one",
				"two",
				"three",
				"four",
				"five",
				"six",
				"seven",
				"eight",
				"nine",
				"colon",
				"semicolon",
				"less",
				"equal",
				"greater",
				"question",
				"at",
				"A",
				"B",
				"C",
				"D",
				"E",
				"F",
				"G",
				"H",
				"I",
				"J",
				"K",
				"L",
				"M",
				"N",
				"O",
				"P",
				"Q",
				"R",
				"S",
				"T",
				"U",
				"V",
				"W",
				"X",
				"Y",
				"Z",
				"bracketleft",
				"backslash",
				"bracketright",
				"asciicircum",
				"underscore",
				"quoteleft",
				"a",
				"b",
				"c",
				"d",
				"e",
				"f",
				"g",
				"h",
				"i",
				"j",
				"k",
				"l",
				"m",
				"n",
				"o",
				"p",
				"q",
				"r",
				"s",
				"t",
				"u",
				"v",
				"w",
				"x",
				"y",
				"z",
				"braceleft",
				"bar",
				"braceright",
				"asciitilde",
				"exclamdown",
				"cent",
				"sterling",
				"fraction",
				"yen",
				"florin",
				"section",
				"currency",
				"quotesingle",
				"quotedblleft",
				"guillemotleft",
				"guilsinglleft",
				"guilsinglright",
				"fi",
				"fl",
				"endash",
				"dagger",
				"daggerdbl",
				"periodcentered",
				"paragraph",
				"bullet",
				"quotesinglbase",
				"quotedblbase",
				"quotedblright",
				"guillemotright",
				"ellipsis",
				"perthousand",
				"questiondown",
				"grave",
				"acute",
				"circumflex",
				"tilde",
				"macron",
				"breve",
				"dotaccent",
				"dieresis",
				"ring",
				"cedilla",
				"hungarumlaut",
				"ogonek",
				"caron",
				"emdash",
				"AE",
				"ordfeminine",
				"Lslash",
				"Oslash",
				"OE",
				"ordmasculine",
				"ae",
				"dotlessi",
				"lslash",
				"oslash",
				"oe",
				"germandbls",
				"onesuperior",
				"logicalnot",
				"mu",
				"trademark",
				"Eth",
				"onehalf",
				"plusminus",
				"Thorn",
				"onequarter",
				"divide",
				"brokenbar",
				"degree",
				"thorn",
				"threequarters",
				"twosuperior",
				"registered",
				"minus",
				"eth",
				"multiply",
				"threesuperior",
				"copyright",
				"Aacute",
				"Acircumflex",
				"Adieresis",
				"Agrave",
				"Aring",
				"Atilde",
				"Ccedilla",
				"Eacute",
				"Ecircumflex",
				"Edieresis",
				"Egrave",
				"Iacute",
				"Icircumflex",
				"Idieresis",
				"Igrave",
				"Ntilde",
				"Oacute",
				"Ocircumflex",
				"Odieresis",
				"Ograve",
				"Otilde",
				"Scaron",
				"Uacute",
				"Ucircumflex",
				"Udieresis",
				"Ugrave",
				"Yacute",
				"Ydieresis",
				"Zcaron",
				"aacute",
				"acircumflex",
				"adieresis",
				"agrave",
				"aring",
				"atilde",
				"ccedilla",
				"eacute",
				"ecircumflex",
				"edieresis",
				"egrave",
				"iacute",
				"icircumflex",
				"idieresis",
				"igrave",
				"ntilde",
				"oacute",
				"ocircumflex",
				"odieresis",
				"ograve",
				"otilde",
				"scaron",
				"uacute",
				"ucircumflex",
				"udieresis",
				"ugrave",
				"yacute",
				"ydieresis",
				"zcaron",
				"exclamsmall",
				"Hungarumlautsmall",
				"dollaroldstyle",
				"dollarsuperior",
				"ampersandsmall",
				"Acutesmall",
				"parenleftsuperior",
				"parenrightsuperior",
				"266 ff",
				"onedotenleader",
				"zerooldstyle",
				"oneoldstyle",
				"twooldstyle",
				"threeoldstyle",
				"fouroldstyle",
				"fiveoldstyle",
				"sixoldstyle",
				"sevenoldstyle",
				"eightoldstyle",
				"nineoldstyle",
				"commasuperior",
				"threequartersemdash",
				"periodsuperior",
				"questionsmall",
				"asuperior",
				"bsuperior",
				"centsuperior",
				"dsuperior",
				"esuperior",
				"isuperior",
				"lsuperior",
				"msuperior",
				"nsuperior",
				"osuperior",
				"rsuperior",
				"ssuperior",
				"tsuperior",
				"ff",
				"ffi",
				"ffl",
				"parenleftinferior",
				"parenrightinferior",
				"Circumflexsmall",
				"hyphensuperior",
				"Gravesmall",
				"Asmall",
				"Bsmall",
				"Csmall",
				"Dsmall",
				"Esmall",
				"Fsmall",
				"Gsmall",
				"Hsmall",
				"Ismall",
				"Jsmall",
				"Ksmall",
				"Lsmall",
				"Msmall",
				"Nsmall",
				"Osmall",
				"Psmall",
				"Qsmall",
				"Rsmall",
				"Ssmall",
				"Tsmall",
				"Usmall",
				"Vsmall",
				"Wsmall",
				"Xsmall",
				"Ysmall",
				"Zsmall",
				"colonmonetary",
				"onefitted",
				"rupiah",
				"Tildesmall",
				"exclamdownsmall",
				"centoldstyle",
				"Lslashsmall",
				"Scaronsmall",
				"Zcaronsmall",
				"Dieresissmall",
				"Brevesmall",
				"Caronsmall",
				"Dotaccentsmall",
				"Macronsmall",
				"figuredash",
				"hypheninferior",
				"Ogoneksmall",
				"Ringsmall",
				"Cedillasmall",
				"questiondownsmall",
				"oneeighth",
				"threeeighths",
				"fiveeighths",
				"seveneighths",
				"onethird",
				"twothirds",
				"zerosuperior",
				"foursuperior",
				"fivesuperior",
				"sixsuperior",
				"sevensuperior",
				"eightsuperior",
				"ninesuperior",
				"zeroinferior",
				"oneinferior",
				"twoinferior",
				"threeinferior",
				"fourinferior",
				"fiveinferior",
				"sixinferior",
				"seveninferior",
				"eightinferior",
				"nineinferior",
				"centinferior",
				"dollarinferior",
				"periodinferior",
				"commainferior",
				"Agravesmall",
				"Aacutesmall",
				"Acircumflexsmall",
				"Atildesmall",
				"Adieresissmall",
				"Aringsmall",
				"AEsmall",
				"Ccedillasmall",
				"Egravesmall",
				"Eacutesmall",
				"Ecircumflexsmall",
				"Edieresissmall",
				"Igravesmall",
				"Iacutesmall",
				"Icircumflexsmall",
				"Idieresissmall",
				"Ethsmall",
				"Ntildesmall",
				"Ogravesmall",
				"Oacutesmall",
				"Ocircumflexsmall",
				"Otildesmall",
				"Odieresissmall",
				"OEsmall",
				"Oslashsmall",
				"Ugravesmall",
				"Uacutesmall",
				"Ucircumflexsmall",
				"Udieresissmall",
				"Yacutesmall",
				"Thornsmall",
				"Ydieresissmall",
				"001.000",
				"001.001",
				"001.002",
				"001.003",
				"Black",
				"Bold",
				"Book",
				"Light",
				"Medium",
				"Regular",
				"Roman",
				"Semibold"
			];
			var cffISOAdobeStrings = [
				".notdef",
				"space",
				"exclam",
				"quotedbl",
				"numbersign",
				"dollar",
				"percent",
				"ampersand",
				"quoteright",
				"parenleft",
				"parenright",
				"asterisk",
				"plus",
				"comma",
				"hyphen",
				"period",
				"slash",
				"zero",
				"one",
				"two",
				"three",
				"four",
				"five",
				"six",
				"seven",
				"eight",
				"nine",
				"colon",
				"semicolon",
				"less",
				"equal",
				"greater",
				"question",
				"at",
				"A",
				"B",
				"C",
				"D",
				"E",
				"F",
				"G",
				"H",
				"I",
				"J",
				"K",
				"L",
				"M",
				"N",
				"O",
				"P",
				"Q",
				"R",
				"S",
				"T",
				"U",
				"V",
				"W",
				"X",
				"Y",
				"Z",
				"bracketleft",
				"backslash",
				"bracketright",
				"asciicircum",
				"underscore",
				"quoteleft",
				"a",
				"b",
				"c",
				"d",
				"e",
				"f",
				"g",
				"h",
				"i",
				"j",
				"k",
				"l",
				"m",
				"n",
				"o",
				"p",
				"q",
				"r",
				"s",
				"t",
				"u",
				"v",
				"w",
				"x",
				"y",
				"z",
				"braceleft",
				"bar",
				"braceright",
				"asciitilde",
				"exclamdown",
				"cent",
				"sterling",
				"fraction",
				"yen",
				"florin",
				"section",
				"currency",
				"quotesingle",
				"quotedblleft",
				"guillemotleft",
				"guilsinglleft",
				"guilsinglright",
				"fi",
				"fl",
				"endash",
				"dagger",
				"daggerdbl",
				"periodcentered",
				"paragraph",
				"bullet",
				"quotesinglbase",
				"quotedblbase",
				"quotedblright",
				"guillemotright",
				"ellipsis",
				"perthousand",
				"questiondown",
				"grave",
				"acute",
				"circumflex",
				"tilde",
				"macron",
				"breve",
				"dotaccent",
				"dieresis",
				"ring",
				"cedilla",
				"hungarumlaut",
				"ogonek",
				"caron",
				"emdash",
				"AE",
				"ordfeminine",
				"Lslash",
				"Oslash",
				"OE",
				"ordmasculine",
				"ae",
				"dotlessi",
				"lslash",
				"oslash",
				"oe",
				"germandbls",
				"onesuperior",
				"logicalnot",
				"mu",
				"trademark",
				"Eth",
				"onehalf",
				"plusminus",
				"Thorn",
				"onequarter",
				"divide",
				"brokenbar",
				"degree",
				"thorn",
				"threequarters",
				"twosuperior",
				"registered",
				"minus",
				"eth",
				"multiply",
				"threesuperior",
				"copyright",
				"Aacute",
				"Acircumflex",
				"Adieresis",
				"Agrave",
				"Aring",
				"Atilde",
				"Ccedilla",
				"Eacute",
				"Ecircumflex",
				"Edieresis",
				"Egrave",
				"Iacute",
				"Icircumflex",
				"Idieresis",
				"Igrave",
				"Ntilde",
				"Oacute",
				"Ocircumflex",
				"Odieresis",
				"Ograve",
				"Otilde",
				"Scaron",
				"Uacute",
				"Ucircumflex",
				"Udieresis",
				"Ugrave",
				"Yacute",
				"Ydieresis",
				"Zcaron",
				"aacute",
				"acircumflex",
				"adieresis",
				"agrave",
				"aring",
				"atilde",
				"ccedilla",
				"eacute",
				"ecircumflex",
				"edieresis",
				"egrave",
				"iacute",
				"icircumflex",
				"idieresis",
				"igrave",
				"ntilde",
				"oacute",
				"ocircumflex",
				"odieresis",
				"ograve",
				"otilde",
				"scaron",
				"uacute",
				"ucircumflex",
				"udieresis",
				"ugrave",
				"yacute",
				"ydieresis",
				"zcaron"
			];
			var cffIExpertStrings = [
				".notdef",
				"space",
				"exclamsmall",
				"Hungarumlautsmall",
				"dollaroldstyle",
				"dollarsuperior",
				"ampersandsmall",
				"Acutesmall",
				"parenleftsuperior",
				"parenrightsuperior",
				"twodotenleader",
				"onedotenleader",
				"comma",
				"hyphen",
				"period",
				"fraction",
				"zerooldstyle",
				"oneoldstyle",
				"twooldstyle",
				"threeoldstyle",
				"fouroldstyle",
				"fiveoldstyle",
				"sixoldstyle",
				"sevenoldstyle",
				"eightoldstyle",
				"nineoldstyle",
				"colon",
				"semicolon",
				"commasuperior",
				"threequartersemdash",
				"periodsuperior",
				"questionsmall",
				"asuperior",
				"bsuperior",
				"centsuperior",
				"dsuperior",
				"esuperior",
				"isuperior",
				"lsuperior",
				"msuperior",
				"nsuperior",
				"osuperior",
				"rsuperior",
				"ssuperior",
				"tsuperior",
				"ff",
				"fi",
				"fl",
				"ffi",
				"ffl",
				"parenleftinferior",
				"parenrightinferior",
				"Circumflexsmall",
				"hyphensuperior",
				"Gravesmall",
				"Asmall",
				"Bsmall",
				"Csmall",
				"Dsmall",
				"Esmall",
				"Fsmall",
				"Gsmall",
				"Hsmall",
				"Ismall",
				"Jsmall",
				"Ksmall",
				"Lsmall",
				"Msmall",
				"Nsmall",
				"Osmall",
				"Psmall",
				"Qsmall",
				"Rsmall",
				"Ssmall",
				"Tsmall",
				"Usmall",
				"Vsmall",
				"Wsmall",
				"Xsmall",
				"Ysmall",
				"Zsmall",
				"colonmonetary",
				"onefitted",
				"rupiah",
				"Tildesmall",
				"exclamdownsmall",
				"centoldstyle",
				"Lslashsmall",
				"Scaronsmall",
				"Zcaronsmall",
				"Dieresissmall",
				"Brevesmall",
				"Caronsmall",
				"Dotaccentsmall",
				"Macronsmall",
				"figuredash",
				"hypheninferior",
				"Ogoneksmall",
				"Ringsmall",
				"Cedillasmall",
				"onequarter",
				"onehalf",
				"threequarters",
				"questiondownsmall",
				"oneeighth",
				"threeeighths",
				"fiveeighths",
				"seveneighths",
				"onethird",
				"twothirds",
				"zerosuperior",
				"onesuperior",
				"twosuperior",
				"threesuperior",
				"foursuperior",
				"fivesuperior",
				"sixsuperior",
				"sevensuperior",
				"eightsuperior",
				"ninesuperior",
				"zeroinferior",
				"oneinferior",
				"twoinferior",
				"threeinferior",
				"fourinferior",
				"fiveinferior",
				"sixinferior",
				"seveninferior",
				"eightinferior",
				"nineinferior",
				"centinferior",
				"dollarinferior",
				"periodinferior",
				"commainferior",
				"Agravesmall",
				"Aacutesmall",
				"Acircumflexsmall",
				"Atildesmall",
				"Adieresissmall",
				"Aringsmall",
				"AEsmall",
				"Ccedillasmall",
				"Egravesmall",
				"Eacutesmall",
				"Ecircumflexsmall",
				"Edieresissmall",
				"Igravesmall",
				"Iacutesmall",
				"Icircumflexsmall",
				"Idieresissmall",
				"Ethsmall",
				"Ntildesmall",
				"Ogravesmall",
				"Oacutesmall",
				"Ocircumflexsmall",
				"Otildesmall",
				"Odieresissmall",
				"OEsmall",
				"Oslashsmall",
				"Ugravesmall",
				"Uacutesmall",
				"Ucircumflexsmall",
				"Udieresissmall",
				"Yacutesmall",
				"Thornsmall",
				"Ydieresissmall"
			];
			var cffExpertSubsetStrings = [
				".notdef",
				"space",
				"dollaroldstyle",
				"dollarsuperior",
				"parenleftsuperior",
				"parenrightsuperior",
				"twodotenleader",
				"onedotenleader",
				"comma",
				"hyphen",
				"period",
				"fraction",
				"zerooldstyle",
				"oneoldstyle",
				"twooldstyle",
				"threeoldstyle",
				"fouroldstyle",
				"fiveoldstyle",
				"sixoldstyle",
				"sevenoldstyle",
				"eightoldstyle",
				"nineoldstyle",
				"colon",
				"semicolon",
				"commasuperior",
				"threequartersemdash",
				"periodsuperior",
				"asuperior",
				"bsuperior",
				"centsuperior",
				"dsuperior",
				"esuperior",
				"isuperior",
				"lsuperior",
				"msuperior",
				"nsuperior",
				"osuperior",
				"rsuperior",
				"ssuperior",
				"tsuperior",
				"ff",
				"fi",
				"fl",
				"ffi",
				"ffl",
				"parenleftinferior",
				"parenrightinferior",
				"hyphensuperior",
				"colonmonetary",
				"onefitted",
				"rupiah",
				"centoldstyle",
				"figuredash",
				"hypheninferior",
				"onequarter",
				"onehalf",
				"threequarters",
				"oneeighth",
				"threeeighths",
				"fiveeighths",
				"seveneighths",
				"onethird",
				"twothirds",
				"zerosuperior",
				"onesuperior",
				"twosuperior",
				"threesuperior",
				"foursuperior",
				"fivesuperior",
				"sixsuperior",
				"sevensuperior",
				"eightsuperior",
				"ninesuperior",
				"zeroinferior",
				"oneinferior",
				"twoinferior",
				"threeinferior",
				"fourinferior",
				"fiveinferior",
				"sixinferior",
				"seveninferior",
				"eightinferior",
				"nineinferior",
				"centinferior",
				"dollarinferior",
				"periodinferior",
				"commainferior"
			];
			var cffStandardEncoding = [
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"space",
				"exclam",
				"quotedbl",
				"numbersign",
				"dollar",
				"percent",
				"ampersand",
				"quoteright",
				"parenleft",
				"parenright",
				"asterisk",
				"plus",
				"comma",
				"hyphen",
				"period",
				"slash",
				"zero",
				"one",
				"two",
				"three",
				"four",
				"five",
				"six",
				"seven",
				"eight",
				"nine",
				"colon",
				"semicolon",
				"less",
				"equal",
				"greater",
				"question",
				"at",
				"A",
				"B",
				"C",
				"D",
				"E",
				"F",
				"G",
				"H",
				"I",
				"J",
				"K",
				"L",
				"M",
				"N",
				"O",
				"P",
				"Q",
				"R",
				"S",
				"T",
				"U",
				"V",
				"W",
				"X",
				"Y",
				"Z",
				"bracketleft",
				"backslash",
				"bracketright",
				"asciicircum",
				"underscore",
				"quoteleft",
				"a",
				"b",
				"c",
				"d",
				"e",
				"f",
				"g",
				"h",
				"i",
				"j",
				"k",
				"l",
				"m",
				"n",
				"o",
				"p",
				"q",
				"r",
				"s",
				"t",
				"u",
				"v",
				"w",
				"x",
				"y",
				"z",
				"braceleft",
				"bar",
				"braceright",
				"asciitilde",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"exclamdown",
				"cent",
				"sterling",
				"fraction",
				"yen",
				"florin",
				"section",
				"currency",
				"quotesingle",
				"quotedblleft",
				"guillemotleft",
				"guilsinglleft",
				"guilsinglright",
				"fi",
				"fl",
				"",
				"endash",
				"dagger",
				"daggerdbl",
				"periodcentered",
				"",
				"paragraph",
				"bullet",
				"quotesinglbase",
				"quotedblbase",
				"quotedblright",
				"guillemotright",
				"ellipsis",
				"perthousand",
				"",
				"questiondown",
				"",
				"grave",
				"acute",
				"circumflex",
				"tilde",
				"macron",
				"breve",
				"dotaccent",
				"dieresis",
				"",
				"ring",
				"cedilla",
				"",
				"hungarumlaut",
				"ogonek",
				"caron",
				"emdash",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"AE",
				"",
				"ordfeminine",
				"",
				"",
				"",
				"",
				"Lslash",
				"Oslash",
				"OE",
				"ordmasculine",
				"",
				"",
				"",
				"",
				"",
				"ae",
				"",
				"",
				"",
				"dotlessi",
				"",
				"",
				"lslash",
				"oslash",
				"oe",
				"germandbls"
			];
			var cffExpertEncoding = [
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"space",
				"exclamsmall",
				"Hungarumlautsmall",
				"",
				"dollaroldstyle",
				"dollarsuperior",
				"ampersandsmall",
				"Acutesmall",
				"parenleftsuperior",
				"parenrightsuperior",
				"twodotenleader",
				"onedotenleader",
				"comma",
				"hyphen",
				"period",
				"fraction",
				"zerooldstyle",
				"oneoldstyle",
				"twooldstyle",
				"threeoldstyle",
				"fouroldstyle",
				"fiveoldstyle",
				"sixoldstyle",
				"sevenoldstyle",
				"eightoldstyle",
				"nineoldstyle",
				"colon",
				"semicolon",
				"commasuperior",
				"threequartersemdash",
				"periodsuperior",
				"questionsmall",
				"",
				"asuperior",
				"bsuperior",
				"centsuperior",
				"dsuperior",
				"esuperior",
				"",
				"",
				"isuperior",
				"",
				"",
				"lsuperior",
				"msuperior",
				"nsuperior",
				"osuperior",
				"",
				"",
				"rsuperior",
				"ssuperior",
				"tsuperior",
				"",
				"ff",
				"fi",
				"fl",
				"ffi",
				"ffl",
				"parenleftinferior",
				"",
				"parenrightinferior",
				"Circumflexsmall",
				"hyphensuperior",
				"Gravesmall",
				"Asmall",
				"Bsmall",
				"Csmall",
				"Dsmall",
				"Esmall",
				"Fsmall",
				"Gsmall",
				"Hsmall",
				"Ismall",
				"Jsmall",
				"Ksmall",
				"Lsmall",
				"Msmall",
				"Nsmall",
				"Osmall",
				"Psmall",
				"Qsmall",
				"Rsmall",
				"Ssmall",
				"Tsmall",
				"Usmall",
				"Vsmall",
				"Wsmall",
				"Xsmall",
				"Ysmall",
				"Zsmall",
				"colonmonetary",
				"onefitted",
				"rupiah",
				"Tildesmall",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				"exclamdownsmall",
				"centoldstyle",
				"Lslashsmall",
				"",
				"",
				"Scaronsmall",
				"Zcaronsmall",
				"Dieresissmall",
				"Brevesmall",
				"Caronsmall",
				"",
				"Dotaccentsmall",
				"",
				"",
				"Macronsmall",
				"",
				"",
				"figuredash",
				"hypheninferior",
				"",
				"",
				"Ogoneksmall",
				"Ringsmall",
				"Cedillasmall",
				"",
				"",
				"",
				"onequarter",
				"onehalf",
				"threequarters",
				"questiondownsmall",
				"oneeighth",
				"threeeighths",
				"fiveeighths",
				"seveneighths",
				"onethird",
				"twothirds",
				"",
				"",
				"zerosuperior",
				"onesuperior",
				"twosuperior",
				"threesuperior",
				"foursuperior",
				"fivesuperior",
				"sixsuperior",
				"sevensuperior",
				"eightsuperior",
				"ninesuperior",
				"zeroinferior",
				"oneinferior",
				"twoinferior",
				"threeinferior",
				"fourinferior",
				"fiveinferior",
				"sixinferior",
				"seveninferior",
				"eightinferior",
				"nineinferior",
				"centinferior",
				"dollarinferior",
				"periodinferior",
				"commainferior",
				"Agravesmall",
				"Aacutesmall",
				"Acircumflexsmall",
				"Atildesmall",
				"Adieresissmall",
				"Aringsmall",
				"AEsmall",
				"Ccedillasmall",
				"Egravesmall",
				"Eacutesmall",
				"Ecircumflexsmall",
				"Edieresissmall",
				"Igravesmall",
				"Iacutesmall",
				"Icircumflexsmall",
				"Idieresissmall",
				"Ethsmall",
				"Ntildesmall",
				"Ogravesmall",
				"Oacutesmall",
				"Ocircumflexsmall",
				"Otildesmall",
				"Odieresissmall",
				"OEsmall",
				"Oslashsmall",
				"Ugravesmall",
				"Uacutesmall",
				"Ucircumflexsmall",
				"Udieresissmall",
				"Yacutesmall",
				"Thornsmall",
				"Ydieresissmall"
			];
			var standardNames = [
				".notdef",
				".null",
				"nonmarkingreturn",
				"space",
				"exclam",
				"quotedbl",
				"numbersign",
				"dollar",
				"percent",
				"ampersand",
				"quotesingle",
				"parenleft",
				"parenright",
				"asterisk",
				"plus",
				"comma",
				"hyphen",
				"period",
				"slash",
				"zero",
				"one",
				"two",
				"three",
				"four",
				"five",
				"six",
				"seven",
				"eight",
				"nine",
				"colon",
				"semicolon",
				"less",
				"equal",
				"greater",
				"question",
				"at",
				"A",
				"B",
				"C",
				"D",
				"E",
				"F",
				"G",
				"H",
				"I",
				"J",
				"K",
				"L",
				"M",
				"N",
				"O",
				"P",
				"Q",
				"R",
				"S",
				"T",
				"U",
				"V",
				"W",
				"X",
				"Y",
				"Z",
				"bracketleft",
				"backslash",
				"bracketright",
				"asciicircum",
				"underscore",
				"grave",
				"a",
				"b",
				"c",
				"d",
				"e",
				"f",
				"g",
				"h",
				"i",
				"j",
				"k",
				"l",
				"m",
				"n",
				"o",
				"p",
				"q",
				"r",
				"s",
				"t",
				"u",
				"v",
				"w",
				"x",
				"y",
				"z",
				"braceleft",
				"bar",
				"braceright",
				"asciitilde",
				"Adieresis",
				"Aring",
				"Ccedilla",
				"Eacute",
				"Ntilde",
				"Odieresis",
				"Udieresis",
				"aacute",
				"agrave",
				"acircumflex",
				"adieresis",
				"atilde",
				"aring",
				"ccedilla",
				"eacute",
				"egrave",
				"ecircumflex",
				"edieresis",
				"iacute",
				"igrave",
				"icircumflex",
				"idieresis",
				"ntilde",
				"oacute",
				"ograve",
				"ocircumflex",
				"odieresis",
				"otilde",
				"uacute",
				"ugrave",
				"ucircumflex",
				"udieresis",
				"dagger",
				"degree",
				"cent",
				"sterling",
				"section",
				"bullet",
				"paragraph",
				"germandbls",
				"registered",
				"copyright",
				"trademark",
				"acute",
				"dieresis",
				"notequal",
				"AE",
				"Oslash",
				"infinity",
				"plusminus",
				"lessequal",
				"greaterequal",
				"yen",
				"mu",
				"partialdiff",
				"summation",
				"product",
				"pi",
				"integral",
				"ordfeminine",
				"ordmasculine",
				"Omega",
				"ae",
				"oslash",
				"questiondown",
				"exclamdown",
				"logicalnot",
				"radical",
				"florin",
				"approxequal",
				"Delta",
				"guillemotleft",
				"guillemotright",
				"ellipsis",
				"nonbreakingspace",
				"Agrave",
				"Atilde",
				"Otilde",
				"OE",
				"oe",
				"endash",
				"emdash",
				"quotedblleft",
				"quotedblright",
				"quoteleft",
				"quoteright",
				"divide",
				"lozenge",
				"ydieresis",
				"Ydieresis",
				"fraction",
				"currency",
				"guilsinglleft",
				"guilsinglright",
				"fi",
				"fl",
				"daggerdbl",
				"periodcentered",
				"quotesinglbase",
				"quotedblbase",
				"perthousand",
				"Acircumflex",
				"Ecircumflex",
				"Aacute",
				"Edieresis",
				"Egrave",
				"Iacute",
				"Icircumflex",
				"Idieresis",
				"Igrave",
				"Oacute",
				"Ocircumflex",
				"apple",
				"Ograve",
				"Uacute",
				"Ucircumflex",
				"Ugrave",
				"dotlessi",
				"circumflex",
				"tilde",
				"macron",
				"breve",
				"dotaccent",
				"ring",
				"cedilla",
				"hungarumlaut",
				"ogonek",
				"caron",
				"Lslash",
				"lslash",
				"Scaron",
				"scaron",
				"Zcaron",
				"zcaron",
				"brokenbar",
				"Eth",
				"eth",
				"Yacute",
				"yacute",
				"Thorn",
				"thorn",
				"minus",
				"multiply",
				"onesuperior",
				"twosuperior",
				"threesuperior",
				"onehalf",
				"onequarter",
				"threequarters",
				"franc",
				"Gbreve",
				"gbreve",
				"Idotaccent",
				"Scedilla",
				"scedilla",
				"Cacute",
				"cacute",
				"Ccaron",
				"ccaron",
				"dcroat"
			];
			function DefaultEncoding(font) {
				this.font = font;
			}
			DefaultEncoding.prototype.charToGlyphIndex = function(c) {
				const code = c.codePointAt(0);
				const glyphs = this.font.glyphs;
				if (glyphs) for (let i = 0; i < glyphs.length; i += 1) {
					const glyph = glyphs.get(i);
					for (let j = 0; j < glyph.unicodes.length; j += 1) if (glyph.unicodes[j] === code) return i;
				}
				return null;
			};
			function CmapEncoding(cmap) {
				this.cmap = cmap;
			}
			CmapEncoding.prototype.charToGlyphIndex = function(c) {
				return this.cmap.glyphIndexMap[c.codePointAt(0)] || 0;
			};
			function CffEncoding(encoding, charset) {
				this.encoding = encoding;
				this.charset = charset;
			}
			CffEncoding.prototype.charToGlyphIndex = function(s) {
				const code = s.codePointAt(0);
				const charName = this.encoding[code];
				return this.charset.indexOf(charName);
			};
			function GlyphNames(post) {
				switch (post.version) {
					case 1:
						this.names = standardNames.slice();
						break;
					case 2:
						this.names = new Array(post.numberOfGlyphs);
						for (let i = 0; i < post.numberOfGlyphs; i++) if (post.glyphNameIndex[i] < standardNames.length) this.names[i] = standardNames[post.glyphNameIndex[i]];
						else this.names[i] = post.names[post.glyphNameIndex[i] - standardNames.length];
						break;
					case 2.5:
						this.names = new Array(post.numberOfGlyphs);
						for (let i = 0; i < post.numberOfGlyphs; i++) this.names[i] = standardNames[i + post.glyphNameIndex[i]];
						break;
					case 3:
						this.names = [];
						break;
					default: this.names = [];
				}
			}
			GlyphNames.prototype.nameToGlyphIndex = function(name) {
				return this.names.indexOf(name);
			};
			GlyphNames.prototype.glyphIndexToName = function(gid) {
				return this.names[gid];
			};
			function addGlyphNamesAll(font) {
				let glyph;
				const glyphIndexMap = font.tables.cmap.glyphIndexMap;
				const charCodes = Object.keys(glyphIndexMap);
				for (let i = 0; i < charCodes.length; i += 1) {
					const c = charCodes[i];
					const glyphIndex = glyphIndexMap[c];
					glyph = font.glyphs.get(glyphIndex);
					glyph.addUnicode(parseInt(c));
				}
				for (let i = 0; i < font.glyphs.length; i += 1) {
					glyph = font.glyphs.get(i);
					if (font.cffEncoding) glyph.name = font.cffEncoding.charset[i];
					else if (font.glyphNames.names) glyph.name = font.glyphNames.glyphIndexToName(i);
				}
			}
			function addGlyphNamesToUnicodeMap(font) {
				font._IndexToUnicodeMap = {};
				const glyphIndexMap = font.tables.cmap.glyphIndexMap;
				const charCodes = Object.keys(glyphIndexMap);
				for (let i = 0; i < charCodes.length; i += 1) {
					const c = charCodes[i];
					let glyphIndex = glyphIndexMap[c];
					if (font._IndexToUnicodeMap[glyphIndex] === void 0) font._IndexToUnicodeMap[glyphIndex] = { unicodes: [parseInt(c)] };
					else font._IndexToUnicodeMap[glyphIndex].unicodes.push(parseInt(c));
				}
			}
			function addGlyphNames(font, opt) {
				if (opt.lowMemory) addGlyphNamesToUnicodeMap(font);
				else addGlyphNamesAll(font);
			}
			function line(ctx, x1, y1, x2, y2) {
				ctx.beginPath();
				ctx.moveTo(x1, y1);
				ctx.lineTo(x2, y2);
				ctx.stroke();
			}
			var draw_default = { line };
			function parseCpalTable(data, start) {
				const p = new Parser(data, start);
				const version = p.parseShort();
				if (version !== 0) console.warn("Only CPALv0 is currently fully supported.");
				const numPaletteEntries = p.parseShort();
				const numPalettes = p.parseShort();
				const numColorRecords = p.parseShort();
				const colorRecordsArrayOffset = p.parseOffset32();
				const colorRecordIndices = p.parseUShortList(numPalettes);
				p.relativeOffset = colorRecordsArrayOffset;
				const colorRecords = p.parseULongList(numColorRecords);
				p.relativeOffset = colorRecordsArrayOffset;
				return {
					version,
					numPaletteEntries,
					colorRecords,
					colorRecordIndices
				};
			}
			function makeCpalTable({ version = 0, numPaletteEntries = 0, colorRecords = [], colorRecordIndices = [0] }) {
				check_default.argument(version === 0, "Only CPALv0 are supported.");
				check_default.argument(colorRecords.length, "No colorRecords given.");
				check_default.argument(colorRecordIndices.length, "No colorRecordIndices given.");
				if (colorRecordIndices.length > 1) check_default.argument(numPaletteEntries, "Can't infer numPaletteEntries on multiple colorRecordIndices");
				return new table_default.Table("CPAL", [
					{
						name: "version",
						type: "USHORT",
						value: version
					},
					{
						name: "numPaletteEntries",
						type: "USHORT",
						value: numPaletteEntries || colorRecords.length
					},
					{
						name: "numPalettes",
						type: "USHORT",
						value: colorRecordIndices.length
					},
					{
						name: "numColorRecords",
						type: "USHORT",
						value: colorRecords.length
					},
					{
						name: "colorRecordsArrayOffset",
						type: "ULONG",
						value: 12 + 2 * colorRecordIndices.length
					},
					...colorRecordIndices.map((palette, i) => ({
						name: "colorRecordIndices_" + i,
						type: "USHORT",
						value: palette
					})),
					...colorRecords.map((color, i) => ({
						name: "colorRecords_" + i,
						type: "ULONG",
						value: color
					}))
				]);
			}
			function parseCPALColor(bgra) {
				var b = (bgra & 4278190080) >> 24;
				var g = (bgra & 16711680) >> 16;
				var r = (bgra & 65280) >> 8;
				var a = bgra & 255;
				b = b + 256 & 255;
				g = g + 256 & 255;
				r = r + 256 & 255;
				a = (a + 256 & 255) / 255;
				return {
					b,
					g,
					r,
					a
				};
			}
			function getPaletteColor(font, index, palette = 0, colorFormat = "hexa") {
				if (index == 65535) return "currentColor";
				const cpalTable = font && font.tables && font.tables.cpal;
				if (!cpalTable) return "currentColor";
				if (palette > cpalTable.colorRecordIndices.length - 1) throw new Error(`Palette index out of range (colorRecordIndices.length: ${cpalTable.colorRecordIndices.length}, index: ${index})`);
				if (index > cpalTable.numPaletteEntries) throw new Error(`Color index out of range (numPaletteEntries: ${cpalTable.numPaletteEntries}, index: ${index})`);
				const lookupIndex = cpalTable.colorRecordIndices[palette] + index;
				if (lookupIndex > cpalTable.colorRecords) throw new Error(`Color index out of range (colorRecords.length: ${cpalTable.colorRecords.length}, lookupIndex: ${lookupIndex})`);
				const color = parseCPALColor(cpalTable.colorRecords[lookupIndex]);
				if (colorFormat === "bgra") return color;
				return formatColor(color, colorFormat);
			}
			function toHex(d) {
				return ("0" + parseInt(d).toString(16)).slice(-2);
			}
			function rgbToHSL(bgra) {
				const r = bgra.r / 255;
				const g = bgra.g / 255;
				const b = bgra.b / 255;
				const max = Math.max(r, g, b), min = Math.min(r, g, b);
				let h, s, l = (max + min) / 2;
				if (max === min) h = s = 0;
				else {
					const d = max - min;
					s = l > .5 ? d / (2 - max - min) : d / (max + min);
					switch (max) {
						case r:
							h = (g - b) / d + (g < b ? 6 : 0);
							break;
						case g:
							h = (b - r) / d + 2;
							break;
						case b: h = (r - g) / d + 4;
					}
					h /= 6;
				}
				return {
					h: h * 360,
					s: s * 100,
					l: l * 100
				};
			}
			function hslToRGB(hsla) {
				let { h, s, l, a } = hsla;
				h = h % 360;
				s /= 100;
				l /= 100;
				const c = (1 - Math.abs(2 * l - 1)) * s;
				const x = c * (1 - Math.abs(h / 60 % 2 - 1));
				const m = l - c / 2;
				let r = 0, g = 0, b = 0;
				if (0 <= h && h < 60) {
					r = c;
					g = x;
					b = 0;
				} else if (60 <= h && h < 120) {
					r = x;
					g = c;
					b = 0;
				} else if (120 <= h && h < 180) {
					r = 0;
					g = c;
					b = x;
				} else if (180 <= h && h < 240) {
					r = 0;
					g = x;
					b = c;
				} else if (240 <= h && h < 300) {
					r = x;
					g = 0;
					b = c;
				} else if (300 <= h && h <= 360) {
					r = c;
					g = 0;
					b = x;
				}
				return {
					r: Math.round((r + m) * 255),
					g: Math.round((g + m) * 255),
					b: Math.round((b + m) * 255),
					a
				};
			}
			function bgraToRaw(color) {
				return parseInt(`0x${toHex(color.b)}${toHex(color.g)}${toHex(color.r)}${toHex(color.a * 255)}`, 16);
			}
			function parseColor(color, targetFormat = "hexa") {
				const returnRaw = targetFormat == "raw" || targetFormat == "cpal";
				const isRaw = Number.isInteger(color);
				let validFormat = true;
				if (isRaw && returnRaw || color === "currentColor") return color;
				else if (typeof color === "object") {
					if (targetFormat == "bgra") return color;
					if (returnRaw) return bgraToRaw(color);
				} else if (!isRaw && /^#([a-f0-9]{3}|[a-f0-9]{4}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(color.trim())) {
					color = color.trim().substring(1);
					switch (color.length) {
						case 3:
							color = {
								r: parseInt(color[0].repeat(2), 16),
								g: parseInt(color[1].repeat(2), 16),
								b: parseInt(color[2].repeat(2), 16),
								a: 1
							};
							break;
						case 4:
							color = {
								r: parseInt(color[0].repeat(2), 16),
								g: parseInt(color[1].repeat(2), 16),
								b: parseInt(color[2].repeat(2), 16),
								a: parseInt(color[3].repeat(2), 16) / 255
							};
							break;
						case 6:
							color = {
								r: parseInt(color[0] + color[1], 16),
								g: parseInt(color[2] + color[3], 16),
								b: parseInt(color[4] + color[5], 16),
								a: 1
							};
							break;
						case 8: color = {
							r: parseInt(color[0] + color[1], 16),
							g: parseInt(color[2] + color[3], 16),
							b: parseInt(color[4] + color[5], 16),
							a: parseInt(color[6] + color[7], 16) / 255
						};
					}
					if (targetFormat == "bgra") return color;
				} else if (typeof document !== "undefined" && /^[a-z]+$/i.test(color)) {
					const ctx = document.createElement("canvas").getContext("2d");
					ctx.fillStyle = color;
					const detectedColor = formatColor(ctx.fillStyle, "hexa");
					if (detectedColor === "#000000ff" && color.toLowerCase() !== "black") validFormat = false;
					else color = detectedColor;
				} else {
					color = color.trim();
					const rgbaRegex = /rgba?\(\s*(?:(\d*\.\d+)(%?)|(\d+)(%?))\s*(?:,|\s*)\s*(?:(\d*\.\d+)(%?)|(\d+)(%?))\s*(?:,|\s*)\s*(?:(\d*\.\d+)(%?)|(\d+)(%?))\s*(?:(?:,|\s|\/)\s*(?:(0*(?:\.\d+)?()|0*1(?:\.0+)?())|(?:\.\d+)|(\d+)(%)|(\d*\.\d+)(%)))?\s*\)/;
					if (rgbaRegex.test(color)) {
						const matches = color.match(rgbaRegex).filter((i) => typeof i !== "undefined");
						color = {
							r: Math.round(parseFloat(matches[1]) / (matches[2] ? 100 / 255 : 1)),
							g: Math.round(parseFloat(matches[3]) / (matches[4] ? 100 / 255 : 1)),
							b: Math.round(parseFloat(matches[5]) / (matches[6] ? 100 / 255 : 1)),
							a: !matches[7] ? 1 : parseFloat(matches[7]) / (matches[8] ? 100 : 1)
						};
					} else {
						const hslaRegex = /hsla?\(\s*(?:(\d*\.\d+|\d+)(deg|turn|))\s*(?:,|\s*)\s*(?:(\d*\.\d+)%?|(\d+)%?)\s*(?:,|\s*)\s*(?:(\d*\.\d+)%?|(\d+)%?)\s*(?:(?:,|\s|\/)\s*(?:(0*(?:\.\d+)?()|0*1(?:\.0+)?())|(?:\.\d+)|(\d+)(%)|(\d*\.\d+)(%)))?\s*\)/;
						if (hslaRegex.test(color)) {
							const matches = color.match(hslaRegex).filter((i) => typeof i !== "undefined");
							color = hslToRGB({
								h: parseFloat(matches[1]) * (matches[2] === "turn" ? 360 : 1),
								s: parseFloat(matches[3]),
								l: parseFloat(matches[4]),
								a: !matches[5] ? 1 : parseFloat(matches[5]) / (matches[6] ? 100 : 1)
							});
						} else validFormat = false;
					}
				}
				if (!validFormat) throw new Error(`Invalid color format: ${color}`);
				return formatColor(color, targetFormat);
			}
			function formatColor(bgra, format = "hexa") {
				if (bgra === "currentColor") return bgra;
				if (Number.isInteger(bgra)) {
					if (format == "raw" || format == "cpal") return bgra;
					bgra = parseCPALColor(bgra);
				} else if (typeof bgra !== "object") bgra = parseColor(bgra, "bgra");
				let hsl = ["hsl", "hsla"].includes(format) ? rgbToHSL(bgra) : null;
				switch (format) {
					case "rgba": return `rgba(${bgra.r}, ${bgra.g}, ${bgra.b}, ${parseFloat(bgra.a.toFixed(3))})`;
					case "rgb": return `rgb(${bgra.r}, ${bgra.g}, ${bgra.b})`;
					case "hex":
					case "hex6":
					case "hex-6": return `#${toHex(bgra.r)}${toHex(bgra.g)}${toHex(bgra.b)}`;
					case "hexa":
					case "hex8":
					case "hex-8": return `#${toHex(bgra.r)}${toHex(bgra.g)}${toHex(bgra.b)}${toHex(bgra.a * 255)}`;
					case "hsl": return `hsl(${hsl.h.toFixed(2)}, ${hsl.s.toFixed(2)}%, ${hsl.l.toFixed(2)}%)`;
					case "hsla": return `hsla(${hsl.h.toFixed(2)}, ${hsl.s.toFixed(2)}%, ${hsl.l.toFixed(2)}%, ${parseFloat(bgra.a.toFixed(3))})`;
					case "bgra": return bgra;
					case "raw":
					case "cpal": return bgraToRaw(bgra);
					default: throw new Error("Unknown color format: " + format);
				}
			}
			var cpal_default = {
				parse: parseCpalTable,
				make: makeCpalTable,
				getPaletteColor,
				parseColor,
				formatColor
			};
			function getPathDefinition(glyph, path) {
				let _path = path || new path_default();
				return {
					configurable: true,
					get: function() {
						if (typeof _path === "function") _path = _path();
						return _path;
					},
					set: function(p) {
						_path = p;
					}
				};
			}
			function Glyph(options) {
				this.bindConstructorValues(options);
			}
			Glyph.prototype.bindConstructorValues = function(options) {
				this.index = options.index || 0;
				if (options.name === ".notdef") options.unicode = void 0;
				else if (options.name === ".null") options.unicode = 0;
				if (options.unicode === 0 && options.name !== ".null") throw new Error("The unicode value \"0\" is reserved for the glyph name \".null\" and cannot be used by any other glyph.");
				this.name = options.name || null;
				this.unicode = options.unicode;
				this.unicodes = options.unicodes || (options.unicode !== void 0 ? [options.unicode] : []);
				if ("xMin" in options) this.xMin = options.xMin;
				if ("yMin" in options) this.yMin = options.yMin;
				if ("xMax" in options) this.xMax = options.xMax;
				if ("yMax" in options) this.yMax = options.yMax;
				if ("advanceWidth" in options) this.advanceWidth = options.advanceWidth;
				if ("leftSideBearing" in options) this.leftSideBearing = options.leftSideBearing;
				if ("points" in options) this.points = options.points;
				Object.defineProperty(this, "path", getPathDefinition(this, options.path));
			};
			Glyph.prototype.addUnicode = function(unicode) {
				if (this.unicodes.length === 0) this.unicode = unicode;
				this.unicodes.push(unicode);
			};
			Glyph.prototype.getBoundingBox = function() {
				return this.path.getBoundingBox();
			};
			Glyph.prototype.getPath = function(x, y, fontSize, options, font) {
				x = x !== void 0 ? x : 0;
				y = y !== void 0 ? y : 0;
				fontSize = fontSize !== void 0 ? fontSize : 72;
				options = Object.assign({}, font && font.defaultRenderOptions, options);
				let commands;
				let hPoints;
				let xScale = options.xScale;
				let yScale = options.yScale;
				const scale = 1 / (this.path.unitsPerEm || 1e3) * fontSize;
				let useGlyph = this;
				if (font && font.variation) {
					useGlyph = font.variation.getTransform(this, options.variation);
					commands = useGlyph.path.commands;
				}
				if (options.hinting && font && font.hinting) hPoints = useGlyph.path && font.hinting.exec(useGlyph, fontSize, options);
				if (hPoints) {
					commands = font.hinting.getCommands(hPoints);
					x = Math.round(x);
					y = Math.round(y);
					xScale = yScale = 1;
				} else {
					commands = useGlyph.path.commands;
					if (xScale === void 0) xScale = scale;
					if (yScale === void 0) yScale = scale;
				}
				const p = new path_default();
				if (options.drawSVG) {
					const svgImage = this.getSvgImage(font);
					if (svgImage) {
						const layer = new path_default();
						layer._image = {
							image: svgImage.image,
							x: x + svgImage.leftSideBearing * scale,
							y: y - svgImage.baseline * scale,
							width: svgImage.image.width * scale,
							height: svgImage.image.height * scale
						};
						p._layers = [layer];
						return p;
					}
				}
				if (options.drawLayers) {
					const layers = this.getLayers(font);
					if (layers && layers.length) {
						p._layers = [];
						for (let i = 0; i < layers.length; i += 1) {
							const layer = layers[i];
							let color = getPaletteColor(font, layer.paletteIndex, options.usePalette);
							if (color === "currentColor") color = options.fill || "black";
							else color = formatColor(color, options.colorFormat || "rgba");
							options = Object.assign({}, options, { fill: color });
							p._layers.push(this.getPath.call(layer.glyph, x, y, fontSize, options, font));
						}
						return p;
					}
				}
				p.fill = options.fill || this.path.fill;
				p.stroke = this.path.stroke;
				p.strokeWidth = this.path.strokeWidth * scale;
				for (let i = 0; i < commands.length; i += 1) {
					const cmd = commands[i];
					if (cmd.type === "M") p.moveTo(x + cmd.x * xScale, y + -cmd.y * yScale);
					else if (cmd.type === "L") p.lineTo(x + cmd.x * xScale, y + -cmd.y * yScale);
					else if (cmd.type === "Q") p.quadraticCurveTo(x + cmd.x1 * xScale, y + -cmd.y1 * yScale, x + cmd.x * xScale, y + -cmd.y * yScale);
					else if (cmd.type === "C") p.curveTo(x + cmd.x1 * xScale, y + -cmd.y1 * yScale, x + cmd.x2 * xScale, y + -cmd.y2 * yScale, x + cmd.x * xScale, y + -cmd.y * yScale);
					else if (cmd.type === "Z" && p.stroke && p.strokeWidth) p.closePath();
				}
				return p;
			};
			Glyph.prototype.getLayers = function(font) {
				if (!font) throw new Error("The font object is required to read the colr/cpal tables in order to get the layers.");
				return font.layers.get(this.index);
			};
			Glyph.prototype.getSvgImage = function(font) {
				if (!font) throw new Error("The font object is required to read the svg table in order to get the image.");
				return font.svgImages.get(this.index);
			};
			Glyph.prototype.getContours = function(transformedPoints = null) {
				if (this.points === void 0 && !transformedPoints) return [];
				const contours = [];
				let currentContour = [];
				let points = transformedPoints ? transformedPoints : this.points;
				for (let i = 0; i < points.length; i += 1) {
					const pt = points[i];
					currentContour.push(pt);
					if (pt.lastPointOfContour) {
						contours.push(currentContour);
						currentContour = [];
					}
				}
				check_default.argument(currentContour.length === 0, "There are still points left in the current contour.");
				return contours;
			};
			Glyph.prototype.getMetrics = function() {
				const commands = this.path.commands;
				const xCoords = [];
				const yCoords = [];
				for (let i = 0; i < commands.length; i += 1) {
					const cmd = commands[i];
					if (cmd.type !== "Z") {
						xCoords.push(cmd.x);
						yCoords.push(cmd.y);
					}
					if (cmd.type === "Q" || cmd.type === "C") {
						xCoords.push(cmd.x1);
						yCoords.push(cmd.y1);
					}
					if (cmd.type === "C") {
						xCoords.push(cmd.x2);
						yCoords.push(cmd.y2);
					}
				}
				const metrics = {
					xMin: Math.min.apply(null, xCoords),
					yMin: Math.min.apply(null, yCoords),
					xMax: Math.max.apply(null, xCoords),
					yMax: Math.max.apply(null, yCoords),
					leftSideBearing: this.leftSideBearing
				};
				if (!isFinite(metrics.xMin)) metrics.xMin = 0;
				if (!isFinite(metrics.xMax)) metrics.xMax = this.advanceWidth;
				if (!isFinite(metrics.yMin)) metrics.yMin = 0;
				if (!isFinite(metrics.yMax)) metrics.yMax = 0;
				metrics.rightSideBearing = this.advanceWidth - metrics.leftSideBearing - (metrics.xMax - metrics.xMin);
				return metrics;
			};
			Glyph.prototype.draw = function(ctx, x, y, fontSize, options, font) {
				options = Object.assign({}, font && font.defaultRenderOptions, options);
				this.getPath(x, y, fontSize, options, font).draw(ctx);
			};
			Glyph.prototype.drawPoints = function(ctx, x, y, fontSize, options, font) {
				options = Object.assign({}, font && font.defaultRenderOptions, options);
				if (options.drawLayers) {
					const layers = this.getLayers(font);
					if (layers && layers.length) {
						for (let l = 0; l < layers.length; l += 1) if (layers[l].glyph.index !== this.index) this.drawPoints.call(layers[l].glyph, ctx, x, y, fontSize);
						return;
					}
				}
				function drawCircles(l, x2, y2, scale2) {
					ctx.beginPath();
					for (let j = 0; j < l.length; j += 1) {
						ctx.moveTo(x2 + l[j].x * scale2, y2 + l[j].y * scale2);
						ctx.arc(x2 + l[j].x * scale2, y2 + l[j].y * scale2, 2, 0, Math.PI * 2, false);
					}
					ctx.fill();
				}
				x = x !== void 0 ? x : 0;
				y = y !== void 0 ? y : 0;
				fontSize = fontSize !== void 0 ? fontSize : 24;
				const scale = 1 / this.path.unitsPerEm * fontSize;
				const blueCircles = [];
				const redCircles = [];
				let commands = this.path.commands;
				if (font && font.variation) commands = font.variation.getTransform(this, options.variation).path.commands;
				for (let i = 0; i < commands.length; i += 1) {
					const cmd = commands[i];
					if (cmd.x !== void 0) blueCircles.push({
						x: cmd.x,
						y: -cmd.y
					});
					if (cmd.x1 !== void 0) redCircles.push({
						x: cmd.x1,
						y: -cmd.y1
					});
					if (cmd.x2 !== void 0) redCircles.push({
						x: cmd.x2,
						y: -cmd.y2
					});
				}
				ctx.fillStyle = "blue";
				drawCircles(blueCircles, x, y, scale);
				ctx.fillStyle = "red";
				drawCircles(redCircles, x, y, scale);
			};
			Glyph.prototype.drawMetrics = function(ctx, x, y, fontSize) {
				let scale;
				x = x !== void 0 ? x : 0;
				y = y !== void 0 ? y : 0;
				fontSize = fontSize !== void 0 ? fontSize : 24;
				scale = 1 / this.path.unitsPerEm * fontSize;
				ctx.lineWidth = 1;
				ctx.strokeStyle = "black";
				draw_default.line(ctx, x, -1e4, x, 1e4);
				draw_default.line(ctx, -1e4, y, 1e4, y);
				const xMin = this.xMin || 0;
				let yMin = this.yMin || 0;
				const xMax = this.xMax || 0;
				let yMax = this.yMax || 0;
				const advanceWidth = this.advanceWidth || 0;
				ctx.strokeStyle = "blue";
				draw_default.line(ctx, x + xMin * scale, -1e4, x + xMin * scale, 1e4);
				draw_default.line(ctx, x + xMax * scale, -1e4, x + xMax * scale, 1e4);
				draw_default.line(ctx, -1e4, y + -yMin * scale, 1e4, y + -yMin * scale);
				draw_default.line(ctx, -1e4, y + -yMax * scale, 1e4, y + -yMax * scale);
				ctx.strokeStyle = "green";
				draw_default.line(ctx, x + advanceWidth * scale, -1e4, x + advanceWidth * scale, 1e4);
			};
			Glyph.prototype.toPathData = function(options, font) {
				options = Object.assign({}, { variation: font && font.defaultRenderOptions.variation }, options);
				let useGlyph = this;
				if (font && font.variation) useGlyph = font.variation.getTransform(this, options.variation);
				let usePath = useGlyph.points && options.pointsTransform ? options.pointsTransform(useGlyph.points) : useGlyph.path;
				if (options.pathTransform) usePath = options.pathTransform(usePath);
				return usePath.toPathData(options);
			};
			Glyph.prototype.fromSVG = function(pathData, options = {}) {
				return this.path.fromSVG(pathData, options);
			};
			Glyph.prototype.toSVG = function(options, font) {
				const pathData = this.toPathData.apply(this, [options, font]);
				return this.path.toSVG(options, pathData);
			};
			Glyph.prototype.toDOMElement = function(options, font) {
				options = Object.assign({}, { variation: font && font.defaultRenderOptions.variation }, options);
				let usePath = this.path;
				if (font && font.variation) usePath = font.variation.getTransform(this, options.variation).path;
				return usePath.toDOMElement(options);
			};
			var glyph_default = Glyph;
			function defineDependentProperty(glyph, externalName, internalName) {
				Object.defineProperty(glyph, externalName, {
					get: function() {
						typeof glyph[internalName] === "undefined" && glyph.path;
						return glyph[internalName];
					},
					set: function(newValue) {
						glyph[internalName] = newValue;
					},
					enumerable: true,
					configurable: true
				});
			}
			function GlyphSet(font, glyphs) {
				this.font = font;
				this.glyphs = {};
				if (Array.isArray(glyphs)) for (let i = 0; i < glyphs.length; i++) {
					const glyph = glyphs[i];
					glyph.path.unitsPerEm = font.unitsPerEm;
					this.glyphs[i] = glyph;
				}
				this.length = glyphs && glyphs.length || 0;
			}
			if (typeof Symbol !== "undefined" && Symbol.iterator) GlyphSet.prototype[Symbol.iterator] = function() {
				let n = -1;
				return { next: function() {
					n++;
					const done = n >= this.length - 1;
					return {
						value: this.get(n),
						done
					};
				}.bind(this) };
			};
			GlyphSet.prototype.get = function(index) {
				if (this.font._push && this.glyphs[index] === void 0) {
					this.font._push(index);
					if (typeof this.glyphs[index] === "function") this.glyphs[index] = this.glyphs[index]();
					let glyph = this.glyphs[index];
					let unicodeObj = this.font._IndexToUnicodeMap[index];
					if (unicodeObj) for (let j = 0; j < unicodeObj.unicodes.length; j++) glyph.addUnicode(unicodeObj.unicodes[j]);
					if (this.font.cffEncoding) glyph.name = this.font.cffEncoding.charset[index];
					else if (this.font.glyphNames.names) glyph.name = this.font.glyphNames.glyphIndexToName(index);
					this.glyphs[index].advanceWidth = this.font._hmtxTableData[index].advanceWidth;
					this.glyphs[index].leftSideBearing = this.font._hmtxTableData[index].leftSideBearing;
				} else if (typeof this.glyphs[index] === "function") this.glyphs[index] = this.glyphs[index]();
				return this.glyphs[index];
			};
			GlyphSet.prototype.push = function(index, loader) {
				this.glyphs[index] = loader;
				this.length++;
			};
			function glyphLoader(font, index) {
				return new glyph_default({
					index,
					font
				});
			}
			function ttfGlyphLoader(font, index, parseGlyph2, data, position, buildPath2) {
				return function() {
					const glyph = new glyph_default({
						index,
						font
					});
					glyph.path = function() {
						parseGlyph2(glyph, data, position);
						const path = buildPath2(font.glyphs, glyph);
						path.unitsPerEm = font.unitsPerEm;
						return path;
					};
					defineDependentProperty(glyph, "numberOfContours", "_numberOfContours");
					defineDependentProperty(glyph, "xMin", "_xMin");
					defineDependentProperty(glyph, "xMax", "_xMax");
					defineDependentProperty(glyph, "yMin", "_yMin");
					defineDependentProperty(glyph, "yMax", "_yMax");
					defineDependentProperty(glyph, "points", "_points");
					return glyph;
				};
			}
			function cffGlyphLoader(font, index, parseCFFCharstring2, charstring, version) {
				return function() {
					const glyph = new glyph_default({
						index,
						font
					});
					glyph.path = function() {
						const path = parseCFFCharstring2(font, glyph, charstring, version);
						path.unitsPerEm = font.unitsPerEm;
						return path;
					};
					return glyph;
				};
			}
			var glyphset_default = {
				GlyphSet,
				glyphLoader,
				ttfGlyphLoader,
				cffGlyphLoader
			};
			function equals(a, b) {
				if (a === b) return true;
				else if (Array.isArray(a) && Array.isArray(b)) {
					if (a.length !== b.length) return false;
					for (let i = 0; i < a.length; i += 1) if (!equals(a[i], b[i])) return false;
					return true;
				} else return false;
			}
			var MAX_CALL_DEPTH = 10;
			function calcCFFSubroutineBias(subrs) {
				let bias;
				if (subrs.length < 1240) bias = 107;
				else if (subrs.length < 33900) bias = 1131;
				else bias = 32768;
				return bias;
			}
			function parseCFFIndex(data, start, conversionFn, version) {
				const offsets = [];
				const objects = [];
				const count = version > 1 ? parse_default.getULong(data, start) : parse_default.getCard16(data, start);
				const countLength = version > 1 ? 4 : 2;
				let objectOffset;
				let endOffset;
				if (count !== 0) {
					const offsetSize = parse_default.getByte(data, start + countLength);
					objectOffset = start + (count + 1) * offsetSize + countLength;
					let pos = start + countLength + 1;
					for (let i = 0; i < count + 1; i += 1) {
						offsets.push(parse_default.getOffset(data, pos, offsetSize));
						pos += offsetSize;
					}
					endOffset = objectOffset + offsets[count];
				} else endOffset = start + countLength;
				for (let i = 0; i < offsets.length - 1; i += 1) {
					let value = parse_default.getBytes(data, objectOffset + offsets[i], objectOffset + offsets[i + 1]);
					if (conversionFn) value = conversionFn(value, data, start, version);
					objects.push(value);
				}
				return {
					objects,
					startOffset: start,
					endOffset
				};
			}
			function parseCFFIndexLowMemory(data, start, version) {
				const offsets = [];
				const count = version > 1 ? parse_default.getULong(data, start) : parse_default.getCard16(data, start);
				const countLength = version > 1 ? 4 : 2;
				let objectOffset;
				let endOffset;
				if (count !== 0) {
					const offsetSize = parse_default.getByte(data, start + countLength);
					objectOffset = start + (count + 1) * offsetSize + countLength;
					let pos = start + countLength + 1;
					for (let i = 0; i < count + 1; i += 1) {
						offsets.push(parse_default.getOffset(data, pos, offsetSize));
						pos += offsetSize;
					}
					endOffset = objectOffset + offsets[count];
				} else endOffset = start + countLength;
				return {
					offsets,
					startOffset: start,
					endOffset
				};
			}
			function getCffIndexObject(i, offsets, data, start, conversionFn, version) {
				const count = version > 1 ? parse_default.getULong(data, start) : parse_default.getCard16(data, start);
				const countLength = version > 1 ? 4 : 2;
				let objectOffset = 0;
				if (count !== 0) {
					const offsetSize = parse_default.getByte(data, start + countLength);
					objectOffset = start + (count + 1) * offsetSize + countLength;
				}
				let value = parse_default.getBytes(data, objectOffset + offsets[i], objectOffset + offsets[i + 1]);
				if (conversionFn) value = conversionFn(value);
				return value;
			}
			function parseFloatOperand(parser) {
				let s = "";
				const eof = 15;
				const lookup = [
					"0",
					"1",
					"2",
					"3",
					"4",
					"5",
					"6",
					"7",
					"8",
					"9",
					".",
					"E",
					"E-",
					null,
					"-"
				];
				for (;;) {
					const b = parser.parseByte();
					const n1 = b >> 4;
					const n2 = b & 15;
					if (n1 === eof) break;
					s += lookup[n1];
					if (n2 === eof) break;
					s += lookup[n2];
				}
				return parseFloat(s);
			}
			function parseOperand(parser, b0) {
				let b1;
				let b2;
				let b3;
				let b4;
				if (b0 === 28) {
					b1 = parser.parseByte();
					b2 = parser.parseByte();
					return b1 << 8 | b2;
				}
				if (b0 === 29) {
					b1 = parser.parseByte();
					b2 = parser.parseByte();
					b3 = parser.parseByte();
					b4 = parser.parseByte();
					return b1 << 24 | b2 << 16 | b3 << 8 | b4;
				}
				if (b0 === 30) return parseFloatOperand(parser);
				if (b0 >= 32 && b0 <= 246) return b0 - 139;
				if (b0 >= 247 && b0 <= 250) {
					b1 = parser.parseByte();
					return (b0 - 247) * 256 + b1 + 108;
				}
				if (b0 >= 251 && b0 <= 254) {
					b1 = parser.parseByte();
					return -(b0 - 251) * 256 - b1 - 108;
				}
				throw new Error("Invalid b0 " + b0);
			}
			function entriesToObject(entries) {
				const o = {};
				for (let i = 0; i < entries.length; i += 1) {
					const key = entries[i][0];
					const values = entries[i][1];
					let value;
					if (values.length === 1) value = values[0];
					else value = values;
					if (Object.prototype.hasOwnProperty.call(o, key) && !isNaN(o[key])) throw new Error("Object " + o + " already has key " + key);
					o[key] = value;
				}
				return o;
			}
			function parseCFFDict(data, start, size, version) {
				start = start !== void 0 ? start : 0;
				const parser = new parse_default.Parser(data, start);
				const entries = [];
				let operands = [];
				size = size !== void 0 ? size : data.byteLength;
				let operandsStart = version < 2 ? 22 : 28;
				while (parser.relativeOffset < size) {
					let op = parser.parseByte();
					if (op < operandsStart) {
						if (op === 12) op = 1200 + parser.parseByte();
						if (version > 1 && op === 23) {
							parseBlend(operands);
							continue;
						}
						entries.push([op, operands]);
						operands = [];
					} else operands.push(parseOperand(parser, op, version));
				}
				return entriesToObject(entries);
			}
			function getCFFString(strings, index) {
				if (index <= 390) index = cffStandardStrings[index];
				else if (strings) index = strings[index - 391];
				else index = void 0;
				return index;
			}
			function interpretDict(dict, meta, strings) {
				const newDict = {};
				let value;
				for (let i = 0; i < meta.length; i += 1) {
					const m = meta[i];
					if (Array.isArray(m.type)) {
						const values = [];
						values.length = m.type.length;
						for (let j = 0; j < m.type.length; j++) {
							value = dict[m.op] !== void 0 ? dict[m.op][j] : void 0;
							if (value === void 0) value = m.value !== void 0 && m.value[j] !== void 0 ? m.value[j] : null;
							if (m.type[j] === "SID") value = getCFFString(strings, value);
							values[j] = value;
						}
						newDict[m.name] = values;
					} else {
						value = dict[m.op];
						if (value === void 0) value = m.value !== void 0 ? m.value : null;
						if (m.type === "SID") value = getCFFString(strings, value);
						newDict[m.name] = value;
					}
				}
				return newDict;
			}
			function parseCFFHeader(data, start) {
				const header = {};
				header.formatMajor = parse_default.getCard8(data, start);
				header.formatMinor = parse_default.getCard8(data, start + 1);
				if (header.formatMajor > 2) throw new Error(`Unsupported CFF table version ${header.formatMajor}.${header.formatMinor}`);
				header.size = parse_default.getCard8(data, start + 2);
				if (header.formatMajor < 2) {
					header.offsetSize = parse_default.getCard8(data, start + 3);
					header.startOffset = start;
					header.endOffset = start + 4;
				} else {
					header.topDictLength = parse_default.getCard16(data, start + 3);
					header.endOffset = start + 8;
				}
				return header;
			}
			var TOP_DICT_META = [
				{
					name: "version",
					op: 0,
					type: "SID"
				},
				{
					name: "notice",
					op: 1,
					type: "SID"
				},
				{
					name: "copyright",
					op: 1200,
					type: "SID"
				},
				{
					name: "fullName",
					op: 2,
					type: "SID"
				},
				{
					name: "familyName",
					op: 3,
					type: "SID"
				},
				{
					name: "weight",
					op: 4,
					type: "SID"
				},
				{
					name: "isFixedPitch",
					op: 1201,
					type: "number",
					value: 0
				},
				{
					name: "italicAngle",
					op: 1202,
					type: "number",
					value: 0
				},
				{
					name: "underlinePosition",
					op: 1203,
					type: "number",
					value: -100
				},
				{
					name: "underlineThickness",
					op: 1204,
					type: "number",
					value: 50
				},
				{
					name: "paintType",
					op: 1205,
					type: "number",
					value: 0
				},
				{
					name: "charstringType",
					op: 1206,
					type: "number",
					value: 2
				},
				{
					name: "fontMatrix",
					op: 1207,
					type: [
						"real",
						"real",
						"real",
						"real",
						"real",
						"real"
					],
					value: [
						.001,
						0,
						0,
						.001,
						0,
						0
					]
				},
				{
					name: "uniqueId",
					op: 13,
					type: "number"
				},
				{
					name: "fontBBox",
					op: 5,
					type: [
						"number",
						"number",
						"number",
						"number"
					],
					value: [
						0,
						0,
						0,
						0
					]
				},
				{
					name: "strokeWidth",
					op: 1208,
					type: "number",
					value: 0
				},
				{
					name: "xuid",
					op: 14,
					type: [],
					value: null
				},
				{
					name: "charset",
					op: 15,
					type: "offset",
					value: 0
				},
				{
					name: "encoding",
					op: 16,
					type: "offset",
					value: 0
				},
				{
					name: "charStrings",
					op: 17,
					type: "offset",
					value: 0
				},
				{
					name: "private",
					op: 18,
					type: ["number", "offset"],
					value: [0, 0]
				},
				{
					name: "ros",
					op: 1230,
					type: [
						"SID",
						"SID",
						"number"
					]
				},
				{
					name: "cidFontVersion",
					op: 1231,
					type: "number",
					value: 0
				},
				{
					name: "cidFontRevision",
					op: 1232,
					type: "number",
					value: 0
				},
				{
					name: "cidFontType",
					op: 1233,
					type: "number",
					value: 0
				},
				{
					name: "cidCount",
					op: 1234,
					type: "number",
					value: 8720
				},
				{
					name: "uidBase",
					op: 1235,
					type: "number"
				},
				{
					name: "fdArray",
					op: 1236,
					type: "offset"
				},
				{
					name: "fdSelect",
					op: 1237,
					type: "offset"
				},
				{
					name: "fontName",
					op: 1238,
					type: "SID"
				}
			];
			var TOP_DICT_META_CFF2 = [
				{
					name: "fontMatrix",
					op: 1207,
					type: [
						"real",
						"real",
						"real",
						"real",
						"real",
						"real"
					],
					value: [
						.001,
						0,
						0,
						.001,
						0,
						0
					]
				},
				{
					name: "charStrings",
					op: 17,
					type: "offset"
				},
				{
					name: "fdArray",
					op: 1236,
					type: "offset"
				},
				{
					name: "fdSelect",
					op: 1237,
					type: "offset"
				},
				{
					name: "vstore",
					op: 24,
					type: "offset"
				}
			];
			var PRIVATE_DICT_META = [
				{
					name: "subrs",
					op: 19,
					type: "offset",
					value: 0
				},
				{
					name: "defaultWidthX",
					op: 20,
					type: "number",
					value: 0
				},
				{
					name: "nominalWidthX",
					op: 21,
					type: "number",
					value: 0
				}
			];
			var PRIVATE_DICT_META_CFF2 = [
				{
					name: "blueValues",
					op: 6,
					type: "delta"
				},
				{
					name: "otherBlues",
					op: 7,
					type: "delta"
				},
				{
					name: "familyBlues",
					op: 7,
					type: "delta"
				},
				{
					name: "familyBlues",
					op: 8,
					type: "delta"
				},
				{
					name: "familyOtherBlues",
					op: 9,
					type: "delta"
				},
				{
					name: "blueScale",
					op: 1209,
					type: "number",
					value: .039625
				},
				{
					name: "blueShift",
					op: 1210,
					type: "number",
					value: 7
				},
				{
					name: "blueFuzz",
					op: 1211,
					type: "number",
					value: 1
				},
				{
					name: "stdHW",
					op: 10,
					type: "number"
				},
				{
					name: "stdVW",
					op: 11,
					type: "number"
				},
				{
					name: "stemSnapH",
					op: 1212,
					type: "number"
				},
				{
					name: "stemSnapV",
					op: 1213,
					type: "number"
				},
				{
					name: "languageGroup",
					op: 1217,
					type: "number",
					value: 0
				},
				{
					name: "expansionFactor",
					op: 1218,
					type: "number",
					value: .06
				},
				{
					name: "vsindex",
					op: 22,
					type: "number",
					value: 0
				},
				{
					name: "subrs",
					op: 19,
					type: "offset"
				}
			];
			var FONT_DICT_META = [{
				name: "private",
				op: 18,
				type: ["number", "offset"],
				value: [0, 0]
			}];
			function parseCFFTopDict(data, start, strings, version) {
				return interpretDict(parseCFFDict(data, start, data.byteLength, version), version > 1 ? TOP_DICT_META_CFF2 : TOP_DICT_META, strings);
			}
			function parseCFFPrivateDict(data, start, size, strings, version) {
				return interpretDict(parseCFFDict(data, start, size, version), version > 1 ? PRIVATE_DICT_META_CFF2 : PRIVATE_DICT_META, strings);
			}
			function parseFontDict(data, start, version) {
				return interpretDict(parseCFFDict(data, start, void 0, version), FONT_DICT_META);
			}
			function gatherCFF2FontDicts(data, start, fdArray) {
				const fontDictArray = [];
				for (let i = 0; i < fdArray.length; i++) {
					const fontDict = parseFontDict(new DataView(new Uint8Array(fdArray[i]).buffer), 0, 2);
					const privateSize = fontDict.private[0];
					const privateOffset = fontDict.private[1];
					if (privateSize !== 0 && privateOffset !== 0) {
						const privateDict = parseCFFPrivateDict(data, privateOffset + start, privateSize, [], 2);
						if (privateDict.subrs) {
							fontDict._subrs = parseCFFIndex(data, privateOffset + privateDict.subrs + start, void 0, 2).objects;
							fontDict._subrsBias = calcCFFSubroutineBias(fontDict._subrs);
						}
						fontDict._privateDict = privateDict;
					}
					fontDictArray.push(fontDict);
				}
				return fontDictArray;
			}
			function gatherCFFTopDicts(data, start, cffIndex, strings, version) {
				const topDictArray = [];
				for (let iTopDict = 0; iTopDict < cffIndex.length; iTopDict += 1) {
					const topDict = parseCFFTopDict(new DataView(new Uint8Array(cffIndex[iTopDict]).buffer), 0, strings, version);
					topDict._subrs = [];
					topDict._subrsBias = 0;
					topDict._defaultWidthX = 0;
					topDict._nominalWidthX = 0;
					const privateSize = version < 2 ? topDict.private[0] : 0;
					const privateOffset = version < 2 ? topDict.private[1] : 0;
					if (privateSize !== 0 && privateOffset !== 0) {
						const privateDict = parseCFFPrivateDict(data, privateOffset + start, privateSize, strings, version);
						topDict._defaultWidthX = privateDict.defaultWidthX;
						topDict._nominalWidthX = privateDict.nominalWidthX;
						if (privateDict.subrs !== 0) {
							topDict._subrs = parseCFFIndex(data, privateOffset + privateDict.subrs + start, void 0, version).objects;
							topDict._subrsBias = calcCFFSubroutineBias(topDict._subrs);
						}
						topDict._privateDict = privateDict;
					}
					topDictArray.push(topDict);
				}
				return topDictArray;
			}
			function parseCFFCharset(data, start, nGlyphs, strings, isCIDFont) {
				let sid;
				let count;
				const parser = new parse_default.Parser(data, start);
				nGlyphs -= 1;
				const charset = [".notdef"];
				const format = parser.parseCard8();
				if (format === 0) for (let i = 0; i < nGlyphs; i += 1) {
					sid = parser.parseSID();
					if (isCIDFont) charset.push(sid);
					else charset.push(getCFFString(strings, sid) || sid);
				}
				else if (format === 1) while (charset.length <= nGlyphs) {
					sid = parser.parseSID();
					count = parser.parseCard8();
					for (let i = 0; i <= count; i += 1) {
						if (isCIDFont) charset.push("cid" + ("00000" + sid).slice(-5));
						else charset.push(getCFFString(strings, sid) || sid);
						sid += 1;
					}
				}
				else if (format === 2) while (charset.length <= nGlyphs) {
					sid = parser.parseSID();
					count = parser.parseCard16();
					for (let i = 0; i <= count; i += 1) {
						if (isCIDFont) charset.push("cid" + ("00000" + sid).slice(-5));
						else charset.push(getCFFString(strings, sid) || sid);
						sid += 1;
					}
				}
				else throw new Error("Unknown charset format " + format);
				return charset;
			}
			function parseCFFEncoding(data, start) {
				let code;
				const encoding = {};
				const parser = new parse_default.Parser(data, start);
				const format = parser.parseCard8();
				if (format === 0) {
					const nCodes = parser.parseCard8();
					for (let i = 0; i < nCodes; i += 1) {
						code = parser.parseCard8();
						encoding[code] = i;
					}
				} else if (format === 1) {
					const nRanges = parser.parseCard8();
					code = 1;
					for (let i = 0; i < nRanges; i += 1) {
						const first = parser.parseCard8();
						const nLeft = parser.parseCard8();
						for (let j = first; j <= first + nLeft; j += 1) {
							encoding[j] = code;
							code += 1;
						}
					}
				} else throw new Error("Unknown encoding format " + format);
				return encoding;
			}
			function parseBlend(operands) {
				let numberOfBlends = operands.pop();
				while (operands.length > numberOfBlends) operands.pop();
			}
			function applyPaintType(font, path) {
				const paintType = font.tables.cff && font.tables.cff.topDict && font.tables.cff.topDict.paintType || 0;
				if (paintType === 2) {
					path.fill = null;
					path.stroke = "black";
					path.strokeWidth = font.tables.cff.topDict.strokeWidth || 0;
				}
				return paintType;
			}
			function parseCFFCharstring(font, glyph, code, version, coords) {
				let c1x;
				let c1y;
				let c2x;
				let c2y;
				const p = new path_default();
				const stack = [];
				let nStems = 0;
				let haveWidth = false;
				let open = false;
				let x = 0;
				let y = 0;
				let subrs;
				let subrsBias;
				let defaultWidthX;
				let nominalWidthX;
				let vsindex = 0;
				let vstore = [];
				let blendVector;
				let callDepth = 0;
				const cffTable = font.tables.cff2 || font.tables.cff;
				defaultWidthX = cffTable.topDict._defaultWidthX;
				nominalWidthX = cffTable.topDict._nominalWidthX;
				coords = coords || font.variation && font.variation.get();
				if (!glyph.getBlendPath) glyph.getBlendPath = function(variationCoords) {
					return parseCFFCharstring(font, glyph, code, version, variationCoords);
				};
				if (font.isCIDFont || version > 1) {
					const fdIndex = cffTable.topDict._fdSelect ? cffTable.topDict._fdSelect[glyph.index] : 0;
					const fdDict = cffTable.topDict._fdArray[fdIndex];
					subrs = fdDict._subrs;
					subrsBias = fdDict._subrsBias;
					if (version > 1) {
						vstore = cffTable.topDict._vstore.itemVariationStore;
						vsindex = fdDict._privateDict.vsindex;
					} else {
						defaultWidthX = fdDict._defaultWidthX;
						nominalWidthX = fdDict._nominalWidthX;
					}
				} else {
					subrs = cffTable.topDict._subrs;
					subrsBias = cffTable.topDict._subrsBias;
				}
				const paintType = applyPaintType(font, p);
				let width = defaultWidthX;
				function newContour(x2, y2) {
					if (open && paintType !== 2) p.closePath();
					p.moveTo(x2, y2);
					open = true;
				}
				function parseStems() {
					let hasWidthArg;
					hasWidthArg = (stack.length & 1) !== 0;
					if (hasWidthArg && !haveWidth) width = stack.shift() + nominalWidthX;
					nStems += stack.length >> 1;
					stack.length = 0;
					haveWidth = true;
				}
				function parse(code2) {
					let b1;
					let b2;
					let b3;
					let b4;
					let codeIndex;
					let subrCode;
					let jpx;
					let jpy;
					let c3x;
					let c3y;
					let c4x;
					let c4y;
					let i = 0;
					while (i < code2.length) {
						let v = code2[i];
						i += 1;
						switch (v) {
							case 1:
								parseStems();
								break;
							case 3:
								parseStems();
								break;
							case 4:
								if (stack.length > 1 && !haveWidth) {
									width = stack.shift() + nominalWidthX;
									haveWidth = true;
								}
								y += stack.pop();
								newContour(x, y);
								break;
							case 5:
								while (stack.length > 0) {
									x += stack.shift();
									y += stack.shift();
									p.lineTo(x, y);
								}
								break;
							case 6:
								while (stack.length > 0) {
									x += stack.shift();
									p.lineTo(x, y);
									if (stack.length === 0) break;
									y += stack.shift();
									p.lineTo(x, y);
								}
								break;
							case 7:
								while (stack.length > 0) {
									y += stack.shift();
									p.lineTo(x, y);
									if (stack.length === 0) break;
									x += stack.shift();
									p.lineTo(x, y);
								}
								break;
							case 8:
								while (stack.length > 0) {
									c1x = x + stack.shift();
									c1y = y + stack.shift();
									c2x = c1x + stack.shift();
									c2y = c1y + stack.shift();
									x = c2x + stack.shift();
									y = c2y + stack.shift();
									p.curveTo(c1x, c1y, c2x, c2y, x, y);
								}
								break;
							case 10:
								codeIndex = stack.pop() + subrsBias;
								subrCode = subrs[codeIndex];
								if (subrCode) {
									if (callDepth >= MAX_CALL_DEPTH) {
										console.warn("CFF charstring subroutine call depth exceeded, skipping callsubr");
										break;
									}
									callDepth++;
									parse(subrCode);
									callDepth--;
								}
								break;
							case 11:
								if (version > 1) {
									console.error("CFF CharString operator return (11) is not supported in CFF2");
									break;
								}
								return;
							case 12:
								v = code2[i];
								i += 1;
								switch (v) {
									case 35:
										c1x = x + stack.shift();
										c1y = y + stack.shift();
										c2x = c1x + stack.shift();
										c2y = c1y + stack.shift();
										jpx = c2x + stack.shift();
										jpy = c2y + stack.shift();
										c3x = jpx + stack.shift();
										c3y = jpy + stack.shift();
										c4x = c3x + stack.shift();
										c4y = c3y + stack.shift();
										x = c4x + stack.shift();
										y = c4y + stack.shift();
										stack.shift();
										p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
										p.curveTo(c3x, c3y, c4x, c4y, x, y);
										break;
									case 34:
										c1x = x + stack.shift();
										c1y = y;
										c2x = c1x + stack.shift();
										c2y = c1y + stack.shift();
										jpx = c2x + stack.shift();
										jpy = c2y;
										c3x = jpx + stack.shift();
										c3y = c2y;
										c4x = c3x + stack.shift();
										c4y = y;
										x = c4x + stack.shift();
										p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
										p.curveTo(c3x, c3y, c4x, c4y, x, y);
										break;
									case 36:
										c1x = x + stack.shift();
										c1y = y + stack.shift();
										c2x = c1x + stack.shift();
										c2y = c1y + stack.shift();
										jpx = c2x + stack.shift();
										jpy = c2y;
										c3x = jpx + stack.shift();
										c3y = c2y;
										c4x = c3x + stack.shift();
										c4y = c3y + stack.shift();
										x = c4x + stack.shift();
										p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
										p.curveTo(c3x, c3y, c4x, c4y, x, y);
										break;
									case 37:
										c1x = x + stack.shift();
										c1y = y + stack.shift();
										c2x = c1x + stack.shift();
										c2y = c1y + stack.shift();
										jpx = c2x + stack.shift();
										jpy = c2y + stack.shift();
										c3x = jpx + stack.shift();
										c3y = jpy + stack.shift();
										c4x = c3x + stack.shift();
										c4y = c3y + stack.shift();
										if (Math.abs(c4x - x) > Math.abs(c4y - y)) x = c4x + stack.shift();
										else y = c4y + stack.shift();
										p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
										p.curveTo(c3x, c3y, c4x, c4y, x, y);
										break;
									default:
										console.log("Glyph " + glyph.index + ": unknown operator 1200" + v);
										stack.length = 0;
								}
								break;
							case 14:
								if (version > 1) {
									console.error("CFF CharString operator endchar (14) is not supported in CFF2");
									break;
								}
								if (stack.length >= 4) {
									const acharName = cffStandardEncoding[stack.pop()];
									const bcharName = cffStandardEncoding[stack.pop()];
									const ady = stack.pop();
									const adx = stack.pop();
									if (acharName && bcharName) {
										glyph.isComposite = true;
										glyph.components = [];
										const acharGlyphIndex = font.cffEncoding.charset.indexOf(acharName);
										const bcharGlyphIndex = font.cffEncoding.charset.indexOf(bcharName);
										glyph.components.push({
											glyphIndex: bcharGlyphIndex,
											dx: 0,
											dy: 0
										});
										glyph.components.push({
											glyphIndex: acharGlyphIndex,
											dx: adx,
											dy: ady
										});
										p.extend(font.glyphs.get(bcharGlyphIndex).path);
										const acharGlyph = font.glyphs.get(acharGlyphIndex);
										const shiftedCommands = JSON.parse(JSON.stringify(acharGlyph.path.commands));
										for (let i2 = 0; i2 < shiftedCommands.length; i2 += 1) {
											const cmd = shiftedCommands[i2];
											if (cmd.type !== "Z") {
												cmd.x += adx;
												cmd.y += ady;
											}
											if (cmd.type === "Q" || cmd.type === "C") {
												cmd.x1 += adx;
												cmd.y1 += ady;
											}
											if (cmd.type === "C") {
												cmd.x2 += adx;
												cmd.y2 += ady;
											}
										}
										p.extend(shiftedCommands);
									}
								} else if (stack.length > 0 && !haveWidth) {
									width = stack.shift() + nominalWidthX;
									haveWidth = true;
								}
								if (open && paintType !== 2) {
									p.closePath();
									open = false;
								}
								break;
							case 15:
								if (version < 2) {
									console.error("CFF2 CharString operator vsindex (15) is not supported in CFF");
									break;
								}
								vsindex = stack.pop();
								break;
							case 16:
								if (version < 2) {
									console.error("CFF2 CharString operator blend (16) is not supported in CFF");
									break;
								}
								if (!blendVector) blendVector = font.variation && coords && font.variation.process.getBlendVector(vstore, vsindex, coords);
								var n = stack.pop();
								var axisCount = blendVector ? blendVector.length : vstore.itemVariationSubtables[vsindex].regionIndexes.length;
								var deltaSetCount = n * axisCount;
								var delta = stack.length - deltaSetCount;
								var deltaSetIndex = delta - n;
								if (blendVector) for (let i2 = 0; i2 < n; i2++) {
									var sum = stack[deltaSetIndex + i2];
									for (let j = 0; j < axisCount; j++) sum += blendVector[j] * stack[delta++];
									stack[deltaSetIndex + i2] = sum;
								}
								while (deltaSetCount--) stack.pop();
								break;
							case 18:
								parseStems();
								break;
							case 19:
							case 20:
								parseStems();
								i += nStems + 7 >> 3;
								break;
							case 21:
								if (stack.length > 2 && !haveWidth) {
									width = stack.shift() + nominalWidthX;
									haveWidth = true;
								}
								y += stack.pop();
								x += stack.pop();
								newContour(x, y);
								break;
							case 22:
								if (stack.length > 1 && !haveWidth) {
									width = stack.shift() + nominalWidthX;
									haveWidth = true;
								}
								x += stack.pop();
								newContour(x, y);
								break;
							case 23:
								parseStems();
								break;
							case 24:
								while (stack.length > 2) {
									c1x = x + stack.shift();
									c1y = y + stack.shift();
									c2x = c1x + stack.shift();
									c2y = c1y + stack.shift();
									x = c2x + stack.shift();
									y = c2y + stack.shift();
									p.curveTo(c1x, c1y, c2x, c2y, x, y);
								}
								x += stack.shift();
								y += stack.shift();
								p.lineTo(x, y);
								break;
							case 25:
								while (stack.length > 6) {
									x += stack.shift();
									y += stack.shift();
									p.lineTo(x, y);
								}
								c1x = x + stack.shift();
								c1y = y + stack.shift();
								c2x = c1x + stack.shift();
								c2y = c1y + stack.shift();
								x = c2x + stack.shift();
								y = c2y + stack.shift();
								p.curveTo(c1x, c1y, c2x, c2y, x, y);
								break;
							case 26:
								if (stack.length & 1) x += stack.shift();
								while (stack.length > 0) {
									c1x = x;
									c1y = y + stack.shift();
									c2x = c1x + stack.shift();
									c2y = c1y + stack.shift();
									x = c2x;
									y = c2y + stack.shift();
									p.curveTo(c1x, c1y, c2x, c2y, x, y);
								}
								break;
							case 27:
								if (stack.length & 1) y += stack.shift();
								while (stack.length > 0) {
									c1x = x + stack.shift();
									c1y = y;
									c2x = c1x + stack.shift();
									c2y = c1y + stack.shift();
									x = c2x + stack.shift();
									y = c2y;
									p.curveTo(c1x, c1y, c2x, c2y, x, y);
								}
								break;
							case 28:
								b1 = code2[i];
								b2 = code2[i + 1];
								stack.push((b1 << 24 | b2 << 16) >> 16);
								i += 2;
								break;
							case 29:
								codeIndex = stack.pop() + font.gsubrsBias;
								subrCode = font.gsubrs[codeIndex];
								if (subrCode) {
									if (callDepth >= MAX_CALL_DEPTH) {
										console.warn("CFF charstring subroutine call depth exceeded, skipping callgsubr");
										break;
									}
									callDepth++;
									parse(subrCode);
									callDepth--;
								}
								break;
							case 30:
								while (stack.length > 0) {
									c1x = x;
									c1y = y + stack.shift();
									c2x = c1x + stack.shift();
									c2y = c1y + stack.shift();
									x = c2x + stack.shift();
									y = c2y + (stack.length === 1 ? stack.shift() : 0);
									p.curveTo(c1x, c1y, c2x, c2y, x, y);
									if (stack.length === 0) break;
									c1x = x + stack.shift();
									c1y = y;
									c2x = c1x + stack.shift();
									c2y = c1y + stack.shift();
									y = c2y + stack.shift();
									x = c2x + (stack.length === 1 ? stack.shift() : 0);
									p.curveTo(c1x, c1y, c2x, c2y, x, y);
								}
								break;
							case 31:
								while (stack.length > 0) {
									c1x = x + stack.shift();
									c1y = y;
									c2x = c1x + stack.shift();
									c2y = c1y + stack.shift();
									y = c2y + stack.shift();
									x = c2x + (stack.length === 1 ? stack.shift() : 0);
									p.curveTo(c1x, c1y, c2x, c2y, x, y);
									if (stack.length === 0) break;
									c1x = x;
									c1y = y + stack.shift();
									c2x = c1x + stack.shift();
									c2y = c1y + stack.shift();
									x = c2x + stack.shift();
									y = c2y + (stack.length === 1 ? stack.shift() : 0);
									p.curveTo(c1x, c1y, c2x, c2y, x, y);
								}
								break;
							default: if (v < 32) console.log("Glyph " + glyph.index + ": unknown operator " + v);
							else if (v < 247) stack.push(v - 139);
							else if (v < 251) {
								b1 = code2[i];
								i += 1;
								stack.push((v - 247) * 256 + b1 + 108);
							} else if (v < 255) {
								b1 = code2[i];
								i += 1;
								stack.push(-(v - 251) * 256 - b1 - 108);
							} else {
								b1 = code2[i];
								b2 = code2[i + 1];
								b3 = code2[i + 2];
								b4 = code2[i + 3];
								i += 4;
								stack.push((b1 << 24 | b2 << 16 | b3 << 8 | b4) / 65536);
							}
						}
					}
				}
				parse(code);
				if (font.variation && coords) p.commands = p.commands.map((c) => {
					const keys = Object.keys(c);
					for (let i = 0; i < keys.length; i++) {
						const key = keys[i];
						if (key === "type") continue;
						c[key] = Math.round(c[key]);
					}
					return c;
				});
				if (haveWidth) glyph.advanceWidth = width;
				return p;
			}
			function parseCFFFDSelect(data, start, nGlyphs, fdArrayCount, version) {
				const fdSelect = [];
				let fdIndex;
				const parser = new parse_default.Parser(data, start);
				const format = parser.parseCard8();
				if (format === 0) for (let iGid = 0; iGid < nGlyphs; iGid++) {
					fdIndex = parser.parseCard8();
					if (fdIndex >= fdArrayCount) throw new Error("CFF table CID Font FDSelect has bad FD index value " + fdIndex + " (FD count " + fdArrayCount + ")");
					fdSelect.push(fdIndex);
				}
				else if (format === 3 || version > 1 && format === 4) {
					const nRanges = format === 4 ? parser.parseULong() : parser.parseCard16();
					let first = format === 4 ? parser.parseULong() : parser.parseCard16();
					if (first !== 0) throw new Error(`CFF Table CID Font FDSelect format ${format} range has bad initial GID ${first}`);
					let next;
					for (let iRange = 0; iRange < nRanges; iRange++) {
						fdIndex = format === 4 ? parser.parseUShort() : parser.parseCard8();
						next = format === 4 ? parser.parseULong() : parser.parseCard16();
						if (fdIndex >= fdArrayCount) throw new Error("CFF table CID Font FDSelect has bad FD index value " + fdIndex + " (FD count " + fdArrayCount + ")");
						if (next > nGlyphs) throw new Error(`CFF Table CID Font FDSelect format ${version} range has bad GID ${next}`);
						for (; first < next; first++) fdSelect.push(fdIndex);
						first = next;
					}
					if (next !== nGlyphs) throw new Error("CFF Table CID Font FDSelect format 3 range has bad final (Sentinal) GID " + next);
				} else throw new Error("CFF Table CID Font FDSelect table has unsupported format " + format);
				return fdSelect;
			}
			function parseCFFTable(data, start, font, opt) {
				let resultTable;
				const header = parseCFFHeader(data, start);
				if (header.formatMajor === 2) resultTable = font.tables.cff2 = {};
				else resultTable = font.tables.cff = {};
				const nameIndex = header.formatMajor > 1 ? null : parseCFFIndex(data, header.endOffset, parse_default.bytesToString);
				const topDictIndex = header.formatMajor > 1 ? null : parseCFFIndex(data, nameIndex.endOffset);
				const stringIndex = header.formatMajor > 1 ? null : parseCFFIndex(data, topDictIndex.endOffset, parse_default.bytesToString);
				font.gsubrs = parseCFFIndex(data, header.formatMajor > 1 ? start + header.size + header.topDictLength : stringIndex.endOffset, void 0, header.formatMajor).objects;
				font.gsubrsBias = calcCFFSubroutineBias(font.gsubrs);
				let topDict;
				if (header.formatMajor > 1) {
					const topDictOffset = start + header.size;
					topDict = gatherCFFTopDicts(data, 0, [parse_default.getBytes(data, topDictOffset, topDictOffset + header.topDictLength)], void 0, header.formatMajor)[0];
				} else {
					const topDictArray = gatherCFFTopDicts(data, start, topDictIndex.objects, stringIndex.objects, header.formatMajor);
					if (topDictArray.length !== 1) throw new Error("CFF table has too many fonts in 'FontSet' - count of fonts NameIndex.length = " + topDictArray.length);
					topDict = topDictArray[0];
				}
				resultTable.topDict = topDict;
				if (topDict._privateDict) {
					font.defaultWidthX = topDict._privateDict.defaultWidthX;
					font.nominalWidthX = topDict._privateDict.nominalWidthX;
				}
				if (header.formatMajor < 2 && topDict.ros[0] !== void 0 && topDict.ros[1] !== void 0) font.isCIDFont = true;
				if (header.formatMajor > 1) {
					let fdArrayIndexOffset = topDict.fdArray;
					let fdSelectOffset = topDict.fdSelect;
					if (!fdArrayIndexOffset) throw new Error("This is a CFF2 font, but FDArray information is missing");
					const fdArray = gatherCFF2FontDicts(data, start, parseCFFIndex(data, start + fdArrayIndexOffset, null, header.formatMajor).objects);
					topDict._fdArray = fdArray;
					if (fdSelectOffset) topDict._fdSelect = parseCFFFDSelect(data, start + fdSelectOffset, font.numGlyphs, fdArray.length, header.formatMajor);
				} else if (font.isCIDFont) {
					let fdArrayOffset = topDict.fdArray;
					let fdSelectOffset = topDict.fdSelect;
					if (fdArrayOffset === 0 || fdSelectOffset === 0) throw new Error("Font is marked as a CID font, but FDArray and/or FDSelect information is missing");
					fdArrayOffset += start;
					const fdArray = gatherCFFTopDicts(data, start, parseCFFIndex(data, fdArrayOffset).objects, stringIndex.objects, header.formatMajor);
					topDict._fdArray = fdArray;
					fdSelectOffset += start;
					topDict._fdSelect = parseCFFFDSelect(data, fdSelectOffset, font.numGlyphs, fdArray.length, header.formatMajor);
				}
				if (header.formatMajor < 2) {
					const privateDictOffset = start + topDict.private[1];
					const privateDict = parseCFFPrivateDict(data, privateDictOffset, topDict.private[0], stringIndex.objects, header.formatMajor);
					font.defaultWidthX = privateDict.defaultWidthX;
					font.nominalWidthX = privateDict.nominalWidthX;
					if (privateDict.subrs !== 0) {
						font.subrs = parseCFFIndex(data, privateDictOffset + privateDict.subrs).objects;
						font.subrsBias = calcCFFSubroutineBias(font.subrs);
					} else {
						font.subrs = [];
						font.subrsBias = 0;
					}
				}
				let charStringsIndex;
				if (opt.lowMemory) {
					charStringsIndex = parseCFFIndexLowMemory(data, start + topDict.charStrings, header.formatMajor);
					font.nGlyphs = charStringsIndex.offsets.length - (header.formatMajor > 1 ? 1 : 0);
				} else {
					charStringsIndex = parseCFFIndex(data, start + topDict.charStrings, null, header.formatMajor);
					font.nGlyphs = charStringsIndex.objects.length;
				}
				if (header.formatMajor > 1 && font.tables.maxp && font.nGlyphs !== font.tables.maxp.numGlyphs) console.error(`Glyph count in the CFF2 table (${font.nGlyphs}) must correspond to the glyph count in the maxp table (${font.tables.maxp.numGlyphs})`);
				if (header.formatMajor < 2) {
					let charset = [];
					let encoding = [];
					if (topDict.charset === 0) charset = cffISOAdobeStrings;
					else if (topDict.charset === 1) charset = cffIExpertStrings;
					else if (topDict.charset === 2) charset = cffExpertSubsetStrings;
					else charset = parseCFFCharset(data, start + topDict.charset, font.nGlyphs, stringIndex.objects, font.isCIDFont);
					if (topDict.encoding === 0) encoding = cffStandardEncoding;
					else if (topDict.encoding === 1) encoding = cffExpertEncoding;
					else encoding = parseCFFEncoding(data, start + topDict.encoding);
					font.cffEncoding = new CffEncoding(encoding, charset);
					font.encoding = font.encoding || font.cffEncoding;
				}
				font.glyphs = new glyphset_default.GlyphSet(font);
				if (opt.lowMemory) font._push = function(i) {
					const charString = getCffIndexObject(i, charStringsIndex.offsets, data, start + topDict.charStrings, void 0, header.formatMajor);
					font.glyphs.push(i, glyphset_default.cffGlyphLoader(font, i, parseCFFCharstring, charString, header.formatMajor));
				};
				else for (let i = 0; i < font.nGlyphs; i += 1) {
					const charString = charStringsIndex.objects[i];
					font.glyphs.push(i, glyphset_default.cffGlyphLoader(font, i, parseCFFCharstring, charString, header.formatMajor));
				}
				if (topDict.vstore) {
					const p = new parse_default.Parser(data, start + topDict.vstore);
					topDict._vstore = p.parseVariationStore();
				}
			}
			function encodeString(s, strings) {
				let sid;
				let i = cffStandardStrings.indexOf(s);
				if (i >= 0) sid = i;
				i = strings.indexOf(s);
				if (i >= 0) sid = i + cffStandardStrings.length;
				else {
					sid = cffStandardStrings.length + strings.length;
					strings.push(s);
				}
				return sid;
			}
			function makeHeader() {
				return new table_default.Record("Header", [
					{
						name: "major",
						type: "Card8",
						value: 1
					},
					{
						name: "minor",
						type: "Card8",
						value: 0
					},
					{
						name: "hdrSize",
						type: "Card8",
						value: 4
					},
					{
						name: "major",
						type: "Card8",
						value: 1
					}
				]);
			}
			function makeNameIndex(fontNames) {
				const t = new table_default.Record("Name INDEX", [{
					name: "names",
					type: "INDEX",
					value: []
				}]);
				t.names = [];
				for (let i = 0; i < fontNames.length; i += 1) t.names.push({
					name: "name_" + i,
					type: "NAME",
					value: fontNames[i]
				});
				return t;
			}
			function makeDict(meta, attrs, strings) {
				const m = {};
				for (let i = 0; i < meta.length; i += 1) {
					const entry = meta[i];
					let value = attrs[entry.name];
					if (value !== void 0 && !equals(value, entry.value)) {
						if (entry.type === "SID") value = encodeString(value, strings);
						m[entry.op] = {
							name: entry.name,
							type: entry.type,
							value
						};
					}
				}
				return m;
			}
			function makeTopDict(attrs, strings, version) {
				const t = new table_default.Record("Top DICT", [{
					name: "dict",
					type: "DICT",
					value: {}
				}]);
				t.dict = makeDict(version > 1 ? TOP_DICT_META_CFF2 : TOP_DICT_META, attrs, strings);
				return t;
			}
			function makeTopDictIndex(topDict) {
				const t = new table_default.Record("Top DICT INDEX", [{
					name: "topDicts",
					type: "INDEX",
					value: []
				}]);
				t.topDicts = [{
					name: "topDict_0",
					type: "TABLE",
					value: topDict
				}];
				return t;
			}
			function makeStringIndex(strings) {
				const t = new table_default.Record("String INDEX", [{
					name: "strings",
					type: "INDEX",
					value: []
				}]);
				t.strings = [];
				for (let i = 0; i < strings.length; i += 1) t.strings.push({
					name: "string_" + i,
					type: "STRING",
					value: strings[i]
				});
				return t;
			}
			function makeGlobalSubrIndex() {
				return new table_default.Record("Global Subr INDEX", [{
					name: "subrs",
					type: "INDEX",
					value: []
				}]);
			}
			function makeCharsets(glyphNames, strings) {
				const t = new table_default.Record("Charsets", [{
					name: "format",
					type: "Card8",
					value: 0
				}]);
				for (let i = 0; i < glyphNames.length; i += 1) {
					const glyphName = glyphNames[i];
					const glyphSID = encodeString(glyphName, strings);
					t.fields.push({
						name: "glyph_" + i,
						type: "SID",
						value: glyphSID
					});
				}
				return t;
			}
			function glyphToOps(glyph, version) {
				const ops = [];
				const path = glyph.path;
				if (version < 2) ops.push({
					name: "width",
					type: "NUMBER",
					value: glyph.advanceWidth
				});
				let x = 0;
				let y = 0;
				for (let i = 0; i < path.commands.length; i += 1) {
					let dx;
					let dy;
					let cmd = path.commands[i];
					if (cmd.type === "Q") {
						const _13 = 1 / 3;
						const _23 = 2 / 3;
						cmd = {
							type: "C",
							x: cmd.x,
							y: cmd.y,
							x1: Math.round(_13 * x + _23 * cmd.x1),
							y1: Math.round(_13 * y + _23 * cmd.y1),
							x2: Math.round(_13 * cmd.x + _23 * cmd.x1),
							y2: Math.round(_13 * cmd.y + _23 * cmd.y1)
						};
					}
					if (cmd.type === "M") {
						dx = Math.round(cmd.x - x);
						dy = Math.round(cmd.y - y);
						ops.push({
							name: "dx",
							type: "NUMBER",
							value: dx
						});
						ops.push({
							name: "dy",
							type: "NUMBER",
							value: dy
						});
						ops.push({
							name: "rmoveto",
							type: "OP",
							value: 21
						});
						x = Math.round(cmd.x);
						y = Math.round(cmd.y);
					} else if (cmd.type === "L") {
						dx = Math.round(cmd.x - x);
						dy = Math.round(cmd.y - y);
						ops.push({
							name: "dx",
							type: "NUMBER",
							value: dx
						});
						ops.push({
							name: "dy",
							type: "NUMBER",
							value: dy
						});
						ops.push({
							name: "rlineto",
							type: "OP",
							value: 5
						});
						x = Math.round(cmd.x);
						y = Math.round(cmd.y);
					} else if (cmd.type === "C") {
						const dx1 = Math.round(cmd.x1 - x);
						const dy1 = Math.round(cmd.y1 - y);
						const dx2 = Math.round(cmd.x2 - cmd.x1);
						const dy2 = Math.round(cmd.y2 - cmd.y1);
						dx = Math.round(cmd.x - cmd.x2);
						dy = Math.round(cmd.y - cmd.y2);
						ops.push({
							name: "dx1",
							type: "NUMBER",
							value: dx1
						});
						ops.push({
							name: "dy1",
							type: "NUMBER",
							value: dy1
						});
						ops.push({
							name: "dx2",
							type: "NUMBER",
							value: dx2
						});
						ops.push({
							name: "dy2",
							type: "NUMBER",
							value: dy2
						});
						ops.push({
							name: "dx",
							type: "NUMBER",
							value: dx
						});
						ops.push({
							name: "dy",
							type: "NUMBER",
							value: dy
						});
						ops.push({
							name: "rrcurveto",
							type: "OP",
							value: 8
						});
						x = Math.round(cmd.x);
						y = Math.round(cmd.y);
					}
				}
				if (version < 2) ops.push({
					name: "endchar",
					type: "OP",
					value: 14
				});
				return ops;
			}
			function makeCharStringsIndex(glyphs, version) {
				const t = new table_default.Record("CharStrings INDEX", [{
					name: "charStrings",
					type: "INDEX",
					value: []
				}]);
				for (let i = 0; i < glyphs.length; i += 1) {
					const glyph = glyphs.get(i);
					const ops = glyphToOps(glyph, version);
					t.charStrings.push({
						name: glyph.name,
						type: "CHARSTRING",
						value: ops
					});
				}
				return t;
			}
			function makePrivateDict(attrs, strings, version) {
				const t = new table_default.Record("Private DICT", [{
					name: "dict",
					type: "DICT",
					value: {}
				}]);
				t.dict = makeDict(version > 1 ? PRIVATE_DICT_META_CFF2 : PRIVATE_DICT_META, attrs, strings);
				return t;
			}
			function makeCFFTable(glyphs, options) {
				const cffVersion = 1;
				const t = new table_default.Table("CFF ", [
					{
						name: "header",
						type: "RECORD"
					},
					{
						name: "nameIndex",
						type: "RECORD"
					},
					{
						name: "topDictIndex",
						type: "RECORD"
					},
					{
						name: "stringIndex",
						type: "RECORD"
					},
					{
						name: "globalSubrIndex",
						type: "RECORD"
					},
					{
						name: "charsets",
						type: "RECORD"
					},
					{
						name: "charStringsIndex",
						type: "RECORD"
					},
					{
						name: "privateDict",
						type: "RECORD"
					}
				]);
				const fontScale = 1 / options.unitsPerEm;
				const attrs = {
					version: options.version,
					fullName: options.fullName,
					familyName: options.familyName,
					weight: options.weightName,
					fontBBox: options.fontBBox || [
						0,
						0,
						0,
						0
					],
					fontMatrix: [
						fontScale,
						0,
						0,
						fontScale,
						0,
						0
					],
					charset: 999,
					encoding: 0,
					charStrings: 999,
					private: [0, 999]
				};
				const topDictOptions = options && options.topDict || {};
				if (topDictOptions.paintType) {
					attrs.paintType = topDictOptions.paintType;
					attrs.strokeWidth = topDictOptions.strokeWidth || 0;
				}
				const privateAttrs = {};
				const glyphNames = [];
				let glyph;
				for (let i = 1; i < glyphs.length; i += 1) {
					glyph = glyphs.get(i);
					glyphNames.push(glyph.name);
				}
				const strings = [];
				t.header = makeHeader();
				t.nameIndex = makeNameIndex([options.postScriptName]);
				let topDict = makeTopDict(attrs, strings);
				t.topDictIndex = makeTopDictIndex(topDict);
				t.globalSubrIndex = makeGlobalSubrIndex();
				t.charsets = makeCharsets(glyphNames, strings);
				t.charStringsIndex = makeCharStringsIndex(glyphs, cffVersion);
				t.privateDict = makePrivateDict(privateAttrs, strings);
				t.stringIndex = makeStringIndex(strings);
				attrs.charset = t.header.sizeOf() + t.nameIndex.sizeOf() + t.topDictIndex.sizeOf() + t.stringIndex.sizeOf() + t.globalSubrIndex.sizeOf();
				attrs.encoding = 0;
				attrs.charStrings = attrs.charset + t.charsets.sizeOf();
				attrs.private[1] = attrs.charStrings + t.charStringsIndex.sizeOf();
				topDict = makeTopDict(attrs, strings);
				t.topDictIndex = makeTopDictIndex(topDict);
				return t;
			}
			var cff_default = {
				parse: parseCFFTable,
				make: makeCFFTable
			};
			function parseHeadTable(data, start) {
				const head = {};
				const p = new parse_default.Parser(data, start);
				head.version = p.parseVersion();
				head.fontRevision = Math.round(p.parseFixed() * 1e3) / 1e3;
				head.checkSumAdjustment = p.parseULong();
				head.magicNumber = p.parseULong();
				check_default.argument(head.magicNumber === 1594834165, "Font header has wrong magic number.");
				head.flags = p.parseUShort();
				head.unitsPerEm = p.parseUShort();
				head.created = p.parseLongDateTime();
				head.modified = p.parseLongDateTime();
				head.xMin = p.parseShort();
				head.yMin = p.parseShort();
				head.xMax = p.parseShort();
				head.yMax = p.parseShort();
				head.macStyle = p.parseUShort();
				head.lowestRecPPEM = p.parseUShort();
				head.fontDirectionHint = p.parseShort();
				head.indexToLocFormat = p.parseShort();
				head.glyphDataFormat = p.parseShort();
				return head;
			}
			function makeHeadTable(options) {
				const timestamp = Math.round((/* @__PURE__ */ new Date()).getTime() / 1e3) + 2082844800;
				let createdTimestamp = timestamp;
				let macStyle = options.macStyle || 0;
				if (options.createdTimestamp) createdTimestamp = options.createdTimestamp + 2082844800;
				return new table_default.Table("head", [
					{
						name: "version",
						type: "FIXED",
						value: 65536
					},
					{
						name: "fontRevision",
						type: "FIXED",
						value: 65536
					},
					{
						name: "checkSumAdjustment",
						type: "ULONG",
						value: 0
					},
					{
						name: "magicNumber",
						type: "ULONG",
						value: 1594834165
					},
					{
						name: "flags",
						type: "USHORT",
						value: 0
					},
					{
						name: "unitsPerEm",
						type: "USHORT",
						value: 1e3
					},
					{
						name: "created",
						type: "LONGDATETIME",
						value: createdTimestamp
					},
					{
						name: "modified",
						type: "LONGDATETIME",
						value: timestamp
					},
					{
						name: "xMin",
						type: "SHORT",
						value: 0
					},
					{
						name: "yMin",
						type: "SHORT",
						value: 0
					},
					{
						name: "xMax",
						type: "SHORT",
						value: 0
					},
					{
						name: "yMax",
						type: "SHORT",
						value: 0
					},
					{
						name: "macStyle",
						type: "USHORT",
						value: macStyle
					},
					{
						name: "lowestRecPPEM",
						type: "USHORT",
						value: 0
					},
					{
						name: "fontDirectionHint",
						type: "SHORT",
						value: 2
					},
					{
						name: "indexToLocFormat",
						type: "SHORT",
						value: 0
					},
					{
						name: "glyphDataFormat",
						type: "SHORT",
						value: 0
					}
				], options);
			}
			var head_default = {
				parse: parseHeadTable,
				make: makeHeadTable
			};
			function parseHheaTable(data, start) {
				const hhea = {};
				const p = new parse_default.Parser(data, start);
				hhea.version = p.parseVersion();
				hhea.ascender = p.parseShort();
				hhea.descender = p.parseShort();
				hhea.lineGap = p.parseShort();
				hhea.advanceWidthMax = p.parseUShort();
				hhea.minLeftSideBearing = p.parseShort();
				hhea.minRightSideBearing = p.parseShort();
				hhea.xMaxExtent = p.parseShort();
				hhea.caretSlopeRise = p.parseShort();
				hhea.caretSlopeRun = p.parseShort();
				hhea.caretOffset = p.parseShort();
				p.relativeOffset += 8;
				hhea.metricDataFormat = p.parseShort();
				hhea.numberOfHMetrics = p.parseUShort();
				return hhea;
			}
			function makeHheaTable(options) {
				return new table_default.Table("hhea", [
					{
						name: "version",
						type: "FIXED",
						value: 65536
					},
					{
						name: "ascender",
						type: "FWORD",
						value: 0
					},
					{
						name: "descender",
						type: "FWORD",
						value: 0
					},
					{
						name: "lineGap",
						type: "FWORD",
						value: 0
					},
					{
						name: "advanceWidthMax",
						type: "UFWORD",
						value: 0
					},
					{
						name: "minLeftSideBearing",
						type: "FWORD",
						value: 0
					},
					{
						name: "minRightSideBearing",
						type: "FWORD",
						value: 0
					},
					{
						name: "xMaxExtent",
						type: "FWORD",
						value: 0
					},
					{
						name: "caretSlopeRise",
						type: "SHORT",
						value: 1
					},
					{
						name: "caretSlopeRun",
						type: "SHORT",
						value: 0
					},
					{
						name: "caretOffset",
						type: "SHORT",
						value: 0
					},
					{
						name: "reserved1",
						type: "SHORT",
						value: 0
					},
					{
						name: "reserved2",
						type: "SHORT",
						value: 0
					},
					{
						name: "reserved3",
						type: "SHORT",
						value: 0
					},
					{
						name: "reserved4",
						type: "SHORT",
						value: 0
					},
					{
						name: "metricDataFormat",
						type: "SHORT",
						value: 0
					},
					{
						name: "numberOfHMetrics",
						type: "USHORT",
						value: 0
					}
				], options);
			}
			var hhea_default = {
				parse: parseHheaTable,
				make: makeHheaTable
			};
			function parseHmtxTableAll(data, start, numMetrics, numGlyphs, glyphs) {
				let advanceWidth;
				let leftSideBearing;
				const p = new parse_default.Parser(data, start);
				for (let i = 0; i < numGlyphs; i += 1) {
					if (i < numMetrics) {
						advanceWidth = p.parseUShort();
						leftSideBearing = p.parseShort();
					}
					const glyph = glyphs.get(i);
					glyph.advanceWidth = advanceWidth;
					glyph.leftSideBearing = leftSideBearing;
				}
			}
			function parseHmtxTableOnLowMemory(font, data, start, numMetrics, numGlyphs) {
				font._hmtxTableData = {};
				let advanceWidth;
				let leftSideBearing;
				const p = new parse_default.Parser(data, start);
				for (let i = 0; i < numGlyphs; i += 1) {
					if (i < numMetrics) {
						advanceWidth = p.parseUShort();
						leftSideBearing = p.parseShort();
					}
					font._hmtxTableData[i] = {
						advanceWidth,
						leftSideBearing
					};
				}
			}
			function parseHmtxTable(font, data, start, numMetrics, numGlyphs, glyphs, opt) {
				if (opt.lowMemory) parseHmtxTableOnLowMemory(font, data, start, numMetrics, numGlyphs);
				else parseHmtxTableAll(data, start, numMetrics, numGlyphs, glyphs);
			}
			function makeHmtxTable(glyphs) {
				const t = new table_default.Table("hmtx", []);
				for (let i = 0; i < glyphs.length; i += 1) {
					const glyph = glyphs.get(i);
					const advanceWidth = glyph.advanceWidth || 0;
					const leftSideBearing = glyph.leftSideBearing || 0;
					t.fields.push({
						name: "advanceWidth_" + i,
						type: "USHORT",
						value: advanceWidth
					});
					t.fields.push({
						name: "leftSideBearing_" + i,
						type: "SHORT",
						value: leftSideBearing
					});
				}
				return t;
			}
			var hmtx_default = {
				parse: parseHmtxTable,
				make: makeHmtxTable
			};
			function makeLtagTable(tags) {
				const result = new table_default.Table("ltag", [
					{
						name: "version",
						type: "ULONG",
						value: 1
					},
					{
						name: "flags",
						type: "ULONG",
						value: 0
					},
					{
						name: "numTags",
						type: "ULONG",
						value: tags.length
					}
				]);
				let stringPool = "";
				const stringPoolOffset = 12 + tags.length * 4;
				for (let i = 0; i < tags.length; ++i) {
					let pos = stringPool.indexOf(tags[i]);
					if (pos < 0) {
						pos = stringPool.length;
						stringPool += tags[i];
					}
					result.fields.push({
						name: "offset " + i,
						type: "USHORT",
						value: stringPoolOffset + pos
					});
					result.fields.push({
						name: "length " + i,
						type: "USHORT",
						value: tags[i].length
					});
				}
				result.fields.push({
					name: "stringPool",
					type: "CHARARRAY",
					value: stringPool
				});
				return result;
			}
			function parseLtagTable(data, start) {
				const p = new parse_default.Parser(data, start);
				const tableVersion = p.parseULong();
				check_default.argument(tableVersion === 1, "Unsupported ltag table version.");
				p.skip("uLong", 1);
				const numTags = p.parseULong();
				const tags = [];
				for (let i = 0; i < numTags; i++) {
					let tag = "";
					const offset = start + p.parseUShort();
					const length = p.parseUShort();
					for (let j = offset; j < offset + length; ++j) tag += String.fromCharCode(data.getInt8(j));
					tags.push(tag);
				}
				return tags;
			}
			var ltag_default = {
				make: makeLtagTable,
				parse: parseLtagTable
			};
			function parseMaxpTable(data, start) {
				const maxp = {};
				const p = new parse_default.Parser(data, start);
				maxp.version = p.parseVersion();
				maxp.numGlyphs = p.parseUShort();
				if (maxp.version === 1) {
					maxp.maxPoints = p.parseUShort();
					maxp.maxContours = p.parseUShort();
					maxp.maxCompositePoints = p.parseUShort();
					maxp.maxCompositeContours = p.parseUShort();
					maxp.maxZones = p.parseUShort();
					maxp.maxTwilightPoints = p.parseUShort();
					maxp.maxStorage = p.parseUShort();
					maxp.maxFunctionDefs = p.parseUShort();
					maxp.maxInstructionDefs = p.parseUShort();
					maxp.maxStackElements = p.parseUShort();
					maxp.maxSizeOfInstructions = p.parseUShort();
					maxp.maxComponentElements = p.parseUShort();
					maxp.maxComponentDepth = p.parseUShort();
				}
				return maxp;
			}
			function makeMaxpTable(numGlyphs) {
				return new table_default.Table("maxp", [{
					name: "version",
					type: "FIXED",
					value: 20480
				}, {
					name: "numGlyphs",
					type: "USHORT",
					value: numGlyphs
				}]);
			}
			var maxp_default = {
				parse: parseMaxpTable,
				make: makeMaxpTable
			};
			var unicodeRanges = [
				{
					begin: 0,
					end: 127
				},
				{
					begin: 128,
					end: 255
				},
				{
					begin: 256,
					end: 383
				},
				{
					begin: 384,
					end: 591
				},
				{
					begin: 592,
					end: 687
				},
				{
					begin: 688,
					end: 767
				},
				{
					begin: 768,
					end: 879
				},
				{
					begin: 880,
					end: 1023
				},
				{
					begin: 11392,
					end: 11519
				},
				{
					begin: 1024,
					end: 1279
				},
				{
					begin: 1328,
					end: 1423
				},
				{
					begin: 1424,
					end: 1535
				},
				{
					begin: 42240,
					end: 42559
				},
				{
					begin: 1536,
					end: 1791
				},
				{
					begin: 1984,
					end: 2047
				},
				{
					begin: 2304,
					end: 2431
				},
				{
					begin: 2432,
					end: 2559
				},
				{
					begin: 2560,
					end: 2687
				},
				{
					begin: 2688,
					end: 2815
				},
				{
					begin: 2816,
					end: 2943
				},
				{
					begin: 2944,
					end: 3071
				},
				{
					begin: 3072,
					end: 3199
				},
				{
					begin: 3200,
					end: 3327
				},
				{
					begin: 3328,
					end: 3455
				},
				{
					begin: 3584,
					end: 3711
				},
				{
					begin: 3712,
					end: 3839
				},
				{
					begin: 4256,
					end: 4351
				},
				{
					begin: 6912,
					end: 7039
				},
				{
					begin: 4352,
					end: 4607
				},
				{
					begin: 7680,
					end: 7935
				},
				{
					begin: 7936,
					end: 8191
				},
				{
					begin: 8192,
					end: 8303
				},
				{
					begin: 8304,
					end: 8351
				},
				{
					begin: 8352,
					end: 8399
				},
				{
					begin: 8400,
					end: 8447
				},
				{
					begin: 8448,
					end: 8527
				},
				{
					begin: 8528,
					end: 8591
				},
				{
					begin: 8592,
					end: 8703
				},
				{
					begin: 8704,
					end: 8959
				},
				{
					begin: 8960,
					end: 9215
				},
				{
					begin: 9216,
					end: 9279
				},
				{
					begin: 9280,
					end: 9311
				},
				{
					begin: 9312,
					end: 9471
				},
				{
					begin: 9472,
					end: 9599
				},
				{
					begin: 9600,
					end: 9631
				},
				{
					begin: 9632,
					end: 9727
				},
				{
					begin: 9728,
					end: 9983
				},
				{
					begin: 9984,
					end: 10175
				},
				{
					begin: 12288,
					end: 12351
				},
				{
					begin: 12352,
					end: 12447
				},
				{
					begin: 12448,
					end: 12543
				},
				{
					begin: 12544,
					end: 12591
				},
				{
					begin: 12592,
					end: 12687
				},
				{
					begin: 43072,
					end: 43135
				},
				{
					begin: 12800,
					end: 13055
				},
				{
					begin: 13056,
					end: 13311
				},
				{
					begin: 44032,
					end: 55215
				},
				{
					begin: 55296,
					end: 57343
				},
				{
					begin: 67840,
					end: 67871
				},
				{
					begin: 19968,
					end: 40959
				},
				{
					begin: 57344,
					end: 63743
				},
				{
					begin: 12736,
					end: 12783
				},
				{
					begin: 64256,
					end: 64335
				},
				{
					begin: 64336,
					end: 65023
				},
				{
					begin: 65056,
					end: 65071
				},
				{
					begin: 65040,
					end: 65055
				},
				{
					begin: 65104,
					end: 65135
				},
				{
					begin: 65136,
					end: 65279
				},
				{
					begin: 65280,
					end: 65519
				},
				{
					begin: 65520,
					end: 65535
				},
				{
					begin: 3840,
					end: 4095
				},
				{
					begin: 1792,
					end: 1871
				},
				{
					begin: 1920,
					end: 1983
				},
				{
					begin: 3456,
					end: 3583
				},
				{
					begin: 4096,
					end: 4255
				},
				{
					begin: 4608,
					end: 4991
				},
				{
					begin: 5024,
					end: 5119
				},
				{
					begin: 5120,
					end: 5759
				},
				{
					begin: 5760,
					end: 5791
				},
				{
					begin: 5792,
					end: 5887
				},
				{
					begin: 6016,
					end: 6143
				},
				{
					begin: 6144,
					end: 6319
				},
				{
					begin: 10240,
					end: 10495
				},
				{
					begin: 40960,
					end: 42127
				},
				{
					begin: 5888,
					end: 5919
				},
				{
					begin: 66304,
					end: 66351
				},
				{
					begin: 66352,
					end: 66383
				},
				{
					begin: 66560,
					end: 66639
				},
				{
					begin: 118784,
					end: 119039
				},
				{
					begin: 119808,
					end: 120831
				},
				{
					begin: 1044480,
					end: 1048573
				},
				{
					begin: 65024,
					end: 65039
				},
				{
					begin: 917504,
					end: 917631
				},
				{
					begin: 6400,
					end: 6479
				},
				{
					begin: 6480,
					end: 6527
				},
				{
					begin: 6528,
					end: 6623
				},
				{
					begin: 6656,
					end: 6687
				},
				{
					begin: 11264,
					end: 11359
				},
				{
					begin: 11568,
					end: 11647
				},
				{
					begin: 19904,
					end: 19967
				},
				{
					begin: 43008,
					end: 43055
				},
				{
					begin: 65536,
					end: 65663
				},
				{
					begin: 65856,
					end: 65935
				},
				{
					begin: 66432,
					end: 66463
				},
				{
					begin: 66464,
					end: 66527
				},
				{
					begin: 66640,
					end: 66687
				},
				{
					begin: 66688,
					end: 66735
				},
				{
					begin: 67584,
					end: 67647
				},
				{
					begin: 68096,
					end: 68191
				},
				{
					begin: 119552,
					end: 119647
				},
				{
					begin: 73728,
					end: 74751
				},
				{
					begin: 119648,
					end: 119679
				},
				{
					begin: 7040,
					end: 7103
				},
				{
					begin: 7168,
					end: 7247
				},
				{
					begin: 7248,
					end: 7295
				},
				{
					begin: 43136,
					end: 43231
				},
				{
					begin: 43264,
					end: 43311
				},
				{
					begin: 43312,
					end: 43359
				},
				{
					begin: 43520,
					end: 43615
				},
				{
					begin: 65936,
					end: 65999
				},
				{
					begin: 66e3,
					end: 66047
				},
				{
					begin: 66208,
					end: 66271
				},
				{
					begin: 127024,
					end: 127135
				}
			];
			function getUnicodeRange(unicode) {
				for (let i = 0; i < unicodeRanges.length; i += 1) {
					const range = unicodeRanges[i];
					if (unicode >= range.begin && unicode < range.end) return i;
				}
				return -1;
			}
			function parseOS2Table(data, start) {
				const os2 = {};
				const p = new parse_default.Parser(data, start);
				os2.version = p.parseUShort();
				os2.xAvgCharWidth = p.parseShort();
				os2.usWeightClass = p.parseUShort();
				os2.usWidthClass = p.parseUShort();
				os2.fsType = p.parseUShort();
				os2.ySubscriptXSize = p.parseShort();
				os2.ySubscriptYSize = p.parseShort();
				os2.ySubscriptXOffset = p.parseShort();
				os2.ySubscriptYOffset = p.parseShort();
				os2.ySuperscriptXSize = p.parseShort();
				os2.ySuperscriptYSize = p.parseShort();
				os2.ySuperscriptXOffset = p.parseShort();
				os2.ySuperscriptYOffset = p.parseShort();
				os2.yStrikeoutSize = p.parseShort();
				os2.yStrikeoutPosition = p.parseShort();
				os2.sFamilyClass = p.parseShort();
				os2.panose = [];
				for (let i = 0; i < 10; i++) os2.panose[i] = p.parseByte();
				os2.ulUnicodeRange1 = p.parseULong();
				os2.ulUnicodeRange2 = p.parseULong();
				os2.ulUnicodeRange3 = p.parseULong();
				os2.ulUnicodeRange4 = p.parseULong();
				os2.achVendID = String.fromCharCode(p.parseByte(), p.parseByte(), p.parseByte(), p.parseByte());
				os2.fsSelection = p.parseUShort();
				os2.usFirstCharIndex = p.parseUShort();
				os2.usLastCharIndex = p.parseUShort();
				os2.sTypoAscender = p.parseShort();
				os2.sTypoDescender = p.parseShort();
				os2.sTypoLineGap = p.parseShort();
				os2.usWinAscent = p.parseUShort();
				os2.usWinDescent = p.parseUShort();
				if (os2.version >= 1) {
					os2.ulCodePageRange1 = p.parseULong();
					os2.ulCodePageRange2 = p.parseULong();
				}
				if (os2.version >= 2) {
					os2.sxHeight = p.parseShort();
					os2.sCapHeight = p.parseShort();
					os2.usDefaultChar = p.parseUShort();
					os2.usBreakChar = p.parseUShort();
					os2.usMaxContent = p.parseUShort();
				}
				return os2;
			}
			function makeOS2Table(options) {
				return new table_default.Table("OS/2", [
					{
						name: "version",
						type: "USHORT",
						value: 3
					},
					{
						name: "xAvgCharWidth",
						type: "SHORT",
						value: 0
					},
					{
						name: "usWeightClass",
						type: "USHORT",
						value: 0
					},
					{
						name: "usWidthClass",
						type: "USHORT",
						value: 0
					},
					{
						name: "fsType",
						type: "USHORT",
						value: 0
					},
					{
						name: "ySubscriptXSize",
						type: "SHORT",
						value: 650
					},
					{
						name: "ySubscriptYSize",
						type: "SHORT",
						value: 699
					},
					{
						name: "ySubscriptXOffset",
						type: "SHORT",
						value: 0
					},
					{
						name: "ySubscriptYOffset",
						type: "SHORT",
						value: 140
					},
					{
						name: "ySuperscriptXSize",
						type: "SHORT",
						value: 650
					},
					{
						name: "ySuperscriptYSize",
						type: "SHORT",
						value: 699
					},
					{
						name: "ySuperscriptXOffset",
						type: "SHORT",
						value: 0
					},
					{
						name: "ySuperscriptYOffset",
						type: "SHORT",
						value: 479
					},
					{
						name: "yStrikeoutSize",
						type: "SHORT",
						value: 49
					},
					{
						name: "yStrikeoutPosition",
						type: "SHORT",
						value: 258
					},
					{
						name: "sFamilyClass",
						type: "SHORT",
						value: 0
					},
					{
						name: "bFamilyType",
						type: "BYTE",
						value: 0
					},
					{
						name: "bSerifStyle",
						type: "BYTE",
						value: 0
					},
					{
						name: "bWeight",
						type: "BYTE",
						value: 0
					},
					{
						name: "bProportion",
						type: "BYTE",
						value: 0
					},
					{
						name: "bContrast",
						type: "BYTE",
						value: 0
					},
					{
						name: "bStrokeVariation",
						type: "BYTE",
						value: 0
					},
					{
						name: "bArmStyle",
						type: "BYTE",
						value: 0
					},
					{
						name: "bLetterform",
						type: "BYTE",
						value: 0
					},
					{
						name: "bMidline",
						type: "BYTE",
						value: 0
					},
					{
						name: "bXHeight",
						type: "BYTE",
						value: 0
					},
					{
						name: "ulUnicodeRange1",
						type: "ULONG",
						value: 0
					},
					{
						name: "ulUnicodeRange2",
						type: "ULONG",
						value: 0
					},
					{
						name: "ulUnicodeRange3",
						type: "ULONG",
						value: 0
					},
					{
						name: "ulUnicodeRange4",
						type: "ULONG",
						value: 0
					},
					{
						name: "achVendID",
						type: "CHARARRAY",
						value: "XXXX"
					},
					{
						name: "fsSelection",
						type: "USHORT",
						value: 0
					},
					{
						name: "usFirstCharIndex",
						type: "USHORT",
						value: 0
					},
					{
						name: "usLastCharIndex",
						type: "USHORT",
						value: 0
					},
					{
						name: "sTypoAscender",
						type: "SHORT",
						value: 0
					},
					{
						name: "sTypoDescender",
						type: "SHORT",
						value: 0
					},
					{
						name: "sTypoLineGap",
						type: "SHORT",
						value: 0
					},
					{
						name: "usWinAscent",
						type: "USHORT",
						value: 0
					},
					{
						name: "usWinDescent",
						type: "USHORT",
						value: 0
					},
					{
						name: "ulCodePageRange1",
						type: "ULONG",
						value: 0
					},
					{
						name: "ulCodePageRange2",
						type: "ULONG",
						value: 0
					},
					{
						name: "sxHeight",
						type: "SHORT",
						value: 0
					},
					{
						name: "sCapHeight",
						type: "SHORT",
						value: 0
					},
					{
						name: "usDefaultChar",
						type: "USHORT",
						value: 0
					},
					{
						name: "usBreakChar",
						type: "USHORT",
						value: 0
					},
					{
						name: "usMaxContext",
						type: "USHORT",
						value: 0
					}
				], options);
			}
			var os2_default = {
				parse: parseOS2Table,
				make: makeOS2Table,
				unicodeRanges,
				getUnicodeRange
			};
			function parsePostTable(data, start) {
				const post = {};
				const p = new parse_default.Parser(data, start);
				post.version = p.parseVersion();
				post.italicAngle = p.parseFixed();
				post.underlinePosition = p.parseShort();
				post.underlineThickness = p.parseShort();
				post.isFixedPitch = p.parseULong();
				post.minMemType42 = p.parseULong();
				post.maxMemType42 = p.parseULong();
				post.minMemType1 = p.parseULong();
				post.maxMemType1 = p.parseULong();
				switch (post.version) {
					case 1:
						post.names = standardNames.slice();
						break;
					case 2:
						post.numberOfGlyphs = p.parseUShort();
						post.glyphNameIndex = new Array(post.numberOfGlyphs);
						for (let i = 0; i < post.numberOfGlyphs; i++) post.glyphNameIndex[i] = p.parseUShort();
						post.names = [];
						for (let i = 0; i < post.numberOfGlyphs; i++) if (post.glyphNameIndex[i] >= standardNames.length) {
							const nameLength = p.parseChar();
							post.names.push(p.parseString(nameLength));
						}
						break;
					case 2.5:
						post.numberOfGlyphs = p.parseUShort();
						post.offset = new Array(post.numberOfGlyphs);
						for (let i = 0; i < post.numberOfGlyphs; i++) post.offset[i] = p.parseChar();
				}
				return post;
			}
			function makePostTable(font) {
				const { italicAngle = Math.round((font.italicAngle || 0) * 65536), underlinePosition = 0, underlineThickness = 0, isFixedPitch = 0, minMemType42 = 0, maxMemType42 = 0, minMemType1 = 0, maxMemType1 = 0 } = font.tables.post || {};
				return new table_default.Table("post", [
					{
						name: "version",
						type: "FIXED",
						value: 196608
					},
					{
						name: "italicAngle",
						type: "FIXED",
						value: italicAngle
					},
					{
						name: "underlinePosition",
						type: "FWORD",
						value: underlinePosition
					},
					{
						name: "underlineThickness",
						type: "FWORD",
						value: underlineThickness
					},
					{
						name: "isFixedPitch",
						type: "ULONG",
						value: isFixedPitch
					},
					{
						name: "minMemType42",
						type: "ULONG",
						value: minMemType42
					},
					{
						name: "maxMemType42",
						type: "ULONG",
						value: maxMemType42
					},
					{
						name: "minMemType1",
						type: "ULONG",
						value: minMemType1
					},
					{
						name: "maxMemType1",
						type: "ULONG",
						value: maxMemType1
					}
				]);
			}
			var post_default = {
				parse: parsePostTable,
				make: makePostTable
			};
			var subtableParsers = new Array(9);
			subtableParsers[1] = function parseLookup1() {
				const start = this.offset + this.relativeOffset;
				const substFormat = this.parseUShort();
				if (substFormat === 1) return {
					substFormat: 1,
					coverage: this.parsePointer(Parser.coverage),
					deltaGlyphId: this.parseShort()
				};
				else if (substFormat === 2) return {
					substFormat: 2,
					coverage: this.parsePointer(Parser.coverage),
					substitute: this.parseOffset16List()
				};
				check_default.assert(false, "0x" + start.toString(16) + ": lookup type 1 format must be 1 or 2.");
			};
			subtableParsers[2] = function parseLookup2() {
				const substFormat = this.parseUShort();
				check_default.argument(substFormat === 1, "GSUB Multiple Substitution Subtable identifier-format must be 1");
				return {
					substFormat,
					coverage: this.parsePointer(Parser.coverage),
					sequences: this.parseListOfLists()
				};
			};
			subtableParsers[3] = function parseLookup3() {
				const substFormat = this.parseUShort();
				check_default.argument(substFormat === 1, "GSUB Alternate Substitution Subtable identifier-format must be 1");
				return {
					substFormat,
					coverage: this.parsePointer(Parser.coverage),
					alternateSets: this.parseListOfLists()
				};
			};
			subtableParsers[4] = function parseLookup4() {
				const substFormat = this.parseUShort();
				check_default.argument(substFormat === 1, "GSUB ligature table identifier-format must be 1");
				return {
					substFormat,
					coverage: this.parsePointer(Parser.coverage),
					ligatureSets: this.parseListOfLists(function() {
						return {
							ligGlyph: this.parseUShort(),
							components: this.parseUShortList(this.parseUShort() - 1)
						};
					})
				};
			};
			var lookupRecordDesc = {
				sequenceIndex: Parser.uShort,
				lookupListIndex: Parser.uShort
			};
			subtableParsers[5] = function parseLookup5() {
				const start = this.offset + this.relativeOffset;
				const substFormat = this.parseUShort();
				if (substFormat === 1) return {
					substFormat,
					coverage: this.parsePointer(Parser.coverage),
					ruleSets: this.parseListOfLists(function() {
						const glyphCount = this.parseUShort();
						const substCount = this.parseUShort();
						return {
							input: this.parseUShortList(glyphCount - 1),
							lookupRecords: this.parseRecordList(substCount, lookupRecordDesc)
						};
					})
				};
				else if (substFormat === 2) return {
					substFormat,
					coverage: this.parsePointer(Parser.coverage),
					classDef: this.parsePointer(Parser.classDef),
					classSets: this.parseListOfLists(function() {
						const glyphCount = this.parseUShort();
						const substCount = this.parseUShort();
						return {
							classes: this.parseUShortList(glyphCount - 1),
							lookupRecords: this.parseRecordList(substCount, lookupRecordDesc)
						};
					})
				};
				else if (substFormat === 3) {
					const glyphCount = this.parseUShort();
					const substCount = this.parseUShort();
					return {
						substFormat,
						coverages: this.parseList(glyphCount, Parser.pointer(Parser.coverage)),
						lookupRecords: this.parseRecordList(substCount, lookupRecordDesc)
					};
				}
				check_default.assert(false, "0x" + start.toString(16) + ": lookup type 5 format must be 1, 2 or 3.");
			};
			subtableParsers[6] = function parseLookup6() {
				const start = this.offset + this.relativeOffset;
				const substFormat = this.parseUShort();
				if (substFormat === 1) return {
					substFormat: 1,
					coverage: this.parsePointer(Parser.coverage),
					chainRuleSets: this.parseListOfLists(function() {
						return {
							backtrack: this.parseUShortList(),
							input: this.parseUShortList(this.parseShort() - 1),
							lookahead: this.parseUShortList(),
							lookupRecords: this.parseRecordList(lookupRecordDesc)
						};
					})
				};
				else if (substFormat === 2) return {
					substFormat: 2,
					coverage: this.parsePointer(Parser.coverage),
					backtrackClassDef: this.parsePointer(Parser.classDef),
					inputClassDef: this.parsePointer(Parser.classDef),
					lookaheadClassDef: this.parsePointer(Parser.classDef),
					chainClassSet: this.parseListOfLists(function() {
						return {
							backtrack: this.parseUShortList(),
							input: this.parseUShortList(this.parseShort() - 1),
							lookahead: this.parseUShortList(),
							lookupRecords: this.parseRecordList(lookupRecordDesc)
						};
					})
				};
				else if (substFormat === 3) return {
					substFormat: 3,
					backtrackCoverage: this.parseList(Parser.pointer(Parser.coverage)),
					inputCoverage: this.parseList(Parser.pointer(Parser.coverage)),
					lookaheadCoverage: this.parseList(Parser.pointer(Parser.coverage)),
					lookupRecords: this.parseRecordList(lookupRecordDesc)
				};
				check_default.assert(false, "0x" + start.toString(16) + ": lookup type 6 format must be 1, 2 or 3.");
			};
			subtableParsers[7] = function parseLookup7() {
				const substFormat = this.parseUShort();
				check_default.argument(substFormat === 1, "GSUB Extension Substitution subtable identifier-format must be 1");
				const extensionLookupType = this.parseUShort();
				const extensionParser = new Parser(this.data, this.offset + this.parseULong());
				return {
					substFormat: 1,
					lookupType: extensionLookupType,
					extension: subtableParsers[extensionLookupType].call(extensionParser)
				};
			};
			subtableParsers[8] = function parseLookup8() {
				const substFormat = this.parseUShort();
				check_default.argument(substFormat === 1, "GSUB Reverse Chaining Contextual Single Substitution Subtable identifier-format must be 1");
				return {
					substFormat,
					coverage: this.parsePointer(Parser.coverage),
					backtrackCoverage: this.parseList(Parser.pointer(Parser.coverage)),
					lookaheadCoverage: this.parseList(Parser.pointer(Parser.coverage)),
					substitutes: this.parseUShortList()
				};
			};
			function parseGsubTable(data, start) {
				start = start || 0;
				const p = new Parser(data, start);
				const tableVersion = p.parseVersion(1);
				check_default.argument(tableVersion === 1 || tableVersion === 1.1, "Unsupported GSUB table version.");
				if (tableVersion === 1) return {
					version: tableVersion,
					scripts: p.parseScriptList(),
					features: p.parseFeatureList(),
					lookups: p.parseLookupList(subtableParsers)
				};
				else return {
					version: tableVersion,
					scripts: p.parseScriptList(),
					features: p.parseFeatureList(),
					lookups: p.parseLookupList(subtableParsers),
					variations: p.parseFeatureVariationsList()
				};
			}
			var subtableMakers = new Array(9);
			subtableMakers[1] = function makeLookup1(subtable) {
				if (subtable.substFormat === 1) return new table_default.Table("substitutionTable", [
					{
						name: "substFormat",
						type: "USHORT",
						value: 1
					},
					{
						name: "coverage",
						type: "TABLE",
						value: new table_default.Coverage(subtable.coverage)
					},
					{
						name: "deltaGlyphID",
						type: "SHORT",
						value: subtable.deltaGlyphId
					}
				]);
				else if (subtable.substFormat === 2) return new table_default.Table("substitutionTable", [{
					name: "substFormat",
					type: "USHORT",
					value: 2
				}, {
					name: "coverage",
					type: "TABLE",
					value: new table_default.Coverage(subtable.coverage)
				}].concat(table_default.ushortList("substitute", subtable.substitute)));
				check_default.fail("Lookup type 1 substFormat must be 1 or 2.");
			};
			subtableMakers[2] = function makeLookup2(subtable) {
				check_default.assert(subtable.substFormat === 1, "Lookup type 2 substFormat must be 1.");
				return new table_default.Table("substitutionTable", [{
					name: "substFormat",
					type: "USHORT",
					value: 1
				}, {
					name: "coverage",
					type: "TABLE",
					value: new table_default.Coverage(subtable.coverage)
				}].concat(table_default.tableList("seqSet", subtable.sequences, function(sequenceSet) {
					return new table_default.Table("sequenceSetTable", table_default.ushortList("sequence", sequenceSet));
				})));
			};
			subtableMakers[3] = function makeLookup3(subtable) {
				check_default.assert(subtable.substFormat === 1, "Lookup type 3 substFormat must be 1.");
				return new table_default.Table("substitutionTable", [{
					name: "substFormat",
					type: "USHORT",
					value: 1
				}, {
					name: "coverage",
					type: "TABLE",
					value: new table_default.Coverage(subtable.coverage)
				}].concat(table_default.tableList("altSet", subtable.alternateSets, function(alternateSet) {
					return new table_default.Table("alternateSetTable", table_default.ushortList("alternate", alternateSet));
				})));
			};
			subtableMakers[4] = function makeLookup4(subtable) {
				check_default.assert(subtable.substFormat === 1, "Lookup type 4 substFormat must be 1.");
				return new table_default.Table("substitutionTable", [{
					name: "substFormat",
					type: "USHORT",
					value: 1
				}, {
					name: "coverage",
					type: "TABLE",
					value: new table_default.Coverage(subtable.coverage)
				}].concat(table_default.tableList("ligSet", subtable.ligatureSets, function(ligatureSet) {
					return new table_default.Table("ligatureSetTable", table_default.tableList("ligature", ligatureSet, function(ligature) {
						return new table_default.Table("ligatureTable", [{
							name: "ligGlyph",
							type: "USHORT",
							value: ligature.ligGlyph
						}].concat(table_default.ushortList("component", ligature.components, ligature.components.length + 1)));
					}));
				})));
			};
			subtableMakers[5] = function makeLookup5(subtable) {
				if (subtable.substFormat === 1) return new table_default.Table("contextualSubstitutionTable", [{
					name: "substFormat",
					type: "USHORT",
					value: subtable.substFormat
				}, {
					name: "coverage",
					type: "TABLE",
					value: new table_default.Coverage(subtable.coverage)
				}].concat(table_default.tableList("sequenceRuleSet", subtable.ruleSets, function(sequenceRuleSet) {
					if (!sequenceRuleSet) return new table_default.Table("NULL", null);
					return new table_default.Table("sequenceRuleSetTable", table_default.tableList("sequenceRule", sequenceRuleSet, function(sequenceRule) {
						let tableData = table_default.ushortList("seqLookup", [], sequenceRule.lookupRecords.length).concat(table_default.ushortList("inputSequence", sequenceRule.input, sequenceRule.input.length + 1));
						[tableData[0], tableData[1]] = [tableData[1], tableData[0]];
						for (let i = 0; i < sequenceRule.lookupRecords.length; i++) {
							const record = sequenceRule.lookupRecords[i];
							tableData = tableData.concat({
								name: "sequenceIndex" + i,
								type: "USHORT",
								value: record.sequenceIndex
							}).concat({
								name: "lookupListIndex" + i,
								type: "USHORT",
								value: record.lookupListIndex
							});
						}
						return new table_default.Table("sequenceRuleTable", tableData);
					}));
				})));
				else if (subtable.substFormat === 2) return new table_default.Table("contextualSubstitutionTable", [
					{
						name: "substFormat",
						type: "USHORT",
						value: subtable.substFormat
					},
					{
						name: "coverage",
						type: "TABLE",
						value: new table_default.Coverage(subtable.coverage)
					},
					{
						name: "classDef",
						type: "TABLE",
						value: new table_default.ClassDef(subtable.classDef)
					}
				].concat(table_default.tableList("classSeqRuleSet", subtable.classSets, function(classSeqRuleSet) {
					if (!classSeqRuleSet) return new table_default.Table("NULL", null);
					return new table_default.Table("classSeqRuleSetTable", table_default.tableList("classSeqRule", classSeqRuleSet, function(classSeqRule) {
						let tableData = table_default.ushortList("classes", classSeqRule.classes, classSeqRule.classes.length + 1).concat(table_default.ushortList("seqLookupCount", [], classSeqRule.lookupRecords.length));
						for (let i = 0; i < classSeqRule.lookupRecords.length; i++) {
							const record = classSeqRule.lookupRecords[i];
							tableData = tableData.concat({
								name: "sequenceIndex" + i,
								type: "USHORT",
								value: record.sequenceIndex
							}).concat({
								name: "lookupListIndex" + i,
								type: "USHORT",
								value: record.lookupListIndex
							});
						}
						return new table_default.Table("classSeqRuleTable", tableData);
					}));
				})));
				else if (subtable.substFormat === 3) {
					let tableData = [{
						name: "substFormat",
						type: "USHORT",
						value: subtable.substFormat
					}];
					tableData.push({
						name: "inputGlyphCount",
						type: "USHORT",
						value: subtable.coverages.length
					});
					tableData.push({
						name: "substitutionCount",
						type: "USHORT",
						value: subtable.lookupRecords.length
					});
					for (let i = 0; i < subtable.coverages.length; i++) {
						const coverage = subtable.coverages[i];
						tableData.push({
							name: "inputCoverage" + i,
							type: "TABLE",
							value: new table_default.Coverage(coverage)
						});
					}
					for (let i = 0; i < subtable.lookupRecords.length; i++) {
						const record = subtable.lookupRecords[i];
						tableData = tableData.concat({
							name: "sequenceIndex" + i,
							type: "USHORT",
							value: record.sequenceIndex
						}).concat({
							name: "lookupListIndex" + i,
							type: "USHORT",
							value: record.lookupListIndex
						});
					}
					return new table_default.Table("contextualSubstitutionTable", tableData);
				}
				check_default.assert(false, "lookup type 5 format must be 1, 2 or 3.");
			};
			subtableMakers[6] = function makeLookup6(subtable) {
				if (subtable.substFormat === 1) return new table_default.Table("chainContextTable", [{
					name: "substFormat",
					type: "USHORT",
					value: subtable.substFormat
				}, {
					name: "coverage",
					type: "TABLE",
					value: new table_default.Coverage(subtable.coverage)
				}].concat(table_default.tableList("chainRuleSet", subtable.chainRuleSets, function(chainRuleSet) {
					return new table_default.Table("chainRuleSetTable", table_default.tableList("chainRule", chainRuleSet, function(chainRule) {
						let tableData = table_default.ushortList("backtrackGlyph", chainRule.backtrack, chainRule.backtrack.length).concat(table_default.ushortList("inputGlyph", chainRule.input, chainRule.input.length + 1)).concat(table_default.ushortList("lookaheadGlyph", chainRule.lookahead, chainRule.lookahead.length)).concat(table_default.ushortList("substitution", [], chainRule.lookupRecords.length));
						for (let i = 0; i < chainRule.lookupRecords.length; i++) {
							const record = chainRule.lookupRecords[i];
							tableData = tableData.concat({
								name: "sequenceIndex" + i,
								type: "USHORT",
								value: record.sequenceIndex
							}).concat({
								name: "lookupListIndex" + i,
								type: "USHORT",
								value: record.lookupListIndex
							});
						}
						return new table_default.Table("chainRuleTable", tableData);
					}));
				})));
				else if (subtable.substFormat === 2) check_default.assert(false, "lookup type 6 format 2 is not yet supported.");
				else if (subtable.substFormat === 3) {
					let tableData = [{
						name: "substFormat",
						type: "USHORT",
						value: subtable.substFormat
					}];
					tableData.push({
						name: "backtrackGlyphCount",
						type: "USHORT",
						value: subtable.backtrackCoverage.length
					});
					for (let i = 0; i < subtable.backtrackCoverage.length; i++) {
						const coverage = subtable.backtrackCoverage[i];
						tableData.push({
							name: "backtrackCoverage" + i,
							type: "TABLE",
							value: new table_default.Coverage(coverage)
						});
					}
					tableData.push({
						name: "inputGlyphCount",
						type: "USHORT",
						value: subtable.inputCoverage.length
					});
					for (let i = 0; i < subtable.inputCoverage.length; i++) {
						const coverage = subtable.inputCoverage[i];
						tableData.push({
							name: "inputCoverage" + i,
							type: "TABLE",
							value: new table_default.Coverage(coverage)
						});
					}
					tableData.push({
						name: "lookaheadGlyphCount",
						type: "USHORT",
						value: subtable.lookaheadCoverage.length
					});
					for (let i = 0; i < subtable.lookaheadCoverage.length; i++) {
						const coverage = subtable.lookaheadCoverage[i];
						tableData.push({
							name: "lookaheadCoverage" + i,
							type: "TABLE",
							value: new table_default.Coverage(coverage)
						});
					}
					tableData.push({
						name: "substitutionCount",
						type: "USHORT",
						value: subtable.lookupRecords.length
					});
					for (let i = 0; i < subtable.lookupRecords.length; i++) {
						const record = subtable.lookupRecords[i];
						tableData = tableData.concat({
							name: "sequenceIndex" + i,
							type: "USHORT",
							value: record.sequenceIndex
						}).concat({
							name: "lookupListIndex" + i,
							type: "USHORT",
							value: record.lookupListIndex
						});
					}
					return new table_default.Table("chainContextTable", tableData);
				}
				check_default.assert(false, "lookup type 6 format must be 1, 2 or 3.");
			};
			function makeGsubTable(gsub) {
				return new table_default.Table("GSUB", [
					{
						name: "version",
						type: "ULONG",
						value: 65536
					},
					{
						name: "scripts",
						type: "TABLE",
						value: new table_default.ScriptList(gsub.scripts)
					},
					{
						name: "features",
						type: "TABLE",
						value: new table_default.FeatureList(gsub.features)
					},
					{
						name: "lookups",
						type: "TABLE",
						value: new table_default.LookupList(gsub.lookups, subtableMakers)
					}
				]);
			}
			var gsub_default = {
				parse: parseGsubTable,
				make: makeGsubTable
			};
			function parseMetaTable(data, start) {
				const p = new parse_default.Parser(data, start);
				const tableVersion = p.parseULong();
				check_default.argument(tableVersion === 1, "Unsupported META table version.");
				p.parseULong();
				p.parseULong();
				const numDataMaps = p.parseULong();
				const tags = {};
				for (let i = 0; i < numDataMaps; i++) {
					const tag = p.parseTag();
					const dataOffset = p.parseULong();
					const dataLength = p.parseULong();
					if (tag === "appl" || tag === "bild") continue;
					tags[tag] = decode.UTF8(data, start + dataOffset, dataLength);
				}
				return tags;
			}
			function makeMetaTable(tags) {
				const numTags = Object.keys(tags).length;
				let stringPool = "";
				const stringPoolOffset = 16 + numTags * 12;
				const result = new table_default.Table("meta", [
					{
						name: "version",
						type: "ULONG",
						value: 1
					},
					{
						name: "flags",
						type: "ULONG",
						value: 0
					},
					{
						name: "offset",
						type: "ULONG",
						value: stringPoolOffset
					},
					{
						name: "numTags",
						type: "ULONG",
						value: numTags
					}
				]);
				for (let tag in tags) {
					const pos = stringPool.length;
					stringPool += tags[tag];
					result.fields.push({
						name: "tag " + tag,
						type: "TAG",
						value: tag
					});
					result.fields.push({
						name: "offset " + tag,
						type: "ULONG",
						value: stringPoolOffset + pos
					});
					result.fields.push({
						name: "length " + tag,
						type: "ULONG",
						value: tags[tag].length
					});
				}
				result.fields.push({
					name: "stringPool",
					type: "CHARARRAY",
					value: stringPool
				});
				return result;
			}
			var meta_default = {
				parse: parseMetaTable,
				make: makeMetaTable
			};
			function parseColrTable(data, start) {
				const p = new Parser(data, start);
				const version = p.parseUShort();
				if (version !== 0) console.warn("Only COLRv0 is currently fully supported. A subset of color glyphs might be available in this font if provided in the v0 format.");
				const numBaseGlyphRecords = p.parseUShort();
				const baseGlyphRecordsOffset = p.parseOffset32();
				const layerRecordsOffset = p.parseOffset32();
				const numLayerRecords = p.parseUShort();
				p.relativeOffset = baseGlyphRecordsOffset;
				const baseGlyphRecords = p.parseRecordList(numBaseGlyphRecords, {
					glyphID: Parser.uShort,
					firstLayerIndex: Parser.uShort,
					numLayers: Parser.uShort
				});
				p.relativeOffset = layerRecordsOffset;
				return {
					version,
					baseGlyphRecords,
					layerRecords: p.parseRecordList(numLayerRecords, {
						glyphID: Parser.uShort,
						paletteIndex: Parser.uShort
					})
				};
			}
			function makeColrTable({ version = 0, baseGlyphRecords = [], layerRecords = [] }) {
				check_default.argument(version === 0, "Only COLRv0 supported.");
				const baseGlyphRecordsOffset = 14;
				const layerRecordsOffset = baseGlyphRecordsOffset + baseGlyphRecords.length * 6;
				return new table_default.Table("COLR", [
					{
						name: "version",
						type: "USHORT",
						value: version
					},
					{
						name: "numBaseGlyphRecords",
						type: "USHORT",
						value: baseGlyphRecords.length
					},
					{
						name: "baseGlyphRecordsOffset",
						type: "ULONG",
						value: baseGlyphRecordsOffset
					},
					{
						name: "layerRecordsOffset",
						type: "ULONG",
						value: layerRecordsOffset
					},
					{
						name: "numLayerRecords",
						type: "USHORT",
						value: layerRecords.length
					},
					...baseGlyphRecords.map((glyph, i) => [
						{
							name: "glyphID_" + i,
							type: "USHORT",
							value: glyph.glyphID
						},
						{
							name: "firstLayerIndex_" + i,
							type: "USHORT",
							value: glyph.firstLayerIndex
						},
						{
							name: "numLayers_" + i,
							type: "USHORT",
							value: glyph.numLayers
						}
					]).flat(),
					...layerRecords.map((layer, i) => [{
						name: "LayerGlyphID_" + i,
						type: "USHORT",
						value: layer.glyphID
					}, {
						name: "paletteIndex_" + i,
						type: "USHORT",
						value: layer.paletteIndex
					}]).flat()
				]);
			}
			var colr_default = {
				parse: parseColrTable,
				make: makeColrTable
			};
			function makeFvarAxis(n, axis) {
				return [
					{
						name: "tag_" + n,
						type: "TAG",
						value: axis.tag
					},
					{
						name: "minValue_" + n,
						type: "FIXED",
						value: axis.minValue << 16
					},
					{
						name: "defaultValue_" + n,
						type: "FIXED",
						value: axis.defaultValue << 16
					},
					{
						name: "maxValue_" + n,
						type: "FIXED",
						value: axis.maxValue << 16
					},
					{
						name: "flags_" + n,
						type: "USHORT",
						value: 0
					},
					{
						name: "nameID_" + n,
						type: "USHORT",
						value: axis.axisNameID
					}
				];
			}
			function parseFvarAxis(data, start, names) {
				const axis = {};
				const p = new parse_default.Parser(data, start);
				axis.tag = p.parseTag();
				axis.minValue = p.parseFixed();
				axis.defaultValue = p.parseFixed();
				axis.maxValue = p.parseFixed();
				p.skip("uShort", 1);
				const axisNameID = p.parseUShort();
				axis.axisNameID = axisNameID;
				axis.name = getNameByID(names, axisNameID);
				return axis;
			}
			function makeFvarInstance(n, inst, axes, optionalFields = {}) {
				const fields = [{
					name: "nameID_" + n,
					type: "USHORT",
					value: inst.subfamilyNameID
				}, {
					name: "flags_" + n,
					type: "USHORT",
					value: 0
				}];
				for (let i = 0; i < axes.length; ++i) {
					const axisTag = axes[i].tag;
					fields.push({
						name: "axis_" + n + " " + axisTag,
						type: "FIXED",
						value: inst.coordinates[axisTag] << 16
					});
				}
				if (optionalFields && optionalFields.postScriptNameID) fields.push({
					name: "postScriptNameID_",
					type: "USHORT",
					value: inst.postScriptNameID !== void 0 ? inst.postScriptNameID : 65535
				});
				return fields;
			}
			function parseFvarInstance(data, start, axes, names, instanceSize) {
				const inst = {};
				const p = new parse_default.Parser(data, start);
				const subfamilyNameID = p.parseUShort();
				inst.subfamilyNameID = subfamilyNameID;
				inst.name = getNameByID(names, subfamilyNameID, [2, 17]);
				p.skip("uShort", 1);
				inst.coordinates = {};
				for (let i = 0; i < axes.length; ++i) inst.coordinates[axes[i].tag] = p.parseFixed();
				if (p.relativeOffset === instanceSize) {
					inst.postScriptNameID = void 0;
					inst.postScriptName = void 0;
					return inst;
				}
				const postScriptNameID = p.parseUShort();
				inst.postScriptNameID = postScriptNameID == 65535 ? void 0 : postScriptNameID;
				inst.postScriptName = inst.postScriptNameID !== void 0 ? getNameByID(names, postScriptNameID, [6]) : "";
				return inst;
			}
			function makeFvarTable(fvar, names) {
				const result = new table_default.Table("fvar", [
					{
						name: "version",
						type: "ULONG",
						value: 65536
					},
					{
						name: "offsetToData",
						type: "USHORT",
						value: 0
					},
					{
						name: "countSizePairs",
						type: "USHORT",
						value: 2
					},
					{
						name: "axisCount",
						type: "USHORT",
						value: fvar.axes.length
					},
					{
						name: "axisSize",
						type: "USHORT",
						value: 20
					},
					{
						name: "instanceCount",
						type: "USHORT",
						value: fvar.instances.length
					},
					{
						name: "instanceSize",
						type: "USHORT",
						value: 4 + fvar.axes.length * 4
					}
				]);
				result.offsetToData = result.sizeOf();
				for (let i = 0; i < fvar.axes.length; i++) result.fields = result.fields.concat(makeFvarAxis(i, fvar.axes[i], names));
				const optionalFields = {};
				for (let j = 0; j < fvar.instances.length; j++) if (fvar.instances[j].postScriptNameID !== void 0) {
					result.instanceSize += 2;
					optionalFields.postScriptNameID = true;
					break;
				}
				for (let j = 0; j < fvar.instances.length; j++) result.fields = result.fields.concat(makeFvarInstance(j, fvar.instances[j], fvar.axes, optionalFields));
				return result;
			}
			function parseFvarTable(data, start, names) {
				const p = new parse_default.Parser(data, start);
				const tableVersion = p.parseULong();
				check_default.argument(tableVersion === 65536, "Unsupported fvar table version.");
				const offsetToData = p.parseOffset16();
				p.skip("uShort", 1);
				const axisCount = p.parseUShort();
				const axisSize = p.parseUShort();
				const instanceCount = p.parseUShort();
				const instanceSize = p.parseUShort();
				const axes = [];
				for (let i = 0; i < axisCount; i++) axes.push(parseFvarAxis(data, start + offsetToData + i * axisSize, names));
				const instances = [];
				const instanceStart = start + offsetToData + axisCount * axisSize;
				for (let j = 0; j < instanceCount; j++) instances.push(parseFvarInstance(data, instanceStart + j * instanceSize, axes, names, instanceSize));
				return {
					axes,
					instances
				};
			}
			var fvar_default = {
				make: makeFvarTable,
				parse: parseFvarTable
			};
			var axisRecordStruct = {
				tag: Parser.tag,
				nameID: Parser.uShort,
				ordering: Parser.uShort
			};
			var axisValueParsers = new Array(5);
			axisValueParsers[1] = function axisValueParser1() {
				return {
					axisIndex: this.parseUShort(),
					flags: this.parseUShort(),
					valueNameID: this.parseUShort(),
					value: this.parseFixed()
				};
			};
			axisValueParsers[2] = function axisValueParser2() {
				return {
					axisIndex: this.parseUShort(),
					flags: this.parseUShort(),
					valueNameID: this.parseUShort(),
					nominalValue: this.parseFixed(),
					rangeMinValue: this.parseFixed(),
					rangeMaxValue: this.parseFixed()
				};
			};
			axisValueParsers[3] = function axisValueParser3() {
				return {
					axisIndex: this.parseUShort(),
					flags: this.parseUShort(),
					valueNameID: this.parseUShort(),
					value: this.parseFixed(),
					linkedValue: this.parseFixed()
				};
			};
			axisValueParsers[4] = function axisValueParser4() {
				const axisCount = this.parseUShort();
				return {
					flags: this.parseUShort(),
					valueNameID: this.parseUShort(),
					axisValues: this.parseList(axisCount, function() {
						return {
							axisIndex: this.parseUShort(),
							value: this.parseFixed()
						};
					})
				};
			};
			function parseSTATAxisValue() {
				const valueTableFormat = this.parseUShort();
				const axisValueParser = axisValueParsers[valueTableFormat];
				const formatStub = { format: valueTableFormat };
				if (axisValueParser === void 0) {
					console.warn(`Unknown axis value table format ${valueTableFormat}`);
					return formatStub;
				}
				return Object.assign(formatStub, this.parseStruct(axisValueParser.bind(this)));
			}
			function parseSTATTable(data, start, fvar) {
				if (!start) start = 0;
				const p = new parse_default.Parser(data, start);
				const tableVersionMajor = p.parseUShort();
				const tableVersionMinor = p.parseUShort();
				if (tableVersionMajor !== 1) console.warn(`Unsupported STAT table version ${tableVersionMajor}.${tableVersionMinor}`);
				const version = [tableVersionMajor, tableVersionMinor];
				const designAxisSize = p.parseUShort();
				const designAxisCount = p.parseUShort();
				const designAxesOffset = p.parseOffset32();
				const axisValueCount = p.parseUShort();
				const offsetToAxisValueOffsets = p.parseOffset32();
				const elidedFallbackNameID = tableVersionMajor > 1 || tableVersionMinor > 0 ? p.parseUShort() : void 0;
				if (fvar !== void 0) check_default.argument(designAxisCount >= fvar.axes.length, "STAT axis count must be greater than or equal to fvar axis count");
				if (axisValueCount > 0) check_default.argument(designAxisCount >= 0, "STAT axis count must be greater than 0 if STAT axis value count is greater than 0");
				const axes = [];
				for (let i = 0; i < designAxisCount; i++) {
					p.offset = start + designAxesOffset;
					p.relativeOffset = i * designAxisSize;
					axes.push(p.parseStruct(axisRecordStruct));
				}
				p.offset = start;
				p.relativeOffset = offsetToAxisValueOffsets;
				const valueOffsets = p.parseUShortList(axisValueCount);
				const values = [];
				for (let i = 0; i < axisValueCount; i++) {
					p.offset = start + offsetToAxisValueOffsets;
					p.relativeOffset = valueOffsets[i];
					values.push(parseSTATAxisValue.apply(p));
				}
				return {
					version,
					axes,
					values,
					elidedFallbackNameID
				};
			}
			var axisValueMakers = new Array(5);
			axisValueMakers[1] = function axisValueMaker1(n, table) {
				return [
					{
						name: `format${n}`,
						type: "USHORT",
						value: 1
					},
					{
						name: `axisIndex${n}`,
						type: "USHORT",
						value: table.axisIndex
					},
					{
						name: `flags${n}`,
						type: "USHORT",
						value: table.flags
					},
					{
						name: `valueNameID${n}`,
						type: "USHORT",
						value: table.valueNameID
					},
					{
						name: `value${n}`,
						type: "FLOAT",
						value: table.value
					}
				];
			};
			axisValueMakers[2] = function axisValueMaker2(n, table) {
				return [
					{
						name: `format${n}`,
						type: "USHORT",
						value: 2
					},
					{
						name: `axisIndex${n}`,
						type: "USHORT",
						value: table.axisIndex
					},
					{
						name: `flags${n}`,
						type: "USHORT",
						value: table.flags
					},
					{
						name: `valueNameID${n}`,
						type: "USHORT",
						value: table.valueNameID
					},
					{
						name: `nominalValue${n}`,
						type: "FLOAT",
						value: table.nominalValue
					},
					{
						name: `rangeMinValue${n}`,
						type: "FLOAT",
						value: table.rangeMinValue
					},
					{
						name: `rangeMaxValue${n}`,
						type: "FLOAT",
						value: table.rangeMaxValue
					}
				];
			};
			axisValueMakers[3] = function axisValueMaker3(n, table) {
				return [
					{
						name: `format${n}`,
						type: "USHORT",
						value: 3
					},
					{
						name: `axisIndex${n}`,
						type: "USHORT",
						value: table.axisIndex
					},
					{
						name: `flags${n}`,
						type: "USHORT",
						value: table.flags
					},
					{
						name: `valueNameID${n}`,
						type: "USHORT",
						value: table.valueNameID
					},
					{
						name: `value${n}`,
						type: "FLOAT",
						value: table.value
					},
					{
						name: `linkedValue${n}`,
						type: "FLOAT",
						value: table.linkedValue
					}
				];
			};
			axisValueMakers[4] = function axisValueMaker4(n, table) {
				let returnFields = [
					{
						name: `format${n}`,
						type: "USHORT",
						value: 4
					},
					{
						name: `axisCount${n}`,
						type: "USHORT",
						value: table.axisValues.length
					},
					{
						name: `flags${n}`,
						type: "USHORT",
						value: table.flags
					},
					{
						name: `valueNameID${n}`,
						type: "USHORT",
						value: table.valueNameID
					}
				];
				for (let i = 0; i < table.axisValues.length; i++) returnFields = returnFields.concat([{
					name: `format${n}axisIndex${i}`,
					type: "USHORT",
					value: table.axisValues[i].axisIndex
				}, {
					name: `format${n}value${i}`,
					type: "FLOAT",
					value: table.axisValues[i].value
				}]);
				return returnFields;
			};
			function makeSTATAxisRecord(n, axis) {
				return new table_default.Record("axisRecord_" + n, [
					{
						name: "axisTag_" + n,
						type: "TAG",
						value: axis.tag
					},
					{
						name: "axisNameID_" + n,
						type: "USHORT",
						value: axis.nameID
					},
					{
						name: "axisOrdering_" + n,
						type: "USHORT",
						value: axis.ordering
					}
				]);
			}
			function makeSTATValueTable(n, tableData) {
				const valueTableFormat = tableData.format;
				const axisValueMaker = axisValueMakers[valueTableFormat];
				check_default.argument(axisValueMaker !== void 0, `Unknown axis value table format ${valueTableFormat}`);
				const fields = axisValueMaker(n, tableData);
				return new table_default.Table("axisValueTable_" + n, fields);
			}
			function makeSTATTable(STAT) {
				const result = new table_default.Table("STAT", [
					{
						name: "majorVersion",
						type: "USHORT",
						value: 1
					},
					{
						name: "minorVersion",
						type: "USHORT",
						value: 2
					},
					{
						name: "designAxisSize",
						type: "USHORT",
						value: 8
					},
					{
						name: "designAxisCount",
						type: "USHORT",
						value: STAT.axes.length
					},
					{
						name: "designAxesOffset",
						type: "ULONG",
						value: 0
					},
					{
						name: "axisValueCount",
						type: "USHORT",
						value: STAT.values.length
					},
					{
						name: "offsetToAxisValueOffsets",
						type: "ULONG",
						value: 0
					},
					{
						name: "elidedFallbackNameID",
						type: "USHORT",
						value: STAT.elidedFallbackNameID
					}
				]);
				result.designAxesOffset = result.offsetToAxisValueOffsets = result.sizeOf();
				for (let i = 0; i < STAT.axes.length; i++) {
					const axisRecord = makeSTATAxisRecord(i, STAT.axes[i]);
					result.offsetToAxisValueOffsets += axisRecord.sizeOf();
					result.fields = result.fields.concat(axisRecord.fields);
				}
				const axisValueOffsets = [];
				let axisValueTables = [];
				let axisValueTableOffset = STAT.values.length * 2;
				for (let j = 0; j < STAT.values.length; j++) {
					const axisValueTable = makeSTATValueTable(j, STAT.values[j]);
					axisValueOffsets.push({
						name: "offset_" + j,
						type: "USHORT",
						value: axisValueTableOffset
					});
					axisValueTableOffset += axisValueTable.sizeOf();
					axisValueTables = axisValueTables.concat(axisValueTable.fields);
				}
				result.fields = result.fields.concat(axisValueOffsets);
				result.fields = result.fields.concat(axisValueTables);
				return result;
			}
			var stat_default = {
				make: makeSTATTable,
				parse: parseSTATTable
			};
			function makeAvarAxisValueMap(n, axisValueMap) {
				return new table_default.Record("axisValueMap_" + n, [{
					name: "fromCoordinate_" + n,
					type: "F2DOT14",
					value: axisValueMap.fromCoordinate
				}, {
					name: "toCoordinate_" + n,
					type: "F2DOT14",
					value: axisValueMap.toCoordinate
				}]);
			}
			function makeAvarSegmentMap(n, axis) {
				const returnTable = new table_default.Record("segmentMap_" + n, [{
					name: "positionMapCount_" + n,
					type: "USHORT",
					value: axis.axisValueMaps.length
				}]);
				let axisValueMaps = [];
				for (let i = 0; i < axis.axisValueMaps.length; i++) {
					const valueMap = makeAvarAxisValueMap(`${n}_${i}`, axis.axisValueMaps[i]);
					axisValueMaps = axisValueMaps.concat(valueMap.fields);
				}
				returnTable.fields = returnTable.fields.concat(axisValueMaps);
				return returnTable;
			}
			function makeAvarTable(avar, fvar) {
				check_default.argument(avar.axisSegmentMaps.length === fvar.axes.length, "avar axis count must correspond to fvar axis count");
				const result = new table_default.Table("avar", [
					{
						name: "majorVersion",
						type: "USHORT",
						value: 1
					},
					{
						name: "minorVersion",
						type: "USHORT",
						value: 0
					},
					{
						name: "reserved",
						type: "USHORT",
						value: 0
					},
					{
						name: "axisCount",
						type: "USHORT",
						value: avar.axisSegmentMaps.length
					}
				]);
				for (let i = 0; i < avar.axisSegmentMaps.length; i++) {
					const axisRecord = makeAvarSegmentMap(i, avar.axisSegmentMaps[i]);
					result.fields = result.fields.concat(axisRecord.fields);
				}
				return result;
			}
			function parseAvarTable(data, start, fvar) {
				if (!start) start = 0;
				const p = new Parser(data, start);
				const tableVersionMajor = p.parseUShort();
				const tableVersionMinor = p.parseUShort();
				if (tableVersionMajor !== 1) console.warn(`Unsupported avar table version ${tableVersionMajor}.${tableVersionMinor}`);
				p.skip("uShort", 1);
				const axisCount = p.parseUShort();
				check_default.argument(axisCount === fvar.axes.length, "avar axis count must correspond to fvar axis count");
				const axisSegmentMaps = [];
				for (let i = 0; i < axisCount; i++) {
					const axisValueMaps = [];
					const positionMapCount = p.parseUShort();
					for (let j = 0; j < positionMapCount; j++) {
						const fromCoordinate = p.parseF2Dot14();
						const toCoordinate = p.parseF2Dot14();
						axisValueMaps.push({
							fromCoordinate,
							toCoordinate
						});
					}
					axisSegmentMaps.push({ axisValueMaps });
				}
				return {
					version: [tableVersionMajor, tableVersionMinor],
					axisSegmentMaps
				};
			}
			var avar_default = {
				make: makeAvarTable,
				parse: parseAvarTable
			};
			function parseCvarTable(data, start, fvar, cvt) {
				const p = new parse_default.Parser(data, start);
				const cvtVariations = p.parseTupleVariationStore(p.relativeOffset, fvar.axes.length, "cvar", cvt);
				const tableVersionMajor = p.parseUShort();
				const tableVersionMinor = p.parseUShort();
				if (tableVersionMajor !== 1) console.warn(`Unsupported cvar table version ${tableVersionMajor}.${tableVersionMinor}`);
				return {
					version: [tableVersionMajor, tableVersionMinor],
					...cvtVariations
				};
			}
			function makeCvarTable() {
				console.warn("Writing of cvar tables is not yet supported.");
			}
			var cvar_default = {
				make: makeCvarTable,
				parse: parseCvarTable
			};
			function parseGvarTable(data, start, fvar, glyphs) {
				const p = new parse_default.Parser(data, start);
				const tableVersionMajor = p.parseUShort();
				const tableVersionMinor = p.parseUShort();
				if (tableVersionMajor !== 1) console.warn(`Unsupported gvar table version ${tableVersionMajor}.${tableVersionMinor}`);
				const axisCount = p.parseUShort();
				if (axisCount !== fvar.axes.length) console.warn(`axisCount ${axisCount} in gvar table does not match the number of axes ${fvar.axes.length} in the fvar table!`);
				const sharedTupleCount = p.parseUShort();
				const sharedTuples = p.parsePointer32(function() {
					return this.parseTupleRecords(sharedTupleCount, axisCount);
				});
				const glyphVariations = p.parseTupleVariationStoreList(axisCount, "gvar", glyphs);
				return {
					version: [tableVersionMajor, tableVersionMinor],
					sharedTuples,
					glyphVariations
				};
			}
			function makeGvarTable() {
				console.warn("Writing of gvar tables is not yet supported.");
			}
			var gvar_default = {
				make: makeGvarTable,
				parse: parseGvarTable
			};
			function parseGaspTable(data, start) {
				const gasp = {};
				const p = new parse_default.Parser(data, start);
				gasp.version = p.parseUShort();
				check_default.argument(gasp.version <= 1, "Unsupported gasp table version.");
				gasp.numRanges = p.parseUShort();
				gasp.gaspRanges = [];
				for (let i = 0; i < gasp.numRanges; i++) gasp.gaspRanges[i] = {
					rangeMaxPPEM: p.parseUShort(),
					rangeGaspBehavior: p.parseUShort()
				};
				return gasp;
			}
			function makeGaspTable(gasp) {
				const result = new table_default.Table("gasp", [{
					name: "version",
					type: "USHORT",
					value: 1
				}, {
					name: "numRanges",
					type: "USHORT",
					value: gasp.numRanges
				}]);
				for (let i in gasp.gaspRanges) {
					result.fields.push({
						name: "rangeMaxPPEM",
						type: "USHORT",
						value: gasp.gaspRanges[i].rangeMaxPPEM
					});
					result.fields.push({
						name: "rangeGaspBehavior",
						type: "USHORT",
						value: gasp.gaspRanges[i].rangeGaspBehavior
					});
				}
				return result;
			}
			var gasp_default = {
				parse: parseGaspTable,
				make: makeGaspTable
			};
			function parseSvgTable(data, offset) {
				const svgTable = /* @__PURE__ */ new Map();
				const buf = data.buffer;
				const p = new Parser(data, offset);
				if (p.parseUShort() !== 0) return svgTable;
				p.relativeOffset = p.parseOffset32();
				const svgDocumentListOffset = data.byteOffset + offset + p.relativeOffset;
				const numEntries = p.parseUShort();
				const svgDocMap = /* @__PURE__ */ new Map();
				for (let i = 0; i < numEntries; i++) {
					const startGlyphID = p.parseUShort();
					const endGlyphID = p.parseUShort();
					const svgDocOffset = svgDocumentListOffset + p.parseOffset32();
					const svgDocLength = p.parseULong();
					let svgDoc = svgDocMap.get(svgDocOffset);
					if (svgDoc === void 0) {
						svgDoc = new Uint8Array(buf, svgDocOffset, svgDocLength);
						svgDocMap.set(svgDocOffset, svgDoc);
					}
					for (let i2 = startGlyphID; i2 <= endGlyphID; i2++) svgTable.set(i2, svgDoc);
				}
				return svgTable;
			}
			function makeSvgTable(svgTable) {
				const glyphIds = Array.from(svgTable.keys()).sort();
				const documentRecords = [];
				const documentBuffers = [];
				const documentOffsets = /* @__PURE__ */ new Map();
				let nextSvgDocOffset = 0;
				let record = { endGlyphID: null };
				for (let i = 0, l = glyphIds.length; i < l; i++) {
					const glyphId = glyphIds[i];
					const svgDoc = svgTable.get(glyphId);
					let svgDocOffset = documentOffsets.get(svgDoc);
					if (svgDocOffset === void 0) {
						svgDocOffset = nextSvgDocOffset;
						documentBuffers.push(svgDoc);
						documentOffsets.set(svgDoc, svgDocOffset);
						nextSvgDocOffset += svgDoc.byteLength;
					}
					if (glyphId - 1 === record.endGlyphID && svgDocOffset === record.svgDocOffset) record.endGlyphID = glyphId;
					else {
						record = {
							startGlyphID: glyphId,
							endGlyphID: glyphId,
							svgDocOffset,
							svgDocLength: svgDoc.byteLength
						};
						documentRecords.push(record);
					}
				}
				const numEntries = documentRecords.length;
				const numDocuments = documentBuffers.length;
				const documentsOffset = 2 + numEntries * 12;
				const fields = new Array(4 + numEntries * 4 + numDocuments);
				let fieldIndex = 0;
				fields[fieldIndex++] = {
					name: "version",
					type: "USHORT",
					value: 0
				};
				fields[fieldIndex++] = {
					name: "svgDocumentListOffset",
					type: "ULONG",
					value: 10
				};
				fields[fieldIndex++] = {
					name: "reserved",
					type: "ULONG",
					value: 0
				};
				fields[fieldIndex++] = {
					name: "numEntries",
					type: "USHORT",
					value: numEntries
				};
				for (let i = 0; i < numEntries; i++) {
					const namePrefix = "documentRecord_" + i;
					const { startGlyphID, endGlyphID, svgDocOffset, svgDocLength } = documentRecords[i];
					fields[fieldIndex++] = {
						name: namePrefix + "_startGlyphID",
						type: "USHORT",
						value: startGlyphID
					};
					fields[fieldIndex++] = {
						name: namePrefix + "_endGlyphID",
						type: "USHORT",
						value: endGlyphID
					};
					fields[fieldIndex++] = {
						name: namePrefix + "_svgDocOffset",
						type: "ULONG",
						value: documentsOffset + svgDocOffset
					};
					fields[fieldIndex++] = {
						name: namePrefix + "_svgDocLength",
						type: "ULONG",
						value: svgDocLength
					};
				}
				for (let i = 0; i < numDocuments; i++) fields[fieldIndex++] = {
					name: "svgDoc_" + i,
					type: "LITERAL",
					value: documentBuffers[i]
				};
				return new table_default.Table("SVG ", fields);
			}
			var svg_default = {
				make: makeSvgTable,
				parse: parseSvgTable
			};
			function log2(v) {
				return Math.log(v) / Math.log(2) | 0;
			}
			function computeCheckSum(bytes) {
				while (bytes.length % 4 !== 0) bytes.push(0);
				let sum = 0;
				for (let i = 0; i < bytes.length; i += 4) sum += (bytes[i] << 24) + (bytes[i + 1] << 16) + (bytes[i + 2] << 8) + bytes[i + 3];
				sum %= Math.pow(2, 32);
				return sum;
			}
			function makeTableRecord(tag, checkSum, offset, length) {
				return new table_default.Record("Table Record", [
					{
						name: "tag",
						type: "TAG",
						value: tag !== void 0 ? tag : ""
					},
					{
						name: "checkSum",
						type: "ULONG",
						value: checkSum !== void 0 ? checkSum : 0
					},
					{
						name: "offset",
						type: "ULONG",
						value: offset !== void 0 ? offset : 0
					},
					{
						name: "length",
						type: "ULONG",
						value: length !== void 0 ? length : 0
					}
				]);
			}
			function makeSfntTable(tables) {
				const sfnt = new table_default.Table("sfnt", [
					{
						name: "version",
						type: "TAG",
						value: "OTTO"
					},
					{
						name: "numTables",
						type: "USHORT",
						value: 0
					},
					{
						name: "searchRange",
						type: "USHORT",
						value: 0
					},
					{
						name: "entrySelector",
						type: "USHORT",
						value: 0
					},
					{
						name: "rangeShift",
						type: "USHORT",
						value: 0
					}
				]);
				sfnt.tables = tables;
				sfnt.numTables = tables.length;
				const highestPowerOf2 = Math.pow(2, log2(sfnt.numTables));
				sfnt.searchRange = 16 * highestPowerOf2;
				sfnt.entrySelector = log2(highestPowerOf2);
				sfnt.rangeShift = sfnt.numTables * 16 - sfnt.searchRange;
				const recordFields = [];
				const tableFields = [];
				let offset = sfnt.sizeOf() + makeTableRecord().sizeOf() * sfnt.numTables;
				while (offset % 4 !== 0) {
					offset += 1;
					tableFields.push({
						name: "padding",
						type: "BYTE",
						value: 0
					});
				}
				for (let i = 0; i < tables.length; i += 1) {
					const t = tables[i];
					check_default.argument(t.tableName.length === 4, "Table name" + t.tableName + " is invalid.");
					const tableLength = t.sizeOf();
					const tableRecord = makeTableRecord(t.tableName, computeCheckSum(t.encode()), offset, tableLength);
					recordFields.push({
						name: tableRecord.tag + " Table Record",
						type: "RECORD",
						value: tableRecord
					});
					tableFields.push({
						name: t.tableName + " table",
						type: "RECORD",
						value: t
					});
					offset += tableLength;
					check_default.argument(!isNaN(offset), "Something went wrong calculating the offset.");
					while (offset % 4 !== 0) {
						offset += 1;
						tableFields.push({
							name: "padding",
							type: "BYTE",
							value: 0
						});
					}
				}
				recordFields.sort(function(r1, r2) {
					if (r1.value.tag > r2.value.tag) return 1;
					else return -1;
				});
				sfnt.fields = sfnt.fields.concat(recordFields);
				sfnt.fields = sfnt.fields.concat(tableFields);
				return sfnt;
			}
			function metricsForChar(font, chars, notFoundMetrics) {
				for (let i = 0; i < chars.length; i += 1) {
					const glyphIndex = font.charToGlyphIndex(chars[i]);
					if (glyphIndex > 0) return font.glyphs.get(glyphIndex).getMetrics();
				}
				return notFoundMetrics;
			}
			function average(vs) {
				let sum = 0;
				for (let i = 0; i < vs.length; i += 1) sum += vs[i];
				return sum / vs.length;
			}
			function fontToSfntTable(font) {
				const xMins = [];
				const yMins = [];
				const xMaxs = [];
				const yMaxs = [];
				const advanceWidths = [];
				const leftSideBearings = [];
				const rightSideBearings = [];
				let firstCharIndex;
				let lastCharIndex = 0;
				let ulUnicodeRange1 = 0;
				let ulUnicodeRange2 = 0;
				let ulUnicodeRange3 = 0;
				let ulUnicodeRange4 = 0;
				for (let i = 0; i < font.glyphs.length; i += 1) {
					const glyph = font.glyphs.get(i);
					const unicode = glyph.unicode | 0;
					if (isNaN(glyph.advanceWidth)) throw new Error("Glyph " + glyph.name + " (" + i + "): advanceWidth is not a number.");
					if (firstCharIndex > unicode || firstCharIndex === void 0) {
						if (unicode > 0) firstCharIndex = unicode;
					}
					if (lastCharIndex < unicode) lastCharIndex = unicode;
					const position = os2_default.getUnicodeRange(unicode);
					if (position < 32) ulUnicodeRange1 |= 1 << position;
					else if (position < 64) ulUnicodeRange2 |= 1 << position - 32;
					else if (position < 96) ulUnicodeRange3 |= 1 << position - 64;
					else if (position < 123) ulUnicodeRange4 |= 1 << position - 96;
					else throw new Error("Unicode ranges bits > 123 are reserved for internal usage");
					if (glyph.name === ".notdef") continue;
					const metrics = glyph.getMetrics();
					xMins.push(metrics.xMin);
					yMins.push(metrics.yMin);
					xMaxs.push(metrics.xMax);
					yMaxs.push(metrics.yMax);
					leftSideBearings.push(metrics.leftSideBearing);
					rightSideBearings.push(metrics.rightSideBearing);
					advanceWidths.push(glyph.advanceWidth);
				}
				const globals = {
					xMin: Math.min.apply(null, xMins),
					yMin: Math.min.apply(null, yMins),
					xMax: Math.max.apply(null, xMaxs),
					yMax: Math.max.apply(null, yMaxs),
					advanceWidthMax: Math.max.apply(null, advanceWidths),
					advanceWidthAvg: average(advanceWidths),
					minLeftSideBearing: Math.min.apply(null, leftSideBearings),
					maxLeftSideBearing: Math.max.apply(null, leftSideBearings),
					minRightSideBearing: Math.min.apply(null, rightSideBearings)
				};
				globals.ascender = font.ascender;
				globals.descender = font.descender;
				let macStyle = 0;
				if (font.weightClass >= 600) macStyle |= font.macStyleValues.BOLD;
				if (font.italicAngle < 0) macStyle |= font.macStyleValues.ITALIC;
				const headTable = head_default.make({
					flags: 3,
					unitsPerEm: font.unitsPerEm,
					xMin: globals.xMin,
					yMin: globals.yMin,
					xMax: globals.xMax,
					yMax: globals.yMax,
					lowestRecPPEM: 3,
					macStyle,
					createdTimestamp: font.createdTimestamp
				});
				const hheaTable = hhea_default.make({
					ascender: globals.ascender,
					descender: globals.descender,
					advanceWidthMax: globals.advanceWidthMax,
					minLeftSideBearing: globals.minLeftSideBearing,
					minRightSideBearing: globals.minRightSideBearing,
					xMaxExtent: globals.maxLeftSideBearing + (globals.xMax - globals.xMin),
					numberOfHMetrics: font.glyphs.length
				});
				const maxpTable = maxp_default.make(font.glyphs.length);
				const os2Table = os2_default.make(Object.assign({
					xAvgCharWidth: Math.round(globals.advanceWidthAvg),
					usFirstCharIndex: firstCharIndex,
					usLastCharIndex: lastCharIndex,
					ulUnicodeRange1,
					ulUnicodeRange2,
					ulUnicodeRange3,
					ulUnicodeRange4,
					sTypoAscender: globals.ascender,
					sTypoDescender: globals.descender,
					sTypoLineGap: 0,
					usWinAscent: globals.yMax,
					usWinDescent: Math.abs(globals.yMin),
					ulCodePageRange1: 1,
					sxHeight: metricsForChar(font, "xyvw", { yMax: Math.round(globals.ascender / 2) }).yMax,
					sCapHeight: metricsForChar(font, "HIKLEFJMNTZBDPRAGOQSUVWXY", globals).yMax,
					usDefaultChar: font.hasChar(" ") ? 32 : 0,
					usBreakChar: font.hasChar(" ") ? 32 : 0
				}, font.tables.os2));
				const hmtxTable = hmtx_default.make(font.glyphs);
				const cmapTable = cmap_default.make(font.glyphs);
				const englishFamilyName = font.getEnglishName("fontFamily");
				const englishStyleName = font.getEnglishName("fontSubfamily");
				const englishFullName = englishFamilyName + " " + englishStyleName;
				let postScriptName = font.getEnglishName("postScriptName");
				if (!postScriptName) postScriptName = englishFamilyName.replace(/\s/g, "") + "-" + englishStyleName;
				const names = {};
				for (let n in font.names) names[n] = font.names[n];
				names.unicode = names.unicode || {};
				names.macintosh = names.macintosh || {};
				names.windows = names.windows || {};
				const fontNamesUnicode = font.names.unicode || {};
				const fontNamesMacintosh = font.names.macintosh || {};
				const fontNamesWindows = font.names.windows || {};
				for (const platform in names) {
					names[platform] = names[platform] || {};
					if (!names[platform].uniqueID) {
						const manufacturer = font.getEnglishName("manufacturer") || "";
						names[platform].uniqueID = { en: `${manufacturer}: ${englishFullName}` };
					}
					if (!names[platform].postScriptName) names[platform].postScriptName = { en: postScriptName };
				}
				if (!names.unicode.preferredFamily) names.unicode.preferredFamily = fontNamesUnicode.fontFamily || fontNamesMacintosh.fontFamily || fontNamesWindows.fontFamily;
				if (!names.macintosh.preferredFamily) names.macintosh.preferredFamily = fontNamesMacintosh.fontFamily || fontNamesUnicode.fontFamily || fontNamesWindows.fontFamily;
				if (!names.windows.preferredFamily) names.windows.preferredFamily = fontNamesWindows.fontFamily || fontNamesUnicode.fontFamily || fontNamesMacintosh.fontFamily;
				if (!names.unicode.preferredSubfamily) names.unicode.preferredSubfamily = fontNamesUnicode.fontSubfamily || fontNamesMacintosh.fontSubfamily || fontNamesWindows.fontSubfamily;
				if (!names.macintosh.preferredSubfamily) names.macintosh.preferredSubfamily = fontNamesMacintosh.fontSubfamily || fontNamesUnicode.fontSubfamily || fontNamesWindows.fontSubfamily;
				if (!names.windows.preferredSubfamily) names.windows.preferredSubfamily = fontNamesWindows.fontSubfamily || fontNamesUnicode.fontSubfamily || fontNamesMacintosh.fontSubfamily;
				const languageTags = [];
				const nameTable = name_default.make(names, languageTags);
				const ltagTable = languageTags.length > 0 ? ltag_default.make(languageTags) : void 0;
				const postTable = post_default.make(font);
				const cffTable = cff_default.make(font.glyphs, {
					version: font.getEnglishName("version"),
					fullName: englishFullName,
					familyName: englishFamilyName,
					weightName: englishStyleName,
					postScriptName,
					unitsPerEm: font.unitsPerEm,
					fontBBox: [
						0,
						globals.yMin,
						globals.ascender,
						globals.advanceWidthMax
					],
					topDict: font.tables.cff && font.tables.cff.topDict || {}
				});
				const metaTable = font.metas && Object.keys(font.metas).length > 0 ? meta_default.make(font.metas) : void 0;
				const tables = [
					headTable,
					hheaTable,
					maxpTable,
					os2Table,
					nameTable,
					cmapTable,
					postTable,
					cffTable,
					hmtxTable
				];
				if (ltagTable) tables.push(ltagTable);
				const optionalTables = {
					gsub: gsub_default,
					cpal: cpal_default,
					colr: colr_default,
					stat: stat_default,
					avar: avar_default,
					cvar: cvar_default,
					fvar: fvar_default,
					gvar: gvar_default,
					gasp: gasp_default,
					svg: svg_default
				};
				const optionalTableArgs = {
					avar: [font.tables.fvar],
					fvar: [font.names]
				};
				for (let tableName in optionalTables) {
					const table = font.tables[tableName];
					if (table) {
						const tableData = optionalTables[tableName].make.call(font, table, ...optionalTableArgs[tableName] || []);
						if (tableData) tables.push(tableData);
					}
				}
				if (metaTable) tables.push(metaTable);
				const sfntTable = makeSfntTable(tables);
				const checkSum = computeCheckSum(sfntTable.encode());
				const tableFields = sfntTable.fields;
				let checkSumAdjusted = false;
				for (let i = 0; i < tableFields.length; i += 1) if (tableFields[i].name === "head table") {
					tableFields[i].value.checkSumAdjustment = 2981146554 - checkSum;
					checkSumAdjusted = true;
					break;
				}
				if (!checkSumAdjusted) throw new Error("Could not find head table with checkSum to adjust.");
				return sfntTable;
			}
			var sfnt_default = {
				make: makeSfntTable,
				fontToTable: fontToSfntTable,
				computeCheckSum
			};
			function searchTag(arr, tag) {
				let imin = 0;
				let imax = arr.length - 1;
				while (imin <= imax) {
					const imid = imin + imax >>> 1;
					const val = arr[imid].tag;
					if (val === tag) return imid;
					else if (val < tag) imin = imid + 1;
					else imax = imid - 1;
				}
				return -imin - 1;
			}
			function binSearch(arr, value) {
				let imin = 0;
				let imax = arr.length - 1;
				while (imin <= imax) {
					const imid = imin + imax >>> 1;
					const val = arr[imid];
					if (val === value) return imid;
					else if (val < value) imin = imid + 1;
					else imax = imid - 1;
				}
				return -imin - 1;
			}
			function searchRange(ranges, value) {
				let range;
				let imin = 0;
				let imax = ranges.length - 1;
				while (imin <= imax) {
					const imid = imin + imax >>> 1;
					range = ranges[imid];
					const start = range.start;
					if (start === value) return range;
					else if (start < value) imin = imid + 1;
					else imax = imid - 1;
				}
				if (imin > 0) {
					range = ranges[imin - 1];
					if (value > range.end) return 0;
					return range;
				}
			}
			function Layout(font, tableName) {
				this.font = font;
				this.tableName = tableName;
			}
			Layout.prototype = {
				/**
				* Binary search an object by "tag" property
				* @instance
				* @function searchTag
				* @memberof opentype.Layout
				* @param  {Array} arr
				* @param  {string} tag
				* @return {number}
				*/
				searchTag,
				/**
				* Binary search in a list of numbers
				* @instance
				* @function binSearch
				* @memberof opentype.Layout
				* @param  {Array} arr
				* @param  {number} value
				* @return {number}
				*/
				binSearch,
				/**
				* Get or create the Layout table (GSUB, GPOS etc).
				* @param  {boolean} create - Whether to create a new one.
				* @return {Object} The GSUB or GPOS table.
				*/
				getTable: function(create) {
					let layout = this.font.tables[this.tableName];
					if (!layout && create) layout = this.font.tables[this.tableName] = this.createDefaultTable();
					return layout;
				},
				/**
				* Returns all scripts in the substitution table.
				* @instance
				* @return {Array}
				*/
				getScriptNames: function() {
					let layout = this.getTable();
					if (!layout) return [];
					return layout.scripts.map(function(script) {
						return script.tag;
					});
				},
				/**
				* Returns the best bet for a script name.
				* Returns 'DFLT' if it exists.
				* If not, returns 'latn' if it exists.
				* If neither exist, returns undefined.
				*/
				getDefaultScriptName: function() {
					let layout = this.getTable();
					if (!layout) return;
					let hasLatn = false;
					for (let i = 0; i < layout.scripts.length; i++) {
						const name = layout.scripts[i].tag;
						if (name === "DFLT") return name;
						if (name === "latn") hasLatn = true;
					}
					if (hasLatn) return "latn";
				},
				/**
				* Returns all LangSysRecords in the given script.
				* @instance
				* @param {string} [script='DFLT']
				* @param {boolean} create - forces the creation of this script table if it doesn't exist.
				* @return {Object} An object with tag and script properties.
				*/
				getScriptTable: function(script, create) {
					const layout = this.getTable(create);
					if (layout) {
						script = script || "DFLT";
						const scripts = layout.scripts;
						const pos = searchTag(layout.scripts, script);
						if (pos >= 0) return scripts[pos].script;
						else if (create) {
							const scr = {
								tag: script,
								script: {
									defaultLangSys: {
										reserved: 0,
										reqFeatureIndex: 65535,
										featureIndexes: []
									},
									langSysRecords: []
								}
							};
							scripts.splice(-1 - pos, 0, scr);
							return scr.script;
						}
					}
				},
				/**
				* Returns a language system table
				* @instance
				* @param {string} [script='DFLT']
				* @param {string} [language='dlft']
				* @param {boolean} create - forces the creation of this langSysTable if it doesn't exist.
				* @return {Object}
				*/
				getLangSysTable: function(script, language, create) {
					const scriptTable = this.getScriptTable(script, create);
					if (scriptTable) {
						if (!language || language === "dflt" || language === "DFLT") return scriptTable.defaultLangSys;
						const pos = searchTag(scriptTable.langSysRecords, language);
						if (pos >= 0) return scriptTable.langSysRecords[pos].langSys;
						else if (create) {
							const langSysRecord = {
								tag: language,
								langSys: {
									reserved: 0,
									reqFeatureIndex: 65535,
									featureIndexes: []
								}
							};
							scriptTable.langSysRecords.splice(-1 - pos, 0, langSysRecord);
							return langSysRecord.langSys;
						}
					}
				},
				/**
				* Get a specific feature table.
				* @instance
				* @param {string} [script='DFLT']
				* @param {string} [language='dlft']
				* @param {string} feature - One of the codes listed at https://www.microsoft.com/typography/OTSPEC/featurelist.htm
				* @param {boolean} create - forces the creation of the feature table if it doesn't exist.
				* @return {Object}
				*/
				getFeatureTable: function(script, language, feature, create) {
					const langSysTable2 = this.getLangSysTable(script, language, create);
					if (langSysTable2) {
						let featureRecord;
						const featIndexes = langSysTable2.featureIndexes;
						const allFeatures = this.font.tables[this.tableName].features;
						for (let i = 0; i < featIndexes.length; i++) {
							featureRecord = allFeatures[featIndexes[i]];
							if (featureRecord.tag === feature) return featureRecord.feature;
						}
						if (create) {
							const index = allFeatures.length;
							check_default.assert(index === 0 || feature >= allFeatures[index - 1].tag, "Features must be added in alphabetical order.");
							featureRecord = {
								tag: feature,
								feature: {
									params: 0,
									lookupListIndexes: []
								}
							};
							allFeatures.push(featureRecord);
							featIndexes.push(index);
							return featureRecord.feature;
						}
					}
				},
				/**
				* Get the lookup tables of a given type for a script/language/feature.
				* @instance
				* @param {string} [script='DFLT']
				* @param {string} [language='dlft']
				* @param {string} feature - 4-letter feature code
				* @param {number} lookupType - 1 to 9
				* @param {boolean} create - forces the creation of the lookup table if it doesn't exist, with no subtables.
				* @return {Object[]}
				*/
				getLookupTables: function(script, language, feature, lookupType, create) {
					const featureTable = this.getFeatureTable(script, language, feature, create);
					const tables = [];
					if (featureTable) {
						let lookupTable;
						const lookupListIndexes = featureTable.lookupListIndexes;
						const allLookups = this.font.tables[this.tableName].lookups;
						for (let i = 0; i < lookupListIndexes.length; i++) {
							lookupTable = allLookups[lookupListIndexes[i]];
							if (lookupTable.lookupType === lookupType) tables.push(lookupTable);
						}
						if (tables.length === 0 && create) {
							lookupTable = {
								lookupType,
								lookupFlag: 0,
								subtables: [],
								markFilteringSet: void 0
							};
							const index = allLookups.length;
							allLookups.push(lookupTable);
							lookupListIndexes.push(index);
							return [lookupTable];
						}
					}
					return tables;
				},
				/**
				* Find a glyph in a class definition table
				* https://docs.microsoft.com/en-us/typography/opentype/spec/chapter2#class-definition-table
				* @param {object} classDefTable - an OpenType Layout class definition table
				* @param {number} glyphIndex - the index of the glyph to find
				* @returns {number} -1 if not found
				*/
				getGlyphClass: function(classDefTable, glyphIndex) {
					switch (classDefTable.format) {
						case 1:
							if (classDefTable.startGlyph <= glyphIndex && glyphIndex < classDefTable.startGlyph + classDefTable.classes.length) return classDefTable.classes[glyphIndex - classDefTable.startGlyph];
							return 0;
						case 2: {
							const range = searchRange(classDefTable.ranges, glyphIndex);
							return range ? range.classId : 0;
						}
					}
				},
				/**
				* Find a glyph in a coverage table
				* https://docs.microsoft.com/en-us/typography/opentype/spec/chapter2#coverage-table
				* @param {object} coverageTable - an OpenType Layout coverage table
				* @param {number} glyphIndex - the index of the glyph to find
				* @returns {number} -1 if not found
				*/
				getCoverageIndex: function(coverageTable, glyphIndex) {
					switch (coverageTable.format) {
						case 1: {
							const index = binSearch(coverageTable.glyphs, glyphIndex);
							return index >= 0 ? index : -1;
						}
						case 2: {
							const range = searchRange(coverageTable.ranges, glyphIndex);
							return range ? range.index + glyphIndex - range.start : -1;
						}
					}
				},
				/**
				* Returns the list of glyph indexes of a coverage table.
				* Format 1: the list is stored raw
				* Format 2: compact list as range records.
				* @instance
				* @param  {Object} coverageTable
				* @return {Array}
				*/
				expandCoverage: function(coverageTable) {
					if (coverageTable.format === 1) return coverageTable.glyphs;
					else {
						const glyphs = [];
						const ranges = coverageTable.ranges;
						for (let i = 0; i < ranges.length; i++) {
							const range = ranges[i];
							const start = range.start;
							const end = range.end;
							for (let j = start; j <= end; j++) glyphs.push(j);
						}
						return glyphs;
					}
				}
			};
			var layout_default = Layout;
			function Position(font) {
				layout_default.call(this, font, "gpos");
			}
			Position.prototype = layout_default.prototype;
			Position.prototype.init = function() {
				const script = this.getDefaultScriptName();
				this.defaultKerningTables = this.getKerningTables(script);
			};
			Position.prototype.getKerningValue = function(kerningLookups, leftIndex, rightIndex) {
				for (let i = 0; i < kerningLookups.length; i++) {
					const subtables = kerningLookups[i].subtables;
					for (let j = 0; j < subtables.length; j++) {
						const subtable = subtables[j];
						const covIndex = this.getCoverageIndex(subtable.coverage, leftIndex);
						if (covIndex < 0) continue;
						switch (subtable.posFormat) {
							case 1: {
								let pairSet = subtable.pairSets[covIndex];
								for (let k = 0; k < pairSet.length; k++) {
									let pair = pairSet[k];
									if (pair.secondGlyph === rightIndex) return pair.value1 && pair.value1.xAdvance || 0;
								}
								break;
							}
							case 2: {
								const class1 = this.getGlyphClass(subtable.classDef1, leftIndex);
								const class2 = this.getGlyphClass(subtable.classDef2, rightIndex);
								const pair = subtable.classRecords[class1][class2];
								return pair.value1 && pair.value1.xAdvance || 0;
							}
						}
					}
				}
				return 0;
			};
			Position.prototype.getKerningTables = function(script, language) {
				if (this.font.tables.gpos) return this.getLookupTables(script, language, "kern", 2);
			};
			var position_default = Position;
			function arraysEqual(ar1, ar2) {
				const n = ar1.length;
				if (n !== ar2.length) return false;
				for (let i = 0; i < n; i++) if (ar1[i] !== ar2[i]) return false;
				return true;
			}
			function binarySearch(array, key, value) {
				let low = 0, high = array.length - 1;
				let result = null;
				while (low <= high) {
					const mid = Math.floor((low + high) / 2);
					const record = array[mid];
					const recordValue = record[key];
					if (recordValue < value) low = mid + 1;
					else if (recordValue > value) high = mid - 1;
					else {
						result = record;
						break;
					}
				}
				return result;
			}
			function binarySearchIndex(array, key, value) {
				let low = 0, high = array.length - 1;
				while (low <= high) {
					const mid = Math.floor((low + high) / 2);
					const element = array[mid];
					if (element[key] < value) low = mid + 1;
					else if (element[key] > value) high = mid - 1;
					else return mid;
				}
				return -1;
			}
			function binarySearchInsert(array, key, value) {
				let low = 0, high = array.length;
				const compare = (a, b) => a[key] - b[key];
				while (low < high) {
					const mid = low + high >>> 1;
					if (compare(array[mid], value) < 0) low = mid + 1;
					else high = mid;
				}
				array.splice(low, 0, value);
				return low;
			}
			function isGzip(buf) {
				return buf[0] === 31 && buf[1] === 139 && buf[2] === 8;
			}
			function unGzip(gzip) {
				const data = new DataView(gzip.buffer, gzip.byteOffset, gzip.byteLength);
				let start = 10;
				const end = gzip.byteLength - 8;
				const flg = data.getInt8(3);
				if (flg & 4) start += 2 + data.getUint16(start, true);
				if (flg & 8) {
					while (start < end) if (gzip[start++] === 0) break;
				}
				if (flg & 16) {
					while (start < end) if (gzip[start++] === 0) break;
				}
				if (flg & 2) start += 2;
				if (start >= end) throw new Error("Can't find compressed blocks");
				const isize = data.getUint32(data.byteLength - 4, true);
				return tinf_uncompress(gzip.subarray(start, end), new Uint8Array(isize));
			}
			function copyPoint(p) {
				return {
					x: p.x,
					y: p.y,
					onCurve: p.onCurve,
					lastPointOfContour: p.lastPointOfContour
				};
			}
			function copyComponent(c) {
				return {
					glyphIndex: c.glyphIndex,
					xScale: c.xScale,
					scale01: c.scale01,
					scale10: c.scale10,
					yScale: c.yScale,
					dx: c.dx,
					dy: c.dy
				};
			}
			function Substitution(font) {
				layout_default.call(this, font, "gsub");
			}
			function getSubstFormat(lookupTable, format, defaultSubtable) {
				const subtables = lookupTable.subtables;
				for (let i = 0; i < subtables.length; i++) {
					const subtable = subtables[i];
					if (subtable.substFormat === format) return subtable;
				}
				if (defaultSubtable) {
					subtables.push(defaultSubtable);
					return defaultSubtable;
				}
			}
			Substitution.prototype = layout_default.prototype;
			Substitution.prototype.createDefaultTable = function() {
				return {
					version: 1,
					scripts: [{
						tag: "DFLT",
						script: {
							defaultLangSys: {
								reserved: 0,
								reqFeatureIndex: 65535,
								featureIndexes: []
							},
							langSysRecords: []
						}
					}],
					features: [],
					lookups: []
				};
			};
			Substitution.prototype.getSingle = function(feature, script, language) {
				const substitutions = [];
				const lookupTables = this.getLookupTables(script, language, feature, 1);
				for (let idx = 0; idx < lookupTables.length; idx++) {
					const subtables = lookupTables[idx].subtables;
					for (let i = 0; i < subtables.length; i++) {
						const subtable = subtables[i];
						const glyphs = this.expandCoverage(subtable.coverage);
						let j;
						if (subtable.substFormat === 1) {
							const delta = subtable.deltaGlyphId;
							for (j = 0; j < glyphs.length; j++) {
								const glyph = glyphs[j];
								substitutions.push({
									sub: glyph,
									by: glyph + delta
								});
							}
						} else {
							const substitute = subtable.substitute;
							for (j = 0; j < glyphs.length; j++) substitutions.push({
								sub: glyphs[j],
								by: substitute[j]
							});
						}
					}
				}
				return substitutions;
			};
			Substitution.prototype.getMultiple = function(feature, script, language) {
				const substitutions = [];
				const lookupTables = this.getLookupTables(script, language, feature, 2);
				for (let idx = 0; idx < lookupTables.length; idx++) {
					const subtables = lookupTables[idx].subtables;
					for (let i = 0; i < subtables.length; i++) {
						const subtable = subtables[i];
						const glyphs = this.expandCoverage(subtable.coverage);
						let j;
						for (j = 0; j < glyphs.length; j++) {
							const glyph = glyphs[j];
							const replacements = subtable.sequences[j];
							substitutions.push({
								sub: glyph,
								by: replacements
							});
						}
					}
				}
				return substitutions;
			};
			Substitution.prototype.getAlternates = function(feature, script, language) {
				const alternates = [];
				const lookupTables = this.getLookupTables(script, language, feature, 3);
				for (let idx = 0; idx < lookupTables.length; idx++) {
					const subtables = lookupTables[idx].subtables;
					for (let i = 0; i < subtables.length; i++) {
						const subtable = subtables[i];
						const glyphs = this.expandCoverage(subtable.coverage);
						const alternateSets = subtable.alternateSets;
						for (let j = 0; j < glyphs.length; j++) alternates.push({
							sub: glyphs[j],
							by: alternateSets[j]
						});
					}
				}
				return alternates;
			};
			Substitution.prototype.getLigatures = function(feature, script, language) {
				const ligatures = [];
				const lookupTables = this.getLookupTables(script, language, feature, 4);
				for (let idx = 0; idx < lookupTables.length; idx++) {
					const subtables = lookupTables[idx].subtables;
					for (let i = 0; i < subtables.length; i++) {
						const subtable = subtables[i];
						const glyphs = this.expandCoverage(subtable.coverage);
						const ligatureSets = subtable.ligatureSets;
						for (let j = 0; j < glyphs.length; j++) {
							const startGlyph = glyphs[j];
							const ligSet = ligatureSets[j];
							for (let k = 0; k < ligSet.length; k++) {
								const lig = ligSet[k];
								ligatures.push({
									sub: [startGlyph].concat(lig.components),
									by: lig.ligGlyph
								});
							}
						}
					}
				}
				return ligatures;
			};
			Substitution.prototype.addSingle = function(feature, substitution, script, language) {
				const lookupTable = this.getLookupTables(script, language, feature, 1, true)[0];
				const subtable = getSubstFormat(lookupTable, 2, {
					substFormat: 2,
					coverage: {
						format: 1,
						glyphs: []
					},
					substitute: []
				});
				check_default.assert(subtable.coverage.format === 1, "Single: unable to modify coverage table format " + subtable.coverage.format);
				const coverageGlyph = substitution.sub;
				let pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
				if (pos < 0) {
					pos = -1 - pos;
					subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
					subtable.substitute.splice(pos, 0, 0);
				}
				subtable.substitute[pos] = substitution.by;
			};
			Substitution.prototype.addMultiple = function(feature, substitution, script, language) {
				check_default.assert(substitution.by instanceof Array && substitution.by.length > 1, "Multiple: \"by\" must be an array of two or more ids");
				const lookupTable = this.getLookupTables(script, language, feature, 2, true)[0];
				const subtable = getSubstFormat(lookupTable, 1, {
					substFormat: 1,
					coverage: {
						format: 1,
						glyphs: []
					},
					sequences: []
				});
				check_default.assert(subtable.coverage.format === 1, "Multiple: unable to modify coverage table format " + subtable.coverage.format);
				const coverageGlyph = substitution.sub;
				let pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
				if (pos < 0) {
					pos = -1 - pos;
					subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
					subtable.sequences.splice(pos, 0, 0);
				}
				subtable.sequences[pos] = substitution.by;
			};
			Substitution.prototype.addAlternate = function(feature, substitution, script, language) {
				const lookupTable = this.getLookupTables(script, language, feature, 3, true)[0];
				const subtable = getSubstFormat(lookupTable, 1, {
					substFormat: 1,
					coverage: {
						format: 1,
						glyphs: []
					},
					alternateSets: []
				});
				check_default.assert(subtable.coverage.format === 1, "Alternate: unable to modify coverage table format " + subtable.coverage.format);
				const coverageGlyph = substitution.sub;
				let pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
				if (pos < 0) {
					pos = -1 - pos;
					subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
					subtable.alternateSets.splice(pos, 0, 0);
				}
				subtable.alternateSets[pos] = substitution.by;
			};
			Substitution.prototype.addLigature = function(feature, ligature, script, language) {
				const lookupTable = this.getLookupTables(script, language, feature, 4, true)[0];
				let subtable = lookupTable.subtables[0];
				if (!subtable) {
					subtable = {
						substFormat: 1,
						coverage: {
							format: 1,
							glyphs: []
						},
						ligatureSets: []
					};
					lookupTable.subtables[0] = subtable;
				}
				check_default.assert(subtable.coverage.format === 1, "Ligature: unable to modify coverage table format " + subtable.coverage.format);
				const coverageGlyph = ligature.sub[0];
				const ligComponents = ligature.sub.slice(1);
				const ligatureTable = {
					ligGlyph: ligature.by,
					components: ligComponents
				};
				let pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
				if (pos >= 0) {
					const ligatureSet = subtable.ligatureSets[pos];
					for (let i = 0; i < ligatureSet.length; i++) if (arraysEqual(ligatureSet[i].components, ligComponents)) return;
					ligatureSet.push(ligatureTable);
				} else {
					pos = -1 - pos;
					subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
					subtable.ligatureSets.splice(pos, 0, [ligatureTable]);
				}
			};
			Substitution.prototype.getFeature = function(feature, script, language) {
				if (/ss\d\d/.test(feature)) return this.getSingle(feature, script, language);
				switch (feature) {
					case "aalt":
					case "salt": return this.getSingle(feature, script, language).concat(this.getAlternates(feature, script, language));
					case "dlig":
					case "liga":
					case "rlig": return this.getLigatures(feature, script, language);
					case "ccmp": return this.getMultiple(feature, script, language).concat(this.getLigatures(feature, script, language));
					case "stch": return this.getMultiple(feature, script, language);
				}
			};
			Substitution.prototype.add = function(feature, sub, script, language) {
				if (/ss\d\d/.test(feature)) return this.addSingle(feature, sub, script, language);
				switch (feature) {
					case "aalt":
					case "salt":
						if (typeof sub.by === "number") return this.addSingle(feature, sub, script, language);
						return this.addAlternate(feature, sub, script, language);
					case "dlig":
					case "liga":
					case "rlig": return this.addLigature(feature, sub, script, language);
					case "ccmp":
						if (sub.by instanceof Array) return this.addMultiple(feature, sub, script, language);
						return this.addLigature(feature, sub, script, language);
				}
			};
			var substitution_default = Substitution;
			var PaletteManager = class {
				/**
				* @type {integer} CPAL color used to (pre)fill unset colors in a palette.
				* Format 0xBBGGRRAA
				*/
				/**
				* 
				* @param {opentype.Font} font 
				*/
				constructor(font) {
					this.defaultValue = 255;
					this.font = font;
				}
				/**
				* Returns the font's cpal table object if present
				* @returns {Object}
				*/
				cpal() {
					if (this.font.tables && this.font.tables.cpal) return this.font.tables.cpal;
					return false;
				}
				/**
				* Returns an array of arrays of color values for each palette, optionally in a specified color format
				* @param {string} colorFormat 
				* @returns {Array<Array>}
				*/
				getAll(colorFormat) {
					const palettes = [];
					const cpal = this.cpal();
					if (!cpal) return palettes;
					for (let i = 0; i < cpal.colorRecordIndices.length; i++) {
						const startIndex = cpal.colorRecordIndices[i];
						const paletteColors = [];
						for (let j = startIndex; j < startIndex + cpal.numPaletteEntries; j++) paletteColors.push(formatColor(cpal.colorRecords[j], colorFormat || "hexa"));
						palettes.push(paletteColors);
					}
					return palettes;
				}
				/**
				* Converts a color value string or array of color value strings to CPAL integer color value(s)
				* @param {string|Array<string></string>} color 
				* @returns {integer}
				*/
				toCPALcolor(color) {
					if (Array.isArray(color)) return color.map((color2) => parseColor(color2, "raw"));
					return parseColor(color, "raw");
				}
				/**
				* Fills a set of palette colors (from palette index, or a provided array of CPAL color values) with a set of colors, falling back to the default color value, until a given count
				* @param {Array<string>|integer} palette Palette index integer or Array of colors to be filled
				* @param {Array<string|integer>} colors Colors to fill the palette with
				* @param {integer} _colorCount Number of colors to fill the palette with, defaults to the value of the numPaletteEntries field. Used internally by extend() and shouldn't be set manually
				* @returns 
				*/
				fillPalette(palette, colors = [], _colorCount = this.cpal().numPaletteEntries) {
					palette = Number.isInteger(palette) ? this.get(palette, "raw") : palette;
					return Object.assign(Array(_colorCount).fill(this.defaultValue), this.toCPALcolor(palette).concat(this.toCPALcolor(colors)));
				}
				/**
				* Extend existing palettes and numPaletteEntries by a number of color slots
				* @param {integer} num number of additional color slots to add to all palettes
				*/
				extend(num) {
					if (this.ensureCPAL(Array(num).fill(this.defaultValue))) return;
					const cpal = this.cpal();
					const newCount = cpal.numPaletteEntries + num;
					const palettes = this.getAll().map((palette) => this.fillPalette(palette, [], newCount));
					cpal.numPaletteEntries = newCount;
					cpal.colorRecords = this.toCPALcolor(palettes.flat());
					this.updateIndices();
				}
				/**
				* Get a specific palette by its zero-based index
				* @param {integer} paletteIndex 
				* @param {string} [colorFormat='hexa']
				* @returns {Array}
				*/
				get(paletteIndex, colorFormat = "hexa") {
					return this.getAll(colorFormat)[paletteIndex] || null;
				}
				/**
				* Get a color from a specific palette by its zero-based index
				* @param {integer} index 
				* @param {integer} paletteIndex
				* @param {string} [colorFormat ='hexa']
				* @returns 
				*/
				getColor(index, paletteIndex = 0, colorFormat = "hexa") {
					return getPaletteColor(this.font, index, paletteIndex, colorFormat);
				}
				/**
				* Set one or more colors on a specific palette by its zero-based index
				* @param {integer} index zero-based color index to start filling from
				* @param {string|integer|Array<string|integer>} color color value or array of color values
				* @param {integer} paletteIndex
				* @returns 
				*/
				setColor(index, colors, paletteIndex = 0) {
					index = parseInt(index);
					paletteIndex = parseInt(paletteIndex);
					let palettes = this.getAll("raw");
					let palette = palettes[paletteIndex];
					if (!palette) throw Error(`paletteIndex ${paletteIndex} out of range`);
					const cpal = this.cpal();
					const colorCount = cpal.numPaletteEntries;
					if (!Array.isArray(colors)) colors = [colors];
					if (colors.length + index > colorCount) {
						this.extend(colors.length + index - colorCount);
						palettes = this.getAll("raw");
						palette = palettes[paletteIndex];
					}
					for (let i = 0; i < colors.length; i++) palette[i + index] = this.toCPALcolor(colors[i]);
					cpal.colorRecords = palettes.flat();
					this.updateIndices();
				}
				/**
				* Add a new palette. 
				* @param {Array} colors (optional) colors to add to the palette, differences to existing palettes will be filled with the defaultValue.
				* @returns 
				*/
				add(colors) {
					if (this.ensureCPAL(colors)) return;
					const cpal = this.cpal();
					const colorCount = cpal.numPaletteEntries;
					if (colors && colors.length) {
						colors = this.toCPALcolor(colors);
						if (colors.length > colorCount) this.extend(colors.length - colorCount);
						else if (colors.length < colorCount) colors = this.fillPalette(colors);
						cpal.colorRecordIndices.push(cpal.colorRecords.length);
						cpal.colorRecords.push(...colors);
					} else {
						cpal.colorRecordIndices.push(cpal.colorRecords.length);
						cpal.colorRecords.push(...Array(colorCount).fill(this.defaultValue));
					}
				}
				/**
				* deletes a palette by its zero-based index
				* @param {integer} paletteIndex 
				*/
				delete(paletteIndex) {
					const palettes = this.getAll("raw");
					delete palettes[paletteIndex];
					const cpal = this.cpal();
					cpal.colorRecordIndices.pop();
					cpal.colorRecords = palettes.flat();
				}
				/**
				* Deletes a specific color index in all palettes and updates all layers using that color with the replacement index
				* @param {integer} colorIndex index of the color that should be deleted
				* @param {integer} replacementIndex index (according to the palette before deletion) of the color to replace in layers using the color to be to deleted
				*/
				deleteColor(colorIndex, replacementIndex) {
					if (colorIndex === replacementIndex) throw Error("replacementIndex cannot be the same as colorIndex");
					const cpal = this.cpal();
					const palettes = this.getAll("raw");
					const updatedPalettes = [];
					if (replacementIndex > cpal.numPaletteEntries - 1) throw Error(`Replacement index out of range: numPaletteEntries after deletion: ${cpal.numPaletteEntries - 1}, replacementIndex: ${replacementIndex})`);
					for (let i = 0; i < palettes.length; i++) {
						const updatedPalette = palettes[i].filter((color, index) => index !== colorIndex);
						updatedPalettes.push(updatedPalette);
					}
					const colrTable = this.font.tables.colr;
					if (colrTable) {
						const layerRecords = colrTable.layerRecords;
						for (let i = 0; i < layerRecords.length; i++) {
							const currentIndex = layerRecords[i].paletteIndex;
							if (currentIndex > colorIndex) {
								const shiftAmount = 1;
								layerRecords[i].paletteIndex -= shiftAmount;
							} else if (currentIndex === colorIndex) {
								let replacementShift = 0;
								for (let j = 0; j < palettes.length; j++) if (replacementIndex > colorIndex && replacementIndex <= colorIndex + palettes[j].length) {
									replacementShift++;
									break;
								}
								layerRecords[i].paletteIndex = replacementIndex - replacementShift;
							}
						}
						this.font.tables.colr = {
							...colrTable,
							layerRecords
						};
					}
					const flattenedPalettes = updatedPalettes.flat();
					for (let i = 0; i < palettes.length; i++) cpal.colorRecordIndices[i] -= i;
					cpal.numPaletteEntries = Math.max(0, cpal.numPaletteEntries - 1);
					cpal.colorRecords = this.toCPALcolor(flattenedPalettes);
				}
				/**
				* Makes sure that the CPAL table exists and is populated with default values.
				* @param {Array} colors (optional) colors to populate on creation
				* @returns {Boolean} true if it was created, false if it already existed.
				*/
				ensureCPAL(colors) {
					if (!this.cpal()) {
						if (!colors || !colors.length) colors = [this.defaultValue];
						else colors = this.toCPALcolor(colors);
						this.font.tables.cpal = {
							version: 0,
							numPaletteEntries: colors.length,
							colorRecords: colors,
							colorRecordIndices: [0]
						};
						return true;
					}
					return false;
				}
				/**
				* Mainly used internally. Recalculates the colorRecordIndices array based on the numPaletteEntries and number of palettes
				*/
				updateIndices() {
					const cpal = this.cpal();
					const paletteCount = Math.ceil(cpal.colorRecords.length / cpal.numPaletteEntries);
					cpal.colorRecordIndices = [];
					for (let i = 0; i < paletteCount; i++) cpal.colorRecordIndices.push(i * cpal.numPaletteEntries);
				}
			};
			var LayerManager = class {
				constructor(font) {
					this.font = font;
				}
				/**
				* Mainly used internally. Ensures that the COLR table exists and is populated with default values
				* @returns the LayerManager's font instance for chaining
				*/
				ensureCOLR() {
					if (!this.font.tables.colr) this.font.tables.colr = {
						version: 0,
						baseGlyphRecords: [],
						layerRecords: []
					};
					return this.font;
				}
				/**
				* Gets the layers for a specific glyph
				* @param {integer} glyphIndex
				* @returns {Array<Object>} array of layer objects {glyph, paletteIndex}
				*/
				get(glyphIndex) {
					const font = this.font;
					const layers = [];
					const colr = font.tables.colr;
					const cpal = font.tables.cpal;
					if (!colr || !cpal) return layers;
					const baseGlyph = binarySearch(colr.baseGlyphRecords, "glyphID", glyphIndex);
					if (!baseGlyph) return layers;
					const firstIndex = baseGlyph.firstLayerIndex;
					const numLayers = baseGlyph.numLayers;
					for (let l = 0; l < numLayers; l++) {
						const layer = colr.layerRecords[firstIndex + l];
						layers.push({
							glyph: font.glyphs.get(layer.glyphID),
							paletteIndex: layer.paletteIndex
						});
					}
					return layers;
				}
				/**
				* Adds one or more layers to a glyph, at the end or at a specific position.
				* @param {integer} glyphIndex glyph index to add the layer(s) to.
				* @param {Array|Object} layers layer object {glyph, paletteIndex}/{glyphID, paletteIndex} or array of layer objects.
				* @param {integer?} position position to insert the layers at (will default to adding at the end).
				*/
				add(glyphIndex, layers, position) {
					const currentLayers = this.get(glyphIndex);
					layers = Array.isArray(layers) ? layers : [layers];
					if (position === void 0 || position === Infinity || position > currentLayers.length) position = currentLayers.length;
					else if (position < 0) {
						position = currentLayers.length + 1 + position % (currentLayers.length + 1);
						if (position >= currentLayers.length + 1) position -= currentLayers.length + 1;
					}
					const newLayers = [];
					for (let i = 0; i < position; i++) {
						const glyphID = Number.isInteger(currentLayers[i].glyph) ? currentLayers[i].glyph : currentLayers[i].glyph.index;
						newLayers.push({
							glyphID,
							paletteIndex: currentLayers[i].paletteIndex
						});
					}
					for (const layer of layers) {
						const glyphID = Number.isInteger(layer.glyph) ? layer.glyph : layer.glyph.index;
						newLayers.push({
							glyphID,
							paletteIndex: layer.paletteIndex
						});
					}
					for (let i = position; i < currentLayers.length; i++) {
						const glyphID = Number.isInteger(currentLayers[i].glyph) ? currentLayers[i].glyph : currentLayers[i].glyph.index;
						newLayers.push({
							glyphID,
							paletteIndex: currentLayers[i].paletteIndex
						});
					}
					this.updateColrTable(glyphIndex, newLayers);
				}
				/**
				* Sets a color glyph layer's paletteIndex property to a new index
				* @param {integer} glyphIndex glyph in the font by zero-based glyph index
				* @param {integer} layerIndex layer in the glyph by zero-based layer index
				* @param {integer} paletteIndex new color to set for the layer by zero-based index in any palette
				*/
				setPaletteIndex(glyphIndex, layerIndex, paletteIndex) {
					let layers = this.get(glyphIndex);
					if (layers[layerIndex]) {
						layers = layers.map((layer, index) => ({
							glyphID: layer.glyph.index,
							paletteIndex: index === layerIndex ? paletteIndex : layer.paletteIndex
						}));
						this.updateColrTable(glyphIndex, layers);
					} else console.error("Invalid layer index");
				}
				/**
				* Removes one or more layers from a glyph.
				* @param {integer} glyphIndex glyph index to remove the layer(s) from
				* @param {integer} start index to remove the layer at
				* @param {integer?} end (optional) if provided, removes all layers from start index to (and including) end index
				*/
				remove(glyphIndex, start, end = start) {
					let currentLayers = this.get(glyphIndex);
					currentLayers = currentLayers.map((layer) => ({
						glyphID: layer.glyph.index,
						paletteIndex: layer.paletteIndex
					}));
					currentLayers.splice(start, end - start + 1);
					this.updateColrTable(glyphIndex, currentLayers);
				}
				/**
				* Mainly used internally. Mainly used internally. Updates the colr table, adding a baseGlyphRecord if needed,
				* ensuring that it's inserted at the correct position, updating numLayers, and adjusting firstLayerIndex values
				* for all baseGlyphRecords according to any deletions or insertions.
				* @param {integer} glyphIndex 
				* @param {Array<Object>} layers array of layer objects {glyphID, paletteIndex}
				*/
				updateColrTable(glyphIndex, layers) {
					this.ensureCOLR();
					const colr = this.font.tables.colr;
					let index = binarySearchIndex(colr.baseGlyphRecords, "glyphID", glyphIndex);
					if (index === -1) {
						const newBaseGlyphRecord = {
							glyphID: glyphIndex,
							firstLayerIndex: colr.layerRecords.length,
							numLayers: 0
						};
						index = binarySearchInsert(colr.baseGlyphRecords, "glyphID", newBaseGlyphRecord);
					}
					const baseGlyphRecord = colr.baseGlyphRecords[index];
					const originalNumLayers = baseGlyphRecord.numLayers;
					const newNumLayers = layers.length;
					const layerDiff = newNumLayers - originalNumLayers;
					if (layerDiff > 0) {
						const newLayers = layers.slice(originalNumLayers).map((layer) => ({
							glyphID: layer.glyphID,
							paletteIndex: layer.paletteIndex
						}));
						colr.layerRecords.splice(baseGlyphRecord.firstLayerIndex + originalNumLayers, 0, ...newLayers);
					} else if (layerDiff < 0) colr.layerRecords.splice(baseGlyphRecord.firstLayerIndex + newNumLayers, -layerDiff);
					for (let i = 0; i < Math.min(originalNumLayers, newNumLayers); i++) colr.layerRecords[baseGlyphRecord.firstLayerIndex + i] = {
						glyphID: layers[i].glyphID,
						paletteIndex: layers[i].paletteIndex
					};
					baseGlyphRecord.numLayers = newNumLayers;
					if (layerDiff !== 0) for (let i = 0; i < colr.baseGlyphRecords.length; i++) {
						const sibling = colr.baseGlyphRecords[i];
						if (i === index || sibling.firstLayerIndex < baseGlyphRecord.firstLayerIndex) continue;
						colr.baseGlyphRecords[i].firstLayerIndex += layerDiff;
					}
				}
			};
			var SVGImageManager = class {
				/**
				* @param {opentype.Font} font
				*/
				constructor(font) {
					this.font = font;
					this.cache = /* @__PURE__ */ new WeakMap();
				}
				/**
				* @param {number} glyphIndex
				* @returns {SvgImage | undefined}
				*/
				get(glyphIndex) {
					const svgImageCacheEntry = this.getOrCreateSvgImageCacheEntry(glyphIndex);
					return svgImageCacheEntry && svgImageCacheEntry.image;
				}
				/**
				* @param {number} glyphIndex
				* @returns {Promise<SvgImage> | undefined}
				*/
				getAsync(glyphIndex) {
					const svgImageCacheEntry = this.getOrCreateSvgImageCacheEntry(glyphIndex);
					return svgImageCacheEntry && svgImageCacheEntry.promise;
				}
				/**
				* @param {number} glyphIndex
				* @returns {SVGImageCacheEntry | undefined}
				*/
				getOrCreateSvgImageCacheEntry(glyphIndex) {
					const svg = this.font.tables.svg;
					if (svg === void 0) return;
					const svgBuf = svg.get(glyphIndex);
					if (svgBuf === void 0) return;
					let svgDocCacheEntry = this.cache.get(svgBuf);
					if (svgDocCacheEntry === void 0) {
						svgDocCacheEntry = createSvgDocCacheEntry(svgBuf);
						this.cache.set(svgBuf, svgDocCacheEntry);
					}
					let svgImageCacheEntry = svgDocCacheEntry.images.get(glyphIndex);
					if (svgImageCacheEntry === void 0) {
						svgImageCacheEntry = createSvgImageCacheEntry(this.font, svgDocCacheEntry.template, glyphIndex);
						svgImageCacheEntry.promise.then((svgImage) => {
							svgImageCacheEntry.image = svgImage;
							if (typeof this.font.onGlyphUpdated === "function") try {
								this.font.onGlyphUpdated(glyphIndex);
							} catch (error) {
								console.error("font.onGlyphUpdated", glyphIndex, error);
							}
						});
						svgDocCacheEntry.images.set(glyphIndex, svgImageCacheEntry);
					}
					return svgImageCacheEntry;
				}
			};
			function createSvgDocCacheEntry(svgBuf) {
				return {
					template: decodeSvgDocument(svgBuf).then(makeSvgTemplate),
					images: /* @__PURE__ */ new Map()
				};
			}
			function createSvgImageCacheEntry(font, svgTemplatePromise, glyphIndex) {
				return {
					promise: svgTemplatePromise.then((svgTemplate) => {
						let svgText;
						if (typeof svgTemplate === "string") svgText = svgTemplate;
						else {
							svgTemplate[4] = glyphIndex;
							svgText = svgTemplate.join("");
						}
						const svgImage = makeSvgImage(svgText, font.unitsPerEm);
						return svgImage.image.decode().then(() => svgImage);
					}),
					image: void 0
				};
			}
			var decodeSvgDocument = typeof DecompressionStream === "function" ? decodeSvgDocumentWithDecompressionStream : decodeSvgDocumentWithTinyInflate;
			function decodeSvgDocumentWithTinyInflate(buf) {
				try {
					return Promise.resolve(new TextDecoder().decode(isGzip(buf) ? unGzip(buf) : buf));
				} catch (error) {
					return Promise.reject(error);
				}
			}
			function decodeSvgDocumentWithDecompressionStream(buf) {
				if (isGzip(buf)) return new Response(new Response(buf).body.pipeThrough(new DecompressionStream("gzip"))).text();
				try {
					return Promise.resolve(new TextDecoder().decode(buf));
				} catch (error) {
					return Promise.reject(error);
				}
			}
			function makeSvgTemplate(text) {
				const documentStart = text.indexOf("<svg");
				const contentStart = text.indexOf(">", documentStart + 4) + 1;
				if (/ id=['"]glyph\d+['"]/.test(text.substring(documentStart, contentStart))) return text;
				const contentEnd = text.lastIndexOf("</svg>");
				return [
					text.substring(0, contentStart),
					"<defs>",
					text.substring(contentStart, contentEnd),
					"</defs><use href=\"#glyph",
					"",
					"\"/>",
					text.substring(contentEnd)
				];
			}
			function makeSvgImage(text, unitsPerEm) {
				const svg = new DOMParser().parseFromString(text, "image/svg+xml").documentElement;
				const viewBoxVal = svg.viewBox.baseVal;
				const widthVal = svg.width.baseVal;
				const heightVal = svg.height.baseVal;
				let xScale = 1;
				let yScale = 1;
				if (viewBoxVal.width > 0 && viewBoxVal.height > 0) {
					if (widthVal.unitType === 1) {
						xScale = widthVal.valueInSpecifiedUnits / viewBoxVal.width;
						yScale = heightVal.unitType === 1 ? heightVal.valueInSpecifiedUnits / viewBoxVal.height : xScale;
					} else if (heightVal.unitType === 1) {
						yScale = heightVal.valueInSpecifiedUnits / viewBoxVal.height;
						xScale = yScale;
					} else if (unitsPerEm) {
						xScale = unitsPerEm / viewBoxVal.width;
						yScale = unitsPerEm / viewBoxVal.height;
					}
				}
				const div = document.createElement("div");
				div.style.position = "fixed";
				div.style.visibility = "hidden";
				div.appendChild(svg);
				document.body.appendChild(div);
				const bbox = svg.getBBox();
				document.body.removeChild(div);
				const leftSideBearing = (bbox.x - viewBoxVal.x) * xScale;
				const baseline = (viewBoxVal.y - bbox.y) * yScale;
				const width = bbox.width * xScale;
				const height = bbox.height * yScale;
				svg.setAttribute("viewBox", [
					bbox.x,
					bbox.y,
					bbox.width,
					bbox.height
				].join(" "));
				if (xScale !== 1) svg.setAttribute("width", width);
				if (yScale !== 1) svg.setAttribute("height", height);
				const image = new Image(width, height);
				image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.outerHTML);
				return {
					leftSideBearing,
					baseline,
					image
				};
			}
			var _resolving = /* @__PURE__ */ new WeakMap();
			function parseGlyphCoordinate(p, flag, previousValue, shortVectorBitMask, sameBitMask) {
				let v;
				if ((flag & shortVectorBitMask) > 0) {
					v = p.parseByte();
					if ((flag & sameBitMask) === 0) v = -v;
					v = previousValue + v;
				} else if ((flag & sameBitMask) > 0) v = previousValue;
				else v = previousValue + p.parseShort();
				return v;
			}
			function parseGlyph(glyph, data, start) {
				const p = new parse_default.Parser(data, start);
				glyph._numberOfContours = p.parseShort();
				glyph._xMin = p.parseShort();
				glyph._yMin = p.parseShort();
				glyph._xMax = p.parseShort();
				glyph._yMax = p.parseShort();
				let flags;
				let flag;
				if (glyph._numberOfContours > 0) {
					const endPointIndices = glyph.endPointIndices = [];
					for (let i = 0; i < glyph._numberOfContours; i += 1) endPointIndices.push(p.parseUShort());
					glyph.instructionLength = p.parseUShort();
					glyph.instructions = [];
					for (let i = 0; i < glyph.instructionLength; i += 1) glyph.instructions.push(p.parseByte());
					const numberOfCoordinates = endPointIndices[endPointIndices.length - 1] + 1;
					flags = [];
					for (let i = 0; i < numberOfCoordinates; i += 1) {
						flag = p.parseByte();
						flags.push(flag);
						if ((flag & 8) > 0) {
							const repeatCount = p.parseByte();
							for (let j = 0; j < repeatCount; j += 1) {
								flags.push(flag);
								i += 1;
							}
						}
					}
					check_default.argument(flags.length === numberOfCoordinates, "Bad flags.");
					if (endPointIndices.length > 0) {
						const points = [];
						let point;
						if (numberOfCoordinates > 0) {
							for (let i = 0; i < numberOfCoordinates; i += 1) {
								flag = flags[i];
								point = {};
								point.onCurve = !!(flag & 1);
								point.lastPointOfContour = endPointIndices.indexOf(i) >= 0;
								points.push(point);
							}
							let px = 0;
							for (let i = 0; i < numberOfCoordinates; i += 1) {
								flag = flags[i];
								point = points[i];
								point.x = parseGlyphCoordinate(p, flag, px, 2, 16);
								px = point.x;
							}
							let py = 0;
							for (let i = 0; i < numberOfCoordinates; i += 1) {
								flag = flags[i];
								point = points[i];
								point.y = parseGlyphCoordinate(p, flag, py, 4, 32);
								py = point.y;
							}
						}
						glyph.points = points;
					} else glyph.points = [];
				} else if (glyph._numberOfContours === 0) glyph.points = [];
				else {
					glyph.isComposite = true;
					glyph.points = [];
					glyph.components = [];
					let moreComponents = true;
					while (moreComponents) {
						flags = p.parseUShort();
						const component = {
							glyphIndex: p.parseUShort(),
							xScale: 1,
							scale01: 0,
							scale10: 0,
							yScale: 1,
							dx: 0,
							dy: 0
						};
						if ((flags & 1) > 0) {
							if ((flags & 2) > 0) {
								component.dx = p.parseShort();
								component.dy = p.parseShort();
							} else component.matchedPoints = [p.parseUShort(), p.parseUShort()];
						} else if ((flags & 2) > 0) {
							component.dx = p.parseChar();
							component.dy = p.parseChar();
						} else component.matchedPoints = [p.parseByte(), p.parseByte()];
						if ((flags & 8) > 0) component.xScale = component.yScale = p.parseF2Dot14();
						else if ((flags & 64) > 0) {
							component.xScale = p.parseF2Dot14();
							component.yScale = p.parseF2Dot14();
						} else if ((flags & 128) > 0) {
							component.xScale = p.parseF2Dot14();
							component.scale01 = p.parseF2Dot14();
							component.scale10 = p.parseF2Dot14();
							component.yScale = p.parseF2Dot14();
						}
						glyph.components.push(component);
						moreComponents = !!(flags & 32);
					}
					if (flags & 256) {
						glyph.instructionLength = p.parseUShort();
						glyph.instructions = [];
						for (let i = 0; i < glyph.instructionLength; i += 1) glyph.instructions.push(p.parseByte());
					}
				}
			}
			function transformPoints(points, transform) {
				const newPoints = [];
				for (let i = 0; i < points.length; i += 1) {
					const pt = points[i];
					const newPt = {
						x: transform.xScale * pt.x + transform.scale10 * pt.y + transform.dx,
						y: transform.scale01 * pt.x + transform.yScale * pt.y + transform.dy,
						onCurve: pt.onCurve,
						lastPointOfContour: pt.lastPointOfContour
					};
					newPoints.push(newPt);
				}
				return newPoints;
			}
			function getContours(points) {
				const contours = [];
				let currentContour = [];
				for (let i = 0; i < points.length; i += 1) {
					const pt = points[i];
					currentContour.push(pt);
					if (pt.lastPointOfContour) {
						contours.push(currentContour);
						currentContour = [];
					}
				}
				check_default.argument(currentContour.length === 0, "There are still points left in the current contour.");
				return contours;
			}
			function getPath(points) {
				const p = new path_default();
				if (!points) return p;
				const contours = getContours(points);
				for (let contourIndex = 0; contourIndex < contours.length; ++contourIndex) {
					const contour = contours[contourIndex];
					let curr = contour[contour.length - 1];
					let next = contour[0];
					if (curr.onCurve) p.moveTo(curr.x, curr.y);
					else if (next.onCurve) p.moveTo(next.x, next.y);
					else {
						const start = {
							x: (curr.x + next.x) * .5,
							y: (curr.y + next.y) * .5
						};
						p.moveTo(start.x, start.y);
					}
					for (let i = 0; i < contour.length; ++i) {
						curr = next;
						next = contour[(i + 1) % contour.length];
						if (curr.onCurve) p.lineTo(curr.x, curr.y);
						else {
							let next2 = next;
							if (!next.onCurve) next2 = {
								x: (curr.x + next.x) * .5,
								y: (curr.y + next.y) * .5
							};
							p.quadraticCurveTo(curr.x, curr.y, next2.x, next2.y);
						}
					}
					p.closePath();
				}
				return p;
			}
			function buildPath(glyphs, glyph) {
				if (glyph.isComposite) {
					if (!_resolving.has(glyphs)) _resolving.set(glyphs, /* @__PURE__ */ new Set());
					const resolving = _resolving.get(glyphs);
					resolving.add(glyph.index);
					try {
						for (let j = 0; j < glyph.components.length; j += 1) {
							const component = glyph.components[j];
							if (resolving.has(component.glyphIndex)) continue;
							const componentGlyph = glyphs.get(component.glyphIndex);
							componentGlyph.getPath();
							if (componentGlyph.points) {
								let transformedPoints;
								if (component.matchedPoints === void 0) transformedPoints = transformPoints(componentGlyph.points, component);
								else {
									if (component.matchedPoints[0] > glyph.points.length - 1 || component.matchedPoints[1] > componentGlyph.points.length - 1) throw Error("Matched points out of range in " + glyph.name);
									const firstPt = glyph.points[component.matchedPoints[0]];
									let secondPt = componentGlyph.points[component.matchedPoints[1]];
									const transform = {
										xScale: component.xScale,
										scale01: component.scale01,
										scale10: component.scale10,
										yScale: component.yScale,
										dx: 0,
										dy: 0
									};
									secondPt = transformPoints([secondPt], transform)[0];
									transform.dx = firstPt.x - secondPt.x;
									transform.dy = firstPt.y - secondPt.y;
									transformedPoints = transformPoints(componentGlyph.points, transform);
								}
								glyph.points = glyph.points.concat(transformedPoints);
							}
						}
					} finally {
						resolving.delete(glyph.index);
					}
				}
				return getPath(glyph.points);
			}
			function parseGlyfTableAll(data, start, loca, font) {
				const glyphs = new glyphset_default.GlyphSet(font);
				for (let i = 0; i < loca.length - 1; i += 1) {
					const offset = loca[i];
					if (offset !== loca[i + 1]) glyphs.push(i, glyphset_default.ttfGlyphLoader(font, i, parseGlyph, data, start + offset, buildPath));
					else glyphs.push(i, glyphset_default.glyphLoader(font, i));
				}
				return glyphs;
			}
			function parseGlyfTableOnLowMemory(data, start, loca, font) {
				const glyphs = new glyphset_default.GlyphSet(font);
				font._push = function(i) {
					const offset = loca[i];
					if (offset !== loca[i + 1]) glyphs.push(i, glyphset_default.ttfGlyphLoader(font, i, parseGlyph, data, start + offset, buildPath));
					else glyphs.push(i, glyphset_default.glyphLoader(font, i));
				};
				return glyphs;
			}
			function parseGlyfTable(data, start, loca, font, opt) {
				if (opt.lowMemory) return parseGlyfTableOnLowMemory(data, start, loca, font);
				else return parseGlyfTableAll(data, start, loca, font);
			}
			var glyf_default = {
				getPath,
				parse: parseGlyfTable
			};
			var VariationProcessor = class {
				constructor(font) {
					this.font = font;
				}
				/**
				* Modifies a coords object to make sure that tags have a length of 4
				* @param {Object} coords - variation coordinates
				*/
				normalizeCoordTags(coords) {
					for (const tag in coords) if (tag.length < 4) {
						const padded = tag.padEnd(4, " ");
						coords[padded] === void 0 && (coords[padded] = coords[tag]);
						delete coords[tag];
					}
				}
				/**
				* Normalizes the coordinates from the axis ranges to a range of -1 to 1.
				* @param {Object} coords - The coordinates object to normalize.
				* @returns {Array<number>} The normalized coordinates as an array
				*/
				getNormalizedCoords(coords) {
					if (!coords) coords = this.font.variation.get();
					let normalized = [];
					this.normalizeCoordTags(coords);
					for (let i = 0; i < this.fvar().axes.length; i++) {
						const axis = this.fvar().axes[i];
						let tagValue = coords[axis.tag];
						if (tagValue === void 0) tagValue = axis.defaultValue;
						if (tagValue < axis.defaultValue) normalized.push((tagValue - axis.defaultValue + Number.EPSILON) / (axis.defaultValue - axis.minValue + Number.EPSILON));
						else normalized.push((tagValue - axis.defaultValue + Number.EPSILON) / (axis.maxValue - axis.defaultValue + Number.EPSILON));
					}
					if (this.avar()) for (let i = 0; i < this.avar().axisSegmentMaps.length; i++) {
						let segment = this.avar().axisSegmentMaps[i];
						for (let j = 0; j < segment.axisValueMaps.length; j++) {
							let pair = segment.axisValueMaps[j];
							if (j >= 1 && normalized[i] < pair.fromCoordinate) {
								let prev = segment.axisValueMaps[j - 1];
								normalized[i] = ((normalized[i] - prev.fromCoordinate) * (pair.toCoordinate - prev.toCoordinate) + Number.EPSILON) / (pair.fromCoordinate - prev.fromCoordinate + Number.EPSILON) + prev.toCoordinate;
								break;
							}
						}
					}
					return normalized;
				}
				/**
				* Interpolates points within a glyph if deltas are not provided for all points.
				* @param {Array<Object>} points - The points to be interpolated.
				* @param {Array<Object>} glyphPoints - Reference points from the glyph.
				* @param {Object} deltaMap - A map indicating which points have deltas.
				*/
				interpolatePoints(points, glyphPoints, deltaMap) {
					if (points.length === 0) return;
					let pointIndex = 0;
					while (pointIndex < points.length) {
						let firstPoint = pointIndex;
						let endPoint = pointIndex;
						let point = points[endPoint];
						while (!point.lastPointOfContour) point = points[++endPoint];
						while (pointIndex <= endPoint && !deltaMap[pointIndex]) pointIndex++;
						if (pointIndex > endPoint) continue;
						let firstDelta = pointIndex;
						let curDelta = pointIndex;
						pointIndex++;
						while (pointIndex <= endPoint) {
							if (deltaMap[pointIndex]) {
								this.deltaInterpolate(curDelta + 1, pointIndex - 1, curDelta, pointIndex, glyphPoints, points);
								curDelta = pointIndex;
							}
							pointIndex++;
						}
						if (curDelta === firstDelta) this.deltaShift(firstPoint, endPoint, curDelta, glyphPoints, points);
						else {
							this.deltaInterpolate(curDelta + 1, endPoint, curDelta, firstDelta, glyphPoints, points);
							if (firstDelta > 0) this.deltaInterpolate(firstPoint, firstDelta - 1, curDelta, firstDelta, glyphPoints, points);
						}
						pointIndex = endPoint + 1;
					}
				}
				/**
				* Interpolates delta values between two points.
				* @param {number} p1 - Start point index for interpolation.
				* @param {number} p2 - End point index for interpolation.
				* @param {number} ref1 - Reference point index for the start delta.
				* @param {number} ref2 - Reference point index for the end delta.
				* @param {Array<Object>} glyphPoints - Reference points from the glyph.
				* @param {Array<Object>} points - The points to be adjusted.
				*/
				deltaInterpolate(p1, p2, ref1, ref2, glyphPoints, points) {
					if (p1 > p2) return;
					let iterable = ["x", "y"];
					for (let i = 0; i < iterable.length; i++) {
						let k = iterable[i];
						if (glyphPoints[ref1][k] > glyphPoints[ref2][k]) {
							var p = ref1;
							ref1 = ref2;
							ref2 = p;
						}
						let in1 = glyphPoints[ref1][k];
						let in2 = glyphPoints[ref2][k];
						let out1 = points[ref1][k];
						let out2 = points[ref2][k];
						if (in1 !== in2 || out1 === out2) {
							let scale = in1 === in2 ? 0 : (out2 - out1) / (in2 - in1);
							for (let p3 = p1; p3 <= p2; p3++) {
								let out = glyphPoints[p3][k];
								if (out <= in1) out += out1 - in1;
								else if (out >= in2) out += out2 - in2;
								else out = out1 + (out - in1) * scale;
								points[p3][k] = out;
							}
						}
					}
				}
				/**
				* Applies a delta shift to a range of points based on a reference point.
				* @param {number} p1 - Start point index for shifting.
				* @param {number} p2 - End point index for shifting.
				* @param {number} ref - Reference point index.
				* @param {Array<Object>} glyphPoints - Reference points from the glyph.
				* @param {Array<Object>} points - The points to be shifted.
				*/
				deltaShift(p1, p2, ref, glyphPoints, points) {
					let deltaX = points[ref].x - glyphPoints[ref].x;
					let deltaY = points[ref].y - glyphPoints[ref].y;
					if (deltaX === 0 && deltaY === 0) return;
					for (let p = p1; p <= p2; p++) if (p !== ref) {
						points[p].x += deltaX;
						points[p].y += deltaY;
					}
				}
				/**
				* Transforms glyph components based on variation data.
				* @param {Glyph} glyph - The composite glyph to transform.
				* @param {Array<Object>} transformedPoints - Points that are already transformed.
				* @param {Object} coords - Variation coordinates.
				* @param {Array<number>} tuplePoints - Points that are part of the tuple.
				* @param {Object} header - Header information from the variation data.
				* @param {number} factor - The scaling factor for the transformation.
				*/
				transformComponents(glyph, transformedPoints, coords, tuplePoints, header, factor) {
					let pointsIndex = 0;
					for (let c = 0; c < glyph.components.length; c++) {
						const component = glyph.components[c];
						const componentGlyph = this.font.glyphs.get(component.glyphIndex);
						const componentTransform = copyComponent(component);
						const deltaIndex = tuplePoints.indexOf(c);
						if (deltaIndex > -1) {
							componentTransform.dx += Math.round(header.deltas[deltaIndex] * factor);
							componentTransform.dy += Math.round(header.deltasY[deltaIndex] * factor);
						}
						const transformedComponentPoints = transformPoints(this.getTransform(componentGlyph, coords).points, componentTransform);
						transformedPoints.splice(pointsIndex, transformedComponentPoints.length, ...transformedComponentPoints);
						pointsIndex += componentGlyph.points.length;
					}
				}
				applyTupleVariationStore(variationData, points, coords, flavor = "gvar", args = {}) {
					if (!coords) coords = this.font.variation.get();
					const normalizedCoords = this.getNormalizedCoords(coords);
					const { headers, sharedPoints } = variationData;
					const axisCount = this.fvar().axes.length;
					let transformedPoints;
					if (flavor === "gvar") transformedPoints = points.map(copyPoint);
					else if (flavor === "cvar") transformedPoints = [...points];
					for (let h = 0; h < headers.length; h++) {
						const header = headers[h];
						let factor = 1;
						for (let a = 0; a < axisCount; a++) {
							let tupleCoords = [0];
							switch (flavor) {
								case "gvar":
									tupleCoords = header.peakTuple ? header.peakTuple : this.gvar().sharedTuples[header.sharedTupleRecordsIndex];
									break;
								case "cvar": tupleCoords = header.peakTuple;
							}
							if (tupleCoords[a] === 0) continue;
							if (normalizedCoords[a] === 0) {
								factor = 0;
								break;
							}
							if (!header.intermediateStartTuple) {
								if (normalizedCoords[a] < Math.min(0, tupleCoords[a]) || normalizedCoords[a] > Math.max(0, tupleCoords[a])) {
									factor = 0;
									break;
								}
								factor = (factor * normalizedCoords[a] + Number.EPSILON) / (tupleCoords[a] + Number.EPSILON);
							} else if (normalizedCoords[a] < header.intermediateStartTuple[a] || normalizedCoords[a] > header.intermediateEndTuple[a]) {
								factor = 0;
								break;
							} else if (normalizedCoords[a] < tupleCoords[a]) factor = factor * (normalizedCoords[a] - header.intermediateStartTuple[a] + Number.EPSILON) / (tupleCoords[a] - header.intermediateStartTuple[a] + Number.EPSILON);
							else factor = factor * (header.intermediateEndTuple[a] - normalizedCoords[a] + Number.EPSILON) / (header.intermediateEndTuple[a] - tupleCoords[a] + Number.EPSILON);
						}
						if (factor === 0) continue;
						const tuplePoints = header.privatePoints.length ? header.privatePoints : sharedPoints;
						if (flavor === "gvar" && args.glyph && args.glyph.isComposite) this.transformComponents(args.glyph, transformedPoints, coords, tuplePoints, header, factor);
						else if (tuplePoints.length === 0) for (let i = 0; i < transformedPoints.length; i++) {
							const point = transformedPoints[i];
							if (flavor === "gvar") transformedPoints[i] = {
								x: Math.round(point.x + header.deltas[i] * factor),
								y: Math.round(point.y + header.deltasY[i] * factor),
								onCurve: point.onCurve,
								lastPointOfContour: point.lastPointOfContour
							};
							else if (flavor === "cvar") transformedPoints[i] = Math.round(point + header.deltas[i] * factor);
						}
						else {
							let interpolatedPoints;
							if (flavor === "gvar") interpolatedPoints = transformedPoints.map(copyPoint);
							else if (flavor === "cvar") interpolatedPoints = transformedPoints;
							const deltaMap = Array(points.length).fill(false);
							for (let i = 0; i < tuplePoints.length; i++) {
								let pointIndex = tuplePoints[i];
								if (pointIndex < points.length) {
									let point = interpolatedPoints[pointIndex];
									if (flavor === "gvar") {
										deltaMap[pointIndex] = true;
										point.x += header.deltas[i] * factor;
										point.y += header.deltasY[i] * factor;
									} else if (flavor === "cvar") transformedPoints[pointIndex] = Math.round(point + header.deltas[i] * factor);
								}
							}
							if (flavor === "gvar") {
								this.interpolatePoints(interpolatedPoints, transformedPoints, deltaMap);
								for (let i = 0; i < points.length; i++) {
									let deltaX = interpolatedPoints[i].x - transformedPoints[i].x;
									let deltaY = interpolatedPoints[i].y - transformedPoints[i].y;
									transformedPoints[i].x = Math.round(transformedPoints[i].x + deltaX);
									transformedPoints[i].y = Math.round(transformedPoints[i].y + deltaY);
								}
							}
						}
					}
					return transformedPoints;
				}
				/**
				* Retrieves a transformed copy of a glyph based on the provided variation coordinates, or the glyph itself if no variation was applied
				* @param {opentype.Glyph|number} glyph - Glyph or index of glyph to transform.
				* @param {Object} coords - Variation coords object (will fall back to variation coords in the defaultRenderOptions)
				* @returns {opentype.Glyph} - The transformed glyph.
				*/
				getTransform(glyph, coords) {
					if (Number.isInteger(glyph)) glyph = this.font.glyphs.get(glyph);
					const hasBlend = glyph.getBlendPath;
					const hasPoints = !!(glyph.points && glyph.points.length);
					let transformedGlyph = glyph;
					if (hasBlend || hasPoints) {
						if (!coords) coords = this.font.variation.get();
						if (hasPoints) {
							const variationData = this.gvar() && this.gvar().glyphVariations[glyph.index];
							if (variationData) {
								const glyphPoints = glyph.points;
								let transformedPoints = this.applyTupleVariationStore(variationData, glyphPoints, coords, "gvar", { glyph });
								transformedGlyph = new glyph_default(Object.assign({}, glyph, {
									points: transformedPoints,
									path: getPath(transformedPoints)
								}));
							}
						} else if (hasBlend) {
							const blendPath = glyph.getBlendPath(coords);
							transformedGlyph = new glyph_default(Object.assign({}, glyph, { path: blendPath }));
						}
					}
					if (this.font.tables.hvar) {
						glyph._advanceWidth = typeof glyph._advanceWidth !== "undefined" ? glyph._advanceWidth : glyph.advanceWidth;
						glyph.advanceWidth = transformedGlyph.advanceWidth = Math.round(glyph._advanceWidth + this.getVariableAdjustment(transformedGlyph.index, "hvar", "advanceWidth", coords));
						glyph._leftSideBearing = typeof glyph._leftSideBearing !== "undefined" ? glyph._leftSideBearing : glyph.leftSideBearing;
						glyph.leftSideBearing = transformedGlyph.leftSideBearing = Math.round(glyph._leftSideBearing + this.getVariableAdjustment(transformedGlyph.index, "hvar", "lsb", coords));
					}
					return transformedGlyph;
				}
				getCvarTransform(coords) {
					const cvt = this.font.tables.cvt;
					const variationData = this.cvar();
					if (!cvt || !cvt.length || !variationData || !variationData.headers.length) return cvt;
					return this.applyTupleVariationStore(variationData, cvt, coords, "cvar");
				}
				/**
				* Calculates the variable adjustment for a glyph property from variation data.
				* @param {number} gid - Glyph ID.
				* @param {string} tableName - The name of the variation data table.
				* @param {string} parameter - The property to adjust.
				* @param {Object} coords - Variation coordinates.
				* @returns {number} - The calculated adjustment.
				*/
				getVariableAdjustment(gid, tableName, parameter, coords) {
					coords = coords || this.font.variation.get();
					let outerIndex, innerIndex;
					const table = this.font.tables[tableName];
					if (!table) throw Error(`trying to get variation adjustment from non-existent table "${table}"`);
					if (!table.itemVariationStore) throw Error(`trying to get variation adjustment from table "${table}" which does not have an itemVariationStore`);
					const mapSize = table[parameter] && table[parameter].map.length;
					if (mapSize) {
						let i = gid;
						if (i >= mapSize) i = mapSize - 1;
						({outerIndex, innerIndex} = table[parameter].map[i]);
					} else {
						outerIndex = 0;
						innerIndex = gid;
					}
					return this.getDelta(table.itemVariationStore, outerIndex, innerIndex, coords);
				}
				/**
				* Retrieves the delta value from a variation store.
				* @param {Object} itemStore - The item variation store.
				* @param {number} outerIndex - The outer index in the variation subtables.
				* @param {number} innerIndex - The inner index in the delta sets.
				* @param {Object} coords - Variation coordinates.
				* @returns {number} - The delta value.
				*/
				getDelta(itemStore, outerIndex, innerIndex, coords) {
					if (outerIndex >= itemStore.itemVariationSubtables.length) return 0;
					let varData = itemStore.itemVariationSubtables[outerIndex];
					if (innerIndex >= varData.deltaSets.length) return 0;
					let deltaSet = varData.deltaSets[innerIndex];
					let blendVector = this.getBlendVector(itemStore, outerIndex, coords);
					let netAdjustment = 0;
					for (let master = 0; master < varData.regionIndexes.length; master++) netAdjustment += deltaSet[master] * blendVector[master];
					return netAdjustment;
				}
				/**
				* Calculates the blend vector for a set of variation coordinates.
				* @param {Object} itemStore - The item variation store.
				* @param {number} itemIndex - Index of the current item in the variation subtables.
				* @param {Object} coords - Variation coordinates.
				* @returns {Array<number>} - The blend vector for the given coordinates.
				*/
				getBlendVector(itemStore, itemIndex, coords) {
					if (!coords) coords = this.font.variation.get();
					let varData = itemStore.itemVariationSubtables[itemIndex];
					const normalizedCoords = this.getNormalizedCoords(coords);
					let blendVector = [];
					for (let master = 0; master < varData.regionIndexes.length; master++) {
						let scalar = 1;
						let regionIndex = varData.regionIndexes[master];
						let axes = itemStore.variationRegions[regionIndex].regionAxes;
						for (let j = 0; j < axes.length; j++) {
							let axis = axes[j];
							let axisScalar;
							if (axis.startCoord > axis.peakCoord || axis.peakCoord > axis.endCoord) axisScalar = 1;
							else if (axis.startCoord < 0 && axis.endCoord > 0 && axis.peakCoord !== 0) axisScalar = 1;
							else if (axis.peakCoord === 0) axisScalar = 1;
							else if (normalizedCoords[j] < axis.startCoord || normalizedCoords[j] > axis.endCoord) axisScalar = 0;
							else if (normalizedCoords[j] === axis.peakCoord) axisScalar = 1;
							else if (normalizedCoords[j] < axis.peakCoord) axisScalar = (normalizedCoords[j] - axis.startCoord + Number.EPSILON) / (axis.peakCoord - axis.startCoord + Number.EPSILON);
							else axisScalar = (axis.endCoord - normalizedCoords[j] + Number.EPSILON) / (axis.endCoord - axis.peakCoord + Number.EPSILON);
							scalar *= axisScalar;
						}
						blendVector[master] = scalar;
					}
					return blendVector;
				}
				/**
				* Helper method that returns the font's avar table if present
				* @returns {Object|undefined}
				*/
				avar() {
					return this.font.tables.avar;
				}
				/**
				* Helper method that returns the font's cvar table if present
				* @returns {Object|undefined}
				*/
				cvar() {
					return this.font.tables.cvar;
				}
				/**
				* Helper method that returns the font's fvar table if present
				* @returns {Object|undefined}
				*/
				fvar() {
					return this.font.tables.fvar;
				}
				/**
				* Helper method that returns the font's gvar table if present
				* @returns {Object|undefined}
				*/
				gvar() {
					return this.font.tables.gvar;
				}
				/**
				* Helper method that returns the font's hvar table if present
				* @returns {Object|undefined}
				*/
				hvar() {
					return this.font.tables.hvar;
				}
			};
			var VariationManager = class {
				constructor(font) {
					this.font = font;
					this.process = new VariationProcessor(this.font);
					this.activateDefaultVariation();
					this.getTransform = this.process.getTransform.bind(this.process);
				}
				/**
				* Tries to determine the default instance and sets its variation data as the font.defaultRenderOptions.
				* If not defaultInstance can be determined, the default coordinates of all axes are used.
				*/
				activateDefaultVariation() {
					const defaultInstance = this.getDefaultInstanceIndex();
					if (defaultInstance > -1) this.set(defaultInstance);
					else this.set(this.getDefaultCoordinates());
				}
				/**
				* Retrieves the default coordinates for the font's variation axes.
				* @returns {Object} An object mapping axis tags to their default values.
				*/
				getDefaultCoordinates() {
					return this.fvar().axes.reduce((acc, axis) => {
						acc[axis.tag] = axis.defaultValue;
						return acc;
					}, {});
				}
				/**
				* Gets the index of the default variation instance or -1 if not able to determine
				* @returns {integer} default index or -1
				*/
				getDefaultInstanceIndex() {
					const defaultCoordinates = this.getDefaultCoordinates();
					let defaultInstanceIndex = this.getInstanceIndex(defaultCoordinates);
					if (defaultInstanceIndex < 0) defaultInstanceIndex = this.fvar().instances.findIndex((instance) => instance.name && instance.name.en === "Regular");
					return defaultInstanceIndex;
				}
				/**
				* Retrieves the index of the variation instance matching the coordinates object or -1 if not able to determine
				* @param {integer|Object} coordinates An object where keys are axis tags and values are the corresponding variation values.
				* @returns {integer} The index of the matching instance or -1 if no match is found.
				*/
				getInstanceIndex(coordinates) {
					return this.fvar().instances.findIndex((instance) => Object.keys(coordinates).every((axis) => instance.coordinates[axis] === coordinates[axis]));
				}
				/**
				* Retrieves a variation instance by its zero-based index
				* @param {integer} index - zero-based index of the variation instance
				* @returns {Object} - variation instance or null if the index is invalid.
				*/
				getInstance(index) {
					return this.fvar().instances && this.fvar().instances[index];
				}
				/**
				* Set the variation coordinates to use by default for rendering in the font.defaultRenderOptions
				* @param {integer|Object} instanceIdOrObject Either the zero-based index of a variation instance or an object with axis tags as keys and variation values as values
				*/
				set(instanceIdOrObject) {
					let variationData;
					if (Number.isInteger(instanceIdOrObject)) {
						const instance = this.getInstance(instanceIdOrObject);
						if (!instance) throw Error(`Invalid instance index ${instanceIdOrObject}`);
						variationData = { ...instance.coordinates };
					} else {
						variationData = instanceIdOrObject;
						this.process.normalizeCoordTags(variationData);
					}
					variationData = Object.assign({}, this.font.defaultRenderOptions.variation, variationData);
					this.font.defaultRenderOptions = Object.assign({}, this.font.defaultRenderOptions, { variation: variationData });
				}
				/**
				* Returns the variation coordinates currently set in the font.defaultRenderOptions
				* @returns {Object}
				*/
				get() {
					return Object.assign({}, this.font.defaultRenderOptions.variation);
				}
				/**
				* Helper method that returns the font's avar table if present
				* @returns {Object|undefined}
				*/
				avar() {
					return this.font.tables.avar;
				}
				/**
				* Helper method that returns the font's cvar table if present
				* @returns {Object|undefined}
				*/
				cvar() {
					return this.font.tables.cvar;
				}
				/**
				* Helper method that returns the font's fvar table if present
				* @returns {Object|undefined}
				*/
				fvar() {
					return this.font.tables.fvar;
				}
				/**
				* Helper method that returns the font's gvar table if present
				* @returns {Object|undefined}
				*/
				gvar() {
					return this.font.tables.gvar;
				}
				/**
				* Helper method that returns the font's hvar table if present
				* @returns {Object|undefined}
				*/
				hvar() {
					return this.font.tables.hvar;
				}
			};
			var MAX_INSTRUCTIONS = 1e6;
			var MAX_CALL_DEPTH2 = 64;
			var MAX_LOOP_COUNT = 1e4;
			var instructionTable;
			var exec;
			var execGlyph;
			var execComponent;
			function Hinting(font) {
				this.font = font;
				this.getCommands = function(hPoints) {
					return glyf_default.getPath(hPoints).commands;
				};
				this._fpgmState = this._prepState = void 0;
				this._errorState = 0;
			}
			function roundOff(v) {
				return v;
			}
			function roundToGrid(v) {
				return Math.sign(v) * Math.round(Math.abs(v));
			}
			function roundToDoubleGrid(v) {
				return Math.sign(v) * Math.round(Math.abs(v * 2)) / 2;
			}
			function roundToHalfGrid(v) {
				return Math.sign(v) * (Math.round(Math.abs(v) + .5) - .5);
			}
			function roundUpToGrid(v) {
				return Math.sign(v) * Math.ceil(Math.abs(v));
			}
			function roundDownToGrid(v) {
				return Math.sign(v) * Math.floor(Math.abs(v));
			}
			var roundSuper = function(v) {
				const period = this.srPeriod;
				let phase = this.srPhase;
				const threshold = this.srThreshold;
				let sign = 1;
				if (v < 0) {
					v = -v;
					sign = -1;
				}
				v += threshold - phase;
				v = Math.trunc(v / period) * period;
				v += phase;
				if (v < 0) return phase * sign;
				return v * sign;
			};
			var xUnitVector = {
				x: 1,
				y: 0,
				axis: "x",
				distance: function(p1, p2, o1, o2) {
					return (o1 ? p1.xo : p1.x) - (o2 ? p2.xo : p2.x);
				},
				interpolate: function(p, rp1, rp2, pv) {
					let do1;
					let do2;
					let doa1;
					let doa2;
					let dm1;
					let dm2;
					let dt;
					if (!pv || pv === this) {
						do1 = p.xo - rp1.xo;
						do2 = p.xo - rp2.xo;
						dm1 = rp1.x - rp1.xo;
						dm2 = rp2.x - rp2.xo;
						doa1 = Math.abs(do1);
						doa2 = Math.abs(do2);
						dt = doa1 + doa2;
						if (dt === 0) {
							p.x = p.xo + (dm1 + dm2) / 2;
							return;
						}
						p.x = p.xo + (dm1 * doa2 + dm2 * doa1) / dt;
						return;
					}
					do1 = pv.distance(p, rp1, true, true);
					do2 = pv.distance(p, rp2, true, true);
					dm1 = pv.distance(rp1, rp1, false, true);
					dm2 = pv.distance(rp2, rp2, false, true);
					doa1 = Math.abs(do1);
					doa2 = Math.abs(do2);
					dt = doa1 + doa2;
					if (dt === 0) {
						xUnitVector.setRelative(p, p, (dm1 + dm2) / 2, pv, true);
						return;
					}
					xUnitVector.setRelative(p, p, (dm1 * doa2 + dm2 * doa1) / dt, pv, true);
				},
				normalSlope: Number.NEGATIVE_INFINITY,
				setRelative: function(p, rp, d, pv, org) {
					if (!pv || pv === this) {
						p.x = (org ? rp.xo : rp.x) + d;
						return;
					}
					const rpx = org ? rp.xo : rp.x;
					const rpy = org ? rp.yo : rp.y;
					const rpdx = rpx + d * pv.x;
					const rpdy = rpy + d * pv.y;
					p.x = rpdx + (p.y - rpdy) / pv.normalSlope;
				},
				slope: 0,
				touch: function(p) {
					p.xTouched = true;
				},
				touched: function(p) {
					return p.xTouched;
				},
				untouch: function(p) {
					p.xTouched = false;
				}
			};
			var yUnitVector = {
				x: 0,
				y: 1,
				axis: "y",
				distance: function(p1, p2, o1, o2) {
					return (o1 ? p1.yo : p1.y) - (o2 ? p2.yo : p2.y);
				},
				interpolate: function(p, rp1, rp2, pv) {
					let do1;
					let do2;
					let doa1;
					let doa2;
					let dm1;
					let dm2;
					let dt;
					if (!pv || pv === this) {
						do1 = p.yo - rp1.yo;
						do2 = p.yo - rp2.yo;
						dm1 = rp1.y - rp1.yo;
						dm2 = rp2.y - rp2.yo;
						doa1 = Math.abs(do1);
						doa2 = Math.abs(do2);
						dt = doa1 + doa2;
						if (dt === 0) {
							p.y = p.yo + (dm1 + dm2) / 2;
							return;
						}
						p.y = p.yo + (dm1 * doa2 + dm2 * doa1) / dt;
						return;
					}
					do1 = pv.distance(p, rp1, true, true);
					do2 = pv.distance(p, rp2, true, true);
					dm1 = pv.distance(rp1, rp1, false, true);
					dm2 = pv.distance(rp2, rp2, false, true);
					doa1 = Math.abs(do1);
					doa2 = Math.abs(do2);
					dt = doa1 + doa2;
					if (dt === 0) {
						yUnitVector.setRelative(p, p, (dm1 + dm2) / 2, pv, true);
						return;
					}
					yUnitVector.setRelative(p, p, (dm1 * doa2 + dm2 * doa1) / dt, pv, true);
				},
				normalSlope: 0,
				setRelative: function(p, rp, d, pv, org) {
					if (!pv || pv === this) {
						p.y = (org ? rp.yo : rp.y) + d;
						return;
					}
					const rpx = org ? rp.xo : rp.x;
					const rpy = org ? rp.yo : rp.y;
					const rpdx = rpx + d * pv.x;
					p.y = rpy + d * pv.y + pv.normalSlope * (p.x - rpdx);
				},
				slope: Number.POSITIVE_INFINITY,
				touch: function(p) {
					p.yTouched = true;
				},
				touched: function(p) {
					return p.yTouched;
				},
				untouch: function(p) {
					p.yTouched = false;
				}
			};
			Object.freeze(xUnitVector);
			Object.freeze(yUnitVector);
			function UnitVector(x, y) {
				this.x = x;
				this.y = y;
				this.axis = void 0;
				this.slope = y / x;
				this.normalSlope = -x / y;
				Object.freeze(this);
			}
			UnitVector.prototype.distance = function(p1, p2, o1, o2) {
				return this.x * xUnitVector.distance(p1, p2, o1, o2) + this.y * yUnitVector.distance(p1, p2, o1, o2);
			};
			UnitVector.prototype.interpolate = function(p, rp1, rp2, pv) {
				let dm1;
				let dm2;
				let do1;
				let do2;
				let doa1;
				let doa2;
				let dt;
				do1 = pv.distance(p, rp1, true, true);
				do2 = pv.distance(p, rp2, true, true);
				dm1 = pv.distance(rp1, rp1, false, true);
				dm2 = pv.distance(rp2, rp2, false, true);
				doa1 = Math.abs(do1);
				doa2 = Math.abs(do2);
				dt = doa1 + doa2;
				if (dt === 0) {
					this.setRelative(p, p, (dm1 + dm2) / 2, pv, true);
					return;
				}
				this.setRelative(p, p, (dm1 * doa2 + dm2 * doa1) / dt, pv, true);
			};
			UnitVector.prototype.setRelative = function(p, rp, d, pv, org) {
				pv = pv || this;
				const rpx = org ? rp.xo : rp.x;
				const rpy = org ? rp.yo : rp.y;
				const rpdx = rpx + d * pv.x;
				const rpdy = rpy + d * pv.y;
				const pvns = pv.normalSlope;
				const fvs = this.slope;
				const px = p.x;
				const py = p.y;
				p.x = (fvs * px - pvns * rpdx + rpdy - py) / (fvs - pvns);
				p.y = fvs * (p.x - px) + py;
			};
			UnitVector.prototype.touch = function(p) {
				p.xTouched = true;
				p.yTouched = true;
			};
			function getUnitVector(x, y) {
				const d = Math.sqrt(x * x + y * y);
				x /= d;
				y /= d;
				if (x === 1 && y === 0) return xUnitVector;
				else if (x === 0 && y === 1) return yUnitVector;
				else return new UnitVector(x, y);
			}
			function HPoint(x, y, lastPointOfContour, onCurve) {
				this.x = this.xo = Math.round(x * 64) / 64;
				this.y = this.yo = Math.round(y * 64) / 64;
				this.lastPointOfContour = lastPointOfContour;
				this.onCurve = onCurve;
				this.prevPointOnContour = void 0;
				this.nextPointOnContour = void 0;
				this.xTouched = false;
				this.yTouched = false;
				Object.preventExtensions(this);
			}
			HPoint.prototype.nextTouched = function(v) {
				let p = this.nextPointOnContour;
				while (!v.touched(p) && p !== this) p = p.nextPointOnContour;
				return p;
			};
			HPoint.prototype.prevTouched = function(v) {
				let p = this.prevPointOnContour;
				while (!v.touched(p) && p !== this) p = p.prevPointOnContour;
				return p;
			};
			var HPZero = Object.freeze(new HPoint(0, 0));
			var defaultState = {
				cvCutIn: 17 / 16,
				deltaBase: 9,
				deltaShift: .125,
				loop: 1,
				minDis: 1,
				autoFlip: true
			};
			function State(env, prog) {
				this.env = env;
				this.stack = [];
				this.prog = prog;
				switch (env) {
					case "glyf":
						this.zp0 = this.zp1 = this.zp2 = 1;
						this.rp0 = this.rp1 = this.rp2 = 0;
					case "prep":
						this.fv = this.pv = this.dpv = xUnitVector;
						this.round = roundToGrid;
				}
			}
			Hinting.prototype.exec = function(glyph, ppem) {
				if (typeof ppem !== "number") throw new Error("Point size is not a number!");
				if (this._errorState > 2) return;
				const font = this.font;
				let prepState = this._prepState;
				if (!prepState || prepState.ppem !== ppem) {
					let fpgmState = this._fpgmState;
					if (!fpgmState) {
						State.prototype = defaultState;
						fpgmState = this._fpgmState = new State("fpgm", font.tables.fpgm);
						fpgmState.funcs = [];
						fpgmState.font = font;
						fpgmState.instructionCount = 0;
						fpgmState.callDepth = 0;
						try {
							exec(fpgmState);
						} catch (e) {
							console.log("Hinting error in FPGM:" + e);
							this._errorState = 3;
							return;
						}
					}
					State.prototype = fpgmState;
					prepState = this._prepState = new State("prep", font.tables.prep);
					prepState.ppem = ppem;
					prepState.instructionCount = 0;
					prepState.callDepth = 0;
					const oCvt = font.variation && font.variation.process.getCvarTransform() || font.tables.cvt;
					if (oCvt) {
						const cvt = prepState.cvt = new Array(oCvt.length);
						const scale = ppem / font.unitsPerEm;
						for (let c = 0; c < oCvt.length; c++) cvt[c] = oCvt[c] * scale;
					} else prepState.cvt = [];
					try {
						exec(prepState);
					} catch (e) {
						if (this._errorState < 2) console.log("Hinting error in PREP:" + e);
						this._errorState = 2;
					}
				}
				if (this._errorState > 1) return;
				try {
					return execGlyph(glyph, prepState);
				} catch (e) {
					if (this._errorState < 1) {
						console.log("Hinting error:" + e);
						console.log("Note: further hinting errors are silenced");
					}
					this._errorState = 1;
					return;
				}
			};
			execGlyph = function(glyph, prepState) {
				const xScale = prepState.ppem / prepState.font.unitsPerEm;
				const yScale = xScale;
				let components = glyph.components;
				let contours;
				let gZone;
				let state;
				State.prototype = prepState;
				if (!components) {
					state = new State("glyf", glyph.instructions);
					state.instructionCount = 0;
					state.callDepth = 0;
					execComponent(glyph, state, xScale, yScale);
					gZone = state.gZone;
				} else {
					const font = prepState.font;
					gZone = [];
					contours = [];
					for (let i = 0; i < components.length; i++) {
						const c = components[i];
						const cg = font.glyphs.get(c.glyphIndex);
						state = new State("glyf", cg.instructions);
						state.instructionCount = 0;
						state.callDepth = 0;
						execComponent(cg, state, xScale, yScale);
						const dx = Math.round(c.dx * xScale);
						const dy = Math.round(c.dy * yScale);
						const gz = state.gZone;
						const cc = state.contours;
						for (let pi = 0; pi < gz.length; pi++) {
							const p = gz[pi];
							p.xTouched = p.yTouched = false;
							p.xo = p.x = p.x + dx;
							p.yo = p.y = p.y + dy;
						}
						const gLen = gZone.length;
						gZone.push.apply(gZone, gz);
						for (let j = 0; j < cc.length; j++) contours.push(cc[j] + gLen);
					}
					if (glyph.instructions && !state.inhibitGridFit) {
						state = new State("glyf", glyph.instructions);
						state.gZone = state.z0 = state.z1 = state.z2 = gZone;
						state.contours = contours;
						gZone.push(new HPoint(0, 0), new HPoint(Math.round(glyph.advanceWidth * xScale), 0));
						exec(state);
						gZone.length -= 2;
					}
				}
				return gZone;
			};
			execComponent = function(glyph, state, xScale, yScale) {
				const points = glyph.points || [];
				const pLen = points.length;
				const gZone = state.gZone = state.z0 = state.z1 = state.z2 = [];
				const contours = state.contours = [];
				let cp;
				for (let i = 0; i < pLen; i++) {
					cp = points[i];
					gZone[i] = new HPoint(cp.x * xScale, cp.y * yScale, cp.lastPointOfContour, cp.onCurve);
				}
				let sp;
				let np;
				for (let i = 0; i < pLen; i++) {
					cp = gZone[i];
					if (!sp) {
						sp = cp;
						contours.push(i);
					}
					if (cp.lastPointOfContour) {
						cp.nextPointOnContour = sp;
						sp.prevPointOnContour = cp;
						sp = void 0;
					} else {
						np = gZone[i + 1];
						cp.nextPointOnContour = np;
						np.prevPointOnContour = cp;
					}
				}
				if (state.inhibitGridFit) return;
				gZone.push(new HPoint(0, 0), new HPoint(Math.round(glyph.advanceWidth * xScale), 0));
				exec(state);
				gZone.length -= 2;
			};
			exec = function(state) {
				let prog = state.prog;
				if (!prog) return;
				const pLen = prog.length;
				let ins;
				for (state.ip = 0; state.ip < pLen; state.ip++) {
					if (++state.instructionCount > MAX_INSTRUCTIONS) throw new Error("Hinting instructions exceeded maximum of " + MAX_INSTRUCTIONS);
					ins = instructionTable[prog[state.ip]];
					if (!ins) throw new Error("unknown instruction: 0x" + Number(prog[state.ip]).toString(16));
					ins(state);
				}
			};
			function initTZone(state) {
				const tZone = state.tZone = new Array(state.gZone.length);
				for (let i = 0; i < tZone.length; i++) tZone[i] = new HPoint(0, 0);
			}
			function skip(state, handleElse) {
				const prog = state.prog;
				let ip = state.ip;
				let nesting = 1;
				let ins;
				do {
					ins = prog[++ip];
					if (ins === 88) nesting++;
					else if (ins === 89) nesting--;
					else if (ins === 64) ip += prog[ip + 1] + 1;
					else if (ins === 65) ip += 2 * prog[ip + 1] + 1;
					else if (ins >= 176 && ins <= 183) ip += ins - 176 + 1;
					else if (ins >= 184 && ins <= 191) ip += (ins - 184 + 1) * 2;
					else if (handleElse && nesting === 1 && ins === 27) break;
				} while (nesting > 0);
				state.ip = ip;
			}
			function SVTCA(v, state) {
				state.fv = state.pv = state.dpv = v;
			}
			function SPVTCA(v, state) {
				state.pv = state.dpv = v;
			}
			function SFVTCA(v, state) {
				state.fv = v;
			}
			function SPVTL(a, state) {
				const stack = state.stack;
				const p2i = stack.pop();
				const p1i = stack.pop();
				const p2 = state.z2[p2i];
				const p1 = state.z1[p1i];
				let dx;
				let dy;
				if (!a) {
					dx = p1.x - p2.x;
					dy = p1.y - p2.y;
				} else {
					dx = p2.y - p1.y;
					dy = p1.x - p2.x;
				}
				state.pv = state.dpv = getUnitVector(dx, dy);
			}
			function SFVTL(a, state) {
				const stack = state.stack;
				const p2i = stack.pop();
				const p1i = stack.pop();
				const p2 = state.z2[p2i];
				const p1 = state.z1[p1i];
				let dx;
				let dy;
				if (!a) {
					dx = p1.x - p2.x;
					dy = p1.y - p2.y;
				} else {
					dx = p2.y - p1.y;
					dy = p1.x - p2.x;
				}
				state.fv = getUnitVector(dx, dy);
			}
			function SPVFS(state) {
				const stack = state.stack;
				const y = stack.pop();
				state.pv = state.dpv = getUnitVector(stack.pop(), y);
			}
			function SFVFS(state) {
				const stack = state.stack;
				const y = stack.pop();
				state.fv = getUnitVector(stack.pop(), y);
			}
			function GPV(state) {
				const stack = state.stack;
				const pv = state.pv;
				stack.push(pv.x * 16384);
				stack.push(pv.y * 16384);
			}
			function GFV(state) {
				const stack = state.stack;
				const fv = state.fv;
				stack.push(fv.x * 16384);
				stack.push(fv.y * 16384);
			}
			function SFVTPV(state) {
				state.fv = state.pv;
			}
			function ISECT(state) {
				const stack = state.stack;
				const pa0i = stack.pop();
				const pa1i = stack.pop();
				const pb0i = stack.pop();
				const pb1i = stack.pop();
				const pi = stack.pop();
				const z0 = state.z0;
				const z1 = state.z1;
				const pa0 = z0[pa0i];
				const pa1 = z0[pa1i];
				const pb0 = z1[pb0i];
				const pb1 = z1[pb1i];
				const p = state.z2[pi];
				const x1 = pa0.x;
				const y1 = pa0.y;
				const x2 = pa1.x;
				const y2 = pa1.y;
				const x3 = pb0.x;
				const y3 = pb0.y;
				const x4 = pb1.x;
				const y4 = pb1.y;
				const div = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
				const f1 = x1 * y2 - y1 * x2;
				const f2 = x3 * y4 - y3 * x4;
				p.x = (f1 * (x3 - x4) - f2 * (x1 - x2)) / div;
				p.y = (f1 * (y3 - y4) - f2 * (y1 - y2)) / div;
			}
			function SRP0(state) {
				state.rp0 = state.stack.pop();
			}
			function SRP1(state) {
				state.rp1 = state.stack.pop();
			}
			function SRP2(state) {
				state.rp2 = state.stack.pop();
			}
			function SZP0(state) {
				const n = state.stack.pop();
				state.zp0 = n;
				switch (n) {
					case 0:
						if (!state.tZone) initTZone(state);
						state.z0 = state.tZone;
						break;
					case 1:
						state.z0 = state.gZone;
						break;
					default: throw new Error("Invalid zone pointer");
				}
			}
			function SZP1(state) {
				const n = state.stack.pop();
				state.zp1 = n;
				switch (n) {
					case 0:
						if (!state.tZone) initTZone(state);
						state.z1 = state.tZone;
						break;
					case 1:
						state.z1 = state.gZone;
						break;
					default: throw new Error("Invalid zone pointer");
				}
			}
			function SZP2(state) {
				const n = state.stack.pop();
				state.zp2 = n;
				switch (n) {
					case 0:
						if (!state.tZone) initTZone(state);
						state.z2 = state.tZone;
						break;
					case 1:
						state.z2 = state.gZone;
						break;
					default: throw new Error("Invalid zone pointer");
				}
			}
			function SZPS(state) {
				const n = state.stack.pop();
				state.zp0 = state.zp1 = state.zp2 = n;
				switch (n) {
					case 0:
						if (!state.tZone) initTZone(state);
						state.z0 = state.z1 = state.z2 = state.tZone;
						break;
					case 1:
						state.z0 = state.z1 = state.z2 = state.gZone;
						break;
					default: throw new Error("Invalid zone pointer");
				}
			}
			function SLOOP(state) {
				state.loop = state.stack.pop();
				if (state.loop > MAX_LOOP_COUNT) state.loop = MAX_LOOP_COUNT;
			}
			function RTG(state) {
				state.round = roundToGrid;
			}
			function RTHG(state) {
				state.round = roundToHalfGrid;
			}
			function SMD(state) {
				state.minDis = state.stack.pop() / 64;
			}
			function ELSE(state) {
				skip(state, false);
			}
			function JMPR(state) {
				const o = state.stack.pop();
				state.ip += o - 1;
			}
			function SCVTCI(state) {
				state.cvCutIn = state.stack.pop() / 64;
			}
			function DUP(state) {
				const stack = state.stack;
				stack.push(stack[stack.length - 1]);
			}
			function POP(state) {
				state.stack.pop();
			}
			function CLEAR(state) {
				state.stack.length = 0;
			}
			function SWAP(state) {
				const stack = state.stack;
				const a = stack.pop();
				const b = stack.pop();
				stack.push(a);
				stack.push(b);
			}
			function DEPTH(state) {
				const stack = state.stack;
				stack.push(stack.length);
			}
			function LOOPCALL(state) {
				const stack = state.stack;
				const fn = stack.pop();
				let c = stack.pop();
				if (c > MAX_LOOP_COUNT) c = MAX_LOOP_COUNT;
				if (++state.callDepth > MAX_CALL_DEPTH2) throw new Error("Hinting call depth exceeded maximum of " + MAX_CALL_DEPTH2);
				const cip = state.ip;
				const cprog = state.prog;
				state.prog = state.funcs[fn];
				for (let i = 0; i < c; i++) exec(state);
				state.ip = cip;
				state.prog = cprog;
				state.callDepth--;
			}
			function CALL(state) {
				const fn = state.stack.pop();
				if (++state.callDepth > MAX_CALL_DEPTH2) throw new Error("Hinting call depth exceeded maximum of " + MAX_CALL_DEPTH2);
				const cip = state.ip;
				const cprog = state.prog;
				state.prog = state.funcs[fn];
				exec(state);
				state.ip = cip;
				state.prog = cprog;
				state.callDepth--;
			}
			function CINDEX(state) {
				const stack = state.stack;
				const k = stack.pop();
				stack.push(stack[stack.length - k]);
			}
			function MINDEX(state) {
				const stack = state.stack;
				const k = stack.pop();
				stack.push(stack.splice(stack.length - k, 1)[0]);
			}
			function FDEF(state) {
				if (state.env !== "fpgm") throw new Error("FDEF not allowed here");
				const stack = state.stack;
				const prog = state.prog;
				let ip = state.ip;
				const fn = stack.pop();
				const ipBegin = ip;
				while (prog[++ip] !== 45);
				state.ip = ip;
				state.funcs[fn] = prog.slice(ipBegin + 1, ip);
			}
			function MDAP(round, state) {
				const pi = state.stack.pop();
				const p = state.z0[pi];
				const fv = state.fv;
				const pv = state.pv;
				let d = pv.distance(p, HPZero);
				if (round) d = state.round(d);
				fv.setRelative(p, HPZero, d, pv);
				fv.touch(p);
				state.rp0 = state.rp1 = pi;
			}
			function IUP(v, state) {
				const z2 = state.z2;
				const pLen = z2.length - 2;
				let cp;
				let pp;
				let np;
				for (let i = 0; i < pLen; i++) {
					cp = z2[i];
					if (v.touched(cp)) continue;
					pp = cp.prevTouched(v);
					if (pp === cp) continue;
					np = cp.nextTouched(v);
					if (pp === np) v.setRelative(cp, cp, v.distance(pp, pp, false, true), v, true);
					v.interpolate(cp, pp, np, v);
				}
			}
			function SHP(a, state) {
				const stack = state.stack;
				const rpi = a ? state.rp1 : state.rp2;
				const rp = (a ? state.z0 : state.z1)[rpi];
				const fv = state.fv;
				const pv = state.pv;
				let loop = state.loop;
				const z2 = state.z2;
				while (loop--) {
					const p = z2[stack.pop()];
					const d = pv.distance(rp, rp, false, true);
					fv.setRelative(p, p, d, pv);
					fv.touch(p);
				}
				state.loop = 1;
			}
			function SHC(a, state) {
				const stack = state.stack;
				const rpi = a ? state.rp1 : state.rp2;
				const rp = (a ? state.z0 : state.z1)[rpi];
				const fv = state.fv;
				const pv = state.pv;
				const ci = stack.pop();
				const sp = state.z2[state.contours[ci]];
				let p = sp;
				const d = pv.distance(rp, rp, false, true);
				do {
					if (p !== rp) fv.setRelative(p, p, d, pv);
					p = p.nextPointOnContour;
				} while (p !== sp);
			}
			function SHZ(a, state) {
				const stack = state.stack;
				const rpi = a ? state.rp1 : state.rp2;
				const rp = (a ? state.z0 : state.z1)[rpi];
				const fv = state.fv;
				const pv = state.pv;
				const e = stack.pop();
				let z;
				switch (e) {
					case 0:
						z = state.tZone;
						break;
					case 1:
						z = state.gZone;
						break;
					default: throw new Error("Invalid zone");
				}
				let p;
				const d = pv.distance(rp, rp, false, true);
				const pLen = z.length - 2;
				for (let i = 0; i < pLen; i++) {
					p = z[i];
					fv.setRelative(p, p, d, pv);
				}
			}
			function SHPIX(state) {
				const stack = state.stack;
				let loop = state.loop;
				const fv = state.fv;
				const d = stack.pop() / 64;
				const z2 = state.z2;
				while (loop--) {
					const p = z2[stack.pop()];
					fv.setRelative(p, p, d);
					fv.touch(p);
				}
				state.loop = 1;
			}
			function IP(state) {
				const stack = state.stack;
				const rp1i = state.rp1;
				const rp2i = state.rp2;
				let loop = state.loop;
				const rp1 = state.z0[rp1i];
				const rp2 = state.z1[rp2i];
				const fv = state.fv;
				const pv = state.dpv;
				const z2 = state.z2;
				while (loop--) {
					const p = z2[stack.pop()];
					fv.interpolate(p, rp1, rp2, pv);
					fv.touch(p);
				}
				state.loop = 1;
			}
			function MSIRP(a, state) {
				const stack = state.stack;
				const d = stack.pop() / 64;
				const pi = stack.pop();
				const p = state.z1[pi];
				const rp0 = state.z0[state.rp0];
				const fv = state.fv;
				const pv = state.pv;
				fv.setRelative(p, rp0, d, pv);
				fv.touch(p);
				state.rp1 = state.rp0;
				state.rp2 = pi;
				if (a) state.rp0 = pi;
			}
			function ALIGNRP(state) {
				const stack = state.stack;
				const rp0i = state.rp0;
				const rp0 = state.z0[rp0i];
				let loop = state.loop;
				const fv = state.fv;
				const pv = state.pv;
				const z1 = state.z1;
				while (loop--) {
					const p = z1[stack.pop()];
					fv.setRelative(p, rp0, 0, pv);
					fv.touch(p);
				}
				state.loop = 1;
			}
			function RTDG(state) {
				state.round = roundToDoubleGrid;
			}
			function MIAP(round, state) {
				const stack = state.stack;
				const n = stack.pop();
				const pi = stack.pop();
				const p = state.z0[pi];
				const fv = state.fv;
				const pv = state.pv;
				let cv = state.cvt[n];
				let d = pv.distance(p, HPZero);
				if (round) {
					if (Math.abs(d - cv) < state.cvCutIn) d = cv;
					d = state.round(d);
				}
				fv.setRelative(p, HPZero, d, pv);
				if (state.zp0 === 0) {
					p.xo = p.x;
					p.yo = p.y;
				}
				fv.touch(p);
				state.rp0 = state.rp1 = pi;
			}
			function NPUSHB(state) {
				const prog = state.prog;
				let ip = state.ip;
				const stack = state.stack;
				const n = prog[++ip];
				for (let i = 0; i < n; i++) stack.push(prog[++ip]);
				state.ip = ip;
			}
			function NPUSHW(state) {
				let ip = state.ip;
				const prog = state.prog;
				const stack = state.stack;
				const n = prog[++ip];
				for (let i = 0; i < n; i++) {
					let w = prog[++ip] << 8 | prog[++ip];
					if (w & 32768) w = -((w ^ 65535) + 1);
					stack.push(w);
				}
				state.ip = ip;
			}
			function WS(state) {
				const stack = state.stack;
				let store = state.store;
				if (!store) store = state.store = [];
				const v = stack.pop();
				const l = stack.pop();
				store[l] = v;
			}
			function RS(state) {
				const stack = state.stack;
				const store = state.store;
				const l = stack.pop();
				const v = store && store[l] || 0;
				stack.push(v);
			}
			function WCVTP(state) {
				const stack = state.stack;
				const v = stack.pop();
				const l = stack.pop();
				state.cvt[l] = v / 64;
			}
			function RCVT(state) {
				const stack = state.stack;
				const cvte = stack.pop();
				stack.push(state.cvt[cvte] * 64);
			}
			function GC(a, state) {
				const stack = state.stack;
				const pi = stack.pop();
				const p = state.z2[pi];
				stack.push(state.dpv.distance(p, HPZero, a, false) * 64);
			}
			function MD(a, state) {
				const stack = state.stack;
				const pi2 = stack.pop();
				const pi1 = stack.pop();
				const p2 = state.z1[pi2];
				const p1 = state.z0[pi1];
				const d = state.dpv.distance(p1, p2, a, a);
				state.stack.push(Math.round(d * 64));
			}
			function MPPEM(state) {
				state.stack.push(state.ppem);
			}
			function FLIPON(state) {
				state.autoFlip = true;
			}
			function LT(state) {
				const stack = state.stack;
				const e2 = stack.pop();
				const e1 = stack.pop();
				stack.push(e1 < e2 ? 1 : 0);
			}
			function LTEQ(state) {
				const stack = state.stack;
				const e2 = stack.pop();
				const e1 = stack.pop();
				stack.push(e1 <= e2 ? 1 : 0);
			}
			function GT(state) {
				const stack = state.stack;
				const e2 = stack.pop();
				const e1 = stack.pop();
				stack.push(e1 > e2 ? 1 : 0);
			}
			function GTEQ(state) {
				const stack = state.stack;
				const e2 = stack.pop();
				const e1 = stack.pop();
				stack.push(e1 >= e2 ? 1 : 0);
			}
			function EQ(state) {
				const stack = state.stack;
				const e2 = stack.pop();
				const e1 = stack.pop();
				stack.push(e2 === e1 ? 1 : 0);
			}
			function NEQ(state) {
				const stack = state.stack;
				const e2 = stack.pop();
				const e1 = stack.pop();
				stack.push(e2 !== e1 ? 1 : 0);
			}
			function ODD(state) {
				const stack = state.stack;
				const n = stack.pop();
				stack.push(Math.trunc(n) & 1 ? 1 : 0);
			}
			function EVEN(state) {
				const stack = state.stack;
				const n = stack.pop();
				stack.push(Math.trunc(n) & 1 ? 0 : 1);
			}
			function IF(state) {
				if (!state.stack.pop()) skip(state, true);
			}
			function EIF(state) {}
			function AND(state) {
				const stack = state.stack;
				const e2 = stack.pop();
				const e1 = stack.pop();
				stack.push(e2 && e1 ? 1 : 0);
			}
			function OR(state) {
				const stack = state.stack;
				const e2 = stack.pop();
				const e1 = stack.pop();
				stack.push(e2 || e1 ? 1 : 0);
			}
			function NOT(state) {
				const stack = state.stack;
				const e = stack.pop();
				stack.push(e ? 0 : 1);
			}
			function DELTAP123(b, state) {
				const stack = state.stack;
				const n = stack.pop();
				const fv = state.fv;
				const pv = state.pv;
				const ppem = state.ppem;
				const base = state.deltaBase + (b - 1) * 16;
				const ds = state.deltaShift;
				const z0 = state.z0;
				for (let i = 0; i < n; i++) {
					const pi = stack.pop();
					const arg = stack.pop();
					if (base + ((arg & 240) >> 4) !== ppem) continue;
					let mag = (arg & 15) - 8;
					if (mag >= 0) mag++;
					const p = z0[pi];
					fv.setRelative(p, p, mag * ds, pv);
				}
			}
			function SDB(state) {
				state.deltaBase = state.stack.pop();
			}
			function SDS(state) {
				const n = state.stack.pop();
				state.deltaShift = Math.pow(.5, n);
			}
			function ADD(state) {
				const stack = state.stack;
				const n2 = stack.pop();
				const n1 = stack.pop();
				stack.push(n1 + n2);
			}
			function SUB(state) {
				const stack = state.stack;
				const n2 = stack.pop();
				const n1 = stack.pop();
				stack.push(n1 - n2);
			}
			function DIV(state) {
				const stack = state.stack;
				const n2 = stack.pop();
				const n1 = stack.pop();
				stack.push(n1 * 64 / n2);
			}
			function MUL(state) {
				const stack = state.stack;
				const n2 = stack.pop();
				const n1 = stack.pop();
				stack.push(n1 * n2 / 64);
			}
			function ABS(state) {
				const stack = state.stack;
				const n = stack.pop();
				stack.push(Math.abs(n));
			}
			function NEG(state) {
				const stack = state.stack;
				let n = stack.pop();
				stack.push(-n);
			}
			function FLOOR(state) {
				const stack = state.stack;
				const n = stack.pop();
				stack.push(Math.floor(n / 64) * 64);
			}
			function CEILING(state) {
				const stack = state.stack;
				const n = stack.pop();
				stack.push(Math.ceil(n / 64) * 64);
			}
			function ROUND(dt, state) {
				const stack = state.stack;
				const n = stack.pop();
				stack.push(state.round(n / 64) * 64);
			}
			function WCVTF(state) {
				const stack = state.stack;
				const v = stack.pop();
				const l = stack.pop();
				state.cvt[l] = v * state.ppem / state.font.unitsPerEm;
			}
			function DELTAC123(b, state) {
				const stack = state.stack;
				const n = stack.pop();
				const ppem = state.ppem;
				const base = state.deltaBase + (b - 1) * 16;
				const ds = state.deltaShift;
				for (let i = 0; i < n; i++) {
					const c = stack.pop();
					const arg = stack.pop();
					if (base + ((arg & 240) >> 4) !== ppem) continue;
					let mag = (arg & 15) - 8;
					if (mag >= 0) mag++;
					const delta = mag * ds;
					state.cvt[c] += delta;
				}
			}
			function SROUND(state) {
				let n = state.stack.pop();
				state.round = roundSuper;
				let period;
				switch (n & 192) {
					case 0:
						period = .5;
						break;
					case 64:
						period = 1;
						break;
					case 128:
						period = 2;
						break;
					default: throw new Error("invalid SROUND value");
				}
				state.srPeriod = period;
				switch (n & 48) {
					case 0:
						state.srPhase = 0;
						break;
					case 16:
						state.srPhase = .25 * period;
						break;
					case 32:
						state.srPhase = .5 * period;
						break;
					case 48:
						state.srPhase = .75 * period;
						break;
					default: throw new Error("invalid SROUND value");
				}
				n &= 15;
				if (n === 0) state.srThreshold = 0;
				else state.srThreshold = (n / 8 - .5) * period;
			}
			function S45ROUND(state) {
				let n = state.stack.pop();
				state.round = roundSuper;
				let period;
				switch (n & 192) {
					case 0:
						period = Math.sqrt(2) / 2;
						break;
					case 64:
						period = Math.sqrt(2);
						break;
					case 128:
						period = 2 * Math.sqrt(2);
						break;
					default: throw new Error("invalid S45ROUND value");
				}
				state.srPeriod = period;
				switch (n & 48) {
					case 0:
						state.srPhase = 0;
						break;
					case 16:
						state.srPhase = .25 * period;
						break;
					case 32:
						state.srPhase = .5 * period;
						break;
					case 48:
						state.srPhase = .75 * period;
						break;
					default: throw new Error("invalid S45ROUND value");
				}
				n &= 15;
				if (n === 0) state.srThreshold = 0;
				else state.srThreshold = (n / 8 - .5) * period;
			}
			function ROFF(state) {
				state.round = roundOff;
			}
			function RUTG(state) {
				state.round = roundUpToGrid;
			}
			function RDTG(state) {
				state.round = roundDownToGrid;
			}
			function SCANCTRL(state) {
				state.stack.pop();
			}
			function SDPVTL(a, state) {
				const stack = state.stack;
				const p2i = stack.pop();
				const p1i = stack.pop();
				const p2 = state.z2[p2i];
				const p1 = state.z1[p1i];
				let dx;
				let dy;
				if (!a) {
					dx = p1.x - p2.x;
					dy = p1.y - p2.y;
				} else {
					dx = p2.y - p1.y;
					dy = p1.x - p2.x;
				}
				state.dpv = getUnitVector(dx, dy);
			}
			function GETINFO(state) {
				const stack = state.stack;
				const sel = stack.pop();
				let r = 0;
				if (sel & 1) r = 35;
				if (sel & 32) r |= 4096;
				stack.push(r);
			}
			function ROLL(state) {
				const stack = state.stack;
				const a = stack.pop();
				const b = stack.pop();
				const c = stack.pop();
				stack.push(b);
				stack.push(a);
				stack.push(c);
			}
			function MAX(state) {
				const stack = state.stack;
				const e2 = stack.pop();
				const e1 = stack.pop();
				stack.push(Math.max(e1, e2));
			}
			function MIN(state) {
				const stack = state.stack;
				const e2 = stack.pop();
				const e1 = stack.pop();
				stack.push(Math.min(e1, e2));
			}
			function SCANTYPE(state) {
				state.stack.pop();
			}
			function INSTCTRL(state) {
				const s = state.stack.pop();
				let v = state.stack.pop();
				switch (s) {
					case 1:
						state.inhibitGridFit = !!v;
						return;
					case 2:
						state.ignoreCvt = !!v;
						return;
					default: throw new Error("invalid INSTCTRL[] selector");
				}
			}
			function PUSHB(n, state) {
				const stack = state.stack;
				const prog = state.prog;
				let ip = state.ip;
				for (let i = 0; i < n; i++) stack.push(prog[++ip]);
				state.ip = ip;
			}
			function PUSHW(n, state) {
				let ip = state.ip;
				const prog = state.prog;
				const stack = state.stack;
				for (let i = 0; i < n; i++) {
					let w = prog[++ip] << 8 | prog[++ip];
					if (w & 32768) w = -((w ^ 65535) + 1);
					stack.push(w);
				}
				state.ip = ip;
			}
			function MDRP_MIRP(indirect, setRp0, keepD, ro, dt, state) {
				const stack = state.stack;
				const cvte = indirect && stack.pop();
				const pi = stack.pop();
				const rp0i = state.rp0;
				const rp = state.z0[rp0i];
				const p = state.z1[pi];
				const md = state.minDis;
				const fv = state.fv;
				const pv = state.dpv;
				let d;
				let sign;
				let cv;
				d = pv.distance(p, rp, true, true);
				sign = d >= 0 ? 1 : -1;
				d = Math.abs(d);
				if (indirect) {
					cv = state.cvt[cvte];
					if (ro && Math.abs(d - cv) < state.cvCutIn) d = cv;
				}
				if (keepD && d < md) d = md;
				if (ro) d = state.round(d);
				fv.setRelative(p, rp, sign * d, pv);
				fv.touch(p);
				state.rp1 = state.rp0;
				state.rp2 = pi;
				if (setRp0) state.rp0 = pi;
			}
			instructionTable = [
				SVTCA.bind(void 0, yUnitVector),
				SVTCA.bind(void 0, xUnitVector),
				SPVTCA.bind(void 0, yUnitVector),
				SPVTCA.bind(void 0, xUnitVector),
				SFVTCA.bind(void 0, yUnitVector),
				SFVTCA.bind(void 0, xUnitVector),
				SPVTL.bind(void 0, 0),
				SPVTL.bind(void 0, 1),
				SFVTL.bind(void 0, 0),
				SFVTL.bind(void 0, 1),
				SPVFS,
				SFVFS,
				GPV,
				GFV,
				SFVTPV,
				ISECT,
				SRP0,
				SRP1,
				SRP2,
				SZP0,
				SZP1,
				SZP2,
				SZPS,
				SLOOP,
				RTG,
				RTHG,
				SMD,
				ELSE,
				JMPR,
				SCVTCI,
				void 0,
				void 0,
				DUP,
				POP,
				CLEAR,
				SWAP,
				DEPTH,
				CINDEX,
				MINDEX,
				void 0,
				void 0,
				void 0,
				LOOPCALL,
				CALL,
				FDEF,
				void 0,
				MDAP.bind(void 0, 0),
				MDAP.bind(void 0, 1),
				IUP.bind(void 0, yUnitVector),
				IUP.bind(void 0, xUnitVector),
				SHP.bind(void 0, 0),
				SHP.bind(void 0, 1),
				SHC.bind(void 0, 0),
				SHC.bind(void 0, 1),
				SHZ.bind(void 0, 0),
				SHZ.bind(void 0, 1),
				SHPIX,
				IP,
				MSIRP.bind(void 0, 0),
				MSIRP.bind(void 0, 1),
				ALIGNRP,
				RTDG,
				MIAP.bind(void 0, 0),
				MIAP.bind(void 0, 1),
				NPUSHB,
				NPUSHW,
				WS,
				RS,
				WCVTP,
				RCVT,
				GC.bind(void 0, 0),
				GC.bind(void 0, 1),
				void 0,
				MD.bind(void 0, 0),
				MD.bind(void 0, 1),
				MPPEM,
				void 0,
				FLIPON,
				void 0,
				void 0,
				LT,
				LTEQ,
				GT,
				GTEQ,
				EQ,
				NEQ,
				ODD,
				EVEN,
				IF,
				EIF,
				AND,
				OR,
				NOT,
				DELTAP123.bind(void 0, 1),
				SDB,
				SDS,
				ADD,
				SUB,
				DIV,
				MUL,
				ABS,
				NEG,
				FLOOR,
				CEILING,
				ROUND.bind(void 0, 0),
				ROUND.bind(void 0, 1),
				ROUND.bind(void 0, 2),
				ROUND.bind(void 0, 3),
				void 0,
				void 0,
				void 0,
				void 0,
				WCVTF,
				DELTAP123.bind(void 0, 2),
				DELTAP123.bind(void 0, 3),
				DELTAC123.bind(void 0, 1),
				DELTAC123.bind(void 0, 2),
				DELTAC123.bind(void 0, 3),
				SROUND,
				S45ROUND,
				void 0,
				void 0,
				ROFF,
				void 0,
				RUTG,
				RDTG,
				POP,
				POP,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				SCANCTRL,
				SDPVTL.bind(void 0, 0),
				SDPVTL.bind(void 0, 1),
				GETINFO,
				void 0,
				ROLL,
				MAX,
				MIN,
				SCANTYPE,
				INSTCTRL,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				void 0,
				PUSHB.bind(void 0, 1),
				PUSHB.bind(void 0, 2),
				PUSHB.bind(void 0, 3),
				PUSHB.bind(void 0, 4),
				PUSHB.bind(void 0, 5),
				PUSHB.bind(void 0, 6),
				PUSHB.bind(void 0, 7),
				PUSHB.bind(void 0, 8),
				PUSHW.bind(void 0, 1),
				PUSHW.bind(void 0, 2),
				PUSHW.bind(void 0, 3),
				PUSHW.bind(void 0, 4),
				PUSHW.bind(void 0, 5),
				PUSHW.bind(void 0, 6),
				PUSHW.bind(void 0, 7),
				PUSHW.bind(void 0, 8),
				MDRP_MIRP.bind(void 0, 0, 0, 0, 0, 0),
				MDRP_MIRP.bind(void 0, 0, 0, 0, 0, 1),
				MDRP_MIRP.bind(void 0, 0, 0, 0, 0, 2),
				MDRP_MIRP.bind(void 0, 0, 0, 0, 0, 3),
				MDRP_MIRP.bind(void 0, 0, 0, 0, 1, 0),
				MDRP_MIRP.bind(void 0, 0, 0, 0, 1, 1),
				MDRP_MIRP.bind(void 0, 0, 0, 0, 1, 2),
				MDRP_MIRP.bind(void 0, 0, 0, 0, 1, 3),
				MDRP_MIRP.bind(void 0, 0, 0, 1, 0, 0),
				MDRP_MIRP.bind(void 0, 0, 0, 1, 0, 1),
				MDRP_MIRP.bind(void 0, 0, 0, 1, 0, 2),
				MDRP_MIRP.bind(void 0, 0, 0, 1, 0, 3),
				MDRP_MIRP.bind(void 0, 0, 0, 1, 1, 0),
				MDRP_MIRP.bind(void 0, 0, 0, 1, 1, 1),
				MDRP_MIRP.bind(void 0, 0, 0, 1, 1, 2),
				MDRP_MIRP.bind(void 0, 0, 0, 1, 1, 3),
				MDRP_MIRP.bind(void 0, 0, 1, 0, 0, 0),
				MDRP_MIRP.bind(void 0, 0, 1, 0, 0, 1),
				MDRP_MIRP.bind(void 0, 0, 1, 0, 0, 2),
				MDRP_MIRP.bind(void 0, 0, 1, 0, 0, 3),
				MDRP_MIRP.bind(void 0, 0, 1, 0, 1, 0),
				MDRP_MIRP.bind(void 0, 0, 1, 0, 1, 1),
				MDRP_MIRP.bind(void 0, 0, 1, 0, 1, 2),
				MDRP_MIRP.bind(void 0, 0, 1, 0, 1, 3),
				MDRP_MIRP.bind(void 0, 0, 1, 1, 0, 0),
				MDRP_MIRP.bind(void 0, 0, 1, 1, 0, 1),
				MDRP_MIRP.bind(void 0, 0, 1, 1, 0, 2),
				MDRP_MIRP.bind(void 0, 0, 1, 1, 0, 3),
				MDRP_MIRP.bind(void 0, 0, 1, 1, 1, 0),
				MDRP_MIRP.bind(void 0, 0, 1, 1, 1, 1),
				MDRP_MIRP.bind(void 0, 0, 1, 1, 1, 2),
				MDRP_MIRP.bind(void 0, 0, 1, 1, 1, 3),
				MDRP_MIRP.bind(void 0, 1, 0, 0, 0, 0),
				MDRP_MIRP.bind(void 0, 1, 0, 0, 0, 1),
				MDRP_MIRP.bind(void 0, 1, 0, 0, 0, 2),
				MDRP_MIRP.bind(void 0, 1, 0, 0, 0, 3),
				MDRP_MIRP.bind(void 0, 1, 0, 0, 1, 0),
				MDRP_MIRP.bind(void 0, 1, 0, 0, 1, 1),
				MDRP_MIRP.bind(void 0, 1, 0, 0, 1, 2),
				MDRP_MIRP.bind(void 0, 1, 0, 0, 1, 3),
				MDRP_MIRP.bind(void 0, 1, 0, 1, 0, 0),
				MDRP_MIRP.bind(void 0, 1, 0, 1, 0, 1),
				MDRP_MIRP.bind(void 0, 1, 0, 1, 0, 2),
				MDRP_MIRP.bind(void 0, 1, 0, 1, 0, 3),
				MDRP_MIRP.bind(void 0, 1, 0, 1, 1, 0),
				MDRP_MIRP.bind(void 0, 1, 0, 1, 1, 1),
				MDRP_MIRP.bind(void 0, 1, 0, 1, 1, 2),
				MDRP_MIRP.bind(void 0, 1, 0, 1, 1, 3),
				MDRP_MIRP.bind(void 0, 1, 1, 0, 0, 0),
				MDRP_MIRP.bind(void 0, 1, 1, 0, 0, 1),
				MDRP_MIRP.bind(void 0, 1, 1, 0, 0, 2),
				MDRP_MIRP.bind(void 0, 1, 1, 0, 0, 3),
				MDRP_MIRP.bind(void 0, 1, 1, 0, 1, 0),
				MDRP_MIRP.bind(void 0, 1, 1, 0, 1, 1),
				MDRP_MIRP.bind(void 0, 1, 1, 0, 1, 2),
				MDRP_MIRP.bind(void 0, 1, 1, 0, 1, 3),
				MDRP_MIRP.bind(void 0, 1, 1, 1, 0, 0),
				MDRP_MIRP.bind(void 0, 1, 1, 1, 0, 1),
				MDRP_MIRP.bind(void 0, 1, 1, 1, 0, 2),
				MDRP_MIRP.bind(void 0, 1, 1, 1, 0, 3),
				MDRP_MIRP.bind(void 0, 1, 1, 1, 1, 0),
				MDRP_MIRP.bind(void 0, 1, 1, 1, 1, 1),
				MDRP_MIRP.bind(void 0, 1, 1, 1, 1, 2),
				MDRP_MIRP.bind(void 0, 1, 1, 1, 1, 3)
			];
			var hintingtt_default = Hinting;
			function Token(char) {
				this.char = char;
				this.state = {};
				this.activeState = null;
			}
			function ContextRange(startIndex, endOffset, contextName) {
				this.contextName = contextName;
				this.startIndex = startIndex;
				this.endOffset = endOffset;
			}
			function ContextChecker(contextName, checkStart, checkEnd) {
				this.contextName = contextName;
				this.openRange = null;
				this.ranges = [];
				this.checkStart = checkStart;
				this.checkEnd = checkEnd;
			}
			function ContextParams(context, currentIndex) {
				this.context = context;
				this.index = currentIndex;
				this.length = context.length;
				this.current = context[currentIndex];
				this.backtrack = context.slice(0, currentIndex);
				this.lookahead = context.slice(currentIndex + 1);
			}
			function Event(eventId) {
				this.eventId = eventId;
				this.subscribers = [];
			}
			function initializeCoreEvents(events) {
				const coreEvents = [
					"start",
					"end",
					"next",
					"newToken",
					"contextStart",
					"contextEnd",
					"insertToken",
					"removeToken",
					"removeRange",
					"replaceToken",
					"replaceRange",
					"composeRUD",
					"updateContextsRanges"
				];
				for (let i = 0; i < coreEvents.length; i++) {
					const eventId = coreEvents[i];
					Object.defineProperty(this.events, eventId, { value: new Event(eventId) });
				}
				if (events) for (let i = 0; i < coreEvents.length; i++) {
					const eventId = coreEvents[i];
					const event = events[eventId];
					if (typeof event === "function") this.events[eventId].subscribe(event);
				}
				const requiresContextUpdate = [
					"insertToken",
					"removeToken",
					"removeRange",
					"replaceToken",
					"replaceRange",
					"composeRUD"
				];
				for (let i = 0; i < requiresContextUpdate.length; i++) {
					const eventId = requiresContextUpdate[i];
					this.events[eventId].subscribe(this.updateContextsRanges);
				}
			}
			function Tokenizer(events) {
				this.tokens = [];
				this.registeredContexts = {};
				this.contextCheckers = [];
				this.events = {};
				this.registeredModifiers = [];
				initializeCoreEvents.call(this, events);
			}
			Token.prototype.setState = function(key, value) {
				this.state[key] = value;
				this.activeState = {
					key,
					value: this.state[key]
				};
				return this.activeState;
			};
			Token.prototype.getState = function(stateId) {
				return this.state[stateId] || null;
			};
			Tokenizer.prototype.inboundIndex = function(index) {
				return index >= 0 && index < this.tokens.length;
			};
			Tokenizer.prototype.composeRUD = function(RUDs) {
				const silent = true;
				const state = RUDs.map((RUD) => this[RUD[0]].apply(this, RUD.slice(1).concat(silent)));
				const hasFAILObject = (obj) => typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, "FAIL");
				if (state.every(hasFAILObject)) return {
					FAIL: "composeRUD: one or more operations hasn't completed successfully",
					report: state.filter(hasFAILObject)
				};
				this.dispatch("composeRUD", [state.filter((op) => !hasFAILObject(op))]);
			};
			Tokenizer.prototype.replaceRange = function(startIndex, offset, tokens, silent) {
				offset = offset !== null ? offset : this.tokens.length;
				const isTokenType = tokens.every((token) => token instanceof Token);
				if (!isNaN(startIndex) && this.inboundIndex(startIndex) && isTokenType) {
					const replaced = this.tokens.splice.apply(this.tokens, [startIndex, offset].concat(tokens));
					if (!silent) this.dispatch("replaceToken", [
						startIndex,
						offset,
						tokens
					]);
					return [replaced, tokens];
				} else return { FAIL: "replaceRange: invalid tokens or startIndex." };
			};
			Tokenizer.prototype.replaceToken = function(index, token, silent) {
				if (!isNaN(index) && this.inboundIndex(index) && token instanceof Token) {
					const replaced = this.tokens.splice(index, 1, token);
					if (!silent) this.dispatch("replaceToken", [index, token]);
					return [replaced[0], token];
				} else return { FAIL: "replaceToken: invalid token or index." };
			};
			Tokenizer.prototype.removeRange = function(startIndex, offset, silent) {
				offset = !isNaN(offset) ? offset : this.tokens.length;
				const tokens = this.tokens.splice(startIndex, offset);
				if (!silent) this.dispatch("removeRange", [
					tokens,
					startIndex,
					offset
				]);
				return tokens;
			};
			Tokenizer.prototype.removeToken = function(index, silent) {
				if (!isNaN(index) && this.inboundIndex(index)) {
					const token = this.tokens.splice(index, 1);
					if (!silent) this.dispatch("removeToken", [token, index]);
					return token;
				} else return { FAIL: "removeToken: invalid token index." };
			};
			Tokenizer.prototype.insertToken = function(tokens, index, silent) {
				if (tokens.every((token) => token instanceof Token)) {
					this.tokens.splice.apply(this.tokens, [index, 0].concat(tokens));
					if (!silent) this.dispatch("insertToken", [tokens, index]);
					return tokens;
				} else return { FAIL: "insertToken: invalid token(s)." };
			};
			Tokenizer.prototype.registerModifier = function(modifierId, condition, modifier) {
				this.events.newToken.subscribe(function(token, contextParams) {
					const conditionParams = [token, contextParams];
					const canApplyModifier = condition === null || condition.apply(this, conditionParams) === true;
					const modifierParams = [token, contextParams];
					if (canApplyModifier) {
						let newStateValue = modifier.apply(this, modifierParams);
						token.setState(modifierId, newStateValue);
					}
				});
				this.registeredModifiers.push(modifierId);
			};
			Event.prototype.subscribe = function(eventHandler) {
				if (typeof eventHandler === "function") return this.subscribers.push(eventHandler) - 1;
				else return { FAIL: `invalid '${this.eventId}' event handler` };
			};
			Event.prototype.unsubscribe = function(subsId) {
				this.subscribers.splice(subsId, 1);
			};
			ContextParams.prototype.setCurrentIndex = function(index) {
				this.index = index;
				this.current = this.context[index];
				this.backtrack = this.context.slice(0, index);
				this.lookahead = this.context.slice(index + 1);
			};
			ContextParams.prototype.get = function(offset) {
				switch (true) {
					case offset === 0: return this.current;
					case offset < 0 && Math.abs(offset) <= this.backtrack.length: return this.backtrack.slice(offset)[0];
					case offset > 0 && offset <= this.lookahead.length: return this.lookahead[offset - 1];
					default: return null;
				}
			};
			Tokenizer.prototype.rangeToText = function(range) {
				if (range instanceof ContextRange) return this.getRangeTokens(range).map((token) => token.char).join("");
			};
			Tokenizer.prototype.getText = function() {
				return this.tokens.map((token) => token.char).join("");
			};
			Tokenizer.prototype.getContext = function(contextName) {
				let context = this.registeredContexts[contextName];
				return context ? context : null;
			};
			Tokenizer.prototype.on = function(eventName, eventHandler) {
				const event = this.events[eventName];
				if (event) return event.subscribe(eventHandler);
				else return null;
			};
			Tokenizer.prototype.dispatch = function(eventName, args) {
				const event = this.events[eventName];
				if (event instanceof Event) for (let i = 0; i < event.subscribers.length; i++) event.subscribers[i].apply(this, args || []);
			};
			Tokenizer.prototype.registerContextChecker = function(contextName, contextStartCheck, contextEndCheck) {
				if (this.getContext(contextName)) return { FAIL: `context name '${contextName}' is already registered.` };
				if (typeof contextStartCheck !== "function") return { FAIL: "missing context start check." };
				if (typeof contextEndCheck !== "function") return { FAIL: "missing context end check." };
				const contextCheckers = new ContextChecker(contextName, contextStartCheck, contextEndCheck);
				this.registeredContexts[contextName] = contextCheckers;
				this.contextCheckers.push(contextCheckers);
				return contextCheckers;
			};
			Tokenizer.prototype.getRangeTokens = function(range) {
				const endIndex = range.startIndex + range.endOffset;
				return [].concat(this.tokens.slice(range.startIndex, endIndex));
			};
			Tokenizer.prototype.getContextRanges = function(contextName) {
				const context = this.getContext(contextName);
				if (context) return context.ranges;
				else return { FAIL: `context checker '${contextName}' is not registered.` };
			};
			Tokenizer.prototype.resetContextsRanges = function() {
				const registeredContexts = this.registeredContexts;
				for (const contextName in registeredContexts) if (Object.prototype.hasOwnProperty.call(registeredContexts, contextName)) {
					const context = registeredContexts[contextName];
					context.ranges = [];
				}
			};
			Tokenizer.prototype.updateContextsRanges = function() {
				this.resetContextsRanges();
				const chars = this.tokens.map((token) => token.char);
				for (let i = 0; i < chars.length; i++) {
					const contextParams = new ContextParams(chars, i);
					this.runContextCheck(contextParams);
				}
				this.dispatch("updateContextsRanges", [this.registeredContexts]);
			};
			Tokenizer.prototype.setEndOffset = function(offset, contextName) {
				const startIndex = this.getContext(contextName).openRange.startIndex;
				let range = new ContextRange(startIndex, offset, contextName);
				const ranges = this.getContext(contextName).ranges;
				range.rangeId = `${contextName}.${ranges.length}`;
				ranges.push(range);
				this.getContext(contextName).openRange = null;
				return range;
			};
			Tokenizer.prototype.runContextCheck = function(contextParams) {
				const index = contextParams.index;
				for (let i = 0; i < this.contextCheckers.length; i++) {
					const contextChecker = this.contextCheckers[i];
					let contextName = contextChecker.contextName;
					let openRange = this.getContext(contextName).openRange;
					if (!openRange && contextChecker.checkStart(contextParams)) {
						openRange = new ContextRange(index, null, contextName);
						this.getContext(contextName).openRange = openRange;
						this.dispatch("contextStart", [contextName, index]);
					}
					if (!!openRange && contextChecker.checkEnd(contextParams)) {
						const offset = index - openRange.startIndex + 1;
						const range = this.setEndOffset(offset, contextName);
						this.dispatch("contextEnd", [contextName, range]);
					}
				}
			};
			Tokenizer.prototype.tokenize = function(text) {
				this.tokens = [];
				this.resetContextsRanges();
				let chars = Array.from(text);
				this.dispatch("start");
				for (let i = 0; i < chars.length; i++) {
					const char = chars[i];
					const contextParams = new ContextParams(chars, i);
					this.dispatch("next", [contextParams]);
					this.runContextCheck(contextParams);
					let token = new Token(char);
					this.tokens.push(token);
					this.dispatch("newToken", [token, contextParams]);
				}
				this.dispatch("end", [this.tokens]);
				return this.tokens;
			};
			var tokenizer_default = Tokenizer;
			function isArabicChar(c) {
				return /[\u0600-\u065F\u066A-\u06D2\u06FA-\u06FF]/.test(c);
			}
			function isIsolatedArabicChar(char) {
				return /[\u0630\u0690\u0621\u0631\u0661\u0671\u0622\u0632\u0672\u0692\u06C2\u0623\u0673\u0693\u06C3\u0624\u0694\u06C4\u0625\u0675\u0695\u06C5\u06E5\u0676\u0696\u06C6\u0627\u0677\u0697\u06C7\u0648\u0688\u0698\u06C8\u0689\u0699\u06C9\u068A\u06CA\u066B\u068B\u06CB\u068C\u068D\u06CD\u06FD\u068E\u06EE\u06FE\u062F\u068F\u06CF\u06EF]/.test(char);
			}
			function isTashkeelArabicChar(char) {
				return /[\u0600-\u0605\u060C-\u060E\u0610-\u061B\u061E\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/.test(char);
			}
			function isThaiChar(c) {
				return /[\u0E00-\u0E7F]/.test(c);
			}
			function isLatinChar(c) {
				return /[A-z]/.test(c);
			}
			function isWhiteSpace(c) {
				return /\s/.test(c);
			}
			function FeatureQuery(font) {
				this.font = font;
				this.features = {};
			}
			function SubstitutionAction(action) {
				this.id = action.id;
				this.tag = action.tag;
				this.substitution = action.substitution;
			}
			function lookupCoverage(glyphIndex, coverage) {
				if (!glyphIndex) return -1;
				switch (coverage.format) {
					case 1: return coverage.glyphs.indexOf(glyphIndex);
					case 2: {
						let ranges = coverage.ranges;
						for (let i = 0; i < ranges.length; i++) {
							const range = ranges[i];
							if (glyphIndex >= range.start && glyphIndex <= range.end) {
								let offset = glyphIndex - range.start;
								return range.index + offset;
							}
						}
						break;
					}
					default: return -1;
				}
				return -1;
			}
			function singleSubstitutionFormat1(glyphIndex, subtable) {
				if (lookupCoverage(glyphIndex, subtable.coverage) === -1) return null;
				return glyphIndex + subtable.deltaGlyphId;
			}
			function singleSubstitutionFormat2(glyphIndex, subtable) {
				let substituteIndex = lookupCoverage(glyphIndex, subtable.coverage);
				if (substituteIndex === -1) return null;
				return subtable.substitute[substituteIndex];
			}
			function lookupCoverageList(coverageList, contextParams) {
				let lookupList = [];
				for (let i = 0; i < coverageList.length; i++) {
					const coverage = coverageList[i];
					let glyphIndex = contextParams.current;
					glyphIndex = Array.isArray(glyphIndex) ? glyphIndex[0] : glyphIndex;
					const lookupIndex = lookupCoverage(glyphIndex, coverage);
					if (lookupIndex !== -1) lookupList.push(lookupIndex);
				}
				if (lookupList.length !== coverageList.length) return -1;
				return lookupList;
			}
			function chainingSubstitutionFormat3(contextParams, subtable) {
				const lookupsCount = subtable.inputCoverage.length + subtable.lookaheadCoverage.length + subtable.backtrackCoverage.length;
				if (contextParams.context.length < lookupsCount) return [];
				let inputLookups = lookupCoverageList(subtable.inputCoverage, contextParams);
				if (inputLookups === -1) return [];
				const lookaheadOffset = subtable.inputCoverage.length - 1;
				if (contextParams.lookahead.length < subtable.lookaheadCoverage.length) return [];
				let lookaheadContext = contextParams.lookahead.slice(lookaheadOffset);
				while (lookaheadContext.length && isTashkeelArabicChar(lookaheadContext[0].char)) lookaheadContext.shift();
				const lookaheadParams = new ContextParams(lookaheadContext, 0);
				let lookaheadLookups = lookupCoverageList(subtable.lookaheadCoverage, lookaheadParams);
				let backtrackContext = [].concat(contextParams.backtrack);
				backtrackContext.reverse();
				while (backtrackContext.length && isTashkeelArabicChar(backtrackContext[0].char)) backtrackContext.shift();
				if (backtrackContext.length < subtable.backtrackCoverage.length) return [];
				const backtrackParams = new ContextParams(backtrackContext, 0);
				let backtrackLookups = lookupCoverageList(subtable.backtrackCoverage, backtrackParams);
				const contextRulesMatch = inputLookups.length === subtable.inputCoverage.length && lookaheadLookups.length === subtable.lookaheadCoverage.length && backtrackLookups.length === subtable.backtrackCoverage.length;
				let substitutions = [];
				if (contextRulesMatch) for (let i = 0; i < subtable.lookupRecords.length; i++) {
					const lookupRecord = subtable.lookupRecords[i];
					const lookupListIndex = lookupRecord.lookupListIndex;
					const lookupTable = this.getLookupByIndex(lookupListIndex);
					for (let s = 0; s < lookupTable.subtables.length; s++) {
						let subtable2 = lookupTable.subtables[s];
						let lookup;
						let substitutionType = this.getSubstitutionType(lookupTable, subtable2);
						if (substitutionType === "71") {
							substitutionType = this.getSubstitutionType(subtable2, subtable2.extension);
							lookup = this.getLookupMethod(subtable2, subtable2.extension);
							subtable2 = subtable2.extension;
						} else lookup = this.getLookupMethod(lookupTable, subtable2);
						if (substitutionType === "12") {
							const glyphIndex = contextParams.get(lookupRecord.sequenceIndex);
							const substitution = lookup(glyphIndex);
							if (substitution) substitutions.push(substitution);
						} else if (substitutionType === "21") {
							const glyphIndex = contextParams.get(lookupRecord.sequenceIndex);
							const substitution = lookup(glyphIndex);
							if (substitution) substitutions.push(substitution);
						} else throw new Error(`Substitution type ${substitutionType} is not supported in chaining substitution`);
					}
				}
				return substitutions;
			}
			function ligatureSubstitutionFormat1(contextParams, subtable) {
				let glyphIndex = contextParams.current;
				let ligSetIndex = lookupCoverage(glyphIndex, subtable.coverage);
				if (ligSetIndex === -1) return null;
				let ligature;
				let ligatureSet = subtable.ligatureSets[ligSetIndex];
				for (let s = 0; s < ligatureSet.length; s++) {
					ligature = ligatureSet[s];
					for (let l = 0; l < ligature.components.length; l++) {
						if (contextParams.lookahead[l] !== ligature.components[l]) break;
						if (l === ligature.components.length - 1) return ligature;
					}
				}
				return null;
			}
			function contextSubstitutionFormat1(contextParams, subtable) {
				let glyphId = contextParams.current;
				if (lookupCoverage(glyphId, subtable.coverage) === -1) return null;
				for (const ruleSet of subtable.ruleSets) for (const rule of ruleSet) {
					let matched = true;
					for (let i = 0; i < rule.input.length; i++) if (contextParams.lookahead[i] !== rule.input[i]) {
						matched = false;
						break;
					}
					if (matched) {
						let substitutions = [];
						substitutions.push(glyphId);
						for (let i = 0; i < rule.input.length; i++) substitutions.push(rule.input[i]);
						const parser = (substitutions2, lookupRecord) => {
							const { lookupListIndex, sequenceIndex } = lookupRecord;
							const { subtables } = this.getLookupByIndex(lookupListIndex);
							for (const subtable2 of subtables) if (lookupCoverage(substitutions2[sequenceIndex], subtable2.coverage) !== -1) substitutions2[sequenceIndex] = subtable2.deltaGlyphId;
						};
						for (let i = 0; i < rule.lookupRecords.length; i++) {
							const lookupRecord = rule.lookupRecords[i];
							parser(substitutions, lookupRecord);
						}
						return substitutions;
					}
				}
				return null;
			}
			function contextSubstitutionFormat3(contextParams, subtable) {
				if (contextParams.context.length < subtable.coverages.length) return [];
				for (let i = 0; i < subtable.coverages.length; i++) {
					let glyphIndex = contextParams.get(i);
					glyphIndex = Array.isArray(glyphIndex) ? glyphIndex[0] : glyphIndex;
					if (lookupCoverage(glyphIndex, subtable.coverages[i]) === -1) return [];
				}
				let substitutions = [];
				for (let i = 0; i < subtable.lookupRecords.length; i++) {
					const lookupRecord = subtable.lookupRecords[i];
					const lookupListIndex = lookupRecord.lookupListIndex;
					const lookupTable = this.getLookupByIndex(lookupListIndex);
					for (let s = 0; s < lookupTable.subtables.length; s++) {
						let subtable2 = lookupTable.subtables[s];
						let lookup;
						let substitutionType = this.getSubstitutionType(lookupTable, subtable2);
						if (substitutionType === "71") {
							substitutionType = this.getSubstitutionType(subtable2, subtable2.extension);
							lookup = this.getLookupMethod(subtable2, subtable2.extension);
							subtable2 = subtable2.extension;
						} else lookup = this.getLookupMethod(lookupTable, subtable2);
						if (substitutionType === "12") {
							const glyphIndex = contextParams.get(lookupRecord.sequenceIndex);
							const substitution = lookup(glyphIndex);
							if (substitution) substitutions.push(substitution);
						} else if (substitutionType === "21") {
							const glyphIndex = contextParams.get(lookupRecord.sequenceIndex);
							const substitution = lookup(glyphIndex);
							if (substitution) substitutions.push(substitution);
						}
					}
				}
				return substitutions;
			}
			function decompositionSubstitutionFormat1(glyphIndex, subtable) {
				let substituteIndex = lookupCoverage(glyphIndex, subtable.coverage);
				if (substituteIndex === -1) return null;
				return subtable.sequences[substituteIndex];
			}
			FeatureQuery.prototype.getDefaultScriptFeaturesIndexes = function() {
				const scripts = this.font.tables.gsub.scripts;
				for (let s = 0; s < scripts.length; s++) {
					const script = scripts[s];
					if (script.tag === "DFLT") return script.script.defaultLangSys.featureIndexes;
				}
				return [];
			};
			FeatureQuery.prototype.getScriptFeaturesIndexes = function(scriptTag) {
				if (!this.font.tables.gsub) return [];
				if (!scriptTag) return this.getDefaultScriptFeaturesIndexes();
				const scripts = this.font.tables.gsub.scripts;
				for (let i = 0; i < scripts.length; i++) {
					const script = scripts[i];
					if (script.tag === scriptTag && script.script.defaultLangSys) return script.script.defaultLangSys.featureIndexes;
					else {
						let langSysRecords = script.langSysRecords;
						if (langSysRecords) for (let j = 0; j < langSysRecords.length; j++) {
							const langSysRecord = langSysRecords[j];
							if (langSysRecord.tag === scriptTag) return langSysRecord.langSys.featureIndexes;
						}
					}
				}
				return this.getDefaultScriptFeaturesIndexes();
			};
			FeatureQuery.prototype.mapTagsToFeatures = function(features, scriptTag) {
				let tags = {};
				for (let i = 0; i < features.length; i++) {
					const tag = features[i].tag;
					tags[tag] = features[i].feature;
				}
				this.features[scriptTag].tags = tags;
			};
			FeatureQuery.prototype.getScriptFeatures = function(scriptTag) {
				let features = this.features[scriptTag];
				if (Object.prototype.hasOwnProperty.call(this.features, scriptTag)) return features;
				const featuresIndexes = this.getScriptFeaturesIndexes(scriptTag);
				if (!featuresIndexes) return null;
				const gsub = this.font.tables.gsub;
				features = featuresIndexes.map((index) => gsub.features[index]);
				this.features[scriptTag] = features;
				this.mapTagsToFeatures(features, scriptTag);
				return features;
			};
			FeatureQuery.prototype.getSubstitutionType = function(lookupTable, subtable) {
				return lookupTable.lookupType.toString() + subtable.substFormat.toString();
			};
			FeatureQuery.prototype.getLookupMethod = function(lookupTable, subtable) {
				let substitutionType = this.getSubstitutionType(lookupTable, subtable);
				switch (substitutionType) {
					case "11": return (glyphIndex) => singleSubstitutionFormat1.apply(this, [glyphIndex, subtable]);
					case "12": return (glyphIndex) => singleSubstitutionFormat2.apply(this, [glyphIndex, subtable]);
					case "63": return (contextParams) => chainingSubstitutionFormat3.apply(this, [contextParams, subtable]);
					case "41": return (contextParams) => ligatureSubstitutionFormat1.apply(this, [contextParams, subtable]);
					case "21": return (glyphIndex) => decompositionSubstitutionFormat1.apply(this, [glyphIndex, subtable]);
					case "51": return (contextParams) => contextSubstitutionFormat1.apply(this, [contextParams, subtable]);
					case "53": return (contextParams) => contextSubstitutionFormat3.apply(this, [contextParams, subtable]);
					default: throw new Error(`substitutionType : ${substitutionType} lookupType: ${lookupTable.lookupType} - substFormat: ${subtable.substFormat} is not yet supported`);
				}
			};
			FeatureQuery.prototype.lookupFeature = function(query) {
				let contextParams = query.contextParams;
				let currentIndex = contextParams.index;
				const feature = this.getFeature({
					tag: query.tag,
					script: query.script
				});
				if (!feature) return /* @__PURE__ */ new Error(`font '${(this.font.names.unicode || this.font.names.windows || this.font.names.macintosh).fullName.en}' doesn't support feature '${query.tag}' for script '${query.script}'.`);
				const lookups = this.getFeatureLookups(feature);
				const substitutions = [].concat(contextParams.context);
				for (let l = 0; l < lookups.length; l++) {
					const lookupTable = lookups[l];
					const subtables = this.getLookupSubtables(lookupTable);
					for (let s = 0; s < subtables.length; s++) {
						let subtable = subtables[s];
						let substType = this.getSubstitutionType(lookupTable, subtable);
						let lookup;
						if (substType === "71") {
							substType = this.getSubstitutionType(subtable, subtable.extension);
							lookup = this.getLookupMethod(subtable, subtable.extension);
							subtable = subtable.extension;
						} else lookup = this.getLookupMethod(lookupTable, subtable);
						let substitution;
						switch (substType) {
							case "11":
								substitution = lookup(contextParams.current);
								if (substitution) substitutions.splice(currentIndex, 1, new SubstitutionAction({
									id: 11,
									tag: query.tag,
									substitution
								}));
								break;
							case "12":
								substitution = lookup(contextParams.current);
								if (substitution) substitutions.splice(currentIndex, 1, new SubstitutionAction({
									id: 12,
									tag: query.tag,
									substitution
								}));
								break;
							case "63":
								substitution = lookup(contextParams);
								if (Array.isArray(substitution) && substitution.length) substitutions.splice(currentIndex, 1, new SubstitutionAction({
									id: 63,
									tag: query.tag,
									substitution
								}));
								break;
							case "41":
								substitution = lookup(contextParams);
								if (substitution) substitutions.splice(currentIndex, 1, new SubstitutionAction({
									id: 41,
									tag: query.tag,
									substitution
								}));
								break;
							case "21":
								substitution = lookup(contextParams.current);
								if (substitution) substitutions.splice(currentIndex, 1, new SubstitutionAction({
									id: 21,
									tag: query.tag,
									substitution
								}));
								break;
							case "51":
							case "53":
								substitution = lookup(contextParams);
								if (Array.isArray(substitution) && substitution.length) substitutions.splice(currentIndex, 1, new SubstitutionAction({
									id: parseInt(substType),
									tag: query.tag,
									substitution
								}));
						}
						contextParams = new ContextParams(substitutions, currentIndex);
						if (Array.isArray(substitution) && !substitution.length) continue;
						substitution = null;
					}
				}
				return substitutions.length ? substitutions : null;
			};
			FeatureQuery.prototype.supports = function(query) {
				if (!query.script) return false;
				this.getScriptFeatures(query.script);
				const supportedScript = Object.prototype.hasOwnProperty.call(this.features, query.script);
				if (!query.tag) return supportedScript;
				const supportedFeature = this.features[query.script].some((feature) => feature.tag === query.tag);
				return supportedScript && supportedFeature;
			};
			FeatureQuery.prototype.getLookupSubtables = function(lookupTable) {
				return lookupTable.subtables || null;
			};
			FeatureQuery.prototype.getLookupByIndex = function(index) {
				return this.font.tables.gsub.lookups[index] || null;
			};
			FeatureQuery.prototype.getFeatureLookups = function(feature) {
				return feature.lookupListIndexes.map(this.getLookupByIndex.bind(this));
			};
			FeatureQuery.prototype.getFeature = function getFeature(query) {
				if (!this.font) return { FAIL: "No font was found" };
				if (!Object.prototype.hasOwnProperty.call(this.features, query.script)) this.getScriptFeatures(query.script);
				const scriptFeatures = this.features[query.script];
				if (!scriptFeatures) return { FAIL: `No feature for script ${query.script}` };
				if (!scriptFeatures.tags[query.tag]) return null;
				return this.features[query.script].tags[query.tag];
			};
			var featureQuery_default = FeatureQuery;
			function arabicWordStartCheck(contextParams) {
				const char = contextParams.current;
				const prevChar = contextParams.get(-1);
				return prevChar === null && isArabicChar(char) || !isArabicChar(prevChar) && isArabicChar(char);
			}
			function arabicWordEndCheck(contextParams) {
				const nextChar = contextParams.get(1);
				return nextChar === null || !isArabicChar(nextChar);
			}
			var arabicWord_default = {
				startCheck: arabicWordStartCheck,
				endCheck: arabicWordEndCheck
			};
			function arabicSentenceStartCheck(contextParams) {
				const char = contextParams.current;
				const prevChar = contextParams.get(-1);
				return (isArabicChar(char) || isTashkeelArabicChar(char)) && !isArabicChar(prevChar);
			}
			function arabicSentenceEndCheck(contextParams) {
				const nextChar = contextParams.get(1);
				switch (true) {
					case nextChar === null: return true;
					case !isArabicChar(nextChar) && !isTashkeelArabicChar(nextChar): {
						const nextIsWhitespace = isWhiteSpace(nextChar);
						if (!nextIsWhitespace) return true;
						if (nextIsWhitespace) {
							let arabicCharAhead = false;
							arabicCharAhead = contextParams.lookahead.some((c) => isArabicChar(c) || isTashkeelArabicChar(c));
							if (!arabicCharAhead) return true;
						}
						break;
					}
					default: return false;
				}
			}
			var arabicSentence_default = {
				startCheck: arabicSentenceStartCheck,
				endCheck: arabicSentenceEndCheck
			};
			function singleSubstitutionFormat12(action, tokens, index) {
				tokens[index].setState(action.tag, action.substitution);
			}
			function singleSubstitutionFormat22(action, tokens, index) {
				tokens[index].setState(action.tag, action.substitution);
			}
			function chainingSubstitutionFormat32(action, tokens, index) {
				for (let i = 0; i < action.substitution.length; i++) {
					const subst = action.substitution[i];
					const token = tokens[index + i];
					if (Array.isArray(subst)) {
						if (subst.length) token.setState(action.tag, subst[0]);
						else token.setState("deleted", true);
						continue;
					}
					token.setState(action.tag, subst);
				}
			}
			function ligatureSubstitutionFormat12(action, tokens, index) {
				let token = tokens[index];
				token.setState(action.tag, action.substitution.ligGlyph);
				const compsCount = action.substitution.components.length;
				for (let i = 0; i < compsCount; i++) {
					token = tokens[index + i + 1];
					token.setState("deleted", true);
				}
			}
			var SUBSTITUTIONS = {
				11: singleSubstitutionFormat12,
				12: singleSubstitutionFormat22,
				63: chainingSubstitutionFormat32,
				41: ligatureSubstitutionFormat12,
				51: chainingSubstitutionFormat32,
				53: chainingSubstitutionFormat32
			};
			function applySubstitution(action, tokens, index) {
				if (action instanceof SubstitutionAction && SUBSTITUTIONS[action.id]) SUBSTITUTIONS[action.id](action, tokens, index);
			}
			var applySubstitution_default = applySubstitution;
			function willConnectPrev(charContextParams) {
				let backtrack = [].concat(charContextParams.backtrack);
				for (let i = backtrack.length - 1; i >= 0; i--) {
					const prevChar = backtrack[i];
					const isolated = isIsolatedArabicChar(prevChar);
					const tashkeel = isTashkeelArabicChar(prevChar);
					if (!isolated && !tashkeel) return true;
					if (isolated) return false;
				}
				return false;
			}
			function willConnectNext(charContextParams) {
				if (isIsolatedArabicChar(charContextParams.current)) return false;
				for (let i = 0; i < charContextParams.lookahead.length; i++) {
					const nextChar = charContextParams.lookahead[i];
					if (!isTashkeelArabicChar(nextChar)) return true;
				}
				return false;
			}
			function arabicPresentationForms(range) {
				const script = "arab";
				const tags = this.featuresTags[script];
				const tokens = this.tokenizer.getRangeTokens(range);
				if (tokens.length === 1) return;
				let contextParams = new ContextParams(tokens.map((token) => token.getState("glyphIndex")), 0);
				const charContextParams = new ContextParams(tokens.map((token) => token.char), 0);
				for (let i = 0; i < tokens.length; i++) {
					const token = tokens[i];
					if (isTashkeelArabicChar(token.char)) continue;
					contextParams.setCurrentIndex(i);
					charContextParams.setCurrentIndex(i);
					let CONNECT = 0;
					if (willConnectPrev(charContextParams)) CONNECT |= 1;
					if (willConnectNext(charContextParams)) CONNECT |= 2;
					let tag;
					switch (CONNECT) {
						case 1:
							tag = "fina";
							break;
						case 2:
							tag = "init";
							break;
						case 3: tag = "medi";
					}
					if (tags.indexOf(tag) === -1) continue;
					let substitutions = this.query.lookupFeature({
						tag,
						script,
						contextParams
					});
					if (substitutions instanceof Error) {
						console.info(substitutions.message);
						continue;
					}
					for (let j = 0; j < substitutions.length; j++) {
						const action = substitutions[j];
						if (action instanceof SubstitutionAction) {
							applySubstitution_default(action, tokens, j);
							contextParams.context[j] = action.substitution;
						}
					}
				}
			}
			var arabicPresentationForms_default = arabicPresentationForms;
			function getContextParams(tokens, index) {
				return new ContextParams(tokens.map((token) => token.activeState.value), index || 0);
			}
			function arabicRequiredLigatures(range) {
				const script = "arab";
				let tokens = this.tokenizer.getRangeTokens(range);
				let contextParams = getContextParams(tokens);
				for (let index = 0; index < contextParams.context.length; index++) {
					contextParams.setCurrentIndex(index);
					let substitutions = this.query.lookupFeature({
						tag: "rlig",
						script,
						contextParams
					});
					if (substitutions.length) {
						for (let i = 0; i < substitutions.length; i++) {
							const action = substitutions[i];
							applySubstitution_default(action, tokens, index);
						}
						contextParams = getContextParams(tokens);
					}
				}
			}
			var arabicRequiredLigatures_default = arabicRequiredLigatures;
			function ccmpReplacementStartCheck(contextParams) {
				return contextParams.index === 0 && contextParams.context.length > 1;
			}
			function ccmpReplacementEndCheck(contextParams) {
				return contextParams.index === contextParams.context.length - 1;
			}
			var ccmpReplacement_default = {
				startCheck: ccmpReplacementStartCheck,
				endCheck: ccmpReplacementEndCheck
			};
			function getContextParams2(tokens, index) {
				return new ContextParams(tokens.map((token) => token.activeState.value), index || 0);
			}
			function ccmpReplacementLigatures(range) {
				const script = "delf";
				const tag = "ccmp";
				let tokens = this.tokenizer.getRangeTokens(range);
				let contextParams = getContextParams2(tokens);
				for (let index = 0; index < contextParams.context.length; index++) {
					if (!this.query.getFeature({
						tag,
						script,
						contextParams
					})) continue;
					contextParams.setCurrentIndex(index);
					let substitutions = this.query.lookupFeature({
						tag,
						script,
						contextParams
					});
					if (substitutions.length) {
						for (let i = 0; i < substitutions.length; i++) {
							const action = substitutions[i];
							applySubstitution_default(action, tokens, index);
						}
						contextParams = getContextParams2(tokens);
					}
				}
			}
			var ccmpReplacementLigatures_default = ccmpReplacementLigatures;
			function latinWordStartCheck(contextParams) {
				const char = contextParams.current;
				const prevChar = contextParams.get(-1);
				return prevChar === null && isLatinChar(char) || !isLatinChar(prevChar) && isLatinChar(char);
			}
			function latinWordEndCheck(contextParams) {
				const nextChar = contextParams.get(1);
				return nextChar === null || !isLatinChar(nextChar);
			}
			var latinWord_default = {
				startCheck: latinWordStartCheck,
				endCheck: latinWordEndCheck
			};
			function getContextParams3(tokens, index) {
				return new ContextParams(tokens.map((token) => token.activeState.value), index || 0);
			}
			function latinLigature(range) {
				const script = "latn";
				let tokens = this.tokenizer.getRangeTokens(range);
				let contextParams = getContextParams3(tokens);
				for (let index = 0; index < contextParams.context.length; index++) {
					contextParams.setCurrentIndex(index);
					let substitutions = this.query.lookupFeature({
						tag: "liga",
						script,
						contextParams
					});
					if (substitutions.length) {
						for (let i = 0; i < substitutions.length; i++) {
							const action = substitutions[i];
							applySubstitution_default(action, tokens, index);
						}
						contextParams = getContextParams3(tokens);
					}
				}
			}
			var latinLigatures_default = latinLigature;
			function thaiWordStartCheck(contextParams) {
				const char = contextParams.current;
				const prevChar = contextParams.get(-1);
				return prevChar === null && isThaiChar(char) || !isThaiChar(prevChar) && isThaiChar(char);
			}
			function thaiWordEndCheck(contextParams) {
				const nextChar = contextParams.get(1);
				return nextChar === null || !isThaiChar(nextChar);
			}
			var thaiWord_default = {
				startCheck: thaiWordStartCheck,
				endCheck: thaiWordEndCheck
			};
			function getContextParams4(tokens, index) {
				return new ContextParams(tokens.map((token) => token.activeState.value), index || 0);
			}
			function thaiGlyphComposition(range) {
				const script = "thai";
				let tokens = this.tokenizer.getRangeTokens(range);
				let contextParams = getContextParams4(tokens, 0);
				for (let index = 0; index < contextParams.context.length; index++) {
					contextParams.setCurrentIndex(index);
					let substitutions = this.query.lookupFeature({
						tag: "ccmp",
						script,
						contextParams
					});
					if (substitutions.length) {
						for (let i = 0; i < substitutions.length; i++) {
							const action = substitutions[i];
							applySubstitution_default(action, tokens, index);
						}
						contextParams = getContextParams4(tokens, index);
					}
				}
			}
			var thaiGlyphComposition_default = thaiGlyphComposition;
			function getContextParams5(tokens, index) {
				return new ContextParams(tokens.map((token) => token.activeState.value), index || 0);
			}
			function thaiLigatures(range) {
				const script = "thai";
				let tokens = this.tokenizer.getRangeTokens(range);
				let contextParams = getContextParams5(tokens, 0);
				for (let index = 0; index < contextParams.context.length; index++) {
					contextParams.setCurrentIndex(index);
					let substitutions = this.query.lookupFeature({
						tag: "liga",
						script,
						contextParams
					});
					if (substitutions.length) {
						for (let i = 0; i < substitutions.length; i++) {
							const action = substitutions[i];
							applySubstitution_default(action, tokens, index);
						}
						contextParams = getContextParams5(tokens, index);
					}
				}
			}
			var thaiLigatures_default = thaiLigatures;
			function getContextParams6(tokens, index) {
				return new ContextParams(tokens.map((token) => token.activeState.value), index || 0);
			}
			function thaiRequiredLigatures(range) {
				const script = "thai";
				let tokens = this.tokenizer.getRangeTokens(range);
				let contextParams = getContextParams6(tokens, 0);
				for (let index = 0; index < contextParams.context.length; index++) {
					contextParams.setCurrentIndex(index);
					let substitutions = this.query.lookupFeature({
						tag: "rlig",
						script,
						contextParams
					});
					if (substitutions.length) {
						for (let i = 0; i < substitutions.length; i++) {
							const action = substitutions[i];
							applySubstitution_default(action, tokens, index);
						}
						contextParams = getContextParams6(tokens, index);
					}
				}
			}
			var thaiRequiredLigatures_default = thaiRequiredLigatures;
			function isVariationSequenceSelector(char) {
				if (char === null) return false;
				const charCode = char.codePointAt(0);
				return charCode >= 6155 && charCode <= 6157 || charCode >= 65024 && charCode <= 65039 || charCode >= 917760 && charCode <= 917999;
			}
			function unicodeVariationSequenceStartCheck(contextParams) {
				const char = contextParams.current;
				const nextChar = contextParams.get(1);
				return nextChar === null && isVariationSequenceSelector(char) || isVariationSequenceSelector(nextChar);
			}
			function unicodeVariationSequenceEndCheck(contextParams) {
				const nextChar = contextParams.get(1);
				return nextChar === null || !isVariationSequenceSelector(nextChar);
			}
			var variationSequenceCheck_default = {
				startCheck: unicodeVariationSequenceStartCheck,
				endCheck: unicodeVariationSequenceEndCheck
			};
			function unicodeVariationSequence(range) {
				const font = this.query.font;
				const tokens = this.tokenizer.getRangeTokens(range);
				tokens[1].setState("deleted", true);
				if (font.tables.cmap && font.tables.cmap.varSelectorList) {
					const baseCodePoint = tokens[0].char.codePointAt(0);
					const vsCodePoint = tokens[1].char.codePointAt(0);
					const selectorLookup = font.tables.cmap.varSelectorList[vsCodePoint];
					if (selectorLookup !== void 0) {
						if (selectorLookup.nonDefaultUVS) {
							const mappings = selectorLookup.nonDefaultUVS.uvsMappings;
							if (mappings[baseCodePoint]) {
								const replacementGlyphId = mappings[baseCodePoint].glyphID;
								if (font.glyphs.glyphs[replacementGlyphId] !== void 0) tokens[0].setState("glyphIndex", replacementGlyphId);
							}
						}
					}
				}
			}
			var variationSequences_default = unicodeVariationSequence;
			function Bidi(baseDir) {
				this.baseDir = baseDir || "ltr";
				this.tokenizer = new tokenizer_default();
				this.featuresTags = {};
			}
			Bidi.prototype.setText = function(text) {
				this.text = text;
			};
			Bidi.prototype.contextChecks = {
				ccmpReplacementCheck: ccmpReplacement_default,
				latinWordCheck: latinWord_default,
				arabicWordCheck: arabicWord_default,
				arabicSentenceCheck: arabicSentence_default,
				thaiWordCheck: thaiWord_default,
				unicodeVariationSequenceCheck: variationSequenceCheck_default
			};
			function registerContextChecker(checkId) {
				const check = this.contextChecks[`${checkId}Check`];
				return this.tokenizer.registerContextChecker(checkId, check.startCheck, check.endCheck);
			}
			function tokenizeText() {
				registerContextChecker.call(this, "ccmpReplacement");
				registerContextChecker.call(this, "latinWord");
				registerContextChecker.call(this, "arabicWord");
				registerContextChecker.call(this, "arabicSentence");
				registerContextChecker.call(this, "thaiWord");
				registerContextChecker.call(this, "unicodeVariationSequence");
				return this.tokenizer.tokenize(this.text);
			}
			function reverseArabicSentences() {
				const ranges = this.tokenizer.getContextRanges("arabicSentence");
				for (let i = 0; i < ranges.length; i++) {
					const range = ranges[i];
					let rangeTokens = this.tokenizer.getRangeTokens(range);
					this.tokenizer.replaceRange(range.startIndex, range.endOffset, rangeTokens.reverse());
				}
			}
			Bidi.prototype.registerFeatures = function(script, tags) {
				const supportedTags = tags.filter((tag) => this.query.supports({
					script,
					tag
				}));
				if (!Object.prototype.hasOwnProperty.call(this.featuresTags, script)) this.featuresTags[script] = supportedTags;
				else this.featuresTags[script] = this.featuresTags[script].concat(supportedTags);
			};
			Bidi.prototype.applyFeatures = function(font, features) {
				if (!font) throw new Error("No valid font was provided to apply features");
				if (!this.query) this.query = new featureQuery_default(font);
				for (let f = 0; f < features.length; f++) {
					const feature = features[f];
					if (!this.query.supports({ script: feature.script })) continue;
					this.registerFeatures(feature.script, feature.tags);
				}
			};
			Bidi.prototype.registerModifier = function(modifierId, condition, modifier) {
				this.tokenizer.registerModifier(modifierId, condition, modifier);
			};
			function checkGlyphIndexStatus() {
				if (this.tokenizer.registeredModifiers.indexOf("glyphIndex") === -1) throw new Error("glyphIndex modifier is required to apply arabic presentation features.");
			}
			function applyArabicPresentationForms() {
				if (!Object.prototype.hasOwnProperty.call(this.featuresTags, "arab")) return;
				checkGlyphIndexStatus.call(this);
				const ranges = this.tokenizer.getContextRanges("arabicWord");
				for (let i = 0; i < ranges.length; i++) {
					const range = ranges[i];
					arabicPresentationForms_default.call(this, range);
				}
			}
			function applyCcmpReplacement() {
				checkGlyphIndexStatus.call(this);
				const ranges = this.tokenizer.getContextRanges("ccmpReplacement");
				for (let i = 0; i < ranges.length; i++) {
					const range = ranges[i];
					ccmpReplacementLigatures_default.call(this, range);
				}
			}
			function applyArabicRequireLigatures() {
				if (!this.hasFeatureEnabled("arab", "rlig")) return;
				checkGlyphIndexStatus.call(this);
				const ranges = this.tokenizer.getContextRanges("arabicWord");
				for (let i = 0; i < ranges.length; i++) {
					const range = ranges[i];
					arabicRequiredLigatures_default.call(this, range);
				}
			}
			function applyLatinLigatures() {
				if (!this.hasFeatureEnabled("latn", "liga")) return;
				checkGlyphIndexStatus.call(this);
				const ranges = this.tokenizer.getContextRanges("latinWord");
				for (let i = 0; i < ranges.length; i++) {
					const range = ranges[i];
					latinLigatures_default.call(this, range);
				}
			}
			function applyUnicodeVariationSequences() {
				const ranges = this.tokenizer.getContextRanges("unicodeVariationSequence");
				for (let i = 0; i < ranges.length; i++) {
					const range = ranges[i];
					variationSequences_default.call(this, range);
				}
			}
			function applyThaiFeatures() {
				checkGlyphIndexStatus.call(this);
				const ranges = this.tokenizer.getContextRanges("thaiWord");
				for (let i = 0; i < ranges.length; i++) {
					const range = ranges[i];
					if (this.hasFeatureEnabled("thai", "liga")) thaiLigatures_default.call(this, range);
					if (this.hasFeatureEnabled("thai", "rlig")) thaiRequiredLigatures_default.call(this, range);
					if (this.hasFeatureEnabled("thai", "ccmp")) thaiGlyphComposition_default.call(this, range);
				}
			}
			Bidi.prototype.checkContextReady = function(contextId) {
				return !!this.tokenizer.getContext(contextId);
			};
			Bidi.prototype.applyFeaturesToContexts = function() {
				if (this.checkContextReady("ccmpReplacement")) applyCcmpReplacement.call(this);
				if (this.checkContextReady("arabicWord")) {
					applyArabicPresentationForms.call(this);
					applyArabicRequireLigatures.call(this);
				}
				if (this.checkContextReady("latinWord")) applyLatinLigatures.call(this);
				if (this.checkContextReady("arabicSentence")) reverseArabicSentences.call(this);
				if (this.checkContextReady("thaiWord")) applyThaiFeatures.call(this);
				if (this.checkContextReady("unicodeVariationSequence")) applyUnicodeVariationSequences.call(this);
			};
			Bidi.prototype.hasFeatureEnabled = function(script, tag) {
				return (this.featuresTags[script] || []).indexOf(tag) !== -1;
			};
			Bidi.prototype.processText = function(text) {
				if (!this.text || this.text !== text) {
					this.setText(text);
					tokenizeText.call(this);
					this.applyFeaturesToContexts();
				}
			};
			Bidi.prototype.getBidiText = function(text) {
				this.processText(text);
				return this.tokenizer.getText();
			};
			Bidi.prototype.getTextGlyphs = function(text) {
				this.processText(text);
				let indexes = [];
				for (let i = 0; i < this.tokenizer.tokens.length; i++) {
					const token = this.tokenizer.tokens[i];
					if (token.state.deleted) continue;
					const index = token.activeState.value;
					indexes.push(Array.isArray(index) ? index[0] : index);
				}
				return indexes;
			};
			var bidi_default = Bidi;
			function createDefaultNamesInfo(options) {
				return {
					fontFamily: { en: options.familyName || " " },
					fontSubfamily: { en: options.styleName || " " },
					fullName: { en: options.fullName || options.familyName + " " + options.styleName },
					postScriptName: { en: options.postScriptName || (options.familyName + options.styleName).replace(/\s/g, "") },
					designer: { en: options.designer || " " },
					designerURL: { en: options.designerURL || " " },
					manufacturer: { en: options.manufacturer || " " },
					manufacturerURL: { en: options.manufacturerURL || " " },
					license: { en: options.license || " " },
					licenseURL: { en: options.licenseURL || " " },
					version: { en: options.version || "Version 0.1" },
					description: { en: options.description || " " },
					copyright: { en: options.copyright || " " },
					trademark: { en: options.trademark || " " }
				};
			}
			function Font(options) {
				options = options || {};
				options.tables = options.tables || {};
				if (!options.empty) {
					if (!options.familyName) throw new Error("When creating a new Font object, familyName is required.");
					if (!options.styleName) throw new Error("When creating a new Font object, styleName is required.");
					if (!options.unitsPerEm) throw new Error("When creating a new Font object, unitsPerEm is required.");
					if (!options.ascender) throw new Error("When creating a new Font object, ascender is required.");
					if (options.descender > 0) throw new Error("When creating a new Font object, negative descender value is required.");
					this.names = {};
					this.names.unicode = createDefaultNamesInfo(options);
					this.names.macintosh = createDefaultNamesInfo(options);
					this.names.windows = createDefaultNamesInfo(options);
					this.unitsPerEm = options.unitsPerEm || 1e3;
					this.ascender = options.ascender;
					this.descender = options.descender;
					this.createdTimestamp = options.createdTimestamp;
					this.italicAngle = options.italicAngle || 0;
					this.weightClass = options.weightClass || 0;
					let selection = 0;
					if (options.fsSelection) selection = options.fsSelection;
					else {
						if (this.italicAngle < 0) selection |= this.fsSelectionValues.ITALIC;
						else if (this.italicAngle > 0) selection |= this.fsSelectionValues.OBLIQUE;
						if (this.weightClass >= 600) selection |= this.fsSelectionValues.BOLD;
						if (selection === 0) selection = this.fsSelectionValues.REGULAR;
					}
					if (!options.panose || !Array.isArray(options.panose)) options.panose = [
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0
					];
					this.tables = Object.assign(options.tables, { os2: Object.assign({
						usWeightClass: options.weightClass || this.usWeightClasses.MEDIUM,
						usWidthClass: options.widthClass || this.usWidthClasses.MEDIUM,
						bFamilyType: options.panose[0] || 0,
						bSerifStyle: options.panose[1] || 0,
						bWeight: options.panose[2] || 0,
						bProportion: options.panose[3] || 0,
						bContrast: options.panose[4] || 0,
						bStrokeVariation: options.panose[5] || 0,
						bArmStyle: options.panose[6] || 0,
						bLetterform: options.panose[7] || 0,
						bMidline: options.panose[8] || 0,
						bXHeight: options.panose[9] || 0,
						fsSelection: selection
					}, options.tables.os2) });
				}
				this.supported = true;
				this.glyphs = new glyphset_default.GlyphSet(this, options.glyphs || []);
				this.encoding = new DefaultEncoding(this);
				this.position = new position_default(this);
				this.substitution = new substitution_default(this);
				this.tables = this.tables || {};
				this.tables = new Proxy(this.tables, { set: (tables, tableName, tableData) => {
					tables[tableName] = tableData;
					if (tables.fvar && (tables.gvar || tables.cff2) && !this.variation) this.variation = new VariationManager(this);
					return true;
				} });
				this.palettes = new PaletteManager(this);
				this.layers = new LayerManager(this);
				this.svgImages = new SVGImageManager(this);
				this._push = null;
				this._hmtxTableData = {};
				Object.defineProperty(this, "hinting", { get: function() {
					if (this._hinting) return this._hinting;
					if (this.outlinesFormat === "truetype") return this._hinting = new hintingtt_default(this);
					return null;
				} });
			}
			Font.prototype.hasChar = function(c) {
				return this.encoding.charToGlyphIndex(c) > 0;
			};
			Font.prototype.charToGlyphIndex = function(s) {
				return this.encoding.charToGlyphIndex(s);
			};
			Font.prototype.charToGlyph = function(c) {
				const glyphIndex = this.charToGlyphIndex(c);
				let glyph = this.glyphs.get(glyphIndex);
				if (!glyph) glyph = this.glyphs.get(0);
				return glyph;
			};
			Font.prototype.updateFeatures = function(options) {
				return this.defaultRenderOptions.features.map((feature) => {
					if (feature.script === "latn") return {
						script: "latn",
						tags: feature.tags.filter((tag) => options[tag])
					};
					else return feature;
				});
			};
			Font.prototype.stringToGlyphIndexes = function(s, options) {
				const bidi = new bidi_default();
				const charToGlyphIndexMod = (token) => this.charToGlyphIndex(token.char);
				bidi.registerModifier("glyphIndex", null, charToGlyphIndexMod);
				let features = options ? this.updateFeatures(options.features) : this.defaultRenderOptions.features;
				bidi.applyFeatures(this, features);
				return bidi.getTextGlyphs(s);
			};
			Font.prototype.stringToGlyphs = function(s, options) {
				const indexes = this.stringToGlyphIndexes(s, options);
				let length = indexes.length;
				const glyphs = new Array(length);
				const notdef = this.glyphs.get(0);
				for (let i = 0; i < length; i += 1) glyphs[i] = this.glyphs.get(indexes[i]) || notdef;
				return glyphs;
			};
			Font.prototype.nameToGlyphIndex = function(name) {
				return this.glyphNames.nameToGlyphIndex(name);
			};
			Font.prototype.nameToGlyph = function(name) {
				const glyphIndex = this.nameToGlyphIndex(name);
				let glyph = this.glyphs.get(glyphIndex);
				if (!glyph) glyph = this.glyphs.get(0);
				return glyph;
			};
			Font.prototype.glyphIndexToName = function(gid) {
				if (!this.glyphNames.glyphIndexToName) return "";
				return this.glyphNames.glyphIndexToName(gid);
			};
			Font.prototype.getKerningValue = function(leftGlyph, rightGlyph) {
				leftGlyph = leftGlyph.index || leftGlyph;
				rightGlyph = rightGlyph.index || rightGlyph;
				const gposKerning = this.position.defaultKerningTables;
				if (gposKerning) return this.position.getKerningValue(gposKerning, leftGlyph, rightGlyph);
				return this.kerningPairs[leftGlyph + "," + rightGlyph] || 0;
			};
			Font.prototype.defaultRenderOptions = {
				kerning: true,
				features: [
					(
					/**
					* these 4 features are required to render Arabic text properly
					* and shouldn't be turned off when rendering arabic text.
					*/
					{
						script: "arab",
						tags: [
							"init",
							"medi",
							"fina",
							"rlig"
						]
					}),
					{
						script: "latn",
						tags: ["liga", "rlig"]
					},
					{
						script: "thai",
						tags: [
							"liga",
							"rlig",
							"ccmp"
						]
					}
				],
				hinting: false,
				usePalette: 0,
				drawLayers: true,
				drawSVG: true
			};
			Font.prototype.forEachGlyph = function(text, x, y, fontSize, options, callback) {
				x = x !== void 0 ? x : 0;
				y = y !== void 0 ? y : 0;
				fontSize = fontSize !== void 0 ? fontSize : 72;
				options = Object.assign({}, this.defaultRenderOptions, options);
				const fontScale = 1 / this.unitsPerEm * fontSize;
				const glyphs = this.stringToGlyphs(text, options);
				let kerningLookups;
				if (options.kerning) {
					const script = options.script || this.position.getDefaultScriptName();
					kerningLookups = this.position.getKerningTables(script, options.language);
				}
				for (let i = 0; i < glyphs.length; i += 1) {
					const glyph = glyphs[i];
					callback.call(this, glyph, x, y, fontSize, options);
					if (glyph.advanceWidth) x += glyph.advanceWidth * fontScale;
					if (options.kerning && i < glyphs.length - 1) {
						const kerningValue = kerningLookups ? this.position.getKerningValue(kerningLookups, glyph.index, glyphs[i + 1].index) : this.getKerningValue(glyph, glyphs[i + 1]);
						x += kerningValue * fontScale;
					}
					if (options.letterSpacing) x += options.letterSpacing * fontSize;
					else if (options.tracking) x += options.tracking / 1e3 * fontSize;
				}
				return x;
			};
			Font.prototype.getPath = function(text, x, y, fontSize, options) {
				options = Object.assign({}, this.defaultRenderOptions, options);
				const fullPath = new path_default();
				fullPath._layers = [];
				applyPaintType(this, fullPath, fontSize);
				if (fullPath.stroke) {
					const scale = 1 / (fullPath.unitsPerEm || 1e3) * fontSize;
					fullPath.strokeWidth *= scale;
				}
				this.forEachGlyph(text, x, y, fontSize, options, (glyph, gX, gY, gFontSize) => {
					const glyphPath = glyph.getPath(gX, gY, gFontSize, options, this);
					if (options.drawSVG || options.drawLayers) {
						const layers = glyphPath._layers;
						if (layers && layers.length) {
							for (let l = 0; l < layers.length; l++) {
								const layer = layers[l];
								fullPath._layers.push(layer);
							}
							return;
						}
					}
					fullPath.extend(glyphPath);
				});
				return fullPath;
			};
			Font.prototype.getPaths = function(text, x, y, fontSize, options) {
				options = Object.assign({}, this.defaultRenderOptions, options);
				const glyphPaths = [];
				this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
					const glyphPath = glyph.getPath(gX, gY, gFontSize, options, this);
					glyphPaths.push(glyphPath);
				});
				return glyphPaths;
			};
			Font.prototype.getAdvanceWidth = function(text, fontSize, options) {
				options = Object.assign({}, this.defaultRenderOptions, options);
				return this.forEachGlyph(text, 0, 0, fontSize, options, function() {});
			};
			Font.prototype.draw = function(ctx, text, x, y, fontSize, options) {
				this.getPath(text, x, y, fontSize, options).draw(ctx);
			};
			Font.prototype.drawPoints = function(ctx, text, x, y, fontSize, options) {
				options = Object.assign({}, this.defaultRenderOptions, options);
				this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
					glyph.drawPoints(ctx, gX, gY, gFontSize, options, this);
				});
			};
			Font.prototype.drawMetrics = function(ctx, text, x, y, fontSize, options) {
				options = Object.assign({}, this.defaultRenderOptions, options);
				this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
					glyph.drawMetrics(ctx, gX, gY, gFontSize);
				});
			};
			Font.prototype.getEnglishName = function(name) {
				const translations = (this.names.unicode || this.names.macintosh || this.names.windows)[name];
				if (translations) return translations.en;
			};
			Font.prototype.validate = function() {
				const warnings = [];
				const _this = this;
				function assert(predicate, message) {
					if (!predicate) {
						console.warn(`[opentype.js] ${message}`);
						warnings.push(message);
					}
				}
				function assertNamePresent(name) {
					const englishName = _this.getEnglishName(name);
					assert(englishName && englishName.trim().length > 0, "No English " + name + " specified.");
				}
				assertNamePresent("fontFamily");
				assertNamePresent("weightName");
				assertNamePresent("manufacturer");
				assertNamePresent("copyright");
				assertNamePresent("version");
				assert(this.unitsPerEm > 0, "No unitsPerEm specified.");
				if (this.tables.colr) {
					const baseGlyphs = this.tables.colr.baseGlyphRecords;
					let previousID = -1;
					for (let b = 0; b < baseGlyphs.length; b++) {
						const currentGlyphID = baseGlyphs[b].glyphID;
						assert(previousID < baseGlyphs[b].glyphID, `baseGlyphs must be sorted by GlyphID in ascending order, but glyphID ${currentGlyphID} comes after ${previousID}`);
						if (previousID > baseGlyphs[b].glyphID) break;
						previousID = currentGlyphID;
					}
				}
				return warnings;
			};
			Font.prototype.toTables = function() {
				return sfnt_default.fontToTable(this);
			};
			Font.prototype.toBuffer = function() {
				console.warn("Font.toBuffer is deprecated. Use Font.toArrayBuffer instead.");
				return this.toArrayBuffer();
			};
			Font.prototype.toArrayBuffer = function() {
				const bytes = this.toTables().encode();
				const buffer = new ArrayBuffer(bytes.length);
				const intArray = new Uint8Array(buffer);
				for (let i = 0; i < bytes.length; i++) intArray[i] = bytes[i];
				return buffer;
			};
			Font.prototype.download = function() {
				console.error("DEPRECATED: platform-specific actions are to be implemented on user-side");
			};
			Font.prototype.fsSelectionValues = {
				ITALIC: 1,
				UNDERSCORE: 2,
				NEGATIVE: 4,
				OUTLINED: 8,
				STRIKEOUT: 16,
				BOLD: 32,
				REGULAR: 64,
				USER_TYPO_METRICS: 128,
				WWS: 256,
				OBLIQUE: 512
			};
			Font.prototype.macStyleValues = {
				BOLD: 1,
				ITALIC: 2,
				UNDERLINE: 4,
				OUTLINED: 8,
				SHADOW: 16,
				CONDENSED: 32,
				EXTENDED: 64
			};
			Font.prototype.usWidthClasses = {
				ULTRA_CONDENSED: 1,
				EXTRA_CONDENSED: 2,
				CONDENSED: 3,
				SEMI_CONDENSED: 4,
				MEDIUM: 5,
				SEMI_EXPANDED: 6,
				EXPANDED: 7,
				EXTRA_EXPANDED: 8,
				ULTRA_EXPANDED: 9
			};
			Font.prototype.usWeightClasses = {
				THIN: 100,
				EXTRA_LIGHT: 200,
				LIGHT: 300,
				NORMAL: 400,
				MEDIUM: 500,
				SEMI_BOLD: 600,
				BOLD: 700,
				EXTRA_BOLD: 800,
				BLACK: 900
			};
			var font_default = Font;
			function parseHvarTable(data, start) {
				const p = new parse_default.Parser(data, start);
				const tableVersionMajor = p.parseUShort();
				const tableVersionMinor = p.parseUShort();
				if (tableVersionMajor !== 1) console.warn(`Unsupported hvar table version ${tableVersionMajor}.${tableVersionMinor}`);
				return {
					version: [tableVersionMajor, tableVersionMinor],
					itemVariationStore: p.parsePointer32(function() {
						return this.parseItemVariationStore();
					}),
					advanceWidth: p.parsePointer32(function() {
						return this.parseDeltaSetIndexMap();
					}),
					lsb: p.parsePointer32(function() {
						return this.parseDeltaSetIndexMap();
					}),
					rsb: p.parsePointer32(function() {
						return this.parseDeltaSetIndexMap();
					})
				};
			}
			function makeHvarTable() {
				console.warn("Writing of hvar tables is not yet supported.");
			}
			var hvar_default = {
				make: makeHvarTable,
				parse: parseHvarTable
			};
			var attachList = function() {
				return {
					coverage: this.parsePointer(Parser.coverage),
					attachPoints: this.parseList(Parser.pointer(Parser.uShortList))
				};
			};
			var caretValue = function() {
				var format = this.parseUShort();
				check_default.argument(format === 1 || format === 2 || format === 3, "Unsupported CaretValue table version.");
				if (format === 1) return { coordinate: this.parseShort() };
				else if (format === 2) return { pointindex: this.parseShort() };
				else if (format === 3) return { coordinate: this.parseShort() };
			};
			var ligGlyph = function() {
				return this.parseList(Parser.pointer(caretValue));
			};
			var ligCaretList = function() {
				return {
					coverage: this.parsePointer(Parser.coverage),
					ligGlyphs: this.parseList(Parser.pointer(ligGlyph))
				};
			};
			var markGlyphSets = function() {
				this.parseUShort();
				return this.parseList(Parser.pointer(Parser.coverage));
			};
			function parseGDEFTable(data, start) {
				start = start || 0;
				const p = new Parser(data, start);
				const tableVersion = p.parseVersion(1);
				check_default.argument(tableVersion === 1 || tableVersion === 1.2 || tableVersion === 1.3, "Unsupported GDEF table version.");
				var gdef = {
					version: tableVersion,
					classDef: p.parsePointer(Parser.classDef),
					attachList: p.parsePointer(attachList),
					ligCaretList: p.parsePointer(ligCaretList),
					markAttachClassDef: p.parsePointer(Parser.classDef)
				};
				if (tableVersion >= 1.2) gdef.markGlyphSets = p.parsePointer(markGlyphSets);
				return gdef;
			}
			var gdef_default = { parse: parseGDEFTable };
			var subtableParsers2 = new Array(10);
			subtableParsers2[1] = function parseLookup12() {
				const start = this.offset + this.relativeOffset;
				const posformat = this.parseUShort();
				if (posformat === 1) return {
					posFormat: 1,
					coverage: this.parsePointer(Parser.coverage),
					value: this.parseValueRecord()
				};
				else if (posformat === 2) return {
					posFormat: 2,
					coverage: this.parsePointer(Parser.coverage),
					values: this.parseValueRecordList()
				};
				check_default.assert(false, "0x" + start.toString(16) + ": GPOS lookup type 1 format must be 1 or 2.");
			};
			subtableParsers2[2] = function parseLookup22() {
				const start = this.offset + this.relativeOffset;
				const posFormat = this.parseUShort();
				check_default.assert(posFormat === 1 || posFormat === 2, "0x" + start.toString(16) + ": GPOS lookup type 2 format must be 1 or 2.");
				const coverage = this.parsePointer(Parser.coverage);
				const valueFormat1 = this.parseUShort();
				const valueFormat2 = this.parseUShort();
				if (posFormat === 1) return {
					posFormat,
					coverage,
					valueFormat1,
					valueFormat2,
					pairSets: this.parseList(Parser.pointer(Parser.list(function() {
						return {
							secondGlyph: this.parseUShort(),
							value1: this.parseValueRecord(valueFormat1),
							value2: this.parseValueRecord(valueFormat2)
						};
					})))
				};
				else if (posFormat === 2) {
					const classDef1 = this.parsePointer(Parser.classDef);
					const classDef2 = this.parsePointer(Parser.classDef);
					const class1Count = this.parseUShort();
					const class2Count = this.parseUShort();
					return {
						posFormat,
						coverage,
						valueFormat1,
						valueFormat2,
						classDef1,
						classDef2,
						class1Count,
						class2Count,
						classRecords: this.parseList(class1Count, Parser.list(class2Count, function() {
							return {
								value1: this.parseValueRecord(valueFormat1),
								value2: this.parseValueRecord(valueFormat2)
							};
						}))
					};
				}
			};
			subtableParsers2[3] = function parseLookup32() {
				return { error: "GPOS Lookup 3 not supported" };
			};
			subtableParsers2[4] = function parseLookup42() {
				return { error: "GPOS Lookup 4 not supported" };
			};
			subtableParsers2[5] = function parseLookup52() {
				return { error: "GPOS Lookup 5 not supported" };
			};
			subtableParsers2[6] = function parseLookup62() {
				return { error: "GPOS Lookup 6 not supported" };
			};
			subtableParsers2[7] = function parseLookup72() {
				return { error: "GPOS Lookup 7 not supported" };
			};
			subtableParsers2[8] = function parseLookup82() {
				return { error: "GPOS Lookup 8 not supported" };
			};
			subtableParsers2[9] = function parseLookup9() {
				return { error: "GPOS Lookup 9 not supported" };
			};
			function parseGposTable(data, start) {
				start = start || 0;
				const p = new Parser(data, start);
				const tableVersion = p.parseVersion(1);
				check_default.argument(tableVersion === 1 || tableVersion === 1.1, "Unsupported GPOS table version " + tableVersion);
				if (tableVersion === 1) return {
					version: tableVersion,
					scripts: p.parseScriptList(),
					features: p.parseFeatureList(),
					lookups: p.parseLookupList(subtableParsers2)
				};
				else return {
					version: tableVersion,
					scripts: p.parseScriptList(),
					features: p.parseFeatureList(),
					lookups: p.parseLookupList(subtableParsers2),
					variations: p.parseFeatureVariationsList()
				};
			}
			var subtableMakers2 = new Array(10);
			function makeGposTable(gpos) {
				return new table_default.Table("GPOS", [
					{
						name: "version",
						type: "ULONG",
						value: 65536
					},
					{
						name: "scripts",
						type: "TABLE",
						value: new table_default.ScriptList(gpos.scripts)
					},
					{
						name: "features",
						type: "TABLE",
						value: new table_default.FeatureList(gpos.features)
					},
					{
						name: "lookups",
						type: "TABLE",
						value: new table_default.LookupList(gpos.lookups, subtableMakers2)
					}
				]);
			}
			var gpos_default = {
				parse: parseGposTable,
				make: makeGposTable
			};
			function parseWindowsKernTable(p) {
				const pairs = {};
				p.skip("uShort");
				const subtableVersion = p.parseUShort();
				check_default.argument(subtableVersion === 0, "Unsupported kern sub-table version.");
				p.skip("uShort", 2);
				const nPairs = p.parseUShort();
				p.skip("uShort", 3);
				for (let i = 0; i < nPairs; i += 1) {
					const leftIndex = p.parseUShort();
					const rightIndex = p.parseUShort();
					const value = p.parseShort();
					pairs[leftIndex + "," + rightIndex] = value;
				}
				return pairs;
			}
			function parseMacKernTable(p) {
				const pairs = {};
				p.skip("uShort");
				if (p.parseULong() > 1) console.warn("Only the first kern subtable is supported.");
				p.skip("uLong");
				const subtableVersion = p.parseUShort() & 255;
				p.skip("uShort");
				if (subtableVersion === 0) {
					const nPairs = p.parseUShort();
					p.skip("uShort", 3);
					for (let i = 0; i < nPairs; i += 1) {
						const leftIndex = p.parseUShort();
						const rightIndex = p.parseUShort();
						const value = p.parseShort();
						pairs[leftIndex + "," + rightIndex] = value;
					}
				}
				return pairs;
			}
			function parseKernTable(data, start) {
				const p = new parse_default.Parser(data, start);
				const tableVersion = p.parseUShort();
				if (tableVersion === 0) return parseWindowsKernTable(p);
				else if (tableVersion === 1) return parseMacKernTable(p);
				else throw new Error("Unsupported kern table version (" + tableVersion + ").");
			}
			var kern_default = { parse: parseKernTable };
			function parseLocaTable(data, start, numGlyphs, shortVersion) {
				const p = new parse_default.Parser(data, start);
				const parseFn = shortVersion ? p.parseUShort : p.parseULong;
				const glyphOffsets = [];
				for (let i = 0; i < numGlyphs + 1; i += 1) {
					let glyphOffset = parseFn.call(p);
					if (shortVersion) glyphOffset *= 2;
					glyphOffsets.push(glyphOffset);
				}
				return glyphOffsets;
			}
			var loca_default = { parse: parseLocaTable };
			function parseOpenTypeTableEntries(data, numTables) {
				const tableEntries = [];
				let p = 12;
				for (let i = 0; i < numTables; i += 1) {
					const tag = parse_default.getTag(data, p);
					const checksum = parse_default.getULong(data, p + 4);
					const offset = parse_default.getULong(data, p + 8);
					const length = parse_default.getULong(data, p + 12);
					tableEntries.push({
						tag,
						checksum,
						offset,
						length,
						compression: false
					});
					p += 16;
				}
				return tableEntries;
			}
			function parseWOFFTableEntries(data, numTables) {
				const tableEntries = [];
				let p = 44;
				for (let i = 0; i < numTables; i += 1) {
					const tag = parse_default.getTag(data, p);
					const offset = parse_default.getULong(data, p + 4);
					const compLength = parse_default.getULong(data, p + 8);
					const origLength = parse_default.getULong(data, p + 12);
					let compression;
					if (compLength < origLength) compression = "WOFF";
					else compression = false;
					tableEntries.push({
						tag,
						offset,
						compression,
						compressedLength: compLength,
						length: origLength
					});
					p += 20;
				}
				return tableEntries;
			}
			function uncompressTable(data, tableEntry) {
				if (tableEntry.compression === "WOFF") {
					const inBuffer = new Uint8Array(data.buffer, tableEntry.offset + 2, tableEntry.compressedLength - 2);
					const outBuffer = new Uint8Array(tableEntry.length);
					tinf_uncompress(inBuffer, outBuffer);
					if (outBuffer.byteLength !== tableEntry.length) throw new Error("Decompression error: " + tableEntry.tag + " decompressed length doesn't match recorded length");
					return {
						data: new DataView(outBuffer.buffer, 0),
						offset: 0
					};
				} else return {
					data,
					offset: tableEntry.offset
				};
			}
			function parseBuffer(buffer, opt = {}) {
				let indexToLocFormat;
				let ltagTable;
				const font = new font_default({ empty: true });
				if (buffer.constructor !== ArrayBuffer) buffer = new Uint8Array(buffer).buffer;
				const data = new DataView(buffer, 0);
				let numTables;
				let tableEntries = [];
				const signature = parse_default.getTag(data, 0);
				if (signature === String.fromCharCode(0, 1, 0, 0) || signature === "true" || signature === "typ1") {
					font.outlinesFormat = "truetype";
					numTables = parse_default.getUShort(data, 4);
					tableEntries = parseOpenTypeTableEntries(data, numTables);
				} else if (signature === "OTTO") {
					font.outlinesFormat = "cff";
					numTables = parse_default.getUShort(data, 4);
					tableEntries = parseOpenTypeTableEntries(data, numTables);
				} else if (signature === "wOFF") {
					const flavor = parse_default.getTag(data, 4);
					if (flavor === String.fromCharCode(0, 1, 0, 0)) font.outlinesFormat = "truetype";
					else if (flavor === "OTTO") font.outlinesFormat = "cff";
					else throw new Error("Unsupported OpenType flavor " + signature);
					numTables = parse_default.getUShort(data, 12);
					tableEntries = parseWOFFTableEntries(data, numTables);
				} else if (signature === "wOF2") throw new Error("WOFF2 require an external decompressor library, see examples at: https://github.com/opentypejs/opentype.js/issues/183#issuecomment-1147228025");
				else throw new Error("Unsupported OpenType signature " + signature);
				let cffTableEntry;
				let cff2TableEntry;
				let fvarTableEntry;
				let statTableEntry;
				let gvarTableEntry;
				let cvarTableEntry;
				let avarTableEntry;
				let glyfTableEntry;
				let gdefTableEntry;
				let gposTableEntry;
				let gsubTableEntry;
				let hmtxTableEntry;
				let hvarTableEntry;
				let kernTableEntry;
				let locaTableEntry;
				let nameTableEntry;
				let metaTableEntry;
				let p;
				for (let i = 0; i < numTables; i += 1) {
					const tableEntry = tableEntries[i];
					let table;
					switch (tableEntry.tag) {
						case "avar":
							avarTableEntry = tableEntry;
							break;
						case "cmap":
							table = uncompressTable(data, tableEntry);
							font.tables.cmap = cmap_default.parse(table.data, table.offset);
							font.encoding = new CmapEncoding(font.tables.cmap);
							break;
						case "cvt ":
							table = uncompressTable(data, tableEntry);
							p = new parse_default.Parser(table.data, table.offset);
							font.tables.cvt = p.parseShortList(tableEntry.length / 2);
							break;
						case "fvar":
							fvarTableEntry = tableEntry;
							break;
						case "STAT":
							statTableEntry = tableEntry;
							break;
						case "gvar":
							gvarTableEntry = tableEntry;
							break;
						case "cvar":
							cvarTableEntry = tableEntry;
							break;
						case "fpgm":
							table = uncompressTable(data, tableEntry);
							p = new parse_default.Parser(table.data, table.offset);
							font.tables.fpgm = p.parseByteList(tableEntry.length);
							break;
						case "head":
							table = uncompressTable(data, tableEntry);
							font.tables.head = head_default.parse(table.data, table.offset);
							font.unitsPerEm = font.tables.head.unitsPerEm;
							indexToLocFormat = font.tables.head.indexToLocFormat;
							break;
						case "hhea":
							table = uncompressTable(data, tableEntry);
							font.tables.hhea = hhea_default.parse(table.data, table.offset);
							font.ascender = font.tables.hhea.ascender;
							font.descender = font.tables.hhea.descender;
							font.numberOfHMetrics = font.tables.hhea.numberOfHMetrics;
							break;
						case "HVAR":
							hvarTableEntry = tableEntry;
							break;
						case "hmtx":
							hmtxTableEntry = tableEntry;
							break;
						case "ltag":
							table = uncompressTable(data, tableEntry);
							ltagTable = ltag_default.parse(table.data, table.offset);
							break;
						case "COLR":
							table = uncompressTable(data, tableEntry);
							font.tables.colr = colr_default.parse(table.data, table.offset);
							break;
						case "CPAL":
							table = uncompressTable(data, tableEntry);
							font.tables.cpal = cpal_default.parse(table.data, table.offset);
							break;
						case "maxp":
							table = uncompressTable(data, tableEntry);
							font.tables.maxp = maxp_default.parse(table.data, table.offset);
							font.numGlyphs = font.tables.maxp.numGlyphs;
							break;
						case "name":
							nameTableEntry = tableEntry;
							break;
						case "OS/2":
							table = uncompressTable(data, tableEntry);
							font.tables.os2 = os2_default.parse(table.data, table.offset);
							break;
						case "post":
							table = uncompressTable(data, tableEntry);
							font.tables.post = post_default.parse(table.data, table.offset);
							font.glyphNames = new GlyphNames(font.tables.post);
							break;
						case "prep":
							table = uncompressTable(data, tableEntry);
							p = new parse_default.Parser(table.data, table.offset);
							font.tables.prep = p.parseByteList(tableEntry.length);
							break;
						case "glyf":
							glyfTableEntry = tableEntry;
							break;
						case "loca":
							locaTableEntry = tableEntry;
							break;
						case "CFF ":
							cffTableEntry = tableEntry;
							break;
						case "CFF2":
							cff2TableEntry = tableEntry;
							break;
						case "kern":
							kernTableEntry = tableEntry;
							break;
						case "GDEF":
							gdefTableEntry = tableEntry;
							break;
						case "GPOS":
							gposTableEntry = tableEntry;
							break;
						case "GSUB":
							gsubTableEntry = tableEntry;
							break;
						case "meta":
							metaTableEntry = tableEntry;
							break;
						case "gasp":
							try {
								table = uncompressTable(data, tableEntry);
								font.tables.gasp = gasp_default.parse(table.data, table.offset);
							} catch (e) {
								console.warn("Failed to parse gasp table, skipping.");
								console.warn(e);
							}
							break;
						case "SVG ":
							table = uncompressTable(data, tableEntry);
							font.tables.svg = svg_default.parse(table.data, table.offset);
					}
				}
				const nameTable = uncompressTable(data, nameTableEntry);
				font.tables.name = name_default.parse(nameTable.data, nameTable.offset, ltagTable);
				font.names = font.tables.name;
				if (glyfTableEntry && locaTableEntry) {
					const shortVersion = indexToLocFormat === 0;
					const locaTable = uncompressTable(data, locaTableEntry);
					const locaOffsets = loca_default.parse(locaTable.data, locaTable.offset, font.numGlyphs, shortVersion);
					const glyfTable = uncompressTable(data, glyfTableEntry);
					font.glyphs = glyf_default.parse(glyfTable.data, glyfTable.offset, locaOffsets, font, opt);
				} else if (cffTableEntry) {
					const cffTable = uncompressTable(data, cffTableEntry);
					cff_default.parse(cffTable.data, cffTable.offset, font, opt);
				} else if (cff2TableEntry) {
					const cffTable2 = uncompressTable(data, cff2TableEntry);
					cff_default.parse(cffTable2.data, cffTable2.offset, font, opt);
				} else throw new Error("Font doesn't contain TrueType, CFF or CFF2 outlines.");
				const hmtxTable = uncompressTable(data, hmtxTableEntry);
				hmtx_default.parse(font, hmtxTable.data, hmtxTable.offset, font.numberOfHMetrics, font.numGlyphs, font.glyphs, opt);
				addGlyphNames(font, opt);
				if (kernTableEntry) {
					const kernTable = uncompressTable(data, kernTableEntry);
					font.kerningPairs = kern_default.parse(kernTable.data, kernTable.offset);
				} else font.kerningPairs = {};
				if (gdefTableEntry) {
					const gdefTable = uncompressTable(data, gdefTableEntry);
					font.tables.gdef = gdef_default.parse(gdefTable.data, gdefTable.offset);
				}
				if (gposTableEntry) {
					const gposTable = uncompressTable(data, gposTableEntry);
					font.tables.gpos = gpos_default.parse(gposTable.data, gposTable.offset);
					font.position.init();
				}
				if (gsubTableEntry) {
					const gsubTable = uncompressTable(data, gsubTableEntry);
					font.tables.gsub = gsub_default.parse(gsubTable.data, gsubTable.offset);
				}
				if (fvarTableEntry) {
					const fvarTable = uncompressTable(data, fvarTableEntry);
					font.tables.fvar = fvar_default.parse(fvarTable.data, fvarTable.offset, font.names);
				}
				if (statTableEntry) {
					const statTable = uncompressTable(data, statTableEntry);
					font.tables.stat = stat_default.parse(statTable.data, statTable.offset, font.tables.fvar);
				}
				if (gvarTableEntry) {
					if (!fvarTableEntry) console.warn("This font provides a gvar table, but no fvar table, which is required for variable fonts.");
					if (!glyfTableEntry) console.warn("This font provides a gvar table, but no glyf table. Glyph variation only works with TrueType outlines.");
					const gvarTable = uncompressTable(data, gvarTableEntry);
					font.tables.gvar = gvar_default.parse(gvarTable.data, gvarTable.offset, font.tables.fvar, font.glyphs);
				}
				if (cvarTableEntry) {
					if (!fvarTableEntry) console.warn("This font provides a cvar table, but no fvar table, which is required for variable fonts.");
					if (!font.tables.cvt) console.warn("This font provides a cvar table, but no cvt table which could be made variable.");
					if (!glyfTableEntry) console.warn("This font provides a gvar table, but no glyf table. Glyph variation only works with TrueType outlines.");
					const cvarTable = uncompressTable(data, cvarTableEntry);
					font.tables.cvar = cvar_default.parse(cvarTable.data, cvarTable.offset, font.tables.fvar, font.tables.cvt || []);
				}
				if (avarTableEntry) {
					if (!fvarTableEntry) console.warn("This font provides an avar table, but no fvar table, which is required for variable fonts.");
					const avarTable = uncompressTable(data, avarTableEntry);
					font.tables.avar = avar_default.parse(avarTable.data, avarTable.offset, font.tables.fvar);
				}
				if (hvarTableEntry) {
					if (!fvarTableEntry) console.warn("This font provides an HVAR table, but no fvar table, which is required for variable fonts.");
					if (!hmtxTableEntry) console.warn("This font provides an HVAR table, but no hmtx table to vary.");
					const hvarTable = uncompressTable(data, hvarTableEntry);
					font.tables.hvar = hvar_default.parse(hvarTable.data, hvarTable.offset, font.tables.fvar);
				}
				if (metaTableEntry) {
					const metaTable = uncompressTable(data, metaTableEntry);
					font.tables.meta = meta_default.parse(metaTable.data, metaTable.offset);
					font.metas = font.tables.meta;
				}
				font.palettes = new PaletteManager(font);
				return font;
			}
			function load() {
				console.error("DEPRECATED! migrate to: opentype.parse(buffer, opt) See: https://github.com/opentypejs/opentype.js/issues/675");
			}
			function loadSync() {
				console.error("DEPRECATED! migrate to: opentype.parse(require(\"fs\").readFileSync(url), opt)");
			}
			return __toCommonJS(opentype_exports);
		})();
		(function(root, factory) {
			if (typeof define === "function" && define.amd) define(factory);
			else if (typeof module === "object" && module.exports) module.exports = factory();
			else root.opentype = factory();
		})(typeof self !== "undefined" ? self : exports, () => ({
			...opentype,
			"default": opentype
		}));
	})))(), 1);
	function unsupportedChaining(lookupType, subtable) {
		if (lookupType === 7 && subtable.substFormat === 1 && subtable.lookupType !== void 0 && subtable.extension) return unsupportedChaining(subtable.lookupType, subtable.extension);
		return lookupType === 6 && (subtable.substFormat === 1 || subtable.substFormat === 2);
	}
	/**
	* opentype.js 2.0 unconditionally applies ccmp to multi-character strings, but
	* cannot execute chaining formats 1/2. HKGrotesk (Studio's default) uses format 2.
	* Skip only these unsupported composition subtables, retaining supported ccmp
	* rules and other features such as liga. This is a compatibility workaround,
	* not full support for contextual composition; remove when upstream fixes it.
	*/
	function prepareFontForText(font, fontFamily) {
		const gsub = font.tables.gsub;
		if (!gsub) return;
		let skipped = false;
		for (const { tag, feature } of gsub.features) {
			if (tag !== "ccmp") continue;
			feature.lookupListIndexes = feature.lookupListIndexes.flatMap((index) => {
				const lookup = gsub.lookups[index];
				const subtables = lookup.subtables.filter((subtable) => !unsupportedChaining(lookup.lookupType, subtable));
				if (subtables.length === lookup.subtables.length) return [index];
				skipped = true;
				if (!subtables.length) return [];
				const replacementIndex = gsub.lookups.length;
				gsub.lookups.push({
					...lookup,
					subtables
				});
				return [replacementIndex];
			});
		}
		if (skipped) console.warn(`Font "${fontFamily}": skipping contextual composition rules unsupported by opentype.js 2.0 (GSUB type 6, formats 1/2). Some combining marks may render differently.`);
	}
	//#endregion
	//#region src/text.ts
	var FONT_REGISTER = {};
	var OUTLINE_RENDER_OPTIONS = {
		drawLayers: false,
		drawSVG: false
	};
	/**
	* Import a font in the text system. If the font family is not defined it will
	* set its name as "default"
	*
	* The font should be in TTF
	*/
	async function loadFont(fontPath, fontFamily = "default", force = false) {
		if (!force && FONT_REGISTER[fontFamily]) {
			console.log(`Font ${fontFamily} already loaded`);
			return FONT_REGISTER[fontFamily];
		}
		let fontData;
		if (typeof fontPath === "string") fontData = await (await fetch(fontPath)).arrayBuffer();
		else fontData = fontPath;
		const font = import_opentype.parse(fontData);
		prepareFontForText(font, fontFamily);
		FONT_REGISTER[fontFamily] = font;
		if (!FONT_REGISTER.default) FONT_REGISTER.default = font;
		return font;
	}
	var getFont = (fontFamily = "default") => {
		return FONT_REGISTER[fontFamily];
	};
	var sketchFontCommands = function* (commands) {
		let sk = null;
		let lastPoint = null;
		for (const command of commands) {
			if (command.type === "Z") {
				if (sk) yield sk.close();
				sk = null;
				continue;
			}
			const p = [-command.x, command.y];
			if (command.type === "M") {
				if (sk) yield sk.close();
				sk = new BlueprintSketcher();
				sk.movePointerTo(p);
				lastPoint = p;
				continue;
			}
			if (lastPoint && Math.abs(p[0] - lastPoint[0]) < 1e-9 && Math.abs(p[1] - lastPoint[1]) < 1e-9) continue;
			if (command.type === "L") sk?.lineTo(p);
			if (command.type === "C") sk?.cubicBezierCurveTo(p, [-command.x1, command.y1], [-command.x2, command.y2]);
			if (command.type === "Q") sk?.quadraticBezierCurveTo(p, [-command.x1, command.y1]);
			lastPoint = p;
		}
		if (sk) yield sk.close();
	};
	/**
	* Creates the `Blueprints` of a text, in a defined font size and a font familiy
	* (which will be the default).
	*/
	function textBlueprints(text, { startX = 0, startY = 0, fontSize = 16, fontFamily = "default" } = {}) {
		let font = getFont(fontFamily);
		if (!font) {
			console.warn(`Font family "${fontFamily}" not found, please load it first, using the default`);
			font = getFont();
		}
		const writtenText = font.getPath(text, -startX, -startY, fontSize, OUTLINE_RENDER_OPTIONS);
		return organiseBlueprints(Array.from(sketchFontCommands(writtenText.commands))).mirror([0, 0]);
	}
	/**
	* Creates the `Sketches` of a text, in a defined font size and a font familiy
	* (which will be the default).
	*/
	function sketchText(text, textConfig, planeConfig = {}) {
		const textBp = textBlueprints(text, textConfig);
		return planeConfig.plane instanceof Plane ? textBp.sketchOnPlane(planeConfig.plane) : textBp.sketchOnPlane(planeConfig.plane, planeConfig.origin);
	}
	//#endregion
	//#region src/importers.ts
	var uniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);
	/**
	* Creates a new shapes from a STEP file (as a Blob or a File).
	*
	* @category Import
	*/
	async function importSTEP(STLBlob) {
		const oc = getOC();
		const [r, gc] = localGC();
		const fileName = uniqueId();
		const bufferView = new Uint8Array(await STLBlob.arrayBuffer());
		oc.FS.writeFile(`/${fileName}`, bufferView);
		const reader = r(new oc.STEPControl_Reader());
		if (reader.ReadFile(fileName)) {
			oc.FS.unlink("/" + fileName);
			reader.TransferRoots();
			const shape = cast(r(reader.OneShape()));
			gc();
			return shape;
		} else {
			oc.FS.unlink("/" + fileName);
			gc();
			throw new Error("Failed to load STEP file");
		}
	}
	/** Creates a new shapes from a STL file (as a Blob or a File).
	*
	* This process can be relatively long depending on how much tesselation has
	* been done to your STL.
	*
	* This function tries to clean a bit the triangulation of faces, but can fail
	* in bad ways.
	*
	* @category Import
	*/
	async function importSTL(STLBlob) {
		const oc = getOC();
		const [r, gc] = localGC();
		const fileName = uniqueId();
		const bufferView = new Uint8Array(await STLBlob.arrayBuffer());
		oc.FS.writeFile(`/${fileName}`, bufferView);
		const reader = r(new oc.StlAPI_Reader());
		const readShape = r(new oc.TopoDS_Shell());
		if (reader.Read(readShape, fileName)) {
			oc.FS.unlink("/" + fileName);
			const shapeUpgrader = r(new oc.ShapeUpgrade_UnifySameDomain(readShape, true, true, false));
			shapeUpgrader.Build();
			const upgradedShape = r(shapeUpgrader.Shape());
			const solidSTL = r(new oc.BRepBuilderAPI_MakeSolid());
			solidSTL.Add(oc.TopoDS.Shell(upgradedShape));
			const shape = cast(r(solidSTL.Solid()));
			gc();
			return shape;
		} else {
			oc.FS.unlink("/" + fileName);
			gc();
			throw new Error("Failed to load STL file");
		}
	}
	function isBinarySTL(buffer) {
		if (buffer.byteLength < 84) return false;
		const expectedSize = 84 + new DataView(buffer).getUint32(80, true) * 50;
		if (buffer.byteLength === expectedSize) return true;
		const header = new Uint8Array(buffer, 0, 5);
		return !String.fromCharCode(...header).startsWith("solid");
	}
	function parseBinarySTL(buffer) {
		const view = new DataView(buffer);
		const numTriangles = view.getUint32(80, true);
		const vertices = new Float32Array(numTriangles * 9);
		const triangles = new Uint32Array(numTriangles * 3);
		let offset = 84;
		for (let i = 0; i < numTriangles; i++) {
			offset += 12;
			for (let v = 0; v < 9; v++) {
				vertices[i * 9 + v] = view.getFloat32(offset, true);
				offset += 4;
			}
			offset += 2;
			const base = i * 3;
			triangles[base] = base;
			triangles[base + 1] = base + 1;
			triangles[base + 2] = base + 2;
		}
		return {
			vertices,
			triangles
		};
	}
	function parseASCIISTL(text) {
		const vertexList = [];
		const vertexRegex = /vertex\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/g;
		let match;
		while ((match = vertexRegex.exec(text)) !== null) vertexList.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
		const numVertices = vertexList.length / 3;
		const vertices = new Float32Array(vertexList);
		const triangles = new Uint32Array(numVertices);
		for (let i = 0; i < numVertices; i++) triangles[i] = i;
		return {
			vertices,
			triangles
		};
	}
	/**
	* Imports an STL file (as a Blob or a File) and creates a MeshShape.
	*
	* Unlike `importSTL` which converts through OpenCascade's BRep representation,
	* this function directly creates a MeshShape from the triangle data, which is
	* faster and preserves the original mesh.
	*
	* Supports both binary and ASCII STL formats.
	*
	* @category Import
	*/
	async function importSTLAsMesh(stlBlob) {
		const buffer = await stlBlob.arrayBuffer();
		const { vertices, triangles } = isBinarySTL(buffer) ? parseBinarySTL(buffer) : parseASCIISTL(new TextDecoder().decode(buffer));
		if (triangles.length === 0) throw new Error("STL file contains no triangles");
		const numVerts = vertices.length / 3;
		const scale = 1e6;
		const mergeFrom = [];
		const mergeTo = [];
		const seen = /* @__PURE__ */ new Map();
		for (let i = 0; i < numVerts; i++) {
			const x = vertices[i * 3];
			const y = vertices[i * 3 + 1];
			const z = vertices[i * 3 + 2];
			const key = `${Math.round(x * scale)}|${Math.round(y * scale)}|${Math.round(z * scale)}`;
			const existing = seen.get(key);
			if (existing !== void 0) {
				mergeFrom.push(i);
				mergeTo.push(existing);
			} else seen.set(key, i);
		}
		const manifold = getManifold();
		const mesh = new manifold.Mesh({
			numProp: 3,
			vertProperties: vertices,
			triVerts: triangles,
			mergeFromVert: mergeFrom.length ? new Uint32Array(mergeFrom) : void 0,
			mergeToVert: mergeTo.length ? new Uint32Array(mergeTo) : void 0
		});
		return new MeshShape(new manifold.Manifold(mesh));
	}
	//#endregion
	//#region src/projection/ProjectionCamera.ts
	var PROJECTION_PLANES = {
		XY: {
			dir: [
				0,
				0,
				1
			],
			xAxis: [
				1,
				0,
				0
			]
		},
		XZ: {
			dir: [
				0,
				-1,
				0
			],
			xAxis: [
				1,
				0,
				0
			]
		},
		YZ: {
			dir: [
				1,
				0,
				0
			],
			xAxis: [
				0,
				1,
				0
			]
		},
		YX: {
			dir: [
				0,
				0,
				-1
			],
			xAxis: [
				0,
				1,
				0
			]
		},
		ZX: {
			dir: [
				0,
				1,
				0
			],
			xAxis: [
				0,
				0,
				1
			]
		},
		ZY: {
			dir: [
				-1,
				0,
				0
			],
			xAxis: [
				0,
				0,
				1
			]
		},
		front: {
			dir: [
				0,
				-1,
				0
			],
			xAxis: [
				1,
				0,
				0
			]
		},
		back: {
			dir: [
				0,
				1,
				0
			],
			xAxis: [
				-1,
				0,
				0
			]
		},
		right: {
			dir: [
				-1,
				0,
				0
			],
			xAxis: [
				0,
				-1,
				0
			]
		},
		left: {
			dir: [
				1,
				0,
				0
			],
			xAxis: [
				0,
				1,
				0
			]
		},
		bottom: {
			dir: [
				0,
				0,
				1
			],
			xAxis: [
				1,
				0,
				0
			]
		},
		top: {
			dir: [
				0,
				0,
				-1
			],
			xAxis: [
				1,
				0,
				0
			]
		}
	};
	function isProjectionPlane(plane) {
		return typeof plane === "string" && plane in PROJECTION_PLANES;
	}
	function lookFromPlane(projectionPlane) {
		const { dir, xAxis } = PROJECTION_PLANES[projectionPlane];
		return new ProjectionCamera([
			0,
			0,
			0
		], dir, xAxis);
	}
	function defaultXDir(direction) {
		const dir = makeDirVector(direction);
		let yAxis = new Vector([
			0,
			0,
			1
		]);
		let xAxis = yAxis.cross(dir);
		if (xAxis.Length === 0) {
			yAxis = new Vector([
				0,
				1,
				0
			]);
			xAxis = yAxis.cross(dir);
		}
		return xAxis.normalize();
	}
	var ProjectionCamera = class extends WrappingObj {
		constructor(position = [
			0,
			0,
			0
		], direction = [
			0,
			0,
			1
		], xAxis) {
			const ax2 = makeAx2(position, direction, xAxis ? makeDirVector(xAxis) : defaultXDir(direction));
			super(ax2);
		}
		get position() {
			return new Vector(this.wrapped.Location());
		}
		get direction() {
			return new Vector(this.wrapped.Direction());
		}
		get xAxis() {
			return new Vector(this.wrapped.XDirection());
		}
		get yAxis() {
			return new Vector(this.wrapped.YDirection());
		}
		autoAxes() {
			const xAxis = defaultXDir(this.direction);
			this.wrapped.SetXDirection(asDir(xAxis));
		}
		setPosition(position) {
			this.wrapped.SetLocation(asPnt(position));
			return this;
		}
		setXAxis(xAxis) {
			this.wrapped.SetYDirection(asDir(xAxis));
			return this;
		}
		setYAxis(yAxis) {
			this.wrapped.SetYDirection(asDir(yAxis));
			return this;
		}
		lookAt(shape) {
			const lootAtPoint = new Vector("boundingBox" in shape ? shape.boundingBox.center : shape);
			const direction = this.position.sub(lootAtPoint).normalized();
			this.wrapped.SetDirection(direction.toDir());
			this.autoAxes();
			return this;
		}
	};
	//#endregion
	//#region src/projection/makeProjectedEdges.ts
	var getEdges = (shape) => {
		if (shape.IsNull()) return [];
		return cast(shape).edges;
	};
	function makeProjectedEdges(shape, camera, withHiddenLines = true) {
		const oc = getOC();
		const r = GCWithScope();
		const hiddenLineRemoval = r(new oc.HLRBRep_Algo());
		hiddenLineRemoval.Add(shape.wrapped, 0);
		const projector = r(new oc.HLRAlgo_Projector(camera.wrapped));
		hiddenLineRemoval.Projector(projector);
		hiddenLineRemoval.Update();
		hiddenLineRemoval.Hide();
		const hlrShapes = new oc.HLRBRep_HLRToShape(hiddenLineRemoval);
		const visible = [
			...getEdges(hlrShapes.VCompound()),
			...getEdges(hlrShapes.Rg1LineVCompound()),
			...getEdges(hlrShapes.OutLineVCompound())
		];
		visible.forEach((e) => oc.BRepLib.BuildCurves3d(e.wrapped));
		const hidden = withHiddenLines ? [
			...getEdges(hlrShapes.HCompound()),
			...getEdges(hlrShapes.Rg1LineHCompound()),
			...getEdges(hlrShapes.OutLineHCompound())
		] : [];
		hidden.forEach((e) => oc.BRepLib.BuildCurves3d(e.wrapped));
		return {
			visible,
			hidden
		};
	}
	//#endregion
	//#region src/blueprints/offset.ts
	var PRECISION = 1e-8;
	var samePoint = (x, y) => samePoint$2(x, y, PRECISION * 10);
	var getIntersectionPoint = (line1Start, line1End, line2Start, line2End) => {
		return [determinant2x2([[determinant2x2([[line1Start[0], line1Start[1]], [line1End[0], line1End[1]]]), determinant2x2([[line1Start[0], 1], [line1End[0], 1]])], [determinant2x2([[line2Start[0], line2Start[1]], [line2End[0], line2End[1]]]), determinant2x2([[line2Start[0], 1], [line2End[0], 1]])]]) / determinant2x2([[determinant2x2([[line1Start[0], 1], [line1End[0], 1]]), determinant2x2([[line1Start[1], 1], [line1End[1], 1]])], [determinant2x2([[line2Start[0], 1], [line2End[0], 1]]), determinant2x2([[line2Start[1], 1], [line2End[1], 1]])]]), determinant2x2([[determinant2x2([[line1Start[0], line1Start[1]], [line1End[0], line1End[1]]]), determinant2x2([[line1Start[1], 1], [line1End[1], 1]])], [determinant2x2([[line2Start[0], line2Start[1]], [line2End[0], line2End[1]]]), determinant2x2([[line2Start[1], 1], [line2End[1], 1]])]]) / determinant2x2([[determinant2x2([[line1Start[0], 1], [line1End[0], 1]]), determinant2x2([[line1Start[1], 1], [line1End[1], 1]])], [determinant2x2([[line2Start[0], 1], [line2End[0], 1]]), determinant2x2([[line2Start[1], 1], [line2End[1], 1]])]])];
	};
	function joinRound(appendCurve, previousLastPoint, firstPoint, previousCurve, _curve) {
		const arcJoiner = make2dArcFromCenter(previousLastPoint, firstPoint, previousCurve.original.lastPoint);
		appendCurve(previousCurve);
		appendCurve(arcJoiner);
	}
	function joinBevel(appendCurve, previousLastPoint, firstPoint, previousCurve, _curve) {
		const bevelJoiner = make2dSegmentCurve(previousLastPoint, firstPoint);
		appendCurve(previousCurve);
		appendCurve(bevelJoiner);
	}
	function joinMiter(appendCurve, previousLastPoint, firstPoint, previousCurve, curve) {
		const offsetIntersectionPoint = getIntersectionPoint(previousCurve.offset instanceof Curve2D ? subtract2d(previousLastPoint, previousCurve.offset.tangentAt(1)) : previousCurve.offset.firstPoint, previousLastPoint, firstPoint, curve.offset instanceof Curve2D ? add2d(firstPoint, curve.offset.tangentAt(0)) : curve.offset.lastPoint);
		const miterJoiner1 = make2dSegmentCurve(previousLastPoint, offsetIntersectionPoint);
		const miterJoiner2 = make2dSegmentCurve(offsetIntersectionPoint, firstPoint);
		appendCurve(previousCurve);
		appendCurve(miterJoiner1);
		appendCurve(miterJoiner2);
	}
	var OFFSET_JOINERS = {
		round: joinRound,
		bevel: joinBevel,
		miter: joinMiter
	};
	function rawOffsets(blueprint, offset, offsetConfig = {}) {
		const correctedOffset = blueprint.orientation === "clockwise" ? -offset : offset;
		const offsetCurves = blueprint.curves.map((c) => ({
			offset: make2dOffset(c, correctedOffset),
			original: c
		}));
		const offsettedArray = [];
		let savedLastCurve = null;
		let previousCurve = offsetCurves.at(-1);
		if (!previousCurve) return [];
		if (offsettedArray.length === 1) return offsettedArray;
		function appendCurve(curve) {
			if (curve instanceof Curve2D) {
				offsettedArray.push(curve);
				return;
			}
			if (!savedLastCurve) savedLastCurve = curve;
			else if (curve.offset instanceof Curve2D) offsettedArray.push(curve.offset);
			else if (!samePoint(curve.offset.firstPoint, curve.offset.lastPoint)) offsettedArray.push(make2dSegmentCurve(curve.offset.firstPoint, curve.offset.lastPoint));
		}
		const iterateOffsetCurves = function* () {
			for (const curve of offsetCurves.slice(0, -1)) yield curve;
			if (!savedLastCurve) throw new Error("Bug in the offset algorithm");
			yield savedLastCurve;
		};
		for (const curve of iterateOffsetCurves()) {
			const previousLastPoint = previousCurve.offset.lastPoint;
			const firstPoint = curve.offset.firstPoint;
			if (samePoint(previousLastPoint, firstPoint)) {
				appendCurve(previousCurve);
				previousCurve = curve;
				continue;
			}
			let intersections = [];
			if (previousCurve.offset instanceof Curve2D && curve.offset instanceof Curve2D) {
				const { intersections: pointIntersections, commonSegmentsPoints } = intersectCurves(previousCurve.offset, curve.offset, PRECISION / 100);
				intersections = [...pointIntersections, ...commonSegmentsPoints];
			}
			if (intersections.length > 0) {
				let intersection = intersections[0];
				if (intersections.length > 1) {
					const originalEndpoint = previousCurve?.original.lastPoint;
					const distances = intersections.map((i) => squareDistance2d(i, originalEndpoint));
					intersection = intersections[distances.indexOf(Math.min(...distances))];
				}
				const splitPreviousCurve = previousCurve.offset.splitAt([intersection], PRECISION)[0];
				const splitCurve = curve.offset.splitAt([intersection], PRECISION).at(-1);
				if (!splitCurve) throw new Error("Bug in the splitting algo in offset");
				appendCurve({
					offset: splitPreviousCurve,
					original: previousCurve.original
				});
				previousCurve = {
					offset: splitCurve,
					original: curve.original
				};
				continue;
			}
			const joiner = OFFSET_JOINERS[offsetConfig.lineJoinType ?? "round"];
			joiner(appendCurve, previousLastPoint, firstPoint, previousCurve, curve);
			previousCurve = curve;
		}
		appendCurve(previousCurve);
		return offsettedArray;
	}
	function offsetBlueprint(blueprint, offset, offsetConfig = {}) {
		const offsettedArray = rawOffsets(blueprint, offset, offsetConfig);
		if (offsettedArray.length < 2) return null;
		const allIntersections = /* @__PURE__ */ new Map();
		const updateIntersections = (index, newPoints) => {
			const intersections = allIntersections.get(index) || [];
			allIntersections.set(index, [...intersections, ...newPoints]);
		};
		offsettedArray.forEach((firstCurve, firstIndex) => {
			offsettedArray.slice(firstIndex + 1).forEach((secondCurve, secondIndex) => {
				const { intersections: rawIntersections, commonSegmentsPoints } = intersectCurves(firstCurve, secondCurve, PRECISION);
				const intersections = [...rawIntersections, ...commonSegmentsPoints].filter((intersection) => {
					const onFirstCurveExtremity = samePoint(intersection, firstCurve.firstPoint) || samePoint(intersection, firstCurve.lastPoint);
					const onSecondCurveExtremity = samePoint(intersection, secondCurve.firstPoint) || samePoint(intersection, secondCurve.lastPoint);
					return !(onFirstCurveExtremity && onSecondCurveExtremity);
				});
				if (!intersections.length) return;
				updateIntersections(firstIndex, intersections);
				updateIntersections(secondIndex + firstIndex + 1, intersections);
			});
		});
		if (!allIntersections.size) {
			const offsettedBlueprint = new Blueprint(offsettedArray);
			if (!blueprint.intersects(offsettedBlueprint)) return offsettedBlueprint;
			return null;
		}
		const prunedCurves = offsettedArray.flatMap((curve, index) => {
			if (!allIntersections.has(index)) return curve;
			const intersections = allIntersections.get(index) || [];
			return curve.splitAt(intersections, PRECISION * 100);
		}).filter((curve) => {
			return !blueprint.curves.find((c) => c.distanceFrom(curve) < Math.abs(offset) - PRECISION);
		});
		if (!prunedCurves.length) return null;
		const blueprints = stitchCurves(prunedCurves).filter((c) => c.length > 1).map((c) => new Blueprint(c)).filter((b) => b.isClosed());
		if (!blueprints.length) return null;
		if (blueprints.length === 1) return blueprints[0];
		return new Blueprints(blueprints);
	}
	var fuseAll = (blueprints) => {
		let fused = blueprints[0];
		for (let i = 1; i < blueprints.length; i++) fused = fuse2D(fused, blueprints[i]);
		return fused;
	};
	function offset(bp, offsetDistance, offsetConfig = {}) {
		if (bp instanceof Blueprint) return offsetBlueprint(bp, offsetDistance, offsetConfig);
		else if (bp instanceof Blueprints) return fuseAll(bp.blueprints.map((b) => offset(b, offsetDistance, offsetConfig)));
		else if (bp instanceof CompoundBlueprint) {
			const innerShape = fuseAll(bp.blueprints.slice(1).map((b) => offset(b, offsetDistance, offsetConfig)));
			return cut2D(offset(bp.blueprints[0], offsetDistance, offsetConfig), innerShape);
		}
		return null;
	}
	//#endregion
	//#region src/blueprints/customCorners.ts
	function modifyCorners(makeCorner, blueprint, radius, finder) {
		let modifyCorner = () => true;
		if (finder) modifyCorner = finder.shouldKeep.bind(finder);
		const curves = [blueprint.curves[0]];
		const addModifiedCorner = (firstCurve, secondCurve) => {
			if (modifyCorner({
				firstCurve,
				secondCurve,
				point: firstCurve.lastPoint
			})) curves.push(...makeCorner(firstCurve, secondCurve, radius));
			else curves.push(firstCurve, secondCurve);
		};
		blueprint.curves.slice(1).forEach((secondCurve) => {
			const firstCurve = curves.pop();
			if (!firstCurve) throw new Error("Bug in the blueprint filletting algo");
			addModifiedCorner(firstCurve, secondCurve);
		});
		const lastCurve = curves.at(-1);
		if (!lastCurve) throw new Error("Bug in the blueprint corner algo");
		if (samePoint$2(curves[0].firstPoint, lastCurve.lastPoint) && curves.length > 1) {
			const firstCurve = curves.pop();
			const secondCurve = curves.shift();
			if (!firstCurve || !secondCurve) throw new Error("Bug in the blueprint filletting algo");
			addModifiedCorner(firstCurve, secondCurve);
		}
		return new Blueprint(curves);
	}
	function modifyCorner2D(makeCorner, shape, radius, finder) {
		if (shape instanceof Blueprint) return modifyCorners(makeCorner, shape, radius, finder);
		if (shape instanceof CompoundBlueprint) return new CompoundBlueprint(shape.blueprints.map((b) => modifyCorners(makeCorner, b, radius, finder)));
		if (shape instanceof Blueprints) return new Blueprints(shape.blueprints.map((b) => modifyCorner2D(makeCorner, b, radius, finder)).filter((b) => b !== null));
		return null;
	}
	function fillet2D(shape, radius, finder) {
		return modifyCorner2D(filletCurves, shape, radius, finder);
	}
	function chamfer2D(shape, radius, finder) {
		return modifyCorner2D(chamferCurves, shape, radius, finder);
	}
	//#endregion
	//#region src/blueprints/approximations.ts
	function approximateForSVG(bp, options) {
		if (bp instanceof Blueprint) return new Blueprint(approximateAsSvgCompatibleCurve(bp.curves, options));
		else if (bp instanceof CompoundBlueprint) return new CompoundBlueprint(bp.blueprints.map((b) => approximateForSVG(b, options)));
		else if (bp instanceof Blueprints) return new Blueprints(bp.blueprints.map((b) => approximateForSVG(b, options)));
		return bp;
	}
	//#endregion
	//#region src/draw.ts
	/**
	* @categoryDescription Drawing
	*
	* Drawing are shapes in the 2D space. You can either use a "builder pen" to
	* draw a shape, or use some of the canned shapes like circles or rectangles.
	*/
	var Drawing = class Drawing {
		constructor(innerShape = null) {
			this.innerShape = innerShape;
		}
		clone() {
			return new Drawing(this.innerShape?.clone() || null);
		}
		serialize() {
			function serializeHelper(shape) {
				if (shape instanceof CompoundBlueprint) return {
					type: "CompoundBlueprint",
					blueprints: shape.blueprints.map(serializeHelper)
				};
				else if (shape instanceof Blueprints) return {
					type: "Blueprints",
					blueprints: shape.blueprints.map(serializeHelper)
				};
				else if (shape instanceof Blueprint) return {
					type: "Blueprint",
					curves: shape.curves.map((c) => c.serialize())
				};
				else throw new Error("Unknown shape type for serialization");
			}
			return JSON.stringify(serializeHelper(this.innerShape));
		}
		get boundingBox() {
			if (!this.innerShape) return new BoundingBox2d();
			return this.innerShape.boundingBox;
		}
		stretch(ratio, direction, origin) {
			if (!this.innerShape) return new Drawing();
			return new Drawing(this.innerShape.stretch(ratio, direction, origin));
		}
		get repr() {
			if (this.innerShape === null) return "=== empty shape";
			return this.innerShape.repr;
		}
		rotate(angle, center) {
			if (!this.innerShape) return new Drawing();
			return new Drawing(this.innerShape.rotate(angle, center));
		}
		translate(xDistOrPoint, yDist = 0) {
			if (!this.innerShape) return new Drawing();
			return new Drawing(this.innerShape.translate(xDistOrPoint, yDist));
		}
		scale(scaleFactor, center) {
			if (!this.innerShape) return new Drawing();
			return new Drawing(this.innerShape.scale(scaleFactor, center));
		}
		mirror(centerOrDirection, origin, mode) {
			if (!this.innerShape) return new Drawing();
			return new Drawing(this.innerShape.mirror(centerOrDirection, origin, mode));
		}
		/**
		* Builds a new drawing by cuting another drawing into this one
		*
		* @category Drawing Modifications
		*/
		cut(other) {
			return new Drawing(cut2D(this.innerShape, other.innerShape));
		}
		/**
		* Builds a new drawing by merging another drawing into this one
		*
		* @category Drawing Modifications
		*/
		fuse(other) {
			return new Drawing(fuse2D(this.innerShape, other.innerShape));
		}
		/**
		* Builds a new drawing by intersection this drawing with another
		*
		* @category Drawing Modifications
		*/
		intersect(other) {
			return new Drawing(intersect2D(this.innerShape, other.innerShape));
		}
		/**
		* Creates a new drawing with some corners filletted, as specified by the
		* radius and the corner finder function
		*
		* @category Drawing Modifications
		*/
		fillet(radius, filter) {
			const finder = filter && filter(new CornerFinder(), this.innerShape);
			return new Drawing(fillet2D(this.innerShape, radius, finder));
		}
		/**
		* Creates a new drawing with some corners filletted, as specified by the
		* radius and the corner finder function
		*
		* @category Drawing Modifications
		*/
		chamfer(radius, filter) {
			const finder = filter && filter(new CornerFinder(), this.innerShape);
			return new Drawing(chamfer2D(this.innerShape, radius, finder));
		}
		sketchOnPlane(inputPlane, origin) {
			if (!this.innerShape) throw new Error("Trying to sketch an empty drawing");
			return this.innerShape.sketchOnPlane(inputPlane, origin);
		}
		sketchOnFace(face, scaleMode) {
			if (!this.innerShape) throw new Error("Trying to sketch an empty drawing");
			return this.innerShape.sketchOnFace(face, scaleMode);
		}
		punchHole(shape, faceFinder, options = {}) {
			if (!this.innerShape) return shape;
			return this.innerShape.punchHole(shape, faceFinder, options);
		}
		toSVG(margin) {
			return this.innerShape?.toSVG(margin) || "";
		}
		toSVGViewBox(margin = 1) {
			return this.innerShape?.toSVGViewBox(margin) || "";
		}
		toSVGPaths() {
			return this.innerShape?.toSVGPaths() || [];
		}
		offset(distance, offsetConfig = {}) {
			return new Drawing(offset(this.innerShape, distance, offsetConfig));
		}
		approximate(target, options = {}) {
			if (target !== "svg") throw new Error("Only 'svg' is supported for now");
			return new Drawing(approximateForSVG(this.innerShape, options));
		}
		get blueprint() {
			if (!(this.innerShape instanceof Blueprint)) {
				if (this.innerShape instanceof Blueprints && this.innerShape.blueprints.length === 1 && this.innerShape.blueprints[0] instanceof Blueprint) return this.innerShape.blueprints[0];
				throw new Error("This drawing is not a blueprint");
			}
			return this.innerShape;
		}
	};
	/**
	* DrawingPen is a helper class to draw in 2D. It is used to create drawings
	* by exposing a builder interface. It is not a drawing itself, but it can be
	* used to create a drawing.
	*
	* @category Drawing
	*/
	var DrawingPen = class extends BaseSketcher2d {
		constructor(origin = [0, 0]) {
			super();
			this.pointer = origin;
			this.firstPoint = origin;
			this.pendingCurves = [];
		}
		done() {
			return new Drawing(new Blueprint(this.pendingCurves));
		}
		close() {
			this._closeSketch();
			return this.done();
		}
		closeWithMirror() {
			this._closeWithMirror();
			return this.close();
		}
		/**
		* Stop drawing, make sure the sketch is closed (by adding a straight line to
		* from the last point to the first), change the corner between the last and the
		* first segments and returns the sketch.
		*/
		closeWithCustomCorner(radius, mode = "fillet") {
			this._closeSketch();
			this._customCornerLastWithFirst(radius, mode);
			return this.done();
		}
	};
	/**
	* Deserializes a drawing from a string. String is expected to be in the format
	* generated by `Drawing.serialize()`.
	*/
	function deserializeDrawing(data) {
		function deserializeHelper(json) {
			if (json["type"] === "CompoundBlueprint") return new CompoundBlueprint(json["blueprints"].map(deserializeHelper));
			else if (json["type"] === "Blueprints") return new Blueprints(json["blueprints"].map(deserializeHelper));
			else if (json["type"] === "Blueprint") return new Blueprint(json["curves"].map((c) => deserializeCurve2D(c)));
			else throw new Error("Unknown shape type for deserialization");
		}
		return new Drawing(deserializeHelper(JSON.parse(data)));
	}
	/**
	* Creates a drawing pen to programatically draw in 2D.
	*
	* @category Drawing
	*/
	function draw(initialPoint) {
		const pen = new DrawingPen();
		if (initialPoint) pen.movePointerTo(initialPoint);
		return pen;
	}
	/**
	* Creates the `Drawing` of a rectangle with (optional) rounded corners.
	*
	* The rectangle is centered on [0, 0]
	*
	* @category Drawing
	*/
	function drawRoundedRectangle(width, height, r = 0) {
		return new Drawing(roundedRectangleBlueprint(width, height, r));
	}
	var drawRectangle = drawRoundedRectangle;
	/**
	* Creates the `Drawing` of a circle as one single curve.
	*
	* The circle is centered on [0, 0]
	*
	* @category Drawing
	*/
	function drawSingleCircle(radius) {
		return new Drawing(new Blueprint([make2dCircle(radius)]));
	}
	/**
	* Creates the `Drawing` of an ellipse as one single curve.
	*
	* The ellipse is centered on [0, 0], with axes aligned with the coordinates.
	*
	* @category Drawing
	*/
	function drawSingleEllipse(majorRadius, minorRadius) {
		const [minor, major] = [majorRadius, minorRadius].sort((a, b) => a - b);
		return new Drawing(new Blueprint([make2dEllipse(major, minor, major === majorRadius ? [1, 0] : [0, 1])]));
	}
	/**
	* Creates the `Drawing` of a circle.
	*
	* The circle is centered on [0, 0]
	*
	* @category Drawing
	*/
	function drawCircle(radius) {
		return draw().movePointerTo([-radius, 0]).sagittaArc(2 * radius, 0, radius).sagittaArc(-2 * radius, 0, radius).close();
	}
	/**
	* Creates the `Drawing` of an ellipse.
	*
	* The ellipse is centered on [0, 0], with axes aligned with the coordinates.
	*
	* @category Drawing
	*/
	function drawEllipse(majorRadius, minorRadius) {
		return draw().movePointerTo([-majorRadius, 0]).halfEllipse(2 * majorRadius, 0, minorRadius).halfEllipse(-2 * majorRadius, 0, minorRadius).close();
	}
	/**
	* Creates the `Drawing` of an polygon in a defined plane
	*
	* The sides of the polygon can be arcs of circle with a defined sagitta.
	* The radius defines the out radius of the polygon without sagitta
	*
	* @category Drawing
	*/
	function drawPolysides(radius, sidesCount, sagitta = 0) {
		return new Drawing(polysidesBlueprint(radius, sidesCount, sagitta));
	}
	/**
	* Creates the `Drawing` of a text, in a defined font size and a font familiy
	* (which will be the default).
	*
	* @category Drawing
	*/
	function drawText(text, { startX = 0, startY = 0, fontSize = 16, fontFamily = "default" } = {}) {
		return new Drawing(textBlueprints(text, {
			startX,
			startY,
			fontSize,
			fontFamily
		}));
	}
	/**
	* Creates the `Drawing` by interpolating points as a curve
	*
	* The drawing will be a spline approximating the points. Note that the
	* degree should be at maximum 3 if you need to export the drawing as an SVG.
	*
	* @category Drawing
	*/
	var drawPointsInterpolation = (points, approximationConfig = {}, options = {}) => {
		const curves = [make2dInerpolatedBSplineCurve(points, approximationConfig)];
		if (options.closeShape && !samePoint$2(points[0], points[points.length - 1])) curves.push(make2dSegmentCurve(points[points.length - 1], points[0]));
		return new Drawing(new Blueprint(curves));
	};
	/**
	* Creates the `Drawing` of parametric function
	*
	* The drawing will be a spline approximating the function. Note that the
	* degree should be at maximum 3 if you need to export the drawing as an SVG.
	*
	* @category Drawing
	*/
	var drawParametricFunction = (func, { pointsCount = 400, start = 0, stop = 1, closeShape = false } = {}, approximationConfig = {}) => {
		const stepSize = (stop - start) / pointsCount;
		return drawPointsInterpolation([...Array(pointsCount + 1).keys()].map((t) => {
			return func(start + t * stepSize);
		}), approximationConfig, { closeShape });
	};
	var edgesToDrawing = (edges) => {
		const planeFace = drawRectangle(1e3, 1e3).sketchOnPlane().face();
		const stitchedCurves = stitchCurves(edges.map((e) => {
			try {
				return edgeToCurveOnPlane(e);
			} catch (_error) {
				return edgeToCurve(e, planeFace);
			}
		})).map((s) => new Blueprint(s));
		if (stitchedCurves.length === 0) return new Drawing();
		if (stitchedCurves.length === 1) return new Drawing(stitchedCurves[0]);
		return new Drawing(new Blueprints(stitchedCurves));
	};
	/**
	* Creates the `Drawing` of a projection of a shape on a plane.
	*
	* The projection is done by projecting the edges of the shape on the plane.
	*
	* @category Drawing
	*/
	function drawProjection(shape, projectionCamera = "front") {
		let camera;
		if (projectionCamera instanceof ProjectionCamera) camera = projectionCamera;
		else camera = lookFromPlane(projectionCamera);
		const { visible, hidden } = makeProjectedEdges(shape, camera);
		return {
			visible: edgesToDrawing(visible),
			hidden: edgesToDrawing(hidden)
		};
	}
	/**
	* Creates the `Drawing` out of a face
	*
	* @category Drawing
	*/
	function drawFaceOutline(face) {
		const stitchedCurves = stitchCurves(face.clone().outerWire().edges.map((e) => edgeToCurve(e, face))).map((s) => new Blueprint(s));
		if (stitchedCurves.length === 0) return new Drawing();
		if (stitchedCurves.length === 1) return new Drawing(stitchedCurves[0]);
		return new Drawing(new Blueprints(stitchedCurves));
	}
	//#endregion
	//#region src/utils/uuid.ts
	function uuidv() {
		return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
	}
	//#endregion
	//#region src/export/assemblyExporter.ts
	var wrapString = (str) => {
		return new (getOC()).TCollection_ExtendedString(str, true);
	};
	function parseSlice(hex, index) {
		return parseInt(hex.slice(index * 2, (index + 1) * 2), 16);
	}
	function colorFromHex(hex) {
		let color = hex;
		if (color.indexOf("#") === 0) color = color.slice(1);
		if (color.length === 3) color = color.replace(/([0-9a-f])/gi, "$1$1");
		return [
			parseSlice(color, 0),
			parseSlice(color, 1),
			parseSlice(color, 2)
		];
	}
	var wrapColor = (hex, alpha = 1) => {
		const oc = getOC();
		const [r, g, b] = colorFromHex(hex);
		return new oc.Quantity_ColorRGBA(r / 255, g / 255, b / 255, alpha);
	};
	var AssemblyExporter = class extends WrappingObj {};
	function createAssembly(shapes = []) {
		const oc = getOC();
		const doc = new oc.TDocStd_Document(wrapString("XmlOcaf"));
		oc.XCAFDoc_ShapeTool.SetAutoNaming(false);
		const mainLabel = doc.Main();
		const tool = oc.XCAFDoc_DocumentTool.ShapeTool(mainLabel);
		const ctool = oc.XCAFDoc_DocumentTool.ColorTool(mainLabel);
		for (const { shape, name, color, alpha } of shapes) {
			const shapeNode = tool.NewShape();
			tool.SetShape(shapeNode, shape.wrapped);
			oc.TDataStd_Name.Set(shapeNode, wrapString(name || uuidv()));
			ctool.SetColor(shapeNode, wrapColor(color || "#f00", alpha ?? 1), oc.XCAFDoc_ColorType.XCAFDoc_ColorSurf);
		}
		tool.UpdateAssemblies();
		return new AssemblyExporter(doc);
	}
	function exportSTEP(shapes = [], { unit, modelUnit } = {}) {
		const oc = getOC();
		const r = GCWithScope();
		const doc = createAssembly(shapes);
		if (unit || modelUnit) {
			r(new oc.STEPCAFControl_Writer());
			oc.Interface_Static.SetCVal("xstep.cascade.unit", (modelUnit || unit || "MM").toUpperCase());
			oc.Interface_Static.SetCVal("write.step.unit", (unit || modelUnit || "MM").toUpperCase());
		}
		const session = r(new oc.XSControl_WorkSession());
		const writer = r(new oc.STEPCAFControl_Writer(session, false));
		writer.SetColorMode(true);
		writer.SetLayerMode(true);
		writer.SetNameMode(true);
		oc.Interface_Static.SetIVal("write.surfacecurve.mode", 1);
		oc.Interface_Static.SetIVal("write.precision.mode", 0);
		oc.Interface_Static.SetIVal("write.step.assembly", 2);
		oc.Interface_Static.SetIVal("write.step.schema", 5);
		const filename = "export.step";
		const progress = r(new oc.Message_ProgressRange());
		if (writer.Perform(doc.wrapped, filename, progress)) {
			const file = oc.FS.readFile("/export.step");
			oc.FS.unlink("/export.step");
			return new Blob([file], { type: "application/STEP" });
		} else throw new Error("WRITE STEP FILE FAILED.");
	}
	//#endregion
	exports.AXIS_NAMES = AXIS_NAMES;
	exports.AssemblyExporter = AssemblyExporter;
	exports.BaseSketcher2d = BaseSketcher2d;
	exports.Blueprint = Blueprint;
	exports.BlueprintSketcher = BlueprintSketcher;
	exports.Blueprints = Blueprints;
	exports.BoundingBox = BoundingBox;
	exports.BoundingBox2d = BoundingBox2d;
	exports.CompSolid = CompSolid;
	exports.Compound = Compound;
	exports.CompoundBlueprint = CompoundBlueprint;
	exports.CompoundSketch = CompoundSketch;
	exports.CornerFinder = CornerFinder;
	exports.Curve = Curve;
	exports.Curve2D = Curve2D;
	exports.DEG2RAD = DEG2RAD;
	exports.DistanceQuery = DistanceQuery;
	exports.DistanceTool = DistanceTool;
	exports.Drawing = Drawing;
	exports.DrawingPen = DrawingPen;
	exports.Edge = Edge;
	exports.EdgeFinder = EdgeFinder;
	exports.Face = Face;
	exports.FaceFinder = FaceFinder;
	exports.FaceSketcher = FaceSketcher;
	exports.GCWithObject = GCWithObject;
	exports.GCWithScope = GCWithScope;
	exports.HASH_CODE_MAX = HASH_CODE_MAX;
	exports.LinearPhysicalProperties = LinearPhysicalProperties;
	exports.MeshShape = MeshShape;
	exports.Plane = Plane;
	exports.ProjectionCamera = ProjectionCamera;
	exports.RAD2DEG = RAD2DEG;
	exports.Shape = Shape;
	exports.Shell = Shell;
	exports.Sketch = Sketch;
	exports.Sketcher = Sketcher;
	exports.Sketches = Sketches;
	exports.Solid = Solid;
	exports.Surface = Surface;
	exports.SurfacePhysicalProperties = SurfacePhysicalProperties;
	exports.Transformation = Transformation;
	exports.Vector = Vector;
	exports.Vertex = Vertex;
	exports.VolumePhysicalProperties = VolumePhysicalProperties;
	exports.Wire = Wire;
	exports.WrappingObj = WrappingObj;
	exports._1DShape = _1DShape;
	exports._3DShape = _3DShape;
	exports.addHolesInFace = addHolesInFace;
	exports.asDir = asDir;
	exports.asPnt = asPnt;
	exports.assembleWire = assembleWire;
	exports.atShapeExtremum = atShapeExtremum;
	exports.axis2d = axis2d;
	exports.backMost = backMost;
	exports.basicFaceExtrusion = basicFaceExtrusion;
	exports.bottomMost = bottomMost;
	exports.cast = cast;
	exports.combineFinderFilters = combineFinderFilters;
	exports.complexExtrude = complexExtrude;
	exports.compoundShapes = compoundShapes;
	exports.createAssembly = createAssembly;
	exports.createNamedPlane = createNamedPlane;
	exports.cut2D = cut2D;
	exports.cutBlueprints = cutBlueprints;
	exports.deserializeDrawing = deserializeDrawing;
	exports.deserializeShape = deserializeShape;
	exports.downcast = downcast;
	exports.draw = draw;
	exports.drawCircle = drawCircle;
	exports.drawEllipse = drawEllipse;
	exports.drawFaceOutline = drawFaceOutline;
	exports.drawParametricFunction = drawParametricFunction;
	exports.drawPointsInterpolation = drawPointsInterpolation;
	exports.drawPolysides = drawPolysides;
	exports.drawProjection = drawProjection;
	exports.drawRectangle = drawRectangle;
	exports.drawRoundedRectangle = drawRoundedRectangle;
	exports.drawSingleCircle = drawSingleCircle;
	exports.drawSingleEllipse = drawSingleEllipse;
	exports.drawText = drawText;
	exports.exportSTEP = exportSTEP;
	exports.extrudeFaceUntil = extrudeFaceUntil;
	exports.frontMost = frontMost;
	exports.fuse2D = fuse2D;
	exports.fuseBlueprints = fuseBlueprints;
	exports.genericSweep = genericSweep;
	exports.getFont = getFont;
	exports.getManifold = getManifold;
	exports.getOC = getOC;
	exports.getSingleFace = getSingleFace;
	exports.importSTEP = importSTEP;
	exports.importSTL = importSTL;
	exports.importSTLAsMesh = importSTLAsMesh;
	exports.intersect2D = intersect2D;
	exports.intersectBlueprints = intersectBlueprints;
	exports.isPoint = isPoint;
	exports.isProjectionPlane = isProjectionPlane;
	exports.isShape3D = isShape3D;
	exports.isWire = isWire;
	exports.iterTopo = iterTopo;
	exports.leftMost = leftMost;
	exports.loadFont = loadFont;
	exports.localGC = localGC;
	exports.loft = loft;
	exports.lookFromPlane = lookFromPlane;
	exports.makeAx1 = makeAx1;
	exports.makeAx2 = makeAx2;
	exports.makeAx3 = makeAx3;
	exports.makeBSplineApproximation = makeBSplineApproximation;
	exports.makeBaseBox = makeBaseBox;
	exports.makeBezierCurve = makeBezierCurve;
	exports.makeBox = makeBox;
	exports.makeCircle = makeCircle;
	exports.makeCompound = makeCompound;
	exports.makeCylinder = makeCylinder;
	exports.makeDirVector = makeDirVector;
	exports.makeDirection = makeDirection;
	exports.makeEllipse = makeEllipse;
	exports.makeEllipseArc = makeEllipseArc;
	exports.makeEllipsoid = makeEllipsoid;
	exports.makeFace = makeFace;
	exports.makeHelix = makeHelix;
	exports.makeLine = makeLine;
	exports.makeNewFaceWithinFace = makeNewFaceWithinFace;
	exports.makeNonPlanarFace = makeNonPlanarFace;
	exports.makeOffset = makeOffset;
	exports.makePlane = makePlane;
	exports.makePlaneFromFace = makePlaneFromFace;
	exports.makePln = makePln;
	exports.makePolygon = makePolygon;
	exports.makeProjectedEdges = makeProjectedEdges;
	exports.makeSolid = makeSolid;
	exports.makeSphere = makeSphere;
	exports.makeTangentArc = makeTangentArc;
	exports.makeThreePointArc = makeThreePointArc;
	exports.makeVertex = makeVertex;
	exports.measureArea = measureArea;
	exports.measureDistanceBetween = measureDistanceBetween;
	exports.measureLength = measureLength;
	exports.measureShapeLinearProperties = measureShapeLinearProperties;
	exports.measureShapeSurfaceProperties = measureShapeSurfaceProperties;
	exports.measureShapeVolumeProperties = measureShapeVolumeProperties;
	exports.measureVolume = measureVolume;
	exports.mirror = mirror;
	exports.organiseBlueprints = organiseBlueprints;
	exports.polysideInnerRadius = polysideInnerRadius;
	exports.polysidesBlueprint = polysidesBlueprint;
	exports.resolveDirection = resolveDirection;
	exports.revolution = revolution;
	exports.rightMost = rightMost;
	exports.rotate = rotate;
	exports.roundedRectangleBlueprint = roundedRectangleBlueprint;
	exports.scale = scale;
	exports.setManifold = setManifold;
	exports.setOC = setOC;
	exports.shapeType = shapeType;
	exports.sketchCircle = sketchCircle;
	exports.sketchEllipse = sketchEllipse;
	exports.sketchFaceOffset = sketchFaceOffset;
	exports.sketchHelix = sketchHelix;
	exports.sketchParametricFunction = sketchParametricFunction;
	exports.sketchPolysides = sketchPolysides;
	exports.sketchRectangle = sketchRectangle;
	exports.sketchRoundedRectangle = sketchRoundedRectangle;
	exports.sketchText = sketchText;
	exports.supportExtrude = supportExtrude;
	exports.textBlueprints = textBlueprints;
	exports.topMost = topMost;
	exports.translate = translate;
	exports.twistExtrude = twistExtrude;
	exports.weldShellsAndFaces = weldShellsAndFaces;
});

//# sourceMappingURL=replicad.umd.cjs.map