/* Enregistrement du service worker -- partagé par les trois pages
 * (index.html, app.html, aide.html). Chaque page doit l'enregistrer
 * elle-même pour que Chrome la considère installable : l'évaluation
 * de l'installabilité (manifest lié + service worker enregistré) se
 * fait par page, pas une seule fois pour tout le site.
 */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch((erreur) => {
    console.warn("Enregistrement du service worker impossible :", erreur);
  });
}
