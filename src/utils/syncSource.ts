import type { WordItem } from '../types';
import { db } from '../db/wordsDb';
import { parseWordListInput, createWordItemsFromParsed } from './parser';

/**
 * Normalizes user-entered GitHub URLs to direct raw content URLs
 */
export function normalizeSyncUrl(inputUrl: string): string {
  let url = inputUrl.trim();

  // Strip wrapping quotes if user pasted with quotes
  url = url.replace(/^["']|["']$/g, '');

  // 1. Convert GitHub blob / raw URLs:
  // E.g. https://github.com/owner/repo/blob/main/words.json
  // E.g. https://github.com/owner/repo/raw/main/words.json
  // E.g. https://github.com/owner/repo/blob/refs/heads/main/words.json
  // E.g. https://github.com/owner/repo/raw/refs/heads/main/words.json
  const ghFileRegex = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(?:refs\/heads\/)?([^/]+)\/(.+)$/i;
  const match = url.match(ghFileRegex);
  if (match) {
    const [, owner, repo, branch, path] = match;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }

  // 2. Convert GitHub raw URLs with refs/heads:
  // E.g. https://raw.githubusercontent.com/owner/repo/refs/heads/main/words.json
  const rawRefsRegex = /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/refs\/heads\/([^/]+)\/(.+)$/i;
  const rawRefsMatch = url.match(rawRefsRegex);
  if (rawRefsMatch) {
    const [, owner, repo, branch, path] = rawRefsMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }

  // 3. GitHub repository root URL (e.g. user pasted repo URL directly):
  // E.g. https://github.com/owner/repo or https://github.com/owner/repo/
  const ghRepoRegex = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git|\/)?$/i;
  const repoMatch = url.match(ghRepoRegex);
  if (repoMatch) {
    const [, owner, repo] = repoMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/main/words.json`;
  }

  // 4. GitHub Gist URLs:
  // E.g. https://gist.github.com/owner/gist_id -> https://gist.githubusercontent.com/owner/gist_id/raw
  const gistRegex = /^https?:\/\/gist\.github\.com\/([^/]+)\/([a-f0-9]+)\/?$/i;
  const gistMatch = url.match(gistRegex);
  if (gistMatch) {
    const [, owner, gistId] = gistMatch;
    return `https://gist.githubusercontent.com/${owner}/${gistId}/raw`;
  }

  return url;
}

export interface SyncFetchResult {
  success: boolean;
  importedCount: number;
  newWordsCount?: number;
  updatedWordsCount?: number;
  totalWordsInDb?: number;
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

  let response: Response;
  try {
    response = await fetch(fetchUrl, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
    });
  } catch (fetchErr) {
    const rawError = (fetchErr as Error)?.message || '';
    throw new Error(
      `Network/CORS error (${rawError || 'Failed to fetch'}). Browsers block cross-origin requests unless the target URL allows CORS. ` +
      `Ensure: 1) The repository is Public. 2) The file exists in the repo. 3) Target: ${normalizedUrl}`
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `File not found (HTTP 404) at: ${normalizedUrl}. Ensure that the file exists and has been committed to your GitHub repository.`
      );
    }
    throw new Error(`Failed to fetch from URL (HTTP ${response.status} ${response.statusText}). Check that the file exists and repository is public.`);
  }

/**
 * Sanitizes any raw object, array, or string into a fully compliant WordItem.
 * Ensures valid ID, non-empty synonyms, default Box 1, and current timestamp
 * so new words are immediately due for review in Revise mode.
 */
function sanitizeRawWord(raw: unknown, index: number, now: number): WordItem | null {
  if (!raw) return null;

  // Handle plain string format: "word - syn1, syn2"
  if (typeof raw === 'string') {
    const parsed = parseWordListInput(raw);
    if (parsed.length > 0) {
      const items = createWordItemsFromParsed(parsed);
      return items[0] || null;
    }
    const trimmed = raw.trim();
    if (trimmed) {
      return {
        id: `w_sync_${now}_${index}_${Math.random().toString(36).substring(2, 7)}`,
        word: trimmed,
        meaning: `Vocabulary word: ${trimmed}`,
        synonyms: [trimmed],
        exampleSentence: '',
        boxLevel: 1,
        nextReviewDate: now,
        timesReviewed: 0,
        timesCorrect: 0,
        timesIncorrect: 0,
        createdAt: now + index,
      };
    }
    return null;
  }

  if (typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  // Support case-insensitive & common alternative property names
  const word = String(
    r.word || r.Word || r.term || r.Term || r.name || r.title || ''
  ).trim();

  if (!word) return null;

  // Extract synonyms: can be string[] or comma-separated string
  let synonyms: string[] = [];
  const rawSyn = r.synonyms ?? r.Synonyms ?? r.syns ?? r.similar ?? r.associations;
  if (Array.isArray(rawSyn)) {
    synonyms = rawSyn.map((s: unknown) => String(s).trim()).filter(Boolean);
  } else if (typeof rawSyn === 'string') {
    synonyms = rawSyn
      .split(/[,;/]+/)
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  // Meaning / definition
  let meaning = String(
    r.meaning || r.Meaning || r.definition || r.Definition || r.def || ''
  ).trim();

  if (!meaning && synonyms.length > 0) {
    meaning = `Associated with ${synonyms.slice(0, 3).join(', ')}`;
  } else if (!meaning) {
    meaning = `Vocabulary word: ${word}`;
  }

  // If no synonyms provided, fall back to meaning or word
  if (synonyms.length === 0) {
    synonyms = [word];
  }

  const id = String(r.id || `w_sync_${now}_${index}_${Math.random().toString(36).substring(2, 7)}`);
  const boxLevel =
    typeof r.boxLevel === 'number' && r.boxLevel >= 1 && r.boxLevel <= 5
      ? r.boxLevel
      : 1;

  // Set nextReviewDate to now so new words are immediately due for review!
  const nextReviewDate = typeof r.nextReviewDate === 'number' ? r.nextReviewDate : now;
  const createdAt = typeof r.createdAt === 'number' ? r.createdAt : now + index;

  return {
    id,
    word,
    meaning,
    synonyms: Array.from(new Set(synonyms)),
    exampleSentence: String(r.exampleSentence || r.example || r.sentence || ''),
    boxLevel,
    nextReviewDate,
    timesReviewed: typeof r.timesReviewed === 'number' ? r.timesReviewed : 0,
    timesCorrect: typeof r.timesCorrect === 'number' ? r.timesCorrect : 0,
    timesIncorrect: typeof r.timesIncorrect === 'number' ? r.timesIncorrect : 0,
    createdAt,
  };
}

  const contentType = response.headers.get('content-type') || '';
  const responseText = await response.text();
  const now = Date.now();

  let incomingWords: WordItem[] = [];

  // 1. Try parsing as JSON first
  if (contentType.includes('application/json') || responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(responseText);

      let rawList: unknown[] = [];

      if (parsed.words && Array.isArray(parsed.words)) {
        // Standard backup format: { words: [...], profile?: {...} }
        rawList = parsed.words;
      } else if (Array.isArray(parsed)) {
        // Direct array of word objects or strings: [ {...}, {...} ]
        rawList = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Key-value map: { "Eloquent": ["articulate", "fluent"] } or { "Eloquent": "articulate" }
        rawList = Object.entries(parsed).map(([key, val]) => ({
          word: key,
          synonyms: val,
        }));
      }

      incomingWords = rawList
        .map((item, idx) => sanitizeRawWord(item, idx, now))
        .filter((item): item is WordItem => item !== null);

      // If backup has profile with higher XP or streak, restore profile as well
      if (parsed.profile && typeof parsed.profile === 'object') {
        const currentProfile = await db.profile.get('user_profile');
        if (currentProfile) {
          const prof = parsed.profile as Record<string, unknown>;
          const updatedProfile = {
            ...currentProfile,
            xp: Math.max(currentProfile.xp, typeof prof.xp === 'number' ? prof.xp : 0),
            streak: Math.max(currentProfile.streak, typeof prof.streak === 'number' ? prof.streak : 0),
          };
          await db.profile.put(updatedProfile, 'user_profile');
        }
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
    throw new Error(
      'No valid words found at the target URL. Ensure the URL contains JSON data or lines formatted as "word - syn1, syn2".'
    );
  }

  // 3. Smart Merge: preserve user's existing SRS progress for words that already exist
  const existingWords = await db.words.toArray();
  const existingMap = new Map<string, WordItem>();
  for (const existing of existingWords) {
    existingMap.set(existing.word.toLowerCase().trim(), existing);
  }

  let newWordsCount = 0;
  let updatedWordsCount = 0;

  const mergedWords: WordItem[] = incomingWords.map((incoming) => {
    const key = incoming.word.toLowerCase().trim();
    const existing = existingMap.get(key);

    if (existing) {
      updatedWordsCount++;
      // Keep user's review metrics and box levels, but update synonyms & meaning
      return {
        ...existing,
        meaning: incoming.meaning || existing.meaning,
        synonyms: Array.from(new Set([...existing.synonyms, ...incoming.synonyms])),
        exampleSentence: incoming.exampleSentence || existing.exampleSentence,
      };
    }

    newWordsCount++;
    return incoming;
  });

  // Save all merged words into IndexedDB
  await db.words.bulkPut(mergedWords);

  // Total words currently in library
  const totalInDb = await db.words.count();

  let message = '';
  if (newWordsCount > 0) {
    message = `Successfully synced! Added ${newWordsCount} new word${newWordsCount > 1 ? 's' : ''}${
      updatedWordsCount > 0 ? ` and refreshed ${updatedWordsCount} existing` : ''
    } (Total in Library: ${totalInDb}).`;
  } else {
    message = `Synced ${updatedWordsCount} word${
      updatedWordsCount > 1 ? 's' : ''
    } (all were already in your library; definitions & synonyms updated). Total in Library: ${totalInDb}.`;
  }

  return {
    success: true,
    importedCount: incomingWords.length,
    newWordsCount,
    updatedWordsCount,
    totalWordsInDb: totalInDb,
    message,
  };
}
