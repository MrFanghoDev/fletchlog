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

## Versions (décidé 2026-08-19, révisé 2026-08-23 -- issue #21)

Pas de mécanisme comme `setuptools_scm` côté FletchScore/FletchTime
(dérivation de version depuis les tags git à la CONSTRUCTION d'un
paquet Python) -- toujours inapplicable ici au sens strict, aucun
paquet à publier. Avant le 2026-08-19, aucune gestion de version du
tout : ni tag git, ni Release GitHub, ni champ `version` dans
`manifest.json` -- seul existait `CACHE_NAME` dans `sw.js`, un simple
compteur de cache-busting interne (incrémenté à chaque ticket qui
modifie un fichier déjà précaché, voir plus haut), sans rapport avec
un numéro de version affiché ou suivi.

Décision initiale (2026-08-19) : **tags git + Release GitHub aux
jalons**, posés à la main -- toujours vrai, inchangé.

**Numéro affiché dans le footer** (issue #20, décidé dans la foulée,
révisé le 2026-08-23) : `version.js`, une seule constante
`FLETCHLOG_VERSION`. Affiché dans le footer d'`index.html` et
`aide.html` (les deux pages qui ont déjà un footer) -- pas dans
`app.html`, qui n'en a pas.

**Depuis #21 (déploiement par tag, voir plus bas), la mise à jour n'est
plus manuelle** : `.github/workflows/pages.yml` réécrit
`FLETCHLOG_VERSION` avec le nom exact du tag (`github.ref_name`, ex.
"v0.4.0") au moment du déploiement -- un simple `sed` sur l'artefact
publié, JAMAIS commité en retour dans le dépôt (pas de commit-bot comme
chez fletchtime/fletchscore pour le formatage automatique, aucun
équivalent nécessaire ici). Ne s'exécute que sur un vrai push de tag
(`if: startsWith(github.ref, 'refs/tags/v')`) -- un `workflow_dispatch`
manuel garde `version.js` tel quel, `github.ref_name` y vaudrait un nom
de branche, pas une version. Conséquence : la valeur committée dans le
dépôt (`"dev"`) n'est **jamais** ce qui s'affiche réellement en
production -- seulement ce qu'un checkout local (sans repasser par le
workflow) montrerait. Sans build local, un test manuel du footer avant
de taguer doit donc éditer `version.js` à la main temporairement (pas
committé), ou accepter de voir "dev" jusqu'au prochain vrai tag.

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

## Lightbox photo (issue #24, 2026-08-22)

Vue plein écran depuis la galerie du formulaire d'édition -- seul
endroit où taper une vignette ne faisait rien auparavant (le reste du
tap ouvrait déjà le formulaire depuis la Liste/Carte, pas de geste
libre à réutiliser là). `#lightbox-overlay`, même patron que
`.picker-overlay`/`.modal-overlay`, `z-index: 26` (au-dessus du
formulaire 20 et du picker 25, sous la confirmation 30 -- jamais
ouverts en même temps en usage normal, ordre gardé cohérent quand
même). `lightboxUrls`/`lightboxIndex` : tableau d'URL déjà résolues
(pas d'IDs -- réutilise `p.urlApercu || photosCache[p.photoId]`, déjà
calculé par `rendrePhotosGalerie()`), pas de nouveau circuit de
lecture. Navigation : boutons prev/next + swipe tactile
(`touchstart`/`touchend`, seuil 40px), masqués/no-op si une seule
photo. Fermeture : bouton ✕ **et** tap sur le fond (contrairement au
formulaire qui ne se ferme que via "Annuler" pour ne pas perdre une
saisie -- ici pure consultation, rien à perdre). Pas de pinch-to-zoom
pour cette première version (`object-fit: contain` suffit à voir la
photo en entier) -- à revoir si demandé après usage réel.

Testé réellement (Selenium, photos factices injectées directement
dans `photosFormulaire` -- pas de vrai flux caméra en headless) :
ouverture au tap d'une vignette, compteur "2 / 3" correct, navigation
suivante, fermeture au tap sur le fond.

**Pinch-to-zoom + pan (2026-08-22, retour utilisateur)** : ajouté après
coup à la même lightbox. Un doigt déplace l'image (pan) seulement
quand `lightboxZoom > 1`, sinon un doigt déclenche le swipe prev/next
existant -- sans cette distinction, se déplacer dans une photo zoomée
changerait de photo par erreur. `touch-action: none` sur `.lightbox-img`
(remplace `pan-y`) -- tout le geste tactile (pan, pinch, swipe) est
géré à la main en JS, le navigateur ne doit rien intercepter lui-même.
`touchmove` du pinch/pan appelle `preventDefault()`, donc listener posé
en `{ passive: false }` (sinon `preventDefault()` est silencieusement
ignoré). Zoom/pan réinitialisés à chaque changement de photo
(`afficherPhotoLightbox()`) et à l'ouverture. Pas de bornes de pan
(l'image peut sortir de l'écran si on pousse fort) -- acceptable pour
une première version, à revoir si ça gêne à l'usage réel. Vérifié
réellement (Selenium ne simule pas facilement un vrai pinch tactile
multi-touch en headless -- testé en appliquant directement le
`transform` CSS résultant et en vérifiant sa remise à zéro au
changement de photo, pas le geste tactile lui-même).

**Coins des PNG blancs au lieu de transparents (2026-08-22, repéré par
l'utilisateur)** : `Page.captureScreenshot` (CDP, utilisé pour générer
`icon-192.png`/`icon-512.png` depuis `icon.svg`, voir plus haut)
composite par défaut tout fond transparent sur du blanc opaque --
confirmé via `identify -verbose` : les PNG générés n'avaient même pas
de canal alpha (`color_type: 2`, Truecolor). Les coins hors du carré
arrondi (transparents dans le SVG source, `rx` ne couvre pas tout le
carré) ressortaient donc blancs plutôt que transparents. Corrigé en
appelant `Emulation.setDefaultBackgroundColorOverride` avec une
couleur alpha 0 avant la capture -- PNG résultant bien en RGBA
(`color_type: 6`), coins à `rgba(0,0,0,0)` vérifié au pixel. **Leçon**
: toujours vérifier `color_type`/canal alpha d'un PNG généré via
capture de page (`identify -verbose`), pas seulement ses dimensions --
une capture peut très bien avoir les bonnes dimensions et un fond
opaque là où il devrait être transparent.

## Lightbox : fondu entre photos (2026-08-22/23, retour utilisateur)

Première tentative -- `transition: opacity 0.15s ease` sur
`.lightbox-img`, changement de `src` via un double
`requestAnimationFrame` pour garantir un frame à opacity:0 réellement
peint avant de remonter à 1 (technique standard documentée pour ce
genre de crossfade). **Constaté cassé sur un vrai appareil** (retour
utilisateur : "les photos passent de l'une à l'autre abruptement")
malgré le rAF -- l'hypothèse initiale ("limite du rendu headless de
cet environnement, pas un vrai bug") était donc fausse, corrigée ici
plutôt que laissée traîner.

**Corrigé avec `@keyframes` + classe** plutôt qu'une transition
JS-timée : `@keyframes lightbox-fondu { from{opacity:0} to{opacity:1}
}`, classe `.lightbox-anim` retirée puis reposée (avec un
`void img.offsetWidth` entre les deux pour forcer un reflow et
pouvoir rejouer l'animation) à chaque navigation prev/next/swipe --
pas à l'ouverture initiale. Une animation `@keyframes` rejoue toujours
sa timeline complète dès qu'elle démarre, sans dépendre d'un état
"avant" déjà peint comme une transition -- plus robuste pour ce genre
de changement de `src` en une seule opération JS. Toujours pas de
transition/animation sur `transform` (pinch-zoom/pan l'écrivent en
direct à chaque `touchmove`, une transition dessus traînerait derrière
le doigt).

Vérifié partiellement : `img.getAnimations()` confirme que l'animation
`lightbox-fondu` démarre bien (contrairement à la version précédente,
où `transitionrun` ne se déclenchait jamais même en isolant le double
rAF du reste du code) -- signe que le mécanisme est correctement
câblé, mais pas une confirmation visuelle sur un vrai appareil comme
la première tentative n'en avait pas non plus.

**Toujours pas le bon résultat, remplacé pour de bon (2026-08-23,
même retour utilisateur, précisé)** : le fondu `@keyframes` ne se
voyait toujours pas sur l'appareil réel -- et surtout, ce que
l'utilisateur voulait dire par "plus fluide" n'était pas un fondu du
tout, mais que les photos restent "collées" à l'écran pendant le
glissement du doigt (effet carrousel, comme Instagram/Google Photos),
pas un saut abrupt suivi d'un effet visuel après coup. Le fondu était
donc la mauvaise réponse à la question depuis le début -- remplacé
par un vrai carrousel à 3 volets, voir section suivante. Les deux
tentatives de fondu ci-dessus restent documentées pour la leçon
(transition vs `@keyframes`), pas parce que le principe même du fondu
était la bonne direction.

## Lightbox : carrousel à 3 volets (2026-08-23, retour utilisateur)

Remplace le fondu ci-dessus. `.lightbox-track` : conteneur flex de 3
volets (`#lightbox-img-prev`/`-courant`/`-suivant`), largeur 300% de
l'écran, chaque volet `calc(100%/3)` (donc 100% de l'écran). Position
neutre `transform: translateX(-33.3333%)` (décale d'exactement un
volet -- 33.3333% de la largeur de LA PISTE elle-même, pas de
l'écran ; **piège rencontré en écrivant ceci** : `-100%` semblait
"logique" par réflexe mais correspond à 100% de la largeur de la
piste, donc trois écrans entiers -- confondre le référentiel du
`%` d'un `translateX` avec celui d'une largeur CSS est une erreur
facile). Volet "suivant" pleinement révélé : `-66.6667%` (un volet de
plus vers la gauche) ; volet "prev" : `0%` (un volet en arrière).
`.lightbox-overlay` n'a plus `display: flex` -- un flex centré aurait
déjà recentré la piste tout seul, en double avec ce `transform`.

Glissement au doigt : `translateX(calc(-33.3333% + ${delta}px))` à
chaque `touchmove` (un seul jeu d'écouteurs sur `.lightbox-track`,
suit le doigt 1:1, aucune animation pendant le geste). Au relâché
(`touchend`) : sous ~20% de la largeur d'un volet
(`track.clientWidth / 3 / 5`), `annulerGlissementLightbox()` anime le
retour à `-33.3333%` (petit effet rebond, aucun changement de photo) ;
au-dessus, `deplacerLightbox(direction)` anime jusqu'à révéler
entièrement le volet voisin puis, sur `transitionend`,
`terminerDeplacementLightbox()` bascule `lightboxIndex`, recharge les
3 volets sur les nouveaux voisins (`majPhotosLightbox()`) et remet la
piste à `-33.3333%` **sans transition** -- comme le volet "suivant"
vient d'être rechargé avec la photo qui était déjà visible à l'écran,
rien ne saute visuellement, juste un changement de coordonnées
invisible. Les boutons ‹/› appellent la même fonction que le
glissement (`deplacerLightbox`), pas de logique séparée.

Zoom/pan (pinch, voir plus haut) ne s'applique qu'au volet "courant"
-- `reinitialiserZoomLightbox()`/`appliquerZoomLightbox()` ciblent
`#lightbox-img-courant` spécifiquement, plus `#lightbox-img` (qui
n'existe plus, remplacé par les 3 volets).

Fermeture au tap sur le fond (pas sur une image, mouvement minime,
détecté dans le même `touchend` que le glissement) -- **le `click`
sur `#lightbox-overlay` posé pour cet usage ne suffit plus** : la
piste couvre maintenant tout l'écran ET `touch-action: none`
supprime le `click` synthétique qui suivrait normalement un tap
tactile, donc `#lightbox-overlay` ne le reçoit jamais au doigt. Gardé
en plus pour la souris/desktop (le `click` fonctionne normalement
hors tactile).

Vérifié réellement (Selenium, `TouchEvent`/`Touch` synthétiques --
possible ici contrairement au fondu précédent, ce n'est pas un rendu
visuel mais de la logique d'état) : position neutre correcte
(`matrix(...,-500,0)` pour un écran de 500px, soit bien -33.3333% de
1500px), glissement en direct 1:1 avec le doigt, franchissement du
seuil -> changement d'index + wraparound correct (vérifié par
comparaison directe avec `lightboxUrls[]`, pas par sous-chaîne dans le
`src` encodé en base64 -- premier essai de vérification raté pour
cette raison), retour en place sous le seuil sans changement de
photo, fermeture au tap sur le fond. Toujours pas de confirmation
visuelle réelle sur appareil (le rendu visuel du glissement lui-même,
contrairement à la logique d'état, reste à confirmer par
l'utilisateur).

**Pan borné aux bords de la photo (même retour utilisateur)** :
`appliquerZoomLightbox()` borne désormais `lightboxPanX`/`lightboxPanY`
pour qu'un bord de la photo (zoomée) ne puisse jamais rentrer depuis
l'intérieur de l'écran -- au pire il touche le bord de l'écran, jamais
plus. Calcul : `img.offsetWidth`/`offsetHeight` (taille de mise en
page "contain" à zoom 1, `transform: scale()` ne change pas la mise en
page) x `lightboxZoom` donne la taille réellement affichée, comparée à
`overlay.clientWidth`/`clientHeight` (le viewport) ; la moitié de
l'excédent (s'il y en a) est la borne. Vérifié réellement (calcul
direct) : image plus petite que l'écran même zoomée -> pan forcé à 0
(rien à borner) ; image plus grande -> pan clampé exactement à la
valeur attendue.

## Détail de sortie : mode non éditable par défaut (2026-08-23, retour
utilisateur)

Taper une carte Liste ou l'aperçu Carte ouvrait direct le formulaire
d'édition -- ouvre maintenant un écran de détail en lecture seule
(`#detail-overlay`), avec un bouton "Modifier" qui ouvre le formulaire
classique par-dessus (celui-ci se ferme d'abord, jamais les deux
affichés en même temps). Décision explicitement posée à l'utilisateur
plutôt que devinée : formulaire existant avec champs désactivés
(rapide, réutilise tout) vs un vrai écran de consultation dédié (plus
soigné, plus de code) -- **le second a été choisi**.

`idEnEdition` (même variable que le formulaire, jamais les deux
écrans ouverts en même temps) sert aussi à l'écran de détail, pour que
`supprimerDepuisDetail()` partage sa logique avec
`supprimerDepuisFormulaire()` (factorisées dans
`supprimerEntreeConfirmee(id, fermerOverlay)`).

Labels réutilisés tels quels depuis le formulaire (`formLieuLabel`,
`formCibleLabel`, etc.) -- ce sont déjà de simples noms ("Lieu",
"Discipline"...), pas de texte spécifique au formulaire, pas besoin de
dupliquer en clés i18n séparées. Seule vraie nouvelle clé :
`detailModifier`.

**Piège rencontré** : `tf(currentLanguage, "positionCoordonnees",
...)` inclut déjà "Position :" en préfixe (pensée à l'origine pour un
contexte sans label séparé, voir `rafraichirStatutPosition()`) --
utilisée telle quelle à côté du label "Position" déjà posé par
`ligneDetail()`, ça affichait "Position Position : 48.5, 2.7" en
double. Corrigé en formatant juste `${lat}, ${lon}` directement pour
ce contexte-ci, sans repasser par cette clé.

Galerie photo réutilise `ouvrirLightbox()` tel quel (tap sur une
vignette -> plein écran, zoom/pan/carrousel déjà en place) -- aucune
nouvelle logique de zoom/navigation à écrire ici, juste la
construction des vignettes et le passage des URL déjà résolues via
`photosCache`.

Vérifié réellement (Selenium, entrées factices injectées dans
`entreesActuelles`) : contenu du détail correct (y compris repli sur
le lieu si pas de titre, `formaterDate()`, galerie masquée si aucune
photo, "Pas de position enregistrée" si aucune position), tap photo ->
lightbox, tap "Modifier" -> formulaire pré-rempli avec le bon id,
confirmation de suppression affichée et annulation sans effet.

Retour à l'écran de détail après enregistrement (même retour
utilisateur, complément) : `idEnEdition` capturé juste avant
`fermerFormulaire()` (qui le remet à `null`) -- s'il y en avait un
(édition d'une sortie existante, pas un ajout), `afficherDetail()` est
rappelé après `chargerEntrees()` pour montrer la version à jour.
Vérifié réellement (vraie sauvegarde IndexedDB, pas seulement l'état
en mémoire) : ajout ferme comme avant, édition retourne bien au
détail avec la valeur modifiée visible.

## Import de photos depuis la galerie (issue #23, 2026-08-23)

Décision tranchée par une vraie recherche (pas supposée) avant de
scoper -- l'input `capture="environment"` force bien l'appareil photo
sans jamais proposer la galerie, sur toutes les versions Android
(confirmé). Mais retirer `capture` d'un seul input ne suffit pas comme
solution : sur Android 14/15, Chrome ne propose alors QUE la
galerie/les fichiers, **plus aucun raccourci vers l'appareil photo**
-- régression documentée (Chrome/Edge seulement, Firefox garde
l'ancien comportement), qui aurait cassé le cas d'usage principal
(photographier sur le pas de tir) pour une partie des utilisateurs
selon leur version d'Android. Sources : [blog.addpipe.com -- Android
14 & 15 File Inputs](https://blog.addpipe.com/html-file-input-accept-video-camera-option-is-missing-android-14-15/),
confirmé par une recherche web indépendante.

Résolu avec **deux `<input type="file">` distincts** (troisième piste
du ticket, celle qui garde le raccourci direct ET ajoute la galerie) :
`#champ-photo` (inchangé, `capture="environment"`, bouton "+") et
`#champ-photo-galerie` (nouveau, sans `capture`, bouton icône image
`ICONE_GALERIE`) -- deux boutons côte à côte dans `.photo-galerie`
plutôt qu'un menu contextuel, plus simple à câbler (délégation déjà en
place, juste un second `id` à reconnaître) et pas de nouveau
composant de superposition à construire. Clé i18n `formPhotoChoisir`
renommée `formPhotoAppareil` ("Prendre une photo") pour refléter
qu'elle ne désigne plus qu'un des deux boutons, nouvelle clé
`formPhotoGalerie` ("Choisir depuis la galerie").

Vérifié réellement (Selenium) : les deux boutons s'affichent côte à
côte, le second input n'a bien aucun attribut `capture`, et chaque
bouton déclenche bien le `click()` du bon input caché (vérifié par
substitution de `click()`, pas juste supposé depuis le HTML).

## Publication GitHub Pages uniquement sur release (issue #21, 2026-08-23)

Avant : source Pages "Deploy from a branch" (legacy, `build_type:
legacy`) -- chaque push vers `master` partait en ligne immédiatement,
sans découplage entre développement courant et ce qui est réellement
livré aux utilisateurs (contrairement à fletchtime/fletchscore, qui
avaient déjà ce découplage pour leur doc Sphinx).

Nouveau `.github/workflows/pages.yml`, calqué sur
`fletchtime/.github/workflows/docs.yml` mais réduit à l'essentiel :
FletchLog n'a AUCUNE étape de build (tout le dépôt EST le site public,
l'appli PWA elle-même), donc un seul job `checkout` ->
`upload-pages-artifact` (`path: .`) -> `deploy-pages`, déclenché
uniquement par `push: tags: ["v*.*.*"]` ou `workflow_dispatch` --
jamais sur un push de branche. `concurrency: group: "pages",
cancel-in-progress: true` gardé par cohérence avec les dépôts frères,
même si le risque de course qu'il évite chez eux (build+deploy en deux
jobs séparés, déclenchés par des événements différents) ne s'applique
pas vraiment ici avec un seul job/déclencheur.

**Bascule Settings -> Pages -> Source: "GitHub Actions" volontairement
PAS faite par Claude** (changement d'infra publique, jamais en aveugle
-- voir le ticket) -- à faire par l'utilisateur, ou par Claude après
confirmation explicite le moment venu. Tant que ce changement n'est
pas fait, ce workflow peut tourner (et réussir) sans rien changer au
site réellement publié -- la source legacy reste active en parallèle
jusqu'à la bascule manuelle.

**Premier déploiement après la bascule** : GitHub Pages ignore
silencieusement un déploiement pour un SHA de commit déjà déployé
auparavant (même leçon que fletchtime/fletchscore, voir leur
`docs.yml`) -- un `workflow_dispatch` manuel (ou un nouveau push de
tag) est nécessaire juste après la bascule pour que le site ne reste
pas figé sur le dernier contenu servi par le mécanisme legacy.

**Vérifié réellement, deux vrais accrocs rencontrés en bascule à chaud
(2026-08-23)**, tous deux distincts du contenu du ticket lui-même :

1. Le tag `v0.5.0` déclenchait le workflow mais échouait avec "Tag
   v0.5.0 is not allowed to deploy to github-pages due to environment
   protection rules" -- l'environnement `github-pages` de FletchLog
   n'avait que des règles de branche (`master`, `gh-pages`), pas de
   règle de tag, contrairement à fletchtime qui a une règle `type:
   tag, name: "v*.*.*"` en plus. Corrigé en ajoutant la même règle via
   `gh api repos/.../environments/github-pages/deployment-branch-policies
   -X POST -f name='v*.*.*' -f type=tag`.
2. **Le piège de dédup par SHA (documenté en théorie dans `docs.yml`
   des dépôts frères) s'est produit pour de vrai, pas juste en
   théorie** : un `workflow_dispatch` de diagnostic lancé sur `master`
   (même commit que le tag `v0.5.0`, aucune nouvelle release entre les
   deux) a "consommé" ce SHA aux yeux de GitHub Pages -- le
   redéploiement suivant du tag (même SHA) réussissait côté Actions
   mais ne republiait rien, le site restait sur le contenu du
   `workflow_dispatch` de test. Confirmé via l'en-tête `Last-Modified`
   de la réponse (pas juste `Age`/`Cache-Control`, qui ne prouvent que
   l'état du cache CDN, pas celui de l'origine) : il correspondait
   exactement à l'heure du `workflow_dispatch` de test, jamais à celle
   du redéploiement du tag. **Leçon pour la suite** : ne jamais
   dispatcher manuellement ce workflow sur `master` pour "tester" --
   utiliser un vrai nouveau tag (même mineur) si un déploiement doit
   être vérifié, sous peine de piéger le SHA suivant.

## Rappel d'export + stockage persistant (issue #18, 2026-08-23)

Deux questions du ticket tranchées avant de coder quoi que ce soit :

1. **Le risque de stockage Safari s'est-il amélioré ?** Recherché pour
   de vrai (pas supposé) : le risque reste réel (éviction possible sous
   pression de stockage ou longue inactivité, base LRU par origine) --
   voir le [billet WebKit officiel](https://webkit.org/blog/14403/updates-to-storage-policy/),
   qui ne mentionne d'ailleurs aucune règle fixe "7 jours" (contrairement
   à des sources tierces qui la citent encore) -- mais `navigator.storage.persist()`
   peut exclure une origine de l'éviction, et WebKit favorise
   explicitement les Home Screen Web Apps dans ses heuristiques
   d'attribution. Conclusion : risque réel mais atténuable, pas un
   couperet binaire.
2. **Rappels d'export en compensation ?** Oui, décidé avec
   l'utilisateur -- bandeau périodique dans l'appli, même esprit que
   la bannière de mise à jour (issue #10) existante.

**Mise en œuvre (bénéficie à Android aussi, pas iOS-only)** :
- `navigator.storage.persist()` demandé une fois par page (`sw-register.js`,
  partagé par les 3 pages) -- jamais bloquant si absent/refusé, un
  atténuateur de risque, pas un pré-requis.
- `#rappel-export` (`app.html`/`app.js`) : bandeau si au moins une
  entrée existe ET (jamais exporté OU dernier export > 30 jours,
  `RAPPEL_EXPORT_JOURS`). "Plus tard" masque pour la session en cours
  seulement (`sessionStorage`) -- réapparaît au prochain lancement tant
  qu'aucun export n'a eu lieu entre-temps. Bouton "Exporter" renvoie
  vers `aide.html#s3` (ancre déjà existante).
- `localStorage.fletchlog_dernier_export` écrit dans
  `livrerExport()` (`export-import.js`) -- après partage natif Android
  ET après le repli téléchargement classique (un partage annulé
  retombe sur le téléchargement dans le code existant, donc un fichier
  est produit dans tous les cas où cette fonction se termine).

**Piège de positionnement CSS repéré visuellement** : `.rappel-export`
copiait le même `bottom` que `.fab` (`88px`) en pensant "au-dessus du
FAB" -- en réalité ça les alignait au même niveau, le bandeau (au
z-index plus élevé) cachait complètement le bouton "+" pendant qu'il
était affiché. Corrigé en calculant le vrai bord haut du FAB
(88px + 56px de hauteur = 144px) plus une marge, `bottom: 154px`.
Repéré uniquement grâce à la capture d'écran réelle, pas visible en
lisant juste le CSS.

**Balises iOS ajoutées (2026-08-23)** -- `manifest.json` n'est pas lu
par Safari pour "Ajouter à l'écran d'accueil" : sans balises dédiées,
icône = capture d'écran de la page, ouverture dans Safari plutôt qu'en
standalone. Ajouté sur les trois pages (`apple-touch-icon` vers
`icon-192.png`, `apple-mobile-web-app-capable`,
`apple-mobile-web-app-status-bar-style: black-translucent` -- cohérent
avec le thème sombre et les `env(safe-area-inset-*)` déjà utilisés
partout, `apple-mobile-web-app-title`). Vérifié réellement que les
balises sont bien présentes/valides (Selenium, les trois pages) --
**pas vérifié sur un vrai Safari/iOS**, aucun appareil ni simulateur
disponible dans cet environnement. Le vrai support iOS (#18) reste
très en amont : ces balises seules ne suffisent pas, tout le reste
(comportement de `capture="environment"` sur Safari, fiabilité réelle
du stockage sur plusieurs jours, rendu Leaflet...) doit être vérifié à
la main sur un iPhone.

## Regroupement Liste + clustering Carte (retour utilisateur, 2026-08-24)

**Vue Liste** : en-têtes de groupe calées sur le critère de tri déjà
choisi (`tri-liste`), pas un contrôle "grouper par" séparé --
`cleGroupeListe(entree, critere)` retourne `{cle, libelle}` ou `null`.
`date-desc`/`date-asc` groupent par mois (`formaterMoisAnnee()`,
nouvelle fonction miroir de `formaterDate()`), `lieu-asc` par lieu
exact, `discipline-asc` par discipline. **Pas de groupement pour
`titre-asc`** -- les titres sont surtout uniques, un en-tête par
entrée n'aiderait pas à balayer la liste, choix délibéré plutôt
qu'oublié. `rafraichirListe()` insère un `<div class="liste-groupe-entete">`
avant chaque nouvelle entrée dont la clé de groupe diffère de la
précédente (liste déjà triée -- une clé de groupe non contiguë
signifierait un bug de tri, pas géré séparément). Vérifié réellement
(Selenium) pour les 4 critères, y compris l'absence d'en-têtes sur
`titre-asc`.

**Vue Carte** : `Leaflet.markercluster` 1.5.3 vendoré (même principe
que Leaflet lui-même -- unpkg, committé, jamais de CDN à l'exécution).
`carteCouchePins` passe de `L.layerGroup()` à `L.markerClusterGroup()`
-- seul changement fonctionnel nécessaire, le reste du code
(`marker.addTo(carteCouchePins)`, `marker.on("click", ...)`) est
inchangé, le plugin est une extension compatible de `L.FeatureGroup`.
Clusters recolorés sur la palette de l'appli (`var(--gold)`, un seul
ton pour les trois paliers small/medium/large -- MarkerCluster.Default.css
utilise vert/jaune/orange par défaut, pas cohérent avec l'identité
visuelle). `pinCarteActif.getElement()?.` (déjà en optional chaining
avant ce changement) protège déjà contre le cas où un marqueur est
caché dans un cluster non éclaté -- aucun changement nécessaire là.
Vérifié réellement (Selenium, points très proches) : 3 marqueurs
proches -> 1 cluster affichant "3" à faible zoom ; zoom élevé sur le
point -> éclatement partiel (les points les plus proches entre eux
peuvent rester groupés même à zoom max, `maxClusterRadius` par défaut
80px étant en pixels d'écran, pas en distance réelle -- comportement
normal du plugin, pas un bug).

## Filtre de période + carte souvenir (retour utilisateur, 2026-08-25)

**Filtre de période** : deux `<input type=date>` ("Du"/"Au") ajoutés à
`#filtres-barre`, aux côtés des chip-select existants -- s'applique
aux vues Liste et Carte comme les autres filtres (`entreesFiltrees()`
dans app.js compare directement les chaînes AAAA-MM-JJ, lexicographiquement
ordonnées, pas besoin de parser en `Date`). Pas de bouton "réinitialiser
les filtres" dans ce projet (déjà le cas pour les chip-select
existants) -- cohérent de ne pas en ajouter un seulement pour la
période.

**Carte souvenir** (`souvenir.js`, fichier séparé -- même principe
qu'`export-import.js`, fonctionnalité autonome plutôt que de grossir
app.js) : image récapitulative en `<canvas>` (1080x1350, aucune
dépendance ajoutée) générée à partir des sorties actuellement
filtrées (`entreesFiltrees()`, appelée telle quelle -- pas d'état de
filtre propre à la carte souvenir). Titre déduit automatiquement du
résultat : un seul lieu -> ce lieu ; sinon une seule discipline -> elle ;
sinon une période choisie -> "Du ... au ..." ; sinon "N sorties". Une
seule photo "vedette" (la sortie filtrée la plus récente qui en a une,
`photosCache` déjà rempli par `precharcherPhotos()` -- aucune nouvelle
lecture IndexedDB) plutôt qu'une mosaïque, pour rester simple à mettre
en page proprement. Répartition météo en icônes+compteurs. Bouton
Télécharger toujours actif ; bouton Partager affiché seulement si
`navigator.canShare` supporte les fichiers (repli sur Télécharger si le
partage échoue ou est annulé), même patron que `livrerExport()` dans
export-import.js -- dupliqué en plus petit ici plutôt que de créer une
dépendance entre aide.html (où vit export-import.js) et app.html (où
vit souvenir.js), qui ne chargent pas les mêmes scripts.

**Bug réel rencontré en testant** : l'empilage du texte (titre, sous-titre,
compteur, météo, pied de page "FletchLog") était fait du HAUT vers le
BAS avec le pied de page à une position Y fixe -- avec un titre court
et un sous-titre présent, le compteur "N sorties" finissait quasiment à
la même hauteur que le pied de page, les deux textes se chevauchant
visuellement. Corrigé en empilant plutôt du BAS vers le HAUT (position
Y du pied de page fixe, chaque élément au-dessus décale le curseur d'un
pas connu avant de dessiner) -- garantit qu'aucun élément ne peut plus
chevaucher un autre, quelle que soit la hauteur du titre. **Leçon
retenue** : pour un layout canvas avec du contenu de hauteur variable
(titre qui peut faire 1 ou 2 lignes, sous-titre optionnel...), toujours
empiler à partir d'une extrémité fixe (ici le bas) plutôt que de
calculer une position absolue pour un élément "en bas" indépendamment
de ce qui a été dessiné juste au-dessus.

## Rappel d'export déclenché sur changement de version (retour utilisateur, 2026-08-25)

Signalé par l'utilisateur : perte de données constatée en passant de
v0.6.x à v0.7.0. Diagnostiqué avant de coder quoi que ce soit -- `git
diff v0.6.0 v0.7.0` sur `storage.js`/`manifest.json`/`sw.js` ne montre
aucun changement touchant IndexedDB (juste le numéro de cache habituel
et l'ajout de `souvenir.js` à la liste des fichiers précachés) : la
mise à jour elle-même (le service worker se met à jour en place via
`skipWaiting`) n'a rien fait qui puisse vider le stockage. Cause la
plus probable : une éviction de stockage par le navigateur/OS
(voir déjà #18 ci-dessus, "Rappel d'export + stockage persistant"),
qui a coïncidé avec le moment où l'utilisateur a découvert la nouvelle
version, sans lien de cause à effet direct.

Plutôt qu'une vraie synchronisation/sauvegarde serveur (disproportionné
pour ce projet, contraire au principe local-only assumé, voir CLAUDE.md
racine), renforcement du mécanisme existant : le rappel d'export
périodique (issue #18, tous les 30 jours) laisse une fenêtre large
entre deux relances -- ajout d'un second déclencheur, indépendant du
délai, qui vise précisément le moment identifié comme risqué.

- `verifierChangementVersion()` (`app.js`) : compare `FLETCHLOG_VERSION`
  (chargé désormais aussi dans `app.html`, comme les deux autres pages --
  jusqu'ici seul le footer d'`index.html`/`aide.html` en avait besoin)
  à `localStorage.fletchlog_derniere_version_vue`. Différence détectée
  (et au moins une entrée existante) -> bandeau `#rappel-export` affiché
  immédiatement, avec un texte spécifique
  (`rappelExportTexteVersion`) plutôt que le texte générique du rappel
  périodique -- remplace le `textContent` du `<span>` directement (pas
  besoin de refaire passer par `applyTranslations()`, le DOM est
  reconstruit à chaque chargement de page donc rien à restaurer).
  Ignore volontairement `sessionStorage.fletchlog_rappel_export_masque`
  (signal distinct du rappel périodique, plus important). `dev` (valeur
  locale non patchée par le workflow de déploiement) n'y déclenche
  jamais rien -- pas de faux positif hors production.
- Appelé en priorité dans `chargerEntrees().then(...)` : si
  `verifierChangementVersion()` ne se déclenche pas (première visite
  avec cette version, ou version inchangée), repli sur
  `verifierRappelExport()` (comportement à 30 jours inchangé).

**Vérifié réellement** (Selenium, patch temporaire de `version.js` sur
disque pour simuler une valeur de production -- `const
FLETCHLOG_VERSION` étant déclarée dans un `<script>` classique séparé,
pas moyen fiable de la réassigner depuis l'extérieur après coup, un
`const` au niveau supérieur n'est pas exposé comme propriété
réassignable de `window`) : bandeau affiché avec le bon texte au
passage v0.6.0 -> v0.7.0, `localStorage` mémorise bien la nouvelle
version, pas de redéclenchement à version inchangée. `version.js`
restauré à `"dev"` immédiatement après (jamais committé patché).

## Export accessible depuis la barre du bas (retour utilisateur, 2026-08-25)

Signalé juste après le rappel ci-dessus : l'export n'était pas assez
visible (accessible seulement via la page Aide, ou le bandeau de
rappel qui n'apparaît qu'à 30 jours/changement de version). Proposé et
choisi avec l'utilisateur : un 3e bouton dans `.bottom-nav`
(`#bouton-export-rapide`), à côté des deux onglets Liste/Carte, qui
déclenche directement le vrai export (zip complet, même
`exporterSauvegarde()`/`livrerExport()` que la page Aide -- pas de
logique dupliquée) sans quitter l'écran.

**Piège JS évité en écrivant ce ticket** : `.bottom-nav` avait
jusqu'ici seulement deux boutons de VUE (`.nav-btn[data-view]`),
sélectionnés génériquement en JS via `document.querySelectorAll(".nav-btn")`
dans `initNavigation()` -- le clic lisait `bouton.dataset.view` puis
togglait `.active` sur tous les `.nav-btn` et les sections `.view`
selon `id === "view-" + vue`. Un bouton d'export avec juste la classe
`.nav-btn` (pour hériter du même style) aurait été capté par ce même
sélecteur : `vue` serait `undefined` (pas de `data-view`), aucune
section `.view` ne correspondrait à `"view-undefined"`, et les DEUX
vues auraient disparu au clic sur Exporter. Corrigé en restreignant le
sélecteur à `.nav-btn[data-view]` aux deux endroits concernés --
`.nav-btn` reste la classe de style partagée, `[data-view]` distingue
les vrais onglets de vue d'un bouton d'action qui emprunte juste
l'apparence. **Leçon générale** : un sélecteur générique sur une classe
de style (`.nav-btn`, `.btn-primary`...) est fragile dès qu'on
réutilise cette classe pour un élément qui n'a pas la même sémantique --
préférer un attribut dédié (`[data-view]`) pour cibler le comportement,
la classe restant purement visuelle.

Séparé visuellement des deux onglets par une bordure + marge
(`.nav-btn-action`) plutôt qu'un simple 3e bouton identique -- lecture
"action" et non "3e vue possible" (jamais d'état `.active` dessus, vu
plus haut). Nécessite de charger `jszip.min.js` + `export-import.js`
aussi dans `app.html` désormais (jusqu'ici seulement dans `aide.html` --
voir la note dans la section carte souvenir ci-dessus sur le principe
de scripts non partagés entre ces deux pages : ce principe tenait pour
`souvenir.js`, qui n'avait besoin que d'une petite fonction de
téléchargement dupliquée ; ici on veut le VRAI export complet, donc le
partage des fichiers l'emporte sur l'évitement de dépendance).

**Vérifié réellement** (Selenium) : navigation Liste/Carte inchangée
après le changement de sélecteur, le bouton Exporter ne prend jamais
la classe `.active` et ne perturbe pas l'état des vues au clic, un
vrai fichier `.zip` est téléchargé.

## Carte souvenir -- photo vedette et ratio d'origine (retour utilisateur, 2026-08-25)

Deux corrections demandées après coup sur la carte souvenir (voir
section dédiée plus haut) :

1. **Photo vedette dépendante du tri sélectionné, pas systématiquement
   la plus récente.** `_photoVedette()` (`souvenir.js`) appelait
   directement un tri interne par date décroissante -- change pour
   `trierEntrees(entrees)` (`app.js`, déjà utilisée par la vue Liste,
   respecte le critère choisi dans `#tri-liste` : date, titre, lieu ou
   discipline) puis prend la première entrée du résultat qui a une
   photo en cache. La carte souvenir reflète maintenant exactement ce
   que l'utilisateur regarde déjà (même principe que
   `entreesFiltrees()`, déjà appelée telle quelle sans état de filtre
   propre à la carte).
2. **Photo affichée à son ratio d'origine, jamais rognée.** Le rendu
   utilisait un `cover`-fit (`Math.max` des deux échelles) qui remplissait
   tout le cadre 1080x1350 en coupant le haut/les côtés selon le ratio
   réel de la photo -- changé en `contain`-fit (`Math.min`) dans une
   zone dédiée (entre le bas de la marque FletchLog et le haut du bloc
   de texte, calculée après avoir empilé le texte -- toujours du BAS
   vers le HAUT comme avant, voir plus haut). Fond uni (`#0f1216`)
   partout où la photo ne couvre pas la zone (au lieu d'un dégradé
   posé SUR la photo, qui n'a plus de sens puisque le texte ne
   chevauche plus jamais la photo). Conséquence attendue et acceptée :
   une photo très différente du ratio 4:5 de la carte (paysage large,
   portrait très étroit) laisse des bandes de fond uni au-dessus/en
   dessous ou sur les côtés -- préféré à rogner la photo.

Pas de changement côté stockage : `compresserPhoto()` (`app.js`)
limite déjà chaque photo à 1600px sur le plus grand côté à
l'enregistrement (JPEG qualité 0.7) -- un seul blob par photo, jamais
de vignette distincte d'un original conservé séparément. Vérifié en
répondant à la question de l'utilisateur avant de coder quoi que ce
soit -- pas de gain de qualité à aller chercher côté stockage, le sujet
réel était le rognage, pas la résolution.

**Vérifié réellement** (Selenium, deux photos de tests générées avec
Pillow -- une paysage 1600x900, une portrait 900x1600, deux sorties à
des dates différentes) : la vedette passe bien de la photo la plus
récente (tri par défaut, date décroissante) à la plus ancienne dès que
le tri passe à "Titre (A→Z)" (la sortie au titre alphabétiquement
premier a la photo la plus ancienne dans ce jeu de test) ; les deux
ratios s'affichent intégralement, sans rognage, sans chevaucher le
bloc de texte, capture plein résolution (`canvas.toDataURL()`)
sauvegardée dans les deux cas pour vérification visuelle directe.

## Bande de vignettes des sorties supplémentaires (retour utilisateur, 2026-08-25)

Ajout demandé juste après le point ci-dessus : en plus de la photo
vedette en grand format, une rangée de petites vignettes en bas de
carte pour les autres sorties filtrées qui ont aussi une photo (juste
la première, `photoIds[0]`, comme la vedette -- pas une mosaïque
complète par sortie).

- `_photosSupplementaires(entrees, entreeVedette)` (`souvenir.js`) :
  même ordre de tri que la vedette (`trierEntrees()`), la vedette
  exclue par id. `_entreeVedette()` remplace l'ancien `_photoVedette()`
  -- retourne l'entrée entière (pas juste l'URL de la photo), pour
  pouvoir l'exclure par id ici.
- Plafonné à `SOUVENIR_VIGNETTE_MAX = 6` (140px de côté + 16px d'écart,
  tient tout juste dans la largeur utile 952px = 1080 - 2×64 -- pas de
  défilement possible sur une image statique). Au-delà, la dernière
  vignette affichée porte un badge "+N" semi-transparent
  (`_dessinerBadgePlus()`) plutôt que d'en dessiner davantage.
- Recadrage en carré arrondi ("cover", via un chemin de clip --
  `_dessinerVignette()`/`_cheminRectArrondi()`) -- cohérent avec les
  vignettes du reste de l'appli (`.carte-vignette img { object-fit:
  cover }`), à la différence volontaire de la photo vedette en grand
  format (celle-ci reste en "contain", jamais rognée, voir la section
  juste au-dessus -- le recadrage n'est acceptable qu'à cette taille
  réduite, pas sur l'image principale).
- Insérée dans l'empilage bas→haut existant, juste au-dessus du pied
  de page "FletchLog" et avant la météo -- `yCurseur` y représente
  alternativement une ligne de base de texte (`fillText`) et un haut
  de bloc image (`drawImage`), il fallait donc réserver explicitement
  `SOUVENIR_VIGNETTE_TAILLE + 34px` avant de laisser la suite de
  l'empilage (météo/compteur/sous-titre/titre) continuer comme avant,
  plutôt que de mélanger les deux conventions sans transition.

**Non vérifié visuellement cette fois** -- écrit avec soin (calcul
d'empilement revérifié à la main, cohérent avec le motif déjà établi
et testé pour le reste de la carte) et passe `node --check`, mais
contrairement à toutes les vérifications précédentes sur ce fichier,
**pas de capture d'écran réelle obtenue** : l'environnement de test
(Selenium + serveur HTTP local dans le scratchpad) a subi plusieurs
purges complètes en cours d'exécution ce jour-là (dossier scratchpad
entièrement vidé pendant que le test tournait, y compris en
arrière-plan détaché) -- signalé explicitement à l'utilisateur plutôt
que de prétendre à une vérification qui n'a pas eu lieu. À vérifier à
la prochaine session si l'occasion se présente, ou par un retour
utilisateur réel après déploiement.

## Carte au ratio de la photo, infos superposées (retour utilisateur, 2026-08-25)

Revirement sur la section juste au-dessus : demandé "la carte avec le
même ratio que la photo, avec les infos et photos par-dessus" -- retour
à des infos superposées SUR la photo (comme la toute première version
de la carte souvenir) plutôt qu'en dessous sur fond séparé, mais cette
fois avec un canvas dont le ratio suit la photo vedette au lieu d'un
format fixe 1080x1350 qui la recadrait.

- `_dimensionsCarte(photo)` (`souvenir.js`) : largeur fixe 1080
  (cohérente avec les tailles de police déjà calibrées dessus), hauteur
  = `1080 / ratio` où `ratio` = ratio réel de la photo **borné** à
  `[SOUVENIR_RATIO_MIN=0.55, SOUVENIR_RATIO_MAX=1.5]`. Sans photo :
  format par défaut 1080x1350 (4:5, inchangé).
- **Pourquoi borner plutôt que suivre le ratio exact** : un titre sur 2
  lignes + sous-titre + météo + bande de vignettes peut occuper jusqu'à
  ~600px de haut empilés depuis le bas -- une carte trop plate (photo
  très large) ferait déborder le titre au-dessus du cadre. 1.5 (3:2)
  plutôt que 16:9 (1.78) garde une hauteur mini de 720px, marge de
  sécurité suffisante. 0.55 côté portrait est plus généreux (une carte
  haute a naturellement toute la place nécessaire en bas). Une photo
  hors de ces bornes perd un peu de ses bords (toujours en "cover"),
  plutôt que de produire une carte au format absurde.
- `canvas.width`/`canvas.height` fixés dynamiquement dans
  `_dessinerSouvenir()` d'après la photo chargée (déjà en mémoire à ce
  stade, donc dimensions connues avant tout dessin) -- les modifier
  efface et redimensionne le canvas, pas besoin de `clearRect` séparé.
  Le CSS (`#souvenir-canvas { width:auto; height:auto; max-width:100%;
  max-height:70vh }`) suit automatiquement, aucun changement requis
  côté `app.html`.
- Dégradé sombre en bas réintroduit (`hauteur*0.4` -> `1.0`, opacité
  jusqu'à 0.92) pour la lisibilité du texte superposé -- supprimé puis
  remis dans la même journée, selon la direction demandée à chaque
  fois (voir section précédente pour le "sans dégradé, texte en
  dessous").
- Vignettes des sorties supplémentaires : liseré blanc fin ajouté
  (`_dessinerVignette()`) -- nécessaire maintenant qu'elles peuvent
  reposer sur une photo chargée plutôt qu'un fond uni, même sous le
  dégradé.

**Non vérifié visuellement, deuxième fois d'affilée** -- même
instabilité de l'environnement de test que pour la section
précédente (scratchpad vidé pendant l'exécution du test Selenium),
qui ne s'est pas résorbée dans la même session. Signalé explicitement
à l'utilisateur, qui a choisi de pousser/publier quand même et de
vérifier lui-même en réel. Code revérifié à la main (calcul des bornes
de ratio, marge de sécurité du bloc de texte empilé) mais **pas
confirmé par un rendu réel** -- première chose à vérifier à la
prochaine occasion si l'environnement redevient stable, notamment sur
une vraie photo très large ou très haute (cas où le bornage entre en
jeu) et sur le contraste du texte superposé sur une photo claire.

## Trois retouches carte souvenir (retour utilisateur, 2026-08-26)

Environnement de test redevenu stable ce jour-là -- vérifié réellement
cette fois (Selenium), contrairement aux deux sections précédentes.

1. **"FletchLog" écrit deux fois** -- la marque en haut à gauche
   (logo+texte) ET le pied de page textuel répétaient le même mot.
   Le pied de page textuel est supprimé (`_dessinerSouvenir()`) --
   `yCurseur` démarre maintenant comme simple marge basse (`hauteur -
   40`) plutôt que comme ligne de base d'un texte "FletchLog" dessiné,
   le reste de l'empilage bas→haut est inchangé (voir les sections
   précédentes sur pourquoi cet empilage part toujours d'une
   extrémité fixe).
2. **Sous-titre redondant avec le titre quand le filtre est une
   période** -- si aucun lieu ni discipline uniques ne permettent de
   titrer la carte, le titre devient "Du X au Y" (le filtre de
   période), et le sous-titre affichait la MÊME période (calculée
   séparément à partir des dates réelles des entrées, qui coïncident
   ou sont incluses dans le filtre). Corrigé : `_titreEtSousTitre()`
   retourne un flag interne `titreEstPeriode` ; quand vrai, le
   sous-titre devient `_listeLieux(entrees)` (nouvelle fonction --
   liste des lieux distincts, "A, B, C" jusqu'à 3, sinon "A, B et N
   autres" via la nouvelle clé i18n `souvenirLieuxEtAutres") plutôt
   que la période. `titreEstPeriode` implique toujours au moins 2
   lieux distincts (sinon le titre aurait pris la branche "un seul
   lieu" avant celle-ci), pas besoin de re-garder ce cas.
3. **Discipline(s) et tags ajoutés** -- deux nouvelles lignes
   compactes, même style que la météo existante :
   - `_statsDisciplines(entrees)` : répartition par discipline
     (`"Indoor ×3"`, comme la météo) -- **retourne volontairement un
     tableau vide si une seule discipline distincte existe** (déjà le
     titre dans ce cas, la répéter serait redondant, même logique que
     le point 2 mais tranchée au niveau de la fonction plutôt qu'un
     flag séparé).
   - `_statsTags(entrees)` : labels les plus fréquents, préfixés `#`
     (`"#amis #competition"`), plafonnés à 5 -- pas de troncature
     `_decouperTexte()` comme le titre, un excès reste juste hors-cadre
     plutôt que d'ajouter un "+N" comme les vignettes (accepté comme
     compromis, cas rare avec le plafond à 5).
   - Ordre dans l'empilage bas→haut (donc visuellement, de haut en
     bas) : vignettes, tags, disciplines, météo, compteur, sous-titre,
     titre -- les "petites stats" groupées ensemble entre les
     vignettes et le bloc titre/compteur.
   - **`SOUVENIR_RATIO_MAX` resserré de 1.5 à 1.35`** en conséquence
     -- ces 2 lignes supplémentaires alourdissent le pire cas
     d'empilement (~700px avec tout présent : titre 2 lignes +
     sous-titre + météo + disciplines + tags + vignettes), 1.35 garde
     ~100px de marge dessus (hauteur mini 800px à largeur 1080 fixe).

**Vérifié réellement** (Selenium, 3 sorties avec lieux/disciplines/tags
distincts + une photo, filtre de période englobant les 3) : un seul
"FletchLog" affiché (en-tête), sous-titre = liste des lieux (pas la
période répétée), ligne disciplines et ligne tags toutes deux
correctes et lisibles, aucun chevauchement -- capture plein résolution
inspectée directement. **Leçon sur l'instabilité de l'environnement
elle-même** : la capture avait été sauvegardée avec succès dans le
scratchpad (confirmé par `ls`) mais a disparu avant d'avoir pu être
relue -- contournée en copiant le fichier hors du scratchpad (dans le
répertoire de travail du dépôt, sous un nom préfixé `.`, supprimé
juste après lecture) plutôt que de re-régénérer la capture en boucle.

## Sélection manuelle des photos + mise à jour de l'aide (retour utilisateur, 2026-08-26)

Deux demandes distinctes :

1. **Aide pas à jour** -- vérifié en relisant `aide.html` (pas supposé) :
   ne mentionnait ni le filtre de période, ni la carte souvenir, ni le
   bouton d'export rapide de la barre du bas. Complété : `aideS2ListeText`
   mentionne le filtre de période, nouvelle sous-section "Carte souvenir"
   (`aideS2SouvenirTitle`/`Text`) dans `aideS2`, `aideS3Text` mentionne le
   bouton d'export rapide en plus de celui de la page Aide.
2. **Choisir quelles photos illustrent la carte souvenir** -- avant :
   toujours la première sortie (photo) selon le tri courant, aucun
   moyen d'exclure une sortie précise ou d'en choisir une autre.
   Question posée explicitement (réordonner les photos d'une sortie
   vs. sélection propre à la carte) : **sélection propre à la carte**
   retenue -- pas d'effet de bord sur les entrées elles-mêmes, couvre
   vedette ET vignettes en un seul geste, pas besoin de construire un
   glisser-déposer générique.

**Écran de sélection** (`#souvenir-selection`, nouvel écran dans
`.souvenir-overlay`) : affiché entre le clic sur 🖼️ et le rendu de la
carte, seulement s'il y a au moins une sortie filtrée avec photo
(sinon carte générée directement, comme avant -- rien à choisir). Une
grille de vignettes (une par sortie avec photo, `photoIds[0]`, cover
recadré comme les vignettes du reste de l'appli) : taper l'image
bascule inclus/exclu (opacité réduite si exclue) ; taper l'étoile ★
en haut à droite désigne la vedette explicitement (réinclut aussi la
sortie si elle était exclue -- un choix explicite de vedette prime
sur une exclusion tacite). "Générer la carte" déclenche le rendu.

**Point de conception important** : `selectionPhotos` (`{idsExclus,
idVedette}`, nouveau 2e paramètre de `_dessinerSouvenir()`) restreint
UNIQUEMENT quelles sorties peuvent illustrer la carte -- le titre, le
sous-titre, le compteur "N sorties", la météo, les disciplines et les
tags continuent de porter sur `entrees` en entier (toutes les sorties
filtrées), jamais sur le sous-ensemble illustré. Exclure la photo
d'une sortie ne doit jamais la faire "disparaître" des statistiques
de la carte -- seulement de son illustration. `_entreeVedette()` et
`_photosSupplementaires()` reçoivent désormais `entreesIllustration`
(le sous-ensemble filtré par `idsExclus`), calculé séparément de
`entrees` (le jeu complet) dans `_dessinerSouvenir()`.

`_entreeVedette(entrees, idVedetteManuel)` : la vedette manuelle
l'emporte si elle a encore une photo disponible (pas exclue) dans le
sous-ensemble reçu, sinon repli sur la première selon le tri comme
avant l'ajout de la sélection manuelle -- comportement par défaut
inchangé si l'utilisateur ne touche à rien dans l'écran de sélection.

**Vérifié réellement** (Selenium, 3 sorties avec photos de couleurs
distinctes à des dates différentes) : écran de sélection affiché avec
3 vignettes, vedette par défaut = la plus récente (comme avant),
exclusion de la vedette par défaut -> bascule automatique sur la
suivante selon le tri, choix manuel d'une 3e sortie (jamais exclue,
pas la plus récente) -> devient bien la vedette prise en compte,
sortie exclue toujours exclue après un choix de vedette sur une autre
sortie (pas de réinclusion accidentelle), carte finale generée avec
la bonne vedette et la bonne bande de vignettes (sortie exclue
totalement absente), "N sorties" resté correct malgré l'exclusion --
capture plein résolution inspectée directement.

## "Sortie" renommé en "Entrée" (retour utilisateur, 2026-08-26)

Signalé : le mot "sortie" (utilisé partout dans l'UI jusqu'ici) ne
correspond pas forcément à ce que l'utilisateur veut y consigner --
premier cas d'usage réel visé : la position GPS exacte d'UNE cible
d'un parcours 3D, pas toute la séance. Clarifié explicitement avant de
coder : **pas de changement de modèle de données ni de concept de
"séance" regroupant plusieurs entrées** -- une entrée peut déjà être,
au choix de l'utilisateur, une sortie entière ou une cible ponctuelle
(les champs `cible`/`distance`/`commentaire` sont déjà en texte
libre) ; seul le mot affiché posait problème.

**Terme retenu : "Entrée"** (recommandé parmi 3 options proposées --
"Entrée"/"Fiche"/"Repère") -- neutre, couvre aussi bien une sortie
complète qu'une cible isolée, et correspond déjà au vocabulaire
utilisé en interne dans le code/la base depuis le début du projet
(`storage.js` : store `"entrees"`, `entreesActuelles`,
`entreesFiltrees()`...) -- ce changement aligne enfin le vocabulaire
UI sur celui déjà utilisé côté code, qui n'avait jamais suivi "sortie".

Remplacement de toutes les chaînes UTILISATEUR (`i18n.js`, fr et en --
"session"/"sessions" en anglais, remplacé par "entry"/"entries" --
plus les textes de repli codés en dur dans `app.html`/`aide.html`,
avant que `applyTranslations()` ne s'exécute) -- **pas** les noms de
clés i18n existants (`souvenirSortieSing`/`Plur`, `souvenirBouton`...,
identifiants internes, renommer aurait été un risque sans bénéfice
visible) ni les commentaires de code (déjà "entrée"/"entrees" partout
en interne, aucun conflit à résoudre). Parité fr/en des clés
revérifiée par script (133 clés de chaque côté, aucune orpheline).

**Vérifié réellement** (Selenium) : titre du bouton "+", message liste
vide, titre du formulaire d'ajout, toast après enregistrement -- en
français ET après bascule vers l'anglais.

## Choisir la vignette d'une entrée (retour utilisateur, 2026-08-26)

Complète la sélection de photos ajoutée pour la carte souvenir (voir
plus haut) : demandé en plus, le moyen de choisir/réordonner laquelle
des photos d'UNE entrée sert de vignette (`photoIds[0]`, utilisé
partout -- Liste, aperçu Carte, et maintenant vedette/vignette de la
carte souvenir). Pas de vrai glisser-déposer -- un badge ★
(`.photo-vignette-couverture`, réutilise le même motif visuel que
l'écran de sélection de la carte souvenir) sur chaque vignette de la
galerie du formulaire, affiché seulement s'il y a plus d'une photo
(rien à choisir sinon) ; taper dessus fait passer cette photo en
position 0 (`definirPhotoCouverture()`, un simple
`splice`+`unshift`). `resoudrePhotosPourEnvoi()` préservait déjà
l'ordre de `photosFormulaire` dans `photoIds` à l'enregistrement
(commentaire du code : "dans l'ordre d'affichage") -- aucun changement
nécessaire côté sauvegarde, juste réordonner le tableau en mémoire
avant.

**Vérifié réellement** (Selenium, 3 photos de couleurs distinctes,
comparaison de pixels sur `<canvas>` plutôt que la simple présence
d'une `src`) : vignette = rouge (1ère photo ajoutée) par défaut,
devient bleue après avoir tapé le badge ★ de la 3e photo, et la carte
de la vue Liste affiche bien la vignette bleue une fois l'entrée
enregistrée -- confirme que l'ordre choisi dans le formulaire se
propage correctement jusqu'à `photoIds` puis à l'affichage.

## Bug réel : message "Le lieu est obligatoire" trompeur (retour utilisateur, 2026-08-26)

Signalé : sur une entrée existante, ajouter une photo depuis la
galerie puis "Enregistrer" affichait "Le lieu est obligatoire" alors
que le champ était bien rempli. Diagnostiqué avant de corriger --
non reproductible en Selenium avec un vrai JPEG (formulaire enregistré
sans erreur, sur une entrée sans photo comme avec une entrée en ayant
déjà une), ce qui a orienté la recherche vers deux pistes distinctes :

1. **Le vrai bug de code, confirmé et corrigé** : le `.catch()`
   générique de `soumettreFormulaire()` (`app.js`) se contentait de
   `document.getElementById("form-erreur").hidden = false` SANS
   jamais y remettre de texte à jour -- en cas d'échec, quel qu'il
   soit, le contenu HTML statique par défaut de cet élément
   (`data-i18n="formLieuRequis"`, texte "Le lieu est obligatoire.")
   restait affiché tel quel. N'importe quel échec inattendu (photo,
   IndexedDB...) affichait donc ce message n'ayant aucun rapport avec
   la vraie cause. Corrigé : le `.catch()` appelle maintenant
   `afficherErreurFormulaire()` avec une clé adaptée -- distingue un
   échec de traitement de photo (`formPhotoInvalide`, message
   actionnable) d'un échec générique (`formErreurGenerique`).
2. **Cause probable côté utilisateur, vérifiée par recherche web (pas
   supposée)** : Chrome ne sait décoder les images HEIC/HEIF dans
   AUCUN contexte (`<img>`, `<canvas>`...), sur aucune plateforme y
   compris Android, même quand l'OS lui-même sait le faire --
   confirmé via [upsidelab.io](https://upsidelab.io/blog/handling-heic-on-the-web)
   et [testmuai.com](https://www.testmuai.com/web-technologies/heif-chrome/).
   `compresserPhoto()` charge la photo dans un `<img>` pour la
   redimensionner -- sur un fichier HEIC (photo par défaut de
   certains Android "haute efficacité", ou synchronisée depuis un
   iPhone), `image.onerror` se déclenche et rejette avec "Image
   invalide.", exactement le chemin de code reproduit en test (voir
   plus bas). **Pas confirmé à 100% que c'était le fichier exact de
   l'utilisateur** (pas d'accès à son téléphone) -- mais cohérent avec
   tous les faits rapportés, et le vrai bug (message trompeur) est
   corrigé indépendamment de cette hypothèse précise.

**Reste ouvert, à trancher avec l'utilisateur si le cas se représente**
: corriger le message (fait) rend l'échec compréhensible, mais un
fichier HEIC reste toujours injoignable tel quel dans FletchLog --
un vrai décodage HEIC côté client demanderait une bibliothèque dédiée
(ex. `heic2any`/`libheif-js`, WASM) à vendorer, poids non négligeable
pour un besoin qui ne concerne qu'une partie des photos d'une partie
des téléphones -- pas ajoutée sans en discuter d'abord (voir le
principe de dépendances du CLAUDE.md global).

**Vérifié réellement** (Selenium, fichier `.jpg` factice -- pas une
vraie image, pour déclencher le même `image.onerror` qu'un HEIC sans
avoir besoin d'un vrai fichier HEIC dans cet environnement) : message
"Une des photos n'a pas pu être lue..." affiché (plus "Le lieu est
obligatoire"), erreur réelle confirmée dans la console
(`Error: Image invalide.`, déclenchée depuis `image.onerror`), champ
lieu toujours rempli dans le formulaire après l'échec (rien perdu).

## Support HEIC ajouté (retour utilisateur, 2026-08-26)

Suite à la section ci-dessus -- demandé en plus, une fois le message
d'erreur corrigé : ne pas se contenter d'un message honnête, faire
fonctionner les photos HEIC pour de vrai.

**`heic2any`** (v0.0.4, MIT, [alexcorvi/heic2any](https://github.com/alexcorvi/heic2any))
vendoré (`heic2any.min.js`, ~1.35 Mo, téléchargé depuis unpkg et
committé -- jamais chargé depuis un CDN à l'exécution, voir le principe
de dépendances du CLAUDE.md global). Choisie car : un seul fichier
autonome (décodeur WASM `libheif` inclus, `new Blob()`+`Worker` créé en
mémoire à l'exécution -- aucun asset externe supplémentaire à vendorer
ni servir), aucune dépendance runtime, expose `window.heic2any` via un
simple `<script>` (pas de bundler nécessaire). Chargée dans `app.html`
seulement (là où vit le formulaire photo), avant `app.js`.

**Poids assumé et pas caché** : ~1.35 Mo précaché pour TOUS les
utilisateurs de `app.html`, même ceux qui n'uploaderont jamais de
photo HEIC -- décision explicite avec l'utilisateur (voir la question
posée avant d'ajouter la dépendance), cohérent avec le traitement déjà
réservé à JSZip/Leaflet (précachés pour tous, pas de chargement à la
demande) plutôt qu'une exception spéciale pour celle-ci.

**`compresserPhoto()`** (`app.js`) : `_estPhotoHeic(fichier)` détecte
un HEIC par type MIME (`image/heic`/`image/heif`) **et** extension
(`.heic`/`.heif`) -- vérifié réellement que Chromium ne rapporte PAS
toujours `image/heic` pour ce genre de fichier (le test avec un vrai
fichier HEIC généré via `heif-enc` donnait `image/heif`), d'où les
deux vérifications plutôt qu'une seule. Si détecté : conversion en
JPEG via `heic2any({blob, toType:"image/jpeg", quality:0.9})` (un
échec de heic2any est normalisé vers la même erreur "Image invalide."
que le reste du pipeline, pour rester détecté par le `.catch()`
générique déjà corrigé plus haut) puis passage dans le MÊME pipeline
de redimensionnement/compression que toute autre photo (max 1600px,
JPEG qualité 0.7) -- pas de chemin de code séparé après la conversion.
Repli silencieux (`typeof heic2any === "function"`) si le script n'a
pas pu se charger pour une raison ou une autre -- comportement d'avant
HEIC (`image.onerror` → "Image invalide.") inchangé dans ce cas.

**Vérifié réellement avec un VRAI fichier HEIC** (pas juste un fichier
factice comme au point précédent) -- `libheif-tools`/`imagemagick-heic`
installés dans l'environnement (`apk add libheif libheif-tools`) pour
générer un `.heic` valide (`heif-enc`, confirmé lisible par
`heif-info`/`heif-convert` avant le test) : `heic2any` bien chargé
(`typeof heic2any === "function"`), upload via la galerie sans erreur,
formulaire fermé (enregistrement réussi), et la couleur de la vignette
résultante dans la Liste correspond à la couleur source du HEIC
(comparaison de pixels sur `<canvas>`, léger écart attendu dû aux deux
passes de recompression JPEG/conversion YCbCr→RGB) -- confirme que
l'image est vraiment décodée et enregistrée, pas juste que l'erreur
est évitée.

## Repères des autres entrées sur le picker de position (retour utilisateur, 2026-08-26)

Demandé : lors du choix manuel d'une position sur la carte (picker,
issue #15), voir les positions des autres entrées déjà enregistrées --
utile notamment pour placer une cible de parcours 3D par rapport aux
cibles déjà notées (voir aussi la section "'Sortie' renommé en
'Entrée'" plus haut, même cas d'usage à l'origine).

`carteMapPickerReperes` (`L.layerGroup()`, ajoutée à `carteMapPicker`
à sa création) -- reconstruite à chaque ouverture du picker
(`rafraichirReperesPicker()`, appelée depuis `ouvrirPickerPosition()`)
plutôt qu'une fois pour toutes : les entrées existantes ou
`idEnEdition` peuvent avoir changé depuis la dernière fois. Montre
**toutes** les entrées avec position (`entreesActuelles`, pas
`entreesFiltrees()`) -- le picker n'a pas son propre état de filtre,
et l'intérêt est d'avoir tout le contexte spatial disponible, pas
seulement ce que la vue Liste/Carte affiche au même moment au travers
de ses filtres actifs. L'entrée en cours d'édition (`idEnEdition`) est
exclue -- sinon un repère se superposerait exactement à la mire pour
une entrée déjà positionnée qu'on modifie.

Même icône que la vue Carte principale (`ICONE_PIN_CARTE`) mais plus
petite et atténuée (`.pin-carte-repere`, 20px + `opacity:0.7` contre
28px pleine opacité) -- volontairement secondaire par rapport à la
mire (`.picker-pin-centre`), qui reste le seul indicateur de "la
position en cours de saisie". `.pin-carte svg { width:28px }` étant
déjà fixé dans la classe de base, un simple `iconSize` différent sur
`L.divIcon` ne suffisait pas à réduire le rendu -- il a fallu une
règle CSS dédiée (`.pin-carte.pin-carte-repere svg`, deux classes sur
le même élément pour battre la règle de base par spécificité).
`bindPopup()` (titre ou repli sur le lieu) au tap, pour identifier
quelle entrée chaque repère représente -- pas de réutilisation de
`afficherApercuCarte()` (bâtie autour de la vue Carte principale et
de ses propres marqueurs/couche de clustering), une simple popup
Leaflet suffit ici.

Pas de clustering sur cette couche (contrairement à
`carteCouchePins`) -- volontairement plus léger, un nombre d'entrées
avec position reste modeste pour un carnet personnel, pas besoin de
la complexité du plugin pour ce cas d'usage secondaire.

**Vérifié réellement** (Selenium, 3 entrées avec positions GPS
distinctes injectées directement via `gpsLat`/`gpsLon` -- pas de vraie
géolocalisation possible en headless) : en éditant la 3e, le picker
affiche exactement 2 repères (`carteMapPickerReperes.getLayers().length
=== 2`) -- ni l'entrée en cours d'édition, ni un repère en trop.
Confirmé aussi visuellement par capture d'écran (dézoomée pour englober
les 3 points) : les deux repères apparaissent nettement plus petits et
atténués que la mire, positionnés correctement l'un par rapport à
l'autre selon leurs coordonnées réelles.

## Rayon de regroupement des pins paramétré en distance réelle au zoom max (retour utilisateur, 2026-08-26)

Demandé : au zoom maximum de la carte, pouvoir distinguer deux pins
espacés d'aussi peu que 2 mètres, plutôt qu'ils restent regroupés.

**Diagnostic avant de coder** : `maxClusterRadius` de
Leaflet.markercluster (voir la section "Regroupement Liste +
clustering Carte" plus haut) est TOUJOURS en pixels écran, jamais en
distance réelle -- déjà noté comme une limite du plugin à l'époque,
sans avoir alors de cas d'usage réel pour la corriger. Calcul avant
correctif : au zoom max (19) et à la latitude de la France (~46.6°),
le rayon par défaut (80px) correspond à ~16 mètres réels (projection
Web Mercator, formule standard vérifiée par recherche --
`156543.03392 * cos(latitude) / 2^zoom`,
[gist.github.com/perrygeo](https://gist.github.com/perrygeo/4478844))
-- largement au-dessus des 2m souhaités, ce qui explique le
regroupement gênant signalé.

**`_rayonRegroupementPins(zoom)`** (`app.js`), passée comme
`maxClusterRadius` (fonction plutôt que nombre fixe -- l'API de
Leaflet.markercluster accepte les deux) à `L.markerClusterGroup()` :
- Au zoom maximum de la carte (`carteMap.getMaxZoom()`, 19 ici) :
  calcule le rayon en pixels correspondant à ~1.9m (légère marge sous
  les 2m demandés) à la latitude du centre courant de la carte
  (`carteMap.getCenter().lat` -- pas une latitude codée en dur, la
  formule en dépend réellement).
- À tout zoom inférieur : comportement par défaut inchangé (80px) --
  **volontairement pas la même formule à tous les zooms** : à un zoom
  très dézoomé, 2 mètres ne représentent qu'une fraction de pixel, un
  rayon calculé de la même façon y désactiverait le regroupement
  presque partout, ce qui n'est pas l'effet recherché (seul le zoom
  max doit se comporter différemment, le reste du dézoomage garde son
  utilité de décongestion visuelle).

**Vérifié réellement** (Selenium, coordonnées calculées pour donner
des écarts réels précis) : `_rayonRegroupementPins(19)` ≈ 9.26px
(cohérent avec le calcul manuel), `_rayonRegroupementPins(10)` = 80
(inchangé). Deux pins à ~1.5m d'écart restent regroupés en un seul
cluster au zoom 19 (sous le seuil) ; deux pins à ~5m d'écart
apparaissent bien comme 2 marqueurs distincts au même zoom (au-dessus
du seuil, comportement impossible avant ce correctif avec le rayon par
défaut de ~16m).

## Icône appareil photo + réinitialisation des données (retour utilisateur, 2026-08-26)

Deux demandes distinctes :

1. **Icône du bouton "prendre une photo"** -- affichait un simple "+"
   texte (`#photo-ajouter`), contrairement au bouton galerie déjà à
   côté (`ICONE_GALERIE`, une vraie icône). `ICONE_APPAREIL_PHOTO`
   ajoutée (`app.js`), même gabarit/style que `ICONE_GALERIE`
   (`stroke="currentColor"`, hérite `color: var(--text-muted)` de
   `.photo-ajouter` -- aucun changement CSS nécessaire).
2. **Réinitialisation des données** -- même fonctionnalité que
   FletchGames (cohérence entre projets frères, voir le CLAUDE.md
   global). `reinitialiserDonnees()` (`storage.js`) : vide les stores
   `"entrees"` ET `"photos"` dans une seule transaction atomique.
   Bouton dans `aide.html` (section "Tes données restent sur ton
   téléphone", à côté d'export/import) + overlay de confirmation
   maison (`.confirm-overlay`/`.confirm-box`, dupliqué depuis le
   patron déjà utilisé dans `app.html` -- `aide.html` n'a pas ce CSS
   partagé) plutôt que `window.confirm()`, même raison que
   FletchGames : le titre du dialogue natif affiche l'origine brute au
   lieu de "FletchLog". Message de confirmation rappelle explicitement
   d'exporter avant si besoin (cohérent avec tout le travail de cette
   session sur les risques de perte de données).

**Vérifié réellement** (Selenium) : bouton photo contient bien un
`<svg>` (plus le texte "+"). Flux de réinitialisation complet -- une
entrée avec photo créée, overlay masqué par défaut, affiché au clic,
annulation ne supprime rien (compte d'entrées inchangé), confirmation
supprime bien tout (`listerEntrees()` retourne 0 entrée après) --
**store `"photos"` vérifié séparément** (compte direct via
`indexedDB.open("fletchlog", 1)` plutôt que par un helper de haut
niveau, aucun n'existant pour ça) : passe de 1 à 0 après
réinitialisation, confirmant que les deux stores sont bien vidés par
la transaction atomique, pas seulement les entrées.

## Lien croisé vers fletchapps (retour utilisateur, 2026-08-26)

Demandé : ajouter dans les apps du club un lien vers fletchapps (le
portail commun), accompagné d'une phrase "aguicheuse" pour donner
envie de découvrir les autres apps -- concerne les quatre dépôts
(fletchapps lui-même, FletchScore, FletchTime, FletchGames,
FletchLog), pas seulement celui-ci. Tickets ouverts sur les trois
autres dépôts + FletchGames (ajouté après coup, signalé manquant par
l'utilisateur) pour ne pas perdre la demande -- voir
`fletchapps#8` (ticket "hub", référence les 3 autres), `fletchscore#51`,
`fletchtime#17`, `fletchgames#1`. Aussi noté en mémoire persistante
(hors dépôt) pour qu'une future session sur l'un de ces projets le
retrouve même sans relire les tickets.

**Phrase finalisée après un aller-retour** : une première version
nommait FletchScore/FletchTime explicitement ("Découvre aussi
FletchScore et FletchTime sur fletchapps") -- écartée par
l'utilisateur, qui voulait une formule plus générique, sans citer les
autres apps par leur nom. Retenue : **"Découvre les autres outils du
club sur fletchapps →"** (fr) / **"Discover the club's other tools on
fletchapps →"** (en) -- même formulation reportée dans les 4 tickets,
pour que l'implémentation sur les autres dépôts la reprenne telle
quelle plutôt que d'en réinventer une.

**Implémentation** : un seul lien (`<a href="https://mrfanghodev.github.io/fletchapps/"
target="_blank" rel="noopener">`, toute la phrase comme texte du lien)
ajouté en 2e ligne du footer existant (`index.html` et `aide.html` --
les deux seules pages qui ont déjà un footer, voir la décision
"Versions"/#20 plus haut) via `<br>`, nouvelle clé i18n
`siteFooterFletchapps`. Pas dans `app.html`, qui n'a pas de footer.

**Vérifié réellement** (Selenium, les deux pages, les deux langues) :
lien présent avec le bon `href`/`target`, texte correct en français
ET en anglais sur `index.html` comme sur `aide.html` (langue forcée
via `localStorage` pour un test propre -- un premier essai avait
mélangé les résultats simplement parce que la préférence de langue
persiste normalement d'une page à l'autre, pas un bug).

## Statistiques du carnet sur la page d'accueil (retour utilisateur, 2026-08-26)

Demandé sur la carte "Ouvrir FletchLog" de `index.html` : nombre
d'entrées, de lieux, puis (demandé juste après, en deux temps) date du
dernier export et taille des données.

`storage.js` chargé sur `index.html` pour la première fois (jusqu'ici
seulement `app.html`/`aide.html`) -- lecture directe d'IndexedDB, pas
d'état à maintenir. `#card-stats` (nouveau `<div>`, pas un `<p>` --
`.card p` a `flex-grow:1`, pensé pour la description juste au-dessus,
s'appliquerait aussi ici et se disputerait l'espace avec elle) masqué
tant qu'aucune entrée n'existe (rien de significatif à montrer à un
premier lancement).

**Taille des données -- choix assumé et explicite** : `navigator.storage.estimate()`
(API native, lecture de métadonnées seulement) plutôt que de sommer le
poids de chaque photo une par une (`obtenirPhoto()` sur tout le store
`"photos"`, qui aurait fallu lire chaque Blob en entier). Plus simple
et moins coûteux, mais **mesure le stockage total utilisé par
FletchLog sur cet appareil** (entrées + photos, mais aussi le cache
applicatif -- `heic2any.min.js` ~1.35 Mo, Leaflet... -- et les tuiles
de carte déjà consultées), pas seulement le poids des propres photos
de l'utilisateur. Libellé volontairement neutre ("{taille} de
stockage utilisés", pas "poids de tes photos") pour ne pas laisser
croire à une mesure plus précise qu'elle ne l'est -- vérifié en
testant (3.8 Mo affichés pour seulement 3 entrées sans aucune photo,
confirmant que la mesure inclut bien le cache applicatif et pas
uniquement les données de l'utilisateur).

Réutilise `souvenirSortieSing`/`souvenirSortiePlur` (déjà "{n}
entrée"/"{n} entrées", voir la carte souvenir plus haut) pour le
compteur d'entrées -- pas besoin d'une nouvelle paire de clés pour la
même chose. Nouvelles clés : `homeStatLieuSing`/`Plur`,
`homeStatDernierExport`, `homeStatTaille`.

**Piège évité** : le contenu de `#card-stats` est construit
dynamiquement (pas via `data-i18n`), donc `setLanguage()` ne le
retraduisait pas automatiquement en changeant de langue --
`afficherStatistiquesCarnet()` explicitement rappelée depuis
`setLanguage()`, en plus de l'appel initial au chargement de la page.

**Vérifié réellement** (Selenium) : carte masquée sur un profil sans
aucune entrée ; avec des entrées de lieux distincts + un export
simulé (`localStorage.fletchlog_dernier_export`), contenu correct en
français ("3 entrées · 2 lieux", "Dernier export : 26 août 2026 · 3.8
Mo de stockage utilisés") ET en anglais après bascule de langue dans
le même profil.

## Mini-carte des positions sur la carte souvenir (retour utilisateur, 2026-08-27)

Demandé : "une petite carte de france avec un pin des positions" sur
la carte souvenir (`souvenir.js`). Clarifié en échange (deux
`AskUserQuestion`) : encart dans un coin, toutes les sorties
**filtrées** avec position (pas seulement celles retenues pour les
vignettes photo -- même principe que les autres stats de la carte) ;
puis étendu par l'utilisateur à "une carte du monde si plusieurs pays,
sinon celle du pays où se situent les positions".

**Ce qui est réellement implémenté -- heuristique France/monde, pas
une vraie détection par pays.** Une vraie détection (point-dans-polygone
contre les ~195 pays) demanderait soit un appel réseau de
géocodage inverse (contraire au principe hors-ligne du projet), soit
d'embarquer et tester les frontières de tous les pays (disproportionné
pour l'usage réel d'un club français). À la place,
`_choisirContour(positions)` teste juste si **toutes** les positions
filtrées tombent dans une bbox généreuse autour de la France
(`SOUVENIR_FRANCE_LIMITES = { lonMin:-6, lonMax:11, latMin:40,
latMax:52 }`) : si oui, contour France ; sinon, contour monde. Pas de
détection par pays individuel (une sortie en Belgique ou en Espagne
tombe dans la même bbox et affiche quand même le contour France ;
c'est un choix assumé, pas un bug). **Suivi séparé** : issue
[fletchlog#26](https://github.com/MrFanghoDev/fletchlog/issues/26)
pour une vraie internationalisation future, ouverte à la demande
explicite de l'utilisateur plutôt que de laisser tomber ce besoin.

**Source des données géographiques -- vérifiée domaine public avant
d'embarquer quoi que ce soit.** Un premier essai avec le dépôt GitHub
`johan/world.geo.json` a été abandonné : licence ambiguë
(`gh api repos/johan/world.geo.json` → `{"key":"other","spdx_id":
"NOASSERTION"}`, aucune licence claire affirmée). Basculé sur Natural
Earth (naturalearthdata.com), dont les données 1:110m Admin 0
Countries sont explicitement domaine public ("No permission is needed
to use Natural Earth. Crediting the authors is unnecessary." --
politique officielle du projet), récupérées via `nvkelso/natural-earth-vector`
sur GitHub (miroir officiel). Les coordonnées de la France extraites de
`world.geo.json` avant l'abandon ont été comparées à celles de Natural
Earth (mêmes points, à la précision près) pour confirmer la cohérence
avant de trancher.

**Simplification des contours -- Douglas-Peucker écrit à la main, pas
`shapely`.** `pip install shapely` a échoué plusieurs fois de suite
dans cet environnement (instabilité déjà observée ailleurs cette
session) ; plutôt que de s'acharner sur la dépendance, un algorithme
RDP (Ramer-Douglas-Peucker) autonome d'une vingtaine de lignes a été
écrit en Python pur pour le script de traitement ponctuel (non commité,
fichiers `/tmp/extract_maps*.py` de cette session, supprimés une fois
le résultat extrait dans `souvenir.js`). Deux constantes résultantes :
- `CONTOUR_FRANCE` : France métropolitaine + Corse uniquement
  (~700 octets, 47+7 points). Le premier essai gardait aussi la
  Guyane (filtre `bbox_area(anneau) > 1`, qui la conservait aussi vu sa
  taille) -- corrigé en filtrant sur `lon_min > -10`, qui l'exclut
  proprement sans toucher à la métropole/Corse.
- `CONTOUR_MONDE` : plus gros anneau de chaque pays/masse continentale,
  pays de très petite superficie exclus (epsilon=1.2, filtre
  `bbox_area >= 5`) -- 145 pays, 1292 points, ~18.6 Ko. Un premier
  réglage plus fin (epsilon=0.35, sans filtre de taille) donnait 176
  pays / 3476 points / ~48 Ko, jugé trop lourd pour un simple encart
  décoratif ; retenu volontairement moins précis mais plus léger,
  suffisant à la taille d'affichage (130 px).

**Rendu (`_dessinerCartePositions`)** : projection équirectangulaire
avec correction `cos(latitude moyenne)` pour la compression des
longitudes (approximation délibérément simplifiée, acceptable pour un
encart décoratif, pas une carte de navigation précise) ; panneau
arrondi semi-transparent (`rgba(15,18,22,0.55)`, via
`_cheminRectArrondi()` déjà existant), contour du pays/monde en blanc
translucide, pins en doré (`#d1a13d`, même teinte que le reste de la
marque) avec liseré sombre pour rester visibles sur un contour clair.
Absente d'elle-même si aucune sortie filtrée n'a de position (pas de
panneau vide). Placée en haut à droite, symétrique du logo en haut à
gauche (`SOUVENIR_CARTE_TAILLE = 130`).

**Vérifié réellement** (Selenium, deux scénarios) : `_choisirContour()`
appelée directement avec des tableaux de positions synthétiques
confirme la logique (3 villes françaises → `CONTOUR_FRANCE` ; France +
New York → `CONTOUR_MONDE`) ; captures d'écran plein canevas
(`canvas.toDataURL()`, pas un screenshot de viewport qui aurait pu
tronquer le canevas -- piège déjà rencontré plus haut dans cette
session) confirment visuellement les deux cas : silhouette France +
Corse avec pins dorés pour 3 positions françaises proches (Club,
Paris, Lyon -- Club et Paris, à ~35 km l'un de l'autre, peuvent se
fondre visuellement en un seul point à cette échelle, comportement
normal et pas un bug) ; silhouette monde reconnaissable (Europe,
Amériques, Asie) avec 3 pins bien distincts pour Club (France), New
York et Tokyo.

## Titre manuel + correctif discipline manquante sur la carte souvenir (retour utilisateur, 2026-08-28)

Demandé : pouvoir saisir un titre manuellement pour la carte souvenir,
et "mettre aussi les informations de type de discipline".

**Titre manuel** : nouveau champ `#souvenir-titre-manuel` sur l'écran
`#souvenir-selection`, désormais **toujours affiché** avant de générer
la carte (avant ce ticket, cet écran était sauté entièrement quand
aucune sortie filtrée n'avait de photo -- carte générée directement).
Le texte d'intro ("Choisis les photos de la carte") et la grille de
sélection restent masqués dans ce cas (`#souvenir-selection-titre-texte`/
`#souvenir-selection-grille`, `hidden` togglé dans `ouvrirSouvenir()`),
mais le champ titre, lui, reste toujours proposé. Lu au moment de
générer (`_genererEtAfficherSouvenir()`), passé à `_dessinerSouvenir()`
via `selectionPhotos.titreManuel` -- prioritaire sur le titre
auto-déduit (`_titreEtSousTitre()`) quand non vide, le sous-titre reste
lui toujours calculé automatiquement (dates ou lieux), utile même avec
un titre personnalisé. Remis à vide à chaque ouverture de l'écran
(`ouvrirSouvenir()`), jamais persisté d'une carte à l'autre. Style
`.souvenir-titre-input` écrit en dur (pas les tokens `--bg`/`--text` de
`theme.css`) -- l'overlay de la carte souvenir reste toujours sombre,
quel que soit le thème clair/sombre choisi dans le reste de l'appli.

**Correctif discipline manquante -- vrai bug, pas juste une demande
d'ajout.** En creusant "mettre aussi les informations de discipline"
: la répartition des disciplines existait déjà (`_statsDisciplines()`,
voir la section du 2026-08-26 plus haut) mais avec une règle de
masquage trop large. Elle était conçue pour éviter de répéter la
discipline quand celle-ci est DÉJÀ le titre de la carte -- mais
`_titreEtSousTitre()` préfère toujours un lieu unique à une discipline
unique quand les deux se produisent en même temps (cas très courant :
toutes les sorties filtrées au même club, avec la même discipline).
Dans ce cas, la discipline ne devenait jamais le titre, mais
`_statsDisciplines()` la masquait quand même (son ancienne règle :
masquer dès qu'une seule discipline distincte existe, sans vérifier si
elle était réellement devenue le titre) -- la discipline disparaissait
alors entièrement de la carte, ni en titre ni en stats. Un titre
manuel aggravait encore le problème (le titre n'a alors plus aucun
rapport avec la discipline, mais l'ancienne règle la masquait quand
même).

Corrigé en déplaçant la décision de masquage au bon endroit :
`_statsDisciplines()` retourne maintenant TOUJOURS toutes les
disciplines rencontrées (y compris une seule), et `_dessinerSouvenir()`
ne masque la ligne que si elle est à la fois réduite à une seule
discipline ET que cette discipline est exactement égale au titre
**réellement affiché** (`disciplinesStats.length === 1 &&
disciplinesStats[0][0] === titre`, comparé après l'éventuelle
substitution par le titre manuel) -- la seule vraie redondance à
éviter, plutôt qu'une règle approximative basée sur le nombre de
disciplines distinctes sans regarder ce qui est effectivement affiché
en titre.

**Vérifié réellement** (Selenium, 3 entrées même lieu "Club Test" +
même discipline "Indoor", sans photo -- déclenche justement le nouveau
chemin "écran de sélection sans grille") : écran de sélection affiché
malgré l'absence de photo (`grille masquee: true`), titre auto =
"Club Test" (lieu gagne, comme avant), et **"Indoor ×3" apparaît bien
en stats** (confirmé absent avant ce correctif) ; avec un titre manuel
"Ma saison 2026 !" saisi, le titre l'emporte sur "Club Test" et
"Indoor ×3" reste affiché -- capture plein résolution des deux cas
inspectée directement.

## Correctif réel : le lieu disparaissait aussi avec un titre manuel (retour utilisateur, 2026-08-28, juste après le déploiement de v0.21.0)

Signalé juste après la mise en ligne : "il n'y a plus la localisation
si le titre est changé" -- clarifié par une question ciblée
(`AskUserQuestion`, deux lectures possibles : la mini-carte de
positions, ou la position GPS d'une entrée) -- réponse : ni l'un ni
l'autre, **"localisation" voulait dire le nom du lieu** (terme
ambigu en français, à ne pas confondre avec la mini-carte de
positions -- voir la section juste au-dessus -- ni avec la
localisation/i18n). Un premier test de reproduction ciblant justement
la mini-carte n'avait rien montré d'anormal (normal, ce n'était pas le
bon sous-système) -- la clarification était nécessaire avant de
continuer à chercher au mauvais endroit.

**Même famille de bug que le correctif discipline juste au-dessus**,
raté une première fois en écrivant le titre manuel (2026-08-28, plus
tôt le même jour) : `_titreEtSousTitre()` choisit le lieu comme titre
quand il est unique, et affiche alors la DATE en sous-titre plutôt que
de répéter le lieu (déjà visible en titre). Un titre manuel remplace
le titre affiché mais **ne changeait pas le sous-titre**, qui restait
la date -- le lieu, absent du titre (remplacé) ET du sous-titre
(toujours la date), disparaissait entièrement de la carte. Contrairement
à la discipline (qui a sa propre ligne de stats séparée, capable de
réapparaître), le lieu n'a **aucun autre affichage** ailleurs sur la
carte -- rien ne compensait sa disparition.

Corrigé en passant `titreManuel` en second paramètre de
`_titreEtSousTitre(entrees, titreManuel)` : dès qu'un titre manuel est
utilisé (peu importe la branche qui aurait été choisie sans lui --
lieu, discipline, période ou compteur), le sous-titre bascule sur
le(s) lieu(x) (`[...lieux][0]` si un seul, sinon `_listeLieux(entrees)`,
la même fonction déjà utilisée pour le cas "titre = période") plutôt
que sur la date. Le lieu étant un champ obligatoire à la saisie d'une
entrée (`champ-lieu required`, voir le formulaire), `lieux.size` est
toujours ≥ 1 -- pas de cas de repli à gérer en plus.

**Leçon retenue, à appliquer par réflexe désormais** : toute info
"auto-déduite" que le titre manuel peut faire disparaître (lieu,
discipline, période...) doit être vérifiée une à une avant de livrer
ce genre de champ -- la discipline avait déjà cette faiblesse
repérée et corrigée dans le même ticket que le titre manuel, mais le
lieu, elle, avait été manquée : sa disparition ne pouvait pas se
remarquer en relisant le code (aucune ligne "et si le lieu
disparaît ?" n'attirait l'œil, contrairement à la discipline qui avait
déjà son propre bug documenté et sa propre ligne de code à comparer) --
seul un vrai test avec le cas "lieu unique + titre manuel" l'aurait
révélée avant livraison. Les captures de vérification du ticket titre
manuel (2026-08-28, plus haut) utilisaient déjà exactement ce cas
(lieu unique "Club Test" + titre manuel "Ma saison 2026 !") mais
**l'inspection visuelle n'avait porté que sur le titre et la ligne
discipline** (ce qui était explicitement demandé/corrigé), sans
remarquer que le sous-titre "28 août 2026" (la date) restait présent
alors qu'il aurait dû laisser place au lieu -- une case cochée
("le titre change bien") a masqué une autre régression sur la même
capture. À refaire : après un correctif ciblé, comparer le rendu
AVANT/APRÈS ligne par ligne plutôt que de valider seulement l'élément
explicitement demandé.

**Vérifié réellement** (Selenium, 2 entrées même lieu "Club Test",
sans titre manuel puis avec) : `_titreEtSousTitre(entrees, "")` ->
`{titre: "Club Test", sousTitre: "28 août 2026"}` (comportement
non-manuel inchangé) ; `_titreEtSousTitre(entrees, "Ma saison 2026")`
-> `sousTitre: "Club Test"` (le lieu, plus la date) -- capture plein
résolution confirmant visuellement "Ma saison 2026" en titre et
"Club Test" juste en dessous en sous-titre.

**Complément demandé juste après (2026-08-29)** : le sous-titre
"lieu seul" en cas de titre manuel (voir juste au-dessus) perdait la
date, présente avant ce correctif-ci (comportement non-manuel
inchangé). Ajouté : `texteDates` (même calcul date unique/période
qu'avant, juste sorti du `else` pour être réutilisable) accolé après
le lieu avec le séparateur " · " déjà utilisé ailleurs dans l'appli
(stats du carnet sur l'accueil) -- `"Club Test · 29 août 2026"`.
Vérifié réellement (Selenium) : sous-titre sans titre manuel inchangé
("29 août 2026" seul), avec titre manuel = lieu + date sur la même
ligne.

## Note vocale par entrée (retour utilisateur, 2026-08-29)

Demandé : pouvoir ajouter une note vocale à une entrée. Deux vrais
choix tranchés avec l'utilisateur avant de coder (`AskUserQuestion`) :
enregistrement **dans l'appli** (MediaRecorder natif, pas de dépendance
ajoutée -- voir le principe du CLAUDE.md global) plutôt qu'un simple
`<input type=file accept=audio/*>` délégué à l'appli vocale du
téléphone ; **une seule** note par entrée (pas une galerie comme les
photos) -- équivalent audio du champ commentaire, pas un système
multi-fichiers.

**Stockage -- nouveau store IndexedDB `"audios"` (Blob par id, même
patron que `"photos"`), `DB_VERSION` passé de 1 à 2** (`storage.js`) --
première vraie montée de version de ce projet (jusqu'ici `"photos"`
avait été créé dès le départ précisément pour éviter d'en avoir besoin,
voir plus haut). Sans risque pour les données existantes : `onupgradeneeded`
n'ajoute que le store manquant (garde `if (!contains(...))`, comme pour
`"entrees"`/`"photos"`), rien touché aux stores déjà là. **Store séparé,
pas mélangé dans `"photos"`** malgré le même patron -- l'export
(`export-import.js`) suppose que tout blob de `"photos"` est une image
JPEG (`photos/<id>.jpg`), mélanger des blobs audio aurait cassé cette
hypothèse plutôt que de l'étendre proprement avec un dossier `audios/`
séparé dans l'archive. Nouveau champ `audioId` (string | null) sur le
schéma d'entrée, fonctions `enregistrerAudio`/`obtenirAudio`/
`supprimerAudio`/`restaurerAudio` miroir exact des fonctions photo.
`reinitialiserDonnees()` vide aussi ce store désormais (transaction à 3
stores).

**Enregistrement (`app.js`)** : `navigator.mediaDevices.getUserMedia({audio:true})`
puis `MediaRecorder` (`audio/webm;codecs=opus` demandé explicitement
si supporté, repli sur `audio/webm` puis sur le défaut du navigateur) --
widget **masqué en entier** (`#champ-audio`, pas juste le bouton) si
`MediaRecorder`/`getUserMedia` indisponible, plutôt qu'un bouton mort
(`initFormulaire()`). Bouton micro (`ICONE_MICRO`, même style/gabarit
que `ICONE_GALERIE`/`ICONE_APPAREIL_PHOTO`) qui bascule en bouton stop
(`ICONE_STOP`, rouge) pendant l'enregistrement, avec un compteur de
durée (`#audio-duree`, mis à jour toutes les 500ms). Une fois arrêté :
lecteur natif `<audio controls>` + bouton de suppression -- ré-appuyer
sur le micro à ce stade démarre un NOUVEL enregistrement qui remplace
la note existante (pas besoin de supprimer d'abord), `resoudreAudioPourEnvoi()`
gère le remplacement (supprime l'ancien blob, stocke le nouveau) au
même titre qu'une suppression pure ou qu'une note inchangée.

**Trois pièges évités en écrivant cette fonctionnalité (pas rencontrés
en test a posteriori, anticipés à la conception)** :
1. **Micro laissé ouvert si le formulaire est fermé pendant
   l'enregistrement** -- `fermerFormulaire()` arrête explicitement le
   `MediaRecorder` en cours (`piste.stop()` sur le flux, dans le
   gestionnaire "stop" existant) plutôt que de laisser l'indicateur
   micro du système actif après la fermeture du formulaire.
2. **Course entre la fermeture du formulaire et le gestionnaire "stop"
   asynchrone** -- si `fermerFormulaire()` avait remis `audioFormulaire`
   à `null` juste après avoir appelé `.stop()`, le gestionnaire "stop"
   (qui s'exécute après, de façon asynchrone) l'aurait écrasé en le
   remettant à la note fraîchement enregistrée -- une note orpheline,
   jamais nettoyée avant la prochaine ouverture du formulaire. Corrigé
   en laissant le gestionnaire "stop" faire son travail normalement
   dans ce cas (`ouvrirFormulaire()` nettoie de toute façon l'état
   précédent à la prochaine ouverture, rien perdu).
3. **Valider le formulaire pendant un enregistrement encore en cours**
   -- sans y penser, `soumettreFormulaire()` aurait sauvegardé
   l'ancienne note (ou aucune), la nouvelle restant coincée dans le
   même gestionnaire "stop" asynchrone qui se termine après coup, trop
   tard pour ce `fermerFormulaire()`-ci. Corrigé avec
   `attendreArretEnregistrementAudio()` -- une promesse qui arrête
   l'enregistrement en cours (s'il y en a un) et attend que le
   gestionnaire "stop" ait fini avant de résoudre les photos/l'audio à
   sauvegarder.

**Export/import** (`export-import.js`) : un fichier par note sous
`audios/<audioId>.webm` dans l'archive, même principe que
`photos/<photoId>.jpg`. Repli sur `entree.audioId ?? null` à l'import
(absent des sauvegardes exportées avant cette fonctionnalité) -- même
principe que le repli `photoId`/`photoIds` déjà en place pour les
sauvegardes d'avant #12.

**Vérifié réellement** (Selenium, `--use-fake-device-for-media-stream`
+ `--use-fake-ui-for-media-stream` -- flags Chrome qui simulent un
micro et auto-acceptent la permission, permettant un vrai test de bout
en bout de `getUserMedia`/`MediaRecorder` en headless, pas seulement la
logique JS autour) : widget visible, enregistrement démarre/s'arrête
avec un blob non vide produit, lecteur + bouton supprimer affichés
après coup, sauvegarde avec le bon `audioId`, rechargement en édition
avec le lecteur déjà rempli, note affichée dans l'écran de détail ;
suppression avant sauvegarde (audioId `null` à l'enregistrement),
suppression d'une entrée avec note (blob confirmé absent du store
après coup, pas juste déréférencé), remplacement d'une note existante
par une nouvelle (ancien blob confirmé supprimé, nouvel id différent) ;
export contient bien `audios/<id>.webm` (inspection directe de
l'archive via JSZip) ; cycle complet export -> réinitialisation ->
import restaure l'entrée ET la note (même `audioId`, blob de taille
identique) ; `reinitialiserDonnees()` vide bien le store `"audios"`
(compte IndexedDB direct, 1 -> 0). **Non vérifié** : le message
d'erreur affiché si la permission micro est refusée (le flag Chrome
utilisé pour le test l'accepte toujours automatiquement, pas de moyen
simple de simuler un refus en headless) -- chemin de code simple
(try/catch autour de `getUserMedia`, toast) mais son affichage réel
n'a pas été confirmé visuellement.

## Export du résultat d'un filtrage (retour utilisateur, 2026-08-29)

Demandé juste après la note vocale, dans le même message : pouvoir
exporter seulement les entrées qui correspondent aux filtres actifs
(recherche, chips, période), pas systématiquement tout le carnet.

**Décision de conception prise sans reposer la question** (placement
et format, pas de vrai dilemme à trancher avec l'utilisateur cette
fois) : nouveau bouton `#bouton-export-filtre` dans `.periode-filtre`
(juste à côté de 🖼️ carte souvenir -- même ligne, même style de
bouton rond `.bouton-souvenir`, qui s'avère être une classe générique
malgré son nom, pas spécifique à la carte souvenir). Même archive
`.zip` (JSON + photos + audios) que l'export complet plutôt qu'un
format distinct -- le sous-ensemble filtré reste réimportable tel
quel par `importerSauvegarde()`, aucune raison de maintenir deux
formats.

**Point de conception important, tranché avant de coder** : un export
filtré ne doit **jamais** être compté comme la sauvegarde complète
attendue par le rappel périodique (issue #18) -- sinon exporter juste
"les sorties de ce mois" ferait taire à tort le rappel, qui suppose
que "dernier export" veut dire "tout le carnet est sauvegardé".
`exporterSauvegarde(entrees)` (`export-import.js`) accepte maintenant
un paramètre optionnel -- toutes les entrées via `listerEntrees()` si
omis (comportement historique, inchangé pour les deux boutons
existants), ou un sous-ensemble déjà filtré fourni par l'appelant
(`entreesFiltrees()`, même fonction que les vues Liste/Carte/la carte
souvenir -- pas de nouvel état de filtre à maintenir). `livrerExport()`
accepte un nouvel objet d'options `{estBackupComplet, suffixeNomFichier}`
-- `estBackupComplet` (vrai par défaut, donc les deux boutons
existants restent inchangés sans y toucher) contrôle si
`_marquerExportReussi()` est appelé ; `suffixeNomFichier` distingue le
nom du fichier téléchargé/partagé (`fletchlog-export-filtre-...zip`
plutôt que `fletchlog-export-...zip`) pour ne pas laisser croire à une
sauvegarde complète en le regardant après coup.

Toast dédié (réutilise la clé existante `souvenirAucuneEntree`, déjà
"Aucune entrée ne correspond à ces filtres." -- même sémantique
exacte que le message déjà affiché sur la carte souvenir quand le
filtre ne retourne rien, pas de nouvelle clé pour la même chose) si le
filtre courant ne retourne aucune entrée -- évite de produire une
archive vide silencieusement.

**Vérifié réellement** (Selenium, 3 entrées : 2 "Indoor" au club A, 1
"Field" au club B, filtre discipline appliqué) : `entreesFiltrees()`
et le contenu réel de l'archive générée (`entrees.json` inspecté via
JSZip) coïncident exactement (2 entrées Indoor, la Field exclue) ;
`fletchlog_dernier_export` (localStorage) reste inchangé après un
export filtré, mais change bien après un export complet dans la même
session (les deux boutons cohabitent sans interférence) ; toast
"Aucune entrée ne correspond à ces filtres." affiché sur un filtre
sans résultat, pas de génération d'archive dans ce cas.

## Aide pas à jour après la release v0.22.0 (retour utilisateur, 2026-08-29)

Signalé après coup : l'export filtré (voir juste au-dessus) n'était
pas mentionné dans `aide.html`. Vérifié en relisant la page (pas
supposé) -- la note vocale, livrée dans la même release, manquait
aussi (`aideS2AjoutText` ne listait que les photos parmi le contenu
d'une entrée). Les deux corrigées ensemble plutôt qu'une seule, même
oubli de même nature dans la même release -- pas de raison de laisser
traîner le second gap une fois le premier repéré. Complété :
`aideS2ListeText` (mentionne le bouton 📤 juste après les filtres,
cohérent avec `aideS2SouvenirText` qui explique déjà 🖼️ dans la même
barre), `aideS2AjoutText` (ajoute la note vocale à la liste du contenu
d'une entrée). Vérifié réellement (Selenium, les deux langues) :
textes affichés corrects en français ET en anglais sur `aide.html`.

**Leçon à appliquer par réflexe** : une release qui touche plusieurs
fonctionnalités UI-visibles doit vérifier `aide.html` pour CHACUNE
d'elles avant de livrer, pas seulement celle explicitement signalée
après coup -- même principe déjà noté pour "un bug corrigé dans un
dépôt a de bonnes chances d'exister aussi dans les deux autres" (voir
CLAUDE.md global, section cohérence entre projets), appliqué ici à
l'échelle d'une seule release à plusieurs fonctionnalités plutôt qu'à
plusieurs dépôts.

## Créer un souvenir depuis le détail d'une seule entrée (retour utilisateur, 2026-08-30)

Demandé : pouvoir générer une carte souvenir pour une seule entrée
directement depuis son écran de détail (lecture seule) -- jusqu'ici
la carte souvenir n'était accessible que via le bouton 🖼️ de la barre
de filtres, toujours sur `entreesFiltrees()` (l'ensemble filtré
courant), jamais sur une seule entrée précise.

**`ouvrirSouvenir(entreesPreselectionnees)`** (`souvenir.js`) accepte
désormais un paramètre optionnel -- `entreesFiltrees()` si omis
(comportement historique, inchangé pour le bouton de la barre de
filtres), ou un tableau déjà choisi par l'appelant sinon. Toute la
logique existante (titre/sous-titre, disciplines, météo, tags,
sélection de photos, mini-carte) fonctionne sans modification avec un
tableau d'un seul élément -- pas de cas particulier "une seule
entrée" à écrire, le code générique gère déjà ce cas correctement
(confirmé en testant, pas juste supposé).

Nouveau bouton `#detail-souvenir` ("Souvenir") dans `.detail-actions`,
entre "Supprimer" et "Modifier" -- style `.btn-annuler` (neutre,
existant, pas une nouvelle classe) pour le distinguer des deux actions
destructive/primaire déjà là. Appelle `ouvrirSouvenir([entree])` avec
l'entrée actuellement affichée.

**`detail-overlay` volontairement PAS fermé avant d'ouvrir le
souvenir** (contrairement au bouton "Modifier", qui ferme le détail
avant d'ouvrir le formulaire) -- `souvenir-overlay` a un z-index plus
élevé (27 contre 20 pour le détail), les deux se superposent proprement
sans conflit, et refermer la carte souvenir révèle le détail exactement
là où on l'avait laissé, sans avoir besoin de le rouvrir explicitement.

**Vérifié réellement** (Selenium, 2 entrées à des lieux différents --
si le souvenir n'était pas correctement limité à une seule entrée, le
titre generé serait tombé sur "2 entrées" plutôt que le lieu de
l'entrée seule) : bouton présent sur le détail, souvenir ouvert avec
exactement 1 entrée (`_souvenirEntrees.length === 1`), détail-overlay
resté ouvert derrière (z-index), titre généré = le lieu de cette seule
entrée (pas "2 entrées"), retour au détail visible après fermeture du
souvenir -- capture plein résolution du détail (bouton visible) et de
la carte générée ("1 entrée") inspectées directement.

## Toutes les photos d'une entrée en miniature sur la carte souvenir (retour utilisateur, 2026-08-30)

Signalé juste après le point ci-dessus : le souvenir d'une seule
entrée avec plusieurs photos (bouton "Souvenir" du détail, voir
juste au-dessus) n'affichait que la photo vedette, jamais les autres
-- alors qu'une entrée peut en avoir jusqu'à 6 (`MAX_PHOTOS`).

**Cause : `_photosSupplementaires()` piochait une seule photo par
AUTRE entrée** (`photoIds[0]`, voir sa section du 2026-08-25 plus
haut), jamais les photos 2+ d'une même entrée -- comportement correct
tant que le souvenir portait sur plusieurs entrées (chacune ne
contribuant qu'une vignette), mais qui ne montrait jamais rien
d'autre que la vedette dès qu'il n'y avait qu'UNE SEULE entrée
illustrée, puisqu'il n'existe alors aucune "autre entrée" pour en
fournir. Généralisé : la fonction parcourt maintenant TOUTES les
photos de TOUTES les entrées illustrées (`flatMap` sur `photoIds`,
plus seulement `photoIds[0]`), en excluant uniquement la photo
vedette elle-même (par id de PHOTO, pas d'entrée) -- se réduit
naturellement à l'ancien comportement quand chaque entrée n'a qu'une
photo, et couvre en plus le cas multi-photos d'une même entrée.
Aucun changement de plafond/troncature nécessaire :
`SOUVENIR_VIGNETTE_MAX`/le badge "+N" existants gèrent déjà le
surplus, quelle que soit sa provenance.

**Vrai bug de régression découvert EN TESTANT ce correctif, pas
directement lié à lui** -- le bouton 🖼️ de la barre de filtres
(utilisé constamment tout au long de cette session, présent depuis
le tout début de la carte souvenir) était **cassé depuis v0.23.0**
(le ticket juste au-dessus, "Créer un souvenir depuis le détail
d'une seule entrée"). Cause : `ouvrirSouvenir()` a gagné un paramètre
optionnel `entreesPreselectionnees` dans ce ticket, mais son
branchement existant --
`document.getElementById("bouton-souvenir").addEventListener("click",
ouvrirSouvenir)` (la fonction passée telle quelle, pas dans un
wrapper) -- n'avait pas été relu à cette occasion. Un gestionnaire
`click` reçoit l'événement en premier argument : `ouvrirSouvenir(evenementClic)`
rendait alors `entreesPreselectionnees` **truthy** (un `MouseEvent`
n'est jamais faux), donc `entreesPreselectionnees || entreesFiltrees()`
utilisait l'ÉVÉNEMENT à la place des entrées filtrées -- la fonction
plantait dès le premier appel de méthode de tableau dessus (un
`MouseEvent` n'a pas de `.length`/`.flatMap`...), avant d'atteindre
`selection.hidden = false` : l'écran de sélection restait bloqué
caché indéfiniment, invisible en relisant juste le code (aucune
erreur affichée à l'écran, juste rien qui se passe au clic). Le
bouton "Souvenir" du détail, lui, était déjà correctement câblé en
`() => ouvrirSouvenir([entree])` (un wrapper, l'événement jamais
transmis) -- c'est justement la comparaison des deux branchements en
creusant pourquoi un test à 2 entrées échouait qui a révélé l'écart.
Corrigé en alignant l'ancien branchement sur le même patron :
`() => ouvrirSouvenir()`.

**Leçon retenue** : ajouter un paramètre à une fonction déjà posée
telle quelle comme gestionnaire d'événement (`addEventListener("evt",
maFonction)`, sans wrapper) est un piège classique -- l'événement
DOM se glisse silencieusement dans ce nouveau paramètre. Réflexe à
appliquer désormais : après avoir ajouté un paramètre à une fonction,
`grep` tous ses points d'appel existants, pas seulement les nouveaux
qu'on vient d'écrire -- un appel devenu incorrect par effet de bord
ne saute pas aux yeux en relisant seulement la fonction modifiée.

**Vérifié réellement** (Selenium, 2 entrées : "Entree A" avec 2
photos JPEG de test -- rouge en couverture, vert en second -- et
"Entree B" avec 1 photo bleue, générées via Pillow) :
1. **Cas à une seule entrée** (bouton "Souvenir" du détail, "Entree
   multi-photos" avec 3 photos rouge/vert/bleu) : `_photosSupplementaires()`
   retourne bien 2 URLs (vert + bleu) là où elle en retournait 0
   avant ce correctif -- capture plein résolution confirmant
   visuellement les 2 vignettes sous la photo vedette rouge.
2. **Cas à plusieurs entrées** (bouton 🖼️ de la barre de filtres,
   confirmant au passage qu'il fonctionne de nouveau) : écran de
   sélection bien affiché (`selectionHidden: false`, plus le
   symptôme du bug ci-dessus), 2 entrées, vedette = "Entree B"
   (photo bleue), 2 photos supplémentaires (rouge + vert, toutes
   deux de "Entree A") -- capture confirmant visuellement les 3
   couleurs présentes sur la carte (bleu en fond, rouge et vert en
   vignettes), comportement multi-entrées inchangé par ailleurs.

## Miniatures en "contain" plutôt que recadrées (retour utilisateur, 2026-08-30)

Demandé juste après le point ci-dessus : les vignettes de la bande du
bas gardent-elles tout le détail de la photo d'origine, plutôt que
d'en perdre les bords ? Réponse : non, jusqu'ici -- `_dessinerVignette()`
recadrait en "cover" (comme les vignettes du reste de l'appli,
`.carte-vignette img { object-fit: cover }`), un choix assumé à
l'origine (voir la section "Bande de vignettes..." du 2026-08-25 plus
haut : "le recadrage n'est acceptable qu'à cette taille réduite, pas
sur l'image principale"). L'utilisateur revient sur ce compromis pour
les vignettes aussi.

**Corrigé en appliquant le même principe que la photo vedette en
grand format** (déjà en "contain", jamais rognée depuis le
2026-08-25) : `_dessinerVignette()` passe de `Math.max(taille/largeur,
taille/hauteur)` (cover) à `Math.min(...)` (contain) pour l'échelle --
un seul mot-clé changé (`Math.max` -> `Math.min`), le reste de la
fonction (carré arrondi, clip, liseré) est inchangé. Une photo dont le
ratio n'est pas carré laisse désormais un bord vide dans son
emplacement carré (`SOUVENIR_VIGNETTE_TAILLE = 140`) plutôt que
d'être rognée -- le fond sombre de la carte, déjà là à cet endroit
(sous la marque/le dégradé), comble naturellement cet espace sans
qu'il faille dessiner quoi que ce soit en plus.

**Vérifié réellement** (Selenium, une entrée avec 3 photos générées
via Pillow : vedette carrée 400×400 rouge, une large 400×200 verte
2:1, une haute 200×400 bleue 1:2 -- ratios délibérément extrêmes pour
rendre le recadrage évident s'il avait persisté) : capture plein
résolution confirmant que la vignette verte (large) est bien centrée
verticalement avec le fond sombre de la carte visible en haut/en bas
de son emplacement carré, et la vignette bleue (haute) centrée
horizontalement avec le fond visible à gauche/droite -- aucune des
deux photos n'est rognée, tout leur contenu reste visible. **Deux
premières tentatives de vérification ratées par un artefact
d'environnement** (URLs `blob:` des photos brièvement en erreur
`ERR_FILE_NOT_FOUND` dans la console, cause exacte non identifiée --
resté sans erreur ET avec un rendu correct dès la 3e tentative, avec
un script strictement identique) -- signalé pour mémoire plutôt que
laissé sous silence, mais sans impact sur la conclusion : le rendu
final, obtenu à l'identique deux fois de suite sans erreur, confirme
le correctif.

## Titre propre de l'entrée pour le souvenir d'une seule entrée (retour utilisateur, 2026-08-30)

Demandé : le souvenir d'une seule entrée (bouton "Souvenir" du
détail) peut-il garder le même titre que l'entrée, plutôt que celui
déduit automatiquement ? En pratique, `_titreEtSousTitre()` préfère
toujours un lieu unique comme titre -- et une seule entrée a
forcément un lieu unique, donc le titre affichait systématiquement le
LIEU (ex. "Club des Aigles") plutôt que le TITRE propre de l'entrée
(ex. "Finale régionale 3D") -- alors que ce champ existe justement
pour distinguer plusieurs sorties au même lieu (voir le schéma dans
storage.js).

**Nouvelle branche prioritaire dans `_titreEtSousTitre()`** :
`entrees.length === 1` -> `titre = entrees[0].titre || entrees[0].lieu`
(repli sur le lieu pour les entrées d'avant #11, sans titre -- même
principe que le repli déjà en place ailleurs dans l'app pour ce cas).
Cette branche passe avant toutes les autres (lieu/discipline/période/
compteur), qui ne s'appliquent donc plus qu'à partir de 2 entrées.

**Même piège de sous-titre que les deux fois précédentes (titre
manuel, puis discipline) -- anticipé cette fois plutôt que découvert
après coup** : le lieu n'est plus automatiquement visible en titre
dès qu'une seule entrée est concernée, donc le sous-titre doit
maintenant afficher le lieu (comme pour un titre manuel, voir plus
haut) plutôt que la date seule. La condition existante
`if (titreManuel)` du calcul de sous-titre devient
`if (titreManuel || entrees.length === 1)` -- réutilise exactement le
même calcul "lieu + date" déjà en place, aucune nouvelle logique de
sous-titre à écrire.

Un titre manuel saisi sur l'écran de sélection reste prioritaire sur
ce nouveau comportement (`titre = titreManuel || titreAuto`, dans
`_dessinerSouvenir()`, inchangé) -- cette nouvelle branche ne fait que
changer ce que vaut `titreAuto` pour une seule entrée, pas la
priorité globale déjà en place.

**Vérifié réellement** (Selenium, 2 entrées : "Finale régionale 3D"
au lieu "Club des Aigles" avec discipline "3D", et une autre entrée à
un lieu différent) :
- `_titreEtSousTitre([entree1], '')` -> `{titre: "Finale régionale
  3D", sousTitre: "Club des Aigles · 29 août 2026"}` -- le titre
  propre de l'entrée, plus le lieu et la date en sous-titre.
- `_titreEtSousTitre(entreesActuelles, '')` (les 2 entrées, lieux
  distincts mais même discipline "3D") -> `titre: "3D"` -- comportement
  multi-entrées inchangé (repli sur la discipline commune, comme
  avant).
- `_titreEtSousTitre([entree1], 'Mon titre perso')` -> sous-titre
  toujours "Club des Aigles · 29 août 2026" -- confirme que le titre
  manuel resterait prioritaire au final (appliqué par le CALLER,
  `_dessinerSouvenir()`), cette fonction ne calculant que le titre
  AUTO et le sous-titre.
