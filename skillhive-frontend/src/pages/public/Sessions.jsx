import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Filter,
  Search,
  Sparkles,
  Users,
  Video,
  X,
} from "lucide-react";
import api from "../../api/axios";

const normalizeList = (response) => {
  const payload = response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;

  return [];
};

const getSessionId = (session) =>
  session?.id ||
  session?.session_id ||
  session?.pk ||
  session?.uuid;

const getTitle = (session) =>
  session?.title ||
  session?.name ||
  session?.skill_name ||
  "SkillHive Learning Session";

const getDescription = (session) =>
  session?.description ||
  session?.summary ||
  "Join a practical peer-to-peer learning session on SkillHive.";

const getSkillName = (session) =>
  session?.skill_name ||
  session?.skill?.name ||
  session?.skill_title ||
  session?.skill ||
  "";

const getSessionType = (session) =>
  String(
    session?.session_type ||
      session?.type ||
      session?.session_kind ||
      "one_to_one"
  ).toLowerCase();

const getAccessType = (session) =>
  String(
    session?.access_type ||
      session?.unlock_type ||
      session?.pricing_type ||
      "free"
  ).toLowerCase();

const getStatus = (session) =>
  String(session?.status || "scheduled").toLowerCase();

const getScheduledAt = (session) =>
  session?.scheduled_at ||
  session?.scheduled_start ||
  session?.start_time ||
  session?.start_at ||
  null;

const getDuration = (session) =>
  session?.duration_minutes ||
  session?.duration ||
  null;

const getMaxParticipants = (session) =>
  session?.max_participants ||
  session?.capacity ||
  null;

const getParticipantCount = (session) =>
  session?.participant_count ||
  session?.participants_count ||
  session?.enrolled_count ||
  0;

const getCreator = (session) =>
  session?.creator ||
  session?.user ||
  session?.owner ||
  session?.host ||
  null;

const getCreatorName = (session) => {
  const creator = getCreator(session);

  return (
    creator?.name ||
    creator?.full_name ||
    creator?.username ||
    session?.creator_name ||
    session?.host_name ||
    "SkillHive Creator"
  );
};

const getCreatorUsername = (session) => {
  const creator = getCreator(session);

  return creator?.username || session?.creator_username || "";
};

const accessConfig = {
  free: {
    label: "Free",
    className: "bg-green-50 text-green-700",
  },
  money: {
    label: "Paid",
    className: "bg-blue-50 text-blue-700",
  },
  xp: {
    label: "XP",
    className: "bg-purple-50 text-purple-700",
  },
  money_or_xp: {
    label: "Money or XP",
    className: "bg-amber-50 text-amber-700",
  },
};

const sessionTypeConfig = {
  one_to_one: "1-to-1",
  one_to_one_session: "1-to-1",
  group: "Group",
  group_session: "Group",
};

const formatDate = (value) => {
  if (!value) return "Schedule not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatTime = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState("");
  const [sessionType, setSessionType] = useState("all");
  const [accessType, setAccessType] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadSessions = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/api/skill-sessions/");

        if (mounted) {
          setSessions(normalizeList(response));
        }
      } catch (err) {
        if (mounted) {
          setSessions([]);
          setError(
            err?.response?.data?.message ||
              "We couldn't load upcoming sessions right now."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSessions();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();

    return sessions
      .filter((session) => {
        const title = getTitle(session).toLowerCase();
        const description = getDescription(session).toLowerCase();
        const skill = String(getSkillName(session)).toLowerCase();
        const creator = getCreatorName(session).toLowerCase();

        const matchesSearch =
          !query ||
          title.includes(query) ||
          description.includes(query) ||
          skill.includes(query) ||
          creator.includes(query);

        const currentSessionType = getSessionType(session);

        const matchesType =
          sessionType === "all" ||
          currentSessionType === sessionType;

        const currentAccessType = getAccessType(session);

        const matchesAccess =
          accessType === "all" ||
          currentAccessType === accessType;

        const scheduledAt = getScheduledAt(session);
        const date = scheduledAt ? new Date(scheduledAt) : null;

        let matchesDate = true;

        if (dateFilter !== "all" && date && !Number.isNaN(date.getTime())) {
          if (dateFilter === "today") {
            matchesDate =
              date.toDateString() === now.toDateString();
          }

          if (dateFilter === "week") {
            const weekEnd = new Date(now);
            weekEnd.setDate(now.getDate() + 7);

            matchesDate = date >= now && date <= weekEnd;
          }

          if (dateFilter === "month") {
            matchesDate =
              date.getMonth() === now.getMonth() &&
              date.getFullYear() === now.getFullYear() &&
              date >= now;
          }
        }

        return (
          matchesSearch &&
          matchesType &&
          matchesAccess &&
          matchesDate
        );
      })
      .filter((session) => {
        const scheduledAt = getScheduledAt(session);

        if (!scheduledAt) return true;

        const date = new Date(scheduledAt);

        if (Number.isNaN(date.getTime())) return true;

        return date >= now;
      })
      .sort((a, b) => {
        const dateA = new Date(getScheduledAt(a) || 0).getTime();
        const dateB = new Date(getScheduledAt(b) || 0).getTime();

        return dateA - dateB;
      });
  }, [
    sessions,
    search,
    sessionType,
    accessType,
    dateFilter,
  ]);

  const clearFilters = () => {
    setSearch("");
    setSessionType("all");
    setAccessType("all");
    setDateFilter("all");
  };

  const hasFilters =
    search ||
    sessionType !== "all" ||
    accessType !== "all" ||
    dateFilter !== "all";

  return (
    <div className="min-h-screen bg-slate-50">
     
      <section className="bg-blue-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20">
              <Video className="h-4 w-4" />
              Live learning sessions
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Learn together in real time
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-blue-50 sm:text-lg">
              Discover upcoming peer-to-peer sessions and learn directly with
              people who share practical knowledge on SkillHive.
            </p>

            <div className="mt-8 max-w-2xl">
              <div className="flex items-center gap-3 rounded-2xl bg-white p-2 shadow-xl">
                <Search className="ml-3 h-5 w-5 shrink-0 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search sessions, skills, or creators..."
                  className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Clear session search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSearch(search.trim())}
                  className="hidden rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:block"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
       
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between text-white">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Upcoming sessions
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Learn with the community
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Find sessions that match your interests, preferred format, and
              available time.
            </p>
          </div>

          <Link
            to="/sessions/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Create session
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Filter sessions
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={sessionType}
              onChange={(event) => setSessionType(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All session types</option>
              <option value="one_to_one">1-to-1</option>
              <option value="group">Group</option>
            </select>

            <select
              value={accessType}
              onChange={(event) => setAccessType(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All access types</option>
              <option value="free">Free</option>
              <option value="money">Paid</option>
              <option value="xp">XP</option>
              <option value="money_or_xp">Money or XP</option>
            </select>

            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Any date</option>
              <option value="today">Today</option>
              <option value="week">Next 7 days</option>
              <option value="month">This month</option>
            </select>

            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Clear filters
              </button>
            ) : (
              <div className="hidden lg:block" />
            )}
          </div>
        </section>


        <section className="py-8">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <div className="h-6 w-20 rounded-full bg-slate-200" />

                  <div className="mt-5 h-6 w-3/4 rounded bg-slate-200" />

                  <div className="mt-3 h-3 w-full rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-4/5 rounded bg-slate-200" />

                  <div className="mt-6 space-y-3">
                    <div className="h-4 w-40 rounded bg-slate-200" />
                    <div className="h-4 w-32 rounded bg-slate-200" />
                    <div className="h-4 w-24 rounded bg-slate-200" />
                  </div>

                  <div className="mt-6 h-11 rounded-xl bg-slate-200" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Video className="h-5 w-5 text-red-600" />
              </div>

              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Sessions unavailable
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                {error}
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Try again
              </button>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                <CalendarDays className="h-6 w-6 text-blue-600" />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                No upcoming sessions found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Try changing your filters or search terms. New sessions will
                appear here when community members schedule them.
              </p>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {filteredSessions.length}
                  </span>{" "}
                  {filteredSessions.length === 1
                    ? "session"
                    : "sessions"}
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredSessions.map((session, index) => {
                  const id = getSessionId(session);
                  const title = getTitle(session);
                  const description = getDescription(session);
                  const skill = getSkillName(session);
                  const type = getSessionType(session);
                  const access = getAccessType(session);
                  const scheduledAt = getScheduledAt(session);
                  const duration = getDuration(session);
                  const maxParticipants = getMaxParticipants(session);
                  const participantCount =
                    getParticipantCount(session);
                  const creatorName = getCreatorName(session);
                  const creatorUsername =
                    getCreatorUsername(session);

                  const accessInfo =
                    accessConfig[access] || accessConfig.free;

                  const typeLabel =
                    sessionTypeConfig[type] || "Session";

                  return (


                  <article
                    key={id || `${title}-${index}`}
                    className="group flex h-full min-h-[430px] flex-col rounded-2xl border border-slate-200 bg-white text-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
                  >
                    
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        <Video className="h-3.5 w-3.5" />
                        {typeLabel}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${accessInfo.className}`}
                      >
                        {accessInfo.label}
                      </span>
                    </div>

                   
                    <div className="mt-4">
                      <h3 className="line-clamp-2 text-lg font-bold leading-6 text-slate-900">
                        {title}
                      </h3>

                      {skill && (
                        <p className="mt-1.5 text-sm font-semibold text-blue-600">
                          {skill}
                        </p>
                      )}
                    </div>

                   
                    <p className="mt-2.5 line-clamp-2 min-h-[3rem] text-sm leading-5 text-slate-600">
                      {description}
                    </p>

                  
                    <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <CalendarDays className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            Date
                          </p>

                          <p className="truncate text-sm font-medium text-slate-700">
                            {formatDate(scheduledAt)}
                          </p>
                        </div>
                      </div>

                      {scheduledAt && (
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Clock className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              Time
                            </p>

                            <p className="text-sm font-medium text-slate-700">
                              {formatTime(scheduledAt)}
                              {duration ? ` · ${duration} min` : ""}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Users className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            Participants
                          </p>

                          <p className="text-sm font-medium text-slate-700">
                            {participantCount}
                            {maxParticipants ? ` / ${maxParticipants}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Hosted by
                        </p>

                        {creatorUsername ? (
                          <Link
                            to={`/profile/${encodeURIComponent(creatorUsername)}`}
                            className="mt-0.5 block truncate text-sm font-semibold text-slate-700 transition hover:text-blue-600"
                          >
                            {creatorName}
                          </Link>
                        ) : (
                          <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">
                            {creatorName}
                          </p>
                        )}
                      </div>
                    </div>

                   
                    <div className="mt-auto pt-4">
                      <Link
                        to={`/sessions/${id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        View session
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </article>



                  );
                })}
              </div>
            </>
          )}
        </section>


        <section className="mt-4 overflow-hidden rounded-3xl bg-blue-600 ">
          <div className="flex flex-col gap-8 px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12 lg:py-12">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-100">
                <Sparkles className="h-4 w-4" />
                Share your knowledge
              </div>

              <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                Ready to host a learning session?
              </h2>

              <p className="mt-3 text-sm leading-6 text-blue-50 sm:text-base">
                Create a session, choose how people can access it, and meet
                learners through SkillHive's peer-to-peer learning experience.
              </p>
            </div>
            <Link
              to="/sessions/create"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              Create a session
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Sessions;