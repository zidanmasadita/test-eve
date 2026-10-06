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

      // ---- Can factory: one can per flavor (carousel) ----
      const N = FLAVORS.length;
      const R = 1;
      const H = 2.7;

      const seamlessTex = (src: HTMLImageElement | HTMLCanvasElement) => {
        const t = new THREE.CanvasTexture(makeSeamless(src));
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        return t;
      };

      const labelLoading = new Set<number>();
      const makeBodyMaterial = (idx: number): any => {
        const mat: any = isWebGPU
          ? new THREE.MeshStandardNodeMaterial({
              roughness: 0.32,
              metalness: 0.55,
            })
          : new THREE.MeshStandardMaterial({
              roughness: 0.32,
              metalness: 0.55,
            });
        // procedural placeholder instantly, AI label swaps in when loaded
        mat.map = seamlessTex(makeLabelTexture(FLAVORS[idx]));
        mat.needsUpdate = true;
        if (!labelLoading.has(idx)) {
          labelLoading.add(idx);
          const img = new Image();
          img.onload = () => {
            mat.map = seamlessTex(img);
            mat.needsUpdate = true;
            labelLoading.delete(idx);
          };
          img.onerror = () => labelLoading.delete(idx);
          img.src = FLAVORS[idx].label;
        }
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

      // shared geometries
      const geoBody = new THREE.CylinderGeometry(R, R, H, 72, 1, true);
      const geoShoulder = new THREE.CylinderGeometry(R * 0.86, R, 0.32, 72, 1, true);
      const geoLid = new THREE.CircleGeometry(R * 0.86, 72);
      const geoLidRim = new THREE.TorusGeometry(R * 0.86, 0.045, 16, 72);
      const geoTab = new THREE.TorusGeometry(0.09, 0.028, 12, 24);
      const geoBotRim = new THREE.TorusGeometry(R * 0.96, 0.05, 16, 72);
      const geoBottom = new THREE.CircleGeometry(R * 0.96, 72);

      const buildCan = (idx: number) => {
        const can = new THREE.Group();
        const bodyMat = makeBodyMaterial(idx);
        can.add(new THREE.Mesh(geoBody, bodyMat));
        const shoulder = new THREE.Mesh(geoShoulder, silver);
        shoulder.position.y = H / 2 + 0.16;
        can.add(shoulder);
        const lid = new THREE.Mesh(geoLid, silver);
        lid.rotation.x = -Math.PI / 2;
        lid.position.y = H / 2 + 0.32;
        can.add(lid);
        const lidRim = new THREE.Mesh(geoLidRim, silver);
        lidRim.rotation.x = Math.PI / 2;
        lidRim.position.y = H / 2 + 0.32;
        can.add(lidRim);
        const tab = new THREE.Mesh(geoTab, silver);
        tab.rotation.x = Math.PI / 2;
        tab.position.set(0.18, H / 2 + 0.345, 0);
        can.add(tab);
        const botRim = new THREE.Mesh(geoBotRim, silver);
        botRim.rotation.x = Math.PI / 2;
        botRim.position.y = -H / 2;
        can.add(botRim);
        const bottom = new THREE.Mesh(geoBottom, silver);
        bottom.rotation.x = Math.PI / 2;
        bottom.position.y = -H / 2;
        can.add(bottom);
        can.rotation.y = Math.PI; // label faces camera
        scene.add(can);
        return can;
      };

      const cans = FLAVORS.map((_, idx) => buildCan(idx));

      // Soft contact shadow follows the focused can
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

        scrollState.progress = lerp(
          scrollState.progress,
          scrollState.target,
          1 - Math.pow(0.001, dt)
        );
        const p = clamp01(scrollState.progress);

        const seg = p * (N - 1);
        const i = Math.min(Math.floor(seg), N - 1);
        const f = seg - i;

        // background crossfade
        setPlaneFlavor(planeA, i);
        planeA.mat.opacity = 1;
        if (i < N - 1) {
          setPlaneFlavor(planeB, i + 1);
          planeB.mat.opacity = f;
        } else {
          planeB.mat.opacity = 0;
        }

        // particle tint follows active flavor
        if (i !== lastActive) {
          lastActive = i;
          scrollState.activeFlavor = i;
          const acc = new THREE.Color(FLAVORS[i].can.accent);
          (pMat.color as THREE.Color).copy(acc).lerp(new THREE.Color(0xffffff), 0.4);
        }

        // ---- carousel ----
        const amp = camera.aspect >= 1 ? 1.9 : 0.85;
        const slotX = (idx: number) => (idx % 2 === 0 ? amp : -amp);
        // focus slot eases between zigzag sides during transition
        const slotPos = lerp(slotX(i), slotX(Math.min(i + 1, N - 1)), smooth(f));
        const S = 2 * amp + 2.2; // filmstrip spacing
        const dipY = -Math.sin(f * Math.PI) * 0.35;
        const baseY = Math.sin(elapsed * 1.1) * 0.1 + lerp(0.15, -0.15, p);

        cans.forEach((can, k) => {
          // filmstrip: upcoming cans wait left, past cans exit right
          can.position.x = slotPos - (k - seg) * S;
          can.position.y = baseY + dipY;
          // entrance spin: one full turn, landing label-forward
          const t0 = k === 0 ? 0 : k - 1;
          const span = k === 0 ? 0.25 : 0.6;
          can.rotation.y = Math.PI + (1 - smooth((seg - t0) / span)) * Math.PI * 2;
          can.rotation.x = lerp(0.05, -0.05, p) + Math.sin(elapsed * 0.7 + k) * 0.02;
        });
        shadow.position.x = slotPos;

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
