import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Filter,
  Loader2,
  MonitorPlay,
  Search,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react";
import api from "../../api/axios";


function normalizeList(response) {
  const payload = response?.data;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.results)) {
    return payload.data.results;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
}

function getId(item) {
  return item?.id ?? item?.uuid ?? item?.pk;
}

function getNestedUserName(user) {
  if (!user) {
    return "Unknown user";
  }

  if (typeof user === "string") {
    return user;
  }

  return (
    user.name ||
    user.full_name ||
    user.username ||
    user.email ||
    "Unknown user"
  );
}

function getCreator(session) {
  return (
    session?.creator ||
    session?.created_by ||
    session?.owner ||
    session?.host ||
    null
  );
}

function getParticipant(session) {
  return (
    session?.participant ||
    session?.participant_user ||
    session?.student ||
    session?.learner ||
    null
  );
}

function getSkillName(session) {
  const skill = session?.skill;

  if (typeof skill === "string") {
    return skill;
  }

  return (
    skill?.name ||
    skill?.title ||
    session?.session_skill_name ||
    session?.skill_name ||
    "Skill session"
  );
}

function getStatus(session) {
  return String(session?.status || "scheduled").toLowerCase();
}

function getSessionType(session) {
  return String(
    session?.session_type ||
      session?.type ||
      "one_to_one"
  )
    .toLowerCase()
    .replace(/-/g, "_");
}

function getAccessType(session) {
  return String(
    session?.access_type ||
      session?.unlock_type ||
      session?.access ||
      "free"
  ).toLowerCase();
}

function getScheduledAt(session) {
  return (
    session?.scheduled_at ||
    session?.scheduled_start ||
    session?.start_time ||
    session?.starts_at ||
    null
  );
}

function getDuration(session) {
  const value =
    session?.duration_minutes ??
    session?.duration ??
    session?.duration_min ??
    0;

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getMeetingUrl(session) {
  return (
    session?.meeting_url ||
    session?.jitsi_url ||
    session?.meeting_link ||
    session?.room_url ||
    ""
  );
}

function getTitle(session) {
  return session?.title || session?.name || getSkillName(session);
}

function getDescription(session) {
  return session?.description || "";
}

function getPrice(session) {
  const value =
    session?.price ??
    session?.access_price ??
    session?.amount ??
    null;

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function getXpCost(session) {
  const value =
    session?.xp_unlock_cost ??
    session?.xp_cost ??
    session?.unlock_xp ??
    null;

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function formatDate(value) {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(value) {
  if (!value) {
    return "No time";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(minutes) {
  if (!minutes) {
    return "Duration not set";
  }

  const value = Number(minutes);

  if (value < 60) {
    return `${value} min`;
  }

  const hours = Math.floor(value / 60);
  const remaining = value % 60;

  if (!remaining) {
    return `${hours} hr${hours > 1 ? "s" : ""}`;
  }

  return `${hours} hr${hours > 1 ? "s" : ""} ${remaining} min`;
}

function getStatusLabel(status) {
  switch (status) {
    case "scheduled":
      return "Scheduled";

    case "active":
      return "Active";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    default:
      return status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}

function getAccessLabel(accessType) {
  switch (accessType) {
    case "free":
      return "Free";

    case "money":
      return "Paid";

    case "xp":
      return "XP";

    case "money_or_xp":
      return "Money or XP";

    default:
      return accessType
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}

function getTypeLabel(type) {
  switch (type) {
    case "one_to_one":
      return "1-to-1";

    case "group":
      return "Group";

    default:
      return type
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}

function getUserId(user) {
  if (!user) {
    return null;
  }

  if (typeof user === "object") {
    return user?.id ?? user?.user_id ?? user?.pk ?? null;
  }

  return user;
}

function getUserUsername(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  return user?.username || null;
}

function isSameUser(session, currentUser) {
  if (!currentUser) {
    return false;
  }

  const creator = getCreator(session);

  const creatorId = getUserId(creator);
  const currentId = getUserId(currentUser);

  if (creatorId && currentId) {
    return String(creatorId) === String(currentId);
  }

  const creatorUsername = getUserUsername(creator);
  const currentUsername = currentUser?.username;

  return Boolean(
    creatorUsername &&
      currentUsername &&
      creatorUsername === currentUsername
  );
}

function isParticipant(session, currentUser) {
  if (!currentUser) {
    return false;
  }

  const participant = getParticipant(session);

  const participantId = getUserId(participant);
  const currentId = getUserId(currentUser);

  if (participantId && currentId) {
    return String(participantId) === String(currentId);
  }

  const participantUsername = getUserUsername(participant);
  const currentUsername = currentUser?.username;

  return Boolean(
    participantUsername &&
      currentUsername &&
      participantUsername === currentUsername
  );
}

function isEnrolled(session, currentUser) {
  if (!currentUser) {
    return false;
  }

  const currentId = getUserId(currentUser);

  if (!currentId) {
    return false;
  }

  const enrollments =
    session?.enrollments ||
    session?.enrolled_users ||
    session?.members ||
    [];

  if (!Array.isArray(enrollments)) {
    return false;
  }

  return enrollments.some((enrollment) => {
    const user =
      enrollment?.user ||
      enrollment?.participant ||
      enrollment;

    const userId = getUserId(user);

    return userId && String(userId) === String(currentId);
  });
}

function isSessionMember(session, currentUser) {
  return (
    isSameUser(session, currentUser) ||
    isParticipant(session, currentUser) ||
    isEnrolled(session, currentUser)
  );
}

function canJoinRoom(session, currentUser) {
  const status = getStatus(session);
  const meetingUrl = getMeetingUrl(session);

  if (!meetingUrl) {
    return false;
  }

  if (status !== "scheduled" && status !== "active") {
    return false;
  }

  return isSessionMember(session, currentUser);
}

function canCancel(session, currentUser) {
  return (
    isSameUser(session, currentUser) &&
    getStatus(session) === "scheduled"
  );
}

function canLeave(session, currentUser) {
  return (
    isParticipant(session, currentUser) &&
    !isSameUser(session, currentUser) &&
    getStatus(session) === "scheduled"
  );
}

function getRoomMessage(session, currentUser) {
  if (isSameUser(session, currentUser)) {
    return "You can enter the session room anytime.";
  }

  if (isParticipant(session, currentUser)) {
    return "The meeting link becomes available 10 minutes before the session starts.";
  }

  return "This is a private session.";
}

function extractError(error) {
  const data = error?.response?.data;

  if (!data) {
    return error?.message || "Something went wrong.";
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.detail) {
    return data.detail;
  }

  if (data.message) {
    return data.message;
  }

  if (data.error) {
    return data.error;
  }

  if (typeof data === "object") {
    const firstValue = Object.values(data)[0];

    if (Array.isArray(firstValue)) {
      return firstValue[0];
    }

    if (typeof firstValue === "string") {
      return firstValue;
    }
  }

  return "Unable to complete the request.";
}


const STATUS_TABS = [
  {
    key: "all",
    label: "All Sessions",
  },
  {
    key: "scheduled",
    label: "Upcoming",
  },
  {
    key: "active",
    label: "Active",
  },
  {
    key: "completed",
    label: "Completed",
  },
  {
    key: "cancelled",
    label: "Cancelled",
  },
];

function MySessions() {
  const [sessions, setSessions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [leaveTarget, setLeaveTarget] = useState(null);

  const loadStoredUser = useCallback(() => {
    try {
      const storedUser = localStorage.getItem("skillhive_user");

      if (!storedUser) {
        setCurrentUser(null);
        return;
      }

      const parsedUser = JSON.parse(storedUser);

      if (
        parsedUser?.user &&
        typeof parsedUser.user === "object"
      ) {
        setCurrentUser(parsedUser.user);
        return;
      }

      setCurrentUser(parsedUser);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        "/api/skill-sessions/my/"
      );

      setSessions(normalizeList(response));
      loadStoredUser();
    } catch (requestError) {
      setError(extractError(requestError));
      setSessions([]);
      loadStoredUser();
    } finally {
      setLoading(false);
    }
  }, [loadStoredUser]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sessions.filter((session) => {
      const status = getStatus(session);

      const matchesTab =
        activeTab === "all" ||
        status === activeTab;

      if (!matchesTab) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableText = [
        getTitle(session),
        getDescription(session),
        getSkillName(session),
        getNestedUserName(getCreator(session)),
        getNestedUserName(getParticipant(session)),
        getAccessLabel(getAccessType(session)),
        getTypeLabel(getSessionType(session)),
        status,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [sessions, activeTab, search]);

  const stats = useMemo(() => {
    return {
      total: sessions.length,

      upcoming: sessions.filter(
        (session) => getStatus(session) === "scheduled"
      ).length,

      active: sessions.filter(
        (session) => getStatus(session) === "active"
      ).length,

      completed: sessions.filter(
        (session) => getStatus(session) === "completed"
      ).length,

      cancelled: sessions.filter(
        (session) => getStatus(session) === "cancelled"
      ).length,
    };
  }, [sessions]);

  async function handleCancel() {
    if (!cancelTarget) {
      return;
    }

    const id = getId(cancelTarget);

    if (!id) {
      return;
    }

    setActionLoading(`cancel-${id}`);
    setError("");
    setSuccess("");

    try {
      await api.post(
        `/api/skill-sessions/${id}/cancel/`
      );

      setSuccess(
        "The session was cancelled successfully."
      );

      setCancelTarget(null);

      await loadSessions();
    } catch (requestError) {
      setError(extractError(requestError));
    } finally {
      setActionLoading("");
    }
  }

  async function handleLeave() {
    if (!leaveTarget) {
      return;
    }

    const id = getId(leaveTarget);

    if (!id) {
      return;
    }

    setActionLoading(`leave-${id}`);
    setError("");
    setSuccess("");

    try {
      await api.post(
        `/api/skill-sessions/${id}/leave/`
      );

      setSuccess(
        "You left the session successfully."
      );

      setLeaveTarget(null);

      await loadSessions();
    } catch (requestError) {
      setError(extractError(requestError));
    } finally {
      setActionLoading("");
    }
  }

  function getTabCount(tabKey) {
    switch (tabKey) {
      case "all":
        return stats.total;

      case "scheduled":
        return stats.upcoming;

      case "active":
        return stats.active;

      case "completed":
        return stats.completed;

      case "cancelled":
        return stats.cancelled;

      default:
        return 0;
    }
  }

  return (
    <div className="min-h-full bg-slate-50">

      <section className="bg-blue-700 text-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8 ">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between text-black">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center text-white gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold">
                <Video className="h-4 w-4" />
                My Sessions
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
                Your learning sessions
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                Manage sessions you host or join, keep
                track of your schedule, and access your
                learning room when available.
              </p>
            </div>

            <Link
              to="/sessions/create"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-md transition hover:bg-blue-50 hover:shadow-lg"
            >
              <Calendar className="h-4 w-4" />
              Create Session
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700 shadow-sm">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">{error}</div>

            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-lg p-1 text-red-500 transition hover:bg-red-50"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-green-200 bg-white px-4 py-3 text-sm text-green-700 shadow-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">{success}</div>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="rounded-lg p-1 text-green-600 transition hover:bg-green-50"
              aria-label="Dismiss success message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Calendar className="h-5 w-5" />}
            label="Total Sessions"
            value={stats.total}
          />

          <StatCard
            icon={<Clock3 className="h-5 w-5" />}
            label="Upcoming"
            value={stats.upcoming}
          />

          <StatCard
            icon={<Video className="h-5 w-5" />}
            label="Active"
            value={stats.active}
          />

          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Completed"
            value={stats.completed}
          />
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="bg-blue-500 px-5 py-5 text-white sm:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Video className="h-5 w-5" />

                  <h2 className="text-lg font-bold">
                    Your Sessions
                  </h2>
                </div>

                <p className="mt-1 text-sm text-blue-100">
                  Showing {filteredSessions.length}{" "}
                  {filteredSessions.length === 1
                    ? "session"
                    : "sessions"}
                </p>
              </div>

              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-200" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search by title, skill, host..."
                  className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-blue-100 focus:border-white focus:bg-white/15 focus:ring-2 focus:ring-white/20"
                />
              </div>
            </div>
          </div>


          <div className="border-b border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <div className="flex min-w-max px-3 sm:px-5">
                {STATUS_TABS.map((tab) => {
                  const active = activeTab === tab.key;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() =>
                        setActiveTab(tab.key)
                      }
                      className={`relative flex items-center gap-2 px-4 py-4 text-sm font-semibold transition ${
                        active
                          ? "text-blue-700"
                          : "text-slate-500 hover:text-blue-700"
                      }`}
                    >
                      {tab.label}

                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          active
                            ? "bg-blue-700 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {getTabCount(tab.key)}
                      </span>

                      {active && (
                        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-700" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>


        <section className="mt-6">
          {loading ? (
            <SessionSkeleton />
          ) : filteredSessions.length === 0 ? (
            <EmptySessions
              hasSearch={Boolean(search.trim())}
              activeTab={activeTab}
              onClear={() => {
                setSearch("");
                setActiveTab("all");
              }}
            />
          ) : (
            <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredSessions.map((session) => (
                <SessionCard
                  key={getId(session)}
                  session={session}
                  currentUser={currentUser}
                  actionLoading={actionLoading}
                  onCancel={() =>
                    setCancelTarget(session)
                  }
                  onLeave={() =>
                    setLeaveTarget(session)
                  }
                />
              ))}
            </div>
          )}
        </section>


        <section className="mt-8 overflow-hidden rounded-2xl bg-blue-700 text-white shadow-sm">
          <div className="flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <MonitorPlay className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-bold">
                  Ready for a live learning session?
                </h3>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-blue-100">
                  Create a session around a skill you know,
                  or explore available sessions from other
                  SkillHive members.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/sessions"
                className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
              >
                Explore Sessions
              </Link>

              <Link
                to="/sessions/create"
                className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
              >
                Create Session
              </Link>
            </div>
          </div>
        </section>
      </main>


      {cancelTarget && (
        <ConfirmModal
          title="Cancel this session?"
          description={`Are you sure you want to cancel "${getTitle(
            cancelTarget
          )}"? Participants may no longer be able to attend this session.`}
          confirmLabel="Cancel Session"
          loading={
            actionLoading ===
            `cancel-${getId(cancelTarget)}`
          }
          onCancel={() => setCancelTarget(null)}
          onConfirm={handleCancel}
          danger
        />
      )}


      {leaveTarget && (
        <ConfirmModal
          title="Leave this session?"
          description={`You are about to leave "${getTitle(
            leaveTarget
          )}". You may need to enroll again if the session is still available.`}
          confirmLabel="Leave Session"
          loading={
            actionLoading ===
            `leave-${getId(leaveTarget)}`
          }
          onCancel={() => setLeaveTarget(null)}
          onConfirm={handleLeave}
        />
      )}
    </div>
  );
}


function StatCard({ icon, label, value }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-center justify-between bg-blue-700 px-5 py-4 text-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
          {icon}
        </div>

        <span className="text-2xl font-bold">
          {value}
        </span>
      </div>

      <div className="px-5 py-4">
        <p className="text-sm font-semibold text-slate-600">
          {label}
        </p>
      </div>
    </div>
  );
}


function SessionCard({
  session,
  currentUser,
  actionLoading,
  onCancel,
  onLeave,
}) {
  const id = getId(session);
  const status = getStatus(session);
  const sessionType = getSessionType(session);
  const accessType = getAccessType(session);
  const scheduledAt = getScheduledAt(session);
  const duration = getDuration(session);
  const creator = getCreator(session);
  const participant = getParticipant(session);

  const creatorIsCurrentUser =
    isSameUser(session, currentUser);

  const participantIsCurrentUser =
    isParticipant(session, currentUser);

  const meetingUrl = getMeetingUrl(session);

  const joinAvailable =
    canJoinRoom(session, currentUser);

  const price = getPrice(session);
  const xpCost = getXpCost(session);

  const statusStyles = {
    scheduled:
      "bg-white/15 text-white border-white/20",

    active:
      "bg-emerald-400/20 text-white border-emerald-300/30",

    completed:
      "bg-white/15 text-white border-white/20",

    cancelled:
      "bg-red-400/20 text-white border-red-300/30",
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg">

      <div className="bg-blue-500 px-5 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  statusStyles[status] ||
                  "border-white/20 bg-white/10 text-white"
                }`}
              >
                {getStatusLabel(status)}
              </span>

              <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white">
                {getTypeLabel(sessionType)}
              </span>

              <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white">
                {getAccessLabel(accessType)}
              </span>
            </div>

            <h3 className="mt-4 line-clamp-2 min-h-[3.5rem] text-xl font-bold leading-7">
              {getTitle(session)}
            </h3>

            {getDescription(session) ? (
              <p className="mt-2 line-clamp-2 text-sm leading-5 text-blue-100">
                {getDescription(session)}
              </p>
            ) : (
              <p className="mt-2 text-sm text-blue-200">
                Live skill learning session
              </p>
            )}
          </div>

          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:flex">
            <Video className="h-5 w-5" />
          </div>
        </div>


        {(creatorIsCurrentUser ||
          (participantIsCurrentUser &&
            !creatorIsCurrentUser)) && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-blue-100">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                <Users className="h-3.5 w-3.5" />
              </span>

              {creatorIsCurrentUser
                ? "You are hosting this session"
                : "You are participating in this session"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">

        <div className="grid grid-cols-2 gap-3">
          <MetaItem
            icon={<MonitorPlay className="h-4 w-4" />}
            label="Skill"
            value={getSkillName(session)}
          />

          <MetaItem
            icon={<Calendar className="h-4 w-4" />}
            label="Date"
            value={formatDate(scheduledAt)}
          />

          <MetaItem
            icon={<Clock3 className="h-4 w-4" />}
            label="Time"
            value={formatTime(scheduledAt)}
          />

          <MetaItem
            icon={<Clock3 className="h-4 w-4" />}
            label="Duration"
            value={formatDuration(duration)}
          />
        </div>


        <div className="mt-4 grid gap-3">
          <PersonInfo
            label="Host"
            value={getNestedUserName(creator)}
          />

          <PersonInfo
            label={
              sessionType === "group"
                ? "Participants"
                : "Participant"
            }
            value={
              sessionType === "group"
                ? session?.participant_count ??
                  session?.enrollment_count ??
                  session?.participants_count ??
                  "Group session"
                : getNestedUserName(participant)
            }
          />
        </div>

        {accessType !== "free" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(accessType === "money" ||
              accessType === "money_or_xp") &&
              price !== null && (
                <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                  Price: {price}
                </span>
              )}

            {(accessType === "xp" ||
              accessType === "money_or_xp") &&
              xpCost !== null && (
                <span className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700">
                  {xpCost} XP
                </span>
              )}
          </div>
        )}

        <div className="mt-auto pt-5">
          <div className="border-t border-slate-100 pt-5">
            <div className="grid gap-2 text-white ">
              <Link
                to={`/sessions/${id}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-700 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:border-blue-900 hover:bg-blue-900"
              >
                View Details
                <ExternalLink className="h-4 w-4" />
              </Link>

              {joinAvailable && (
                <Link
                  to={`/sessions/${id}/room`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold shadow-sm transition hover:bg-blue-800 "
                >
                  <Video className="h-4 w-4 text-white" />
                  Enter Room
                </Link>
              )}

              {status === "scheduled" &&
                !meetingUrl &&
                (participantIsCurrentUser ||
                  creatorIsCurrentUser) && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-center text-xs font-medium leading-5 text-blue-700">
                    {getRoomMessage(
                      session,
                      currentUser
                    )}
                  </div>
                )}

              {canCancel(session, currentUser) && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={
                    actionLoading === `cancel-${id}`
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === `cancel-${id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}

                  Cancel Session
                </button>
              )}

              {canLeave(session, currentUser) && (
                <button
                  type="button"
                  onClick={onLeave}
                  disabled={
                    actionLoading === `leave-${id}`
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === `leave-${id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}

                  Leave Session
                </button>
              )}

              {status === "completed" && (
                <div className="inline-flex items-center justify-center rounded-xl bg-green-50 px-4 py-2.5 text-sm font-bold text-green-700">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Session completed
                </div>
              )}

              {status === "cancelled" && (
                <div className="inline-flex items-center justify-center rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">
                  <XCircle className="mr-2 h-4 w-4" />
                  Session cancelled
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}


function MetaItem({ icon, label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p
            className="mt-0.5 truncate text-sm font-bold text-slate-700"
            title={value}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function PersonInfo({ label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white">
        <Users className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p
          className="mt-0.5 truncate text-sm font-bold text-slate-700"
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function EmptySessions({
  hasSearch,
  activeTab,
  onClear,
}) {
  let title = "No sessions found";

  let description =
    "Your sessions will appear here when you create or join them.";

  if (hasSearch) {
    title = "No matching sessions";

    description =
      "Try a different search term or clear the current filters.";
  } else if (activeTab === "scheduled") {
    title = "No upcoming sessions";

    description =
      "You do not have any scheduled sessions at the moment.";
  } else if (activeTab === "active") {
    title = "No active sessions";

    description =
      "There are no live sessions available for you right now.";
  } else if (activeTab === "completed") {
    title = "No completed sessions";

    description =
      "Completed learning sessions will appear here.";
  } else if (activeTab === "cancelled") {
    title = "No cancelled sessions";

    description =
      "You do not have any cancelled sessions.";
  }

  return (
    <div className="rounded-2xl border border-dashed border-blue-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-sm">
        <Calendar className="h-7 w-7" />
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {(hasSearch || activeTab !== "all") && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
          >
            <Filter className="h-4 w-4" />
            Clear Filters
          </button>
        )}

        <Link
          to="/sessions/create"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
        >
          <Calendar className="h-4 w-4" />
          Create Session
        </Link>
      </div>
    </div>
  );
}

function SessionSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm"
        >
          <div className="h-48 bg-blue-100" />

          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((box) => (
                <div
                  key={box}
                  className="h-16 rounded-xl bg-slate-100"
                />
              ))}
            </div>

            <div className="h-14 rounded-xl bg-slate-100" />

            <div className="h-14 rounded-xl bg-slate-100" />

            <div className="h-10 rounded-xl bg-slate-200" />

            <div className="h-10 rounded-xl bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}


function ConfirmModal({
  title,
  description,
  confirmLabel,
  loading,
  onCancel,
  onConfirm,
  danger = false,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-confirm-title"
      >
        <div className="bg-blue-700 p-6 text-white">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              danger
                ? "bg-red-500/20 text-white"
                : "bg-white/15 text-white"
            }`}
          >
            {danger ? (
              <XCircle className="h-5 w-5" />
            ) : (
              <Users className="h-5 w-5" />
            )}
          </div>

          <h2
            id="session-confirm-title"
            className="mt-4 text-lg font-bold"
          >
            {title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-blue-100">
            {description}
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Keep Session
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-700 hover:bg-blue-800"
            }`}
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MySessions;
