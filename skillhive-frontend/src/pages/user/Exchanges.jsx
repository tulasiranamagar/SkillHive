import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Handshake,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import api from "../../api/axios";

const emptyForm = {
  title: "",
  description: "",
  offered_skill_name: "",
  requested_skill_name: "",
  scheduled_at: "",
  duration_minutes: "60",
};

function formatDateTime(value) {
  if (!value) return "No schedule";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toLocalDateTimeInput(date) {
  const pad = (value) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function getMinimumDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 5);

  return toLocalDateTimeInput(date);
}

function getCreatorName(creator) {
  if (!creator) return "Unknown user";

  return (
    creator.full_name ||
    `${creator.first_name || ""} ${creator.last_name || ""}`.trim() ||
    creator.username ||
    "Unknown user"
  );
}

function getCurrentUserFromResponse(data) {
  return (
    data?.data?.user ||
    data?.user ||
    data?.data?.profile?.user ||
    data?.data ||
    data ||
    null
  );
}

function getUserId(user) {
  return user?.id ?? user?.user_id ?? user?.pk ?? null;
}

function getCreatorId(exchange) {
  return (
    exchange?.creator?.id ??
    exchange?.creator?.user_id ??
    exchange?.creator_id ??
    null
  );
}

function isSameUser(exchange, currentUser) {
  if (!exchange || !currentUser) return false;

  const creatorId = getCreatorId(exchange);
  const currentUserId = getUserId(currentUser);

  if (creatorId != null && currentUserId != null) {
    return String(creatorId) === String(currentUserId);
  }

  const creatorUsername = exchange?.creator?.username;
  const currentUsername = currentUser?.username;

  if (creatorUsername && currentUsername) {
    return (
      creatorUsername.toLowerCase() ===
      currentUsername.toLowerCase()
    );
  }

  return false;
}

function getRequestPost(request) {
  return request?.post || request?.exchange || null;
}

function isAcceptedRequest(request) {
  return String(request?.status || "").toLowerCase() === "accepted";
}

/*
 * An exchange remains active unless it has explicitly
 * been cancelled.
 *
 * A "closed" exchange can still be relevant to a user
 * who already joined it, so we do not remove closed
 * exchanges from My Exchanges.
 */
function isActiveExchange(exchange) {
  if (!exchange) return false;

  const status = String(exchange.status || "").toLowerCase();

  return !["cancelled", "cancelled_post"].includes(status);
}

/*
 * Discover should only contain exchanges that are
 * currently available for other users to request.
 */
function isDiscoverableExchange(exchange) {
  if (!isActiveExchange(exchange)) return false;

  const status = String(exchange.status || "").toLowerCase();

  return status === "open";
}

/*
 * Search helper.
 *
 * Searches the fields that are actually useful when
 * looking for a skill exchange:
 *
 * - title
 * - description
 * - offered skill
 * - requested skill
 * - creator name
 * - creator username
 */
function exchangeMatchesSearch(exchange, query) {
  if (!query.trim()) return true;

  const normalizedQuery = query.trim().toLowerCase();

  const creator = exchange?.creator || {};

  const searchableFields = [
    exchange?.title,
    exchange?.description,
    exchange?.offered_skill_name,
    exchange?.requested_skill_name,
    creator?.full_name,
    creator?.first_name,
    creator?.last_name,
    creator?.username,
  ];

  return searchableFields.some((field) =>
    String(field || "")
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

function SkillPill({ children, muted = false }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1.5 text-xs font-medium ${
        muted
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-blue-200 bg-blue-50 text-blue-700"
      }`}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

function ExchangeCard({ exchange, onOpen }) {
  const creatorName = getCreatorName(exchange.creator);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg">
      <div className="flex-1 p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <UserRound size={19} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {creatorName}
              </p>

              {exchange.creator?.username && (
                <p className="truncate text-xs text-slate-500">
                  @{exchange.creator.username}
                </p>
              )}
            </div>
          </div>

          <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
            {exchange.status === "open" ? "Open" : "Active"}
          </span>
        </div>

        <h3 className="line-clamp-2 text-lg font-bold tracking-tight text-slate-950">
          {exchange.title}
        </h3>

        {exchange.description && (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
            {exchange.description}
          </p>
        )}

        <div className="mt-5 rounded-xl bg-blue-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-blue-500">
                Can share
              </p>

              <SkillPill>
                {exchange.offered_skill_name || "Not specified"}
              </SkillPill>
            </div>

            <ArrowRight
              className="hidden shrink-0 text-blue-300 sm:block"
              size={18}
            />

            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-blue-500">
                Wants to learn
              </p>

              <SkillPill muted>
                {exchange.requested_skill_name || "Not specified"}
              </SkillPill>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays
              size={15}
              className="shrink-0 text-blue-500"
            />

            <span className="truncate">
              {formatDateTime(exchange.scheduled_at)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock3
              size={15}
              className="shrink-0 text-blue-500"
            />

            <span>
              {exchange.duration_minutes || 0} minutes
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-blue-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <MessageSquare size={15} />

          <span>
            {exchange.request_count || 0} request
            {exchange.request_count === 1 ? "" : "s"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpen(exchange.id)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          View
          <ArrowRight size={15} />
        </button>
      </div>
    </article>
  );
}

function CreateExchangeModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    ...emptyForm,
    scheduled_at: getMinimumDateTime(),
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const validate = () => {
    const title = form.title.trim();
    const offered = form.offered_skill_name.trim();
    const requested = form.requested_skill_name.trim();

    if (!title) {
      return "Please enter an exchange title.";
    }

    if (!offered) {
      return "Please enter the skill you can share.";
    }

    if (!requested) {
      return "Please enter the skill you want to learn.";
    }

    if (offered.toLowerCase() === requested.toLowerCase()) {
      return "The skill you share and the skill you want to learn must be different.";
    }

    if (!form.scheduled_at) {
      return "Please choose a date and time.";
    }

    const selectedDate = new Date(form.scheduled_at);

    if (
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate.getTime() <= Date.now()
    ) {
      return "The exchange schedule must be in the future.";
    }

    const duration = Number(form.duration_minutes);

    if (!Number.isInteger(duration) || duration < 1 || duration > 480) {
      return "Duration must be between 1 and 480 minutes.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        offered_skill_name: form.offered_skill_name.trim(),
        requested_skill_name: form.requested_skill_name.trim(),
        scheduled_at: new Date(
          form.scheduled_at
        ).toISOString(),
        duration_minutes: Number(form.duration_minutes),
      };

      const response = await api.post(
        "/api/exchanges/posts/",
        payload
      );

      onCreated(response.data);
      onClose();
    } catch (err) {
      const data = err?.response?.data;

      let message =
        "Unable to save the exchange. Please try again.";

      if (typeof data === "string") {
        message = data;
      } else if (data?.detail) {
        message = data.detail;
      } else if (data && typeof data === "object") {
        const firstError = Object.values(data).flat?.()[0];

        if (firstError) {
          message = String(firstError);
        }
      }

      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-blue-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-3xl">
        <div className="flex items-start justify-between border-b border-blue-100 px-5 py-5 sm:px-7">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Handshake size={18} />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                New exchange
              </span>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              Create a skill exchange
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Offer a skill you know and request something you want
              to learn.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto px-5 py-6 sm:px-7"
        >
          {error && (
            <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-5 text-blue-700">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Exchange title
              </label>

              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  updateField("title", e.target.value)
                }
                placeholder="e.g. I can teach React in exchange for UI/UX"
                maxLength={200}
                className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Description
                <span className="ml-2 font-normal text-slate-400">
                  Optional
                </span>
              </label>

              <textarea
                value={form.description}
                onChange={(e) =>
                  updateField("description", e.target.value)
                }
                placeholder="Tell people what you would like to exchange..."
                rows={4}
                className="w-full resize-none rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Skill I can share
                </label>

                <input
                  type="text"
                  value={form.offered_skill_name}
                  onChange={(e) =>
                    updateField(
                      "offered_skill_name",
                      e.target.value
                    )
                  }
                  placeholder="e.g. React"
                  maxLength={150}
                  className="w-full rounded-xl border border-blue-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Enter the skill manually.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Skill I want to learn
                </label>

                <input
                  type="text"
                  value={form.requested_skill_name}
                  onChange={(e) =>
                    updateField(
                      "requested_skill_name",
                      e.target.value
                    )
                  }
                  placeholder="e.g. Figma"
                  maxLength={150}
                  className="w-full rounded-xl border border-blue-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />

                <p className="mt-2 text-xs text-slate-400">
                  This does not change your profile skills.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays
                  size={17}
                  className="text-blue-600"
                />

                <h3 className="text-sm font-bold text-slate-900">
                  Session schedule
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600">
                    Date & time
                  </label>

                  <input
                    type="datetime-local"
                    min={getMinimumDateTime()}
                    value={form.scheduled_at}
                    onChange={(e) =>
                      updateField(
                        "scheduled_at",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600">
                    Duration
                  </label>

                  <select
                    value={form.duration_minutes}
                    onChange={(e) =>
                      updateField(
                        "duration_minutes",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">90 minutes</option>
                    <option value="120">2 hours</option>
                    <option value="180">3 hours</option>
                    <option value="240">4 hours</option>
                    <option value="480">8 hours</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-blue-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-blue-200 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={17} />
                  Save Exchange
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Exchanges() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("discover");

  const [exchanges, setExchanges] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  const loadCurrentUser = async () => {
    try {
      const response = await api.get("/api/accounts/me/");

      setCurrentUser(
        getCurrentUserFromResponse(response.data)
      );
    } catch {
      setCurrentUser(null);
    }
  };

  /*
   * Load the complete exchange pool.
   *
   * Search is intentionally handled on the frontend.
   * This avoids depending on whether the backend posts
   * endpoint supports a "search" query parameter.
   */
  const loadExchanges = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        "/api/exchanges/posts/"
      );

      setExchanges(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to load exchanges right now."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    setRequestsLoading(true);

    try {
      const [sentResponse, receivedResponse] =
        await Promise.all([
          api.get("/api/exchanges/requests/sent/"),
          api.get("/api/exchanges/requests/received/"),
        ]);

      setSentRequests(
        Array.isArray(sentResponse.data)
          ? sentResponse.data
          : []
      );

      setReceivedRequests(
        Array.isArray(receivedResponse.data)
          ? receivedResponse.data
          : []
      );
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to load exchange requests."
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        loadCurrentUser(),
        loadExchanges(),
        loadRequests(),
      ]);
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === "requests") {
      loadRequests();
    }
  }, [activeTab]);

  /*
   * Exchanges created by the logged-in user.
   *
   * These remain in My Exchanges even if the post is
   * closed, because it is still the user's exchange.
   */
  const createdExchanges = useMemo(() => {
    return exchanges.filter(
      (exchange) =>
        isSameUser(exchange, currentUser) &&
        isActiveExchange(exchange)
    );
  }, [exchanges, currentUser]);

  /*
   * Exchanges where the logged-in user's request
   * was accepted.
   *
   * The request normally contains the related post.
   */
  const joinedExchanges = useMemo(() => {
    const acceptedPosts = sentRequests
      .filter(isAcceptedRequest)
      .map(getRequestPost)
      .filter(Boolean)
      .filter(isActiveExchange);

    return acceptedPosts;
  }, [sentRequests]);

  /*
   * Combine created + joined exchanges and remove
   * duplicates.
   */
  const myExchanges = useMemo(() => {
    const combined = [
      ...createdExchanges,
      ...joinedExchanges,
    ];

    const unique = new Map();

    combined.forEach((exchange) => {
      if (!exchange?.id) return;

      unique.set(String(exchange.id), exchange);
    });

    return Array.from(unique.values());
  }, [createdExchanges, joinedExchanges]);

  /*
   * Discover contains only:
   *
   * - active exchanges
   * - open exchanges
   * - exchanges created by other users
   */
  const discoverExchanges = useMemo(() => {
    return exchanges.filter(
      (exchange) =>
        !isSameUser(exchange, currentUser) &&
        isDiscoverableExchange(exchange)
    );
  }, [exchanges, currentUser]);

  /*
   * Search My Exchanges locally.
   */
  const searchedMyExchanges = useMemo(() => {
    return myExchanges.filter((exchange) =>
      exchangeMatchesSearch(exchange, search)
    );
  }, [myExchanges, search]);

  /*
   * Search Discover locally.
   */
  const searchedDiscoverExchanges = useMemo(() => {
    return discoverExchanges.filter((exchange) =>
      exchangeMatchesSearch(exchange, search)
    );
  }, [discoverExchanges, search]);

  const pendingReceived = useMemo(
    () =>
      receivedRequests.filter(
        (request) => request.status === "pending"
      ),
    [receivedRequests]
  );

  const handleCreated = (exchange) => {
    if (exchange) {
      setExchanges((current) => [
        exchange,
        ...current,
      ]);
    }

    setSearch("");
    setActiveTab("mine");
  };

  const tabs = [
    {
      id: "discover",
      label: "Discover",
      icon: Sparkles,
    },
    {
      id: "mine",
      label: "My Exchanges",
      icon: Handshake,
    },
    {
      id: "requests",
      label: "Requests",
      icon: Send,
      count: pendingReceived.length,
    },
  ];

  const visibleExchanges =
    activeTab === "mine"
      ? searchedMyExchanges
      : searchedDiscoverExchanges;

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="overflow-hidden rounded-3xl bg-blue-700 shadow-xl">
          <div className="relative px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

            <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" />

            <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  <Handshake size={14} />
                  Peer-to-peer skill exchange
                </div>

                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Exchange skills. Learn from people.
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
                  Create an exchange, offer something you know,
                  and find someone who wants to share the skill
                  you are looking for.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-lg transition hover:bg-blue-50"
              >
                <Plus size={18} />
                Create Exchange
              </button>
            </div>
          </div>
        </section>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-full overflow-x-auto rounded-xl border border-blue-100 bg-white p-1 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearch("");
                  }}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition sm:px-4 ${
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  <Icon size={16} />

                  {tab.label}

                  {tab.count > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {activeTab !== "requests" && (
            <div className="relative w-full lg:max-w-sm">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder={
                  activeTab === "mine"
                    ? "Search your exchanges..."
                    : "Search skills, titles, or users..."
                }
                className="w-full rounded-xl border border-blue-100 bg-white py-3 pl-10 pr-10 text-sm outline-none transition placeholder:text-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-blue-400 transition hover:bg-blue-50 hover:text-blue-700"
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 rounded-lg p-1 hover:bg-blue-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {activeTab === "requests" ? (
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <RequestPanel
              title="Incoming requests"
              description="People who want to join your exchanges."
              requests={receivedRequests}
              loading={requestsLoading}
              incoming
              onRefresh={loadRequests}
            />

            <RequestPanel
              title="Requests you've sent"
              description="Track exchanges you have requested."
              requests={sentRequests}
              loading={requestsLoading}
              onRefresh={loadRequests}
            />
          </div>
        ) : loading ? (
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-80 animate-pulse rounded-2xl border border-blue-100 bg-white"
              />
            ))}
          </div>
        ) : visibleExchanges.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-blue-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              {search ? (
                <Search size={25} />
              ) : (
                <Handshake size={25} />
              )}
            </div>

            <h2 className="mt-5 text-lg font-bold text-blue-950">
              {search
                ? "No matching exchanges"
                : activeTab === "mine"
                  ? "No active exchanges yet"
                  : "No exchanges available right now"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-blue-600">
              {search
                ? `No exchange matches "${search}". Try searching for another skill, title, or user.`
                : activeTab === "mine"
                  ? "Create an exchange or join one after your request is accepted."
                  : "There are no open exchanges from other users at the moment. You can create your own exchange instead."}
            </p>

            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-blue-200 px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                <X size={17} />
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={17} />
                Create Exchange
              </button>
            )}
          </div>
        ) : (
          <>
            {search && (
              <div className="mt-6 text-sm text-blue-600">
                Showing{" "}
                <span className="font-semibold text-blue-800">
                  {visibleExchanges.length}
                </span>{" "}
                matching exchange
                {visibleExchanges.length === 1
                  ? ""
                  : "s"}
              </div>
            )}

            <div
              className={`${
                search ? "mt-4" : "mt-8"
              } grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3`}
            >
              {visibleExchanges.map((exchange) => (
                <ExchangeCard
                  key={exchange.id}
                  exchange={exchange}
                  onOpen={(exchangeId) =>
                    navigate(`/exchange/${exchangeId}`)
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateExchangeModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

function RequestPanel({
  title,
  description,
  requests,
  loading,
  incoming = false,
  onRefresh,
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <section className="rounded-2xl border border-blue-100 bg-white p-6">
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Loader2
            size={17}
            className="animate-spin"
          />
          Loading requests...
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-blue-950">
          {title}
        </h2>

        <p className="mt-1 text-sm text-blue-600">
          {description}
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl bg-blue-50 px-5 py-10 text-center">
          <Send
            size={21}
            className="mx-auto text-blue-300"
          />

          <p className="mt-3 text-sm font-medium text-blue-700">
            No requests here yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <button
              key={request.id}
              type="button"
              onClick={() =>
                request.post?.id &&
                navigate(
                  `/exchange/${request.post.id}`
                )
              }
              className="w-full rounded-xl border border-blue-100 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-blue-950">
                    {request.post?.title ||
                      "Exchange request"}
                  </p>

                  <p className="mt-1 text-xs text-blue-600">
                    {incoming
                      ? `From @${
                          request.requester?.username ||
                          "user"
                        }`
                      : `To @${
                          request.recipient?.username ||
                          "user"
                        }`}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    request.status === "accepted"
                      ? "bg-blue-100 text-blue-700"
                      : request.status === "rejected"
                        ? "bg-blue-100 text-blue-700"
                        : request.status === "cancelled"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {request.status}
                </span>
              </div>

              {request.message && (
                <p className="mt-3 line-clamp-2 text-sm leading-5 text-blue-700">
                  {request.message}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onRefresh}
        className="mt-5 text-xs font-semibold text-blue-600 hover:text-blue-700"
      >
        Refresh requests
      </button>
    </section>
  );
}