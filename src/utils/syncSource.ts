import type { WordItem } from '../types';
import { db } from '../db/wordsDb';
import { parseWordListInput, createWordItemsFromParsed } from './parser';

/**
 * Normalizes user-entered GitHub URLs to direct raw content URLs
 */
export function normalizeSyncUrl(inputUrl: string): string {
  const url = inputUrl.trim();

  // Convert github.com blob URLs to raw.githubusercontent.com
  // E.g. https://github.com/user/repo/blob/main/words.json -> https://raw.githubusercontent.com/user/repo/main/words.json
  const githubBlobRegex = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/i;
  const match = url.match(githubBlobRegex);
  if (match) {
    const [, owner, repo, branch, path] = match;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }

  return url;
}

export interface SyncFetchResult {
  success: boolean;
  importedCount: number;
  message: string;
}

/**
 * Fetches words from an external URL (GitHub raw, Gist, or any public HTTPS URL).
 * Reads data without any authentication or write tokens.
 * Merges words with IndexedDB while preserving user's existing SRS box progress.
 */
export async function fetchAndSyncFromExternalUrl(rawUrl: string): Promise<SyncFetchResult> {
  const normalizedUrl = normalizeSyncUrl(rawUrl);

  if (!normalizedUrl || !/^https?:\/\//i.test(normalizedUrl)) {
    throw new Error('Please enter a valid HTTP or HTTPS URL (e.g. GitHub raw file URL).');
  }

  // Append timestamp query parameter to bypass aggressive GitHub CDN caching
  const fetchUrl = normalizedUrl.includes('?')
    ? `${normalizedUrl}&_t=${Date.now()}`
    : `${normalizedUrl}?_t=${Date.now()}`;

  const response = await fetch(fetchUrl, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json, text/plain, */*',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch from URL (HTTP ${response.status} ${response.statusText}). Check that the file exists and repository is public.`);
  }

  const contentType = response.headers.get('content-type') || '';
  const responseText = await response.text();

  let incomingWords: WordItem[] = [];

  // 1. Try parsing as JSON first
  if (contentType.includes('application/json') || responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(responseText);

      if (parsed.words && Array.isArray(parsed.words)) {
        // Standard backup format: { words: [...], profile?: {...} }
        incomingWords = parsed.words;
      } else if (Array.isArray(parsed)) {
        // Direct array of word objects
        const now = Date.now();
        incomingWords = parsed.map((item: unknown, idx: number) => {
          const w = item as Record<string, unknown>;
          return {
            id: (w.id as string) || `w_ext_${now}_${idx}`,
            word: String(w.word || ''),
            meaning: String(w.meaning || ''),
            synonyms: Array.isArray(w.synonyms) ? (w.synonyms as string[]) : [],
            exampleSentence: String(w.exampleSentence || ''),
            boxLevel: typeof w.boxLevel === 'number' ? w.boxLevel : 1,
            nextReviewDate: typeof w.nextReviewDate === 'number' ? w.nextReviewDate : now,
            timesReviewed: typeof w.timesReviewed === 'number' ? w.timesReviewed : 0,
            timesCorrect: typeof w.timesCorrect === 'number' ? w.timesCorrect : 0,
            timesIncorrect: typeof w.timesIncorrect === 'number' ? w.timesIncorrect : 0,
            createdAt: typeof w.createdAt === 'number' ? w.createdAt : now,
          };
        }).filter((item) => item.word && item.synonyms.length > 0);
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Key-value map: { "word": ["syn1", "syn2"] }
        const now = Date.now();
        incomingWords = Object.entries(parsed).map(([key, val], idx) => {
          const synonyms = Array.isArray(val) ? (val as string[]) : [String(val)];
          return {
            id: `w_ext_${now}_${idx}`,
            word: key,
            meaning: `Associated with ${synonyms.slice(0, 3).join(', ')}`,
            synonyms,
            boxLevel: 1,
            nextReviewDate: now,
            timesReviewed: 0,
            timesCorrect: 0,
            timesIncorrect: 0,
            createdAt: now,
          };
        }).filter((item) => item.word && item.synonyms.length > 0);
      }
    } catch {
      // JSON parse failed, fallback to line-by-line text parsing
    }
  }

  // 2. If not parsed as JSON, treat as plain text formatted lines: "word - syn1, syn2"
  if (incomingWords.length === 0) {
    const parsedTextList = parseWordListInput(responseText);
    if (parsedTextList.length > 0) {
      incomingWords = createWordItemsFromParsed(parsedTextList);
    }
  }

  if (incomingWords.length === 0) {
    throw new Error('No valid words found at the target URL. Ensure the URL contains JSON data or lines formatted as "word - syn1, syn2".');
  }

  // 3. Smart Merge: preserve user's existing SRS progress for words that already exist
  const existingWords = await db.words.toArray();
  const existingMap = new Map<string, WordItem>();
  for (const existing of existingWords) {
    existingMap.set(existing.word.toLowerCase().trim(), existing);
  }

  const mergedWords: WordItem[] = incomingWords.map((incoming) => {
    const key = incoming.word.toLowerCase().trim();
    const existing = existingMap.get(key);

    if (existing) {
      // Keep user's review metrics and box levels, but update synonyms & meaning
      return {
        ...existing,
        meaning: incoming.meaning || existing.meaning,
        synonyms: Array.from(new Set([...existing.synonyms, ...incoming.synonyms])),
        exampleSentence: incoming.exampleSentence || existing.exampleSentence,
      };
    }
    return incoming;
  });

  // Save all merged words into IndexedDB
  await db.words.bulkPut(mergedWords);

  return {
    success: true,
    importedCount: incomingWords.length,
    message: `Successfully synced ${incomingWords.length} words from external URL!`,
  };
}
