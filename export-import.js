/* Export/import d'une sauvegarde complète (issue #5) -- seul filet de
 * sécurité prévu pour ce projet (pas de synchro serveur, voir
 * CLAUDE.md). Archive .zip (JSZip, vendoré -- voir jszip.min.js et le
 * principe de dépendances dans le CLAUDE.md global) contenant
 * entrees.json (métadonnées de toutes les entrées) + un fichier par
 * photo sous photos/<photoId>.jpg -- pas de base64, ça gonflerait
 * l'archive d'environ un tiers pour rien.
 *
 * Comportement à l'import décidé en écrivant ce ticket : un id déjà
 * présent est ignoré, jamais écrasé ni dupliqué -- réimporter deux
 * fois la même sauvegarde doit être sans effet la seconde fois (voir
 * storage.js::restaurerEntree/restaurerPhoto, qui portent cette
 * garantie au niveau de la base plutôt qu'ici).
 */

function _nomFichierExport() {
  return `fletchlog-export-${new Date().toISOString().slice(0, 10)}.zip`;
}

function exporterSauvegarde() {
  return listerEntrees().then((entrees) => {
    const zip = new JSZip();
    zip.file(
      "entrees.json",
      JSON.stringify({ version: 1, exporteLe: new Date().toISOString(), entrees }, null, 2)
    );

    const idsPhotos = [...new Set(entrees.flatMap((e) => e.photoIds || []))];
    return Promise.all(
      idsPhotos.map((id) =>
        obtenirPhoto(id).then((blob) => {
          if (blob) zip.file(`photos/${id}.jpg`, blob);
        })
      )
    ).then(() => zip.generateAsync({ type: "blob" }));
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

function livrerExport(blob) {
  const nomFichier = _nomFichierExport();
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
        .then(_marquerExportReussi);
    }
  }
  _telechargerBlob(blob, nomFichier);
  _marquerExportReussi();
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
              const entreeRestauree = { ...entree, photoIds: idsPhotos };
              delete entreeRestauree.photoId;
              return Promise.all(restaurationsPhotos)
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
