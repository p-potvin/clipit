(function exposeClipItTrimmer(globalScope) {
  function getSupportedMimeType() {
    if (!globalScope.MediaRecorder || typeof globalScope.MediaRecorder.isTypeSupported !== "function") {
      return "video/webm";
    }

    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ];

    return types.find((t) => globalScope.MediaRecorder.isTypeSupported(t)) || "video/webm";
  }

  function getVideoDuration(blob) {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      const url = URL.createObjectURL(blob);
      video.src = url;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        video.removeAttribute("src");
        video.load();
      };

      video.addEventListener("loadedmetadata", () => {
        const duration = video.duration;
        cleanup();
        resolve(isFinite(duration) && duration > 0 ? duration : 0);
      }, { once: true });

      video.addEventListener("error", () => {
        cleanup();
        resolve(0);
      }, { once: true });
    });
  }

  function trimWebmBlob(blob, startTime, endTime, totalDuration, onProgress) {
    return new Promise((resolve, reject) => {
      // If the trim spans essentially the entire clip, no re-encoding needed
      if (startTime <= 0.08 && (endTime >= totalDuration - 0.08 || totalDuration <= 0)) {
        if (typeof onProgress === "function") onProgress(1);
        resolve(blob);
        return;
      }

      const mimeType = getSupportedMimeType();
      const video = document.createElement("video");
      video.preload = "auto";
      const blobUrl = URL.createObjectURL(blob);
      video.src = blobUrl;

      let audioCtx = null;
      let stream = null;
      let recorder = null;
      let chunks = [];
      let isCleanedUp = false;

      function cleanup() {
        if (isCleanedUp) return;
        isCleanedUp = true;

        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        if (audioCtx && typeof audioCtx.close === "function") {
          audioCtx.close().catch(() => {});
        }
        URL.revokeObjectURL(blobUrl);
        video.pause();
        video.removeAttribute("src");
        video.load();
      }

      video.addEventListener("error", (_e) => {
        cleanup();
        // Fallback to original blob rather than losing the recording
        resolve(blob);
      }, { once: true });

      video.addEventListener("loadedmetadata", async () => {
        try {
          // Attempt to mute offscreen audio from playing out of speakers
          // while preserving it in the re-recording via Web Audio
          let combinedTracks = [];

          const captureFn = video.mozCaptureStream || video.captureStream;
          if (typeof captureFn !== "function") {
            cleanup();
            resolve(blob);
            return;
          }

          const rawStream = captureFn.call(video);
          const videoTracks = rawStream.getVideoTracks();

          try {
            const AudioContextClass = globalScope.AudioContext || globalScope.webkitAudioContext;
            if (AudioContextClass) {
              audioCtx = new AudioContextClass();
              const sourceNode = audioCtx.createMediaElementSource(video);
              const destNode = audioCtx.createMediaStreamDestination();
              sourceNode.connect(destNode);
              combinedTracks = [...videoTracks, ...destNode.stream.getAudioTracks()];
            } else {
              combinedTracks = rawStream.getTracks();
            }
          } catch (_e) {
            combinedTracks = rawStream.getTracks();
          }

          stream = new MediaStream(combinedTracks);
          recorder = new MediaRecorder(stream, { mimeType });

          recorder.addEventListener("dataavailable", (e) => {
            if (e.data && e.data.size > 0) {
              chunks.push(e.data);
            }
          });

          recorder.addEventListener("stop", () => {
            const trimmedBlob = new Blob(chunks, { type: mimeType });
            cleanup();
            resolve(trimmedBlob.size > 0 ? trimmedBlob : blob);
          });

          // Seek to start time
          video.currentTime = Math.max(0, startTime);

          video.addEventListener("seeked", () => {
            const trimDuration = Math.max(0.1, endTime - startTime);

            const progressInterval = setInterval(() => {
              if (isCleanedUp) {
                clearInterval(progressInterval);
                return;
              }
              const current = video.currentTime;
              const progress = Math.min(1, Math.max(0, (current - startTime) / trimDuration));
              if (typeof onProgress === "function") {
                onProgress(progress);
              }
              if (current >= endTime || video.ended) {
                clearInterval(progressInterval);
                if (recorder && recorder.state === "recording") {
                  video.pause();
                  recorder.stop();
                }
              }
            }, 100);

            recorder.start(250);
            video.playbackRate = 1.5; // Swift trim playback
            video.play().catch((err) => {
              clearInterval(progressInterval);
              cleanup();
              resolve(blob);
            });
          }, { once: true });
        } catch (_err) {
          cleanup();
          resolve(blob);
        }
      }, { once: true });
    });
  }

  const ClipItTrimmer = {
    getSupportedMimeType,
    getVideoDuration,
    trimWebmBlob
  };

  globalScope.ClipItTrimmer = ClipItTrimmer;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ClipItTrimmer;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
