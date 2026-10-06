import type { Flavor } from "./flavors";

/**
 * Procedural wraparound label texture (2:1) for the 3D can.
 * Temporary stand-in until AI-generated label artwork is ready —
 * drop PNGs into /public/labels/<id>.png and swap `labelUrl` in flavors.ts.
 */
export function makeLabelTexture(flavor: Flavor): HTMLCanvasElement {
  const W = 1024;
  const H = 512;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;

  // Base vertical gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, flavor.can.base);
  g.addColorStop(0.55, flavor.can.base);
  g.addColorStop(1, flavor.can.deep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Subtle diagonal sheen
  const sheen = ctx.createLinearGradient(0, 0, W, H);
  sheen.addColorStop(0, "rgba(255,255,255,0.22)");
  sheen.addColorStop(0.35, "rgba(255,255,255,0)");
  sheen.addColorStop(0.65, "rgba(255,255,255,0)");
  sheen.addColorStop(1, "rgba(255,255,255,0.14)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);

  // Accent wave band
  ctx.fillStyle = flavor.can.accent;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.78);
  for (let x = 0; x <= W; x += 16) {
    ctx.lineTo(x, H * 0.78 + Math.sin(x / 90) * 22);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  const text = flavor.can.text;
  ctx.textAlign = "center";

  // Brand
  ctx.fillStyle = text;
  ctx.globalAlpha = 0.85;
  ctx.font = "600 34px system-ui, sans-serif";
  ctx.fillText("JOSJIS", W / 2, 92);
  ctx.globalAlpha = 1;

  // Divider line
  ctx.strokeStyle = text;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 120, 118);
  ctx.lineTo(W / 2 + 120, 118);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Flavor name (wrap if long)
  ctx.fillStyle = text;
  ctx.font = "800 84px system-ui, sans-serif";
  const words = flavor.name.toUpperCase().split(" ");
  if (words.length > 1 && flavor.name.length > 10) {
    ctx.fillText(words[0], W / 2, 250);
    ctx.fillText(words.slice(1).join(" "), W / 2, 340);
  } else {
    ctx.fillText(flavor.name.toUpperCase(), W / 2, 300);
  }

  // Fruit + tagline
  ctx.globalAlpha = 0.9;
  ctx.font = "500 30px system-ui, sans-serif";
  ctx.fillText(`${flavor.fruit}  •  ${flavor.tagline}`, W / 2, 430);
  ctx.globalAlpha = 1;

  return cv;
}
