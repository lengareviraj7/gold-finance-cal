"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FlaskConical, Moon, RotateCcw, Sun, X } from "lucide-react";
import { Calculator } from "@/components/Calculator";
import { HistoryList } from "@/components/HistoryList";
import { SnapshotModal } from "@/components/SnapshotModal";
import { HistoryRecord } from "@/lib/types";
import {
  getTodayKolkataDateString,
  InterestMode,
} from "@/lib/calculator";
import {
  DEMO_MODE_STORAGE_KEY,
  deleteDemoRecordFromStorage,
  downloadDemoCsv,
  isDemoRecordId,
  readDemoHistory,
  resetDemoHistoryInStorage,
  saveDemoRecordToStorage,
  THEME_STORAGE_KEY,
  ThemeMode,
} from "@/lib/demo";

export default function HomePage() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [theme, setTheme] = useState<ThemeMode>("light");
  const [demoMode, setDemoMode] = useState(false);
  const [demoRecords, setDemoRecords] = useState<HistoryRecord[]>([]);

  const [selectedSnapshot, setSelectedSnapshot] = useState<HistoryRecord | null>(null);
  const [externalPreset, setExternalPreset] = useState<{
    mortgageDate: string;
    principalRupees: number;
    monthlyRate?: number;
    interestMode?: InterestMode;
  } | null>(null);

  // Load history records from MongoDB (Live Mode only)
  const fetchHistory = useCallback(async (cursor?: string | null, append = false) => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);

      const url = new URL("/api/history", window.location.origin);
      url.searchParams.set("limit", "50");
      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }

      const res = await fetch(url.toString());
      const data = await res.json();

      if (!res.ok) {
        setHistoryError(data.error || "Unable to load calculation history.");
      } else {
        if (append) {
          setRecords((prev) => [...prev, ...(data.records || [])]);
        } else {
          setRecords(data.records || []);
        }
        setNextCursor(data.nextCursor || null);
        setHasMore(data.hasMore === true);
      }
    } catch {
      setHistoryError("Network error. Could not connect to database.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Initialize persisted theme & demo preference cleanly on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      const isDark = savedTheme === "dark";
      setTheme(isDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", isDark);

      const savedDemo = localStorage.getItem(DEMO_MODE_STORAGE_KEY) === "true";
      if (savedDemo) {
        setDemoMode(true);
        const today = getTodayKolkataDateString();
        setDemoRecords(readDemoHistory(today));
      } else {
        fetchHistory(null, false);
      }
    } catch {
      fetchHistory(null, false);
    }
  }, [fetchHistory]);

  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage errors gracefully
    }
  };

  const handleEnableDemoMode = () => {
    setDemoMode(true);
    setSelectedSnapshot(null);
    setHistoryError(null);
    try {
      localStorage.setItem(DEMO_MODE_STORAGE_KEY, "true");
      const today = getTodayKolkataDateString();
      setDemoRecords(readDemoHistory(today));
    } catch {
      setDemoRecords(readDemoHistory(getTodayKolkataDateString()));
    }
  };

  const handleDisableDemoMode = () => {
    setDemoMode(false);
    setSelectedSnapshot(null);
    try {
      localStorage.setItem(DEMO_MODE_STORAGE_KEY, "false");
    } catch {
      // Ignore storage errors gracefully
    }
    fetchHistory(null, false);
  };

  const handleToggleDemoMode = () => {
    if (demoMode) {
      handleDisableDemoMode();
    } else {
      handleEnableDemoMode();
    }
  };

  const handleResetDemoData = () => {
    const today = getTodayKolkataDateString();
    const fresh = resetDemoHistoryInStorage(today);
    setDemoRecords(fresh);
  };

  const handleSavedToHistory = (newRecord: HistoryRecord) => {
    if (demoMode || isDemoRecordId(newRecord._id)) {
      setDemoRecords((prev) => [newRecord, ...prev.filter((r) => r._id !== newRecord._id)]);
      return;
    }
    setRecords((prev) => [newRecord, ...prev.filter((r) => r._id !== newRecord._id)]);
  };

  const handleDeleteRecord = async (id: string): Promise<boolean> => {
    if (demoMode || isDemoRecordId(id)) {
      deleteDemoRecordFromStorage(id);
      setDemoRecords((prev) => prev.filter((r) => r._id !== id));
      return true;
    }

    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r._id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleRecalculateAsOfToday = (
    mortgageDate: string,
    principalRupees: number,
    monthlyRate?: number,
    interestMode?: InterestMode
  ) => {
    setExternalPreset({ mortgageDate, principalRupees, monthlyRate, interestMode });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeRecords = demoMode ? demoRecords : records;

  return (
    <main className="min-h-screen bg-[#fbf9f5] dark:bg-stone-950 pb-12 pt-safe pb-safe pl-safe pr-safe transition-colors duration-150">
      <div className="max-w-md mx-auto px-4 py-5 sm:py-8 space-y-6">
        {/* Brand Header */}
        <header className="flex items-center justify-between gap-3 pb-3 border-b border-stone-200/80 dark:border-stone-800">
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 dark:bg-amber-400 inline-block shrink-0"></span>
              <span className="truncate">Siddheshwar Jewelers</span>
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              Gold Mortgage Interest Calculator
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Demo Mode Toggle */}
            <button
              type="button"
              onClick={handleToggleDemoMode}
              aria-pressed={demoMode}
              title={demoMode ? "Switch back to Live Mode" : "Try Demo Mode with sample data"}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                demoMode
                  ? "bg-amber-100 dark:bg-amber-900/50 border-amber-500 dark:border-amber-500 text-amber-950 dark:text-amber-200 ring-1 ring-amber-500/60"
                  : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>{demoMode ? "Demo ON" : "Demo"}</span>
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="p-2 rounded-xl border bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-amber-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        {/* Active Demo Mode Banner */}
        {demoMode && (
          <div
            role="status"
            className="p-3.5 rounded-2xl bg-amber-100/80 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/80 flex items-center justify-between gap-3 flex-wrap"
          >
            <div className="flex items-start gap-2 min-w-0">
              <FlaskConical className="w-4 h-4 text-amber-800 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-amber-950 dark:text-amber-200">
                  Demo Mode Active
                </p>
                <p className="text-[11px] text-amber-900/90 dark:text-amber-300/90">
                  Sample data &amp; simulator — live database is untouched.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleResetDemoData}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={handleDisableDemoMode}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 hover:opacity-90 transition cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Exit</span>
              </button>
            </div>
          </div>
        )}

        {/* Section 1: Calculator Form and Results */}
        <section aria-label="Mortgage Interest Calculator">
          <Calculator
            onSavedToHistory={handleSavedToHistory}
            externalPreset={externalPreset}
            demoMode={demoMode}
            onSaveDemoRecord={saveDemoRecordToStorage}
            onEnableDemoMode={handleEnableDemoMode}
          />
        </section>

        {/* Section 2: Saved Calculations History */}
        <section aria-label="Calculation History" className="pt-2">
          <HistoryList
            records={activeRecords}
            loading={demoMode ? false : historyLoading}
            error={demoMode ? null : historyError}
            hasMore={demoMode ? false : hasMore}
            onRefresh={() =>
              demoMode
                ? setDemoRecords(readDemoHistory(getTodayKolkataDateString()))
                : fetchHistory(null, false)
            }
            onLoadMore={() => fetchHistory(nextCursor, true)}
            onViewRecord={(rec) => setSelectedSnapshot(rec)}
            onDeleteRecord={handleDeleteRecord}
            demoMode={demoMode}
            onEnableDemoMode={handleEnableDemoMode}
            onResetDemoData={handleResetDemoData}
            onExportCsv={() => downloadDemoCsv(demoRecords)}
          />
        </section>
      </div>

      {/* Snapshot View Modal */}
      <SnapshotModal
        record={selectedSnapshot}
        onClose={() => setSelectedSnapshot(null)}
        onRecalculateAsOfToday={handleRecalculateAsOfToday}
      />
    </main>
  );
}
