// Profil local : prénom facultatif et pays de l'utilisateur (le catalogue s'adapte à ce pays).
import { COUNTRIES } from './catalog.js';

export const COUNTRY_NAMES = { FR: 'France', IT: 'Italie', BE: 'Belgique', CH: 'Suisse' };

const ZONES = { 'Europe/Paris': 'FR', 'Europe/Rome': 'IT', 'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH' };

/**
 * Devine le pays sans serveur ni géolocalisation : région de la langue du navigateur (fr-BE),
 * sinon fuseau horaire (Europe/Rome). Retourne un code de COUNTRIES, ou 'FR' par défaut.
 */
export function detectCountry(languages = [], timeZone = '') {
  for (const lang of languages) {
    const region = String(lang).split('-')[1]?.toUpperCase();
    if (COUNTRIES.includes(region)) return region;
  }
  return ZONES[timeZone] || 'FR';
}
