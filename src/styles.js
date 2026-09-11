(function exposeClipItStyles(globalScope) {
  const VAULTSQWARE_CSS = `
    :host {
      all: initial;
      /* ====================================================================
         vaultsqware (Obsidian & Iris) Design System Tokens
         ==================================================================== */
      --vwsq-font-sans: "Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, ui-sans-serif, system-ui, sans-serif;
      --vwsq-font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

      /* CONSOLE — obsidian, blue-slate black (~85% operational surface) */
      --vwsq-console-bg: #0a0c11;
      --vwsq-console-surface: #11141b;
      --vwsq-console-sunken: #070810;
      --vwsq-console-raised: #191d27;
      --vwsq-console-elevated: #242935;
      --vwsq-console-active: #323847;
      --vwsq-console-hover: #1f2430;

      --vwsq-console-text: #bac2d2;
      --vwsq-console-text-secondary: rgba(186, 194, 210, 0.72);
      --vwsq-console-text-dim: rgba(186, 194, 210, 0.46);
      --vwsq-console-text-bright: #e6eaf2;

      --vwsq-console-border: rgba(255, 255, 255, 0.06);
      --vwsq-console-border-strong: rgba(255, 255, 255, 0.12);

      /* WARM — bone. Rail & railings (~15% chooser surface) */
      --vwsq-warm-bg: #edece8;
      --vwsq-warm-raised: #f8f7f4;
      --vwsq-warm-muted: #dedcd6;
      --vwsq-warm-sunken: #e4e2dd;
      --vwsq-warm-ink: #0f1116;
      --vwsq-warm-ink-secondary: rgba(15, 17, 22, 0.66);
      --vwsq-warm-border: rgba(15, 17, 22, 0.10);

      /* IRIS — primary accent */
      --vwsq-iris-400: #8189f5;
      --vwsq-iris-500: #6e7bf2;
      --vwsq-iris-600: #5866dc;
      --vwsq-iris-glow: rgba(110, 123, 242, 0.32);
      --vwsq-iris-soft: rgba(110, 123, 242, 0.14);

      /* CORAL — secondary accent */
      --vwsq-coral-400: #ff9679;
      --vwsq-coral-500: #ff8a6b;
      --vwsq-coral-600: #e86f4f;
      --vwsq-coral-soft: rgba(255, 138, 107, 0.14);
      --vwsq-coral-glow: rgba(255, 138, 107, 0.34);

      /* SIGNALS — hardware LED semantics */
      --vwsq-signal-online: #56d98d;
      --vwsq-signal-relay: #5ab8f0;
      --vwsq-signal-warning: #e9b054;
      --vwsq-signal-alert: #f45d6b;
      --vwsq-signal-sync: #a585f5;
      --vwsq-signal-idle: #6b7385;

      /* GEOMETRY & MOTION */
      --vwsq-radius-card: 18px;
      --vwsq-radius-panel: 12px;
      --vwsq-radius-pill: 9999px;
      --vwsq-radius-control: 6px;

      --vwsq-motion-snap: 90ms cubic-bezier(0.4, 0, 0.2, 1);
      --vwsq-motion-ui: 160ms cubic-bezier(0.4, 0, 0.2, 1);
      --vwsq-motion-enter: 400ms cubic-bezier(0.16, 1, 0.3, 1);

      position: fixed;
      z-index: 2147483647;
      top: 1.25rem;
      right: 1.25rem;
      width: min(380px, calc(100vw - 2.5rem));
      font-family: var(--vwsq-font-sans);
      color: var(--vwsq-console-text);
      -webkit-font-smoothing: antialiased;
    }

    @keyframes vwsqFadeInScale {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes vwsqLedPulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
        box-shadow: 0 0 0 0 currentColor;
      }
      50% {
        transform: scale(1.15);
        opacity: 0.65;
        box-shadow: 0 0 6px 1px currentColor;
      }
    }

    /* Dual-Region Main Shell */
    .vwsq-console-shell {
      background:
        radial-gradient(circle at 22% -4%, rgba(110, 123, 242, 0.15), transparent 22rem),
        linear-gradient(180deg, var(--vwsq-console-surface), var(--vwsq-console-bg));
      border: 1px solid var(--vwsq-console-border-strong);
      border-radius: var(--vwsq-radius-card);
      box-shadow: 0 20px 35px -8px rgba(0, 0, 0, 0.7), 0 0 1px rgba(255, 255, 255, 0.1);
      box-sizing: border-box;
      padding: 1.125rem;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      animation: vwsqFadeInScale var(--vwsq-motion-enter);
    }

    /* Header Bar */
    .clipit-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .clipit-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .clipit-logo {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
      filter: drop-shadow(0 0 4px var(--vwsq-iris-glow));
    }

    .clipit-title {
      color: var(--vwsq-console-text-bright);
      font-size: 0.9375rem;
      font-weight: 700;
      letter-spacing: -0.015em;
    }

    /* Warm Rail Badge (Bone surface in contrast to Obsidian) */
    .vwsq-warm-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: var(--vwsq-warm-bg);
      color: var(--vwsq-warm-ink);
      border: 1px solid var(--vwsq-warm-border);
      border-radius: var(--vwsq-radius-pill);
      padding: 0.2rem 0.55rem;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    }

    /* Hardware LED Indicator */
    .vwsq-led {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--vwsq-signal-idle);
      display: inline-block;
      flex-shrink: 0;
    }

    .vwsq-led--live {
      animation: vwsqLedPulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .vwsq-led--recording {
      color: var(--vwsq-signal-alert);
      background: var(--vwsq-signal-alert);
    }

    .vwsq-led--review {
      color: var(--vwsq-iris-500);
      background: var(--vwsq-iris-500);
    }

    .vwsq-led--saving {
      color: var(--vwsq-signal-sync);
      background: var(--vwsq-signal-sync);
    }

    /* Primary Recording Well */
    .clipit-well {
      background: var(--vwsq-console-sunken);
      border: 1px solid var(--vwsq-console-border);
      border-radius: var(--vwsq-radius-panel);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .clipit-timer {
      font-family: var(--vwsq-font-mono);
      font-size: 2.25rem;
      font-weight: 700;
      line-height: 1;
      color: var(--vwsq-console-text-bright);
      letter-spacing: -0.02em;
    }

    .clipit-subtext {
      font-size: 0.75rem;
      color: var(--vwsq-console-text-dim);
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    /* Smartnaming Field */
    .clipit-field-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .clipit-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--vwsq-console-text-secondary);
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .clipit-input {
      background: var(--vwsq-console-sunken);
      border: 1px solid var(--vwsq-console-border-strong);
      border-radius: var(--vwsq-radius-control);
      color: var(--vwsq-console-text-bright);
      font-family: var(--vwsq-font-sans);
      font-size: 0.8125rem;
      padding: 0.45rem 0.65rem;
      outline: none;
      transition: border-color var(--vwsq-motion-snap), box-shadow var(--vwsq-motion-snap);
      box-sizing: border-box;
      width: 100%;
    }

    .clipit-input:focus {
      border-color: var(--vwsq-coral-500);
      box-shadow: 0 0 0 2px var(--vwsq-coral-soft);
    }

    /* Mini Preview & Trim Section */
    .clipit-preview-container {
      background: var(--vwsq-console-sunken);
      border: 1px solid var(--vwsq-console-border);
      border-radius: var(--vwsq-radius-panel);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .clipit-preview-video {
      width: 100%;
      max-height: 160px;
      object-fit: contain;
      background: #000;
      display: block;
    }

    /* Trimmer Controls Area */
    .clipit-trim-panel {
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      background: var(--vwsq-console-raised);
      border-top: 1px solid var(--vwsq-console-border);
    }

    .clipit-trim-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--vwsq-console-text-secondary);
    }

    .clipit-trim-time {
      font-family: var(--vwsq-font-mono);
      font-weight: 600;
      color: var(--vwsq-console-text-bright);
    }

    .clipit-trim-sliders {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .clipit-slider-row {
      display: grid;
      grid-template-columns: 3.5rem 1fr 3.2rem;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.72rem;
    }

    .clipit-slider-row label {
      color: var(--vwsq-console-text-dim);
      font-weight: 500;
    }

    .clipit-range {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 4px;
      border-radius: 2px;
      background: var(--vwsq-console-active);
      outline: none;
      margin: 0;
    }

    .clipit-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--vwsq-iris-500);
      cursor: pointer;
      border: 2px solid var(--vwsq-console-bg);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
      transition: transform var(--vwsq-motion-snap), background-color var(--vwsq-motion-snap);
    }

    .clipit-range::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--vwsq-iris-500);
      cursor: pointer;
      border: 2px solid var(--vwsq-console-bg);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
      transition: transform var(--vwsq-motion-snap), background-color var(--vwsq-motion-snap);
    }

    .clipit-range:focus-visible::-webkit-slider-thumb {
      border-color: var(--vwsq-coral-500);
      transform: scale(1.2);
    }

    .clipit-range:focus-visible::-moz-range-thumb {
      border-color: var(--vwsq-coral-500);
      transform: scale(1.2);
    }

    /* Trim helper quick-cut buttons */
    .clipit-trim-helpers {
      display: flex;
      gap: 0.35rem;
    }

    .clipit-helper-btn {
      flex: 1;
      padding: 0.25rem 0.4rem;
      font-size: 0.68rem;
      background: var(--vwsq-console-elevated);
      color: var(--vwsq-console-text);
      border: 1px solid var(--vwsq-console-border);
      border-radius: var(--vwsq-radius-control);
      cursor: pointer;
      text-align: center;
      transition: background var(--vwsq-motion-snap), color var(--vwsq-motion-snap);
    }

    .clipit-helper-btn:hover {
      background: var(--vwsq-console-active);
      color: var(--vwsq-console-text-bright);
    }

    /* Progress bar */
    .clipit-progress {
      background: var(--vwsq-console-sunken);
      border-radius: var(--vwsq-radius-pill);
      height: 4px;
      width: 100%;
      overflow: hidden;
      margin-top: 0.25rem;
    }

    .clipit-progress-bar {
      background: linear-gradient(90deg, var(--vwsq-iris-500), var(--vwsq-coral-500));
      height: 100%;
      width: 0%;
      transition: width var(--vwsq-motion-ui);
    }

    /* Actions Grid */
    .clipit-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    /* Standard Button Styles */
    button {
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      border-radius: var(--vwsq-radius-control);
      cursor: pointer;
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      height: 2.35rem;
      padding: 0 0.875rem;
      transition: all var(--vwsq-motion-snap);
    }

    button svg {
      width: 0.95rem;
      height: 0.95rem;
      flex-shrink: 0;
    }

    button:focus-visible {
      outline: 2px solid var(--vwsq-coral-500);
      outline-offset: 2px;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .clipit-btn-primary {
      background: var(--vwsq-iris-500);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffffff;
      box-shadow: 0 2px 8px var(--vwsq-iris-glow);
    }

    .clipit-btn-primary:hover:not(:disabled) {
      background: var(--vwsq-iris-600);
      box-shadow: 0 3px 12px var(--vwsq-iris-glow);
    }

    .clipit-btn-secondary {
      background: var(--vwsq-console-raised);
      border: 1px solid var(--vwsq-console-border-strong);
      color: var(--vwsq-console-text);
    }

    .clipit-btn-secondary:hover:not(:disabled) {
      background: var(--vwsq-console-hover);
      color: var(--vwsq-console-text-bright);
    }

    /* Error Card */
    .clipit-error-card {
      background: rgba(244, 93, 107, 0.12);
      border: 1px solid rgba(244, 93, 107, 0.28);
      border-radius: var(--vwsq-radius-panel);
      padding: 0.875rem 1rem;
      display: none;
    }

    .clipit-error-title {
      color: var(--vwsq-signal-alert);
      display: block;
      font-size: 0.85rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .clipit-error-text {
      color: var(--vwsq-console-text);
      font-size: 0.775rem;
      line-height: 1.4;
      margin: 0;
    }

    /* State Handlers */
    :host([data-state="error"]) .clipit-well,
    :host([data-state="error"]) .clipit-field-group,
    :host([data-state="error"]) .clipit-preview-container,
    :host([data-state="error"]) .clipit-actions {
      display: none;
    }

    :host([data-state="error"]) .clipit-error-card {
      display: block;
    }

    :host([data-state="error"]) .clipit-error-actions {
      display: flex;
      margin-top: 0.5rem;
    }

    :host([data-state="error"]) .clipit-error-actions button {
      width: 100%;
    }
  `;

  const ClipItStyles = {
    VAULTSQWARE_CSS
  };

  globalScope.ClipItStyles = ClipItStyles;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ClipItStyles;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
