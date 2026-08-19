// Ossature de l'appli (issue #1) -- thème, bascule Liste/Carte, FAB.
// Pas encore de logique métier (stockage, formulaire) : voir #2/#3/#7.

const THEME_KEY = "fletchlog-theme";

function appliquerTheme(valeur) {
  if (valeur === "system") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem(THEME_KEY);
  } else {
    document.documentElement.setAttribute("data-theme", valeur);
    localStorage.setItem(THEME_KEY, valeur);
  }
  document.querySelectorAll(".theme-btn").forEach((bouton) => {
    bouton.classList.toggle("active", bouton.dataset.themeValue === valeur);
  });
}

function initTheme() {
  const stocke = localStorage.getItem(THEME_KEY);
  appliquerTheme(stocke === "light" || stocke === "dark" ? stocke : "system");
  document.querySelectorAll(".theme-btn").forEach((bouton) => {
    bouton.addEventListener("click", () => appliquerTheme(bouton.dataset.themeValue));
  });
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
    afficherToast("Ajout d'une sortie -- bientôt disponible (issue #3)");
  });
}

function initServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  // Le service worker refuse de s'enregistrer sous file:// -- servir
  // avec un serveur statique même en local (voir CLAUDE.md/README).
  navigator.serviceWorker.register("sw.js").catch((erreur) => {
    console.warn("Enregistrement du service worker impossible :", erreur);
  });
}

initTheme();
initNavigation();
initFab();
initServiceWorker();
