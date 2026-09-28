import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Flame,
  GraduationCap,
  LayoutDashboard,
  Map,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Star,
  Target,
  Trophy,
  Users,
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
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.items)) {
    return value.items;
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

  return fallback;
}

function getUserName(user) {
  return (
    user?.name ||
    user?.full_name ||
    user?.username ||
    user?.user?.name ||
    user?.user?.username ||
    "there"
  );
}

function getProgressValue(value) {
  if (typeof value === "number") {
    return Math.min(100, Math.max(0, value));
  }

  const progress =
    value?.progress_percentage ??
    value?.completion_percentage ??
    value?.percentage ??
    0;

  return Math.min(
    100,
    Math.max(0, Number(progress) || 0)
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  iconClassName = "bg-blue-50 text-blue-600",
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClassName}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <span className="text-2xl font-bold text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-700">
        {label}
      </p>

      {description && (
        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function ProgressBar({ value = 0 }) {
  const safeValue = Math.min(
    100,
    Math.max(0, Number(value) || 0)
  );

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-blue-100">
      <div
        className="h-full rounded-full bg-blue-600 transition-all duration-500"
        style={{
          width: `${safeValue}%`,
        }}
      />
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [roadmapProgress, setRoadmapProgress] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        api.get("/api/accounts/me/"),
        api.get("/api/goals/my/"),
        api.get("/api/skill-sessions/my/"),
        api.get("/api/exchanges/"),
        api.get("/api/roadmaps/progress/"),
        api.get("/api/notifications/"),
      ]);

      const [
        userResult,
        goalsResult,
        sessionsResult,
        exchangesResult,
        progressResult,
        notificationsResult,
      ] = results;

      if (userResult.status === "fulfilled") {
        setUser(unwrap(userResult.value));
      }

      if (goalsResult.status === "fulfilled") {
        const goalData = unwrap(goalsResult.value);
        setGoals(asArray(goalData));
      }

      if (sessionsResult.status === "fulfilled") {
        const sessionData = unwrap(sessionsResult.value);
        setSessions(asArray(sessionData));
      }

      if (exchangesResult.status === "fulfilled") {
        const exchangeData = unwrap(exchangesResult.value);
        setExchanges(asArray(exchangeData));
      }

      if (progressResult.status === "fulfilled") {
        const progressData = unwrap(progressResult.value);
        const progressItems = asArray(progressData);

        const latest =
          progressItems[progressItems.length - 1];

        if (latest) {
          setRoadmapProgress(
            getProgressValue(latest)
          );
        } else if (
          progressData &&
          typeof progressData === "object"
        ) {
          setRoadmapProgress(
            getProgressValue(progressData)
          );
        }
      }

      if (notificationsResult.status === "fulfilled") {
        const notificationData =
          unwrap(notificationsResult.value);

        setNotifications(
          asArray(notificationData)
        );
      }
    } catch (err) {
      setError(
        extractError(
          err,
          "We could not load your dashboard."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const activeGoal = useMemo(() => {
    return (
      goals.find(
        (goal) =>
          goal?.status === "active" ||
          goal?.is_active === true ||
          goal?.completed === false
      ) || goals[0] || null
    );
  }, [goals]);

  const goalTitle =
    activeGoal?.title ||
    activeGoal?.name ||
    activeGoal?.goal?.title ||
    activeGoal?.goal?.name ||
    activeGoal?.career_goal?.title ||
    activeGoal?.career_goal?.name ||
    "Your Learning Goal";

  const completedGoals = useMemo(() => {
    return goals.filter(
      (goal) =>
        goal?.completed === true ||
        goal?.status === "completed"
    ).length;
  }, [goals]);

  const currentSessionCount = useMemo(() => {
    return sessions.filter((session) => {
      const status = String(
        session?.status || ""
      ).toLowerCase();

      return (
        status === "scheduled" ||
        status === "active"
      );
    }).length;
  }, [sessions]);

  const openExchangeCount = useMemo(() => {
    return exchanges.filter((exchange) => {
      return (
        String(
          exchange?.status || "open"
        ).toLowerCase() === "open"
      );
    }).length;
  }, [exchanges]);

  const displayName = getUserName(user);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-36 rounded-3xl bg-slate-200" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-32 rounded-2xl bg-slate-200"
                />
              ))}
            </div>

            <div className="h-56 rounded-2xl bg-slate-200" />
            <div className="h-48 rounded-2xl bg-slate-200" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        <section className="overflow-hidden rounded-3xl bg-blue-600 shadow-lg">
          <div className="relative px-6 py-8 sm:px-8 lg:px-10">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-white/5 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Welcome back, {displayName}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                  Track your learning progress, goals,
                  sessions, exchanges, and achievements
                  from one place.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/roadmap"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  <Map className="h-4 w-4" />
                  Open Roadmap
                </Link>

                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  View Profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <RefreshCw className="h-4 w-4" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">
                  Some dashboard information could not
                  be loaded.
                </p>

                <p className="mt-1 text-xs text-red-700">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={loadDashboard}
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Zap}
            label="XP"
            value={
              user?.xp ??
              user?.profile?.xp ??
              0
            }
            description="Your current experience points"
            iconClassName="bg-blue-50 text-blue-600"
          />

          <StatCard
            icon={Trophy}
            label="Level"
            value={
              user?.level ??
              user?.profile?.level ??
              1
            }
            description="Your current learning level"
            iconClassName="bg-amber-50 text-amber-600"
          />

          <StatCard
            icon={Target}
            label="Goals"
            value={goals.length}
            description={`${completedGoals} completed`}
            iconClassName="bg-violet-50 text-violet-600"
          />

          <StatCard
            icon={Users}
            label="Open Exchanges"
            value={openExchangeCount}
            description="Peer skill opportunities"
            iconClassName="bg-emerald-50 text-emerald-600"
          />
        </section>


        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Map className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                  Learning Progress
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {goalTitle}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Continue your personalized learning
                  roadmap and complete each required step.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/roadmap")}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Continue Roadmap
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold">
              <span className="text-slate-600">
                Overall roadmap progress
              </span>

              <span className="text-slate-900">
                {Math.round(roadmapProgress)}%
              </span>
            </div>

            <ProgressBar value={roadmapProgress} />
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <GraduationCap className="h-5 w-5" />
              </div>

              <Link
                to="/goals"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                View goals
              </Link>
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-900">
              Career Goals
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Your selected goals drive your personalized
              roadmap.
            </p>

            <div className="mt-5 flex items-end gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {goals.length}
              </span>

              <span className="pb-1 text-sm text-slate-500">
                goals
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Clock3 className="h-5 w-5" />
              </div>

              <Link
                to="/my-sessions"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                View sessions
              </Link>
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-900">
              Upcoming Sessions
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Sessions you are hosting or participating
              in.
            </p>

            <div className="mt-5 flex items-end gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {currentSessionCount}
              </span>

              <span className="pb-1 text-sm text-slate-500">
                active
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Users className="h-5 w-5" />
              </div>

              <Link
                to="/exchange"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Explore exchanges
              </Link>
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-900">
              Skill Exchanges
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Find peers to share and learn skills with.
            </p>

            <div className="mt-5 flex items-end gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {openExchangeCount}
              </span>

              <span className="pb-1 text-sm text-slate-500">
                open
              </span>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Quick Actions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Jump directly to the things you use most.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/my-skills"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Star className="h-5 w-5" />
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                My Skills
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Manage skills you know and want to learn.
              </p>

              <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-blue-600">
                Manage skills
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>

            <Link
              to="/exchange"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Users className="h-5 w-5" />
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                Skill Exchange
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Share a skill and find peers to learn from.
              </p>

              <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-blue-600">
                Open exchange
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>

            <Link
              to="/marketplace"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <BookOpen className="h-5 w-5" />
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                Marketplace
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Discover learning content from peers.
              </p>

              <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-blue-600">
                Browse content
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>

            <Link
              to="/my-sessions"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock3 className="h-5 w-5" />
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                My Sessions
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Manage your upcoming and past sessions.
              </p>

              <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-blue-600">
                View sessions
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Bell className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">
                    Notifications
                  </h3>

                  <p className="text-sm text-slate-500">
                    Your latest activity
                  </p>
                </div>
              </div>

              <Link
                to="/notifications"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                View all
              </Link>
            </div>

            <div className="mt-5">
              {notifications.length ? (
                <div className="space-y-3">
                  {notifications
                    .slice(0, 3)
                    .map((notification, index) => (
                      <div
                        key={
                          notification?.id ??
                          `notification-${index}`
                        }
                        className="rounded-xl bg-slate-50 p-4"
                      >
                        <p className="text-sm font-medium text-slate-800">
                          {notification?.title ||
                            notification?.message ||
                            "You have a new notification."}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 p-5 text-center">
                  <Bell className="mx-auto h-6 w-6 text-slate-400" />

                  <p className="mt-2 text-sm text-slate-500">
                    No recent notifications.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Trophy className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  Keep Building Your Skills
                </h3>

                <p className="text-sm text-slate-500">
                  Your activity contributes to your learning
                  journey.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />

                <span className="text-sm text-slate-600">
                  Complete roadmap learning activities
                </span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                <MessageCircle className="h-5 w-5 text-blue-500" />

                <span className="text-sm text-slate-600">
                  Participate in peer learning sessions
                </span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                <Zap className="h-5 w-5 text-amber-500" />

                <span className="text-sm text-slate-600">
                  Earn XP through eligible learning activity
                </span>
              </div>
            </div>
          </div>
        </section>
        
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-slate-900">
                Need to manage your account?
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Update your profile, settings, skills, and
                learning preferences.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Users className="h-4 w-4" />
                Profile
              </Link>

              <Link
                to="/settings"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;