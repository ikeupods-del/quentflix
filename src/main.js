import './style.css';
import { loadCatalog, availabilityBadge } from './catalog.js';
import { candidates, pick, sortItems, allGenres } from './tonight.js';
import { COUNTRY_NAMES, detectCountry } from './profile.js';
import { COUNTRIES } from './catalog.js';
import { getProfile, saveProfile, getFavorites, toggleFavorite, getSeen, toggleSeen } from './storage.js';
import { buildIndex, search, debounce, highlight } from './search.js';

const MAX_RESULTS = 30;
const DEBOUNCE_MS = 150;

const $ = (id) => document.getElementById(id);
const input = document.getElementById('q');
const form = document.getElementById('search-form');
const list = document.getElementById('results');
const status = document.getElementById('status');
const notice = document.getElementById('notice');

// Profil : lu au démarrage, sinon pays détecté (langue du navigateur, puis fuseau horaire)
const detected = detectCountry(navigator.languages || [navigator.language], Intl.DateTimeFormat().resolvedOptions().timeZone);
let profile = getProfile() || { name: '', country: detected, auto: true };
let index = [];
let items = [];
let current = null;

/** Une carte de résultat. Tout texte issu du catalogue passe par highlight() (échappé). */
function card(item, query) {
  const badge = availabilityBadge(item, profile.country);
  const fav = getFavorites().includes(item.id);
  const kind = item.type === 'series' ? 'Série' : 'Film';
  const meta = [kind, item.year, item.rating ? `★ ${item.rating}` : ''].filter(Boolean).join(' · ');
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

/** Affiche l'état adapté : vide, aucun résultat, ou liste (limitée à 30), avec filtre de genre et tri. */
function render() {
  const query = input.value;
  const genre = $('f-genre').value;
  const mode = $('f-sort').value;
  const filtered = genre ? index.filter((e) => e.item.genres.includes(genre)) : index;
  let results; let total;
  if (!query.trim()) {
    if (!genre && mode === 'popular') {
      list.innerHTML = '';
      status.textContent = 'Tapez un titre ou choisissez un genre pour voir où c’est disponible.';
      return;
    }
    // Parcours sans recherche : titres absents en FR (ou dispo ailleurs), filtrés et triés
    const all = sortItems(filtered.map((e) => e.item).filter((i) => !i.countries.includes(profile.country) && i.countries.length), mode);
    total = all.length; results = all.slice(0, MAX_RESULTS);
  } else if (mode === 'popular') {
    ({ results, total } = search(filtered, query, MAX_RESULTS));
  } else {
    const all = sortItems(search(filtered, query, Infinity).results, mode);
    total = all.length; results = all.slice(0, MAX_RESULTS);
  }
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
    index = buildIndex(items);
    $('f-genre').insertAdjacentHTML('beforeend', allGenres(items).map((g) => `<option>${g.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</option>`).join('')); // construit une seule fois
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
function propose() {
  const liste = candidates(items, { type: $('t-type').value, country: $('t-country').value, home: profile.country }, getSeen());
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
  toggleFavorite(b.dataset.id);
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

['f-genre', 'f-sort'].forEach((id) => $(id).addEventListener('change', () => { showFavs = false; render(); }));

// Profil : prénom et pays ; tout le catalogue (badges, parcours, « ce soir ») s'adapte au pays choisi
function applyProfile() {
  $('profile-toggle').textContent = `👤 ${profile.name || 'Profil'} · ${profile.country}`;
  $('p-name').value = profile.name;
  $('p-country').innerHTML = COUNTRIES.map((c) => `<option value="${c}">${COUNTRY_NAMES[c]}</option>`).join('');
  $('p-country').value = profile.country;
  $('p-hint').textContent = profile.auto
    ? `Pays détecté automatiquement : ${COUNTRY_NAMES[detected]}. Modifiez-le si besoin.`
    : 'Le catalogue montre ce qui manque dans ce pays.';
  const autres = COUNTRIES.filter((c) => c !== profile.country);
  $('t-country').innerHTML = '<option value="">Peu importe</option>'
    + autres.map((c) => `<option value="${c}">${COUNTRY_NAMES[c]}</option>`).join('');
  $('mission').textContent = `Titres absents de Netflix ${COUNTRY_NAMES[profile.country]} mais disponibles ailleurs.`;
  current = null; $('t-result').innerHTML = ''; $('t-actions').hidden = true;
  if (!showFavs) render();
}
$('profile-toggle').addEventListener('click', () => {
  const ouvert = $('profile-form').hidden;
  $('profile-form').hidden = !ouvert;
  $('profile-toggle').setAttribute('aria-expanded', String(ouvert));
});
$('profile-form').addEventListener('submit', (e) => {
  e.preventDefault();
  profile = { name: $('p-name').value.trim().slice(0, 30), country: $('p-country').value };
  saveProfile(profile);
  $('profile-form').hidden = true;
  $('profile-toggle').setAttribute('aria-expanded', 'false');
  applyProfile();
});
applyProfile();

init();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}
