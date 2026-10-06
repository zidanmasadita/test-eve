"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three/webgpu";
import { color, time, uv, mix, vec2, Fn, uniform } from "three/tsl";
import gsap from "gsap";
import { FLAVORS } from "@/lib/flavors";
import { makeLabelTexture } from "@/lib/canTexture";
import { scrollState } from "@/lib/scrollState";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hexLerp = (c1: string, c2: string, t: number) =>
  new THREE.Color(c1).lerp(new THREE.Color(c2), t);

/** Background gradient palettes per flavor: [sky(top), horizon(bottom)] */
function bgColorsAt(p: number): [THREE.Color, THREE.Color] {
  const n = FLAVORS.length - 1;
  const x = Math.min(Math.max(p, 0), 1) * n;
  const i = Math.min(Math.floor(x), n - 1);
  const f = x - i;
  return [
    hexLerp(FLAVORS[i].bg.sky, FLAVORS[i + 1].bg.sky, f),
    hexLerp(FLAVORS[i].bg.horizon, FLAVORS[i + 1].bg.horizon, f),
  ];
}

export default function CanScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let renderer: any;
    let raf = 0;

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
      scene.add(new THREE.AmbientLight(0xffffff, 0.85));
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

      const labelCache = new Map<number, THREE.CanvasTexture>();
      const labelTex = (idx: number) => {
        let t = labelCache.get(idx);
        if (!t) {
          t = new THREE.CanvasTexture(makeLabelTexture(FLAVORS[idx]));
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          labelCache.set(idx, t);
        }
        return t;
      };

      const bodyMat = isWebGPU
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
        bodyMat as any
      );
      can.add(body);

      const silver = isWebGPU
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

      // Shoulder taper
      const shoulder = new THREE.Mesh(
        new THREE.CylinderGeometry(R * 0.86, R, 0.32, 72, 1, true),
        silver as any
      );
      shoulder.position.y = H / 2 + 0.16;
      can.add(shoulder);
      // Lid
      const lid = new THREE.Mesh(new THREE.CircleGeometry(R * 0.86, 72), silver as any);
      lid.rotation.x = -Math.PI / 2;
      lid.position.y = H / 2 + 0.32;
      can.add(lid);
      const lidRim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.86, 0.045, 16, 72), silver as any);
      lidRim.rotation.x = Math.PI / 2;
      lidRim.position.y = H / 2 + 0.32;
      can.add(lidRim);
      // Pull tab hint
      const tab = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.028, 12, 24), silver as any);
      tab.rotation.x = Math.PI / 2;
      tab.position.set(0.18, H / 2 + 0.345, 0);
      can.add(tab);
      // Bottom rim
      const botRim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.96, 0.05, 16, 72), silver as any);
      botRim.rotation.x = Math.PI / 2;
      botRim.position.y = -H / 2;
      can.add(botRim);
      const bottom = new THREE.Mesh(new THREE.CircleGeometry(R * 0.96, 72), silver as any);
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
        const t = new THREE.CanvasTexture(c);
        return t;
      })();
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 3.4),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
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

      // ---- Background: fullscreen gradient + drifting clouds ----
      const topU = uniform(color(FLAVORS[0].bg.sky));
      const botU = uniform(color(FLAVORS[0].bg.horizon));

      const hash = Fn(([p]: [any]) => {
        return p.dot(vec2(127.1, 311.7)).sin().mul(43758.5453).fract();
      });
      const vnoise = Fn(([p]: [any]) => {
        const i = p.floor();
        const f = p.fract();
        const u = f.mul(f).mul(2.0).sub(f.mul(3.0)).mul(-1.0); // smoothstep-ish
        const a = hash(i);
        const b = hash(i.add(vec2(1.0, 0.0)));
        const c = hash(i.add(vec2(0.0, 1.0)));
        const d = hash(i.add(vec2(1.0, 1.0)));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      });
      const fbm = Fn(([p]: [any]) => {
        return vnoise(p)
          .mul(0.55)
          .add(vnoise(p.mul(2.13)).mul(0.28))
          .add(vnoise(p.mul(4.41)).mul(0.17));
      });

      let bgMesh: THREE.Mesh;
      if (isWebGPU) {
        const bgMat = new THREE.MeshBasicNodeMaterial();
        const t = time;
        bgMat.colorNode = Fn(() => {
          const vUv = uv();
          const grad = mix(botU, topU, vUv.y.pow(1.25));
          const n = fbm(
            vec2(vUv.x.mul(3.0).add(t.mul(0.02)), vUv.y.mul(5.0).add(t.mul(0.008)))
          );
          // clouds gather in upper 2/3
          const mask = vUv.y.smoothstep(0.15, 0.75);
          const cl = n.smoothstep(0.52, 0.82).mul(mask).mul(0.4);
          const vign = vUv.sub(0.5).length().mul(0.55);
          return mix(grad, color(0xffffff), cl).sub(vign.mul(0.35));
        })();
        bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat as any);
      } else {
        const bgMat = new THREE.ShaderMaterial({
          depthWrite: false,
          uniforms: {
            topColor: { value: new THREE.Color(FLAVORS[0].bg.sky) },
            botColor: { value: new THREE.Color(FLAVORS[0].bg.horizon) },
            uTime: { value: 0 },
          },
          vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }`,
          fragmentShader: `
            varying vec2 vUv; uniform vec3 topColor; uniform vec3 botColor; uniform float uTime;
            float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
            float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
              return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
            void main(){
              vec3 grad = mix(botColor, topColor, pow(vUv.y, 1.25));
              float n = noise(vUv*vec2(3.,5.)+vec2(uTime*.02,uTime*.008))*.55
                      + noise(vUv*vec2(6.,10.))*.3 + noise(vUv*vec2(12.,20.))*.15;
              float cl = smoothstep(.52,.82,n) * smoothstep(.15,.75,vUv.y) * .4;
              float vig = length(vUv-.5)*.55;
              gl_FragColor = vec4(mix(grad, vec3(1.), cl) - vig*.35, 1.);
            }`,
        });
        (bgMat as any)._isFallback = true;
        bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
      }
      bgMesh.frustumCulled = false;
      bgMesh.renderOrder = -10;
      const bgScene = new THREE.Scene();
      const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      bgScene.add(bgMesh);

      // ---- Flavor swap with flourish ----
      let shownFlavor = -1;
      const swapFlavor = (idx: number) => {
        if (idx === shownFlavor) return;
        shownFlavor = idx;
        (bodyMat as any).map = labelTex(idx);
        (bodyMat as any).needsUpdate = true;
        gsap.fromTo(
          can.rotation,
          { y: can.rotation.y },
          { y: can.rotation.y + Math.PI * 2, duration: 1.1, ease: "power3.inOut" }
        );
        gsap.fromTo(can.scale, { x: 0.92, y: 0.92, z: 0.92 }, { x: 1, y: 1, z: 1, duration: 0.9, ease: "back.out(1.6)" });
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
      };
      window.addEventListener("resize", onResize);

      // ---- Loop ----
      const clock = new THREE.Clock();
      let elapsed = 0;
      renderer.setAnimationLoop(() => {
        const dt = Math.min(clock.getDelta(), 0.05);
        elapsed += dt;

        // smooth scroll progress
        scrollState.progress = lerp(scrollState.progress, scrollState.target, 1 - Math.pow(0.001, dt));
        const p = scrollState.progress;

        // background colors
        const [top, bot] = bgColorsAt(p);
        if (isWebGPU) {
          (topU.value as THREE.Color).copy(top);
          (botU.value as THREE.Color).copy(bot);
        } else {
          const m = bgMesh.material as THREE.ShaderMaterial;
          (m.uniforms.topColor.value as THREE.Color).copy(top);
          (m.uniforms.botColor.value as THREE.Color).copy(bot);
          m.uniforms.uTime.value = elapsed;
        }

        // flavor index from progress
        const fIdx = Math.min(FLAVORS.length - 1, Math.round(p * (FLAVORS.length - 1)));
        if (fIdx !== scrollState.activeFlavor) scrollState.activeFlavor = fIdx;
        swapFlavor(fIdx);

        // can motion: gentle bob + scroll-driven tilt & drift
        can.position.y = Math.sin(elapsed * 1.1) * 0.12 + lerp(0.15, -0.15, p);
        can.rotation.x = lerp(0.06, -0.06, p) + Math.sin(elapsed * 0.7) * 0.02;
        can.position.x = Math.sin(elapsed * 0.5) * 0.06;

        // camera drift: descending feel
        camera.position.y = lerp(0.25, -0.35, p);
        camera.lookAt(0, lerp(0.1, -0.1, p), 0);

        // particles drift upward slowly (falling feel inverted = descending)
        const arr = pGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < P; i++) {
          arr[i * 3 + 1] += dt * 0.25;
          if (arr[i * 3 + 1] > 5) arr[i * 3 + 1] = -5;
        }
        pGeo.attributes.position.needsUpdate = true;

        renderer.autoClear = true;
        renderer.render(bgScene, bgCam);
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(scene, camera);
      });

      // reveal
      gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "power2.out" });
    };

    boot();

    return () => {
      cancelled = true;
      window.removeEventListener("resize", () => {});
      cancelAnimationFrame(raf);
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
