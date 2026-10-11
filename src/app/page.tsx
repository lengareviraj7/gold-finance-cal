"use client";

import React, { useState, useEffect, useCallback } from "react";
import { LogOut } from "lucide-react";
import { PinLogin } from "@/components/PinLogin";
import { Calculator } from "@/components/Calculator";
import { HistoryList } from "@/components/HistoryList";
import { SnapshotModal } from "@/components/SnapshotModal";
import { HistoryRecord } from "@/lib/types";

export default function HomePage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [selectedSnapshot, setSelectedSnapshot] = useState<HistoryRecord | null>(null);
  const [externalPreset, setExternalPreset] = useState<{
    mortgageDate: string;
    principalRupees: number;
  } | null>(null);

  // Check existing session on mount
  const checkSession = useCallback(async () => {
    try {
      setAuthChecking(true);
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setAuthenticated(data.authenticated === true);
      } else {
        setAuthenticated(false);
      }
    } catch {
      setAuthenticated(false);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Load history records from MongoDB
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
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }

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

  // Fetch history when user becomes authenticated
  useEffect(() => {
    if (authenticated) {
      fetchHistory();
    }
  }, [authenticated, fetchHistory]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setAuthenticated(false);
      setRecords([]);
    }
  };

  const handleSavedToHistory = (newRecord: HistoryRecord) => {
    setRecords((prev) => [newRecord, ...prev.filter((r) => r._id !== newRecord._id)]);
  };

  const handleDeleteRecord = async (id: string): Promise<boolean> => {
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

  const handleRecalculateAsOfToday = (mortgageDate: string, principalRupees: number) => {
    setExternalPreset({ mortgageDate, principalRupees });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#fbf9f5]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-stone-500 font-medium tracking-wide">
            Loading Siddheshwar Jewelers...
          </p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <PinLogin onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <main className="min-h-screen bg-[#fbf9f5] pb-12 pt-safe pb-safe pl-safe pr-safe">
      <div className="max-w-md mx-auto px-4 py-5 sm:py-8 space-y-6">
        {/* Brand Header */}
        <header className="flex items-center justify-between pb-3 border-b border-stone-200/80">
          <div className="space-y-0.5">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block"></span>
              Siddheshwar Jewelers
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              Gold Mortgage Interest Calculator
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 active:bg-stone-200 rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Section 1: Calculator Form and Results */}
        <section aria-label="Mortgage Interest Calculator">
          <Calculator
            onSavedToHistory={handleSavedToHistory}
            externalPreset={externalPreset}
          />
        </section>

        {/* Section 2: Saved Calculations History */}
        <section aria-label="Calculation History" className="pt-2">
          <HistoryList
            records={records}
            loading={historyLoading}
            error={historyError}
            hasMore={hasMore}
            onRefresh={() => fetchHistory(null, false)}
            onLoadMore={() => fetchHistory(nextCursor, true)}
            onViewRecord={(rec) => setSelectedSnapshot(rec)}
            onDeleteRecord={handleDeleteRecord}
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
