import imageCompression from 'browser-image-compression';

export async function compressImage(file: File, options: { maxWidth: number; maxHeight: number; quality: number }) {
  const compressionOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: Math.max(options.maxWidth, options.maxHeight),
    useWebWorker: true,
    initialQuality: options.quality
  };
  return await imageCompression(file, compressionOptions);
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
