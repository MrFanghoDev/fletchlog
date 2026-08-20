# Contribuer à FletchLog

*[English version below](#contributing-to-fletchlog)*

Merci de t'intéresser à FletchLog ! C'est un projet né d'un usage de club
(Les Aigles 77 / Archers Libres de Fontaine le Port), publié en open source
sous licence [GPL-3.0-or-later](LICENSE) pour être utile à d'autres archers
et clubs. On garde le processus de contribution volontairement simple.

## Signaler un bug ou proposer une idée

Passe par les [Issues GitHub](https://github.com/MrFanghoDev/fletchlog/issues) --
pas besoin de formulaire compliqué. Pour un bug, ce qui aide le plus :
- Ce que tu as fait, ce que tu attendais, ce qui s'est passé à la place
- La vue concernée (Liste, Carte, formulaire d'ajout, Aide...) et si tu
  utilises FletchLog installé (PWA) ou directement dans le navigateur
- Ton navigateur/appareil (FletchLog vise Android/Chrome en priorité) et
  la version de FletchLog (visible en bas des pages)

Pas besoin d'avoir déjà une solution en tête -- un problème bien décrit
suffit amplement.

## Proposer un changement de code

Le flux classique de l'open source, rien de plus :

1. **Fork** le dépôt, puis clone ton fork
2. Crée une branche (`git checkout -b ma-fonctionnalite`)
3. Fais tes changements
4. Vérifie-les dans un vrai navigateur (voir ci-dessous)
5. Ouvre une **Pull Request** vers `master`, en expliquant le *pourquoi* du
   changement, pas seulement le *quoi*

Pas besoin de discuter d'un gros changement à l'avance si tu préfères
montrer du code directement -- mais pour quelque chose de structurant
(changement du schéma de stockage, nouvelle dépendance, nouvelle vue...),
ouvrir une Issue d'abord pour en discuter évite de coder dans une
direction qui ne conviendrait pas.

### Installation pour développer

Aucune installation ni build nécessaire (JS/HTML/CSS simple, pas de
framework, pas de `npm install`) -- mais le service worker qui permet le
fonctionnement hors ligne refuse de s'enregistrer si la page est ouverte
directement comme fichier (`file://`), donc sers le dossier avec un petit
serveur local :

```bash
git clone https://github.com/MrFanghoDev/fletchlog.git
cd fletchlog
python3 -m http.server 8080
# puis ouvrir http://localhost:8080/ dans un navigateur
```

### Style de code

Pas d'outil de formatage automatique pour l'instant (contrairement à
FletchScore/FletchTime côté Python) -- reste cohérent avec le style déjà
en place dans le fichier que tu modifies (noms de fonctions/variables en
français, échappement systématique de tout texte utilisateur avant
insertion dans le DOM, voir `_echapperTexte`/`_echapperAttr` dans
`app.js`).

### Vérifier un changement

Pas de suite de tests automatisés pour l'instant -- un changement visuel
ou comportemental doit être vérifié avec un vrai rendu dans un navigateur
(idéalement Chrome/Android, ou son émulation), pas seulement relu.
Pense à vérifier aussi :
- Le mode hors ligne (couper le réseau après un premier chargement)
- Les deux thèmes (clair/sombre) et les deux langues (FR/EN)
- Si le changement touche au stockage (`storage.js`) : que
  l'export/import restent cohérents avec le nouveau schéma

### Pour aller plus loin

Le [CLAUDE.md](CLAUDE.md) du dépôt documente les décisions techniques déjà
prises (schéma de stockage, choix de dépendances, pièges déjà rencontrés
comme le cache du service worker à invalider à chaque changement de
fichier précaché) -- utile avant de se lancer dans un changement
conséquent.

## Le ton qu'on essaie de garder

Projet porté par un club, pas une entreprise -- pas de pression, pas
d'attente de réactivité instantanée. Sois patient·e avec les retours,
bienveillant·e dans les échanges, et n'hésite pas si quelque chose dans
cette doc (ou dans le code) n'est pas clair : c'est aussi un signal utile
pour l'améliorer. Voir aussi le [code de conduite](CODE_OF_CONDUCT.md).

---

# Contributing to FletchLog

Thanks for your interest in FletchLog! This project started from a club's
real-world use (Les Aigles 77 / Archers Libres de Fontaine le Port),
published open source under [GPL-3.0-or-later](LICENSE) to be useful to
other archers and clubs. The contribution process is kept deliberately
simple.

## Reporting a bug or suggesting an idea

Use [GitHub Issues](https://github.com/MrFanghoDev/fletchlog/issues) --
no complicated form needed. For a bug, what helps most:
- What you did, what you expected, what happened instead
- Which view is involved (List, Map, add-entry form, Help...) and
  whether you're using FletchLog installed (PWA) or directly in the
  browser
- Your browser/device (FletchLog primarily targets Android/Chrome) and
  FletchLog's version (shown at the bottom of the pages)

You don't need a solution in mind already -- a well-described problem is
plenty.

## Proposing a code change

The classic open-source flow, nothing more:

1. **Fork** the repository, then clone your fork
2. Create a branch (`git checkout -b my-feature`)
3. Make your changes
4. Check them in a real browser (see below)
5. Open a **Pull Request** against `master`, explaining the *why* of the
   change, not just the *what*

No need to discuss a big change beforehand if you'd rather show code
directly -- but for anything structural (storage schema change, new
dependency, new view...), opening an Issue first to discuss it avoids
coding in a direction that might not fit.

### Setting up for development

No installation or build needed (plain JS/HTML/CSS, no framework, no
`npm install`) -- but the service worker that enables offline use refuses
to register if the page is opened directly as a file (`file://`), so
serve the folder with a small local server:

```bash
git clone https://github.com/MrFanghoDev/fletchlog.git
cd fletchlog
python3 -m http.server 8080
# then open http://localhost:8080/ in a browser
```

### Code style

No automatic formatting tool for now (unlike FletchScore/FletchTime on
the Python side) -- stay consistent with the style already in the file
you're editing (French function/variable names, systematic escaping of
any user text before inserting it into the DOM, see
`_echapperTexte`/`_echapperAttr` in `app.js`).

### Verifying a change

No automated test suite for now -- a visual or behavioral change must be
verified with a real render in a browser (ideally Chrome/Android, or its
emulation), not just reviewed. Also worth checking:
- Offline mode (cut the network after a first load)
- Both themes (light/dark) and both languages (FR/EN)
- If the change touches storage (`storage.js`): that export/import stay
  consistent with the new schema

### Going further

The repository's [CLAUDE.md](CLAUDE.md) documents technical decisions
already made (storage schema, dependency choices, pitfalls already run
into like the service worker cache that needs bumping on every precached
file change) -- worth a read before starting anything substantial.

## The tone we're aiming for

This is a club-run project, not a company -- no pressure, no expectation of
instant responsiveness. Please be patient with feedback, kind in
discussions, and don't hesitate to flag if anything in this doc (or the
code) isn't clear: that's useful signal for improving it too. See also the
[Code of Conduct](CODE_OF_CONDUCT.md).
