# Quentflix

Séries et films **absents de Netflix France mais disponibles en Italie, Belgique ou Suisse**.
Site statique (HTML/CSS/JS vanilla + Vite), publié sur GitHub Pages. Aucun lien ni contenu piraté : uniquement la disponibilité légale.

## Fonctionnement
- `scripts/fetch-tmdb.mjs` interroge l'API TMDB (Netflix, FR/IT/BE/CH) et écrit `public/data/catalog.json`.
- Le workflow `.github/workflows/deploy.yml` régénère les données toutes les 12 h (secret `TMDB_API_KEY`), teste, construit et publie. Sans clé, le JSON d'exemple versionné est utilisé (bandeau « Données d'exemple »).
- `src/catalog.js` : chargement du JSON ; `normalizeItem()` est le seul code qui connaît le format brut.
- `src/search.js` : `normalize`, `buildIndex`, `search`, `debounce`, `highlight`.
- `src/main.js` : interface de recherche.

## Commandes
```
npm install
npm run dev     # développement
npm test        # tests de la recherche
npm run build   # production (dossier dist/)
TMDB_API_KEY=... npm run data   # régénérer le catalogue
```

## Mise en ligne
Réglages du dépôt → Pages → Source : « GitHub Actions », et ajouter le secret `TMDB_API_KEY`.
