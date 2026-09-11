(function exposeClipItI18n(globalScope) {
  const STRINGS = {
    en: {
      menuStartClip: "Start clip",
      widgetTitle: "ClipIt",
      pause: "Pause",
      resume: "Resume",
      end: "End clip",
      cancel: "Cancel",
      recording: "Recording",
      review: "Review & Trim",
      saving: "Saving",
      trimming: "Trimming...",
      saveClip: "Save Clip",
      discard: "Discard",
      clipNameLabel: "Clip name",
      trimIn: "In",
      trimOut: "Out",
      setIn: "Set In",
      setOut: "Set Out",
      duration: "Duration",
      errorTitle: "Error",
      captureUnsupported: "This video cannot be clipped in this browser or page.",
      noVideoSelected: "Right-click a video before starting a clip.",
      downloadFailed: "The browser download prompt could not be opened."
    },
    qc: {
      menuStartClip: "Démarrer l'extrait",
      widgetTitle: "ClipIt",
      pause: "Pause",
      resume: "Reprendre",
      end: "Terminer l'extrait",
      cancel: "Annuler",
      recording: "Enregistrement",
      review: "Aperçu et découpe",
      saving: "Enregistrement du fichier",
      trimming: "Découpe en cours...",
      saveClip: "Enregistrer l'extrait",
      discard: "Supprimer",
      clipNameLabel: "Nom de l'extrait",
      trimIn: "Début",
      trimOut: "Fin",
      setIn: "Marquer début",
      setOut: "Marquer fin",
      duration: "Durée",
      errorTitle: "Erreur",
      captureUnsupported: "Cette vidéo ne peut pas être extraite dans ce navigateur ou sur cette page.",
      noVideoSelected: "Faites un clic droit sur une vidéo avant de démarrer un extrait.",
      downloadFailed: "L'invite de téléchargement du navigateur n'a pas pu être ouverte."
    }
  };

  function getBrowserLanguage() {
    const api = globalScope.browser || globalScope.chrome;
    const language = api && api.i18n && typeof api.i18n.getUILanguage === "function"
      ? api.i18n.getUILanguage()
      : globalScope.navigator && globalScope.navigator.language;

    return String(language || "en").toLowerCase();
  }

  function getLocale() {
    return getBrowserLanguage().startsWith("fr") ? "qc" : "en";
  }

  function getStrings() {
    return STRINGS[getLocale()] || STRINGS.en;
  }

  const ClipItI18n = {
    STRINGS,
    getLocale,
    getStrings
  };

  globalScope.ClipItI18n = ClipItI18n;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ClipItI18n;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
