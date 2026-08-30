// Script propre à app.html -- navigation Liste/Carte, vue Liste (#3 :
// cartes, filtres, formulaire d'ajout/édition), FAB, glue i18n. Voir
// storage.js pour la persistance, i18n.js pour le dictionnaire,
// theme.js pour la bascule de thème (partagés avec index.html/aide.html).

let currentLanguage = localStorage.getItem("fletchlog_lang") || "fr";
let entreesActuelles = [];
let idEnEdition = null;
let photosCache = {}; // photoId -> URL d'objet (voir précharcherPhotos)
// Photos du formulaire en cours (issue #4, plusieurs depuis #12) --
// chaque élément { photoId } (existante) ou { fichier, urlApercu } (tout
// juste choisie, pas encore compressée/stockée). L'ordre du tableau =
// ordre d'affichage/sauvegarde.
let photosFormulaire = [];
const MAX_PHOTOS = 6;
let gpsLat = null; // coordonnées capturées pour la nouvelle entrée en cours (issue #6)
let gpsLon = null;
let audiosCache = {}; // audioId -> URL d'objet (voir précharcherAudios)
// Note vocale du formulaire en cours (retour utilisateur, 2026-08-29) --
// null (aucune), { audioId } (existante, chargée depuis l'entrée en
// édition) ou { blob, urlApercu } (tout juste enregistrée, pas encore
// stockée) -- une seule à la fois, contrairement à photosFormulaire
// (tableau), voir storage.js pour pourquoi une seule note par entrée.
let audioFormulaire = null;
let enregistreurAudio = null; // MediaRecorder en cours, ou null hors enregistrement
let fragmentsAudio = [];
let minuteurAudio = null; // id de setInterval, pour l'affichage de la durée pendant l'enregistrement
let debutEnregistrementAudio = null;

const ICONE_PIN =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="var(--gold)" stroke="none"><path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/></svg>';
const ICONE_CHEVRON =
  '<svg class="carte-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>';
// Bouton "choisir depuis la galerie" (issue #23) -- stroke="currentColor"
// pour hériter la couleur du bouton (.photo-ajouter, même gris que le "+").
const ICONE_GALERIE =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 15l-5-5-9 9"/></svg>';
// Bouton "prendre une photo" (retour utilisateur, 2026-08-26 --
// remplace le simple "+" texte) -- même style que ICONE_GALERIE
// (stroke="currentColor", même gabarit), boîtier + bosse de viseur +
// objectif, silhouette d'appareil photo classique.
const ICONE_APPAREIL_PHOTO =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8a2 2 0 0 1 2-2h1.5l1-2h7l1 2H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"/><circle cx="12" cy="13" r="3.5"/></svg>';
// Bouton "enregistrer une note vocale" (retour utilisateur, 2026-08-29)
// -- même style que ICONE_GALERIE/ICONE_APPAREIL_PHOTO (stroke="currentColor",
// même gabarit 20px), silhouette de micro classique.
const ICONE_MICRO =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5v3.5M9 21h6"/></svg>';
// Bouton "arrêter l'enregistrement" -- carré plein, convention standard
// (comme un bouton stop de lecteur), remplace ICONE_MICRO le temps de
// l'enregistrement (voir rendreAudioFormulaire()).
const ICONE_STOP =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
const ICONE_PLACEHOLDER_PHOTO =
  '<svg width="26" height="26" viewBox="0 0 24 24"><ellipse cx="12" cy="15.94" rx="7.03" ry="2.91" fill="none" stroke="#0f1216" stroke-width="1.7"/><ellipse cx="12" cy="15.94" rx="7.03" ry="2.91" fill="none" stroke="var(--text-faint)" stroke-width="1.125"/><ellipse cx="12" cy="15.94" rx="4.125" ry="1.6875" fill="none" stroke="#0f1216" stroke-width="1.7"/><ellipse cx="12" cy="15.94" rx="4.125" ry="1.6875" fill="none" stroke="var(--text-faint)" stroke-width="1.125"/><g transform="translate(12,10.94) scale(0.268) translate(-44.843,-39.079)"><path stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="#0f1216" d="M 62.853 39.187 L 34.723 39.187 L 25.508 29.226 L 51.190 29.365 L 56.032 39.187 L 51.190 49.009 L 25.508 49.148 L 34.723 39.187 M 39.680 29.831 L 46.066 39.187 L 39.680 48.543" style="transform-box: fill-box; transform-origin: 50% 50%;" transform="matrix(0, 1, -1, 0, 0.662491, -0.108498)"/><path stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="var(--text-faint)" d="M 62.853 39.187 L 34.723 39.187 L 25.508 29.226 L 51.190 29.365 L 56.032 39.187 L 51.190 49.009 L 25.508 49.148 L 34.723 39.187 M 39.680 29.831 L 46.066 39.187 L 39.680 48.543" style="transform-box: fill-box; transform-origin: 50% 50%;" transform="matrix(0, 1, -1, 0, 0.662491, -0.108498)"/></g><circle cx="12" cy="15.94" r="0.5625" fill="var(--text-faint)"/></svg>';

const ICONES_METEO = {
  ensoleille:
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.3M12 19.2v2.3M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.3 12h2.3M19.4 12h2.3M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>',
  nuageux:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6.5 18a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 16.2 8.3 4.2 4.2 0 0 1 17 18H6.5Z"/></svg>',
  pluie:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6.5 15a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 16.2 5.3 4.2 4.2 0 0 1 17 15H6.5Z"/><path d="M8 18.5l-1 2M12 18.5l-1 2M16 18.5l-1 2"/></svg>',
  vent:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h9a2 2 0 1 1-2 2"/></svg>',
};

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(currentLanguage, el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(currentLanguage, el.getAttribute("data-i18n-placeholder"));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(currentLanguage, el.getAttribute("data-i18n-aria-label")));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.setAttribute("title", t(currentLanguage, el.getAttribute("data-i18n-title")));
  });
  document.getElementById("lang-fr-btn").classList.toggle("active", currentLanguage === "fr");
  document.getElementById("lang-en-btn").classList.toggle("active", currentLanguage === "en");
  document.documentElement.lang = currentLanguage;
}

function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem("fletchlog_lang", lang);
  applyTranslations();
  rafraichirFiltres();
  rafraichirAffichage();
}

// Hauteur réelle de l'en-tête (safe-area comprise) -- mesurée plutôt
// que devinée, pour positionner #filtres-barre/#view-carte en mode
// plein cadre (voir body.vue-carte-plein dans app.html). Appelée une
// fois au chargement et sur resize (rotation d'écran) : la hauteur de
// l'en-tête ne bouge pas autrement.
function mesurerHauteurEntete() {
  const bas = document.querySelector(".top-bar").getBoundingClientRect().bottom;
  document.documentElement.style.setProperty("--barre-haut", `${bas}px`);
}

function initNavigation() {
  mesurerHauteurEntete();
  window.addEventListener("resize", mesurerHauteurEntete);
  // [data-view] exclut le bouton d'export ajouté dans la même barre
  // (retour utilisateur, 2026-08-25) -- une action, pas une vue à
  // sélectionner, ne doit ni prendre l'état "active" ni faire
  // disparaître les deux vues (vue === undefined ne correspondrait à
  // aucune section .view).
  document.querySelectorAll(".nav-btn[data-view]").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      const vue = bouton.dataset.view;
      document.querySelectorAll(".nav-btn[data-view]").forEach((b) => b.classList.toggle("active", b === bouton));
      document.querySelectorAll(".view").forEach((section) => {
        section.classList.toggle("active", section.id === `view-${vue}`);
      });
      document.body.classList.toggle("vue-carte-plein", vue === "carte");
      if (vue === "carte" && carteAJourNecessaire) actualiserPinsCarte();
    });
  });
}

let toastTimeoutId = null;

function afficherToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add("visible"));
  if (toastTimeoutId) clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => {
      toast.hidden = true;
    }, 200);
  }, 2200);
}

// Rappel d'export périodique (issue #18) -- voir le commentaire CSS de
// .rappel-export dans app.html pour le pourquoi. Rien à perdre tant
// qu'aucune entrée n'existe, pas de rappel dans ce cas.
const RAPPEL_EXPORT_JOURS = 30;

function verifierRappelExport() {
  if (entreesActuelles.length === 0) return;
  if (sessionStorage.getItem("fletchlog_rappel_export_masque")) return;
  const dernier = localStorage.getItem("fletchlog_dernier_export");
  const joursDepuis = dernier ? (Date.now() - new Date(dernier).getTime()) / 86400000 : Infinity;
  if (joursDepuis < RAPPEL_EXPORT_JOURS) return;
  document.getElementById("rappel-export").hidden = false;
}

// Déclencheur supplémentaire sur changement de version (retour
// utilisateur, 2026-08-25) -- le rappel périodique ci-dessus laisse
// jusqu'à 30 jours entre deux relances ; celui-ci vise précisément le
// moment identifié comme risqué : juste après qu'une nouvelle version
// se soit installée (la mise à jour du service worker ne touche
// jamais IndexedDB, mais une éviction de stockage par le navigateur
// peut coïncider avec ce moment -- voir CLAUDE.md, issue #18).
// FLETCHLOG_VERSION vaut "dev" hors production (jamais patché par le
// workflow de déploiement) -- pas de faux déclenchement en local.
// Ignore volontairement le masquage de session du rappel périodique :
// signal distinct, plus important. Passe devant le rappel périodique
// s'il se déclenche aussi (retourne true dans ce cas).
function verifierChangementVersion() {
  if (typeof FLETCHLOG_VERSION === "undefined" || FLETCHLOG_VERSION === "dev") return false;
  const derniereVue = localStorage.getItem("fletchlog_derniere_version_vue");
  localStorage.setItem("fletchlog_derniere_version_vue", FLETCHLOG_VERSION);
  if (!derniereVue || derniereVue === FLETCHLOG_VERSION) return false;
  if (entreesActuelles.length === 0) return false;
  document.querySelector('#rappel-export [data-i18n="rappelExportTexte"]').textContent = t(
    currentLanguage,
    "rappelExportTexteVersion"
  );
  document.getElementById("rappel-export").hidden = false;
  return true;
}

// ---- Vue Liste : filtres + cartes ---------------------------------

function valeursDistinctes(champ) {
  const valeurs = new Set(entreesActuelles.map((e) => e[champ]).filter((v) => v && v.trim()));
  return [...valeurs].sort((a, b) => a.localeCompare(b));
}

function valeursDistinctesLabels() {
  const valeurs = new Set();
  entreesActuelles.forEach((e) => (e.labels || []).forEach((l) => valeurs.add(l)));
  return [...valeurs].sort((a, b) => a.localeCompare(b));
}

function remplirSelectFiltre(id, valeurs, cleOptionVide) {
  const select = document.getElementById(id);
  const valeurAvant = select.value;

  select.innerHTML =
    `<option value="">${t(currentLanguage, cleOptionVide)}</option>` +
    valeurs.map((v) => `<option value="${_echapperAttr(v)}">${_echapperTexte(v)}</option>`).join("");

  // Restaure la sélection si la valeur existe toujours après le
  // rechargement des options (ex. après un changement de langue --
  // les valeurs viennent des données, pas du dictionnaire, donc rien
  // à traduire ici, juste à ne pas perdre le filtre en cours).
  if ([...select.options].some((o) => o.value === valeurAvant)) select.value = valeurAvant;
  select.classList.toggle("active", select.value !== "");
}

function rafraichirFiltres() {
  remplirSelectFiltre("filtre-discipline", valeursDistinctes("discipline"), "filtreToutesDisciplines");
  remplirSelectFiltre("filtre-distance", valeursDistinctes("distance"), "filtreToutesDistances");
  remplirSelectFiltre("filtre-lieu", valeursDistinctes("lieu"), "filtreTousLieux");
  remplirSelectFiltre("filtre-label", valeursDistinctesLabels(), "filtreTousLabels");

  document.getElementById("labels-existants").innerHTML = valeursDistinctesLabels()
    .map((v) => `<option value="${_echapperAttr(v)}"></option>`)
    .join("");
}

function _echapperTexte(texte) {
  const div = document.createElement("div");
  div.textContent = texte;
  return div.innerHTML;
}

function _echapperAttr(texte) {
  return _echapperTexte(texte).replace(/"/g, "&quot;");
}

function formaterDate(dateISO) {
  const d = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateISO;
  const locale = currentLanguage === "en" ? "en-GB" : "fr-FR";
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

// "Août 2026" -- pour les en-têtes de groupe de la vue Liste triée par
// date (voir cleGroupeListe()), même logique de locale que formaterDate().
function formaterMoisAnnee(dateISO) {
  const d = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateISO;
  const locale = currentLanguage === "en" ? "en-GB" : "fr-FR";
  return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

// Vignette partagée entre la vue Liste (carteHTML) et l'aperçu de la
// vue Carte (afficherApercuCarte) -- première photo + badge "+N" si
// plusieurs (issue #12), même logique aux deux endroits.
function vignettePhotoHTML(entree) {
  const idsPhotos = entree.photoIds || [];
  const urlPhoto = idsPhotos.length ? photosCache[idsPhotos[0]] : null;
  const contenu = urlPhoto ? `<img src="${urlPhoto}" alt="">` : ICONE_PLACEHOLDER_PHOTO;
  const badge = idsPhotos.length > 1 ? `<span class="vignette-badge">+${idsPhotos.length - 1}</span>` : "";
  return `<div class="carte-vignette">${contenu}${badge}</div>`;
}

function carteHTML(entree) {
  const meteoIcone = ICONES_METEO[entree.meteo];
  const meteoLigne =
    entree.meteo !== "aucune" && meteoIcone
      ? `<div class="carte-meteo">${meteoIcone}<span>${_echapperTexte(t(currentLanguage, "meteo" + entree.meteo.charAt(0).toUpperCase() + entree.meteo.slice(1)))}</span></div>`
      : "";
  const sousLigne = [entree.distance, formaterDate(entree.date)].filter((v) => v && v.trim()).join(" · ");

  // Entrées créées avant #11 : pas de titre -- repli sur le lieu comme
  // intitulé, sans doublonner la ligne lieu juste en dessous.
  const aTitreReel = entree.titre && entree.titre.trim();
  const titreAffiche = aTitreReel ? entree.titre : entree.lieu;
  const ligneLieu = aTitreReel
    ? `<div class="carte-lieu">${ICONE_PIN}<span>${_echapperTexte(entree.lieu)}</span></div>`
    : "";
  const labelsLigne = (entree.labels || []).length
    ? `<div class="carte-labels">${entree.labels.map((l) => `<span class="badge-label">${_echapperTexte(l)}</span>`).join("")}</div>`
    : "";
  const commentaireLigne =
    entree.commentaire && entree.commentaire.trim()
      ? `<div class="carte-commentaire">${_echapperTexte(entree.commentaire)}</div>`
      : "";

  return `
    <button type="button" class="carte-entree" data-id="${_echapperAttr(entree.id)}">
      ${vignettePhotoHTML(entree)}
      <div class="carte-texte">
        <div class="carte-titre"><span>${_echapperTexte(titreAffiche)}</span></div>
        ${ligneLieu}
        <div class="carte-meta">
          ${entree.discipline ? `<span class="badge-discipline">${_echapperTexte(entree.discipline)}</span>` : ""}
          <span class="carte-sous">${_echapperTexte(sousLigne)}</span>
        </div>
        ${labelsLigne}
        ${commentaireLigne}
        ${meteoLigne}
      </div>
      ${ICONE_CHEVRON}
    </button>
  `;
}

function entreesFiltrees() {
  const discipline = document.getElementById("filtre-discipline").value;
  const distance = document.getElementById("filtre-distance").value;
  const lieu = document.getElementById("filtre-lieu").value;
  const label = document.getElementById("filtre-label").value;
  const recherche = document.getElementById("recherche-commentaire").value.trim().toLowerCase();
  // AAAA-MM-JJ se compare lexicographiquement comme des dates -- pas
  // besoin de parser en Date pour un simple "dans la plage".
  const dateDebut = document.getElementById("filtre-date-debut").value;
  const dateFin = document.getElementById("filtre-date-fin").value;
  return entreesActuelles.filter(
    (e) =>
      (!discipline || e.discipline === discipline) &&
      (!distance || e.distance === distance) &&
      (!lieu || e.lieu === lieu) &&
      (!label || (e.labels || []).includes(label)) &&
      (!recherche || (e.commentaire || "").toLowerCase().includes(recherche)) &&
      (!dateDebut || e.date >= dateDebut) &&
      (!dateFin || e.date <= dateFin)
  );
}

// Tri de la vue Liste (issue #17) -- copie triée, n'affecte jamais
// entreesActuelles ni la vue Carte (l'ordre n'y a pas de sens).
const COMPARATEURS_TRI = {
  "date-desc": (a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.creeLe < b.creeLe ? 1 : -1),
  "date-asc": (a, b) => (a.date !== b.date ? (a.date > b.date ? 1 : -1) : a.creeLe > b.creeLe ? 1 : -1),
  "titre-asc": (a, b) => (a.titre || a.lieu).localeCompare(b.titre || b.lieu),
  "lieu-asc": (a, b) => a.lieu.localeCompare(b.lieu),
  "discipline-asc": (a, b) => (a.discipline || "").localeCompare(b.discipline || ""),
};

function trierEntrees(entrees) {
  const critere = document.getElementById("tri-liste").value;
  return entrees.slice().sort(COMPARATEURS_TRI[critere] || COMPARATEURS_TRI["date-desc"]);
}

// Regroupement de la vue Liste (retour utilisateur) -- calé sur le
// critère de tri déjà choisi plutôt qu'un contrôle "grouper par"
// séparé : la clé de groupe n'a de sens que si la liste est déjà
// triée dessus (des groupes non contigus se répéteraient sinon).
// Pas de groupement pour titre-asc -- les titres sont surtout
// uniques, un en-tête par entrée n'aiderait pas à balayer la liste.
function cleGroupeListe(entree, critere) {
  if (critere === "date-desc" || critere === "date-asc") {
    const cle = entree.date ? entree.date.slice(0, 7) : "";
    return { cle, libelle: entree.date ? formaterMoisAnnee(entree.date) : t(currentLanguage, "listeSansDate") };
  }
  if (critere === "lieu-asc") {
    return { cle: entree.lieu, libelle: entree.lieu };
  }
  if (critere === "discipline-asc") {
    const cle = entree.discipline || "";
    return { cle, libelle: entree.discipline || t(currentLanguage, "listeSansDiscipline") };
  }
  return null;
}

function rafraichirListe() {
  const conteneur = document.getElementById("liste-cartes");
  const vide = document.getElementById("liste-vide");
  const critere = document.getElementById("tri-liste").value;
  const filtrees = trierEntrees(entreesFiltrees());

  let html = "";
  let cleGroupePrecedente = undefined;
  filtrees.forEach((entree) => {
    const groupe = cleGroupeListe(entree, critere);
    if (groupe && groupe.cle !== cleGroupePrecedente) {
      html += `<div class="liste-groupe-entete">${_echapperTexte(groupe.libelle)}</div>`;
      cleGroupePrecedente = groupe.cle;
    }
    html += carteHTML(entree);
  });
  conteneur.innerHTML = html;
  vide.hidden = entreesActuelles.length > 0;
  conteneur.hidden = entreesActuelles.length === 0;

  conteneur.querySelectorAll(".carte-entree").forEach((bouton) => {
    bouton.addEventListener("click", () => afficherDetail(bouton.dataset.id));
  });
}

// ---- Vue Carte (issue #7) -- pins projetés depuis les coordonnées
// GPS réelles (#6), pas de positions inventées. Représentation
// stylisée (pas de vraies tuiles géographiques, voir #13 si besoin un
// jour) : projection linéaire simple sur le rectangle disponible,
// suffisante pour un carnet perso couvrant une zone restreinte -- pas
// une vraie projection cartographique.

// Plume (issue #22 -- remplace le pin, même tracé que fletchapps/icon.svg),
// fût jusqu'à l'ancre [14,28] (voir iconAnchor de L.divIcon plus bas).
const ICONE_PIN_CARTE =
  '<svg viewBox="0 0 100 100"><g transform="translate(50,51.45) scale(2.6) translate(-44.843,-39.079)"><path stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="#0f1216" d="M 62.853 39.187 L 34.723 39.187 L 25.508 29.226 L 51.190 29.365 L 56.032 39.187 L 51.190 49.009 L 25.508 49.148 L 34.723 39.187 M 39.680 29.831 L 46.066 39.187 L 39.680 48.543" style="transform-box: fill-box; transform-origin: 50% 50%;" transform="matrix(0, 1, -1, 0, 0.662491, -0.108498)"/><path stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="var(--gold)" d="M 62.853 39.187 L 34.723 39.187 L 25.508 29.226 L 51.190 29.365 L 56.032 39.187 L 51.190 49.009 L 25.508 49.148 L 34.723 39.187 M 39.680 29.831 L 46.066 39.187 L 39.680 48.543" style="transform-box: fill-box; transform-origin: 50% 50%;" transform="matrix(0, 1, -1, 0, 0.662491, -0.108498)"/></g></svg>';

let carteMap = null;
let carteCouchePins = null;
let carteAJourNecessaire = true; // pins à recalculer avant prochain affichage de la vue Carte
let pinCarteActif = null;

// Carte OSM (issue #13) -- URL/attribution exactes exigées par la
// politique d'usage officielle (operations.osmfoundation.org/policies/tiles/,
// vérifiée le 2026-08-19) : https://tile.openstreetmap.org/{z}/{x}/{y}.png
// SANS sous-domaines a/b/c (dépréciés, l'ancienne convention {s}. ne
// doit plus être utilisée). Voir CLAUDE.md pour la décision sur le
// cache hors-ligne (opportuniste, plafonné -- géré côté sw.js).
// Factorisé (issue #15) -- réutilisé par la carte principale et par le
// sélecteur de position du formulaire (voir ouvrirPickerPosition()).
function ajouterCoucheTuilesOSM(map) {
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    crossOrigin: true, // requêtes non "opaques" -- indispensable pour que sw.js puisse
    // lire response.ok et mettre les tuiles en cache (voir gererTuileCarte() dans sw.js).
    // tile.openstreetmap.org envoie Access-Control-Allow-Origin: * (vérifié le 2026-08-20).
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  }).addTo(map);
  map.attributionControl.addAttribution(
    '<a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener">Signaler un problème</a>'
  );
}

// Rayon de regroupement des pins (retour utilisateur, 2026-08-26) --
// maxClusterRadius de Leaflet.markercluster est TOUJOURS en pixels
// écran, pas en distance réelle (voir plus haut, "Regroupement Liste +
// clustering Carte") : à un même rayon en pixels, le nombre de mètres
// réels dépend du zoom ET de la latitude (projection Web Mercator,
// formule standard vérifiée -- 156543.03392 * cos(latitude) / 2^zoom,
// https://gist.github.com/perrygeo/4478844). Au zoom maximum de la
// carte (19, voir ajouterCoucheTuilesOSM()), le rayon par défaut
// (80px) correspond à ~16m à la latitude de la France -- largement
// plus que les 2m demandés. Calculé pour correspondre à ~1.9m (légère
// marge sous les 2m) autour du centre courant de la carte à ce zoom
// précis -- deux pins à 2m ou plus restent donc distincts. Aux zooms
// inférieurs, comportement par défaut inchangé (80px) : la même
// formule y donnerait un rayon proche de 0px (2m ne représentent
// qu'une fraction de pixel dès qu'on dézoome), ce qui désactiverait le
// regroupement partout -- pas l'effet recherché, seul le zoom max
// doit se comporter différemment.
function _rayonRegroupementPins(zoom) {
  const RAYON_DEFAUT = 80;
  if (!carteMap || zoom < carteMap.getMaxZoom()) return RAYON_DEFAUT;
  const latitude = carteMap.getCenter().lat;
  const metresParPixel = (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom);
  return 1.9 / metresParPixel;
}

function initCarte() {
  if (carteMap) return;
  // zoomControl: false puis rajouté en bas à gauche -- la vue Carte
  // plein cadre (2026-08-21) fait flotter la barre de filtres en haut,
  // qui recouvrirait sinon les contrôles de zoom par défaut (en haut à
  // gauche). Bas à gauche reste libre (FAB et "me localiser" sont à
  // droite/en bas).
  carteMap = L.map("carte-leaflet", { attributionControl: true, zoomControl: false }).setView([46.6, 2.4], 5);
  L.control.zoom({ position: "bottomleft" }).addTo(carteMap);
  ajouterCoucheTuilesOSM(carteMap);
  // markerClusterGroup (retour utilisateur -- Leaflet.markercluster
  // vendoré, voir app.html) plutôt qu'un simple layerGroup : plusieurs
  // sorties au même club/lieu se chevauchaient sur la carte, regroupées
  // maintenant sous un même marqueur avec un compteur, éclaté au zoom
  // ou au tap. maxClusterRadius : fonction du zoom (retour utilisateur,
  // 2026-08-26 -- voir _rayonRegroupementPins()) plutôt que le défaut
  // fixe (80px) partout.
  carteCouchePins = L.markerClusterGroup({ maxClusterRadius: _rayonRegroupementPins }).addTo(carteMap);
  new ControleLocaliser().addTo(carteMap);
}

// Bouton "me localiser" -- contrôle Leaflet custom (calqué visuellement
// sur .leaflet-bar, voir app.html) plutôt qu'un bouton HTML flottant à
// part, pour bénéficier gratuitement du positionnement/de l'anti-chevauchement
// que Leaflet gère déjà pour ses propres contrôles (zoom, attribution).
// bottomleft, groupé avec le zoom -- topright serait recouvert par la
// barre de filtres flottante, et bottomright entre en collision avec
// le FAB (même coin, même niveau vertical, tous deux fixes) en vue
// Carte plein cadre.
const ControleLocaliser = L.Control.extend({
  options: { position: "bottomleft" },
  onAdd: function () {
    const bouton = L.DomUtil.create("button", "carte-bouton-localiser");
    bouton.type = "button";
    bouton.title = t(currentLanguage, "carteLocaliserTitre");
    bouton.setAttribute("aria-label", t(currentLanguage, "carteLocaliserTitre"));
    bouton.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
    L.DomEvent.disableClickPropagation(bouton);
    bouton.addEventListener("click", localiserPositionActuelle);
    return bouton;
  },
});

let marqueurPositionActuelle = null;

function localiserPositionActuelle() {
  if (!("geolocation" in navigator)) {
    afficherToast(t(currentLanguage, "gpsIndisponible"));
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const point = [position.coords.latitude, position.coords.longitude];
      if (marqueurPositionActuelle) {
        marqueurPositionActuelle.setLatLng(point);
      } else {
        marqueurPositionActuelle = L.marker(point, {
          icon: L.divIcon({ className: "position-actuelle-pastille", iconSize: [14, 14] }),
          interactive: false,
          zIndexOffset: 1000,
        }).addTo(carteMap);
      }
      carteMap.setView(point, Math.max(carteMap.getZoom(), 14));
    },
    () => afficherToast(t(currentLanguage, "gpsIndisponible")),
    { timeout: 8000 }
  );
}

function fermerApercuCarte() {
  const apercu = document.getElementById("carte-apercu");
  apercu.hidden = true;
  apercu.onclick = null;
  if (pinCarteActif) pinCarteActif.getElement()?.classList.remove("pin-carte-actif");
  pinCarteActif = null;
}

function afficherApercuCarte(entree, marker) {
  if (pinCarteActif) pinCarteActif.getElement()?.classList.remove("pin-carte-actif");
  pinCarteActif = marker;
  marker.getElement()?.classList.add("pin-carte-actif");

  const titreAffiche = entree.titre && entree.titre.trim() ? entree.titre : entree.lieu;
  const sousLigne = [entree.distance, formaterDate(entree.date)].filter((v) => v && v.trim()).join(" · ");

  const apercu = document.getElementById("carte-apercu");
  apercu.innerHTML = `
    ${vignettePhotoHTML(entree)}
    <div class="carte-texte">
      <div class="carte-titre"><span>${_echapperTexte(titreAffiche)}</span></div>
      <span class="carte-sous">${_echapperTexte(sousLigne)}</span>
    </div>
    ${ICONE_CHEVRON}
  `;
  apercu.hidden = false;
  apercu.onclick = () => afficherDetail(entree.id);
}

// Rendu Leaflet effectif -- séparé de rafraichirCarte() pour ne
// s'exécuter que lorsque la vue Carte est réellement affichée (voir
// initNavigation()), jamais sur un conteneur caché de taille nulle.
function actualiserPinsCarte() {
  const vide = document.getElementById("carte-vide");
  const entreesAvecGPS = entreesFiltrees().filter((e) => e.lat != null && e.lon != null);
  vide.hidden = entreesAvecGPS.length > 0;
  fermerApercuCarte();
  carteAJourNecessaire = false;

  initCarte();
  carteMap.invalidateSize();
  carteCouchePins.clearLayers();

  if (!entreesAvecGPS.length) return;

  const points = [];
  entreesAvecGPS.forEach((entree) => {
    const marker = L.marker([entree.lat, entree.lon], {
      icon: L.divIcon({ className: "pin-carte", html: ICONE_PIN_CARTE, iconSize: [28, 28], iconAnchor: [14, 28] }),
    });
    marker.on("click", () => afficherApercuCarte(entree, marker));
    marker.addTo(carteCouchePins);
    points.push([entree.lat, entree.lon]);
  });

  if (points.length === 1) {
    carteMap.setView(points[0], 14);
  } else {
    carteMap.fitBounds(points, { padding: [30, 30], maxZoom: 15 });
  }
}

function rafraichirCarte() {
  carteAJourNecessaire = true;
  if (document.getElementById("view-carte").classList.contains("active")) {
    actualiserPinsCarte();
  } else {
    document.getElementById("carte-vide").hidden =
      entreesFiltrees().filter((e) => e.lat != null && e.lon != null).length > 0;
  }
}

function rafraichirAffichage() {
  rafraichirListe();
  rafraichirCarte();
}

function revoquerPhotosCache() {
  Object.values(photosCache).forEach((url) => URL.revokeObjectURL(url));
  photosCache = {};
}

function precharcherPhotos(entrees) {
  revoquerPhotosCache();
  const idsPhotos = [...new Set(entrees.flatMap((e) => e.photoIds || []))];
  return Promise.all(
    idsPhotos.map((id) =>
      obtenirPhoto(id).then((blob) => {
        if (blob) photosCache[id] = URL.createObjectURL(blob);
      })
    )
  );
}

// Même patron que revoquerPhotosCache()/precharcherPhotos() ci-dessus,
// pour le store "audios" (retour utilisateur, 2026-08-29) -- une seule
// note par entrée, mais toujours un ensemble d'ids à dédupliquer (même
// note jamais partagée entre deux entrées en pratique, mais rien ne
// l'empêche techniquement).
function revoquerAudiosCache() {
  Object.values(audiosCache).forEach((url) => URL.revokeObjectURL(url));
  audiosCache = {};
}

function precharcherAudios(entrees) {
  revoquerAudiosCache();
  const idsAudios = [...new Set(entrees.map((e) => e.audioId).filter(Boolean))];
  return Promise.all(
    idsAudios.map((id) =>
      obtenirAudio(id).then((blob) => {
        if (blob) audiosCache[id] = URL.createObjectURL(blob);
      })
    )
  );
}

function chargerEntrees() {
  return listerEntrees()
    .then((entrees) => {
      entreesActuelles = entrees;
      return Promise.all([precharcherPhotos(entrees), precharcherAudios(entrees)]);
    })
    .then(() => {
      rafraichirFiltres();
      rafraichirAffichage();
    });
}

// ---- Photo (issue #4, plusieurs photos depuis #12) ------------------

// Chrome ne sait décoder les images HEIC/HEIF dans AUCUN contexte
// (<img>, <canvas>...), sur aucune plateforme y compris Android, même
// quand l'OS lui-même sait le faire -- vérifié par recherche, pas
// supposé (voir CLAUDE.md, "Bug réel : message 'Le lieu est
// obligatoire' trompeur", 2026-08-26). Un fichier HEIC (photo par
// défaut de certains Android "haute efficacité", ou synchronisée
// depuis un iPhone) faisait donc systématiquement échouer
// compresserPhoto() avant l'ajout de heic2any.min.js (vendoré, voir le
// principe de dépendances du CLAUDE.md global -- MIT, aucune
// dépendance runtime, un seul fichier autonome).
function _estPhotoHeic(fichier) {
  const type = (fichier.type || "").toLowerCase();
  const nom = (fichier.name || "").toLowerCase();
  return type === "image/heic" || type === "image/heif" || nom.endsWith(".heic") || nom.endsWith(".heif");
}

function compresserPhoto(fichier) {
  const LONGUEUR_MAX = 1600;
  // Conversion HEIC -> JPEG en amont si besoin, puis même pipeline de
  // redimensionnement/compression que toute autre photo -- jamais de
  // heic2any() si le fichier n'est pas HEIC, ni si le script n'a pas
  // pu se charger pour une raison ou une autre (repli silencieux sur
  // le comportement d'avant, qui échouera proprement via
  // image.onerror plus bas avec le même message qu'auparavant).
  const pretAConvertir =
    _estPhotoHeic(fichier) && typeof heic2any === "function"
      ? heic2any({ blob: fichier, toType: "image/jpeg", quality: 0.9 })
          .then((resultat) => (Array.isArray(resultat) ? resultat[0] : resultat))
          .catch(() => {
            throw new Error("Image invalide.");
          })
      : Promise.resolve(fichier);

  return pretAConvertir.then(
    (blobSource) =>
      new Promise((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(blobSource);
        image.onload = () => {
          let { width, height } = image;
          if (width > height && width > LONGUEUR_MAX) {
            height = Math.round((height * LONGUEUR_MAX) / width);
            width = LONGUEUR_MAX;
          } else if (height >= width && height > LONGUEUR_MAX) {
            width = Math.round((width * LONGUEUR_MAX) / height);
            height = LONGUEUR_MAX;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(image, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url);
              if (blob) resolve(blob);
              else reject(new Error("Compression de la photo impossible."));
            },
            "image/jpeg",
            0.7
          );
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Image invalide."));
        };
        image.src = url;
      })
  );
}

// Révoque les URL d'objet des photos "nouvelles" (pas encore
// enregistrées) -- à appeler à la fermeture du formulaire, sauvegardé
// ou non, pour ne jamais laisser fuiter un blob URL.
function revoquerApercusFormulaire() {
  photosFormulaire.forEach((p) => {
    if (p.urlApercu) URL.revokeObjectURL(p.urlApercu);
  });
}

function rendrePhotosGalerie() {
  const galerie = document.getElementById("photo-galerie");
  const vignettes = photosFormulaire
    .map((p, index) => {
      const url = p.urlApercu || photosCache[p.photoId];
      const contenu = url ? `<img src="${url}" alt="">` : ICONE_PLACEHOLDER_PHOTO;
      // Badge vignette (retour utilisateur, 2026-08-26) -- pas de sens
      // à en afficher un avec une seule photo (déjà forcément la
      // vignette). photoIds[0] sert de vignette partout ailleurs dans
      // l'appli (Liste, Carte, carte souvenir) -- ce badge est le seul
      // moyen de la changer sans retirer/réajouter les photos.
      const badgeCouverture =
        photosFormulaire.length > 1
          ? `<button type="button" class="photo-vignette-couverture${index === 0 ? " active" : ""}" data-index="${index}" data-i18n-aria-label="formPhotoCouverture" aria-label="${t(currentLanguage, "formPhotoCouverture")}">★</button>`
          : "";
      return `
        <div class="photo-vignette-form" data-index="${index}">
          ${contenu}
          <button type="button" class="photo-vignette-retirer" data-index="${index}" data-i18n-aria-label="formPhotoRetirer" aria-label="${t(currentLanguage, "formPhotoRetirer")}">✕</button>
          ${badgeCouverture}
        </div>
      `;
    })
    .join("");
  // Deux boutons distincts (issue #23) -- voir le commentaire sur les
  // deux <input type="file"> dans app.html pour le pourquoi.
  const boutonsAjouter =
    photosFormulaire.length < MAX_PHOTOS
      ? `<button type="button" class="photo-ajouter" id="photo-ajouter" data-i18n-aria-label="formPhotoAppareil" aria-label="${t(currentLanguage, "formPhotoAppareil")}">${ICONE_APPAREIL_PHOTO}</button>
         <button type="button" class="photo-ajouter" id="photo-ajouter-galerie" data-i18n-aria-label="formPhotoGalerie" aria-label="${t(currentLanguage, "formPhotoGalerie")}">${ICONE_GALERIE}</button>`
      : "";
  galerie.innerHTML = vignettes + boutonsAjouter;
}

function ajouterPhotoFormulaire(fichier) {
  if (photosFormulaire.length >= MAX_PHOTOS) {
    afficherToast(tf(currentLanguage, "formPhotoMaxAtteint", { max: MAX_PHOTOS }));
    return;
  }
  photosFormulaire.push({ fichier, urlApercu: URL.createObjectURL(fichier) });
  rendrePhotosGalerie();
}

function retirerPhotoFormulaire(index) {
  const [retiree] = photosFormulaire.splice(index, 1);
  if (retiree && retiree.urlApercu) URL.revokeObjectURL(retiree.urlApercu);
  rendrePhotosGalerie();
}

// Fait passer la photo à l'index donné en tête de tableau -- devient
// photoIds[0] à l'enregistrement (resoudrePhotosPourEnvoi() préserve
// l'ordre de photosFormulaire), donc la vignette utilisée partout
// ailleurs dans l'appli (retour utilisateur, 2026-08-26).
function definirPhotoCouverture(index) {
  if (index === 0) return;
  const [photo] = photosFormulaire.splice(index, 1);
  photosFormulaire.unshift(photo);
  rendrePhotosGalerie();
}

// ---- Lightbox photo (issue #24) -- vue plein écran depuis la galerie
// du formulaire, seul endroit où taper une vignette ne faisait rien.
// Carrousel à 3 volets (prev/courant/suivant, retour utilisateur --
// un simple fondu ne rendait pas "fluide" : les photos doivent glisser
// collées à l'écran pendant le geste, pas juste s'estomper une fois le
// doigt relevé). Voir .lightbox-track dans app.html.
let lightboxUrls = [];
let lightboxIndex = 0;

function ouvrirLightbox(urls, indexDepart) {
  lightboxUrls = urls;
  lightboxIndex = indexDepart;
  const track = document.getElementById("lightbox-track");
  track.classList.remove("lightbox-track-anim");
  track.style.transform = "translateX(-33.3333%)";
  reinitialiserZoomLightbox();
  majPhotosLightbox();
  document.getElementById("lightbox-overlay").hidden = false;
}

function fermerLightbox() {
  document.getElementById("lightbox-overlay").hidden = true;
}

function majPhotosLightbox() {
  const n = lightboxUrls.length;
  document.getElementById("lightbox-img-prev").src = lightboxUrls[(lightboxIndex - 1 + n) % n];
  document.getElementById("lightbox-img-courant").src = lightboxUrls[lightboxIndex];
  document.getElementById("lightbox-img-suivant").src = lightboxUrls[(lightboxIndex + 1) % n];
  const plusieurs = n > 1;
  document.getElementById("lightbox-compteur").textContent = plusieurs ? `${lightboxIndex + 1} / ${n}` : "";
  document.getElementById("lightbox-prev").hidden = !plusieurs;
  document.getElementById("lightbox-next").hidden = !plusieurs;
}

// direction: -1 (précédente) ou 1 (suivante) -- anime la piste jusqu'à
// révéler entièrement le volet voisin, puis bascule l'index et
// remet la piste au centre sans transition (les volets prev/suivant
// ont entre-temps été rechargés sur les nouveaux voisins -- voir
// terminerDeplacementLightbox() -- donc rien ne "saute" visuellement).
function deplacerLightbox(direction) {
  if (lightboxUrls.length <= 1) return;
  const track = document.getElementById("lightbox-track");
  track.classList.add("lightbox-track-anim");
  track.style.transform = `translateX(${direction === 1 ? "-66.6667%" : "0%"})`;
  track.addEventListener("transitionend", () => terminerDeplacementLightbox(direction), { once: true });
}

function terminerDeplacementLightbox(direction) {
  lightboxIndex = (lightboxIndex + direction + lightboxUrls.length) % lightboxUrls.length;
  majPhotosLightbox();
  const track = document.getElementById("lightbox-track");
  track.classList.remove("lightbox-track-anim"); // reset instantané, pas de transition ici
  track.style.transform = "translateX(-33.3333%)";
  reinitialiserZoomLightbox();
}

// Glissement relâché sous le seuil -- revient au centre (petit effet
// rebond), aucun changement de photo.
function annulerGlissementLightbox() {
  const track = document.getElementById("lightbox-track");
  track.classList.add("lightbox-track-anim");
  track.style.transform = "translateX(-33.3333%)";
  track.addEventListener("transitionend", () => track.classList.remove("lightbox-track-anim"), { once: true });
}

function lightboxPrecedente() {
  deplacerLightbox(-1);
}

function lightboxSuivante() {
  deplacerLightbox(1);
}

// Pinch-to-zoom + pan (issue #24, retour utilisateur) -- un doigt
// déplace l'image quand elle est zoomée, deux doigts zooment. Le
// glissement de piste (déjà en place) ne s'active qu'à zoom 1 (voir
// initFormulaire()) -- sinon un geste d'un doigt pour se déplacer
// dans une photo zoomée changerait de photo par erreur. S'applique
// seulement au volet "courant" -- les volets voisins ne sont jamais
// zoomés (ils redeviennent "courant" à zoom 1 en glissant dessus).
const LIGHTBOX_ZOOM_MAX = 4;
let lightboxZoom = 1;
let lightboxPanX = 0;
let lightboxPanY = 0;

function reinitialiserZoomLightbox() {
  lightboxZoom = 1;
  lightboxPanX = 0;
  lightboxPanY = 0;
  document.getElementById("lightbox-img-courant").style.transform = "";
}

// Borne le pan pour ne jamais laisser un bord de la photo (zoomée)
// rentrer depuis l'intérieur de l'écran -- au pire, ses bords touchent
// ceux de l'écran, jamais plus. img.offsetWidth/offsetHeight (taille
// de mise en page, "contain" à zoom 1) ne bougent pas avec transform :
// scale(), donc x lightboxZoom donne la taille réellement affichée.
function appliquerZoomLightbox() {
  const img = document.getElementById("lightbox-img-courant");
  const overlay = document.getElementById("lightbox-overlay");
  const largeurAffichee = img.offsetWidth * lightboxZoom;
  const hauteurAffichee = img.offsetHeight * lightboxZoom;
  const maxPanX = Math.max(0, (largeurAffichee - overlay.clientWidth) / 2);
  const maxPanY = Math.max(0, (hauteurAffichee - overlay.clientHeight) / 2);
  lightboxPanX = Math.min(maxPanX, Math.max(-maxPanX, lightboxPanX));
  lightboxPanY = Math.min(maxPanY, Math.max(-maxPanY, lightboxPanY));
  img.style.transform = `translate(${lightboxPanX}px, ${lightboxPanY}px) scale(${lightboxZoom})`;
}

function distanceTactile(touches) {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

// Compresse/enregistre les photos nouvellement ajoutées, supprime
// celles retirées par l'utilisateur (présentes sur l'entrée existante
// mais plus dans photosFormulaire), garde les autres telles quelles --
// résout le tableau photoIds final, dans l'ordre d'affichage.
function resoudrePhotosPourEnvoi(entreeExistante) {
  const ancienIds = entreeExistante ? entreeExistante.photoIds || [] : [];
  const idsConserves = photosFormulaire.filter((p) => p.photoId).map((p) => p.photoId);
  const idsSupprimes = ancienIds.filter((id) => !idsConserves.includes(id));
  const suppressions = Promise.all(idsSupprimes.map((id) => supprimerPhoto(id).catch(() => {})));

  const resolutions = Promise.all(
    photosFormulaire.map((p, index) =>
      p.photoId
        ? Promise.resolve({ index, photoId: p.photoId })
        : compresserPhoto(p.fichier)
            .then((blob) => enregistrerPhoto(blob))
            .then((photoId) => ({ index, photoId }))
    )
  );

  return Promise.all([suppressions, resolutions]).then(([, resultats]) =>
    resultats.sort((a, b) => a.index - b.index).map((r) => r.photoId)
  );
}

// ---- Note vocale (retour utilisateur, 2026-08-29) --------------------
// MediaRecorder natif (pas de dépendance ajoutée, voir le principe du
// CLAUDE.md global) -- enregistrement direct dans le formulaire plutôt
// qu'un simple <input type=file accept=audio/*> délégué à l'appli
// vocale du téléphone (choisi avec l'utilisateur : reste dans le flux
// de saisie, comme les photos). Une seule note par entrée (pas de
// galerie comme les photos) -- voir le schéma dans storage.js.

function formaterDureeAudio(secondes) {
  const m = Math.floor(secondes / 60);
  const s = Math.floor(secondes % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Reflète l'état courant (audioFormulaire/enregistreurAudio) dans le
// DOM -- rappelée après chaque changement d'état plutôt que dispersée
// dans chaque fonction qui modifie cet état (même principe que
// rendrePhotosGalerie()).
function rendreAudioFormulaire() {
  const bouton = document.getElementById("audio-enregistrer");
  const duree = document.getElementById("audio-duree");
  const lecteur = document.getElementById("audio-lecteur");
  const supprimer = document.getElementById("audio-supprimer");
  if (!bouton) return; // widget masqué (MediaRecorder non supporté, voir initFormulaire())

  const enCours = !!enregistreurAudio;
  bouton.innerHTML = enCours ? ICONE_STOP : ICONE_MICRO;
  bouton.classList.toggle("audio-enregistrement", enCours);
  const cleAria = enCours ? "formAudioArreter" : "formAudioEnregistrer";
  bouton.setAttribute("data-i18n-aria-label", cleAria);
  bouton.setAttribute("aria-label", t(currentLanguage, cleAria));

  duree.hidden = !enCours;

  const url = audioFormulaire ? audioFormulaire.urlApercu || audiosCache[audioFormulaire.audioId] : null;
  lecteur.hidden = enCours || !url;
  if (url) lecteur.src = url;
  supprimer.hidden = enCours || !audioFormulaire;
}

// Garde anti-double-clic pendant l'attente de la permission micro
// (getUserMedia est asynchrone -- sans ce garde, deux clics rapprochés
// pendant que le navigateur affiche sa boîte de dialogue de permission
// pourraient démarrer deux enregistrements concurrents).
let demarrageAudioEnCours = false;

async function demarrerEnregistrementAudio() {
  if (enregistreurAudio || demarrageAudioEnCours) return;
  demarrageAudioEnCours = true;
  let flux;
  try {
    flux = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (erreur) {
    demarrageAudioEnCours = false;
    afficherToast(t(currentLanguage, "formAudioPermissionRefusee"));
    return;
  }
  demarrageAudioEnCours = false;

  const typeMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";
  enregistreurAudio = typeMime ? new MediaRecorder(flux, { mimeType: typeMime }) : new MediaRecorder(flux);
  fragmentsAudio = [];
  enregistreurAudio.addEventListener("dataavailable", (evenement) => {
    if (evenement.data.size > 0) fragmentsAudio.push(evenement.data);
  });
  enregistreurAudio.addEventListener("stop", () => {
    flux.getTracks().forEach((piste) => piste.stop()); // libère le micro
    const blob = new Blob(fragmentsAudio, { type: enregistreurAudio.mimeType || "audio/webm" });
    fragmentsAudio = [];
    enregistreurAudio = null;
    clearInterval(minuteurAudio);
    minuteurAudio = null;
    revoquerApercuAudioFormulaire();
    audioFormulaire = { blob, urlApercu: URL.createObjectURL(blob) };
    rendreAudioFormulaire();
  });
  enregistreurAudio.start();
  debutEnregistrementAudio = Date.now();
  document.getElementById("audio-duree").textContent = "0:00";
  minuteurAudio = setInterval(() => {
    document.getElementById("audio-duree").textContent = formaterDureeAudio((Date.now() - debutEnregistrementAudio) / 1000);
  }, 500);
  rendreAudioFormulaire();
}

function arreterEnregistrementAudio() {
  if (enregistreurAudio && enregistreurAudio.state === "recording") enregistreurAudio.stop();
}

// Utilisée juste avant l'enregistrement de l'entrée (soumettreFormulaire())
// -- sans ça, valider le formulaire pendant un enregistrement encore en
// cours sauvegarderait l'ancienne note (ou aucune), la nouvelle restant
// coincée dans le gestionnaire "stop" (asynchrone, voir
// demarrerEnregistrementAudio()) qui se termine après coup, trop tard
// pour ce fermerFormulaire()-ci. N'attend que si un enregistrement est
// réellement en cours -- Promise.resolve() immédiate sinon.
function attendreArretEnregistrementAudio() {
  if (!enregistreurAudio || enregistreurAudio.state !== "recording") return Promise.resolve();
  return new Promise((resolve) => {
    enregistreurAudio.addEventListener("stop", () => resolve(), { once: true });
    enregistreurAudio.stop();
  });
}

function revoquerApercuAudioFormulaire() {
  if (audioFormulaire && audioFormulaire.urlApercu) URL.revokeObjectURL(audioFormulaire.urlApercu);
}

function supprimerAudioFormulaire() {
  revoquerApercuAudioFormulaire();
  audioFormulaire = null;
  rendreAudioFormulaire();
}

// Même esprit que resoudrePhotosPourEnvoi() ci-dessus, mais pour une
// valeur unique : rien de nouveau -> supprime l'ancienne note si elle
// existait (note retirée) ; audioFormulaire.audioId déjà présent ->
// inchangée, rien à faire ; sinon -> nouvel enregistrement, stocké et
// remplace l'ancienne le cas échéant.
function resoudreAudioPourEnvoi(entreeExistante) {
  const ancienId = entreeExistante ? entreeExistante.audioId : null;
  if (!audioFormulaire) {
    return (ancienId ? supprimerAudio(ancienId).catch(() => {}) : Promise.resolve()).then(() => null);
  }
  if (audioFormulaire.audioId) {
    return Promise.resolve(audioFormulaire.audioId);
  }
  const suppression = ancienId ? supprimerAudio(ancienId).catch(() => {}) : Promise.resolve();
  return suppression.then(() => enregistrerAudio(audioFormulaire.blob));
}

// ---- Géolocalisation (issue #6, éditable depuis #15) ----------------
// Capturée automatiquement à l'ouverture du formulaire d'AJOUT ; en
// édition, gpsLat/gpsLon partent de la position déjà enregistrée sur
// l'entrée (voir ouvrirFormulaire()) -- dans les deux cas, l'utilisateur
// peut ensuite recapturer, choisir sur la carte, ou retirer la
// position (voir position-actions dans app.html). Coordonnées brutes
// stockées telles quelles, aucun reverse-geocoding (voir CLAUDE.md --
// resterait offline-first).

function rafraichirStatutPosition(etat) {
  const conteneur = document.getElementById("position-statut");
  const texte = document.getElementById("position-statut-texte");
  conteneur.classList.remove("ok", "erreur");
  if (etat === "loading") {
    texte.textContent = t(currentLanguage, "gpsEnCours");
  } else if (etat === "ok") {
    conteneur.classList.add("ok");
    texte.textContent = tf(currentLanguage, "positionCoordonnees", {
      lat: gpsLat.toFixed(5),
      lon: gpsLon.toFixed(5),
    });
  } else if (etat === "erreur") {
    conteneur.classList.add("erreur");
    texte.textContent = t(currentLanguage, "gpsIndisponible");
  } else {
    texte.textContent = t(currentLanguage, "positionAbsente");
  }
  document.getElementById("position-retirer").hidden = gpsLat == null || gpsLon == null;
}

function demarrerCaptureGPS() {
  gpsLat = null;
  gpsLon = null;
  if (!("geolocation" in navigator)) {
    rafraichirStatutPosition("erreur");
    return;
  }
  rafraichirStatutPosition("loading");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      gpsLat = position.coords.latitude;
      gpsLon = position.coords.longitude;
      rafraichirStatutPosition("ok");
    },
    () => rafraichirStatutPosition("erreur"),
    { timeout: 8000 }
  );
}

function retirerPosition() {
  gpsLat = null;
  gpsLon = null;
  rafraichirStatutPosition("absente");
}

// Sélecteur de position sur la carte -- pin fixe au centre de l'écran,
// "Valider" lit le centre courant de la carte (voir picker-pin-centre
// dans app.html). Instance Leaflet séparée de carteMap : la carte
// principale peut ne jamais avoir été affichée quand on ouvre le
// formulaire, pas de raison de forcer son initialisation ici.
let carteMapPicker = null;
// Repères des autres entrées déjà positionnées (retour utilisateur,
// 2026-08-26 -- utile notamment pour placer une cible de parcours 3D
// par rapport aux cibles déjà enregistrées). Couche séparée de
// carteCouchePins (vue Carte principale) : ici, TOUTES les entrées
// avec position, sans tenir compte des filtres actifs -- le picker
// n'a pas son propre état de filtre, et le but est d'avoir tout le
// contexte spatial disponible, pas seulement ce que la vue Liste/Carte
// affiche au même moment.
let carteMapPickerReperes = null;

function ouvrirPickerPosition() {
  document.getElementById("picker-overlay").hidden = false;
  const centre =
    gpsLat != null && gpsLon != null
      ? [gpsLat, gpsLon]
      : carteMap
        ? carteMap.getCenter()
        : [46.6, 2.4];
  const zoom = gpsLat != null && gpsLon != null ? 15 : carteMap ? carteMap.getZoom() : 5;
  if (!carteMapPicker) {
    carteMapPicker = L.map("picker-carte", { attributionControl: true }).setView(centre, zoom);
    ajouterCoucheTuilesOSM(carteMapPicker);
    carteMapPickerReperes = L.layerGroup().addTo(carteMapPicker);
  } else {
    carteMapPicker.setView(centre, zoom);
  }
  rafraichirReperesPicker();
  requestAnimationFrame(() => carteMapPicker.invalidateSize());
}

// Reconstruite à chaque ouverture (pas seulement à la création de la
// carte) -- idEnEdition et les entrées existantes peuvent avoir changé
// depuis la dernière fois. Icône identique à la vue Carte (ICONE_PIN_CARTE)
// mais plus petite et atténuée (.pin-carte-repere) pour rester
// secondaire par rapport à la mire, qui reste le seul indicateur de "la
// position en cours de saisie".
function rafraichirReperesPicker() {
  carteMapPickerReperes.clearLayers();
  entreesActuelles
    .filter((e) => e.id !== idEnEdition && e.lat != null && e.lon != null)
    .forEach((entree) => {
      L.marker([entree.lat, entree.lon], {
        icon: L.divIcon({ className: "pin-carte pin-carte-repere", html: ICONE_PIN_CARTE, iconSize: [20, 20], iconAnchor: [10, 20] }),
        keyboard: false,
      })
        .bindPopup(_echapperTexte(entree.titre || entree.lieu))
        .addTo(carteMapPickerReperes);
    });
}

function fermerPickerPosition() {
  document.getElementById("picker-overlay").hidden = true;
}

function validerPickerPosition() {
  const centre = carteMapPicker.getCenter();
  gpsLat = centre.lat;
  gpsLon = centre.lng;
  rafraichirStatutPosition("ok");
  fermerPickerPosition();
}

// ---- Téléchargement/partage de photos seules (retour utilisateur,
// 2026-08-30) -- distinct de l'export complet (export-import.js,
// entrees.json + photos + audios, pensé comme une sauvegarde) : ici,
// juste récupérer des photos, à l'une de 4 portées (totale, filtrée,
// une entrée, une seule photo -- voir les boutons dans initFormulaire()
// et ouvrirLightbox()). Web Share API (fichiers directs, l'utilisateur
// choisit "Enregistrer dans Photos"/toute appli -- pas de zip à
// décompresser) quand supportée, repli sur un zip "photos seules"
// (aucun entrees.json dedans, contrairement à exporterSauvegarde())
// sinon, ou sur un simple fichier .jpg s'il n'y a qu'une seule photo.
// Même patron que livrerExport() dans export-import.js pour le choix
// partage/téléchargement, réutilise _telechargerBlob() de ce fichier.

function _nomFichierPhoto(index, total) {
  const date = new Date().toISOString().slice(0, 10);
  return total > 1 ? `fletchlog-photo-${date}-${index + 1}.jpg` : `fletchlog-photo-${date}.jpg`;
}

async function _partagerOuTelechargerBlobsPhotos(blobs) {
  const blobsValides = blobs.filter(Boolean);
  if (blobsValides.length === 0) {
    afficherToast(t(currentLanguage, "photosAucunePhoto"));
    return;
  }
  const fichiers = blobsValides.map((blob, i) => new File([blob], _nomFichierPhoto(i, blobsValides.length), { type: "image/jpeg" }));

  if (window.File && navigator.canShare && navigator.canShare({ files: fichiers })) {
    try {
      await navigator.share({ files: fichiers });
      return;
    } catch (erreur) {
      // Partage annulé ou échoué (ex. trop de fichiers pour la cible
      // choisie) -- repli sur le téléchargement direct ci-dessous,
      // même principe que livrerExport().
    }
  }

  if (fichiers.length === 1) {
    _telechargerBlob(fichiers[0], fichiers[0].name);
    return;
  }

  const zip = new JSZip();
  fichiers.forEach((fichier) => zip.file(fichier.name, fichier));
  const blobZip = await zip.generateAsync({ type: "blob" });
  _telechargerBlob(blobZip, `fletchlog-photos-${new Date().toISOString().slice(0, 10)}.zip`);
}

// Portées totale/filtrée/entrée -- toujours à partir d'ids déjà
// stockés (obtenirPhoto(), store "photos"), dédupliqués (une même
// photo ne devrait jamais être référencée par deux entrées, mais rien
// ne l'empêche techniquement après un import).
function partagerOuTelechargerPhotosParId(photoIds) {
  const idsUniques = [...new Set(photoIds)];
  if (idsUniques.length === 0) {
    afficherToast(t(currentLanguage, "photosAucunePhoto"));
    return Promise.resolve();
  }
  return Promise.all(idsUniques.map((id) => obtenirPhoto(id))).then(_partagerOuTelechargerBlobsPhotos);
}

// Portée "une seule photo" (bouton superposé à la lightbox) -- l'URL
// déjà résolue (photosCache, pas un id) est refetchée en Blob : une
// URL blob: est fetchable comme n'importe quelle autre (contrairement
// à ce qu'on pourrait croire), pas besoin de retrouver le photoId
// d'origine pour ça.
function partagerOuTelechargerPhotoUnique(url) {
  return fetch(url)
    .then((reponse) => reponse.blob())
    .then((blob) => _partagerOuTelechargerBlobsPhotos([blob]));
}

// ---- Détail de sortie (retour utilisateur -- mode non éditable par
// défaut) -- vue de consultation, ouverte au tap d'une carte Liste ou
// de l'aperçu Carte. "Modifier" ouvre ouvrirFormulaire() par-dessus.
// Réutilise idEnEdition (même variable que le formulaire -- les deux
// écrans ne sont jamais ouverts en même temps) pour que
// supprimerDepuisDetail() partage sa logique avec
// supprimerDepuisFormulaire() (voir supprimerEntreeConfirmee()).

function ligneDetail(labelCle, valeur) {
  if (!valeur || !String(valeur).trim()) return "";
  return `<div class="detail-ligne"><span class="detail-label">${t(currentLanguage, labelCle)}</span><span class="detail-valeur">${_echapperTexte(String(valeur))}</span></div>`;
}

function afficherDetail(id) {
  const entree = entreesActuelles.find((e) => e.id === id);
  if (!entree) return;
  idEnEdition = id;

  const idsPhotos = entree.photoIds || [];
  const galerie = document.getElementById("detail-galerie");
  galerie.hidden = idsPhotos.length === 0;
  // Même condition que la galerie -- rien à télécharger sinon (retour
  // utilisateur, 2026-08-30).
  document.getElementById("detail-photos").hidden = idsPhotos.length === 0;
  galerie.innerHTML = idsPhotos
    .map((photoId, index) => {
      const url = photosCache[photoId];
      return `<div class="detail-vignette" data-index="${index}">${url ? `<img src="${url}" alt="">` : ICONE_PLACEHOLDER_PHOTO}</div>`;
    })
    .join("");

  const aTitreReel = entree.titre && entree.titre.trim();
  const meteoIcone = ICONES_METEO[entree.meteo];
  const meteoLigne =
    entree.meteo !== "aucune" && meteoIcone
      ? `<div class="detail-meteo">${meteoIcone}<span>${_echapperTexte(t(currentLanguage, "meteo" + entree.meteo.charAt(0).toUpperCase() + entree.meteo.slice(1)))}</span></div>`
      : "";
  const labelsLigne = (entree.labels || []).length
    ? `<div class="detail-labels">${entree.labels.map((l) => `<span class="badge-label">${_echapperTexte(l)}</span>`).join("")}</div>`
    : "";
  const commentaireLigne =
    entree.commentaire && entree.commentaire.trim() ? `<p class="detail-commentaire">${_echapperTexte(entree.commentaire)}</p>` : "";
  // Pas tf(..., "positionCoordonnees", ...) ici -- cette clé inclut déjà
  // "Position :" en préfixe (faite pour un contexte sans label séparé),
  // ce qui doublerait avec le label posé par ligneDetail() plus bas.
  const positionTexte =
    entree.lat != null && entree.lon != null ? `${entree.lat.toFixed(5)}, ${entree.lon.toFixed(5)}` : t(currentLanguage, "positionAbsente");
  // Note vocale (retour utilisateur, 2026-08-29) -- lecteur natif
  // <audio controls>, même URL déjà résolue par précharcherAudios() que
  // le formulaire, pas de nouvelle lecture IndexedDB ici.
  const audioLigne =
    entree.audioId && audiosCache[entree.audioId]
      ? `<audio class="detail-audio" controls src="${audiosCache[entree.audioId]}"></audio>`
      : "";

  document.getElementById("detail-corps").innerHTML = `
    <h2>${_echapperTexte(aTitreReel ? entree.titre : entree.lieu)}</h2>
    ${ligneDetail("formLieuLabel", entree.lieu)}
    ${ligneDetail("formCibleLabel", entree.cible)}
    ${ligneDetail("formDisciplineLabel", entree.discipline)}
    ${ligneDetail("formDistanceLabel", entree.distance)}
    ${ligneDetail("formDateLabel", formaterDate(entree.date))}
    ${ligneDetail("positionLabel", positionTexte)}
    ${labelsLigne}
    ${meteoLigne}
    ${commentaireLigne}
    ${audioLigne}
  `;

  document.getElementById("detail-overlay").hidden = false;
}

function fermerDetail() {
  document.getElementById("detail-overlay").hidden = true;
  idEnEdition = null;
}

// Swipe entre entrées sur l'écran de détail (retour utilisateur,
// 2026-08-30) -- passe à l'entrée suivante/précédente dans le même
// ordre que la vue Liste (trierEntrees(entreesFiltrees()), pas un état
// de navigation propre). Sans effet en bout de liste (pas de
// bouclage) -- une liste d'entrées datées n'a pas de "suivante"
// logique après la dernière, contrairement à un carrousel de photos.
function naviguerDetail(direction) {
  const ordre = trierEntrees(entreesFiltrees());
  const indexActuel = ordre.findIndex((e) => e.id === idEnEdition);
  if (indexActuel === -1) return;
  const nouvelIndex = indexActuel + direction;
  if (nouvelIndex < 0 || nouvelIndex >= ordre.length) return;
  afficherDetail(ordre[nouvelIndex].id);
}

// ---- Formulaire d'ajout/édition ------------------------------------

function ouvrirFormulaire(id) {
  idEnEdition = id || null;
  const entree = id ? entreesActuelles.find((e) => e.id === id) : null;

  document.getElementById("form-titre").setAttribute("data-i18n", entree ? "formTitreEdition" : "formTitreAjout");
  document.getElementById("form-titre").textContent = t(currentLanguage, entree ? "formTitreEdition" : "formTitreAjout");
  // Entrées créées avant #11 (pas de titre) -- repli sur le lieu pour
  // ne pas présenter un champ obligatoire vide sans raison à l'édition.
  document.getElementById("champ-titre").value = entree ? entree.titre || entree.lieu : "";
  document.getElementById("champ-lieu").value = entree ? entree.lieu : "";
  document.getElementById("champ-cible").value = entree ? entree.cible : "";
  document.getElementById("champ-discipline").value = entree ? entree.discipline : "";
  document.getElementById("champ-distance").value = entree ? entree.distance : "";
  document.getElementById("champ-labels").value = entree && entree.labels ? entree.labels.join(", ") : "";
  document.getElementById("champ-commentaire").value = entree ? entree.commentaire || "" : "";
  document.getElementById("champ-meteo").value = entree ? entree.meteo : "aucune";
  document.getElementById("champ-date").value = entree ? entree.date : new Date().toISOString().slice(0, 10);
  document.getElementById("form-erreur").hidden = true;
  document.getElementById("form-supprimer").hidden = !entree;

  revoquerApercusFormulaire();
  photosFormulaire = entree ? (entree.photoIds || []).map((photoId) => ({ photoId })) : [];
  document.getElementById("champ-photo").value = "";
  document.getElementById("champ-photo-galerie").value = "";
  rendrePhotosGalerie();

  revoquerApercuAudioFormulaire();
  audioFormulaire = entree && entree.audioId ? { audioId: entree.audioId } : null;
  rendreAudioFormulaire();

  if (entree) {
    gpsLat = entree.lat ?? null;
    gpsLon = entree.lon ?? null;
    rafraichirStatutPosition(gpsLat != null ? "ok" : "absente");
  } else {
    demarrerCaptureGPS();
  }

  document.getElementById("form-overlay").hidden = false;
  document.getElementById("champ-lieu").focus();
}

function fermerFormulaire() {
  document.getElementById("form-overlay").hidden = true;
  idEnEdition = null;
  revoquerApercusFormulaire();
  photosFormulaire = [];

  // Un enregistrement encore en cours (formulaire fermé sans avoir
  // arrêté le micro) doit couper le flux -- sinon le micro resterait
  // ouvert (indicateur système actif) après la fermeture du formulaire.
  // Ne PAS réinitialiser audioFormulaire avant cet arrêt : le
  // gestionnaire "stop" (asynchrone) le fait déjà correctement une
  // fois le flux effectivement coupé -- réinitialiser ici en double
  // créerait une note orpheline (le blob capturé par le gestionnaire
  // "stop", qui s'exécute après ce `null`, écraserait silencieusement
  // ce reset). ouvrirFormulaire() nettoie de toute façon l'état
  // précédent à la prochaine ouverture, donc rien à perdre à laisser
  // le gestionnaire "stop" faire son travail normalement ici.
  if (enregistreurAudio && enregistreurAudio.state === "recording") {
    enregistreurAudio.stop();
  } else {
    revoquerApercuAudioFormulaire();
    audioFormulaire = null;
  }
}

function afficherErreurFormulaire(cle) {
  const erreur = document.getElementById("form-erreur");
  erreur.setAttribute("data-i18n", cle);
  erreur.textContent = t(currentLanguage, cle);
  erreur.hidden = false;
}

function soumettreFormulaire(evenement) {
  evenement.preventDefault();
  const titre = document.getElementById("champ-titre").value.trim();
  const lieu = document.getElementById("champ-lieu").value.trim();
  if (!titre) {
    afficherErreurFormulaire("champTitreRequis");
    return;
  }
  if (!lieu) {
    afficherErreurFormulaire("formLieuRequis");
    return;
  }

  const entreeExistante = idEnEdition ? entreesActuelles.find((e) => e.id === idEnEdition) : null;

  // Un enregistrement encore en cours doit se terminer avant de résoudre
  // la note vocale à sauvegarder, sinon la nouvelle note resterait
  // coincée dans le gestionnaire "stop" (voir attendreArretEnregistrementAudio()).
  attendreArretEnregistrementAudio()
    .then(() => Promise.all([resoudrePhotosPourEnvoi(entreeExistante), resoudreAudioPourEnvoi(entreeExistante)]))
    .then(([photoIds, audioId]) => {
      const donnees = {
        titre,
        lieu,
        cible: document.getElementById("champ-cible").value.trim(),
        discipline: document.getElementById("champ-discipline").value.trim(),
        distance: document.getElementById("champ-distance").value.trim(),
        labels: document.getElementById("champ-labels").value,
        commentaire: document.getElementById("champ-commentaire").value.trim(),
        meteo: document.getElementById("champ-meteo").value,
        date: document.getElementById("champ-date").value,
        photoIds,
        audioId,
        // gpsLat/gpsLon reflètent toujours l'état courant (issue #15) :
        // capture auto à l'ajout, position déjà enregistrée par défaut
        // en édition (voir ouvrirFormulaire()), recapturée/choisie sur
        // la carte/retirée entre-temps si l'utilisateur l'a fait.
        lat: gpsLat,
        lon: gpsLon,
      };
      return idEnEdition ? modifierEntree({ ...entreeExistante, ...donnees }) : ajouterEntree(donnees);
    })
    .then(() => {
      // idEnEdition capturé avant fermerFormulaire() (qui le remet à
      // null) -- s'il y en avait un, c'est une édition : retour à
      // l'écran de détail (non éditable) de cette même sortie plutôt
      // que juste refermer, retour utilisateur. Un ajout (pas d'id)
      // referme simplement, comme avant -- rien à "retourner" voir,
      // aucun écran de détail n'a précédé le formulaire dans ce cas.
      const idSortieEditee = idEnEdition;
      fermerFormulaire();
      afficherToast(t(currentLanguage, "toastEnregistre"));
      return chargerEntrees().then(() => {
        if (idSortieEditee) afficherDetail(idSortieEditee);
      });
    })
    .catch((erreur) => {
      console.warn("Échec de l'enregistrement :", erreur);
      // Bug réel signalé par l'utilisateur, 2026-08-26 : ce .catch()
      // se contentait de réafficher #form-erreur sans jamais y remettre
      // de texte à jour -- en cas d'échec (quel qu'il soit), le
      // contenu HTML par défaut de cet élément ("Le lieu est
      // obligatoire.") restait affiché tel quel, même quand le vrai
      // problème n'avait rien à voir (ex. une photo au format HEIC,
      // que Chrome ne sait décoder dans aucun contexte -- voir
      // compresserPhoto() : image.onerror rejette avec "Image
      // invalide." dans ce cas). Distingue maintenant un échec de
      // photo (message actionnable) d'un échec générique.
      const messagesErreurPhoto = ["Image invalide.", "Compression de la photo impossible."];
      afficherErreurFormulaire(
        erreur && messagesErreurPhoto.includes(erreur.message) ? "formPhotoInvalide" : "formErreurGenerique"
      );
    });
}

function demanderConfirmation(message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirm-overlay");
    const boutonAnnuler = document.getElementById("confirm-annuler");
    const boutonValider = document.getElementById("confirm-valider");
    document.getElementById("confirm-message").textContent = message;

    function nettoyer(resultat) {
      overlay.hidden = true;
      boutonAnnuler.removeEventListener("click", surAnnuler);
      boutonValider.removeEventListener("click", surValider);
      resolve(resultat);
    }
    function surAnnuler() {
      nettoyer(false);
    }
    function surValider() {
      nettoyer(true);
    }
    boutonAnnuler.addEventListener("click", surAnnuler);
    boutonValider.addEventListener("click", surValider);
    overlay.hidden = false;
  });
}

// Partagée entre le formulaire et l'écran de détail -- même
// enchaînement (confirmation -> suppression entrée + photos + note
// vocale -> toast + rechargement), seul l'écran à refermer une fois
// fini diffère.
function supprimerEntreeConfirmee(id, fermerOverlay) {
  const entree = entreesActuelles.find((e) => e.id === id);
  return demanderConfirmation(t(currentLanguage, "confirmSuppression")).then((confirme) => {
    if (!confirme) return;
    return supprimerEntree(id)
      .then(() =>
        Promise.all([
          ...(entree?.photoIds || []).map((pid) => supprimerPhoto(pid).catch(() => {})),
          ...(entree?.audioId ? [supprimerAudio(entree.audioId).catch(() => {})] : []),
        ])
      )
      .then(() => {
        fermerOverlay();
        afficherToast(t(currentLanguage, "toastSupprime"));
        chargerEntrees();
      });
  });
}

function supprimerDepuisFormulaire() {
  if (!idEnEdition) return;
  supprimerEntreeConfirmee(idEnEdition, fermerFormulaire);
}

function supprimerDepuisDetail() {
  if (!idEnEdition) return;
  supprimerEntreeConfirmee(idEnEdition, fermerDetail);
}

function initFormulaire() {
  document.getElementById("fab-add").addEventListener("click", () => ouvrirFormulaire(null));
  document.getElementById("rappel-export-plus-tard").addEventListener("click", () => {
    sessionStorage.setItem("fletchlog_rappel_export_masque", "1");
    document.getElementById("rappel-export").hidden = true;
  });
  document.getElementById("detail-fermer").addEventListener("click", fermerDetail);
  document.getElementById("detail-supprimer").addEventListener("click", supprimerDepuisDetail);
  document.getElementById("detail-modifier").addEventListener("click", () => {
    const id = idEnEdition;
    document.getElementById("detail-overlay").hidden = true;
    ouvrirFormulaire(id);
  });
  // Souvenir d'une seule entrée (retour utilisateur, 2026-08-30) --
  // détail-overlay volontairement PAS fermé avant (contrairement à
  // "Modifier" juste au-dessus) : souvenir-overlay a un z-index plus
  // élevé (27 contre 20), se superpose proprement, et refermer la
  // carte souvenir révèle à nouveau le détail exactement où on l'a
  // laissé -- pas besoin de rouvrir quoi que ce soit.
  document.getElementById("detail-souvenir").addEventListener("click", () => {
    const entree = entreesActuelles.find((e) => e.id === idEnEdition);
    if (entree) ouvrirSouvenir([entree]);
  });
  // Photos de cette entrée (portée "entrée", retour utilisateur,
  // 2026-08-30) -- voir partagerOuTelechargerPhotosParId() dans app.js.
  document.getElementById("detail-photos").addEventListener("click", () => {
    const entree = entreesActuelles.find((e) => e.id === idEnEdition);
    if (!entree || !(entree.photoIds || []).length) return;
    const bouton = document.getElementById("detail-photos");
    bouton.disabled = true;
    afficherToast(t(currentLanguage, "photosEnCours"));
    partagerOuTelechargerPhotosParId(entree.photoIds)
      .catch((erreur) => {
        console.warn("Échec du téléchargement des photos de l'entrée :", erreur);
        afficherToast(t(currentLanguage, "photosErreur"));
      })
      .finally(() => {
        bouton.disabled = false;
      });
  });
  document.getElementById("detail-galerie").addEventListener("click", (evenement) => {
    const vignette = evenement.target.closest(".detail-vignette");
    if (!vignette) return;
    const entree = entreesActuelles.find((e) => e.id === idEnEdition);
    if (!entree) return;
    const urls = (entree.photoIds || []).map((photoId) => photosCache[photoId]);
    ouvrirLightbox(urls, Number(vignette.dataset.index));
  });

  // Swipe entre entrées (voir naviguerDetail()) -- geste simple
  // (touchstart/touchend, seuil 40px, même convention que le premier
  // swipe de la lightbox photo avant son carrousel à 3 volets) plutôt
  // qu'un vrai carrousel visuel : contrairement à une image de taille
  // fixe, le contenu du détail est un panneau HTML dynamique (galerie,
  // lecteur audio, hauteur variable) -- animer un glissement en direct
  // dessus n'apporterait pas grand-chose pour la complexité en plus.
  // Pas de preventDefault -- le défilement vertical natif du panneau
  // (contenu potentiellement plus long que l'écran) doit continuer à
  // fonctionner normalement, seul touchend décide après coup si le
  // geste était plutôt horizontal. Ignoré si le geste démarre dans
  // #detail-galerie : ce conteneur a son propre défilement horizontal
  // natif (vignettes photo), qu'un swipe de navigation ne doit pas
  // intercepter.
  let detailToucheDepartX = null;
  let detailToucheDepartY = null;
  let detailToucheDepartDansGalerie = false;
  const detailOverlay = document.getElementById("detail-overlay");
  detailOverlay.addEventListener("touchstart", (evenement) => {
    if (evenement.touches.length !== 1) return;
    detailToucheDepartX = evenement.touches[0].clientX;
    detailToucheDepartY = evenement.touches[0].clientY;
    detailToucheDepartDansGalerie = !!evenement.target.closest("#detail-galerie");
  });
  detailOverlay.addEventListener("touchend", (evenement) => {
    if (detailToucheDepartX === null) return;
    const departX = detailToucheDepartX;
    const departY = detailToucheDepartY;
    const dansGalerie = detailToucheDepartDansGalerie;
    detailToucheDepartX = null;
    if (dansGalerie || evenement.changedTouches.length !== 1) return;
    const deltaX = evenement.changedTouches[0].clientX - departX;
    const deltaY = Math.abs(evenement.changedTouches[0].clientY - departY);
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > deltaY) {
      naviguerDetail(deltaX < 0 ? 1 : -1);
    }
  });
  document.getElementById("form-annuler").addEventListener("click", fermerFormulaire);
  document.getElementById("form-supprimer").addEventListener("click", supprimerDepuisFormulaire);
  document.getElementById("form-entree").addEventListener("submit", soumettreFormulaire);
  document.getElementById("champ-photo").addEventListener("change", (evenement) => {
    const fichier = evenement.target.files[0];
    evenement.target.value = ""; // permet de resélectionner le même fichier ensuite
    if (fichier) ajouterPhotoFormulaire(fichier);
  });
  document.getElementById("champ-photo-galerie").addEventListener("change", (evenement) => {
    const fichier = evenement.target.files[0];
    evenement.target.value = "";
    if (fichier) ajouterPhotoFormulaire(fichier);
  });

  // Note vocale (retour utilisateur, 2026-08-29) -- widget masqué en
  // entier (pas juste le bouton) si MediaRecorder/getUserMedia n'est
  // pas disponible, plutôt que de laisser un bouton mort.
  if (window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    document.getElementById("audio-enregistrer").addEventListener("click", () => {
      if (enregistreurAudio) arreterEnregistrementAudio();
      else demarrerEnregistrementAudio();
    });
    document.getElementById("audio-supprimer").addEventListener("click", supprimerAudioFormulaire);
  } else {
    document.getElementById("champ-audio").hidden = true;
  }
  // Délégation -- les vignettes/boutons "+" sont recréés à chaque
  // rendrePhotosGalerie(), pas de listener à reposer individuellement.
  document.getElementById("photo-galerie").addEventListener("click", (evenement) => {
    const boutonRetirer = evenement.target.closest(".photo-vignette-retirer");
    if (boutonRetirer) {
      retirerPhotoFormulaire(Number(boutonRetirer.dataset.index));
      return;
    }
    const boutonCouverture = evenement.target.closest(".photo-vignette-couverture");
    if (boutonCouverture) {
      definirPhotoCouverture(Number(boutonCouverture.dataset.index));
      return;
    }
    if (evenement.target.closest("#photo-ajouter")) {
      document.getElementById("champ-photo").click();
      return;
    }
    if (evenement.target.closest("#photo-ajouter-galerie")) {
      document.getElementById("champ-photo-galerie").click();
      return;
    }
    const vignette = evenement.target.closest(".photo-vignette-form");
    if (vignette && evenement.target.tagName === "IMG") {
      const urls = photosFormulaire.map((p) => p.urlApercu || photosCache[p.photoId]);
      ouvrirLightbox(urls, Number(vignette.dataset.index));
    }
  });
  document.getElementById("lightbox-fermer").addEventListener("click", fermerLightbox);
  // Photo affichée (portée "image", retour utilisateur, 2026-08-30) --
  // voir partagerOuTelechargerPhotoUnique() dans app.js. Corrige au
  // passage le .txt signalé sur le geste natif "enregistrer l'image"
  // (URL blob: sans nom explicite) en proposant un vrai téléchargement
  // app-contrôlé, toujours nommé correctement.
  document.getElementById("lightbox-telecharger").addEventListener("click", () => {
    const url = lightboxUrls[lightboxIndex];
    if (!url) return;
    const bouton = document.getElementById("lightbox-telecharger");
    bouton.disabled = true;
    afficherToast(t(currentLanguage, "photosEnCours"));
    partagerOuTelechargerPhotoUnique(url)
      .catch((erreur) => {
        console.warn("Échec du téléchargement de la photo :", erreur);
        afficherToast(t(currentLanguage, "photosErreur"));
      })
      .finally(() => {
        bouton.disabled = false;
      });
  });
  document.getElementById("lightbox-prev").addEventListener("click", lightboxPrecedente);
  document.getElementById("lightbox-next").addEventListener("click", lightboxSuivante);
  document.getElementById("lightbox-overlay").addEventListener("click", (evenement) => {
    if (evenement.target.id === "lightbox-overlay") fermerLightbox();
  });
  // Un seul jeu d'écouteurs sur la piste couvre pinch-zoom, pan (zoom
  // > 1) et glissement entre photos (zoom == 1) -- la piste occupe
  // tout l'écran visible, peu importe le volet techniquement sous le
  // doigt. Tap sur le fond (pas sur l'image, mouvement minime) ferme
  // la lightbox -- même geste que le tap sur #lightbox-overlay
  // (ci-dessus, click) mais nécessaire ici en plus : touch-action:
  // none supprime le click synthétique qui suivrait normalement un tap
  // tactile, .lightbox-overlay ne le recevrait donc jamais au doigt.
  let lightboxToucheDepartX = null;
  let lightboxToucheDepartY = null;
  let lightboxToucheDepartCible = null;
  let lightboxGlissement = false;
  let lightboxPinchDistanceDepart = 0;
  let lightboxZoomDepart = 1;
  let lightboxDragDepart = null;
  const lightboxTrack = document.getElementById("lightbox-track");
  lightboxTrack.addEventListener("touchstart", (evenement) => {
    if (evenement.touches.length === 2) {
      lightboxPinchDistanceDepart = distanceTactile(evenement.touches);
      lightboxZoomDepart = lightboxZoom;
    } else if (evenement.touches.length === 1) {
      lightboxToucheDepartX = evenement.touches[0].clientX;
      lightboxToucheDepartY = evenement.touches[0].clientY;
      lightboxToucheDepartCible = evenement.target;
      if (lightboxZoom > 1) {
        lightboxDragDepart = { x: evenement.touches[0].clientX - lightboxPanX, y: evenement.touches[0].clientY - lightboxPanY };
        lightboxGlissement = false;
      } else {
        lightboxGlissement = true;
      }
    }
  });
  lightboxTrack.addEventListener(
    "touchmove",
    (evenement) => {
      if (evenement.touches.length === 2) {
        evenement.preventDefault();
        const distance = distanceTactile(evenement.touches);
        lightboxZoom = Math.min(LIGHTBOX_ZOOM_MAX, Math.max(1, lightboxZoomDepart * (distance / lightboxPinchDistanceDepart)));
        appliquerZoomLightbox();
      } else if (evenement.touches.length === 1 && lightboxDragDepart) {
        evenement.preventDefault();
        lightboxPanX = evenement.touches[0].clientX - lightboxDragDepart.x;
        lightboxPanY = evenement.touches[0].clientY - lightboxDragDepart.y;
        appliquerZoomLightbox();
      } else if (evenement.touches.length === 1 && lightboxGlissement) {
        evenement.preventDefault();
        const delta = evenement.touches[0].clientX - lightboxToucheDepartX;
        lightboxTrack.style.transform = `translateX(calc(-33.3333% + ${delta}px))`;
      }
    },
    { passive: false }
  );
  lightboxTrack.addEventListener("touchend", (evenement) => {
    lightboxDragDepart = null;
    if (lightboxZoom <= 1.02) reinitialiserZoomLightbox();
    if (evenement.touches.length > 0) return; // encore des doigts posés (fin de pinch) -- pas une fin de geste simple
    if (!lightboxGlissement) return;
    lightboxGlissement = false;
    const delta = evenement.changedTouches[0].clientX - lightboxToucheDepartX;
    const deltaY = Math.abs(evenement.changedTouches[0].clientY - lightboxToucheDepartY);
    if (Math.abs(delta) < 8 && deltaY < 8 && lightboxToucheDepartCible && lightboxToucheDepartCible.tagName !== "IMG") {
      annulerGlissementLightbox();
      fermerLightbox();
      return;
    }
    const seuil = lightboxTrack.clientWidth / 3 / 5; // ~20% de la largeur d'un volet
    if (lightboxUrls.length > 1 && Math.abs(delta) > seuil) {
      deplacerLightbox(delta < 0 ? 1 : -1);
    } else {
      annulerGlissementLightbox();
    }
  });
  ["filtre-discipline", "filtre-distance", "filtre-lieu", "filtre-label"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => {
      const select = document.getElementById(id);
      select.classList.toggle("active", select.value !== "");
      rafraichirAffichage();
    });
  });
  document.getElementById("recherche-commentaire").addEventListener("input", () => rafraichirAffichage());
  ["filtre-date-debut", "filtre-date-fin"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => rafraichirAffichage());
  });
  document.getElementById("tri-liste").addEventListener("change", () => rafraichirListe());

  // Export rapide depuis la barre du bas (retour utilisateur,
  // 2026-08-25) -- même exporterSauvegarde()/livrerExport() que la
  // page Aide (export-import.js chargé aussi ici désormais), pour ne
  // pas dupliquer la logique zip/partage : juste un raccourci qui
  // évite de quitter l'écran.
  document.getElementById("bouton-export-rapide").addEventListener("click", () => {
    const bouton = document.getElementById("bouton-export-rapide");
    bouton.disabled = true;
    afficherToast(t(currentLanguage, "exportEnCours"));
    exporterSauvegarde()
      .then((blob) => livrerExport(blob))
      .catch((erreur) => {
        console.warn("Échec de l'export :", erreur);
        afficherToast(t(currentLanguage, "exportErreur"));
      })
      .finally(() => {
        bouton.disabled = false;
      });
  });

  // Export du résultat filtré (retour utilisateur, 2026-08-29) -- même
  // archive (JSON + photos + audios) que l'export complet ci-dessus,
  // juste réduite aux entrées actuellement filtrées (entreesFiltrees(),
  // même fonction que la vue Liste/Carte/la carte souvenir). Ne compte
  // PAS comme le backup périodique attendu par le rappel d'export
  // (issue #18) -- un export partiel ne doit jamais faire taire ce
  // rappel, qui porte sur la sauvegarde de TOUT le carnet (voir
  // livrerExport() dans export-import.js, options `estBackupComplet`/
  // `suffixeNomFichier`).
  document.getElementById("bouton-export-filtre").addEventListener("click", () => {
    const entrees = entreesFiltrees();
    if (entrees.length === 0) {
      afficherToast(t(currentLanguage, "souvenirAucuneEntree"));
      return;
    }
    const bouton = document.getElementById("bouton-export-filtre");
    bouton.disabled = true;
    afficherToast(t(currentLanguage, "exportEnCours"));
    exporterSauvegarde(entrees)
      .then((blob) => livrerExport(blob, { estBackupComplet: false, suffixeNomFichier: "filtre" }))
      .catch((erreur) => {
        console.warn("Échec de l'export filtré :", erreur);
        afficherToast(t(currentLanguage, "exportErreur"));
      })
      .finally(() => {
        bouton.disabled = false;
      });
  });

  // Photos seules, portée "totale" (retour utilisateur, 2026-08-30) --
  // distinct de l'export complet juste au-dessus (voir
  // partagerOuTelechargerPhotosParId() dans app.js).
  document.getElementById("bouton-photos-rapide").addEventListener("click", () => {
    const idsPhotos = [...new Set(entreesActuelles.flatMap((e) => e.photoIds || []))];
    if (idsPhotos.length === 0) {
      afficherToast(t(currentLanguage, "photosAucunePhoto"));
      return;
    }
    const bouton = document.getElementById("bouton-photos-rapide");
    bouton.disabled = true;
    afficherToast(t(currentLanguage, "photosEnCours"));
    partagerOuTelechargerPhotosParId(idsPhotos)
      .catch((erreur) => {
        console.warn("Échec du téléchargement des photos :", erreur);
        afficherToast(t(currentLanguage, "photosErreur"));
      })
      .finally(() => {
        bouton.disabled = false;
      });
  });

  // Photos seules, portée "filtrée" (retour utilisateur, 2026-08-30) --
  // distinct de l'export filtré juste au-dessus.
  document.getElementById("bouton-photos-filtre").addEventListener("click", () => {
    const idsPhotos = [...new Set(entreesFiltrees().flatMap((e) => e.photoIds || []))];
    if (idsPhotos.length === 0) {
      afficherToast(t(currentLanguage, "photosAucunePhoto"));
      return;
    }
    const bouton = document.getElementById("bouton-photos-filtre");
    bouton.disabled = true;
    afficherToast(t(currentLanguage, "photosEnCours"));
    partagerOuTelechargerPhotosParId(idsPhotos)
      .catch((erreur) => {
        console.warn("Échec du téléchargement des photos filtrées :", erreur);
        afficherToast(t(currentLanguage, "photosErreur"));
      })
      .finally(() => {
        bouton.disabled = false;
      });
  });

  document.getElementById("position-recapturer").addEventListener("click", demarrerCaptureGPS);
  document.getElementById("position-retirer").addEventListener("click", retirerPosition);
  document.getElementById("position-choisir-carte").addEventListener("click", ouvrirPickerPosition);
  document.getElementById("picker-annuler").addEventListener("click", fermerPickerPosition);
  document.getElementById("picker-valider").addEventListener("click", validerPickerPosition);
}

applyTranslations();
initNavigation();
initFormulaire();
chargerEntrees().then(() => {
  if (!verifierChangementVersion()) verifierRappelExport();
});
