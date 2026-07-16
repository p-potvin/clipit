# Browser Video Clipper Design

**Approved:** Sat, 11 Jul 2026 11:51

## Goal

Build a Chrome and Firefox WebExtension that adds a video context-menu command named "Start clip". When selected, it records the clicked video, shows a floating timer widget, lets the user pause or end the clip, and saves the recorded clip through the browser download flow.

## Scope

The first version records the media stream exposed by the clicked `HTMLVideoElement` using `captureStream()` or Firefox's `mozCaptureStream()` fallback. It does not capture DRM-protected videos, cross-origin players that block media capture, or the whole tab.

## Architecture

- `manifest.chrome.json` and `manifest.firefox.json` provide browser-specific extension metadata while sharing the same scripts.
- `src/background.js` owns extension lifecycle concerns: context-menu creation, click dispatch, and download fallback.
- `src/content.js` owns page interaction: tracks the right-clicked video, starts `MediaRecorder`, renders the floating widget, and initiates the save.
- `src/i18n.js` owns English and Quebec French UI strings.
- `tests/extension.test.js` verifies manifest shape, i18n coverage, and source-level feature contracts with Node's built-in test runner.

## User Flow

1. User right-clicks a video.
2. Browser context menu shows "Start clip".
3. User clicks the menu item.
4. Extension injects a floating widget near the top-right of the page.
5. Widget shows elapsed recording time and exposes pause/resume plus end controls.
6. When the user ends the clip, the extension creates a WebM recording and downloads it as `clipit-YYYY-MM-DD-HH-mm-ss.webm`.

## UI Strings

All user-facing labels are present in EN and QC. Browser context menus use the active browser UI language when it starts with `fr`; otherwise they use EN.

## Error Handling

If the page has no tracked video, the widget shows a concise error. If the browser does not support video stream capture or `MediaRecorder`, the widget reports that the video cannot be clipped in this browser/page. If extension-download messaging fails, the content script falls back to a hidden download link.

## Verification

Use Node's built-in test runner for fast static checks:

```powershell
npm test
```

Manual browser validation remains necessary for actual media capture because WebExtension context menus and `MediaRecorder` behavior depend on the target browser.
