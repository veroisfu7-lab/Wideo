// Загрузка мешей из public/assets/*.bin + .json (собраны Python-скриптами в model/).
import * as THREE from "three";
import { staticFile } from "remotion";

type Field = { off: number; len: number; type: string; item?: number };
type MeshMeta = Record<string, any>;

const arr = (buf: ArrayBuffer, f: Field) => {
  if (f.type === "f32") return new Float32Array(buf, f.off, f.len);
  if (f.type === "u32") return new Uint32Array(buf, f.off, f.len);
  if (f.type === "u16") return new Uint16Array(buf, f.off, f.len);
  return new Uint8Array(buf, f.off, f.len);
};

export type Pack = { geos: Record<string, THREE.BufferGeometry>; extra: any };

export async function loadPack(name: string): Promise<Pack> {
  const [meta, buf] = await Promise.all([
    fetch(staticFile(`assets/${name}.json`)).then((r) => r.json()),
    fetch(staticFile(`assets/${name}.bin`)).then((r) => r.arrayBuffer()),
  ]);
  const geos: Record<string, THREE.BufferGeometry> = {};
  for (const [mname, m] of Object.entries(meta.meshes as Record<string, MeshMeta>)) {
    const g = new THREE.BufferGeometry();
    for (const [k, f] of Object.entries(m)) {
      if (k === "morph") continue;
      const a = arr(buf, f as Field);
      if (k === "index") { g.setIndex(new THREE.BufferAttribute(a, 1)); continue; }
      const item = (f as Field).item ?? 1;
      if (k === "skinIndex") g.setAttribute(k, new THREE.Uint16BufferAttribute(a as Uint16Array, item));
      else g.setAttribute(k, new THREE.BufferAttribute(a, item));
    }
    if (m.morph) {
      const pos: THREE.BufferAttribute[] = [], nor: THREE.BufferAttribute[] = [];
      const names: Record<string, number> = {};
      let i = 0;
      for (const [mn, mf] of Object.entries(m.morph as Record<string, any>)) {
        const p = new THREE.BufferAttribute(arr(buf, mf.p), 3); p.name = mn; pos.push(p);
        const n = new THREE.BufferAttribute(arr(buf, mf.n), 3); n.name = mn; nor.push(n);
        names[mn] = i++;
      }
      g.morphAttributes.position = pos; g.morphAttributes.normal = nor; g.morphTargetsRelative = true;
      (g.userData as any).morphNames = names;
    }
    g.computeBoundingSphere(); g.computeBoundingBox();
    geos[mname] = g;
  }
  return { geos, extra: meta.extra };
}

export async function loadJSON(name: string) {
  return fetch(staticFile(`assets/${name}`)).then((r) => r.json());
}
