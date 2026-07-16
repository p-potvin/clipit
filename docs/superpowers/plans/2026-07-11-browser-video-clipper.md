# Browser Video Clipper Implementation Plan

Created: Sat, 11 Jul 2026 11:59

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome and Firefox WebExtension that records the clicked video from a context-menu action and saves the clip through the browser download flow.

**Architecture:** The extension uses Manifest V3 with browser-specific manifest files and shared JavaScript. A background service worker owns context-menu registration and download requests; a content script tracks the clicked video, records with `MediaRecorder`, renders the floating widget, and falls back to link download when needed.

**Tech Stack:** WebExtension APIs, Manifest V3, plain JavaScript, Node built-in test runner.

---

## File Structure

- `package.json`: npm metadata and `npm test` script.
- `manifest.chrome.json`: Chrome extension manifest.
- `manifest.firefox.json`: Firefox extension manifest.
- `src/i18n.js`: shared EN/QC labels.
- `src/background.js`: context-menu creation and download dispatch.
- `src/content.js`: video tracking, recording controller, floating widget, and save fallback.
- `tests/extension.test.js`: static contract checks for manifests and scripts.
- `README.md`: load and validation instructions.

### Task 1: Static Test Harness

**Files:**
- Create: `package.json`
- Create: `tests/extension.test.js`

- [ ] **Step 1: Write the failing test**

Create `package.json` with a Node test script and `tests/extension.test.js` with manifest, i18n, and source-contract checks. The initial expected failure is missing manifest/source files.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `manifest.chrome.json` and shared source files do not exist yet.

- [ ] **Step 3: Keep test files unchanged until production files exist**

No production code is added in this task.

### Task 2: Extension Manifests and Background

**Files:**
- Create: `manifest.chrome.json`
- Create: `manifest.firefox.json`
- Create: `src/i18n.js`
- Create: `src/background.js`

- [ ] **Step 1: Implement minimal manifests**

Add MV3 manifests with `contextMenus`, `downloads`, `activeTab`, shared background service worker, and content script on `<all_urls>`.

- [ ] **Step 2: Implement background behavior**

Register `clipit-start-clip` for the `video` context, dispatch `CLIPIT_START_RECORDING` to the tab/frame, and handle `CLIPIT_DOWNLOAD` messages through `downloads.download`.

- [ ] **Step 3: Run tests**

Run: `npm test`

Expected: source-contract tests still fail until `src/content.js` exists.

### Task 3: Content Recording and Widget

**Files:**
- Create: `src/content.js`

- [ ] **Step 1: Implement clicked-video tracking**

Listen for `contextmenu` events, keep the most recent `HTMLVideoElement`, and start only from that element.

- [ ] **Step 2: Implement recording controller**

Use `captureStream()` or `mozCaptureStream()`, construct `MediaRecorder`, track elapsed time excluding paused intervals, and emit a WebM blob on stop.

- [ ] **Step 3: Implement widget**

Render a shadow-root widget with timer, pause/resume, end, and status/error states using local CSS variables based on VaultWares Revisited tokens.

- [ ] **Step 4: Implement save path**

Convert the blob to a data URL for background `downloads.download`; if that fails, use a hidden anchor download.

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: PASS.

### Task 4: Documentation and Final Verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Add loading instructions**

Document Chrome and Firefox loading paths, known limitations, and validation steps.

- [ ] **Step 2: Run final verification**

Run: `npm test`

Expected: PASS with all static checks.
