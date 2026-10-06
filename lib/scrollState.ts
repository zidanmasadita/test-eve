/**
 * Shared mutable scroll state — written by GSAP ScrollTrigger in page.tsx,
 * read every frame by the WebGPU scene. Mutable ref avoids re-renders.
 */
export const scrollState = {
  /** 0..1 across the whole flavor journey */
  target: 0,
  /** smoothed value used for rendering */
  progress: 0,
  /** currently active flavor index (0..5) */
  activeFlavor: 0,
  /** 0..1 across the finale section (single can -> all mini cans) */
  finaleTarget: 0,
  /** smoothed value used for rendering */
  finaleProgress: 0,
};
