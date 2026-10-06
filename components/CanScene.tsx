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
      scene.add(can);

      let shownLabel = 0;
      let popT = 1; // 0 → just swapped (scale punch), 1 → settled
      const setLabel = (idx: number, pop: boolean) => {
        if (idx === shownLabel) return;
        shownLabel = idx;
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
        minisGroup.add(m);
        return m;
      });

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

        // ---- scroll mapping: dwell + travel per flavor ----
        // Each flavor block is SCREENS tall (see FlavorSection): the first
        // (SCREENS-1) screens pin the text ("fixed scroll", dwell) while the
        // can holds its flavor, then travel plays the carousel spin + dive.
        // This guarantees the next can never appears while its text is on screen.
        const SCREENS = 1.5;
        const T = 1 + N * SCREENS; // hero (1 screen) + journey, in screens
        const d0 = (idx: number) => (1 + idx * SCREENS) / T; // dwell start
        const d1 = (idx: number) => (idx * SCREENS + SCREENS) / T; // dwell end
        const segOf = (pp: number): number => {
          if (pp <= d0(0)) return 0;
          if (pp >= d1(N - 1)) return N - 1;
          for (let idx = 0; idx < N - 1; idx++) {
            if (pp < d0(idx + 1)) {
              if (pp <= d1(idx)) return idx; // dwell: hold flavor
              const t = (pp - d1(idx)) / (d0(idx + 1) - d1(idx));
              return idx + smooth(t); // travel: spin then dive
            }
          }
          return N - 1;
        };
        const seg = segOf(p);
        const i = Math.min(Math.floor(seg), N - 1);
        const f = seg - i;

        // ---- can choreography ----
        // Dwell (text pinned): can holds its flavor, perfectly still.
        // Travel: Phase A (f: 0 → 0.45) carousel spin in place — the label
        //   swaps exactly when the back faces the camera, so the swap is
        //   never seen. Phase B (f: 0.45 → 1) dives down + across to the
        //   next zigzag slot.
        const spinT = smooth(f / 0.45);
        const moveT = smooth((f - 0.45) / 0.55);

        // background crossfade (follows the dive, not the spin)
        setPlaneFlavor(planeA, i);
        planeA.mat.opacity = 1;
        if (i < N - 1) {
          setPlaneFlavor(planeB, i + 1);
          planeB.mat.opacity = moveT;
        } else {
          planeB.mat.opacity = 0;
        }

        if (i !== lastActive) {
          lastActive = i;
          scrollState.activeFlavor = i;
          const acc = new THREE.Color(FLAVORS[i].can.accent);
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
        can.visible = exitT < 0.98;
        popT = Math.min(popT + dt / 0.5, 1);
        can.scale.setScalar(bigScale * (0.94 + 0.06 * backOut(popT)));
        can.rotation.y =
          Math.PI + (i + spinT) * Math.PI * 2 + exitT * Math.PI * 2;
        can.position.x = lerp(slotX(i), slotX(Math.min(i + 1, N - 1)), moveT);
        can.position.y =
          Math.sin(elapsed * 1.1) * 0.1 +
          lerp(0.15, -0.15, p) -
          Math.sin(moveT * Math.PI) * 0.45 +
          exitT * 1.4;
        can.rotation.x = lerp(0.05, -0.05, p) + Math.sin(elapsed * 0.7) * 0.02;
        shadow.position.x = can.position.x;
        shadow.visible = exitT < 0.5;

        // carousel swap — hidden mid-spin (skipped once the finale takes over)
        if (q < 0.05) setLabel(Math.min(i + (spinT >= 0.5 ? 1 : 0), N - 1), true);

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
