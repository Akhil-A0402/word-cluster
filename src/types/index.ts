export interface WordItem {
  id: string;
  word: string;
  meaning: string;
  synonyms: string[];
  exampleSentence?: string;
  boxLevel: number; // 1 to 5 (Leitner SRS)
  nextReviewDate: number; // Epoch timestamp (ms)
  lastReviewedAt?: number;
  timesReviewed: number;
  timesCorrect: number;
  timesIncorrect: number;
  createdAt: number;
}

export interface UserProfile {
  xp: number;
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  sessionsCompleted: number;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  syncSourceUrl?: string; // External sync source URL (e.g. GitHub raw URL, Gist, or JSON endpoint)
  autoSyncOnLoad?: boolean; // Automatically check source URL on startup if online
}

export interface ReviewHistoryEntry {
  wordId: string;
  word: string;
  userGuess: string;
  wasCorrect: boolean;
  matchedSynonym?: string;
}

export interface SessionResult {
  totalWords: number;
  correctCount: number;
  xpEarned: number;
  history: ReviewHistoryEntry[];
  timestamp: number;
}

export type ValidationStatus = 'correct' | 'typo' | 'incorrect';

export interface ValidationResult {
  status: ValidationStatus;
  matchedSynonym?: string;
  closestSynonym?: string;
  distance?: number;
  message: string;
}

export type ActiveTab = 'review' | 'words' | 'add' | 'stats' | 'sync';
