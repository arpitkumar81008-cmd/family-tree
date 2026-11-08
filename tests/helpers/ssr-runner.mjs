/**
 * Vite SSR Component Loader & Static HTML Renderer.
 * Evaluates JSX on-the-fly with Vite's built-in esbuild transform.
 */
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';

let viteInstance = null;

export async function getViteServer() {
  if (!viteInstance) {
    viteInstance = await createServer({
      server: { middlewareMode: true, watch: null, hmr: false, ws: false },
      appType: 'custom'
    });
  }
  return viteInstance;
}

export async function loadComponent(componentRelativePath) {
  const fullPath = path.resolve(process.cwd(), componentRelativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Contract violation: Component file "${componentRelativePath}" does not exist yet.`);
  }
  const server = await getViteServer();
  const mod = await server.ssrLoadModule(componentRelativePath);
  return mod.default || mod[Object.keys(mod)[0]];
}

export function renderComponentToHtml(Component, props = {}) {
  if (!Component) {
    throw new Error('Cannot render undefined or null Component.');
  }
  return renderToStaticMarkup(React.createElement(Component, props));
}

export async function closeViteServer() {
  if (viteInstance) {
    await viteInstance.close();
    viteInstance = null;
  }
}
