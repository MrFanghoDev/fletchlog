# FletchLog

Carnet personnel pour archers FFTL/IFAA : mémorise où et sur quoi tu as
tiré -- lieu, cible/blason, discipline, distance, météo, photo.
Entraînement informel et tir nature compris, pas seulement les
compétitions officielles.

*Personal shooting log for FFTL/IFAA archers: where and on what you
shot -- location, target face, discipline, distance, weather, photo.
Casual practice and field/3D shoots included, not just official
competitions.*

Projet frère de [fletchapps](https://github.com/MrFanghoDev/fletchapps),
[fletchscore](https://github.com/MrFanghoDev/fletchscore) et
[fletchtime](https://github.com/MrFanghoDev/fletchtime), portés par
[Les Aigles 77 / Archers Libres de Fontaine-le-Port](https://github.com/MrFanghoDev).

## Statut

Utilisable -- MVP complet (installation, journal avec géolocalisation,
vraie carte OpenStreetMap, export/import). Voir les
[Releases](https://github.com/MrFanghoDev/fletchlog/releases) pour
l'historique des versions, et les
[Issues](https://github.com/MrFanghoDev/fletchlog/issues) pour les
idées post-MVP en cours.

## Ce que c'est

Une Progressive Web App (PWA) installable sur téléphone Android, qui
fonctionne hors connexion une fois installée. Pas de compte, pas de
serveur : toutes les données restent sur ton appareil, tu les exportes
toi-même si tu veux les sauvegarder ou changer de téléphone.

## Faire tourner en local

Aucune installation ni build nécessaire (JS/HTML/CSS simple), mais le
service worker qui permet le fonctionnement hors ligne refuse de
s'enregistrer si la page est ouverte directement comme fichier --
sers le dossier avec un petit serveur local :

```bash
git clone https://github.com/MrFanghoDev/fletchlog.git
cd fletchlog
python3 -m http.server 8080
# puis ouvrir http://localhost:8080/ dans un navigateur
```

## Licence

[GPLv3](LICENSE).

---

Développé pour / Built for les Archers Libres de Fontaine-le-Port --
[@MrFanghoDev](https://github.com/MrFanghoDev) -- [Licence GPLv3 / GPLv3 License](https://github.com/MrFanghoDev/fletchlog/blob/master/LICENSE)
