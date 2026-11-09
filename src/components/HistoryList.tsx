"use client";

import React, { useState } from "react";
import {
  Download,
  Eye,
  Trash2,
  RefreshCw,
  AlertTriangle,
  History,
  Calendar,
  IndianRupee,
  FlaskConical,
  RotateCcw,
} from "lucide-react";
import { HistoryRecord } from "@/lib/types";
import { formatIndianRupees, formatIndianDate } from "@/lib/calculator";

interface HistoryListProps {
  records: HistoryRecord[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onViewRecord: (record: HistoryRecord) => void;
  onDeleteRecord: (id: string) => Promise<boolean>;
  demoMode?: boolean;
  onEnableDemoMode?: () => void;
  onResetDemoData?: () => void;
  onExportCsv?: () => void;
}

export function HistoryList({
  records,
  loading,
  error,
  hasMore,
  onRefresh,
  onLoadMore,
  onViewRecord,
  onDeleteRecord,
  demoMode = false,
  onEnableDemoMode,
  onResetDemoData,
  onExportCsv,
}: HistoryListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<HistoryRecord | null>(null);

  const handleConfirmDelete = async () => {
    if (!confirmDeleteRecord || !confirmDeleteRecord._id) return;
    setDeletingId(confirmDeleteRecord._id);
    try {
      await onDeleteRecord(confirmDeleteRecord._id);
      setConfirmDeleteRecord(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <History className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
            Calculation History
          </h2>
          {demoMode && (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-300/70 dark:border-amber-700/70 rounded-full">
              Demo
            </span>
          )}
          {records.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-full">
              {records.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh history"
            title="Refresh history"
            className="p-2 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-700 dark:text-amber-400" : ""}`} />
          </button>

          {demoMode && onExportCsv ? (
            <button
              type="button"
              onClick={onExportCsv}
              disabled={records.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/70 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-amber-800 dark:text-amber-300" />
              <span>Export CSV</span>
            </button>
          ) : (
            <a
              href="/api/history/export"
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/70 rounded-xl transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-800 dark:text-amber-300" />
              <span>Export CSV</span>
            </a>
          )}
        </div>
      </div>

      {/* Error notification with Demo Mode fallback CTA when DB is offline */}
      {error && (
        <div
          role="alert"
          className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/70 text-red-800 dark:text-red-200 text-xs sm:text-sm space-y-2.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className="text-red-900 dark:text-red-200 font-semibold underline underline-offset-2 shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>

          {!demoMode && onEnableDemoMode && (
            <div className="pt-2 border-t border-red-200/70 dark:border-red-800/60 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] text-red-700 dark:text-red-300">
                Database unavailable? Test everything safely using sample data.
              </span>
              <button
                type="button"
                onClick={onEnableDemoMode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 transition cursor-pointer"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Switch to Demo Mode</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && records.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 animate-pulse space-y-2.5"
            >
              <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-1/3"></div>
              <div className="h-6 bg-stone-200 dark:bg-stone-800 rounded w-1/2"></div>
              <div className="h-4 bg-stone-100 dark:bg-stone-800/70 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && records.length === 0 && !error && (
        <div className="text-center py-12 px-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 mb-3">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
            {demoMode ? "No demo records right now" : "No saved calculations yet"}
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 max-w-xs mx-auto">
            {demoMode
              ? "Calculate an interest quote above and save it to demo history, or restore the sample records."
              : "Use the calculator above to calculate mortgage interest and click \u201cSave to History\u201d to store snapshots."}
          </p>
          {demoMode && onResetDemoData && (
            <button
              type="button"
              onClick={onResetDemoData}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-200/70 dark:hover:bg-amber-900 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Sample Records</span>
            </button>
          )}
        </div>
      )}

      {/* Compact Cards List (Mobile-First) */}
      <div className="space-y-3">
        {records.map((rec) => (
          <div
            key={rec._id}
            className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none p-4 transition hover:border-amber-300 dark:hover:border-amber-700"
          >
            {/* Top Row: Dates */}
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pb-2.5 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                <span>
                  Mortgage:{" "}
                  <strong className="text-stone-800 dark:text-stone-200">
                    {formatIndianDate(rec.mortgageDate)}
                  </strong>
                </span>
              </div>
              <div className="text-right">
                <span>
                  As-of:{" "}
                  <strong className="text-stone-700 dark:text-stone-300">
                    {formatIndianDate(rec.asOfDate)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Middle Row: Principal, Months, Total */}
            <div className="grid grid-cols-2 gap-2 my-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-stone-600 dark:text-stone-400 block">
                  Principal
                </span>
                <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center">
                  <IndianRupee className="w-3 h-3 text-stone-500 dark:text-stone-400 mr-0.5 inline" />
                  {formatIndianRupees(rec.principalRupees).replace("₹", "")}
                </span>
                <span className="text-[11px] text-stone-600 dark:text-stone-400 block mt-0.5">
                  {rec.chargeableMonths} mo @ {rec.monthlyRate}% •{" "}
                  {(rec.interestMode ??
                    (rec.ruleVersion?.includes("simple") ? "simple" : "yearly_compound")) ===
                  "yearly_compound"
                    ? "Compound"
                    : "Simple"}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-400 font-medium block">
                  Total Due
                </span>
                <span className="text-base font-bold text-amber-900 dark:text-amber-300">
                  {formatIndianRupees(rec.totalDueRupees)}
                </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-400/90 block mt-0.5">
                  Interest: {formatIndianRupees(rec.interestRupees)}
                </span>
              </div>
            </div>

            {/* Bottom Row: Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => onViewRecord(rec)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 active:bg-stone-200 dark:active:bg-stone-700 rounded-xl transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                <span>View</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmDeleteRecord(rec)}
                aria-label={`Delete record for ${formatIndianRupees(rec.principalRupees)}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50 active:bg-red-100 dark:active:bg-red-950/80 rounded-xl transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && !demoMode && (
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 active:bg-stone-100 dark:active:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load Older Calculations"}
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteRecord && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-confirm-title" className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {demoMode ? "Delete Demo Record?" : "Delete Calculation?"}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                  Are you sure you want to delete the calculation for{" "}
                  <strong className="text-stone-800 dark:text-stone-200">
                    {formatIndianRupees(confirmDeleteRecord.principalRupees)}
                  </strong>{" "}
                  from{" "}
                  <strong className="text-stone-800 dark:text-stone-200">
                    {formatIndianDate(confirmDeleteRecord.mortgageDate)}
                  </strong>
                  ? {demoMode ? "Only the local demo list will be updated." : "This cannot be undone."}
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteRecord(null)}
                disabled={deletingId !== null}
                className="flex-1 py-2.5 px-3 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium rounded-xl text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingId !== null}
                className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingId ? "Deleting..." : "Delete Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
