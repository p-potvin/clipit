(function installClipItContent(globalScope) {
  const api = globalScope.browser || globalScope.chrome;
  const strings = globalScope.ClipItI18n.getStrings();
  const smartName = globalScope.ClipItSmartName;
  const trimmer = globalScope.ClipItTrimmer;
  const widgetFactory = globalScope.ClipItWidget;

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

  function getVideoStream(video) {
    if (typeof video.captureStream === "function") {
      return video.captureStream();
    }
    if (typeof video.mozCaptureStream === "function") {
      return video.mozCaptureStream();
    }
    throw new Error(strings.captureUnsupported);
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

  async function downloadClipBlob(blob, filename) {
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

  function showError(message) {
    const widget = widgetFactory.createClipItWidget(strings);
    widget.setErrorState(strings.errorTitle, message);
  }

  function createSession(video, tabTitle) {
    const stream = getVideoStream(video);
    const mimeType = trimmer.getSupportedMimeType();
    const options = mimeType ? { mimeType } : undefined;
    const recorder = new MediaRecorder(stream, options);
    const chunks = [];
    const widget = widgetFactory.createClipItWidget(strings);

    const initialTitle = tabTitle || document.title || "video";
    const defaultName = smartName.generateDefaultName(initialTitle);
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

    function cancelSession() {
      if (isStopped) return;
      isStopped = true;
      globalScope.clearInterval(timerId);
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
      stream.getTracks().forEach((track) => track.stop());
      widget.destroy();
      activeSession = null;
    }

    function finishRecording() {
      if (isStopped || recorder.state === "inactive") return;
      isStopped = true;
      globalScope.clearInterval(timerId);
      recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
    }

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    recorder.addEventListener("stop", async () => {
      const rawBlob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      const duration = await trimmer.getVideoDuration(rawBlob);

      // Transition widget to Review & Trimming state
      widget.setReviewState(rawBlob, duration);

      // Discard button
      widget.elements.secondaryBtn.onclick = () => {
        widget.destroy();
        activeSession = null;
      };

      // Save Clip button
      widget.elements.primaryBtn.onclick = async () => {
        const trimRange = widget.getTrimRange();
        const isTrimming = trimRange.inTime > 0.08 || trimRange.outTime < (trimRange.totalDuration - 0.08);

        widget.setSavingState(isTrimming);

        try {
          const processedBlob = await trimmer.trimWebmBlob(
            rawBlob,
            trimRange.inTime,
            trimRange.outTime,
            trimRange.totalDuration,
            (progress) => widget.updateProgress(progress)
          );

          const finalFilename = smartName.ensureWebmExtension(widget.getFilename());
          await downloadClipBlob(processedBlob, finalFilename);
        } catch (_err) {
          const finalFilename = smartName.ensureWebmExtension(widget.getFilename());
          fallbackToAnchor(rawBlob, finalFilename);
        } finally {
          widget.destroy();
          activeSession = null;
        }
      };
    });

    // Recording buttons
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
      showError(strings.noVideoSelected);
      return;
    }

    if (!globalScope.MediaRecorder) {
      showError(strings.captureUnsupported);
      return;
    }

    try {
      activeSession = createSession(selectedVideo, tabTitle);
    } catch (_error) {
      activeSession = null;
      showError(strings.captureUnsupported);
    }
  }

  api.runtime.onMessage.addListener((request) => {
    if (request && request.type === "CLIPIT_START_RECORDING") {
      startRecording(request.tabTitle);
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
