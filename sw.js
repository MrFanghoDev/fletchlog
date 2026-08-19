// Service worker de l'app shell (issue #1) -- cache-first sur les
// fichiers statiques, pour un fonctionnement hors ligne après un
// premier chargement. Rien d'autre pour l'instant : pas de données
// dynamiques à mettre en cache (voir #2, IndexedDB gère ça séparément).

const CACHE_NAME = "fletchlog-shell-v19";
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
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FICHIERS_A_METTRE_EN_CACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((nom) => nom !== CACHE_NAME).map((nom) => caches.delete(nom))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evenement) => {
  if (evenement.request.method !== "GET") return;

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
