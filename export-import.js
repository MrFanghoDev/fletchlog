/* Export/import d'une sauvegarde complète (issue #5) -- seul filet de
 * sécurité prévu pour ce projet (pas de synchro serveur, voir
 * CLAUDE.md). Archive .zip (JSZip, vendoré -- voir jszip.min.js et le
 * principe de dépendances dans le CLAUDE.md global) contenant
 * entrees.json (métadonnées de toutes les entrées) + un fichier par
 * photo sous photos/<photoId>.jpg -- pas de base64, ça gonflerait
 * l'archive d'environ un tiers pour rien. Depuis la note vocale
 * (retour utilisateur, 2026-08-29), un fichier par note sous
 * audios/<audioId>.webm, même principe.
 *
 * Comportement à l'import décidé en écrivant ce ticket : un id déjà
 * présent est ignoré, jamais écrasé ni dupliqué -- réimporter deux
 * fois la même sauvegarde doit être sans effet la seconde fois (voir
 * storage.js::restaurerEntree/restaurerPhoto/restaurerAudio, qui
 * portent cette garantie au niveau de la base plutôt qu'ici).
 *
 * Export du résultat d'un filtrage (retour utilisateur, 2026-08-29) --
 * même archive, juste réduite à un sous-ensemble d'entrées passé par
 * l'appelant (voir exporterSauvegarde(entrees) et le bouton dédié dans
 * la barre de filtres, app.js) plutôt qu'un format distinct : ce
 * sous-ensemble reste réimportable tel quel par importerSauvegarde(),
 * aucune raison de maintenir deux formats.
 */

function _nomFichierExport(suffixe) {
  return `fletchlog-export${suffixe ? "-" + suffixe : ""}-${new Date().toISOString().slice(0, 10)}.zip`;
}

// `entrees` optionnel -- toutes les entrées du carnet si omis (export
// complet, comportement historique), ou un sous-ensemble déjà filtré
// fourni par l'appelant (voir le commentaire en tête de fichier).
function exporterSauvegarde(entrees) {
  return (entrees ? Promise.resolve(entrees) : listerEntrees()).then((entrees) => {
    const zip = new JSZip();
    zip.file(
      "entrees.json",
      JSON.stringify({ version: 1, exporteLe: new Date().toISOString(), entrees }, null, 2)
    );

    const idsPhotos = [...new Set(entrees.flatMap((e) => e.photoIds || []))];
    const idsAudios = [...new Set(entrees.map((e) => e.audioId).filter(Boolean))];
    return Promise.all([
      ...idsPhotos.map((id) =>
        obtenirPhoto(id).then((blob) => {
          if (blob) zip.file(`photos/${id}.jpg`, blob);
        })
      ),
      ...idsAudios.map((id) =>
        obtenirAudio(id).then((blob) => {
          if (blob) zip.file(`audios/${id}.webm`, blob);
        })
      ),
    ]).then(() => zip.generateAsync({ type: "blob" }));
  });
}

function _telechargerBlob(blob, nomFichier) {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Date du dernier export réussi (issue #18 -- rappel périodique tant
// que le stockage PWA n'est pas garanti fiable indéfiniment, surtout
// pertinent sur Safari/iOS, voir CLAUDE.md). Un partage natif annulé
// retombe sur _telechargerBlob() (voir plus bas) donc marque quand
// même -- un fichier a été produit dans les deux cas.
function _marquerExportReussi() {
  localStorage.setItem("fletchlog_dernier_export", new Date().toISOString());
}

// `estBackupComplet` (retour utilisateur, 2026-08-29) -- un export du
// résultat d'un filtrage n'est PAS une sauvegarde complète du carnet :
// le marquer comme tel ferait taire à tort le rappel périodique
// (issue #18), qui suppose que "dernier export" veut dire "tout le
// carnet est sauvegardé". `suffixeNomFichier` distingue aussi le nom
// du fichier ("fletchlog-export-filtre-...zip") pour ne pas laisser
// croire à une sauvegarde complète en le regardant après coup.
function livrerExport(blob, { estBackupComplet = true, suffixeNomFichier } = {}) {
  const nomFichier = _nomFichierExport(suffixeNomFichier);
  const marquer = () => {
    if (estBackupComplet) _marquerExportReussi();
  };
  // Partage natif Android si possible (voir CLAUDE.md) -- repli sur un
  // lien de téléchargement classique sinon, ou si le partage échoue/est
  // annulé par l'utilisateur.
  if (window.File && navigator.canShare) {
    const fichier = new File([blob], nomFichier, { type: "application/zip" });
    if (navigator.canShare({ files: [fichier] })) {
      return navigator
        .share({ files: [fichier], title: nomFichier })
        .catch(() => {
          _telechargerBlob(blob, nomFichier);
        })
        .then(marquer);
    }
  }
  _telechargerBlob(blob, nomFichier);
  marquer();
  return Promise.resolve();
}

function importerSauvegarde(fichier) {
  return JSZip.loadAsync(fichier).then((zip) => {
    const entreesJson = zip.file("entrees.json");
    if (!entreesJson) {
      return Promise.reject(new Error("Archive invalide -- entrees.json introuvable."));
    }
    return entreesJson.async("string").then((texte) => {
      const entrees = (JSON.parse(texte).entrees || []);
      let importees = 0;
      let ignorees = 0;

      return entrees
        .reduce(
          (promesse, entree) =>
            promesse.then(() => {
              // Repli sur l'ancien champ photoId : une sauvegarde
              // exportée avant #12 n'a que ça.
              const idsPhotos = entree.photoIds || (entree.photoId ? [entree.photoId] : []);
              const restaurationsPhotos = idsPhotos.map((id) => {
                const fichierPhoto = zip.file(`photos/${id}.jpg`);
                return fichierPhoto ? fichierPhoto.async("blob").then((blob) => restaurerPhoto(id, blob)) : null;
              });
              // Note vocale (retour utilisateur, 2026-08-29) -- absente
              // des sauvegardes exportées avant cette fonctionnalité,
              // entree.audioId est alors simplement undefined/absent.
              const restaurationAudio = entree.audioId
                ? (() => {
                    const fichierAudio = zip.file(`audios/${entree.audioId}.webm`);
                    return fichierAudio ? fichierAudio.async("blob").then((blob) => restaurerAudio(entree.audioId, blob)) : null;
                  })()
                : null;
              const entreeRestauree = { ...entree, photoIds: idsPhotos, audioId: entree.audioId ?? null };
              delete entreeRestauree.photoId;
              return Promise.all([...restaurationsPhotos, restaurationAudio])
                .then(() => restaurerEntree(entreeRestauree))
                .then((ajoutee) => {
                  if (ajoutee) importees += 1;
                  else ignorees += 1;
                });
            }),
          Promise.resolve()
        )
        .then(() => ({ importees, ignorees }));
    });
  });
}
