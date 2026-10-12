import type { ValidationResult } from '../types';

/**
 * Computes Levenshtein edit distance between two strings
 */
export function getLevenshteinDistance(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();

  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const row = new Array(s2.length + 1);
  for (let j = 0; j <= s2.length; j++) {
    row[j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    let prev = i;
    for (let j = 1; j <= s2.length; j++) {
      let val: number;
      if (s1[i - 1] === s2[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[s2.length] = prev;
  }

  return row[s2.length];
}

/**
 * Validates a user guess against accepted synonyms.
 * Detects exact matches, spelling mistakes / close typos, and incorrect answers.
 */
export function validateSynonymGuess(
  rawGuess: string,
  acceptedSynonyms: string[]
): ValidationResult {
  const guess = rawGuess.trim().toLowerCase();

  if (!guess) {
    return {
      status: 'incorrect',
      message: 'Please enter a synonym before checking.',
    };
  }

  // 1. Exact match check (case-insensitive)
  const exactMatch = acceptedSynonyms.find(
    (syn) => syn.trim().toLowerCase() === guess
  );

  if (exactMatch) {
    return {
      status: 'correct',
      matchedSynonym: exactMatch,
      message: `Spot on! "${exactMatch}" is an exact synonym!`,
    };
  }

  // 2. Typo / Spelling mistake check
  let minDistance = Infinity;
  let closestSynonym = '';

  for (const syn of acceptedSynonyms) {
    const target = syn.trim().toLowerCase();
    const dist = getLevenshteinDistance(guess, target);

    if (dist < minDistance) {
      minDistance = dist;
      closestSynonym = syn;
    }
  }

  // Determine allowed edit tolerance based on length:
  // - Length 4-6: distance 1 is considered a typo
  // - Length 7+: distance 1 or 2 is considered a typo
  const targetLen = closestSynonym.length;
  const isTypo =
    (targetLen >= 4 && minDistance === 1) ||
    (targetLen >= 7 && minDistance <= 2);

  if (isTypo) {
    return {
      status: 'typo',
      closestSynonym,
      distance: minDistance,
      message: `Spelling alert: You're almost there! Did you mean "${closestSynonym}"? Check your spelling.`,
    };
  }

  // 3. Incorrect match
  return {
    status: 'incorrect',
    message: `Not quite. Keep trying or request a letter hint!`,
  };
}
