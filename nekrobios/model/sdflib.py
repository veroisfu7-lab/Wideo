# SDF-скульпт на numpy: примитивы, сетка, marching cubes, упрощение, экспорт и быстрый превью-рейтрейсер.
import json, struct, numpy as np
from skimage import measure
import pyfqmr

f32 = np.float32

def V(*a):
    return np.array(a, dtype=f32)

def length(p):
    return np.sqrt(np.sum(p * p, axis=-1))

def sph(P, c, r):
    return length(P - c) - r

def ell(P, c, r):
    r = np.asarray(r, dtype=f32)
    q = (P - c)
    k0 = length(q / r)
    k1 = length(q / (r * r))
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)

def rot(axis, ang):
    axis = np.asarray(axis, dtype=np.float64); axis = axis / np.linalg.norm(axis)
    x, y, z = axis; c, s = np.cos(ang), np.sin(ang); C = 1 - c
    return np.array([[c + x*x*C, x*y*C - z*s, x*z*C + y*s], [y*x*C + z*s, c + y*y*C, y*z*C - x*s], [z*x*C - y*s, z*y*C + x*s, c + z*z*C]], dtype=f32)

def ellR(P, c, r, R):
    # эллипсоид, повёрнутый матрицей R (локальные оси = столбцы R)
    q = (P - c) @ R
    return ell(q, V(0, 0, 0), r)

def cap(P, a, b, ra, rb=None):
    # круглый конус (капсула с разными радиусами), iq
    if rb is None: rb = ra
    a = np.asarray(a, f32); b = np.asarray(b, f32)
    ba = b - a; l2 = float(np.dot(ba, ba)); rr = ra - rb; a2 = l2 - rr * rr; il2 = 1.0 / l2
    pa = P - a
    y = pa @ ba
    z = y - l2
    xv = pa * l2 - y[..., None] * ba
    x2 = np.sum(xv * xv, axis=-1)
    y2 = y * y * l2; z2 = z * z * l2
    k = np.sign(rr) * rr * rr * x2
    out = np.empty_like(y)
    m1 = np.sign(z) * a2 * z2 > k
    m2 = np.sign(y) * a2 * y2 < k
    out[m1] = np.sqrt(x2[m1] + z2[m1]) * il2 - rb
    m2 = m2 & ~m1
    out[m2] = np.sqrt(x2[m2] + y2[m2]) * il2 - ra
    m3 = ~(m1 | m2)
    out[m3] = (np.sqrt(x2[m3] * a2 * il2) + y[m3] * rr) * il2 - ra
    return out

def seg_t(P, a, b):
    a = np.asarray(a, f32); b = np.asarray(b, f32); ba = b - a
    return np.clip(((P - a) @ ba) / float(np.dot(ba, ba)), 0, 1)

def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)

def smax(a, b, k):
    return -smin(-a, -b, k)

def rbox(P, c, half, r, R=None):
    q = P - c
    if R is not None: q = q @ R
    q = np.abs(q) - (np.asarray(half, f32) - r)
    return length(np.maximum(q, 0)) + np.minimum(np.max(q, axis=-1), 0) - r

def vnoise3(P, freq, seed=0):
    # гладкий value-noise (трилинейный с smoothstep), детерминированный
    p = P * freq + seed * 17.13
    i = np.floor(p); f = p - i
    u = f * f * (3 - 2 * f)
    def h(ix, iy, iz):
        n = (ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791) ^ (seed * 2654435761 & 0x7fffffff)
        n = (n ^ (n >> 13)) * 1274126177
        return ((n & 0xffff).astype(f32) / 65535.0) * 2 - 1
    i = i.astype(np.int64)
    ix, iy, iz = i[..., 0], i[..., 1], i[..., 2]
    r = 0
    for dx in (0, 1):
        wx = u[..., 0] if dx else 1 - u[..., 0]
        for dy in (0, 1):
            wy = u[..., 1] if dy else 1 - u[..., 1]
            for dz in (0, 1):
                wz = u[..., 2] if dz else 1 - u[..., 2]
                r = r + wx * wy * wz * h(ix + dx, iy + dy, iz + dz)
    return r.astype(f32)

def fbm(P, freq, oct=3, seed=0):
    s = 0; a = 1.0; tot = 0
    for o in range(oct):
        s = s + a * vnoise3(P, freq * (2 ** o), seed + o * 7); tot += a; a *= 0.5
    return s / tot

# ------------------------------------------------------------------ сетка и mesh
def grid_eval(fn, lo, hi, h, chunk=2_000_000):
    lo = np.asarray(lo, f32); hi = np.asarray(hi, f32)
    n = np.ceil((hi - lo) / h).astype(int) + 1
    xs = lo[0] + np.arange(n[0], dtype=f32) * h
    ys = lo[1] + np.arange(n[1], dtype=f32) * h
    zs = lo[2] + np.arange(n[2], dtype=f32) * h
    vol = np.empty((n[0], n[1], n[2]), dtype=f32)
    per = max(1, chunk // (n[1] * n[2]))
    for i0 in range(0, n[0], per):
        i1 = min(n[0], i0 + per)
        X, Y, Z = np.meshgrid(xs[i0:i1], ys, zs, indexing="ij")
        P = np.stack([X, Y, Z], axis=-1).reshape(-1, 3)
        vol[i0:i1] = fn(P).reshape(i1 - i0, n[1], n[2])
    return vol, lo

def grid_eval_nb(fn, lo, hi, h, coarse=4):
    # узкая полоса: грубая сетка, тонкая — только около поверхности
    from scipy.ndimage import zoom
    lo = np.asarray(lo, f32); hi = np.asarray(hi, f32)
    n = np.ceil((hi - lo) / h).astype(int) + 1
    hc = h * coarse
    vc, _ = grid_eval(fn, lo, lo + (np.ceil((n - 1) / coarse) * coarse) * h, hc)
    up = zoom(vc, coarse, order=1)[: n[0], : n[1], : n[2]]
    if up.shape != tuple(n):
        pad = [(0, n[i] - up.shape[i]) for i in range(3)]; up = np.pad(up, pad, mode="edge")
    band = np.abs(up) < hc * 1.6
    idx = np.nonzero(band)
    P = (np.stack(idx, axis=-1).astype(f32) * h + lo)
    out = up.astype(f32)
    for i in range(0, len(P), 2_000_000):
        out[idx[0][i:i+2000000], idx[1][i:i+2000000], idx[2][i:i+2000000]] = fn(P[i:i+2000000])
    return out, lo

def mesh_from(fn, lo, hi, h, target=None, project=True, agg=7, nb=True):
    vol, lo = (grid_eval_nb if nb else grid_eval)(fn, lo, hi, h)
    v, f, _, _ = measure.marching_cubes(vol, level=0.0, spacing=(h, h, h))
    v = (v + lo).astype(f32)
    f = f.astype(np.int32)  # skimage уже даёт обход против часовой снаружи
    if target and len(f) > target:
        s = pyfqmr.Simplify(); s.setMesh(v.astype(np.float64), f)
        s.simplify_mesh(target_count=target, aggressiveness=agg, preserve_border=True, verbose=False)
        v, f, _ = s.getMesh(); v = v.astype(f32); f = f.astype(np.int32)
    if project:
        for _ in range(2):
            d = fn(v); n = grad(fn, v)
            v = v - d[:, None] * n
    n = grad(fn, v)
    return v, f, n

def grad(fn, P, e=2e-4):
    ex = V(e, 0, 0); ey = V(0, e, 0); ez = V(0, 0, e)
    g = np.stack([fn(P + ex) - fn(P - ex), fn(P + ey) - fn(P - ey), fn(P + ez) - fn(P - ez)], axis=-1)
    return g / np.maximum(length(g)[:, None], 1e-9)

def mesh_normals(v, f):
    n = np.zeros_like(v)
    fn = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
    for k in range(3): np.add.at(n, f[:, k], fn)
    return n / np.maximum(length(n)[:, None], 1e-12)

def ao_bake(fn, v, n, dists=(0.004, 0.008, 0.016, 0.03), k=1.0):
    occ = np.zeros(len(v), f32); w = 1.0; tot = 0
    for d in dists:
        s = fn(v + n * d)
        occ += w * np.clip((d - s) / d, 0, 1); tot += w; w *= 0.7
    return np.clip(1 - k * occ / tot, 0, 1).astype(f32)

# ------------------------------------------------------------------ экспорт
class Pack:
    """Один .bin + .json: набор мешей с атрибутами."""
    def __init__(self): self.meshes = {}; self.extra = {}
    def add(self, name, v, f, n, **attrs):
        self.meshes[name] = dict(position=v.astype(f32), normal=n.astype(f32), index=f.astype(np.uint32).ravel(), **attrs)
    def save(self, path):
        blobs = []; off = 0; meta = {"meshes": {}, "extra": self.extra}
        for name, m in self.meshes.items():
            mm = {}
            for k, a in m.items():
                if isinstance(a, dict):  # morphs: {name: (dpos, dnorm)}
                    mm[k] = {}
                    for mn, (dp, dn) in a.items():
                        for kk, arr in (("p", dp), ("n", dn)):
                            arr = np.ascontiguousarray(arr.astype(f32)); b = arr.tobytes()
                            mm[k].setdefault(mn, {})[kk] = {"off": off, "len": arr.size, "type": "f32"}
                            blobs.append(b); off += len(b)
                    continue
                arr = np.ascontiguousarray(a)
                t = {np.dtype(np.float32): "f32", np.dtype(np.uint32): "u32", np.dtype(np.uint16): "u16", np.dtype(np.uint8): "u8"}[arr.dtype]
                b = arr.tobytes(); pad = (-len(b)) % 4
                mm[k] = {"off": off, "len": arr.size, "type": t, "item": (arr.shape[1] if arr.ndim > 1 else 1)}
                blobs.append(b + b"\0" * pad); off += len(b) + pad
            meta["meshes"][name] = mm
        open(path + ".bin", "wb").write(b"".join(blobs))
        json.dump(meta, open(path + ".json", "w"))
        print("saved", path, off // 1024, "KB", {k: len(m["position"]) for k, m in self.meshes.items()})

# ------------------------------------------------------------------ превью: сферический трейсинг
def preview(fn, path, views, W=260, H=340, fov=0.5, extra=None):
    import cv2
    imgs = []
    for (eye, target) in views:
        eye = np.asarray(eye, f32); target = np.asarray(target, f32)
        fw = target - eye; fw /= np.linalg.norm(fw)
        rt = np.cross(fw, V(0, 1, 0)); rt /= np.linalg.norm(rt); up = np.cross(rt, fw)
        ys, xs = np.mgrid[0:H, 0:W].astype(f32)
        u = (xs / W - 0.5) * 2 * fov * W / H; vv = -(ys / H - 0.5) * 2 * fov
        D = fw[None] + u.reshape(-1, 1) * rt[None] + vv.reshape(-1, 1) * up[None]
        D /= length(D)[:, None]
        t = np.zeros(len(D), f32); hit = np.zeros(len(D), bool); alive = np.ones(len(D), bool)
        for it in range(90):
            idx = np.where(alive)[0]
            if len(idx) == 0: break
            P = eye + D[idx] * t[idx, None]
            d = fn(P)
            t[idx] += d * 0.9
            h = d < 1e-4; hit[idx[h]] = True; alive[idx[h]] = False
            far = t[idx] > 4.0; alive[idx[far]] = False
        img = np.zeros((H * W, 3), f32) + 0.08
        idx = np.where(hit)[0]
        P = eye + D[idx] * t[idx, None]
        N = grad(fn, P)
        L1 = V(0.5, 0.6, 0.6); L1 /= np.linalg.norm(L1)
        L2 = V(-0.7, 0.2, -0.5); L2 /= np.linalg.norm(L2)
        dif = np.clip(N @ L1, 0, 1)
        rim = np.clip(N @ L2, 0, 1) * 0.4
        ao = ao_bake(fn, P, N)
        c = (0.12 + 0.8 * dif[:, None] * V(1.0, 0.85, 0.72) + rim[:, None] * V(0.5, 0.7, 1.0)) * ao[:, None]
        if extra is not None: c = c * extra(P)
        img[idx] = c
        img = (np.clip(img, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8).reshape(H, W, 3)
        imgs.append(img[:, :, ::-1])
    cv2.imwrite(path, np.concatenate(imgs, axis=1))
