import '@testing-library/jest-dom/vitest';

// Mock window.matchMedia for jsdom
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Mock window.fetch in jsdom tests to handle relative API routes cleanly
if (!globalThis.fetch || typeof globalThis.fetch !== 'function') {
  // @ts-ignore
  globalThis.fetch = vi.fn();
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = typeof input === 'string' ? input : input.toString();
  if (urlStr.startsWith('/api/') || urlStr.includes('/api/')) {
    return new Response(JSON.stringify({ results: [], papers: [], collections: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return originalFetch(input, init);
};
