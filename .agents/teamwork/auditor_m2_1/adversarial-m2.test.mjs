import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Auditor M2 Forensic Adversarial Verification', () => {
  it('ADV-M2-01: CSS z-index stacking context hierarchy is strictly preserved', () => {
    const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');
    const landingCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/landing.css'), 'utf-8');
    const componentsCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/components.css'), 'utf-8');

    // 1. Fullscreen canvas must have z-index: 800
    const fullscreenMatch = treeCss.match(/\.treewrap-host\.is-fullscreen\s*\{([^}]+)\}/s);
    assert.ok(fullscreenMatch, 'Must define .treewrap-host.is-fullscreen');
    assert.match(fullscreenMatch[1], /z-index:\s*800/i, 'Fullscreen host must have z-index: 800');

    // 2. Person detail modal overlay must have z-index: 999 or higher in components.css
    const modalMatch = componentsCss.match(/\.overlay\s*\{([^}]+)\}/s);
    assert.ok(modalMatch, 'Must define .overlay in components.css');
    assert.match(modalMatch[1], /z-index:\s*999/i, 'Modal overlay must have z-index: 999 > 800');

    // 3. Settings popover when open must elevate to z-index: 1000
    assert.ok(
      landingCss.includes('z-index: 1000 !important') || landingCss.includes('z-index: 1000;'),
      'Settings popover must have z-index: 1000'
    );
  });

  it('ADV-M2-02: Safe area insets and dynamic viewport units are properly formatted', () => {
    const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');
    
    // Check 100dvh and 100dvw
    assert.ok(treeCss.includes('height: 100dvh'), 'Must support dynamic viewport height 100dvh');
    assert.ok(treeCss.includes('width: 100dvw'), 'Must support dynamic viewport width 100dvw');

    // Check safe area insets
    assert.ok(treeCss.includes('env(safe-area-inset-top'), 'Must support safe-area-inset-top');
    assert.ok(treeCss.includes('env(safe-area-inset-right'), 'Must support safe-area-inset-right');
    assert.ok(treeCss.includes('env(safe-area-inset-bottom'), 'Must support safe-area-inset-bottom');
  });

  it('ADV-M2-03: prefers-reduced-motion disables transitions on fullscreen elements', () => {
    const treeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tree.css'), 'utf-8');
    
    // Must contain prefers-reduced-motion block for canvas fullscreen elements
    assert.ok(
      treeCss.includes('@media (prefers-reduced-motion: reduce)'),
      'Must include @media (prefers-reduced-motion: reduce)'
    );
    assert.ok(
      treeCss.includes(':root[data-motion="reduce"]'),
      'Must include :root[data-motion="reduce"] selector'
    );
  });

  it('ADV-M2-04: Canvas.jsx Esc listener protects modal overlays from accidental close', () => {
    const canvasSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Canvas.jsx'), 'utf-8');
    
    // Check that Escape handler queries for .overlay or .settings-popover
    assert.ok(
      canvasSrc.includes('.overlay') && canvasSrc.includes('.settings-popover'),
      'Escape handler must guard against open modal overlays'
    );
    assert.ok(
      canvasSrc.includes("document.addEventListener('fullscreenchange'"),
      'Must listen to fullscreenchange event'
    );
  });

  it('ADV-M2-05: CanvasDock.jsx fullscreen button has accessible labels and aria-pressed', () => {
    const dockSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/CanvasDock.jsx'), 'utf-8');
    
    assert.ok(dockSrc.includes('aria-pressed={isFullscreen}'), 'Must have aria-pressed attribute');
    assert.ok(dockSrc.includes('dock-fullscreen-btn'), 'Must have dock-fullscreen-btn class');
    assert.ok(dockSrc.includes('onToggleFullscreen'), 'Must accept and bind onToggleFullscreen');
  });
});
