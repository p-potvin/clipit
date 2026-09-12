if (!globalThis.ClipItI18n && typeof importScripts === "function") {
  importScripts("i18n.js");
}

const CLIPIT_MENU_ID = "clipit-start-clip";
const api = globalThis.browser || globalThis.chrome;

function createContextMenu() {
  const strings = globalThis.ClipItI18n ? globalThis.ClipItI18n.getStrings() : { menuStartClip: "Start clip" };

  api.contextMenus.remove(CLIPIT_MENU_ID, () => {
    const lastError = api.runtime.lastError;
    void lastError;

    api.contextMenus.create({
      id: CLIPIT_MENU_ID,
      title: strings.menuStartClip,
      contexts: ["video", "page", "frame"]
    });
  });
}

function sendStartMessage(info, tab) {
  if (!tab || typeof tab.id !== "number" || info.menuItemId !== CLIPIT_MENU_ID) {
    return;
  }

  const message = {
    type: "CLIPIT_START_RECORDING",
    tabTitle: (tab && tab.title) || ""
  };

  const options = typeof info.frameId === "number" ? { frameId: info.frameId } : undefined;
  api.tabs.sendMessage(tab.id, message, options, () => {
    const lastError = api.runtime.lastError;
    void lastError;
  });
}

async function toBlob(dataUrlOrBlob) {
  if (dataUrlOrBlob instanceof Blob) {
    return dataUrlOrBlob;
  }
  if (typeof dataUrlOrBlob === "string" && dataUrlOrBlob.startsWith("data:")) {
    try {
      const res = await fetch(dataUrlOrBlob);
      return await res.blob();
    } catch (_e) {
      const parts = dataUrlOrBlob.split(",");
      const mime = (parts[0].match(/:(.*?);/) || [])[1] || "video/webm";
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    }
  }
  throw new Error("Invalid clip data format");
}

function sanitizeFilename(filename) {
  let cleaned = (filename || "clip.webm").trim();
  cleaned = cleaned.replace(/[\\/:*?"<>|\x00-\x1F\x7F]/g, "-").replace(/^[-.]+|[-.]+$/g, "");
  if (!cleaned) {
    cleaned = "clip.webm";
  }
  if (!cleaned.toLowerCase().endsWith(".webm")) {
    cleaned += ".webm";
  }
  return cleaned;
}

async function downloadClip(request) {
  const filename = sanitizeFilename(request.filename);
  let blobUrl = null;

  try {
    const blob = await toBlob(request.blob || request.dataUrl);
    blobUrl = URL.createObjectURL(blob);

    const downloadOptions = {
      url: blobUrl,
      filename,
      saveAs: true,
      conflictAction: "uniquify"
    };

    const downloadId = await new Promise((resolve, reject) => {
      const maybePromise = api.downloads.download(downloadOptions, (id) => {
        const lastError = api.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
        } else {
          resolve(id);
        }
      });

      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(resolve).catch(reject);
      }
    });

    // Retain blob URL for 60 seconds so browser download manager streams completely
    setTimeout(() => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    }, 60_000);

    return { ok: true, downloadId };
  } catch (err) {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

// Ensure context menu is created immediately on load as well as lifecycle events
createContextMenu();
api.runtime.onInstalled.addListener(createContextMenu);
api.runtime.onStartup.addListener(createContextMenu);
api.contextMenus.onClicked.addListener(sendStartMessage);

// Allow clicking the toolbar icon to start clipping on the active tab
const actionApi = api.action || api.browserAction;
if (actionApi && actionApi.onClicked) {
  actionApi.onClicked.addListener((tab) => {
    if (!tab || typeof tab.id !== "number") return;
    api.tabs.sendMessage(tab.id, {
      type: "CLIPIT_START_RECORDING",
      tabTitle: (tab && tab.title) || ""
    }, () => {
      const lastError = api.runtime.lastError;
      void lastError;
    });
  });
}

api.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (!request || request.type !== "CLIPIT_DOWNLOAD") {
    return false;
  }

  downloadClip(request)
    .then((result) => sendResponse(result))
    .catch((err) => sendResponse({ ok: false, error: err && err.message ? err.message : String(err) }));

  return true;
});
