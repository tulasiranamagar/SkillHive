import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Crown,
  Flame,
  Gift,
  Loader2,
  Medal,
  Sparkles,
  Star,
  Target,
  Trophy,
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

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.badges)) {
    return value.badges;
  }

  if (Array.isArray(value?.transactions)) {
    return value.transactions;
  }

  return [];
}

function getId(value) {
  if (!value) return null;

  if (typeof value === "object") {
    return value.id ?? value.pk ?? null;
  }

  return value;
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

function formatDate(value) {
  if (!value) return "Recently";

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

function formatEventName(eventKey) {
  if (!eventKey) return "XP Activity";

  return String(eventKey)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ProgressBar({ value }) {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div className="h-3 overflow-hidden rounded-full bg-blue-100">
      <div
        className="h-full rounded-full bg-blue-600 transition-all duration-700"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, description, iconClass }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {description && (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function BadgeCard({ badge }) {
  const name =
    badge?.name ||
    badge?.title ||
    badge?.badge?.name ||
    "Achievement";

  const description =
    badge?.description ||
    badge?.badge?.description ||
    "A SkillHive achievement earned through your learning activity.";

  const icon =
    badge?.icon ||
    badge?.badge?.icon ||
    null;

  const earnedAt =
    badge?.earned_at ||
    badge?.awarded_at ||
    badge?.created_at ||
    badge?.badge?.earned_at;

  const isActive =
    badge?.is_active ??
    badge?.badge?.is_active ??
    true;

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        isActive ? "border-slate-200" : "border-slate-100 opacity-70"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon ? (
            <span className="text-lg font-bold">
              {String(icon).slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <Award className="h-6 w-6" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900">{name}</h3>

              <p className="mt-1 text-xs font-medium text-blue-600">
                Achievement
              </p>
            </div>

            <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-500" />
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {description}
          </p>

          <p className="mt-4 text-xs text-slate-400">
            Earned {formatDate(earnedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function Gamification() {
  const [summary, setSummary] = useState(null);
  const [badges, setBadges] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function requestFirstAvailable(endpoints) {
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);

        return unwrap(response);
      } catch {
        // Try next compatible endpoint.
      }
    }

    return null;
  }

  async function loadGamification() {
    setLoading(true);
    setError("");

    try {
      const [summaryData, badgesData, transactionsData] =
        await Promise.all([
          requestFirstAvailable([
            "/api/gamification/summary/",
            "/api/gamification/me/",
            "/api/gamification/",
          ]),
          requestFirstAvailable([
            "/api/gamification/badges/my/",
            "/api/gamification/my-badges/",
            "/api/gamification/badges/",
          ]),
          requestFirstAvailable([
            "/api/gamification/transactions/",
            "/api/gamification/xp-history/",
            "/api/gamification/history/",
          ]),
        ]);

      if (!summaryData && !badgesData && !transactionsData) {
        throw new Error(
          "Gamification information could not be loaded."
        );
      }

      setSummary(summaryData || {});
      setBadges(asArray(badgesData));
      setTransactions(asArray(transactionsData));
    } catch (err) {
      setError(
        extractError(
          err,
          "We could not load your gamification information."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGamification();
  }, []);

  const totalEarned =
    summary?.total_earned_xp ??
    summary?.earned_xp ??
    summary?.total_xp_earned ??
    summary?.xp_earned ??
    0;

  const spentXp =
    summary?.spent_xp ??
    summary?.xp_spent ??
    0;

  const availableXp =
    summary?.available_xp ??
    summary?.current_xp ??
    summary?.xp ??
    0;

  const level =
    summary?.level ??
    summary?.current_level ??
    1;

  const nextLevelXp =
    summary?.next_level_xp ??
    Number(level) * 100;

  const currentLevelBaseXp =
    summary?.current_level_xp ??
    Math.max(0, (Number(level) - 1) * 100);

  const xpIntoLevel = Math.max(
    0,
    Number(totalEarned) - Number(currentLevelBaseXp)
  );

  const xpRequiredForLevel = Math.max(
    1,
    Number(nextLevelXp) - Number(currentLevelBaseXp)
  );

  const levelProgress =
    summary?.level_progress_percentage ??
    Math.min(
      100,
      Math.max(
        0,
        (xpIntoLevel / xpRequiredForLevel) * 100
      )
    );

  const activitiesCompleted =
    summary?.learning_activities_completed ??
    summary?.activities_completed ??
    0;

  const assessmentsPassed =
    summary?.assessments_passed ??
    summary?.assessment_passed ??
    0;

  const sessionsAttended =
    summary?.sessions_attended ??
    0;

  const exchangesAccepted =
    summary?.exchanges_accepted ??
    0;

  const badgeCount =
    summary?.badge_count ??
    badges.length;

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const dateA = new Date(
          a?.created_at ||
            a?.timestamp ||
            a?.date ||
            0
        ).getTime();

        const dateB = new Date(
          b?.created_at ||
            b?.timestamp ||
            b?.date ||
            0
        ).getTime();

        return dateB - dateA;
      })
      .slice(0, 8);
  }, [transactions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-48 rounded-3xl bg-slate-200" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-32 rounded-2xl bg-slate-200"
                />
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="h-80 rounded-2xl bg-slate-200 lg:col-span-2" />
              <div className="h-80 rounded-2xl bg-slate-200" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4">
          <div className="w-full rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Zap className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-900">
              Gamification unavailable
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {error}
            </p>

            <button
              type="button"
              onClick={loadGamification}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="overflow-hidden rounded-3xl bg-blue-600 shadow-lg">
          <div className="relative px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-white/5 blur-3xl" />

            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                  SkillHive Progress
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Your achievements and XP
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
                  Build your learning reputation through verified activity,
                  completed roadmap work, assessments, sessions, and skill
                  exchanges.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-4 rounded-2xl bg-white/10 p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600">
                  <Crown className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                    Current Level
                  </p>

                  <p className="mt-1 text-3xl font-bold text-white">
                    Level {level}
                  </p>

                  <p className="mt-1 text-xs text-blue-100">
                    {Number(totalEarned).toLocaleString()} XP earned
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main stats */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Zap}
            label="Available XP"
            value={Number(availableXp).toLocaleString()}
            description="XP currently available for supported SkillHive unlocks."
            iconClass="bg-blue-50 text-blue-600"
          />

          <StatCard
            icon={Trophy}
            label="Total Earned"
            value={Number(totalEarned).toLocaleString()}
            description="Lifetime XP earned from verified platform activities."
            iconClass="bg-amber-50 text-amber-600"
          />

          <StatCard
            icon={Award}
            label="Badges"
            value={badgeCount}
            description="Achievements earned from your learning journey."
            iconClass="bg-violet-50 text-violet-600"
          />

          <StatCard
            icon={Target}
            label="Activities"
            value={activitiesCompleted}
            description="Learning activities completed and recognized."
            iconClass="bg-emerald-50 text-emerald-600"
          />
        </section>

        {/* Level + Activity */}
        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-slate-900">
                    Level Progress
                  </h2>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Your level is based on lifetime earned XP.
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                Level {level}
              </div>
            </div>

            <div className="mt-7">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">
                  Progress to next level
                </span>

                <span className="font-bold text-slate-900">
                  {Math.round(levelProgress)}%
                </span>
              </div>

              <ProgressBar value={levelProgress} />

              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {Number(currentLevelBaseXp).toLocaleString()} XP
                </span>

                <span>
                  {Number(nextLevelXp).toLocaleString()} XP
                </span>
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  XP Earned
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {Number(totalEarned).toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  XP Spent
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {Number(spentXp).toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                  Available
                </p>
                <p className="mt-2 text-xl font-bold text-blue-700">
                  {Number(availableXp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-bold text-slate-900">
                Learning Activity
              </h2>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <BookOpenIcon />
                  <span className="text-sm font-medium text-slate-600">
                    Activities
                  </span>
                </div>

                <span className="font-bold text-slate-900">
                  {activitiesCompleted}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-medium text-slate-600">
                    Assessments
                  </span>
                </div>

                <span className="font-bold text-slate-900">
                  {assessmentsPassed}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <UsersIcon />
                  <span className="text-sm font-medium text-slate-600">
                    Sessions
                  </span>
                </div>

                <span className="font-bold text-slate-900">
                  {sessionsAttended}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <Gift className="h-5 w-5 text-violet-500" />
                  <span className="text-sm font-medium text-slate-600">
                    Exchanges
                  </span>
                </div>

                <span className="font-bold text-slate-900">
                  {exchangesAccepted}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Badges */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Medal className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  Your Badges
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Achievements you have earned through your SkillHive activity.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              {badgeCount} earned
            </span>
          </div>

          {badges.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                <Award className="h-6 w-6" />
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                Your first badge is waiting
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Keep completing learning activities, assessments, sessions,
                and other verified SkillHive activities to earn achievements.
              </p>

              <Link
                to="/learning"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue Learning
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {badges.map((badge, index) => (
                <BadgeCard
                  key={
                    getId(badge) ||
                    getId(badge?.badge) ||
                    `${badge?.name || "badge"}-${index}`
                  }
                  badge={badge}
                />
              ))}
            </div>
          )}
        </section>

        {/* XP History */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  Recent XP Activity
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                A record of recent XP earned or spent on the platform.
              </p>
            </div>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-500">
                No XP activity has been recorded yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-100">
              <div className="divide-y divide-slate-100">
                {recentTransactions.map((transaction, index) => {
                  const points = Number(
                    transaction?.points ??
                      transaction?.xp ??
                      transaction?.amount ??
                      0
                  );

                  const positive = points >= 0;

                  const eventName =
                    transaction?.description ||
                    transaction?.event_name ||
                    transaction?.event_key ||
                    transaction?.reason ||
                    "XP Activity";

                  return (
                    <div
                      key={
                        getId(transaction) ||
                        `${eventName}-${index}`
                      }
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            positive
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {positive ? (
                            <Zap className="h-4 w-4" />
                          ) : (
                            <Gift className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {formatEventName(eventName)}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(
                              transaction?.created_at ||
                                transaction?.timestamp ||
                                transaction?.date
                            )}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 text-sm font-bold ${
                          positive
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {positive ? "+" : ""}
                        {points.toLocaleString()} XP
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Link
            to="/leaderboard"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Trophy className="h-5 w-5" />
              </div>

              <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" />
            </div>

            <h3 className="mt-4 font-bold text-slate-900">
              View Leaderboard
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              See how your lifetime earned XP compares across SkillHive.
            </p>
          </Link>

          <Link
            to="/learning"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BookOpenIcon />
              </div>

              <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" />
            </div>

            <h3 className="mt-4 font-bold text-slate-900">
              Continue Learning
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Complete verified learning activities and grow your XP.
            </p>
          </Link>

          <Link
            to="/exchanges"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Star className="h-5 w-5" />
              </div>

              <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" />
            </div>

            <h3 className="mt-4 font-bold text-slate-900">
              Skill Exchange
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Connect with peers and earn XP through completed exchanges.
            </p>
          </Link>
        </section>
      </main>
    </div>
  );
}

function BookOpenIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a4 4 0 0 0-4-4H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a4 4 0 0 1 4-4h6z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5 text-blue-500"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default Gamification;