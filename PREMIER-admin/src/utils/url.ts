export function resolveImageUrl(value?: string): string {
  if (!value) return '';
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;
  const normalized = normalizeUploadPath(value);
  if (normalized.startsWith('/uploads/')) return `/api${normalized}`;
  return normalized;
}

export function normalizeUploadPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/api/uploads/')) return trimmed;
  if (trimmed.startsWith('api/uploads/')) return `/${trimmed}`;
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`;

  const apiUploadsIndex = trimmed.indexOf('/api/uploads/');
  if (apiUploadsIndex >= 0) return trimmed.slice(apiUploadsIndex);

  const uploadsIndex = trimmed.indexOf('/uploads/');
  if (uploadsIndex >= 0) return trimmed.slice(uploadsIndex);

  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export async function compressImageFile(
  file: Blob | File,
  maxBytes = 300 * 1024,
  maxDimension = 1600
): Promise<Blob | File> {
  if (
    typeof window === 'undefined' ||
    !(file instanceof Blob) ||
    !file.type.startsWith('image/') ||
    file.type === 'image/gif' ||
    file.type === 'image/svg+xml' ||
    file.size <= maxBytes
  ) {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width <= 0 || height <= 0) {
        resolve(file);
        return;
      }
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const outputType = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          const origName = (file as File).name || 'upload.jpg';
          const ext = outputType === 'image/webp' ? '.webp' : '.jpg';
          const nextName = origName.replace(/\.[^.]+$/, '') + ext;
          resolve(new File([blob], nextName, { type: outputType, lastModified: Date.now() }));
        },
        outputType,
        0.82
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}
