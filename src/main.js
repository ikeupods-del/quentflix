import './style.css';
import { loadCatalog, availabilityBadge } from './catalog.js';
import { candidates, pick } from './tonight.js';
import { getFavorites, toggleFavorite, getSeen, toggleSeen } from './storage.js';
import { buildIndex, search, debounce, highlight } from './search.js';

const MAX_RESULTS = 30;
const DEBOUNCE_MS = 150;

const input = document.getElementById('q');
const form = document.getElementById('search-form');
const list = document.getElementById('results');
const status = document.getElementById('status');
const notice = document.getElementById('notice');

let index = [];
let items = [];
let current = null;

/** Une carte de résultat. Tout texte issu du catalogue passe par highlight() (échappé). */
function card(item, query) {
  const badge = availabilityBadge(item);
  const fav = getFavorites().includes(item.id);
  const kind = item.type === 'series' ? 'Série' : 'Film';
  const meta = [kind, item.year].filter(Boolean).join(' · ');
  const original = item.originalTitle && item.originalTitle !== item.title
    ? `<p class="meta">${highlight(item.originalTitle, query)}</p>` : '';
  const poster = item.poster
    ? `<img class="poster" src="${item.poster}" alt="" loading="lazy" width="56" height="84">`
    : '<div class="poster" aria-hidden="true">🎬</div>';
  return `<li class="card">${poster}<div>
    <h2>${highlight(item.title, query)}</h2>${original}
    <p class="meta">${meta}</p>
    ${badge ? `<span class="badge">${badge}</span>` : ''}
    <button type="button" class="fav" data-id="${item.id}" aria-pressed="${fav}" aria-label="${fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${fav ? '♥' : '♡'}</button>
  </div></li>`;
}

/** Affiche l'état adapté : vide, aucun résultat, ou liste (limitée à 30). */
function render() {
  const query = input.value;
  if (!query.trim()) {
    list.innerHTML = '';
    status.textContent = 'Tapez un titre pour voir où il est disponible.';
    return;
  }
  const { results, total } = search(index, query, MAX_RESULTS);
  if (!total) {
    list.innerHTML = '';
    status.textContent = 'Aucun résultat';
    return;
  }
  list.innerHTML = results.map((item) => card(item, query)).join('');
  status.textContent = total > results.length
    ? `${results.length} premiers résultats sur ${total} — précisez votre recherche`
    : `${total} résultat${total > 1 ? 's' : ''}`;
}

async function init() {
  status.textContent = 'Chargement du catalogue…';
  try {
    const catalog = await loadCatalog(`${import.meta.env.BASE_URL}data/catalog.json`);
    items = catalog.items;
    index = buildIndex(items); // construit une seule fois
    if (catalog.sample) {
      notice.textContent = "Données d'exemple : le vrai catalogue est généré toutes les 12 h avec la clé TMDB.";
      notice.hidden = false;
    }
    render();
  } catch (error) {
    console.error(error);
    status.textContent = 'Impossible de charger le catalogue. Réessayez plus tard.';
  }
}

input.addEventListener('input', debounce(render, DEBOUNCE_MS));
form.addEventListener('submit', (e) => { e.preventDefault(); input.blur(); });

// « Que regarder ce soir ? » : 2 questions, « Un autre », exclut les titres déjà vus
const $ = (id) => document.getElementById(id);
function propose() {
  const liste = candidates(items, { type: $('t-type').value, country: $('t-country').value }, getSeen());
  current = pick(liste, current && current.id);
  $('t-result').innerHTML = current ? card(current, '') : '<li class="status">Plus rien à proposer avec ces choix.</li>';
  $('t-actions').hidden = !current;
  $('t-other').hidden = liste.length < 2;
}
$('tonight-toggle').addEventListener('click', () => {
  const ouvert = $('tonight-panel').hidden;
  $('tonight-panel').hidden = !ouvert;
  $('tonight-toggle').setAttribute('aria-expanded', String(ouvert));
});
$('t-go').addEventListener('click', propose);
$('t-other').addEventListener('click', propose);
$('t-seen').addEventListener('click', () => { if (current) { toggleSeen(current.id); propose(); } });

// Favoris : bouton cœur sur chaque carte + liste « Mes favoris »
document.addEventListener('click', (e) => {
  const b = e.target.closest('.fav');
  if (!b) return;
  toggleFavorite(Number(b.dataset.id) || b.dataset.id);
  if (showFavs) showFavorites(); else { render(); if (current) propose(); }
});
let showFavs = false;
function showFavorites() {
  showFavs = true;
  const ids = getFavorites();
  const liste = items.filter((it) => ids.includes(it.id));
  list.innerHTML = liste.map((it) => card(it, '')).join('');
  status.textContent = liste.length ? `${liste.length} favori${liste.length > 1 ? 's' : ''}` : 'Aucun favori : touchez ♡ sur un titre.';
}
$('favs-toggle').addEventListener('click', () => {
  if (showFavs) { showFavs = false; render(); } else showFavorites();
  $('favs-toggle').setAttribute('aria-pressed', String(showFavs));
});
input.addEventListener('input', () => { showFavs = false; $('favs-toggle').setAttribute('aria-pressed', 'false'); });

init();
