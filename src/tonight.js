// Filtre « Que regarder ce soir ? » : logique pure (sans DOM).
/** Titres absents en FR et disponibles dans un autre pays, selon les choix, hors titres déjà vus. */
export function candidates(items, { type = '', country = '' } = {}, seen = []) {
  return items.filter((it) => !it.countries.includes('FR')
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
