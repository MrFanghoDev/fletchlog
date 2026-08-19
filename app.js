// Script propre à app.html -- navigation Liste/Carte, FAB/toast,
// service worker, glue i18n (voir i18n.js pour le dictionnaire,
// theme.js pour la bascule de thème -- partagés avec index.html/
// aide.html).

let currentLanguage = localStorage.getItem("fletchlog_lang") || "fr";

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(currentLanguage, el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(currentLanguage, el.getAttribute("data-i18n-aria-label")));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.setAttribute("title", t(currentLanguage, el.getAttribute("data-i18n-title")));
  });
  document.getElementById("lang-fr-btn").classList.toggle("active", currentLanguage === "fr");
  document.getElementById("lang-en-btn").classList.toggle("active", currentLanguage === "en");
  document.documentElement.lang = currentLanguage;
}

function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem("fletchlog_lang", lang);
  applyTranslations();
}

function initNavigation() {
  document.querySelectorAll(".nav-btn").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      const vue = bouton.dataset.view;
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b === bouton));
      document.querySelectorAll(".view").forEach((section) => {
        section.classList.toggle("active", section.id === `view-${vue}`);
      });
    });
  });
}

let toastTimeoutId = null;

function afficherToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.hidden = false;
  // Un cycle de rendu avant d'ajouter la classe -- sinon la transition
  // d'opacité ne se joue pas (hidden -> visible sans transition perçue).
  requestAnimationFrame(() => toast.classList.add("visible"));
  if (toastTimeoutId) clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => { toast.hidden = true; }, 200);
  }, 2200);
}

function initFab() {
  document.getElementById("fab-add").addEventListener("click", () => {
    afficherToast(t(currentLanguage, "fabToast"));
  });
}

applyTranslations();
initNavigation();
initFab();
