if (!globalThis.ClipItI18n && typeof importScripts === "function") {
  importScripts("i18n.js");
}

const CLIPIT_MENU_ID = "clipit-start-clip";
const api = globalThis.browser || globalThis.chrome;

function createContextMenu() {
  api.contextMenus.remove(CLIPIT_MENU_ID, () => {
    const lastError = api.runtime.lastError;
    void lastError;

    api.contextMenus.create({
      id: CLIPIT_MENU_ID,
      title: globalThis.ClipItI18n.getStrings().menuStartClip,
      contexts: ["video"]
    });
  });
}

function sendStartMessage(info, tab) {
  if (!tab || typeof tab.id !== "number" || info.menuItemId !== CLIPIT_MENU_ID) {
    return;
  }

  const message = {
    type: "CLIPIT_START_RECORDING"
  };

  const options = typeof info.frameId === "number" ? { frameId: info.frameId } : undefined;
  api.tabs.sendMessage(tab.id, message, options, () => {
    const lastError = api.runtime.lastError;
    void lastError;
  });
}

function downloadClip(request, sendResponse) {
  const filename = request.filename || "clipit.webm";

  api.downloads.download(
    {
      url: request.dataUrl,
      filename,
      saveAs: true,
      conflictAction: "uniquify"
    },
    (downloadId) => {
      const lastError = api.runtime.lastError;
      if (lastError) {
        sendResponse({ ok: false, error: lastError.message });
        return;
      }

      sendResponse({ ok: true, downloadId });
    }
  );
}

api.runtime.onInstalled.addListener(createContextMenu);
api.runtime.onStartup.addListener(createContextMenu);
api.contextMenus.onClicked.addListener(sendStartMessage);
api.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (!request || request.type !== "CLIPIT_DOWNLOAD") {
    return false;
  }

  downloadClip(request, sendResponse);
  return true;
});
