import React from 'react';
import { Flame, Sparkles, Volume2, VolumeX, BookOpen, Brain, PlusCircle, RefreshCw } from 'lucide-react';
import type { UserProfile, ActiveTab } from '../types';
import { audio } from '../utils/audio';

interface HeaderProps {
  profile: UserProfile | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  dueCount: number;
  totalWordsCount: number;
  onToggleSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  activeTab,
  setActiveTab,
  dueCount,
  totalWordsCount,
  onToggleSound,
}) => {
  const getLevelTitle = (xp: number) => {
    if (xp < 100) return 'Novice';
    if (xp < 300) return 'Apprentice';
    if (xp < 700) return 'Lexiphile';
    if (xp < 1500) return 'Wordsmith';
    return 'Lexicon Master';
  };

  const xp = profile?.xp ?? 0;
  const streak = profile?.streak ?? 1;
  const soundEnabled = profile?.soundEnabled ?? true;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-4 py-3 shadow-sm">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Logo and Brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('review')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight flex items-center gap-2">
                Word Cluster
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Offline Ready
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Gamified Synonym Revision • {totalWordsCount} words
              </p>
            </div>
          </div>

          {/* Quick Sound & Mobile Stats */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={onToggleSound}
              title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <div className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              {streak}d
            </div>
          </div>
        </div>

        {/* User Badges & Desktop Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="hidden sm:flex items-center gap-3">
            {/* Streak Badge */}
            <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400/30" />
              <span className="text-slate-300">Streak:</span>
              <span className="font-bold text-amber-400">{streak} days</span>
            </div>

            {/* XP & Level Badge */}
            <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-300">{getLevelTitle(xp)}:</span>
              <span className="font-bold text-indigo-300">{xp} XP</span>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={() => {
                onToggleSound();
                audio.playHint();
              }}
              title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
          </div>

          {/* Navigation Bar Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('review')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition shrink-0 ${
                activeTab === 'review'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              Revise
              {dueCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500 text-white font-bold">
                  {dueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('words')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition shrink-0 ${
                activeTab === 'words'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Library
            </button>

            <button
              onClick={() => setActiveTab('add')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition shrink-0 ${
                activeTab === 'add'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Words
            </button>

            <button
              onClick={() => setActiveTab('sync')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition shrink-0 ${
                activeTab === 'sync'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync / Backup
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
