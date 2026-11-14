/**
 * Client-side photo compression & HEIC/HEIF conversion utility.
 * - Decodes directly from Blob/File via createImageBitmap or Object URLs to avoid
 *   allocating multi-megabyte base64 strings before downscaling.
 * - Dynamically loads `heic2any` only when native decoding fails on a .heic/.heif file.
 * - Guards all async decode/conversion paths with strict timeouts so uploads never hang.
 * - Iteratively scales and JPEG-compresses photos to stay under ~8 KB per person
 *   so up to ~90–100 photos fit comfortably within Firestore's 750 KB safety cap.
 */

const COMPRESSION_STEPS = [
  [160, 0.72],
  [160, 0.56],
  [128, 0.52],
  [96, 0.45],
  [72, 0.4]
];

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

function withTimeout(promise, ms, code = 'OPERATION_TIMEOUT') {
  let timerId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => reject(new Error(code)), ms);
  });
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
  });
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

function renderCompressedDataUrl(drawable, maxDim, quality) {
  const canvas = document.createElement('canvas');
  let w = drawable.naturalWidth || drawable.videoWidth || drawable.width || maxDim;
  let h = drawable.naturalHeight || drawable.videoHeight || drawable.height || maxDim;
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
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(drawable, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

function compressDrawableToDataUrl(drawable, { targetBytes = 8192 } = {}) {
  let best = '';
  for (const [maxDim, quality] of COMPRESSION_STEPS) {
    const candidate = renderCompressedDataUrl(drawable, maxDim, quality);
    best = candidate;
    if (candidate.length <= targetBytes) {
      return candidate;
    }
  }
  return best;
}

async function decodeBlobToDrawable(blob, timeoutMs = 8000) {
  if (!blob) throw new Error('EMPTY_FILE');

  if (typeof createImageBitmap === 'function') {
    try {
      return await withTimeout(createImageBitmap(blob), timeoutMs, 'BITMAP_DECODE_TIMEOUT');
    } catch (err) {
      if (err?.message === 'BITMAP_DECODE_TIMEOUT') throw err;
    }
  }

  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const objUrl = URL.createObjectURL(blob);
    try {
      return await withTimeout(loadImage(objUrl), timeoutMs, 'IMAGE_DECODE_TIMEOUT');
    } finally {
      if (typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(objUrl);
      }
    }
  }

  const rawDataUrl = await withTimeout(readBlobAsDataUrl(blob), timeoutMs, 'FILE_READ_TIMEOUT');
  return withTimeout(loadImage(rawDataUrl), timeoutMs, 'IMAGE_DECODE_TIMEOUT');
}

async function convertHeicBlob(file, timeoutMs = 12000) {
  const mod = await withTimeout(import('heic2any'), timeoutMs, 'HEIC_IMPORT_TIMEOUT');
  const heic2any = mod.default || mod;

  const worker = typeof window !== 'undefined' ? window.__heic2any__worker : null;
  let onWorkerError = null;

  const conversionPromise = new Promise((resolve, reject) => {
    if (worker && typeof worker.addEventListener === 'function') {
      onWorkerError = () => reject(new Error('HEIC_WORKER_ERROR'));
      worker.addEventListener('error', onWorkerError, { once: true });
    }
    Promise.resolve(
      heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.82
      })
    ).then(resolve, reject);
  });

  try {
    const converted = await withTimeout(conversionPromise, timeoutMs, 'HEIC_CONVERSION_TIMEOUT');
    const resultBlob = Array.isArray(converted) ? converted[0] : converted;
    if (!resultBlob) throw new Error('HEIC_CONVERSION_EMPTY');
    return resultBlob;
  } finally {
    if (worker && onWorkerError && typeof worker.removeEventListener === 'function') {
      worker.removeEventListener('error', onWorkerError);
    }
  }
}

export async function compressPhotoFile(file, { targetBytes = 8192, timeoutMs = 8000 } = {}) {
  if (!file) throw new Error('EMPTY_FILE');

  // Try native browser decoding first (covers JPG, PNG, WebP, GIF, AVIF, and native HEIC)
  try {
    const drawable = await decodeBlobToDrawable(file, timeoutMs);
    try {
      return compressDrawableToDataUrl(drawable, { targetBytes });
    } finally {
      drawable?.close?.();
    }
  } catch (nativeErr) {
    if (!isHeicFile(file)) {
      throw nativeErr;
    }
  }

  // Fallback for HEIC/HEIF files on browsers without native OS HEIC codecs
  const heicTimeout = Math.max(timeoutMs, 12000);
  const convertedBlob = await convertHeicBlob(file, heicTimeout);
  const drawable = await decodeBlobToDrawable(convertedBlob, timeoutMs);
  try {
    return compressDrawableToDataUrl(drawable, { targetBytes });
  } finally {
    drawable?.close?.();
  }
}

export async function compressDataUrl(rawDataUrl, { targetBytes = 8192, timeoutMs = 8000 } = {}) {
  if (!rawDataUrl || typeof rawDataUrl !== 'string') return rawDataUrl;
  if (rawDataUrl.length <= targetBytes) return rawDataUrl;

  const img = await withTimeout(loadImage(rawDataUrl), timeoutMs, 'IMAGE_DECODE_TIMEOUT');
  return compressDrawableToDataUrl(img, { targetBytes });
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
