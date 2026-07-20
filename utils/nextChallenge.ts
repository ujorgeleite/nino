// utils/nextChallenge.ts
// Which country to offer after finishing one.
//
// Finishing should open a door, not a dead end. The old behaviour replayed the
// same board, which for a child who just succeeded is the least interesting
// possible next thing.
//
// The rule: stay in the SAME game, move to a country they have not finished.
// Unfinished first, in registry order from where they are; if everything is
// done, wrap around anyway so the button always leads somewhere.

export type Challenge = { code: string; completed: boolean };

/**
 * @param countries  every country, in play order
 * @param current    the code just finished
 * @returns the next country's code — never null, so the button always works
 */
export function nextChallenge(
  countries: readonly Challenge[],
  current: string,
): string {
  if (countries.length === 0) return current;

  const start = countries.findIndex((c) => c.code === current);
  const from = start === -1 ? 0 : start;

  // Walk forward, wrapping, for the first unfinished country.
  for (let i = 1; i <= countries.length; i++) {
    const candidate = countries[(from + i) % countries.length];
    if (!candidate.completed) return candidate.code;
  }

  // Everything is done. Offer the next one anyway — replaying a finished
  // country is fine; being stuck on a button that does nothing is not.
  return countries[(from + 1) % countries.length].code;
}
