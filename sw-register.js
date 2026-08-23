/* Enregistrement du service worker -- partagé par les trois pages
 * (index.html, app.html, aide.html). Chaque page doit l'enregistrer
 * elle-même pour que Chrome la considère installable : l'évaluation
 * de l'installabilité (manifest lié + service worker enregistré) se
 * fait par page, pas une seule fois pour tout le site.
 *
 * Notification de mise à jour (issue #10) -- ici plutôt que dans
 * app.js pour s'appliquer aux trois pages (une mise à jour peut être
 * détectée alors que l'utilisateur est sur Aide, pas juste dans
 * l'appli). Bannière autonome (CSS injecté ici, pas de dépendance à
 * .toast qui n'existe que dans app.html) -- geste explicite
 * (recharger) plutôt qu'un reload forcé, voir le ticket : couperait
 * une saisie en cours dans le formulaire d'ajout.
 */

// Demande de stockage persistant (issue #18) -- réduit le risque
// d'éviction du stockage (IndexedDB, photos) par le navigateur en cas
// de pression mémoire ou de longue période sans usage, surtout
// pertinent sur Safari/iOS. Accordé selon des heuristiques propres à
// chaque navigateur (WebKit favorise notamment les apps ajoutées à
// l'écran d'accueil, voir CLAUDE.md) -- pas une garantie, un
// atténuateur de risque, jamais un pré-requis bloquant si absent
// (navigator.storage n'existe même pas sur tous les navigateurs).
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js")
    .then((registration) => {
      // Capturé maintenant : true seulement si cette page n'était pas
      // déjà contrôlée par un service worker avant cet enregistrement
      // (première installation, jamais une mise à jour).
      const premiereInstallation = !navigator.serviceWorker.controller;

      registration.addEventListener("updatefound", () => {
        if (premiereInstallation) return;
        const nouveauWorker = registration.installing;
        if (!nouveauWorker) return;
        nouveauWorker.addEventListener("statechange", () => {
          if (nouveauWorker.state === "installed" && navigator.serviceWorker.controller) {
            afficherBanniereMiseAJour();
          }
        });
      });
    })
    .catch((erreur) => {
      console.warn("Enregistrement du service worker impossible :", erreur);
    });
}

function afficherBanniereMiseAJour() {
  if (document.getElementById("maj-banniere")) return;

  const lang = localStorage.getItem("fletchlog_lang") || "fr";
  const style = document.createElement("style");
  style.textContent = `
    #maj-banniere {
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
      display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap;
      padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
      background: var(--gold); color: #1a1206; font-family: var(--font-ui, inherit);
      font-size: 13px; font-weight: 600;
    }
    #maj-banniere button {
      font: inherit; padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.3);
      background: rgba(255,255,255,0.3); color: inherit; cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  const banniere = document.createElement("div");
  banniere.id = "maj-banniere";
  const span = document.createElement("span");
  span.textContent = t(lang, "majDisponible");
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.textContent = t(lang, "majRecharger");
  bouton.addEventListener("click", () => location.reload());
  banniere.append(span, bouton);
  document.body.appendChild(banniere);
}
