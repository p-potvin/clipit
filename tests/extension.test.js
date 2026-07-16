const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(root, filePath), "utf8"));
}

function readText(filePath) {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

test("browser manifests expose the video context menu extension surface", () => {
  const chromeManifest = readJson("manifest.chrome.json");
  const firefoxManifest = readJson("manifest.firefox.json");

  assert.equal(chromeManifest.background.service_worker, "src/background.js");
  assert.equal(chromeManifest.background.scripts, undefined);

  assert.deepEqual(firefoxManifest.background.scripts, ["src/i18n.js", "src/background.js"]);

  for (const manifest of [chromeManifest, firefoxManifest]) {
    assert.equal(manifest.manifest_version, 3);
    assert.match(manifest.name, /ClipIt/);
    assert.ok(manifest.permissions.includes("contextMenus"));
    assert.ok(manifest.permissions.includes("downloads"));
    assert.deepEqual(manifest.content_scripts[0].matches, ["<all_urls>"]);
    assert.deepEqual(manifest.content_scripts[0].js, ["src/i18n.js", "src/content.js"]);
  }

  assert.equal(firefoxManifest.browser_specific_settings.gecko.id, "clipit@vaultwares.local");
});

test("root manifest defaults to the Firefox manifest", () => {
  const defaultManifest = readJson("manifest.json");
  const firefoxManifest = readJson("manifest.firefox.json");

  assert.deepEqual(defaultManifest, firefoxManifest);
});

test("i18n strings cover English and Quebec French user-facing labels", () => {
  const i18nSource = readText("src/i18n.js");

  for (const key of [
    "menuStartClip",
    "widgetTitle",
    "pause",
    "resume",
    "end",
    "recording",
    "paused",
    "saving",
    "captureUnsupported",
    "noVideoSelected"
  ]) {
    assert.match(i18nSource, new RegExp(`${key}:`, "u"));
  }

  assert.match(i18nSource, /en:\s*\{/u);
  assert.match(i18nSource, /qc:\s*\{/u);
  assert.match(i18nSource, /D.marrer l.extrait/u);
});

test("background creates one video-only Start Clip context menu and download handler", () => {
  const backgroundSource = readText("src/background.js");

  assert.match(backgroundSource, /CLIPIT_MENU_ID\s*=\s*"clipit-start-clip"/u);
  assert.match(backgroundSource, /contexts:\s*\["video"\]/u);
  assert.match(backgroundSource, /CLIPIT_START_RECORDING/u);
  assert.match(backgroundSource, /CLIPIT_DOWNLOAD/u);
  assert.match(backgroundSource, /\.downloads\.download/u);
});

test("content script records the selected video and exposes widget controls", () => {
  const contentSource = readText("src/content.js");

  assert.match(contentSource, /contextmenu/u);
  assert.match(contentSource, /HTMLVideoElement/u);
  assert.match(contentSource, /captureStream/u);
  assert.match(contentSource, /mozCaptureStream/u);
  assert.match(contentSource, /MediaRecorder/u);
  assert.match(contentSource, /pauseRecording/u);
  assert.match(contentSource, /resumeRecording/u);
  assert.match(contentSource, /stopRecording/u);
  assert.match(contentSource, /clipit-\$\{stamp\}\.webm/u);
  assert.match(contentSource, /CLIPIT_DOWNLOAD/u);
  assert.match(contentSource, /shadowRoot/u);
});

test("build tooling prepares browser-specific unpacked extension folders", () => {
  const packageJson = readJson("package.json");
  const buildSource = readText("scripts/build.js");

  assert.equal(packageJson.scripts["build:chrome"], "node scripts/build.js chrome");
  assert.equal(packageJson.scripts["build:firefox"], "node scripts/build.js firefox");
  assert.equal(packageJson.scripts.build, "node scripts/build.js all");
  assert.match(buildSource, /manifest\.chrome\.json/u);
  assert.match(buildSource, /manifest\.firefox\.json/u);
  assert.match(buildSource, /dist/u);
  assert.match(buildSource, /manifest\.json/u);
});
