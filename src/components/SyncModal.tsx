import React, { useState } from 'react';
import {
  Download,
  Upload,
  Copy,
  Check,
  Share2,
  RefreshCw,
  X,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Database
} from 'lucide-react';
import type { WordItem, UserProfile } from '../types';
import { db, INITIAL_SEED_WORDS } from '../db/wordsDb';
import { audio } from '../utils/audio';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onDataSynced: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  profile,
  onDataSynced,
}) => {
  const [syncCode, setSyncCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!isOpen) return null;

  // Export JSON file
  const handleExportJSON = async () => {
    try {
      const allWords = await db.words.toArray();
      const currentProfile = (await db.profile.get('user_profile')) || profile;

      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        profile: currentProfile,
        words: allWords,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `word-cluster-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      audio.playSuccess();
      setImportStatus('Backup JSON downloaded successfully!');
      setIsError(false);
    } catch (err) {
      setIsError(true);
      setImportStatus(`Export failed: ${(err as Error).message}`);
    }
  };

  // Import JSON file
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (!data.words || !Array.isArray(data.words)) {
          throw new Error('Invalid backup file structure: missing words array.');
        }

        // Restore or merge words
        await db.words.bulkPut(data.words);

        // Restore profile if present
        if (data.profile) {
          await db.profile.put(data.profile, 'user_profile');
        }

        audio.playSuccess();
        audio.triggerHaptic('success');
        setImportStatus(`Successfully restored ${data.words.length} words and user progress!`);
        setIsError(false);
        onDataSynced();
      } catch (err) {
        audio.playError();
        setIsError(true);
        setImportStatus(`Import failed: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  // Generate Base64 Quick Sync Code
  const handleGenerateSyncCode = async () => {
    try {
      const allWords = await db.words.toArray();
      const currentProfile = (await db.profile.get('user_profile')) || profile;

      const payload = {
        p: currentProfile,
        w: allWords,
      };

      const jsonStr = JSON.stringify(payload);
      // UTF-8 safe base64 encoding
      const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
      navigator.clipboard.writeText(encoded);
      setCopied(true);
      audio.playHint();
      setTimeout(() => setCopied(false), 3000);
      setImportStatus('Sync code copied to clipboard! Paste it on your other device.');
      setIsError(false);
    } catch (err) {
      setIsError(true);
      setImportStatus(`Failed to generate sync code: ${(err as Error).message}`);
    }
  };

  // Apply pasted Sync Code
  const handleApplySyncCode = async () => {
    if (!syncCode.trim()) return;

    try {
      const decodedJson = decodeURIComponent(escape(atob(syncCode.trim())));
      const data = JSON.parse(decodedJson);

      if (data.w && Array.isArray(data.w)) {
        await db.words.bulkPut(data.w);
      }
      if (data.p) {
        await db.profile.put(data.p, 'user_profile');
      }

      audio.playSuccess();
      audio.triggerHaptic('success');
      setImportStatus('Progress synced successfully from code!');
      setIsError(false);
      setSyncCode('');
      onDataSynced();
    } catch (err) {
      audio.playError();
      setIsError(true);
      setImportStatus('Invalid sync code. Please check and try again.');
    }
  };

  // Android Web Share
  const handleNativeShare = async () => {
    try {
      const allWords = await db.words.toArray();
      const currentProfile = (await db.profile.get('user_profile')) || profile;

      if (navigator.share) {
        await navigator.share({
          title: 'Word Cluster Progress Backup',
          text: `My Word Cluster vocabulary backup (${allWords.length} words, ${currentProfile?.xp ?? 0} XP)`,
          url: window.location.href,
        });
        audio.playSuccess();
      } else {
        handleExportJSON();
      }
    } catch (err) {
      // User cancelled share
    }
  };

  // Restore Default Seeds
  const handleResetSeeds = async () => {
    if (window.confirm('Restore initial default 25 vocabulary words? Your custom words will remain intact.')) {
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
      await db.words.bulkPut(seedRecords);
      audio.playSuccess();
      setImportStatus('Default vocabulary starter pack refreshed!');
      setIsError(false);
      onDataSynced();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-400" />
            Sync & Backup Progress
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Zero-cost, private, and 100% offline-compatible. Sync between your browser and Android phone effortlessly.
          </p>
        </div>

        {/* Status Message */}
        {importStatus && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
              isError
                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            }`}
          >
            {isError ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{importStatus}</span>
          </div>
        )}

        {/* Section 1: File Backup & Restore */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileJson className="w-3.5 h-3.5 text-indigo-400" />
            Option 1: JSON File Backup & Restore
          </p>
          <p className="text-xs text-slate-400">
            Download your full vocabulary deck and learning stats as a lightweight file.
          </p>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleExportJSON}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Backup
            </button>

            <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700 text-center">
              <Upload className="w-3.5 h-3.5" />
              Restore File
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Section 2: Quick Cross-Device Sync Code */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            Option 2: Cross-Device Quick Sync Code
          </p>
          <p className="text-xs text-slate-400">
            Copy code here, then open Word Cluster on your phone or other browser and paste it.
          </p>

          <button
            onClick={handleGenerateSyncCode}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-slate-700 cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
            {copied ? 'Copied to Clipboard!' : 'Copy My Device Sync Code'}
          </button>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={syncCode}
              onChange={(e) => setSyncCode(e.target.value)}
              placeholder="Paste sync code from other device..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleApplySyncCode}
              disabled={!syncCode.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-xl text-xs transition cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Section 3: Android Share & Reset */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handleNativeShare}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share / Save to Drive
          </button>

          <button
            onClick={handleResetSeeds}
            className="text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1.5 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            Restore Starter Words
          </button>
        </div>
      </div>
    </div>
  );
};
