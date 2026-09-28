import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  DollarSign,
  Loader2,
  MonitorPlay,
  ShieldCheck,
  Users,
  Video,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import api from "../../api/axios";


function getId(item) {
  return item?.id ?? item?.uuid ?? item?.pk;
}

function getUserName(user) {
  if (!user) return "Unknown user";

  if (typeof user === "string") return user;

  if (typeof user === "number") {
    return String(user);
  }

  return (
    user.name ||
    user.full_name ||
    user.username ||
    user.email ||
    "Unknown user"
  );
}

function getUserUsername(user) {
  if (!user || typeof user === "string" || typeof user === "number") {
    return "";
  }

  return user.username || "";
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

function getCreatorDisplay(session) {
  return session?.creator_name || getUserName(getCreator(session));
}

function getParticipantDisplay(session) {
  return (
    session?.participant_name ||
    getUserName(getParticipant(session))
  );
}

function getSkill(session) {
  return session?.skill || null;
}

function getSkillName(session) {
  const skill = getSkill(session);

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

function getSkillCategory(session) {
  const skill = getSkill(session);

  if (!skill || typeof skill === "string") {
    return "";
  }

  const category = skill?.category;

  if (typeof category === "string") {
    return category;
  }

  return category?.name || "";
}

function getTitle(session) {
  return session?.title || session?.name || getSkillName(session);
}

function getDescription(session) {
  return session?.description || "";
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
  )
    .toLowerCase()
    .replace(/-/g, "_");
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

function getMaxParticipants(session) {
  const value =
    session?.max_participants ??
    session?.participant_limit ??
    session?.capacity ??
    null;

  if (value === null || value === undefined) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function getParticipantCount(session) {
  const value =
    session?.participant_count ??
    session?.enrollment_count ??
    session?.participants_count ??
    session?.current_participants ??
    null;

  if (value === null || value === undefined) {
    if (Array.isArray(session?.enrollments)) {
      return session.enrollments.length;
    }

    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
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

function getPrice(session) {
  const value =
    session?.price ??
    session?.access_price ??
    session?.amount ??
    null;

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
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

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function formatDate(value) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "No time";

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
    return "Not specified";
  }

  const value = Number(minutes);

  if (!Number.isFinite(value) || value <= 0) {
    return "Not specified";
  }

  if (value < 60) {
    return `${value} minutes`;
  }

  const hours = Math.floor(value / 60);
  const remaining = value % 60;

  if (!remaining) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }

  return `${hours} hour${
    hours > 1 ? "s" : ""
  } ${remaining} minutes`;
}

function getStatusLabel(status) {
  switch (status) {
    case "scheduled":
      return "Scheduled";

    case "active":
      return "Live Now";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    default:
      return status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) =>
          letter.toUpperCase()
        );
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
        .replace(/\b\w/g, (letter) =>
          letter.toUpperCase()
        );
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
        .replace(/\b\w/g, (letter) =>
          letter.toUpperCase()
        );
  }
}


function getStoredCurrentUser() {
  try {
    const storedUser =
      localStorage.getItem("skillhive_user");

    if (!storedUser) {
      return null;
    }

    const parsed = JSON.parse(storedUser);

    return (
      parsed?.data?.user ||
      parsed?.user ||
      parsed?.data ||
      parsed ||
      null
    );
  } catch {
    return null;
  }
}

function getCurrentUserId(currentUser) {
  return (
    currentUser?.id ??
    currentUser?.user_id ??
    currentUser?.pk ??
    null
  );
}

function isSameUser(user, currentUser) {
  if (!user || !currentUser) {
    return false;
  }

  const userId =
    typeof user === "object"
      ? user?.id ??
        user?.user_id ??
        user?.pk
      : user;

  const currentId =
    currentUser?.id ??
    currentUser?.user_id ??
    currentUser?.pk;

  if (
    userId !== null &&
    userId !== undefined &&
    currentId !== null &&
    currentId !== undefined
  ) {
    return (
      String(userId) ===
      String(currentId)
    );
  }

  const username =
    typeof user === "object"
      ? user?.username
      : null;

  if (
    username &&
    currentUser?.username
  ) {
    return (
      username ===
      currentUser.username
    );
  }

  return false;
}

function isCurrentUserCreator(
  session,
  currentUser
) {
  if (!session || !currentUser) {
    return false;
  }

  const creator =
    getCreator(session);

  if (
    isSameUser(
      creator,
      currentUser
    )
  ) {
    return true;
  }

  const currentId =
    getCurrentUserId(
      currentUser
    );

  if (
    currentId !== null &&
    currentId !== undefined &&
    creator !== null &&
    creator !== undefined &&
    typeof creator !== "object"
  ) {
    return (
      String(creator) ===
      String(currentId)
    );
  }

  return false;
}

function isCurrentUserParticipant(
  session,
  currentUser
) {
  if (!session || !currentUser) {
    return false;
  }

  const participant =
    getParticipant(session);

  if (
    isSameUser(
      participant,
      currentUser
    )
  ) {
    return true;
  }

  const currentId =
    getCurrentUserId(
      currentUser
    );

  if (
    currentId === null ||
    currentId === undefined
  ) {
    return false;
  }

  if (
    Array.isArray(
      session?.enrollments
    )
  ) {
    const enrolled =
      session.enrollments.some(
        (enrollment) => {
          const enrollmentUser =
            enrollment?.user ??
            enrollment?.user_id ??
            null;

          const enrollmentId =
            typeof enrollmentUser ===
            "object"
              ? enrollmentUser?.id ??
                enrollmentUser?.user_id ??
                enrollmentUser?.pk
              : enrollmentUser;

          return (
            enrollmentId !== null &&
            enrollmentId !== undefined &&
            String(
              enrollmentId
            ) ===
              String(currentId)
          );
        }
      );

    if (enrolled) {
      return true;
    }
  }

  const enrolled =
    session?.is_enrolled ??
    session?.is_participant ??
    session?.enrolled ??
    session?.user_enrolled;

  if (typeof enrolled === "boolean") {
    return enrolled;
  }

  return false;
}


function canJoinRoom(session) {
  const meetingUrl =
    getMeetingUrl(session);

  if (!meetingUrl) {
    return false;
  }

  const status =
    getStatus(session);

  if (
    status === "completed" ||
    status === "cancelled"
  ) {
    return false;
  }

  return true;
}


function extractError(error) {
  const data =
    error?.response?.data;

  if (!data) {
    return (
      error?.message ||
      "Something went wrong."
    );
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
    const values =
      Object.values(data);

    for (const value of values) {
      if (
        Array.isArray(value) &&
        value.length
      ) {
        return String(value[0]);
      }

      if (
        typeof value === "string"
      ) {
        return value;
      }
    }
  }

  return "Unable to complete the request.";
}


function SessionDetails() {
  const { id } =
    useParams();

  const [session, setSession] =
    useState(null);

  const [currentUser, setCurrentUser] =
    useState(
      getStoredCurrentUser()
    );

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [
    showCancelModal,
    setShowCancelModal,
  ] = useState(false);

  const [
    showLeaveModal,
    setShowLeaveModal,
  ] = useState(false);


  const loadSession =
    useCallback(async () => {
      if (!id) {
        setError(
          "Session ID is missing."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response =
          await api.get(
            `/api/skill-sessions/${id}/`
          );

        const payload =
          response?.data;

        const loadedSession =
          payload?.data ||
          payload?.session ||
          payload;

        if (!loadedSession) {
          throw new Error(
            "The server returned an empty session."
          );
        }

        setSession(
          loadedSession
        );

        const storedUser =
          getStoredCurrentUser();

        if (storedUser) {
          setCurrentUser(
            storedUser
          );
        }
      } catch (requestError) {
        setError(
          extractError(
            requestError
          )
        );

        setSession(null);
      } finally {
        setLoading(false);
      }
    }, [id]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!session) {
      return undefined;
    }

    const interval =
      window.setInterval(() => {
        loadSession();
      }, 30000);

    return () =>
      window.clearInterval(
        interval
      );
  }, [session, loadSession]);

  const status = useMemo(
    () =>
      session
        ? getStatus(session)
        : "scheduled",
    [session]
  );

  const sessionType =
    useMemo(
      () =>
        session
          ? getSessionType(session)
          : "one_to_one",
      [session]
    );

  const accessType =
    useMemo(
      () =>
        session
          ? getAccessType(session)
          : "free",
      [session]
    );

  const isCreator =
    useMemo(
      () =>
        session
          ? isCurrentUserCreator(
              session,
              currentUser
            )
          : false,
      [session, currentUser]
    );

  const isParticipant =
    useMemo(
      () =>
        session
          ? isCurrentUserParticipant(
              session,
              currentUser
            )
          : false,
      [session, currentUser]
    );

  const roomAvailable =
    useMemo(
      () =>
        session
          ? canJoinRoom(session)
          : false,
      [session]
    );

  const price =
    session
      ? getPrice(session)
      : null;

  const xpCost =
    session
      ? getXpCost(session)
      : null;

  const maxParticipants =
    session
      ? getMaxParticipants(
          session
        )
      : null;

  const participantCount =
    session
      ? getParticipantCount(
          session
        )
      : null;

  const isFull =
    sessionType === "group" &&
    maxParticipants !== null &&
    participantCount !== null &&
    participantCount >=
      maxParticipants;

  async function handleEnroll(
    method
  ) {
    if (!session) {
      return;
    }

    const sessionId =
      getId(session);

    if (!sessionId) {
      setError(
        "Invalid session."
      );
      return;
    }

    setActionLoading(
      `enroll-${method}`
    );

    setError("");
    setSuccess("");

    try {
      if (method === "money") {
        setError(
          "Money-based enrollment is not available until the payment flow is connected."
        );
        return;
      }

      await api.post(
        `/api/skill-sessions/${sessionId}/enroll/`,
        {
          access_method: method,
        }
      );

      setSuccess(
        "You have successfully joined this session."
      );

      await loadSession();
    } catch (requestError) {
      setError(
        extractError(
          requestError
        )
      );
    } finally {
      setActionLoading("");
    }
  }


  async function handleCancel() {
    if (
      !session ||
      !isCreator
    ) {
      return;
    }

    const sessionId =
      getId(session);

    if (!sessionId) {
      return;
    }

    setActionLoading("cancel");
    setError("");
    setSuccess("");

    try {
      await api.post(
        `/api/skill-sessions/${sessionId}/cancel/`
      );

      setSuccess(
        "The session was cancelled successfully."
      );

      setShowCancelModal(false);

      await loadSession();
    } catch (requestError) {
      setError(
        extractError(
          requestError
        )
      );
    } finally {
      setActionLoading("");
    }
  }

  async function handleLeave() {
    if (
      !session ||
      !isParticipant ||
      isCreator
    ) {
      return;
    }

    const sessionId =
      getId(session);

    if (!sessionId) {
      return;
    }

    setActionLoading("leave");
    setError("");
    setSuccess("");

    try {
      await api.post(
        `/api/skill-sessions/${sessionId}/leave/`
      );

      setSuccess(
        "You left the session successfully."
      );

      setShowLeaveModal(false);

      await loadSession();
    } catch (requestError) {
      setError(
        extractError(
          requestError
        )
      );
    } finally {
      setActionLoading("");
    }
  }


  if (loading) {
    return (
      <div className="min-h-full bg-slate-50">
        <div className="border-b border-blue-700 bg-blue-600">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="h-5 w-36 animate-pulse rounded bg-white/20" />

            <div className="mt-5 h-9 w-2/3 max-w-xl animate-pulse rounded bg-white/20" />

            <div className="mt-3 h-5 w-full max-w-2xl animate-pulse rounded bg-white/15" />
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <SkeletonCard height="h-64" />
              <SkeletonCard height="h-48" />
            </div>

            <div className="space-y-6">
              <SkeletonCard height="h-72" />
              <SkeletonCard height="h-40" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-full bg-slate-50">
        <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <XCircle className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-900">
              Unable to load session
            </h1>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              {error ||
                "This session could not be found."}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={loadSession}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Try Again
              </button>

              <Link
                to="/sessions/my"
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                My Sessions
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }


  const statusStyles = {
    scheduled:
      "bg-white/15 text-white border-white/20",

    active:
      "bg-green-500/15 text-white border-green-300/30",

    completed:
      "bg-white/10 text-blue-50 border-white/20",

    cancelled:
      "bg-red-500/15 text-white border-red-300/30",
  };

  return (
    <div className="min-h-full bg-slate-50">


      <section className="border-b border-blue-700 bg-blue-600 text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            to="/sessions/my"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-100 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to My Sessions
          </Link>

          <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/10">
                  {getTypeLabel(
                    sessionType
                  )}
                </span>

                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/10">
                  {getAccessLabel(
                    accessType
                  )}
                </span>

                {isCreator && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/10">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Host
                  </span>
                )}

                {isParticipant &&
                  !isCreator && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/10">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Participant
                    </span>
                  )}
              </div>

              <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight sm:text-4xl">
                {getTitle(session)}
              </h1>

              <p className="mt-2 text-sm text-blue-100">
                {getSkillName(session)}

                {getSkillCategory(
                  session
                )
                  ? ` · ${getSkillCategory(
                      session
                    )}`
                  : ""}
              </p>
            </div>

            <span
              className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-sm font-semibold ${
                statusStyles[
                  status
                ] ||
                "border-white/20 bg-white/10 text-white"
              }`}
            >
              {status === "active" && (
                <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-green-400" />
              )}

              {getStatusLabel(status)}
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              {error}
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="rounded-lg p-1 text-red-500 transition hover:bg-red-100"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              {success}
            </div>

            <button
              type="button"
              onClick={() =>
                setSuccess("")
              }
              className="rounded-lg p-1 text-green-600 transition hover:bg-green-100"
              aria-label="Dismiss success message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        
          <div className="space-y-6">
           

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">
                  About this session
                </h2>
              </div>

              <div className="p-5 sm:p-6">
                {getDescription(
                  session
                ) ? (
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
                    {getDescription(
                      session
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">
                    No description was provided for this session.
                  </p>
                )}
              </div>
            </section>


            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Session details
                </h2>
              </div>

              <div className="grid gap-px bg-slate-200 sm:grid-cols-2">
                <DetailTile
                  icon={
                    <MonitorPlay className="h-5 w-5" />
                  }
                  label="Skill"
                  value={getSkillName(
                    session
                  )}
                />

                <DetailTile
                  icon={
                    <Users className="h-5 w-5" />
                  }
                  label="Format"
                  value={getTypeLabel(
                    sessionType
                  )}
                />

                <DetailTile
                  icon={
                    <Calendar className="h-5 w-5" />
                  }
                  label="Date"
                  value={formatDate(
                    getScheduledAt(
                      session
                    )
                  )}
                />

                <DetailTile
                  icon={
                    <Clock3 className="h-5 w-5" />
                  }
                  label="Start time"
                  value={formatTime(
                    getScheduledAt(
                      session
                    )
                  )}
                />

                <DetailTile
                  icon={
                    <Clock3 className="h-5 w-5" />
                  }
                  label="Duration"
                  value={formatDuration(
                    getDuration(
                      session
                    )
                  )}
                />

                <DetailTile
                  icon={
                    <ShieldCheck className="h-5 w-5" />
                  }
                  label="Access"
                  value={getAccessLabel(
                    accessType
                  )}
                />
              </div>
            </section>


            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    People
                  </h2>

                  {sessionType ===
                    "group" &&
                    maxParticipants !==
                      null && (
                      <span className="text-xs font-medium text-slate-500">
                        {participantCount ??
                          0}{" "}
                        /{" "}
                        {
                          maxParticipants
                        }
                      </span>
                    )}
                </div>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <PersonCard
                  label="Host"
                  displayName={getCreatorDisplay(
                    session
                  )}
                  user={getCreator(
                    session
                  )}
                  fallback="Session creator"
                  highlighted={
                    isCreator
                  }
                />

                {sessionType ===
                  "one_to_one" && (
                  <PersonCard
                    label="Participant"
                    displayName={
                      getParticipant(
                        session
                      )
                        ? getParticipantDisplay(
                            session
                          )
                        : ""
                    }
                    user={getParticipant(
                      session
                    )}
                    fallback={
                      status ===
                      "scheduled"
                        ? "Waiting for participant"
                        : "No participant"
                    }
                    highlighted={
                      isParticipant
                    }
                  />
                )}

                {sessionType ===
                  "group" && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                        <Users className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Group capacity
                        </p>

                        <p className="mt-0.5 text-sm text-slate-500">
                          {participantCount ??
                            0}

                          {maxParticipants !==
                          null
                            ? ` / ${maxParticipants}`
                            : ""}{" "}
                          participants
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
           
            <section className="rounded-2xl border border-slate-200 bg-white text-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Session access
              </h2>

              <div className="mt-5">
                <AccessSummary
                  accessType={
                    accessType
                  }
                  price={price}
                  xpCost={xpCost}
                />
              </div>

              {status ===
                "active" &&
                (isCreator ||
                  isParticipant) && (
                  <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start gap-3">
                      <Video className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

                      <div>
                        <p className="text-sm font-semibold text-green-800">
                          Session is live
                        </p>

                        <p className="mt-1 text-xs leading-5 text-green-700">
                          The learning room is currently available.
                        </p>
                      </div>
                    </div>
                  </div>
                )}


              {(isParticipant ||
                isCreator) &&
                roomAvailable && (
                  <Link
                    to={`/sessions/${id}/room`}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <Video className="h-4 w-4" />

                    Enter Learning Room
                  </Link>
                )}


              {!isCreator &&
                !isParticipant &&
                status ===
                  "scheduled" &&
                !isFull && (
                  <div className="mt-5 space-y-3">
                    {accessType ===
                      "free" && (
                      <ActionButton
                        loading={
                          actionLoading ===
                          "enroll-free"
                        }
                        onClick={() =>
                          handleEnroll(
                            "free"
                          )
                        }
                        icon={
                          <CheckCircle2 className="h-4 w-4" />
                        }
                      >
                        Join Session
                      </ActionButton>
                    )}

                    {accessType ===
                      "xp" && (
                      <ActionButton
                        loading={
                          actionLoading ===
                          "enroll-xp"
                        }
                        onClick={() =>
                          handleEnroll(
                            "xp"
                          )
                        }
                        icon={
                          <Zap className="h-4 w-4" />
                        }
                      >
                        Join with{" "}
                        {xpCost ??
                          0}{" "}
                        XP
                      </ActionButton>
                    )}

                    {accessType ===
                      "money" && (
                      <ActionButton
                        loading={
                          actionLoading ===
                          "enroll-money"
                        }
                        onClick={() =>
                          handleEnroll(
                            "money"
                          )
                        }
                        icon={
                          <DollarSign className="h-4 w-4" />
                        }
                      >
                        Pay to Join
                      </ActionButton>
                    )}

                    {accessType ===
                      "money_or_xp" && (
                      <>
                        <ActionButton
                          loading={
                            actionLoading ===
                            "enroll-money"
                          }
                          onClick={() =>
                            handleEnroll(
                              "money"
                            )
                          }
                          icon={
                            <DollarSign className="h-4 w-4" />
                          }
                        >
                          Pay{" "}
                          {price ??
                            ""}{" "}
                          to Join
                        </ActionButton>

                        <button
                          type="button"
                          disabled={Boolean(
                            actionLoading
                          )}
                          onClick={() =>
                            handleEnroll(
                              "xp"
                            )
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoading ===
                          "enroll-xp" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Zap className="h-4 w-4" />
                          )}

                          Join with{" "}
                          {xpCost ??
                            0}{" "}
                          XP
                        </button>
                      </>
                    )}
                  </div>
                )}

              {!isCreator &&
                !isParticipant &&
                status ===
                  "scheduled" &&
                isFull && (
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-800">
                      Session is full
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-700">
                      The maximum participant capacity has been reached.
                    </p>
                  </div>
                )}

  

              {status ===
                "completed" && (
                <div className="mt-5 rounded-xl bg-slate-100 p-4 text-center text-sm font-medium text-slate-600">
                  This session has already been completed.
                </div>
              )}


              {status ===
                "cancelled" && (
                <div className="mt-5 rounded-xl bg-red-50 p-4 text-center text-sm font-medium text-red-700">
                  This session has been cancelled.
                </div>
              )}


              {isCreator &&
                status ===
                  "scheduled" && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowCancelModal(
                        true
                      )
                    }
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4" />

                    Cancel Session
                  </button>
                )}


              {isParticipant &&
                !isCreator &&
                status ===
                  "scheduled" && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowLeaveModal(
                        true
                      )
                    }
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                  >
                    <Users className="h-4 w-4" />

                    Leave Session
                  </button>
                )}
            </section>


            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Schedule
              </h2>

              <div className="mt-5 space-y-4">
                <ScheduleRow
                  icon={
                    <Calendar className="h-4 w-4" />
                  }
                  label="Date"
                  value={formatDate(
                    getScheduledAt(
                      session
                    )
                  )}
                />

                <ScheduleRow
                  icon={
                    <Clock3 className="h-4 w-4" />
                  }
                  label="Time"
                  value={formatTime(
                    getScheduledAt(
                      session
                    )
                  )}
                />

                <ScheduleRow
                  icon={
                    <Clock3 className="h-4 w-4" />
                  }
                  label="Duration"
                  value={formatDuration(
                    getDuration(
                      session
                    )
                  )}
                />
              </div>
            </section>
          </aside>
        </div>
      </main>


      {showCancelModal && (
        <ConfirmModal
          title="Cancel this session?"
          description="Cancelling the session will prevent participants from attending it as scheduled. This action should only be used when you can no longer host the session."
          confirmLabel="Cancel Session"
          loading={
            actionLoading ===
            "cancel"
          }
          danger
          onCancel={() =>
            setShowCancelModal(
              false
            )
          }
          onConfirm={
            handleCancel
          }
        />
      )}


      {showLeaveModal && (
        <ConfirmModal
          title="Leave this session?"
          description="You will no longer be enrolled as a participant in this session."
          confirmLabel="Leave Session"
          loading={
            actionLoading ===
            "leave"
          }
          onCancel={() =>
            setShowLeaveModal(
              false
            )
          }
          onConfirm={
            handleLeave
          }
        />
      )}
    </div>
  );
}


function AccessSummary({
  accessType,
  price,
  xpCost,
}) {
  if (accessType === "free") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 text-white">
            <CheckCircle2 className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-bold text-green-800">
              Free session
            </p>

            <p className="mt-0.5 text-xs text-green-700">
              No payment or XP is required.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (accessType === "money") {
    return (
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <DollarSign className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-bold text-blue-800">
              Paid session
            </p>

            <p className="mt-0.5 text-lg font-bold text-slate-900">
              {price ?? "—"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (accessType === "xp") {
    return (
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Zap className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-bold text-blue-800">
              XP access
            </p>

            <p className="mt-0.5 text-lg font-bold text-slate-900">
              {xpCost ?? "—"} XP
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
      <p className="text-sm font-bold text-blue-800">
        Choose your access method
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white p-3">
          <DollarSign className="h-4 w-4 text-blue-600" />

          <p className="mt-1 text-sm font-bold text-slate-900">
            {price ?? "—"}
          </p>
        </div>

        <div className="rounded-lg bg-white p-3">
          <Zap className="h-4 w-4 text-blue-600" />

          <p className="mt-1 text-sm font-bold text-slate-900">
            {xpCost ?? "—"} XP
          </p>
        </div>
      </div>
    </div>
  );
}


function DetailTile({
  icon,
  label,
  value,
}) {
  return (
    <div className="bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">
            {label}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}


function PersonCard({
  label,
  user,
  displayName,
  fallback,
  highlighted = false,
}) {
  const username =
    getUserUsername(user);

  const resolvedName =
    displayName ||
    (user
      ? getUserName(user)
      : fallback);

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border p-4 ${
        highlighted
          ? "border-blue-200 bg-blue-50/70"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          highlighted
            ? "bg-blue-600 text-white"
            : "bg-blue-100 text-blue-700"
        }`}
      >
        <Users className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-bold text-slate-800">
          {resolvedName}
        </p>

        {username && (
          <p className="mt-0.5 text-xs text-slate-500">
            @{username}
          </p>
        )}
      </div>
    </div>
  );
}

function ScheduleRow({
  icon,
  label,
  value,
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>

      <div>
        <p className="text-xs font-medium text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 text-sm font-semibold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}


function ActionButton({
  children,
  loading,
  onClick,
  icon,
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        icon
      )}

      {loading
        ? "Processing..."
        : children}
    </button>
  );
}


function SkeletonCard({
  height,
}) {
  return (
    <div
      className={`${height} animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm`}
    >
      <div className="space-y-4 p-6">
        <div className="h-6 w-1/3 rounded bg-slate-200" />

        <div className="h-4 w-full rounded bg-slate-100" />

        <div className="h-4 w-5/6 rounded bg-slate-100" />

        <div className="h-16 w-full rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}


function ConfirmModal({
  title,
  description,
  confirmLabel,
  loading,
  danger = false,
  onCancel,
  onConfirm,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          if (!loading) {
            onCancel();
          }
        }
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-confirm-title"
      >
        <div className="p-6">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              danger
                ? "bg-red-50 text-red-600"
                : "bg-amber-50 text-amber-600"
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
            className="mt-4 text-lg font-bold text-slate-900"
          >
            {title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Keep Session
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
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

export default SessionDetails;