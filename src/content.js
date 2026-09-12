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

    // Penetrate overlay divs, custom controls, and player layers
    if (typeof document.elementsFromPoint === "function" && event.clientX && event.clientY) {
      try {
        const elements = document.elementsFromPoint(event.clientX, event.clientY);
        for (const el of elements) {
          if (el instanceof HTMLVideoElement) {
            return el;
          }
          if (el && typeof el.querySelector === "function") {
            const nested = el.querySelector("video");
            if (nested instanceof HTMLVideoElement) {
              return nested;
            }
          }
        }
      } catch (_e) {}
    }

    if (target && typeof target.closest === "function") {
      const closest = target.closest("video");
      if (closest) return closest;
    }

    if (target && typeof target.querySelector === "function") {
      const child = target.querySelector("video");
      if (child instanceof HTMLVideoElement) return child;
    }

    if (target && target.parentElement && typeof target.parentElement.querySelector === "function") {
      const sibling = target.parentElement.querySelector("video");
      if (sibling instanceof HTMLVideoElement) return sibling;
    }

    return null;
  }

  function getBestVideoOnPage() {
    const allVideos = Array.from(document.querySelectorAll("video"));
    if (allVideos.length === 0) return null;

    // Prefer currently playing video
    const playing = allVideos.find((v) => !v.paused && v.readyState > 1);
    if (playing) return playing;

    // Otherwise pick largest visible video
    return allVideos.sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0];
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
    let dataUrl = "";
    try {
      dataUrl = await blobToDataUrl(blob);
    } catch (_e) {}

    let response;
    try {
      response = await api.runtime.sendMessage({
        type: "CLIPIT_DOWNLOAD",
        filename,
        dataUrl,
        blob
      });
    } catch (_msgErr) {
      try {
        response = await api.runtime.sendMessage({
          type: "CLIPIT_DOWNLOAD",
          filename,
          dataUrl
        });
      } catch (err2) {
        response = { ok: false, error: err2 && err2.message ? err2.message : strings.downloadFailed };
      }
    }

    if (!response || response.ok !== true) {
      const errorMsg = response && response.error ? response.error : strings.downloadFailed;
      try {
        fallbackToAnchor(blob, filename);
      } catch (_e) {}
      throw new Error(errorMsg);
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
          widget.destroy();
          activeSession = null;
        } catch (err) {
          widget.setErrorState(strings.errorTitle, err && err.message ? err.message : strings.downloadFailed);
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

    if (!(selectedVideo instanceof HTMLVideoElement) || !document.contains(selectedVideo)) {
      selectedVideo = getBestVideoOnPage();
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
