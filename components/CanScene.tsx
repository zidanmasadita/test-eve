"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three/webgpu";
import gsap from "gsap";
import { FLAVORS } from "@/lib/flavors";
import { makeLabelTexture } from "@/lib/canTexture";
import { scrollState } from "@/lib/scrollState";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

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

      // ---- The can ----
      const can = new THREE.Group();
      const R = 1;
      const H = 2.7;

      // Label textures: procedural canvas instantly, AI artwork swaps in when loaded.
      let shownFlavor = -1;
      const labelCache = new Map<number, THREE.Texture>();
      const labelLoading = new Set<number>();
      const texLoader = new THREE.TextureLoader();
      const labelTex = (idx: number): THREE.Texture => {
        let t = labelCache.get(idx);
        if (!t) {
          t = new THREE.CanvasTexture(makeLabelTexture(FLAVORS[idx]));
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          labelCache.set(idx, t);
          if (!labelLoading.has(idx)) {
            labelLoading.add(idx);
            texLoader.load(
              FLAVORS[idx].label,
              (loaded) => {
                loaded.colorSpace = THREE.SRGBColorSpace;
                loaded.anisotropy = 8;
                labelCache.set(idx, loaded);
                if (shownFlavor === idx) {
                  (bodyMat as any).map = loaded;
                  (bodyMat as any).needsUpdate = true;
                }
              },
              undefined,
              () => labelLoading.delete(idx)
            );
          }
        }
        return t;
      };

      const bodyMat: any = isWebGPU
        ? new THREE.MeshStandardNodeMaterial({
            map: labelTex(0),
            roughness: 0.32,
            metalness: 0.55,
          })
        : new THREE.MeshStandardMaterial({
            map: labelTex(0),
            roughness: 0.32,
            metalness: 0.55,
          });
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(R, R, H, 72, 1, true),
        bodyMat
      );
      can.add(body);

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

      const shoulder = new THREE.Mesh(
        new THREE.CylinderGeometry(R * 0.86, R, 0.32, 72, 1, true),
        silver
      );
      shoulder.position.y = H / 2 + 0.16;
      can.add(shoulder);
      const lid = new THREE.Mesh(new THREE.CircleGeometry(R * 0.86, 72), silver);
      lid.rotation.x = -Math.PI / 2;
      lid.position.y = H / 2 + 0.32;
      can.add(lid);
      const lidRim = new THREE.Mesh(
        new THREE.TorusGeometry(R * 0.86, 0.045, 16, 72),
        silver
      );
      lidRim.rotation.x = Math.PI / 2;
      lidRim.position.y = H / 2 + 0.32;
      can.add(lidRim);
      const tab = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.028, 12, 24), silver);
      tab.rotation.x = Math.PI / 2;
      tab.position.set(0.18, H / 2 + 0.345, 0);
      can.add(tab);
      const botRim = new THREE.Mesh(
        new THREE.TorusGeometry(R * 0.96, 0.05, 16, 72),
        silver
      );
      botRim.rotation.x = Math.PI / 2;
      botRim.position.y = -H / 2;
      can.add(botRim);
      const bottom = new THREE.Mesh(new THREE.CircleGeometry(R * 0.96, 72), silver);
      bottom.rotation.x = Math.PI / 2;
      bottom.position.y = -H / 2;
      can.add(bottom);

      // Soft contact shadow
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
      scene.add(can);

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
      const particles = new THREE.Points(pGeo, pMat);
      scene.add(particles);

      // ---- Background: AI images, crossfading with scroll ----
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
          // not loaded yet: flat brand color, no black flash
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
            // refresh planes currently showing this flavor
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

      // ---- Flavor swap with flourish ----
      const swapFlavor = (idx: number) => {
        if (idx === shownFlavor) return;
        shownFlavor = idx;
        bodyMat.map = labelTex(idx);
        bodyMat.needsUpdate = true;
        gsap.fromTo(
          can.rotation,
          { y: can.rotation.y },
          { y: can.rotation.y + Math.PI * 2, duration: 1.1, ease: "power3.inOut" }
        );
        gsap.fromTo(
          can.scale,
          { x: 0.92, y: 0.92, z: 0.92 },
          { x: 1, y: 1, z: 1, duration: 0.9, ease: "back.out(1.6)" }
        );
        const acc = new THREE.Color(FLAVORS[idx].can.accent);
        (pMat.color as THREE.Color).copy(acc).lerp(new THREE.Color(0xffffff), 0.4);
      };
      swapFlavor(0);

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
      const N = FLAVORS.length;
      renderer.setAnimationLoop(() => {
        const dt = Math.min(clock.getDelta(), 0.05);
        const elapsed = clock.elapsedTime;

        scrollState.progress = lerp(
          scrollState.progress,
          scrollState.target,
          1 - Math.pow(0.001, dt)
        );
        const p = clamp01(scrollState.progress);

        // background crossfade
        const x = p * (N - 1);
        const i = Math.min(Math.floor(x), N - 1);
        const f = x - i;
        setPlaneFlavor(planeA, i);
        planeA.mat.opacity = 1;
        if (i < N - 1) {
          setPlaneFlavor(planeB, i + 1);
          planeB.mat.opacity = f;
        } else {
          planeB.mat.opacity = 0;
        }

        // active flavor
        const fIdx = Math.min(N - 1, Math.round(p * (N - 1)));
        if (fIdx !== scrollState.activeFlavor) scrollState.activeFlavor = fIdx;
        swapFlavor(fIdx);

        // can motion
        can.position.y = Math.sin(elapsed * 1.1) * 0.12 + lerp(0.15, -0.15, p);
        can.rotation.x = lerp(0.06, -0.06, p) + Math.sin(elapsed * 0.7) * 0.02;
        can.position.x = Math.sin(elapsed * 0.5) * 0.06;

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
