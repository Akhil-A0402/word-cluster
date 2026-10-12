import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Plus,
  X,
  BookOpen,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Trophy
} from 'lucide-react';
import type { WordItem, TestResultBreakdown } from '../types';
import { getLevenshteinDistance } from '../utils/levenshtein';
import { audio } from '../utils/audio';

interface WordTestCardProps {
  word: WordItem;
  onAnswer: (isCorrect: boolean, xpEarned: number, userGuess: string) => void;
  streak: number;
}

export const WordTestCard: React.FC<WordTestCardProps> = ({
  word,
  onAnswer,
  streak,
}) => {
  const [currentInput, setCurrentInput] = useState('');
  const [enteredWords, setEnteredWords] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resultBreakdown, setResultBreakdown] = useState<TestResultBreakdown | null>(null);
  const [isMeaningExpanded, setIsMeaningExpanded] = useState(false);
  const [isGivenUp, setIsGivenUp] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state on word change
  useEffect(() => {
    setCurrentInput('');
    setEnteredWords([]);
    setIsSubmitted(false);
    setResultBreakdown(null);
    setIsMeaningExpanded(false);
    setIsGivenUp(false);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  }, [word.id]);

  // Helper to add word(s) to enteredWords list
  const addEnteredWord = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    // Support comma or semicolon separation in a single paste/type
    const parts = trimmed
      .split(/[,;]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    setEnteredWords((prev) => {
      const next = [...prev];
      for (const part of parts) {
        // Prevent duplicate entries
        if (!next.some((w) => w.toLowerCase() === part.toLowerCase())) {
          next.push(part);
        }
      }
      return next;
    });

    setCurrentInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEnteredWord(currentInput);
    }
  };

  const removeEnteredWord = (indexToRemove: number) => {
    if (isSubmitted) return;
    setEnteredWords((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitted) return;

    // If there is still text in the input box, add it before submitting
    let finalEntered = [...enteredWords];
    if (currentInput.trim()) {
      const parts = currentInput
        .trim()
        .split(/[,;]+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      for (const part of parts) {
        if (!finalEntered.some((w) => w.toLowerCase() === part.toLowerCase())) {
          finalEntered.push(part);
        }
      }
      setEnteredWords(finalEntered);
      setCurrentInput('');
    }

    if (finalEntered.length === 0) return;

    // Evaluate answers
    const acceptedTargets = word.synonyms.map((s) => s.trim());
    const matchedTargets = new Set<string>();
    const correctUserGuesses: string[] = [];
    const incorrectUserGuesses: string[] = [];

    for (const userGuess of finalEntered) {
      const guessNorm = userGuess.toLowerCase().trim();

      // Check exact match or tight typo against remaining targets
      let foundTarget: string | null = null;

      for (const target of acceptedTargets) {
        const targetNorm = target.toLowerCase().trim();
        if (targetNorm === guessNorm) {
          foundTarget = target;
          break;
        }
        // Typo tolerance (distance <= 1 on words length >= 4)
        if (targetNorm.length >= 4 && getLevenshteinDistance(guessNorm, targetNorm) <= 1) {
          foundTarget = target;
          break;
        }
      }

      if (foundTarget) {
        matchedTargets.add(foundTarget);
        correctUserGuesses.push(userGuess);
      } else {
        incorrectUserGuesses.push(userGuess);
      }
    }

    // Determine missed synonyms
    const missedTargets = acceptedTargets.filter((t) => !matchedTargets.has(t));

    const totalTargets = acceptedTargets.length;
    const correctCount = matchedTargets.size;
    const scorePercent = totalTargets > 0 ? Math.round((correctCount / totalTargets) * 100) : 0;

    const breakdown: TestResultBreakdown = {
      correct: Array.from(matchedTargets),
      missed: missedTargets,
      incorrect: incorrectUserGuesses,
      scorePercent,
    };

    setResultBreakdown(breakdown);
    setIsSubmitted(true);

    // Audio & Confetti feedback
    const isPassing = correctCount >= Math.ceil(totalTargets * 0.5) && correctCount > 0;

    if (scorePercent === 100) {
      audio.playLevelUp();
      audio.triggerHaptic('complete');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'],
      });
    } else if (isPassing) {
      audio.playSuccess();
      audio.triggerHaptic('success');
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.7 },
      });
    } else {
      audio.playError();
      audio.triggerHaptic('error');
    }
  };

  const handleGiveUp = () => {
    setIsGivenUp(true);
    const breakdown: TestResultBreakdown = {
      correct: [],
      missed: word.synonyms,
      incorrect: enteredWords,
      scorePercent: 0,
    };
    setResultBreakdown(breakdown);
    setIsSubmitted(true);
    audio.playError();
    audio.triggerHaptic('error');
  };

  const handleNextWord = () => {
    if (!resultBreakdown) return;

    const totalTargets = word.synonyms.length;
    const correctCount = resultBreakdown.correct.length;
    const isPassing = !isGivenUp && correctCount >= Math.ceil(totalTargets * 0.5) && correctCount > 0;

    // Calculate XP: 10 XP per correct synonym + 15 bonus XP for 100% recall
    let xpEarned = isGivenUp ? 0 : correctCount * 10;
    if (resultBreakdown.scorePercent === 100) {
      xpEarned += 15;
    }

    const summary = `${correctCount}/${totalTargets} synonyms recalled (${resultBreakdown.scorePercent}%)`;
    onAnswer(isPassing, xpEarned, summary);
  };

  const dictionaryUrl = `https://www.dictionary.com/browse/${encodeURIComponent(word.word.toLowerCase())}`;
  const totalTargetCount = word.synonyms.length;

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: SRS Box & Mode Badge */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            SRS Box {word.boxLevel} / 5
          </span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
            Test Mode
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {streak > 1 && (
            <span className="text-amber-400 font-medium">
              🔥 {streak}d streak
            </span>
          )}
          <span className="text-slate-400 font-mono">
            {totalTargetCount} synonyms to recall
          </span>
        </div>
      </div>

      {/* Main Target Word Display */}
      <div className="text-center mb-6">
        <p className="text-xs uppercase tracking-widest text-indigo-400 font-semibold mb-1">
          Recall All Similar Words For
        </p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {word.word}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Enter as many synonyms as you remember, then submit to check your score.
        </p>
      </div>

      {!isSubmitted ? (
        /* TEST INPUT PHASE */
        <div className="space-y-5">
          {/* Tag Chips Container */}
          <div className="min-h-[70px] bg-slate-950 border-2 border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center gap-2">
            {enteredWords.map((item, index) => (
              <span
                key={index}
                className="bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeEnteredWord(index)}
                  className="hover:text-rose-400 text-indigo-400 transition cursor-pointer"
                  title="Remove word"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            {enteredWords.length === 0 && (
              <span className="text-xs text-slate-500 italic pl-1">
                Your entered synonyms will appear here as chips...
              </span>
            )}
          </div>

          {/* Input field to add more words */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a synonym & press Enter or comma..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>
            <button
              type="button"
              onClick={() => addEnteredWord(currentInput)}
              disabled={!currentInput.trim()}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-indigo-300 font-semibold px-4 rounded-2xl border border-slate-700 transition flex items-center justify-center gap-1 text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Entered: <strong className="text-white">{enteredWords.length}</strong> / {totalTargetCount} target words
            </span>
            <span>Press Enter or , to add each word</span>
          </div>

          {/* Action Buttons: Submit Test & Give Up */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={enteredWords.length === 0 && !currentInput.trim()}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-600/25 transition active:scale-[0.98] flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              Submit & Check Answers ({enteredWords.length + (currentInput.trim() ? 1 : 0)})
            </button>

            <button
              type="button"
              onClick={handleGiveUp}
              title="Reveal all synonyms without scoring"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium py-3.5 px-4 rounded-2xl border border-slate-700 transition flex items-center gap-1 text-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              Give Up
            </button>
          </div>
        </div>
      ) : (
        /* TEST RESULTS & BREAKDOWN PHASE */
        <div className="space-y-5 animate-fadeIn">
          {/* Score Banner */}
          {resultBreakdown && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                resultBreakdown.scorePercent === 100
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : resultBreakdown.scorePercent >= 60
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {resultBreakdown.scorePercent === 100 ? (
                  <Trophy className="w-7 h-7 text-emerald-400 shrink-0" />
                ) : resultBreakdown.scorePercent >= 60 ? (
                  <Sparkles className="w-7 h-7 text-indigo-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-7 h-7 text-amber-400 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-white">
                    {resultBreakdown.scorePercent === 100
                      ? 'Perfect Recall! All Synonyms Found'
                      : resultBreakdown.scorePercent >= 60
                      ? `Great Score! ${resultBreakdown.scorePercent}% Recalled`
                      : `Keep Practicing (${resultBreakdown.scorePercent}%)`}
                  </h4>
                  <p className="text-xs opacity-90 mt-0.5">
                    {resultBreakdown.correct.length} of {totalTargetCount} target synonyms recalled
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl sm:text-2xl font-extrabold text-white">
                  {resultBreakdown.scorePercent}%
                </span>
              </div>
            </div>
          )}

          {/* Category 1: Correct Synonyms Recalled */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Correct Synonyms ({resultBreakdown?.correct.length ?? 0})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {resultBreakdown && resultBreakdown.correct.length > 0 ? (
                resultBreakdown.correct.map((syn, idx) => (
                  <span
                    key={idx}
                    className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {syn}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">None recalled</span>
              )}
            </div>
          </div>

          {/* Category 2: Missed Synonyms */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Missed Synonyms ({resultBreakdown?.missed.length ?? 0})
              </span>
              <span className="text-[11px] text-slate-500">Study these for next time</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {resultBreakdown && resultBreakdown.missed.length > 0 ? (
                resultBreakdown.missed.map((syn, idx) => (
                  <span
                    key={idx}
                    className="bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    {syn}
                  </span>
                ))
              ) : (
                <span className="text-xs text-emerald-400 font-medium">None missed! You caught every single one!</span>
              )}
            </div>
          </div>

          {/* Category 3: Incorrect Words Entered */}
          {resultBreakdown && resultBreakdown.incorrect.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  Not Accepted / Incorrect ({resultBreakdown.incorrect.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {resultBreakdown.incorrect.map((wordEntered, idx) => (
                  <span
                    key={idx}
                    className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    {wordEntered}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Next Word Button */}
          <button
            onClick={handleNextWord}
            autoFocus
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-600/25 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            Next Word
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Expandable Meaning & Dictionary Section */}
      <div className="mt-6 pt-5 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsMeaningExpanded(!isMeaningExpanded)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition font-medium cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            {isMeaningExpanded ? 'Hide Meaning & Definition' : 'Show Meaning & Definition'}
            {isMeaningExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          <a
            href={dictionaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition font-medium underline underline-offset-2"
          >
            Dictionary.com Search
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {isMeaningExpanded && (
          <div className="mt-3 p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl text-xs space-y-2 animate-fadeIn">
            <div>
              <span className="text-slate-400 font-semibold">Meaning: </span>
              <span className="text-slate-200">{word.meaning || 'No definition recorded yet.'}</span>
            </div>
            {word.exampleSentence && (
              <div>
                <span className="text-slate-400 font-semibold">Example: </span>
                <span className="text-slate-300 italic">"{word.exampleSentence}"</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WordTestCard;
