declare global {
  interface Window {
    gapi?: {
      load: (module: string, options: { callback: () => void }) => void;
    };
    google?: {
      picker: {
        DocsView: new (viewId: unknown) => { setMode: (mode: unknown) => unknown };
        ViewId: { SPREADSHEETS: unknown };
        DocsViewMode: { LIST: unknown };
        PickerBuilder: new () => PickerBuilder;
        Action: { PICKED: string; CANCEL: string };
      };
    };
  }
}

interface PickerBuilder {
  addView: (view: unknown) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  setDeveloperKey: (key: string) => PickerBuilder;
  setCallback: (callback: (data: { action: string; docs?: { id: string }[] }) => void) => PickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
}

const GAPI_SCRIPT_SRC = 'https://apis.google.com/js/api.js';
const PICKER_LOAD_TIMEOUT_MS = 15000;

let gapiLoadPromise: Promise<void> | null = null;

function loadGapiScript(): Promise<void> {
  if (window.gapi) return Promise.resolve();
  if (gapiLoadPromise) return gapiLoadPromise;
  gapiLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GAPI_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google API 스크립트를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  }).catch((err) => {
    // Don't cache a failed load — a transient network blip shouldn't wedge every future
    // pickSpreadsheet() call for the rest of the page session.
    gapiLoadPromise = null;
    throw err;
  });
  return gapiLoadPromise;
}

let pickerLibPromise: Promise<void> | null = null;

function loadPickerLib(): Promise<void> {
  if (pickerLibPromise) return pickerLibPromise;
  pickerLibPromise = loadGapiScript()
    .then(
      () =>
        new Promise<void>((resolve, reject) => {
          // gapi.load has no built-in error callback — without this timeout, a stalled
          // picker-module fetch would hang pickSpreadsheet() (and the caller's busy state)
          // forever with no way to recover short of a full page reload.
          const timer = setTimeout(
            () => reject(new Error('Google Picker 모듈을 불러오는 데 실패했습니다.')),
            PICKER_LOAD_TIMEOUT_MS
          );
          window.gapi!.load('picker', {
            callback: () => {
              clearTimeout(timer);
              resolve();
            },
          });
        })
    )
    .catch((err) => {
      pickerLibPromise = null;
      throw err;
    });
  return pickerLibPromise;
}

// Opens Google Picker restricted to Spreadsheets, scoped by the given (already-minted,
// short-lived, drive.file-scoped) access token. Resolves with the picked file id, or null
// if the user cancelled.
export async function pickSpreadsheet(accessToken: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_PICKER_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error(
      'VITE_GOOGLE_PICKER_API_KEY가 설정되지 않았습니다. Google Cloud Console에서 Picker API 키를 발급해 환경변수로 등록하세요.'
    );
  }

  await loadPickerLib();
  const google = window.google!;

  return new Promise((resolve) => {
    const view = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS).setMode(
      google.picker.DocsViewMode.LIST
    );
    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setCallback((data) => {
        if (data.action === google.picker.Action.PICKED) {
          resolve(data.docs?.[0]?.id ?? null);
        } else if (data.action === google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();
    picker.setVisible(true);
  });
}
