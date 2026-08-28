/* Carte souvenir -- retour utilisateur : garder une image récapitulative
 * partageable d'un lieu, d'une période, ou de tout autre résultat de
 * filtre. Fichier séparé (même principe qu'export-import.js) plutôt que
 * grossir app.js encore -- fonctionnalité autonome, un seul point
 * d'entrée réel (ouvrirSouvenir(), câblée en bas de ce fichier).
 *
 * Rendu en <canvas> (aucune dépendance ajoutée) à partir des sorties
 * actuellement filtrées (entreesFiltrees(), définie dans app.js,
 * appelée telle quelle -- la carte souvenir n'a pas son propre état de
 * filtre, elle reflète exactement ce que l'utilisateur regarde déjà).
 * Une seule photo "vedette" (la première sortie filtrée qui en a une,
 * dans l'ordre de tri actuellement sélectionné dans la vue Liste) en
 * grand format, plus une bande de petites vignettes en bas de carte
 * pour les autres sorties filtrées qui ont aussi une photo (retour
 * utilisateur, 2026-08-25) -- juste la première photo de chacune
 * (photoIds[0]), pas une mosaïque complète par sortie.
 *
 * Carte au même ratio que la photo vedette (retour utilisateur,
 * 2026-08-25) -- la photo remplit tout le cadre (plus de fond uni
 * autour), infos superposées par-dessus via un dégradé sombre en bas
 * plutôt qu'en dessous sur fond séparé. Ratio de la photo repris
 * directement, borné à [RATIO_MIN, RATIO_MAX] pour éviter une carte
 * absurdement étroite/large sur une photo au format inhabituel --
 * dans cette plage, la photo remplit le cadre sans rognage visible.
 */

const SOUVENIR_LARGEUR_DEFAUT = 1080;
const SOUVENIR_HAUTEUR_DEFAUT = 1350;
const SOUVENIR_MARGE = 64;
const SOUVENIR_RATIO_MIN = 0.55; // proche de 9:16, portrait téléphone habituel
// Revu à la baisse (1.5 -> 1.35) en ajoutant les lignes tags/disciplines
// (retour utilisateur, 2026-08-26) : dans le pire cas (titre sur 2
// lignes + sous-titre + météo + disciplines + tags + bande de
// vignettes, tout présent en même temps), le bloc de texte empilé
// depuis le bas peut atteindre ~700px de haut -- une carte trop basse
// ferait déborder le haut du titre. 1.35 (hauteur mini 800px à largeur
// 1080 fixe) garde ~100px de marge sur ce pire cas, au prix de
// s'écarter un peu plus du ratio réel d'une photo très large (16:9).
const SOUVENIR_RATIO_MAX = 1.35;

// Bande de vignettes des sorties supplémentaires -- une seule rangée,
// jamais plus (pas de défilement possible sur une image statique) :
// 6 vignettes de 140px + 16px d'espacement tiennent tout juste dans la
// largeur utile (1080 - 2*64 = 952px). Au-delà, la dernière vignette
// affichée porte un badge "+N" plutôt que d'en dessiner davantage.
const SOUVENIR_VIGNETTE_TAILLE = 140;
const SOUVENIR_VIGNETTE_ECART = 16;
const SOUVENIR_VIGNETTE_MAX = 6;

// Mini-carte des positions (retour utilisateur, 2026-08-27) -- petit
// encart carré, coin haut-droit (symétrique de la marque, en haut à
// gauche).
const SOUVENIR_CARTE_TAILLE = 130;

const EMOJI_METEO = { ensoleille: "☀️", nuageux: "🌥️", pluie: "🌧️", vent: "💨" };

// Contours simplifiés pour la mini-carte de positions (retour
// utilisateur, 2026-08-27) -- Natural Earth 1:110m Admin 0 Countries
// (naturalearthdata.com), domaine public ("No permission is needed
// to use Natural Earth. Crediting the authors is unnecessary." --
// politique officielle du projet, vérifiée avant d'embarquer ces
// données). Simplifiés (Douglas-Peucker) pour rester légers : France
// métropolitaine + Corse uniquement pour CONTOUR_FRANCE (~700 octets)
// ; plus gros anneau de chaque pays, pays de très petite superficie
// exclus, pour CONTOUR_MONDE (~18Ko) -- suffisant pour une silhouette
// reconnaissable à la petite taille de cet encart, pas une vraie
// carte de navigation. Chaque contour est un tableau d'anneaux
// [longitude, latitude], un anneau par île/partie continue.
const CONTOUR_FRANCE = [[[6.19,49.46],[6.66,49.2],[8.1,49.02],[7.59,48.33],[7.47,47.62],[7.19,47.45],[6.74,47.54],[6.77,47.29],[6.04,46.73],[6.02,46.27],[6.5,46.43],[6.84,45.99],[6.8,45.71],[7.1,45.33],[6.75,45.03],[7.01,44.25],[7.55,44.13],[7.44,43.69],[6.53,43.13],[4.56,43.4],[3.1,43.08],[2.99,42.47],[1.83,42.34],[0.7,42.8],[0.34,42.58],[-1.5,43.03],[-1.9,43.42],[-1.38,44.02],[-1.19,46.01],[-2.23,47.06],[-2.96,47.57],[-4.49,47.95],[-4.59,48.68],[-3.3,48.9],[-1.62,48.64],[-1.93,49.78],[-0.99,49.35],[1.34,50.13],[1.64,50.95],[2.51,51.15],[2.66,50.8],[3.12,50.78],[3.59,50.38],[4.29,49.91],[4.8,49.99],[5.9,49.44],[6.19,49.46]],[[8.75,42.63],[9.39,43.01],[9.56,42.15],[9.23,41.38],[8.78,41.58],[8.54,42.26],[8.75,42.63]]];
const CONTOUR_MONDE = [[[33.9,-0.95],[39.2,-4.68],[39.52,-10.9],[34.56,-11.52],[29.62,-6.52],[30.42,-1.13],[33.9,-0.95]],[[-8.67,27.66],[-8.69,25.88],[-11.97,25.93],[-12.93,21.33],[-17.06,21.0],[-8.67,27.66]],[[-122.84,49],[-127.44,50.83],[-130.01,55.92],[-135.48,59.79],[-141.0,60.31],[-140.99,69.71],[-128.14,70.48],[-108.88,67.38],[-106.15,68.8],[-96.13,67.29],[-94.23,69.07],[-96.47,70.09],[-95.21,71.92],[-87.35,67.2],[-85.52,69.88],[-82.62,69.66],[-81.39,67.11],[-85.77,66.56],[-94.24,60.9],[-94.68,58.95],[-92.3,57.09],[-82.27,55.15],[-79.91,51.21],[-78.6,52.56],[-79.83,54.67],[-76.54,56.53],[-78.52,58.8],[-78.11,62.32],[-73.84,62.44],[-69.59,61.06],[-67.65,58.21],[-64.58,60.34],[-55.68,52.15],[-66.4,50.23],[-71.1,46.82],[-65.06,49.23],[-64.47,46.24],[-60.52,47.01],[-59.8,45.92],[-65.36,43.55],[-64.43,45.29],[-67.14,45.14],[-69.24,47.45],[-71.51,45.01],[-82.44,41.68],[-82.55,45.35],[-88.38,48.3],[-122.84,49]],[[-122.84,49],[-88.38,48.3],[-82.55,45.35],[-82.69,41.68],[-71.51,45.01],[-69.24,47.45],[-66.96,44.81],[-75.53,39.5],[-75.94,37.22],[-76.99,38.24],[-75.73,35.55],[-81.34,31.44],[-80.38,25.21],[-83.71,29.94],[-86.4,30.4],[-94.69,29.48],[-97.53,25.84],[-106.51,31.75],[-117.13,32.54],[-120.62,34.61],[-124.4,40.31],[-124.69,48.18],[-122.59,47.1],[-122.84,49]],[[87.36,49.21],[79.97,44.92],[80.26,42.35],[74.21,43.3],[68.63,40.67],[58.5,45.59],[55.93,45.0],[55.97,41.31],[52.5,41.78],[50.31,44.61],[53.04,45.26],[53.04,46.85],[49.1,46.4],[46.47,48.39],[50.77,51.69],[61.34,50.8],[59.97,51.96],[61.44,54.01],[69.07,55.39],[73.43,53.49],[76.89,54.49],[80.04,50.86],[87.36,49.21]],[[55.97,41.31],[55.93,45.0],[58.5,45.59],[64.9,43.73],[68.26,40.66],[70.96,42.27],[73.06,40.87],[67.7,39.58],[67.83,37.14],[58.63,42.75],[55.97,41.31]],[[141.0,-2.6],[147.65,-6.08],[150.69,-10.58],[144.74,-7.63],[141.03,-9.12],[141.0,-2.6]],[[122.93,0.88],[120.04,-0.52],[123.34,-0.62],[121.51,-1.9],[123.16,-5.34],[120.97,-2.63],[119.8,-5.67],[119.83,0.15],[122.93,0.88]],[[-57.63,-30.22],[-58.5,-34.43],[-56.79,-36.9],[-65.12,-41.06],[-63.46,-42.56],[-67.29,-45.55],[-65.64,-47.24],[-69.14,-50.73],[-68.15,-52.35],[-71.91,-52.01],[-73.42,-49.32],[-71.22,-44.78],[-72.15,-42.25],[-68.42,-24.52],[-66.27,-21.83],[-62.85,-22.03],[-57.78,-25.16],[-58.62,-27.12],[-55.7,-27.39],[-54.13,-25.55],[-53.65,-26.92],[-57.63,-30.22]],[[-69.59,-17.58],[-66.99,-22.99],[-70.54,-31.37],[-71.22,-44.78],[-73.42,-49.32],[-71.91,-52.01],[-68.57,-52.3],[-71.43,-53.86],[-74.95,-52.26],[-75.61,-48.67],[-74.13,-46.94],[-75.64,-46.65],[-72.72,-42.38],[-74.33,-43.22],[-73.59,-37.16],[-69.59,-17.58]],[[29.34,-4.5],[30.74,-8.34],[28.73,-8.53],[28.37,-11.79],[29.7,-13.26],[22.16,-11.08],[21.73,-7.29],[17.47,-8.07],[16.33,-5.88],[12.18,-5.79],[16.01,-3.54],[19.47,5.03],[29.72,4.6],[31.17,2.2],[29.34,-4.5]],[[41.59,-1.68],[40.98,2.78],[51.11,12.02],[48.59,5.34],[41.59,-1.68]],[[39.2,-4.68],[33.9,-0.95],[35.3,5.51],[41.86,3.92],[41.59,-1.68],[39.2,-4.68]],[[24.57,8.23],[21.94,12.59],[25,22],[36.87,22],[38.41,18.0],[33.97,8.68],[32.74,12.25],[31.35,9.81],[25.07,10.27],[24.57,8.23]],[[23.84,19.58],[22.86,11.14],[15.28,7.42],[13.54,14.37],[15.9,20.39],[14.85,22.86],[23.84,19.58]],[[-71.71,19.71],[-71.71,18.04],[-74.46,18.34],[-71.71,19.71]],[[-71.71,18.04],[-71.59,19.88],[-68.32,18.61],[-71.71,18.04]],[[49.1,46.4],[46.68,44.61],[47.82,41.15],[39.96,43.43],[36.68,45.24],[40.07,49.6],[31.79,52.1],[30.87,55.55],[28.18,56.17],[28.07,60.5],[31.52,62.87],[28.59,69.06],[32.13,69.91],[41.06,67.46],[33.18,66.63],[37.01,63.85],[43.95,66.07],[43.45,68.57],[46.25,68.25],[46.35,66.67],[53.72,68.86],[59.94,68.28],[60.55,69.85],[68.51,68.09],[66.69,71.03],[69.94,73.04],[72.8,72.22],[72.42,66.17],[75.05,67.76],[73.1,71.45],[74.66,72.83],[76.36,71.15],[81.5,71.75],[80.51,73.65],[104.35,77.7],[114.13,75.85],[109.4,74.18],[126.98,73.57],[131.29,70.79],[140.47,72.85],[160.94,69.44],[180,68.96],[180,64.98],[177.41,64.61],[179.23,62.3],[163.54,59.87],[162.12,54.86],[156.79,51.01],[155.91,56.77],[164.47,62.55],[160.12,60.54],[156.72,61.43],[155.04,59.14],[142.2,59.04],[135.13,54.73],[141.35,53.09],[140.06,48.45],[134.87,43.4],[130.78,42.22],[131.03,44.97],[133.1,45.14],[135.03,48.48],[130.99,47.79],[123.57,53.46],[120.18,52.75],[117.88,49.51],[108.48,49.28],[98.86,52.05],[97.26,49.73],[92.23,50.8],[87.36,49.21],[80.04,50.86],[76.89,54.49],[73.43,53.49],[69.07,55.39],[61.44,54.01],[59.97,51.96],[61.34,50.8],[47.55,50.45],[46.47,48.39],[49.1,46.4]],[[31.1,69.56],[17.99,68.57],[12.58,64.07],[11.03,58.86],[5.67,58.59],[4.99,61.97],[19.18,69.82],[28.17,71.19],[31.1,69.56]],[[-46.76,82.63],[-27.1,83.52],[-20.85,82.73],[-31.4,82.02],[-12.21,81.29],[-20.05,80.18],[-17.73,80.13],[-19.7,78.75],[-18.47,76.99],[-21.68,76.63],[-19.37,74.3],[-24.79,72.33],[-21.75,70.66],[-26.36,70.23],[-22.35,70.13],[-39.81,65.46],[-44.79,60.04],[-51.63,63.63],[-53.97,67.19],[-50.87,69.93],[-54.68,69.61],[-51.39,70.57],[-55.83,71.65],[-54.72,72.59],[-58.59,75.52],[-73.3,78.04],[-65.71,79.39],[-68.02,80.12],[-62.65,81.77],[-46.76,82.63]],[[16.34,-28.58],[19.89,-28.46],[19.9,-24.77],[21.61,-26.73],[29.43,-22.09],[31.93,-24.37],[30.69,-26.74],[32.83,-26.74],[28.22,-32.77],[20.07,-34.8],[16.34,-28.58]],[[-117.13,32.54],[-101.66,29.78],[-97.14,25.87],[-97.87,22.44],[-95.9,18.83],[-91.41,18.88],[-90.28,21.0],[-87.05,21.54],[-87.84,18.26],[-91.0,17.82],[-92.23,14.54],[-103.5,18.29],[-113.15,31.17],[-114.78,31.8],[-114.67,30.16],[-110.03,22.82],[-117.13,32.54]],[[-57.63,-30.22],[-53.79,-32.05],[-53.81,-34.4],[-58.43,-33.91],[-57.63,-30.22]],[[-53.37,-33.77],[-57.63,-30.22],[-53.63,-26.12],[-55.8,-22.36],[-57.94,-22.09],[-58.24,-16.3],[-65.4,-11.57],[-65.34,-9.76],[-70.55,-11.01],[-73.99,-7.52],[-69.89,-4.3],[-69.82,1.71],[-65.55,0.79],[-63.37,2.2],[-64.82,4.06],[-60.73,5.2],[-59.03,1.32],[-52.94,2.12],[-51.32,4.2],[-50.39,-0.08],[-39.98,-2.87],[-34.73,-7.34],[-38.67,-13.06],[-40.94,-21.94],[-47.65,-24.89],[-53.37,-33.77]],[[-69.53,-10.95],[-65.34,-9.76],[-65.4,-11.57],[-58.24,-16.3],[-57.85,-19.97],[-61.79,-19.63],[-62.69,-22.25],[-67.83,-22.87],[-69.53,-10.95]],[[-69.89,-4.3],[-73.99,-7.52],[-68.67,-12.56],[-70.37,-18.35],[-76.01,-14.65],[-81.41,-4.74],[-80.3,-3.4],[-78.64,-4.55],[-75.11,-0.06],[-69.89,-4.3]],[[-66.88,1.25],[-69.82,1.71],[-69.89,-4.3],[-70.05,-2.73],[-77.42,0.4],[-78.99,1.69],[-77.13,3.85],[-77.47,8.52],[-71.4,12.38],[-73.3,9.15],[-71.96,6.99],[-67.34,6.1],[-66.88,1.25]],[[-77.35,8.67],[-80.89,7.22],[-82.93,9.48],[-77.35,8.67]],[[-82.55,9.57],[-82.97,8.23],[-85.94,10.9],[-82.55,9.57]],[[-83.66,10.94],[-87.67,12.91],[-83.15,15.0],[-83.66,10.94]],[[-83.15,15.0],[-87.32,12.98],[-89.35,14.42],[-87.9,15.86],[-83.15,15.0]],[[-92.23,14.54],[-91.0,17.82],[-89.14,17.81],[-89.35,14.42],[-92.23,14.54]],[[-60.73,5.2],[-64.82,4.06],[-63.37,2.2],[-66.33,0.72],[-67.34,6.1],[-71.96,6.99],[-72.91,10.45],[-71.33,11.78],[-71.26,9.14],[-69.94,12.16],[-68.19,10.55],[-61.88,10.72],[-59.76,8.37],[-60.73,5.2]],[[-56.54,1.9],[-59.65,1.79],[-61.41,5.96],[-59.76,8.37],[-57.15,5.97],[-56.54,1.9]],[[-54.52,2.31],[-57.6,3.33],[-57.15,5.97],[-53.96,5.76],[-54.52,2.31]],[[6.19,49.46],[8.1,49.02],[6.04,46.73],[7.44,43.69],[1.83,42.34],[-1.9,43.42],[-1.19,46.01],[-4.59,48.68],[2.51,51.15],[6.19,49.46]],[[-75.37,-0.15],[-78.64,-4.55],[-80.44,-4.43],[-80.09,0.77],[-75.37,-0.15]],[[-82.27,23.19],[-74.18,20.28],[-77.76,19.86],[-81.8,22.64],[-84.97,21.9],[-82.27,23.19]],[[31.19,-22.25],[28.02,-21.49],[25.26,-17.74],[30.27,-15.51],[32.85,-16.71],[31.19,-22.25]],[[29.43,-22.09],[21.61,-26.73],[19.9,-24.77],[20.91,-18.25],[25.26,-17.74],[29.43,-22.09]],[[19.9,-24.77],[19.89,-28.46],[16.34,-28.58],[11.73,-17.3],[25.08,-17.58],[20.91,-18.25],[19.9,-24.77]],[[-16.71,13.59],[-17.63,14.73],[-14.58,16.6],[-11.51,12.44],[-16.71,13.59]],[[-11.51,12.44],[-11.67,15.39],[-5.54,15.5],[-6.45,24.96],[4.27,19.16],[3.64,15.57],[-4.01,13.47],[-5.4,10.37],[-11.51,12.44]],[[-17.06,21.0],[-12.93,21.33],[-11.97,25.93],[-8.69,25.88],[-8.68,27.4],[-4.92,24.97],[-6.45,24.96],[-5.54,15.5],[-12.17,14.62],[-16.46,16.14],[-17.06,21.0]],[[2.69,6.26],[0.77,10.47],[2.85,12.24],[2.69,6.26]],[[14.85,22.86],[15.9,20.39],[14.18,12.48],[1.02,12.85],[0.37,14.93],[3.64,15.57],[4.27,19.16],[12.0,23.47],[14.85,22.86]],[[2.69,6.26],[4.37,13.75],[13.08,13.6],[14.58,12.09],[8.5,4.77],[2.69,6.26]],[[14.5,12.86],[15.94,1.73],[9.65,2.28],[8.76,5.48],[11.75,6.98],[14.5,12.86]],[[0.9,11.0],[1.06,5.93],[0.9,11.0]],[[0.02,11.02],[1.06,5.93],[-2.86,4.99],[-2.94,10.96],[0.02,11.02]],[[-8.03,10.21],[-2.83,9.64],[-2.86,4.99],[-7.71,4.36],[-8.03,10.21]],[[-13.7,12.59],[-9.13,12.31],[-8.28,7.69],[-11.12,10.05],[-13.25,8.9],[-15.13,11.04],[-13.7,12.59]],[[-8.44,7.69],[-7.71,4.36],[-11.44,6.79],[-10.23,8.41],[-8.44,7.69]],[[-13.25,8.9],[-11.12,10.05],[-10.23,8.41],[-11.44,6.79],[-13.25,8.9]],[[-5.4,10.37],[-1.07,14.97],[2.18,12.63],[-2.83,9.64],[-5.4,10.37]],[[27.37,5.23],[19.47,5.03],[16.01,2.27],[14.46,5.45],[22.86,11.14],[27.37,5.23]],[[18.45,3.5],[16.01,-3.54],[11.91,-5.04],[11.48,-2.77],[14.43,-1.33],[13.08,2.27],[18.45,3.5]],[[11.28,2.26],[14.28,1.2],[14.43,-1.33],[11.09,-3.98],[8.8,-1.11],[11.28,2.26]],[[30.74,-8.34],[33.23,-9.68],[33.21,-13.97],[27.04,-17.94],[23.22,-17.52],[21.93,-12.9],[24.02,-12.91],[23.91,-10.93],[29.7,-13.26],[28.45,-9.16],[30.74,-8.34]],[[32.76,-9.23],[35.69,-14.61],[35.03,-16.8],[32.69,-13.71],[32.76,-9.23]],[[34.56,-11.52],[40.32,-10.32],[40.78,-14.69],[34.79,-19.78],[35.46,-24.12],[32.07,-26.73],[31.19,-22.25],[32.85,-16.71],[30.18,-14.8],[33.21,-13.97],[35.03,-16.8],[34.56,-11.52]],[[12.32,-6.1],[16.33,-5.88],[17.47,-8.07],[21.73,-7.29],[22.16,-11.08],[24.02,-11.24],[24.02,-12.91],[21.93,-12.9],[23.22,-17.52],[11.73,-17.3],[13.74,-11.3],[12.32,-6.1]],[[35.72,32.71],[34.92,29.5],[35.72,32.71]],[[49.54,-12.47],[50.38,-15.71],[47.1,-24.94],[45.41,-25.6],[43.35,-22.78],[43.96,-17.41],[49.54,-12.47]],[[9.48,30.31],[7.52,34.1],[9.51,37.35],[11.03,37.09],[11.49,33.14],[9.48,30.31]],[[-8.68,27.4],[-8.67,28.84],[-1.31,32.26],[-1.21,35.71],[8.42,36.95],[9.32,26.09],[12.0,23.47],[3.16,19.06],[-8.68,27.4]],[[35.55,32.39],[39.2,32.16],[36.07,29.2],[35.55,32.39]],[[51.58,24.25],[56.26,25.71],[55.01,22.5],[51.58,24.25]],[[39.2,32.16],[41.29,36.36],[44.77,37.17],[48.57,29.93],[44.71,29.18],[39.2,32.16]],[[55.21,22.71],[56.4,24.92],[59.81,22.31],[57.69,18.94],[53.11,16.65],[52.0,19.0],[55.0,20.0],[55.21,22.71]],[[102.58,12.19],[102.99,14.23],[107.61,13.54],[106.25,10.96],[102.58,12.19]],[[105.22,14.27],[102.99,14.23],[102.58,12.19],[100.1,13.41],[99.22,9.24],[101.15,5.69],[98.15,8.35],[99.59,11.89],[97.38,18.45],[100.12,20.42],[101.06,17.51],[104.72,17.43],[105.22,14.27]],[[107.38,14.2],[105.22,14.27],[103.96,18.24],[101.06,17.51],[100.12,20.42],[101.65,22.32],[104.44,20.76],[107.38,14.2]],[[100.12,20.42],[97.38,18.45],[99.59,11.89],[98.55,9.93],[97.16,16.93],[94.19,16.04],[92.3,21.48],[97.91,28.34],[97.6,23.9],[101.15,21.85],[100.12,20.42]],[[104.33,10.49],[107.49,12.34],[107.56,15.2],[102.17,22.46],[105.33,23.35],[108.05,21.55],[105.66,19.06],[108.88,15.28],[109.2,11.67],[105.16,8.6],[104.33,10.49]],[[130.64,42.4],[127.53,39.76],[128.21,38.37],[124.71,38.11],[125.08,40.57],[130.64,42.4]],[[126.17,37.75],[128.35,38.61],[129.09,35.08],[126.49,34.39],[126.17,37.75]],[[87.75,49.3],[92.23,50.8],[97.26,49.73],[98.86,52.05],[108.48,49.28],[116.68,49.89],[115.74,47.73],[119.77,47.05],[104.96,41.6],[96.35,42.73],[90.95,45.29],[87.75,49.3]],[[97.33,28.26],[92.67,22.04],[91.16,23.5],[92.38,24.98],[88.56,26.45],[88.89,21.69],[80.32,15.9],[79.86,10.36],[77.54,7.97],[72.63,21.36],[70.47,20.88],[68.18,23.69],[71.04,24.36],[69.51,26.94],[75.26,32.27],[73.75,34.32],[77.84,35.49],[78.74,31.52],[81.11,30.18],[80.09,28.79],[83.3,27.36],[92.03,26.84],[96.12,29.45],[97.33,28.26]],[[92.67,22.04],[92.37,20.67],[91.42,22.77],[89.03,22.06],[88.56,26.45],[92.38,24.98],[91.16,23.5],[92.67,22.04]],[[91.7,27.77],[88.84,27.1],[91.7,27.77]],[[88.12,27.88],[87.23,26.4],[80.09,28.79],[81.53,30.42],[88.12,27.88]],[[77.84,35.49],[73.75,34.32],[75.26,32.27],[69.51,26.94],[71.04,24.36],[61.5,25.08],[63.32,26.76],[60.87,29.83],[66.35,29.89],[71.85,36.51],[77.84,35.49]],[[66.52,37.36],[70.81,38.49],[71.84,36.74],[75.16,37.13],[71.26,36.07],[66.35,29.89],[60.87,29.83],[61.21,35.65],[66.52,37.36]],[[67.83,37.14],[67.7,39.58],[70.67,40.96],[69.46,39.53],[73.68,39.43],[74.98,37.42],[71.84,36.74],[70.81,38.49],[67.83,37.14]],[[70.96,42.27],[80.26,42.35],[71.78,39.28],[69.46,39.53],[73.06,40.87],[70.96,42.27]],[[52.5,41.78],[58.63,42.75],[66.52,37.36],[62.23,35.27],[57.33,38.03],[53.92,37.2],[52.69,40.03],[54.74,40.95],[52.5,41.78]],[[48.57,29.93],[44.11,39.43],[48.06,39.58],[52.26,36.7],[57.33,38.03],[61.12,36.49],[60.87,29.83],[63.32,26.76],[61.5,25.08],[57.4,25.74],[48.57,29.93]],[[35.72,32.71],[36.74,36.82],[42.35,37.23],[41.01,34.42],[35.72,32.71]],[[46.51,38.77],[43.58,41.09],[46.51,38.77]],[[11.03,58.86],[11.93,63.13],[16.77,68.01],[23.54,67.94],[23.9,66.01],[17.85,62.75],[18.79,60.08],[15.88,56.1],[12.94,55.36],[11.03,58.86]],[[28.18,56.17],[30.87,55.55],[31.79,52.1],[23.53,51.58],[23.48,53.91],[28.18,56.17]],[[31.79,52.1],[40.07,49.6],[35.01,45.74],[28.68,45.3],[30.02,46.42],[28.67,48.12],[22.09,48.42],[23.53,51.58],[31.79,52.1]],[[23.48,53.91],[22.78,49.03],[16.18,50.42],[14.07,52.98],[17.62,54.85],[23.48,53.91]],[[16.98,48.12],[14.63,46.43],[9.48,47.1],[13.6,48.88],[16.98,48.12]],[[22.09,48.42],[21.02,46.32],[16.2,46.85],[22.09,48.42]],[[26.62,48.22],[30.02,46.42],[28.23,45.49],[26.62,48.22]],[[28.23,45.49],[29.6,45.29],[28.56,43.71],[22.94,43.82],[20.22,46.13],[26.62,48.22],[28.23,45.49]],[[26.49,55.62],[23.48,53.91],[21.06,56.03],[26.49,55.62]],[[27.29,57.47],[28.18,56.17],[26.49,55.62],[21.06,56.03],[22.52,57.75],[27.29,57.47]],[[27.98,59.48],[27.29,57.47],[23.34,59.19],[27.98,59.48]],[[14.12,53.76],[15.02,51.11],[12.24,50.27],[12.93,47.47],[7.47,47.62],[8.1,49.02],[6.04,50.13],[7.1,53.69],[9.92,54.98],[14.12,53.76]],[[22.66,44.23],[28.56,43.71],[28.0,42.01],[22.95,41.34],[22.66,44.23]],[[22.95,41.34],[26.6,41.56],[22.63,40.26],[24.04,37.66],[22.49,36.41],[20.15,39.62],[22.95,41.34]],[[44.77,37.17],[29.7,36.14],[26.17,39.46],[33.51,42.02],[42.62,41.58],[44.77,37.17]],[[21.02,40.84],[19.41,40.25],[19.74,42.69],[21.02,40.84]],[[16.56,46.5],[19.39,45.24],[15.75,44.82],[18.45,42.48],[13.66,45.14],[16.56,46.5]],[[9.59,47.53],[9.92,46.31],[6.02,46.27],[9.59,47.53]],[[6.16,50.8],[5.67,49.53],[2.51,51.15],[6.16,50.8]],[[6.91,53.48],[6.16,50.8],[3.31,51.35],[6.91,53.48]],[[-9.03,41.88],[-6.39,41.38],[-7.86,36.84],[-9.03,41.88]],[[-7.45,37.1],[-6.39,41.38],[-9.39,43.03],[2.99,42.47],[-2.15,36.67],[-7.45,37.1]],[[-6.2,53.87],[-9.98,51.82],[-7.57,55.13],[-6.2,53.87]],[[165.78,-21.08],[164.03,-20.11],[165.78,-21.08]],[[176.89,-40.07],[174.65,-41.28],[172.64,-34.53],[178.52,-37.7],[176.89,-40.07]],[[126.15,-32.22],[118.02,-35.06],[115.03,-34.2],[113.74,-22.48],[120.86,-19.68],[125.69,-14.23],[129.62,-14.97],[132.36,-11.13],[136.49,-11.86],[135.5,-15.0],[140.22,-17.71],[142.52,-10.67],[153.57,-28.11],[150.0,-37.43],[146.32,-39.04],[140.64,-38.02],[138.21,-34.38],[136.83,-35.26],[137.81,-32.9],[135.99,-34.89],[131.33,-31.5],[126.15,-32.22]],[[81.79,7.52],[80.35,5.97],[80.15,9.82],[81.79,7.52]],[[80.26,42.35],[79.97,44.92],[87.75,49.3],[90.95,45.29],[96.35,42.73],[109.24,42.52],[111.87,45.1],[119.66,46.69],[115.49,48.14],[122.25,53.43],[125.95,52.79],[130.99,47.79],[135.03,48.48],[130.64,42.4],[117.53,38.74],[122.36,37.45],[119.15,34.91],[121.91,31.69],[121.68,28.23],[118.66,24.55],[110.44,20.34],[105.33,23.35],[101.8,21.17],[99.24,22.12],[97.6,23.9],[98.68,27.51],[96.12,29.45],[88.81,27.3],[78.74,31.52],[78.91,34.32],[73.68,39.43],[80.26,42.35]],[[121.78,24.39],[120.75,21.97],[120.11,23.56],[121.78,24.39]],[[10.44,46.89],[13.81,46.51],[12.59,44.09],[18.29,39.81],[16.87,40.44],[15.68,37.91],[15.41,40.05],[10.2,43.92],[7.44,43.69],[6.84,45.99],[10.44,46.89]],[[9.92,54.98],[8.09,56.54],[10.58,57.73],[9.92,54.98]],[[-3.09,53.4],[-6.15,56.79],[-5.01,58.63],[-3.01,58.63],[-3.12,55.97],[1.68,52.74],[0.55,50.77],[-5.25,49.96],[-3.41,51.43],[-5.27,51.99],[-4.58,53.5],[-3.09,53.4]],[[-14.51,66.46],[-13.61,65.13],[-18.66,63.5],[-24.33,65.61],[-14.51,66.46]],[[46.4,41.86],[50.39,40.26],[48.88,38.32],[45.61,39.9],[46.4,41.86]],[[39.96,43.43],[46.64,41.18],[41.55,41.54],[39.96,43.43]],[[122.34,18.22],[121.73,14.33],[124.08,12.54],[119.92,15.41],[120.72,18.51],[122.34,18.22]],[[117.88,4.14],[115.87,4.31],[114.62,1.43],[109.83,1.34],[116.73,6.92],[119.18,5.41],[117.88,4.14]],[[28.59,69.06],[31.14,62.36],[28.07,60.5],[21.32,60.72],[21.54,63.19],[25.4,65.11],[20.65,69.11],[28.59,69.06]],[[22.56,49.09],[16.88,48.47],[22.56,49.09]],[[15.02,51.11],[18.85,49.5],[14.34,48.56],[12.24,50.27],[15.02,51.11]],[[36.43,14.42],[38.41,18.0],[43.08,12.7],[36.43,14.42]],[[141.88,39.18],[140.25,35.14],[130.99,33.89],[130.2,31.42],[129.41,33.3],[139.43,38.22],[140.31,41.2],[141.88,39.18]],[[-58.17,-20.18],[-54.29,-24.02],[-55.7,-27.39],[-58.62,-27.12],[-57.78,-25.16],[-62.69,-22.25],[-61.79,-19.63],[-58.17,-20.18]],[[52.0,19.0],[52.17,15.6],[43.48,12.64],[43.38,17.58],[47.0,16.95],[52.0,19.0]],[[34.96,29.36],[39.2,32.16],[47.46,29.0],[52.0,23.0],[55.21,22.71],[55.0,20.0],[42.78,16.35],[34.96,29.36]],[[180,-84.71],[180,-90],[-180,-90],[-179.06,-84.14],[-143.11,-85.04],[-153.59,-83.69],[-152.86,-82.04],[-156.84,-81.1],[-146.42,-80.34],[-155.33,-79.06],[-158.37,-76.89],[-113.94,-73.71],[-100.65,-75.3],[-103.68,-72.62],[-74.89,-73.87],[-67.37,-72.48],[-67.74,-67.33],[-57.81,-63.27],[-65.67,-67.95],[-60.83,-73.7],[-77.24,-76.71],[-73.66,-77.91],[-78.02,-79.18],[-58.22,-83.22],[-28.55,-80.34],[-35.64,-79.46],[-35.33,-78.12],[-17.52,-75.13],[-6.87,-70.93],[27.09,-70.46],[33.87,-68.5],[38.65,-69.78],[54.53,-65.82],[68.89,-67.93],[67.95,-71.85],[69.87,-72.26],[87.99,-66.21],[119.83,-67.27],[135.07,-65.31],[137.46,-66.95],[171.21,-71.7],[163.57,-76.24],[167.0,-78.75],[159.79,-80.95],[180,-84.71]],[[-2.17,35.17],[-1.31,32.26],[-8.67,28.84],[-14.75,21.5],[-17.02,21.42],[-8.66,33.24],[-5.93,35.76],[-2.17,35.17]],[[36.87,22],[25,22],[25.16,31.57],[34.27,31.22],[34.15,27.82],[32.32,29.76],[36.87,22]],[[25,22],[23.84,19.58],[10.3,24.38],[9.95,31.38],[11.49,33.14],[19.09,30.27],[20.85,32.71],[24.92,31.9],[25,22]],[[47.79,8.0],[44.96,5.0],[39.56,3.42],[32.95,7.78],[37.91,14.96],[41.6,13.45],[43.68,9.18],[47.79,8.0]],[[48.95,11.41],[47.79,8.0],[42.56,10.57],[48.95,11.41]],[[33.9,-0.95],[29.58,-1.34],[31.25,3.78],[34.48,3.56],[33.9,-0.95]],[[18.56,42.65],[15.96,45.23],[19.37,44.86],[18.56,42.65]],[[18.83,45.91],[22.71,44.58],[22.55,42.46],[19.22,43.52],[18.83,45.91]],[[30.83,3.51],[23.89,8.62],[25.79,10.41],[31.35,9.81],[33.21,12.18],[32.95,7.78],[35.3,5.51],[30.83,3.51]]];


let _souvenirIconePromise = null;
function _chargerIconeSouvenir() {
  if (!_souvenirIconePromise) {
    _souvenirIconePromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = "icon-192.png";
    });
  }
  return _souvenirIconePromise;
}

function _chargerPhoto(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Sorties avec une photo en cache, dans l'ordre de tri actuellement
// sélectionné dans la vue Liste (respecte ce que l'utilisateur regarde
// déjà, trierEntrees() définie dans app.js). Photo déjà en cache (voir
// precharcherPhotos() dans app.js -- appelée au chargement, donc
// disponible ici sans nouvelle lecture IndexedDB).
function _entreesAvecPhoto(entrees) {
  return trierEntrees(entrees).filter((e) => (e.photoIds || []).length && photosCache[e.photoIds[0]]);
}

// Sortie vedette -- `idVedetteManuel` (choisi via l'écran de sélection,
// retour utilisateur 2026-08-26) prioritaire si elle a encore une
// photo disponible dans `entrees` (ex. pas exclue) ; sinon repli sur la
// première selon le tri, comme avant l'ajout de la sélection manuelle.
function _entreeVedette(entrees, idVedetteManuel) {
  const avecPhoto = _entreesAvecPhoto(entrees);
  if (idVedetteManuel) {
    const choisie = avecPhoto.find((e) => e.id === idVedetteManuel);
    if (choisie) return choisie;
  }
  return avecPhoto[0] || null;
}

// Sorties supplémentaires avec photo (retour utilisateur, 2026-08-25) --
// même ordre de tri que la vedette, la vedette elle-même exclue
// (identifiée par id, pas par photo -- deux sorties distinctes
// pourraient en théorie partager un id de photo si l'une a été
// dupliquée via import/export, mais jamais le même id d'entrée).
function _photosSupplementaires(entrees, entreeVedette) {
  return _entreesAvecPhoto(entrees)
    .filter((e) => e.id !== entreeVedette?.id)
    .map((e) => photosCache[e.photoIds[0]]);
}

// Largeur fixe (1080, cohérent avec les tailles de police/marges déjà
// calibrées dessus), hauteur dérivée du ratio de la photo vedette
// (borné) -- ou format par défaut 4:5 s'il n'y a pas de photo.
function _dimensionsCarte(photo) {
  const largeur = SOUVENIR_LARGEUR_DEFAUT;
  if (!photo) return { largeur, hauteur: SOUVENIR_HAUTEUR_DEFAUT };
  const ratio = Math.min(Math.max(photo.width / photo.height, SOUVENIR_RATIO_MIN), SOUVENIR_RATIO_MAX);
  return { largeur, hauteur: Math.round(largeur / ratio) };
}

function _cheminRectArrondi(ctx, x, y, taille, rayon) {
  ctx.beginPath();
  ctx.moveTo(x + rayon, y);
  ctx.arcTo(x + taille, y, x + taille, y + taille, rayon);
  ctx.arcTo(x + taille, y + taille, x, y + taille, rayon);
  ctx.arcTo(x, y + taille, x, y, rayon);
  ctx.arcTo(x, y, x + taille, y, rayon);
  ctx.closePath();
}

// Dessine `image` en "cover" (recadrée, comme les vignettes du reste de
// l'appli -- .carte-vignette img { object-fit: cover }) dans un carré
// arrondi de côté `taille`, coin (x, y).
function _dessinerVignette(ctx, image, x, y, taille, rayon) {
  ctx.save();
  _cheminRectArrondi(ctx, x, y, taille, rayon);
  ctx.clip();
  const echelle = Math.max(taille / image.width, taille / image.height);
  const largeur = image.width * echelle;
  const hauteur = image.height * echelle;
  ctx.drawImage(image, x + (taille - largeur) / 2, y + (taille - hauteur) / 2, largeur, hauteur);
  ctx.restore();
  // Fin liseré -- la carte entière est désormais une photo en fond
  // (retour utilisateur, 2026-08-25), les vignettes ont besoin d'un
  // bord net pour rester lisibles par-dessus une image potentiellement
  // chargée, même sous le dégradé.
  ctx.save();
  _cheminRectArrondi(ctx, x, y, taille, rayon);
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

// Badge "+N" superposé sur la dernière vignette affichée, quand des
// sorties supplémentaires avec photo dépassent SOUVENIR_VIGNETTE_MAX.
function _dessinerBadgePlus(ctx, x, y, taille, rayon, n) {
  ctx.save();
  _cheminRectArrondi(ctx, x, y, taille, rayon);
  ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x, y, taille, taille);
  ctx.restore();
  ctx.font = "700 34px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`+${n}`, x + taille / 2, y + taille / 2 + 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// Boîte englobante [longitude, latitude] d'un contour (tableau
// d'anneaux) -- calculée à la volée plutôt que codée en dur, pour ne
// jamais désynchroniser d'éventuelles retouches futures de
// CONTOUR_FRANCE/CONTOUR_MONDE.
function _limitesContour(contour) {
  let lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity;
  for (const anneau of contour) {
    for (const [lon, lat] of anneau) {
      if (lon < lonMin) lonMin = lon;
      if (lon > lonMax) lonMax = lon;
      if (lat < latMin) latMin = lat;
      if (lat > latMax) latMax = lat;
    }
  }
  return { lonMin, lonMax, latMin, latMax };
}

// Un peu plus large que le contour réel de la France (voir
// CONTOUR_FRANCE) -- marge pour une position juste à la frontière ou
// légèrement en mer (île, port...). Au-delà : repli sur CONTOUR_MONDE
// (retour utilisateur, 2026-08-27 -- pas de vraie détection par pays,
// juste "France ou reste du monde", voir issue #26 pour une future
// vraie internationalisation).
const SOUVENIR_FRANCE_LIMITES = { lonMin: -6, lonMax: 11, latMin: 40, latMax: 52 };

function _choisirContour(positions) {
  const dansFrance = positions.every(
    (p) =>
      p.lon >= SOUVENIR_FRANCE_LIMITES.lonMin &&
      p.lon <= SOUVENIR_FRANCE_LIMITES.lonMax &&
      p.lat >= SOUVENIR_FRANCE_LIMITES.latMin &&
      p.lat <= SOUVENIR_FRANCE_LIMITES.latMax
  );
  return dansFrance ? CONTOUR_FRANCE : CONTOUR_MONDE;
}

// Mini-carte des positions (retour utilisateur, 2026-08-27) -- encart
// carré dans un coin, toutes les sorties FILTRÉES qui ont une position
// (pas seulement celles retenues pour l'illustration -- même principe
// que les autres stats de la carte, voir plus haut). Projection
// équirectangulaire avec correction de compression en longitude
// (cos(latitude moyenne)) -- approximation délibérée, largement
// suffisante à la taille décorative de cet encart, pas une vraie carte
// de navigation.
function _dessinerCartePositions(ctx, entrees, x, y, taille) {
  const positions = entrees.filter((e) => e.lat != null && e.lon != null).map((e) => ({ lat: e.lat, lon: e.lon }));
  if (!positions.length) return;

  const contour = _choisirContour(positions);
  const limites = _limitesContour(contour);
  const largeurGeo = limites.lonMax - limites.lonMin;
  const hauteurGeo = limites.latMax - limites.latMin;
  const latMoyenne = (limites.latMin + limites.latMax) / 2;
  const echelleLon = Math.cos((latMoyenne * Math.PI) / 180);

  const echelle = Math.min(taille / (largeurGeo * echelleLon), taille / hauteurGeo);
  const largeurDessin = largeurGeo * echelleLon * echelle;
  const hauteurDessin = hauteurGeo * echelle;
  const decalX = x + (taille - largeurDessin) / 2;
  const decalY = y + (taille - hauteurDessin) / 2;

  function projeter(lon, lat) {
    return [decalX + (lon - limites.lonMin) * echelleLon * echelle, decalY + (limites.latMax - lat) * echelle];
  }

  ctx.save();
  _cheminRectArrondi(ctx, x, y, taille, 14);
  ctx.fillStyle = "rgba(15,18,22,0.55)";
  ctx.fill();
  ctx.clip();

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.5;
  for (const anneau of contour) {
    ctx.beginPath();
    anneau.forEach(([lon, lat], i) => {
      const [px, py] = projeter(lon, lat);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = "#d1a13d";
  ctx.strokeStyle = "#1a1206";
  ctx.lineWidth = 1;
  for (const p of positions) {
    const [px, py] = projeter(p.lon, p.lat);
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // Liseré du cadre, par-dessus le clip -- même motif que les
  // vignettes (_dessinerVignette()), pour rester lisible sur une photo
  // chargée en fond.
  ctx.save();
  _cheminRectArrondi(ctx, x, y, taille, 14);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// Liste des lieux distincts, format court ("A, B" ou "A, B et N
// autres" au-delà de 3) -- retour utilisateur, 2026-08-26.
function _listeLieux(entrees) {
  const lieux = [...new Set(entrees.map((e) => e.lieu).filter(Boolean))];
  if (lieux.length <= 3) return lieux.join(", ");
  return tf(currentLanguage, "souvenirLieuxEtAutres", { lieux: lieux.slice(0, 2).join(", "), n: lieux.length - 2 });
}

function _titreEtSousTitre(entrees) {
  const lieux = new Set(entrees.map((e) => e.lieu));
  const disciplines = new Set(entrees.map((e) => e.discipline).filter(Boolean));
  const dateDebut = document.getElementById("filtre-date-debut").value;
  const dateFin = document.getElementById("filtre-date-fin").value;

  let titre;
  let titreEstPeriode = false;
  if (lieux.size === 1) titre = [...lieux][0];
  else if (disciplines.size === 1) titre = [...disciplines][0];
  else if (dateDebut || dateFin) {
    titre = tf(currentLanguage, "souvenirPeriode", {
      debut: dateDebut ? formaterDate(dateDebut) : "…",
      fin: dateFin ? formaterDate(dateFin) : "…",
    });
    titreEstPeriode = true;
  } else {
    titre = tf(currentLanguage, entrees.length === 1 ? "souvenirSortieSing" : "souvenirSortiePlur", { n: entrees.length });
  }

  // Quand le titre affiche déjà la période, le sous-titre ne doit pas
  // répéter la même information (retour utilisateur, 2026-08-26) -- les
  // lieux concernés sont plus utiles ici (titreEstPeriode implique
  // toujours au moins 2 lieux distincts, sinon le titre aurait pris la
  // branche "un seul lieu" plus haut).
  let sousTitre;
  if (titreEstPeriode) {
    sousTitre = _listeLieux(entrees);
  } else {
    const dates = entrees.map((e) => e.date).filter(Boolean).sort();
    sousTitre =
      dates.length && dates[0] !== dates[dates.length - 1]
        ? tf(currentLanguage, "souvenirPeriode", { debut: formaterDate(dates[0]), fin: formaterDate(dates[dates.length - 1]) })
        : dates.length
          ? formaterDate(dates[0])
          : "";
  }

  return { titre, sousTitre };
}

function _statsMeteo(entrees) {
  const comptes = {};
  for (const e of entrees) {
    if (e.meteo && e.meteo !== "aucune") comptes[e.meteo] = (comptes[e.meteo] || 0) + 1;
  }
  return Object.entries(comptes).sort((a, b) => b[1] - a[1]);
}

// Répartition des disciplines ("type de parcours", retour utilisateur,
// 2026-08-26). Retourne TOUTES les disciplines rencontrées, y compris
// une seule -- la suppression pour ne pas répéter un titre identique se
// décide au niveau de l'appelant (voir _dessinerSouvenir(), qui compare
// au titre réellement affiché : celui-ci peut être un lieu, une
// période ou un titre manuel, pas forcément la discipline -- retour
// utilisateur, 2026-08-28, la discipline disparaissait entièrement de
// la carte dans ces cas-là malgré une seule discipline distincte).
function _statsDisciplines(entrees) {
  const comptes = {};
  for (const e of entrees) {
    if (e.discipline) comptes[e.discipline] = (comptes[e.discipline] || 0) + 1;
  }
  return Object.entries(comptes).sort((a, b) => b[1] - a[1]);
}

// Tags les plus fréquents (retour utilisateur, 2026-08-26) -- plafonné
// à 5 pour rester sur une seule ligne (pas de découpe/troncature ici,
// contrairement au titre : un excès reste juste hors-cadre plutôt que
// de complexifier avec un "+N" comme les vignettes).
function _statsTags(entrees) {
  const comptes = {};
  for (const e of entrees) {
    for (const label of e.labels || []) comptes[label] = (comptes[label] || 0) + 1;
  }
  return Object.entries(comptes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label]) => label);
}

// Découpe un texte en lignes tenant dans `largeurMax`, sans jamais
// dépasser `maxLignes` (tronque avec "…" au-delà -- un titre de sortie
// peut être long, la carte doit rester lisible plutôt que déborder).
function _decouperTexte(ctx, texte, largeurMax, maxLignes) {
  const mots = texte.split(" ");
  const lignes = [];
  let ligneCourante = "";
  for (const mot of mots) {
    const essai = ligneCourante ? `${ligneCourante} ${mot}` : mot;
    if (ctx.measureText(essai).width > largeurMax && ligneCourante) {
      lignes.push(ligneCourante);
      ligneCourante = mot;
      if (lignes.length === maxLignes) break; // le reste sera tronqué ci-dessous
    } else {
      ligneCourante = essai;
    }
  }
  if (lignes.length < maxLignes && ligneCourante) lignes.push(ligneCourante);

  const texteComplet = lignes.join(" ") === texte;
  if (!texteComplet) {
    let derniere = lignes[lignes.length - 1] || "";
    while (ctx.measureText(`${derniere}…`).width > largeurMax && derniere.length > 1) {
      derniere = derniere.slice(0, -1);
    }
    lignes[lignes.length - 1] = `${derniere}…`;
  }
  return lignes;
}

// `selectionPhotos` (retour utilisateur, 2026-08-26, écran de
// sélection avant génération) restreint UNIQUEMENT quelles sorties
// peuvent illustrer la carte (vedette + bande du bas) -- le titre, le
// sous-titre, le compteur, la météo, les disciplines et les tags
// portent toujours sur `entrees` en entier (toutes les sorties
// filtrées, indépendamment des photos choisies) : exclure une photo
// de l'illustration ne doit jamais faire "disparaître" la sortie
// correspondante des statistiques de la carte.
async function _dessinerSouvenir(entrees, selectionPhotos) {
  const { idsExclus = new Set(), idVedette = null, titreManuel = "" } = selectionPhotos || {};
  const canvas = document.getElementById("souvenir-canvas");
  const ctx = canvas.getContext("2d");

  const entreesIllustration = entrees.filter((e) => !idsExclus.has(e.id));
  const entreeVedette = _entreeVedette(entreesIllustration, idVedette);
  const urlPhotoVedette = entreeVedette ? photosCache[entreeVedette.photoIds[0]] : null;
  const urlsSupplementaires = _photosSupplementaires(entreesIllustration, entreeVedette);
  const urlsVignettesAffichees = urlsSupplementaires.slice(0, SOUVENIR_VIGNETTE_MAX);
  const vignettesEnTrop = urlsSupplementaires.length - urlsVignettesAffichees.length;

  const [photo, icone, ...vignettes] = await Promise.all([
    urlPhotoVedette ? _chargerPhoto(urlPhotoVedette) : null,
    _chargerIconeSouvenir(),
    ...urlsVignettesAffichees.map((url) => _chargerPhoto(url)),
  ]);
  const vignettesChargees = vignettes.filter(Boolean);

  // Dimensions dérivées du ratio de la photo vedette (retour
  // utilisateur, 2026-08-25) -- changer canvas.width/height efface et
  // redimensionne le canvas, pas besoin de clearRect séparé.
  const { largeur, hauteur } = _dimensionsCarte(photo);
  canvas.width = largeur;
  canvas.height = hauteur;

  ctx.fillStyle = "#0f1216";
  ctx.fillRect(0, 0, largeur, hauteur);

  if (photo) {
    // "Cover" -- le canvas est déjà au ratio de la photo (à la marge
    // de bornage près), donc ceci remplit le cadre sans rogner de
    // façon visible dans l'immense majorité des cas ; seule une photo
    // au ratio extrême (hors [RATIO_MIN, RATIO_MAX]) perd un peu de
    // ses bords après bornage, plutôt que de produire une carte
    // absurdement étroite/large.
    const echelle = Math.max(largeur / photo.width, hauteur / photo.height);
    const largeurPhoto = photo.width * echelle;
    const hauteurPhoto = photo.height * echelle;
    ctx.drawImage(photo, (largeur - largeurPhoto) / 2, (hauteur - hauteurPhoto) / 2, largeurPhoto, hauteurPhoto);

    // Dégradé sombre en bas pour la lisibilité du texte superposé --
    // les infos sont de nouveau posées SUR la photo (retour
    // utilisateur, 2026-08-25), pas en dessous sur fond séparé.
    const degrade = ctx.createLinearGradient(0, hauteur * 0.4, 0, hauteur);
    degrade.addColorStop(0, "rgba(15,18,22,0)");
    degrade.addColorStop(1, "rgba(15,18,22,0.92)");
    ctx.fillStyle = degrade;
    ctx.fillRect(0, 0, largeur, hauteur);
  }

  // Marque FletchLog en haut à gauche.
  if (icone) ctx.drawImage(icone, SOUVENIR_MARGE, 56, 48, 48);
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 40px system-ui, -apple-system, sans-serif";
  const xTexteMarque = SOUVENIR_MARGE + (icone ? 62 : 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Fletch", xTexteMarque, 90);
  const largeurFletch = ctx.measureText("Fletch").width;
  ctx.fillStyle = "#d1a13d";
  ctx.fillText("Log", xTexteMarque + largeurFletch, 90);

  // Mini-carte des positions -- coin haut-droit, symétrique de la
  // marque. Absente d'elle-même (voir _dessinerCartePositions()) si
  // aucune sortie filtrée n'a de position.
  _dessinerCartePositions(ctx, entrees, largeur - SOUVENIR_MARGE - SOUVENIR_CARTE_TAILLE, 56, SOUVENIR_CARTE_TAILLE);

  // Titre manuel (retour utilisateur, 2026-08-28) -- saisi sur l'écran
  // de sélection, prioritaire sur le titre auto-déduit (lieu/discipline
  // unique/période/compteur, voir _titreEtSousTitre()) quand renseigné ;
  // le sous-titre reste lui toujours auto-calculé (dates ou lieux), une
  // info utile même quand le titre est personnalisé.
  const { titre: titreAuto, sousTitre } = _titreEtSousTitre(entrees);
  const titre = titreManuel || titreAuto;
  const largeurTexte = largeur - SOUVENIR_MARGE * 2;

  // Empilage du BAS vers le HAUT (yCurseur descend d'un pas fixe et
  // connu avant chaque élément) -- contrairement à un empilage du haut
  // vers le bas, la position des éléments du bas ne dépend alors
  // JAMAIS de la hauteur du titre/sous-titre au-dessus (un titre qui
  // tient sur une seule ligne vs deux ne peut plus faire remonter le
  // contenu du bas jusqu'à chevaucher un élément suivant -- bug réel
  // rencontré en testant une version antérieure). yCurseur démarre
  // comme simple marge basse, plus comme ligne de base d'un pied de
  // page textuel -- le mot "FletchLog" n'apparaît plus qu'une fois,
  // dans la marque en haut à gauche (retour utilisateur, 2026-08-26 :
  // le répéter en bas était redondant).
  let yCurseur = hauteur - 40;

  // Bande de vignettes des sorties supplémentaires (retour utilisateur,
  // 2026-08-25) -- juste au-dessus de la marge basse. yCurseur passe
  // ici de "marge basse" à "bas du bloc réservé" : les éléments
  // suivants (météo, compteur...) repartent de cette nouvelle position,
  // la logique d'empilage bas->haut ne change pas au-delà de ce bloc.
  if (vignettesChargees.length) {
    const yHautVignettes = yCurseur - SOUVENIR_VIGNETTE_TAILLE - 34;
    let x = SOUVENIR_MARGE;
    vignettesChargees.forEach((image, i) => {
      _dessinerVignette(ctx, image, x, yHautVignettes, SOUVENIR_VIGNETTE_TAILLE, 16);
      if (i === vignettesChargees.length - 1 && vignettesEnTrop > 0) {
        _dessinerBadgePlus(ctx, x, yHautVignettes, SOUVENIR_VIGNETTE_TAILLE, 16, vignettesEnTrop);
      }
      x += SOUVENIR_VIGNETTE_TAILLE + SOUVENIR_VIGNETTE_ECART;
    });
    yCurseur = yHautVignettes - 30;
  }

  // Tags les plus fréquents (retour utilisateur, 2026-08-26) --
  // préfixés "#" pour se lire comme des tags plutôt que du texte
  // normal, couleur plus discrète que les stats (météo/discipline).
  const tags = _statsTags(entrees);
  if (tags.length) {
    yCurseur -= 46;
    ctx.font = "28px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(
      tags.map((tag) => `#${tag}`).join("  "),
      SOUVENIR_MARGE,
      yCurseur
    );
  }

  // Répartition des disciplines ("type de parcours", retour
  // utilisateur, 2026-08-26) -- même style que la météo (compteurs sur
  // une ligne). Masquée seulement quand elle répéterait le titre déjà
  // affiché (une seule discipline ET le titre est justement cette
  // discipline) -- sinon affichée même à une seule discipline (voir
  // _statsDisciplines()).
  const disciplinesStats = _statsDisciplines(entrees);
  const disciplinesAffichees =
    disciplinesStats.length === 1 && disciplinesStats[0][0] === titre ? [] : disciplinesStats;
  if (disciplinesAffichees.length) {
    yCurseur -= 56;
    ctx.font = "34px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    let x = SOUVENIR_MARGE;
    for (const [discipline, n] of disciplinesAffichees) {
      const texte = `${discipline} ×${n}`;
      ctx.fillText(texte, x, yCurseur);
      x += ctx.measureText(texte).width + 36;
    }
  }

  const meteo = _statsMeteo(entrees);
  if (meteo.length) {
    yCurseur -= 56;
    ctx.font = "34px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    let x = SOUVENIR_MARGE;
    for (const [cle, n] of meteo) {
      const texte = `${EMOJI_METEO[cle] || ""} ${n}`;
      ctx.fillText(texte, x, yCurseur);
      x += ctx.measureText(texte).width + 36;
    }
  }

  yCurseur -= 66;
  ctx.font = "600 32px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#d1a13d";
  ctx.fillText(
    tf(currentLanguage, entrees.length === 1 ? "souvenirSortieSing" : "souvenirSortiePlur", { n: entrees.length }),
    SOUVENIR_MARGE,
    yCurseur
  );

  if (sousTitre) {
    yCurseur -= 58;
    ctx.font = "500 34px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(sousTitre, SOUVENIR_MARGE, yCurseur);
  }

  ctx.font = "700 76px system-ui, -apple-system, sans-serif";
  const lignesTitre = _decouperTexte(ctx, titre, largeurTexte, 2);
  ctx.fillStyle = "#ffffff";
  yCurseur -= 30;
  for (let i = lignesTitre.length - 1; i >= 0; i--) {
    ctx.fillText(lignesTitre[i], SOUVENIR_MARGE, yCurseur);
    yCurseur -= 84;
  }
}

function _telechargerBlobSouvenir(blob, nomFichier) {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function _nomFichierSouvenir() {
  return `fletchlog-souvenir-${new Date().toISOString().slice(0, 10)}.png`;
}

function _canvasVersBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

// État de l'écran de sélection (retour utilisateur, 2026-08-26) --
// remis à zéro à chaque ouverture (ouvrirSouvenir()), jamais persisté
// d'un souvenir à l'autre.
let _souvenirEntrees = [];
let _souvenirIdsExclus = new Set();
let _souvenirIdVedetteManuel = null;

async function ouvrirSouvenir() {
  const entrees = entreesFiltrees();
  const overlay = document.getElementById("souvenir-overlay");
  const selection = document.getElementById("souvenir-selection");
  const canvas = document.getElementById("souvenir-canvas");
  const vide = document.getElementById("souvenir-vide");
  const actions = document.getElementById("souvenir-actions");

  overlay.hidden = false;
  selection.hidden = true;
  canvas.hidden = true;
  actions.hidden = true;
  vide.hidden = true;

  if (entrees.length === 0) {
    vide.hidden = false;
    return;
  }

  _souvenirEntrees = entrees;
  _souvenirIdsExclus = new Set();
  _souvenirIdVedetteManuel = null;
  document.getElementById("souvenir-titre-manuel").value = "";

  // Champ de titre manuel toujours proposé sur cet écran (retour
  // utilisateur, 2026-08-28), même sans photo à choisir -- seuls le
  // texte d'intro et la grille de sélection sont spécifiques au choix
  // des photos et masqués dans ce cas.
  const entreesAvecPhoto = _entreesAvecPhoto(entrees);
  const aDesPhotos = entreesAvecPhoto.length > 0;
  document.getElementById("souvenir-selection-titre-texte").hidden = !aDesPhotos;
  document.getElementById("souvenir-selection-grille").hidden = !aDesPhotos;
  if (aDesPhotos) _rendreSelectionPhotos();

  selection.hidden = false;
}

// Reconstruit la grille de sélection à partir de l'état courant
// (`_souvenirIdsExclus`/`_souvenirIdVedetteManuel`) -- appelée à
// l'ouverture puis à chaque tap dans la grille.
function _rendreSelectionPhotos() {
  const grille = document.getElementById("souvenir-selection-grille");
  const entreesAvecPhoto = _entreesAvecPhoto(_souvenirEntrees);
  const eligibles = entreesAvecPhoto.filter((e) => !_souvenirIdsExclus.has(e.id));
  const idVedette = (eligibles.find((e) => e.id === _souvenirIdVedetteManuel) || eligibles[0])?.id;

  grille.innerHTML = entreesAvecPhoto
    .map((e) => {
      const url = photosCache[e.photoIds[0]];
      const exclue = _souvenirIdsExclus.has(e.id);
      const estVedette = e.id === idVedette;
      return `
        <div class="souvenir-selection-item${exclue ? " exclue" : ""}" data-id="${e.id}">
          <img src="${url}" alt="">
          <button type="button" class="souvenir-selection-etoile${estVedette ? " active" : ""}" data-id="${e.id}" data-i18n-aria-label="souvenirVedetteChoisir" aria-label="${t(currentLanguage, "souvenirVedetteChoisir")}">★</button>
        </div>`;
    })
    .join("");
}

async function _genererEtAfficherSouvenir() {
  document.getElementById("souvenir-selection").hidden = true;
  document.getElementById("souvenir-canvas").hidden = false;
  document.getElementById("souvenir-actions").hidden = false;

  const titreManuel = document.getElementById("souvenir-titre-manuel").value.trim();
  await _dessinerSouvenir(_souvenirEntrees, { idsExclus: _souvenirIdsExclus, idVedette: _souvenirIdVedetteManuel, titreManuel });

  const boutonPartager = document.getElementById("souvenir-partager");
  const peutPartagerFichier = !!(window.File && navigator.canShare);
  boutonPartager.hidden = !peutPartagerFichier;
}

function fermerSouvenir() {
  document.getElementById("souvenir-overlay").hidden = true;
}

document.getElementById("bouton-souvenir").addEventListener("click", ouvrirSouvenir);
document.getElementById("souvenir-fermer").addEventListener("click", fermerSouvenir);
document.getElementById("souvenir-selection-valider").addEventListener("click", _genererEtAfficherSouvenir);

document.getElementById("souvenir-selection-grille").addEventListener("click", (evenement) => {
  const etoile = evenement.target.closest(".souvenir-selection-etoile");
  const item = evenement.target.closest(".souvenir-selection-item");
  if (!item) return;
  const id = item.dataset.id;

  if (etoile) {
    // Choisir une vedette réinclut la sortie si elle était exclue --
    // une exclusion tacite n'aurait pas de sens face à un choix
    // explicite de vedette sur la même sortie.
    _souvenirIdVedetteManuel = id;
    _souvenirIdsExclus.delete(id);
  } else if (_souvenirIdsExclus.has(id)) {
    _souvenirIdsExclus.delete(id);
  } else {
    _souvenirIdsExclus.add(id);
  }
  _rendreSelectionPhotos();
});

document.getElementById("souvenir-telecharger").addEventListener("click", async () => {
  const blob = await _canvasVersBlob(document.getElementById("souvenir-canvas"));
  if (blob) _telechargerBlobSouvenir(blob, _nomFichierSouvenir());
});

document.getElementById("souvenir-partager").addEventListener("click", async () => {
  const blob = await _canvasVersBlob(document.getElementById("souvenir-canvas"));
  if (!blob) return;
  const nomFichier = _nomFichierSouvenir();
  const fichier = new File([blob], nomFichier, { type: "image/png" });
  if (navigator.canShare({ files: [fichier] })) {
    navigator.share({ files: [fichier], title: nomFichier }).catch(() => {
      _telechargerBlobSouvenir(blob, nomFichier);
    });
  } else {
    _telechargerBlobSouvenir(blob, nomFichier);
  }
});
