// Движок кадра: рендерер, окружение, мастерская, зеркало, герой и его двойник, реквизит; проходы: тени → отражение → сцена → пост.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { loadJSON, loadPack, Pack } from "./assets";
import { Character, Rig } from "./character";
import { Mirror, LAYER } from "./mirror";
import { Post, PostParams, defaultPost } from "./post";
import { World, LAMP } from "./world";
import { bronzeMat, metalMat } from "./world";
import { patch, withAO } from "./materials";
import { Claw, Droplets, Folder } from "./extras";
import { fontsReady } from "../fonts";

export type Hud = Record<string, any>;

export class Engine {
  r: THREE.WebGLRenderer; post: Post; scene = new THREE.Scene(); cam: THREE.PerspectiveCamera;
  world!: World; mirror!: Mirror; hero!: Character; double!: Character;
  props!: Pack; body!: Pack; head!: Pack; rig!: Rig;
  wrench!: THREE.Mesh; rag!: THREE.Mesh; ragBench!: THREE.Mesh; entity!: THREE.Mesh; entityMat!: THREE.MeshPhysicalMaterial;
  phone!: THREE.Group; phoneScreen!: THREE.Mesh; phoneScreenMat!: THREE.ShaderMaterial; feedRT: THREE.WebGLRenderTarget;
  P: PostParams = defaultPost();
  W: number; H: number; sc: number;
  extra = new THREE.Group();     // объекты, которые добавляют сцены
  heroClip = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.0);
  copyScene = new THREE.Scene(); copyCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  usePhoneFeed = false;
  phoneScene = new THREE.Scene(); phoneKey = new THREE.PointLight(new THREE.Color('#FFA448'), 3, 4, 2);
  showMirror = true;
  useContact = false; contact: THREE.Mesh[] = [];
  entityRim = { value: 0.0 };
  claw = new Claw(); drops!: Droplets; folder!: Folder; ragD!: THREE.Mesh; phoneM!: THREE.Group;
  eyeRT = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType }); eyeCam!: THREE.CubeCamera; useEyeCube = false;

  constructor(public canvas: HTMLCanvasElement, W: number, H: number, sc = 0.75) {
    this.W = W; this.H = H; this.sc = sc;
    this.r = new THREE.WebGLRenderer({ canvas, preserveDrawingBuffer: true, antialias: false, stencil: true, powerPreference: "high-performance" });
    this.r.setPixelRatio(1); this.r.setSize(W, H, false);
    this.r.shadowMap.enabled = true; this.r.shadowMap.type = THREE.PCFSoftShadowMap; this.r.shadowMap.autoUpdate = false;
    this.r.localClippingEnabled = true;
    this.r.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.r.toneMapping = THREE.NoToneMapping;
    const iw = Math.round(W * sc), ih = Math.round(H * sc);
    this.post = new Post(this.r, iw, ih, 4);
    this.feedRT = new THREE.WebGLRenderTarget(iw, ih, { type: THREE.HalfFloatType, depthBuffer: false });
    this.cam = new THREE.PerspectiveCamera(54, W / H, 0.03, 40);
  }

  async init() {
    await fontsReady(); // папка рисует текст на canvas — нужны шрифты
    const [rig, body, head, props] = await Promise.all([loadJSON("rig.json"), loadPack("body"), loadPack("head"), loadPack("props")]);
    this.rig = rig; this.body = body; this.head = head; this.props = props;
    // окружение для отражений металла/стекла
    const pm = new THREE.PMREMGenerator(this.r);
    const env = new THREE.Scene();
    const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.012, 0.012, 0.016), side: THREE.BackSide }));
    env.add(sky);
    const blob = (c: THREE.Color, p: THREE.Vector3, s: number) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 12), new THREE.MeshBasicMaterial({ color: c })); m.position.copy(p); env.add(m); };
    blob(new THREE.Color(9, 5, 2), new THREE.Vector3(0.6, 2.2, 0.9), 0.35);
    blob(new THREE.Color(0.6, 0.35, 0.15), new THREE.Vector3(2.0, 0.9, 0.2), 1.0);
    blob(new THREE.Color(0.25, 0.32, 0.42), new THREE.Vector3(1.0, 1.6, 5.0), 0.8);
    blob(new THREE.Color(0.08, 0.06, 0.04), new THREE.Vector3(0, -3, 0), 3.0);
    this.scene.environment = pm.fromScene(env, 0.02).texture;
    this.scene.environmentIntensity = 0.5;
    pm.dispose();
    this.scene.background = new THREE.Color(0, 0, 0);

    this.world = new World();
    this.scene.add(this.world.group);
    this.mirror = new Mirror(props.geos.frame, bronzeMat(), Math.round(this.W * this.sc * 0.7), Math.round(this.H * this.sc * 0.7));
    this.scene.add(this.mirror.frame, this.mirror.glass);
    this.mirror.mat.uniforms.uLampG.value.copy(new THREE.Vector3(LAMP.pos.x, LAMP.pos.y, -LAMP.pos.z));

    this.hero = new Character(rig, body, head, "hero");
    this.double = new Character(rig, body, head, "double");
    this.hero.setLayer(LAYER.REAL); this.double.setLayer(LAYER.MIRROR);
    for (const m of this.hero.meshes) this.clipMat(m.material as THREE.Material);
    this.scene.add(this.hero.root, this.double.root);

    // реквизит
    const iron = metalMat("castiron", "#9a9aa2", 0.26);
    this.wrench = new THREE.Mesh(props.geos.wrench, iron); this.wrench.castShadow = true; this.wrench.receiveShadow = true;
    this.clipMat(iron);
    const ragMat = withAO(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.86, 0.84, 0.8), roughness: 0.95, sheen: 0.5, sheenColor: new THREE.Color(0.9, 0.88, 0.85) }));
    patch(ragMat, { key: "rag", fColor: `diffuseColor.rgb *= 0.85 + 0.2 * vnoise(vLocal * 300.0); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.3,0.28,0.25), smoothstep(0.6,0.85,fbm3(vLocal*30.0))*0.5);`,
      fNormal: `{ float h = vnoise(vLocal * vec3(2500.0, 2500.0, 600.0)) * 0.00015; normal = bumpN(-vViewPosition, normal, h, faceDirection); }` });
    this.rag = new THREE.Mesh(props.geos.rag, ragMat); this.rag.castShadow = true;
    this.ragBench = new THREE.Mesh(props.geos.rag, ragMat); this.ragBench.castShadow = true;
    props.geos.rag.scale(1, 0.5, 1);
    this.entityMat = withAO(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.012, 0.011, 0.012), roughness: 0.85, sheen: 0.6, sheenColor: new THREE.Color(0.12, 0.14, 0.16) })) as THREE.MeshPhysicalMaterial;
    patch(this.entityMat, { key: "entity", uniforms: { uRim: this.entityRim } as any,
      fEnd: `{ float fr = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 3.0); gl_FragColor.rgb += vec3(0.22, 0.32, 0.42) * fr * uRim; }` });
    this.entity = new THREE.Mesh(props.geos.entity, this.entityMat); this.entity.layers.set(LAYER.MIRROR);
    for (const o of [this.wrench, this.rag, this.ragBench]) o.layers.set(LAYER.BOTH);
    this.ragD = new THREE.Mesh(props.geos.rag, ragMat); this.ragD.layers.set(LAYER.MIRROR);
    this.rag.layers.set(LAYER.REAL);
    this.scene.add(this.wrench, this.rag, this.ragBench, this.ragD, this.entity, this.extra);
    await this.claw.init(); this.scene.add(this.claw.root); this.clipMat(this.claw.mat);
    // контактные тени под ступнями (мягкие пятна)
    const cm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; void main(){ float r = length((vUv - 0.5) * 2.0); gl_FragColor = vec4(0.0, 0.0, 0.0, 0.62 * (1.0 - smoothstep(0.15, 1.0, r))); }` });
    for (let i = 0; i < 2; i++) { const g = new THREE.PlaneGeometry(0.17, 0.34); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, cm); m.renderOrder = 3; m.layers.set(LAYER.REAL); this.contact.push(m); this.scene.add(m); }
    this.drops = new Droplets(null); this.drops.mesh.layers.set(LAYER.REAL); this.drops.smoke.layers.set(LAYER.REAL); this.scene.add(this.drops.mesh, this.drops.smoke);
    this.folder = new Folder(); this.scene.add(this.folder.group);
    this.eyeCam = new THREE.CubeCamera(0.03, 20, this.eyeRT);
    this.eyeCam.children.forEach((c) => { c.layers.set(LAYER.BOTH); c.layers.enable(LAYER.REAL); });
    this.scene.add(this.eyeCam);


    // телефон: корпус, камеры, экран (лента камеры = кадр сцены за телефоном)
    this.phone = new THREE.Group();
    const bodyM = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.02, 0.02, 0.022), roughness: 0.25, metalness: 0.6, clearcoat: 1 });
    const shell = new THREE.Mesh(new RoundedBoxGeometry(0.0715, 0.147, 0.0082, 4, 0.009), bodyM); shell.castShadow = true;
    this.phone.add(shell);
    const lensM = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.05, metalness: 0.2, clearcoat: 1 });
    const bump = new THREE.Mesh(new RoundedBoxGeometry(0.038, 0.038, 0.003, 3, 0.008), bodyM); bump.position.set(-0.012, 0.047, -0.0055); this.phone.add(bump);
    for (const [x, y] of [[-0.021, 0.056], [-0.021, 0.038], [-0.003, 0.047]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.003, 24), lensM); l.rotation.x = Math.PI / 2; l.position.set(x, y, -0.0072); this.phone.add(l); }
    this.phoneScreenMat = new THREE.ShaderMaterial({
      uniforms: { tFeed: { value: this.feedRT.texture }, uOn: { value: 0 }, uRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uGlitch: { value: 0 }, uT: { value: 0 }, uRed: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D tFeed; uniform float uOn; uniform vec4 uRect; uniform float uGlitch; uniform float uT; uniform float uRed; varying vec2 vUv;
        float h(float x){ return fract(sin(x * 91.3) * 4375.5); }
        void main(){ vec2 uv = uRect.xy + vUv * uRect.zw;
          float band = floor(vUv.y * 40.0 + uT * 3.0); uv.x += step(1.0 - uGlitch * 0.4, h(band + floor(uT * 20.0))) * (h(band) - 0.5) * 0.08 * uGlitch;
          vec3 c = texture2D(tFeed, uv).rgb * 1.25;
          c = c / (1.0 + c * 0.35);
          c += (h(vUv.x * 913.0 + vUv.y * 77.0 + uT) - 0.5) * 0.03;
          c = mix(c, c * vec3(1.3, 0.6, 0.6), uRed * 0.3);
          vec3 off = vec3(0.004, 0.004, 0.006);
          float edge = smoothstep(0.0, 0.01, vUv.x) * smoothstep(1.0, 0.99, vUv.x) * smoothstep(0.0, 0.006, vUv.y) * smoothstep(1.0, 0.994, vUv.y);
          gl_FragColor = vec4(mix(off, c, uOn) * edge, 1.0); }`,
    });
    this.phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.0675, 0.143), this.phoneScreenMat); this.phoneScreen.position.z = 0.0042;
    this.phone.add(this.phoneScreen);
    this.phone.traverse((o) => o.layers.set(LAYER.BOTH));
    this.phoneScene.add(this.phone, this.phoneKey, new THREE.HemisphereLight(0x303540, 0x100804, 0.4));
    this.phoneM = new THREE.Group();
    { const sh = new THREE.Mesh(new RoundedBoxGeometry(0.0715, 0.147, 0.0082, 4, 0.009), bodyM); this.phoneM.add(sh);
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.0675, 0.143), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.55, 0.6) })); sc.position.z = 0.0042; this.phoneM.add(sc);
      (this.phoneM as any).screen = sc; }
    this.phoneM.traverse((o) => o.layers.set(LAYER.MIRROR));
    this.scene.add(this.phoneM);
    this.phoneKey.position.copy(LAMP.pos);
    // копирование кадра в ленту телефона
    const cq = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: { t: { value: null } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }`, depthTest: false, depthWrite: false }));
    this.copyScene.add(cq);
    // прогрев шейдеров
    this.r.compile(this.scene, this.cam);
  }

  clipMat(m: THREE.Material) { m.clippingPlanes = [this.heroClip]; m.clipShadows = false; }

  // сброс к состоянию по умолчанию перед каждым кадром
  reset() {
    this.P = defaultPost();
    const mu = this.mirror.mat.uniforms;
    mu.uDirt.value = 0; mu.uRipple.value.set(0, 0, 0, 0); mu.uRipple2.value.set(0, 0, 0, 0); mu.uHazeAmt.value = 0; mu.uPrints.value.set(0, 0, 0, 0);
    mu.uGlow.value.setRGB(0, 0, 0); mu.uDarken.value = 0; mu.uLiquid.value = 0;
    this.mirror.setStrokes([]);
    this.heroClip.constant = 50; // далеко — ничего не обрезает
    this.hero.root.visible = true; this.double.root.visible = true; this.entity.visible = false;
    this.wrench.visible = true; this.rag.visible = false; this.ragBench.visible = false; this.phone.visible = false;
    this.phoneScreenMat.uniforms.uOn.value = 0; this.phoneScreenMat.uniforms.uGlitch.value = 0; this.phoneScreenMat.uniforms.uRed.value = 0;
    this.usePhoneFeed = false; this.showMirror = true;
    for (const c of [this.hero, this.double]) {
      c.resetPose(); c.root.position.set(0, 0, 0); c.root.rotation.set(0, 0, 0);
      c.U.uMetal.value = 0; c.U.uPale.value = 0; c.U.uWet.value = 0; c.EU.uMetal.value = 0; c.EU.uPupil.value = 0.22; c.EU.uSil.value = 0; c.EU.uGlint.value = 0;
      c.setMorph({ blink: 0, wide: 0, jaw: 0, grin: 0, pucker: 0 }); c.teeth.visible = false;
      c.head.visible = true; c.hair.visible = true; for (const e of c.eyes) e.visible = true; for (const m of c.meshes) if (m !== c.teeth) m.visible = true;
    }
    this.extra.clear(); this.useContact = false;
    this.claw.root.visible = false; this.drops.mesh.visible = false; this.drops.smoke.visible = false; this.folder.group.visible = false;
    this.ragD.visible = false; this.phoneM.visible = false; this.entityRim.value = 0; this.rag.matrixAutoUpdate = true; this.ragD.matrixAutoUpdate = true; this.wrench.matrixAutoUpdate = true; this.phone.matrixAutoUpdate = true; this.phoneM.matrixAutoUpdate = true; this.useEyeCube = false; this.entity.layers.set(LAYER.MIRROR);
    this.wrench.layers.set(LAYER.BOTH);
    (this.folder.paper.material as THREE.MeshPhysicalMaterial).emissive.setRGB(0, 0, 0);
    const w = this.world;
    w.key.intensity = 9; w.key.color.set('#FFA448'); w.bulbMat.color.setRGB(40, 24, 9); w.coneMat.uniforms.uK.value = 0.05; w.dustMat.uniforms.uK.value = 1;
    w.rim.intensity = 4; w.fill.intensity = 0.7; w.moon.intensity = 2; w.amb.intensity = 0.12;
    w.mkey.intensity = 3.2; w.mkey.color.set('#FFB070'); w.mfill.intensity = 0.6; w.mkey.position.set(0.55, 2.0, -0.9);
    w.key.position.copy(LAMP.pos); w.key.target.position.set(LAMP.pos.x - 0.35, 0, LAMP.pos.z - 0.15);
    w.benchTools.position.set(0, 0, 0); w.benchTools.children.forEach((c) => (c.visible = true));
  }

  render() {
    const r = this.r;
    this.scene.updateMatrixWorld(true);
    this.contact.forEach((m, i) => {
      m.visible = this.useContact && this.hero.root.visible;
      if (!m.visible) return;
      const p = this.hero.worldPos(i ? "foot.R" : "foot.L"); const q = this.hero.worldPos(i ? "toe" in this.hero.bones ? "toe" : "foot.R" : "foot.L");
      void q; m.position.set(p.x, 0.003, p.z + 0.05); m.rotation.y = this.hero.root.rotation.y; m.updateMatrixWorld(true);
      const h = Math.max(0, p.y - 0.088); (m.material as THREE.ShaderMaterial).opacity = 1; m.scale.setScalar(1 + h * 3);
    });
    this.cam.updateMatrixWorld(true);
    this.cam.layers.set(LAYER.BOTH); this.cam.layers.enable(LAYER.REAL);
    r.shadowMap.needsUpdate = true;
    if (this.useEyeCube) {
      const g = this.mirror.glass.visible; this.mirror.glass.visible = false;
      const dv = this.double.root.visible; this.double.root.visible = false;
      this.eyeCam.update(r, this.scene);
      this.mirror.glass.visible = g; this.double.root.visible = dv;
      r.shadowMap.needsUpdate = true;
    }
    if (this.showMirror) { this.mirror.glass.visible = true; this.mirror.renderReflection(r, this.scene, this.cam); }
    else this.mirror.glass.visible = false;
    r.setRenderTarget(this.post.sceneRT);
    r.setClearColor(0x000000, 1); r.clear(true, true, true);
    if (this.phone.visible && this.usePhoneFeed) {
      // лента камеры телефона: сцена без героя (камера телефона смотрит от него)
      const hv = this.hero.root.visible; this.hero.root.visible = false;
      r.render(this.scene, this.cam);
      this.copy(this.post.sceneRT.texture, this.feedRT);
      this.hero.root.visible = hv;
      r.setRenderTarget(this.post.sceneRT); r.clear(true, true, true);
    }
    r.render(this.scene, this.cam);
    if (this.phone.visible) {
      r.autoClear = false;
      this.phoneScene.environment = this.scene.environment;
      r.render(this.phoneScene, this.cam);
      r.autoClear = true;
    }
    this.post.finish(this.cam, this.P, null);
  }

  copy(src: THREE.Texture, dst: THREE.WebGLRenderTarget) {
    const q = this.copyScene.children[0] as THREE.Mesh; (q.material as THREE.ShaderMaterial).uniforms.t.value = src;
    this.r.setRenderTarget(dst); this.r.render(this.copyScene, this.copyCam);
  }

  // проекция мировой точки в пиксели кадра 1080×1920
  project(p: THREE.Vector3) {
    const v = p.clone().project(this.cam);
    return { x: (v.x * 0.5 + 0.5) * this.W, y: (1 - (v.y * 0.5 + 0.5)) * this.H, z: v.z };
  }
}
