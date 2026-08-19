# Instructions pour Claude sur FletchLog

Ce fichier condense les règles techniques et les décisions propres à
FletchLog. Pour notre façon de travailler ensemble (commune aux quatre
projets frères -- fletchapps/fletchscore/fletchtime/fletchlog), voir le
`CLAUDE.md` global (`~/.claude/CLAUDE.md`), toujours chargé
automatiquement -- notamment la section "Dépendances -- principe
partagé", écrite en clarifiant ce projet.

## Contexte en une phrase

FletchLog est un carnet personnel pour archers FFTL/IFAA : mémoriser où
et sur quoi on a tiré (lieu, cible/blason, discipline, distance, météo,
photo) -- entraînement informel et tir nature compris, pas seulement les
compétitions officielles déjà couvertes par FletchScore. Indépendant des
trois autres projets : pas de lien technique avec FletchScore/FletchTime,
juste la même famille visuelle et les mêmes gens qui l'utilisent.

## Décisions actées (2026-08-18, avant tout code)

Discussion complète dans la conversation d'origine -- résumé ici pour ne
pas la reperdre :

- **Public/open source, comme les trois autres** -- mais sans service
  central hébergé : "public" veut dire "n'importe quel archer peut
  installer et faire tourner", pas "compte sur un serveur que je gère".
- **Aucun serveur permanent.** Toutes les données restent en local sur
  l'appareil (IndexedDB). Export/import manuel pour sauvegarder/partager
  -- pas de synchronisation temps réel prévue pour la v1 (décision
  explicite, à revisiter seulement si un vrai besoin apparaît).
- **PWA installable, Android uniquement pour la v1.** iOS a un stockage
  PWA notoirement peu fiable (Safari peut évincer les données d'un site
  rarement rouvert) -- risque réel pour un carnet avec photos, écarté en
  ciblant Android/Chrome pour l'instant plutôt que de gérer ce risque dès
  le MVP.
- **JS/HTML/CSS vanilla, sans framework ni build step** -- cohérent avec
  fletchapps et les pages web de fletchscore/fletchtime. Une bibliothèque
  connue et éprouvée reste bienvenue quand elle évite de réinventer
  quelque chose de non trivial (voir le principe de dépendances dans le
  CLAUDE.md global) -- ex. JSZip prévu pour l'export `.zip` (photos +
  métadonnées), pas encore intégré.
- **Contenu d'une entrée** : lieu (nom saisi à la main + coordonnées GPS
  brutes, capturées automatiquement -- pas de reverse-geocoding, qui
  demanderait du réseau), cible/blason, discipline, distance, météo
  (saisie manuelle, pas d'API externe), photo (dès la v1).
- **Photo** : `<input type="file" capture="environment">` plutôt que
  `getUserMedia` -- ouvre l'appareil photo natif directement, plus simple
  et plus fiable pour un MVP qu'un flux caméra live. Compression
  obligatoire avant stockage (redimensionner + JPEG qualité ~0.7 via
  `canvas`) pour ne pas saturer le stockage du téléphone.
- **Hébergement** : nouveau dépôt GitHub Pages (comme fletchapps),
  servi une première fois puis mis en cache offline par un service
  worker. **Nuance PWA à retenir** : le service worker refuse de
  s'enregistrer sous le protocole `file://` dans la plupart des
  navigateurs -- même en local, servir via un petit serveur statique
  (`python3 -m http.server` depuis le dossier, ou équivalent), jamais en
  ouvrant `index.html` directement.
- **`start_url` du manifest = `index.html` (accueil), pas `app.html`**
  -- revenu en arrière après une vraie installation/test par
  l'utilisateur (issue #8, 2026-08-19). Le raisonnement initial ("l'icône
  installée doit ouvrir directement le carnet") oubliait un point : le
  service worker met déjà TOUTES les pages en cache dès la première
  visite, donc l'accès hors ligne à l'aide ne dépendait pas de
  `start_url` -- le vrai blocage, c'est qu'`app.html` n'a aucun lien de
  retour vers l'accueil/l'aide (choix délibéré, comme `control.html` de
  FletchTime). Repartir sur l'accueil comme point d'entrée règle ça
  simplement (accueil -> app -> retour via le geste natif -> aide),
  sans avoir à ajouter un lien dans `app.html`.
- **Icônes PNG (192×192, 512×512) obligatoires dans `manifest.json`,
  le SVG seul ne suffit pas pour une vraie installation WebAPK
  Android.** Repéré après coup (2026-08-19) : l'utilisateur voyait un
  bandeau navigateur (nom du site) même sur le dialogue de confirmation
  maison, symptôme que Chrome n'installait pas un vrai WebAPK standalone
  mais retombait sur un mode "raccourci"/minimal-ui qui garde du chrome
  navigateur visible. `manifest.json` ne déclarait qu'une icône SVG
  (`"sizes": "any"`) -- combinaison documentée comme cassant
  l'installation dans un bug Chromium connu
  ([issues.chromium.org/issues/40925759](https://issues.chromium.org/issues/40925759)),
  et 192×192/512×512 en PNG sont les deux tailles que le spec Web App
  Manifest et la vérification d'installabilité de Chrome attendent
  réellement (voir [web.dev/articles/add-manifest](https://web.dev/articles/add-manifest)
  et [MDN -- icons](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons)).
  Corrigé : `icon-192.png`/`icon-512.png` générés depuis `icon.svg`
  (`magick -background none icon.svg -resize NxN icon-N.png`, nécessite
  `apk add librsvg` pour le délégué SVG d'ImageMagick) et déclarés à la
  place du SVG dans `manifest.json` -- `icon.svg` reste utilisé comme
  favicon (`<link rel="icon">`), juste retiré des icônes du manifest.
  **Non encore reconfirmé sur un vrai appareil après ce correctif** --
  à vérifier à la prochaine réinstallation.
- **Palette/identité visuelle** : reprise telle quelle de
  `fletchapps/theme.css` (canonique, voir la section "Design partagé"
  du CLAUDE.md global) -- copié dans ce dépôt (`theme.css`), pas de lien
  externe. Look and feel initial (vues Liste/Carte, chips de filtre,
  nav basse, FAB) validé par l'utilisateur via un mockup Claude Design,
  avant tout code -- direction actée, pas à reproposer.
- **Nom retenu** : FletchLog (plutôt que FletchMap envisagé un temps) --
  l'action centrale du MVP est un journal/carnet ("log"), pas une vue
  cartographique en tant que fonctionnalité phare ; "Map" redeviendrait
  pertinent si une vraie vue carte devenait centrale plus tard.
- **Logo définitif (issue #19, 2026-08-19)** : `icon.svg` -- cible
  (deux anneaux concentriques) **aplatie** en ellipses pour un effet
  de perspective ("vue de côté"), avec un **map pin** dessiné
  par-dessus dont la pointe touche un petit point central marquant le
  milieu de la cible. Direction validée par l'utilisateur après deux
  itérations visuelles (mockups publiés en Artifact, jamais appliquées
  au dépôt avant validation explicite) -- une première piste
  (silhouette pin ovale + empennage à 3 pales) écartée, l'empennage
  jugé superflu. `icon-192.png`/`icon-512.png` régénérés depuis ce
  nouveau `icon.svg` (même commande `magick`+`librsvg` que d'habitude).
  **Le pin générique de la vue Carte (`ICONE_PIN_CARTE` dans
  `app.js`) n'a volontairement PAS été aligné sur ce nouveau tracé**
  -- question posée explicitement, réponse : non, les deux restent
  indépendants.
  **Non fait non plus, hors périmètre de ce ticket** : les petites
  icônes de marque en ligne (24×24, trait fin) utilisées comme logo
  compact dans les en-têtes d'`index.html`/`app.html`/`aide.html`, et
  le placeholder de vignette photo (`ICONE_PLACEHOLDER_PHOTO` dans
  `app.js`) -- gardent l'ancien motif "cercles concentriques" simple.
  Une vraie divergence visuelle existe désormais entre l'icône d'app
  (nouveau pin+cible aplatie) et ces petites icônes de navigation
  (ancien bullseye) -- signalé ici pour ne pas l'oublier, pas encore
  un ticket dédié.

## Conventions techniques (à compléter au fil du code)

- Pas de backend, pas de dépendance Python -- ce dépôt n'a pas vocation à
  avoir de `.venv`/`pyproject.toml` comme ses trois frères.
- **`CACHE_NAME` dans `sw.js` à incrémenter à CHAQUE ticket qui modifie
  le contenu d'un fichier déjà précaché** (`app.html`, `app.js`,
  `i18n.js`, `theme.css`...), même si aucun nouveau fichier n'est
  ajouté à `FICHIERS_A_METTRE_EN_CACHE`. Raison : le navigateur ne
  redétecte une mise à jour du service worker que si les octets de
  `sw.js` lui-même changent -- si seul le contenu d'`app.js` change
  sans toucher `sw.js`, `install()` ne se redéclenche jamais et les
  utilisateurs déjà installés restent bloqués sur l'ancienne version
  indéfiniment. Piège réel, pas théorique : repéré en livrant #3 alors
  que l'utilisateur avait déjà FletchLog installé.
- **Vérification réelle (confirmé issue #1, 2026-08-19)** : `chromium` +
  `chromedriver` sont installés dans cet environnement -- Selenium (déjà
  utilisé côté FletchScore pour ses pages web, voir son CLAUDE.md)
  permet de vraiment cliquer les boutons, vérifier le `data-theme`,
  `localStorage`, et l'état du service worker
  (`navigator.serviceWorker.getRegistrations()`), pas seulement relire
  le code. Binaires à passer explicitement à Selenium
  (`options.binary_location = "/usr/bin/chromium"`,
  `Service("/usr/bin/chromedriver")`) -- `webdriver.Chrome()` seul
  échoue ici (`Unsupported platform/architecture: linux/aarch64`,
  le "Selenium Manager" intégré ne connaît pas cette plateforme).
  **Nuance à garder en tête** : ça reste un navigateur headless
  automatisé, pas un vrai téléphone -- l'installabilité PWA réelle
  ("Ajouter à l'écran d'accueil", heuristiques internes de Chrome) n'est
  pas vérifiable de cette façon, seulement le manifest/service worker/
  comportement offline. Non encore testé sur un vrai appareil Android.
- `selenium` n'est pas dans les dépendances du projet (pas de
  `pyproject.toml` ici) -- installé au besoin dans un des `.venv`
  partagés de la machine (ex. `/home/claude/.venv`) uniquement pour la
  vérification, jamais comme dépendance de l'appli elle-même.
- **Chromium headless de cet environnement n'a pas les polices Unicode
  courantes par défaut** (confirmé issue #8, même famille de problème
  que l'emoji manquant documenté côté FletchScore) -- une flèche "←"
  ou un caractère comme "⋮" s'affichait en tofu/carré vide dans les
  captures Selenium avant `apk add font-noto` (paquet `font-noto-symbols`
  notamment). Purement un manque de police de cet environnement de
  vérification -- un vrai téléphone Android a une couverture Unicode
  complète (Noto/Roboto), ne pas confondre avec un bug réel de l'appli.

## Stockage (issue #2, décidé)

- `storage.js` : wrapper maison au-dessus de `indexedDB` natif (pas de
  lib -- API brute suffisante ici, voir le principe de dépendances).
  Base `fletchlog`, store `entrees` (schéma détaillé en tête de
  `storage.js`) + store `photos` (Blobs, clé = `photoId`) créé dès
  maintenant même si #4 ne l'alimente pas encore -- éviter une
  deuxième migration de version IndexedDB pour un champ déjà connu du
  schéma de #2.
- **Météo en liste fermée** (`METEO_OPTIONS`), pas en texte libre --
  décidé en écrivant #2 : une liste fermée permet une icône cohérente
  par entrée dans la vue Liste (#3), un texte libre non.
- **Pas de framework de test JS ajouté.** Le projet n'a ni build ni
  `npm`/`package.json` -- vérification réelle via Selenium + Chromium
  (déjà la convention établie, voir plus haut) qui exécute directement
  le vrai `indexedDB` du navigateur, plutôt qu'un polyfill/mock en
  Node qui testerait une simulation. Plus proche de l'esprit
  "vérification réelle" du projet qu'un test unitaire isolé.

## Versions (décidé 2026-08-19)

Pas de mécanisme comme `setuptools_scm` côté FletchScore/FletchTime
(dérivation de version depuis les tags git, affichée dans un footer) --
inapplicable ici, aucun backend Python, aucun paquet à publier. Avant
cette date, aucune gestion de version du tout : ni tag git, ni Release
GitHub, ni champ `version` dans `manifest.json` -- seul existait
`CACHE_NAME` dans `sw.js`, un simple compteur de cache-busting interne
(incrémenté à chaque ticket qui modifie un fichier déjà précaché, voir
plus haut), sans rapport avec un numéro de version affiché ou suivi.

Décision : **tags git + Release GitHub aux jalons**, posés à la main
(pas de CI/build à déclencher comme chez les deux autres projets --
purement déclaratif, juste un repère dans l'historique).

**Numéro affiché dans le footer** (issue #20, décidé dans la foulée) :
`version.js` -- une seule constante `FLETCHLOG_VERSION`, maintenue à
la main, à mettre à jour à chaque tag posé (pas de dérivation
automatique possible sans build). Affiché dans le footer d'`index.html`
et `aide.html` (les deux pages qui ont déjà un footer) -- pas dans
`app.html`, qui n'en a pas.

## Export/import (issue #5, décidé)

- **JSZip vendoré** (`jszip.min.js`, v3.10.1, téléchargé depuis unpkg
  et committé -- jamais chargé depuis un CDN à l'exécution, voir le
  principe de dépendances du CLAUDE.md global). Dual MIT/GPLv3,
  compatible avec la licence du dépôt.
- Archive `.zip` : `entrees.json` (métadonnées de toutes les entrées)
  + un fichier par photo sous `photos/<photoId>.jpg` -- pas de base64
  (gonflerait l'archive d'environ un tiers pour rien).
- **Doublons à l'import : ignorés, jamais écrasés ni dupliqués.**
  Décidé en écrivant le ticket plutôt que deviné : réimporter deux
  fois la même sauvegarde doit être sans effet la seconde fois
  (idempotent) -- `storage.js::restaurerEntree`/`restaurerPhoto`
  utilisent `add()` (pas `put()`), qui échoue silencieusement
  (résout `false`) si l'id existe déjà, portant cette garantie au
  niveau de la base plutôt que dans l'UI.
- Livraison : `Web Share API` (partage natif Android) si
  `navigator.canShare` l'accepte, repli sur un lien de téléchargement
  classique sinon (ou si le partage est annulé/échoue).
- UI dans `aide.html` (section "Tes données restent sur ton
  téléphone", cohérent avec le contenu déjà là) -- pas dans `app.html`,
  qui n'a pas d'écran de réglages.

## Pas encore tranché

- Découpage exact des tickets au-delà du premier jalon.
