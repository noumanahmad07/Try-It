import { spawn } from "child_process";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { buildGarmentDescription } from "../utils/tryOnPrompt";

function decodeDataUrl(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (match) {
    return Buffer.from(match[2], "base64");
  }
  return Buffer.from(dataUrl, "base64");
}

function getPythonCommand(): string {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;

  const venvUnix = path.join(process.cwd(), "python", ".venv", "bin", "python3");
  const venvWin = path.join(process.cwd(), "python", ".venv", "Scripts", "python.exe");

  if (fs.existsSync(venvUnix)) return venvUnix;
  if (fs.existsSync(venvWin)) return venvWin;

  return "python3";
}

async function runPythonFreeTryOn(
  personPath: string,
  garmentPath: string,
  outputPath: string,
  promptPath: string,
): Promise<{ warning?: string; engine?: string }> {
  const scriptPath = path.join(process.cwd(), "python", "free_tryon.py");
  const python = getPythonCommand();

  return new Promise((resolve, reject) => {
    const proc = spawn(
      python,
      [scriptPath, personPath, garmentPath, outputPath, promptPath],
      {
        stdio: ["ignore", "pipe", "pipe"],
        cwd: process.cwd(),
        env: {
          ...process.env,
          HF_TOKEN: process.env.HF_TOKEN || process.env.HF_API_KEY || "",
          HF_TRYON_SPACES: process.env.HF_TRYON_SPACES || "",
          SKIP_LOCAL_TRYON_FALLBACK:
            process.env.GEMINI_API_KEY || process.env.FASHN_API_KEY ? "1" : "",
        },
      },
    );

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (c) => {
      stdout += c.toString();
    });
    proc.stderr.on("data", (c) => {
      stderr += c.toString();
    });

    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        let meta: { warning?: string; engine?: string } = {};
        try {
          const parsed = JSON.parse(stdout.trim().split("\n").pop() || "{}");
          meta = { warning: parsed.warning, engine: parsed.engine };
        } catch {
          // ignore
        }
        resolve(meta);
        return;
      }
      let message = stderr.trim() || stdout.trim();
      try {
        const parsed = JSON.parse(stdout.trim() || "{}");
        if (parsed.error) message = parsed.error;
      } catch {
        // keep message
      }
      reject(new Error(message || `Python free try-on failed (${code})`));
    });
  });
}

export type FreeTryOnResult = {
  dataUrl: string;
  warning?: string;
  engine?: string;
};

/**
 * Free virtual try-on via Python + IDM-VTON (no paid API keys).
 * Optional HF_TOKEN (free) gives more Hugging Face GPU quota.
 */
export async function runFreeVirtualTryOn(
  userImage: string,
  clothImage: string,
  prompt?: string,
  garmentFileName?: string | null,
): Promise<FreeTryOnResult> {
  const jobId = crypto.randomBytes(8).toString("hex");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `zephora-free-${jobId}-`));
  const personPath = path.join(tmpDir, "person.png");
  const garmentPath = path.join(tmpDir, "garment.png");
  const outputPath = path.join(tmpDir, "result.png");
  const promptPath = path.join(tmpDir, "prompt.txt");

  fs.writeFileSync(personPath, decodeDataUrl(userImage));
  fs.writeFileSync(garmentPath, decodeDataUrl(clothImage));

  const fullPrompt =
    prompt?.trim() ||
    buildGarmentDescription({ garmentFileName, customPrompt: null });
  fs.writeFileSync(promptPath, fullPrompt, "utf-8");

  console.log("Running Python IDM-VTON try-on...");
  const meta = await runPythonFreeTryOn(personPath, garmentPath, outputPath, promptPath);

  const buffer = fs.readFileSync(outputPath);
  const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;

  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore
  }

  return { dataUrl, warning: meta.warning, engine: meta.engine };
}
