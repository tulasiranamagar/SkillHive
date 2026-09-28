import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import api from "../../api/axios";

function getItems(data) {
  if (Array.isArray(data)) {
    return data;
  }

  return data?.results || data?.data || [];
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

function AdminReports() {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  const [notes, setNotes] = useState({});

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await api.get(
        "/api/accounts/admin/reports/",
        { params }
      );

      setReports(getItems(response.data));
    } catch (err) {
      console.error("Admin reports load error:", err);

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to load reports."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const reviewReport = async (report, status) => {
    try {
      setActionLoading(report.id);
      setError("");

      await api.post(
        `/api/accounts/admin/reports/${report.id}/review/`,
        {
          status,
          admin_note: notes[report.id]?.trim() || "",
        }
      );

      await loadReports();
    } catch (err) {
      console.error("Admin report review error:", err);

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to review report."
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            Administration
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Reports
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Review reports submitted by SkillHive users.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
        >
          <option value="">All reports</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under review</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-slate-300" />

          <p className="mt-3 font-semibold text-slate-800">
            No reports found
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isPending =
              report.status === "pending" ||
              report.status === "under_review";

            return (
              <div
                key={report.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-900">
                        Report #{report.id}
                      </h2>

                      <StatusBadge status={report.status} />
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      Target:{" "}
                      <span className="font-medium text-slate-700">
                        {report.target_type || "Unknown"}
                      </span>{" "}
                      #{report.target_id}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Submitted{" "}
                      {formatDate(report.created_at)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
                    <p className="text-xs text-slate-400">
                      Reporter
                    </p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {report.reporter_username ||
                        report.reporter?.username ||
                        report.reporter?.name ||
                        "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Reason
                    </p>

                    <p className="mt-2 text-sm text-slate-700">
                      {report.reason ||
                        "No reason provided."}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Description
                    </p>

                    <p className="mt-2 text-sm text-slate-700">
                      {report.description ||
                        "No additional description."}
                    </p>
                  </div>
                </div>

                {isPending && (
                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Administrator note
                    </label>

                    <textarea
                      value={notes[report.id] || ""}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [report.id]:
                            event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Optional note about this review..."
                      className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    />

                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={
                          actionLoading === report.id
                        }
                        onClick={() =>
                          reviewReport(
                            report,
                            "resolved"
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {actionLoading === report.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}

                        Resolve
                      </button>

                      <button
                        type="button"
                        disabled={
                          actionLoading === report.id
                        }
                        onClick={() =>
                          reviewReport(
                            report,
                            "dismissed"
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />

                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {report.admin_note && (
                  <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Administrator note
                    </p>

                    <p className="mt-2 text-sm text-slate-700">
                      {report.admin_note}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && (
        <button
          type="button"
          onClick={loadReports}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    pending: {
      text: "Pending",
      className: "bg-amber-50 text-amber-700",
    },
    under_review: {
      text: "Under review",
      className: "bg-blue-50 text-blue-700",
    },
    resolved: {
      text: "Resolved",
      className: "bg-emerald-50 text-emerald-700",
    },
    dismissed: {
      text: "Dismissed",
      className: "bg-slate-100 text-slate-600",
    },
  };

  const item = config[status] || {
    text: status || "Unknown",
    className: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.className}`}
    >
      {item.text}
    </span>
  );
}

export default AdminReports;