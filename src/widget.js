(function exposeClipItWidget(globalScope) {
  const WIDGET_ID = "clipit-floating-widget";

  function formatTime(seconds, includeDecimals = false) {
    const s = Math.max(0, isFinite(seconds) ? seconds : 0);
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const minsFormatted = String(mins).padStart(2, "0");
    const secsFormatted = String(secs).padStart(2, "0");

    if (includeDecimals) {
      const tenths = Math.floor((s % 1) * 10);
      return `${minsFormatted}:${secsFormatted}.${tenths}`;
    }
    return `${minsFormatted}:${secsFormatted}`;
  }

  function removeExistingWidget() {
    const existing = document.getElementById(WIDGET_ID);
    if (existing) {
      existing.remove();
    }
  }

  function createClipItWidget(strings) {
    removeExistingWidget();

    const host = document.createElement("div");
    host.id = WIDGET_ID;
    host.dataset.state = "recording";

    const shadowRoot = host.attachShadow({ mode: "open" });

    shadowRoot.innerHTML = `
      <style>
        ${globalScope.ClipItStyles ? globalScope.ClipItStyles.VAULTSQWARE_CSS : ""}
      </style>
      <section class="vwsq-console-shell" aria-live="polite">
        <!-- Header with Vaultsqware Obsidian & Bone Dual-Region -->
        <div class="clipit-header">
          <div class="clipit-brand">
            <svg class="clipit-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6e7bf2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
            </svg>
            <span class="clipit-title">${strings.widgetTitle}</span>
          </div>
          <div class="vwsq-warm-badge">
            <span class="vwsq-led vwsq-led--live vwsq-led--recording" aria-hidden="true"></span>
            <span class="clipit-status-text">${strings.recording}</span>
          </div>
        </div>

        <!-- Recording State View -->
        <div class="clipit-recording-section">
          <div class="clipit-well">
            <div class="clipit-timer">00:00</div>
            <div class="clipit-subtext">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Capturing video stream</span>
            </div>
          </div>
        </div>

        <!-- Review & Trimming State View -->
        <div class="clipit-review-section" style="display: none;">
          <div class="clipit-preview-container">
            <video class="clipit-preview-video" playsinline controls></video>
            <div class="clipit-trim-panel">
              <div class="clipit-trim-row">
                <span>${strings.review}</span>
                <span class="clipit-trim-time">
                  <span class="trim-in-display">00:00.0</span> &ndash; <span class="trim-out-display">00:00.0</span>
                  (<span class="trim-dur-display">00:00.0</span>)
                </span>
              </div>
              <div class="clipit-trim-sliders">
                <div class="clipit-slider-row">
                  <label>${strings.trimIn}</label>
                  <input type="range" class="clipit-range in-slider" min="0" max="10" step="0.1" value="0">
                  <span class="in-val-label font-mono">00:00.0</span>
                </div>
                <div class="clipit-slider-row">
                  <label>${strings.trimOut}</label>
                  <input type="range" class="clipit-range out-slider" min="0" max="10" step="0.1" value="10">
                  <span class="out-val-label font-mono">00:00.0</span>
                </div>
              </div>
              <div class="clipit-trim-helpers">
                <button type="button" class="clipit-helper-btn set-in-btn">[${strings.setIn}]</button>
                <button type="button" class="clipit-helper-btn set-out-btn">[${strings.setOut}]</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Smartnaming Input Field -->
        <div class="clipit-field-group">
          <label class="clipit-label" for="clipit-name-input">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            <span class="clipit-label-text">${strings.clipNameLabel}</span>
          </label>
          <input type="text" class="clipit-input" id="clipit-name-input" placeholder="Clip filename..." spellcheck="false" />
        </div>

        <!-- Progress Indicator -->
        <div class="clipit-progress" style="display: none;">
          <div class="clipit-progress-bar"></div>
        </div>

        <!-- Error Card -->
        <div class="clipit-error-card">
          <strong class="clipit-error-title">${strings.errorTitle}</strong>
          <p class="clipit-error-text"></p>
        </div>

        <!-- Action Buttons -->
        <div class="clipit-actions">
          <button class="clipit-btn-secondary" type="button" data-role="secondary">${strings.cancel}</button>
          <button class="clipit-btn-primary" type="button" data-role="primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="5" y="5" rx="2"/></svg>
            <span>${strings.end}</span>
          </button>
        </div>

        <div class="clipit-error-actions" style="display: none;">
          <button class="clipit-btn-secondary" type="button" data-role="dismiss">Close</button>
        </div>
      </section>
    `;

    document.documentElement.append(host);

    const elements = {
      host,
      shadowRoot,
      statusLed: shadowRoot.querySelector(".vwsq-led"),
      statusText: shadowRoot.querySelector(".clipit-status-text"),
      recordingSection: shadowRoot.querySelector(".clipit-recording-section"),
      timer: shadowRoot.querySelector(".clipit-timer"),
      reviewSection: shadowRoot.querySelector(".clipit-review-section"),
      previewVideo: shadowRoot.querySelector(".clipit-preview-video"),
      trimInDisplay: shadowRoot.querySelector(".trim-in-display"),
      trimOutDisplay: shadowRoot.querySelector(".trim-out-display"),
      trimDurDisplay: shadowRoot.querySelector(".trim-dur-display"),
      inSlider: shadowRoot.querySelector(".in-slider"),
      outSlider: shadowRoot.querySelector(".out-slider"),
      inValLabel: shadowRoot.querySelector(".in-val-label"),
      outValLabel: shadowRoot.querySelector(".out-val-label"),
      setInBtn: shadowRoot.querySelector(".set-in-btn"),
      setOutBtn: shadowRoot.querySelector(".set-out-btn"),
      nameInput: shadowRoot.querySelector("#clipit-name-input"),
      progress: shadowRoot.querySelector(".clipit-progress"),
      progressBar: shadowRoot.querySelector(".clipit-progress-bar"),
      errorCard: shadowRoot.querySelector(".clipit-error-card"),
      errorTitle: shadowRoot.querySelector(".clipit-error-title"),
      errorText: shadowRoot.querySelector(".clipit-error-text"),
      actions: shadowRoot.querySelector(".clipit-actions"),
      primaryBtn: shadowRoot.querySelector('[data-role="primary"]'),
      secondaryBtn: shadowRoot.querySelector('[data-role="secondary"]'),
      errorActions: shadowRoot.querySelector(".clipit-error-actions"),
      dismissBtn: shadowRoot.querySelector('[data-role="dismiss"]')
    };

    let currentDuration = 0;
    let previewUrl = "";

    function updateTrimDisplays() {
      const inVal = parseFloat(elements.inSlider.value) || 0;
      const outVal = parseFloat(elements.outSlider.value) || currentDuration;
      const dur = Math.max(0, outVal - inVal);

      elements.trimInDisplay.textContent = formatTime(inVal, true);
      elements.trimOutDisplay.textContent = formatTime(outVal, true);
      elements.trimDurDisplay.textContent = formatTime(dur, true);
      elements.inValLabel.textContent = formatTime(inVal, true);
      elements.outValLabel.textContent = formatTime(outVal, true);
    }

    elements.inSlider.addEventListener("input", () => {
      let inVal = parseFloat(elements.inSlider.value);
      let outVal = parseFloat(elements.outSlider.value);
      if (inVal > outVal - 0.2) {
        inVal = Math.max(0, outVal - 0.2);
        elements.inSlider.value = inVal;
      }
      elements.previewVideo.currentTime = inVal;
      updateTrimDisplays();
    });

    elements.outSlider.addEventListener("input", () => {
      let inVal = parseFloat(elements.inSlider.value);
      let outVal = parseFloat(elements.outSlider.value);
      if (outVal < inVal + 0.2) {
        outVal = Math.min(currentDuration, inVal + 0.2);
        elements.outSlider.value = outVal;
      }
      elements.previewVideo.currentTime = outVal;
      updateTrimDisplays();
    });

    elements.setInBtn.addEventListener("click", () => {
      const cur = elements.previewVideo.currentTime || 0;
      const outVal = parseFloat(elements.outSlider.value) || currentDuration;
      elements.inSlider.value = Math.min(cur, outVal - 0.2);
      updateTrimDisplays();
    });

    elements.setOutBtn.addEventListener("click", () => {
      const cur = elements.previewVideo.currentTime || currentDuration;
      const inVal = parseFloat(elements.inSlider.value) || 0;
      elements.outSlider.value = Math.max(cur, inVal + 0.2);
      updateTrimDisplays();
    });

    elements.dismissBtn.addEventListener("click", () => {
      destroy();
    });

    function setRecordingState() {
      host.dataset.state = "recording";
      elements.statusLed.className = "vwsq-led vwsq-led--live vwsq-led--recording";
      elements.statusText.textContent = strings.recording;
      elements.recordingSection.style.display = "block";
      elements.reviewSection.style.display = "none";
      elements.progress.style.display = "none";
      elements.errorCard.style.display = "none";
      elements.actions.style.display = "grid";
      elements.secondaryBtn.textContent = strings.cancel;
      elements.primaryBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="5" y="5" rx="2"/></svg>
        <span>${strings.end}</span>
      `;
    }

    function setReviewState(blob, totalDuration) {
      host.dataset.state = "review";
      currentDuration = totalDuration > 0 ? totalDuration : 10;

      elements.statusLed.className = "vwsq-led vwsq-led--review";
      elements.statusText.textContent = strings.review;

      elements.recordingSection.style.display = "none";
      elements.reviewSection.style.display = "block";

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      previewUrl = URL.createObjectURL(blob);
      elements.previewVideo.src = previewUrl;

      elements.inSlider.min = 0;
      elements.inSlider.max = currentDuration;
      elements.inSlider.value = 0;

      elements.outSlider.min = 0;
      elements.outSlider.max = currentDuration;
      elements.outSlider.value = currentDuration;

      updateTrimDisplays();

      elements.secondaryBtn.textContent = strings.discard;
      elements.primaryBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>${strings.saveClip}</span>
      `;
    }

    function setSavingState(isTrimming = false) {
      host.dataset.state = "saving";
      elements.statusLed.className = "vwsq-led vwsq-led--live vwsq-led--saving";
      elements.statusText.textContent = isTrimming ? strings.trimming : strings.saving;
      elements.progress.style.display = "block";
      elements.progressBar.style.width = "0%";
      elements.primaryBtn.disabled = true;
      elements.secondaryBtn.disabled = true;
      elements.inSlider.disabled = true;
      elements.outSlider.disabled = true;
      elements.nameInput.disabled = true;
    }

    function updateProgress(ratio) {
      const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));
      elements.progressBar.style.width = `${pct}%`;
    }

    function setErrorState(title, message) {
      host.dataset.state = "error";
      elements.statusLed.className = "vwsq-led vwsq-led--recording";
      elements.statusText.textContent = strings.errorTitle;
      elements.recordingSection.style.display = "none";
      elements.reviewSection.style.display = "none";
      elements.progress.style.display = "none";
      elements.actions.style.display = "none";
      elements.errorCard.style.display = "block";
      elements.errorTitle.textContent = title || strings.errorTitle;
      elements.errorText.textContent = message;
      elements.errorActions.style.display = "flex";
    }

    function destroy() {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = "";
      }
      if (elements.previewVideo) {
        elements.previewVideo.pause();
        elements.previewVideo.removeAttribute("src");
        elements.previewVideo.load();
      }
      host.remove();
    }

    return {
      host,
      shadowRoot,
      elements,
      setRecordingState,
      updateTimer: (ms) => {
        elements.timer.textContent = formatTime(Math.floor(ms / 1000));
      },
      setReviewState,
      setSavingState,
      updateProgress,
      setErrorState,
      getFilename: () => elements.nameInput.value,
      setFilename: (name) => {
        elements.nameInput.value = name;
      },
      getTrimRange: () => ({
        inTime: parseFloat(elements.inSlider.value) || 0,
        outTime: parseFloat(elements.outSlider.value) || currentDuration,
        totalDuration: currentDuration
      }),
      destroy
    };
  }

  const ClipItWidget = {
    formatTime,
    createClipItWidget
  };

  globalScope.ClipItWidget = ClipItWidget;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ClipItWidget;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
