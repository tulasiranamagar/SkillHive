import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  RefreshCw,
  Trash2,
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

function AdminNotifications() {
  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] =
    useState(null);

  const [error, setError] = useState("");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/api/notifications/"
      );

      setNotifications(
        getItems(response.data)
      );
    } catch (err) {
      console.error(
        "Admin notifications error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markRead = async (notification) => {
    if (
      !notification?.id ||
      notification.is_read
    ) {
      return;
    }

    try {
      setActionLoading(
        `read-${notification.id}`
      );

      setError("");

      await api.post(
        `/api/notifications/${notification.id}/read/`
      );

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                is_read: true,
              }
            : item
        )
      );
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to mark notification as read."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0) {
      return;
    }

    try {
      setActionLoading("all");
      setError("");

      await api.post(
        "/api/notifications/mark-all-read/"
      );

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
        }))
      );
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to mark notifications as read."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const deleteNotification = async (
    notification
  ) => {
    if (!notification?.id) {
      return;
    }

    try {
      setActionLoading(
        `delete-${notification.id}`
      );

      setError("");

      await api.delete(
        `/api/notifications/${notification.id}/`
      );

      setNotifications((current) =>
        current.filter(
          (item) =>
            item.id !== notification.id
        )
      );
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to delete notification."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const unreadCount = notifications.filter(
    (notification) =>
      !notification.is_read
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            Administration
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Notifications
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Notifications received by the administrator
            account.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={markAllRead}
            disabled={
              unreadCount === 0 ||
              actionLoading === "all"
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading === "all" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}

            Mark all read
          </button>

          <button
            type="button"
            onClick={loadNotifications}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>
        </div>
      </div>

      {/* Unread count */}
      {unreadCount > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
          You have{" "}
          <strong>{unreadCount}</strong>{" "}
          unread notification
          {unreadCount !== 1 ? "s" : ""}.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : notifications.length === 0 ? (
        /* Empty */
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-slate-300" />

          <p className="mt-3 font-semibold text-slate-800">
            No notifications
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Administrator notifications will appear here.
          </p>
        </div>
      ) : (
        /* Notifications */
        <div className="space-y-3">
          {notifications.map(
            (notification) => (
              <div
                key={notification.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  notification.is_read
                    ? "border-slate-200"
                    : "border-blue-200 bg-blue-50/30"
                }`}
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      notification.is_read
                        ? "bg-slate-100"
                        : "bg-blue-100"
                    }`}
                  >
                    <Bell
                      className={`h-5 w-5 ${
                        notification.is_read
                          ? "text-slate-500"
                          : "text-blue-600"
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="font-semibold text-slate-900">
                        {notification.title ||
                          "Notification"}
                      </h2>

                      <span className="text-xs text-slate-400">
                        {formatDate(
                          notification.created_at
                        )}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {notification.message ||
                        "No notification message."}
                    </p>

                    {notification.type && (
                      <span className="mt-3 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                        {notification.type}
                      </span>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {!notification.is_read && (
                        <button
                          type="button"
                          onClick={() =>
                            markRead(
                              notification
                            )
                          }
                          disabled={
                            actionLoading ===
                            `read-${notification.id}`
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoading ===
                          `read-${notification.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}

                          Mark read
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          deleteNotification(
                            notification
                          )
                        }
                        disabled={
                          actionLoading ===
                          `delete-${notification.id}`
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionLoading ===
                        `delete-${notification.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}

                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default AdminNotifications;