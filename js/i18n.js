// i18n.js – Carga JSON de idioma y sustituye [data-i18n]
(() => {
  const SUPPORTED = ["es", "en"];
  const LS_KEY = "lang";
  const DEFAULT = "es";

  // Decide idioma (URL ?lang=, hash #en, localStorage, navegador)
  const url = new URL(window.location.href);
  const qLang = url.searchParams.get("lang") || (location.hash || "").replace("#", "");
  const lsLang = localStorage.getItem(LS_KEY);
  const navLang = (navigator.language || "es").slice(0, 2).toLowerCase();

  let current =
    SUPPORTED.includes(qLang) ? qLang :
    SUPPORTED.includes(lsLang) ? lsLang :
    SUPPORTED.includes(navLang) ? navLang : DEFAULT;

  const $switcher = document.getElementById("langSwitcher");

  async function loadDict(lang) {
    try {
      const res = await fetch(`data/i18n-${lang}.json`, { cache: "no-store" });
      if (!res.ok) throw new Error("i18n fetch error");
      return await res.json();
    } catch (e) {
      console.warn("[i18n] Fallback to default:", e);
      const res = await fetch(`data/i18n-${DEFAULT}.json`);
      return await res.json();
    }
  }

  // Deep get "a.b.c"
  function getKey(dict, path) {
    return path.split(".").reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), dict);
  }

  async function apply(lang) {
    const dict = await loadDict(lang);
    document.documentElement.lang = lang;
    localStorage.setItem(LS_KEY, lang);
    if ($switcher) $switcher.value = lang;

    // Exponer traductor para JS (ej. contact.js -> window.t("toast.copied"))
    window.__i18n = dict;
    window.t = (k, fallback = "") => getKey(dict, k) ?? fallback;

    // Sustituir textos
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const value = getKey(dict, key);
      if (value != null) el.innerHTML = value;
    });
  }

  // Cambios por usuario
  if ($switcher) {
    $switcher.addEventListener("change", (e) => apply(e.target.value));
    $switcher.value = current;
  }

  // Inicial
  apply(current);
})();
