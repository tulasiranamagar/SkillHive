import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  Mail,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";
import { Link } from "react-router-dom";

import api from "../../api/axios";

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value ?? 0}
          </p>

          {description && (
            <p className="mt-1 text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-blue-50 p-3">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString();
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

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [contactMessages, setContactMessages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [contactLoading, setContactLoading] = useState(true);

  const [error, setError] = useState("");
  const [contactError, setContactError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/api/accounts/admin/dashboard/"
      );

      setDashboard(
        response.data?.data ||
          response.data ||
          {}
      );
    } catch (err) {
      console.error(
        "Admin dashboard error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to load administrator dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadContactMessages = async () => {
    try {
      setContactLoading(true);
      setContactError("");

      const response = await api.get(
        "/api/accounts/admin/contact-messages/",
        {
          params: {
            page_size: 5,
          },
        }
      );

      const responseData =
        response.data?.data ||
        response.data ||
        {};

      let messages = [];

      if (Array.isArray(responseData)) {
        messages = responseData;
      } else if (
        Array.isArray(responseData?.results)
      ) {
        messages = responseData.results;
      } else if (
        Array.isArray(responseData?.messages)
      ) {
        messages = responseData.messages;
      }

      setContactMessages(messages);
    } catch (err) {
      console.error(
        "Admin contact messages error:",
        err
      );

      setContactError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to load contact messages."
      );
    } finally {
      setContactLoading(false);
    }
  };

  const loadAll = async () => {
    await Promise.all([
      loadDashboard(),
      loadContactMessages(),
    ]);
  };

  useEffect(() => {
    loadAll();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />

          <p className="mt-3 text-sm text-slate-500">
            Loading administrator dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />

          <p className="text-sm font-medium text-red-700">
            {error}
          </p>
        </div>

        <button
          type="button"
          onClick={loadAll}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  const users = dashboard?.users || {};
  const moderation = dashboard?.moderation || {};
  const verification = dashboard?.verification || {};
  const audit = dashboard?.audit || {};
  const contact = dashboard?.contact || {};

  return (
    <div className="space-y-8">

      <div>
        <p className="text-sm font-semibold text-blue-600">
          SkillHive Administration
        </p>

        <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Monitor users, moderation, verification,
              contact messages, and administrator activity.
            </p>
          </div>

          <button
            type="button"
            onClick={loadAll}
            disabled={
              loading ||
              contactLoading
            }
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading || contactLoading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Users
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Users"
            value={users.total}
            description="All registered accounts"
            icon={Users}
          />

          <StatCard
            title="Active Users"
            value={users.active}
            description="Currently active accounts"
            icon={UserCheck}
          />

          <StatCard
            title="Inactive Users"
            value={users.inactive}
            description="Inactive accounts"
            icon={UserX}
          />

          <StatCard
            title="Verified Users"
            value={users.verified}
            description="Active verified profiles"
            icon={ShieldCheck}
          />
        </div>
      </section>


      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Moderation
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Pending Reports"
            value={moderation.pending_reports}
            description="Reports awaiting action"
            icon={FileWarning}
          />

          <StatCard
            title="Total Reports"
            value={moderation.total_reports}
            description="All submitted reports"
            icon={AlertTriangle}
          />

          <StatCard
            title="Active Restrictions"
            value={moderation.active_restrictions}
            description="Current user restrictions"
            icon={ShieldOff}
          />

          <StatCard
            title="Identifier Bans"
            value={moderation.active_identifier_bans}
            description="Active banned identifiers"
            icon={ShieldOff}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Administration
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Pending Verification"
            value={verification.pending}
            description="Requests awaiting review"
            icon={CheckCircle2}
          />

          <StatCard
            title="Audit Actions"
            value={audit.total_actions}
            description="Recorded administrator actions"
            icon={Activity}
          />

          <StatCard
            title="New Contact Messages"
            value={contact.new}
            description={`${contact.total ?? 0} total contact messages`}
            icon={Mail}
          />
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Contact Messages
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Messages submitted through the public Contact Us form.
            </p>
          </div>

          <Link
            to="/admin/contact-messages"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
          >
            <Mail className="h-4 w-4" />
            View All
          </Link>
        </div>

        {contactError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />

              <p className="text-sm font-medium text-red-700">
                {contactError}
              </p>
            </div>

            <button
              type="button"
              onClick={loadContactMessages}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : contactLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-600" />

            <p className="mt-3 text-sm text-slate-500">
              Loading contact messages...
            </p>
          </div>
        ) : contactMessages.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Mail className="h-5 w-5" />
            </div>

            <h3 className="mt-4 text-base font-semibold text-slate-900">
              No contact messages yet
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Messages submitted through Contact Us will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {contactMessages.map((message) => (
                <div
                  key={message.id}
                  className="p-5 transition hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-slate-900">
                          {message.subject ||
                            "No subject"}
                        </h3>

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

                    <Link
                      to={`/admin/contact-messages/${message.id}`}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>


      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Mail className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Contact Messages
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Review questions, suggestions, feedback, and issues
                submitted through the public Contact Us form.
              </p>

              <p className="mt-2 text-sm font-semibold text-blue-600">
                {contact.new ?? 0} new message
                {(contact.new ?? 0) === 1
                  ? ""
                  : "s"}
              </p>
            </div>
          </div>

          <Link
            to="/admin/contact-messages"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md"
          >
            Review Messages
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Quick Actions
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Link
            to="/admin/users"
            className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
          >
            Manage Users
          </Link>

          <Link
            to="/admin/reports"
            className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
          >
            Review Reports
          </Link>

          <Link
            to="/admin/verifications"
            className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
          >
            Review Verification
          </Link>

          <Link
            to="/admin/contact-messages"
            className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
          >
            Contact Messages
          </Link>

          <Link
            to="/admin/activity"
            className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
          >
            View Activity
          </Link>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;