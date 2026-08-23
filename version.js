/* Numéro de version affiché dans le footer -- issue #20. Plus maintenu
 * à la main depuis #21 : .github/workflows/pages.yml réécrit cette
 * constante avec le nom du tag au moment du déploiement (sed sur
 * l'artefact publié, jamais commité en retour dans le dépôt) -- la
 * valeur ci-dessous n'est donc JAMAIS ce qui s'affiche réellement en
 * production, seulement ce qu'un checkout local sans passer par le
 * workflow montrerait (voir CLAUDE.md section "Versions").
 */
const FLETCHLOG_VERSION = "dev";
