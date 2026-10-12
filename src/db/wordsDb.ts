import Dexie, { type Table } from 'dexie';
import type { WordItem, UserProfile } from '../types';

export class WordClusterDB extends Dexie {
  words!: Table<WordItem, string>;
  profile!: Table<UserProfile, string>;

  constructor() {
    super('WordClusterDB');
    this.version(1).stores({
      words: 'id, word, boxLevel, nextReviewDate, createdAt',
      profile: 'id',
    });
  }
}

export const db = new WordClusterDB();

export const INITIAL_SEED_WORDS: Omit<WordItem, 'id' | 'createdAt' | 'timesReviewed' | 'timesCorrect' | 'timesIncorrect' | 'boxLevel' | 'nextReviewDate'>[] = [
  {
    word: 'Eloquent',
    meaning: 'Fluent or persuasive in speaking or writing; expressing oneself clearly and forcefully.',
    synonyms: ['articulate', 'fluent', 'expressive', 'persuasive', 'silver-tongued'],
    exampleSentence: 'An eloquent speaker captivated the entire conference hall.',
  },
  {
    word: 'Candor',
    meaning: 'The quality of being open, honest, and direct in expression; frankness.',
    synonyms: ['honesty', 'frankness', 'openness', 'sincerity', 'directness', 'truthfulness'],
    exampleSentence: 'I appreciated the candor of his constructive feedback.',
  },
  {
    word: 'Benevolent',
    meaning: 'Characterized by or expressing goodwill or kindly feelings; charitable.',
    synonyms: ['kind', 'generous', 'compassionate', 'charitable', 'magnanimous', 'benign'],
    exampleSentence: 'A benevolent benefactor funded the city library restoration.',
  },
  {
    word: 'Meticulous',
    meaning: 'Showing great attention to detail; very careful, precise, and thorough.',
    synonyms: ['thorough', 'painstaking', 'diligent', 'precise', 'fastidious', 'scrupulous'],
    exampleSentence: 'The researcher was meticulous in documenting every laboratory variable.',
  },
  {
    word: 'Resilient',
    meaning: 'Able to withstand or recover quickly from difficult conditions or adversity.',
    synonyms: ['tough', 'tenacious', 'adaptable', 'hardy', 'buoyant', 'strong'],
    exampleSentence: 'The local economy proved remarkably resilient through the crisis.',
  },
  {
    word: 'Ephemeral',
    meaning: 'Lasting for a very short time; fleeting or transitory.',
    synonyms: ['fleeting', 'transient', 'momentary', 'brief', 'short-lived', 'temporary'],
    exampleSentence: 'The beauty of spring cherry blossoms is celebrated for being ephemeral.',
  },
  {
    word: 'Pragmatic',
    meaning: 'Dealing with things sensibly and realistically in a practical way rather than theoretical.',
    synonyms: ['practical', 'realistic', 'sensible', 'utilitarian', 'down-to-earth'],
    exampleSentence: 'She proposed a pragmatic solution that resolved the budget deadlock.',
  },
  {
    word: 'Lucid',
    meaning: 'Expressed clearly; easy to understand; rational and intelligible.',
    synonyms: ['clear', 'coherent', 'intelligible', 'articulate', 'transparent', 'comprehensible'],
    exampleSentence: 'He provided a lucid overview of complex quantum mechanics concepts.',
  },
  {
    word: 'Tenacious',
    meaning: 'Tending to keep a firm hold of something; persistent, determined, or resolute.',
    synonyms: ['persistent', 'determined', 'resolute', 'stubborn', 'relentless', 'persevering'],
    exampleSentence: 'Her tenacious defense won the team the national championship.',
  },
  {
    word: 'Audacious',
    meaning: 'Showing a willingness to take surprisingly bold risks; fearless and daring.',
    synonyms: ['bold', 'daring', 'fearless', 'brave', 'intrepid', 'adventurous'],
    exampleSentence: 'The startup devised an audacious plan to disrupt global payments.',
  },
  {
    word: 'Superfluous',
    meaning: 'Exceeding what is sufficient or necessary; redundant or extra.',
    synonyms: ['excessive', 'redundant', 'surplus', 'extra', 'unneeded', 'gratuitous'],
    exampleSentence: 'The editor deleted the superfluous adverbs to tighten the article.',
  },
  {
    word: 'Sagacious',
    meaning: 'Having or showing keen mental discernment and good judgment; wise and shrewd.',
    synonyms: ['wise', 'shrewd', 'astute', 'clever', 'perceptive', 'insightful'],
    exampleSentence: 'The elderly mentor offered sagacious advice to the young founders.',
  },
  {
    word: 'Venerable',
    meaning: 'Accorded a great deal of respect, especially because of age, wisdom, or character.',
    synonyms: ['respected', 'esteemed', 'revered', 'honored', 'hallowed', 'august'],
    exampleSentence: 'The venerable university has educated generations of scholars.',
  },
  {
    word: 'Inquisitive',
    meaning: 'Given to inquiry, research, or asking questions; eager for knowledge.',
    synonyms: ['curious', 'inquiring', 'prying', 'intrigued', 'questioning', 'investigative'],
    exampleSentence: 'Children are naturally inquisitive about how nature works.',
  },
  {
    word: 'Lethargic',
    meaning: 'Characterized by laziness, sluggishness, or lack of energy.',
    synonyms: ['sluggish', 'apathetic', 'listless', 'lazy', 'torpid', 'inactive'],
    exampleSentence: 'After the heavy feast, everyone felt pleasantly lethargic.',
  },
  {
    word: 'Ambiguous',
    meaning: 'Open to more than one interpretation; not having an obvious meaning.',
    synonyms: ['unclear', 'vague', 'equivocal', 'obscure', 'cryptic', 'doubtful'],
    exampleSentence: 'The wording of the legal clause remained ambiguous.',
  },
  {
    word: 'Voracious',
    meaning: 'Wanting or devouring great quantities of food, books, or information.',
    synonyms: ['insatiable', 'ravenous', 'greedy', 'avid', 'hungry', 'rapacious'],
    exampleSentence: 'She was a voracious reader who finished three novels a week.',
  },
  {
    word: 'Mitigate',
    meaning: 'To make less severe, serious, or painful; alleviate.',
    synonyms: ['alleviate', 'reduce', 'ease', 'lessen', 'diminish', 'soften'],
    exampleSentence: 'Flood walls were constructed to mitigate seasonal disaster risk.',
  },
  {
    word: 'Fastidious',
    meaning: 'Very attentive to and concerned about accuracy and detail; meticulous.',
    synonyms: ['meticulous', 'exacting', 'perfectionist', 'demanding', 'fussy', 'scrupulous'],
    exampleSentence: 'The head chef was fastidious about the temperature of each plate.',
  },
  {
    word: 'Fortuitous',
    meaning: 'Happening by accident or chance rather than design, often with fortunate outcome.',
    synonyms: ['lucky', 'serendipitous', 'accidental', 'chance', 'unforeseen', 'favorable'],
    exampleSentence: 'Their fortuitous meeting at the airport launched a lifelong partnership.',
  },
  {
    word: 'Pernicious',
    meaning: 'Having a harmful effect, especially in a gradual, subtle, or stealthy way.',
    synonyms: ['harmful', 'destructive', 'damaging', 'ruinous', 'malign', 'insidious'],
    exampleSentence: 'The pernicious influence of disinformation undermines public trust.',
  },
  {
    word: 'Euphoria',
    meaning: 'A state or feeling of intense happiness, excitement, and self-confidence.',
    synonyms: ['elation', 'joy', 'ecstasy', 'bliss', 'delight', 'jubilation'],
    exampleSentence: 'The team erupted in euphoria after winning the championship.',
  },
  {
    word: 'Nefarious',
    meaning: 'Infamous by way of being extremely wicked, villainous, or criminal.',
    synonyms: ['evil', 'villainous', 'vicious', 'corrupt', 'sinister', 'heinous'],
    exampleSentence: 'The security team foiled a nefarious cyber espionage scheme.',
  },
  {
    word: 'Ubiquitous',
    meaning: 'Existing or being present everywhere at the same time; omnipresent.',
    synonyms: ['omnipresent', 'pervasive', 'universal', 'widespread', 'common', 'everywhere'],
    exampleSentence: 'Smartphones have become ubiquitous across everyday life.',
  },
  {
    word: 'Cacophony',
    meaning: 'A harsh, discordant mixture of loud sounds.',
    synonyms: ['dissonance', 'racket', 'noise', 'clamor', 'discord', 'din'],
    exampleSentence: 'A cacophony of car horns and construction echoed across the avenue.',
  },
];

/**
 * Initializes database with default seed data if empty
 */
export async function initializeDatabase(): Promise<void> {
  const count = await db.words.count();
  if (count === 0) {
    const now = Date.now();
    const seedRecords: WordItem[] = INITIAL_SEED_WORDS.map((item, index) => ({
      ...item,
      id: `seed_${index + 1}`,
      boxLevel: 1,
      nextReviewDate: now,
      timesReviewed: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      createdAt: now,
    }));
    await db.words.bulkAdd(seedRecords);
  }

  // Initialize profile if missing
  const profile = await db.profile.get('user_profile');
  if (!profile) {
    const today = new Date().toISOString().split('T')[0];
    await db.profile.put({
      xp: 0,
      streak: 1,
      lastActiveDate: today,
      sessionsCompleted: 0,
      soundEnabled: true,
      hapticsEnabled: true,
    }, 'user_profile');
  }
}
