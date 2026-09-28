import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import api from "../../api/axios";

function unwrap(response) {
  const data = response?.data;

  if (data?.data !== undefined) {
    return data.data;
  }

  return data;
}

function asArray(value) {
  if (Array.isArray(value)) return value;

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.notifications)) {
    return value.notifications;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
}

function extractError(error, fallback = "Something went wrong.") {
  const data = error?.response?.data;

  if (!data) {
    return error?.message || fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  if (typeof data.error === "string") {
    return data.error;
  }

  if (data.errors && typeof data.errors === "object") {
    return Object.values(data.errors)
      .flat()
      .filter(Boolean)
      .join(" ");
  }

  return fallback;
}

function normalizeNotification(item) {
  return {
    id:
      item?.id ??
      item?.pk ??
      item?.notification_id ??
      null,

    title:
      item?.title ??
      item?.subject ??
      "Notification",

    message:
      item?.message ??
      item?.body ??
      item?.description ??
      "",

    type:
      item?.notification_type ??
      item?.type ??
      "info",

    isRead: Boolean(
      item?.is_read ??
        item?.read ??
        item?.read_at
    ),

    createdAt:
      item?.created_at ??
      item?.createdAt ??
      item?.timestamp ??
      null,

    link:
      item?.link ??
      item?.url ??
      item?.action_url ??
      null,

    metadata:
      item?.metadata ??
      item?.data ??
      {},
  };
}

function formatRelativeTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const seconds = Math.floor(
    (Date.now() - date.getTime()) / 1000
  );

  if (seconds < 0) {
    return "Just now";
  }

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);

  if (weeks < 5) {
    return `${weeks}w ago`;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getNotificationIcon(type) {
  const normalized = String(type || "").toLowerCase();

  if (
    normalized.includes("exchange") ||
    normalized.includes("request")
  ) {
    return UserPlus;
  }

  if (
    normalized.includes("verification") ||
    normalized.includes("certificate")
  ) {
    return ShieldCheck;
  }

  if (
    normalized.includes("xp") ||
    normalized.includes("badge") ||
    normalized.includes("gamification")
  ) {
    return Zap;
  }

  if (
    normalized.includes("session") ||
    normalized.includes("meeting")
  ) {
    return BellRing;
  }

  if (
    normalized.includes("system") ||
    normalized.includes("info")
  ) {
    return Info;
  }

  return Bell;
}

function getNotificationAccent(type) {
  const normalized = String(type || "").toLowerCase();

  if (
    normalized.includes("verification") ||
    normalized.includes("certificate")
  ) {
    return {
      icon: "bg-green-50 text-green-600",
      badge: "bg-green-50 text-green-700",
    };
  }

  if (
    normalized.includes("exchange") ||
    normalized.includes("request")
  ) {
    return {
      icon: "bg-blue-50 text-blue-600",
      badge: "bg-blue-50 text-blue-700",
    };
  }

  if (
    normalized.includes("xp") ||
    normalized.includes("badge") ||
    normalized.includes("gamification")
  ) {
    return {
      icon: "bg-amber-50 text-amber-600",
      badge: "bg-amber-50 text-amber-700",
    };
  }

  if (
    normalized.includes("session") ||
    normalized.includes("meeting")
  ) {
    return {
      icon: "bg-violet-50 text-violet-600",
      badge: "bg-violet-50 text-violet-700",
    };
  }

  return {
    icon: "bg-slate-100 text-slate-600",
    badge: "bg-slate-100 text-slate-700",
  };
}

function NotificationItem({
  notification,
  onRead,
  onDelete,
  readLoading,
  deleteLoading,
}) {
  const Icon = getNotificationIcon(notification.type);
  const accent = getNotificationAccent(notification.type);

  return (
    <article
      className={`group relative border-b border-slate-100 p-5 transition last:border-b-0 ${
        notification.isRead
          ? "bg-white hover:bg-slate-50"
          : "bg-blue-50/50 hover:bg-blue-50"
      }`}
    >
      {!notification.isRead && (
        <span className="absolute bottom-0 left-0 top-0 w-1 bg-blue-600" />
      )}

      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent.icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={`text-sm ${
                    notification.isRead
                      ? "font-semibold text-slate-800"
                      : "font-bold text-slate-900"
                  }`}
                >
                  {notification.title}
                </h3>

                {!notification.isRead && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    New
                  </span>
                )}
              </div>

              {notification.message && (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {notification.message}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              {formatRelativeTime(notification.createdAt)}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {notification.type && (
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${accent.badge}`}
              >
                {String(notification.type)
                  .replace(/[_-]/g, " ")
                  .replace(/\b\w/g, (letter) =>
                    letter.toUpperCase()
                  )}
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              {!notification.isRead && (
                <button
                  type="button"
                  onClick={() => onRead(notification)}
                  disabled={readLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {readLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}

                  {readLoading ? "Saving..." : "Mark read"}
                </button>
              )}

              {notification.link && (
                <a
                  href={notification.link}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Open
                  <ChevronRight className="h-3.5 w-3.5" />
                </a>
              )}

              <button
                type="button"
                onClick={() => onDelete(notification)}
                disabled={deleteLoading}
                aria-label="Delete notification"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-red-100 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Notifications() {
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [readLoadingId, setReadLoadingId] = useState(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
  });

  const pageSize = 20;

  async function requestFirstAvailable(
    endpoints,
    options = {}
  ) {
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const response = await api({
          url: endpoint,
          method: options.method || "GET",
          data: options.data,
        });

        return {
          response,
          data: unwrap(response),
        };
      } catch (requestError) {
        lastError = requestError;
      }
    }

    throw lastError || new Error("Request failed.");
  }

  async function loadNotifications(targetPage = page) {
    setLoading(true);
    setError("");

    try {
      const result = await requestFirstAvailable([
        `/api/notifications/?page=${targetPage}`,
        `/api/notifications/?page=${targetPage}&page_size=${pageSize}`,
        "/api/notifications/",
      ]);

      const data = result.data;
      const items = asArray(data).map(normalizeNotification);

      setNotifications(items);

      setPagination({
        count:
          Number(data?.count) ||
          Number(data?.total_count) ||
          Number(data?.total) ||
          items.length,
        next: data?.next || null,
        previous: data?.previous || null,
      });
    } catch (requestError) {
      setError(
        extractError(
          requestError,
          "We could not load your notifications."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications(page);
  }, [page]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.isRead
      ).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "unread" && !notification.isRead) ||
        (filter === "read" && notification.isRead);

      if (!matchesFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        notification.title,
        notification.message,
        notification.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [notifications, filter, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      Number(
        pagination.count || notifications.length
      ) / pageSize
    )
  );

  async function markAsRead(notification) {
    if (!notification?.id || notification.isRead) {
      return;
    }

    setReadLoadingId(notification.id);
    setActionError("");

    try {
      await requestFirstAvailable(
        [
          `/api/notifications/${notification.id}/read/`,
          `/api/notifications/${notification.id}/mark-read/`,
        ],
        {
          method: "POST",
        }
      );

      /*
       * Update only the selected notification.
       * Do not reload the whole page here.
       */
      setNotifications((current) =>
        current.map((item) =>
          String(item.id) === String(notification.id)
            ? {
                ...item,
                isRead: true,
              }
            : item
        )
      );
    } catch (requestError) {
      setActionError(
        extractError(
          requestError,
          "Could not mark the notification as read."
        )
      );
    } finally {
      setReadLoadingId(null);
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0) {
      return;
    }

    setMarkAllLoading(true);
    setActionError("");

    try {
      await requestFirstAvailable(
        [
          "/api/notifications/read-all/",
          "/api/notifications/mark-all-read/",
          "/api/notifications/read/",
        ],
        {
          method: "POST",
        }
      );

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );
    } catch (requestError) {
      setActionError(
        extractError(
          requestError,
          "Could not mark all notifications as read."
        )
      );
    } finally {
      setMarkAllLoading(false);
    }
  }

  async function deleteNotification(notification) {
    if (!notification?.id) {
      return;
    }

    setDeleteLoadingId(notification.id);
    setActionError("");

    try {
      await requestFirstAvailable(
        [`/api/notifications/${notification.id}/`],
        {
          method: "DELETE",
        }
      );

      setNotifications((current) =>
        current.filter(
          (item) =>
            String(item.id) !== String(notification.id)
        )
      );
    } catch (requestError) {
      setActionError(
        extractError(
          requestError,
          "Could not delete the notification."
        )
      );
    } finally {
      setDeleteLoadingId(null);
    }
  }

  function clearSearch() {
    setSearch("");
    setFilter("all");
  }

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-48 rounded-3xl bg-slate-200" />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="h-28 rounded-2xl bg-slate-200" />
              <div className="h-28 rounded-2xl bg-slate-200" />
              <div className="h-28 rounded-2xl bg-slate-200" />
            </div>

            <div className="h-20 rounded-2xl bg-slate-200" />

            <div className="h-96 rounded-2xl bg-slate-200" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="overflow-hidden rounded-3xl bg-blue-600 shadow-lg">
          <div className="relative px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  <Bell className="h-3.5 w-3.5" />
                  SkillHive updates
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Notifications
                </h1>

                <p className="mt-4 text-sm leading-7 text-blue-100 sm:text-base">
                  Stay up to date with exchange requests, sessions,
                  learning progress, certificates, verification, XP,
                  and other important SkillHive activity.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-white/10 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-blue-600">
                  <BellRing className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-xs font-semibold text-blue-100">
                    Unread
                  </p>

                  <p className="mt-1 text-2xl font-bold text-white">
                    {unreadCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Bell className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Notifications
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {pagination.count ||
                    notifications.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BellRing className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Unread
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {unreadCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <CheckCheck className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Read
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {notifications.length - unreadCount}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Controls */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Your updates
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage and review your recent activity.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search notifications..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value)
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>

              <button
                type="button"
                onClick={markAllAsRead}
                disabled={
                  markAllLoading || unreadCount === 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {markAllLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}

                {markAllLoading
                  ? "Marking..."
                  : "Mark all read"}
              </button>

              <button
                type="button"
                onClick={() => loadNotifications(page)}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loading ? "animate-spin" : ""
                  }`}
                />

                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* Errors */}
        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <X className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold">
                Could not load notifications
              </p>

              <p className="mt-1">{error}</p>
            </div>

            <button
              type="button"
              onClick={() => loadNotifications(page)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {actionError && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            <Info className="mt-0.5 h-5 w-5" />

            <p className="flex-1">{actionError}</p>

            <button
              type="button"
              onClick={() => setActionError("")}
              className="rounded-lg p-1 hover:bg-amber-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Notification list */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {filteredNotifications.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Bell className="h-7 w-7" />
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-900">
                {notifications.length === 0
                  ? "You're all caught up"
                  : "No matching notifications"}
              </h2>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                {notifications.length === 0
                  ? "New SkillHive activity will appear here when something important happens."
                  : "Try changing your search or notification filter."}
              </p>

              {(search || filter !== "all") && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={
                    notification.id ||
                    `${notification.title}-${notification.createdAt}`
                  }
                  notification={notification}
                  onRead={markAsRead}
                  onDelete={deleteNotification}
                  readLoading={
                    readLoadingId !== null &&
                    String(readLoadingId) ===
                      String(notification.id)
                  }
                  deleteLoading={
                    deleteLoadingId !== null &&
                    String(deleteLoadingId) ===
                      String(notification.id)
                  }
                />
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-sm text-slate-500">
                    Page {page} of {totalPages}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPage((current) =>
                          Math.max(1, current - 1)
                        )
                      }
                      disabled={page <= 1}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPage((current) =>
                          Math.min(
                            totalPages,
                            current + 1
                          )
                        )
                      }
                      disabled={
                        page >= totalPages ||
                        Boolean(
                          pagination.next === null &&
                            pagination.count > 0
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Notification guidance */}
        <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <BellRing className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900">
                Stay informed
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                SkillHive notifications can keep you informed about
                exchange activity, upcoming sessions, learning
                milestones, certificates, verification, and XP
                achievements.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Notifications;

