import { useEffect, useState } from "react";
import {
  Activity,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

import api from "../../api/axios";

function getItems(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
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

function AdminActivity() {
  const [logs, setLogs] = useState([]);
  const [action, setAction] = useState("");
  const [targetType, setTargetType] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (action.trim()) {
        params.action = action.trim();
      }

      if (targetType.trim()) {
        params.target_type =
          targetType.trim();
      }

      const response = await api.get(
        "/api/accounts/admin/audit-logs/",
        { params }
      );

      setLogs(getItems(response.data));
    } catch (err) {
      console.error(
        "Admin activity error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to load administrator activity."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
     
      <div>
        <p className="text-sm font-semibold text-blue-600">
          Administration
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Activity
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Review recorded administrator actions.
        </p>
      </div>

      
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={action}
              onChange={(event) =>
                setAction(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  loadLogs();
                }
              }}
              placeholder="Filter by action..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          <input
            value={targetType}
            onChange={(event) =>
              setTargetType(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                loadLogs();
              }
            }}
            placeholder="Target type..."
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
          />

          <button
            type="button"
            onClick={loadLogs}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}

            Search
          </button>
        </div>
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
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Activity className="mx-auto h-8 w-8 text-slate-300" />

          <p className="mt-3 font-semibold text-slate-800">
            No activity found
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Administrator actions will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-5"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {log.action ||
                          "Administrator action"}
                      </span>

                      {log.target_type && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {log.target_type}
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {log.description ||
                        log.detail ||
                        log.reason ||
                        `Administrator performed ${
                          log.action ||
                          "an action"
                        }.`}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      {formatDate(
                        log.created_at
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                    <p className="text-xs text-slate-400">
                      Administrator
                    </p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {log.admin?.username ||
                        log.admin_username ||
                        log.admin?.email ||
                        "Administrator"}
                    </p>

                    {log.target_user && (
                      <p className="mt-1 text-xs text-slate-500">
                        Target:{" "}
                        {log.target_user.username ||
                          log.target_user.email ||
                          "User"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <button
          type="button"
          onClick={loadLogs}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      )}
    </div>
  );
}

export default AdminActivity;