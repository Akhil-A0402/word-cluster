import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  CheckCircle
} from 'lucide-react';
import type { WordItem, UserProfile, ActiveTab, ReviewHistoryEntry, SessionResult } from './types';
import { db, initializeDatabase } from './db/wordsDb';
import { isWordDueForReview, sortWordsForReview, calculateNextReview } from './utils/srs';
import { audio } from './utils/audio';
import { Header } from './components/Header';
import { WordReviewCard } from './components/WordReviewCard';
import { WordManager } from './components/WordManager';
import { AddWordsView } from './components/AddWordsView';
import { SessionSummary } from './components/SessionSummary';
import { SyncModal } from './components/SyncModal';

export const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allWords, setAllWords] = useState<WordItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('review');
  const [isLoading, setIsLoading] = useState(true);

  // Active Session State
  const [sessionQueue, setSessionQueue] = useState<WordItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [sessionHistory, setSessionHistory] = useState<ReviewHistoryEntry[]>([]);
  const [sessionXPEarned, setSessionXPEarned] = useState(0);
  const [sessionCorrectCount, setSessionCorrectCount] = useState(0);
  const [isSessionFinished, setIsSessionFinished] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Load database and user profile
  const loadData = useCallback(async () => {
    try {
      await initializeDatabase();
      const words = await db.words.toArray();
      const userProfile = await db.profile.get('user_profile');

      setAllWords(words);
      if (userProfile) {
        setProfile(userProfile);
        audio.soundEnabled = userProfile.soundEnabled;
        audio.hapticsEnabled = userProfile.hapticsEnabled;
      }
    } catch (err) {
      console.error('Failed to initialize database:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute due words for SRS
  const dueWords = allWords.filter(isWordDueForReview);

  // Start / restart revision queue
  const startSession = useCallback(
    (customWords?: WordItem[]) => {
      let pool = customWords;
      if (!pool || pool.length === 0) {
        pool = dueWords.length > 0 ? dueWords : allWords;
      }

      // Shuffle and sort appropriately for Leitner box review
      const sorted = sortWordsForReview(pool);
      // Pick up to 10 words per micro-session to keep it fast & enjoyable
      const sessionSubset = sorted.slice(0, 10);

      setSessionQueue(sessionSubset);
      setCurrentIndex(0);
      setComboCount(0);
      setSessionHistory([]);
      setSessionXPEarned(0);
      setSessionCorrectCount(0);
      setIsSessionFinished(false);
    },
    [dueWords, allWords]
  );

  // Initialize session when words are first loaded
  useEffect(() => {
    if (allWords.length > 0 && sessionQueue.length === 0 && !isSessionFinished) {
      startSession();
    }
  }, [allWords, sessionQueue.length, isSessionFinished, startSession]);

  // Handle answer submission
  const handleAnswer = async (
    isCorrect: boolean,
    xpEarned: number,
    userGuess: string
  ) => {
    const currentWord = sessionQueue[currentIndex];
    if (!currentWord) return;

    // 1. Update SRS scheduling
    const { nextBox, nextReviewDate } = calculateNextReview(currentWord.boxLevel, isCorrect);
    const now = Date.now();

    await db.words.update(currentWord.id, {
      boxLevel: nextBox,
      nextReviewDate,
      lastReviewedAt: now,
      timesReviewed: currentWord.timesReviewed + 1,
      timesCorrect: currentWord.timesCorrect + (isCorrect ? 1 : 0),
      timesIncorrect: currentWord.timesIncorrect + (!isCorrect ? 1 : 0),
    });

    // 2. Update session metrics
    const newCombo = isCorrect ? comboCount + 1 : 0;
    setComboCount(newCombo);
    setSessionXPEarned((prev) => prev + xpEarned);
    if (isCorrect) {
      setSessionCorrectCount((prev) => prev + 1);
    }

    setSessionHistory((prev) => [
      ...prev,
      {
        wordId: currentWord.id,
        word: currentWord.word,
        userGuess,
        wasCorrect: isCorrect,
      },
    ]);

    // 3. Update User Streak & XP
    if (profile) {
      const today = new Date().toISOString().split('T')[0];
      let newStreak = profile.streak;

      if (profile.lastActiveDate !== today) {
        const lastDate = new Date(profile.lastActiveDate);
        const currentDate = new Date(today);
        const diffDays = Math.round(
          (currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24)
        );

        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      }

      const updatedProfile: UserProfile = {
        ...profile,
        xp: profile.xp + xpEarned,
        streak: newStreak,
        lastActiveDate: today,
        sessionsCompleted:
          currentIndex + 1 >= sessionQueue.length
            ? profile.sessionsCompleted + 1
            : profile.sessionsCompleted,
      };

      setProfile(updatedProfile);
      await db.profile.put(updatedProfile, 'user_profile');
    }

    // 4. Advance or complete session
    if (currentIndex + 1 >= sessionQueue.length) {
      setIsSessionFinished(true);
      audio.playLevelUp();
      audio.triggerHaptic('complete');
    } else {
      setCurrentIndex((prev) => prev + 1);
    }

    // Refresh words list in state
    const refreshed = await db.words.toArray();
    setAllWords(refreshed);
  };

  const handleToggleSound = async () => {
    if (!profile) return;
    const newSound = !profile.soundEnabled;
    const updated = { ...profile, soundEnabled: newSound };
    setProfile(updated);
    audio.soundEnabled = newSound;
    await db.profile.put(updated, 'user_profile');
  };

  const currentCard = sessionQueue[currentIndex];

  const sessionResult: SessionResult = {
    totalWords: sessionQueue.length,
    correctCount: sessionCorrectCount,
    xpEarned: sessionXPEarned,
    history: sessionHistory,
    timestamp: Date.now(),
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Brain className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">Loading Word Cluster...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* App Header & Navigation */}
      <Header
        profile={profile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dueCount={dueWords.length}
        totalWordsCount={allWords.length}
        onToggleSound={handleToggleSound}
      />

      {/* Main App Content Viewport */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {/* TAB 1: REVISION GAMEPLAY */}
        {activeTab === 'review' && (
          <div className="w-full">
            {isSessionFinished ? (
              <SessionSummary
                result={sessionResult}
                profile={profile}
                onRestart={() => startSession()}
                onOpenSync={() => setIsSyncModalOpen(true)}
                onViewVocabulary={() => setActiveTab('words')}
              />
            ) : currentCard ? (
              <div className="space-y-4">
                {/* Progress bar across current session queue */}
                <div className="w-full max-w-xl mx-auto flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>
                    Word {currentIndex + 1} of {sessionQueue.length}
                  </span>
                  <span>
                    Score: {sessionCorrectCount} / {currentIndex}
                  </span>
                </div>
                <div className="w-full max-w-xl mx-auto h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                    style={{
                      width: `${((currentIndex + 1) / sessionQueue.length) * 100}%`,
                    }}
                  />
                </div>

                <WordReviewCard
                  word={currentCard}
                  onAnswer={handleAnswer}
                  comboCount={comboCount}
                  streak={profile?.streak ?? 1}
                />
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-xl mx-auto space-y-4">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-xl font-bold text-white">All Caught Up for Now!</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  You have reviewed all due words according to your spaced repetition schedule.
                  You can practice any words anytime or add new vocabulary.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    onClick={() => startSession(allWords)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-3 rounded-2xl transition shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    Practice All Words ({allWords.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-5 py-3 rounded-2xl transition border border-slate-700 cursor-pointer"
                  >
                    Add More Words
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VOCABULARY LIST & DICTIONARY */}
        {activeTab === 'words' && (
          <WordManager words={allWords} onWordsUpdated={loadData} />
        )}

        {/* TAB 3: ADD WORDS (BULK OR SINGLE) */}
        {activeTab === 'add' && (
          <AddWordsView
            onWordsAdded={loadData}
            onNavigateToLibrary={() => setActiveTab('words')}
          />
        )}

        {/* TAB 4: SYNC & BACKUP */}
        {activeTab === 'sync' && (
          <div className="w-full max-w-md mx-auto">
            <SyncModal
              isOpen={true}
              onClose={() => setActiveTab('review')}
              profile={profile}
              onDataSynced={loadData}
            />
          </div>
        )}
      </main>

      {/* Sync Modal Pop-up from Session Completion */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        profile={profile}
        onDataSynced={loadData}
      />

      {/* Footer */}
      <footer className="text-center py-4 border-t border-slate-900 text-slate-600 text-[11px]">
        Word Cluster • Zero compute cost on Vercel • Offline PWA • Spaced Repetition
      </footer>
    </div>
  );
};

export default App;
