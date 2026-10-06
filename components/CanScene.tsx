"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three/webgpu";
import gsap from "gsap";
import { FLAVORS } from "@/lib/flavors";
import { makeLabelTexture } from "@/lib/canTexture";
import { scrollState } from "@/lib/scrollState";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const smooth = (t: number) => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

/**
 * Blend the left edge with the right edge so the texture wraps around
 * the cylinder without a visible seam (the "cut" look).
 */
function makeSeamless(
  src: HTMLImageElement | HTMLCanvasElement,
  blendRatio = 0.09
): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  const blendPx = Math.max(8, Math.floor(w * blendRatio));
  const strip = document.createElement("canvas");
  strip.width = blendPx;
  strip.height = h;
  const sctx = strip.getContext("2d")!;
  sctx.drawImage(src, w - blendPx, 0, blendPx, h, 0, 0, blendPx, h);
  sctx.globalCompositeOperation = "destination-in";
  const grad = sctx.createLinearGradient(0, 0, blendPx, 0);
  grad.addColorStop(0, "rgba(0,0,0,1)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, blendPx, h);
  ctx.drawImage(strip, 0, 0);
  return cv;
}

/** Fit texture to screen with cover behavior (crop, no stretch). */
function coverFit(tex: THREE.Texture, sw: number, sh: number) {
  const img = tex.image as HTMLImageElement | undefined;
  if (!img || !img.width) return;
  const sAspect = sw / sh;
  const tAspect = img.width / img.height;
  if (sAspect > tAspect) {
    tex.repeat.set(1, tAspect / sAspect);
    tex.offset.set(0, (1 - tAspect / sAspect) / 2);
  } else {
    tex.repeat.set(sAspect / tAspect, 1);
    tex.offset.set((1 - sAspect / tAspect) / 2, 0);
  }
}

export default function CanScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let renderer: any;
    let onPointerDown: ((e: PointerEvent) => void) | null = null;
    let onPointerUp: ((e: PointerEvent) => void) | null = null;

    const boot = async () => {
      // ---- Renderer: WebGPU first, WebGL fallback ----
      let isWebGPU = true;
      try {
        renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
        await renderer.init();
      } catch {
        isWebGPU = false;
        const { WebGLRenderer } = await import("three");
        renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
      }
      if (cancelled) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        38,
        window.innerWidth / window.innerHeight,
        0.1,
        100
      );
      camera.position.set(0, 0.1, 7.2);

      // ---- Lights ----
      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(4, 6, 6);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xbfd9ff, 1.1);
      rim.position.set(-5, 2, -4);
      scene.add(rim);

      // ---- Cans ----
      const N = FLAVORS.length;
      const R = 1;
      const H = 2.7;

      const seamlessTex = (src: HTMLImageElement | HTMLCanvasElement) => {
        const t = new THREE.CanvasTexture(makeSeamless(src));
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        return t;
      };

      // label textures: procedural instantly, AI artwork swaps in when loaded.
      // materials register themselves so the AI texture updates every can
      // currently showing that flavor (without clobbering other flavors).
      const labelCache = new Map<number, THREE.Texture>();
      const labelLoading = new Set<number>();
      const labelMats = new Map<number, Set<any>>();
      const labelTex = (idx: number, mat?: any): THREE.Texture => {
        if (mat) {
          let s = labelMats.get(idx);
          if (!s) {
            s = new Set();
            labelMats.set(idx, s);
          }
          s.add(mat);
        }
        let t = labelCache.get(idx);
        if (!t) {
          t = seamlessTex(makeLabelTexture(FLAVORS[idx]));
          labelCache.set(idx, t);
          if (!labelLoading.has(idx)) {
            labelLoading.add(idx);
            const img = new Image();
            img.onload = () => {
              const prev = labelCache.get(idx);
              const loaded = seamlessTex(img);
              labelCache.set(idx, loaded);
              labelMats.get(idx)?.forEach((m) => {
                if (m.map === prev) {
                  m.map = loaded;
                  m.needsUpdate = true;
                }
              });
              labelLoading.delete(idx);
            };
            img.onerror = () => labelLoading.delete(idx);
            img.src = FLAVORS[idx].label;
          }
        }
        return t;
      };

      const makeLabelMaterial = (idx: number): any => {
        const mat: any = isWebGPU
          ? new THREE.MeshStandardNodeMaterial({ roughness: 0.32, metalness: 0.55 })
          : new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.55 });
        mat.map = labelTex(idx, mat);
        mat.needsUpdate = true;
        return mat;
      };

      const silver: any = isWebGPU
        ? new THREE.MeshStandardNodeMaterial({
            color: 0xd7dde3,
            roughness: 0.28,
            metalness: 0.95,
          })
        : new THREE.MeshStandardMaterial({
            color: 0xd7dde3,
            roughness: 0.28,
            metalness: 0.95,
          });

      const geoBody = new THREE.CylinderGeometry(R, R, H, 72, 1, true);
      const geoShoulder = new THREE.CylinderGeometry(R * 0.86, R, 0.32, 72, 1, true);
      const geoLid = new THREE.CircleGeometry(R * 0.86, 72);
      const geoLidRim = new THREE.TorusGeometry(R * 0.86, 0.045, 16, 72);
      const geoTab = new THREE.TorusGeometry(0.09, 0.028, 12, 24);
      const geoBotRim = new THREE.TorusGeometry(R * 0.96, 0.05, 16, 72);
      const geoBottom = new THREE.CircleGeometry(R * 0.96, 72);

      const createCan = (mat: any) => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(geoBody, mat));
        const shoulder = new THREE.Mesh(geoShoulder, silver);
        shoulder.position.y = H / 2 + 0.16;
        g.add(shoulder);
        const lid = new THREE.Mesh(geoLid, silver);
        lid.rotation.x = -Math.PI / 2;
        lid.position.y = H / 2 + 0.32;
        g.add(lid);
        const lidRim = new THREE.Mesh(geoLidRim, silver);
        lidRim.rotation.x = Math.PI / 2;
        lidRim.position.y = H / 2 + 0.32;
        g.add(lidRim);
        const tab = new THREE.Mesh(geoTab, silver);
        tab.rotation.x = Math.PI / 2;
        tab.position.set(0.18, H / 2 + 0.345, 0);
        g.add(tab);
        const botRim = new THREE.Mesh(geoBotRim, silver);
        botRim.rotation.x = Math.PI / 2;
        botRim.position.y = -H / 2;
        g.add(botRim);
        const bottom = new THREE.Mesh(geoBottom, silver);
        bottom.rotation.x = Math.PI / 2;
        bottom.position.y = -H / 2;
        g.add(bottom);
        return g;
      };

      // the hero can (single, morphs labels mid-spin)
      const bodyMat = makeLabelMaterial(0);
      const can = createCan(bodyMat);
      can.userData.flavorIdx = 0;
      scene.add(can);

      let shownLabel = 0;
      let popT = 1; // 0 → just swapped (scale punch), 1 → settled
      const setLabel = (idx: number, pop: boolean) => {
        if (idx === shownLabel) return;
        shownLabel = idx;
        can.userData.flavorIdx = idx;
        bodyMat.map = labelTex(idx, bodyMat);
        bodyMat.needsUpdate = true;
        if (pop) popT = 0;
      };

      // finale: every flavor as a mini can
      const minisGroup = new THREE.Group();
      minisGroup.visible = false;
      scene.add(minisGroup);
      const minis = FLAVORS.map((_, idx) => {
        const m = createCan(makeLabelMaterial(idx));
        m.visible = false;
        m.userData.flavorIdx = idx;
        minisGroup.add(m);
        return m;
      });

      // ---- bottle: the real 2D cloud coconut label wrapped on a 3D contour bottle ----
      const bottleBodyMat: any = isWebGPU
        ? new THREE.MeshStandardNodeMaterial({
            color: 0xf2f7fb,
            roughness: 0.35,
            metalness: 0.1,
          })
        : new THREE.MeshStandardMaterial({
            color: 0xf2f7fb,
            roughness: 0.35,
            metalness: 0.1,
          });
      const frost: any = isWebGPU
        ? new THREE.MeshStandardNodeMaterial({
            color: 0xeaf2f8,
            roughness: 0.45,
            metalness: 0.05,
          })
        : new THREE.MeshStandardMaterial({
            color: 0xeaf2f8,
            roughness: 0.45,
            metalness: 0.05,
          });
      const capMat: any = isWebGPU
        ? new THREE.MeshStandardNodeMaterial({
            color: 0x1e5aa8,
            roughness: 0.3,
            metalness: 0.6,
          })
        : new THREE.MeshStandardMaterial({
            color: 0x1e5aa8,
            roughness: 0.3,
            metalness: 0.6,
          });
      const bottleImg = new Image();
      bottleImg.onload = () => {
        bottleBodyMat.map = seamlessTex(bottleImg);
        bottleBodyMat.needsUpdate = true;
      };
      bottleImg.src = "/bottles/label-cloud-coconut.jpg";

      const bottle = new THREE.Group();
      const bBody = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 2.0, 64, 1, true),
        bottleBodyMat
      );
      bottle.add(bBody);
      const bShoulder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 1, 0.55, 64, 1, true),
        frost
      );
      bShoulder.position.y = 1.275;
      bottle.add(bShoulder);
      const bNeck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.36, 0.42, 48),
        frost
      );
      bNeck.position.y = 1.76;
      bottle.add(bNeck);
      const bNeckRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.36, 0.035, 12, 48),
        frost
      );
      bNeckRing.rotation.x = Math.PI / 2;
      bNeckRing.position.y = 1.97;
      bottle.add(bNeckRing);
      const bCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.34, 48),
        capMat
      );
      bCap.position.y = 2.14;
      bottle.add(bCap);
      const bBaseRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.96, 0.05, 16, 72),
        frost
      );
      bBaseRim.rotation.x = Math.PI / 2;
      bBaseRim.position.y = -1.0;
      bottle.add(bBaseRim);
      const bBottom = new THREE.Mesh(new THREE.CircleGeometry(0.96, 72), frost);
      bBottom.rotation.x = Math.PI / 2;
      bBottom.position.y = -1.0;
      bottle.add(bBottom);
      bottle.userData.flavorIdx = 2; // cloud coconut
      bottle.visible = false;
      scene.add(bottle);

      // ---- tap a can → open its flavor detail ----
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const pickCan = (cx: number, cy: number): number | null => {
        ndc.x = (cx / window.innerWidth) * 2 - 1;
        ndc.y = -(cy / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const targets: THREE.Object3D[] = [];
        if (can.visible) targets.push(can);
        if (bottle.visible) targets.push(bottle);
        minis.forEach((m) => {
          if (m.visible) targets.push(m);
        });
        const hits = raycaster.intersectObjects(targets, true);
        if (!hits.length) return null;
        let o: any = hits[0].object;
        while (o && o.userData.flavorIdx === undefined) o = o.parent;
        return o ? (o.userData.flavorIdx as number) : null;
      };
      let downX = 0;
      let downY = 0;
      onPointerDown = (e: PointerEvent) => {
        downX = e.clientX;
        downY = e.clientY;
      };
      onPointerUp = (e: PointerEvent) => {
        if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return; // a drag, not a tap
        const t = e.target as HTMLElement;
        if (t.closest("button, a, [data-detail-modal]")) return;
        const idx = pickCan(e.clientX, e.clientY);
        if (idx !== null) {
          window.dispatchEvent(
            new CustomEvent("josjis:open-detail", { detail: idx })
          );
        }
      };
      window.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointerup", onPointerUp);

      // Soft contact shadow follows the can
      const shadowTex = (() => {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        const g = c.getContext("2d")!;
        const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
        grad.addColorStop(0, "rgba(0,0,0,0.42)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grad;
        g.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
      })();
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 3.4),
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
        })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -2.35;
      scene.add(shadow);

      // ---- Floating particles ----
      const P = 220;
      const pos = new Float32Array(P * 3);
      for (let i = 0; i < P; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 14;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const pMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.045,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      scene.add(new THREE.Points(pGeo, pMat));

      // ---- Background: AI images, crossfading with scroll ----
      const texLoader = new THREE.TextureLoader();
      const bgScene = new THREE.Scene();
      const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const mkPlane = (order: number) => {
        const m = new THREE.MeshBasicMaterial({
          transparent: true,
          depthWrite: false,
          depthTest: false,
          color: new THREE.Color(FLAVORS[0].bg.sky),
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
        mesh.frustumCulled = false;
        mesh.renderOrder = order;
        bgScene.add(mesh);
        return { mesh, mat: m, flavor: -1 };
      };
      const planeA = mkPlane(-10);
      const planeB = mkPlane(-9);

      const bgTexes: (THREE.Texture | null)[] = FLAVORS.map(() => null);
      const setPlaneFlavor = (
        plane: { mat: THREE.MeshBasicMaterial; flavor: number },
        idx: number
      ) => {
        if (plane.flavor === idx) return;
        plane.flavor = idx;
        const t = bgTexes[idx];
        if (t) {
          plane.mat.map = t;
          plane.mat.color.set(0xffffff);
          plane.mat.needsUpdate = true;
        } else {
          plane.mat.map = null;
          plane.mat.color.set(FLAVORS[idx].bg.sky);
          plane.mat.needsUpdate = true;
        }
      };
      FLAVORS.forEach((f, i) => {
        texLoader.load(
          f.bgImage,
          (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            coverFit(t, window.innerWidth, window.innerHeight);
            bgTexes[i] = t;
            if (planeA.flavor === i) planeA.flavor = -1;
            if (planeB.flavor === i) planeB.flavor = -1;
          },
          undefined,
          () => {}
        );
      });
      const refitBackgrounds = () => {
        bgTexes.forEach((t) => {
          if (t) coverFit(t, window.innerWidth, window.innerHeight);
        });
      };

      // ---- Resize ----
      const onResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        refitBackgrounds();
      };
      window.addEventListener("resize", onResize);

      // ---- Loop ----
      const clock = new THREE.Clock();
      let lastActive = -1;
      renderer.setAnimationLoop(() => {
        const dt = Math.min(clock.getDelta(), 0.05);
        const elapsed = clock.elapsedTime;

        // Snappy follow: Lenis already smooths the scroll itself, so the
        // 3D state only needs light jitter filtering to stay in sync.
        const follow = 1 - Math.pow(0.0001, dt);
        scrollState.progress = lerp(scrollState.progress, scrollState.target, follow);
        scrollState.finaleProgress = lerp(
          scrollState.finaleProgress,
          scrollState.finaleTarget,
          follow
        );
        const p = clamp01(scrollState.progress);
        const q = clamp01(scrollState.finaleProgress);

        // ---- scroll mapping: dwell + travel per stop ----
        // The journey has STOPS stops: the 6 flavors plus a bottle showcase
        // after Cloud Coconut (stop 3). Each stop block is SCREENS tall
        // (see FlavorSection): the first (SCREENS-1) screens pin the content
        // ("fixed scroll", dwell) while the can holds still, then travel
        // plays the carousel spin + dive to the next stop.
        const SCREENS = 1.5;
        const STOPS = 7;
        const BOTTLE_STOP = 3; // cloud coconut (flavor 2) -> bottle -> dusk berry (flavor 3)
        const T = 1 + STOPS * SCREENS; // hero (1 screen) + journey, in screens
        const d0 = (idx: number) => (1 + idx * SCREENS) / T; // dwell start
        const d1 = (idx: number) => (idx * SCREENS + SCREENS) / T; // dwell end
        const segOf = (pp: number): number => {
          if (pp <= d0(0)) return 0;
          if (pp >= d1(STOPS - 1)) return STOPS - 1;
          for (let idx = 0; idx < STOPS - 1; idx++) {
            if (pp < d0(idx + 1)) {
              if (pp <= d1(idx)) return idx; // dwell: hold
              const t = (pp - d1(idx)) / (d0(idx + 1) - d1(idx));
              return idx + smooth(t); // travel: spin then dive
            }
          }
          return STOPS - 1;
        };
        const seg = segOf(p);
        const s = Math.min(Math.floor(seg), STOPS - 1); // stop index
        const fr = seg - s; // 0..1 across the travel

        // ---- can choreography ----
        // Dwell: can holds still (or parked below during the bottle stop).
        // Travel: Phase A (fr: 0 → 0.45) carousel spin in place — the label
        //   swaps exactly when the back faces the camera, so the swap is
        //   never seen. Phase B (fr: 0.45 → 1) dives to the next stop.
        //   Cloud Coconut dives down off-screen for the bottle showcase,
        //   then rises back as Dusk Berry.
        const spinT = smooth(fr / 0.45);
        const moveT = smooth((fr - 0.45) / 0.55);
        const flavorAtStop = (stop: number) => (stop < BOTTLE_STOP ? stop : stop - 1);
        const DIVE = 8; // how far below the screen the can parks for the bottle

        // background crossfade (follows the dive, not the spin)
        let bgA = 0,
          bgB = 0,
          bgOp = 0;
        if (s <= 1) {
          bgA = s;
          bgB = s + 1;
          bgOp = moveT;
        } else if (s === 2) {
          bgA = 2;
          bgB = 2;
          bgOp = 0;
        } else if (s === BOTTLE_STOP) {
          bgA = 2;
          bgB = 3;
          bgOp = fr === 0 ? 0 : moveT;
        } else {
          bgA = s - 1;
          bgB = Math.min(s, N - 1);
          bgOp = moveT;
        }
        setPlaneFlavor(planeA, bgA);
        planeA.mat.opacity = 1;
        setPlaneFlavor(planeB, bgB);
        planeB.mat.opacity = bgOp;

        const tintIdx = s <= 3 ? Math.min(s, 2) : s - 1;
        if (tintIdx !== lastActive) {
          lastActive = tintIdx;
          scrollState.activeFlavor = tintIdx;
          const acc = new THREE.Color(FLAVORS[tintIdx].can.accent);
          (pMat.color as THREE.Color).copy(acc).lerp(new THREE.Color(0xffffff), 0.4);
        }

        // ---- finale: terra cacao can -> all six mini cans ----
        const exitT = smooth(q / 0.35);
        const backOut = (t: number) => {
          const c = clamp01(t);
          const c1 = 1.70158;
          const c3 = c1 + 1;
          return 1 + c3 * Math.pow(c - 1, 3) + c1 * Math.pow(c - 1, 2);
        };

        const amp = camera.aspect >= 1 ? 1.9 : 0.85;
        const slotX = (idx: number) => (idx % 2 === 0 ? amp : -amp);
        const bigScale = Math.max(1 - exitT, 0.0001);
        const baseY = Math.sin(elapsed * 1.1) * 0.1 + lerp(0.15, -0.15, p);
        can.visible = exitT < 0.98;
        popT = Math.min(popT + dt / 0.5, 1);
        can.scale.setScalar(bigScale * (0.94 + 0.06 * backOut(popT)));

        // bottle swap sequencing: sink the can first, then raise the bottle
        // (and reverse on the way out) so the two never collide
        const sinkT = smooth(clamp01(moveT * 2));
        const riseT = smooth(clamp01(moveT * 2 - 1));
        const bottleX = camera.aspect >= 1 ? amp : 0;
        const bottleActive = (s === 2 && fr > 0) || s === BOTTLE_STOP;
        bottle.visible = bottleActive && q < 0.02;
        if (bottle.visible) {
          const bY =
            s === 2
              ? lerp(baseY - DIVE, baseY, riseT)
              : lerp(baseY, baseY - DIVE, sinkT);
          bottle.position.set(bottleX, bY + Math.sin(elapsed * 1.3) * 0.06, 0);
          bottle.rotation.y = Math.PI + elapsed * 0.6; // slow showcase turntable
        }

        if (s === BOTTLE_STOP && fr === 0) {
          // bottle showcase: can parked below the screen
          can.position.set(slotX(2), baseY - DIVE, 0);
          can.rotation.y = Math.PI;
        } else if (s === 2) {
          // cloud coconut: carousel spin, then dive down off-screen
          can.rotation.y = Math.PI + (2 + spinT) * Math.PI * 2;
          can.position.x = slotX(2);
          can.position.y = baseY - sinkT * DIVE;
        } else if (s === BOTTLE_STOP) {
          // bottle sinks away, then the can rises back as dusk berry
          can.rotation.y = Math.PI + (3 + spinT + riseT) * Math.PI * 2;
          can.position.x = lerp(slotX(2), slotX(3), riseT);
          can.position.y =
            lerp(baseY - DIVE, baseY, riseT) - Math.sin(riseT * Math.PI) * 0.3;
        } else {
          const fIdx = flavorAtStop(s);
          can.rotation.y =
            Math.PI + (fIdx + spinT) * Math.PI * 2 + exitT * Math.PI * 2;
          can.position.x = lerp(slotX(fIdx), slotX(Math.min(fIdx + 1, N - 1)), moveT);
          can.position.y =
            baseY - Math.sin(moveT * Math.PI) * 0.45 + exitT * 1.4;
        }
        can.rotation.x = lerp(0.05, -0.05, p) + Math.sin(elapsed * 0.7) * 0.02;
        const bottleShadow =
          bottle.visible && (s === BOTTLE_STOP || (s === 2 && riseT > 0.5));
        shadow.position.x = bottleShadow ? bottleX : can.position.x;
        shadow.visible =
          exitT < 0.5 && (bottleShadow || can.position.y > -2.5);

        // carousel swap — hidden mid-spin (skipped once the finale takes over)
        if (q < 0.05) {
          if (s <= 1) setLabel(Math.min(s + (spinT >= 0.5 ? 1 : 0), N - 1), true);
          else if (s === 2) setLabel(2, false);
          else if (s === BOTTLE_STOP) setLabel(3, false);
          else setLabel(Math.min(s - 1 + (spinT >= 0.5 ? 1 : 0), N - 1), true);
        }

        // mini cans pop in staggered, gently bobbing + slow turntable
        minisGroup.visible = q > 0.002;
        const wide = camera.aspect >= 1;
        minis.forEach((m, j) => {
          const local = clamp01((q - 0.12 - j * 0.08) / 0.3);
          m.visible = local > 0;
          if (!m.visible) return;
          m.scale.setScalar(Math.max(backOut(local), 0.0001) * (wide ? 0.36 : 0.3));
          if (wide) {
            m.position.set(
              (j - 2.5) * 1.04,
              -0.15 + Math.sin(elapsed * 1.2 + j * 0.9) * 0.06,
              0
            );
          } else {
            const col = j % 3;
            const row = Math.floor(j / 3);
            m.position.set(
              (col - 1) * 0.9,
              0.55 - row * 1.15 + Math.sin(elapsed * 1.2 + j * 0.9) * 0.05,
              0
            );
          }
          m.rotation.y = Math.PI + elapsed * 0.6 + j * 0.35;
        });

        camera.position.y = lerp(0.25, -0.35, p);
        camera.lookAt(0, lerp(0.1, -0.1, p), 0);

        // particles drift
        const arr = pGeo.attributes.position.array as Float32Array;
        for (let k = 0; k < P; k++) {
          arr[k * 3 + 1] += dt * 0.25;
          if (arr[k * 3 + 1] > 5) arr[k * 3 + 1] = -5;
        }
        pGeo.attributes.position.needsUpdate = true;

        renderer.autoClear = true;
        renderer.render(bgScene, bgCam);
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(scene, camera);
      });

      gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "power2.out" });
    };

    boot();

    return () => {
      cancelled = true;
      if (onPointerDown) window.removeEventListener("pointerdown", onPointerDown);
      if (onPointerUp) window.removeEventListener("pointerup", onPointerUp);
      try {
        renderer?.setAnimationLoop(null);
        renderer?.dispose?.();
      } catch {}
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 h-full w-full opacity-0"
      aria-hidden
    />
  );
}
