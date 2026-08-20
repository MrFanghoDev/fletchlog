# Politique de sécurité

*[English version below](#security-policy)*

## Portée

FletchLog n'a **aucun serveur** : c'est une Progressive Web App
purement statique (HTML/CSS/JS, hébergée sur GitHub Pages), toutes les
données (entrées, photos) restent stockées localement sur l'appareil via
IndexedDB, jamais transmises à un serveur de FletchLog -- il n'y en a
pas. La surface d'attaque est donc très différente de FletchScore/
FletchTime (pas d'authentification à contourner, pas d'API à abuser).

Sont notamment dans le périmètre :
- Injection de script (XSS) via un champ texte utilisateur (titre, lieu,
  commentaire, labels...) qui contournerait l'échappement systématique
  prévu avant insertion dans le DOM (voir `_echapperTexte`/
  `_echapperAttr` dans `app.js`)
- Une sauvegarde `.zip` importée (voir `export-import.js`) qui
  parviendrait à exécuter du code, écrire en dehors d'IndexedDB, ou
  déclencher une injection via des données forgées dans `entrees.json`
- Le service worker (`sw.js`) servant une ressource inattendue depuis
  son cache, ou un cache empoisonné par une réponse forgée
- Toute fuite de données vers un tiers autre que celle, déjà documentée
  ci-dessous, des tuiles OpenStreetMap

Hors périmètre (comportement attendu, pas une faille) :
- **Absence totale d'authentification** -- FletchLog est un carnet
  mono-utilisateur sur l'appareil de son propriétaire, comme les notes
  ou les photos du téléphone ; quiconque a accès physique à l'appareil
  déverrouillé a accès aux données, exactement comme n'importe quelle
  autre appli locale
- Les requêtes vers `tile.openstreetmap.org` (vue Carte) révèlent à ce
  serveur tiers la zone géographique consultée (coordonnées des tuiles)
  et l'IP de l'appareil -- comportement inhérent à tout affichage de
  carte en ligne, documenté, pas une fuite de FletchLog lui-même (voir
  la politique de confidentialité d'OpenStreetMap)
- Une sauvegarde `.zip` exportée qui seraît ensuite partagée ou stockée
  ailleurs sans précaution par l'utilisateur -- une fois exportée, la
  responsabilité de ce fichier revient à qui l'a exporté

## Données personnelles (RGPD)

FletchLog ne collecte, ne reçoit, ni ne transmet lui-même aucune donnée
personnelle -- pas de serveur, pas de compte, pas de télémétrie. Toutes
les données (y compris une éventuelle position GPS) restent sur
l'appareil, sous le contrôle exclusif de son propriétaire, qui décide
seul de les exporter ou de les supprimer (voir la page Aide de l'appli).
La seule donnée qui quitte l'appareil est la requête technique vers
`tile.openstreetmap.org` pour afficher un fond de carte (voir ci-dessus)
-- FletchLog n'a aucun contrôle sur le traitement fait par ce service
tiers.

## Signaler une faille

**Ne pas** ouvrir une Issue publique pour une faille de sécurité tant
qu'elle n'est pas corrigée. Contacte plutôt le mainteneur directement :

- Via l'onglet **Security** du dépôt GitHub
  ([signaler une vulnérabilité](https://github.com/MrFanghoDev/fletchlog/security/advisories/new))
- Ou par le contact indiqué sur le profil GitHub du mainteneur

Merci d'inclure : les étapes pour reproduire, la version de FletchLog
concernée, et l'impact potentiel tel que tu le vois.

## À quoi s'attendre

Projet porté par un club, pas une entreprise avec une équipe sécurité
dédiée -- pas de délai de réponse garanti, mais chaque signalement sera
pris au sérieux. Une fois corrigée, la faille sera documentée dans les
notes de version, avec crédit à qui l'a signalée si souhaité.

---

# Security Policy

## Scope

FletchLog has **no server at all**: it's a purely static Progressive Web
App (HTML/CSS/JS, hosted on GitHub Pages), all data (entries, photos)
stays stored locally on the device via IndexedDB, never sent to a
FletchLog server -- there isn't one. The attack surface is therefore
very different from FletchScore/FletchTime (no authentication to bypass,
no API to abuse).

In scope:
- Script injection (XSS) via a user text field (title, location,
  comment, labels...) that would bypass the systematic escaping applied
  before insertion into the DOM (see `_echapperTexte`/`_echapperAttr` in
  `app.js`)
- An imported `.zip` backup (see `export-import.js`) that would manage
  to execute code, write outside IndexedDB, or trigger an injection via
  forged data in `entrees.json`
- The service worker (`sw.js`) serving an unexpected resource from its
  cache, or a cache poisoned by a forged response
- Any data leak to a third party other than the one already documented
  below, regarding OpenStreetMap tiles

Out of scope (expected behavior, not a vulnerability):
- **No authentication at all** -- FletchLog is a single-user log on its
  owner's own device, like the phone's notes or photos; anyone with
  physical access to the unlocked device has access to the data, exactly
  like any other local app
- Requests to `tile.openstreetmap.org` (Map view) reveal to that third
  party server the geographic area being viewed (tile coordinates) and
  the device's IP -- inherent behavior of any online map display,
  documented, not a leak from FletchLog itself (see OpenStreetMap's own
  privacy policy)
- An exported `.zip` backup later shared or stored elsewhere without
  care by the user -- once exported, responsibility for that file falls
  to whoever exported it

## Personal data (GDPR)

FletchLog itself doesn't collect, receive, or transmit any personal
data -- no server, no account, no telemetry. All data (including any GPS
position) stays on the device, under the exclusive control of its
owner, who alone decides to export or delete it (see the app's Help
page). The only data leaving the device is the technical request to
`tile.openstreetmap.org` to display a map background (see above) --
FletchLog has no control over how that third-party service processes it.

## Reporting a vulnerability

**Do not** open a public Issue for a security vulnerability until it's
fixed. Instead, contact the maintainer directly:

- Via the repository's **Security** tab
  ([report a vulnerability](https://github.com/MrFanghoDev/fletchlog/security/advisories/new))
- Or through the contact listed on the maintainer's GitHub profile

Please include: steps to reproduce, the FletchLog version affected, and
the potential impact as you see it.

## What to expect

This project is run by a club, not a company with a dedicated security
team -- no guaranteed response time, but every report will be taken
seriously. Once fixed, the issue will be documented in the release
notes, with credit to the reporter if desired.
