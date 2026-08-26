// Service worker de l'app shell (issue #1) -- cache-first sur les
// fichiers statiques, pour un fonctionnement hors ligne après un
// premier chargement. Rien d'autre pour l'instant : pas de données
// dynamiques à mettre en cache (voir #2, IndexedDB gère ça séparément).

const CACHE_NAME = "fletchlog-shell-v72";
const FICHIERS_A_METTRE_EN_CACHE = [
  "./",
  "./index.html",
  "./app.html",
  "./aide.html",
  "./theme.css",
  "./theme.js",
  "./i18n.js",
  "./sw-register.js",
  "./storage.js",
  "./version.js",
  "./jszip.min.js",
  "./export-import.js",
  "./app.js",
  "./souvenir.js",
  "./leaflet.js",
  "./leaflet.css",
  "./leaflet.markercluster.js",
  "./heic2any.min.js",
  "./MarkerCluster.css",
  "./MarkerCluster.Default.css",
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
];

// Cache séparé pour les tuiles OSM (issue #13) -- volontairement PAS
// versionné avec CACHE_NAME (une tuile déjà vue reste valable d'une
// mise à jour de l'appli à l'autre, pas de raison de la revider) et
// explicitement exclu du nettoyage dans "activate" ci-dessous.
// Cache opportuniste UNIQUEMENT (une tuile n'y entre que si elle a
// réellement été affichée à l'écran) -- jamais de préchargement de
// zone ni de fonctionnalité "télécharger pour hors-ligne", ce que la
// politique d'usage de tile.openstreetmap.org interdit explicitement
// (operations.osmfoundation.org/policies/tiles/, vérifiée le
// 2026-08-19 : "Bulk download ('scrape') tiles or offer prefetch
// features" et "Offline use is not permitted"). Plafonné en nombre de
// tuiles pour rester un cache raisonnable, pas une carte hors-ligne.
const CACHE_TUILES = "fletchlog-tuiles-osm";
const LIMITE_TUILES = 400;

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FICHIERS_A_METTRE_EN_CACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((noms) =>
        Promise.all(noms.filter((nom) => nom !== CACHE_NAME && nom !== CACHE_TUILES).map((nom) => caches.delete(nom)))
      )
      .then(() => self.clients.claim())
  );
});

async function gererTuileCarte(request) {
  const cache = await caches.open(CACHE_TUILES);
  const reponseEnCache = await cache.match(request);
  if (reponseEnCache) return reponseEnCache;
  try {
    const reponseReseau = await fetch(request);
    if (reponseReseau.ok) {
      cache.put(request, reponseReseau.clone());
      const cles = await cache.keys();
      if (cles.length > LIMITE_TUILES) cache.delete(cles[0]);
    }
    return reponseReseau;
  } catch (erreur) {
    return reponseEnCache || Response.error();
  }
}

self.addEventListener("fetch", (evenement) => {
  if (evenement.request.method !== "GET") return;

  if (new URL(evenement.request.url).hostname === "tile.openstreetmap.org") {
    evenement.respondWith(gererTuileCarte(evenement.request));
    return;
  }

  evenement.respondWith(
    caches.match(evenement.request).then((reponseEnCache) => {
      if (reponseEnCache) return reponseEnCache;
      return fetch(evenement.request).catch(() => {
        // Hors ligne et pas en cache -- pour une navigation (changement
        // de page), repli sur l'app shell plutôt qu'une erreur réseau
        // brute, cohérent avec l'esprit PWA installable.
        if (evenement.request.mode === "navigate") {
          return caches.match("./index.html");
        }
        throw new Error("Ressource indisponible hors ligne et absente du cache.");
      });
    })
  );
});
