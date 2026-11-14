import { getInitials } from '../data/familyData.js';
import { isSafePhotoUrl } from '../data/schema.js';

const CARD_W = 96;
const HEADER_H = 72;
const MAX_CANVAS_DIM = 8192;

/**
 * Loads an image from a data URL or URL, resolving to null on failure.
 */
function loadImage(src) {
  if (!src || !isSafePhotoUrl(src)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Draws a rounded rectangle path on the 2D canvas context.
 */
function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Strokes an SVG path string (supports M/H/V/L orthogonal commands, using Path2D when available).
 */
function strokeSvgPath(ctx, pathStr) {
  if (!pathStr || !pathStr.trim()) return;
  if (typeof Path2D !== 'undefined') {
    const p2d = new Path2D(pathStr);
    ctx.stroke(p2d);
    return;
  }

  ctx.beginPath();
  const tokens = pathStr.match(/[MHVLmhvl][^MHVLmhvl]*/g) || [];
  let cx = 0;
  let cy = 0;
  for (const tok of tokens) {
    const cmd = tok[0];
    const nums = (tok.slice(1).trim().match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (cmd === 'M' && nums.length >= 2) {
      cx = nums[0];
      cy = nums[1];
      ctx.moveTo(cx, cy);
    } else if (cmd === 'H' && nums.length >= 1) {
      cx = nums[0];
      ctx.lineTo(cx, cy);
    } else if (cmd === 'V' && nums.length >= 1) {
      cy = nums[0];
      ctx.lineTo(cx, cy);
    } else if (cmd === 'L' && nums.length >= 2) {
      cx = nums[0];
      cy = nums[1];
      ctx.lineTo(cx, cy);
    }
  }
  ctx.stroke();
}

/**
 * Wraps text into at most maxLines lines that fit within maxWidth, truncating with ellipsis if needed.
 */
function wrapText(ctx, text, maxWidth, maxLines = 2) {
  if (!text) return [];
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) {
        lines.push(current);
        current = word;
      } else {
        // Single long word: truncate to fit
        let clipped = word;
        while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
          clipped = clipped.slice(0, -1);
        }
        lines.push(`${clipped}…`);
        current = '';
      }
      if (lines.length >= maxLines) break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  } else if (current && lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}…`;
  }

  return lines;
}

/**
 * Normalizes layout entries into a list of { id, x, y, person } nodes.
 */
function collectPlacedNodes(layout, people = [], displayName) {
  const byId = new Map();
  for (const p of people) {
    if (p && p.id) byId.set(p.id, p);
  }

  const nodes = [];
  if (Array.isArray(layout?.placed)) {
    for (const item of layout.placed) {
      if (!item) continue;
      const id = item.id || item.person?.id;
      const person = item.person || byId.get(id) || { id, name: displayName ? displayName(id) : id };
      nodes.push({ id, x: item.x, y: item.y, person });
    }
    return nodes;
  }

  const posMap = layout?.pos || {};
  for (const [id, coord] of Object.entries(posMap)) {
    if (!coord || typeof coord.x !== 'number' || typeof coord.y !== 'number') continue;
    const person = byId.get(id) || {
      id,
      name: displayName ? displayName(id) : id
    };
    nodes.push({ id, x: coord.x, y: coord.y, person });
  }
  return nodes;
}

/**
 * Renders the laid-out family tree onto an offscreen HTML5 canvas at 2x DPI (bounded to 8192px).
 */
export async function renderTreeToCanvas(
  layout,
  {
    title = 'Family Tree',
    displayName,
    photos = {},
    people = [],
    lang = 'en',
    cardHeight = 138
  } = {}
) {
  if (typeof document === 'undefined') {
    throw new Error('renderTreeToCanvas requires a browser DOM environment.');
  }

  const nodes = collectPlacedNodes(layout, people, displayName);

  // Compute logical dimensions from layout or node bounds
  let maxNodeX = 0;
  let maxNodeY = 0;
  for (const n of nodes) {
    if (n.x + CARD_W > maxNodeX) maxNodeX = n.x + CARD_W;
    if (n.y + cardHeight > maxNodeY) maxNodeY = n.y + cardHeight;
  }

  const treeW = Math.max(layout?.W || 0, maxNodeX + 80, 640);
  const treeH = Math.max(layout?.H || 0, maxNodeY + 80, 400);
  const logicalW = treeW;
  const logicalH = HEADER_H + treeH;

  // 2x DPI bounded to safe maximum canvas dimensions
  const scale = Math.min(2, MAX_CANVAS_DIM / logicalW, MAX_CANVAS_DIM / logicalH);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(logicalW * scale));
  canvas.height = Math.max(1, Math.round(logicalH * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire 2D canvas context.');
  }

  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  // 1. Cream background
  ctx.fillStyle = '#FAF8F5';
  ctx.fillRect(0, 0, logicalW, logicalH);

  // 2. Title header
  ctx.fillStyle = '#1E293B';
  ctx.font = '700 24px "Fraunces", Georgia, serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(title, 32, 30);

  const memberCount = nodes.length;
  const dateLabel = new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const subtitle = lang === 'hi'
    ? `${memberCount} सदस्य • ${dateLabel}`
    : `${memberCount} ${memberCount === 1 ? 'Member' : 'Members'} • ${dateLabel}`;

  ctx.fillStyle = '#5B6778';
  ctx.font = '500 13px "Familjen Grotesk", system-ui, -apple-system, sans-serif';
  ctx.fillText(subtitle, 32, 54);

  // Header divider
  ctx.strokeStyle = '#E6DFD5';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, HEADER_H - 1);
  ctx.lineTo(logicalW - 24, HEADER_H - 1);
  ctx.stroke();

  // Preload all available avatar photos in parallel
  const photoEntries = await Promise.all(
    nodes.map(async (n) => {
      const src = photos?.[n.id];
      const img = src ? await loadImage(src) : null;
      return [n.id, img];
    })
  );
  const loadedPhotos = new Map(photoEntries);

  // 3. Tree coordinate space
  ctx.save();
  ctx.translate(0, HEADER_H);

  // Generation rail labels (if present)
  if (Array.isArray(layout?.genLabels)) {
    for (const g of layout.genLabels) {
      if (typeof g?.labelY === 'number') {
        ctx.save();
        ctx.strokeStyle = '#E6DFD5';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(24, g.labelY);
        ctx.lineTo(treeW - 24, g.labelY);
        ctx.stroke();
        ctx.restore();

        if (g.labelText) {
          ctx.save();
          ctx.font = '600 11px system-ui, -apple-system, sans-serif';
          const textW = ctx.measureText(g.labelText).width;
          drawRoundedRect(ctx, 20, g.labelY - 11, textW + 16, 22, 6);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = '#E6DFD5';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#5B6778';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(g.labelText, 28, g.labelY);
          ctx.restore();
        }
      }
    }
  }

  // Orthogonal connectors from layout SVG paths
  if (layout?.guideLines) {
    ctx.save();
    ctx.strokeStyle = '#8B9BB0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.globalAlpha = 0.45;
    strokeSvgPath(ctx, layout.guideLines);
    ctx.restore();
  }

  if (layout?.otherPath) {
    ctx.save();
    ctx.strokeStyle = '#64829C';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([5, 4]);
    ctx.globalAlpha = 0.85;
    strokeSvgPath(ctx, layout.otherPath);
    ctx.restore();
  }

  if (layout?.bridgePath) {
    ctx.save();
    ctx.strokeStyle = '#64829C';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([3, 3]);
    ctx.globalAlpha = 0.7;
    strokeSvgPath(ctx, layout.bridgePath);
    ctx.restore();
  }

  const primaryPath = layout?.mainPath || (!layout?.otherPath ? layout?.path : '');
  if (primaryPath) {
    ctx.save();
    ctx.strokeStyle = '#B91C3B';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);
    strokeSvgPath(ctx, primaryPath);
    ctx.restore();
  }

  // Fallback for explicit lines / couples arrays if provided
  if (Array.isArray(layout?.lines)) {
    ctx.save();
    ctx.strokeStyle = '#B91C3B';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const ln of layout.lines) {
      if (ln?.d) {
        strokeSvgPath(ctx, ln.d);
      } else if (typeof ln?.x1 === 'number' && typeof ln?.y1 === 'number') {
        ctx.beginPath();
        ctx.moveTo(ln.x1, ln.y1);
        ctx.lineTo(ln.x2, ln.y2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  if (Array.isArray(layout?.couples) && layout?.pos) {
    ctx.save();
    ctx.strokeStyle = '#B91C3B';
    ctx.lineWidth = 2;
    for (const c of layout.couples) {
      const p1 = c?.h ? layout.pos[c.h] : null;
      const p2 = c?.w ? layout.pos[c.w] : null;
      if (p1 && p2) {
        const y = p1.y + cardHeight / 2;
        const leftX = Math.min(p1.x, p2.x) + CARD_W;
        const rightX = Math.max(p1.x, p2.x);
        if (rightX > leftX) {
          ctx.beginPath();
          ctx.moveTo(leftX, y);
          ctx.lineTo(rightX, y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // 4. Person Cards
  for (const { id, x, y, person } of nodes) {
    const gender = person?.g || person?.gender || '';
    const accentColor = gender === 'M' ? '#1E40AF' : gender === 'F' ? '#9D174D' : '#64829C';
    const cardBg = gender === 'M' ? '#EFF6FF' : gender === 'F' ? '#FDF2F8' : '#FFFFFF';
    const cardBorder = gender === 'M' ? '#93C5FD' : gender === 'F' ? '#F9A8D4' : '#E6DFD5';
    const softAvatarBg = gender === 'M' ? '#DBEAFE' : gender === 'F' ? '#FCE7F3' : '#EEF2F6';

    // Card background & border
    ctx.save();
    drawRoundedRect(ctx, x, y, CARD_W, cardHeight, 10);
    ctx.fillStyle = cardBg;
    ctx.fill();
    if (person?.late) {
      ctx.setLineDash([4, 3]);
    }
    ctx.strokeStyle = cardBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Gender top accent strip clipped to card
    ctx.clip();
    ctx.fillStyle = cardBorder;
    ctx.fillRect(x, y, CARD_W, 3);
    ctx.restore();

    // Circular avatar
    const avRadius = 21;
    const avCx = x + CARD_W / 2;
    const avCy = y + 32;
    const img = loadedPhotos.get(id);

    const primaryName =
      (displayName ? displayName(id) : '') ||
      (lang === 'hi' ? person?.hi || person?.name : person?.name || person?.hi) ||
      id;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avCx, avCy, avRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = softAvatarBg;
    ctx.fill();
    ctx.clip();

    if (img) {
      // Center-crop image into square covering the circle
      const size = avRadius * 2;
      const aspect = img.width / (img.height || 1);
      let drawW = size;
      let drawH = size;
      if (aspect > 1) {
        drawW = size * aspect;
      } else {
        drawH = size / aspect;
      }
      ctx.drawImage(img, avCx - drawW / 2, avCy - drawH / 2, drawW, drawH);
    } else {
      const initials = getInitials(primaryName) || '?';
      ctx.fillStyle = accentColor;
      ctx.font = '700 14px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, avCx, avCy + 1);
    }
    ctx.restore();

    // Avatar border ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(avCx, avCy, avRadius, 0, Math.PI * 2);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.25;
    ctx.globalAlpha = 0.45;
    ctx.stroke();
    ctx.restore();

    // Names (Primary + secondary Hindi/English if available)
    const maxTextW = CARD_W - 12;
    let textY = y + 65;

    ctx.save();
    ctx.fillStyle = '#1E293B';
    ctx.font = '600 11.5px "Familjen Grotesk", "Hind", system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const primaryLines = wrapText(ctx, primaryName, maxTextW, 2);
    for (const line of primaryLines) {
      ctx.fillText(line, avCx, textY);
      textY += 13;
    }

    const secondaryName = lang === 'hi' ? person?.name : person?.hi;
    if (secondaryName && secondaryName.trim() && secondaryName.trim() !== primaryName.trim()) {
      ctx.fillStyle = '#5B6778';
      ctx.font = '400 10px "Hind", "Noto Sans Devanagari", system-ui, sans-serif';
      const secLines = wrapText(ctx, secondaryName, maxTextW, 1);
      if (secLines.length > 0 && textY + 12 <= y + cardHeight - (person?.late ? 20 : 6)) {
        ctx.fillText(secLines[0], avCx, textY + 2);
      }
    }
    ctx.restore();

    // Late badge
    if (person?.late) {
      const lateText = lang === 'hi' ? 'स्वर्गीय' : 'Late';
      ctx.save();
      ctx.font = '600 9.5px system-ui, -apple-system, sans-serif';
      const badgeW = Math.min(CARD_W - 16, ctx.measureText(lateText).width + 12);
      const badgeX = avCx - badgeW / 2;
      const badgeY = y + cardHeight - 19;
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, 14, 7);
      ctx.fillStyle = '#F3EFEA';
      ctx.fill();
      ctx.fillStyle = '#5B6778';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lateText, avCx, badgeY + 7);
      ctx.restore();
    }
  }

  ctx.restore();
  return canvas;
}

/**
 * Sanitizes a title string into a safe PNG filename.
 */
function sanitizeFilename(title = 'Family Tree') {
  const cleaned = String(title)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${cleaned || 'family-tree'}.png`;
}

/**
 * Renders the tree to canvas, converts to a PNG blob, and triggers a browser download.
 */
export async function downloadTreePng(layout, options = {}) {
  const canvas = await renderTreeToCanvas(layout, options);
  const filename = sanitizeFilename(options.title || 'Family Tree');

  const blob = await new Promise((resolve) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((b) => resolve(b), 'image/png');
    } else {
      resolve(null);
    }
  });

  if (blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  // Fallback for environments without canvas.toBlob
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Renders the tree to a PNG dataURL and opens a landscape print poster window.
 */
export async function printTreePoster(layout, options = {}) {
  const canvas = await renderTreeToCanvas(layout, options);
  const dataUrl = canvas.toDataURL('image/png');
  if (!dataUrl || !dataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('Failed to render tree poster image.');
  }
  const title = options.title || 'Family Tree';

  const win = window.open('', '_blank');
  if (!win) {
    throw new Error('Popup blocked. Please allow popups to print the family tree poster.');
  }
  try {
    win.opener = null;
  } catch {}

  const escapedTitle = String(title)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  win.document.open();
  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapedTitle}</title>
  <style>
    @page { size: landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #FAF8F5;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    img {
      max-width: 100%;
      max-height: 100vh;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
    }
  </style>
</head>
<body>
  <img id="tree-poster" src="${dataUrl}" alt="${escapedTitle}" />
</body>
</html>`);
  win.document.close();

  const img = win.document.getElementById('tree-poster');
  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {}
  };
  if (!img || img.complete) {
    triggerPrint();
  } else {
    img.addEventListener('load', triggerPrint, { once: true });
  }
}
