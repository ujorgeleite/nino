// constants/countries/index.ts
// The country registry. Adding a country means adding a data file and one line
// here — no new components, no new routes.

import type { CountryData } from './types';
import { NL } from './nl';
import { BE } from './be';
import { DE } from './de';
import { FR } from './fr';
import { GB } from './gb';
import { DK } from './dk';
import { SE } from './se';
import { NO } from './no';
import { CH } from './ch';
import { AT } from './at';
import { IT } from './it';

/**
 * Play order. The Netherlands is first because it is the built reference and
 * the gentlest scene; the rest follow roughly by visual complexity.
 */
export const COUNTRIES: readonly CountryData[] = [
  NL,
  BE,
  DE,
  FR,
  GB,
  DK,
  SE,
  NO,
  CH,
  AT,
  IT,
] as const;

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/** Returns undefined for an unknown code — callers must handle a bad route. */
export function getCountry(code: string | undefined): CountryData | undefined {
  return code ? BY_CODE.get(code) : undefined;
}

/** The country used when a route is missing or malformed. */
export const DEFAULT_COUNTRY = NL;

export * from './types';
