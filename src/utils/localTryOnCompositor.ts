type Point = { x: number; y: number };
type Landmark = {
  x: number;
  y: number;
  visibility?: number;
  presence?: number;
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

function landmarkVisible(lm: Landmark | undefined): lm is Landmark {
  if (!lm) return false;
  const score = lm.visibility ?? lm.presence ?? 1;
  return score >= 0.45;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function bilinearQuad(
  tl: Point,
  tr: Point,
  br: Point,
  bl: Point,
  u: number,
  v: number,
): Point {
  const top = lerpPoint(tl, tr, u);
  const bottom = lerpPoint(bl, br, u);
  return lerpPoint(top, bottom, v);
}

function averageRgb(data: Uint8ClampedArray) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 16) {
    const a = data[i + 3];
    if (a < 40) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  if (!count) return { r: 80, g: 80, b: 90 };
  return { r: r / count, g: g / count, b: b / count };
}

function extractShirtFromGarmentImage(
  garmentImg: HTMLImageElement,
): HTMLCanvasElement {
  const gw = garmentImg.width;
  const gh = garmentImg.height;

  const cropX = Math.floor(gw * 0.12);
  const cropY = Math.floor(gh * 0.08);
  const cropW = Math.floor(gw * 0.76);
  const cropH = Math.floor(gh * 0.52);

  const canvas = document.createElement("canvas");
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(garmentImg, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  const imageData = ctx.getImageData(0, 0, cropW, cropH);
  const data = imageData.data;

  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const i = (y * cropW + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;

      const isLightBg =
        (r >= 225 && g >= 225 && b >= 225) ||
        (max >= 210 && sat < 0.12) ||
        (r >= 200 && g >= 200 && b >= 200 && sat < 0.08);

      if (isLightBg) {
        data[i + 3] = 0;
        continue;
      }

      const edgeFade = Math.min(
        y / cropH,
        1 - y / cropH,
        x / cropW,
        1 - x / cropW,
      );
      if (edgeFade < 0.05) {
        data[i + 3] = Math.floor(data[i + 3] * (edgeFade / 0.05));
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  featherAlpha(ctx, cropW, cropH, 6);
  return canvas;
}

function featherAlpha(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  radius: number,
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (copy[i + 3] === 0) continue;

      let minNeighbor = 255;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            minNeighbor = 0;
            continue;
          }
          const ni = (ny * width + nx) * 4;
          minNeighbor = Math.min(minNeighbor, copy[ni + 3]);
        }
      }
      data[i + 3] = Math.min(data[i + 3], minNeighbor);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function buildTorsoQuad(
  landmarks: Landmark[] | null,
  width: number,
  height: number,
): { quad: [Point, Point, Point, Point]; hasPose: boolean } {
  const fallback: [Point, Point, Point, Point] = [
    { x: width * 0.22, y: height * 0.2 },
    { x: width * 0.78, y: height * 0.2 },
    { x: width * 0.72, y: height * 0.58 },
    { x: width * 0.28, y: height * 0.58 },
  ];

  if (!landmarks?.length) return { quad: fallback, hasPose: false };

  const ls = landmarks[11];
  const rs = landmarks[12];
  const lh = landmarks[23];
  const rh = landmarks[24];
  const le = landmarks[13];
  const re = landmarks[14];

  if (!landmarkVisible(ls) || !landmarkVisible(rs)) {
    return { quad: fallback, hasPose: false };
  }

  const leftSx = ls.x * width;
  const leftSy = ls.y * height;
  const rightSx = rs.x * width;
  const rightSy = rs.y * height;

  const shoulderW = Math.hypot(rightSx - leftSx, rightSy - leftSy);
  const shoulderAngle = Math.atan2(rightSy - leftSy, rightSx - leftSx);

  const expand = shoulderW * 0.18;
  const cos = Math.cos(shoulderAngle);
  const sin = Math.sin(shoulderAngle);

  const topLeft: Point = {
    x: leftSx - expand * cos,
    y: leftSy - expand * sin,
  };
  const topRight: Point = {
    x: rightSx + expand * cos,
    y: rightSy + expand * sin,
  };

  let bottomLeft: Point;
  let bottomRight: Point;

  if (landmarkVisible(lh) && landmarkVisible(rh)) {
    const hipW = Math.hypot((rh.x - lh.x) * width, (rh.y - lh.y) * height);
    const hipExpand = Math.max(hipW * 0.12, shoulderW * 0.08);
    bottomLeft = {
      x: lh.x * width - hipExpand * cos,
      y: lh.y * height - hipExpand * sin * 0.3 + height * 0.02,
    };
    bottomRight = {
      x: rh.x * width + hipExpand * cos,
      y: rh.y * height - hipExpand * sin * 0.3 + height * 0.02,
    };
  } else {
    const torsoH = shoulderW * 1.35;
    bottomLeft = {
      x: topLeft.x - shoulderW * 0.04,
      y: topLeft.y + torsoH,
    };
    bottomRight = {
      x: topRight.x + shoulderW * 0.04,
      y: topRight.y + torsoH,
    };
  }

  if (landmarkVisible(le) && landmarkVisible(re)) {
    const elbowInset = shoulderW * 0.06;
    topLeft.x = Math.max(topLeft.x, le.x * width - elbowInset);
    topRight.x = Math.min(topRight.x, re.x * width + elbowInset);
  }

  return { quad: [topLeft, topRight, bottomRight, bottomLeft], hasPose: true };
}

function darkenTorsoUnderlay(
  ctx: CanvasRenderingContext2D,
  quad: [Point, Point, Point, Point],
  tint: { r: number; g: number; b: number },
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(quad[0].x, quad[0].y);
  ctx.lineTo(quad[1].x, quad[1].y);
  ctx.lineTo(quad[2].x, quad[2].y);
  ctx.lineTo(quad[3].x, quad[3].y);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = `rgba(${Math.round(tint.r)}, ${Math.round(tint.g)}, ${Math.round(tint.b)}, 0.42)`;
  ctx.fillRect(
    Math.min(quad[0].x, quad[3].x) - 20,
    Math.min(quad[0].y, quad[1].y) - 20,
    2000,
    2000,
  );
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.fillRect(
    Math.min(quad[0].x, quad[3].x) - 20,
    Math.min(quad[0].y, quad[1].y) - 20,
    2000,
    2000,
  );
  ctx.restore();
}

function warpImageToQuad(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sw: number,
  sh: number,
  quad: [Point, Point, Point, Point],
) {
  const [tl, tr, br, bl] = quad;
  const grid = 14;

  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const u0 = col / grid;
      const v0 = row / grid;
      const u1 = (col + 1) / grid;
      const v1 = (row + 1) / grid;

      const p00 = bilinearQuad(tl, tr, br, bl, u0, v0);
      const p10 = bilinearQuad(tl, tr, br, bl, u1, v0);
      const p01 = bilinearQuad(tl, tr, br, bl, u0, v1);
      const p11 = bilinearQuad(tl, tr, br, bl, u1, v1);

      const sx0 = u0 * sw;
      const sy0 = v0 * sh;
      const sx1 = u1 * sw;
      const sy1 = v1 * sh;

      drawTexturedTriangle(
        ctx,
        source,
        sx0,
        sy0,
        sx1,
        sy0,
        sx0,
        sy1,
        p00,
        p10,
        p01,
      );
      drawTexturedTriangle(
        ctx,
        source,
        sx1,
        sy0,
        sx1,
        sy1,
        sx0,
        sy1,
        p10,
        p11,
        p01,
      );
    }
  }
}

function drawTexturedTriangle(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sx0: number,
  sy0: number,
  sx1: number,
  sy1: number,
  sx2: number,
  sy2: number,
  dx0: Point,
  dx1: Point,
  dx2: Point,
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(dx0.x, dx0.y);
  ctx.lineTo(dx1.x, dx1.y);
  ctx.lineTo(dx2.x, dx2.y);
  ctx.closePath();
  ctx.clip();

  const denom = (sx0 - sx2) * (sy1 - sy2) - (sx1 - sx2) * (sy0 - sy2) || 1e-6;

  const m11 =
    ((dx0.x - dx2.x) * (sy1 - sy2) - (dx1.x - dx2.x) * (sy0 - sy2)) / denom;
  const m12 =
    ((dx1.x - dx2.x) * (sx0 - sx2) - (dx0.x - dx2.x) * (sx1 - sx2)) / denom;
  const m21 =
    ((dx0.y - dx2.y) * (sy1 - sy2) - (dx1.y - dx2.y) * (sy0 - sy2)) / denom;
  const m22 =
    ((dx1.y - dx2.y) * (sx0 - sx2) - (dx0.y - dx2.y) * (sx1 - sx2)) / denom;
  const dx = dx2.x - m11 * sx2 - m12 * sy2;
  const dy = dx2.y - m21 * sx2 - m22 * sy2;

  ctx.transform(m11, m21, m12, m22, dx, dy);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

function addFabricShading(
  ctx: CanvasRenderingContext2D,
  quad: [Point, Point, Point, Point],
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(quad[0].x, quad[0].y);
  ctx.lineTo(quad[1].x, quad[1].y);
  ctx.lineTo(quad[2].x, quad[2].y);
  ctx.lineTo(quad[3].x, quad[3].y);
  ctx.closePath();
  ctx.clip();

  const minX = Math.min(quad[0].x, quad[1].x, quad[2].x, quad[3].x);
  const maxX = Math.max(quad[0].x, quad[1].x, quad[2].x, quad[3].x);
  const minY = Math.min(quad[0].y, quad[1].y, quad[2].y, quad[3].y);
  const maxY = Math.max(quad[0].y, quad[1].y, quad[2].y, quad[3].y);

  const grad = ctx.createLinearGradient(minX, minY, maxX, maxY);
  grad.addColorStop(0, "rgba(255,255,255,0.08)");
  grad.addColorStop(0.5, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.14)");
  ctx.fillStyle = grad;
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
  ctx.restore();
}

export async function composeVirtualTryOn(
  personSrc: string,
  garmentSrc: string,
  poseLandmarks: Landmark[] | null,
): Promise<string> {
  const personImg = await loadImage(personSrc);
  const garmentImg = await loadImage(garmentSrc);

  const width = personImg.width;
  const height = personImg.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(personImg, 0, 0, width, height);

  const shirtCanvas = extractShirtFromGarmentImage(garmentImg);
  const shirtCtx = shirtCanvas.getContext("2d");
  if (!shirtCtx) throw new Error("Canvas not supported");

  const shirtData = shirtCtx.getImageData(
    0,
    0,
    shirtCanvas.width,
    shirtCanvas.height,
  );
  const shirtTint = averageRgb(shirtData.data);

  const { quad } = buildTorsoQuad(poseLandmarks, width, height);

  darkenTorsoUnderlay(ctx, quad, shirtTint);

  ctx.save();
  ctx.globalAlpha = 0.96;
  ctx.globalCompositeOperation = "source-over";
  warpImageToQuad(
    ctx,
    shirtCanvas,
    shirtCanvas.width,
    shirtCanvas.height,
    quad,
  );
  ctx.restore();

  addFabricShading(ctx, quad);

  return canvas.toDataURL("image/png");
}

export type { Landmark };
