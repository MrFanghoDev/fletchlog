/* Stockage local des sorties de tir -- petit wrapper au-dessus de
 * l'API indexedDB native (voir CLAUDE.md, principe de dépendances :
 * l'API brute suffit ici, pas de lib ajoutée pour ça). Base pour tout
 * le reste (#3 vue Liste, #4 photo, #6 GPS, #7 vue Carte) -- ce
 * fichier ne construit aucune UI, juste ajouterEntree/listerEntrees/
 * supprimerEntree (issue #2).
 *
 * Schéma d'une entrée (store "entrees") :
 *   id          string   généré (crypto.randomUUID())
 *   lieu        string   nom saisi par l'archer
 *   lat, lon    number | null   coordonnées GPS brutes (issue #6,
 *                                pas de reverse-geocoding, voir CLAUDE.md)
 *   cible       string   nom de la cible/blason
 *   discipline  string
 *   distance    string   texte libre ("18 m", "Parcours varié"...) --
 *                         pas un nombre, les distances d'un parcours
 *                         nature ne sont pas une valeur unique
 *   meteo       string   une des clés METEO_OPTIONS ci-dessous --
 *                         liste fermée plutôt que texte libre, pour
 *                         pouvoir afficher une icône cohérente par
 *                         entrée (voir le mockup Look and Feel/#3)
 *   date        string   jour de la sortie, format AAAA-MM-JJ
 *   photoId     string | null   référence vers le store "photos"
 *                                (Blob), rempli par #4 -- absent tant
 *                                que la capture photo n'existe pas
 *   creeLe      string   horodatage ISO de création, posé par
 *                         ajouterEntree -- jamais fourni par l'appelant
 *
 * Le store "photos" (clé = photoId, valeur = Blob) est créé dès
 * maintenant avec ce schéma plutôt que d'attendre #4 : ajouter un
 * store à une base IndexedDB existante demande de monter la version
 * et un nouveau onupgradeneeded, autant le faire une seule fois ici
 * puisque le champ photoId fait déjà partie du schéma de #2.
 */

const METEO_OPTIONS = ["ensoleille", "nuageux", "pluie", "vent", "aucune"];

const DB_NOM = "fletchlog";
const DB_VERSION = 1;

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
    };
    requete.onsuccess = () => resolve(requete.result);
    requete.onerror = () => reject(requete.error);
  });
}

function ajouterEntree(entree) {
  if (!entree || !entree.lieu || !entree.lieu.trim()) {
    return Promise.reject(new Error("Une entrée doit avoir un lieu."));
  }
  const complete = {
    id: crypto.randomUUID(),
    lieu: entree.lieu.trim(),
    lat: entree.lat ?? null,
    lon: entree.lon ?? null,
    cible: entree.cible ?? "",
    discipline: entree.discipline ?? "",
    distance: entree.distance ?? "",
    meteo: METEO_OPTIONS.includes(entree.meteo) ? entree.meteo : "aucune",
    date: entree.date ?? new Date().toISOString().slice(0, 10),
    photoId: entree.photoId ?? null,
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

function listerEntrees() {
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("entrees", "readonly");
        const requete = transaction.objectStore("entrees").getAll();
        requete.onsuccess = () => {
          // Plus récent d'abord -- date de la sortie, puis date de
          // création en départage (deux sorties le même jour).
          const entrees = requete.result.sort((a, b) => {
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
