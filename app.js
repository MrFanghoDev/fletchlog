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
  rafraichirListe();
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

function rafraichirFiltres() {
  const selDiscipline = document.getElementById("filtre-discipline");
  const selDistance = document.getElementById("filtre-distance");
  const disciplineAvant = selDiscipline.value;
  const distanceAvant = selDistance.value;

  selDiscipline.innerHTML =
    `<option value="">${t(currentLanguage, "filtreToutesDisciplines")}</option>` +
    valeursDistinctes("discipline")
      .map((v) => `<option value="${_echapperAttr(v)}">${_echapperTexte(v)}</option>`)
      .join("");
  selDistance.innerHTML =
    `<option value="">${t(currentLanguage, "filtreToutesDistances")}</option>` +
    valeursDistinctes("distance")
      .map((v) => `<option value="${_echapperAttr(v)}">${_echapperTexte(v)}</option>`)
      .join("");

  // Restaure la sélection si la valeur existe toujours après le
  // rechargement des options (ex. après un changement de langue --
  // les valeurs viennent des données, pas du dictionnaire, donc rien
  // à traduire ici, juste à ne pas perdre le filtre en cours).
  if ([...selDiscipline.options].some((o) => o.value === disciplineAvant)) selDiscipline.value = disciplineAvant;
  if ([...selDistance.options].some((o) => o.value === distanceAvant)) selDistance.value = distanceAvant;

  selDiscipline.classList.toggle("active", selDiscipline.value !== "");
  selDistance.classList.toggle("active", selDistance.value !== "");
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
  return `
    <button type="button" class="carte-entree" data-id="${_echapperAttr(entree.id)}">
      <div class="carte-vignette">${vignette}</div>
      <div class="carte-texte">
        <div class="carte-titre">${ICONE_PIN}<span>${_echapperTexte(entree.lieu)}</span></div>
        <div class="carte-meta">
          ${entree.discipline ? `<span class="badge-discipline">${_echapperTexte(entree.discipline)}</span>` : ""}
          <span class="carte-sous">${_echapperTexte(sousLigne)}</span>
        </div>
        ${meteoLigne}
      </div>
      ${ICONE_CHEVRON}
    </button>
  `;
}

function entreesFiltrees() {
  const discipline = document.getElementById("filtre-discipline").value;
  const distance = document.getElementById("filtre-distance").value;
  return entreesActuelles.filter(
    (e) => (!discipline || e.discipline === discipline) && (!distance || e.distance === distance)
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
      rafraichirListe();
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

// ---- Formulaire d'ajout/édition ------------------------------------

function ouvrirFormulaire(id) {
  idEnEdition = id || null;
  const entree = id ? entreesActuelles.find((e) => e.id === id) : null;

  document.getElementById("form-titre").setAttribute("data-i18n", entree ? "formTitreEdition" : "formTitreAjout");
  document.getElementById("form-titre").textContent = t(currentLanguage, entree ? "formTitreEdition" : "formTitreAjout");
  document.getElementById("champ-lieu").value = entree ? entree.lieu : "";
  document.getElementById("champ-cible").value = entree ? entree.cible : "";
  document.getElementById("champ-discipline").value = entree ? entree.discipline : "";
  document.getElementById("champ-distance").value = entree ? entree.distance : "";
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

  document.getElementById("form-overlay").hidden = false;
  document.getElementById("champ-lieu").focus();
}

function fermerFormulaire() {
  document.getElementById("form-overlay").hidden = true;
  idEnEdition = null;
}

function soumettreFormulaire(evenement) {
  evenement.preventDefault();
  const lieu = document.getElementById("champ-lieu").value.trim();
  if (!lieu) {
    document.getElementById("form-erreur").hidden = false;
    return;
  }

  const entreeExistante = idEnEdition ? entreesActuelles.find((e) => e.id === idEnEdition) : null;

  resoudrePhotoPourEnvoi(entreeExistante)
    .then((photoId) => {
      const donnees = {
        lieu,
        cible: document.getElementById("champ-cible").value.trim(),
        discipline: document.getElementById("champ-discipline").value.trim(),
        distance: document.getElementById("champ-distance").value.trim(),
        meteo: document.getElementById("champ-meteo").value,
        date: document.getElementById("champ-date").value,
        photoId,
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
  document.getElementById("filtre-discipline").addEventListener("change", () => {
    document.getElementById("filtre-discipline").classList.toggle("active", document.getElementById("filtre-discipline").value !== "");
    rafraichirListe();
  });
  document.getElementById("filtre-distance").addEventListener("change", () => {
    document.getElementById("filtre-distance").classList.toggle("active", document.getElementById("filtre-distance").value !== "");
    rafraichirListe();
  });
}

applyTranslations();
initNavigation();
initFormulaire();
chargerEntrees();
