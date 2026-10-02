// Filtre « Que regarder ce soir ? » : logique pure (sans DOM).
/** Titres absents du pays de l'utilisateur (home) et disponibles dans un autre pays, selon les choix, hors titres déjà vus. */
export function candidates(items, { type = '', country = '', home = 'FR' } = {}, seen = []) {
  return items.filter((it) => !it.countries.includes(home)
    && it.countries.length > 0
    && (!type || it.type === type)
    && (!country || it.countries.includes(country))
    && !seen.includes(it.id));
}
/** Tire un titre au hasard en évitant celui déjà proposé. */
export function pick(list, previousId) {
  const pool = list.length > 1 ? list.filter((it) => it.id !== previousId) : list;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

/** Tri : « popular » (défaut), « recent » (année décroissante) ou « rating ». Ne modifie pas la liste d'origine. */
export function sortItems(list, mode = 'popular') {
  const by = {
    popular: (a, b) => b.popularity - a.popularity,
    recent: (a, b) => (b.year || 0) - (a.year || 0) || b.popularity - a.popularity,
    rating: (a, b) => b.rating - a.rating || b.popularity - a.popularity,
  }[mode] || (() => 0);
  return [...list].sort(by);
}
/** Genres présents dans le catalogue, triés alphabétiquement. */
export const allGenres = (list) => [...new Set(list.flatMap((i) => i.genres))].sort((a, b) => a.localeCompare(b, 'fr'));
