import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Polyfill for File.text() which is not available in jsdom
if (!File.prototype.text) {
  Object.defineProperty(File.prototype, 'text', {
    async value() {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(this);
      });
    },
  });
}

// jsdom doesn't implement matchMedia — Shell.tsx uses it to pick the sidebar's
// initial open/closed state. Default to "matches: false" (mobile-sized) unless a
// test overrides it.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

// jsdom doesn't implement scrollIntoView — ProgressTab.tsx uses it to jump to the most
// recently checked item on load. Stub it as a no-op; tests that care which element it was
// called on spy on it themselves (vi.spyOn keeps this stub as the fallback implementation).
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  cleanup();
});
