import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Flame,
  BookOpen,
  RotateCcw
} from 'lucide-react';
import type { WordItem, ValidationResult } from '../types';
import { validateSynonymGuess } from '../utils/levenshtein';
import { audio } from '../utils/audio';

interface WordReviewCardProps {
  word: WordItem;
  onAnswer: (isCorrect: boolean, xpEarned: number, userGuess: string) => void;
  comboCount: number;
  streak: number;
}

export const WordReviewCard: React.FC<WordReviewCardProps> = ({
  word,
  onAnswer,
  comboCount,
  streak,
}) => {
  const [guess, setGuess] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [revealedLetters, setRevealedLetters] = useState<number[]>([]);
  const [isMeaningExpanded, setIsMeaningExpanded] = useState(false);
  const [isAnsweredCorrectly, setIsAnsweredCorrectly] = useState(false);
  const [revealedAnswer, setRevealedAnswer] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Target synonym for blank spaces representation
  const targetSynonym = word.synonyms[0] || '';
  const targetLetters = targetSynonym.split('');

  // Reset state on word change
  useEffect(() => {
    setGuess('');
    setValidationResult(null);
    setRevealedLetters([]);
    setIsMeaningExpanded(false);
    setIsAnsweredCorrectly(false);
    setRevealedAnswer(false);
    setAttempts(0);

    // Focus input smoothly on desktop & Android
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  }, [word.id]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!guess.trim() || isAnsweredCorrectly || revealedAnswer) return;

    const result = validateSynonymGuess(guess, word.synonyms);
    setValidationResult(result);
    setAttempts((prev) => prev + 1);

    if (result.status === 'correct') {
      setIsAnsweredCorrectly(true);
      audio.playSuccess();
      audio.triggerHaptic('success');

      // Confetti celebration
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899'],
      });

      // Calculate XP with combo multiplier
      const baseXP = 15;
      const hintPenalty = revealedLetters.length * 3;
      const multiplier = comboCount >= 3 ? 2 : 1;
      const finalXP = Math.max(5, (baseXP - hintPenalty) * multiplier);

      onAnswer(true, finalXP, guess.trim());
    } else if (result.status === 'typo') {
      audio.playError();
      audio.triggerHaptic('error');
    } else {
      audio.playError();
      audio.triggerHaptic('error');
    }
  };

  const handleRevealLetter = () => {
    if (revealedLetters.length >= targetLetters.length || isAnsweredCorrectly) return;

    const unrevealedIndices: number[] = [];
    targetLetters.forEach((_, idx) => {
      if (!revealedLetters.includes(idx)) {
        unrevealedIndices.push(idx);
      }
    });

    if (unrevealedIndices.length > 0) {
      const nextIndex = unrevealedIndices[0];
      setRevealedLetters((prev) => [...prev, nextIndex]);
      audio.playHint();
      audio.triggerHaptic('hint');
    }
  };

  const handleGiveUp = () => {
    setRevealedAnswer(true);
    setValidationResult({
      status: 'incorrect',
      message: `Accepted synonyms: ${word.synonyms.join(', ')}`,
    });
    audio.playError();
    audio.triggerHaptic('error');
    onAnswer(false, 0, guess.trim() || 'Skipped');
  };

  const dictionaryUrl = `https://www.dictionary.com/browse/${encodeURIComponent(word.word.toLowerCase())}`;

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Card Bar: SRS Box and Combo status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            SRS Box {word.boxLevel} / 5
          </span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <span
                key={lvl}
                className={`w-1.5 h-1.5 rounded-full ${
                  lvl <= word.boxLevel ? 'bg-indigo-400' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {streak > 1 && (
            <span className="text-xs text-amber-400 font-medium">
              🔥 {streak}d streak
            </span>
          )}
          {comboCount >= 2 && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full animate-bounce">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              {comboCount}x COMBO!
            </div>
          )}
        </div>
      </div>

      {/* Main Target Word Display */}
      <div className="text-center mb-6">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
          Provide a Synonym for
        </p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {word.word}
        </h2>
      </div>

      {/* Blank Spaces Representation (Gamified letter slots) */}
      <div className="mb-6">
        <div className="text-center mb-2">
          <span className="text-[11px] font-medium text-slate-400">
            Target synonym length: {targetLetters.length} letters
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {targetLetters.map((char, index) => {
            const isRevealed =
              isAnsweredCorrectly || revealedAnswer || revealedLetters.includes(index);
            const isSpace = char === ' ' || char === '-';

            if (isSpace) {
              return <span key={index} className="w-3 text-slate-500">-</span>;
            }

            return (
              <div
                key={index}
                className={`w-8 h-10 sm:w-10 sm:h-12 flex items-center justify-center rounded-xl font-mono text-lg font-bold border transition-all ${
                  isRevealed
                    ? isAnsweredCorrectly
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 scale-105'
                      : 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-slate-950 border-slate-700/80 text-transparent shadow-inner'
                }`}
              >
                {isRevealed ? char.toUpperCase() : '•'}
              </div>
            );
          })}
        </div>
      </div>

      {/* User Input Form (No autocomplete/suggestions to preserve challenge) */}
      {!isAnsweredCorrectly && !revealedAnswer ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Type your synonym here..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className="w-full bg-slate-950 border-2 border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 rounded-2xl px-4 py-3.5 text-base sm:text-lg text-white placeholder-slate-500 outline-none transition"
            />
          </div>

          {/* Action Buttons: Check Answer, Hint, Give Up */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={!guess.trim()}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-600/25 transition active:scale-[0.98] flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
            >
              Check Synonym
            </button>

            <button
              type="button"
              onClick={handleRevealLetter}
              disabled={revealedLetters.length >= targetLetters.length}
              title="Reveal 1 letter (-3 XP)"
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-amber-300 font-medium py-3.5 px-4 rounded-2xl border border-slate-700 transition flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer"
            >
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Hint ({targetLetters.length - revealedLetters.length})
            </button>

            {attempts >= 1 && (
              <button
                type="button"
                onClick={handleGiveUp}
                title="Show accepted synonyms"
                className="bg-slate-800 hover:bg-slate-700 text-rose-300 font-medium py-3.5 px-4 rounded-2xl border border-slate-700 transition flex items-center gap-1 text-xs sm:text-sm cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                Give Up
              </button>
            )}
          </div>
        </form>
      ) : (
        /* Next Word Button when answered */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">
                {isAnsweredCorrectly ? 'Well done!' : 'Keep practicing!'}
              </p>
              <p className="text-xs text-emerald-200/80 mt-1">
                Accepted synonyms:{' '}
                <span className="font-bold text-white">
                  {word.synonyms.join(', ')}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={() => onAnswer(isAnsweredCorrectly, 0, guess)}
            autoFocus
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-600/25 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            Next Word
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dynamic Feedback Banner for Typos and Errors */}
      {validationResult && !isAnsweredCorrectly && !revealedAnswer && (
        <div
          className={`mt-4 p-3.5 rounded-2xl flex items-start gap-3 text-xs sm:text-sm transition-all ${
            validationResult.status === 'typo'
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-200'
          }`}
        >
          {validationResult.status === 'typo' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-medium">{validationResult.message}</p>
          </div>
        </div>
      )}

      {/* Expandable Meaning & Dictionary.com Section */}
      <div className="mt-6 pt-5 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsMeaningExpanded(!isMeaningExpanded)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition font-medium cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            {isMeaningExpanded ? 'Hide Meaning & Details' : 'Show Meaning & Hints'}
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
