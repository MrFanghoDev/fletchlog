/* Traductions partagées entre index.html, app.html et aide.html --
 * même mécanisme que fletchtime/web/i18n.js (dictionnaire + fonction
 * t(), chaque page applique elle-même les traductions à ses éléments
 * [data-i18n]/[data-i18n-placeholder]/[data-i18n-aria-label]).
 */
const TRANSLATIONS = {
  fr: {
    siteFooterCredit: "Développé pour les Archers Libres de Fontaine-le-Port ·",
    siteFooterLicense: "Licence GPLv3",
    homeFooterDevLink: "Dépôt GitHub",

    homeTagline: "Carnet personnel pour archers FFTL/IFAA -- lieux, cibles, disciplines.",
    homeBlurb: "Mémorise où et sur quoi tu as tiré : lieu, cible, discipline, distance, météo, photo. Entraînement informel et tir nature compris, pas seulement les compétitions officielles. Installable sur ton téléphone, fonctionne hors connexion, aucune donnée envoyée sur un serveur.",
    homeStatusTitle: "État du projet",
    homeStatusText: "En cours de construction -- les fonctionnalités arrivent progressivement, suivies sur GitHub.",
    homeAppTitle: "Ouvrir FletchLog",
    homeAppDesc: "Le carnet lui-même -- installe-le sur ton téléphone pour un accès hors ligne.",
    homeAppButton: "Ouvrir l'appli",
    homeHelpTitle: "Aide",
    homeHelpDesc: "Comment installer et utiliser FletchLog.",
    homeHelpButton: "Consulter l'aide",

    navListe: "Liste",
    navCarte: "Carte",
    viewListePlaceholder: "Vue Liste -- à venir (voir l'issue #3).",
    viewCartePlaceholder: "Vue Carte -- à venir (voir l'issue #7).",
    fabTitle: "Ajouter une sortie -- bientôt disponible",
    fabToast: "Ajout d'une sortie -- bientôt disponible (issue #3)",
    themeSystemLabel: "Thème système",
    themeLightLabel: "Thème clair",
    themeDarkLabel: "Thème sombre",

    aideBack: "← Retour à l'accueil",
    aideTitle: "Aide",
    aideTocLabel: "Sommaire",
    aideS1Title: "Installer FletchLog",
    aideS1Text: "FletchLog est une Progressive Web App (PWA) : elle s'installe comme une vraie appli, sans passer par un store.",
    aideS1AndroidTitle: "Sur Android (Chrome)",
    aideS1AndroidLi1: "Ouvre FletchLog dans Chrome.",
    aideS1AndroidLi2: "Menu ⋮ (en haut à droite) → \"Installer l'application\" (ou \"Ajouter à l'écran d'accueil\").",
    aideS1AndroidLi3: "Confirme -- une icône FletchLog apparaît sur ton écran d'accueil, et l'appli s'ouvre directement sur ton carnet, sans passer par cette page.",
    aideS1OfflineTitle: "Fonctionnement hors connexion",
    aideS1OfflineText: "Une fois ouverte au moins une fois, l'appli continue de fonctionner sans réseau -- utile sur un pas de tir ou en pleine nature.",
    aideS2Title: "Utiliser FletchLog",
    aideS2Text: "Le projet est en tout début de construction : la navigation entre les vues Liste et Carte existe déjà, mais l'ajout réel d'une sortie (formulaire, photo, géolocalisation) arrive au fil des prochaines mises à jour. Le détail de chaque fonctionnalité et son avancement se suivent sur la page Issues du dépôt GitHub.",
    aideS3Title: "Tes données restent sur ton téléphone",
    aideS3Text: "FletchLog ne dépend d'aucun serveur : tout est stocké localement sur ton appareil. Une fonctionnalité d'export/import est prévue pour sauvegarder ton carnet ou changer de téléphone.",
  },
  en: {
    siteFooterCredit: "Built for the Archers Libres de Fontaine-le-Port ·",
    siteFooterLicense: "GPLv3 License",
    homeFooterDevLink: "GitHub repository",

    homeTagline: "Personal shooting log for FFTL/IFAA archers -- locations, targets, disciplines.",
    homeBlurb: "Remember where and on what you shot: location, target, discipline, distance, weather, photo. Casual practice and field shoots included, not just official competitions. Installable on your phone, works offline, no data sent to a server.",
    homeStatusTitle: "Project status",
    homeStatusText: "Under active construction -- features are landing progressively, tracked on GitHub.",
    homeAppTitle: "Open FletchLog",
    homeAppDesc: "The log itself -- install it on your phone for offline access.",
    homeAppButton: "Open the app",
    homeHelpTitle: "Help",
    homeHelpDesc: "How to install and use FletchLog.",
    homeHelpButton: "View help",

    navListe: "List",
    navCarte: "Map",
    viewListePlaceholder: "List view -- coming soon (see issue #3).",
    viewCartePlaceholder: "Map view -- coming soon (see issue #7).",
    fabTitle: "Add a session -- coming soon",
    fabToast: "Adding a session -- coming soon (issue #3)",
    themeSystemLabel: "System theme",
    themeLightLabel: "Light theme",
    themeDarkLabel: "Dark theme",

    aideBack: "← Back to home",
    aideTitle: "Help",
    aideTocLabel: "Contents",
    aideS1Title: "Installing FletchLog",
    aideS1Text: "FletchLog is a Progressive Web App (PWA): it installs like a real app, without going through a store.",
    aideS1AndroidTitle: "On Android (Chrome)",
    aideS1AndroidLi1: "Open FletchLog in Chrome.",
    aideS1AndroidLi2: "Menu ⋮ (top right) → \"Install app\" (or \"Add to Home screen\").",
    aideS1AndroidLi3: "Confirm -- a FletchLog icon appears on your home screen, and the app opens straight to your log, without going through this page.",
    aideS1OfflineTitle: "Offline use",
    aideS1OfflineText: "Once opened at least once, the app keeps working without a network connection -- useful on a shooting line or out in the field.",
    aideS2Title: "Using FletchLog",
    aideS2Text: "The project is at a very early stage: navigating between the List and Map views already works, but actually adding a session (form, photo, geolocation) is landing over the next updates. Track each feature and its progress on the GitHub repository's Issues page.",
    aideS3Title: "Your data stays on your phone",
    aideS3Text: "FletchLog doesn't depend on any server: everything is stored locally on your device. An export/import feature is planned to back up your log or switch phones.",
  },
};

function t(lang, key) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.fr;
  return dict[key] !== undefined ? dict[key] : (TRANSLATIONS.fr[key] || key);
}
