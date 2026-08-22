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
  **Précision du 2026-08-21** : `librsvg` seul n'a pas suffi une fois
  (délégué SVG d'ImageMagick en échec silencieux, "unable to read
  image data") -- le paquet qui fournit vraiment l'exécutable est
  `rsvg-convert` (paquet distinct de `librsvg`, qui n'installe que la
  bibliothèque). `apk add rsvg-convert` corrige, et `rsvg-convert -w
  N -h N -o sortie.png icon.svg` fonctionne aussi directement, sans
  passer par `magick`, avec des messages d'erreur bien plus clairs en
  cas de souci (a révélé une vraie erreur XML dans `icon.svg` --
  double tiret `--` dans un commentaire, invalide en XML contrairement
  au JS -- que le message d'erreur de `magick` ne laissait pas du tout
  deviner).
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
  milieu de la cible. Direction validée par l'utilisateur après
  plusieurs itérations visuelles (mockups publiés en Artifact, jamais
  appliquées au dépôt avant validation explicite) -- une première
  piste (silhouette pin ovale + empennage à 3 pales) écartée,
  l'empennage jugé superflu. Le tracé du pin utilisé dans `icon.svg`
  est **le pin "large" d'origine** (`M12 2C7.6 2 4 5.6 4 10c0 6 8 12
  8 12s8-6 8-12c0-4.4-3.6-8-8-8Z`, le même que `ICONE_PIN`/
  `ICONE_PIN_CARTE` dans `app.js`) -- une variante affinée testée un
  temps a été appliquée puis explicitement annulée par l'utilisateur
  ("remets le pin map precedent"), donc pas de tracé de pin distinct
  à maintenir en plus de celui déjà utilisé ailleurs dans l'app.
  `icon-192.png`/`icon-512.png` régénérés depuis ce nouveau `icon.svg`
  (même commande `magick`+`librsvg` que d'habitude).
  **Le pin générique de la vue Carte (`ICONE_PIN_CARTE` dans
  `app.js`) n'a volontairement PAS été aligné sur ce nouveau tracé**
  (mêmes proportions, mais rendu séparément, sans le fond/la cible)
  -- question posée explicitement, réponse : non, les deux restent
  indépendants.
  **Petites icônes de marque mises à jour en cohérence** (même
  motif ellipse aplatie + pin, sans fond ni point central, adapté
  pour rester lisible en 24-30px) : logo d'en-tête d'`index.html`
  (`.mark`), `app.html` (`.brand`), `aide.html` (`.titre-lien`), et
  le placeholder photo (`ICONE_PLACEHOLDER_PHOTO` dans `app.js` +
  le placeholder statique du sélecteur de photo dans `app.html`).
  **Laissée telle quelle, hors périmètre** : la petite icône
  "position acquise" à côté du statut GPS dans le formulaire
  (`app.html`, motif bullseye original) -- usage sémantique différent
  (indicateur d'état, pas une marque), non signalée comme à changer.

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

## Vraie carte OSM (issue #13, décidé 2026-08-20)

- **Leaflet 1.9.4 vendoré** (`leaflet.js`/`leaflet.css`, téléchargés
  depuis unpkg et committés, même principe que JSZip). Seuls les deux
  fichiers nécessaires sont vendorés -- les images du marker par
  défaut (`images/marker-icon.png` etc.) et du contrôle de calques ne
  le sont volontairement pas : tous nos marqueurs utilisent notre
  propre icône (`ICONE_PIN_CARTE`, inchangée, voir plus bas) via
  `L.divIcon`, jamais le marker par défaut de Leaflet, et on n'ajoute
  pas de contrôle de calques. La seule référence `url()` orpheline
  dans `leaflet.css` (`.leaflet-default-icon-path`, un heuristique de
  détection de chemin jamais déclenché tant qu'on fournit toujours une
  icône explicite) est donc sans conséquence.
- **URL de tuiles exacte, vérifiée sur la politique d'usage officielle**
  (`operations.osmfoundation.org/policies/tiles/`, vérifiée le
  2026-08-20) : `https://tile.openstreetmap.org/{z}/{x}/{y}.png`,
  **sans** sous-domaines `{s}.`/`a.`/`b.`/`c.` (dépréciés, la politique
  demande explicitement d'utiliser cette URL telle quelle).
  Attribution : "© OpenStreetMap contributors" + lien vers
  `openstreetmap.org/copyright`, plus un lien "Signaler un problème"
  vers `openstreetmap.org/fixthemap` (les deux ajoutés au contrôle
  d'attribution Leaflet) -- les deux exigés par la politique.
- **Tension avec le principe offline-first du projet** : la politique
  OSM interdit explicitement tout "prefetch"/téléchargement de zone
  pour un usage hors-ligne. Question posée explicitement à
  l'utilisateur (deux options : carte strictement en ligne, ou cache
  opportuniste malgré la zone grise) -- **réponse : cache opportuniste
  quand même**. Implémenté dans `sw.js` (`gererTuileCarte()`,
  cache dédié `fletchlog-tuiles-osm`, plafonné à 400 tuiles, éviction
  FIFO) : une tuile n'y entre QUE si elle a réellement été affichée
  pendant une navigation normale -- jamais de préchargement de zone ni
  de fonctionnalité "télécharger pour hors-ligne" explicite. Ce cache
  est volontairement exclu du nettoyage par `CACHE_NAME` (une tuile
  déjà vue n'a pas de raison d'expirer à chaque mise à jour de
  l'appli). Vérifié réellement hors-ligne (réseau coupé via Chrome
  DevTools Protocol) : coquille + tuiles déjà vues fonctionnent, une
  tuile jamais vue échoue proprement (pas de crash). **Zone grise
  assumée, pas garantie à 100% conforme** -- à reconsidérer si OSM
  bloque un jour l'accès (voir la politique : blocage possible sans
  préavis en cas d'usage jugé abusif).
- **`crossOrigin: true` sur la couche de tuiles** -- indispensable :
  sans lui, les requêtes `<img>` de Leaflet sont "no-cors"/opaques,
  et une réponse opaque a toujours `response.ok === false` côté
  service worker (bug découvert en testant : le cache restait vide en
  silence, `.ok` ne passait jamais). `tile.openstreetmap.org` envoie
  `Access-Control-Allow-Origin: *` (vérifié), donc le mode CORS
  fonctionne sans casser le chargement des tuiles.
- **Pin de marqueur (`ICONE_PIN_CARTE` dans `app.js`) volontairement
  inchangé**, réutilisé tel quel via `L.divIcon` -- pas de nouveau
  tracé pour la carte réelle (voir aussi la décision équivalente pour
  le logo, #19, qui a délibérément gardé ce pin séparé).
- Carte initialisée à la demande (`initCarte()`/`actualiserPinsCarte()`
  dans `app.js`) seulement au premier passage sur la vue Carte, jamais
  au chargement de la page -- un conteneur cité alors qu'il est encore
  `display:none` (vue non active) a une taille nulle pour Leaflet,
  qui calcule alors mal ses tuiles/son cadrage.
- **Vérification** : testée réellement (Selenium + Chromium headless,
  le mode non-headless de cet environnement plantait/bloquait au
  lancement de session -- limite d'environnement déjà rencontrée
  ailleurs dans ce projet, pas un souci de code) via un vrai serveur
  HTTP local (nécessaire pour le service worker, qui ne s'enregistre
  pas sur `file://`) : rendu de tuiles réelles et reconnaissables,
  marqueurs, filtres, réouverture de l'onglet Carte, cache de tuiles
  qui se remplit puis sert bien depuis le cache, fonctionnement
  hors-ligne réel (réseau coupé via CDP) -- tout confirmé. **Seule
  réserve honnête** : l'aperçu de fiche (`#carte-apercu`, clic sur un
  marqueur) est confirmé correct par les moyens indirects disponibles
  (style calculé, `elementFromPoint` au pixel exact renvoyant bien son
  contenu) mais ne s'affiche pas dans une capture d'écran Chromium
  headless -- artefact de compositing propre à ce mode de test (pas
  du code touché par #13, le mécanisme `position:fixed` de
  `.carte-apercu` est inchangé et avait déjà été validé sur un vrai
  appareil lors de #7) -- à reconfirmer visuellement sur un vrai
  appareil à l'occasion.
- **Liseré sombre sur les anneaux du logo (2026-08-21, retour
  utilisateur)** : les cercles aplatis n'avaient qu'un liseré sombre
  sur le pin (voir plus haut), pas sur les anneaux eux-mêmes --
  ajouté par cohérence, même technique (chaque ellipse dessinée deux
  fois : une fois plus large en `#0f1216`/`#141414` selon le fond,
  une fois à sa largeur d'origine en or par-dessus). Appliqué aux 7
  emplacements habituels (`icon.svg`, les 5 petites icônes de marque,
  la carte fletchapps). Vérifié réellement à taille réelle (icône
  d'app 512px et petites marques 26px) avant application.
- **Vue Carte plein cadre (2026-08-21, retour utilisateur)** : la
  barre de filtres/recherche flotte désormais par-dessus la carte
  (`#filtres-barre`, `position: fixed`, dégradé `color-mix(in srgb,
  var(--bg) 75%, transparent)` pour rester lisible sur n'importe quelle
  couleur de fond de carte), et `.carte-conteneur` occupe tout
  l'espace entre l'en-tête et la nav basse, sans bordure ni coins
  arrondis. Activé via `body.vue-carte-plein`, posé par
  `initNavigation()` toujours en même temps que `.view.active` --
  jamais l'un sans l'autre -- plutôt qu'un sélecteur CSS direct sur
  `#view-carte.active`, pour ne pas dupliquer la logique d'affichage
  déjà portée par `.view`/`.view.active`. `--barre-haut` (hauteur
  réelle de l'en-tête, safe-area comprise) mesuré en JS
  (`mesurerHauteurEntete()`, aussi sur `resize` pour une rotation
  d'écran) plutôt que deviné en CSS -- même esprit que le correctif
  `dvh` d'avant, mais ici la valeur elle-même n'est pas devinable
  proprement en CSS pur (dépend du contenu réel de l'en-tête).
  **Contrôles Leaflet déplacés en conséquence** : zoom et "me
  localiser" passent de leurs positions par défaut (`topleft`/
  `topright`) à `bottomleft` (groupés) -- `topright` se serait
  retrouvé sous la barre de filtres flottante, et `bottomright`
  serait entré en collision avec le FAB (même coin, même niveau
  vertical, tous deux fixes). Vérifié réellement : pas de
  chevauchement carte/en-tête ni carte/nav, filtres et marqueurs
  fonctionnels dans la nouvelle mise en page, vue Liste inchangée au
  retour, aperçu de fiche (clic sur un marqueur) toujours fonctionnel.

## Pas encore tranché

- Découpage exact des tickets au-delà du premier jalon.
- `REMERCIEMENTS.md` (issue #9, 2026-08-20) reprend le gabarit
  fletchscore/fletchtime, mais **sans le marqueur**
  `<!-- sphinx-include-start -->` (pas de doc Sphinx prévue, pas de
  backend Python, contrairement aux deux autres). `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md` et
  `.github/PULL_REQUEST_TEMPLATE.md` ajoutés le même jour (demandé
  juste après), adaptés à la vraie architecture de FletchLog (pas de
  serveur, pas d'auth, pas de suite de tests automatisée, pas de
  Black/Ruff) plutôt que copiés tels quels depuis FletchScore/
  FletchTime -- notamment `SECURITY.md`, dont le périmètre est
  entièrement différent (XSS/échappement, import de `.zip` non fiable,
  fuite de la zone consultée vers `tile.openstreetmap.org`, pas de
  token/auth à contourner).
- **Position éditable après coup (issue #15, 2026-08-20)** : `gpsLat`/
  `gpsLon` sont désormais la source de vérité dans les deux modes du
  formulaire (ajout ET édition), plus seulement à l'ajout --
  initialisées depuis `entree.lat`/`entree.lon` en édition (voir
  `ouvrirFormulaire()`), modifiables via trois actions : recapture
  (réutilise `demarrerCaptureGPS()`), sélection sur une vraie carte
  (nouveau picker, pin fixe au centre de l'écran, "Valider" lit
  `carteMapPicker.getCenter()` -- le choix retenu parmi les deux
  options ouvertes par le ticket, rendu possible par #13), ou retrait
  complet (`lat`/`lon` remis à `null`). Le picker réutilise
  `ajouterCoucheTuilesOSM()` (factorisé depuis `initCarte()`) sur une
  instance Leaflet séparée de `carteMap`. **Piège rencontré et corrigé
  en vérifiant réellement** : le pin central du picker était invisible
  au premier essai -- même cause que le bug FAB/carte déjà corrigé
  (contrôles Leaflet à z-index jusqu'à 1000 non contenus) mais sur un
  nouveau conteneur (`.picker-carte-zone`) qui n'avait pas reçu
  `isolation: isolate`. Diagnostic initial via `elementFromPoint`
  faussé par `pointer-events: none` sur le pin (intentionnel, pour
  laisser les clics/glissés atteindre la carte dessous) -- un élément
  non interactif par design ne peut pas être vérifié par hit-testing,
  seule une capture d'écran (ou une capture de l'élément seul) le
  confirme. **Correctif incomplet à l'époque** -- voir l'entrée du
  2026-08-21 plus bas : `isolation: isolate` contient bien le z-index
  de Leaflet à l'intérieur de `.picker-carte-zone`, mais n'empêche pas
  ce même z-index (jusqu'à 1000) de battre un élément à nous placé
  DANS cette même zone isolée -- la capture d'écran de vérification de
  l'époque ne l'a pas révélé, un signalement utilisateur sur un vrai
  appareil si.
- **Notification de mise à jour (issue #10, 2026-08-20)** : logique
  entièrement dans `sw-register.js` (partagé par les 3 pages), pas dans
  `app.js` -- une mise à jour peut être détectée alors que l'utilisateur
  est sur Aide ou l'accueil, pas seulement dans l'appli. Bannière
  autonome (CSS injecté par JS, pas de dépendance à `.toast` qui
  n'existe que dans `app.html`) plutôt qu'un reload forcé (voir le
  ticket : couperait une saisie en cours). `premiereInstallation`
  capturé via `!navigator.serviceWorker.controller` juste après
  l'enregistrement -- évite de notifier "nouvelle version" au tout
  premier chargement. Vérifié réellement en deux temps (même profil
  Chrome persistant via `--user-data-dir`, `sw.js` modifié entre les
  deux pour simuler une vraie nouvelle version déployée) : aucune
  bannière au premier chargement, bannière correcte après
  `registration.update()`, et le bouton "Recharger" fonctionne
  bien.
- **Plusieurs photos par entrée (issue #12, 2026-08-20)** : `photoId`
  (string|null) devient `photoIds` (string[], jusqu'à 6 -- `MAX_PHOTOS`
  dans `app.js`). Le store `"photos"` (IndexedDB, clé=photoId,
  valeur=Blob) est inchangé -- plusieurs photos par entrée, c'est juste
  plusieurs clés référencées, pas un nouveau schéma de stockage.
  **Décidé avec l'utilisateur** : limite à 6 (pas illimité, pour ne
  pas laisser le stockage d'un vieux téléphone exploser) ; vignette de
  liste = première photo + badge `+N` si plusieurs (pas de carrousel).
  **Pas de migration persistée** des entrées créées avant #12 (qui ont
  encore `photoId` singulier) -- repli à la lecture dans
  `listerEntrees()` (`photoIds = e.photoIds || (e.photoId ? [e.photoId] : [])`),
  même principe que le titre manquant des entrées d'avant #11.
  `modifierEntree()` supprime l'ancien champ `photoId` dès qu'une
  entrée est réenregistrée (`delete complete.photoId`), pour ne pas le
  laisser traîner indéfiniment. `export-import.js` gère aussi ce repli
  côté import (une sauvegarde exportée avant #12 n'a que `photoId`).
  Formulaire : galerie de vignettes (`photosFormulaire`, chaque élément
  `{photoId}` existant ou `{fichier, urlApercu}` nouveau, pas encore
  compressé/stocké) plutôt qu'un unique aperçu -- `resoudrePhotosPourEnvoi()`
  compresse/enregistre les nouvelles, supprime celles retirées par
  l'utilisateur (comparaison ancien tableau vs `photosFormulaire`),
  garde les autres, dans l'ordre d'affichage. Vérifié réellement :
  ajout de 3 photos, retrait d'une avant sauvegarde, plafond à 6
  respecté (toast si dépassement), suppression d'une photo déjà
  stockée sur une entrée existante (confirmée réellement absente du
  store `"photos"` après coup, pas juste déréférencée), export/import
  d'une entrée multi-photos (idempotent au réimport), et affichage
  correct d'une entrée à l'ancien format (`photoId` singulier, jamais
  réenregistrée depuis).
- **Mire plutôt que pin sur le picker de position (2026-08-21, retour
  utilisateur)** : `.picker-pin-centre` (issue #15) affichait un pin
  map ; remplacé par une mire (deux cercles concentriques + croix +
  point central, même palette `--gold`) -- plus précis visuellement
  (son centre exact est le point retenu par `validerPickerPosition()`,
  pas besoin d'ancrer la pointe d'un pin). Transform passé de
  `translate(-50%, -100%)` à `translate(-50%, -50%)` en conséquence.
  Vérifié réellement : la coordonnée validée après un déplacement de
  la carte correspond bien au centre affiché.

  **Vrai bug signalé par l'utilisateur sur un vrai appareil** ("la
  mire est sous la carte") -- d'abord mis (à tort) sur le compte d'un
  artefact de capture d'écran headless déjà rencontré sur le pin
  précédent, avant d'être creusé pour de vrai et confirmé comme un
  vrai bug de z-index, pas un artefact de test. Cause exacte :
  `isolation: isolate` sur `.picker-carte-zone` contient bien le
  z-index de Leaflet (jusqu'à 1000, voir `.leaflet-top`/
  `.leaflet-bottom` dans `leaflet.css`) à l'intérieur de cette zone --
  mais `#picker-carte` (le conteneur Leaflet) n'a lui-même pas de
  z-index propre, donc les panneaux/contrôles internes de Leaflet ne
  sont pas contenus DANS `#picker-carte` comme on pourrait le croire,
  seulement empêchés d'en sortir. Ils rivalisent donc directement avec
  `.picker-pin-centre` (z-index:15 à l'origine) dans la même pile que
  `.picker-carte-zone` isole, et gagnent. Corrigé en passant
  `.picker-pin-centre` à `z-index: 1001` (strictement supérieur au
  maximum connu de Leaflet). Reconfirmé réellement après coup (capture
  d'écran + capture de l'élément seul, mire bien visible par-dessus la
  carte) -- **la même analyse s'applique probablement au pin d'origine
  du picker (voir l'entrée #15 plus haut)**, dont le correctif
  `isolation: isolate` seul était donc incomplet, juste passé inaperçu
  à l'époque.
- **Logo : pin remplacé par la plume FletchApps (2026-08-22, issue
  #22)** : même tracé de plume que `fletchapps/icon.svg` (double
  liseré noir/or, `transform-box: fill-box` + `matrix(0,1,-1,0,...)`),
  réutilisé partout où le pin apparaissait -- `icon.svg` (fût jusqu'au
  centre de la cible), les trois marques d'en-tête (`app.html`,
  `aide.html`, `index.html`, mêmes coordonnées `translate(12,10.94)
  scale(0.268)`), `ICONE_PLACEHOLDER_PHOTO` (variante grise
  `--text-faint`) et `ICONE_PIN_CARTE` (marqueur Leaflet, fût = point
  d'ancrage, `iconAnchor` passé de `[14,26]` à `[14,28]`). Laissé
  inchangé : `ICONE_PIN` (petit repère générique à côté du champ
  `lieu` dans la liste) -- usage fonctionnel "ceci est un lieu", pas
  un élément de marque, un pin classique y reste plus lisible qu'une
  plume à ce rôle.

  **Piège rsvg-convert découvert en vérifiant le rendu** : `rsvg-convert`
  (librsvg) ne supporte pas correctement `transform-box: fill-box` sur
  un `<path>` -- rend les plumes hors-cadre ou invisibles selon le
  groupe, alors qu'un vrai navigateur (vérifié via Chromium headless +
  Selenium) les affiche correctement. Un rendu `rsvg-convert` qui a
  l'air cassé sur ce genre de transform CSS n'est donc pas forcément
  un bug du SVG -- toujours revérifier avec un vrai moteur de rendu
  (Chromium) avant de conclure. `icon-192.png`/`icon-512.png`
  régénérés via une capture Selenium de l'élément `<svg>` (élément
  screenshot, pas `rsvg-convert`) pour cette raison.

  **Vrai bug introduit dans ce même commit, repéré par l'utilisateur** :
  le commentaire ajouté dans `icon.svg` ("issue #22 -- remplace...")
  réutilisait le `--` comme séparateur de clause, convention de ce
  projet dans les commentaires JS/HTML -- invalide dans un commentaire
  XML (même piège déjà documenté ci-dessus pour l'anneau de la cible,
  reproduit ici sans y repenser). Contrairement aux commentaires
  inline des fichiers `.html` (parseur HTML, tolérant), `icon.svg` est
  chargé comme document XML autonome via `<link rel="icon"
  href="icon.svg" type="image/svg+xml">` sur les trois pages -- un
  vrai navigateur (pas seulement `rsvg-convert`) refuse de le parser
  et affiche une page d'erreur à la place du favicon. Vérifié en
  vrai : `rsvg-convert` donnait déjà l'erreur exacte ("Double hyphen
  within comment"), et une navigation Chromium directe vers le
  `icon.svg` publié sur GitHub Pages affichait un `parsererror` au
  lieu du logo -- corrigé (virgule à la place du `--`), reconfirmé
  affiché correctement en navigation directe après coup. PNG non
  regénérés (contenu du commentaire sans effet sur le rendu une fois
  le parsing réussi, octets identiques avant/après). **Leçon** : après
  ce genre de correctif, revérifier aussi les fichiers `.svg`
  autonomes chargés en `<link rel="icon">`/`<img src>` par une vraie
  navigation directe dans le navigateur (pas seulement inlinés dans
  une page HTML) -- les deux contextes de parsing ne se comportent
  pas pareil face à un XML invalide.

  **Deuxième vrai bug repéré par l'utilisateur, deux au total sur ce
  seul commit #22** : la génération de `icon-192.png`/`icon-512.png`
  via `element.screenshot()` (Selenium) déformait légèrement le SVG en
  hauteur -- capture non pas juste avec une bande blanche inutile en
  bas, mais un carré arrondi visiblement écrasé/coupé (512×473 et
  192×153 de contenu réel dans un canevas 512×512/192×192, vérifié par
  un `-trim`). Corrigé en remplaçant `element.screenshot()` par
  `Page.captureScreenshot` (CDP) avec un `clip` explicite aux
  dimensions cibles -- fiable, contenu occupant tout le canevas
  (`-trim` confirme 512×512/192×192 pile). **Leçon** : ne pas utiliser
  `element.screenshot()` de Selenium pour rasteriser un SVG à une
  taille précise -- toujours vérifier par un `-trim` que le contenu
  réel occupe bien tout le canevas attendu, pas seulement que les
  dimensions du fichier sont correctes.

  Et un troisième repéré par l'utilisateur, de proportion cette fois :
  les marques d'en-tête/hero (`app.html`, `aide.html`, `index.html`,
  `ICONE_PLACEHOLDER_PHOTO`) avaient hérité du liseré 1.6/1.05 dérivé
  du marqueur de carte (jamais épaissi, resté à 6/4) plutôt que du
  liseré du logo une fois celui-ci épaissi à 7/4 -- visuellement trop
  fin comparé à `icon.svg`. Le stroke-width d'un `<path>` étant
  proportionnel à l'échelle de son groupe ancêtre, la bonne pratique
  est de garder exactement les mêmes valeurs de `stroke-width` que
  `icon.svg` (7/4) partout où c'est la même plume, et de ne faire
  varier que le `scale()` du groupe englobant selon le contexte --
  jamais retoucher le `stroke-width` séparément par contexte, sous
  peine de proportions incohérentes d'un endroit à l'autre.
