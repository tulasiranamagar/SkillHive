import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  LogOut,
  Play,
  ShieldCheck,
  Square,
  Video,
  X,
} from "lucide-react";
import api from "../../api/axios";

const HEARTBEAT_INTERVAL = 30000;

function getId(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === "object") {
    return value.id ?? value.pk ?? value.user_id ?? null;
  }

  return value;
}

function unwrapResponse(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function getUserId(user) {
  if (!user) return null;

  return (
    user.id ??
    user.pk ??
    user.user_id ??
    getId(user.user) ??
    getId(user.profile) ??
    null
  );
}

function getSessionCreatorId(session) {
  return (
    getId(session?.creator) ??
    session?.creator_id ??
    session?.host_id ??
    getId(session?.host) ??
    getId(session?.created_by) ??
    session?.created_by_id ??
    null
  );
}

function getParticipantId(session) {
  return (
    getId(session?.participant) ??
    session?.participant_id ??
    getId(session?.enrolled_user) ??
    session?.enrolled_user_id ??
    getId(session?.learner) ??
    session?.learner_id ??
    null
  );
}

function getMeetingUrl(session) {
  return (
    session?.meeting_url ||
    session?.jitsi_url ||
    session?.meeting?.url ||
    session?.room_url ||
    ""
  );
}

function getStatus(session) {
  return String(session?.status || "").toLowerCase();
}

function formatDateTime(value) {
  if (!value) return "Not scheduled";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(minutes) {
  const value = Number(minutes);

  if (!Number.isFinite(value) || value <= 0) {
    return "Duration not specified";
  }

  if (value < 60) {
    return `${value} minute${value === 1 ? "" : "s"}`;
  }

  const hours = Math.floor(value / 60);
  const remaining = value % 60;

  if (!remaining) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${hours}h ${remaining}m`;
}

function getMinutesUntilStart(scheduledAt) {
  if (!scheduledAt) return null;

  const start = new Date(scheduledAt).getTime();

  if (Number.isNaN(start)) return null;

  return (start - Date.now()) / 60000;
}

function getTimeRemainingLabel(scheduledAt) {
  const minutesUntil = getMinutesUntilStart(scheduledAt);

  if (minutesUntil === null) {
    return "Schedule unavailable";
  }

  if (minutesUntil <= 0) {
    return "Starting now";
  }

  const totalSeconds = Math.floor(minutesUntil * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}

function extractErrorMessage(
  error,
  fallback = "Something went wrong."
) {
  const data = error?.response?.data;

  if (!data) {
    return error?.message || fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.message) {
    return data.message;
  }

  if (data.detail) {
    return data.detail;
  }

  if (data.error) {
    return data.error;
  }

  if (data.errors) {
    if (typeof data.errors === "string") {
      return data.errors;
    }

    if (typeof data.errors === "object") {
      return Object.entries(data.errors)
        .map(([field, messages]) => {
          const value = Array.isArray(messages)
            ? messages.join(", ")
            : String(messages);

          return `${field}: ${value}`;
        })
        .join(" ");
    }
  }

  if (typeof data === "object") {
    const messages = Object.entries(data)
      .map(([field, messages]) => {
        const value = Array.isArray(messages)
          ? messages.join(", ")
          : String(messages);

        return `${field}: ${value}`;
      })
      .join(" ");

    if (messages) {
      return messages;
    }
  }

  return fallback;
}

function getSkillName(session) {
  if (!session?.skill) {
    return session?.skill_name || "Skill session";
  }

  if (typeof session.skill === "string") {
    return session.skill;
  }

  return (
    session.skill.name ||
    session.skill.title ||
    session.skill.skill_name ||
    session.skill_name ||
    "Skill session"
  );
}

function getCreatorName(session) {
  if (session?.creator_name) {
    return session.creator_name;
  }

  const creator =
    session?.creator ||
    session?.host ||
    session?.created_by;

  if (!creator) {
    return "Session creator";
  }

  if (typeof creator === "string") {
    return creator;
  }

  return (
    creator.name ||
    creator.full_name ||
    creator.username ||
    creator.email ||
    "Session creator"
  );
}

function getParticipantName(session) {
  if (session?.participant_name) {
    return session.participant_name;
  }

  const participant =
    session?.participant ||
    session?.enrolled_user ||
    session?.learner;

  if (!participant) {
    return "Participant";
  }

  if (typeof participant === "string") {
    return participant;
  }

  return (
    participant.name ||
    participant.full_name ||
    participant.username ||
    participant.email ||
    "Participant"
  );
}

function getEnrollmentUserId(enrollment) {
  if (!enrollment) return null;

  return (
    getId(enrollment.user) ??
    enrollment.user_id ??
    getId(enrollment.participant) ??
    enrollment.participant_id ??
    null
  );
}

function StatusPill({ status }) {
  const isLive =
    status === "active" || status === "in_progress";

  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled";

  let classes =
    "bg-blue-500/15 text-blue-100 border-blue-400/20";

  if (isLive) {
    classes =
      "bg-emerald-500/15 text-emerald-300 border-emerald-400/20";
  } else if (isCompleted) {
    classes =
      "bg-white/10 text-slate-300 border-white/10";
  } else if (isCancelled) {
    classes =
      "bg-red-500/15 text-red-300 border-red-400/20";
  }

  const label = isLive
    ? "Live"
    : isCompleted
      ? "Completed"
      : isCancelled
        ? "Cancelled"
        : status === "scheduled"
          ? "Scheduled"
          : status || "Scheduled";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${classes}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${
          isLive ? "animate-pulse" : ""
        }`}
      />
      {label}
    </span>
  );
}

function SessionRoom() {
  const { id } = useParams();
  const navigate = useNavigate();

  const heartbeatRef = useRef(null);
  const attendanceStartedRef = useRef(false);
  const attendanceLeftRef = useRef(false);

  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [clock, setClock] = useState(Date.now());
  const [attendanceActive, setAttendanceActive] =
    useState(false);

  const [showInfo, setShowInfo] = useState(false);

  const sessionId = useMemo(() => id, [id]);

  const currentUserId = getUserId(currentUser);
  const creatorId = getSessionCreatorId(session);
  const participantId = getParticipantId(session);

  const isCreator =
    currentUserId !== null &&
    creatorId !== null &&
    String(currentUserId) === String(creatorId);

  const isDirectParticipant =
    currentUserId !== null &&
    participantId !== null &&
    String(currentUserId) === String(participantId);

  const isEnrolledParticipant = useMemo(() => {
    if (currentUserId === null || !session) {
      return false;
    }

    const enrollments = Array.isArray(session.enrollments)
      ? session.enrollments
      : Array.isArray(session.enrolled_users)
        ? session.enrolled_users
        : [];

    return enrollments.some((enrollment) => {
      const enrollmentUserId =
        getEnrollmentUserId(enrollment);

      return (
        enrollmentUserId !== null &&
        String(enrollmentUserId) ===
          String(currentUserId)
      );
    });
  }, [currentUserId, session]);

  const isAuthorized =
    isCreator ||
    isDirectParticipant ||
    isEnrolledParticipant;

  const status = getStatus(session);
  const scheduledAt = session?.scheduled_at;
  const meetingUrl = getMeetingUrl(session);

  const meetingLinkAvailable = Boolean(meetingUrl);

  const sessionEnded =
    status === "completed" || status === "cancelled";

  const roomAvailable =
    !sessionEnded &&
    isAuthorized &&
    meetingLinkAvailable;

  const startTimeReached =
    getMinutesUntilStart(scheduledAt) !== null &&
    getMinutesUntilStart(scheduledAt) <= 0;

  const canStartSession =
    isCreator &&
    status === "scheduled" &&
    startTimeReached;

  const scheduleLabel = useMemo(() => {
    if (!scheduledAt) {
      return "Schedule unavailable";
    }

    const minutesUntil =
      getMinutesUntilStart(scheduledAt);

    if (
      status === "active" ||
      status === "in_progress"
    ) {
      return "Session is live";
    }

    if (minutesUntil !== null && minutesUntil > 0) {
      return `Starts in ${getTimeRemainingLabel(
        scheduledAt
      )}`;
    }

    if (minutesUntil !== null && minutesUntil <= 0) {
      return "Starting now";
    }

    return "Scheduled session";
  }, [scheduledAt, status, clock]);

  const loadSession = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    try {
      const response = await api.get(
        `/api/skill-sessions/${sessionId}/`
      );

      const data = unwrapResponse(response);

      setSession(data);
    } catch (firstError) {
      try {
        const response = await api.get(
          `/api/skill-sessions/${sessionId}`
        );

        const data = unwrapResponse(response);

        setSession(data);
      } catch (secondError) {
        throw secondError || firstError;
      }
    }
  }, [sessionId]);

  const loadCurrentUser = useCallback(async () => {
    try {
      const response = await api.get("/api/accounts/me/");
      const data = unwrapResponse(response);

      setCurrentUser(data);
    } catch (firstError) {
      try {
        const response = await api.get(
          "/api/accounts/profile/me/"
        );

        const data = unwrapResponse(response);

        setCurrentUser(data);
      } catch (secondError) {
        throw secondError || firstError;
      }
    }
  }, []);

  const loadRoom = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([
        loadSession(),
        loadCurrentUser(),
      ]);
    } catch (requestError) {
      setError(
        extractErrorMessage(
          requestError,
          "Unable to load the session room."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [loadCurrentUser, loadSession]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!session || sessionEnded) {
      return undefined;
    }

    const refreshTimer = window.setInterval(() => {
      loadSession().catch(() => {});
    }, 30000);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [loadSession, session, sessionEnded]);

  const sendAttendanceRequest = useCallback(
    async (action) => {
      if (!sessionId) {
        return false;
      }

      const endpoints = [
        `/api/skill-sessions/${sessionId}/attendance/${action}/`,
        `/api/skill-sessions/${sessionId}/attendance/${action}`,
      ];

      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          await api.post(endpoint);
          return true;
        } catch (requestError) {
          lastError = requestError;
        }
      }

      throw lastError;
    },
    [sessionId]
  );

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const leaveAttendance = useCallback(async () => {
    if (
      !attendanceStartedRef.current ||
      attendanceLeftRef.current
    ) {
      return;
    }

    attendanceLeftRef.current = true;

    stopHeartbeat();

    try {
      await sendAttendanceRequest("leave");
    } catch {
      // Best-effort attendance cleanup.
    }

    attendanceStartedRef.current = false;
    setAttendanceActive(false);
  }, [sendAttendanceRequest, stopHeartbeat]);

  const startAttendance = useCallback(async () => {
    if (
      attendanceStartedRef.current ||
      attendanceLeftRef.current
    ) {
      return true;
    }

    try {
      await sendAttendanceRequest("join");

      attendanceStartedRef.current = true;
      attendanceLeftRef.current = false;

      setAttendanceActive(true);

      stopHeartbeat();

      heartbeatRef.current = window.setInterval(
        async () => {
          if (
            !attendanceStartedRef.current ||
            attendanceLeftRef.current
          ) {
            return;
          }

          try {
            await sendAttendanceRequest("heartbeat");
          } catch {
            // Do not interrupt the meeting for one failed heartbeat.
          }
        },
        HEARTBEAT_INTERVAL
      );

      return true;
    } catch (requestError) {
      setError(
        extractErrorMessage(
          requestError,
          "Unable to start attendance tracking."
        )
      );

      return false;
    }
  }, [sendAttendanceRequest, stopHeartbeat]);

  useEffect(() => {
    if (
      loading ||
      !session ||
      !currentUser ||
      !roomAvailable ||
      attendanceStartedRef.current ||
      attendanceLeftRef.current
    ) {
      return;
    }

    startAttendance();
  }, [
    loading,
    session,
    currentUser,
    roomAvailable,
    startAttendance,
  ]);

  useEffect(() => {
    return () => {
      stopHeartbeat();

      if (
        attendanceStartedRef.current &&
        !attendanceLeftRef.current
      ) {
        sendAttendanceRequest("leave").catch(() => {});
      }

      attendanceStartedRef.current = false;
      attendanceLeftRef.current = true;
    };
  }, [sendAttendanceRequest, stopHeartbeat]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (
        attendanceStartedRef.current &&
        !attendanceLeftRef.current
      ) {
        sendAttendanceRequest("leave").catch(() => {});
      }
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, [sendAttendanceRequest]);

  const handleStartSession = async () => {
    if (!sessionId) {
      return;
    }

    if (!isCreator) {
      setError(
        "Only the session creator can start this session."
      );
      return;
    }

    if (!canStartSession) {
      setError(
        "The session can be started only when the scheduled start time has arrived."
      );
      return;
    }

    setActionLoading("start");
    setError("");
    setSuccess("");

    try {
      let response;

      try {
        response = await api.post(
          `/api/skill-sessions/${sessionId}/start/`
        );
      } catch {
        response = await api.post(
          `/api/skill-sessions/${sessionId}/start`
        );
      }

      const updated = unwrapResponse(response);

      if (updated && typeof updated === "object") {
        setSession((previous) => ({
          ...previous,
          ...updated,
        }));
      }

      await loadSession();

      setSuccess("Session started successfully.");
    } catch (requestError) {
      setError(
        extractErrorMessage(
          requestError,
          "Unable to start the session."
        )
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) {
      return;
    }

    if (!isCreator) {
      setError(
        "Only the session creator can end this session."
      );
      return;
    }

    const confirmed = window.confirm(
      "End this session for everyone? Attendance will stop and the session will be marked completed."
    );

    if (!confirmed) {
      return;
    }

    setActionLoading("end");
    setError("");
    setSuccess("");

    try {
      let response;

      try {
        response = await api.post(
          `/api/skill-sessions/${sessionId}/end/`
        );
      } catch {
        response = await api.post(
          `/api/skill-sessions/${sessionId}/end`
        );
      }

      const updated = unwrapResponse(response);

      if (updated && typeof updated === "object") {
        setSession((previous) => ({
          ...previous,
          ...updated,
        }));
      }

      await leaveAttendance();
      await loadSession();

      setSuccess("Session ended successfully.");
    } catch (requestError) {
      setError(
        extractErrorMessage(
          requestError,
          "Unable to end the session."
        )
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleLeaveRoom = async () => {
    setActionLoading("leave");
    setError("");
    setSuccess("");

    try {
      await leaveAttendance();

      navigate("/sessions/");
    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-white shadow-2xl backdrop-blur">
          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
          <span className="text-sm font-medium">
            Preparing your session room...
          </span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <Info className="h-6 w-6" />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Session unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {error ||
              "We could not load this session. It may have been removed or you may not have access."}
          </p>

          <Link
            to="/sessions/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sessions
          </Link>
        </div>
      </div>
    );
  }

  if (currentUser && !isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ShieldCheck className="h-6 w-6" />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Private session room
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            This room is available only to the session
            creator and participant.
          </p>

          <Link
            to={`/sessions/${sessionId}`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            View Session
          </Link>
        </div>
      </div>
    );
  }

  const isLive =
    status === "active" || status === "in_progress";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950">
      {/* TOP BAR */}
      <header className="relative z-30 flex h-[68px] shrink-0 items-center justify-between border-b border-white/10 bg-slate-950 px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={`/sessions/${sessionId}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
            title="Back to session details"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="hidden h-7 w-px bg-white/10 sm:block" />

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-sm font-semibold text-white sm:text-base">
                {session.title ||
                  "SkillHive Live Session"}
              </h1>

              <span className="hidden shrink-0 rounded-md bg-blue-500/15 px-2 py-1 text-[10px] font-semibold text-blue-300 sm:inline-flex">
                {getSkillName(session)}
              </span>
            </div>

            <p className="mt-0.5 truncate text-[11px] text-slate-400 sm:text-xs">
              {getCreatorName(session)}
              {" · "}
              {scheduleLabel}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <StatusPill status={status} />

          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            title="Session information"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ALERTS */}
      {(error || success) && (
        <div className="absolute left-1/2 top-[78px] z-50 w-[calc(100%-32px)] max-w-xl -translate-x-1/2">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-950/90 px-4 py-3 text-sm text-red-100 shadow-2xl backdrop-blur">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />

              <span className="min-w-0 flex-1">
                {error}
              </span>

              <button
                type="button"
                onClick={() => setError("")}
                className="shrink-0 text-red-300 transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {success && !error && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-950/90 px-4 py-3 text-sm text-emerald-100 shadow-2xl backdrop-blur">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />

              <span className="min-w-0 flex-1">
                {success}
              </span>

              <button
                type="button"
                onClick={() => setSuccess("")}
                className="shrink-0 text-emerald-300 transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* MAIN MEETING AREA */}
      <main className="relative min-h-0 flex-1 bg-black">
        {!sessionEnded && meetingLinkAvailable ? (
          <>
            <iframe
              title={`${session.title || "SkillHive"} live session`}
              src={meetingUrl}
              className="absolute inset-0 h-full w-full border-0"
              allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
              referrerPolicy="no-referrer"
            />

            {/* BOTTOM STATUS */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-3 sm:px-5 sm:pb-4">
              <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/85 px-3 py-2 shadow-2xl backdrop-blur-md">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    attendanceActive
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-white/10 text-slate-400"
                  }`}
                >
                  {attendanceActive ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Video className="h-3.5 w-3.5" />
                  )}
                </div>

                <div className="hidden sm:block">
                  <p className="text-[11px] font-semibold text-white">
                    {attendanceActive
                      ? "Attendance active"
                      : "Session room"}
                  </p>

                  <p className="text-[10px] text-slate-400">
                    {attendanceActive
                      ? "Your participation is being tracked."
                      : "You are connected to the room."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLeaveRoom}
                  disabled={
                    actionLoading === "leave"
                  }
                  className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === "leave" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}

                  <span className="hidden sm:inline">
                    Leave
                  </span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.16),_transparent_45%)] px-6">
            <div className="w-full max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-blue-400 shadow-2xl">
                {sessionEnded ? (
                  <Clock className="h-7 w-7" />
                ) : (
                  <Video className="h-7 w-7" />
                )}
              </div>

              <h2 className="mt-6 text-2xl font-bold text-white">
                {sessionEnded
                  ? "Session unavailable"
                  : "Preparing your session room"}
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
                {sessionEnded
                  ? status === "cancelled"
                    ? "This session has been cancelled."
                    : "This session has already ended."
                  : "The shared meeting room has not returned a meeting link yet. Please refresh shortly."}
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  to={`/sessions/${sessionId}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Session Details
                </Link>

                {meetingLinkAvailable &&
                  !sessionEnded && (
                    <a
                      href={meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      Open Meeting
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* CREATOR CONTROLS */}
        {isCreator && !sessionEnded && (
          <div className="absolute right-3 top-3 z-20 sm:right-5 sm:top-4">
            {status === "scheduled" && (
              <button
                type="button"
                onClick={handleStartSession}
                disabled={
                  actionLoading === "start" ||
                  !canStartSession
                }
                title={
                  !canStartSession
                    ? "The session can be started at the scheduled time."
                    : "Start session"
                }
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/85 px-3 py-2.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "start" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 text-blue-400" />
                )}

                <span className="hidden sm:inline">
                  {canStartSession
                    ? "Start Session"
                    : "Starts at Scheduled Time"}
                </span>

                <span className="sm:hidden">
                  {canStartSession
                    ? "Start"
                    : "Scheduled"}
                </span>
              </button>
            )}

            {(status === "active" ||
              status === "in_progress") && (
              <button
                type="button"
                onClick={handleEndSession}
                disabled={actionLoading === "end"}
                className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-950/80 px-3 py-2.5 text-xs font-semibold text-red-100 shadow-xl backdrop-blur-md transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "end" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Square className="h-3.5 w-3.5" />
                )}

                <span className="hidden sm:inline">
                  End Session
                </span>

                <span className="sm:hidden">
                  End
                </span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* INFO DRAWER */}
      {showInfo && (
        <>
          <button
            type="button"
            aria-label="Close session information"
            onClick={() => setShowInfo(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
          />

          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Session
                </p>

                <h2 className="mt-1 line-clamp-1 text-base font-bold text-slate-900">
                  {session.title ||
                    "SkillHive Live Session"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div
                className={`rounded-2xl border p-4 ${
                  isLive
                    ? "border-emerald-200 bg-emerald-50"
                    : status === "cancelled"
                      ? "border-red-200 bg-red-50"
                      : status === "completed"
                        ? "border-slate-200 bg-slate-50"
                        : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      isLive
                        ? "bg-emerald-600 text-white"
                        : status === "cancelled"
                          ? "bg-red-600 text-white"
                          : "bg-blue-600 text-white"
                    }`}
                  >
                    {isLive ? (
                      <Video className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {scheduleLabel}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {isLive
                        ? "The session is currently live."
                        : status === "completed"
                          ? "This session has ended."
                          : status === "cancelled"
                            ? "This session has been cancelled."
                            : "The meeting room is available before the scheduled time."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Session Details
                </h3>

                <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                  <div className="flex items-start gap-3 p-4">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">
                        Scheduled for
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatDateTime(scheduledAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">
                        Duration
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatDuration(
                          session.duration_minutes
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4">
                    <Video className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">
                        Skill
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {getSkillName(session)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  People
                </h3>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                      {getCreatorName(session)
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-slate-500">
                        Host
                      </p>

                      <p className="truncate text-sm font-semibold text-slate-900">
                        {getCreatorName(session)}
                      </p>
                    </div>

                    {isCreator && (
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                        You
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                      {participantId
                        ? getParticipantName(session)
                            .charAt(0)
                            .toUpperCase()
                        : "?"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-slate-500">
                        Participant
                      </p>

                      <p className="truncate text-sm font-semibold text-slate-900">
                        {participantId
                          ? getParticipantName(
                              session
                            )
                          : "Waiting for participant"}
                      </p>
                    </div>

                    {(isDirectParticipant ||
                      isEnrolledParticipant) && (
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                        You
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Attendance
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      SkillHive tracks your participation
                      through attendance events while you are
                      in the session.
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          attendanceActive
                            ? "bg-emerald-500"
                            : "bg-slate-300"
                        }`}
                      />

                      <span className="text-xs font-semibold text-slate-700">
                        {attendanceActive
                          ? "Attendance active"
                          : "Attendance inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {session.description && (
                <div className="mt-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    About this session
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {session.description}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-4">
              <Link
                to={`/sessions/${sessionId}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-600"
              >
                View Full Session Details
                <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
              </Link>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

export default SessionRoom;