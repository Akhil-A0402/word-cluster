import type { WordItem } from '../types';

export interface ParsedWordInput {
  word: string;
  meaning: string;
  synonyms: string[];
  exampleSentence?: string;
}

/**
 * Robust parser for user vocabulary inputs.
 *
 * Supports formats:
 * 1. "word - syn1, syn2, syn3"
 * 2. "word - syn1 - syn2 - syn3" (hyphen separated synonyms)
 * 3. "word: syn1, syn2, syn3"
 * 4. "word - meaning - syn1, syn2, syn3"
 * 5. "word = syn1, syn2"
 */
export function parseWordListInput(rawText: string): ParsedWordInput[] {
  const lines = rawText.split(/\r?\n/);
  const results: ParsedWordInput[] = [];

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      continue;
    }

    // Strip leading list numbers like "1. ", "1) ", "- "
    line = line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*•]\s*/, '');

    // Split on first primary delimiter (colon, em-dash, en-dash, hyphen, or equals)
    const firstDelimMatch = line.match(/\s*(?:[:=—–]|\s-\s|-)\s*/);
    if (!firstDelimMatch || firstDelimMatch.index === undefined) {
      continue;
    }

    const word = line.substring(0, firstDelimMatch.index).trim();
    const remainder = line.substring(firstDelimMatch.index + firstDelimMatch[0].length).trim();

    if (!word || !remainder) continue;

    // Check if remainder has a secondary delimiter for meaning
    // E.g. "meaning - syn1, syn2" vs "syn1, syn2" vs "syn1 - syn2 - syn3"
    let meaning = '';
    let synonyms: string[] = [];

    // If remainder contains commas, semicolons or slashes, split by those
    if (/[,;/]/.test(remainder)) {
      // Check if there is an explicit "meaning - syn1, syn2"
      const subSplit = remainder.split(/\s*[-—–]\s*/);
      if (subSplit.length >= 2 && !/[,;/]/.test(subSplit[0])) {
        // subSplit[0] is meaning, subSplit.slice(1) are synonyms
        meaning = subSplit[0].trim();
        const synText = subSplit.slice(1).join(', ');
        synonyms = synText.split(/[,;/]+/).map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      } else {
        // Remainder is directly a list of synonyms
        synonyms = remainder.split(/[,;/]+/).map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        meaning = `Associated with ${synonyms.slice(0, 3).join(', ')}`;
      }
    } else if (/[-—–]/.test(remainder)) {
      // Hyphen-separated list: "syn1 - syn2 - syn3"
      synonyms = remainder.split(/\s*[-—–]\s*/).map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      meaning = `Associated with ${synonyms.slice(0, 3).join(', ')}`;
    } else {
      // Single synonym: "word - syn"
      const singleSyn = remainder.replace(/^["']|["']$/g, '').trim();
      if (singleSyn) {
        synonyms = [singleSyn];
        meaning = `Associated with ${singleSyn}`;
      }
    }

    // Deduplicate and filter synonyms
    const uniqueSyns = Array.from(new Set(synonyms.filter((s) => s.length > 0 && s.toLowerCase() !== word.toLowerCase())));

    if (word && uniqueSyns.length > 0) {
      results.push({
        word,
        meaning,
        synonyms: uniqueSyns,
      });
    }
  }

  return results;
}

/**
 * Converts ParsedWordInput to full WordItem records for IndexedDB
 */
export function createWordItemsFromParsed(parsedList: ParsedWordInput[]): WordItem[] {
  const now = Date.now();
  return parsedList.map((item, idx) => ({
    id: `w_${now}_${idx}_${Math.random().toString(36).substring(2, 9)}`,
    word: item.word,
    meaning: item.meaning || `Associated with ${item.synonyms.slice(0, 3).join(', ')}`,
    synonyms: item.synonyms,
    exampleSentence: item.exampleSentence || '',
    boxLevel: 1,
    nextReviewDate: now,
    timesReviewed: 0,
    timesCorrect: 0,
    timesIncorrect: 0,
    createdAt: now + idx, // ensure slight increment for deterministic sorting
  }));
}
