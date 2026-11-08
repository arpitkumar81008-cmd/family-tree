/**
 * Unified E2E Test Harness Export.
 */
export { MockStorage } from './storage-mock.mjs';
export { MockWindow, installMockBrowser } from './window-mock.mjs';
export {
  matchSelector,
  countMatches,
  assertElementExists,
  assertElementCount,
  assertAttribute,
  assertTextContent,
  assertClass,
  assertTabSelected
} from './dom-assert.mjs';
export {
  getViteServer,
  loadComponent,
  renderComponentToHtml,
  closeViteServer
} from './ssr-runner.mjs';
