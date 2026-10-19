const COMPRESSIBLE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MIN_COMPRESS_BYTES = 150 * 1024; // 150KB

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * 极速压缩上传图片（如手机拍摄的 5MB~15MB 身份证照片），
 * 在浏览器端通过 Canvas 缩放到最大边 1280px 并导出 JPEG（约 100KB~200KB），耗时 <100ms。
 */
export async function compressImageForUpload(
  file: File,
  maxDim = 1280,
  quality = 0.78
): Promise<File> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }
  const mime = (file.type || '').toLowerCase();
  if (!COMPRESSIBLE_TYPES.has(mime) || file.size <= MIN_COMPRESS_BYTES) {
    return file;
  }

  try {
    const img = await loadImageElement(file);
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;
    if (!origW || !origH) return file;

    let targetW = origW;
    let targetH = origH;
    const maxSide = Math.max(origW, origH);
    if (maxSide > maxDim) {
      const ratio = maxDim / maxSide;
      targetW = Math.max(1, Math.round(origW * ratio));
      targetH = Math.max(1, Math.round(origH * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    // Fill white background for transparent PNGs before JPEG export
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    );
    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'upload';
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
