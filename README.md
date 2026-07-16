# ClipIt Video Clipper

Created: Sat, 11 Jul 2026 11:59

ClipIt is a Manifest V3 WebExtension for Chrome and Firefox. It adds a video context-menu item named "Start clip"; selecting it records the right-clicked video, opens a floating widget with a timer, and lets you pause/resume or end the clip. Ending the clip saves a `.webm` file through the browser download prompt.

## Files

- `manifest.chrome.json`: Chrome extension manifest.
- `manifest.firefox.json`: Firefox extension manifest.
- `manifest.json`: default source-folder manifest; this intentionally matches Firefox.
- `src/background.js`: context-menu and download handling.
- `src/content.js`: selected-video capture, floating widget, recording, and fallback save.
- `src/i18n.js`: EN and QC labels.
- `tests/extension.test.js`: static extension contract checks.

## Load In Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Choose **Load unpacked**.
5. Select this folder: `C:\Users\Administrator\Desktop\Github Repos\clipit\dist\chrome`.

## Load In Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on**.
3. Select `C:\Users\Administrator\Desktop\Github Repos\clipit\manifest.json`.

## Build

```powershell
npm run build
```

This creates:

- `dist/chrome`
- `dist/firefox`

Each folder contains the browser-specific `manifest.json` expected by that browser.

## Manual Source Loading

Firefox is the source-folder default, so `manifest.json` is ready for Firefox temporary loading. If you want Chrome to load straight from the source folder instead of `dist`, copy the Chrome manifest over the default first:

```powershell
Copy-Item manifest.chrome.json manifest.json
```

To restore Firefox as the default:

```powershell
Copy-Item manifest.firefox.json manifest.json
```

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select this folder: `C:\Users\Administrator\Desktop\Github Repos\clipit`.
5. For Firefox, select the default `manifest.json` from `about:debugging`.

## Use

1. Open a page with a regular HTML video.
2. Right-click the video.
3. Choose **Start clip**.
4. Use the floating widget to pause/resume or end the clip.
5. Choose the save location when the browser download prompt opens.

## Limitations

- DRM-protected video and some cross-origin players may block `captureStream()`.
- Very long clips can be memory-heavy because the browser extension download path receives a data URL. If that path fails, ClipIt falls back to a normal hidden-link download.
- The first version records the clicked video element, not the whole tab.

## Validate

```powershell
npm test
```
