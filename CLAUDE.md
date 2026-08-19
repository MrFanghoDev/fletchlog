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

## Conventions techniques (à compléter au fil du code)

- Pas de backend, pas de dépendance Python -- ce dépôt n'a pas vocation à
  avoir de `.venv`/`pyproject.toml` comme ses trois frères.
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

## Pas encore tranché

- Format exact de l'export/import (`.zip` via JSZip vendoré vs autre
  approche) -- décidé en principe, pas encore implémenté.
- Détail de la structure IndexedDB (schéma des entrées, wrapper maison
  ou API native directe).
- Découpage exact des tickets au-delà du premier jalon.
