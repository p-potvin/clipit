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

test("Firefox manifest exposes MV3, Gecko settings, SVG icons and modular scripts", () => {
  const manifest = readJson("manifest.json");
  const firefoxManifest = readJson("manifest.firefox.json");

  assert.deepEqual(manifest, firefoxManifest);
  assert.equal(manifest.manifest_version, 3);
  assert.match(manifest.name, /ClipIt/);
  assert.ok(manifest.permissions.includes("contextMenus"));
  assert.ok(manifest.permissions.includes("downloads"));
  assert.ok(manifest.permissions.includes("activeTab"));

  // Firefox MV3 background
  assert.deepEqual(manifest.background.scripts, ["src/i18n.js", "src/background.js"]);

  // Content scripts order
  assert.deepEqual(manifest.content_scripts[0].js, [
    "src/i18n.js",
    "src/smartname.js",
    "src/trimmer.js",
    "src/styles.js",
    "src/widget.js",
    "src/content.js"
  ]);

  // Gecko ID, min version, and data collection permissions
  assert.equal(manifest.browser_specific_settings.gecko.id, "clipit@vaultwares.local");
  assert.equal(manifest.browser_specific_settings.gecko.strict_min_version, "140.0");
  assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions, {
    required: ["none"]
  });

  // SVG Icon definitions
  assert.equal(manifest.icons["128"], "icons/icon.svg");
  assert.equal(manifest.action.default_icon, "icons/icon.svg");
  assert.ok(fs.existsSync(path.join(root, "icons", "icon.svg")));
});

test("i18n strings cover English and Quebec French labels for clipping and trimming", () => {
  const i18n = require("../src/i18n.js");
  const i18nModule = globalThis.ClipItI18n;

  for (const lang of ["en", "qc"]) {
    const s = i18nModule.STRINGS[lang];
    assert.ok(s);
    assert.ok(s.menuStartClip);
    assert.ok(s.widgetTitle);
    assert.ok(s.end);
    assert.ok(s.cancel);
    assert.ok(s.recording);
    assert.ok(s.review);
    assert.ok(s.saveClip);
    assert.ok(s.discard);
    assert.ok(s.clipNameLabel);
    assert.ok(s.trimIn);
    assert.ok(s.trimOut);
    assert.ok(s.setIn);
    assert.ok(s.setOut);
    assert.ok(s.errorTitle);
    assert.ok(s.captureUnsupported);
    assert.ok(s.noVideoSelected);
  }

  assert.match(i18nModule.STRINGS.qc.menuStartClip, /Démarrer/);
  assert.match(i18nModule.STRINGS.qc.review, /Aperçu/);
});

test("smartname module sanitizes tab titles and formats default webm filenames", () => {
  const smartName = require("../src/smartname.js");

  // Title sanitization tests
  assert.equal(smartName.sanitizeTitle("NASA Live: Artemis Mission - YouTube"), "NASA-Live-Artemis-Mission");
  assert.equal(smartName.sanitizeTitle("Gaming Stream | Twitch"), "Gaming-Stream");
  assert.equal(smartName.sanitizeTitle("Illegal / : * ? \" < > | Characters"), "Illegal-Characters");
  assert.equal(smartName.sanitizeTitle("   Multiple   Spaces   and --- dashes   "), "Multiple-Spaces-and-dashes");
  assert.equal(smartName.sanitizeTitle(""), "clip");
  assert.equal(smartName.sanitizeTitle(null), "clip");

  // Filename generator tests
  const sampleName = smartName.generateDefaultName("Rocket Launch - YouTube", "2026-09-10_23-30-00");
  assert.equal(sampleName, "Rocket-Launch-2026-09-10_23-30-00");

  // WebM extension enforcement
  assert.equal(smartName.ensureWebmExtension("my-cool-clip"), "my-cool-clip.webm");
  assert.equal(smartName.ensureWebmExtension("my-cool-clip.webm"), "my-cool-clip.webm");
  assert.equal(smartName.ensureWebmExtension("my-cool-clip.WEBM"), "my-cool-clip.WEBM");
  assert.equal(smartName.ensureWebmExtension("bad/name:here"), "bad-name-here.webm");
  assert.equal(smartName.ensureWebmExtension(""), "clip.webm");
});

test("vaultsqware styles export obsidian, warm bone, iris, coral tokens and hardware LEDs", () => {
  const styles = require("../src/styles.js");
  const css = globalThis.ClipItStyles.VAULTSQWARE_CSS;

  // Vaultsqware core tokens
  assert.match(css, /--vwsq-console-bg:\s*#0a0c11/);
  assert.match(css, /--vwsq-console-surface:\s*#11141b/);
  assert.match(css, /--vwsq-console-raised:\s*#191d27/);
  assert.match(css, /--vwsq-warm-bg:\s*#edece8/);
  assert.match(css, /--vwsq-warm-ink:\s*#0f1116/);
  assert.match(css, /--vwsq-iris-500:\s*#6e7bf2/);
  assert.match(css, /--vwsq-coral-500:\s*#ff8a6b/);
  assert.match(css, /--vwsq-signal-alert:\s*#f45d6b/);

  // Hardware LED & Dual-region components
  assert.match(css, /\.vwsq-console-shell/);
  assert.match(css, /\.vwsq-warm-badge/);
  assert.match(css, /\.vwsq-led/);
  assert.match(css, /@keyframes vwsqLedPulse/);
  assert.match(css, /\.clipit-preview-video/);
  assert.match(css, /\.clipit-range/);
});

test("background script forwards tab title and registers video context menu", () => {
  const backgroundSource = readText("src/background.js");

  assert.match(backgroundSource, /CLIPIT_MENU_ID\s*=\s*"clipit-start-clip"/);
  assert.match(backgroundSource, /contexts:\s*\["video"\]/);
  assert.match(backgroundSource, /tabTitle:\s*\(tab\s*&&\s*tab\.title\)\s*\|\|\s*""/);
  assert.match(backgroundSource, /CLIPIT_START_RECORDING/);
  assert.match(backgroundSource, /CLIPIT_DOWNLOAD/);
  assert.match(backgroundSource, /api\.downloads\.download/);
});

test("content script coordinates ongoing video capture, trimming, and smartnaming without pausing", () => {
  const contentSource = readText("src/content.js");

  // No pause logic
  assert.doesNotMatch(contentSource, /pauseRecording/);
  assert.doesNotMatch(contentSource, /resumeRecording/);

  // Essential video capture and trim triggers
  assert.match(contentSource, /HTMLVideoElement/);
  assert.match(contentSource, /captureStream/);
  assert.match(contentSource, /mozCaptureStream/);
  assert.match(contentSource, /MediaRecorder/);
  assert.match(contentSource, /trimWebmBlob/);
  assert.match(contentSource, /generateDefaultName/);
  assert.match(contentSource, /ensureWebmExtension/);
  assert.match(contentSource, /setReviewState/);
  assert.match(contentSource, /setSavingState/);
});

test("trimmer module provides mime detection and duration utilities", () => {
  const trimmer = require("../src/trimmer.js");
  const trimmerModule = globalThis.ClipItTrimmer;

  assert.ok(typeof trimmerModule.getSupportedMimeType === "function");
  assert.ok(typeof trimmerModule.getVideoDuration === "function");
  assert.ok(typeof trimmerModule.trimWebmBlob === "function");
  assert.match(trimmerModule.getSupportedMimeType(), /video\/webm/);
});

test("build tooling packages extension for Firefox with icons and modular src", () => {
  const buildSource = readText("scripts/build.js");
  const packageJson = readJson("package.json");

  assert.equal(packageJson.scripts["build:firefox"], "node scripts/build.js firefox");
  assert.match(buildSource, /manifest\.firefox\.json/);
  assert.match(buildSource, /icons/);
  assert.match(buildSource, /src/);
});
