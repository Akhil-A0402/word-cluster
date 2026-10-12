import React, { useState } from 'react';
import { PlusCircle, FileText, CheckCircle2, AlertCircle, Sparkles, ArrowRight, BookOpen } from 'lucide-react';
import type { WordItem } from '../types';
import { parseWordListInput, createWordItemsFromParsed } from '../utils/parser';
import { db } from '../db/wordsDb';
import { audio } from '../utils/audio';

interface AddWordsViewProps {
  onWordsAdded: () => void;
  onNavigateToLibrary: () => void;
}

export const AddWordsView: React.FC<AddWordsViewProps> = ({ onWordsAdded, onNavigateToLibrary }) => {
  const [tab, setTab] = useState<'bulk' | 'single'>('bulk');

  // Bulk input state
  const [bulkText, setBulkText] = useState(
    `Benevolent - kind, generous, compassionate\nCandor - honesty, frankness, openness\nDiligent - hardworking, industrious, meticulous\nPerceptive - insightful, observant, discerning`
  );
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');

  // Single word form state
  const [singleWord, setSingleWord] = useState('');
  const [singleMeaning, setSingleMeaning] = useState('');
  const [singleSynonyms, setSingleSynonyms] = useState('');
  const [singleExample, setSingleExample] = useState('');
  const [singleSuccessMsg, setSingleSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Local list of recently added words in this session for immediate visual confirmation
  const [recentlyAdded, setRecentlyAdded] = useState<WordItem[]>([]);

  // Live preview of bulk parser
  const parsedPreview = parseWordListInput(bulkText);

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setBulkSuccessMsg('');

    if (parsedPreview.length === 0) {
      setErrorMsg('No valid words found. Format lines as "word - syn1, syn2" or "word - syn1 - syn2".');
      return;
    }

    try {
      const newItems: WordItem[] = createWordItemsFromParsed(parsedPreview);
      // Use bulkPut for safe idempotent insertion
      await db.words.bulkPut(newItems);
      audio.playSuccess();
      audio.triggerHaptic('success');
      setBulkSuccessMsg(`Successfully added ${newItems.length} word(s) to your Library!`);
      setRecentlyAdded((prev) => [...newItems, ...prev]);
      setBulkText('');
      onWordsAdded();
    } catch (err) {
      setErrorMsg(`Failed to save words: ${(err as Error).message}`);
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSingleSuccessMsg('');

    const word = singleWord.trim();
    const synonyms = singleSynonyms
      .split(/[,;/]+/)
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter((s) => s.length > 0 && s.toLowerCase() !== word.toLowerCase());

    if (!word) {
      setErrorMsg('Please enter a word.');
      return;
    }
    if (synonyms.length === 0) {
      setErrorMsg('Please enter at least one synonym for this word.');
      return;
    }

    try {
      const now = Date.now();
      const newItem: WordItem = {
        id: `w_${now}_${Math.random().toString(36).substring(2, 9)}`,
        word,
        meaning: singleMeaning.trim() || `Associated with ${synonyms.slice(0, 3).join(', ')}`,
        synonyms,
        exampleSentence: singleExample.trim(),
        boxLevel: 1,
        nextReviewDate: now,
        timesReviewed: 0,
        timesCorrect: 0,
        timesIncorrect: 0,
        createdAt: now,
      };

      await db.words.put(newItem);
      audio.playSuccess();
      audio.triggerHaptic('success');
      setSingleSuccessMsg(`Word "${word}" successfully added to your Library!`);
      setRecentlyAdded((prev) => [newItem, ...prev]);
      setSingleWord('');
      setSingleMeaning('');
      setSingleSynonyms('');
      setSingleExample('');
      onWordsAdded();
    } catch (err) {
      setErrorMsg(`Failed to save word: ${(err as Error).message}`);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        {/* Header and Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-indigo-400" />
              Add to Library
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Add new words with synonyms and meanings for daily spaced repetition revision.
            </p>
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => {
                setTab('bulk');
                setErrorMsg('');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                tab === 'bulk'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Bulk Paste (word - synonyms)
            </button>
            <button
              onClick={() => {
                setTab('single');
                setErrorMsg('');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                tab === 'single'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Single Word Form
            </button>
          </div>
        </div>

        {/* Bulk Paste Tab */}
        {tab === 'bulk' && (
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Fast Bulk Input Format:</p>
                <p className="text-indigo-200/80 mt-0.5">
                  Type or paste one word per line as{' '}
                  <code className="text-white font-mono bg-indigo-950/80 px-1 py-0.5 rounded">
                    word - its list of similar words
                  </code>
                  <br />
                  Examples:<br />
                  <span className="italic">• Eloquent - articulate, fluent, persuasive</span><br />
                  <span className="italic">• Benevolent - kind - generous - compassionate</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Paste Words and Synonyms:
              </label>
              <textarea
                rows={7}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Eloquent - articulate, fluent, expressive&#10;Candor - honesty, frankness, openness"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition resize-y"
              />
            </div>

            {/* Live Parsing Preview */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="font-medium">Live Detection Preview:</span>
                <span className="font-bold text-indigo-400">
                  {parsedPreview.length} word(s) detected
                </span>
              </div>
              {parsedPreview.length > 0 ? (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-2">
                  {parsedPreview.slice(0, 6).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800"
                    >
                      <span className="font-bold text-white">{item.word}</span>
                      <span className="text-slate-400 truncate max-w-xs text-[11px]">
                        {item.synonyms.join(', ')}
                      </span>
                    </div>
                  ))}
                  {parsedPreview.length > 6 && (
                    <p className="text-[11px] text-slate-500 text-center pt-1">
                      ...and {parsedPreview.length - 6} more words
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-slate-600 italic">No valid words detected yet. Type in lines like: "word - syn1, syn2"</p>
              )}
            </div>

            <button
              type="submit"
              disabled={parsedPreview.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Import {parsedPreview.length} Word(s) to Library
            </button>
          </form>
        )}

        {/* Single Word Form Tab */}
        {tab === 'single' && (
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Word *
              </label>
              <input
                type="text"
                value={singleWord}
                onChange={(e) => setSingleWord(e.target.value)}
                placeholder="e.g. Tenacious"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Synonyms * (comma or hyphen-separated)
              </label>
              <input
                type="text"
                value={singleSynonyms}
                onChange={(e) => setSingleSynonyms(e.target.value)}
                placeholder="e.g. persistent, determined, resolute, stubborn"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Definition / Meaning (Optional)
              </label>
              <textarea
                rows={2}
                value={singleMeaning}
                onChange={(e) => setSingleMeaning(e.target.value)}
                placeholder="e.g. Tending to keep a firm hold of something; persistent or determined."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Example Sentence (Optional)
              </label>
              <input
                type="text"
                value={singleExample}
                onChange={(e) => setSingleExample(e.target.value)}
                placeholder="e.g. Her tenacious dedication led to a major breakthrough."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Save Word to Library
            </button>
          </form>
        )}

        {/* Success / Error Alerts with Direct Navigation Button */}
        {bulkSuccessMsg && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-semibold text-sm">{bulkSuccessMsg}</span>
            </div>
            <button
              onClick={onNavigateToLibrary}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              View in Library
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {singleSuccessMsg && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-semibold text-sm">{singleSuccessMsg}</span>
            </div>
            <button
              onClick={onNavigateToLibrary}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              View in Library
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Immediate Visual Confirmation: Recently Added in this Session */}
      {recentlyAdded.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Recently Added to Library ({recentlyAdded.length})
            </h3>
            <button
              onClick={onNavigateToLibrary}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
            >
              Open Library
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {recentlyAdded.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="bg-slate-950/70 border border-slate-800/80 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white text-sm mr-2">{item.word}</span>
                  <span className="text-slate-400 text-[11px]">
                    Synonyms: {item.synonyms.join(', ')}
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-semibold">
                  Saved
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
