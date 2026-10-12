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
  Database,
  Globe,
  Save,
  HelpCircle,
  Brain,
  BookOpen
} from 'lucide-react';
import type { WordItem, UserProfile, ActiveTab } from '../types';
import { db, INITIAL_SEED_WORDS } from '../db/wordsDb';
import { audio } from '../utils/audio';
import { fetchAndSyncFromExternalUrl, normalizeSyncUrl } from '../utils/syncSource';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onDataSynced: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  profile,
  onDataSynced,
  onNavigateTab,
}) => {
  const [syncSourceUrl, setSyncSourceUrl] = useState(profile?.syncSourceUrl || '');
  const [autoSyncOnLoad, setAutoSyncOnLoad] = useState(profile?.autoSyncOnLoad ?? false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [showGitHubHelp, setShowGitHubHelp] = useState(false);

  const [syncCode, setSyncCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!isOpen) return null;

  // Save the configured external source URL
  const handleSaveUrlConfig = async () => {
    try {
      const normalized = normalizeSyncUrl(syncSourceUrl);
      setSyncSourceUrl(normalized);

      const currentProfile = (await db.profile.get('user_profile')) || profile;
      if (currentProfile) {
        const updated = {
          ...currentProfile,
          syncSourceUrl: normalized,
          autoSyncOnLoad,
        };
        await db.profile.put(updated, 'user_profile');
      }

      audio.playHint();
      setImportStatus('Sync source URL saved to settings!');
      setIsError(false);
      onDataSynced();
    } catch (err) {
      setIsError(true);
      setImportStatus(`Failed to save URL: ${(err as Error).message}`);
    }
  };

  // Fetch and Sync directly from the External URL (GitHub raw, Gist, etc.)
  const handleFetchFromUrl = async () => {
    if (!syncSourceUrl.trim()) {
      setIsError(true);
      setImportStatus('Please enter a valid source URL first.');
      return;
    }

    setIsFetchingUrl(true);
    setImportStatus('Fetching vocabulary from external source...');
    setIsError(false);

    try {
      const result = await fetchAndSyncFromExternalUrl(syncSourceUrl);
      await handleSaveUrlConfig();

      audio.playSuccess();
      audio.triggerHaptic('success');
      setImportStatus(result.message);
      setIsError(false);
      onDataSynced();
    } catch (err) {
      audio.playError();
      audio.triggerHaptic('error');
      setIsError(true);
      setImportStatus(`Sync failed: ${(err as Error).message}`);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Export JSON file (to commit to GitHub repo)
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

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `words.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      audio.playSuccess();
      setImportStatus('Downloaded "words.json"! You can push this file to your GitHub repository.');
      setIsError(false);
    } catch (err) {
      setIsError(true);
      setImportStatus(`Export failed: ${(err as Error).message}`);
    }
  };

  // Copy JSON to clipboard
  const handleCopyJSON = async () => {
    try {
      const allWords = await db.words.toArray();
      const currentProfile = (await db.profile.get('user_profile')) || profile;

      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        profile: currentProfile,
        words: allWords,
      };

      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopiedJson(true);
      audio.playHint();
      setTimeout(() => setCopiedJson(false), 3000);
      setImportStatus('Copied JSON to clipboard! Paste directly into GitHub or Gist.');
      setIsError(false);
    } catch (err) {
      setIsError(true);
      setImportStatus(`Failed to copy JSON: ${(err as Error).message}`);
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
      const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
      navigator.clipboard.writeText(encoded);
      setCopiedCode(true);
      audio.playHint();
      setTimeout(() => setCopiedCode(false), 3000);
      setImportStatus('Device sync code copied! Paste it on your phone or other browser.');
      setIsError(false);
    } catch (err) {
      setIsError(true);
      setImportStatus(`Failed to generate code: ${(err as Error).message}`);
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
    } catch {
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
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
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
            Sync & Cloud Source
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure an external URL (such as GitHub) as your vocabulary source. Fetch anytime with 1 click, 100% read-only and free.
          </p>
        </div>

        {/* Status Message */}
        {importStatus && (
          <div className="space-y-2.5">
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
              <span className="flex-1 leading-relaxed">{importStatus}</span>
            </div>

            {!isError && onNavigateTab && (
              <div className="flex gap-2">
                <button
                  onClick={() => onNavigateTab('review')}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <Brain className="w-3.5 h-3.5" />
                  Practice in Revise Now
                </button>
                <button
                  onClick={() => onNavigateTab('words')}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  View in Library
                </button>
              </div>
            )}
          </div>
        )}

        {/* SECTION 1: EXTERNAL SOURCE URL (GITHUB / GIST / RAW URL) */}
        <div className="bg-slate-950/80 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <GithubIcon className="w-4 h-4 text-white" />
              External Sync Source (GitHub / Cloud)
            </p>
            <button
              onClick={() => setShowGitHubHelp(!showGitHubHelp)}
              className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              How it works
            </button>
          </div>

          {showGitHubHelp && (
            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-slate-300 space-y-2">
              <p className="font-semibold text-white">How GitHub Free Sync Works:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>Export your vocabulary as <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">words.json</code> below.</li>
                <li>Upload or commit it to any public GitHub repository (e.g. in your repo root or as a GitHub Gist).</li>
                <li>Copy the raw file URL (e.g. <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">https://raw.githubusercontent.com/.../words.json</code>) and paste it here.</li>
                <li>Whenever you click <strong>"Sync from URL"</strong>, your phone or browser pulls the latest words instantly!</li>
              </ol>
              <p className="text-[10px] text-emerald-400 font-medium">✓ No GitHub tokens or write permissions required. 100% private & read-only.</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                External Source URL (JSON or text):
              </label>
              {syncSourceUrl.trim() && normalizeSyncUrl(syncSourceUrl) !== syncSourceUrl.trim() && (
                <span className="text-[10px] text-emerald-400 font-medium">
                  ✓ Auto-converts to raw URL
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={syncSourceUrl}
                  onChange={(e) => setSyncSourceUrl(e.target.value)}
                  placeholder="https://raw.githubusercontent.com/user/repo/main/words.json"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <button
                onClick={handleSaveUrlConfig}
                title="Save URL to settings"
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition border border-slate-700 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
            {syncSourceUrl.trim() && normalizeSyncUrl(syncSourceUrl) !== syncSourceUrl.trim() && (
              <p className="text-[11px] text-slate-400 mt-1.5 truncate">
                Resolved raw target: <span className="text-indigo-300 font-mono">{normalizeSyncUrl(syncSourceUrl)}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              id="autoSync"
              checked={autoSyncOnLoad}
              onChange={(e) => {
                setAutoSyncOnLoad(e.target.checked);
                handleSaveUrlConfig();
              }}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="autoSync" className="cursor-pointer">
              Auto-fetch from this URL when app starts (if online)
            </label>
          </div>

          <button
            onClick={handleFetchFromUrl}
            disabled={isFetchingUrl || !syncSourceUrl.trim()}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingUrl ? 'animate-spin' : ''}`} />
            {isFetchingUrl ? 'Fetching & Merging...' : 'Fetch & Sync from External URL'}
          </button>
        </div>

        {/* SECTION 2: EXPORT JSON (FOR GITHUB COMMIT) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileJson className="w-3.5 h-3.5 text-emerald-400" />
            Export JSON (To Upload / Commit to GitHub)
          </p>
          <p className="text-xs text-slate-400">
            Export your current vocabulary and progress to commit to your GitHub repository.
          </p>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleExportJSON}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download words.json
            </button>

            <button
              onClick={handleCopyJSON}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              {copiedJson ? 'Copied!' : 'Copy JSON'}
            </button>
          </div>
        </div>

        {/* SECTION 3: LOCAL FILE RESTORE & QUICK SYNC CODE */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            Alternative: File Upload & Quick Code
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700 text-center">
              <Upload className="w-3.5 h-3.5" />
              Restore .json File
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>

            <button
              onClick={handleGenerateSyncCode}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-slate-700 cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              {copiedCode ? 'Code Copied!' : 'Copy Device Code'}
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={syncCode}
              onChange={(e) => setSyncCode(e.target.value)}
              placeholder="Paste sync code here..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleApplySyncCode}
              disabled={!syncCode.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium px-3.5 py-1.5 rounded-xl text-xs transition cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>

        {/* SECTION 4: ANDROID SHARE & SEED RESTORE */}
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
            Restore Starter Deck
          </button>
        </div>
      </div>
    </div>
  );
};
