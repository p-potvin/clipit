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
    const shadowRoot = host.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
          --vault-console-bg: #161320;
          --vault-console-surface: #1F1A2B;
          --vault-console-raised: #2A2340;
          --vault-console-border-subtle: rgba(255, 255, 255, 0.12);
          --vault-console-shadow: rgba(0, 0, 0, 0.34);
          --vault-console-text-secondary: rgba(237, 230, 255, 0.72);
          --vault-console-gold: #D6A441;
          --vault-signal-relay: #55D6FF;
          --vault-signal-alert: #FF6B7A;
          --font-sans: "Segoe UI", "Inter", "ui-sans-serif", "system-ui", sans-serif;
          --font-mono: "JetBrains Mono", "Lucide Console", "ui-monospace", "SFMono-Regular", monospace;
          position: fixed;
          z-index: 2147483647;
          top: 24px;
          right: 24px;
          width: min(300px, calc(100vw - 32px));
          color: white;
          font-family: var(--font-sans);
        }

        .clipit-panel {
          background: var(--vault-console-bg);
          border: 1px solid var(--vault-console-border-subtle);
          box-shadow: 0 18px 48px var(--vault-console-shadow);
          padding: 12px;
        }

        .clipit-header {
          align-items: center;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .clipit-title {
          color: var(--vault-console-gold);
          font-size: 13px;
          font-weight: 700;
        }

        .clipit-status {
          color: var(--vault-console-text-secondary);
          font-size: 12px;
          line-height: 1.35;
          min-height: 17px;
        }

        .clipit-timer {
          background: var(--vault-console-surface);
          border: 1px solid var(--vault-console-border-subtle);
          color: var(--vault-signal-relay);
          font-family: var(--font-mono);
          font-size: 30px;
          line-height: 1;
          margin-bottom: 12px;
          padding: 12px;
          text-align: center;
        }

        .clipit-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        button {
          appearance: none;
          background: var(--vault-console-raised);
          border: 1px solid var(--vault-console-border-subtle);
          color: white;
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: 13px;
          font-weight: 700;
          min-height: 36px;
          padding: 0 10px;
        }

        button:hover,
        button:focus {
          border-color: var(--vault-console-gold);
          outline: 2px solid transparent;
        }

        button[data-role="end"] {
          color: var(--vault-signal-alert);
        }
      </style>
      <section class="clipit-panel" aria-live="polite">
        <div class="clipit-header">
          <div class="clipit-title"></div>
          <div class="clipit-status"></div>
        </div>
        <div class="clipit-timer">00:00</div>
        <div class="clipit-actions">
          <button type="button" data-role="pause"></button>
          <button type="button" data-role="end"></button>
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
      pauseButton: shadowRoot.querySelector('[data-role="pause"]'),
      endButton: shadowRoot.querySelector('[data-role="end"]')
    };
  }

  function showError(message) {
    const widget = createWidget();
    widget.title.textContent = strings.widgetTitle;
    widget.status.textContent = message;
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
      widget.status.textContent = strings.recording;
      widget.pauseButton.textContent = strings.pause;
    }

    function stopRecording() {
      if (stopped || recorder.state === "inactive") {
        return;
      }

      stopped = true;
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
