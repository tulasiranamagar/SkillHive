
import { useEffect, useState } from "react";
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Lock,
  Search,
  ShieldAlert,
  ShieldOff,
  UserRound,
  UserX,
  XCircle,
} from "lucide-react";

import api from "../../api/axios";

function getItems(response) {
  const data = response?.data;

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
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function isRestrictionActive(restriction) {
  if (!restriction) return false;

  if (restriction.is_active === false) {
    return false;
  }

  if (restriction.expires_at) {
    const expiry = new Date(restriction.expires_at);

    if (!Number.isNaN(expiry.getTime()) && expiry <= new Date()) {
      return false;
    }
  }

  return true;
}

function getRestrictionType(restriction) {
  return (
    restriction?.restriction_type ||
    restriction?.type ||
    restriction?.restriction ||
    ""
  ).toLowerCase();
}

function getRestrictionLabel(type) {
  if (type === "ban") return "Ban";
  if (type === "suspension") return "Restriction / Suspension";
  if (type === "warning") return "Warning";

  return type || "Restriction";
}

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [restrictionReason, setRestrictionReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [page, activeFilter]);

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (activeFilter !== "") {
        params.active = activeFilter;
      }

      const response = await api.get("/api/accounts/admin/users/", {
        params,
      });

      const items = getItems(response);

      setUsers(items);

      const data = response?.data;

      setHasNextPage(Boolean(data?.next));
      setHasPreviousPage(Boolean(data?.previous));
    } catch (err) {
      console.error("Failed to load admin users:", err);

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Failed to load users."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(event) {
    event.preventDefault();

    setPage(1);
    await loadUsers();
  }

  async function loadUserDetail(userId) {
    try {
      setDetailLoading(true);
      setError("");
      setMessage("");

      const response = await api.get(
        `/api/accounts/admin/users/${userId}/`
      );

      const data = response?.data;

      setSelectedUser(data);
    } catch (err) {
      console.error("Failed to load user details:", err);

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Failed to load user details."
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function handleUserClick(user) {
    const userId = user?.id;

    if (!userId) return;

    if (selectedUser?.user?.id === userId) {
      setSelectedUser(null);
      setRestrictionReason("");
      setExpiresAt("");
      return;
    }

    loadUserDetail(userId);
  }

  async function applyRestriction(type) {
    if (!selectedUser?.user?.id) {
      setError("Please select a user first.");
      return;
    }

    if (!restrictionReason.trim()) {
      setError("Please enter a reason before applying this action.");
      return;
    }

    const typeLabels = {
      warning: "warning",
      suspension: "restriction",
      ban: "ban",
    };

    const label = typeLabels[type] || type;

    const confirmed = window.confirm(
      `Are you sure you want to apply ${label} to this user?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const payload = {
        restriction_type: type,
        reason: restrictionReason.trim(),
      };

      if (expiresAt) {
        payload.expires_at = new Date(expiresAt).toISOString();
      }

      await api.post(
        `/api/accounts/admin/users/${selectedUser.user.id}/restriction/`,
        payload
      );

      setMessage(
        type === "ban"
          ? "User has been banned successfully."
          : type === "suspension"
            ? "User has been restricted successfully."
            : "Warning has been applied successfully."
      );

      setRestrictionReason("");
      setExpiresAt("");

      await loadUserDetail(selectedUser.user.id);
      await loadUsers();
    } catch (err) {
      console.error("Failed to apply restriction:", err);

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Failed to apply moderation action."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function removeRestriction(restriction) {
    if (!restriction?.id) {
      setError("This restriction does not have a valid ID.");
      return;
    }

    const type = getRestrictionType(restriction);

    let actionName = "remove this restriction";

    if (type === "ban") {
      actionName = "unban / reopen this user";
    } else if (type === "suspension") {
      actionName = "unrestrict / reopen this user";
    } else if (type === "warning") {
      actionName = "remove this warning";
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${actionName}?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await api.post(
        `/api/accounts/admin/restrictions/${restriction.id}/remove/`
      );

      setMessage(
        type === "ban"
          ? "Ban removed. The account can reopen if no other active restriction or deactivation remains."
          : type === "suspension"
            ? "Restriction removed. The account can reopen if no other active restriction or deactivation remains."
            : "Warning removed successfully."
      );

      await loadUserDetail(selectedUser.user.id);
      await loadUsers();
    } catch (err) {
      console.error("Failed to remove restriction:", err);

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Failed to remove restriction."
      );
    } finally {
      setActionLoading(false);
    }
  }

  function getUserName(user) {
    return (
      user?.name ||
      user?.full_name ||
      user?.username ||
      user?.email ||
      "Unknown User"
    );
  }

  function getUserUsername(user) {
    if (!user?.username) return "";

    return user.username.startsWith("@")
      ? user.username
      : `@${user.username}`;
  }

  function getSelectedUserStatus() {
    const user = selectedUser?.user;

    if (!user) {
      return {
        label: "Unknown",
        className: "bg-slate-100 text-slate-700",
      };
    }

    if (user.is_active === false) {
      return {
        label: "Inactive",
        className: "bg-red-100 text-red-700",
      };
    }

    return {
      label: "Active",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  const selectedStatus = getSelectedUserStatus();

  const restrictions = Array.isArray(selectedUser?.restrictions)
    ? selectedUser.restrictions
    : [];

  const activeRestrictions = restrictions.filter(isRestrictionActive);

  const hasActiveBan = activeRestrictions.some(
    (restriction) => getRestrictionType(restriction) === "ban"
  );

  const hasActiveSuspension = activeRestrictions.some(
    (restriction) => getRestrictionType(restriction) === "suspension"
  );

  return (
    <div className="min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                User Management
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Search users, inspect accounts, and manage moderation actions.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
              <UserRound className="h-4 w-4" />
              <span>{users.length} users shown</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Search / Filters */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 lg:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, username, or email..."
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={activeFilter}
              onChange={(event) => {
                setActiveFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All users</option>
              <option value="true">Active users</option>
              <option value="false">Inactive users</option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}

              Search
            </button>
          </form>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          {/* Users */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Users</h2>
              <p className="mt-1 text-xs text-slate-500">
                Click a user to inspect the account and moderation history.
              </p>
            </div>

            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
                  <p className="mt-3 text-sm text-slate-500">
                    Loading users...
                  </p>
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="flex min-h-[300px] items-center justify-center px-6 text-center">
                <div>
                  <UserRound className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 font-medium text-slate-700">
                    No users found
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Try another search or filter.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {users.map((user) => {
                  const isSelected =
                    selectedUser?.user?.id === user.id;

                  const active = user?.is_active !== false;

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleUserClick(user)}
                      className={`flex w-full items-center gap-4 px-5 py-4 text-left transition ${
                        isSelected
                          ? "bg-blue-50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <UserRound className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-slate-900">
                            {getUserName(user)}
                          </p>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <p className="mt-0.5 truncate text-sm text-slate-500">
                          {getUserUsername(user) ||
                            user?.email ||
                            "No username"}
                        </p>

                        {user?.email && user?.username && (
                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            {user.email}
                          </p>
                        )}
                      </div>

                      <ChevronRight
                        className={`h-5 w-5 shrink-0 ${
                          isSelected
                            ? "text-blue-600"
                            : "text-slate-300"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                disabled={!hasPreviousPage || loading}
                onClick={() => setPage((current) => current - 1)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <span className="text-sm text-slate-500">
                Page {page}
              </span>

              <button
                type="button"
                disabled={!hasNextPage || loading}
                onClick={() => setPage((current) => current + 1)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          {/* User Details */}
          <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {!selectedUser ? (
              <div className="flex min-h-[500px] items-center justify-center px-6 text-center">
                <div>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                    <ShieldAlert className="h-7 w-7 text-blue-600" />
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-900">
                    Select a user
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Select a user from the list to view account details and
                    moderation controls.
                  </p>
                </div>
              </div>
            ) : detailLoading ? (
              <div className="flex min-h-[500px] items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
                  <p className="mt-3 text-sm text-slate-500">
                    Loading user details...
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {/* Selected User Header */}
                <div className="border-b border-slate-200 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <UserRound className="h-7 w-7" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-bold text-slate-900">
                        {getUserName(selectedUser.user)}
                      </h2>

                      <p className="mt-0.5 truncate text-sm text-slate-500">
                        {getUserUsername(selectedUser.user)}
                      </p>

                      {selectedUser.user?.email && (
                        <p className="mt-1 break-all text-xs text-slate-400">
                          {selectedUser.user.email}
                        </p>
                      )}

                      <span
                        className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${selectedStatus.className}`}
                      >
                        {selectedStatus.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div className="border-b border-slate-200 p-5">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Account Information
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-slate-500">User ID</span>
                      <span className="break-all text-right font-medium text-slate-700">
                        {selectedUser.user?.id ?? "—"}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <span className="text-slate-500">Role</span>
                      <span className="font-medium text-slate-700">
                        {selectedUser.profile?.role ||
                          selectedUser.user?.role ||
                          "User"}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <span className="text-slate-500">Joined</span>
                      <span className="text-right font-medium text-slate-700">
                        {formatDate(
                          selectedUser.user?.date_joined ||
                            selectedUser.user?.created_at
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Moderation Actions */}
                <div className="border-b border-slate-200 p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Moderation Actions
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Choose an action below. A reason is required for every
                      moderation action.
                    </p>
                  </div>

                  {/* Reason */}
                  <div className="mb-4">
                    <label className="mb-2 block text-xs font-semibold text-slate-700">
                      Reason
                    </label>

                    <textarea
                      value={restrictionReason}
                      onChange={(event) =>
                        setRestrictionReason(event.target.value)
                      }
                      rows={3}
                      placeholder="Enter the reason for this moderation action..."
                      className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Expiry */}
                  <div className="mb-4">
                    <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <Clock3 className="h-3.5 w-3.5" />
                      Expiry (optional)
                    </label>

                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(event) =>
                        setExpiresAt(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                    <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
                      Leave empty for a restriction without an expiry.
                    </p>
                  </div>

                  {/* Separate Restriction Buttons */}
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => applyRestriction("suspension")}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}

                      Restrict / Suspend User
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => applyRestriction("ban")}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Ban className="h-4 w-4" />
                      )}

                      Ban User
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => applyRestriction("warning")}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldAlert className="h-4 w-4" />
                      )}

                      Issue Warning
                    </button>
                  </div>
                </div>

                {/* Active Restrictions */}
                <div className="p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Active Restrictions
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Remove an active action to reopen the account when
                        allowed by the backend.
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {activeRestrictions.length}
                    </span>
                  </div>

                  {activeRestrictions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
                      <ShieldOff className="mx-auto h-6 w-6 text-slate-300" />

                      <p className="mt-2 text-sm font-medium text-slate-700">
                        No active restrictions
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        This user currently has no active moderation action.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeRestrictions.map((restriction) => {
                        const type =
                          getRestrictionType(restriction);

                        const isBan = type === "ban";
                        const isSuspension = type === "suspension";

                        return (
                          <div
                            key={restriction.id}
                            className={`rounded-xl border p-4 ${
                              isBan
                                ? "border-red-200 bg-red-50"
                                : isSuspension
                                  ? "border-amber-200 bg-amber-50"
                                  : "border-slate-200 bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                  isBan
                                    ? "bg-red-100 text-red-600"
                                    : isSuspension
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {isBan ? (
                                  <Ban className="h-4 w-4" />
                                ) : isSuspension ? (
                                  <Lock className="h-4 w-4" />
                                ) : (
                                  <ShieldAlert className="h-4 w-4" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-bold text-slate-900">
                                    {getRestrictionLabel(type)}
                                  </p>

                                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                    Active
                                  </span>
                                </div>

                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                  {restriction.reason ||
                                    "No reason provided."}
                                </p>

                                <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                                  {restriction.created_at && (
                                    <p>
                                      Applied:{" "}
                                      {formatDate(
                                        restriction.created_at
                                      )}
                                    </p>
                                  )}

                                  {restriction.expires_at && (
                                    <p>
                                      Expires:{" "}
                                      {formatDate(
                                        restriction.expires_at
                                      )}
                                    </p>
                                  )}
                                </div>

                                {/* Explicit Remove Buttons */}
                                <div className="mt-3">
                                  {isBan ? (
                                    <button
                                      type="button"
                                      disabled={actionLoading}
                                      onClick={() =>
                                        removeRestriction(restriction)
                                      }
                                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {actionLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <ShieldOff className="h-4 w-4" />
                                      )}

                                      Unban / Reopen User
                                    </button>
                                  ) : isSuspension ? (
                                    <button
                                      type="button"
                                      disabled={actionLoading}
                                      onClick={() =>
                                        removeRestriction(restriction)
                                      }
                                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {actionLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <ShieldOff className="h-4 w-4" />
                                      )}

                                      Unrestrict / Reopen User
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={actionLoading}
                                      onClick={() =>
                                        removeRestriction(restriction)
                                      }
                                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs font-bold text-slate-700 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {actionLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                      )}

                                      Remove Warning
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Helpful Status */}
                  {(hasActiveBan || hasActiveSuspension) && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-xs leading-5 text-blue-700">
                      <UserX className="mt-0.5 h-4 w-4 shrink-0" />

                      <p>
                        Removing a ban or restriction sends the request to the
                        existing backend moderation logic. The account will
                        only become active when no other active restriction or
                        applicable deactivation remains.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

export default AdminUsers;

