import { Pose } from "@mediapipe/pose";
import type { BodyAnalysis } from "../types";

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** YCbCr skin detection — ignores clothing like grey shirts */
function isSkinPixel(r: number, g: number, b: number): boolean {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

  if (y < 40 || y > 245) return false;
  return cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
}

function rgbToLab(
  r: number,
  g: number,
  b: number,
): { L: number; a: number; b: number } {
  let rr = r / 255;
  let gg = g / 255;
  let bb = b / 255;

  const linearize = (c: number) =>
    c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;

  rr = linearize(rr);
  gg = linearize(gg);
  bb = linearize(bb);

  let x = (rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375) / 0.95047;
  let y = (rr * 0.2126729 + gg * 0.7151522 + bb * 0.072175) / 1.0;
  let z = (rr * 0.0193339 + gg * 0.119192 + bb * 0.9503041) / 1.08883;

  const f = (t: number) =>
    t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116;

  x = f(x);
  y = f(y);
  z = f(z);

  return {
    L: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
}

/** ITA scale — standard dermatology measure for skin tone */
function classifySkinTone(rgb: { r: number; g: number; b: number }): string {
  const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
  const ita = (Math.atan2(lab.L - 50, lab.b) * 180) / Math.PI;

  if (ita > 55) return "Fair";
  if (ita > 41) return "Light";
  if (ita > 28) return "Medium";
  if (ita > 10) return "Tan";
  if (ita > -30) return "Brown";
  return "Deep";
}

function getUndertone(rgb: { r: number; g: number; b: number }): "warm" | "cool" | "neutral" {
  const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
  if (lab.b > 12) return "warm";
  if (lab.b < 4) return "cool";
  return "neutral";
}

function fashionPalette(
  skinTone: string,
  undertone: "warm" | "cool" | "neutral",
): string[] {
  const palettes: Record<string, Record<string, string[]>> = {
    warm: {
      Fair: ["#1a365d", "#8b2942", "#2d5016"],
      Light: ["#1e3a5f", "#7c2d12", "#14532d"],
      Medium: ["#1e40af", "#9a3412", "#166534"],
      Tan: ["#312e81", "#b45309", "#065f46"],
      Brown: ["#4c1d95", "#c2410c", "#047857"],
      Deep: ["#581c87", "#ea580c", "#059669"],
    },
    cool: {
      Fair: ["#312e81", "#831843", "#134e4a"],
      Light: ["#3730a3", "#9d174d", "#115e59"],
      Medium: ["#1e3a8a", "#be185d", "#0f766e"],
      Tan: ["#1e1b4b", "#db2777", "#0d9488"],
      Brown: ["#312e81", "#e11d48", "#14b8a6"],
      Deep: ["#4c1d95", "#f43f5e", "#2dd4bf"],
    },
    neutral: {
      Fair: ["#334155", "#9f1239", "#1e4620"],
      Light: ["#1e293b", "#b91c1c", "#14532d"],
      Medium: ["#0f172a", "#c2410c", "#166534"],
      Tan: ["#1c1917", "#d97706", "#15803d"],
      Brown: ["#292524", "#ea580c", "#16a34a"],
      Deep: ["#1c1917", "#f97316", "#22c55e"],
    },
  };

  return palettes[undertone][skinTone] || palettes.neutral.Medium;
}

type Landmark = { x: number; y: number; visibility?: number; presence?: number };

async function detectPoseLandmarks(
  image: HTMLImageElement,
): Promise<Landmark[] | null> {
  return new Promise((resolve) => {
    const pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results) => {
      pose.close();
      resolve(results.poseLandmarks || null);
    });

    pose.send({ image }).catch(() => {
      pose.close();
      resolve(null);
    });
  });
}

function landmarkVisible(lm: Landmark | undefined): lm is Landmark {
  if (!lm) return false;
  const score = lm.visibility ?? lm.presence ?? 1;
  return score >= 0.5;
}

function sampleSkinNearPoint(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  px: number,
  py: number,
  radius: number,
): { r: number; g: number; b: number }[] {
  const samples: { r: number; g: number; b: number }[] = [];
  const r = Math.max(3, Math.round(radius));

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const x = Math.round(px + dx);
      const y = Math.round(py + dy);
      if (x < 0 || y < 0 || x >= width || y >= height) continue;

      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) continue;

      const red = data[i];
      const green = data[i + 1];
      const blue = data[i + 2];

      if (isSkinPixel(red, green, blue)) {
        samples.push({ r: red, g: green, b: blue });
      }
    }
  }

  return samples;
}

function collectSkinSamples(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  landmarks: Landmark[] | null,
): { r: number; g: number; b: number }[] {
  const samples: { r: number; g: number; b: number }[] = [];
  const radius = Math.max(4, Math.round(Math.min(width, height) * 0.02));

  if (landmarks && landmarks.length > 0) {
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];

    const points: { x: number; y: number }[] = [];

    if (landmarkVisible(nose)) {
      points.push({ x: nose.x * width, y: nose.y * height });
      points.push({ x: nose.x * width, y: (nose.y + 0.04) * height });
    }

    if (landmarkVisible(leftShoulder) && landmarkVisible(rightShoulder)) {
      const neckX = ((leftShoulder.x + rightShoulder.x) / 2) * width;
      const neckY =
        ((leftShoulder.y + rightShoulder.y) / 2) * height + radius * 1.5;
      points.push({ x: neckX, y: neckY });

      const innerL = {
        x: (leftShoulder.x * 0.7 + rightShoulder.x * 0.3) * width,
        y: (leftShoulder.y * 0.85 + nose?.y * 0.15 || leftShoulder.y) * height,
      };
      const innerR = {
        x: (leftShoulder.x * 0.3 + rightShoulder.x * 0.7) * width,
        y: (rightShoulder.y * 0.85 + nose?.y * 0.15 || rightShoulder.y) * height,
      };
      points.push(innerL, innerR);
    }

    for (const lm of [leftElbow, rightElbow, leftWrist, rightWrist]) {
      if (landmarkVisible(lm)) {
        points.push({ x: lm.x * width, y: lm.y * height });
      }
    }

    for (const pt of points) {
      samples.push(...sampleSkinNearPoint(data, width, height, pt.x, pt.y, radius));
    }
  }

  if (samples.length < 20) {
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        if (data[i + 3] < 128) continue;
        const red = data[i];
        const green = data[i + 1];
        const blue = data[i + 2];
        if (isSkinPixel(red, green, blue)) {
          samples.push({ r: red, g: green, b: blue });
        }
      }
    }
  }

  return samples;
}

function medianSkinColor(samples: { r: number; g: number; b: number }[]) {
  if (samples.length === 0) return null;

  const sorted = [...samples].sort(
    (a, b) => 0.299 * a.r + 0.587 * a.g + 0.114 * a.b - (0.299 * b.r + 0.587 * b.g + 0.114 * b.b),
  );

  const trim = Math.floor(sorted.length * 0.15);
  const trimmed = sorted.slice(trim, sorted.length - trim || undefined);
  const pool = trimmed.length > 0 ? trimmed : sorted;
  const mid = Math.floor(pool.length / 2);

  return pool[mid];
}

function classifyBodyFrame(
  landmarks: Landmark[] | null,
  imgWidth: number,
  imgHeight: number,
): { bodyType: string; suggestedSize: string } {
  if (!landmarks || landmarks.length < 25) {
    return { bodyType: "Average", suggestedSize: "M" };
  }

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  if (
    !landmarkVisible(leftShoulder) ||
    !landmarkVisible(rightShoulder) ||
    !landmarkVisible(leftHip) ||
    !landmarkVisible(rightHip)
  ) {
    return { bodyType: "Average", suggestedSize: "M" };
  }

  const shoulderWidth = Math.hypot(
    (rightShoulder.x - leftShoulder.x) * imgWidth,
    (rightShoulder.y - leftShoulder.y) * imgHeight,
  );
  const hipWidth = Math.hypot(
    (rightHip.x - leftHip.x) * imgWidth,
    (rightHip.y - leftHip.y) * imgHeight,
  );

  const shoulderY =
    ((leftShoulder.y + rightShoulder.y) / 2) * imgHeight;
  const hipY = ((leftHip.y + rightHip.y) / 2) * imgHeight;

  let legLength = imgHeight - hipY;
  if (landmarkVisible(leftAnkle) && landmarkVisible(rightAnkle)) {
    const ankleY =
      ((leftAnkle.y + rightAnkle.y) / 2) * imgHeight;
    legLength = ankleY - hipY;
  }

  const torsoLength = Math.max(hipY - shoulderY, 1);
  const ratio = shoulderWidth / Math.max(hipWidth, 1);
  const torsoToLeg = torsoLength / Math.max(legLength, 1);
  const frameScale = shoulderWidth / imgHeight;

  let bodyType = "Average";
  if (ratio > 1.08) bodyType = "Athletic";
  else if (ratio < 0.92) bodyType = "Curvy";
  else if (torsoToLeg > 0.72) bodyType = "Long Torso";
  else if (torsoToLeg < 0.48) bodyType = "Long Legs";

  let suggestedSize = "M";
  if (frameScale < 0.14) suggestedSize = "S";
  else if (frameScale < 0.19) suggestedSize = "M";
  else if (frameScale < 0.24) suggestedSize = "L";
  else suggestedSize = "XL";

  return { bodyType, suggestedSize };
}

export async function analyzeBodyLocally(imageData: string): Promise<BodyAnalysis> {
  const img = await loadImage(imageData);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const maxDim = 640;
  const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
  canvas.width = Math.max(1, Math.floor(img.width * scale));
  canvas.height = Math.max(1, Math.floor(img.height * scale));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const landmarks = await detectPoseLandmarks(img);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const skinSamples = collectSkinSamples(data, width, height, landmarks);
  const skinRgb = medianSkinColor(skinSamples);

  if (!skinRgb) {
    throw new Error(
      "Could not detect skin in this photo. Use a clearer photo with visible face, neck, or arms.",
    );
  }

  const skinTone = classifySkinTone(skinRgb);
  const undertone = getUndertone(skinRgb);
  const { bodyType, suggestedSize } = classifyBodyFrame(
    landmarks,
    canvas.width,
    canvas.height,
  );

  return {
    bodyType,
    skinTone,
    suggestedSize,
    colorPalette: fashionPalette(skinTone, undertone),
  };
}
