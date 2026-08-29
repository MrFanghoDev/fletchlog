/* Stockage local des sorties de tir -- petit wrapper au-dessus de
 * l'API indexedDB native (voir CLAUDE.md, principe de dépendances :
 * l'API brute suffit ici, pas de lib ajoutée pour ça). Base pour tout
 * le reste (#3 vue Liste, #4 photo, #6 GPS, #7 vue Carte) -- ce
 * fichier ne construit aucune UI, juste ajouterEntree/listerEntrees/
 * modifierEntree/supprimerEntree (issue #2), enregistrerPhoto/
 * obtenirPhoto/supprimerPhoto (issue #4), et restaurerEntree/
 * restaurerPhoto pour l'import d'une sauvegarde (issue #5).
 *
 * Schéma d'une entrée (store "entrees") :
 *   id          string   généré (crypto.randomUUID())
 *   titre       string   intitulé de la sortie, obligatoire (issue #11)
 *                         -- distingue plusieurs sorties au même lieu.
 *                         Les entrées créées avant #11 n'en ont pas :
 *                         voir carteHTML()/ouvrirFormulaire() côté
 *                         app.js pour le repli sur `lieu` à l'affichage
 *   lieu        string   nom saisi par l'archer
 *   lat, lon    number | null   coordonnées GPS brutes (issue #6,
 *                                pas de reverse-geocoding, voir CLAUDE.md)
 *   cible       string   nom de la cible/blason
 *   discipline  string
 *   distance    string   texte libre ("18 m", "Parcours varié"...) --
 *                         pas un nombre, les distances d'un parcours
 *                         nature ne sont pas une valeur unique
 *   labels      string[] labels libres (issue #11) -- normalisés ici
 *                         (minuscules, sans espaces superflus, dédupliqués)
 *                         à partir d'une chaîne "a, b, a" ou d'un tableau
 *                         déjà propre, jamais stockés bruts
 *   commentaire string   note libre, optionnelle -- pas de filtre par
 *                         valeur exacte (pas de sens pour du texte
 *                         libre), juste une recherche "contient" côté
 *                         vue Liste (issue #11)
 *   meteo       string   une des clés METEO_OPTIONS ci-dessous --
 *                         liste fermée plutôt que texte libre, pour
 *                         pouvoir afficher une icône cohérente par
 *                         entrée (voir le mockup Look and Feel/#3)
 *   date        string   jour de la sortie, format AAAA-MM-JJ
 *   photoIds    string[] références vers le store "photos" (Blob),
 *                         jusqu'à 6 (voir MAX_PHOTOS dans app.js) --
 *                         tableau vide tant qu'aucune photo. Anciennes
 *                         entrées (avant #12) : champ `photoId` unique
 *                         -- repli géré à la lecture par listerEntrees(),
 *                         jamais migré/persisté (même principe que le
 *                         titre manquant des entrées d'avant #11)
 *   audioId     string | null   référence vers le store "audios" (Blob,
 *                         retour utilisateur 2026-08-29) -- une seule
 *                         note vocale par entrée (contrairement aux
 *                         photos), pas de tableau. `null` tant qu'aucun
 *                         enregistrement.
 *   creeLe      string   horodatage ISO de création, posé par
 *                         ajouterEntree -- jamais fourni par l'appelant
 *
 * Le store "photos" (clé = photoId, valeur = Blob) est créé dès
 * maintenant avec ce schéma plutôt que d'attendre #4 : ajouter un
 * store à une base IndexedDB existante demande de monter la version
 * et un nouveau onupgradeneeded, autant le faire une seule fois ici
 * puisque le champ photoId fait déjà partie du schéma de #2.
 *
 * Store "audios" (clé = audioId, valeur = Blob -- webm/opus produit par
 * MediaRecorder, voir démarrerEnregistrementAudio() dans app.js) ajouté
 * en DB_VERSION 2 (retour utilisateur, 2026-08-29) -- première vraie
 * montée de version de ce projet (jusqu'ici "photos" avait été créé dès
 * le départ pour éviter ça, voir juste au-dessus). Pas de risque pour
 * les données existantes : onupgradeneeded ne fait qu'ajouter le store
 * manquant (même garde `if (!contains(...))` que pour "entrees"/
 * "photos"), rien touché aux stores déjà là. Volontairement PAS
 * mélangé dans le store "photos" existant malgré le même patron
 * (Blob par id) -- l'export (export-import.js) suppose que tout blob
 * du store "photos" est une image JPEG (`photos/<id>.jpg`), mélanger
 * des blobs audio aurait cassé cette hypothèse plutôt que de
 * l'étendre proprement avec un dossier `audios/` séparé dans l'archive.
 */

const METEO_OPTIONS = ["ensoleille", "nuageux", "pluie", "vent", "aucune"];

const DB_NOM = "fletchlog";
const DB_VERSION = 2;

function _ouvrirDB() {
  return new Promise((resolve, reject) => {
    const requete = indexedDB.open(DB_NOM, DB_VERSION);
    requete.onupgradeneeded = () => {
      const db = requete.result;
      if (!db.objectStoreNames.contains("entrees")) {
        const entrees = db.createObjectStore("entrees", { keyPath: "id" });
        entrees.createIndex("date", "date");
      }
      if (!db.objectStoreNames.contains("photos")) {
        db.createObjectStore("photos");
      }
      if (!db.objectStoreNames.contains("audios")) {
        db.createObjectStore("audios");
      }
    };
    requete.onsuccess = () => resolve(requete.result);
    requete.onerror = () => reject(requete.error);
  });
}

function _normaliserLabels(valeur) {
  const brut = Array.isArray(valeur) ? valeur.join(",") : valeur || "";
  return [...new Set(brut.split(",").map((l) => l.trim().toLowerCase()).filter((l) => l))];
}

function ajouterEntree(entree) {
  if (!entree || !entree.lieu || !entree.lieu.trim()) {
    return Promise.reject(new Error("Une entrée doit avoir un lieu."));
  }
  if (!entree.titre || !entree.titre.trim()) {
    return Promise.reject(new Error("Une entrée doit avoir un titre."));
  }
  const complete = {
    id: crypto.randomUUID(),
    titre: entree.titre.trim(),
    lieu: entree.lieu.trim(),
    lat: entree.lat ?? null,
    lon: entree.lon ?? null,
    cible: entree.cible ?? "",
    discipline: entree.discipline ?? "",
    distance: entree.distance ?? "",
    labels: _normaliserLabels(entree.labels),
    commentaire: (entree.commentaire ?? "").trim(),
    meteo: METEO_OPTIONS.includes(entree.meteo) ? entree.meteo : "aucune",
    date: entree.date ?? new Date().toISOString().slice(0, 10),
    photoIds: Array.isArray(entree.photoIds) ? entree.photoIds.slice(0, 6) : [],
    audioId: entree.audioId ?? null,
    creeLe: new Date().toISOString(),
  };
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("entrees", "readwrite");
        transaction.objectStore("entrees").add(complete);
        transaction.oncomplete = () => resolve(complete);
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

function modifierEntree(entree) {
  if (!entree || !entree.id) {
    return Promise.reject(new Error("modifierEntree requiert un id."));
  }
  if (!entree.lieu || !entree.lieu.trim()) {
    return Promise.reject(new Error("Une entrée doit avoir un lieu."));
  }
  if (!entree.titre || !entree.titre.trim()) {
    return Promise.reject(new Error("Une entrée doit avoir un titre."));
  }
  const complete = {
    ...entree,
    titre: entree.titre.trim(),
    lieu: entree.lieu.trim(),
    labels: _normaliserLabels(entree.labels),
    commentaire: (entree.commentaire ?? "").trim(),
    meteo: METEO_OPTIONS.includes(entree.meteo) ? entree.meteo : "aucune",
    photoIds: Array.isArray(entree.photoIds) ? entree.photoIds.slice(0, 6) : [],
  };
  delete complete.photoId; // ancien champ (avant #12) -- ne pas le laisser traîner une fois l'entrée réenregistrée
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("entrees", "readwrite");
        transaction.objectStore("entrees").put(complete);
        transaction.oncomplete = () => resolve(complete);
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

function listerEntrees() {
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("entrees", "readonly");
        const requete = transaction.objectStore("entrees").getAll();
        requete.onsuccess = () => {
          // Repli sur l'ancien champ photoId (avant #12) pour les
          // entrées jamais réenregistrées depuis -- jamais migré/
          // persisté ici, juste normalisé à la lecture (voir le
          // schéma en tête de fichier).
          const entrees = requete.result
            .map((e) => ({
              ...e,
              photoIds: e.photoIds || (e.photoId ? [e.photoId] : []),
            }))
            // Plus récent d'abord -- date de la sortie, puis date de
            // création en départage (deux sorties le même jour).
            .sort((a, b) => {
              if (a.date !== b.date) return a.date < b.date ? 1 : -1;
              return a.creeLe < b.creeLe ? 1 : -1;
            });
          resolve(entrees);
        };
        requete.onerror = () => reject(requete.error);
      })
  );
}

function supprimerEntree(id) {
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("entrees", "readwrite");
        transaction.objectStore("entrees").delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

// ---- Store "photos" (issue #4) -- clé explicite (photoId), pas de
// keyPath sur le Blob lui-même, voir onupgradeneeded ci-dessus. ------

function enregistrerPhoto(blob) {
  const id = crypto.randomUUID();
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("photos", "readwrite");
        transaction.objectStore("photos").put(blob, id);
        transaction.oncomplete = () => resolve(id);
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

function obtenirPhoto(photoId) {
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("photos", "readonly");
        const requete = transaction.objectStore("photos").get(photoId);
        requete.onsuccess = () => resolve(requete.result || null);
        requete.onerror = () => reject(requete.error);
      })
  );
}

function supprimerPhoto(photoId) {
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("photos", "readwrite");
        transaction.objectStore("photos").delete(photoId);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

// ---- Store "audios" (retour utilisateur, 2026-08-29) -- même patron
// que le store "photos" ci-dessus (clé explicite, Blob en valeur), voir
// le schéma en tête de fichier pour pourquoi c'est un store séparé. ---

function enregistrerAudio(blob) {
  const id = crypto.randomUUID();
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("audios", "readwrite");
        transaction.objectStore("audios").put(blob, id);
        transaction.oncomplete = () => resolve(id);
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

function obtenirAudio(audioId) {
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("audios", "readonly");
        const requete = transaction.objectStore("audios").get(audioId);
        requete.onsuccess = () => resolve(requete.result || null);
        requete.onerror = () => reject(requete.error);
      })
  );
}

function supprimerAudio(audioId) {
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("audios", "readwrite");
        transaction.objectStore("audios").delete(audioId);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

// ---- Import d'une sauvegarde (issue #5) -----------------------------
// restaurerEntree/restaurerPhoto préservent l'id/photoId exact de la
// sauvegarde (contrairement à ajouterEntree/enregistrerPhoto, qui en
// génèrent toujours un nouveau) -- add() plutôt que put() : rejette
// silencieusement (résout false) si l'id existe déjà, plutôt que
// d'écraser une entrée déjà présente. Décidé en écrivant ce ticket :
// ré-importer deux fois la même sauvegarde doit être sans effet la
// deuxième fois (idempotent), pas dupliquer ni écraser une donnée
// éventuellement plus récente déjà sur l'appareil.

function restaurerEntree(entree) {
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("entrees", "readwrite");
        const requete = transaction.objectStore("entrees").add(entree);
        requete.onsuccess = () => resolve(true);
        requete.onerror = (evenement) => {
          evenement.preventDefault();
          resolve(false);
        };
        transaction.onerror = (evenement) => evenement.preventDefault();
      })
  );
}

function restaurerPhoto(photoId, blob) {
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("photos", "readwrite");
        const requete = transaction.objectStore("photos").add(blob, photoId);
        requete.onsuccess = () => resolve(true);
        requete.onerror = (evenement) => {
          evenement.preventDefault();
          resolve(false);
        };
        transaction.onerror = (evenement) => evenement.preventDefault();
      })
  );
}

function restaurerAudio(audioId, blob) {
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("audios", "readwrite");
        const requete = transaction.objectStore("audios").add(blob, audioId);
        requete.onsuccess = () => resolve(true);
        requete.onerror = (evenement) => {
          evenement.preventDefault();
          resolve(false);
        };
        transaction.onerror = (evenement) => evenement.preventDefault();
      })
  );
}

// ---- Réinitialisation complète (retour utilisateur, 2026-08-26 --
// même fonctionnalité que FletchGames) -----------------------------
// Vide les deux stores dans une seule transaction atomique -- jamais
// l'un vidé et l'autre pas en cas d'erreur à mi-chemin.

function reinitialiserDonnees() {
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(["entrees", "photos", "audios"], "readwrite");
        transaction.objectStore("entrees").clear();
        transaction.objectStore("photos").clear();
        transaction.objectStore("audios").clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      })
  );
}
