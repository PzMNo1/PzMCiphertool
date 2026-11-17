export declare class Message_ProgressRange {
  UserBreak(): Standard_Boolean;
  More(): Standard_Boolean;
  IsActive(): Standard_Boolean;
  Close(): void;
  delete(): void;
}

  export declare class Message_ProgressRange_1 extends Message_ProgressRange {
    constructor();
  }

  export declare class Message_ProgressRange_2 extends Message_ProgressRange {
    constructor(theOther: Message_ProgressRange);
  }

export declare class NCollection_BaseMap {
  NbBuckets(): Standard_Integer;
  Extent(): Standard_Integer;
  IsEmpty(): Standard_Boolean;
  Allocator(): TDF_HAllocator;
  delete(): void;
}

export declare class Standard_Transient {
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): Handle_Standard_Type;
  DynamicType(): Handle_Standard_Type;
  IsInstance_1(theType: Handle_Standard_Type): Standard_Boolean;
  IsInstance_2(theTypeName: Standard_Character): Standard_Boolean;
  IsKind_1(theType: Handle_Standard_Type): Standard_Boolean;
  IsKind_2(theTypeName: Standard_Character): Standard_Boolean;
  This(): Standard_Transient;
  GetRefCount(): Standard_Integer;
  IncrementRefCounter(): void;
  DecrementRefCounter(): Standard_Integer;
  Delete(): void;
  delete(): void;
}

  export declare class Standard_Transient_1 extends Standard_Transient {
    constructor();
  }

  export declare class Standard_Transient_2 extends Standard_Transient {
    constructor(a: Standard_Transient);
  }

export declare class gp_Dir {
  SetCoord_1(theIndex: Standard_Integer, theXi: Standard_Real): void;
  SetCoord_2(theXv: Standard_Real, theYv: Standard_Real, theZv: Standard_Real): void;
  SetX(theX: Standard_Real): void;
  SetY(theY: Standard_Real): void;
  SetZ(theZ: Standard_Real): void;
  SetXYZ(theCoord: gp_XYZ): void;
  Coord_1(theIndex: Standard_Integer): Standard_Real;
  Coord_2(theXv: Standard_Real, theYv: Standard_Real, theZv: Standard_Real): void;
  X(): Standard_Real;
  Y(): Standard_Real;
  Z(): Standard_Real;
  XYZ(): gp_XYZ;
  IsEqual(theOther: gp_Dir, theAngularTolerance: Standard_Real): Standard_Boolean;
  IsNormal(theOther: gp_Dir, theAngularTolerance: Standard_Real): Standard_Boolean;
  IsOpposite(theOther: gp_Dir, theAngularTolerance: Standard_Real): Standard_Boolean;
  IsParallel(theOther: gp_Dir, theAngularTolerance: Standard_Real): Standard_Boolean;
  Angle(theOther: gp_Dir): Standard_Real;
  AngleWithRef(theOther: gp_Dir, theVRef: gp_Dir): Standard_Real;
  Cross(theRight: gp_Dir): void;
  Crossed(theRight: gp_Dir): gp_Dir;
  CrossCross(theV1: gp_Dir, theV2: gp_Dir): void;
  CrossCrossed(theV1: gp_Dir, theV2: gp_Dir): gp_Dir;
  Dot(theOther: gp_Dir): Standard_Real;
  DotCross(theV1: gp_Dir, theV2: gp_Dir): Standard_Real;
  Reverse(): void;
  Reversed(): gp_Dir;
  Mirror_1(theV: gp_Dir): void;
  Mirrored_1(theV: gp_Dir): gp_Dir;
  Mirror_2(theA1: gp_Ax1): void;
  Mirrored_2(theA1: gp_Ax1): gp_Dir;
  Mirror_3(theA2: gp_Ax2): void;
  Mirrored_3(theA2: gp_Ax2): gp_Dir;
  Rotate(theA1: gp_Ax1, theAng: Standard_Real): void;
  Rotated(theA1: gp_Ax1, theAng: Standard_Real): gp_Dir;
  Transform(theT: gp_Trsf): void;
  Transformed(theT: gp_Trsf): gp_Dir;
  delete(): void;
}

  export declare class gp_Dir_1 extends gp_Dir {
    constructor();
  }

  export declare class gp_Dir_3 extends gp_Dir {
    constructor(theV: gp_Vec);
  }

  export declare class gp_Dir_4 extends gp_Dir {
    constructor(theCoord: gp_XYZ);
  }

  export declare class gp_Dir_5 extends gp_Dir {
    constructor(theXv: Standard_Real, theYv: Standard_Real, theZv: Standard_Real);
  }

  export declare class gp_Dir_6 extends gp_Dir {
    constructor(a: gp_Dir);
  }

  export declare class gp_Dir_7 extends gp_Dir {
    constructor(a: gp_Dir);
  }

export declare class gp_Ax2d {
  SetLocation(theP: gp_Pnt2d): void;
  SetDirection(theV: gp_Dir2d): void;
  Location(): gp_Pnt2d;
  Direction(): gp_Dir2d;
  IsCoaxial(Other: gp_Ax2d, AngularTolerance: Standard_Real, LinearTolerance: Standard_Real): Standard_Boolean;
  IsNormal(theOther: gp_Ax2d, theAngularTolerance: Standard_Real): Standard_Boolean;
  IsOpposite(theOther: gp_Ax2d, theAngularTolerance: Standard_Real): Standard_Boolean;
  IsParallel(theOther: gp_Ax2d, theAngularTolerance: Standard_Real): Standard_Boolean;
  Angle(theOther: gp_Ax2d): Standard_Real;
  Reverse(): void;
  Reversed(): gp_Ax2d;
  Mirror_1(P: gp_Pnt2d): void;
  Mirrored_1(P: gp_Pnt2d): gp_Ax2d;
  Mirror_2(A: gp_Ax2d): void;
  Mirrored_2(A: gp_Ax2d): gp_Ax2d;
  Rotate(theP: gp_Pnt2d, theAng: Standard_Real): void;
  Rotated(theP: gp_Pnt2d, theAng: Standard_Real): gp_Ax2d;
  Scale(P: gp_Pnt2d, S: Standard_Real): void;
  Scaled(theP: gp_Pnt2d, theS: Standard_Real): gp_Ax2d;
  Transform(theT: gp_Trsf2d): void;
  Transformed(theT: gp_Trsf2d): gp_Ax2d;
  Translate_1(theV: gp_Vec2d): void;
  Translated_1(theV: gp_Vec2d): gp_Ax2d;
  Translate_2(theP1: gp_Pnt2d, theP2: gp_Pnt2d): void;
  Translated_2(theP1: gp_Pnt2d, theP2: gp_Pnt2d): gp_Ax2d;
  delete(): void;
}

  export declare class gp_Ax2d_1 extends gp_Ax2d {
    constructor();
  }

  export declare class gp_Ax2d_2 extends gp_Ax2d {
    constructor(theP: gp_Pnt2d, theV: gp_Dir2d);
  }

export declare class gp {
  static Resolution(): Standard_Real;
  static Origin(): gp_Pnt;
  static DX(): gp_Dir;
  static DY(): gp_Dir;
  static DZ(): gp_Dir;
  static OX(): gp_Ax1;
  static OY(): gp_Ax1;
  static OZ(): gp_Ax1;
  static XOY(): gp_Ax2;
  static ZOX(): gp_Ax2;
  static YOZ(): gp_Ax2;
  static Origin2d(): gp_Pnt2d;
  static DX2d(): gp_Dir2d;
  static DY2d(): gp_Dir2d;
  static OX2d(): gp_Ax2d;
  static OY2d(): gp_Ax2d;
  delete(): void;
}

export declare class gp_Dir2d {
  SetCoord_1(theIndex: Standard_Integer, theXi: Standard_Real): void;
  SetCoord_2(theXv: Standard_Real, theYv: Standard_Real): void;
  SetX(theX: Standard_Real): void;
  SetY(theY: Standard_Real): void;
  SetXY(theCoord: gp_XY): void;
  Coord_1(theIndex: Standard_Integer): Standard_Real;
  Coord_2(theXv: Standard_Real, theYv: Standard_Real): void;
  X(): Standard_Real;
  Y(): Standard_Real;
  XY(): gp_XY;
  IsEqual(theOther: gp_Dir2d, theAngularTolerance: Standard_Real): Standard_Boolean;
  IsNormal(theOther: gp_Dir2d, theAngularTolerance: Standard_Real): Standard_Boolean;
  IsOpposite(theOther: gp_Dir2d, theAngularTolerance: Standard_Real): Standard_Boolean;
  IsParallel(theOther: gp_Dir2d, theAngularTolerance: Standard_Real): Standard_Boolean;
  Angle(theOther: gp_Dir2d): Standard_Real;
  Crossed(theRight: gp_Dir2d): Standard_Real;
  Dot(theOther: gp_Dir2d): Standard_Real;
  Reverse(): void;
  Reversed(): gp_Dir2d;
  Mirror_1(theV: gp_Dir2d): void;
  Mirrored_1(theV: gp_Dir2d): gp_Dir2d;
  Mirror_2(theA: gp_Ax2d): void;
  Mirrored_2(theA: gp_Ax2d): gp_Dir2d;
  Rotate(Ang: Standard_Real): void;
  Rotated(theAng: Standard_Real): gp_Dir2d;
  Transform(theT: gp_Trsf2d): void;
  Transformed(theT: gp_Trsf2d): gp_Dir2d;
  delete(): void;
}

  export declare class gp_Dir2d_1 extends gp_Dir2d {
    constructor();
  }

  export declare class gp_Dir2d_3 extends gp_Dir2d {
    constructor(theV: gp_Vec2d);
  }

  export declare class gp_Dir2d_4 extends gp_Dir2d {
    constructor(theCoord: gp_XY);
  }

  export declare class gp_Dir2d_5 extends gp_Dir2d {
    constructor(theXv: Standard_Real, theYv: Standard_Real);
  }

export declare class gp_Vec {
  SetCoord_1(theIndex: Standard_Integer, theXi: Standard_Real): void;
  SetCoord_2(theXv: Standard_Real, theYv: Standard_Real, theZv: Standard_Real): void;
  SetX(theX: Standard_Real): void;
  SetY(theY: Standard_Real): void;
  SetZ(theZ: Standard_Real): void;
  SetXYZ(theCoord: gp_XYZ): void;
  Coord_1(theIndex: Standard_Integer): Standard_Real;
  Coord_2(theXv: Standard_Real, theYv: Standard_Real, theZv: Standard_Real): void;
  X(): Standard_Real;
  Y(): Standard_Real;
  Z(): Standard_Real;
  XYZ(): gp_XYZ;
  IsEqual(theOther: gp_Vec, theLinearTolerance: Standard_Real, theAngularTolerance: Standard_Real): Standard_Boolean;
  IsNormal(theOther: gp_Vec, theAngularTolerance: Standard_Real): Standard_Boolean;
  IsOpposite(theOther: gp_Vec, theAngularTolerance: Standard_Real): Standard_Boolean;
  IsParallel(theOther: gp_Vec, theAngularTolerance: Standard_Real): Standard_Boolean;
  Angle(theOther: gp_Vec): Standard_Real;
  AngleWithRef(theOther: gp_Vec, theVRef: gp_Vec): Standard_Real;
  Magnitude(): Standard_Real;
  SquareMagnitude(): Standard_Real;
  Add(theOther: gp_Vec): void;
  Added(theOther: gp_Vec): gp_Vec;
  Subtract(theRight: gp_Vec): void;
  Subtracted(theRight: gp_Vec): gp_Vec;
  Multiply(theScalar: Standard_Real): void;
  Multiplied(theScalar: Standard_Real): gp_Vec;
  Divide(theScalar: Standard_Real): void;
  Divided(theScalar: Standard_Real): gp_Vec;
  Cross(theRight: gp_Vec): void;
  Crossed(theRight: gp_Vec): gp_Vec;
  CrossMagnitude(theRight: gp_Vec): Standard_Real;
  CrossSquareMagnitude(theRight: gp_Vec): Standard_Real;
  CrossCross(theV1: gp_Vec, theV2: gp_Vec): void;
  CrossCrossed(theV1: gp_Vec, theV2: gp_Vec): gp_Vec;
  Dot(theOther: gp_Vec): Standard_Real;
  DotCross(theV1: gp_Vec, theV2: gp_Vec): Standard_Real;
  Normalize(): void;
  Normalized(): gp_Vec;
  Reverse(): void;
  Reversed(): gp_Vec;
  SetLinearForm_1(theA1: Standard_Real, theV1: gp_Vec, theA2: Standard_Real, theV2: gp_Vec, theA3: Standard_Real, theV3: gp_Vec, theV4: gp_Vec): void;
  SetLinearForm_2(theA1: Standard_Real, theV1: gp_Vec, theA2: Standard_Real, theV2: gp_Vec, theA3: Standard_Real, theV3: gp_Vec): void;
  SetLinearForm_3(theA1: Standard_Real, theV1: gp_Vec, theA2: Standard_Real, theV2: gp_Vec, theV3: gp_Vec): void;
  SetLinearForm_4(theA1: Standard_Real, theV1: gp_Vec, theA2: Standard_Real, theV2: gp_Vec): void;
  SetLinearForm_5(theA1: Standard_Real, theV1: gp_Vec, theV2: gp_Vec): void;
  SetLinearForm_6(theV1: gp_Vec, theV2: gp_Vec): void;
  Mirror_1(theV: gp_Vec): void;
  Mirrored_1(theV: gp_Vec): gp_Vec;
  Mirror_2(theA1: gp_Ax1): void;
  Mirrored_2(theA1: gp_Ax1): gp_Vec;
  Mirror_3(theA2: gp_Ax2): void;
  Mirrored_3(theA2: gp_Ax2): gp_Vec;
  Rotate(theA1: gp_Ax1, theAng: Standard_Real): void;
  Rotated(theA1: gp_Ax1, theAng: Standard_Real): gp_Vec;
  Scale(theS: Standard_Real): void;
  Scaled(theS: Standard_Real): gp_Vec;
  Transform(theT: gp_Trsf): void;
  Transformed(theT: gp_Trsf): gp_Vec;
  delete(): void;
}

  export declare class gp_Vec_1 extends gp_Vec {
    constructor();
  }

  export declare class gp_Vec_2 extends gp_Vec {
    constructor(theV: gp_Dir);
  }

  export declare class gp_Vec_3 extends gp_Vec {
    constructor(theCoord: gp_XYZ);
  }

  export declare class gp_Vec_4 extends gp_Vec {
    constructor(theXv: Standard_Real, theYv: Standard_Real, theZv: Standard_Real);
  }

  export declare class gp_Vec_5 extends gp_Vec {
    constructor(theP1: gp_Pnt, theP2: gp_Pnt);
  }

export declare class gp_Pnt2d {
  SetCoord_1(theIndex: Standard_Integer, theXi: Standard_Real): void;
  SetCoord_2(theXp: Standard_Real, theYp: Standard_Real): void;
  SetX(theX: Standard_Real): void;
  SetY(theY: Standard_Real): void;
  SetXY(theCoord: gp_XY): void;
  Coord_1(theIndex: Standard_Integer): Standard_Real;
  Coord_2(theXp: Standard_Real, theYp: Standard_Real): void;
  X(): Standard_Real;
  Y(): Standard_Real;
  XY(): gp_XY;
  Coord_3(): gp_XY;
  ChangeCoord(): gp_XY;
  IsEqual(theOther: gp_Pnt2d, theLinearTolerance: Standard_Real): Standard_Boolean;
  Distance(theOther: gp_Pnt2d): Standard_Real;
  SquareDistance(theOther: gp_Pnt2d): Standard_Real;
  Mirror_1(theP: gp_Pnt2d): void;
  Mirrored_1(theP: gp_Pnt2d): gp_Pnt2d;
  Mirror_2(theA: gp_Ax2d): void;
  Mirrored_2(theA: gp_Ax2d): gp_Pnt2d;
  Rotate(theP: gp_Pnt2d, theAng: Standard_Real): void;
  Rotated(theP: gp_Pnt2d, theAng: Standard_Real): gp_Pnt2d;
  Scale(theP: gp_Pnt2d, theS: Standard_Real): void;
  Scaled(theP: gp_Pnt2d, theS: Standard_Real): gp_Pnt2d;
  Transform(theT: gp_Trsf2d): void;
  Transformed(theT: gp_Trsf2d): gp_Pnt2d;
  Translate_1(theV: gp_Vec2d): void;
  Translated_1(theV: gp_Vec2d): gp_Pnt2d;
  Translate_2(theP1: gp_Pnt2d, theP2: gp_Pnt2d): void;
  Translated_2(theP1: gp_Pnt2d, theP2: gp_Pnt2d): gp_Pnt2d;
  delete(): void;
}

  export declare class gp_Pnt2d_1 extends gp_Pnt2d {
    constructor();
  }

  export declare class gp_Pnt2d_2 extends gp_Pnt2d {
    constructor(theCoord: gp_XY);
  }

  export declare class gp_Pnt2d_3 extends gp_Pnt2d {
    constructor(theXp: Standard_Real, theYp: Standard_Real);
  }

export declare class gp_Ax3 {
  XReverse(): void;
  YReverse(): void;
  ZReverse(): void;
  SetAxis(theA1: gp_Ax1): void;
  SetDirection(theV: gp_Dir): void;
  SetLocation(theP: gp_Pnt): void;
  SetXDirection(theVx: gp_Dir): void;
  SetYDirection(theVy: gp_Dir): void;
  Angle(theOther: gp_Ax3): Standard_Real;
  Axis(): gp_Ax1;
  Ax2(): gp_Ax2;
  Direction(): gp_Dir;
  Location(): gp_Pnt;
  XDirection(): gp_Dir;
  YDirection(): gp_Dir;
  Direct(): Standard_Boolean;
  IsCoplanar_1(theOther: gp_Ax3, theLinearTolerance: Standard_Real, theAngularTolerance: Standard_Real): Standard_Boolean;
  IsCoplanar_2(theA1: gp_Ax1, theLinearTolerance: Standard_Real, theAngularTolerance: Standard_Real): Standard_Boolean;
  Mirror_1(theP: gp_Pnt): void;
  Mirrored_1(theP: gp_Pnt): gp_Ax3;
  Mirror_2(theA1: gp_Ax1): void;
  Mirrored_2(theA1: gp_Ax1): gp_Ax3;
  Mirror_3(theA2: gp_Ax2): void;
  Mirrored_3(theA2: gp_Ax2): gp_Ax3;
  Rotate(theA1: gp_Ax1, theAng: Standard_Real): void;
  Rotated(theA1: gp_Ax1, theAng: Standard_Real): gp_Ax3;
  Scale(theP: gp_Pnt, theS: Standard_Real): void;
  Scaled(theP: gp_Pnt, theS: Standard_Real): gp_Ax3;
  Transform(theT: gp_Trsf): void;
  Transformed(theT: gp_Trsf): gp_Ax3;
  Translate_1(theV: gp_Vec): void;
  Translated_1(theV: gp_Vec): gp_Ax3;
  Translate_2(theP1: gp_Pnt, theP2: gp_Pnt): void;
  Translated_2(theP1: gp_Pnt, theP2: gp_Pnt): gp_Ax3;
  delete(): void;
}

  export declare class gp_Ax3_1 extends gp_Ax3 {
    constructor();
  }

  export declare class gp_Ax3_2 extends gp_Ax3 {
    constructor(theA: gp_Ax2);
  }

  export declare class gp_Ax3_3 extends gp_Ax3 {
    constructor(theP: gp_Pnt, theN: gp_Dir, theVx: gp_Dir);
  }

  export declare class gp_Ax3_5 extends gp_Ax3 {
    constructor(theP: gp_Pnt, theV: gp_Dir);
  }

export declare class gp_Trsf {
  SetMirror_1(theP: gp_Pnt): void;
  SetMirror_2(theA1: gp_Ax1): void;
  SetMirror_3(theA2: gp_Ax2): void;
  SetRotation_1(theA1: gp_Ax1, theAng: Standard_Real): void;
  SetRotation_2(theR: gp_Quaternion): void;
  SetRotationPart(theR: gp_Quaternion): void;
  SetScale(theP: gp_Pnt, theS: Standard_Real): void;
  SetDisplacement(theFromSystem1: gp_Ax3, theToSystem2: gp_Ax3): void;
  SetTransformation_1(theFromSystem1: gp_Ax3, theToSystem2: gp_Ax3): void;
  SetTransformation_2(theToSystem: gp_Ax3): void;
  SetTransformation_3(R: gp_Quaternion, theT: gp_Vec): void;
  SetTranslation_1(theV: gp_Vec): void;
  SetTranslation_2(theP1: gp_Pnt, theP2: gp_Pnt): void;
  SetTranslationPart(theV: gp_Vec): void;
  SetScaleFactor(theS: Standard_Real): void;
  SetForm(theP: gp_TrsfForm): void;
  SetValues(a11: Standard_Real, a12: Standard_Real, a13: Standard_Real, a14: Standard_Real, a21: Standard_Real, a22: Standard_Real, a23: Standard_Real, a24: Standard_Real, a31: Standard_Real, a32: Standard_Real, a33: Standard_Real, a34: Standard_Real): void;
  IsNegative(): Standard_Boolean;
  Form(): gp_TrsfForm;
  ScaleFactor(): Standard_Real;
  TranslationPart(): gp_XYZ;
  GetRotation_1(theAxis: gp_XYZ, theAngle: Standard_Real): Standard_Boolean;
  GetRotation_2(): gp_Quaternion;
  VectorialPart(): gp_Mat;
  HVectorialPart(): gp_Mat;
  Value(theRow: Standard_Integer, theCol: Standard_Integer): Standard_Real;
  Invert(): void;
  Inverted(): gp_Trsf;
  Multiplied(theT: gp_Trsf): gp_Trsf;
  Multiply(theT: gp_Trsf): void;
  PreMultiply(theT: gp_Trsf): void;
  Power(theN: Standard_Integer): void;
  Powered(theN: Standard_Integer): gp_Trsf;
  Transforms_1(theX: Standard_Real, theY: Standard_Real, theZ: Standard_Real): void;
  Transforms_2(theCoord: gp_XYZ): void;
  delete(): void;
}

  export declare class gp_Trsf_1 extends gp_Trsf {
    constructor();
  }

  export declare class gp_Trsf_2 extends gp_Trsf {
    constructor(theT: gp_Trsf2d);
  }

export declare class gp_Ax2 {
  SetAxis(A1: gp_Ax1): void;
  SetDirection(V: gp_Dir): void;
  SetLocation(theP: gp_Pnt): void;
  SetXDirection(theVx: gp_Dir): void;
  SetYDirection(theVy: gp_Dir): void;
  Angle(theOther: gp_Ax2): Standard_Real;
  Axis(): gp_Ax1;
  Direction(): gp_Dir;
  Location(): gp_Pnt;
  XDirection(): gp_Dir;
  YDirection(): gp_Dir;
  IsCoplanar_1(Other: gp_Ax2, LinearTolerance: Standard_Real, AngularTolerance: Standard_Real): Standard_Boolean;
  IsCoplanar_2(A1: gp_Ax1, LinearTolerance: Standard_Real, AngularTolerance: Standard_Real): Standard_Boolean;
  Mirror_1(P: gp_Pnt): void;
  Mirrored_1(P: gp_Pnt): gp_Ax2;
  Mirror_2(A1: gp_Ax1): void;
  Mirrored_2(A1: gp_Ax1): gp_Ax2;
  Mirror_3(A2: gp_Ax2): void;
  Mirrored_3(A2: gp_Ax2): gp_Ax2;
  Rotate(theA1: gp_Ax1, theAng: Standard_Real): void;
  Rotated(theA1: gp_Ax1, theAng: Standard_Real): gp_Ax2;
  Scale(theP: gp_Pnt, theS: Standard_Real): void;
  Scaled(theP: gp_Pnt, theS: Standard_Real): gp_Ax2;
  Transform(theT: gp_Trsf): void;
  Transformed(theT: gp_Trsf): gp_Ax2;
  Translate_1(theV: gp_Vec): void;
  Translated_1(theV: gp_Vec): gp_Ax2;
  Translate_2(theP1: gp_Pnt, theP2: gp_Pnt): void;
  Translated_2(theP1: gp_Pnt, theP2: gp_Pnt): gp_Ax2;
  delete(): void;
}

  export declare class gp_Ax2_1 extends gp_Ax2 {
    constructor();
  }

  export declare class gp_Ax2_2 extends gp_Ax2 {
    constructor(P: gp_Pnt, N: gp_Dir, Vx: gp_Dir);
  }

  export declare class gp_Ax2_4 extends gp_Ax2 {
    constructor(P: gp_Pnt, V: gp_Dir);
  }

export declare class gp_Pnt {
  SetCoord_1(theIndex: Standard_Integer, theXi: Standard_Real): void;
  SetCoord_2(theXp: Standard_Real, theYp: Standard_Real, theZp: Standard_Real): void;
  SetX(theX: Standard_Real): void;
  SetY(theY: Standard_Real): void;
  SetZ(theZ: Standard_Real): void;
  SetXYZ(theCoord: gp_XYZ): void;
  Coord_1(theIndex: Standard_Integer): Standard_Real;
  Coord_2(theXp: Standard_Real, theYp: Standard_Real, theZp: Standard_Real): void;
  X(): Standard_Real;
  Y(): Standard_Real;
  Z(): Standard_Real;
  XYZ(): gp_XYZ;
  Coord_3(): gp_XYZ;
  ChangeCoord(): gp_XYZ;
  BaryCenter(theAlpha: Standard_Real, theP: gp_Pnt, theBeta: Standard_Real): void;
  IsEqual(theOther: gp_Pnt, theLinearTolerance: Standard_Real): Standard_Boolean;
  Distance(theOther: gp_Pnt): Standard_Real;
  SquareDistance(theOther: gp_Pnt): Standard_Real;
  Mirror_1(theP: gp_Pnt): void;
  Mirrored_1(theP: gp_Pnt): gp_Pnt;
  Mirror_2(theA1: gp_Ax1): void;
  Mirrored_2(theA1: gp_Ax1): gp_Pnt;
  Mirror_3(theA2: gp_Ax2): void;
  Mirrored_3(theA2: gp_Ax2): gp_Pnt;
  Rotate(theA1: gp_Ax1, theAng: Standard_Real): void;
  Rotated(theA1: gp_Ax1, theAng: Standard_Real): gp_Pnt;
  Scale(theP: gp_Pnt, theS: Standard_Real): void;
  Scaled(theP: gp_Pnt, theS: Standard_Real): gp_Pnt;
  Transform(theT: gp_Trsf): void;
  Transformed(theT: gp_Trsf): gp_Pnt;
  Translate_1(theV: gp_Vec): void;
  Translated_1(theV: gp_Vec): gp_Pnt;
  Translate_2(theP1: gp_Pnt, theP2: gp_Pnt): void;
  Translated_2(theP1: gp_Pnt, theP2: gp_Pnt): gp_Pnt;
  delete(): void;
}

  export declare class gp_Pnt_1 extends gp_Pnt {
    constructor();
  }

  export declare class gp_Pnt_2 extends gp_Pnt {
    constructor(theCoord: gp_XYZ);
  }

  export declare class gp_Pnt_3 extends gp_Pnt {
    constructor(theXp: Standard_Real, theYp: Standard_Real, theZp: Standard_Real);
  }

export declare class gp_Ax1 {
  SetDirection(theV: gp_Dir): void;
  SetLocation(theP: gp_Pnt): void;
  Direction(): gp_Dir;
  Location(): gp_Pnt;
  IsCoaxial(Other: gp_Ax1, AngularTolerance: Standard_Real, LinearTolerance: Standard_Real): Standard_Boolean;
  IsNormal(theOther: gp_Ax1, theAngularTolerance: Standard_Real): Standard_Boolean;
  IsOpposite(theOther: gp_Ax1, theAngularTolerance: Standard_Real): Standard_Boolean;
  IsParallel(theOther: gp_Ax1, theAngularTolerance: Standard_Real): Standard_Boolean;
  Angle(theOther: gp_Ax1): Standard_Real;
  Reverse(): void;
  Reversed(): gp_Ax1;
  Mirror_1(P: gp_Pnt): void;
  Mirrored_1(P: gp_Pnt): gp_Ax1;
  Mirror_2(A1: gp_Ax1): void;
  Mirrored_2(A1: gp_Ax1): gp_Ax1;
  Mirror_3(A2: gp_Ax2): void;
  Mirrored_3(A2: gp_Ax2): gp_Ax1;
  Rotate(theA1: gp_Ax1, theAngRad: Standard_Real): void;
  Rotated(theA1: gp_Ax1, theAngRad: Standard_Real): gp_Ax1;
  Scale(theP: gp_Pnt, theS: Standard_Real): void;
  Scaled(theP: gp_Pnt, theS: Standard_Real): gp_Ax1;
  Transform(theT: gp_Trsf): void;
  Transformed(theT: gp_Trsf): gp_Ax1;
  Translate_1(theV: gp_Vec): void;
  Translated_1(theV: gp_Vec): gp_Ax1;
  Translate_2(theP1: gp_Pnt, theP2: gp_Pnt): void;
  Translated_2(theP1: gp_Pnt, theP2: gp_Pnt): gp_Ax1;
  delete(): void;
}

  export declare class gp_Ax1_1 extends gp_Ax1 {
    constructor();
  }

  export declare class gp_Ax1_2 extends gp_Ax1 {
    constructor(theP: gp_Pnt, theV: gp_Dir);
  }

export declare class gp_Pln {
  Coefficients(theA: Standard_Real, theB: Standard_Real, theC: Standard_Real, theD: Standard_Real): void;
  SetAxis(theA1: gp_Ax1): void;
  SetLocation(theLoc: gp_Pnt): void;
  SetPosition(theA3: gp_Ax3): void;
  UReverse(): void;
  VReverse(): void;
  Direct(): Standard_Boolean;
  Axis(): gp_Ax1;
  Location(): gp_Pnt;
  Position(): gp_Ax3;
  Distance_1(theP: gp_Pnt): Standard_Real;
  Distance_2(theL: gp_Lin): Standard_Real;
  Distance_3(theOther: gp_Pln): Standard_Real;
  SignedDistance_1(theP: gp_Pnt): Standard_Real;
  SignedDistance_2(theL: gp_Lin): Standard_Real;
  SignedDistance_3(theOther: gp_Pln): Standard_Real;
  SquareDistance_1(theP: gp_Pnt): Standard_Real;
  SquareDistance_2(theL: gp_Lin): Standard_Real;
  SquareDistance_3(theOther: gp_Pln): Standard_Real;
  XAxis(): gp_Ax1;
  YAxis(): gp_Ax1;
  Contains_1(theP: gp_Pnt, theLinearTolerance: Standard_Real): Standard_Boolean;
  Contains_2(theL: gp_Lin, theLinearTolerance: Standard_Real, theAngularTolerance: Standard_Real): Standard_Boolean;
  Mirror_1(theP: gp_Pnt): void;
  Mirrored_1(theP: gp_Pnt): gp_Pln;
  Mirror_2(theA1: gp_Ax1): void;
  Mirrored_2(theA1: gp_Ax1): gp_Pln;
  Mirror_3(theA2: gp_Ax2): void;
  Mirrored_3(theA2: gp_Ax2): gp_Pln;
  Rotate(theA1: gp_Ax1, theAng: Standard_Real): void;
  Rotated(theA1: gp_Ax1, theAng: Standard_Real): gp_Pln;
  Scale(theP: gp_Pnt, theS: Standard_Real): void;
  Scaled(theP: gp_Pnt, theS: Standard_Real): gp_Pln;
  Transform(theT: gp_Trsf): void;
  Transformed(theT: gp_Trsf): gp_Pln;
  Translate_1(theV: gp_Vec): void;
  Translated_1(theV: gp_Vec): gp_Pln;
  Translate_2(theP1: gp_Pnt, theP2: gp_Pnt): void;
  Translated_2(theP1: gp_Pnt, theP2: gp_Pnt): gp_Pln;
  delete(): void;
}

  export declare class gp_Pln_1 extends gp_Pln {
    constructor();
  }

  export declare class gp_Pln_2 extends gp_Pln {
    constructor(theA3: gp_Ax3);
  }

  export declare class gp_Pln_3 extends gp_Pln {
    constructor(theP: gp_Pnt, theV: gp_Dir);
  }

  export declare class gp_Pln_4 extends gp_Pln {
    constructor(theA: Standard_Real, theB: Standard_Real, theC: Standard_Real, theD: Standard_Real);
  }

export declare type GeomAbs_CurveType = {
  GeomAbs_Line: {};
  GeomAbs_Circle: {};
  GeomAbs_Ellipse: {};
  GeomAbs_Hyperbola: {};
  GeomAbs_Parabola: {};
  GeomAbs_BezierCurve: {};
  GeomAbs_BSplineCurve: {};
  GeomAbs_OffsetCurve: {};
  GeomAbs_OtherCurve: {};
}

export declare type GeomAbs_Shape = {
  GeomAbs_C0: {};
  GeomAbs_G1: {};
  GeomAbs_C1: {};
  GeomAbs_G2: {};
  GeomAbs_C2: {};
  GeomAbs_C3: {};
  GeomAbs_CN: {};
}

export declare type GeomAbs_JoinType = {
  GeomAbs_Arc: {};
  GeomAbs_Tangent: {};
  GeomAbs_Intersection: {};
}

export declare type GeomAbs_SurfaceType = {
  GeomAbs_Plane: {};
  GeomAbs_Cylinder: {};
  GeomAbs_Cone: {};
  GeomAbs_Sphere: {};
  GeomAbs_Torus: {};
  GeomAbs_BezierSurface: {};
  GeomAbs_BSplineSurface: {};
  GeomAbs_SurfaceOfRevolution: {};
  GeomAbs_SurfaceOfExtrusion: {};
  GeomAbs_OffsetSurface: {};
  GeomAbs_OtherSurface: {};
}

export declare class Poly_Triangle {
  Set_1(theN1: Standard_Integer, theN2: Standard_Integer, theN3: Standard_Integer): void;
  Set_2(theIndex: Standard_Integer, theNode: Standard_Integer): void;
  Get(theN1: Standard_Integer, theN2: Standard_Integer, theN3: Standard_Integer): void;
  Value(theIndex: Standard_Integer): Standard_Integer;
  ChangeValue(theIndex: Standard_Integer): Standard_Integer;
  delete(): void;
}

  export declare class Poly_Triangle_1 extends Poly_Triangle {
    constructor();
  }

  export declare class Poly_Triangle_2 extends Poly_Triangle {
    constructor(theN1: Standard_Integer, theN2: Standard_Integer, theN3: Standard_Integer);
  }

export declare class Poly_Triangulation extends Standard_Transient {
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  Copy(): any;
  Deflection_1(): Standard_Real;
  Deflection_2(theDeflection: Standard_Real): void;
  Parameters_1(): any;
  Parameters_2(theParams: any): void;
  Clear(): void;
  HasGeometry(): Standard_Boolean;
  NbNodes(): Standard_Integer;
  NbTriangles(): Standard_Integer;
  HasUVNodes(): Standard_Boolean;
  HasNormals(): Standard_Boolean;
  Node(theIndex: Standard_Integer): gp_Pnt;
  SetNode(theIndex: Standard_Integer, thePnt: gp_Pnt): void;
  UVNode(theIndex: Standard_Integer): gp_Pnt2d;
  SetUVNode(theIndex: Standard_Integer, thePnt: gp_Pnt2d): void;
  Triangle(theIndex: Standard_Integer): Poly_Triangle;
  SetTriangle(theIndex: Standard_Integer, theTriangle: Poly_Triangle): void;
  Normal_1(theIndex: Standard_Integer): gp_Dir;
  Normal_2(theIndex: Standard_Integer, theVec3: NCollection_Vec3<float>): void;
  SetNormal_1(theIndex: Standard_Integer, theNormal: NCollection_Vec3<float>): void;
  SetNormal_2(theIndex: Standard_Integer, theNormal: gp_Dir): void;
  MeshPurpose(): Poly_MeshPurpose;
  SetMeshPurpose(thePurpose: Poly_MeshPurpose): void;
  CachedMinMax(): Bnd_Box;
  SetCachedMinMax(theBox: Bnd_Box): void;
  HasCachedMinMax(): Standard_Boolean;
  UpdateCachedMinMax(): void;
  MinMax(theBox: Bnd_Box, theTrsf: gp_Trsf, theIsAccurate: Standard_Boolean): Standard_Boolean;
  IsDoublePrecision(): Standard_Boolean;
  SetDoublePrecision(theIsDouble: Standard_Boolean): void;
  ResizeNodes(theNbNodes: Standard_Integer, theToCopyOld: Standard_Boolean): void;
  ResizeTriangles(theNbTriangles: Standard_Integer, theToCopyOld: Standard_Boolean): void;
  AddUVNodes(): void;
  RemoveUVNodes(): void;
  AddNormals(): void;
  RemoveNormals(): void;
  ComputeNormals(): void;
  MapNodeArray(): any;
  MapTriangleArray(): any;
  MapUVNodeArray(): any;
  MapNormalArray(): any;
  InternalTriangles(): any;
  InternalNodes(): Poly_ArrayOfNodes;
  InternalUVNodes(): Poly_ArrayOfUVNodes;
  InternalNormals(): any;
  SetNormals(theNormals: any): void;
  Triangles(): any;
  ChangeTriangles(): any;
  ChangeTriangle(theIndex: Standard_Integer): Poly_Triangle;
  NbDeferredNodes(): Standard_Integer;
  NbDeferredTriangles(): Standard_Integer;
  HasDeferredData(): Standard_Boolean;
  LoadDeferredData(theFileSystem: any): Standard_Boolean;
  DetachedLoadDeferredData(theFileSystem: any): any;
  UnloadDeferredData(): Standard_Boolean;
  delete(): void;
}

  export declare class Poly_Triangulation_1 extends Poly_Triangulation {
    constructor();
  }

  export declare class Poly_Triangulation_2 extends Poly_Triangulation {
    constructor(theNbNodes: Standard_Integer, theNbTriangles: Standard_Integer, theHasUVNodes: Standard_Boolean, theHasNormals: Standard_Boolean);
  }

  export declare class Poly_Triangulation_3 extends Poly_Triangulation {
    constructor(Nodes: NCollection_Array1<gp_Pnt>, Triangles: NCollection_Array1<Poly_Triangle>);
  }

  export declare class Poly_Triangulation_4 extends Poly_Triangulation {
    constructor(Nodes: NCollection_Array1<gp_Pnt>, UVNodes: NCollection_Array1<gp_Pnt2d>, Triangles: NCollection_Array1<Poly_Triangle>);
  }

  export declare class Poly_Triangulation_5 extends Poly_Triangulation {
    constructor(theTriangulation: any);
  }

export declare class Poly_PolygonOnTriangulation extends Standard_Transient {
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  Copy(): any;
  Deflection_1(): Standard_Real;
  Deflection_2(theDefl: Standard_Real): void;
  NbNodes(): Standard_Integer;
  Node(theIndex: Standard_Integer): Standard_Integer;
  SetNode(theIndex: Standard_Integer, theNode: Standard_Integer): void;
  HasParameters(): Standard_Boolean;
  Parameter(theIndex: Standard_Integer): Standard_Real;
  SetParameter(theIndex: Standard_Integer, theValue: Standard_Real): void;
  SetParameters(theParameters: any): void;
  Nodes(): any;
  Parameters(): any;
  ChangeNodes(): any;
  ChangeParameters(): any;
  delete(): void;
}

  export declare class Poly_PolygonOnTriangulation_1 extends Poly_PolygonOnTriangulation {
    constructor(theNbNodes: Standard_Integer, theHasParams: Standard_Boolean);
  }

  export declare class Poly_PolygonOnTriangulation_2 extends Poly_PolygonOnTriangulation {
    constructor(Nodes: NCollection_Array1<int>);
  }

  export declare class Poly_PolygonOnTriangulation_3 extends Poly_PolygonOnTriangulation {
    constructor(Nodes: NCollection_Array1<int>, Parameters: NCollection_Array1<double>);
  }

export declare class Poly_Connect {
  Load(theTriangulation: any): void;
  Triangulation(): any;
  Triangle(N: Standard_Integer): Standard_Integer;
  Triangles(T: Standard_Integer, t1: Standard_Integer, t2: Standard_Integer, t3: Standard_Integer): void;
  Nodes(T: Standard_Integer, n1: Standard_Integer, n2: Standard_Integer, n3: Standard_Integer): void;
  Initialize(N: Standard_Integer): void;
  More(): Standard_Boolean;
  Next(): void;
  Value(): Standard_Integer;
  delete(): void;
}

  export declare class Poly_Connect_1 extends Poly_Connect {
    constructor();
  }

  export declare class Poly_Connect_2 extends Poly_Connect {
    constructor(theTriangulation: any);
  }

export declare class TopLoc_Location {
  IsIdentity(): Standard_Boolean;
  Identity(): void;
  FirstDatum(): any;
  FirstPower(): Standard_Integer;
  NextLocation(): TopLoc_Location;
  Transformation(): gp_Trsf;
  Inverted(): TopLoc_Location;
  Multiplied(Other: TopLoc_Location): TopLoc_Location;
  Divided(Other: TopLoc_Location): TopLoc_Location;
  Predivided(Other: TopLoc_Location): TopLoc_Location;
  Powered(pwr: Standard_Integer): TopLoc_Location;
  HashCode(): Standard_Size;
  IsEqual(theOther: TopLoc_Location): Standard_Boolean;
  IsDifferent(theOther: TopLoc_Location): Standard_Boolean;
  Clear(): void;
  static ScalePrec(): Standard_Real;
  delete(): void;
}

  export declare class TopLoc_Location_1 extends TopLoc_Location {
    constructor();
  }

  export declare class TopLoc_Location_2 extends TopLoc_Location {
    constructor(theOther: TopLoc_Location);
  }

  export declare class TopLoc_Location_3 extends TopLoc_Location {
    constructor(theOther: TopLoc_Location);
  }

  export declare class TopLoc_Location_4 extends TopLoc_Location {
    constructor(T: gp_Trsf);
  }

  export declare class TopLoc_Location_5 extends TopLoc_Location {
    constructor(D: any);
  }

export declare class GC_MakeArcOfCircle extends GC_Root {
  Value(): any;
  delete(): void;
}

  export declare class GC_MakeArcOfCircle_1 extends GC_MakeArcOfCircle {
    constructor(Circ: gp_Circ, Alpha1: Standard_Real, Alpha2: Standard_Real, Sense: Standard_Boolean);
  }

  export declare class GC_MakeArcOfCircle_2 extends GC_MakeArcOfCircle {
    constructor(Circ: gp_Circ, P: gp_Pnt, Alpha: Standard_Real, Sense: Standard_Boolean);
  }

  export declare class GC_MakeArcOfCircle_3 extends GC_MakeArcOfCircle {
    constructor(Circ: gp_Circ, P1: gp_Pnt, P2: gp_Pnt, Sense: Standard_Boolean);
  }

  export declare class GC_MakeArcOfCircle_4 extends GC_MakeArcOfCircle {
    constructor(P1: gp_Pnt, P2: gp_Pnt, P3: gp_Pnt);
  }

  export declare class GC_MakeArcOfCircle_5 extends GC_MakeArcOfCircle {
    constructor(P1: gp_Pnt, V: gp_Vec, P2: gp_Pnt);
  }

export declare class GC_Root {
  constructor();
  IsDone(): Standard_Boolean;
  Status(): gce_ErrorType;
  delete(): void;
}

export declare class GC_MakeSegment extends GC_Root {
  Value(): any;
  delete(): void;
}

  export declare class GC_MakeSegment_1 extends GC_MakeSegment {
    constructor(P1: gp_Pnt, P2: gp_Pnt);
  }

  export declare class GC_MakeSegment_2 extends GC_MakeSegment {
    constructor(Line: gp_Lin, U1: Standard_Real, U2: Standard_Real);
  }

  export declare class GC_MakeSegment_3 extends GC_MakeSegment {
    constructor(Line: gp_Lin, Point: gp_Pnt, Ulast: Standard_Real);
  }

  export declare class GC_MakeSegment_4 extends GC_MakeSegment {
    constructor(Line: gp_Lin, P1: gp_Pnt, P2: gp_Pnt);
  }

export declare class GC_MakeCircle extends GC_Root {
  Value(): any;
  delete(): void;
}

  export declare class GC_MakeCircle_1 extends GC_MakeCircle {
    constructor(C: gp_Circ);
  }

  export declare class GC_MakeCircle_2 extends GC_MakeCircle {
    constructor(A2: gp_Ax2, Radius: Standard_Real);
  }

  export declare class GC_MakeCircle_3 extends GC_MakeCircle {
    constructor(Circ: gp_Circ, Dist: Standard_Real);
  }

  export declare class GC_MakeCircle_4 extends GC_MakeCircle {
    constructor(Circ: gp_Circ, Point: gp_Pnt);
  }

  export declare class GC_MakeCircle_5 extends GC_MakeCircle {
    constructor(P1: gp_Pnt, P2: gp_Pnt, P3: gp_Pnt);
  }

  export declare class GC_MakeCircle_6 extends GC_MakeCircle {
    constructor(Center: gp_Pnt, Norm: gp_Dir, Radius: Standard_Real);
  }

  export declare class GC_MakeCircle_7 extends GC_MakeCircle {
    constructor(Center: gp_Pnt, PtAxis: gp_Pnt, Radius: Standard_Real);
  }

  export declare class GC_MakeCircle_8 extends GC_MakeCircle {
    constructor(Axis: gp_Ax1, Radius: Standard_Real);
  }

export declare class GCPnts_TangentialDeflection {
  Initialize_1(theC: Adaptor3d_Curve, theAngularDeflection: Standard_Real, theCurvatureDeflection: Standard_Real, theMinimumOfPoints: Standard_Integer, theUTol: Standard_Real, theMinLen: Standard_Real): void;
  Initialize_2(theC: Adaptor3d_Curve, theFirstParameter: Standard_Real, theLastParameter: Standard_Real, theAngularDeflection: Standard_Real, theCurvatureDeflection: Standard_Real, theMinimumOfPoints: Standard_Integer, theUTol: Standard_Real, theMinLen: Standard_Real): void;
  Initialize_3(theC: Adaptor2d_Curve2d, theAngularDeflection: Standard_Real, theCurvatureDeflection: Standard_Real, theMinimumOfPoints: Standard_Integer, theUTol: Standard_Real, theMinLen: Standard_Real): void;
  Initialize_4(theC: Adaptor2d_Curve2d, theFirstParameter: Standard_Real, theLastParameter: Standard_Real, theAngularDeflection: Standard_Real, theCurvatureDeflection: Standard_Real, theMinimumOfPoints: Standard_Integer, theUTol: Standard_Real, theMinLen: Standard_Real): void;
  AddPoint(thePnt: gp_Pnt, theParam: Standard_Real, theIsReplace: Standard_Boolean): Standard_Integer;
  NbPoints(): Standard_Integer;
  Parameter(I: Standard_Integer): Standard_Real;
  Value(I: Standard_Integer): gp_Pnt;
  static ArcAngularStep(theRadius: Standard_Real, theLinearDeflection: Standard_Real, theAngularDeflection: Standard_Real, theMinLength: Standard_Real): Standard_Real;
  delete(): void;
}

  export declare class GCPnts_TangentialDeflection_1 extends GCPnts_TangentialDeflection {
    constructor();
  }

  export declare class GCPnts_TangentialDeflection_2 extends GCPnts_TangentialDeflection {
    constructor(theC: Adaptor3d_Curve, theAngularDeflection: Standard_Real, theCurvatureDeflection: Standard_Real, theMinimumOfPoints: Standard_Integer, theUTol: Standard_Real, theMinLen: Standard_Real);
  }

  export declare class GCPnts_TangentialDeflection_3 extends GCPnts_TangentialDeflection {
    constructor(theC: Adaptor3d_Curve, theFirstParameter: Standard_Real, theLastParameter: Standard_Real, theAngularDeflection: Standard_Real, theCurvatureDeflection: Standard_Real, theMinimumOfPoints: Standard_Integer, theUTol: Standard_Real, theMinLen: Standard_Real);
  }

  export declare class GCPnts_TangentialDeflection_4 extends GCPnts_TangentialDeflection {
    constructor(theC: Adaptor2d_Curve2d, theAngularDeflection: Standard_Real, theCurvatureDeflection: Standard_Real, theMinimumOfPoints: Standard_Integer, theUTol: Standard_Real, theMinLen: Standard_Real);
  }

  export declare class GCPnts_TangentialDeflection_5 extends GCPnts_TangentialDeflection {
    constructor(theC: Adaptor2d_Curve2d, theFirstParameter: Standard_Real, theLastParameter: Standard_Real, theAngularDeflection: Standard_Real, theCurvatureDeflection: Standard_Real, theMinimumOfPoints: Standard_Integer, theUTol: Standard_Real, theMinLen: Standard_Real);
  }

export declare class TopoDS_Shape {
  constructor()
  IsNull(): Standard_Boolean;
  Nullify(): void;
  Location_1(): TopLoc_Location;
  Location_2(theLoc: TopLoc_Location, theRaiseExc: Standard_Boolean): void;
  Located(theLoc: TopLoc_Location, theRaiseExc: Standard_Boolean): TopoDS_Shape;
  Orientation_1(): TopAbs_Orientation;
  Orientation_2(theOrient: TopAbs_Orientation): void;
  Oriented(theOrient: TopAbs_Orientation): TopoDS_Shape;
  TShape_1(): any;
  ShapeType(): TopAbs_ShapeEnum;
  Free_1(): Standard_Boolean;
  Free_2(theIsFree: Standard_Boolean): void;
  Locked_1(): Standard_Boolean;
  Locked_2(theIsLocked: Standard_Boolean): void;
  Modified_1(): Standard_Boolean;
  Modified_2(theIsModified: Standard_Boolean): void;
  Checked_1(): Standard_Boolean;
  Checked_2(theIsChecked: Standard_Boolean): void;
  Orientable_1(): Standard_Boolean;
  Orientable_2(theIsOrientable: Standard_Boolean): void;
  Closed_1(): Standard_Boolean;
  Closed_2(theIsClosed: Standard_Boolean): void;
  Infinite_1(): Standard_Boolean;
  Infinite_2(theIsInfinite: Standard_Boolean): void;
  Convex_1(): Standard_Boolean;
  Convex_2(theIsConvex: Standard_Boolean): void;
  Move(thePosition: TopLoc_Location, theRaiseExc: Standard_Boolean): void;
  Moved(thePosition: TopLoc_Location, theRaiseExc: Standard_Boolean): TopoDS_Shape;
  Reverse(): void;
  Reversed(): TopoDS_Shape;
  Complement(): void;
  Complemented(): TopoDS_Shape;
  Compose(theOrient: TopAbs_Orientation): void;
  Composed(theOrient: TopAbs_Orientation): TopoDS_Shape;
  NbChildren(): Standard_Integer;
  IsPartner(theOther: TopoDS_Shape): Standard_Boolean;
  IsSame(theOther: TopoDS_Shape): Standard_Boolean;
  IsEqual(theOther: TopoDS_Shape): Standard_Boolean;
  IsNotEqual(theOther: TopoDS_Shape): Standard_Boolean;
  EmptyCopy(): void;
  EmptyCopied(): TopoDS_Shape;
  TShape_2(theTShape: any): void;
  delete(): void;
}

export declare class TopoDS_Face extends TopoDS_Shape {
  constructor()
  delete(): void;
}

export declare class TopoDS_Solid extends TopoDS_Shape {
  constructor()
  delete(): void;
}

export declare class TopoDS_Shell extends TopoDS_Shape {
  constructor()
  delete(): void;
}

export declare class TopoDS_Compound extends TopoDS_Shape {
  constructor()
  delete(): void;
}

export declare class TopoDS_Edge extends TopoDS_Shape {
  constructor()
  delete(): void;
}

export declare class TopoDS_Iterator {
  Initialize(S: TopoDS_Shape, cumOri: Standard_Boolean, cumLoc: Standard_Boolean): void;
  More(): Standard_Boolean;
  Next(): void;
  Value(): TopoDS_Shape;
  delete(): void;
}

  export declare class TopoDS_Iterator_1 extends TopoDS_Iterator {
    constructor();
  }

  export declare class TopoDS_Iterator_2 extends TopoDS_Iterator {
    constructor(S: TopoDS_Shape, cumOri: Standard_Boolean, cumLoc: Standard_Boolean);
  }

export declare class TopoDS_Wire extends TopoDS_Shape {
  constructor()
  delete(): void;
}

export declare class TopoDS_Vertex extends TopoDS_Shape {
  constructor()
  delete(): void;
}

export declare class TopoDS_Builder {
  constructor();
  MakeWire(W: TopoDS_Wire): void;
  MakeShell(S: TopoDS_Shell): void;
  MakeSolid(S: TopoDS_Solid): void;
  MakeCompSolid(C: TopoDS_CompSolid): void;
  MakeCompound(C: TopoDS_Compound): void;
  Add(S: TopoDS_Shape, C: TopoDS_Shape): void;
  Remove(S: TopoDS_Shape, C: TopoDS_Shape): void;
  delete(): void;
}

export declare class BRep_Tool {
  constructor();
  static IsClosed_1(S: TopoDS_Shape): Standard_Boolean;
  static Surface_1(F: TopoDS_Face, L: TopLoc_Location): any;
  static Surface_2(F: TopoDS_Face): any;
  static Triangulation(theFace: TopoDS_Face, theLocation: TopLoc_Location, theMeshPurpose: Poly_MeshPurpose): any;
  static Triangulations(theFace: TopoDS_Face, theLocation: TopLoc_Location): any;
  static Tolerance_1(F: TopoDS_Face): Standard_Real;
  static NaturalRestriction(F: TopoDS_Face): Standard_Boolean;
  static IsGeometric_1(F: TopoDS_Face): Standard_Boolean;
  static IsGeometric_2(E: TopoDS_Edge): Standard_Boolean;
  static Curve_1(E: TopoDS_Edge, L: TopLoc_Location, First: Standard_Real, Last: Standard_Real): any;
  static Curve_2(E: TopoDS_Edge, First: Standard_Real, Last: Standard_Real): any;
  static Polygon3D(E: TopoDS_Edge, L: TopLoc_Location): any;
  static CurveOnSurface_1(E: TopoDS_Edge, F: TopoDS_Face, First: Standard_Real, Last: Standard_Real, theIsStored: Standard_Boolean): any;
  static CurveOnSurface_2(E: TopoDS_Edge, S: any, L: TopLoc_Location, First: Standard_Real, Last: Standard_Real, theIsStored: Standard_Boolean): any;
  static CurveOnPlane(E: TopoDS_Edge, S: any, L: TopLoc_Location, First: Standard_Real, Last: Standard_Real): any;
  static CurveOnSurface_3(E: TopoDS_Edge, C: any, S: any, L: TopLoc_Location, First: Standard_Real, Last: Standard_Real): void;
  static CurveOnSurface_4(E: TopoDS_Edge, C: any, S: any, L: TopLoc_Location, First: Standard_Real, Last: Standard_Real, Index: Standard_Integer): void;
  static PolygonOnSurface_1(E: TopoDS_Edge, F: TopoDS_Face): any;
  static PolygonOnSurface_2(E: TopoDS_Edge, S: any, L: TopLoc_Location): any;
  static PolygonOnSurface_3(E: TopoDS_Edge, C: any, S: any, L: TopLoc_Location): void;
  static PolygonOnSurface_4(E: TopoDS_Edge, C: any, S: any, L: TopLoc_Location, Index: Standard_Integer): void;
  static PolygonOnTriangulation_1(E: TopoDS_Edge, T: any, L: TopLoc_Location): any;
  static PolygonOnTriangulation_2(E: TopoDS_Edge, P: any, T: any, L: TopLoc_Location): void;
  static PolygonOnTriangulation_3(E: TopoDS_Edge, P: any, T: any, L: TopLoc_Location, Index: Standard_Integer): void;
  static IsClosed_2(E: TopoDS_Edge, F: TopoDS_Face): Standard_Boolean;
  static IsClosed_3(E: TopoDS_Edge, S: any, L: TopLoc_Location): Standard_Boolean;
  static IsClosed_4(E: TopoDS_Edge, T: any, L: TopLoc_Location): Standard_Boolean;
  static Tolerance_2(E: TopoDS_Edge): Standard_Real;
  static SameParameter(E: TopoDS_Edge): Standard_Boolean;
  static SameRange(E: TopoDS_Edge): Standard_Boolean;
  static Degenerated(E: TopoDS_Edge): Standard_Boolean;
  static Range_1(E: TopoDS_Edge, First: Standard_Real, Last: Standard_Real): void;
  static Range_2(E: TopoDS_Edge, S: any, L: TopLoc_Location, First: Standard_Real, Last: Standard_Real): void;
  static Range_3(E: TopoDS_Edge, F: TopoDS_Face, First: Standard_Real, Last: Standard_Real): void;
  static UVPoints_1(E: TopoDS_Edge, S: any, L: TopLoc_Location, PFirst: gp_Pnt2d, PLast: gp_Pnt2d): void;
  static UVPoints_2(E: TopoDS_Edge, F: TopoDS_Face, PFirst: gp_Pnt2d, PLast: gp_Pnt2d): void;
  static SetUVPoints_1(E: TopoDS_Edge, S: any, L: TopLoc_Location, PFirst: gp_Pnt2d, PLast: gp_Pnt2d): void;
  static SetUVPoints_2(E: TopoDS_Edge, F: TopoDS_Face, PFirst: gp_Pnt2d, PLast: gp_Pnt2d): void;
  static HasContinuity_1(E: TopoDS_Edge, F1: TopoDS_Face, F2: TopoDS_Face): Standard_Boolean;
  static Continuity_1(E: TopoDS_Edge, F1: TopoDS_Face, F2: TopoDS_Face): GeomAbs_Shape;
  static HasContinuity_2(E: TopoDS_Edge, S1: any, S2: any, L1: TopLoc_Location, L2: TopLoc_Location): Standard_Boolean;
  static Continuity_2(E: TopoDS_Edge, S1: any, S2: any, L1: TopLoc_Location, L2: TopLoc_Location): GeomAbs_Shape;
  static HasContinuity_3(E: TopoDS_Edge): Standard_Boolean;
  static MaxContinuity(theEdge: TopoDS_Edge): GeomAbs_Shape;
  static Pnt(V: TopoDS_Vertex): gp_Pnt;
  static Tolerance_3(V: TopoDS_Vertex): Standard_Real;
  static Parameter_1(theV: TopoDS_Vertex, theE: TopoDS_Edge, theParam: Standard_Real): Standard_Boolean;
  static Parameter_2(V: TopoDS_Vertex, E: TopoDS_Edge): Standard_Real;
  static Parameter_3(V: TopoDS_Vertex, E: TopoDS_Edge, F: TopoDS_Face): Standard_Real;
  static Parameter_4(V: TopoDS_Vertex, E: TopoDS_Edge, S: any, L: TopLoc_Location): Standard_Real;
  static Parameters(V: TopoDS_Vertex, F: TopoDS_Face): gp_Pnt2d;
  static MaxTolerance(theShape: TopoDS_Shape, theSubShape: TopAbs_ShapeEnum): Standard_Real;
  delete(): void;
}

export declare class BRep_Builder extends TopoDS_Builder {
  constructor();
  MakeFace_1(F: TopoDS_Face): void;
  MakeFace_2(F: TopoDS_Face, S: any, Tol: Standard_Real): void;
  MakeFace_3(F: TopoDS_Face, S: any, L: TopLoc_Location, Tol: Standard_Real): void;
  MakeFace_4(theFace: TopoDS_Face, theTriangulation: any): void;
  MakeFace_5(theFace: TopoDS_Face, theTriangulations: any, theActiveTriangulation: any): void;
  UpdateFace_1(F: TopoDS_Face, S: any, L: TopLoc_Location, Tol: Standard_Real): void;
  UpdateFace_2(theFace: TopoDS_Face, theTriangulation: any, theToReset: Standard_Boolean): void;
  UpdateFace_3(F: TopoDS_Face, Tol: Standard_Real): void;
  NaturalRestriction(F: TopoDS_Face, N: Standard_Boolean): void;
  MakeEdge_1(E: TopoDS_Edge): void;
  MakeEdge_2(E: TopoDS_Edge, C: any, Tol: Standard_Real): void;
  MakeEdge_3(E: TopoDS_Edge, C: any, L: TopLoc_Location, Tol: Standard_Real): void;
  MakeEdge_4(E: TopoDS_Edge, P: any): void;
  MakeEdge_5(E: TopoDS_Edge, N: any, T: any): void;
  MakeEdge_6(E: TopoDS_Edge, N: any, T: any, L: TopLoc_Location): void;
  UpdateEdge_1(E: TopoDS_Edge, C: any, Tol: Standard_Real): void;
  UpdateEdge_2(E: TopoDS_Edge, C: any, L: TopLoc_Location, Tol: Standard_Real): void;
  UpdateEdge_3(E: TopoDS_Edge, C: any, F: TopoDS_Face, Tol: Standard_Real): void;
  UpdateEdge_4(E: TopoDS_Edge, C1: any, C2: any, F: TopoDS_Face, Tol: Standard_Real): void;
  UpdateEdge_5(E: TopoDS_Edge, C: any, S: any, L: TopLoc_Location, Tol: Standard_Real): void;
  UpdateEdge_6(E: TopoDS_Edge, C: any, S: any, L: TopLoc_Location, Tol: Standard_Real, Pf: gp_Pnt2d, Pl: gp_Pnt2d): void;
  UpdateEdge_7(E: TopoDS_Edge, C1: any, C2: any, S: any, L: TopLoc_Location, Tol: Standard_Real): void;
  UpdateEdge_8(E: TopoDS_Edge, C1: any, C2: any, S: any, L: TopLoc_Location, Tol: Standard_Real, Pf: gp_Pnt2d, Pl: gp_Pnt2d): void;
  UpdateEdge_9(E: TopoDS_Edge, P: any): void;
  UpdateEdge_10(E: TopoDS_Edge, P: any, L: TopLoc_Location): void;
  UpdateEdge_11(E: TopoDS_Edge, N: any, T: any): void;
  UpdateEdge_12(E: TopoDS_Edge, N: any, T: any, L: TopLoc_Location): void;
  UpdateEdge_13(E: TopoDS_Edge, N1: any, N2: any, T: any): void;
  UpdateEdge_14(E: TopoDS_Edge, N1: any, N2: any, T: any, L: TopLoc_Location): void;
  UpdateEdge_15(E: TopoDS_Edge, P: any, S: TopoDS_Face): void;
  UpdateEdge_16(E: TopoDS_Edge, P: any, S: any, T: TopLoc_Location): void;
  UpdateEdge_17(E: TopoDS_Edge, P1: any, P2: any, S: TopoDS_Face): void;
  UpdateEdge_18(E: TopoDS_Edge, P1: any, P2: any, S: any, L: TopLoc_Location): void;
  UpdateEdge_19(E: TopoDS_Edge, Tol: Standard_Real): void;
  Continuity_1(E: TopoDS_Edge, F1: TopoDS_Face, F2: TopoDS_Face, C: GeomAbs_Shape): void;
  Continuity_2(E: TopoDS_Edge, S1: any, S2: any, L1: TopLoc_Location, L2: TopLoc_Location, C: GeomAbs_Shape): void;
  SameParameter(E: TopoDS_Edge, S: Standard_Boolean): void;
  SameRange(E: TopoDS_Edge, S: Standard_Boolean): void;
  Degenerated(E: TopoDS_Edge, D: Standard_Boolean): void;
  Range_1(E: TopoDS_Edge, First: Standard_Real, Last: Standard_Real, Only3d: Standard_Boolean): void;
  Range_2(E: TopoDS_Edge, S: any, L: TopLoc_Location, First: Standard_Real, Last: Standard_Real): void;
  Range_3(E: TopoDS_Edge, F: TopoDS_Face, First: Standard_Real, Last: Standard_Real): void;
  Transfert_1(Ein: TopoDS_Edge, Eout: TopoDS_Edge): void;
  MakeVertex_1(V: TopoDS_Vertex): void;
  MakeVertex_2(V: TopoDS_Vertex, P: gp_Pnt, Tol: Standard_Real): void;
  UpdateVertex_1(V: TopoDS_Vertex, P: gp_Pnt, Tol: Standard_Real): void;
  UpdateVertex_2(V: TopoDS_Vertex, P: Standard_Real, E: TopoDS_Edge, Tol: Standard_Real): void;
  UpdateVertex_3(V: TopoDS_Vertex, P: Standard_Real, E: TopoDS_Edge, F: TopoDS_Face, Tol: Standard_Real): void;
  UpdateVertex_4(V: TopoDS_Vertex, P: Standard_Real, E: TopoDS_Edge, S: any, L: TopLoc_Location, Tol: Standard_Real): void;
  UpdateVertex_5(Ve: TopoDS_Vertex, U: Standard_Real, V: Standard_Real, F: TopoDS_Face, Tol: Standard_Real): void;
  UpdateVertex_6(V: TopoDS_Vertex, Tol: Standard_Real): void;
  Transfert_2(Ein: TopoDS_Edge, Eout: TopoDS_Edge, Vin: TopoDS_Vertex, Vout: TopoDS_Vertex): void;
  delete(): void;
}

export declare class BRepAdaptor_Surface extends GeomAdaptor_TransformedSurface {
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  ShallowCopy(): any;
  Initialize(F: TopoDS_Face, Restriction: Standard_Boolean): void;
  Face(): TopoDS_Face;
  Tolerance(): Standard_Real;
  delete(): void;
}

  export declare class BRepAdaptor_Surface_1 extends BRepAdaptor_Surface {
    constructor();
  }

  export declare class BRepAdaptor_Surface_2 extends BRepAdaptor_Surface {
    constructor(F: TopoDS_Face, R: Standard_Boolean);
  }

export declare class BRepAdaptor_Curve extends Adaptor3d_Curve {
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  ShallowCopy(): any;
  Reset(): void;
  Initialize_1(E: TopoDS_Edge): void;
  Initialize_2(E: TopoDS_Edge, F: TopoDS_Face): void;
  Trsf(): gp_Trsf;
  Is3DCurve(): Standard_Boolean;
  IsCurveOnSurface(): Standard_Boolean;
  Curve(): GeomAdaptor_Curve;
  CurveOnSurface(): Adaptor3d_CurveOnSurface;
  Edge(): TopoDS_Edge;
  Tolerance(): Standard_Real;
  FirstParameter(): Standard_Real;
  LastParameter(): Standard_Real;
  Continuity(): GeomAbs_Shape;
  NbIntervals(S: GeomAbs_Shape): Standard_Integer;
  Intervals(T: NCollection_Array1<double>, S: GeomAbs_Shape): void;
  Trim(First: Standard_Real, Last: Standard_Real, Tol: Standard_Real): any;
  IsClosed(): Standard_Boolean;
  IsPeriodic(): Standard_Boolean;
  Period(): Standard_Real;
  Value(U: Standard_Real): gp_Pnt;
  D0(U: Standard_Real, P: gp_Pnt): void;
  D1(U: Standard_Real, P: gp_Pnt, V: gp_Vec): void;
  D2(U: Standard_Real, P: gp_Pnt, V1: gp_Vec, V2: gp_Vec): void;
  D3(U: Standard_Real, P: gp_Pnt, V1: gp_Vec, V2: gp_Vec, V3: gp_Vec): void;
  DN(U: Standard_Real, N: Standard_Integer): gp_Vec;
  Resolution(R3d: Standard_Real): Standard_Real;
  GetType(): GeomAbs_CurveType;
  Line(): gp_Lin;
  Circle(): gp_Circ;
  Ellipse(): gp_Elips;
  Hyperbola(): gp_Hypr;
  Parabola(): gp_Parab;
  Degree(): Standard_Integer;
  IsRational(): Standard_Boolean;
  NbPoles(): Standard_Integer;
  NbKnots(): Standard_Integer;
  Bezier(): any;
  BSpline(): any;
  OffsetCurve(): any;
  delete(): void;
}

  export declare class BRepAdaptor_Curve_1 extends BRepAdaptor_Curve {
    constructor();
  }

  export declare class BRepAdaptor_Curve_2 extends BRepAdaptor_Curve {
    constructor(E: TopoDS_Edge);
  }

  export declare class BRepAdaptor_Curve_3 extends BRepAdaptor_Curve {
    constructor(E: TopoDS_Edge, F: TopoDS_Face);
  }

export declare class TopExp_Explorer {
  Init(S: TopoDS_Shape, ToFind: TopAbs_ShapeEnum, ToAvoid: TopAbs_ShapeEnum): void;
  More(): Standard_Boolean;
  Next(): void;
  Value(): TopoDS_Shape;
  Current(): TopoDS_Shape;
  ReInit(): void;
  ExploredShape(): TopoDS_Shape;
  Depth(): Standard_Integer;
  Clear(): void;
  delete(): void;
}

  export declare class TopExp_Explorer_1 extends TopExp_Explorer {
    constructor();
  }

  export declare class TopExp_Explorer_2 extends TopExp_Explorer {
    constructor(S: TopoDS_Shape, ToFind: TopAbs_ShapeEnum, ToAvoid: TopAbs_ShapeEnum);
  }

export declare class Geom_TrimmedCurve extends Geom_BoundedCurve {
  constructor(C: any, U1: Standard_Real, U2: Standard_Real, Sense: Standard_Boolean, theAdjustPeriodic: Standard_Boolean)
  Reverse(): void;
  ReversedParameter(U: Standard_Real): Standard_Real;
  SetTrim(U1: Standard_Real, U2: Standard_Real, Sense: Standard_Boolean, theAdjustPeriodic: Standard_Boolean): void;
  BasisCurve(): any;
  Continuity(): GeomAbs_Shape;
  IsCN(N: Standard_Integer): Standard_Boolean;
  EndPoint(): gp_Pnt;
  FirstParameter(): Standard_Real;
  IsClosed(): Standard_Boolean;
  IsPeriodic(): Standard_Boolean;
  Period(): Standard_Real;
  LastParameter(): Standard_Real;
  StartPoint(): gp_Pnt;
  EvalD0(U: Standard_Real): gp_Pnt;
  EvalD1(U: Standard_Real): any;
  EvalD2(U: Standard_Real): any;
  EvalD3(U: Standard_Real): any;
  EvalDN(U: Standard_Real, N: Standard_Integer): gp_Vec;
  Transform(T: gp_Trsf): void;
  TransformedParameter(U: Standard_Real, T: gp_Trsf): Standard_Real;
  ParametricTransformation(T: gp_Trsf): Standard_Real;
  Copy(): any;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

export declare class Geom_Conic extends Geom_Curve {
  SetAxis(theA1: gp_Ax1): void;
  SetLocation(theP: gp_Pnt): void;
  SetPosition(theA2: gp_Ax2): void;
  Axis(): gp_Ax1;
  Location(): gp_Pnt;
  Position(): gp_Ax2;
  Eccentricity(): Standard_Real;
  XAxis(): gp_Ax1;
  YAxis(): gp_Ax1;
  Reverse(): void;
  ReversedParameter(U: Standard_Real): Standard_Real;
  Continuity(): GeomAbs_Shape;
  IsCN(N: Standard_Integer): Standard_Boolean;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

export declare class Geom_Surface extends Geom_Geometry {
  UReverse(): void;
  UReversed(): any;
  UReversedParameter(U: Standard_Real): Standard_Real;
  VReverse(): void;
  VReversed(): any;
  VReversedParameter(V: Standard_Real): Standard_Real;
  TransformParameters(U: Standard_Real, V: Standard_Real, T: gp_Trsf): void;
  ParametricTransformation(T: gp_Trsf): gp_GTrsf2d;
  Bounds(U1: Standard_Real, U2: Standard_Real, V1: Standard_Real, V2: Standard_Real): void;
  IsUClosed(): Standard_Boolean;
  IsVClosed(): Standard_Boolean;
  IsUPeriodic(): Standard_Boolean;
  UPeriod(): Standard_Real;
  IsVPeriodic(): Standard_Boolean;
  VPeriod(): Standard_Real;
  UIso(U: Standard_Real): any;
  VIso(V: Standard_Real): any;
  Continuity(): GeomAbs_Shape;
  IsCNu(N: Standard_Integer): Standard_Boolean;
  IsCNv(N: Standard_Integer): Standard_Boolean;
  EvalD0(U: Standard_Real, V: Standard_Real): gp_Pnt;
  EvalD1(U: Standard_Real, V: Standard_Real): ResD1;
  EvalD2(U: Standard_Real, V: Standard_Real): ResD2;
  EvalD3(U: Standard_Real, V: Standard_Real): ResD3;
  EvalDN(U: Standard_Real, V: Standard_Real, Nu: Standard_Integer, Nv: Standard_Integer): gp_Vec;
  D0(U: Standard_Real, V: Standard_Real, P: gp_Pnt): void;
  D1(U: Standard_Real, V: Standard_Real, P: gp_Pnt, D1U: gp_Vec, D1V: gp_Vec): void;
  D2(U: Standard_Real, V: Standard_Real, P: gp_Pnt, D1U: gp_Vec, D1V: gp_Vec, D2U: gp_Vec, D2V: gp_Vec, D2UV: gp_Vec): void;
  D3(U: Standard_Real, V: Standard_Real, P: gp_Pnt, D1U: gp_Vec, D1V: gp_Vec, D2U: gp_Vec, D2V: gp_Vec, D2UV: gp_Vec, D3U: gp_Vec, D3V: gp_Vec, D3UUV: gp_Vec, D3UVV: gp_Vec): void;
  DN(U: Standard_Real, V: Standard_Real, Nu: Standard_Integer, Nv: Standard_Integer): gp_Vec;
  Value(U: Standard_Real, V: Standard_Real): gp_Pnt;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

export declare class Geom_ElementarySurface extends Geom_Surface {
  SetAxis(theA1: gp_Ax1): void;
  SetLocation(theLoc: gp_Pnt): void;
  SetPosition(theAx3: gp_Ax3): void;
  Axis(): gp_Ax1;
  Location(): gp_Pnt;
  Position(): gp_Ax3;
  UReverse(): void;
  UReversedParameter(U: Standard_Real): Standard_Real;
  VReverse(): void;
  VReversedParameter(V: Standard_Real): Standard_Real;
  Continuity(): GeomAbs_Shape;
  IsCNu(N: Standard_Integer): Standard_Boolean;
  IsCNv(N: Standard_Integer): Standard_Boolean;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

export declare class Geom_BezierCurve extends Geom_BoundedCurve {
  HasEvalRepresentation(): Standard_Boolean;
  EvalRepresentation(): any;
  SetEvalRepresentation(theDesc: any): void;
  ClearEvalRepresentation(): void;
  Increase(Degree: Standard_Integer): void;
  InsertPoleAfter_1(Index: Standard_Integer, P: gp_Pnt): void;
  InsertPoleAfter_2(Index: Standard_Integer, P: gp_Pnt, Weight: Standard_Real): void;
  InsertPoleBefore_1(Index: Standard_Integer, P: gp_Pnt): void;
  InsertPoleBefore_2(Index: Standard_Integer, P: gp_Pnt, Weight: Standard_Real): void;
  RemovePole(Index: Standard_Integer): void;
  Reverse(): void;
  ReversedParameter(U: Standard_Real): Standard_Real;
  Segment(U1: Standard_Real, U2: Standard_Real): void;
  SetPole_1(Index: Standard_Integer, P: gp_Pnt): void;
  SetPole_2(Index: Standard_Integer, P: gp_Pnt, Weight: Standard_Real): void;
  SetWeight(Index: Standard_Integer, Weight: Standard_Real): void;
  IsClosed(): Standard_Boolean;
  IsCN(N: Standard_Integer): Standard_Boolean;
  IsPeriodic(): Standard_Boolean;
  IsRational(): Standard_Boolean;
  Continuity(): GeomAbs_Shape;
  Degree(): Standard_Integer;
  EvalD0(U: Standard_Real): gp_Pnt;
  EvalD1(U: Standard_Real): any;
  EvalD2(U: Standard_Real): any;
  EvalD3(U: Standard_Real): any;
  EvalDN(U: Standard_Real, N: Standard_Integer): gp_Vec;
  StartPoint(): gp_Pnt;
  EndPoint(): gp_Pnt;
  FirstParameter(): Standard_Real;
  LastParameter(): Standard_Real;
  NbPoles(): Standard_Integer;
  Pole(Index: Standard_Integer): gp_Pnt;
  Poles_1(P: NCollection_Array1<gp_Pnt>): void;
  Poles_2(): any;
  Weight(Index: Standard_Integer): Standard_Real;
  Weights_1(W: NCollection_Array1<double>): void;
  Weights_2(): any;
  WeightsArray(): any;
  Transform(T: gp_Trsf): void;
  static MaxDegree(): Standard_Integer;
  Resolution(Tolerance3D: Standard_Real, UTolerance: Standard_Real): void;
  Copy(): any;
  Knots(): any;
  Multiplicities(): any;
  KnotSequence(): any;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

  export declare class Geom_BezierCurve_1 extends Geom_BezierCurve {
    constructor(CurvePoles: NCollection_Array1<gp_Pnt>);
  }

  export declare class Geom_BezierCurve_2 extends Geom_BezierCurve {
    constructor(CurvePoles: NCollection_Array1<gp_Pnt>, PoleWeights: NCollection_Array1<double>);
  }

  export declare class Geom_BezierCurve_3 extends Geom_BezierCurve {
    constructor(theOther: Geom_BezierCurve);
  }

export declare class Geom_Curve extends Geom_Geometry {
  Reverse(): void;
  ReversedParameter(U: Standard_Real): Standard_Real;
  TransformedParameter(U: Standard_Real, T: gp_Trsf): Standard_Real;
  ParametricTransformation(T: gp_Trsf): Standard_Real;
  Reversed(): any;
  FirstParameter(): Standard_Real;
  LastParameter(): Standard_Real;
  IsClosed(): Standard_Boolean;
  IsPeriodic(): Standard_Boolean;
  Period(): Standard_Real;
  Continuity(): GeomAbs_Shape;
  IsCN(N: Standard_Integer): Standard_Boolean;
  EvalD0(U: Standard_Real): gp_Pnt;
  EvalD1(U: Standard_Real): ResD1;
  EvalD2(U: Standard_Real): ResD2;
  EvalD3(U: Standard_Real): ResD3;
  EvalDN(U: Standard_Real, N: Standard_Integer): gp_Vec;
  D0(U: Standard_Real, P: gp_Pnt): void;
  D1(U: Standard_Real, P: gp_Pnt, V1: gp_Vec): void;
  D2(U: Standard_Real, P: gp_Pnt, V1: gp_Vec, V2: gp_Vec): void;
  D3(U: Standard_Real, P: gp_Pnt, V1: gp_Vec, V2: gp_Vec, V3: gp_Vec): void;
  DN(U: Standard_Real, N: Standard_Integer): gp_Vec;
  Value(U: Standard_Real): gp_Pnt;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

export declare class Geom_BSplineCurve extends Geom_BoundedCurve {
  HasEvalRepresentation(): Standard_Boolean;
  EvalRepresentation(): any;
  SetEvalRepresentation(theDesc: any): void;
  ClearEvalRepresentation(): void;
  IncreaseDegree(Degree: Standard_Integer): void;
  IncreaseMultiplicity_1(Index: Standard_Integer, M: Standard_Integer): void;
  IncreaseMultiplicity_2(I1: Standard_Integer, I2: Standard_Integer, M: Standard_Integer): void;
  IncrementMultiplicity(I1: Standard_Integer, I2: Standard_Integer, M: Standard_Integer): void;
  InsertKnot(U: Standard_Real, M: Standard_Integer, ParametricTolerance: Standard_Real, Add: Standard_Boolean): void;
  InsertKnots(Knots: NCollection_Array1<double>, Mults: NCollection_Array1<int>, ParametricTolerance: Standard_Real, Add: Standard_Boolean): void;
  RemoveKnot(Index: Standard_Integer, M: Standard_Integer, Tolerance: Standard_Real): Standard_Boolean;
  Reverse(): void;
  ReversedParameter(U: Standard_Real): Standard_Real;
  Segment(U1: Standard_Real, U2: Standard_Real, theTolerance: Standard_Real): void;
  SetKnot_1(Index: Standard_Integer, K: Standard_Real): void;
  SetKnots(K: NCollection_Array1<double>): void;
  SetKnot_2(Index: Standard_Integer, K: Standard_Real, M: Standard_Integer): void;
  PeriodicNormalization(U: Standard_Real): void;
  SetPeriodic(): void;
  SetOrigin_1(Index: Standard_Integer): void;
  SetOrigin_2(U: Standard_Real, Tol: Standard_Real): void;
  SetNotPeriodic(): void;
  SetPole_1(Index: Standard_Integer, P: gp_Pnt): void;
  SetPole_2(Index: Standard_Integer, P: gp_Pnt, Weight: Standard_Real): void;
  SetWeight(Index: Standard_Integer, Weight: Standard_Real): void;
  MovePoint(U: Standard_Real, P: gp_Pnt, Index1: Standard_Integer, Index2: Standard_Integer, FirstModifiedPole: Standard_Integer, LastModifiedPole: Standard_Integer): void;
  MovePointAndTangent(U: Standard_Real, P: gp_Pnt, Tangent: gp_Vec, Tolerance: Standard_Real, StartingCondition: Standard_Integer, EndingCondition: Standard_Integer, ErrorStatus: Standard_Integer): void;
  IsCN(N: Standard_Integer): Standard_Boolean;
  IsG1(theTf: Standard_Real, theTl: Standard_Real, theAngTol: Standard_Real): Standard_Boolean;
  IsClosed(): Standard_Boolean;
  IsPeriodic(): Standard_Boolean;
  IsRational(): Standard_Boolean;
  Continuity(): GeomAbs_Shape;
  Degree(): Standard_Integer;
  EvalD0(U: Standard_Real): gp_Pnt;
  EvalD1(U: Standard_Real): any;
  EvalD2(U: Standard_Real): any;
  EvalD3(U: Standard_Real): any;
  EvalDN(U: Standard_Real, N: Standard_Integer): gp_Vec;
  LocalValue(U: Standard_Real, FromK1: Standard_Integer, ToK2: Standard_Integer): gp_Pnt;
  LocalD0(U: Standard_Real, FromK1: Standard_Integer, ToK2: Standard_Integer, P: gp_Pnt): void;
  LocalD1(U: Standard_Real, FromK1: Standard_Integer, ToK2: Standard_Integer, P: gp_Pnt, V1: gp_Vec): void;
  LocalD2(U: Standard_Real, FromK1: Standard_Integer, ToK2: Standard_Integer, P: gp_Pnt, V1: gp_Vec, V2: gp_Vec): void;
  LocalD3(U: Standard_Real, FromK1: Standard_Integer, ToK2: Standard_Integer, P: gp_Pnt, V1: gp_Vec, V2: gp_Vec, V3: gp_Vec): void;
  LocalDN(U: Standard_Real, FromK1: Standard_Integer, ToK2: Standard_Integer, N: Standard_Integer): gp_Vec;
  EndPoint(): gp_Pnt;
  FirstUKnotIndex(): Standard_Integer;
  FirstParameter(): Standard_Real;
  Knot(Index: Standard_Integer): Standard_Real;
  Knots_1(K: NCollection_Array1<double>): void;
  Knots_2(): any;
  KnotSequence_1(K: NCollection_Array1<double>): void;
  KnotSequence_2(): any;
  KnotDistribution(): GeomAbs_BSplKnotDistribution;
  LastUKnotIndex(): Standard_Integer;
  LastParameter(): Standard_Real;
  LocateU(U: Standard_Real, ParametricTolerance: Standard_Real, I1: Standard_Integer, I2: Standard_Integer, WithKnotRepetition: Standard_Boolean): void;
  Multiplicity(Index: Standard_Integer): Standard_Integer;
  Multiplicities_1(M: NCollection_Array1<int>): void;
  Multiplicities_2(): any;
  NbKnots(): Standard_Integer;
  NbPoles(): Standard_Integer;
  Pole(Index: Standard_Integer): gp_Pnt;
  Poles_1(P: NCollection_Array1<gp_Pnt>): void;
  Poles_2(): any;
  StartPoint(): gp_Pnt;
  Weight(Index: Standard_Integer): Standard_Real;
  Weights_1(W: NCollection_Array1<double>): void;
  Weights_2(): any;
  WeightsArray(): any;
  Transform(T: gp_Trsf): void;
  static MaxDegree(): Standard_Integer;
  Resolution(Tolerance3D: Standard_Real, UTolerance: Standard_Real): void;
  Copy(): any;
  IsEqual(theOther: any, thePreci: Standard_Real): Standard_Boolean;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

  export declare class Geom_BSplineCurve_1 extends Geom_BSplineCurve {
    constructor(Poles: NCollection_Array1<gp_Pnt>, Knots: NCollection_Array1<double>, Multiplicities: NCollection_Array1<int>, Degree: Standard_Integer, Periodic: Standard_Boolean);
  }

  export declare class Geom_BSplineCurve_2 extends Geom_BSplineCurve {
    constructor(Poles: NCollection_Array1<gp_Pnt>, Weights: NCollection_Array1<double>, Knots: NCollection_Array1<double>, Multiplicities: NCollection_Array1<int>, Degree: Standard_Integer, Periodic: Standard_Boolean, CheckRational: Standard_Boolean);
  }

  export declare class Geom_BSplineCurve_3 extends Geom_BSplineCurve {
    constructor(theOther: Geom_BSplineCurve);
  }

export declare class Geom_Plane extends Geom_ElementarySurface {
  SetPln(Pl: gp_Pln): void;
  Pln(): gp_Pln;
  UReverse(): void;
  UReversedParameter(U: Standard_Real): Standard_Real;
  VReverse(): void;
  VReversedParameter(V: Standard_Real): Standard_Real;
  TransformParameters(U: Standard_Real, V: Standard_Real, T: gp_Trsf): void;
  ParametricTransformation(T: gp_Trsf): gp_GTrsf2d;
  Bounds(U1: Standard_Real, U2: Standard_Real, V1: Standard_Real, V2: Standard_Real): void;
  Coefficients(A: Standard_Real, B: Standard_Real, C: Standard_Real, D: Standard_Real): void;
  IsUClosed(): Standard_Boolean;
  IsVClosed(): Standard_Boolean;
  IsUPeriodic(): Standard_Boolean;
  IsVPeriodic(): Standard_Boolean;
  UIso(U: Standard_Real): any;
  VIso(V: Standard_Real): any;
  EvalD0(U: Standard_Real, V: Standard_Real): gp_Pnt;
  EvalD1(U: Standard_Real, V: Standard_Real): any;
  EvalD2(U: Standard_Real, V: Standard_Real): any;
  EvalD3(U: Standard_Real, V: Standard_Real): any;
  EvalDN(U: Standard_Real, V: Standard_Real, Nu: Standard_Integer, Nv: Standard_Integer): gp_Vec;
  Transform(T: gp_Trsf): void;
  Copy(): any;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

  export declare class Geom_Plane_1 extends Geom_Plane {
    constructor(A3: gp_Ax3);
  }

  export declare class Geom_Plane_2 extends Geom_Plane {
    constructor(Pl: gp_Pln);
  }

  export declare class Geom_Plane_3 extends Geom_Plane {
    constructor(P: gp_Pnt, V: gp_Dir);
  }

  export declare class Geom_Plane_4 extends Geom_Plane {
    constructor(A: Standard_Real, B: Standard_Real, C: Standard_Real, D: Standard_Real);
  }

export declare class Geom_BoundedCurve extends Geom_Curve {
  EndPoint(): gp_Pnt;
  StartPoint(): gp_Pnt;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

export declare class Geom_Geometry extends Standard_Transient {
  Mirror_1(P: gp_Pnt): void;
  Mirror_2(A1: gp_Ax1): void;
  Mirror_3(A2: gp_Ax2): void;
  Rotate(A1: gp_Ax1, Ang: Standard_Real): void;
  Scale(P: gp_Pnt, S: Standard_Real): void;
  Translate_1(V: gp_Vec): void;
  Translate_2(P1: gp_Pnt, P2: gp_Pnt): void;
  Transform(T: gp_Trsf): void;
  Mirrored_1(P: gp_Pnt): any;
  Mirrored_2(A1: gp_Ax1): any;
  Mirrored_3(A2: gp_Ax2): any;
  Rotated(A1: gp_Ax1, Ang: Standard_Real): any;
  Scaled(P: gp_Pnt, S: Standard_Real): any;
  Transformed(T: gp_Trsf): any;
  Translated_1(V: gp_Vec): any;
  Translated_2(P1: gp_Pnt, P2: gp_Pnt): any;
  Copy(): any;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

export declare class Geom_Circle extends Geom_Conic {
  SetCirc(C: gp_Circ): void;
  SetRadius(R: Standard_Real): void;
  Circ(): gp_Circ;
  Radius(): Standard_Real;
  ReversedParameter(U: Standard_Real): Standard_Real;
  Eccentricity(): Standard_Real;
  FirstParameter(): Standard_Real;
  LastParameter(): Standard_Real;
  IsClosed(): Standard_Boolean;
  IsPeriodic(): Standard_Boolean;
  EvalD0(U: Standard_Real): gp_Pnt;
  EvalD1(U: Standard_Real): any;
  EvalD2(U: Standard_Real): any;
  EvalD3(U: Standard_Real): any;
  EvalDN(U: Standard_Real, N: Standard_Integer): gp_Vec;
  Transform(T: gp_Trsf): void;
  Copy(): any;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

  export declare class Geom_Circle_1 extends Geom_Circle {
    constructor(C: gp_Circ);
  }

  export declare class Geom_Circle_2 extends Geom_Circle {
    constructor(A2: gp_Ax2, Radius: Standard_Real);
  }

export declare type TopAbs_ShapeEnum = {
  TopAbs_COMPOUND: {};
  TopAbs_COMPSOLID: {};
  TopAbs_SOLID: {};
  TopAbs_SHELL: {};
  TopAbs_FACE: {};
  TopAbs_WIRE: {};
  TopAbs_EDGE: {};
  TopAbs_VERTEX: {};
  TopAbs_SHAPE: {};
}

export declare type TopAbs_Orientation = {
  TopAbs_FORWARD: {};
  TopAbs_REVERSED: {};
  TopAbs_INTERNAL: {};
  TopAbs_EXTERNAL: {};
}

export declare class GeomAdaptor_TransformedSurface extends Adaptor3d_Surface {
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  ShallowCopy(): any;
  Load_1(theSurface: any): void;
  Load_2(theSurface: any, theUFirst: Standard_Real, theULast: Standard_Real, theVFirst: Standard_Real, theVLast: Standard_Real, theTolU: Standard_Real, theTolV: Standard_Real): void;
  SetTrsf(theTrsf: gp_Trsf): void;
  Trsf(): gp_Trsf;
  Surface(): GeomAdaptor_Surface;
  ChangeSurface(): GeomAdaptor_Surface;
  GeomSurface(): any;
  FirstUParameter(): Standard_Real;
  LastUParameter(): Standard_Real;
  FirstVParameter(): Standard_Real;
  LastVParameter(): Standard_Real;
  UContinuity(): GeomAbs_Shape;
  VContinuity(): GeomAbs_Shape;
  NbUIntervals(theS: GeomAbs_Shape): Standard_Integer;
  NbVIntervals(theS: GeomAbs_Shape): Standard_Integer;
  UIntervals(theT: NCollection_Array1<double>, theS: GeomAbs_Shape): void;
  VIntervals(theT: NCollection_Array1<double>, theS: GeomAbs_Shape): void;
  UTrim(theFirst: Standard_Real, theLast: Standard_Real, theTol: Standard_Real): any;
  VTrim(theFirst: Standard_Real, theLast: Standard_Real, theTol: Standard_Real): any;
  IsUClosed(): Standard_Boolean;
  IsVClosed(): Standard_Boolean;
  IsUPeriodic(): Standard_Boolean;
  UPeriod(): Standard_Real;
  IsVPeriodic(): Standard_Boolean;
  VPeriod(): Standard_Real;
  Value(theU: Standard_Real, theV: Standard_Real): gp_Pnt;
  D0(theU: Standard_Real, theV: Standard_Real, theP: gp_Pnt): void;
  D1(theU: Standard_Real, theV: Standard_Real, theP: gp_Pnt, theD1U: gp_Vec, theD1V: gp_Vec): void;
  D2(theU: Standard_Real, theV: Standard_Real, theP: gp_Pnt, theD1U: gp_Vec, theD1V: gp_Vec, theD2U: gp_Vec, theD2V: gp_Vec, theD2UV: gp_Vec): void;
  D3(theU: Standard_Real, theV: Standard_Real, theP: gp_Pnt, theD1U: gp_Vec, theD1V: gp_Vec, theD2U: gp_Vec, theD2V: gp_Vec, theD2UV: gp_Vec, theD3U: gp_Vec, theD3V: gp_Vec, theD3UUV: gp_Vec, theD3UVV: gp_Vec): void;
  DN(theU: Standard_Real, theV: Standard_Real, theNu: Standard_Integer, theNv: Standard_Integer): gp_Vec;
  UResolution(theR3d: Standard_Real): Standard_Real;
  VResolution(theR3d: Standard_Real): Standard_Real;
  GetType(): GeomAbs_SurfaceType;
  Plane(): gp_Pln;
  Cylinder(): gp_Cylinder;
  Cone(): gp_Cone;
  Sphere(): gp_Sphere;
  Torus(): gp_Torus;
  UDegree(): Standard_Integer;
  NbUPoles(): Standard_Integer;
  VDegree(): Standard_Integer;
  NbVPoles(): Standard_Integer;
  NbUKnots(): Standard_Integer;
  NbVKnots(): Standard_Integer;
  IsURational(): Standard_Boolean;
  IsVRational(): Standard_Boolean;
  Bezier(): any;
  BSpline(): any;
  AxeOfRevolution(): gp_Ax1;
  Direction(): gp_Dir;
  BasisCurve(): any;
  BasisSurface(): any;
  OffsetValue(): Standard_Real;
  delete(): void;
}

  export declare class GeomAdaptor_TransformedSurface_1 extends GeomAdaptor_TransformedSurface {
    constructor();
  }

  export declare class GeomAdaptor_TransformedSurface_2 extends GeomAdaptor_TransformedSurface {
    constructor(theSurface: any, theTrsf: gp_Trsf);
  }

  export declare class GeomAdaptor_TransformedSurface_3 extends GeomAdaptor_TransformedSurface {
    constructor(theSurface: any, theUFirst: Standard_Real, theULast: Standard_Real, theVFirst: Standard_Real, theVLast: Standard_Real, theTrsf: gp_Trsf, theTolU: Standard_Real, theTolV: Standard_Real);
  }

export declare class GeomAdaptor_Curve extends Adaptor3d_Curve {
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  ShallowCopy(): any;
  Reset(): void;
  Load_1(theCurve: any): void;
  Load_2(theCurve: any, theUFirst: Standard_Real, theULast: Standard_Real): void;
  Curve(): any;
  FirstParameter(): Standard_Real;
  LastParameter(): Standard_Real;
  Continuity(): GeomAbs_Shape;
  NbIntervals(S: GeomAbs_Shape): Standard_Integer;
  Intervals(T: NCollection_Array1<double>, S: GeomAbs_Shape): void;
  Trim(First: Standard_Real, Last: Standard_Real, Tol: Standard_Real): any;
  IsClosed(): Standard_Boolean;
  IsPeriodic(): Standard_Boolean;
  Period(): Standard_Real;
  Value(U: Standard_Real): gp_Pnt;
  D0(U: Standard_Real, P: gp_Pnt): void;
  D1(U: Standard_Real, P: gp_Pnt, V: gp_Vec): void;
  D2(U: Standard_Real, P: gp_Pnt, V1: gp_Vec, V2: gp_Vec): void;
  D3(U: Standard_Real, P: gp_Pnt, V1: gp_Vec, V2: gp_Vec, V3: gp_Vec): void;
  DN(U: Standard_Real, N: Standard_Integer): gp_Vec;
  Resolution(R3d: Standard_Real): Standard_Real;
  GetType(): GeomAbs_CurveType;
  Line(): gp_Lin;
  Circle(): gp_Circ;
  Ellipse(): gp_Elips;
  Hyperbola(): gp_Hypr;
  Parabola(): gp_Parab;
  Degree(): Standard_Integer;
  IsRational(): Standard_Boolean;
  NbPoles(): Standard_Integer;
  NbKnots(): Standard_Integer;
  Bezier(): any;
  BSpline(): any;
  OffsetCurve(): any;
  EvalD0(U: Standard_Real): gp_Pnt;
  EvalD1(U: Standard_Real): any;
  EvalD2(U: Standard_Real): any;
  EvalD3(U: Standard_Real): any;
  EvalDN(U: Standard_Real, N: Standard_Integer): gp_Vec;
  delete(): void;
}

  export declare class GeomAdaptor_Curve_1 extends GeomAdaptor_Curve {
    constructor();
  }

  export declare class GeomAdaptor_Curve_2 extends GeomAdaptor_Curve {
    constructor(theCurve: any);
  }

  export declare class GeomAdaptor_Curve_3 extends GeomAdaptor_Curve {
    constructor(theCurve: any, theUFirst: Standard_Real, theULast: Standard_Real);
  }

export declare class Adaptor3d_Surface extends Standard_Transient {
  constructor();
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  ShallowCopy(): any;
  FirstUParameter(): Standard_Real;
  LastUParameter(): Standard_Real;
  FirstVParameter(): Standard_Real;
  LastVParameter(): Standard_Real;
  UContinuity(): GeomAbs_Shape;
  VContinuity(): GeomAbs_Shape;
  NbUIntervals(S: GeomAbs_Shape): Standard_Integer;
  NbVIntervals(S: GeomAbs_Shape): Standard_Integer;
  UIntervals(T: NCollection_Array1<double>, S: GeomAbs_Shape): void;
  VIntervals(T: NCollection_Array1<double>, S: GeomAbs_Shape): void;
  UTrim(First: Standard_Real, Last: Standard_Real, Tol: Standard_Real): any;
  VTrim(First: Standard_Real, Last: Standard_Real, Tol: Standard_Real): any;
  IsUClosed(): Standard_Boolean;
  IsVClosed(): Standard_Boolean;
  IsUPeriodic(): Standard_Boolean;
  UPeriod(): Standard_Real;
  IsVPeriodic(): Standard_Boolean;
  VPeriod(): Standard_Real;
  Value(U: Standard_Real, V: Standard_Real): gp_Pnt;
  D0(U: Standard_Real, V: Standard_Real, P: gp_Pnt): void;
  D1(U: Standard_Real, V: Standard_Real, P: gp_Pnt, D1U: gp_Vec, D1V: gp_Vec): void;
  D2(U: Standard_Real, V: Standard_Real, P: gp_Pnt, D1U: gp_Vec, D1V: gp_Vec, D2U: gp_Vec, D2V: gp_Vec, D2UV: gp_Vec): void;
  D3(U: Standard_Real, V: Standard_Real, P: gp_Pnt, D1U: gp_Vec, D1V: gp_Vec, D2U: gp_Vec, D2V: gp_Vec, D2UV: gp_Vec, D3U: gp_Vec, D3V: gp_Vec, D3UUV: gp_Vec, D3UVV: gp_Vec): void;
  DN(U: Standard_Real, V: Standard_Real, Nu: Standard_Integer, Nv: Standard_Integer): gp_Vec;
  UResolution(R3d: Standard_Real): Standard_Real;
  VResolution(R3d: Standard_Real): Standard_Real;
  GetType(): GeomAbs_SurfaceType;
  Plane(): gp_Pln;
  Cylinder(): gp_Cylinder;
  Cone(): gp_Cone;
  Sphere(): gp_Sphere;
  Torus(): gp_Torus;
  UDegree(): Standard_Integer;
  NbUPoles(): Standard_Integer;
  VDegree(): Standard_Integer;
  NbVPoles(): Standard_Integer;
  NbUKnots(): Standard_Integer;
  NbVKnots(): Standard_Integer;
  IsURational(): Standard_Boolean;
  IsVRational(): Standard_Boolean;
  Bezier(): any;
  BSpline(): any;
  AxeOfRevolution(): gp_Ax1;
  Direction(): gp_Dir;
  BasisCurve(): any;
  BasisSurface(): any;
  OffsetValue(): Standard_Real;
  EvalD0(U: Standard_Real, V: Standard_Real): gp_Pnt;
  EvalD1(U: Standard_Real, V: Standard_Real): any;
  EvalD2(U: Standard_Real, V: Standard_Real): any;
  EvalD3(U: Standard_Real, V: Standard_Real): any;
  EvalDN(U: Standard_Real, V: Standard_Real, Nu: Standard_Integer, Nv: Standard_Integer): gp_Vec;
  delete(): void;
}

export declare class Adaptor3d_Curve extends Standard_Transient {
  constructor();
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  ShallowCopy(): any;
  FirstParameter(): Standard_Real;
  LastParameter(): Standard_Real;
  Continuity(): GeomAbs_Shape;
  NbIntervals(S: GeomAbs_Shape): Standard_Integer;
  Intervals(T: NCollection_Array1<double>, S: GeomAbs_Shape): void;
  Trim(First: Standard_Real, Last: Standard_Real, Tol: Standard_Real): any;
  IsClosed(): Standard_Boolean;
  IsPeriodic(): Standard_Boolean;
  Period(): Standard_Real;
  Value(U: Standard_Real): gp_Pnt;
  D0(U: Standard_Real, P: gp_Pnt): void;
  D1(U: Standard_Real, P: gp_Pnt, V: gp_Vec): void;
  D2(U: Standard_Real, P: gp_Pnt, V1: gp_Vec, V2: gp_Vec): void;
  D3(U: Standard_Real, P: gp_Pnt, V1: gp_Vec, V2: gp_Vec, V3: gp_Vec): void;
  DN(U: Standard_Real, N: Standard_Integer): gp_Vec;
  Resolution(R3d: Standard_Real): Standard_Real;
  GetType(): GeomAbs_CurveType;
  Line(): gp_Lin;
  Circle(): gp_Circ;
  Ellipse(): gp_Elips;
  Hyperbola(): gp_Hypr;
  Parabola(): gp_Parab;
  Degree(): Standard_Integer;
  IsRational(): Standard_Boolean;
  NbPoles(): Standard_Integer;
  NbKnots(): Standard_Integer;
  Bezier(): any;
  BSpline(): any;
  OffsetCurve(): any;
  EvalD0(U: Standard_Real): gp_Pnt;
  EvalD1(U: Standard_Real): any;
  EvalD2(U: Standard_Real): any;
  EvalD3(U: Standard_Real): any;
  EvalDN(U: Standard_Real, N: Standard_Integer): gp_Vec;
  delete(): void;
}

export declare class GProp_GProps {
  Add(Item: GProp_GProps, Density: Standard_Real): void;
  Mass(): Standard_Real;
  CentreOfMass(): gp_Pnt;
  MatrixOfInertia(): gp_Mat;
  StaticMoments(Ix: Standard_Real, Iy: Standard_Real, Iz: Standard_Real): void;
  MomentOfInertia(A: gp_Ax1): Standard_Real;
  PrincipalProperties(): GProp_PrincipalProps;
  RadiusOfGyration(A: gp_Ax1): Standard_Real;
  delete(): void;
}

  export declare class GProp_GProps_1 extends GProp_GProps {
    constructor();
  }

  export declare class GProp_GProps_2 extends GProp_GProps {
    constructor(SystemLocation: gp_Pnt);
  }

export declare class StdPrs_ToolTriangulatedShape extends BRepLib_ToolTriangulatedShape {
  constructor();
  static IsTriangulated(theShape: TopoDS_Shape): Standard_Boolean;
  static IsClosed(theShape: TopoDS_Shape): Standard_Boolean;
  static GetDeflection(theShape: TopoDS_Shape, theDrawer: any): Standard_Real;
  static IsTessellated(theShape: TopoDS_Shape, theDrawer: any): Standard_Boolean;
  static Tessellate(theShape: TopoDS_Shape, theDrawer: any): Standard_Boolean;
  static ClearOnOwnDeflectionChange(theShape: TopoDS_Shape, theDrawer: any, theToResetCoeff: Standard_Boolean): void;
  delete(): void;
}

export declare class GeomAPI_PointsToBSpline {
  Init_1(Points: NCollection_Array1<gp_Pnt>, DegMin: Standard_Integer, DegMax: Standard_Integer, Continuity: GeomAbs_Shape, Tol3D: Standard_Real): void;
  Init_2(Points: NCollection_Array1<gp_Pnt>, ParType: Approx_ParametrizationType, DegMin: Standard_Integer, DegMax: Standard_Integer, Continuity: GeomAbs_Shape, Tol3D: Standard_Real): void;
  Init_3(Points: NCollection_Array1<gp_Pnt>, Parameters: NCollection_Array1<double>, DegMin: Standard_Integer, DegMax: Standard_Integer, Continuity: GeomAbs_Shape, Tol3D: Standard_Real): void;
  Init_4(Points: NCollection_Array1<gp_Pnt>, Weight1: Standard_Real, Weight2: Standard_Real, Weight3: Standard_Real, DegMax: Standard_Integer, Continuity: GeomAbs_Shape, Tol3D: Standard_Real): void;
  Curve(): any;
  IsDone(): Standard_Boolean;
  delete(): void;
}

  export declare class GeomAPI_PointsToBSpline_1 extends GeomAPI_PointsToBSpline {
    constructor();
  }

  export declare class GeomAPI_PointsToBSpline_2 extends GeomAPI_PointsToBSpline {
    constructor(Points: NCollection_Array1<gp_Pnt>, DegMin: Standard_Integer, DegMax: Standard_Integer, Continuity: GeomAbs_Shape, Tol3D: Standard_Real);
  }

  export declare class GeomAPI_PointsToBSpline_3 extends GeomAPI_PointsToBSpline {
    constructor(Points: NCollection_Array1<gp_Pnt>, ParType: Approx_ParametrizationType, DegMin: Standard_Integer, DegMax: Standard_Integer, Continuity: GeomAbs_Shape, Tol3D: Standard_Real);
  }

  export declare class GeomAPI_PointsToBSpline_4 extends GeomAPI_PointsToBSpline {
    constructor(Points: NCollection_Array1<gp_Pnt>, Parameters: NCollection_Array1<double>, DegMin: Standard_Integer, DegMax: Standard_Integer, Continuity: GeomAbs_Shape, Tol3D: Standard_Real);
  }

  export declare class GeomAPI_PointsToBSpline_5 extends GeomAPI_PointsToBSpline {
    constructor(Points: NCollection_Array1<gp_Pnt>, Weight1: Standard_Real, Weight2: Standard_Real, Weight3: Standard_Real, DegMax: Standard_Integer, Continuity: GeomAbs_Shape, Tol3D: Standard_Real);
  }

export declare class ShapeUpgrade_UnifySameDomain extends Standard_Transient {
  Initialize(aShape: TopoDS_Shape, UnifyEdges: Standard_Boolean, UnifyFaces: Standard_Boolean, ConcatBSplines: Standard_Boolean): void;
  AllowInternalEdges(theValue: Standard_Boolean): void;
  KeepShape(theShape: TopoDS_Shape): void;
  KeepShapes(theShapes: NCollection_Map<TopoDS_Shape, TopTools_ShapeMapHasher>): void;
  SetSafeInputMode(theValue: Standard_Boolean): void;
  SetLinearTolerance(theValue: Standard_Real): void;
  SetAngularTolerance(theValue: Standard_Real): void;
  Build(): void;
  Shape(): TopoDS_Shape;
  History_1(): any;
  History_2(): any;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

  export declare class ShapeUpgrade_UnifySameDomain_1 extends ShapeUpgrade_UnifySameDomain {
    constructor();
  }

  export declare class ShapeUpgrade_UnifySameDomain_2 extends ShapeUpgrade_UnifySameDomain {
    constructor(aShape: TopoDS_Shape, UnifyEdges: Standard_Boolean, UnifyFaces: Standard_Boolean, ConcatBSplines: Standard_Boolean);
  }

export declare class BRepAlgoAPI_Section extends BRepAlgoAPI_BooleanOperation {
  Init1_1(S1: TopoDS_Shape): void;
  Init1_2(Pl: gp_Pln): void;
  Init1_3(Sf: any): void;
  Init2_1(S2: TopoDS_Shape): void;
  Init2_2(Pl: gp_Pln): void;
  Init2_3(Sf: any): void;
  Approximation(B: Standard_Boolean): void;
  ComputePCurveOn1(B: Standard_Boolean): void;
  ComputePCurveOn2(B: Standard_Boolean): void;
  Build(theRange: Message_ProgressRange): void;
  HasAncestorFaceOn1(E: TopoDS_Shape, F: TopoDS_Shape): Standard_Boolean;
  HasAncestorFaceOn2(E: TopoDS_Shape, F: TopoDS_Shape): Standard_Boolean;
  delete(): void;
}

  export declare class BRepAlgoAPI_Section_1 extends BRepAlgoAPI_Section {
    constructor();
  }

  export declare class BRepAlgoAPI_Section_2 extends BRepAlgoAPI_Section {
    constructor(PF: BOPAlgo_PaveFiller);
  }

  export declare class BRepAlgoAPI_Section_3 extends BRepAlgoAPI_Section {
    constructor(S1: TopoDS_Shape, S2: TopoDS_Shape, PerformNow: Standard_Boolean);
  }

  export declare class BRepAlgoAPI_Section_4 extends BRepAlgoAPI_Section {
    constructor(S1: TopoDS_Shape, S2: TopoDS_Shape, aDSF: BOPAlgo_PaveFiller, PerformNow: Standard_Boolean);
  }

  export declare class BRepAlgoAPI_Section_5 extends BRepAlgoAPI_Section {
    constructor(S1: TopoDS_Shape, Pl: gp_Pln, PerformNow: Standard_Boolean);
  }

  export declare class BRepAlgoAPI_Section_6 extends BRepAlgoAPI_Section {
    constructor(S1: TopoDS_Shape, Sf: any, PerformNow: Standard_Boolean);
  }

  export declare class BRepAlgoAPI_Section_7 extends BRepAlgoAPI_Section {
    constructor(Sf: any, S2: TopoDS_Shape, PerformNow: Standard_Boolean);
  }

  export declare class BRepAlgoAPI_Section_8 extends BRepAlgoAPI_Section {
    constructor(Sf1: any, Sf2: any, PerformNow: Standard_Boolean);
  }

export declare class BRepAlgoAPI_Fuse extends BRepAlgoAPI_BooleanOperation {
  delete(): void;
}

  export declare class BRepAlgoAPI_Fuse_1 extends BRepAlgoAPI_Fuse {
    constructor();
  }

  export declare class BRepAlgoAPI_Fuse_2 extends BRepAlgoAPI_Fuse {
    constructor(PF: BOPAlgo_PaveFiller);
  }

  export declare class BRepAlgoAPI_Fuse_3 extends BRepAlgoAPI_Fuse {
    constructor(S1: TopoDS_Shape, S2: TopoDS_Shape, theRange: Message_ProgressRange);
  }

  export declare class BRepAlgoAPI_Fuse_4 extends BRepAlgoAPI_Fuse {
    constructor(S1: TopoDS_Shape, S2: TopoDS_Shape, aDSF: BOPAlgo_PaveFiller, theRange: Message_ProgressRange);
  }

export declare class BRepAlgoAPI_Cut extends BRepAlgoAPI_BooleanOperation {
  delete(): void;
}

  export declare class BRepAlgoAPI_Cut_1 extends BRepAlgoAPI_Cut {
    constructor();
  }

  export declare class BRepAlgoAPI_Cut_2 extends BRepAlgoAPI_Cut {
    constructor(PF: BOPAlgo_PaveFiller);
  }

  export declare class BRepAlgoAPI_Cut_3 extends BRepAlgoAPI_Cut {
    constructor(S1: TopoDS_Shape, S2: TopoDS_Shape, theRange: Message_ProgressRange);
  }

  export declare class BRepAlgoAPI_Cut_4 extends BRepAlgoAPI_Cut {
    constructor(S1: TopoDS_Shape, S2: TopoDS_Shape, aDSF: BOPAlgo_PaveFiller, bFWD: Standard_Boolean, theRange: Message_ProgressRange);
  }

export declare class BRepAlgoAPI_BooleanOperation extends BRepAlgoAPI_BuilderAlgo {
  Shape1(): TopoDS_Shape;
  Shape2(): TopoDS_Shape;
  SetTools(theLS: NCollection_List<TopoDS_Shape>): void;
  Tools(): any;
  SetOperation(theBOP: BOPAlgo_Operation): void;
  Operation(): BOPAlgo_Operation;
  Build(theRange: Message_ProgressRange): void;
  delete(): void;
}

  export declare class BRepAlgoAPI_BooleanOperation_1 extends BRepAlgoAPI_BooleanOperation {
    constructor();
  }

  export declare class BRepAlgoAPI_BooleanOperation_2 extends BRepAlgoAPI_BooleanOperation {
    constructor(thePF: BOPAlgo_PaveFiller);
  }

export declare class BRepAlgoAPI_Common extends BRepAlgoAPI_BooleanOperation {
  delete(): void;
}

  export declare class BRepAlgoAPI_Common_1 extends BRepAlgoAPI_Common {
    constructor();
  }

  export declare class BRepAlgoAPI_Common_2 extends BRepAlgoAPI_Common {
    constructor(PF: BOPAlgo_PaveFiller);
  }

  export declare class BRepAlgoAPI_Common_3 extends BRepAlgoAPI_Common {
    constructor(S1: TopoDS_Shape, S2: TopoDS_Shape, theRange: Message_ProgressRange);
  }

  export declare class BRepAlgoAPI_Common_4 extends BRepAlgoAPI_Common {
    constructor(S1: TopoDS_Shape, S2: TopoDS_Shape, PF: BOPAlgo_PaveFiller, theRange: Message_ProgressRange);
  }

export declare class BRepOffsetAPI_MakeOffsetShape extends BRepBuilderAPI_MakeShape {
  constructor()
  PerformBySimple(theS: TopoDS_Shape, theOffsetValue: Standard_Real): void;
  PerformByJoin(S: TopoDS_Shape, Offset: Standard_Real, Tol: Standard_Real, Mode: BRepOffset_Mode, Intersection: Standard_Boolean, SelfInter: Standard_Boolean, Join: GeomAbs_JoinType, RemoveIntEdges: Standard_Boolean, theRange: Message_ProgressRange): void;
  MakeOffset(): BRepOffset_MakeOffset;
  Build(theRange: Message_ProgressRange): void;
  Generated(S: TopoDS_Shape): any;
  Modified(S: TopoDS_Shape): any;
  IsDeleted(S: TopoDS_Shape): Standard_Boolean;
  GetJoinType(): GeomAbs_JoinType;
  delete(): void;
}

export declare class BRepOffsetAPI_MakePipe extends BRepPrimAPI_MakeSweep {
  Pipe(): BRepFill_Pipe;
  Build(theRange: Message_ProgressRange): void;
  FirstShape(): TopoDS_Shape;
  LastShape(): TopoDS_Shape;
  Generated_1(S: TopoDS_Shape): any;
  Generated_2(SSpine: TopoDS_Shape, SProfile: TopoDS_Shape): TopoDS_Shape;
  ErrorOnSurface(): Standard_Real;
  delete(): void;
}

  export declare class BRepOffsetAPI_MakePipe_1 extends BRepOffsetAPI_MakePipe {
    constructor(Spine: TopoDS_Wire, Profile: TopoDS_Shape);
  }

  export declare class BRepOffsetAPI_MakePipe_2 extends BRepOffsetAPI_MakePipe {
    constructor(Spine: TopoDS_Wire, Profile: TopoDS_Shape, aMode: GeomFill_Trihedron, ForceApproxC1: Standard_Boolean);
  }

export declare class BRepOffsetAPI_ThruSections extends BRepBuilderAPI_MakeShape {
  constructor(isSolid: Standard_Boolean, ruled: Standard_Boolean, pres3d: Standard_Real)
  Init(isSolid: Standard_Boolean, ruled: Standard_Boolean, pres3d: Standard_Real): void;
  AddWire(wire: TopoDS_Wire): void;
  AddVertex(aVertex: TopoDS_Vertex): void;
  CheckCompatibility(check: Standard_Boolean): void;
  SetSmoothing(UseSmoothing: Standard_Boolean): void;
  SetParType(ParType: Approx_ParametrizationType): void;
  SetContinuity(C: GeomAbs_Shape): void;
  SetCriteriumWeight(W1: Standard_Real, W2: Standard_Real, W3: Standard_Real): void;
  SetMaxDegree(MaxDeg: Standard_Integer): void;
  ParType(): Approx_ParametrizationType;
  Continuity(): GeomAbs_Shape;
  MaxDegree(): Standard_Integer;
  UseSmoothing(): Standard_Boolean;
  CriteriumWeight(W1: Standard_Real, W2: Standard_Real, W3: Standard_Real): void;
  Build(theRange: Message_ProgressRange): void;
  FirstShape(): TopoDS_Shape;
  LastShape(): TopoDS_Shape;
  GeneratedFace(Edge: TopoDS_Shape): TopoDS_Shape;
  SetMutableInput(theIsMutableInput: Standard_Boolean): void;
  Generated(S: TopoDS_Shape): any;
  Wires(): any;
  IsMutableInput(): Standard_Boolean;
  GetStatus(): BRepFill_ThruSectionErrorStatus;
  delete(): void;
}

export declare class BRepOffsetAPI_MakeOffset extends BRepBuilderAPI_MakeShape {
  Init_1(Spine: TopoDS_Face, Join: GeomAbs_JoinType, IsOpenResult: Standard_Boolean): void;
  Init_2(Join: GeomAbs_JoinType, IsOpenResult: Standard_Boolean): void;
  SetApprox(ToApprox: Standard_Boolean): void;
  AddWire(Spine: TopoDS_Wire): void;
  Perform(Offset: Standard_Real, Alt: Standard_Real): void;
  Build(theRange: Message_ProgressRange): void;
  Generated(S: TopoDS_Shape): any;
  static ConvertFace(theFace: TopoDS_Face, theAngleTolerance: Standard_Real): TopoDS_Face;
  delete(): void;
}

  export declare class BRepOffsetAPI_MakeOffset_1 extends BRepOffsetAPI_MakeOffset {
    constructor();
  }

  export declare class BRepOffsetAPI_MakeOffset_2 extends BRepOffsetAPI_MakeOffset {
    constructor(Spine: TopoDS_Face, Join: GeomAbs_JoinType, IsOpenResult: Standard_Boolean);
  }

  export declare class BRepOffsetAPI_MakeOffset_3 extends BRepOffsetAPI_MakeOffset {
    constructor(Spine: TopoDS_Wire, Join: GeomAbs_JoinType, IsOpenResult: Standard_Boolean);
  }

export declare class BRepOffsetAPI_MakePipeShell extends BRepPrimAPI_MakeSweep {
  constructor(Spine: TopoDS_Wire)
  SetMode_1(IsFrenet: Standard_Boolean): void;
  SetDiscreteMode(): void;
  SetMode_2(Axe: gp_Ax2): void;
  SetMode_3(BiNormal: gp_Dir): void;
  SetMode_4(SpineSupport: TopoDS_Shape): Standard_Boolean;
  SetMode_5(AuxiliarySpine: TopoDS_Wire, CurvilinearEquivalence: Standard_Boolean, KeepContact: BRepFill_TypeOfContact): void;
  Add_1(Profile: TopoDS_Shape, WithContact: Standard_Boolean, WithCorrection: Standard_Boolean): void;
  Add_2(Profile: TopoDS_Shape, Location: TopoDS_Vertex, WithContact: Standard_Boolean, WithCorrection: Standard_Boolean): void;
  SetLaw_1(Profile: TopoDS_Shape, L: any, WithContact: Standard_Boolean, WithCorrection: Standard_Boolean): void;
  SetLaw_2(Profile: TopoDS_Shape, L: any, Location: TopoDS_Vertex, WithContact: Standard_Boolean, WithCorrection: Standard_Boolean): void;
  Delete(Profile: TopoDS_Shape): void;
  IsReady(): Standard_Boolean;
  GetStatus(): BRepBuilderAPI_PipeError;
  SetTolerance(Tol3d: Standard_Real, BoundTol: Standard_Real, TolAngular: Standard_Real): void;
  SetMaxDegree(NewMaxDegree: Standard_Integer): void;
  SetMaxSegments(NewMaxSegments: Standard_Integer): void;
  SetForceApproxC1(ForceApproxC1: Standard_Boolean): void;
  SetTransitionMode(Mode: BRepBuilderAPI_TransitionMode): void;
  Simulate(NumberOfSection: Standard_Integer, Result: NCollection_List<TopoDS_Shape>): void;
  Build(theRange: Message_ProgressRange): void;
  MakeSolid(): Standard_Boolean;
  FirstShape(): TopoDS_Shape;
  LastShape(): TopoDS_Shape;
  Generated(S: TopoDS_Shape): any;
  ErrorOnSurface(): Standard_Real;
  SetIsBuildHistory(theIsBuildHistory: Standard_Boolean): void;
  IsBuildHistory(): Standard_Boolean;
  Profiles(theProfiles: NCollection_List<TopoDS_Shape>): void;
  Spine(): TopoDS_Wire;
  delete(): void;
}

export declare type BRepOffset_Mode = {
  BRepOffset_Skin: {};
  BRepOffset_Pipe: {};
  BRepOffset_RectoVerso: {};
}

export declare class BRepMesh_DiscretRoot extends Standard_Transient {
  SetShape(theShape: TopoDS_Shape): void;
  Shape(): TopoDS_Shape;
  IsDone(): Standard_Boolean;
  Perform(theRange: Message_ProgressRange): void;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

export declare class BRepPrimAPI_MakeSphere extends BRepPrimAPI_MakeOneAxis {
  OneAxis(): C_f;
  Sphere(): BRepPrim_Sphere;
  delete(): void;
}

  export declare class BRepPrimAPI_MakeSphere_1 extends BRepPrimAPI_MakeSphere {
    constructor(R: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeSphere_2 extends BRepPrimAPI_MakeSphere {
    constructor(R: Standard_Real, angle: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeSphere_3 extends BRepPrimAPI_MakeSphere {
    constructor(R: Standard_Real, angle1: Standard_Real, angle2: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeSphere_4 extends BRepPrimAPI_MakeSphere {
    constructor(R: Standard_Real, angle1: Standard_Real, angle2: Standard_Real, angle3: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeSphere_5 extends BRepPrimAPI_MakeSphere {
    constructor(Center: gp_Pnt, R: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeSphere_6 extends BRepPrimAPI_MakeSphere {
    constructor(Center: gp_Pnt, R: Standard_Real, angle: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeSphere_7 extends BRepPrimAPI_MakeSphere {
    constructor(Center: gp_Pnt, R: Standard_Real, angle1: Standard_Real, angle2: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeSphere_8 extends BRepPrimAPI_MakeSphere {
    constructor(Center: gp_Pnt, R: Standard_Real, angle1: Standard_Real, angle2: Standard_Real, angle3: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeSphere_9 extends BRepPrimAPI_MakeSphere {
    constructor(Axis: gp_Ax2, R: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeSphere_10 extends BRepPrimAPI_MakeSphere {
    constructor(Axis: gp_Ax2, R: Standard_Real, angle: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeSphere_11 extends BRepPrimAPI_MakeSphere {
    constructor(Axis: gp_Ax2, R: Standard_Real, angle1: Standard_Real, angle2: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeSphere_12 extends BRepPrimAPI_MakeSphere {
    constructor(Axis: gp_Ax2, R: Standard_Real, angle1: Standard_Real, angle2: Standard_Real, angle3: Standard_Real);
  }

export declare class BRepPrimAPI_MakeCone extends BRepPrimAPI_MakeOneAxis {
  OneAxis(): C_f;
  Cone(): BRepPrim_Cone;
  delete(): void;
}

  export declare class BRepPrimAPI_MakeCone_1 extends BRepPrimAPI_MakeCone {
    constructor(R1: Standard_Real, R2: Standard_Real, H: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeCone_2 extends BRepPrimAPI_MakeCone {
    constructor(R1: Standard_Real, R2: Standard_Real, H: Standard_Real, angle: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeCone_3 extends BRepPrimAPI_MakeCone {
    constructor(Axes: gp_Ax2, R1: Standard_Real, R2: Standard_Real, H: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeCone_4 extends BRepPrimAPI_MakeCone {
    constructor(Axes: gp_Ax2, R1: Standard_Real, R2: Standard_Real, H: Standard_Real, angle: Standard_Real);
  }

export declare class BRepPrimAPI_MakeRevol extends BRepPrimAPI_MakeSweep {
  Revol(): BRepSweep_Revol;
  Build(theRange: Message_ProgressRange): void;
  FirstShape_1(): TopoDS_Shape;
  LastShape_1(): TopoDS_Shape;
  Generated(S: TopoDS_Shape): any;
  IsDeleted(S: TopoDS_Shape): Standard_Boolean;
  FirstShape_2(theShape: TopoDS_Shape): TopoDS_Shape;
  LastShape_2(theShape: TopoDS_Shape): TopoDS_Shape;
  HasDegenerated(): Standard_Boolean;
  Degenerated(): any;
  delete(): void;
}

  export declare class BRepPrimAPI_MakeRevol_1 extends BRepPrimAPI_MakeRevol {
    constructor(S: TopoDS_Shape, A: gp_Ax1, D: Standard_Real, Copy: Standard_Boolean);
  }

  export declare class BRepPrimAPI_MakeRevol_2 extends BRepPrimAPI_MakeRevol {
    constructor(S: TopoDS_Shape, A: gp_Ax1, Copy: Standard_Boolean);
  }

export declare class BRepPrimAPI_MakeWedge extends BRepBuilderAPI_MakeShape {
  Wedge(): BRepPrim_Wedge;
  Build(theRange: Message_ProgressRange): void;
  Shell(): TopoDS_Shell;
  Solid(): TopoDS_Solid;
  delete(): void;
}

  export declare class BRepPrimAPI_MakeWedge_1 extends BRepPrimAPI_MakeWedge {
    constructor(dx: Standard_Real, dy: Standard_Real, dz: Standard_Real, ltx: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeWedge_2 extends BRepPrimAPI_MakeWedge {
    constructor(Axes: gp_Ax2, dx: Standard_Real, dy: Standard_Real, dz: Standard_Real, ltx: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeWedge_3 extends BRepPrimAPI_MakeWedge {
    constructor(dx: Standard_Real, dy: Standard_Real, dz: Standard_Real, xmin: Standard_Real, zmin: Standard_Real, xmax: Standard_Real, zmax: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeWedge_4 extends BRepPrimAPI_MakeWedge {
    constructor(Axes: gp_Ax2, dx: Standard_Real, dy: Standard_Real, dz: Standard_Real, xmin: Standard_Real, zmin: Standard_Real, xmax: Standard_Real, zmax: Standard_Real);
  }

export declare class BRepPrimAPI_MakeSweep extends BRepBuilderAPI_MakeShape {
  FirstShape(): TopoDS_Shape;
  LastShape(): TopoDS_Shape;
  delete(): void;
}

export declare class BRepPrimAPI_MakeTorus extends BRepPrimAPI_MakeOneAxis {
  OneAxis(): C_f;
  Torus(): BRepPrim_Torus;
  delete(): void;
}

  export declare class BRepPrimAPI_MakeTorus_1 extends BRepPrimAPI_MakeTorus {
    constructor(R1: Standard_Real, R2: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeTorus_2 extends BRepPrimAPI_MakeTorus {
    constructor(R1: Standard_Real, R2: Standard_Real, angle: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeTorus_3 extends BRepPrimAPI_MakeTorus {
    constructor(R1: Standard_Real, R2: Standard_Real, angle1: Standard_Real, angle2: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeTorus_4 extends BRepPrimAPI_MakeTorus {
    constructor(R1: Standard_Real, R2: Standard_Real, angle1: Standard_Real, angle2: Standard_Real, angle: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeTorus_5 extends BRepPrimAPI_MakeTorus {
    constructor(Axes: gp_Ax2, R1: Standard_Real, R2: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeTorus_6 extends BRepPrimAPI_MakeTorus {
    constructor(Axes: gp_Ax2, R1: Standard_Real, R2: Standard_Real, angle: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeTorus_7 extends BRepPrimAPI_MakeTorus {
    constructor(Axes: gp_Ax2, R1: Standard_Real, R2: Standard_Real, angle1: Standard_Real, angle2: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeTorus_8 extends BRepPrimAPI_MakeTorus {
    constructor(Axes: gp_Ax2, R1: Standard_Real, R2: Standard_Real, angle1: Standard_Real, angle2: Standard_Real, angle: Standard_Real);
  }

export declare class BRepPrimAPI_MakeOneAxis extends BRepBuilderAPI_MakeShape {
  OneAxis(): C_f;
  Build(theRange: Message_ProgressRange): void;
  Face(): TopoDS_Face;
  Shell(): TopoDS_Shell;
  Solid(): TopoDS_Solid;
  delete(): void;
}

export declare class BRepPrimAPI_MakeCylinder extends BRepPrimAPI_MakeOneAxis {
  OneAxis(): C_f;
  Cylinder(): BRepPrim_Cylinder;
  delete(): void;
}

  export declare class BRepPrimAPI_MakeCylinder_1 extends BRepPrimAPI_MakeCylinder {
    constructor(R: Standard_Real, H: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeCylinder_2 extends BRepPrimAPI_MakeCylinder {
    constructor(R: Standard_Real, H: Standard_Real, Angle: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeCylinder_3 extends BRepPrimAPI_MakeCylinder {
    constructor(Axes: gp_Ax2, R: Standard_Real, H: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeCylinder_4 extends BRepPrimAPI_MakeCylinder {
    constructor(Axes: gp_Ax2, R: Standard_Real, H: Standard_Real, Angle: Standard_Real);
  }

export declare class BRepPrimAPI_MakeBox extends BRepBuilderAPI_MakeShape {
  Init_1(theDX: Standard_Real, theDY: Standard_Real, theDZ: Standard_Real): void;
  Init_2(thePnt: gp_Pnt, theDX: Standard_Real, theDY: Standard_Real, theDZ: Standard_Real): void;
  Init_3(thePnt1: gp_Pnt, thePnt2: gp_Pnt): void;
  Init_4(theAxes: gp_Ax2, theDX: Standard_Real, theDY: Standard_Real, theDZ: Standard_Real): void;
  Wedge(): BRepPrim_Wedge;
  Build(theRange: Message_ProgressRange): void;
  Shell(): TopoDS_Shell;
  Solid(): TopoDS_Solid;
  BottomFace(): TopoDS_Face;
  BackFace(): TopoDS_Face;
  FrontFace(): TopoDS_Face;
  LeftFace(): TopoDS_Face;
  RightFace(): TopoDS_Face;
  TopFace(): TopoDS_Face;
  delete(): void;
}

  export declare class BRepPrimAPI_MakeBox_1 extends BRepPrimAPI_MakeBox {
    constructor();
  }

  export declare class BRepPrimAPI_MakeBox_2 extends BRepPrimAPI_MakeBox {
    constructor(dx: Standard_Real, dy: Standard_Real, dz: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeBox_3 extends BRepPrimAPI_MakeBox {
    constructor(P: gp_Pnt, dx: Standard_Real, dy: Standard_Real, dz: Standard_Real);
  }

  export declare class BRepPrimAPI_MakeBox_4 extends BRepPrimAPI_MakeBox {
    constructor(P1: gp_Pnt, P2: gp_Pnt);
  }

  export declare class BRepPrimAPI_MakeBox_5 extends BRepPrimAPI_MakeBox {
    constructor(Axes: gp_Ax2, dx: Standard_Real, dy: Standard_Real, dz: Standard_Real);
  }

export declare class BRepPrimAPI_MakePrism extends BRepPrimAPI_MakeSweep {
  Prism(): BRepSweep_Prism;
  Build(theRange: Message_ProgressRange): void;
  FirstShape_1(): TopoDS_Shape;
  LastShape_1(): TopoDS_Shape;
  Generated(S: TopoDS_Shape): any;
  IsDeleted(S: TopoDS_Shape): Standard_Boolean;
  FirstShape_2(theShape: TopoDS_Shape): TopoDS_Shape;
  LastShape_2(theShape: TopoDS_Shape): TopoDS_Shape;
  delete(): void;
}

  export declare class BRepPrimAPI_MakePrism_1 extends BRepPrimAPI_MakePrism {
    constructor(S: TopoDS_Shape, V: gp_Vec, Copy: Standard_Boolean, Canonize: Standard_Boolean);
  }

  export declare class BRepPrimAPI_MakePrism_2 extends BRepPrimAPI_MakePrism {
    constructor(S: TopoDS_Shape, D: gp_Dir, Inf: Standard_Boolean, Copy: Standard_Boolean, Canonize: Standard_Boolean);
  }

export declare type BRepFill_TypeOfContact = {
  BRepFill_NoContact: {};
  BRepFill_Contact: {};
  BRepFill_ContactOnBorder: {};
}

export declare type ChFi3d_FilletShape = {
  ChFi3d_Rational: {};
  ChFi3d_QuasiAngular: {};
  ChFi3d_Polynomial: {};
}

export declare class BRepFilletAPI_MakeChamfer extends BRepFilletAPI_LocalOperation {
  constructor(S: TopoDS_Shape)
  Add_1(E: TopoDS_Edge): void;
  Add_2(Dis: Standard_Real, E: TopoDS_Edge): void;
  SetDist(Dis: Standard_Real, IC: Standard_Integer, F: TopoDS_Face): void;
  GetDist(IC: Standard_Integer, Dis: Standard_Real): void;
  Add_3(Dis1: Standard_Real, Dis2: Standard_Real, E: TopoDS_Edge, F: TopoDS_Face): void;
  SetDists(Dis1: Standard_Real, Dis2: Standard_Real, IC: Standard_Integer, F: TopoDS_Face): void;
  Dists(IC: Standard_Integer, Dis1: Standard_Real, Dis2: Standard_Real): void;
  AddDA(Dis: Standard_Real, Angle: Standard_Real, E: TopoDS_Edge, F: TopoDS_Face): void;
  SetDistAngle(Dis: Standard_Real, Angle: Standard_Real, IC: Standard_Integer, F: TopoDS_Face): void;
  GetDistAngle(IC: Standard_Integer, Dis: Standard_Real, Angle: Standard_Real): void;
  SetMode(theMode: ChFiDS_ChamfMode): void;
  IsSymetric(IC: Standard_Integer): Standard_Boolean;
  IsTwoDistances(IC: Standard_Integer): Standard_Boolean;
  IsDistanceAngle(IC: Standard_Integer): Standard_Boolean;
  ResetContour(IC: Standard_Integer): void;
  NbContours(): Standard_Integer;
  Contour(E: TopoDS_Edge): Standard_Integer;
  NbEdges(I: Standard_Integer): Standard_Integer;
  Edge(I: Standard_Integer, J: Standard_Integer): TopoDS_Edge;
  Remove(E: TopoDS_Edge): void;
  Length(IC: Standard_Integer): Standard_Real;
  FirstVertex(IC: Standard_Integer): TopoDS_Vertex;
  LastVertex(IC: Standard_Integer): TopoDS_Vertex;
  Abscissa(IC: Standard_Integer, V: TopoDS_Vertex): Standard_Real;
  RelativeAbscissa(IC: Standard_Integer, V: TopoDS_Vertex): Standard_Real;
  ClosedAndTangent(IC: Standard_Integer): Standard_Boolean;
  Closed(IC: Standard_Integer): Standard_Boolean;
  Build(theRange: Message_ProgressRange): void;
  Reset(): void;
  Builder(): any;
  Generated(EorV: TopoDS_Shape): any;
  Modified(F: TopoDS_Shape): any;
  IsDeleted(F: TopoDS_Shape): Standard_Boolean;
  Simulate(IC: Standard_Integer): void;
  NbSurf(IC: Standard_Integer): Standard_Integer;
  Sect(IC: Standard_Integer, IS: Standard_Integer): any;
  delete(): void;
}

export declare class BRepFilletAPI_MakeFillet extends BRepFilletAPI_LocalOperation {
  constructor(S: TopoDS_Shape, FShape: ChFi3d_FilletShape)
  SetParams(Tang: Standard_Real, Tesp: Standard_Real, T2d: Standard_Real, TApp3d: Standard_Real, TolApp2d: Standard_Real, Fleche: Standard_Real): void;
  SetContinuity(InternalContinuity: GeomAbs_Shape, AngularTolerance: Standard_Real): void;
  Add_1(E: TopoDS_Edge): void;
  Add_2(Radius: Standard_Real, E: TopoDS_Edge): void;
  Add_3(R1: Standard_Real, R2: Standard_Real, E: TopoDS_Edge): void;
  Add_4(L: any, E: TopoDS_Edge): void;
  Add_5(UandR: NCollection_Array1<gp_Pnt2d>, E: TopoDS_Edge): void;
  SetRadius_1(Radius: Standard_Real, IC: Standard_Integer, IinC: Standard_Integer): void;
  SetRadius_2(R1: Standard_Real, R2: Standard_Real, IC: Standard_Integer, IinC: Standard_Integer): void;
  SetRadius_3(L: any, IC: Standard_Integer, IinC: Standard_Integer): void;
  SetRadius_4(UandR: NCollection_Array1<gp_Pnt2d>, IC: Standard_Integer, IinC: Standard_Integer): void;
  ResetContour(IC: Standard_Integer): void;
  IsConstant_1(IC: Standard_Integer): Standard_Boolean;
  Radius_1(IC: Standard_Integer): Standard_Real;
  IsConstant_2(IC: Standard_Integer, E: TopoDS_Edge): Standard_Boolean;
  Radius_2(IC: Standard_Integer, E: TopoDS_Edge): Standard_Real;
  SetRadius_5(Radius: Standard_Real, IC: Standard_Integer, E: TopoDS_Edge): void;
  SetRadius_6(Radius: Standard_Real, IC: Standard_Integer, V: TopoDS_Vertex): void;
  GetBounds(IC: Standard_Integer, E: TopoDS_Edge, F: Standard_Real, L: Standard_Real): Standard_Boolean;
  GetLaw(IC: Standard_Integer, E: TopoDS_Edge): any;
  SetLaw(IC: Standard_Integer, E: TopoDS_Edge, L: any): void;
  SetFilletShape(FShape: ChFi3d_FilletShape): void;
  GetFilletShape(): ChFi3d_FilletShape;
  NbContours(): Standard_Integer;
  Contour(E: TopoDS_Edge): Standard_Integer;
  NbEdges(I: Standard_Integer): Standard_Integer;
  Edge(I: Standard_Integer, J: Standard_Integer): TopoDS_Edge;
  Remove(E: TopoDS_Edge): void;
  Length(IC: Standard_Integer): Standard_Real;
  FirstVertex(IC: Standard_Integer): TopoDS_Vertex;
  LastVertex(IC: Standard_Integer): TopoDS_Vertex;
  Abscissa(IC: Standard_Integer, V: TopoDS_Vertex): Standard_Real;
  RelativeAbscissa(IC: Standard_Integer, V: TopoDS_Vertex): Standard_Real;
  ClosedAndTangent(IC: Standard_Integer): Standard_Boolean;
  Closed(IC: Standard_Integer): Standard_Boolean;
  Build(theRange: Message_ProgressRange): void;
  Reset(): void;
  Builder(): any;
  Generated(EorV: TopoDS_Shape): any;
  Modified(F: TopoDS_Shape): any;
  IsDeleted(F: TopoDS_Shape): Standard_Boolean;
  NbSurfaces(): Standard_Integer;
  NewFaces(I: Standard_Integer): any;
  Simulate(IC: Standard_Integer): void;
  NbSurf(IC: Standard_Integer): Standard_Integer;
  Sect(IC: Standard_Integer, IS: Standard_Integer): any;
  NbFaultyContours(): Standard_Integer;
  FaultyContour(I: Standard_Integer): Standard_Integer;
  NbComputedSurfaces(IC: Standard_Integer): Standard_Integer;
  ComputedSurface(IC: Standard_Integer, IS: Standard_Integer): any;
  NbFaultyVertices(): Standard_Integer;
  FaultyVertex(IV: Standard_Integer): TopoDS_Vertex;
  HasResult(): Standard_Boolean;
  BadShape(): TopoDS_Shape;
  StripeStatus(IC: Standard_Integer): ChFiDS_ErrorStatus;
  delete(): void;
}

export declare class BRepFilletAPI_LocalOperation extends BRepBuilderAPI_MakeShape {
  Add(E: TopoDS_Edge): void;
  ResetContour(IC: Standard_Integer): void;
  NbContours(): Standard_Integer;
  Contour(E: TopoDS_Edge): Standard_Integer;
  NbEdges(I: Standard_Integer): Standard_Integer;
  Edge(I: Standard_Integer, J: Standard_Integer): TopoDS_Edge;
  Remove(E: TopoDS_Edge): void;
  Length(IC: Standard_Integer): Standard_Real;
  FirstVertex(IC: Standard_Integer): TopoDS_Vertex;
  LastVertex(IC: Standard_Integer): TopoDS_Vertex;
  Abscissa(IC: Standard_Integer, V: TopoDS_Vertex): Standard_Real;
  RelativeAbscissa(IC: Standard_Integer, V: TopoDS_Vertex): Standard_Real;
  ClosedAndTangent(IC: Standard_Integer): Standard_Boolean;
  Closed(IC: Standard_Integer): Standard_Boolean;
  Reset(): void;
  Simulate(IC: Standard_Integer): void;
  NbSurf(IC: Standard_Integer): Standard_Integer;
  Sect(IC: Standard_Integer, IS: Standard_Integer): any;
  delete(): void;
}

export declare class BRepFilletAPI_MakeFillet2d extends BRepBuilderAPI_MakeShape {
  Init_1(F: TopoDS_Face): void;
  Init_2(RefFace: TopoDS_Face, ModFace: TopoDS_Face): void;
  AddFillet(V: TopoDS_Vertex, Radius: Standard_Real): TopoDS_Edge;
  ModifyFillet(Fillet: TopoDS_Edge, Radius: Standard_Real): TopoDS_Edge;
  RemoveFillet(Fillet: TopoDS_Edge): TopoDS_Vertex;
  AddChamfer_1(E1: TopoDS_Edge, E2: TopoDS_Edge, D1: Standard_Real, D2: Standard_Real): TopoDS_Edge;
  AddChamfer_2(E: TopoDS_Edge, V: TopoDS_Vertex, D: Standard_Real, Ang: Standard_Real): TopoDS_Edge;
  ModifyChamfer_1(Chamfer: TopoDS_Edge, E1: TopoDS_Edge, E2: TopoDS_Edge, D1: Standard_Real, D2: Standard_Real): TopoDS_Edge;
  ModifyChamfer_2(Chamfer: TopoDS_Edge, E: TopoDS_Edge, D: Standard_Real, Ang: Standard_Real): TopoDS_Edge;
  RemoveChamfer(Chamfer: TopoDS_Edge): TopoDS_Vertex;
  IsModified(E: TopoDS_Edge): Standard_Boolean;
  FilletEdges(): any;
  NbFillet(): Standard_Integer;
  ChamferEdges(): any;
  NbChamfer(): Standard_Integer;
  Modified(S: TopoDS_Shape): any;
  NbCurves(): Standard_Integer;
  NewEdges(I: Standard_Integer): any;
  HasDescendant(E: TopoDS_Edge): Standard_Boolean;
  DescendantEdge(E: TopoDS_Edge): TopoDS_Edge;
  BasisEdge(E: TopoDS_Edge): TopoDS_Edge;
  Status(): ChFi2d_ConstructionError;
  Build(theRange: Message_ProgressRange): void;
  delete(): void;
}

  export declare class BRepFilletAPI_MakeFillet2d_1 extends BRepFilletAPI_MakeFillet2d {
    constructor();
  }

  export declare class BRepFilletAPI_MakeFillet2d_2 extends BRepFilletAPI_MakeFillet2d {
    constructor(F: TopoDS_Face);
  }

export declare class BRepGProp {
  constructor();
  static LinearProperties(S: TopoDS_Shape, LProps: GProp_GProps, SkipShared: Standard_Boolean, UseTriangulation: Standard_Boolean): void;
  static SurfaceProperties_1(S: TopoDS_Shape, SProps: GProp_GProps, SkipShared: Standard_Boolean, UseTriangulation: Standard_Boolean): void;
  static SurfaceProperties_2(S: TopoDS_Shape, SProps: GProp_GProps, Eps: Standard_Real, SkipShared: Standard_Boolean): Standard_Real;
  static VolumeProperties_1(S: TopoDS_Shape, VProps: GProp_GProps, OnlyClosed: Standard_Boolean, SkipShared: Standard_Boolean, UseTriangulation: Standard_Boolean): void;
  static VolumeProperties_2(S: TopoDS_Shape, VProps: GProp_GProps, Eps: Standard_Real, OnlyClosed: Standard_Boolean, SkipShared: Standard_Boolean): Standard_Real;
  static VolumePropertiesGK_1(S: TopoDS_Shape, VProps: GProp_GProps, Eps: Standard_Real, OnlyClosed: Standard_Boolean, IsUseSpan: Standard_Boolean, CGFlag: Standard_Boolean, IFlag: Standard_Boolean, SkipShared: Standard_Boolean): Standard_Real;
  static VolumePropertiesGK_2(S: TopoDS_Shape, VProps: GProp_GProps, thePln: gp_Pln, Eps: Standard_Real, OnlyClosed: Standard_Boolean, IsUseSpan: Standard_Boolean, CGFlag: Standard_Boolean, IFlag: Standard_Boolean, SkipShared: Standard_Boolean): Standard_Real;
  delete(): void;
}

export declare class BRepBuilderAPI_Transform extends BRepBuilderAPI_ModifyShape {
  Perform(theShape: TopoDS_Shape, theCopyGeom: Standard_Boolean, theCopyMesh: Standard_Boolean): void;
  ModifiedShape(S: TopoDS_Shape): TopoDS_Shape;
  Modified(S: TopoDS_Shape): any;
  delete(): void;
}

  export declare class BRepBuilderAPI_Transform_1 extends BRepBuilderAPI_Transform {
    constructor(T: gp_Trsf);
  }

  export declare class BRepBuilderAPI_Transform_2 extends BRepBuilderAPI_Transform {
    constructor(theShape: TopoDS_Shape, theTrsf: gp_Trsf, theCopyGeom: Standard_Boolean, theCopyMesh: Standard_Boolean);
  }

export declare class BRepBuilderAPI_MakeEdge extends BRepBuilderAPI_MakeShape {
  Init_1(C: any): void;
  Init_2(C: any, p1: Standard_Real, p2: Standard_Real): void;
  Init_3(C: any, P1: gp_Pnt, P2: gp_Pnt): void;
  Init_4(C: any, V1: TopoDS_Vertex, V2: TopoDS_Vertex): void;
  Init_5(C: any, P1: gp_Pnt, P2: gp_Pnt, p1: Standard_Real, p2: Standard_Real): void;
  Init_6(C: any, V1: TopoDS_Vertex, V2: TopoDS_Vertex, p1: Standard_Real, p2: Standard_Real): void;
  Init_7(C: any, S: any): void;
  Init_8(C: any, S: any, p1: Standard_Real, p2: Standard_Real): void;
  Init_9(C: any, S: any, P1: gp_Pnt, P2: gp_Pnt): void;
  Init_10(C: any, S: any, V1: TopoDS_Vertex, V2: TopoDS_Vertex): void;
  Init_11(C: any, S: any, P1: gp_Pnt, P2: gp_Pnt, p1: Standard_Real, p2: Standard_Real): void;
  Init_12(C: any, S: any, V1: TopoDS_Vertex, V2: TopoDS_Vertex, p1: Standard_Real, p2: Standard_Real): void;
  IsDone(): Standard_Boolean;
  Error(): BRepBuilderAPI_EdgeError;
  Edge(): TopoDS_Edge;
  Vertex1(): TopoDS_Vertex;
  Vertex2(): TopoDS_Vertex;
  delete(): void;
}

  export declare class BRepBuilderAPI_MakeEdge_1 extends BRepBuilderAPI_MakeEdge {
    constructor();
  }

  export declare class BRepBuilderAPI_MakeEdge_2 extends BRepBuilderAPI_MakeEdge {
    constructor(V1: TopoDS_Vertex, V2: TopoDS_Vertex);
  }

  export declare class BRepBuilderAPI_MakeEdge_3 extends BRepBuilderAPI_MakeEdge {
    constructor(P1: gp_Pnt, P2: gp_Pnt);
  }

  export declare class BRepBuilderAPI_MakeEdge_4 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Lin);
  }

  export declare class BRepBuilderAPI_MakeEdge_5 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Lin, p1: Standard_Real, p2: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeEdge_6 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Lin, P1: gp_Pnt, P2: gp_Pnt);
  }

  export declare class BRepBuilderAPI_MakeEdge_7 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Lin, V1: TopoDS_Vertex, V2: TopoDS_Vertex);
  }

  export declare class BRepBuilderAPI_MakeEdge_8 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Circ);
  }

  export declare class BRepBuilderAPI_MakeEdge_9 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Circ, p1: Standard_Real, p2: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeEdge_10 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Circ, P1: gp_Pnt, P2: gp_Pnt);
  }

  export declare class BRepBuilderAPI_MakeEdge_11 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Circ, V1: TopoDS_Vertex, V2: TopoDS_Vertex);
  }

  export declare class BRepBuilderAPI_MakeEdge_12 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Elips);
  }

  export declare class BRepBuilderAPI_MakeEdge_13 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Elips, p1: Standard_Real, p2: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeEdge_14 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Elips, P1: gp_Pnt, P2: gp_Pnt);
  }

  export declare class BRepBuilderAPI_MakeEdge_15 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Elips, V1: TopoDS_Vertex, V2: TopoDS_Vertex);
  }

  export declare class BRepBuilderAPI_MakeEdge_16 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Hypr);
  }

  export declare class BRepBuilderAPI_MakeEdge_17 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Hypr, p1: Standard_Real, p2: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeEdge_18 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Hypr, P1: gp_Pnt, P2: gp_Pnt);
  }

  export declare class BRepBuilderAPI_MakeEdge_19 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Hypr, V1: TopoDS_Vertex, V2: TopoDS_Vertex);
  }

  export declare class BRepBuilderAPI_MakeEdge_20 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Parab);
  }

  export declare class BRepBuilderAPI_MakeEdge_21 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Parab, p1: Standard_Real, p2: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeEdge_22 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Parab, P1: gp_Pnt, P2: gp_Pnt);
  }

  export declare class BRepBuilderAPI_MakeEdge_23 extends BRepBuilderAPI_MakeEdge {
    constructor(L: gp_Parab, V1: TopoDS_Vertex, V2: TopoDS_Vertex);
  }

  export declare class BRepBuilderAPI_MakeEdge_24 extends BRepBuilderAPI_MakeEdge {
    constructor(L: any);
  }

  export declare class BRepBuilderAPI_MakeEdge_25 extends BRepBuilderAPI_MakeEdge {
    constructor(L: any, p1: Standard_Real, p2: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeEdge_26 extends BRepBuilderAPI_MakeEdge {
    constructor(L: any, P1: gp_Pnt, P2: gp_Pnt);
  }

  export declare class BRepBuilderAPI_MakeEdge_27 extends BRepBuilderAPI_MakeEdge {
    constructor(L: any, V1: TopoDS_Vertex, V2: TopoDS_Vertex);
  }

  export declare class BRepBuilderAPI_MakeEdge_28 extends BRepBuilderAPI_MakeEdge {
    constructor(L: any, P1: gp_Pnt, P2: gp_Pnt, p1: Standard_Real, p2: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeEdge_29 extends BRepBuilderAPI_MakeEdge {
    constructor(L: any, V1: TopoDS_Vertex, V2: TopoDS_Vertex, p1: Standard_Real, p2: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeEdge_30 extends BRepBuilderAPI_MakeEdge {
    constructor(L: any, S: any);
  }

  export declare class BRepBuilderAPI_MakeEdge_31 extends BRepBuilderAPI_MakeEdge {
    constructor(L: any, S: any, p1: Standard_Real, p2: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeEdge_32 extends BRepBuilderAPI_MakeEdge {
    constructor(L: any, S: any, P1: gp_Pnt, P2: gp_Pnt);
  }

  export declare class BRepBuilderAPI_MakeEdge_33 extends BRepBuilderAPI_MakeEdge {
    constructor(L: any, S: any, V1: TopoDS_Vertex, V2: TopoDS_Vertex);
  }

  export declare class BRepBuilderAPI_MakeEdge_34 extends BRepBuilderAPI_MakeEdge {
    constructor(L: any, S: any, P1: gp_Pnt, P2: gp_Pnt, p1: Standard_Real, p2: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeEdge_35 extends BRepBuilderAPI_MakeEdge {
    constructor(L: any, S: any, V1: TopoDS_Vertex, V2: TopoDS_Vertex, p1: Standard_Real, p2: Standard_Real);
  }

export declare class BRepBuilderAPI_Command {
  IsDone(): Standard_Boolean;
  Check(): void;
  delete(): void;
}

export declare class BRepBuilderAPI_ModifyShape extends BRepBuilderAPI_MakeShape {
  Modified(S: TopoDS_Shape): any;
  ModifiedShape(S: TopoDS_Shape): TopoDS_Shape;
  delete(): void;
}

export declare class BRepBuilderAPI_MakeShape extends BRepBuilderAPI_Command {
  Build(theRange: Message_ProgressRange): void;
  Shape(): TopoDS_Shape;
  Generated(S: TopoDS_Shape): any;
  Modified(S: TopoDS_Shape): any;
  IsDeleted(S: TopoDS_Shape): Standard_Boolean;
  delete(): void;
}

export declare class BRepBuilderAPI_Sewing extends Standard_Transient {
  constructor(tolerance: Standard_Real, option1: Standard_Boolean, option2: Standard_Boolean, option3: Standard_Boolean, option4: Standard_Boolean)
  Init(tolerance: Standard_Real, option1: Standard_Boolean, option2: Standard_Boolean, option3: Standard_Boolean, option4: Standard_Boolean): void;
  Load(shape: TopoDS_Shape): void;
  Add(shape: TopoDS_Shape): void;
  Perform(theProgress: Message_ProgressRange): void;
  SewedShape(): TopoDS_Shape;
  SetContext(theContext: any): void;
  GetContext(): any;
  NbFreeEdges(): Standard_Integer;
  FreeEdge(index: Standard_Integer): TopoDS_Edge;
  NbMultipleEdges(): Standard_Integer;
  MultipleEdge(index: Standard_Integer): TopoDS_Edge;
  NbContigousEdges(): Standard_Integer;
  ContigousEdge(index: Standard_Integer): TopoDS_Edge;
  ContigousEdgeCouple(index: Standard_Integer): any;
  IsSectionBound(section: TopoDS_Edge): Standard_Boolean;
  SectionToBoundary(section: TopoDS_Edge): TopoDS_Edge;
  NbDegeneratedShapes(): Standard_Integer;
  DegeneratedShape(index: Standard_Integer): TopoDS_Shape;
  IsDegenerated(shape: TopoDS_Shape): Standard_Boolean;
  IsModified(shape: TopoDS_Shape): Standard_Boolean;
  Modified(shape: TopoDS_Shape): TopoDS_Shape;
  IsModifiedSubShape(shape: TopoDS_Shape): Standard_Boolean;
  ModifiedSubShape(shape: TopoDS_Shape): TopoDS_Shape;
  Dump(): void;
  NbDeletedFaces(): Standard_Integer;
  DeletedFace(index: Standard_Integer): TopoDS_Face;
  WhichFace(theEdg: TopoDS_Edge, index: Standard_Integer): TopoDS_Face;
  SameParameterMode(): Standard_Boolean;
  SetSameParameterMode(SameParameterMode: Standard_Boolean): void;
  Tolerance(): Standard_Real;
  SetTolerance(theToler: Standard_Real): void;
  MinTolerance(): Standard_Real;
  SetMinTolerance(theMinToler: Standard_Real): void;
  MaxTolerance(): Standard_Real;
  SetMaxTolerance(theMaxToler: Standard_Real): void;
  FaceMode(): Standard_Boolean;
  SetFaceMode(theFaceMode: Standard_Boolean): void;
  FloatingEdgesMode(): Standard_Boolean;
  SetFloatingEdgesMode(theFloatingEdgesMode: Standard_Boolean): void;
  LocalTolerancesMode(): Standard_Boolean;
  SetLocalTolerancesMode(theLocalTolerancesMode: Standard_Boolean): void;
  SetNonManifoldMode(theNonManifoldMode: Standard_Boolean): void;
  NonManifoldMode(): Standard_Boolean;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

export declare class BRepBuilderAPI_MakeSolid extends BRepBuilderAPI_MakeShape {
  Add(S: TopoDS_Shell): void;
  IsDone(): Standard_Boolean;
  Solid(): TopoDS_Solid;
  IsDeleted(S: TopoDS_Shape): Standard_Boolean;
  delete(): void;
}

  export declare class BRepBuilderAPI_MakeSolid_1 extends BRepBuilderAPI_MakeSolid {
    constructor();
  }

  export declare class BRepBuilderAPI_MakeSolid_2 extends BRepBuilderAPI_MakeSolid {
    constructor(S: TopoDS_CompSolid);
  }

  export declare class BRepBuilderAPI_MakeSolid_3 extends BRepBuilderAPI_MakeSolid {
    constructor(S: TopoDS_Shell);
  }

  export declare class BRepBuilderAPI_MakeSolid_4 extends BRepBuilderAPI_MakeSolid {
    constructor(S1: TopoDS_Shell, S2: TopoDS_Shell);
  }

  export declare class BRepBuilderAPI_MakeSolid_5 extends BRepBuilderAPI_MakeSolid {
    constructor(S1: TopoDS_Shell, S2: TopoDS_Shell, S3: TopoDS_Shell);
  }

  export declare class BRepBuilderAPI_MakeSolid_6 extends BRepBuilderAPI_MakeSolid {
    constructor(So: TopoDS_Solid);
  }

  export declare class BRepBuilderAPI_MakeSolid_7 extends BRepBuilderAPI_MakeSolid {
    constructor(So: TopoDS_Solid, S: TopoDS_Shell);
  }

export declare class BRepBuilderAPI_MakeFace extends BRepBuilderAPI_MakeShape {
  Init_1(F: TopoDS_Face): void;
  Init_2(S: any, Bound: Standard_Boolean, TolDegen: Standard_Real): void;
  Init_3(S: any, UMin: Standard_Real, UMax: Standard_Real, VMin: Standard_Real, VMax: Standard_Real, TolDegen: Standard_Real): void;
  Add(W: TopoDS_Wire): void;
  IsDone(): Standard_Boolean;
  Error(): BRepBuilderAPI_FaceError;
  Face(): TopoDS_Face;
  delete(): void;
}

  export declare class BRepBuilderAPI_MakeFace_1 extends BRepBuilderAPI_MakeFace {
    constructor();
  }

  export declare class BRepBuilderAPI_MakeFace_2 extends BRepBuilderAPI_MakeFace {
    constructor(F: TopoDS_Face);
  }

  export declare class BRepBuilderAPI_MakeFace_3 extends BRepBuilderAPI_MakeFace {
    constructor(P: gp_Pln);
  }

  export declare class BRepBuilderAPI_MakeFace_4 extends BRepBuilderAPI_MakeFace {
    constructor(C: gp_Cylinder);
  }

  export declare class BRepBuilderAPI_MakeFace_5 extends BRepBuilderAPI_MakeFace {
    constructor(C: gp_Cone);
  }

  export declare class BRepBuilderAPI_MakeFace_6 extends BRepBuilderAPI_MakeFace {
    constructor(S: gp_Sphere);
  }

  export declare class BRepBuilderAPI_MakeFace_7 extends BRepBuilderAPI_MakeFace {
    constructor(C: gp_Torus);
  }

  export declare class BRepBuilderAPI_MakeFace_8 extends BRepBuilderAPI_MakeFace {
    constructor(S: any, TolDegen: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeFace_9 extends BRepBuilderAPI_MakeFace {
    constructor(P: gp_Pln, UMin: Standard_Real, UMax: Standard_Real, VMin: Standard_Real, VMax: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeFace_10 extends BRepBuilderAPI_MakeFace {
    constructor(C: gp_Cylinder, UMin: Standard_Real, UMax: Standard_Real, VMin: Standard_Real, VMax: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeFace_11 extends BRepBuilderAPI_MakeFace {
    constructor(C: gp_Cone, UMin: Standard_Real, UMax: Standard_Real, VMin: Standard_Real, VMax: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeFace_12 extends BRepBuilderAPI_MakeFace {
    constructor(S: gp_Sphere, UMin: Standard_Real, UMax: Standard_Real, VMin: Standard_Real, VMax: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeFace_13 extends BRepBuilderAPI_MakeFace {
    constructor(C: gp_Torus, UMin: Standard_Real, UMax: Standard_Real, VMin: Standard_Real, VMax: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeFace_14 extends BRepBuilderAPI_MakeFace {
    constructor(S: any, UMin: Standard_Real, UMax: Standard_Real, VMin: Standard_Real, VMax: Standard_Real, TolDegen: Standard_Real);
  }

  export declare class BRepBuilderAPI_MakeFace_15 extends BRepBuilderAPI_MakeFace {
    constructor(W: TopoDS_Wire, OnlyPlane: Standard_Boolean);
  }

  export declare class BRepBuilderAPI_MakeFace_16 extends BRepBuilderAPI_MakeFace {
    constructor(P: gp_Pln, W: TopoDS_Wire, Inside: Standard_Boolean);
  }

  export declare class BRepBuilderAPI_MakeFace_17 extends BRepBuilderAPI_MakeFace {
    constructor(C: gp_Cylinder, W: TopoDS_Wire, Inside: Standard_Boolean);
  }

  export declare class BRepBuilderAPI_MakeFace_18 extends BRepBuilderAPI_MakeFace {
    constructor(C: gp_Cone, W: TopoDS_Wire, Inside: Standard_Boolean);
  }

  export declare class BRepBuilderAPI_MakeFace_19 extends BRepBuilderAPI_MakeFace {
    constructor(S: gp_Sphere, W: TopoDS_Wire, Inside: Standard_Boolean);
  }

  export declare class BRepBuilderAPI_MakeFace_20 extends BRepBuilderAPI_MakeFace {
    constructor(C: gp_Torus, W: TopoDS_Wire, Inside: Standard_Boolean);
  }

  export declare class BRepBuilderAPI_MakeFace_21 extends BRepBuilderAPI_MakeFace {
    constructor(S: any, W: TopoDS_Wire, Inside: Standard_Boolean);
  }

  export declare class BRepBuilderAPI_MakeFace_22 extends BRepBuilderAPI_MakeFace {
    constructor(F: TopoDS_Face, W: TopoDS_Wire);
  }

export declare class BRepBuilderAPI_MakeWire extends BRepBuilderAPI_MakeShape {
  Add_1(E: TopoDS_Edge): void;
  Add_2(W: TopoDS_Wire): void;
  Add_3(L: NCollection_List<TopoDS_Shape>): void;
  IsDone(): Standard_Boolean;
  Error(): BRepBuilderAPI_WireError;
  Wire(): TopoDS_Wire;
  Edge(): TopoDS_Edge;
  Vertex(): TopoDS_Vertex;
  delete(): void;
}

  export declare class BRepBuilderAPI_MakeWire_1 extends BRepBuilderAPI_MakeWire {
    constructor();
  }

  export declare class BRepBuilderAPI_MakeWire_2 extends BRepBuilderAPI_MakeWire {
    constructor(E: TopoDS_Edge);
  }

  export declare class BRepBuilderAPI_MakeWire_3 extends BRepBuilderAPI_MakeWire {
    constructor(E1: TopoDS_Edge, E2: TopoDS_Edge);
  }

  export declare class BRepBuilderAPI_MakeWire_4 extends BRepBuilderAPI_MakeWire {
    constructor(E1: TopoDS_Edge, E2: TopoDS_Edge, E3: TopoDS_Edge);
  }

  export declare class BRepBuilderAPI_MakeWire_5 extends BRepBuilderAPI_MakeWire {
    constructor(E1: TopoDS_Edge, E2: TopoDS_Edge, E3: TopoDS_Edge, E4: TopoDS_Edge);
  }

  export declare class BRepBuilderAPI_MakeWire_6 extends BRepBuilderAPI_MakeWire {
    constructor(W: TopoDS_Wire);
  }

  export declare class BRepBuilderAPI_MakeWire_7 extends BRepBuilderAPI_MakeWire {
    constructor(W: TopoDS_Wire, E: TopoDS_Edge);
  }

export declare class BRepCheck_Analyzer {
  constructor(S: TopoDS_Shape, GeomControls: Standard_Boolean, theIsParallel: Standard_Boolean, theIsExact: Standard_Boolean)
  Init(S: TopoDS_Shape, GeomControls: Standard_Boolean): void;
  SetExactMethod(theIsExact: Standard_Boolean): void;
  IsExactMethod(): Standard_Boolean;
  SetParallel(theIsParallel: Standard_Boolean): void;
  IsParallel(): Standard_Boolean;
  IsValid_1(S: TopoDS_Shape): Standard_Boolean;
  IsValid_2(): Standard_Boolean;
  Result(theSubS: TopoDS_Shape): any;
  delete(): void;
}

export declare class IGESControl_Reader extends XSControl_Reader {
  SetReadVisible(ReadRoot: Standard_Boolean): void;
  GetReadVisible(): Standard_Boolean;
  IGESModel(): any;
  NbRootsForTransfer(): Standard_Integer;
  PrintTransferInfo(failwarn: IFSelect_PrintFail, mode: IFSelect_PrintCount): void;
  delete(): void;
}

  export declare class IGESControl_Reader_1 extends IGESControl_Reader {
    constructor();
  }

  export declare class IGESControl_Reader_2 extends IGESControl_Reader {
    constructor(WS: any, scratch: Standard_Boolean);
  }

export declare type STEPControl_StepModelType = {
  STEPControl_AsIs: {};
  STEPControl_ManifoldSolidBrep: {};
  STEPControl_BrepWithVoids: {};
  STEPControl_FacetedBrep: {};
  STEPControl_FacetedBrepAndBrepWithVoids: {};
  STEPControl_ShellBasedSurfaceModel: {};
  STEPControl_GeometricCurveSet: {};
  STEPControl_Hybrid: {};
}

export declare class STEPControl_Writer {
  SetTolerance(Tol: Standard_Real): void;
  UnsetTolerance(): void;
  SetWS(WS: any, scratch: Standard_Boolean): void;
  WS(): any;
  Model(newone: Standard_Boolean): any;
  Transfer_1(sh: TopoDS_Shape, mode: STEPControl_StepModelType, compgraph: Standard_Boolean, theProgress: Message_ProgressRange): IFSelect_ReturnStatus;
  Transfer_2(sh: TopoDS_Shape, mode: STEPControl_StepModelType, theParams: DESTEP_Parameters, compgraph: Standard_Boolean, theProgress: Message_ProgressRange): IFSelect_ReturnStatus;
  Write(theFileName: Standard_Character): IFSelect_ReturnStatus;
  PrintStatsTransfer(what: Standard_Integer, mode: Standard_Integer): void;
  CleanDuplicateEntities(): void;
  SetShapeFixParameters_1(theParameters: any): void;
  SetShapeFixParameters_2(theParameters: any): void;
  SetShapeFixParameters_3(theParameters: DE_ShapeFixParameters, theAdditionalParameters: any): void;
  GetShapeFixParameters(): any;
  SetShapeProcessFlags(theFlags: any): void;
  GetShapeProcessFlags(): any;
  delete(): void;
}

  export declare class STEPControl_Writer_1 extends STEPControl_Writer {
    constructor();
  }

  export declare class STEPControl_Writer_2 extends STEPControl_Writer {
    constructor(WS: any, scratch: Standard_Boolean);
  }

export declare class STEPControl_Reader extends XSControl_Reader {
  StepModel(): any;
  ReadFile_1(filename: Standard_Character): IFSelect_ReturnStatus;
  ReadFile_2(filename: Standard_Character, theParams: DESTEP_Parameters): IFSelect_ReturnStatus;
  TransferRoot(num: Standard_Integer, theProgress: Message_ProgressRange): Standard_Boolean;
  NbRootsForTransfer(): Standard_Integer;
  FileUnits(theUnitLengthNames: NCollection_Sequence<TCollection_AsciiString>, theUnitAngleNames: NCollection_Sequence<TCollection_AsciiString>, theUnitSolidAngleNames: NCollection_Sequence<TCollection_AsciiString>): void;
  SetSystemLengthUnit(theLengthUnit: Standard_Real): void;
  SystemLengthUnit(): Standard_Real;
  delete(): void;
}

  export declare class STEPControl_Reader_1 extends STEPControl_Reader {
    constructor();
  }

  export declare class STEPControl_Reader_2 extends STEPControl_Reader {
    constructor(WS: any, scratch: Standard_Boolean);
  }

export declare class StlAPI_Reader {
  constructor();
  Read_1(theShape: TopoDS_Shape, theFileName: Standard_Character): Standard_Boolean;
  delete(): void;
}

export declare class StlAPI_Writer {
  constructor()
  ASCIIMode(): Standard_Boolean;
  Write_1(theShape: TopoDS_Shape, theFileName: Standard_Character, theProgress: Message_ProgressRange): Standard_Boolean;
  delete(): void;
}

export declare class IFSelect_WorkSession extends Standard_Transient {
  constructor()
  SetErrorHandle(toHandle: Standard_Boolean): void;
  ErrorHandle(): Standard_Boolean;
  ShareOut(): any;
  SetShareOut(shareout: any): void;
  SetModeStat(theMode: Standard_Boolean): void;
  GetModeStat(): Standard_Boolean;
  SetLibrary(theLib: any): void;
  WorkLibrary(): any;
  SetProtocol(protocol: any): void;
  Protocol(): any;
  SetSignType(signtype: any): void;
  SignType(): any;
  HasModel(): Standard_Boolean;
  SetModel(model: any, clearpointed: Standard_Boolean): void;
  Model(): any;
  SetLoadedFile(theFileName: Standard_Character): void;
  LoadedFile(): Standard_Character;
  ReadFile(filename: Standard_Character): IFSelect_ReturnStatus;
  NbStartingEntities(): Standard_Integer;
  StartingEntity(num: Standard_Integer): any;
  StartingNumber(ent: any): Standard_Integer;
  NumberFromLabel(val: Standard_Character, afternum: Standard_Integer): Standard_Integer;
  EntityLabel(ent: any): any;
  EntityName(ent: any): any;
  CategoryNumber(ent: any): Standard_Integer;
  CategoryName(ent: any): Standard_Character;
  ValidityName(ent: any): Standard_Character;
  ClearData(mode: Standard_Integer): void;
  ComputeGraph(enforce: Standard_Boolean): Standard_Boolean;
  HGraph(): any;
  Graph(): Interface_Graph;
  Shareds(ent: any): any;
  Sharings(ent: any): any;
  IsLoaded(): Standard_Boolean;
  ComputeCheck(enforce: Standard_Boolean): Standard_Boolean;
  ModelCheckList(complete: Standard_Boolean): Interface_CheckIterator;
  CheckOne(ent: any, complete: Standard_Boolean): Interface_CheckIterator;
  LastRunCheckList(): Interface_CheckIterator;
  MaxIdent(): Standard_Integer;
  Item(id: Standard_Integer): any;
  ItemIdent(item: any): Standard_Integer;
  NamedItem_1(name: Standard_Character): any;
  NamedItem_2(name: any): any;
  NameIdent(name: Standard_Character): Standard_Integer;
  HasName(item: any): Standard_Boolean;
  Name(item: any): any;
  AddItem(item: any, active: Standard_Boolean): Standard_Integer;
  AddNamedItem(name: Standard_Character, item: any, active: Standard_Boolean): Standard_Integer;
  SetActive(item: any, mode: Standard_Boolean): Standard_Boolean;
  RemoveNamedItem(name: Standard_Character): Standard_Boolean;
  RemoveName(name: Standard_Character): Standard_Boolean;
  RemoveItem(item: any): Standard_Boolean;
  ClearItems(): void;
  ItemLabel(id: Standard_Integer): any;
  ItemIdents(type: any): any;
  ItemNames(type: any): any;
  ItemNamesForLabel(label: Standard_Character): any;
  NextIdentForLabel(label: Standard_Character, id: Standard_Integer, mode: Standard_Integer): Standard_Integer;
  NewParamFromStatic(statname: Standard_Character, name: Standard_Character): any;
  IntParam(id: Standard_Integer): any;
  IntValue(it: any): Standard_Integer;
  NewIntParam(name: Standard_Character): any;
  SetIntValue(it: any, val: Standard_Integer): Standard_Boolean;
  TextParam(id: Standard_Integer): any;
  TextValue(par: any): XCAFDoc_PartId;
  NewTextParam(name: Standard_Character): any;
  SetTextValue(par: any, val: Standard_Character): Standard_Boolean;
  Signature(id: Standard_Integer): any;
  SignValue(sign: any, ent: any): Standard_Character;
  Selection(id: Standard_Integer): any;
  EvalSelection(sel: any): Interface_EntityIterator;
  Sources(sel: any): IFSelect_SelectionIterator;
  SelectionResult(sel: any): any;
  SelectionResultFromList(sel: any, list: any): any;
  SetItemSelection(item: any, sel: any): Standard_Boolean;
  ResetItemSelection(item: any): Standard_Boolean;
  ItemSelection(item: any): any;
  SignCounter(id: Standard_Integer): any;
  ComputeCounter(counter: any, forced: Standard_Boolean): Standard_Boolean;
  ComputeCounterFromList(counter: any, list: any, clear: Standard_Boolean): Standard_Boolean;
  AppliedDispatches(): any;
  ClearShareOut(onlydisp: Standard_Boolean): void;
  Dispatch(id: Standard_Integer): any;
  DispatchRank(disp: any): Standard_Integer;
  ModelCopier(): any;
  SetModelCopier(copier: any): void;
  NbFinalModifiers(formodel: Standard_Boolean): Standard_Integer;
  FinalModifierIdents(formodel: Standard_Boolean): any;
  GeneralModifier(id: Standard_Integer): any;
  ModelModifier(id: Standard_Integer): any;
  ModifierRank(item: any): Standard_Integer;
  ChangeModifierRank(formodel: Standard_Boolean, before: Standard_Integer, after: Standard_Integer): Standard_Boolean;
  ClearFinalModifiers(): void;
  SetAppliedModifier(modif: any, item: any): Standard_Boolean;
  ResetAppliedModifier(modif: any): Standard_Boolean;
  UsesAppliedModifier(modif: any): any;
  Transformer(id: Standard_Integer): any;
  RunTransformer(transf: any): Standard_Integer;
  RunModifier(modif: any, copy: Standard_Boolean): Standard_Integer;
  RunModifierSelected(modif: any, sel: any, copy: Standard_Boolean): Standard_Integer;
  NewTransformStandard(copy: Standard_Boolean, name: Standard_Character): any;
  SetModelContent(sel: any, keep: Standard_Boolean): Standard_Boolean;
  FilePrefix(): any;
  DefaultFileRoot(): any;
  FileExtension(): any;
  FileRoot(disp: any): any;
  SetFilePrefix(name: Standard_Character): void;
  SetDefaultFileRoot(name: Standard_Character): Standard_Boolean;
  SetFileExtension(name: Standard_Character): void;
  SetFileRoot(disp: any, name: Standard_Character): Standard_Boolean;
  GiveFileRoot(file: Standard_Character): Standard_Character;
  GiveFileComplete(file: Standard_Character): Standard_Character;
  ClearFile(): void;
  EvaluateFile(): void;
  NbFiles(): Standard_Integer;
  FileModel(num: Standard_Integer): any;
  FileName(num: Standard_Integer): XCAFDoc_PartId;
  BeginSentFiles(record: Standard_Boolean): void;
  SentFiles(): any;
  SendSplit(): Standard_Boolean;
  EvalSplit(): any;
  SentList(count: Standard_Integer): Interface_EntityIterator;
  MaxSendingCount(): Standard_Integer;
  SetRemaining(mode: IFSelect_RemainMode): Standard_Boolean;
  SendAll(filename: Standard_Character, computegraph: Standard_Boolean): IFSelect_ReturnStatus;
  SendSelected(filename: Standard_Character, sel: any, computegraph: Standard_Boolean): IFSelect_ReturnStatus;
  WriteFile_1(filename: Standard_Character): IFSelect_ReturnStatus;
  WriteFile_2(filename: Standard_Character, sel: any): IFSelect_ReturnStatus;
  NbSources(sel: any): Standard_Integer;
  Source(sel: any, num: Standard_Integer): any;
  IsReversedSelectExtract(sel: any): Standard_Boolean;
  ToggleSelectExtract(sel: any): Standard_Boolean;
  SetInputSelection(sel: any, input: any): Standard_Boolean;
  SetControl(sel: any, sc: any, formain: Standard_Boolean): Standard_Boolean;
  CombineAdd(selcomb: any, seladd: any, atnum: Standard_Integer): Standard_Integer;
  CombineRemove(selcomb: any, selrem: any): Standard_Boolean;
  NewSelectPointed(list: any, name: Standard_Character): any;
  SetSelectPointed(sel: any, list: any, mode: Standard_Integer): Standard_Boolean;
  GiveSelection(selname: Standard_Character): any;
  GiveList_1(obj: any): any;
  GiveList_2(first: Standard_Character, second: Standard_Character): any;
  GiveListFromList(selname: Standard_Character, ent: any): any;
  GiveListCombined(l1: any, l2: any, mode: Standard_Integer): any;
  QueryCheckList(chl: Interface_CheckIterator): void;
  QueryCheckStatus(ent: any): Standard_Integer;
  QueryParent(entdad: any, entson: any): Standard_Integer;
  SetParams(params: any, uselist: NCollection_Vector<int>): void;
  TraceStatics(use: Standard_Integer, mode: Standard_Integer): void;
  DumpShare(): void;
  ListItems(label: Standard_Character): void;
  ListFinalModifiers(formodel: Standard_Boolean): void;
  DumpSelection(sel: any): void;
  TraceDumpModel(mode: Standard_Integer): void;
  TraceDumpEntity(ent: any, level: Standard_Integer): void;
  EvaluateSelection(sel: any): void;
  EvaluateDispatch(disp: any, mode: Standard_Integer): void;
  EvaluateComplete(mode: Standard_Integer): void;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

export declare type IFSelect_ReturnStatus = {
  IFSelect_RetVoid: {};
  IFSelect_RetDone: {};
  IFSelect_RetError: {};
  IFSelect_RetFail: {};
  IFSelect_RetStop: {};
}

export declare class Transfer_TransientProcess extends Transfer_ProcessForTransient {
  constructor(nb: Standard_Integer)
  SetModel(model: any): void;
  Model(): any;
  SetGraph(HG: any): void;
  HasGraph(): Standard_Boolean;
  HGraph(): any;
  Graph(): Interface_Graph;
  SetContext(name: Standard_Character, ctx: any): void;
  GetContext(name: Standard_Character, type: any, ctx: any): Standard_Boolean;
  Context(): any;
  CheckNum(ent: any): Standard_Integer;
  TypedSharings(start: any, type: any): Interface_EntityIterator;
  IsDataLoaded(ent: any): Standard_Boolean;
  IsDataFail(ent: any): Standard_Boolean;
  RootsForTransfer(): any;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

export declare class Transfer_ProcessForTransient extends Standard_Transient {
  Clear(): void;
  Clean(): void;
  Resize(nb: Standard_Integer): void;
  SetActor(actor: any): void;
  Actor(): any;
  Find(start: any): any;
  IsBound(start: any): Standard_Boolean;
  IsAlreadyUsed(start: any): Standard_Boolean;
  Bind(start: any, binder: any): void;
  Rebind(start: any, binder: any): void;
  Unbind(start: any): Standard_Boolean;
  FindElseBind(start: any): any;
  SetMessenger(messenger: any): void;
  Messenger(): any;
  SetTraceLevel(tracelev: Standard_Integer): void;
  TraceLevel(): Standard_Integer;
  SendFail(start: any, amsg: Message_Msg): void;
  SendWarning(start: any, amsg: Message_Msg): void;
  SendMsg(start: any, amsg: Message_Msg): void;
  AddFail_1(start: any, mess: Standard_Character, orig: Standard_Character): void;
  AddError(start: any, mess: Standard_Character, orig: Standard_Character): void;
  AddFail_2(start: any, amsg: Message_Msg): void;
  AddWarning_1(start: any, mess: Standard_Character, orig: Standard_Character): void;
  AddWarning_2(start: any, amsg: Message_Msg): void;
  Mend(start: any, pref: Standard_Character): void;
  Check(start: any): any;
  BindTransient(start: any, res: any): void;
  FindTransient(start: any): any;
  BindMultiple(start: any): void;
  AddMultiple(start: any, res: any): void;
  FindTypedTransient(start: any, atype: any, val: any): Standard_Boolean;
  GetTypedTransient(binder: any, atype: any, val: any): Standard_Boolean;
  NbMapped(): Standard_Integer;
  Mapped(num: Standard_Integer): any;
  MapIndex(start: any): Standard_Integer;
  MapItem(num: Standard_Integer): any;
  SetRoot(start: any): void;
  SetRootManagement(stat: Standard_Boolean): void;
  NbRoots(): Standard_Integer;
  Root(num: Standard_Integer): any;
  RootItem(num: Standard_Integer): any;
  RootIndex(start: any): Standard_Integer;
  NestingLevel(): Standard_Integer;
  ResetNestingLevel(): void;
  Recognize(start: any): Standard_Boolean;
  Transferring(start: any, theProgress: Message_ProgressRange): any;
  Transfer(start: any, theProgress: Message_ProgressRange): Standard_Boolean;
  SetErrorHandle(err: Standard_Boolean): void;
  ErrorHandle(): Standard_Boolean;
  StartTrace(binder: any, start: any, level: Standard_Integer, mode: Standard_Integer): void;
  IsLooping(alevel: Standard_Integer): Standard_Boolean;
  RootResult(withstart: Standard_Boolean): Transfer_IteratorOfProcessForTransient;
  CompleteResult(withstart: Standard_Boolean): Transfer_IteratorOfProcessForTransient;
  AbnormalResult(): Transfer_IteratorOfProcessForTransient;
  CheckList(erronly: Standard_Boolean): Interface_CheckIterator;
  ResultOne(start: any, level: Standard_Integer, withstart: Standard_Boolean): Transfer_IteratorOfProcessForTransient;
  CheckListOne(start: any, level: Standard_Integer, erronly: Standard_Boolean): Interface_CheckIterator;
  IsCheckListEmpty(start: any, level: Standard_Integer, erronly: Standard_Boolean): Standard_Boolean;
  RemoveResult(start: any, level: Standard_Integer, compute: Standard_Boolean): void;
  CheckNum(start: any): Standard_Integer;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

  export declare class Transfer_ProcessForTransient_1 extends Transfer_ProcessForTransient {
    constructor(nb: Standard_Integer);
  }

  export declare class Transfer_ProcessForTransient_2 extends Transfer_ProcessForTransient {
    constructor(printer: any, nb: Standard_Integer);
  }

export declare class XSControl_Reader {
  SetNorm(norm: Standard_Character): Standard_Boolean;
  SetWS(WS: any, scratch: Standard_Boolean): void;
  WS(): any;
  ReadFile(filename: Standard_Character): IFSelect_ReturnStatus;
  Model(): any;
  GiveList_1(first: Standard_Character, second: Standard_Character): any;
  GiveList_2(first: Standard_Character, ent: any): any;
  NbRootsForTransfer(): Standard_Integer;
  RootForTransfer(num: Standard_Integer): any;
  TransferOneRoot(num: Standard_Integer, theProgress: Message_ProgressRange): Standard_Boolean;
  TransferOne(num: Standard_Integer, theProgress: Message_ProgressRange): Standard_Boolean;
  TransferEntity(start: any, theProgress: Message_ProgressRange): Standard_Boolean;
  TransferList(list: any, theProgress: Message_ProgressRange): Standard_Integer;
  TransferRoots(theProgress: Message_ProgressRange): Standard_Integer;
  ClearShapes(): void;
  NbShapes(): Standard_Integer;
  Shape(num: Standard_Integer): TopoDS_Shape;
  OneShape(): TopoDS_Shape;
  PrintCheckLoad_1(failsonly: Standard_Boolean, mode: IFSelect_PrintCount): void;
  PrintCheckTransfer_1(failsonly: Standard_Boolean, mode: IFSelect_PrintCount): void;
  PrintStatsTransfer_1(what: Standard_Integer, mode: Standard_Integer): void;
  GetStatsTransfer(list: any, nbMapped: Standard_Integer, nbWithResult: Standard_Integer, nbWithFail: Standard_Integer): void;
  SetShapeFixParameters_1(theParameters: any): void;
  SetShapeFixParameters_2(theParameters: any): void;
  SetShapeFixParameters_3(theParameters: DE_ShapeFixParameters, theAdditionalParameters: any): void;
  GetShapeFixParameters(): any;
  SetShapeProcessFlags(theFlags: any): void;
  GetShapeProcessFlags(): any;
  delete(): void;
}

  export declare class XSControl_Reader_1 extends XSControl_Reader {
    constructor();
  }

  export declare class XSControl_Reader_2 extends XSControl_Reader {
    constructor(norm: Standard_Character);
  }

  export declare class XSControl_Reader_3 extends XSControl_Reader {
    constructor(WS: any, scratch: Standard_Boolean);
  }

export declare class XSControl_WorkSession extends IFSelect_WorkSession {
  constructor()
  ClearData(theMode: Standard_Integer): void;
  SelectNorm(theNormName: Standard_Character): Standard_Boolean;
  SetController(theCtl: any): void;
  SelectedNorm(theRsc: Standard_Boolean): Standard_Character;
  NormAdaptor(): any;
  Context(): XSControl_WorkSessionMap;
  SetAllContext(theContext: XSControl_WorkSessionMap): void;
  ClearContext(): void;
  InitTransferReader(theMode: Standard_Integer): void;
  SetTransferReader(theTR: any): void;
  TransferReader(): any;
  MapReader(): any;
  SetMapReader(theTP: any): Standard_Boolean;
  Result(theEnt: any, theMode: Standard_Integer): any;
  TransferReadOne(theEnts: any, theProgress: Message_ProgressRange): Standard_Integer;
  TransferReadRoots(theProgress: Message_ProgressRange): Standard_Integer;
  NewModel(): any;
  TransferWriter(): any;
  SetMapWriter(theFP: any): Standard_Boolean;
  TransferWriteShape(theShape: TopoDS_Shape, theCompGraph: Standard_Boolean, theProgress: Message_ProgressRange): IFSelect_ReturnStatus;
  TransferWriteCheckList(): Interface_CheckIterator;
  Vars(): any;
  SetVars(theVars: any): void;
  static get_type_name(): Standard_Character;
  static get_type_descriptor(): any;
  DynamicType(): any;
  delete(): void;
}

type Standard_Boolean = boolean;
type Standard_Byte = number;
type Standard_Character = number;
type Standard_CString = string;
type Standard_Integer = number;
type Standard_Real = number;
type Standard_ShortReal = number;
type Standard_Size = number;

declare namespace FS {
  interface Lookup {
      path: string;
      node: FSNode;
  }

  interface FSStream {}
  interface FSNode {}
  interface ErrnoError {}

  let ignorePermissions: boolean;
  let trackingDelegate: any;
  let tracking: any;
  let genericErrors: any;

  //
  // paths
  //
  function lookupPath(path: string, opts: any): Lookup;
  function getPath(node: FSNode): string;

  //
  // nodes
  //
  function isFile(mode: number): boolean;
  function isDir(mode: number): boolean;
  function isLink(mode: number): boolean;
  function isChrdev(mode: number): boolean;
  function isBlkdev(mode: number): boolean;
  function isFIFO(mode: number): boolean;
  function isSocket(mode: number): boolean;

  //
  // devices
  //
  function major(dev: number): number;
  function minor(dev: number): number;
  function makedev(ma: number, mi: number): number;
  function registerDevice(dev: number, ops: any): void;

  //
  // core
  //
  function syncfs(populate: boolean, callback: (e: any) => any): void;
  function syncfs(callback: (e: any) => any, populate?: boolean): void;
  function mount(type: any, opts: any, mountpoint: string): any;
  function unmount(mountpoint: string): void;

  function mkdir(path: string, mode?: number): any;
  function mkdev(path: string, mode?: number, dev?: number): any;
  function symlink(oldpath: string, newpath: string): any;
  function rename(old_path: string, new_path: string): void;
  function rmdir(path: string): void;
  function readdir(path: string): any;
  function unlink(path: string): void;
  function readlink(path: string): string;
  function stat(path: string, dontFollow?: boolean): any;
  function lstat(path: string): any;
  function chmod(path: string, mode: number, dontFollow?: boolean): void;
  function lchmod(path: string, mode: number): void;
  function fchmod(fd: number, mode: number): void;
  function chown(path: string, uid: number, gid: number, dontFollow?: boolean): void;
  function lchown(path: string, uid: number, gid: number): void;
  function fchown(fd: number, uid: number, gid: number): void;
  function truncate(path: string, len: number): void;
  function ftruncate(fd: number, len: number): void;
  function utime(path: string, atime: number, mtime: number): void;
  function open(path: string, flags: string, mode?: number, fd_start?: number, fd_end?: number): FSStream;
  function close(stream: FSStream): void;
  function llseek(stream: FSStream, offset: number, whence: number): any;
  function read(stream: FSStream, buffer: ArrayBufferView, offset: number, length: number, position?: number): number;
  function write(
      stream: FSStream,
      buffer: ArrayBufferView,
      offset: number,
      length: number,
      position?: number,
      canOwn?: boolean,
  ): number;
  function allocate(stream: FSStream, offset: number, length: number): void;
  function mmap(
      stream: FSStream,
      buffer: ArrayBufferView,
      offset: number,
      length: number,
      position: number,
      prot: number,
      flags: number,
  ): any;
  function ioctl(stream: FSStream, cmd: any, arg: any): any;
  function readFile(path: string, opts: { encoding: 'binary'; flags?: string }): Uint8Array;
  function readFile(path: string, opts: { encoding: 'utf8'; flags?: string }): string;
  function readFile(path: string, opts?: { flags?: string }): Uint8Array;
  function writeFile(path: string, data: string | ArrayBufferView, opts?: { flags?: string }): void;

  //
  // module-level FS code
  //
  function cwd(): string;
  function chdir(path: string): void;
  function init(
      input: null | (() => number | null),
      output: null | ((c: number) => any),
      error: null | ((c: number) => any),
  ): void;

  function createLazyFile(
      parent: string | FSNode,
      name: string,
      url: string,
      canRead: boolean,
      canWrite: boolean,
  ): FSNode;
  function createPreloadedFile(
      parent: string | FSNode,
      name: string,
      url: string,
      canRead: boolean,
      canWrite: boolean,
      onload?: () => void,
      onerror?: () => void,
      dontCreateFile?: boolean,
      canOwn?: boolean,
  ): void;
  function createDataFile(
      parent: string | FSNode,
      name: string,
      data: ArrayBufferView | string,
      canRead: boolean,
      canWrite: boolean,
      canOwn: boolean,
  ): FSNode;
  interface AnalysisResults {
    isRoot: boolean,
    exists: boolean,
    error: Error,
    name: string,
    path: any,
    object: any,
    parentExists: boolean,
    parentPath: any,
    parentObject: any
  }
  function analyzePath(path: string): AnalysisResults;
}


export type OpenCascadeInstance = {FS: typeof FS} & {
  Message_ProgressRange: typeof Message_ProgressRange;
  Message_ProgressRange_1: typeof Message_ProgressRange_1;
  Message_ProgressRange_2: typeof Message_ProgressRange_2;
  NCollection_BaseMap: typeof NCollection_BaseMap;
  Standard_Transient: typeof Standard_Transient;
  Standard_Transient_1: typeof Standard_Transient_1;
  Standard_Transient_2: typeof Standard_Transient_2;
  gp_Dir: typeof gp_Dir;
  gp_Dir_1: typeof gp_Dir_1;
  gp_Dir_3: typeof gp_Dir_3;
  gp_Dir_4: typeof gp_Dir_4;
  gp_Dir_5: typeof gp_Dir_5;
  gp_Dir_6: typeof gp_Dir_6;
  gp_Dir_7: typeof gp_Dir_7;
  gp_Ax2d: typeof gp_Ax2d;
  gp_Ax2d_1: typeof gp_Ax2d_1;
  gp_Ax2d_2: typeof gp_Ax2d_2;
  gp: typeof gp;
  gp_Dir2d: typeof gp_Dir2d;
  gp_Dir2d_1: typeof gp_Dir2d_1;
  gp_Dir2d_3: typeof gp_Dir2d_3;
  gp_Dir2d_4: typeof gp_Dir2d_4;
  gp_Dir2d_5: typeof gp_Dir2d_5;
  gp_Vec: typeof gp_Vec;
  gp_Vec_1: typeof gp_Vec_1;
  gp_Vec_2: typeof gp_Vec_2;
  gp_Vec_3: typeof gp_Vec_3;
  gp_Vec_4: typeof gp_Vec_4;
  gp_Vec_5: typeof gp_Vec_5;
  gp_Pnt2d: typeof gp_Pnt2d;
  gp_Pnt2d_1: typeof gp_Pnt2d_1;
  gp_Pnt2d_2: typeof gp_Pnt2d_2;
  gp_Pnt2d_3: typeof gp_Pnt2d_3;
  gp_Ax3: typeof gp_Ax3;
  gp_Ax3_1: typeof gp_Ax3_1;
  gp_Ax3_2: typeof gp_Ax3_2;
  gp_Ax3_3: typeof gp_Ax3_3;
  gp_Ax3_5: typeof gp_Ax3_5;
  gp_Trsf: typeof gp_Trsf;
  gp_Trsf_1: typeof gp_Trsf_1;
  gp_Trsf_2: typeof gp_Trsf_2;
  gp_Ax2: typeof gp_Ax2;
  gp_Ax2_1: typeof gp_Ax2_1;
  gp_Ax2_2: typeof gp_Ax2_2;
  gp_Ax2_4: typeof gp_Ax2_4;
  gp_Pnt: typeof gp_Pnt;
  gp_Pnt_1: typeof gp_Pnt_1;
  gp_Pnt_2: typeof gp_Pnt_2;
  gp_Pnt_3: typeof gp_Pnt_3;
  gp_Ax1: typeof gp_Ax1;
  gp_Ax1_1: typeof gp_Ax1_1;
  gp_Ax1_2: typeof gp_Ax1_2;
  gp_Pln: typeof gp_Pln;
  gp_Pln_1: typeof gp_Pln_1;
  gp_Pln_2: typeof gp_Pln_2;
  gp_Pln_3: typeof gp_Pln_3;
  gp_Pln_4: typeof gp_Pln_4;
  GeomAbs_CurveType: GeomAbs_CurveType;
  GeomAbs_Shape: GeomAbs_Shape;
  GeomAbs_JoinType: GeomAbs_JoinType;
  GeomAbs_SurfaceType: GeomAbs_SurfaceType;
  Poly_Triangle: typeof Poly_Triangle;
  Poly_Triangle_1: typeof Poly_Triangle_1;
  Poly_Triangle_2: typeof Poly_Triangle_2;
  Poly_Triangulation: typeof Poly_Triangulation;
  Poly_Triangulation_1: typeof Poly_Triangulation_1;
  Poly_Triangulation_2: typeof Poly_Triangulation_2;
  Poly_Triangulation_3: typeof Poly_Triangulation_3;
  Poly_Triangulation_4: typeof Poly_Triangulation_4;
  Poly_Triangulation_5: typeof Poly_Triangulation_5;
  Poly_PolygonOnTriangulation: typeof Poly_PolygonOnTriangulation;
  Poly_PolygonOnTriangulation_1: typeof Poly_PolygonOnTriangulation_1;
  Poly_PolygonOnTriangulation_2: typeof Poly_PolygonOnTriangulation_2;
  Poly_PolygonOnTriangulation_3: typeof Poly_PolygonOnTriangulation_3;
  Poly_Connect: typeof Poly_Connect;
  Poly_Connect_1: typeof Poly_Connect_1;
  Poly_Connect_2: typeof Poly_Connect_2;
  TopLoc_Location: typeof TopLoc_Location;
  TopLoc_Location_1: typeof TopLoc_Location_1;
  TopLoc_Location_2: typeof TopLoc_Location_2;
  TopLoc_Location_3: typeof TopLoc_Location_3;
  TopLoc_Location_4: typeof TopLoc_Location_4;
  TopLoc_Location_5: typeof TopLoc_Location_5;
  GC_MakeArcOfCircle: typeof GC_MakeArcOfCircle;
  GC_MakeArcOfCircle_1: typeof GC_MakeArcOfCircle_1;
  GC_MakeArcOfCircle_2: typeof GC_MakeArcOfCircle_2;
  GC_MakeArcOfCircle_3: typeof GC_MakeArcOfCircle_3;
  GC_MakeArcOfCircle_4: typeof GC_MakeArcOfCircle_4;
  GC_MakeArcOfCircle_5: typeof GC_MakeArcOfCircle_5;
  GC_Root: typeof GC_Root;
  GC_MakeSegment: typeof GC_MakeSegment;
  GC_MakeSegment_1: typeof GC_MakeSegment_1;
  GC_MakeSegment_2: typeof GC_MakeSegment_2;
  GC_MakeSegment_3: typeof GC_MakeSegment_3;
  GC_MakeSegment_4: typeof GC_MakeSegment_4;
  GC_MakeCircle: typeof GC_MakeCircle;
  GC_MakeCircle_1: typeof GC_MakeCircle_1;
  GC_MakeCircle_2: typeof GC_MakeCircle_2;
  GC_MakeCircle_3: typeof GC_MakeCircle_3;
  GC_MakeCircle_4: typeof GC_MakeCircle_4;
  GC_MakeCircle_5: typeof GC_MakeCircle_5;
  GC_MakeCircle_6: typeof GC_MakeCircle_6;
  GC_MakeCircle_7: typeof GC_MakeCircle_7;
  GC_MakeCircle_8: typeof GC_MakeCircle_8;
  GCPnts_TangentialDeflection: typeof GCPnts_TangentialDeflection;
  GCPnts_TangentialDeflection_1: typeof GCPnts_TangentialDeflection_1;
  GCPnts_TangentialDeflection_2: typeof GCPnts_TangentialDeflection_2;
  GCPnts_TangentialDeflection_3: typeof GCPnts_TangentialDeflection_3;
  GCPnts_TangentialDeflection_4: typeof GCPnts_TangentialDeflection_4;
  GCPnts_TangentialDeflection_5: typeof GCPnts_TangentialDeflection_5;
  TopoDS_Shape: typeof TopoDS_Shape;
  TopoDS_Face: typeof TopoDS_Face;
  TopoDS_Solid: typeof TopoDS_Solid;
  TopoDS_Shell: typeof TopoDS_Shell;
  TopoDS_Compound: typeof TopoDS_Compound;
  TopoDS_Edge: typeof TopoDS_Edge;
  TopoDS_Iterator: typeof TopoDS_Iterator;
  TopoDS_Iterator_1: typeof TopoDS_Iterator_1;
  TopoDS_Iterator_2: typeof TopoDS_Iterator_2;
  TopoDS_Wire: typeof TopoDS_Wire;
  TopoDS_Vertex: typeof TopoDS_Vertex;
  TopoDS_Builder: typeof TopoDS_Builder;
  BRep_Tool: typeof BRep_Tool;
  BRep_Builder: typeof BRep_Builder;
  BRepAdaptor_Surface: typeof BRepAdaptor_Surface;
  BRepAdaptor_Surface_1: typeof BRepAdaptor_Surface_1;
  BRepAdaptor_Surface_2: typeof BRepAdaptor_Surface_2;
  BRepAdaptor_Curve: typeof BRepAdaptor_Curve;
  BRepAdaptor_Curve_1: typeof BRepAdaptor_Curve_1;
  BRepAdaptor_Curve_2: typeof BRepAdaptor_Curve_2;
  BRepAdaptor_Curve_3: typeof BRepAdaptor_Curve_3;
  TopExp_Explorer: typeof TopExp_Explorer;
  TopExp_Explorer_1: typeof TopExp_Explorer_1;
  TopExp_Explorer_2: typeof TopExp_Explorer_2;
  Geom_TrimmedCurve: typeof Geom_TrimmedCurve;
  Geom_Conic: typeof Geom_Conic;
  Geom_Surface: typeof Geom_Surface;
  Geom_ElementarySurface: typeof Geom_ElementarySurface;
  Geom_BezierCurve: typeof Geom_BezierCurve;
  Geom_BezierCurve_1: typeof Geom_BezierCurve_1;
  Geom_BezierCurve_2: typeof Geom_BezierCurve_2;
  Geom_BezierCurve_3: typeof Geom_BezierCurve_3;
  Geom_Curve: typeof Geom_Curve;
  Geom_BSplineCurve: typeof Geom_BSplineCurve;
  Geom_BSplineCurve_1: typeof Geom_BSplineCurve_1;
  Geom_BSplineCurve_2: typeof Geom_BSplineCurve_2;
  Geom_BSplineCurve_3: typeof Geom_BSplineCurve_3;
  Geom_Plane: typeof Geom_Plane;
  Geom_Plane_1: typeof Geom_Plane_1;
  Geom_Plane_2: typeof Geom_Plane_2;
  Geom_Plane_3: typeof Geom_Plane_3;
  Geom_Plane_4: typeof Geom_Plane_4;
  Geom_BoundedCurve: typeof Geom_BoundedCurve;
  Geom_Geometry: typeof Geom_Geometry;
  Geom_Circle: typeof Geom_Circle;
  Geom_Circle_1: typeof Geom_Circle_1;
  Geom_Circle_2: typeof Geom_Circle_2;
  TopAbs_ShapeEnum: TopAbs_ShapeEnum;
  TopAbs_Orientation: TopAbs_Orientation;
  GeomAdaptor_TransformedSurface: typeof GeomAdaptor_TransformedSurface;
  GeomAdaptor_TransformedSurface_1: typeof GeomAdaptor_TransformedSurface_1;
  GeomAdaptor_TransformedSurface_2: typeof GeomAdaptor_TransformedSurface_2;
  GeomAdaptor_TransformedSurface_3: typeof GeomAdaptor_TransformedSurface_3;
  GeomAdaptor_Curve: typeof GeomAdaptor_Curve;
  GeomAdaptor_Curve_1: typeof GeomAdaptor_Curve_1;
  GeomAdaptor_Curve_2: typeof GeomAdaptor_Curve_2;
  GeomAdaptor_Curve_3: typeof GeomAdaptor_Curve_3;
  Adaptor3d_Surface: typeof Adaptor3d_Surface;
  Adaptor3d_Curve: typeof Adaptor3d_Curve;
  GProp_GProps: typeof GProp_GProps;
  GProp_GProps_1: typeof GProp_GProps_1;
  GProp_GProps_2: typeof GProp_GProps_2;
  StdPrs_ToolTriangulatedShape: typeof StdPrs_ToolTriangulatedShape;
  GeomAPI_PointsToBSpline: typeof GeomAPI_PointsToBSpline;
  GeomAPI_PointsToBSpline_1: typeof GeomAPI_PointsToBSpline_1;
  GeomAPI_PointsToBSpline_2: typeof GeomAPI_PointsToBSpline_2;
  GeomAPI_PointsToBSpline_3: typeof GeomAPI_PointsToBSpline_3;
  GeomAPI_PointsToBSpline_4: typeof GeomAPI_PointsToBSpline_4;
  GeomAPI_PointsToBSpline_5: typeof GeomAPI_PointsToBSpline_5;
  ShapeUpgrade_UnifySameDomain: typeof ShapeUpgrade_UnifySameDomain;
  ShapeUpgrade_UnifySameDomain_1: typeof ShapeUpgrade_UnifySameDomain_1;
  ShapeUpgrade_UnifySameDomain_2: typeof ShapeUpgrade_UnifySameDomain_2;
  BRepAlgoAPI_Section: typeof BRepAlgoAPI_Section;
  BRepAlgoAPI_Section_1: typeof BRepAlgoAPI_Section_1;
  BRepAlgoAPI_Section_2: typeof BRepAlgoAPI_Section_2;
  BRepAlgoAPI_Section_3: typeof BRepAlgoAPI_Section_3;
  BRepAlgoAPI_Section_4: typeof BRepAlgoAPI_Section_4;
  BRepAlgoAPI_Section_5: typeof BRepAlgoAPI_Section_5;
  BRepAlgoAPI_Section_6: typeof BRepAlgoAPI_Section_6;
  BRepAlgoAPI_Section_7: typeof BRepAlgoAPI_Section_7;
  BRepAlgoAPI_Section_8: typeof BRepAlgoAPI_Section_8;
  BRepAlgoAPI_Fuse: typeof BRepAlgoAPI_Fuse;
  BRepAlgoAPI_Fuse_1: typeof BRepAlgoAPI_Fuse_1;
  BRepAlgoAPI_Fuse_2: typeof BRepAlgoAPI_Fuse_2;
  BRepAlgoAPI_Fuse_3: typeof BRepAlgoAPI_Fuse_3;
  BRepAlgoAPI_Fuse_4: typeof BRepAlgoAPI_Fuse_4;
  BRepAlgoAPI_Cut: typeof BRepAlgoAPI_Cut;
  BRepAlgoAPI_Cut_1: typeof BRepAlgoAPI_Cut_1;
  BRepAlgoAPI_Cut_2: typeof BRepAlgoAPI_Cut_2;
  BRepAlgoAPI_Cut_3: typeof BRepAlgoAPI_Cut_3;
  BRepAlgoAPI_Cut_4: typeof BRepAlgoAPI_Cut_4;
  BRepAlgoAPI_BooleanOperation: typeof BRepAlgoAPI_BooleanOperation;
  BRepAlgoAPI_BooleanOperation_1: typeof BRepAlgoAPI_BooleanOperation_1;
  BRepAlgoAPI_BooleanOperation_2: typeof BRepAlgoAPI_BooleanOperation_2;
  BRepAlgoAPI_Common: typeof BRepAlgoAPI_Common;
  BRepAlgoAPI_Common_1: typeof BRepAlgoAPI_Common_1;
  BRepAlgoAPI_Common_2: typeof BRepAlgoAPI_Common_2;
  BRepAlgoAPI_Common_3: typeof BRepAlgoAPI_Common_3;
  BRepAlgoAPI_Common_4: typeof BRepAlgoAPI_Common_4;
  BRepOffsetAPI_MakeOffsetShape: typeof BRepOffsetAPI_MakeOffsetShape;
  BRepOffsetAPI_MakePipe: typeof BRepOffsetAPI_MakePipe;
  BRepOffsetAPI_MakePipe_1: typeof BRepOffsetAPI_MakePipe_1;
  BRepOffsetAPI_MakePipe_2: typeof BRepOffsetAPI_MakePipe_2;
  BRepOffsetAPI_ThruSections: typeof BRepOffsetAPI_ThruSections;
  BRepOffsetAPI_MakeOffset: typeof BRepOffsetAPI_MakeOffset;
  BRepOffsetAPI_MakeOffset_1: typeof BRepOffsetAPI_MakeOffset_1;
  BRepOffsetAPI_MakeOffset_2: typeof BRepOffsetAPI_MakeOffset_2;
  BRepOffsetAPI_MakeOffset_3: typeof BRepOffsetAPI_MakeOffset_3;
  BRepOffsetAPI_MakePipeShell: typeof BRepOffsetAPI_MakePipeShell;
  BRepOffset_Mode: BRepOffset_Mode;
  BRepMesh_DiscretRoot: typeof BRepMesh_DiscretRoot;
  BRepPrimAPI_MakeSphere: typeof BRepPrimAPI_MakeSphere;
  BRepPrimAPI_MakeSphere_1: typeof BRepPrimAPI_MakeSphere_1;
  BRepPrimAPI_MakeSphere_2: typeof BRepPrimAPI_MakeSphere_2;
  BRepPrimAPI_MakeSphere_3: typeof BRepPrimAPI_MakeSphere_3;
  BRepPrimAPI_MakeSphere_4: typeof BRepPrimAPI_MakeSphere_4;
  BRepPrimAPI_MakeSphere_5: typeof BRepPrimAPI_MakeSphere_5;
  BRepPrimAPI_MakeSphere_6: typeof BRepPrimAPI_MakeSphere_6;
  BRepPrimAPI_MakeSphere_7: typeof BRepPrimAPI_MakeSphere_7;
  BRepPrimAPI_MakeSphere_8: typeof BRepPrimAPI_MakeSphere_8;
  BRepPrimAPI_MakeSphere_9: typeof BRepPrimAPI_MakeSphere_9;
  BRepPrimAPI_MakeSphere_10: typeof BRepPrimAPI_MakeSphere_10;
  BRepPrimAPI_MakeSphere_11: typeof BRepPrimAPI_MakeSphere_11;
  BRepPrimAPI_MakeSphere_12: typeof BRepPrimAPI_MakeSphere_12;
  BRepPrimAPI_MakeCone: typeof BRepPrimAPI_MakeCone;
  BRepPrimAPI_MakeCone_1: typeof BRepPrimAPI_MakeCone_1;
  BRepPrimAPI_MakeCone_2: typeof BRepPrimAPI_MakeCone_2;
  BRepPrimAPI_MakeCone_3: typeof BRepPrimAPI_MakeCone_3;
  BRepPrimAPI_MakeCone_4: typeof BRepPrimAPI_MakeCone_4;
  BRepPrimAPI_MakeRevol: typeof BRepPrimAPI_MakeRevol;
  BRepPrimAPI_MakeRevol_1: typeof BRepPrimAPI_MakeRevol_1;
  BRepPrimAPI_MakeRevol_2: typeof BRepPrimAPI_MakeRevol_2;
  BRepPrimAPI_MakeWedge: typeof BRepPrimAPI_MakeWedge;
  BRepPrimAPI_MakeWedge_1: typeof BRepPrimAPI_MakeWedge_1;
  BRepPrimAPI_MakeWedge_2: typeof BRepPrimAPI_MakeWedge_2;
  BRepPrimAPI_MakeWedge_3: typeof BRepPrimAPI_MakeWedge_3;
  BRepPrimAPI_MakeWedge_4: typeof BRepPrimAPI_MakeWedge_4;
  BRepPrimAPI_MakeSweep: typeof BRepPrimAPI_MakeSweep;
  BRepPrimAPI_MakeTorus: typeof BRepPrimAPI_MakeTorus;
  BRepPrimAPI_MakeTorus_1: typeof BRepPrimAPI_MakeTorus_1;
  BRepPrimAPI_MakeTorus_2: typeof BRepPrimAPI_MakeTorus_2;
  BRepPrimAPI_MakeTorus_3: typeof BRepPrimAPI_MakeTorus_3;
  BRepPrimAPI_MakeTorus_4: typeof BRepPrimAPI_MakeTorus_4;
  BRepPrimAPI_MakeTorus_5: typeof BRepPrimAPI_MakeTorus_5;
  BRepPrimAPI_MakeTorus_6: typeof BRepPrimAPI_MakeTorus_6;
  BRepPrimAPI_MakeTorus_7: typeof BRepPrimAPI_MakeTorus_7;
  BRepPrimAPI_MakeTorus_8: typeof BRepPrimAPI_MakeTorus_8;
  BRepPrimAPI_MakeOneAxis: typeof BRepPrimAPI_MakeOneAxis;
  BRepPrimAPI_MakeCylinder: typeof BRepPrimAPI_MakeCylinder;
  BRepPrimAPI_MakeCylinder_1: typeof BRepPrimAPI_MakeCylinder_1;
  BRepPrimAPI_MakeCylinder_2: typeof BRepPrimAPI_MakeCylinder_2;
  BRepPrimAPI_MakeCylinder_3: typeof BRepPrimAPI_MakeCylinder_3;
  BRepPrimAPI_MakeCylinder_4: typeof BRepPrimAPI_MakeCylinder_4;
  BRepPrimAPI_MakeBox: typeof BRepPrimAPI_MakeBox;
  BRepPrimAPI_MakeBox_1: typeof BRepPrimAPI_MakeBox_1;
  BRepPrimAPI_MakeBox_2: typeof BRepPrimAPI_MakeBox_2;
  BRepPrimAPI_MakeBox_3: typeof BRepPrimAPI_MakeBox_3;
  BRepPrimAPI_MakeBox_4: typeof BRepPrimAPI_MakeBox_4;
  BRepPrimAPI_MakeBox_5: typeof BRepPrimAPI_MakeBox_5;
  BRepPrimAPI_MakePrism: typeof BRepPrimAPI_MakePrism;
  BRepPrimAPI_MakePrism_1: typeof BRepPrimAPI_MakePrism_1;
  BRepPrimAPI_MakePrism_2: typeof BRepPrimAPI_MakePrism_2;
  BRepFill_TypeOfContact: BRepFill_TypeOfContact;
  ChFi3d_FilletShape: ChFi3d_FilletShape;
  BRepFilletAPI_MakeChamfer: typeof BRepFilletAPI_MakeChamfer;
  BRepFilletAPI_MakeFillet: typeof BRepFilletAPI_MakeFillet;
  BRepFilletAPI_LocalOperation: typeof BRepFilletAPI_LocalOperation;
  BRepFilletAPI_MakeFillet2d: typeof BRepFilletAPI_MakeFillet2d;
  BRepFilletAPI_MakeFillet2d_1: typeof BRepFilletAPI_MakeFillet2d_1;
  BRepFilletAPI_MakeFillet2d_2: typeof BRepFilletAPI_MakeFillet2d_2;
  BRepGProp: typeof BRepGProp;
  BRepBuilderAPI_Transform: typeof BRepBuilderAPI_Transform;
  BRepBuilderAPI_Transform_1: typeof BRepBuilderAPI_Transform_1;
  BRepBuilderAPI_Transform_2: typeof BRepBuilderAPI_Transform_2;
  BRepBuilderAPI_MakeEdge: typeof BRepBuilderAPI_MakeEdge;
  BRepBuilderAPI_MakeEdge_1: typeof BRepBuilderAPI_MakeEdge_1;
  BRepBuilderAPI_MakeEdge_2: typeof BRepBuilderAPI_MakeEdge_2;
  BRepBuilderAPI_MakeEdge_3: typeof BRepBuilderAPI_MakeEdge_3;
  BRepBuilderAPI_MakeEdge_4: typeof BRepBuilderAPI_MakeEdge_4;
  BRepBuilderAPI_MakeEdge_5: typeof BRepBuilderAPI_MakeEdge_5;
  BRepBuilderAPI_MakeEdge_6: typeof BRepBuilderAPI_MakeEdge_6;
  BRepBuilderAPI_MakeEdge_7: typeof BRepBuilderAPI_MakeEdge_7;
  BRepBuilderAPI_MakeEdge_8: typeof BRepBuilderAPI_MakeEdge_8;
  BRepBuilderAPI_MakeEdge_9: typeof BRepBuilderAPI_MakeEdge_9;
  BRepBuilderAPI_MakeEdge_10: typeof BRepBuilderAPI_MakeEdge_10;
  BRepBuilderAPI_MakeEdge_11: typeof BRepBuilderAPI_MakeEdge_11;
  BRepBuilderAPI_MakeEdge_12: typeof BRepBuilderAPI_MakeEdge_12;
  BRepBuilderAPI_MakeEdge_13: typeof BRepBuilderAPI_MakeEdge_13;
  BRepBuilderAPI_MakeEdge_14: typeof BRepBuilderAPI_MakeEdge_14;
  BRepBuilderAPI_MakeEdge_15: typeof BRepBuilderAPI_MakeEdge_15;
  BRepBuilderAPI_MakeEdge_16: typeof BRepBuilderAPI_MakeEdge_16;
  BRepBuilderAPI_MakeEdge_17: typeof BRepBuilderAPI_MakeEdge_17;
  BRepBuilderAPI_MakeEdge_18: typeof BRepBuilderAPI_MakeEdge_18;
  BRepBuilderAPI_MakeEdge_19: typeof BRepBuilderAPI_MakeEdge_19;
  BRepBuilderAPI_MakeEdge_20: typeof BRepBuilderAPI_MakeEdge_20;
  BRepBuilderAPI_MakeEdge_21: typeof BRepBuilderAPI_MakeEdge_21;
  BRepBuilderAPI_MakeEdge_22: typeof BRepBuilderAPI_MakeEdge_22;
  BRepBuilderAPI_MakeEdge_23: typeof BRepBuilderAPI_MakeEdge_23;
  BRepBuilderAPI_MakeEdge_24: typeof BRepBuilderAPI_MakeEdge_24;
  BRepBuilderAPI_MakeEdge_25: typeof BRepBuilderAPI_MakeEdge_25;
  BRepBuilderAPI_MakeEdge_26: typeof BRepBuilderAPI_MakeEdge_26;
  BRepBuilderAPI_MakeEdge_27: typeof BRepBuilderAPI_MakeEdge_27;
  BRepBuilderAPI_MakeEdge_28: typeof BRepBuilderAPI_MakeEdge_28;
  BRepBuilderAPI_MakeEdge_29: typeof BRepBuilderAPI_MakeEdge_29;
  BRepBuilderAPI_MakeEdge_30: typeof BRepBuilderAPI_MakeEdge_30;
  BRepBuilderAPI_MakeEdge_31: typeof BRepBuilderAPI_MakeEdge_31;
  BRepBuilderAPI_MakeEdge_32: typeof BRepBuilderAPI_MakeEdge_32;
  BRepBuilderAPI_MakeEdge_33: typeof BRepBuilderAPI_MakeEdge_33;
  BRepBuilderAPI_MakeEdge_34: typeof BRepBuilderAPI_MakeEdge_34;
  BRepBuilderAPI_MakeEdge_35: typeof BRepBuilderAPI_MakeEdge_35;
  BRepBuilderAPI_Command: typeof BRepBuilderAPI_Command;
  BRepBuilderAPI_ModifyShape: typeof BRepBuilderAPI_ModifyShape;
  BRepBuilderAPI_MakeShape: typeof BRepBuilderAPI_MakeShape;
  BRepBuilderAPI_Sewing: typeof BRepBuilderAPI_Sewing;
  BRepBuilderAPI_MakeSolid: typeof BRepBuilderAPI_MakeSolid;
  BRepBuilderAPI_MakeSolid_1: typeof BRepBuilderAPI_MakeSolid_1;
  BRepBuilderAPI_MakeSolid_2: typeof BRepBuilderAPI_MakeSolid_2;
  BRepBuilderAPI_MakeSolid_3: typeof BRepBuilderAPI_MakeSolid_3;
  BRepBuilderAPI_MakeSolid_4: typeof BRepBuilderAPI_MakeSolid_4;
  BRepBuilderAPI_MakeSolid_5: typeof BRepBuilderAPI_MakeSolid_5;
  BRepBuilderAPI_MakeSolid_6: typeof BRepBuilderAPI_MakeSolid_6;
  BRepBuilderAPI_MakeSolid_7: typeof BRepBuilderAPI_MakeSolid_7;
  BRepBuilderAPI_MakeFace: typeof BRepBuilderAPI_MakeFace;
  BRepBuilderAPI_MakeFace_1: typeof BRepBuilderAPI_MakeFace_1;
  BRepBuilderAPI_MakeFace_2: typeof BRepBuilderAPI_MakeFace_2;
  BRepBuilderAPI_MakeFace_3: typeof BRepBuilderAPI_MakeFace_3;
  BRepBuilderAPI_MakeFace_4: typeof BRepBuilderAPI_MakeFace_4;
  BRepBuilderAPI_MakeFace_5: typeof BRepBuilderAPI_MakeFace_5;
  BRepBuilderAPI_MakeFace_6: typeof BRepBuilderAPI_MakeFace_6;
  BRepBuilderAPI_MakeFace_7: typeof BRepBuilderAPI_MakeFace_7;
  BRepBuilderAPI_MakeFace_8: typeof BRepBuilderAPI_MakeFace_8;
  BRepBuilderAPI_MakeFace_9: typeof BRepBuilderAPI_MakeFace_9;
  BRepBuilderAPI_MakeFace_10: typeof BRepBuilderAPI_MakeFace_10;
  BRepBuilderAPI_MakeFace_11: typeof BRepBuilderAPI_MakeFace_11;
  BRepBuilderAPI_MakeFace_12: typeof BRepBuilderAPI_MakeFace_12;
  BRepBuilderAPI_MakeFace_13: typeof BRepBuilderAPI_MakeFace_13;
  BRepBuilderAPI_MakeFace_14: typeof BRepBuilderAPI_MakeFace_14;
  BRepBuilderAPI_MakeFace_15: typeof BRepBuilderAPI_MakeFace_15;
  BRepBuilderAPI_MakeFace_16: typeof BRepBuilderAPI_MakeFace_16;
  BRepBuilderAPI_MakeFace_17: typeof BRepBuilderAPI_MakeFace_17;
  BRepBuilderAPI_MakeFace_18: typeof BRepBuilderAPI_MakeFace_18;
  BRepBuilderAPI_MakeFace_19: typeof BRepBuilderAPI_MakeFace_19;
  BRepBuilderAPI_MakeFace_20: typeof BRepBuilderAPI_MakeFace_20;
  BRepBuilderAPI_MakeFace_21: typeof BRepBuilderAPI_MakeFace_21;
  BRepBuilderAPI_MakeFace_22: typeof BRepBuilderAPI_MakeFace_22;
  BRepBuilderAPI_MakeWire: typeof BRepBuilderAPI_MakeWire;
  BRepBuilderAPI_MakeWire_1: typeof BRepBuilderAPI_MakeWire_1;
  BRepBuilderAPI_MakeWire_2: typeof BRepBuilderAPI_MakeWire_2;
  BRepBuilderAPI_MakeWire_3: typeof BRepBuilderAPI_MakeWire_3;
  BRepBuilderAPI_MakeWire_4: typeof BRepBuilderAPI_MakeWire_4;
  BRepBuilderAPI_MakeWire_5: typeof BRepBuilderAPI_MakeWire_5;
  BRepBuilderAPI_MakeWire_6: typeof BRepBuilderAPI_MakeWire_6;
  BRepBuilderAPI_MakeWire_7: typeof BRepBuilderAPI_MakeWire_7;
  BRepCheck_Analyzer: typeof BRepCheck_Analyzer;
  IGESControl_Reader: typeof IGESControl_Reader;
  IGESControl_Reader_1: typeof IGESControl_Reader_1;
  IGESControl_Reader_2: typeof IGESControl_Reader_2;
  STEPControl_StepModelType: STEPControl_StepModelType;
  STEPControl_Writer: typeof STEPControl_Writer;
  STEPControl_Writer_1: typeof STEPControl_Writer_1;
  STEPControl_Writer_2: typeof STEPControl_Writer_2;
  STEPControl_Reader: typeof STEPControl_Reader;
  STEPControl_Reader_1: typeof STEPControl_Reader_1;
  STEPControl_Reader_2: typeof STEPControl_Reader_2;
  StlAPI_Reader: typeof StlAPI_Reader;
  StlAPI_Writer: typeof StlAPI_Writer;
  IFSelect_WorkSession: typeof IFSelect_WorkSession;
  IFSelect_ReturnStatus: IFSelect_ReturnStatus;
  Transfer_TransientProcess: typeof Transfer_TransientProcess;
  Transfer_ProcessForTransient: typeof Transfer_ProcessForTransient;
  Transfer_ProcessForTransient_1: typeof Transfer_ProcessForTransient_1;
  Transfer_ProcessForTransient_2: typeof Transfer_ProcessForTransient_2;
  XSControl_Reader: typeof XSControl_Reader;
  XSControl_Reader_1: typeof XSControl_Reader_1;
  XSControl_Reader_2: typeof XSControl_Reader_2;
  XSControl_Reader_3: typeof XSControl_Reader_3;
  XSControl_WorkSession: typeof XSControl_WorkSession;
};

declare function init(): Promise<OpenCascadeInstance>;

export default init;
