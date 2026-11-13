/**
 * Client-side photo compression & HEIC/HEIF conversion utility.
 * - Dynamically loads `heic2any` only when a .heic/.heif file is selected.
 * - Iteratively scales and JPEG-compresses photos to stay under ~8 KB per person
 *   so up to ~90–100 photos fit comfortably within Firestore's 750 KB safety cap.
 */

export function isHeicFile(file) {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();
  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'image/heic-sequence' ||
    type === 'image/heif-sequence' ||
    /\.heic$/i.test(name) ||
    /\.heif$/i.test(name)
  );
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('FILE_READ_FAILED'));
    reader.onload = ev => resolve(String(ev.target?.result || ''));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('IMAGE_DECODE_FAILED'));
    img.onload = () => resolve(img);
    img.src = src;
  });
}

function renderCompressedDataUrl(img, maxDim, quality) {
  const canvas = document.createElement('canvas');
  let w = img.naturalWidth || img.width || maxDim;
  let h = img.naturalHeight || img.height || maxDim;
  if (w > h) {
    if (w > maxDim) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    }
  } else if (h > maxDim) {
    w = Math.round((w * maxDim) / h);
    h = maxDim;
  }
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function compressPhotoFile(file, { targetBytes = 8192 } = {}) {
  let sourceBlob = file;
  if (isHeicFile(file)) {
    const mod = await import('heic2any');
    const heic2any = mod.default || mod;
    const converted = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.82
    });
    sourceBlob = Array.isArray(converted) ? converted[0] : converted;
  }

  const rawDataUrl = await readBlobAsDataUrl(sourceBlob);
  return compressDataUrl(rawDataUrl, { targetBytes });
}

export async function compressDataUrl(rawDataUrl, { targetBytes = 8192 } = {}) {
  if (!rawDataUrl || typeof rawDataUrl !== 'string') return rawDataUrl;
  if (rawDataUrl.length <= targetBytes) return rawDataUrl;

  const img = await loadImage(rawDataUrl);
  const steps = [
    [160, 0.72],
    [160, 0.56],
    [128, 0.52],
    [96, 0.45]
  ];

  let best = rawDataUrl;
  for (const [maxDim, quality] of steps) {
    const candidate = renderCompressedDataUrl(img, maxDim, quality);
    best = candidate;
    if (candidate.length <= targetBytes) {
      return candidate;
    }
  }
  return best;
}

export async function compactPhotosMap(photosMap, { targetBytes = 8192 } = {}) {
  if (!photosMap || typeof photosMap !== 'object') return { photos: {}, changed: false };
  const next = { ...photosMap };
  let changed = false;
  for (const [id, val] of Object.entries(photosMap)) {
    if (typeof val === 'string' && val.startsWith('data:image/') && val.length > targetBytes) {
      try {
        const compressed = await compressDataUrl(val, { targetBytes });
        if (compressed && compressed.length < val.length) {
          next[id] = compressed;
          changed = true;
        }
      } catch {
        // Keep original if an existing photo fails to re-decode
      }
    }
  }
  return { photos: next, changed };
}
