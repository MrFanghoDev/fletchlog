/* Carte souvenir -- retour utilisateur : garder une image récapitulative
 * partageable d'un lieu, d'une période, ou de tout autre résultat de
 * filtre. Fichier séparé (même principe qu'export-import.js) plutôt que
 * grossir app.js encore -- fonctionnalité autonome, un seul point
 * d'entrée réel (ouvrirSouvenir(), câblée en bas de ce fichier).
 *
 * Rendu en <canvas> (aucune dépendance ajoutée) à partir des sorties
 * actuellement filtrées (entreesFiltrees(), définie dans app.js,
 * appelée telle quelle -- la carte souvenir n'a pas son propre état de
 * filtre, elle reflète exactement ce que l'utilisateur regarde déjà).
 * Une seule photo "vedette" (la plus récente sortie filtrée qui en a
 * une) plutôt qu'une mosaïque -- plus simple à mettre en page proprement
 * en canvas, et suffit à donner un vrai ancrage visuel à la carte.
 */

const SOUVENIR_LARGEUR = 1080;
const SOUVENIR_HAUTEUR = 1350;
const SOUVENIR_MARGE = 64;

const EMOJI_METEO = { ensoleille: "☀️", nuageux: "🌥️", pluie: "🌧️", vent: "💨" };

let _souvenirIconePromise = null;
function _chargerIconeSouvenir() {
  if (!_souvenirIconePromise) {
    _souvenirIconePromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = "icon-192.png";
    });
  }
  return _souvenirIconePromise;
}

function _chargerPhoto(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Sortie la plus récente (date, puis creeLe en départage) parmi celles
// qui ont au moins une photo déjà en cache (voir precharcherPhotos()
// dans app.js -- appelée au chargement, donc déjà disponible ici sans
// nouvelle lecture IndexedDB).
function _photoVedette(entrees) {
  const avecPhoto = entrees
    .filter((e) => (e.photoIds || []).length && photosCache[e.photoIds[0]])
    .sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.creeLe < b.creeLe ? 1 : -1));
  return avecPhoto.length ? photosCache[avecPhoto[0].photoIds[0]] : null;
}

function _titreEtSousTitre(entrees) {
  const lieux = new Set(entrees.map((e) => e.lieu));
  const disciplines = new Set(entrees.map((e) => e.discipline).filter(Boolean));
  const dateDebut = document.getElementById("filtre-date-debut").value;
  const dateFin = document.getElementById("filtre-date-fin").value;

  let titre;
  if (lieux.size === 1) titre = [...lieux][0];
  else if (disciplines.size === 1) titre = [...disciplines][0];
  else if (dateDebut || dateFin) {
    titre = tf(currentLanguage, "souvenirPeriode", {
      debut: dateDebut ? formaterDate(dateDebut) : "…",
      fin: dateFin ? formaterDate(dateFin) : "…",
    });
  } else {
    titre = tf(currentLanguage, entrees.length === 1 ? "souvenirSortieSing" : "souvenirSortiePlur", { n: entrees.length });
  }

  const dates = entrees.map((e) => e.date).filter(Boolean).sort();
  const sousTitre =
    dates.length && dates[0] !== dates[dates.length - 1]
      ? tf(currentLanguage, "souvenirPeriode", { debut: formaterDate(dates[0]), fin: formaterDate(dates[dates.length - 1]) })
      : dates.length
        ? formaterDate(dates[0])
        : "";

  return { titre, sousTitre };
}

function _statsMeteo(entrees) {
  const comptes = {};
  for (const e of entrees) {
    if (e.meteo && e.meteo !== "aucune") comptes[e.meteo] = (comptes[e.meteo] || 0) + 1;
  }
  return Object.entries(comptes).sort((a, b) => b[1] - a[1]);
}

// Découpe un texte en lignes tenant dans `largeurMax`, sans jamais
// dépasser `maxLignes` (tronque avec "…" au-delà -- un titre de sortie
// peut être long, la carte doit rester lisible plutôt que déborder).
function _decouperTexte(ctx, texte, largeurMax, maxLignes) {
  const mots = texte.split(" ");
  const lignes = [];
  let ligneCourante = "";
  for (const mot of mots) {
    const essai = ligneCourante ? `${ligneCourante} ${mot}` : mot;
    if (ctx.measureText(essai).width > largeurMax && ligneCourante) {
      lignes.push(ligneCourante);
      ligneCourante = mot;
      if (lignes.length === maxLignes) break; // le reste sera tronqué ci-dessous
    } else {
      ligneCourante = essai;
    }
  }
  if (lignes.length < maxLignes && ligneCourante) lignes.push(ligneCourante);

  const texteComplet = lignes.join(" ") === texte;
  if (!texteComplet) {
    let derniere = lignes[lignes.length - 1] || "";
    while (ctx.measureText(`${derniere}…`).width > largeurMax && derniere.length > 1) {
      derniere = derniere.slice(0, -1);
    }
    lignes[lignes.length - 1] = `${derniere}…`;
  }
  return lignes;
}

async function _dessinerSouvenir(entrees) {
  const canvas = document.getElementById("souvenir-canvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, SOUVENIR_LARGEUR, SOUVENIR_HAUTEUR);

  const urlPhoto = _photoVedette(entrees);
  const [photo, icone] = await Promise.all([urlPhoto ? _chargerPhoto(urlPhoto) : null, _chargerIconeSouvenir()]);

  if (photo) {
    const echelle = Math.max(SOUVENIR_LARGEUR / photo.width, SOUVENIR_HAUTEUR / photo.height);
    const largeur = photo.width * echelle;
    const hauteur = photo.height * echelle;
    ctx.drawImage(photo, (SOUVENIR_LARGEUR - largeur) / 2, (SOUVENIR_HAUTEUR - hauteur) / 2, largeur, hauteur);
    const degrade = ctx.createLinearGradient(0, SOUVENIR_HAUTEUR * 0.35, 0, SOUVENIR_HAUTEUR);
    degrade.addColorStop(0, "rgba(15,18,22,0)");
    degrade.addColorStop(1, "rgba(15,18,22,0.92)");
    ctx.fillStyle = degrade;
    ctx.fillRect(0, 0, SOUVENIR_LARGEUR, SOUVENIR_HAUTEUR);
  } else {
    ctx.fillStyle = "#0f1216";
    ctx.fillRect(0, 0, SOUVENIR_LARGEUR, SOUVENIR_HAUTEUR);
  }

  // Marque FletchLog en haut à gauche.
  if (icone) ctx.drawImage(icone, SOUVENIR_MARGE, 56, 48, 48);
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 40px system-ui, -apple-system, sans-serif";
  const xTexteMarque = SOUVENIR_MARGE + (icone ? 62 : 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Fletch", xTexteMarque, 90);
  const largeurFletch = ctx.measureText("Fletch").width;
  ctx.fillStyle = "#d1a13d";
  ctx.fillText("Log", xTexteMarque + largeurFletch, 90);

  const { titre, sousTitre } = _titreEtSousTitre(entrees);
  const largeurTexte = SOUVENIR_LARGEUR - SOUVENIR_MARGE * 2;

  // Empilage du BAS vers le HAUT (yCurseur descend d'un pas fixe et
  // connu avant chaque élément) -- contrairement à un empilage du haut
  // vers le bas, la position du pied de page et de la ligne météo ne
  // dépend alors JAMAIS de la hauteur du titre/sous-titre au-dessus
  // (un titre qui tient sur une seule ligne vs deux ne peut plus faire
  // remonter le contenu du bas jusqu'à chevaucher un élément suivant --
  // bug réel rencontré en testant : "FletchLog" en pied de page se
  // dessinait quasiment à la même hauteur que "N sorties" au-dessus).
  let yCurseur = SOUVENIR_HAUTEUR - 40;
  ctx.font = "22px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("FletchLog", SOUVENIR_MARGE, yCurseur);

  const meteo = _statsMeteo(entrees);
  if (meteo.length) {
    yCurseur -= 56;
    ctx.font = "34px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    let x = SOUVENIR_MARGE;
    for (const [cle, n] of meteo) {
      const texte = `${EMOJI_METEO[cle] || ""} ${n}`;
      ctx.fillText(texte, x, yCurseur);
      x += ctx.measureText(texte).width + 36;
    }
  }

  yCurseur -= 66;
  ctx.font = "600 32px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#d1a13d";
  ctx.fillText(
    tf(currentLanguage, entrees.length === 1 ? "souvenirSortieSing" : "souvenirSortiePlur", { n: entrees.length }),
    SOUVENIR_MARGE,
    yCurseur
  );

  if (sousTitre) {
    yCurseur -= 58;
    ctx.font = "500 34px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(sousTitre, SOUVENIR_MARGE, yCurseur);
  }

  ctx.font = "700 76px system-ui, -apple-system, sans-serif";
  const lignesTitre = _decouperTexte(ctx, titre, largeurTexte, 2);
  ctx.fillStyle = "#ffffff";
  yCurseur -= 30;
  for (let i = lignesTitre.length - 1; i >= 0; i--) {
    ctx.fillText(lignesTitre[i], SOUVENIR_MARGE, yCurseur);
    yCurseur -= 84;
  }
}

function _telechargerBlobSouvenir(blob, nomFichier) {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function _nomFichierSouvenir() {
  return `fletchlog-souvenir-${new Date().toISOString().slice(0, 10)}.png`;
}

function _canvasVersBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

async function ouvrirSouvenir() {
  const entrees = entreesFiltrees();
  const overlay = document.getElementById("souvenir-overlay");
  const canvas = document.getElementById("souvenir-canvas");
  const vide = document.getElementById("souvenir-vide");
  const actions = document.getElementById("souvenir-actions");

  overlay.hidden = false;

  if (entrees.length === 0) {
    canvas.hidden = true;
    vide.hidden = false;
    actions.hidden = true;
    return;
  }

  vide.hidden = true;
  canvas.hidden = false;
  actions.hidden = false;

  await _dessinerSouvenir(entrees);

  const boutonPartager = document.getElementById("souvenir-partager");
  const peutPartagerFichier = !!(window.File && navigator.canShare);
  boutonPartager.hidden = !peutPartagerFichier;
}

function fermerSouvenir() {
  document.getElementById("souvenir-overlay").hidden = true;
}

document.getElementById("bouton-souvenir").addEventListener("click", ouvrirSouvenir);
document.getElementById("souvenir-fermer").addEventListener("click", fermerSouvenir);

document.getElementById("souvenir-telecharger").addEventListener("click", async () => {
  const blob = await _canvasVersBlob(document.getElementById("souvenir-canvas"));
  if (blob) _telechargerBlobSouvenir(blob, _nomFichierSouvenir());
});

document.getElementById("souvenir-partager").addEventListener("click", async () => {
  const blob = await _canvasVersBlob(document.getElementById("souvenir-canvas"));
  if (!blob) return;
  const nomFichier = _nomFichierSouvenir();
  const fichier = new File([blob], nomFichier, { type: "image/png" });
  if (navigator.canShare({ files: [fichier] })) {
    navigator.share({ files: [fichier], title: nomFichier }).catch(() => {
      _telechargerBlobSouvenir(blob, nomFichier);
    });
  } else {
    _telechargerBlobSouvenir(blob, nomFichier);
  }
});
