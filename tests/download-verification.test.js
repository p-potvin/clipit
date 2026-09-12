const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const backgroundCode = fs.readFileSync(path.join(root, "src", "background.js"), "utf8");

test("background download logic converts data URL to Blob ObjectURL and invokes downloads.download", async () => {
  let downloadCalledWith = null;
  let objectUrlCreated = null;
  let objectUrlRevoked = null;

  // Mock environment
  const mockApi = {
    contextMenus: {
      remove: (_id, cb) => cb(),
      create: () => {},
      onClicked: { addListener: () => {} }
    },
    runtime: {
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
      onMessage: { addListener: (fn) => { mockApi.messageHandler = fn; } },
      lastError: null
    },
    action: {
      onClicked: { addListener: () => {} }
    },
    downloads: {
      download: (options, callback) => {
        downloadCalledWith = options;
        if (callback) callback(101);
        return Promise.resolve(101);
      }
    }
  };

  const sandbox = {
    globalThis: {
      ClipItI18n: { getStrings: () => ({ menuStartClip: "Start clip" }) },
      browser: mockApi,
      fetch: async (url) => {
        // Return a response whose blob() works
        const parts = url.split(",");
        const base64 = parts[1];
        const buffer = Buffer.from(base64, "base64");
        return {
          blob: async () => new Blob([buffer], { type: "video/webm" })
        };
      },
      URL: {
        createObjectURL: (blob) => {
          objectUrlCreated = "blob:moz-extension://uuid-12345/clip-id";
          return objectUrlCreated;
        },
        revokeObjectURL: (url) => {
          objectUrlRevoked = url;
        }
      },
      Blob,
      atob: (b64) => Buffer.from(b64, "base64").toString("binary"),
      Uint8Array,
      setTimeout: (fn) => fn() // immediate execution in test
    }
  };

  const runBackground = new Function(
    "globalThis",
    "browser",
    "fetch",
    "URL",
    "Blob",
    "atob",
    "Uint8Array",
    "setTimeout",
    backgroundCode
  );

  runBackground(
    sandbox.globalThis,
    mockApi,
    sandbox.globalThis.fetch,
    sandbox.globalThis.URL,
    Blob,
    sandbox.globalThis.atob,
    Uint8Array,
    sandbox.globalThis.setTimeout
  );

  // Send a CLIPIT_DOWNLOAD message with a real WebM data URL payload
  const sampleDataUrl = "data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJ8";
  const message = {
    type: "CLIPIT_DOWNLOAD",
    filename: "My/Awesome:Test?Clip.webm",
    dataUrl: sampleDataUrl
  };

  let responseData = null;
  await new Promise((resolve) => {
    mockApi.messageHandler(message, {}, (response) => {
      responseData = response;
      resolve();
    });
  });

  // Verify response
  assert.ok(responseData);
  assert.equal(responseData.ok, true);
  assert.equal(responseData.downloadId, 101);

  // Verify that downloads.download was called with the Object URL, NOT the raw data URL
  assert.ok(downloadCalledWith);
  assert.equal(downloadCalledWith.url, "blob:moz-extension://uuid-12345/clip-id");
  assert.equal(downloadCalledWith.saveAs, true);
  assert.equal(downloadCalledWith.conflictAction, "uniquify");

  // Verify sanitized filename stripped illegal characters
  assert.equal(downloadCalledWith.filename, "My-Awesome-Test-Clip.webm");

  // Verify URL was revoked
  assert.equal(objectUrlRevoked, "blob:moz-extension://uuid-12345/clip-id");
});
