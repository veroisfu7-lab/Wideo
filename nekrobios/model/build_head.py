# Сборка меша головы, волос, зубов + блендшейпы (деформации нейтрального меша).
import numpy as np, time
from sdflib import *
from head import head_sdf, hair_sdf, lips, EYE_C, EYE_R

t0 = time.time()
face = lambda P: head_sdf(P)
under = lambda P: head_sdf(P, with_slit=False, lips_on=False)   # «подложка» без губ для скольжения по лицу
v, f, n = mesh_from(face, (-0.105, -0.245, -0.135), (0.105, 0.135, 0.135), 0.0008, target=90000)
print("head", len(v), len(f), time.time() - t0)
nb = mesh_normals(v, f)

def slide(P, d0, iters=3):
    # вернуть точки на поверхность подложки с исходным отступом d0
    for _ in range(iters):
        d = under(P); g = grad(under, P)
        P = P - (d - d0)[:, None] * g
    return P

def eye_frame(P, c):
    q = P - c; r = length(q)
    sx = np.sign(c[0]); lx = q[:, 0] * sx
    phi = np.arctan2(q[:, 1], np.maximum(q[:, 2], 1e-5))
    xx = np.clip((lx + 0.0012) / 0.0145, -1.2, 1.2)
    half = 0.38 * np.sqrt(np.clip(1 - xx * xx, 0, 1)) + 0.02
    mid = 0.04 + 0.05 * xx
    return q, r, phi, half, mid

def rotx_about(P, c, ang):
    q = P - c; ca, sa = np.cos(ang), np.sin(ang)
    y = q[:, 1] * ca - q[:, 2] * sa; z = q[:, 1] * sa + q[:, 2] * ca
    out = P.copy(); out[:, 1] = c[1] + y; out[:, 2] = c[2] + z; return out

def ss(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

def lids(P, up_amt, low_amt):
    out = P.copy()
    for c in EYE_C:
        q, r, phi, half, mid = eye_frame(P, c)
        front = ss(-0.004, 0.004, q[:, 2])
        wr = 1 - ss(0.0150, 0.0235, r)
        upper = ss(mid - 0.10, mid + 0.06, phi)
        lower = 1 - ss(mid - 0.06, mid + 0.10, phi)
        ang_u = -up_amt * 1.72 * half * wr * upper * front
        ang_l = low_amt * 0.30 * half * wr * lower * front
        sel = (wr * front) > 0
        tmp = out[sel]
        a = (ang_u + ang_l)[sel]
        qq = tmp - c; ca, sa = np.cos(a), np.sin(a)
        y = qq[:, 1] * ca + qq[:, 2] * sa * -1 * -1
        # вращение вокруг оси x: положит. угол поднимает переднюю точку (y растёт)
        y = qq[:, 1] * ca + qq[:, 2] * sa
        z = -qq[:, 1] * sa + qq[:, 2] * ca
        tmp[:, 1] = c[1] + y; tmp[:, 2] = c[2] + z
        out[sel] = tmp
    return out

def blink(P):
    return lids(P, 1.0, 1.0)

def wide(P):
    # глаза шире + брови вверх (страх)
    out = lids(P, -0.32, 0.0)
    Q = np.abs(out[:, 0])
    w = ss(0.008, 0.02, out[:, 1]) * (1 - ss(0.06, 0.09, out[:, 1])) * ss(0.03, 0.07, out[:, 2]) * (1 - ss(0.05, 0.075, Q))
    out[:, 1] += 0.0045 * w
    # внутренние концы бровей вверх
    w2 = np.exp(-(((Q - 0.012) / 0.012) ** 2 + ((out[:, 1] - 0.03) / 0.015) ** 2)) * ss(0.05, 0.08, out[:, 2])
    out[:, 1] += 0.0025 * w2
    return out

def jaw(P, ang=0.20):
    piv = V(0, -0.012, -0.020)
    y, z = P[:, 1], P[:, 2]
    th = np.arctan2(P[:, 0], P[:, 2] - 0.047)
    yslit = -0.0655 - 0.0022 * np.clip(np.abs(th) / 0.5, 0, 1) ** 2
    a_ = np.abs(th)
    w_c = ss(yslit + 0.0006, yslit - 0.004, y)                     # у щели — резко (губы расходятся)
    w_s = ss(yslit + 0.008, yslit - 0.03, y)                       # за уголками рта — плавно (без шва)
    bl = ss(0.36, 0.52, a_)
    w = w_c * (1 - bl) + w_s * bl
    w *= 1 - ss(0.95, 1.45, a_)                                      # к ушам — ноль
    w *= ss(-0.03, 0.03, z)                                          # спереди
    w *= 1 - ss(-0.14, -0.20, y) * 0                                 # шея
    w = np.where(y < -0.115, w * (1 - ss(-0.115, -0.16, y)), w)      # горло — мягко
    out = P.copy()
    q = P - piv; a = -ang * w
    ca, sa = np.cos(a), np.sin(a)
    out[:, 1] = piv[1] + q[:, 1] * ca - q[:, 2] * sa
    out[:, 2] = piv[2] + q[:, 1] * sa + q[:, 2] * ca
    return out

def mouth_map(P, stretch=3.0, lift=0.022, gap=0.0065, out_th=1.42):
    # улыбка «до ушей»: растяжка по углу вокруг зубной дуги + подъём уголков + раскрытие губ
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    zc = 0.047
    th = np.arctan2(x, z - zc); rho = np.sqrt(x * x + (z - zc) ** 2)
    thc = 0.45
    yslit = -0.0655 - 0.0022 * np.clip(np.abs(th) / 0.5, 0, 1) ** 2
    a = np.abs(th)
    m = np.where(a < thc, a * stretch, thc * stretch + (a - thc) * (1.75 - thc * stretch) / (1.75 - thc))
    m = np.where(a > 1.75, a, m)
    wy = np.exp(-(((y - yslit) / 0.026) ** 2))
    wz = ss(-0.01, 0.03, z)
    w = wy * wz
    th2 = np.sign(th) * (a + (m - a) * w)
    rho2 = rho
    out = np.stack([np.sin(th2) * rho2, y, zc + np.cos(th2) * rho2], axis=-1).astype(f32)
    tt = np.clip(np.abs(th2) / (thc * stretch), 0, 1.3)
    out[:, 1] += lift * tt ** 2 * w
    g = gap * np.cos(np.clip(a / thc, 0, 1) * np.pi / 2) * w
    out[:, 1] += 0.5 * g * np.tanh((y - yslit) / 0.0012)
    return out, w

def grin(P):
    d0 = under(P) - 0.0  # исходный отступ от подложки
    d0 = np.clip(d0, -0.02, 0.012)
    out, w = mouth_map(P)
    sel = w > 0.02
    o2 = out.copy()
    o2[sel] = slide(out[sel], d0[sel])
    # вблизи щели — не проецировать (внутренность рта)
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    th = np.arctan2(x, z - 0.047); rho = np.sqrt(x * x + (z - 0.047) ** 2)
    inside = (rho < 0.0445) & (np.abs(y + 0.0655) < 0.0035) & (np.abs(th) < 0.47)
    o2[inside] = out[inside]
    # щёки втягиваются (жуткая натяжка)
    return o2

def pucker(P):
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    zc = 0.047
    th = np.arctan2(x, z - zc); rho = np.sqrt(x * x + (z - zc) ** 2)
    w = np.exp(-(((y + 0.065) / 0.012) ** 2 + (th / 0.55) ** 2)) * ss(0.0, 0.03, z)
    th2 = th * (1 - 0.28 * w); rho2 = rho + 0.0035 * w
    return np.stack([np.sin(th2) * rho2, y, zc + np.cos(th2) * rho2], axis=-1).astype(f32)

morphs = {}
for name, fn in (("blink", blink), ("wide", wide), ("jaw", jaw), ("grin", grin), ("pucker", pucker)):
    t1 = time.time()
    vm = fn(v)
    nm = mesh_normals(vm, f)
    morphs[name] = (vm - v, nm - nb)
    print(name, "max d", float(np.abs(vm - v).max()), time.time() - t1)

# волосы
vh, fh, nh = mesh_from(hair_sdf, (-0.1, -0.09, -0.135), (0.1, 0.14, 0.13), 0.0009, target=50000)
# убрать волосы, ушедшие внутрь кожи (не видны) — оставить как есть, шейдер справится
print("hair", len(vh))

# зубы: дуга верхних и нижних
def teeth_sdf(P):
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    zc = 0.047
    th = np.arctan2(x, z - zc); rho = np.sqrt(x * x + (z - zc) ** 2)
    k = 26.0
    cell = (np.round(th * k) / k)
    lt = (th - cell) * rho
    up = np.sqrt(lt ** 2 / 0.6 + (rho - 0.0375) ** 2 * 1.0) - 0.0028
    up = np.maximum(up, np.abs(y + 0.0610) - 0.0048)
    lo_ = np.sqrt(lt ** 2 / 0.6 + (rho - 0.0360) ** 2) - 0.0026
    lo_ = np.maximum(lo_, np.abs(y + 0.0712) - 0.0042)
    d = np.minimum(up, lo_)
    d = np.maximum(d, np.abs(th) - 0.62)
    return d
vt, ft, nt = mesh_from(teeth_sdf, (-0.05, -0.08, 0.0), (0.05, -0.054, 0.09), 0.0004, target=20000, nb=False)
print("teeth", len(vt))
# зубы для ухмылки: та же карта, без раскрытия губ по зубам, отступ под кожу
vg, _ = mouth_map(vt, gap=0.0)
y = vt[:, 1]
vg[:, 1] += np.where(y > -0.066, 0.0032, -0.0032)
tm = {"grin": (vg - vt, mesh_normals(vg, ft) - mesh_normals(vt, ft))}

# маски для шейдера кожи: брови, губы, полость рта, щетина
from head import lips as lips_fn
ax = np.abs(v[:, 0]); y = v[:, 1]; z = v[:, 2]
bx = np.clip((ax - 0.008) / 0.044, 0, 1)
by = 0.020 + 0.0075 * np.sin(bx * 2.6) - 0.002 * bx
bw = 0.0036 - 0.0016 * bx
brow = (1 - ss(0.55, 1.0, np.abs(y - by) / bw)) * (ax < 0.054) * ss(0.006, 0.013, ax) * ss(0.055, 0.07, z)
dl, th, rho = lips_fn(v)
lipm = (1 - ss(0.0005, 0.0025, dl)) * (np.abs(th) < 0.47) * ss(0.036, 0.041, rho)
cav = ((rho < 0.0435) & (np.abs(y + 0.0655) < 0.0045) & (np.abs(th) < 0.48)).astype(np.float32)
jawm = ss(-0.03, -0.06, y) * ss(-0.14, -0.105, y) * ss(0.0, 0.04, z) * (1 - lipm)
mus = np.exp(-((y + 0.0515) / 0.0055) ** 2) * (1 - ss(0.02, 0.03, ax)) * ss(0.08, 0.09, z) * (1 - lipm)
stub = np.clip(jawm + mus, 0, 1)
mask = np.stack([brow, lipm, cav, stub], -1).astype(np.float32)
print("mask counts", [int((mask[:, i] > 0.5).sum()) for i in range(4)])
pk = Pack()
pk.add("head", v, f, n, morph=morphs, mask=mask, ao=ao_bake(face, v, n, dists=(0.002, 0.005, 0.01, 0.02)))
pk.add("hair", vh, fh, nh, ao=ao_bake(lambda P: np.minimum(hair_sdf(P), face(P)), vh, nh, dists=(0.002, 0.005, 0.01, 0.02)))
pk.add("teeth", vt, ft, nt, morph=tm, ao=np.ones(len(vt), np.float32))
pk.extra = {"eyeR": EYE_R, "eyes": [c.tolist() for c in EYE_C]}
pk.save("../public/assets/head")
print("total", time.time() - t0)
