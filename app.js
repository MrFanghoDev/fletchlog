// Script propre à app.html -- navigation Liste/Carte, vue Liste (#3 :
// cartes, filtres, formulaire d'ajout/édition), FAB, glue i18n. Voir
// storage.js pour la persistance, i18n.js pour le dictionnaire,
// theme.js pour la bascule de thème (partagés avec index.html/aide.html).

let currentLanguage = localStorage.getItem("fletchlog_lang") || "fr";
let entreesActuelles = [];
let idEnEdition = null;
let photosCache = {}; // photoId -> URL d'objet (voir précharcherPhotos)
let photoSelectionnee = null; // File choisi dans le formulaire, pas encore compressé/stocké
let photoRetiree = false; // true si l'utilisateur a retiré la photo existante en édition
let gpsLat = null; // coordonnées capturées pour la nouvelle entrée en cours (issue #6)
let gpsLon = null;

const ICONE_PIN =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="var(--gold)" stroke="none"><path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/></svg>';
const ICONE_CHEVRON =
  '<svg class="carte-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>';
const ICONE_PLACEHOLDER_PHOTO =
  '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="1.6"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2" fill="var(--text-faint)" stroke="none"/></svg>';

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

function carteHTML(entree) {
  const meteoIcone = ICONES_METEO[entree.meteo];
  const meteoLigne =
    entree.meteo !== "aucune" && meteoIcone
      ? `<div class="carte-meteo">${meteoIcone}<span>${_echapperTexte(t(currentLanguage, "meteo" + entree.meteo.charAt(0).toUpperCase() + entree.meteo.slice(1)))}</span></div>`
      : "";
  const sousLigne = [entree.distance, formaterDate(entree.date)].filter((v) => v && v.trim()).join(" · ");
  const urlPhoto = entree.photoId ? photosCache[entree.photoId] : null;
  const vignette = urlPhoto ? `<img src="${urlPhoto}" alt="">` : ICONE_PLACEHOLDER_PHOTO;

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
      <div class="carte-vignette">${vignette}</div>
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

function rafraichirListe() {
  const conteneur = document.getElementById("liste-cartes");
  const vide = document.getElementById("liste-vide");
  const filtrees = entreesFiltrees();

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
  '<svg viewBox="0 0 24 24"><path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8Z" fill="var(--gold)"/><circle cx="12" cy="10" r="3.1" fill="#1a1206"/></svg>';

function projeterCoordonnees(entrees) {
  const MARGE = 12; // % de marge de chaque côté, pins jamais collés au bord
  const lats = entrees.map((e) => e.lat);
  const lons = entrees.map((e) => e.lon);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lonMin = Math.min(...lons);
  const lonMax = Math.max(...lons);
  return entrees.map((e) => ({
    ...e,
    xPct: lonMax === lonMin ? 50 : MARGE + ((e.lon - lonMin) / (lonMax - lonMin)) * (100 - 2 * MARGE),
    // latitude inversée : plus au nord (lat plus grande) = plus haut à l'écran (y plus petit)
    yPct: latMax === latMin ? 50 : MARGE + ((latMax - e.lat) / (latMax - latMin)) * (100 - 2 * MARGE),
  }));
}

function fermerApercuCarte() {
  const apercu = document.getElementById("carte-apercu");
  apercu.hidden = true;
  apercu.onclick = null;
  document.querySelectorAll(".pin-carte.active").forEach((p) => p.classList.remove("active"));
}

function afficherApercuCarte(entree, pinElement) {
  document.querySelectorAll(".pin-carte.active").forEach((p) => p.classList.remove("active"));
  pinElement.classList.add("active");

  const titreAffiche = entree.titre && entree.titre.trim() ? entree.titre : entree.lieu;
  const sousLigne = [entree.distance, formaterDate(entree.date)].filter((v) => v && v.trim()).join(" · ");
  const urlPhoto = entree.photoId ? photosCache[entree.photoId] : null;
  const vignette = urlPhoto ? `<img src="${urlPhoto}" alt="">` : ICONE_PLACEHOLDER_PHOTO;

  const apercu = document.getElementById("carte-apercu");
  apercu.innerHTML = `
    <div class="carte-vignette">${vignette}</div>
    <div class="carte-texte">
      <div class="carte-titre"><span>${_echapperTexte(titreAffiche)}</span></div>
      <span class="carte-sous">${_echapperTexte(sousLigne)}</span>
    </div>
    ${ICONE_CHEVRON}
  `;
  apercu.hidden = false;
  apercu.onclick = () => ouvrirFormulaire(entree.id);
}

function rafraichirCarte() {
  const conteneur = document.getElementById("carte-conteneur");
  const vide = document.getElementById("carte-vide");

  conteneur.querySelectorAll(".pin-carte").forEach((p) => p.remove());
  fermerApercuCarte();

  const entreesAvecGPS = entreesFiltrees().filter((e) => e.lat != null && e.lon != null);
  vide.hidden = entreesAvecGPS.length > 0;
  if (!entreesAvecGPS.length) return;

  projeterCoordonnees(entreesAvecGPS).forEach((entree) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "pin-carte";
    bouton.style.left = `${entree.xPct}%`;
    bouton.style.top = `${entree.yPct}%`;
    bouton.dataset.id = entree.id;
    bouton.innerHTML = ICONE_PIN_CARTE;
    bouton.addEventListener("click", () => afficherApercuCarte(entree, bouton));
    conteneur.appendChild(bouton);
  });
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
  const idsPhotos = [...new Set(entrees.map((e) => e.photoId).filter(Boolean))];
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

// ---- Photo (issue #4) ----------------------------------------------

let urlApercuTemporaire = null; // object URL du fichier tout juste choisi, pas encore stocké

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

function afficherApercuPlaceholder() {
  document.getElementById("photo-preview").innerHTML = ICONE_PLACEHOLDER_PHOTO;
  document.getElementById("photo-retirer").hidden = true;
}

function afficherApercuUrl(url) {
  document.getElementById("photo-preview").innerHTML = `<img src="${url}" alt="">`;
  document.getElementById("photo-retirer").hidden = false;
}

function resoudrePhotoPourEnvoi(entreeExistante) {
  const ancienPhotoId = entreeExistante ? entreeExistante.photoId : null;

  if (photoSelectionnee) {
    return compresserPhoto(photoSelectionnee)
      .then((blob) => enregistrerPhoto(blob))
      .then((nouvelId) => {
        if (ancienPhotoId) supprimerPhoto(ancienPhotoId).catch(() => {});
        return nouvelId;
      });
  }
  if (photoRetiree) {
    if (ancienPhotoId) supprimerPhoto(ancienPhotoId).catch(() => {});
    return Promise.resolve(null);
  }
  return Promise.resolve(ancienPhotoId);
}

// ---- Géolocalisation (issue #6) -------------------------------------
// Capturée automatiquement à l'ouverture du formulaire d'AJOUT
// seulement (pas en édition -- les coordonnées d'une entrée existante
// ne sont jamais recapturées ni modifiables ici, voir #15). Coordonnées
// brutes stockées telles quelles, aucun reverse-geocoding (voir
// CLAUDE.md -- resterait offline-first).

function afficherStatutGPS(etat) {
  const conteneur = document.getElementById("gps-statut");
  const texte = document.getElementById("gps-statut-texte");
  conteneur.classList.remove("ok", "erreur");
  if (etat === "inactif") {
    conteneur.hidden = true;
    return;
  }
  conteneur.hidden = false;
  if (etat === "loading") {
    texte.setAttribute("data-i18n", "gpsEnCours");
    texte.textContent = t(currentLanguage, "gpsEnCours");
  } else if (etat === "ok") {
    conteneur.classList.add("ok");
    texte.setAttribute("data-i18n", "gpsCapturee");
    texte.textContent = t(currentLanguage, "gpsCapturee");
  } else {
    conteneur.classList.add("erreur");
    texte.setAttribute("data-i18n", "gpsIndisponible");
    texte.textContent = t(currentLanguage, "gpsIndisponible");
  }
}

function demarrerCaptureGPS() {
  gpsLat = null;
  gpsLon = null;
  if (!("geolocation" in navigator)) {
    afficherStatutGPS("erreur");
    return;
  }
  afficherStatutGPS("loading");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      gpsLat = position.coords.latitude;
      gpsLon = position.coords.longitude;
      afficherStatutGPS("ok");
    },
    () => afficherStatutGPS("erreur"),
    { timeout: 8000 }
  );
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

  photoSelectionnee = null;
  photoRetiree = false;
  document.getElementById("champ-photo").value = "";
  if (urlApercuTemporaire) {
    URL.revokeObjectURL(urlApercuTemporaire);
    urlApercuTemporaire = null;
  }
  if (entree && entree.photoId && photosCache[entree.photoId]) {
    afficherApercuUrl(photosCache[entree.photoId]);
  } else {
    afficherApercuPlaceholder();
  }

  if (entree) {
    afficherStatutGPS("inactif");
  } else {
    demarrerCaptureGPS();
  }

  document.getElementById("form-overlay").hidden = false;
  document.getElementById("champ-lieu").focus();
}

function fermerFormulaire() {
  document.getElementById("form-overlay").hidden = true;
  idEnEdition = null;
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

  resoudrePhotoPourEnvoi(entreeExistante)
    .then((photoId) => {
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
        photoId,
      };
      // Coordonnées GPS uniquement à l'ajout (capturées par
      // demarrerCaptureGPS() à l'ouverture du formulaire) -- en
      // édition, donnees n'a pas de lat/lon, le spread ci-dessous
      // préserve donc celles déjà enregistrées sur l'entrée (#15 pour
      // une édition manuelle, hors périmètre ici).
      if (!idEnEdition) {
        donnees.lat = gpsLat;
        donnees.lon = gpsLon;
      }
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
      .then(() => (entree && entree.photoId ? supprimerPhoto(entree.photoId).catch(() => {}) : null))
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
    if (!fichier) return;
    photoSelectionnee = fichier;
    photoRetiree = false;
    if (urlApercuTemporaire) URL.revokeObjectURL(urlApercuTemporaire);
    urlApercuTemporaire = URL.createObjectURL(fichier);
    afficherApercuUrl(urlApercuTemporaire);
  });
  document.getElementById("photo-retirer").addEventListener("click", () => {
    photoSelectionnee = null;
    photoRetiree = true;
    document.getElementById("champ-photo").value = "";
    if (urlApercuTemporaire) {
      URL.revokeObjectURL(urlApercuTemporaire);
      urlApercuTemporaire = null;
    }
    afficherApercuPlaceholder();
  });
  ["filtre-discipline", "filtre-distance", "filtre-lieu", "filtre-label"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => {
      const select = document.getElementById(id);
      select.classList.toggle("active", select.value !== "");
      rafraichirAffichage();
    });
  });
  document.getElementById("recherche-commentaire").addEventListener("input", () => rafraichirAffichage());
}

applyTranslations();
initNavigation();
initFormulaire();
chargerEntrees();
