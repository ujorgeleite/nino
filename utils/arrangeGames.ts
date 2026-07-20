// utils/arrangeGames.ts
// Decides the order the picker shows games in.
//
// THE PROBLEM: a 2-year-old taps what is nearest and first. With a fixed
// order they play the same game, from the same country, every single time —
// and the other twenty tiles may as well not exist.
//
// THE RULES, in priority order:
//
//   1. Anything played recently goes to the BACK. Variety beats randomness:
//      a shuffle alone will happily deal yesterday's game first again.
//   2. The rest is shuffled, so the front of the grid changes every session.
//   3. No two tiles from the same country sit next to each other, so the grid
//      reads as "many places" at a glance rather than as pairs.
//
// Pure and seeded so it can be tested, and so the order stays STILL while the
// child is looking at it — re-shuffling on every render would make tiles jump
// under their finger.

/** Anything this list can order. Only these two fields are used. */
export type Arrangeable = {
  /** Unique per game, e.g. "memory-fr". */
  id: string;
  /** Country code, used to keep same-country tiles apart. */
  countryCode: string;
};

/** Deterministic PRNG so a given seed always yields the same arrangement. */
function seeded(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shuffle<T>(input: readonly T[], rnd: () => number): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Reorders so no two neighbours share a country, where possible.
 *
 * Greedy: take the next item whose country differs from the one just placed;
 * if every remaining item is from that country, place it anyway rather than
 * dropping it. Correctness (every game shown) beats the aesthetic rule.
 */
function spreadCountries<T extends Arrangeable>(items: T[]): T[] {
  const out: T[] = [];
  const pool = [...items];

  while (pool.length > 0) {
    const last = out[out.length - 1];
    let index = pool.findIndex((item) => item.countryCode !== last?.countryCode);
    if (index === -1) index = 0; // only same-country items left
    out.push(pool[index]);
    pool.splice(index, 1);
  }

  return out;
}

/**
 * @param entries    every game, in any order
 * @param recentIds  ids played recently, most recent FIRST
 * @param seed       varies the shuffle between sessions
 */
export function arrangeGames<T extends Arrangeable>(
  entries: readonly T[],
  recentIds: readonly string[] = [],
  seed = 1,
): T[] {
  const rnd = seeded(seed);
  const recent = new Set(recentIds);

  const fresh = entries.filter((e) => !recent.has(e.id));
  const played = entries.filter((e) => recent.has(e.id));

  // Fresh games get shuffled and spread; played ones are ordered
  // least-recent first, so the thing played a moment ago lands dead last.
  const front = spreadCountries(shuffle(fresh, rnd));
  const back = [...played].sort(
    (a, b) => recentIds.indexOf(b.id) - recentIds.indexOf(a.id),
  );

  return [...front, ...back];
}

/** How many plays to remember. Long enough to rotate through, short enough to forget. */
export const RECENT_LIMIT = 6;

/** Adds a play to the front of the history, de-duplicated and capped. */
export function recordPlay(recentIds: readonly string[], id: string): string[] {
  return [id, ...recentIds.filter((existing) => existing !== id)].slice(0, RECENT_LIMIT);
}
