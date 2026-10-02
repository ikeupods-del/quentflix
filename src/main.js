import './style.css';
import { loadCatalog, availabilityBadge } from './catalog.js';
import { buildIndex, search, debounce, highlight } from './search.js';

const MAX_RESULTS = 30;
const DEBOUNCE_MS = 150;

const input = document.getElementById('q');
const form = document.getElementById('search-form');
const list = document.getElementById('results');
const status = document.getElementById('status');
const notice = document.getElementById('notice');

let index = [];

/** Une carte de résultat. Tout texte issu du catalogue passe par highlight() (échappé). */
function card(item, query) {
  const badge = availabilityBadge(item);
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
    index = buildIndex(catalog.items); // construit une seule fois
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

init();
