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

const ICONE_PIN =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="var(--gold)" stroke="none"><path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/></svg>';
const ICONE_CHEVRON =
  '<svg class="carte-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>';
const ICONE_PLACEHOLDER_PHOTO =
  '<svg width="26" height="26" viewBox="0 0 24 24"><ellipse cx="12" cy="15.94" rx="7.03" ry="2.91" fill="none" stroke="#0f1216" stroke-width="1.7"/><ellipse cx="12" cy="15.94" rx="7.03" ry="2.91" fill="none" stroke="var(--text-faint)" stroke-width="1.125"/><ellipse cx="12" cy="15.94" rx="4.125" ry="1.6875" fill="none" stroke="#0f1216" stroke-width="1.7"/><ellipse cx="12" cy="15.94" rx="4.125" ry="1.6875" fill="none" stroke="var(--text-faint)" stroke-width="1.125"/><g transform="translate(5.8125,4.59375) scale(0.515625)"><path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" fill="var(--text-faint)" stroke="#0f1216" stroke-width="1"/></g><circle cx="12" cy="15.94" r="0.5625" fill="var(--text-faint)"/></svg>';

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

function initNavigation() {
  document.querySelectorAll(".nav-btn").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      const vue = bouton.dataset.view;
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b === bouton));
      document.querySelectorAll(".view").forEach((section) => {
        section.classList.toggle("active", section.id === `view-${vue}`);
      });
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
  return entreesActuelles.filter(
    (e) =>
      (!discipline || e.discipline === discipline) &&
      (!distance || e.distance === distance) &&
      (!lieu || e.lieu === lieu) &&
      (!label || (e.labels || []).includes(label)) &&
      (!recherche || (e.commentaire || "").toLowerCase().includes(recherche))
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

function rafraichirListe() {
  const conteneur = document.getElementById("liste-cartes");
  const vide = document.getElementById("liste-vide");
  const filtrees = trierEntrees(entreesFiltrees());

  conteneur.innerHTML = filtrees.map(carteHTML).join("");
  vide.hidden = entreesActuelles.length > 0;
  conteneur.hidden = entreesActuelles.length === 0;

  conteneur.querySelectorAll(".carte-entree").forEach((bouton) => {
    bouton.addEventListener("click", () => ouvrirFormulaire(bouton.dataset.id));
  });
}

// ---- Vue Carte (issue #7) -- pins projetés depuis les coordonnées
// GPS réelles (#6), pas de positions inventées. Représentation
// stylisée (pas de vraies tuiles géographiques, voir #13 si besoin un
// jour) : projection linéaire simple sur le rectangle disponible,
// suffisante pour un carnet perso couvrant une zone restreinte -- pas
// une vraie projection cartographique.

// #1a1206 en dur, pas var(--goldText) -- pas de token dédié dans
// theme.css, même choix que le FAB (voir .fab svg) qui fait pareil.
const ICONE_PIN_CARTE =
  '<svg viewBox="0 0 24 24"><path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" fill="var(--gold)"/><circle cx="12" cy="10" r="3.1" fill="#1a1206"/></svg>';

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

function initCarte() {
  if (carteMap) return;
  carteMap = L.map("carte-leaflet", { attributionControl: true }).setView([46.6, 2.4], 5);
  ajouterCoucheTuilesOSM(carteMap);
  carteCouchePins = L.layerGroup().addTo(carteMap);
  new ControleLocaliser().addTo(carteMap);
}

// Bouton "me localiser" -- contrôle Leaflet custom (calqué visuellement
// sur .leaflet-bar, voir app.html) plutôt qu'un bouton HTML flottant à
// part, pour bénéficier gratuitement du positionnement/de l'anti-chevauchement
// que Leaflet gère déjà pour ses propres contrôles (zoom, attribution).
const ControleLocaliser = L.Control.extend({
  options: { position: "topright" },
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
  apercu.onclick = () => ouvrirFormulaire(entree.id);
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
      icon: L.divIcon({ className: "pin-carte", html: ICONE_PIN_CARTE, iconSize: [28, 28], iconAnchor: [14, 26] }),
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

function chargerEntrees() {
  return listerEntrees()
    .then((entrees) => {
      entreesActuelles = entrees;
      return precharcherPhotos(entrees);
    })
    .then(() => {
      rafraichirFiltres();
      rafraichirAffichage();
    });
}

// ---- Photo (issue #4, plusieurs photos depuis #12) ------------------

function compresserPhoto(fichier) {
  const LONGUEUR_MAX = 1600;
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(fichier);
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
  });
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
      return `
        <div class="photo-vignette-form">
          ${contenu}
          <button type="button" class="photo-vignette-retirer" data-index="${index}" data-i18n-aria-label="formPhotoRetirer" aria-label="${t(currentLanguage, "formPhotoRetirer")}">✕</button>
        </div>
      `;
    })
    .join("");
  const boutonAjouter =
    photosFormulaire.length < MAX_PHOTOS
      ? `<button type="button" class="photo-ajouter" id="photo-ajouter" data-i18n-aria-label="formPhotoChoisir" aria-label="${t(currentLanguage, "formPhotoChoisir")}">+</button>`
      : "";
  galerie.innerHTML = vignettes + boutonAjouter;
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
  } else {
    carteMapPicker.setView(centre, zoom);
  }
  requestAnimationFrame(() => carteMapPicker.invalidateSize());
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
  rendrePhotosGalerie();

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

  resoudrePhotosPourEnvoi(entreeExistante)
    .then((photoIds) => {
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
      fermerFormulaire();
      afficherToast(t(currentLanguage, "toastEnregistre"));
      return chargerEntrees();
    })
    .catch((erreur) => {
      console.warn("Échec de l'enregistrement :", erreur);
      document.getElementById("form-erreur").hidden = false;
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

function supprimerDepuisFormulaire() {
  if (!idEnEdition) return;
  const entree = entreesActuelles.find((e) => e.id === idEnEdition);
  demanderConfirmation(t(currentLanguage, "confirmSuppression")).then((confirme) => {
    if (!confirme) return;
    supprimerEntree(idEnEdition)
      .then(() => Promise.all((entree?.photoIds || []).map((id) => supprimerPhoto(id).catch(() => {}))))
      .then(() => {
        fermerFormulaire();
        afficherToast(t(currentLanguage, "toastSupprime"));
        chargerEntrees();
      });
  });
}

function initFormulaire() {
  document.getElementById("fab-add").addEventListener("click", () => ouvrirFormulaire(null));
  document.getElementById("form-annuler").addEventListener("click", fermerFormulaire);
  document.getElementById("form-supprimer").addEventListener("click", supprimerDepuisFormulaire);
  document.getElementById("form-entree").addEventListener("submit", soumettreFormulaire);
  document.getElementById("champ-photo").addEventListener("change", (evenement) => {
    const fichier = evenement.target.files[0];
    evenement.target.value = ""; // permet de resélectionner le même fichier ensuite
    if (fichier) ajouterPhotoFormulaire(fichier);
  });
  // Délégation -- les vignettes/le bouton "+" sont recréés à chaque
  // rendrePhotosGalerie(), pas de listener à reposer individuellement.
  document.getElementById("photo-galerie").addEventListener("click", (evenement) => {
    const boutonRetirer = evenement.target.closest(".photo-vignette-retirer");
    if (boutonRetirer) {
      retirerPhotoFormulaire(Number(boutonRetirer.dataset.index));
      return;
    }
    if (evenement.target.closest("#photo-ajouter")) {
      document.getElementById("champ-photo").click();
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
  document.getElementById("tri-liste").addEventListener("change", () => rafraichirListe());

  document.getElementById("position-recapturer").addEventListener("click", demarrerCaptureGPS);
  document.getElementById("position-retirer").addEventListener("click", retirerPosition);
  document.getElementById("position-choisir-carte").addEventListener("click", ouvrirPickerPosition);
  document.getElementById("picker-annuler").addEventListener("click", fermerPickerPosition);
  document.getElementById("picker-valider").addEventListener("click", validerPickerPosition);
}

applyTranslations();
initNavigation();
initFormulaire();
chargerEntrees();
