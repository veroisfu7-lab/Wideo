// Персонаж: скелет из rig.json, скиннинг-меши (худи, джинсы, кеды, кисти), голова с блендшейпами, волосы, зубы, глаза.
// Позинг: локальные повороты костей (оси мира в позе покоя), IK для рук и ног, сгибание пальцев.
import * as THREE from "three";
import { Pack } from "./assets";
import { eyeMaterial, fabricMaterial, hairMaterial, shoeMaterial, skinMaterial, teethMaterial } from "./materials";

export type Rig = { bones: { name: string; parent: string | null; head: number[]; tail: number[] }[]; handFrameL: number[][]; handFrameR: number[][] };

const v3 = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2]);
const D2R = Math.PI / 180;

export const HEAD_ORIGIN = new THREE.Vector3(0, 1.68, 0.0); // начало координат меша головы (уровень глаз) в позе покоя

export type FingerPose = { curl: number; spread?: number; tip?: number }; // градусы
export type HandPose = { thumb: FingerPose; index: FingerPose; middle: FingerPose; ring: FingerPose; pinky: FingerPose };
export const HANDS: Record<string, HandPose> = {
  relaxed: { thumb: { curl: 12 }, index: { curl: 14 }, middle: { curl: 18 }, ring: { curl: 22 }, pinky: { curl: 26 } },
  fist: { thumb: { curl: 50, spread: -10 }, index: { curl: 85 }, middle: { curl: 88 }, ring: { curl: 90 }, pinky: { curl: 92 } },
  grip: { thumb: { curl: 35, spread: -15 }, index: { curl: 62 }, middle: { curl: 66 }, ring: { curl: 70 }, pinky: { curl: 72 } },
  phone: { thumb: { curl: 18, spread: 8 }, index: { curl: 38 }, middle: { curl: 44 }, ring: { curl: 50 }, pinky: { curl: 55 } },
  point: { thumb: { curl: 40, spread: -12 }, index: { curl: 4 }, middle: { curl: 80 }, ring: { curl: 86 }, pinky: { curl: 88 } },
  flat: { thumb: { curl: 4, spread: 12 }, index: { curl: 2, spread: 4 }, middle: { curl: 2 }, ring: { curl: 3, spread: -4 }, pinky: { curl: 4, spread: -9 } },
  claw: { thumb: { curl: 30, spread: 15 }, index: { curl: 45, tip: 50 }, middle: { curl: 48, tip: 55 }, ring: { curl: 50, tip: 55 }, pinky: { curl: 52, tip: 58 } },
  rag: { thumb: { curl: 16, spread: -8 }, index: { curl: 14, spread: -2 }, middle: { curl: 15 }, ring: { curl: 17, spread: 2 }, pinky: { curl: 19, spread: 3 } },
};
export const mixHand = (a: HandPose, b: HandPose, t: number): HandPose => {
  const o: any = {};
  for (const k of Object.keys(a)) {
    const fa = (a as any)[k], fb = (b as any)[k];
    o[k] = { curl: fa.curl + (fb.curl - fa.curl) * t, spread: (fa.spread ?? 0) + ((fb.spread ?? 0) - (fa.spread ?? 0)) * t, tip: (fa.tip ?? fa.curl) + ((fb.tip ?? fb.curl) - (fa.tip ?? fa.curl)) * t };
  }
  return o;
};

export class Character {
  root = new THREE.Group();
  bones: Record<string, THREE.Bone> = {};
  rest: Record<string, { head: THREE.Vector3; tail: THREE.Vector3 }> = {};
  skeleton: THREE.Skeleton;
  meshes: THREE.Mesh[] = [];
  headGroup = new THREE.Group();
  head: THREE.Mesh; hair: THREE.Mesh; teeth: THREE.Mesh; eyes: THREE.Mesh[] = [];
  eyeRest: THREE.Vector3[] = [];
  U = { uMetal: { value: 0 }, uPale: { value: 0 }, uWet: { value: 0 } };
  EU = { uMetal: { value: 0 }, uPupil: { value: 0.2 }, uSil: { value: 0 }, uGlint: { value: 0 } };
  hf: Record<string, THREE.Matrix3> = {};
  morph: Record<string, number>;

  constructor(rig: Rig, body: Pack, headPack: Pack, public name: string) {
    const list: THREE.Bone[] = [];
    for (const b of rig.bones) {
      const bone = new THREE.Bone(); bone.name = b.name;
      this.bones[b.name] = bone; this.rest[b.name] = { head: v3(b.head), tail: v3(b.tail) };
      list.push(bone);
    }
    for (const b of rig.bones) {
      const bone = this.bones[b.name];
      if (b.parent) {
        this.bones[b.parent].add(bone);
        bone.position.copy(v3(b.head)).sub(v3(rig.bones.find((x) => x.name === b.parent)!.head));
      } else { this.root.add(bone); bone.position.copy(v3(b.head)); }
    }
    this.root.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(list);
    const m3 = (rows: number[][]) => new THREE.Matrix3().set(rows[0][0], rows[1][0], rows[2][0], rows[0][1], rows[1][1], rows[2][1], rows[0][2], rows[1][2], rows[2][2]);
    // handFrame хранится транспонированным (строки = оси X, Y, Z ладони)
    this.hf.L = m3(rig.handFrameL); this.hf.R = m3(rig.handFrameR);

    const mats: Record<string, THREE.Material> = {
      hoodie: fabricMaterial("hoodie"), pants: fabricMaterial("jeans"), shoes: shoeMaterial(),
      handL: skinMaterial("hand", this.U), handR: skinMaterial("hand", this.U),
    };
    for (const [k, g] of Object.entries(body.geos)) {
      const sm = new THREE.SkinnedMesh(g, mats[k]);
      sm.bind(this.skeleton, new THREE.Matrix4());
      sm.castShadow = true; sm.receiveShadow = true; sm.frustumCulled = false; sm.name = k;
      this.root.add(sm); this.meshes.push(sm);
    }
    // голова: жёстко к кости головы
    const hb = this.bones["head"];
    this.headGroup.position.copy(HEAD_ORIGIN).sub(this.rest["head"].head);
    hb.add(this.headGroup);
    this.head = new THREE.Mesh(headPack.geos.head, skinMaterial("head", this.U));
    this.hair = new THREE.Mesh(headPack.geos.hair, hairMaterial());
    this.teeth = new THREE.Mesh(headPack.geos.teeth, teethMaterial());
    for (const m of [this.head, this.hair, this.teeth]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; this.headGroup.add(m); this.meshes.push(m); }
    this.teeth.visible = false;
    (this.head as any).morphTargetInfluences = new Array(Object.keys(headPack.geos.head.userData.morphNames).length).fill(0);
    (this.teeth as any).morphTargetInfluences = [0];
    this.morph = {};
    const er = headPack.extra.eyeR as number;
    const eg = new THREE.SphereGeometry(er, 48, 32);
    const emat = eyeMaterial(this.EU);
    for (const c of headPack.extra.eyes as number[][]) {
      const e = new THREE.Mesh(eg, emat); e.position.set(c[0], c[1], c[2]); e.castShadow = false; e.receiveShadow = true;
      this.headGroup.add(e); this.eyes.push(e); this.eyeRest.push(e.position.clone()); this.meshes.push(e);
    }
  }

  setLayer(l: number) { this.root.traverse((o) => o.layers.set(l)); }

  // ------------------------------------------------------------------ позинг
  resetPose() { for (const b of Object.values(this.bones)) b.quaternion.identity(); }

  rotate(name: string, x: number, y = 0, z = 0) { // градусы, XYZ в осях мира покоя
    this.bones[name].quaternion.setFromEuler(new THREE.Euler(x * D2R, y * D2R, z * D2R, "YXZ"));
  }

  // мировой поворот кости → локальный
  setWorldQuat(name: string, qw: THREE.Quaternion) {
    const b = this.bones[name];
    const pq = new THREE.Quaternion();
    b.parent!.getWorldQuaternion(pq);
    b.quaternion.copy(pq.invert().multiply(qw));
  }
  worldQuat(name: string) { const q = new THREE.Quaternion(); this.bones[name].getWorldQuaternion(q); return q; }
  worldPos(name: string) { const p = new THREE.Vector3(); this.bones[name].getWorldPosition(p); return p; }

  // двухзвенный IK: кость a (плечо/бедро), b (локоть/колено), цель — мировая позиция конца b, pole — направление сгиба
  ik2(a: string, b: string, target: THREE.Vector3, pole: THREE.Vector3) {
    this.root.updateMatrixWorld(true);
    const ra = this.rest[a], rb = this.rest[b];
    const la = ra.tail.distanceTo(ra.head), lb = rb.tail.distanceTo(rb.head);
    const pa = this.worldPos(a);
    let d = target.clone().sub(pa); let dist = d.length();
    dist = Math.min(Math.max(dist, Math.abs(la - lb) + 1e-3), la + lb - 1e-4);
    d.normalize();
    const cosA = (la * la + dist * dist - lb * lb) / (2 * la * dist);
    const angA = Math.acos(THREE.MathUtils.clamp(cosA, -1, 1));
    // плоскость сгиба
    let pn = pole.clone().sub(d.clone().multiplyScalar(pole.dot(d)));
    if (pn.lengthSq() < 1e-8) pn = new THREE.Vector3(0, 0, 1);
    pn.normalize();
    const elbow = pa.clone().add(d.clone().multiplyScalar(Math.cos(angA) * la)).add(pn.clone().multiplyScalar(Math.sin(angA) * la));
    // мировой поворот a: rest-направление → (elbow - pa), с сохранением «крутки» через pole
    const restA = ra.tail.clone().sub(ra.head).normalize();
    const qa = aimQuat(restA, elbow.clone().sub(pa).normalize(), this.restPoleOf(a), pn);
    this.setWorldQuat(a, qa);
    this.root.updateMatrixWorld(true);
    const pb = this.worldPos(b);
    const restB = rb.tail.clone().sub(rb.head).normalize();
    const qb = aimQuat(restB, target.clone().sub(pb).normalize(), this.restPoleOf(b), pn);
    this.setWorldQuat(b, qb);
    this.root.updateMatrixWorld(true);
  }
  restPoleOf(name: string) {
    // направление сгиба в позе покоя (для рук — назад-наружу по локтю, для ног — вперёд по колену)
    if (name.startsWith("upperArm") || name.startsWith("foreArm")) return new THREE.Vector3(0, 0, -1);
    return new THREE.Vector3(0, 0, 1);
  }

  // ориентация кисти: мировой поворот так, чтобы ось пальцев X смотрела в fwd, тыльная сторона Y — в up
  aimHand(side: "L" | "R", fwd: THREE.Vector3, back: THREE.Vector3) {
    const M = this.hf[side].elements; // столбцы: X, Y, Z ладони в мире покоя
    const X0 = new THREE.Vector3(M[0], M[1], M[2]), Y0 = new THREE.Vector3(M[3], M[4], M[5]);
    const q = aimQuat(X0, fwd.clone().normalize(), Y0, back.clone().normalize());
    this.setWorldQuat("hand." + side, q);
  }

  setHand(side: "L" | "R", p: HandPose) {
    const M = this.hf[side].elements;
    const X = new THREE.Vector3(M[0], M[1], M[2]), Y = new THREE.Vector3(M[3], M[4], M[5]);
    const curlAxis = X.clone().cross(Y.clone().negate()).normalize();
    const spreadAxis = Y.clone().multiplyScalar(side === "L" ? 1 : -1);
    for (const f of ["thumb", "index", "middle", "ring", "pinky"] as const) {
      const fp = p[f];
      for (let k = 1; k <= 3; k++) {
        const b = this.bones[`${f}${k}.${side}`];
        let c = (k === 3 ? (fp.tip ?? fp.curl) : fp.curl) * (k === 1 ? 0.9 : k === 2 ? 1.05 : 0.8) * D2R;
        const q = new THREE.Quaternion();
        if (f === "thumb") {
          const ax = curlAxis.clone().multiplyScalar(0.55).add(X.clone().multiplyScalar(side === "L" ? -0.6 : 0.6)).normalize();
          q.setFromAxisAngle(ax, c * (k === 1 ? 0.6 : 1.0));
        } else q.setFromAxisAngle(curlAxis, c);
        if (k === 1 && fp.spread) q.premultiply(new THREE.Quaternion().setFromAxisAngle(spreadAxis, fp.spread * D2R));
        b.quaternion.copy(q);
      }
    }
  }

  setMorph(vals: Record<string, number>) {
    const names = this.head.geometry.userData.morphNames as Record<string, number>;
    const inf = (this.head as any).morphTargetInfluences as number[];
    for (const [k, v] of Object.entries(vals)) if (names[k] !== undefined) inf[names[k]] = v;
    if (vals.grin !== undefined) ((this.teeth as any).morphTargetInfluences as number[])[0] = vals.grin;
  }

  // взгляд: точка в мире
  lookEyes(target: THREE.Vector3 | null) {
    this.root.updateMatrixWorld(true);
    for (let i = 0; i < 2; i++) {
      const e = this.eyes[i];
      if (!target) { e.quaternion.identity(); continue; }
      const wp = new THREE.Vector3(); e.getWorldPosition(wp);
      const dirW = target.clone().sub(wp).normalize();
      const pq = new THREE.Quaternion(); this.headGroup.getWorldQuaternion(pq);
      const dl = dirW.applyQuaternion(pq.invert());
      // ограничение поворота глаз
      const yaw = THREE.MathUtils.clamp(Math.atan2(dl.x, dl.z), -0.5, 0.5);
      const pitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(dl.y, -1, 1)), -0.35, 0.35);
      e.quaternion.setFromEuler(new THREE.Euler(-pitch, yaw, 0, "YXZ"));
    }
  }
}

// поворот, переводящий a0→a1 и при этом (по возможности) p0→p1 (перпендикулярные «полюса»)
export function aimQuat(a0: THREE.Vector3, a1: THREE.Vector3, p0: THREE.Vector3, p1: THREE.Vector3) {
  const z0 = a0.clone().normalize(), z1 = a1.clone().normalize();
  const x0 = p0.clone().sub(z0.clone().multiplyScalar(p0.dot(z0))).normalize();
  const x1 = p1.clone().sub(z1.clone().multiplyScalar(p1.dot(z1)));
  if (x1.lengthSq() < 1e-8) return new THREE.Quaternion().setFromUnitVectors(z0, z1);
  x1.normalize();
  const y0 = z0.clone().cross(x0), y1 = z1.clone().cross(x1);
  const m0 = new THREE.Matrix4().makeBasis(x0, y0, z0), m1 = new THREE.Matrix4().makeBasis(x1, y1, z1);
  const q0 = new THREE.Quaternion().setFromRotationMatrix(m0), q1 = new THREE.Quaternion().setFromRotationMatrix(m1);
  return q1.multiply(q0.invert());
}
