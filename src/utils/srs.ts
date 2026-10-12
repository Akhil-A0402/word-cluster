import type { WordItem } from '../types';

// Leitner Box Intervals in days
const BOX_INTERVALS_DAYS: Record<number, number> = {
  1: 1,  // Daily review
  2: 2,  // Every 2 days
  3: 4,  // Every 4 days
  4: 7,  // Weekly review
  5: 14, // Mastered / bi-weekly review
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function calculateNextReview(
  currentBox: number,
  isCorrect: boolean
): { nextBox: number; nextReviewDate: number } {
  let nextBox: number;

  if (isCorrect) {
    nextBox = Math.min(5, currentBox + 1);
  } else {
    // If incorrect, drop back to Box 1 for frequent revision
    nextBox = 1;
  }

  const intervalDays = isCorrect ? (BOX_INTERVALS_DAYS[nextBox] || 1) : 0; // immediate if incorrect
  const nextReviewDate = Date.now() + intervalDays * ONE_DAY_MS;

  return { nextBox, nextReviewDate };
}

export function isWordDueForReview(word: WordItem): boolean {
  return Date.now() >= word.nextReviewDate;
}

export function sortWordsForReview(words: WordItem[]): WordItem[] {
  // Sort words: Box 1 first, then words with older review dates
  return [...words].sort((a, b) => {
    if (a.boxLevel !== b.boxLevel) {
      return a.boxLevel - b.boxLevel;
    }
    return a.nextReviewDate - b.nextReviewDate;
  });
}
