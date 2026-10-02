// Couche de stockage locale (localStorage). Pensée pour être remplaçable plus tard par un compte.
const lire = (cle) => {
  try { return JSON.parse(localStorage.getItem(cle)) || []; } catch { return []; }
};
const ecrire = (cle, valeur) => {
  try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch { /* stockage indisponible */ }
};
/** Ajoute l'id s'il est absent, le retire sinon. Renvoie vrai si présent après l'appel. */
function basculer(cle, id) {
  const liste = lire(cle);
  const present = liste.includes(id);
  ecrire(cle, present ? liste.filter((x) => x !== id) : [...liste, id]);
  return !present;
}

export const getFavorites = () => lire('quentflix:favoris');
export const toggleFavorite = (id) => basculer('quentflix:favoris', id);
export const getSeen = () => lire('quentflix:vus');
export const toggleSeen = (id) => basculer('quentflix:vus', id);

/** Profil : { name, country } ou null tant qu'il n'a jamais été enregistré. */
export function getProfile() {
  try { return JSON.parse(localStorage.getItem('quentflix:profil')); } catch { return null; }
}
export const saveProfile = (profil) => ecrire('quentflix:profil', profil);
