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
 * Une seule photo "vedette" (la première sortie filtrée qui en a une,
 * dans l'ordre de tri actuellement sélectionné dans la vue Liste) en
 * grand format, plus une bande de petites vignettes en bas de carte
 * pour les autres sorties filtrées qui ont aussi une photo (retour
 * utilisateur, 2026-08-25) -- juste la première photo de chacune
 * (photoIds[0]), pas une mosaïque complète par sortie.
 *
 * Carte au même ratio que la photo vedette (retour utilisateur,
 * 2026-08-25) -- la photo remplit tout le cadre (plus de fond uni
 * autour), infos superposées par-dessus via un dégradé sombre en bas
 * plutôt qu'en dessous sur fond séparé. Ratio de la photo repris
 * directement, borné à [RATIO_MIN, RATIO_MAX] pour éviter une carte
 * absurdement étroite/large sur une photo au format inhabituel --
 * dans cette plage, la photo remplit le cadre sans rognage visible.
 */

const SOUVENIR_LARGEUR_DEFAUT = 1080;
const SOUVENIR_HAUTEUR_DEFAUT = 1350;
const SOUVENIR_MARGE = 64;
const SOUVENIR_RATIO_MIN = 0.55; // proche de 9:16, portrait téléphone habituel
// 1.5 (3:2) plutôt que 16:9 (1.78) -- avec titre sur 2 lignes +
// sous-titre + météo + bande de vignettes, le bloc de texte empilé
// peut atteindre ~600px de haut ; une carte trop basse le ferait
// déborder au-dessus du cadre. 1.5 laisse une marge de sécurité
// (hauteur mini 720px à largeur 1080 fixe) sans trop s'écarter du
// ratio réel d'une photo paysage.
const SOUVENIR_RATIO_MAX = 1.5;

// Bande de vignettes des sorties supplémentaires -- une seule rangée,
// jamais plus (pas de défilement possible sur une image statique) :
// 6 vignettes de 140px + 16px d'espacement tiennent tout juste dans la
// largeur utile (1080 - 2*64 = 952px). Au-delà, la dernière vignette
// affichée porte un badge "+N" plutôt que d'en dessiner davantage.
const SOUVENIR_VIGNETTE_TAILLE = 140;
const SOUVENIR_VIGNETTE_ECART = 16;
const SOUVENIR_VIGNETTE_MAX = 6;

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

// Première sortie avec photo dans l'ordre de tri actuellement
// sélectionné dans la vue Liste (retour utilisateur, 2026-08-25) --
// respecte ce que l'utilisateur regarde déjà (trierEntrees(), définie
// dans app.js) plutôt que d'imposer systématiquement la plus récente,
// indépendamment du tri choisi. Photo déjà en cache (voir
// precharcherPhotos() dans app.js -- appelée au chargement, donc
// disponible ici sans nouvelle lecture IndexedDB).
function _entreeVedette(entrees) {
  return trierEntrees(entrees).find((e) => (e.photoIds || []).length && photosCache[e.photoIds[0]]) || null;
}

// Sorties supplémentaires avec photo (retour utilisateur, 2026-08-25) --
// même ordre de tri que la vedette, la vedette elle-même exclue
// (identifiée par id, pas par photo -- deux sorties distinctes
// pourraient en théorie partager un id de photo si l'une a été
// dupliquée via import/export, mais jamais le même id d'entrée).
function _photosSupplementaires(entrees, entreeVedette) {
  return trierEntrees(entrees)
    .filter((e) => e.id !== entreeVedette?.id && (e.photoIds || []).length && photosCache[e.photoIds[0]])
    .map((e) => photosCache[e.photoIds[0]]);
}

// Largeur fixe (1080, cohérent avec les tailles de police/marges déjà
// calibrées dessus), hauteur dérivée du ratio de la photo vedette
// (borné) -- ou format par défaut 4:5 s'il n'y a pas de photo.
function _dimensionsCarte(photo) {
  const largeur = SOUVENIR_LARGEUR_DEFAUT;
  if (!photo) return { largeur, hauteur: SOUVENIR_HAUTEUR_DEFAUT };
  const ratio = Math.min(Math.max(photo.width / photo.height, SOUVENIR_RATIO_MIN), SOUVENIR_RATIO_MAX);
  return { largeur, hauteur: Math.round(largeur / ratio) };
}

function _cheminRectArrondi(ctx, x, y, taille, rayon) {
  ctx.beginPath();
  ctx.moveTo(x + rayon, y);
  ctx.arcTo(x + taille, y, x + taille, y + taille, rayon);
  ctx.arcTo(x + taille, y + taille, x, y + taille, rayon);
  ctx.arcTo(x, y + taille, x, y, rayon);
  ctx.arcTo(x, y, x + taille, y, rayon);
  ctx.closePath();
}

// Dessine `image` en "cover" (recadrée, comme les vignettes du reste de
// l'appli -- .carte-vignette img { object-fit: cover }) dans un carré
// arrondi de côté `taille`, coin (x, y).
function _dessinerVignette(ctx, image, x, y, taille, rayon) {
  ctx.save();
  _cheminRectArrondi(ctx, x, y, taille, rayon);
  ctx.clip();
  const echelle = Math.max(taille / image.width, taille / image.height);
  const largeur = image.width * echelle;
  const hauteur = image.height * echelle;
  ctx.drawImage(image, x + (taille - largeur) / 2, y + (taille - hauteur) / 2, largeur, hauteur);
  ctx.restore();
  // Fin liseré -- la carte entière est désormais une photo en fond
  // (retour utilisateur, 2026-08-25), les vignettes ont besoin d'un
  // bord net pour rester lisibles par-dessus une image potentiellement
  // chargée, même sous le dégradé.
  ctx.save();
  _cheminRectArrondi(ctx, x, y, taille, rayon);
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

// Badge "+N" superposé sur la dernière vignette affichée, quand des
// sorties supplémentaires avec photo dépassent SOUVENIR_VIGNETTE_MAX.
function _dessinerBadgePlus(ctx, x, y, taille, rayon, n) {
  ctx.save();
  _cheminRectArrondi(ctx, x, y, taille, rayon);
  ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x, y, taille, taille);
  ctx.restore();
  ctx.font = "700 34px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`+${n}`, x + taille / 2, y + taille / 2 + 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
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

  const entreeVedette = _entreeVedette(entrees);
  const urlPhotoVedette = entreeVedette ? photosCache[entreeVedette.photoIds[0]] : null;
  const urlsSupplementaires = _photosSupplementaires(entrees, entreeVedette);
  const urlsVignettesAffichees = urlsSupplementaires.slice(0, SOUVENIR_VIGNETTE_MAX);
  const vignettesEnTrop = urlsSupplementaires.length - urlsVignettesAffichees.length;

  const [photo, icone, ...vignettes] = await Promise.all([
    urlPhotoVedette ? _chargerPhoto(urlPhotoVedette) : null,
    _chargerIconeSouvenir(),
    ...urlsVignettesAffichees.map((url) => _chargerPhoto(url)),
  ]);
  const vignettesChargees = vignettes.filter(Boolean);

  // Dimensions dérivées du ratio de la photo vedette (retour
  // utilisateur, 2026-08-25) -- changer canvas.width/height efface et
  // redimensionne le canvas, pas besoin de clearRect séparé.
  const { largeur, hauteur } = _dimensionsCarte(photo);
  canvas.width = largeur;
  canvas.height = hauteur;

  ctx.fillStyle = "#0f1216";
  ctx.fillRect(0, 0, largeur, hauteur);

  if (photo) {
    // "Cover" -- le canvas est déjà au ratio de la photo (à la marge
    // de bornage près), donc ceci remplit le cadre sans rogner de
    // façon visible dans l'immense majorité des cas ; seule une photo
    // au ratio extrême (hors [RATIO_MIN, RATIO_MAX]) perd un peu de
    // ses bords après bornage, plutôt que de produire une carte
    // absurdement étroite/large.
    const echelle = Math.max(largeur / photo.width, hauteur / photo.height);
    const largeurPhoto = photo.width * echelle;
    const hauteurPhoto = photo.height * echelle;
    ctx.drawImage(photo, (largeur - largeurPhoto) / 2, (hauteur - hauteurPhoto) / 2, largeurPhoto, hauteurPhoto);

    // Dégradé sombre en bas pour la lisibilité du texte superposé --
    // les infos sont de nouveau posées SUR la photo (retour
    // utilisateur, 2026-08-25), pas en dessous sur fond séparé.
    const degrade = ctx.createLinearGradient(0, hauteur * 0.4, 0, hauteur);
    degrade.addColorStop(0, "rgba(15,18,22,0)");
    degrade.addColorStop(1, "rgba(15,18,22,0.92)");
    ctx.fillStyle = degrade;
    ctx.fillRect(0, 0, largeur, hauteur);
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
  const largeurTexte = largeur - SOUVENIR_MARGE * 2;

  // Empilage du BAS vers le HAUT (yCurseur descend d'un pas fixe et
  // connu avant chaque élément) -- contrairement à un empilage du haut
  // vers le bas, la position du pied de page et de la ligne météo ne
  // dépend alors JAMAIS de la hauteur du titre/sous-titre au-dessus
  // (un titre qui tient sur une seule ligne vs deux ne peut plus faire
  // remonter le contenu du bas jusqu'à chevaucher un élément suivant --
  // bug réel rencontré en testant : "FletchLog" en pied de page se
  // dessinait quasiment à la même hauteur que "N sorties" au-dessus).
  let yCurseur = hauteur - 40;
  ctx.font = "22px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("FletchLog", SOUVENIR_MARGE, yCurseur);

  // Bande de vignettes des sorties supplémentaires (retour utilisateur,
  // 2026-08-25) -- juste au-dessus du pied de page. yCurseur passe ici
  // de "ligne de base de texte" à "bas du bloc réservé" : les éléments
  // suivants (météo, compteur...) repartent de cette nouvelle position
  // comme si c'était le pied de page, la logique d'empilage bas->haut
  // ne change pas au-delà de ce bloc.
  if (vignettesChargees.length) {
    const yHautVignettes = yCurseur - SOUVENIR_VIGNETTE_TAILLE - 34;
    let x = SOUVENIR_MARGE;
    vignettesChargees.forEach((image, i) => {
      _dessinerVignette(ctx, image, x, yHautVignettes, SOUVENIR_VIGNETTE_TAILLE, 16);
      if (i === vignettesChargees.length - 1 && vignettesEnTrop > 0) {
        _dessinerBadgePlus(ctx, x, yHautVignettes, SOUVENIR_VIGNETTE_TAILLE, 16, vignettesEnTrop);
      }
      x += SOUVENIR_VIGNETTE_TAILLE + SOUVENIR_VIGNETTE_ECART;
    });
    yCurseur = yHautVignettes - 30;
  }

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
