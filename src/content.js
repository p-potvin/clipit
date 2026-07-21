(function installClipItContent(globalScope) {
  const api = globalScope.browser || globalScope.chrome;
  const strings = globalScope.ClipItI18n.getStrings();
  const WIDGET_ID = "clipit-floating-widget";
  const MIME_TYPES = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];

  let selectedVideo = null;
  let activeSession = null;

  function findVideoFromEvent(event) {
    const target = event.target;
    if (target instanceof HTMLVideoElement) {
      return target;
    }

    return target && typeof target.closest === "function" ? target.closest("video") : null;
  }

  document.addEventListener(
    "contextmenu",
    (event) => {
      const video = findVideoFromEvent(event);
      if (video instanceof HTMLVideoElement) {
        selectedVideo = video;
      }
    },
    true
  );

  function formatElapsed(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function getSupportedMimeType() {
    if (!globalScope.MediaRecorder || typeof globalScope.MediaRecorder.isTypeSupported !== "function") {
      return "";
    }

    return MIME_TYPES.find((mimeType) => globalScope.MediaRecorder.isTypeSupported(mimeType)) || "";
  }

  function getVideoStream(video) {
    if (typeof video.captureStream === "function") {
      return video.captureStream();
    }

    if (typeof video.mozCaptureStream === "function") {
      return video.mozCaptureStream();
    }

    throw new Error(strings.captureUnsupported);
  }

  function buildFilename() {
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("-")
      + "-"
      + [
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0")
      ].join("-");

    return `clipit-${stamp}.webm`;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result));
      reader.addEventListener("error", () => reject(reader.error));
      reader.readAsDataURL(blob);
    });
  }

  function fallbackToAnchor(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.documentElement.append(link);
    link.click();
    link.remove();
    globalScope.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  async function saveBlob(blob) {
    const filename = buildFilename();

    try {
      const dataUrl = await blobToDataUrl(blob);
      const response = await api.runtime.sendMessage({
        type: "CLIPIT_DOWNLOAD",
        filename,
        dataUrl
      });

      if (!response || response.ok !== true) {
        throw new Error(response && response.error ? response.error : strings.downloadFailed);
      }
    } catch (_error) {
      fallbackToAnchor(blob, filename);
    }
  }

  function removeExistingWidget() {
    const existing = document.getElementById(WIDGET_ID);
    if (existing) {
      existing.remove();
    }
  }

  function createWidget() {
    removeExistingWidget();

    const host = document.createElement("div");
    host.id = WIDGET_ID;
    host.dataset.state = "recording";
    const shadowRoot = host.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
          --background: 240 10% 3.9%;
          --foreground: 0 0% 98%;
          --card: 240 10% 3.9%;
          --card-foreground: 0 0% 98%;
          --popover: 240 10% 3.9%;
          --popover-foreground: 0 0% 98%;
          --primary: 0 0% 98%;
          --primary-foreground: 240 5.9% 10%;
          --secondary: 240 3.7% 15.9%;
          --secondary-foreground: 0 0% 98%;
          --muted: 240 3.7% 15.9%;
          --muted-foreground: 240 5% 64.9%;
          --accent: 240 3.7% 15.9%;
          --accent-foreground: 0 0% 98%;
          --destructive: 0 62.8% 30.6%;
          --destructive-foreground: 0 0% 98%;
          --border: 240 3.7% 15.9%;
          --input: 240 3.7% 15.9%;
          --ring: 240 4.9% 83.9%;
          --radius: 0.75rem;

          --color-orange-500: #f97316;
          --color-red-500: #ef4444;
          --color-background: hsl(var(--background));
          --color-surface: hsl(240 5.9% 10%);
          --color-text-primary: hsl(var(--foreground));
          --shadow-glow: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5);
          --radius-xl: var(--radius);
          --transition-normal: 150ms cubic-bezier(0.4, 0, 0.2, 1);

          position: fixed;
          z-index: 2147483647;
          top: 1.25rem;
          right: 1.25rem;
          width: min(340px, calc(100vw - 2rem));
          color: hsl(var(--foreground));
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .clipit-shell {
          background-color: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: var(--radius);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
          box-sizing: border-box;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .clipit-header {
          align-items: center;
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .clipit-title-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .clipit-title-wrapper svg {
          width: 1.125rem;
          height: 1.125rem;
          color: hsl(var(--foreground));
        }

        .clipit-title {
          color: hsl(var(--foreground));
          font-size: 0.9375rem;
          font-weight: 600;
          letter-spacing: -0.015em;
          line-height: 1;
        }

        .clipit-recording-pill {
          align-items: center;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 9999px;
          color: #ef4444;
          display: inline-flex;
          gap: 0.375rem;
          margin-left: auto;
          padding: 0.25rem 0.625rem;
          transition: all 150ms ease;
        }

        .clipit-status {
          font-size: 0.75rem;
          font-weight: 500;
          line-height: 1;
        }

        .clipit-led {
          background: currentColor;
          border-radius: 9999px;
          height: 6px;
          width: 6px;
          animation: clipit-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes clipit-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .4; }
        }

        .clipit-main {
          background-color: hsl(var(--secondary) / 0.5);
          border: 1px solid hsl(var(--border));
          border-radius: calc(var(--radius) - 2px);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .clipit-timer {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 2rem;
          font-weight: 700;
          line-height: 1;
          color: hsl(var(--foreground));
          letter-spacing: -0.02em;
        }

        .clipit-progress {
          background: hsl(var(--muted));
          border-radius: 9999px;
          height: 4px;
          margin-top: 0.75rem;
          width: 100%;
          overflow: hidden;
        }

        .clipit-progress-bar {
          background: hsl(var(--foreground));
          border-radius: inherit;
          height: 100%;
          transition: width var(--transition-normal);
          width: 100%;
        }

        .clipit-error-card {
          background: hsl(var(--destructive) / 0.15);
          border: 1px solid hsl(var(--destructive) / 0.3);
          border-radius: calc(var(--radius) - 2px);
          box-sizing: border-box;
          color: hsl(var(--foreground));
          display: none;
          padding: 0.875rem 1rem;
        }

        .clipit-error-title {
          color: hsl(0 84.2% 60.2%);
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .clipit-error-text {
          color: hsl(var(--muted-foreground));
          font-size: 0.8125rem;
          line-height: 1.4;
          margin: 0;
        }

        .clipit-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }

        button {
          all: unset;
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          border-radius: calc(var(--radius) - 2px);
          cursor: pointer;
          font-family: inherit;
          font-size: 0.875rem;
          font-weight: 500;
          height: 2.25rem;
          padding: 0 0.875rem;
          transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, opacity 150ms ease;
        }

        button svg {
          width: 0.875rem;
          height: 0.875rem;
          flex-shrink: 0;
        }

        button:focus-visible {
          outline: 2px solid hsl(var(--ring));
          outline-offset: 2px;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .clipit-secondary-action {
          background-color: hsl(var(--secondary));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--secondary-foreground));
        }

        .clipit-secondary-action:hover:not(:disabled) {
          background-color: hsl(240 3.7% 20%);
        }

        .clipit-primary-action {
          background-color: hsl(var(--primary));
          border: 1px solid transparent;
          color: hsl(var(--primary-foreground));
        }

        .clipit-primary-action:hover:not(:disabled) {
          background-color: hsl(0 0% 90%);
        }

        :host([data-state="paused"]) .clipit-recording-pill {
          color: hsl(var(--muted-foreground));
          border-color: hsl(var(--border));
          background: hsl(var(--muted) / 0.5);
        }

        :host([data-state="paused"]) .clipit-led {
          animation: none;
          opacity: 0.5;
        }

        :host([data-state="saving"]) .clipit-recording-pill {
          color: #f59e0b;
          border-color: rgba(245, 158, 11, 0.2);
          background: rgba(245, 158, 11, 0.1);
        }

        :host([data-state="error"]) .clipit-main,
        :host([data-state="error"]) .clipit-recording-pill {
          display: none;
        }

        :host([data-state="error"]) .clipit-error-card {
          display: block;
        }

        :host([data-state="error"]) .clipit-actions {
          grid-template-columns: 1fr;
        }

        :host([data-state="error"]) .clipit-secondary-action {
          display: none;
        }

        :host([data-state="error"]) .clipit-primary-action {
          background-color: hsl(var(--secondary));
          border-color: hsl(var(--border));
          color: hsl(var(--secondary-foreground));
        }
      </style>
      <section class="clipit-shell" aria-live="polite">
        <div class="clipit-header">
          <div class="clipit-title-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
            <div class="clipit-title"></div>
          </div>
          <div class="clipit-recording-pill">
            <span class="clipit-led" aria-hidden="true"></span>
            <span class="clipit-status"></span>
          </div>
        </div>
        <div class="clipit-main">
          <div class="clipit-timer">00:00</div>
          <div class="clipit-progress" aria-hidden="true">
            <div class="clipit-progress-bar"></div>
          </div>
        </div>
        <div class="clipit-error-card">
          <strong class="clipit-error-title"></strong>
          <p class="clipit-error-text"></p>
        </div>
        <div class="clipit-actions">
          <button class="clipit-secondary-action" type="button" data-role="pause"></button>
          <button class="clipit-primary-action" type="button" data-role="end"></button>
        </div>
      </section>
    `;

    document.documentElement.append(host);

    return {
      host,
      shadowRoot,
      title: shadowRoot.querySelector(".clipit-title"),
      status: shadowRoot.querySelector(".clipit-status"),
      timer: shadowRoot.querySelector(".clipit-timer"),
      errorTitle: shadowRoot.querySelector(".clipit-error-title"),
      errorText: shadowRoot.querySelector(".clipit-error-text"),
      pauseButton: shadowRoot.querySelector('[data-role="pause"]'),
      endButton: shadowRoot.querySelector('[data-role="end"]')
    };
  }

  function showError(message) {
    const widget = createWidget();
    widget.host.dataset.state = "error";
    widget.title.textContent = strings.widgetTitle;
    widget.errorTitle.textContent = strings.errorTitle;
    widget.errorText.textContent = message;
    widget.pauseButton.disabled = true;
    widget.pauseButton.textContent = strings.pause;
    widget.endButton.textContent = strings.end;
    widget.endButton.addEventListener("click", () => widget.host.remove(), { once: true });
  }

  function createSession(video) {
    const stream = getVideoStream(video);
    const mimeType = getSupportedMimeType();
    const options = mimeType ? { mimeType } : undefined;
    const recorder = new MediaRecorder(stream, options);
    const chunks = [];
    const widget = createWidget();
    let startedAt = performance.now();
    let pausedAt = 0;
    let pausedDuration = 0;
    let timerId = 0;
    let stopped = false;

    widget.host.dataset.state = "recording";
    widget.title.textContent = strings.widgetTitle;
    widget.status.textContent = strings.recording;
    widget.pauseButton.textContent = strings.pause;
    widget.endButton.textContent = strings.end;

    function elapsedMilliseconds() {
      const current = recorder.state === "paused" && pausedAt > 0 ? pausedAt : performance.now();
      return current - startedAt - pausedDuration;
    }

    function renderTimer() {
      widget.timer.textContent = formatElapsed(elapsedMilliseconds());
    }

    function pauseRecording() {
      if (recorder.state !== "recording") {
        return;
      }

      pausedAt = performance.now();
      recorder.pause();
      widget.host.dataset.state = "paused";
      widget.status.textContent = strings.paused;
      widget.pauseButton.textContent = strings.resume;
      renderTimer();
    }

    function resumeRecording() {
      if (recorder.state !== "paused") {
        return;
      }

      pausedDuration += performance.now() - pausedAt;
      pausedAt = 0;
      recorder.resume();
      widget.host.dataset.state = "recording";
      widget.status.textContent = strings.recording;
      widget.pauseButton.textContent = strings.pause;
    }

    function stopRecording() {
      if (stopped || recorder.state === "inactive") {
        return;
      }

      stopped = true;
      widget.host.dataset.state = "saving";
      widget.status.textContent = strings.saving;
      widget.pauseButton.disabled = true;
      widget.endButton.disabled = true;
      recorder.stop();
    }

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    recorder.addEventListener("stop", async () => {
      globalScope.clearInterval(timerId);
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      await saveBlob(blob);
      widget.host.remove();
      activeSession = null;
    });

    widget.pauseButton.addEventListener("click", () => {
      if (recorder.state === "paused") {
        resumeRecording();
      } else {
        pauseRecording();
      }
    });

    widget.endButton.addEventListener("click", stopRecording);
    timerId = globalScope.setInterval(renderTimer, 250);
    renderTimer();
    recorder.start(1000);

    return {
      pauseRecording,
      resumeRecording,
      stopRecording
    };
  }

  function startRecording() {
    if (activeSession) {
      activeSession.stopRecording();
    }

    if (!(selectedVideo instanceof HTMLVideoElement)) {
      showError(strings.noVideoSelected);
      return;
    }

    if (!globalScope.MediaRecorder) {
      showError(strings.captureUnsupported);
      return;
    }

    try {
      activeSession = createSession(selectedVideo);
    } catch (_error) {
      activeSession = null;
      showError(strings.captureUnsupported);
    }
  }

  api.runtime.onMessage.addListener((request) => {
    if (request && request.type === "CLIPIT_START_RECORDING") {
      startRecording();
    }
  });
})(globalThis);
