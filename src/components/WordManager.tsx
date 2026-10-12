import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
  ArrowDownAZ
} from 'lucide-react';
import type { WordItem } from '../types';
import { db } from '../db/wordsDb';
import { audio } from '../utils/audio';

interface WordManagerProps {
  words: WordItem[];
  onWordsUpdated: () => void;
}

export const WordManager: React.FC<WordManagerProps> = ({ words, onWordsUpdated }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBox, setSelectedBox] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'alphabetical'>('newest');
  const [expandedWordIds, setExpandedWordIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDelete = async (id: string, word: string) => {
    if (window.confirm(`Delete "${word}" from your Library?`)) {
      await db.words.delete(id);
      audio.playHint();
      onWordsUpdated();
    }
  };

  // Filter words
  const filteredWords = words.filter((item) => {
    const matchesBox = selectedBox === 'all' || item.boxLevel === selectedBox;
    const term = searchTerm.toLowerCase().trim();
    if (!term) return matchesBox;

    const matchesWord = item.word.toLowerCase().includes(term);
    const matchesMeaning = item.meaning?.toLowerCase().includes(term);
    const matchesSynonyms = item.synonyms.some((s) => s.toLowerCase().includes(term));

    return matchesBox && (matchesWord || matchesMeaning || matchesSynonyms);
  });

  // Sort words: newest first by default so freshly added words are right at the top
  const sortedWords = [...filteredWords].sort((a, b) => {
    if (sortBy === 'newest') {
      return (b.createdAt || 0) - (a.createdAt || 0);
    } else {
      return a.word.localeCompare(b.word);
    }
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">
              Word Library ({words.length} words)
            </h2>
          </div>

          {/* Sort Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSortBy('newest')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                sortBy === 'newest'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3" />
              Newest
            </button>
            <button
              onClick={() => setSortBy('alphabetical')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                sortBy === 'alphabetical'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownAZ className="w-3 h-3" />
              A-Z
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search words, meanings, or synonyms..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedBox('all')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition cursor-pointer ${
                selectedBox === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All ({words.length})
            </button>
            {[1, 2, 3, 4, 5].map((box) => (
              <button
                key={box}
                onClick={() => setSelectedBox(box)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition cursor-pointer ${
                  selectedBox === box
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Box {box}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Words Grid / List */}
      <div className="space-y-3">
        {sortedWords.length > 0 ? (
          sortedWords.map((item) => {
            const isExpanded = expandedWordIds.has(item.id);
            const dictionaryUrl = `https://www.dictionary.com/browse/${encodeURIComponent(
              item.word.toLowerCase()
            )}`;
            const accuracy =
              item.timesReviewed > 0
                ? Math.round((item.timesCorrect / item.timesReviewed) * 100)
                : null;

            // Is word newly added in the last 24 hours?
            const isNew = item.createdAt && Date.now() - item.createdAt < 24 * 60 * 60 * 1000;

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 transition shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 cursor-pointer" onClick={() => toggleExpand(item.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg text-white">{item.word}</h3>
                      {isNew && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          NEW
                        </span>
                      )}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        Box {item.boxLevel}
                      </span>
                      {accuracy !== null && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {accuracy}% Acc ({item.timesReviewed} revs)
                        </span>
                      )}
                    </div>

                    {/* Primary synonyms badges preview */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {item.synonyms.slice(0, 4).map((syn, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-slate-950 border border-slate-800 text-slate-300 px-2.5 py-0.5 rounded-lg"
                        >
                          {syn}
                        </span>
                      ))}
                      {item.synonyms.length > 4 && (
                        <span className="text-xs text-slate-500 self-center">
                          +{item.synonyms.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Expand Chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={dictionaryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Look up in Dictionary.com"
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-indigo-400 hover:text-indigo-300 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => handleDelete(item.id, item.word)}
                      title="Delete word"
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500 text-rose-400 hover:text-rose-300 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details View */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 text-xs animate-fadeIn">
                    {item.meaning && (
                      <div>
                        <span className="font-semibold text-slate-400">Meaning: </span>
                        <span className="text-slate-200 leading-relaxed">{item.meaning}</span>
                      </div>
                    )}

                    {item.exampleSentence && (
                      <div>
                        <span className="font-semibold text-slate-400">Example: </span>
                        <span className="text-slate-300 italic">"{item.exampleSentence}"</span>
                      </div>
                    )}

                    <div>
                      <span className="font-semibold text-slate-400">All Synonyms: </span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {item.synonyms.map((syn, idx) => (
                          <span
                            key={idx}
                            className="bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded-lg"
                          >
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Next Revision: {new Date(item.nextReviewDate).toLocaleDateString()}</span>
                      <a
                        href={dictionaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-400 hover:underline"
                      >
                        Open full definitions on Dictionary.com
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No words match your current filters.</p>
            <p className="text-xs text-slate-500 mt-1">
              Add new words via the "Add Words" tab or reset your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
