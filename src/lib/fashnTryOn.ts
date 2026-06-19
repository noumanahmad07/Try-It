function getFashnApiKey(): string {
  return (process.env.FASHN_API_KEY || "").trim();
}

function ensureDataUrl(image: string): string {
  if (image.startsWith("data:")) return image;
  return `data:image/png;base64,${image}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isFashnTryOnConfigured(): boolean {
  return !!getFashnApiKey();
}

/**
 * FASHN Virtual Try-On v1.6 — purpose-built fashion API.
 * Docs: https://docs.fashn.ai/api-reference/tryon-v1-6
 */
export async function runFashnVirtualTryOn(
  userImage: string,
  clothImage: string,
): Promise<string> {
  const apiKey = getFashnApiKey();
  if (!apiKey) {
    throw new Error("FASHN_API_KEY is not configured.");
  }

  const runRes = await fetch("https://api.fashn.ai/v1/run", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_name: "tryon-v1.6",
      inputs: {
        model_image: ensureDataUrl(userImage),
        garment_image: ensureDataUrl(clothImage),
        category: "tops",
        garment_photo_type: "auto",
        mode: "balanced",
        return_base64: true,
        output_format: "png",
      },
    }),
  });

  const runBody = await runRes.json().catch(() => ({}));
  if (!runRes.ok) {
    const msg =
      runBody?.error?.message ||
      runBody?.message ||
      `FASHN API error (${runRes.status})`;
    throw new Error(msg);
  }

  if (runBody?.error) {
    throw new Error(runBody.error.message || "FASHN request rejected");
  }

  const predictionId = runBody?.id as string | undefined;
  if (!predictionId) {
    throw new Error("FASHN did not return a prediction id");
  }

  for (let attempt = 0; attempt < 90; attempt++) {
    await sleep(attempt === 0 ? 1500 : 2000);

    const statusRes = await fetch(
      `https://api.fashn.ai/v1/status/${predictionId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    const status = await statusRes.json().catch(() => ({}));

    if (status.status === "completed") {
      const output = status.output?.[0] as string | undefined;
      if (!output) throw new Error("FASHN returned empty output");

      if (output.startsWith("data:image")) return output;

      if (output.startsWith("http://") || output.startsWith("https://")) {
        const imgRes = await fetch(output);
        if (!imgRes.ok) throw new Error("Failed to download FASHN result image");
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        return `data:image/png;base64,${buffer.toString("base64")}`;
      }

      return `data:image/png;base64,${output}`;
    }

    if (status.status === "failed") {
      throw new Error(
        status.error?.message || status.error?.name || "FASHN try-on failed",
      );
    }
  }

  throw new Error("FASHN try-on timed out. Please try again.");
}
