import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Mail,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import api from "../../api/axios";

function unwrapResponse(response) {
  return response?.data?.data ?? response?.data ?? {};
}

function normalizeMessages(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.messages)) {
    return data.messages;
  }

  return [];
}

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatusLabel(status) {
  if (status === "under_review") {
    return "Under Review";
  }

  if (status === "resolved") {
    return "Resolved";
  }

  return "New";
}

function getStatusClasses(status) {
  if (status === "resolved") {
    return "bg-green-100 text-green-700";
  }

  if (status === "under_review") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-blue-100 text-blue-700";
}

function AdminContactMessages() {
  const { messageId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [status, setStatus] = useState("new");
  const [adminNote, setAdminNote] = useState("");

  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [success, setSuccess] = useState("");

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/api/accounts/admin/contact-messages/",
        {
          params: {
            page_size: 100,
            ...(statusFilter
              ? { status: statusFilter }
              : {}),
          },
        }
      );

      const data = unwrapResponse(response);

      setMessages(normalizeMessages(data));
    } catch (err) {
      console.error(
        "Admin contact messages error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to load contact messages."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadMessage = async (id) => {
    if (!id) {
      setSelectedMessage(null);
      return;
    }

    try {
      setDetailLoading(true);
      setDetailError("");
      setSuccess("");

      const response = await api.get(
        "/api/accounts/admin/contact-messages/",
        {
          params: {
            page_size: 100,
          },
        }
      );

      const data = unwrapResponse(response);
      const allMessages = normalizeMessages(data);

      const found = allMessages.find(
        (message) =>
          String(message.id) === String(id)
      );

      if (!found) {
        setSelectedMessage(null);
        setDetailError(
          "Contact message not found."
        );
        return;
      }

      setSelectedMessage(found);
      setStatus(found.status || "new");
      setAdminNote(found.admin_note || "");
    } catch (err) {
      console.error(
        "Contact message detail error:",
        err
      );

      setDetailError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to load this contact message."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [statusFilter]);

  useEffect(() => {
    if (messageId) {
      loadMessage(messageId);
    } else {
      setSelectedMessage(null);
    }
  }, [messageId]);

  const handleReview = async () => {
    if (!selectedMessage?.id) {
      return;
    }

    try {
      setSaving(true);
      setSuccess("");
      setDetailError("");

      const response = await api.post(
        `/api/accounts/admin/contact-messages/${selectedMessage.id}/review/`,
        {
          status,
          admin_note: adminNote,
        }
      );

      const updated =
        unwrapResponse(response);

      setSelectedMessage(updated);
      setStatus(updated.status || status);
      setAdminNote(updated.admin_note || adminNote);

      setMessages((current) =>
        current.map((message) =>
          String(message.id) ===
          String(updated.id)
            ? updated
            : message
        )
      );

      setSuccess(
        "Contact message updated successfully."
      );
    } catch (err) {
      console.error(
        "Contact message review error:",
        err
      );

      setDetailError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to update this contact message."
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredMessages = messages.filter(
    (message) => {
      const term =
        search.trim().toLowerCase();

      if (!term) {
        return true;
      }

      return (
        String(message.name || "")
          .toLowerCase()
          .includes(term) ||
        String(message.email || "")
          .toLowerCase()
          .includes(term) ||
        String(message.subject || "")
          .toLowerCase()
          .includes(term) ||
        String(message.message || "")
          .toLowerCase()
          .includes(term)
      );
    }
  );

  if (messageId) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() =>
            navigate("/admin/contact-messages")
          }
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contact Messages
        </button>

        {detailLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <RefreshCw className="mx-auto h-7 w-7 animate-spin text-blue-600" />

            <p className="mt-3 text-sm text-slate-500">
              Loading contact message...
            </p>
          </div>
        ) : detailError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />

              <p className="text-sm font-medium text-red-700">
                {detailError}
              </p>
            </div>
          </div>
        ) : selectedMessage ? (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Contact Message
              </p>

              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  {selectedMessage.subject ||
                    "No subject"}
                </h1>

                <span
                  className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusClasses(
                    selectedMessage.status
                  )}`}
                >
                  {getStatusLabel(
                    selectedMessage.status
                  )}
                </span>
              </div>
            </div>

            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />

                  <p className="text-sm font-medium text-green-700">
                    {success}
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-blue-600" />

                      <p className="text-xs font-medium text-slate-500">
                        Sender
                      </p>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {selectedMessage.name ||
                        "Unknown sender"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />

                      <p className="text-xs font-medium text-slate-500">
                        Email
                      </p>
                    </div>

                    <p className="mt-2 break-all text-sm font-semibold text-slate-900">
                      {selectedMessage.email ||
                        "No email"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-slate-100 bg-white">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Message
                    </p>
                  </div>

                  <div className="p-5">
                    <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                      {selectedMessage.message ||
                        "No message content."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
                  <Clock3 className="h-4 w-4" />

                  <span>
                    Received{" "}
                    {formatDate(
                      selectedMessage.created_at
                    )}
                  </span>
                </div>
              </div>

              <div className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Review Message
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Update the message status and add an
                  internal administrator note.
                </p>

                <div className="mt-6">
                  <label className="text-sm font-semibold text-slate-700">
                    Status
                  </label>

                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="new">
                      New
                    </option>

                    <option value="under_review">
                      Under Review
                    </option>

                    <option value="resolved">
                      Resolved
                    </option>
                  </select>
                </div>

                <div className="mt-5">
                  <label className="text-sm font-semibold text-slate-700">
                    Admin Note
                  </label>

                  <textarea
                    value={adminNote}
                    onChange={(event) =>
                      setAdminNote(event.target.value)
                    }
                    rows={7}
                    maxLength={3000}
                    placeholder="Add an internal note..."
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleReview}
                  disabled={saving}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}

                  {saving
                    ? "Saving..."
                    : "Save Review"}
                </button>

                {selectedMessage.reviewed_at && (
                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    Reviewed on{" "}
                    {formatDate(
                      selectedMessage.reviewed_at
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold text-blue-600">
          SkillHive Administration
        </p>

        <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Contact Messages
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Review messages submitted through the
              public Contact Us form.
            </p>
          </div>

          <button
            type="button"
            onClick={loadMessages}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-60"
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

      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search name, email, subject, or message..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">
            All statuses
          </option>

          <option value="new">
            New
          </option>

          <option value="under_review">
            Under Review
          </option>

          <option value="resolved">
            Resolved
          </option>
        </select>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />

            <p className="text-sm font-medium text-red-700">
              {error}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-blue-600" />

          <p className="mt-3 text-sm text-slate-500">
            Loading contact messages...
          </p>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <Mail className="mx-auto h-8 w-8 text-slate-300" />

          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            No contact messages found
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            New messages submitted through Contact Us
            will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {filteredMessages.map((message) => (
              <Link
                key={message.id}
                to={`/admin/contact-messages/${message.id}`}
                className="block p-5 transition hover:bg-slate-50"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-slate-900">
                        {message.subject ||
                          "No subject"}
                      </h2>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          message.status
                        )}`}
                      >
                        {getStatusLabel(
                          message.status
                        )}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                      <span className="font-medium text-slate-700">
                        {message.name ||
                          "Unknown sender"}
                      </span>

                      <span className="hidden text-slate-300 sm:inline">
                        •
                      </span>

                      <span>
                        {message.email ||
                          "No email"}
                      </span>

                      <span className="hidden text-slate-300 sm:inline">
                        •
                      </span>

                      <span>
                        {formatDate(
                          message.created_at
                        )}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                      {message.message ||
                        "No message content."}
                    </p>
                  </div>

                  <span className="inline-flex shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700">
                    Review
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminContactMessages;
