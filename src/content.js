(function installClipItContent(globalScope) {
  const api = globalScope.browser || globalScope.chrome;
  const strings = globalScope.ClipItI18n?.getStrings() || {};
  const smartName = globalScope.ClipItSmartName;
  const trimmer = globalScope.ClipItTrimmer;
  const widgetFactory = globalScope.ClipItWidget;

  let selectedVideo = null;
  let activeSession = null;

  function findVideoFromEvent(event) {
    const target = event.target;
    if (target instanceof HTMLVideoElement) return target;

    // Direct ancestor check
    if (target && typeof target.closest === "function") {
      const parentVideo = target.closest("video");
      if (parentVideo) return parentVideo;
    }

    // Overlay piercing: check underneath cursor coordinates
    if (event.clientX !== undefined && event.clientY !== undefined) {
      const elements = document.elementsFromPoint(event.clientX, event.clientY);
      for (const el of elements) {
        if (el instanceof HTMLVideoElement) return el;
        const nested = el.querySelector("video");
        if (nested instanceof HTMLVideoElement) return nested;
      }
    }

    // Fallback: check DOM container siblings/children
    if (target && target.parentElement) {
      const siblingVideo = target.parentElement.querySelector("video");
      if (siblingVideo instanceof HTMLVideoElement) return siblingVideo;
    }

    return null;
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

  function getVideoStream(video) {
    let stream = null;
    if (typeof video.captureStream === "function") {
      stream = video.captureStream();
    } else if (typeof video.mozCaptureStream === "function") {
      stream = video.mozCaptureStream();
    }

    if (!stream) {
      throw new Error(strings.captureUnsupported || "Stream capture unsupported");
    }

    return stream;
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
    globalScope.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result));
      reader.addEventListener("error", () => reject(reader.error));
      reader.readAsDataURL(blob);
    });
  }

  async function downloadClipBlob(blob, filename) {
    // Large blobs (>30MB) frequently crash extension IPC via base64 serialization
    const MAX_IPC_BLOB_SIZE = 30 * 1024 * 1024;

    if (blob.size < MAX_IPC_BLOB_SIZE && api?.runtime?.sendMessage) {
      try {
        const dataUrl = await blobToDataUrl(blob);
        const response = await api.runtime.sendMessage({
          type: "CLIPIT_DOWNLOAD",
          filename,
          dataUrl
        });

        if (response && response.ok === true) return;
      } catch (_error) {
        // Fall back to direct DOM anchor download on IPC or serialization failure
      }
    }

    fallbackToAnchor(blob, filename);
  }

  function showError(message) {
    const widget = widgetFactory.createClipItWidget(strings);
    widget.setErrorState(strings.errorTitle || "Error", message);
  }

  function createSession(video, tabTitle) {
    const stream = getVideoStream(video);
    const mimeType = trimmer?.getSupportedMimeType?.() || "video/webm;codecs=vp9,opus";
    const options = MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined;
    
    const recorder = new MediaRecorder(stream, options);
    const chunks = [];
    const widget = widgetFactory.createClipItWidget(strings);

    const initialTitle = tabTitle || document.title || "video";
    const defaultName = smartName ? smartName.generateDefaultName(initialTitle) : initialTitle;
    widget.setFilename(defaultName);

    let startedAt = performance.now();
    let timerId = 0;
    let isStopped = false;

    widget.setRecordingState();

    function updateTimer() {
      const elapsed = performance.now() - startedAt;
      widget.updateTimer(elapsed);
    }

    timerId = globalScope.setInterval(updateTimer, 200);
    updateTimer();

    function stopTracks() {
      stream.getTracks().forEach((track) => track.stop());
    }

    function cancelSession() {
      if (isStopped) return;
      isStopped = true;
      globalScope.clearInterval(timerId);

      if (recorder.state !== "inactive") {
        recorder.stop();
      }
      stopTracks();
      widget.destroy();
      activeSession = null;
    }

    function finishRecording() {
      if (isStopped || recorder.state === "inactive") return;
      isStopped = true;
      globalScope.clearInterval(timerId);
      // Let recorder flush remaining buffers before stopping tracks
      recorder.stop();
    }

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    recorder.addEventListener("stop", async () => {
      // Delay track cleanup to ensure all buffers flush without stream termination errors
      stopTracks();

      const outputMime = recorder.mimeType || "video/webm";
      const rawBlob = new Blob(chunks, { type: outputMime });
      let duration = 0;

      try {
        duration = await trimmer.getVideoDuration(rawBlob);
      } catch (_e) {
        duration = (performance.now() - startedAt) / 1000;
      }

      widget.setReviewState(rawBlob, duration);

      widget.elements.secondaryBtn.onclick = () => {
        widget.destroy();
        activeSession = null;
      };

      widget.elements.primaryBtn.onclick = async () => {
        const trimRange = widget.getTrimRange();
        const isTrimming =
          trimRange.inTime > 0.08 ||
          trimRange.outTime < (trimRange.totalDuration - 0.08);

        widget.setSavingState(isTrimming);

        const baseFilename = widget.getFilename();
        const finalFilename = smartName?.ensureWebmExtension
          ? smartName.ensureWebmExtension(baseFilename)
          : `${baseFilename}.webm`;

        try {
          let processedBlob = rawBlob;
          if (isTrimming && trimmer?.trimWebmBlob) {
            processedBlob = await trimmer.trimWebmBlob(
              rawBlob,
              trimRange.inTime,
              trimRange.outTime,
              trimRange.totalDuration,
              (progress) => widget.updateProgress(progress)
            );
          }
          await downloadClipBlob(processedBlob, finalFilename);
        } catch (_err) {
          fallbackToAnchor(rawBlob, finalFilename);
        } finally {
          widget.destroy();
          activeSession = null;
        }
      };
    });

    // Auto-stop if source video ends
    video.addEventListener("ended", finishRecording, { once: true });

    widget.elements.secondaryBtn.onclick = cancelSession;
    widget.elements.primaryBtn.onclick = finishRecording;

    recorder.start(1000);

    return {
      finishRecording,
      cancelSession
    };
  }

  function startRecording(tabTitle) {
    if (activeSession) {
      activeSession.finishRecording();
    }

    if (!(selectedVideo instanceof HTMLVideoElement)) {
      showError(strings.noVideoSelected || "No video element selected");
      return;
    }

    if (!globalScope.MediaRecorder) {
      showError(strings.captureUnsupported || "MediaRecorder is not supported");
      return;
    }

    try {
      activeSession = createSession(selectedVideo, tabTitle);
    } catch (_error) {
      activeSession = null;
      showError(strings.captureUnsupported || "Failed to initialize capture session");
    }
  }

  api?.runtime?.onMessage?.addListener((request) => {
    if (request && request.type === "CLIPIT_START_RECORDING") {
      startRecording(request.tabTitle);
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);