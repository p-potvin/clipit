(function exposeClipItSmartName(globalScope) {
  const SUFFIX_PATTERNS = [
    /\s*[-–—|•·:]\s*YouTube$/i,
    /\s*[-–—|•·:]\s*Twitch$/i,
    /\s*[-–—|•·:]\s*Vimeo$/i,
    /\s*[-–—|•·:]\s*Dailymotion$/i,
    /\s*[-–—|•·:]\s*Twitter$/i,
    /\s*[-–—|•·:]\s*X$/i,
    /\s*[-–—|•·:]\s*Facebook$/i,
    /\s*[-–—|•·:]\s*Reddit$/i,
    /\s*[-–—|•·:]\s*Streamable$/i
  ];

  function formatTimestamp(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  }

  function sanitizeTitle(rawTitle) {
    if (!rawTitle || typeof rawTitle !== "string") {
      return "clip";
    }

    let cleaned = rawTitle.trim();

    // Strip known site suffixes
    for (const pattern of SUFFIX_PATTERNS) {
      cleaned = cleaned.replace(pattern, "").trim();
    }

    // Replace illegal characters: \ / : * ? " < > | and control chars
    cleaned = cleaned.replace(/[\\/:*?"<>|\x00-\x1F\x7F]/g, "-");

    // Collapse multiple dashes and spaces
    cleaned = cleaned.replace(/[\s_-]+/g, "-");

    // Remove leading/trailing dashes or dots
    cleaned = cleaned.replace(/^[-.]+|[-.]+$/g, "");

    // Truncate to reasonable length (e.g. 50 characters)
    if (cleaned.length > 50) {
      cleaned = cleaned.slice(0, 50).replace(/[-.]+$/, "");
    }

    return cleaned || "clip";
  }

  function generateDefaultName(tabTitle, timestamp = formatTimestamp()) {
    const base = sanitizeTitle(tabTitle);
    return `${base}-${timestamp}`;
  }

  function ensureWebmExtension(name) {
    if (!name || typeof name !== "string") {
      return "clip.webm";
    }

    let trimmed = name.trim();
    // Sanitize any invalid characters entered by the user
    trimmed = trimmed.replace(/[\\/:*?"<>|\x00-\x1F\x7F]/g, "-").replace(/^[-.]+|[-.]+$/g, "");
    if (!trimmed) {
      trimmed = "clip";
    }

    if (!trimmed.toLowerCase().endsWith(".webm")) {
      trimmed += ".webm";
    }

    return trimmed;
  }

  const ClipItSmartName = {
    sanitizeTitle,
    formatTimestamp,
    generateDefaultName,
    ensureWebmExtension
  };

  globalScope.ClipItSmartName = ClipItSmartName;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ClipItSmartName;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
