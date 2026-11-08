/**
 * W3C Window, Location, History & EventTarget Mock.
 * Simulates URL state transitions, back/forward history, and popstate events in Node.
 */
import { MockStorage } from './storage-mock.mjs';

export class MockWindow extends EventTarget {
  constructor(initialUrl = 'http://localhost:3000/?view=home', initialStorage = {}) {
    super();
    this.location = new URL(initialUrl);
    this.localStorage = new MockStorage(initialStorage);
    this.historyStack = [this.location.href];
    this.historyIndex = 0;
    this.innerWidth = 1280;
    this.innerHeight = 800;

    const self = this;
    this.history = {
      pushState(state, unused, url) {
        const next = new URL(url, self.location.origin);
        self.location = next;
        self.historyStack.splice(self.historyIndex + 1);
        self.historyStack.push(self.location.href);
        self.historyIndex++;
      },
      replaceState(state, unused, url) {
        const next = new URL(url, self.location.origin);
        self.location = next;
        self.historyStack[self.historyIndex] = self.location.href;
      },
      back() {
        if (self.historyIndex > 0) {
          self.historyIndex--;
          self.location = new URL(self.historyStack[self.historyIndex]);
          self.dispatchEvent(new Event('popstate'));
        }
      },
      forward() {
        if (self.historyIndex < self.historyStack.length - 1) {
          self.historyIndex++;
          self.location = new URL(self.historyStack[self.historyIndex]);
          self.dispatchEvent(new Event('popstate'));
        }
      },
      get length() {
        return self.historyStack.length;
      }
    };
  }
}

/**
 * Installs mock window and localStorage onto globalThis.
 * Returns an uninstaller cleanup function for test teardown.
 */
export function installMockBrowser(initialUrl = 'http://localhost:3000/?view=home', initialStorage = {}) {
  const win = new MockWindow(initialUrl, initialStorage);
  const prevWindow = globalThis.window;
  const prevLocalStorage = globalThis.localStorage;

  globalThis.window = win;
  globalThis.localStorage = win.localStorage;

  return {
    window: win,
    cleanup() {
      if (prevWindow !== undefined) {
        globalThis.window = prevWindow;
      } else {
        delete globalThis.window;
      }
      if (prevLocalStorage !== undefined) {
        globalThis.localStorage = prevLocalStorage;
      } else {
        delete globalThis.localStorage;
      }
    }
  };
}
