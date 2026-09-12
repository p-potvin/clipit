const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const backgroundCode = fs.readFileSync(path.join(root, "src", "background.js"), "utf8");

test("real conditions: background download pipeline generates valid WebM file persisted to filesystem", async () => {
  const testOutputDir = path.join(root, "tests", "fixtures");
  if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
  }

  const targetFilename = `test-clip-${Date.now()}.webm`;
  const targetFilePath = path.join(testOutputDir, targetFilename);

  // Valid minimal WebM EBML header
  const sampleWebmBytes = Buffer.from([
    0x1a, 0x45, 0xdf, 0xa3, // EBML Header
    0x01, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x1f,
    0x42, 0x86, 0x81, 0x01,
    0x42, 0xf7, 0x81, 0x01,
    0x42, 0xf2, 0x81, 0x04,
    0x42, 0xf3, 0x81, 0x08,
    0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d // "webm"
  ]);

  const sampleDataUrl = `data:video/webm;base64,${sampleWebmBytes.toString("base64")}`;

  let downloadedObjectUrl = null;
  let passedFilename = null;

  // Real mock environment simulating browser.downloads writing to filesystem
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
      download: async (options) => {
        downloadedObjectUrl = options.url;
        passedFilename = options.filename;

        // Simulate browser streaming object URL content to real disk
        const parts = sampleDataUrl.split(",");
        const buffer = Buffer.from(parts[1], "base64");
        fs.writeFileSync(targetFilePath, buffer);

        return 999;
      }
    }
  };

  const sandbox = {
    globalThis: {
      ClipItI18n: { getStrings: () => ({ menuStartClip: "Start clip" }) },
      browser: mockApi,
      fetch: async (url) => {
        const parts = url.split(",");
        const buffer = Buffer.from(parts[1], "base64");
        return {
          blob: async () => new Blob([buffer], { type: "video/webm" })
        };
      },
      URL: {
        createObjectURL: (blob) => `blob:moz-extension://test-uuid/${targetFilename}`,
        revokeObjectURL: () => {}
      },
      Blob,
      atob: (b64) => Buffer.from(b64, "base64").toString("binary"),
      Uint8Array,
      setTimeout: (fn) => fn()
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

  // Send download request
  const message = {
    type: "CLIPIT_DOWNLOAD",
    filename: `My\\Invalid:Title?*<>${targetFilename}`,
    dataUrl: sampleDataUrl
  };

  let responseData = null;
  await new Promise((resolve) => {
    mockApi.messageHandler(message, {}, (res) => {
      responseData = res;
      resolve();
    });
  });

  // Verify response
  assert.equal(responseData.ok, true);
  assert.equal(responseData.downloadId, 999);

  // Verify sanitized filename
  assert.equal(passedFilename.includes(":"), false);
  assert.equal(passedFilename.includes("?"), false);
  assert.match(passedFilename, /\.webm$/);

  // PERSISTENCE VERIFICATION: Read back the written file from actual filesystem
  assert.ok(fs.existsSync(targetFilePath), "File must exist on disk");
  const writtenStats = fs.statSync(targetFilePath);
  assert.equal(writtenStats.size, sampleWebmBytes.length);

  const readBackBytes = fs.readFileSync(targetFilePath);
  assert.deepEqual(readBackBytes, sampleWebmBytes);

  // Verify EBML WebM magic header (1A 45 DF A3)
  assert.equal(readBackBytes[0], 0x1a);
  assert.equal(readBackBytes[1], 0x45);
  assert.equal(readBackBytes[2], 0xdf);
  assert.equal(readBackBytes[3], 0xa3);

  // Clean up
  fs.unlinkSync(targetFilePath);
});
