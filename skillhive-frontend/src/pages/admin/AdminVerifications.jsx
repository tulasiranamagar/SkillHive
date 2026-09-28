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

function AdminVerifications() {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] =
    useState("pending");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const [error, setError] = useState("");
  const [notes, setNotes] = useState({});

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await api.get(
        "/api/accounts/admin/verifications/",
        { params }
      );

      setRequests(getItems(response.data));
    } catch (err) {
      console.error(
        "Admin verification load error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to load verification requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const review = async (verification, status) => {
    try {
      setActionLoading(verification.id);
      setError("");

      await api.post(
        `/api/accounts/admin/verifications/${verification.id}/review/`,
        {
          status,
          admin_note:
            notes[verification.id]?.trim() || "",
        }
      );

      await loadRequests();
    } catch (err) {
      console.error(
        "Admin verification review error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to review verification request."
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
            Verification
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Review SkillHive profile verification requests.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
        >
          <option value="">All requests</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
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
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-slate-300" />

          <p className="mt-3 font-semibold text-slate-800">
            No verification requests
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const pending =
              request.status === "pending";

            return (
              <div
                key={request.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-900">
                        Verification Request #{request.id}
                      </h2>

                      <VerificationStatus
                        status={request.status}
                      />
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      User:{" "}
                      <span className="font-semibold text-slate-700">
                        {request.user?.username ||
                          request.username ||
                          request.user_username ||
                          "Unknown"}
                      </span>
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Submitted{" "}
                      {formatDate(request.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Request reason
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {request.reason ||
                      "No reason provided."}
                  </p>
                </div>

                {request.admin_note && (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Administrator note
                    </p>

                    <p className="mt-2 text-sm text-slate-700">
                      {request.admin_note}
                    </p>
                  </div>
                )}

                {pending && (
                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Administrator note
                    </label>

                    <textarea
                      value={notes[request.id] || ""}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [request.id]:
                            event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Optional note..."
                      className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    />

                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={
                          actionLoading === request.id
                        }
                        onClick={() =>
                          review(
                            request,
                            "approved"
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {actionLoading ===
                        request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}

                        Approve
                      </button>

                      <button
                        type="button"
                        disabled={
                          actionLoading === request.id
                        }
                        onClick={() =>
                          review(
                            request,
                            "rejected"
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />

                        Reject
                      </button>
                    </div>
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
          onClick={loadRequests}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      )}
    </div>
  );
}

function VerificationStatus({ status }) {
  const config = {
    pending: {
      text: "Pending",
      className: "bg-amber-50 text-amber-700",
    },
    approved: {
      text: "Approved",
      className: "bg-emerald-50 text-emerald-700",
    },
    rejected: {
      text: "Rejected",
      className: "bg-red-50 text-red-700",
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

export default AdminVerifications;