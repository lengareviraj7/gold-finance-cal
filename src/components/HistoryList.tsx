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
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-amber-700" />
          <h2 className="text-base font-bold text-stone-900">Calculation History</h2>
          {records.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-stone-200/80 text-stone-700 rounded-full">
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
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-700" : ""}`} />
          </button>

          <a
            href="/api/history/export"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 rounded-xl transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-800" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div
          role="alert"
          className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="text-red-900 font-semibold underline underline-offset-2 shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && records.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-4 bg-white rounded-2xl border border-stone-200/80 animate-pulse space-y-2.5"
            >
              <div className="h-4 bg-stone-200 rounded w-1/3"></div>
              <div className="h-6 bg-stone-200 rounded w-1/2"></div>
              <div className="h-4 bg-stone-100 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && records.length === 0 && !error && (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-stone-200/80">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-100 text-stone-400 mb-3">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-stone-800">No saved calculations yet</h3>
          <p className="text-xs text-stone-600 mt-1 max-w-xs mx-auto">
            Use the calculator above to calculate mortgage interest and click &ldquo;Save to History&rdquo; to store snapshots.
          </p>
        </div>
      )}

      {/* Compact Cards List (Mobile-First) */}
      <div className="space-y-3">
        {records.map((rec) => (
          <div
            key={rec._id}
            className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 transition hover:border-amber-300"
          >
            {/* Top Row: Dates */}
            <div className="flex items-center justify-between text-xs text-stone-500 pb-2.5 border-b border-stone-100">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Mortgage: <strong className="text-stone-800">{formatIndianDate(rec.mortgageDate)}</strong></span>
              </div>
              <div className="text-right">
                <span>As-of: <strong className="text-stone-700">{formatIndianDate(rec.asOfDate)}</strong></span>
              </div>
            </div>

            {/* Middle Row: Principal, Months, Total */}
            <div className="grid grid-cols-2 gap-2 my-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-stone-600 block">
                  Principal
                </span>
                <span className="text-sm font-semibold text-stone-900 flex items-center">
                  <IndianRupee className="w-3 h-3 text-stone-500 mr-0.5 inline" />
                  {formatIndianRupees(rec.principalRupees).replace("₹", "")}
                </span>
                <span className="text-[11px] text-stone-600 block mt-0.5">
                  {rec.chargeableMonths} mo @ {rec.monthlyRate}%
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider text-amber-800 font-medium block">
                  Total Due
                </span>
                <span className="text-base font-bold text-amber-900">
                  {formatIndianRupees(rec.totalDueRupees)}
                </span>
                <span className="text-[11px] text-amber-700 block mt-0.5">
                  Interest: {formatIndianRupees(rec.interestRupees)}
                </span>
              </div>
            </div>

            {/* Bottom Row: Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => onViewRecord(rec)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-100 active:bg-stone-200 rounded-xl transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-stone-500" />
                <span>View</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmDeleteRecord(rec)}
                aria-label={`Delete record for ${formatIndianRupees(rec.principalRupees)}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100 rounded-xl transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 active:bg-stone-100 border border-stone-200 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-100 text-red-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-confirm-title" className="text-base font-bold text-stone-900">
                  Delete Calculation?
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Are you sure you want to delete the calculation for{" "}
                  <strong className="text-stone-800">
                    {formatIndianRupees(confirmDeleteRecord.principalRupees)}
                  </strong>{" "}
                  from{" "}
                  <strong className="text-stone-800">
                    {formatIndianDate(confirmDeleteRecord.mortgageDate)}
                  </strong>
                  ? This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteRecord(null)}
                disabled={deletingId !== null}
                className="flex-1 py-2.5 px-3 border border-stone-300 text-stone-700 font-medium rounded-xl text-xs hover:bg-stone-100 transition cursor-pointer"
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
