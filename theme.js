/* Bascule clair/sombre partagée entre index.html, app.html et
 * aide.html -- même mécanisme que fletchtime/web/theme.js, repris tel
 * quel (clé localStorage adaptée). Suit prefers-color-scheme par
 * défaut, sauf choix explicite mémorisé.
 */

function initTheme() {
  const stocke = localStorage.getItem("fletchlog_theme");
  if (stocke === "light" || stocke === "dark") {
    document.documentElement.setAttribute("data-theme", stocke);
  }
  mettreAJourBoutonsTheme();
}

function setTheme(mode) {
  if (mode === "system") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem("fletchlog_theme");
  } else {
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem("fletchlog_theme", mode);
  }
  mettreAJourBoutonsTheme();
}

function mettreAJourBoutonsTheme() {
  const actuel = localStorage.getItem("fletchlog_theme") || "system";
  document.querySelectorAll(".theme-btn").forEach((bouton) => {
    bouton.classList.toggle("active", bouton.dataset.theme === actuel);
  });
}

initTheme();
