import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class FakePickerBuilder {
  static instances: FakePickerBuilder[] = [];
  oauthToken?: string;
  developerKey?: string;
  callback?: (data: { action: string; docs?: { id: string }[] }) => void;

  constructor() {
    FakePickerBuilder.instances.push(this);
  }
  addView() {
    return this;
  }
  setOAuthToken(token: string) {
    this.oauthToken = token;
    return this;
  }
  setDeveloperKey(key: string) {
    this.developerKey = key;
    return this;
  }
  setCallback(cb: (data: { action: string; docs?: { id: string }[] }) => void) {
    this.callback = cb;
    return this;
  }
  build() {
    return { setVisible: vi.fn() };
  }
}

function installFakeGoogle() {
  FakePickerBuilder.instances = [];
  window.gapi = { load: vi.fn((_module, opts: { callback: () => void }) => opts.callback()) };
  const fakeGoogle = {
    picker: {
      DocsView: class {
        setMode() {
          return this;
        }
      },
      ViewId: { SPREADSHEETS: 'spreadsheets' },
      DocsViewMode: { LIST: 'list' },
      PickerBuilder: FakePickerBuilder,
      Action: { PICKED: 'picked', CANCEL: 'cancel' },
    },
  };
  window.google = fakeGoogle as unknown as NonNullable<Window['google']>;
}

async function flushMicrotasks(times = 10) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

// Every test re-imports the module fresh so its module-level gapiLoadPromise/pickerLibPromise
// caches never leak between tests — several tests below depend on those caches starting empty.
let pickSpreadsheet: typeof import('./googlePicker').pickSpreadsheet;

beforeEach(async () => {
  vi.resetModules();
  delete (window as { gapi?: unknown }).gapi;
  delete (window as { google?: unknown }).google;
  document.head.innerHTML = '';
  ({ pickSpreadsheet } = await import('./googlePicker'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('pickSpreadsheet', () => {
  it('throws a clear error when VITE_GOOGLE_PICKER_API_KEY is not configured', async () => {
    vi.stubEnv('VITE_GOOGLE_PICKER_API_KEY', '');
    await expect(pickSpreadsheet('token')).rejects.toThrow('VITE_GOOGLE_PICKER_API_KEY');
  });

  it('resolves with the picked file id and wires the token/key through', async () => {
    vi.stubEnv('VITE_GOOGLE_PICKER_API_KEY', 'test-picker-key');
    installFakeGoogle();

    const resultPromise = pickSpreadsheet('test-access-token');
    // let the microtask queue advance so the PickerBuilder is constructed
    await flushMicrotasks();

    const builder = FakePickerBuilder.instances[0];
    expect(builder.oauthToken).toBe('test-access-token');
    expect(builder.developerKey).toBe('test-picker-key');

    builder.callback!({ action: 'picked', docs: [{ id: 'sheet-123' }] });
    await expect(resultPromise).resolves.toBe('sheet-123');
  });

  it('resolves with null when the user cancels', async () => {
    vi.stubEnv('VITE_GOOGLE_PICKER_API_KEY', 'test-picker-key');
    installFakeGoogle();

    const resultPromise = pickSpreadsheet('test-access-token');
    await flushMicrotasks();

    const builder = FakePickerBuilder.instances[0];
    builder.callback!({ action: 'cancel' });
    await expect(resultPromise).resolves.toBeNull();
  });

  it('retries after a failed script load instead of staying wedged', async () => {
    vi.stubEnv('VITE_GOOGLE_PICKER_API_KEY', 'test-picker-key');

    // First attempt: window.gapi isn't set yet, so a <script> tag gets injected.
    const firstAttempt = pickSpreadsheet('token');
    const script = document.head.querySelector(
      'script[src="https://apis.google.com/js/api.js"]'
    ) as HTMLScriptElement | null;
    expect(script).toBeTruthy();
    script!.onerror?.(new Event('error'));
    await expect(firstAttempt).rejects.toThrow('Google API 스크립트를 불러오지 못했습니다.');

    // Second attempt (network "recovered"): should not still be wedged on the cached failure.
    installFakeGoogle();
    const secondAttempt = pickSpreadsheet('token');
    await flushMicrotasks();
    const builder = FakePickerBuilder.instances[0];
    builder.callback!({ action: 'picked', docs: [{ id: 'sheet-456' }] });
    await expect(secondAttempt).resolves.toBe('sheet-456');
  });

  it('rejects instead of hanging forever when the picker module never finishes loading', async () => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_GOOGLE_PICKER_API_KEY', 'test-picker-key');
    // gapi.load's callback is never invoked, simulating a stuck/failed module fetch.
    window.gapi = { load: vi.fn() };

    const resultPromise = pickSpreadsheet('token');
    const assertion = expect(resultPromise).rejects.toThrow('Google Picker 모듈을 불러오는 데 실패했습니다.');
    await vi.advanceTimersByTimeAsync(15000);
    await assertion;
  });
});
