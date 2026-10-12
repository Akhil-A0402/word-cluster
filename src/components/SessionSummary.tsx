import React from 'react';
import {
  Trophy,
  Flame,
  CheckCircle2,
  XCircle,
  RefreshCw,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import type { SessionResult, UserProfile } from '../types';

interface SessionSummaryProps {
  result: SessionResult;
  profile: UserProfile | null;
  onRestart: () => void;
  onOpenSync: () => void;
  onViewVocabulary: () => void;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({
  result,
  profile,
  onRestart,
  onOpenSync,
  onViewVocabulary,
}) => {
  const accuracy =
    result.totalWords > 0
      ? Math.round((result.correctCount / result.totalWords) * 100)
      : 0;

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-fadeIn">
      {/* Trophy Badge */}
      <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/25">
        <Trophy className="w-10 h-10 text-slate-950" />
      </div>

      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Session Complete!
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Great effort! Spaced repetition intervals have been updated.
        </p>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
          <p className="text-[11px] text-slate-400 font-medium">Accuracy</p>
          <p className="text-xl font-black text-emerald-400 mt-0.5">{accuracy}%</p>
          <p className="text-[10px] text-slate-500">
            {result.correctCount}/{result.totalWords} Correct
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
          <p className="text-[11px] text-slate-400 font-medium">XP Earned</p>
          <p className="text-xl font-black text-indigo-400 mt-0.5">+{result.xpEarned}</p>
          <p className="text-[10px] text-slate-500">Total: {profile?.xp ?? 0} XP</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
          <p className="text-[11px] text-slate-400 font-medium">Streak</p>
          <p className="text-xl font-black text-amber-400 mt-0.5 flex items-center justify-center gap-1">
            <Flame className="w-4 h-4 fill-amber-400" />
            {profile?.streak ?? 1}d
          </p>
          <p className="text-[10px] text-slate-500">Consecutive</p>
        </div>
      </div>

      {/* Sync Callout (Crucial requirement from prompt) */}
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-left flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold text-white flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            {profile?.syncSourceUrl ? 'Sync with GitHub / Cloud Source' : 'Keep Your Progress Safe'}
          </p>
          <p className="text-[11px] text-indigo-200/80">
            {profile?.syncSourceUrl
              ? 'Fetch latest updates from your configured external URL or export your updated progress.'
              : 'You just completed a revision session! Backup or sync your updated progress across devices now.'}
          </p>
        </div>
        <button
          onClick={onOpenSync}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition shadow-sm shrink-0 cursor-pointer"
        >
          {profile?.syncSourceUrl ? 'Sync from Cloud' : 'Sync Progress'}
        </button>
      </div>

      {/* Session Words Review History */}
      {result.history.length > 0 && (
        <div className="text-left space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Words Practiced:
          </p>
          <div className="max-h-48 overflow-y-auto space-y-1.5 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            {result.history.map((h, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0"
              >
                <div className="flex items-center gap-2">
                  {h.wasCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="font-semibold text-white">{h.word}</span>
                </div>
                <span className="text-slate-400 text-[11px]">
                  {h.wasCorrect
                    ? `Guessed: "${h.userGuess}"`
                    : `Attempt: "${h.userGuess || 'Skipped'}"`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <button
          onClick={onRestart}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Continue Next Revision
        </button>

        <button
          onClick={onViewVocabulary}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 px-6 rounded-2xl border border-slate-700 transition flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          View All Vocabulary
        </button>
      </div>
    </div>
  );
};
