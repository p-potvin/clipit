# ClipIt Video Clipper (Firefox Edition)

**Version:** 0.2.0  
**Design System:** `vaultwares-themes/vaultsqware` (Obsidian & Iris)

ClipIt is a Firefox-focused Manifest V3 WebExtension designed to capture clips from ongoing videos (e.g. livestreams, gameplay, sports, or web media). It removes the unnecessary pause cycle in favor of continuous clipping followed by in-browser video trimming, tab-based smartnaming with an editable field, and a dark obsidian hardware-panel aesthetic.

## Features

- **Firefox Native (MV3)**: Built specifically for Firefox Gecko with WebExtension MV3, declarative permissions, and SVG extension icons.
- **Vaultsqware Design System**: Implements the dual-region Obsidian (`#0A0C11`) operational shell and Bone (`#EDECE8`) rail accents with live hardware LED status indicators (`.vwsq-led`).
- **Continuous Clip Capture**: Designed specifically for ongoing video playback where pausing disrupts flow. Right-click any video, select **Start clip**, and capture seamlessly.
- **In-Browser Video Trimming**: Review your captured clip inside a mini preview player. Adjust In and Out markers with precision dual range sliders or quick `[Set In]` / `[Set Out]` position buttons before downloading.
- **Smartnaming**: Automatically generates clean, filesystem-safe filenames based on the active tab title (stripping junk suffixes like `- YouTube` or `| Twitch`) and timestamps, while giving the user an editable field to customize the name.
- **Modular Codebase**: Clean semantic division into `styles.js`, `smartname.js`, `trimmer.js`, `widget.js`, `content.js`, `background.js`, and `i18n.js`.
- **Bilingual (EN / QC)**: Full English and Quebec French localized interface.

## Architecture

- `manifest.json`: Firefox Manifest V3 configuring Gecko ID, permissions, and SVG icons.
- `manifest.firefox.json`: Firefox manifest reference.
- `icons/icon.svg`: Vector icon combining Obsidian, Iris, and Coral accents with video clipping geometry.
- `src/styles.js`: Vaultsqware CSS tokens and Shadow DOM rules.
- `src/smartname.js`: Tab title extraction, sanitization, and filename formatting.
- `src/trimmer.js`: Offscreen video playback, time slicing, and Web Audio silent capture.
- `src/widget.js`: Shadow DOM floating widget builder with recording and review/trimming views.
- `src/content.js`: Selected-video capture, recording coordinator, and download dispatcher.
- `src/background.js`: Firefox context menu creation, tab title extraction, and browser downloads.
- `src/i18n.js`: English and Quebec French strings.
- `tests/extension.test.js`: Node test suite verifying manifest, i18n, smartnaming, styles, and trimmer contracts.

## Installation In Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**
3. Select either:
   - `C:\Users\Administrator\Desktop\Github Repos\clipit\manifest.json` (direct from source)
   - or `C:\Users\Administrator\Desktop\Github Repos\clipit\dist\firefox\manifest.json` (after building)

## Build & Test

```powershell
# Run the test suite
npm test

# Build the Firefox unpacked extension bundle
npm run build
```

## Usage

1. Open any page with an HTML video in Firefox.
2. Right-click the video and click **Start clip** (or **Démarrer l'extrait**).
3. The ClipIt widget appears in the top-right showing active recording duration, breathing hardware LED, and the pre-filled smartname.
4. Click **End clip** when done.
5. The widget transitions to **Review & Trim** mode:
   - Scrub and play the video in the mini player.
   - Adjust the **In** and **Out** sliders or click `[Set In]` / `[Set Out]` to set trim boundaries.
   - Edit the clip name if desired.
   - Click **Save Clip** to download your trimmed `.webm` file.
