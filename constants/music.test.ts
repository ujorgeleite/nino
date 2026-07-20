// constants/music.test.ts
// The per-game music contract.
//
// The failure this guards is quiet: a missing track means a silent screen, and
// two identical arrangements mean the "personalised per game" promise is a lie
// nobody would notice until they listened to both.

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { COUNTRIES } from './countries';
import { MUSIC, MUSIC_VOLUME, musicFor, type MusicGame } from './music';

const GAMES: MusicGame[] = ['memory', 'shapefit'];

describe('music registry', () => {
  it('ships a track for every country and every game', () => {
    const missing: string[] = [];
    for (const c of COUNTRIES) {
      for (const g of GAMES) {
        if (musicFor(c.code, g) === undefined) missing.push(`${c.code}-${g}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('has exactly one entry per country-game pair and no strays', () => {
    expect(Object.keys(MUSIC)).toHaveLength(COUNTRIES.length * GAMES.length);

    const expected = new Set(
      COUNTRIES.flatMap((c) => GAMES.map((g) => `${c.code}-${g}`)),
    );
    const strays = Object.keys(MUSIC).filter((k) => !expected.has(k));
    expect(strays).toEqual([]);
  });

  // The next two read the real .wav files.
  //
  // They cannot go through musicFor(): under Jest every require()'d asset
  // resolves to the same stub number, so comparing those values proves
  // nothing. The property that actually matters — that 22 distinct audio
  // files exist — is only observable on disk.
  describe('the generated audio files', () => {
    const dir = path.join(__dirname, '..', 'assets', 'music');

    it('exist for every country and game', () => {
      const missing: string[] = [];
      for (const c of COUNTRIES) {
        for (const g of GAMES) {
          const file = path.join(dir, `${c.code}-${g}.wav`);
          if (!fs.existsSync(file)) missing.push(`${c.code}-${g}.wav`);
        }
      }
      expect(missing).toEqual([]);
    });

    it('are all genuinely different recordings', () => {
      // The whole point of the per-game work. Two identical files would mean
      // the arrangement never actually varied, and nobody would notice
      // without listening to both.
      const hashes = new Map<string, string>();
      const duplicates: string[] = [];

      for (const c of COUNTRIES) {
        for (const g of GAMES) {
          const name = `${c.code}-${g}`;
          const file = path.join(dir, `${name}.wav`);
          if (!fs.existsSync(file)) continue;
          const hash = createHash('sha1').update(fs.readFileSync(file)).digest('hex');
          const other = hashes.get(hash);
          if (other) duplicates.push(`${other} === ${name}`);
          else hashes.set(hash, name);
        }
      }

      expect(duplicates).toEqual([]);
    });

    it('are all a sensible length — no empty or runaway files', () => {
      const odd: string[] = [];
      for (const c of COUNTRIES) {
        for (const g of GAMES) {
          const file = path.join(dir, `${c.code}-${g}.wav`);
          if (!fs.existsSync(file)) continue;
          const kb = fs.statSync(file).size / 1024;
          if (kb < 200 || kb > 700) odd.push(`${c.code}-${g}: ${kb.toFixed(0)}KB`);
        }
      }
      expect(odd).toEqual([]);
    });
  });

  it('returns undefined rather than throwing for bad input', () => {
    // A malformed route must leave the screen silent, never crashed.
    expect(musicFor(undefined, 'memory')).toBeUndefined();
    expect(musicFor('zz', 'memory')).toBeUndefined();
    expect(musicFor('nl', undefined)).toBeUndefined();
  });

  it('plays Back mode quieter than There', () => {
    // Back is the wind-down; louder would defeat it.
    expect(MUSIC_VOLUME.back).toBeLessThan(MUSIC_VOLUME.there);
  });

  it('keeps music under the sound effects', () => {
    // Effects are normalised to 0.4–0.95; music must sit below that so a cue
    // is always audible over the bed.
    expect(MUSIC_VOLUME.there).toBeLessThanOrEqual(0.6);
  });
});
