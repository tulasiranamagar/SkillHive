import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Crown,
  Medal,
  RefreshCw,
  Search,
  Sparkles,
  Trophy,
  User,
  Users,
} from "lucide-react";

import api from "../../api/axios";

function unwrap(response) {
  const data = response?.data;

  if (data?.data !== undefined) {
    return data.data;
  }

  return data;
}

function extractItems(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.leaderboard)) {
    return data.leaderboard;
  }

  if (Array.isArray(data?.entries)) {
    return data.entries;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
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

function normalizeEntry(item, index, page, pageSize) {
  const nestedUser =
    item?.user ??
    item?.profile ??
    item?.account ??
    {};

  const rank =
    item?.rank ??
    item?.position ??
    index + 1 + (page - 1) * pageSize;

  const level =
    item?.level ??
    nestedUser?.level ??
    1;

  const badges =
    item?.badge_count ??
    item?.badgeCount ??
    item?.badges_count ??
    item?.badgesCount ??
    (Array.isArray(item?.badges)
      ? item.badges.length
      : 0);

  const isCurrentUser =
    item?.is_current_user === true ||
    item?.isCurrentUser === true ||
    item?.is_me === true ||
    item?.isMe === true ||
    item?.current_user === true ||
    item?.currentUser === true;

  const ownXp =
    item?.total_earned_xp ??
    item?.totalEarnedXp ??
    item?.earned_xp ??
    item?.earnedXp ??
    item?.xp ??
    item?.points ??
    null;

  return {
    id:
      item?.id ??
      item?.user_id ??
      item?.userId ??
      nestedUser?.id ??
      `leaderboard-${rank}`,

    rank: Number(rank) || index + 1,

    name:
      item?.name ??
      item?.full_name ??
      item?.fullName ??
      nestedUser?.name ??
      nestedUser?.full_name ??
      nestedUser?.fullName ??
      "SkillHive User",

    username:
      item?.username ??
      nestedUser?.username ??
      "",

    avatar:
      item?.avatar ??
      item?.profile_picture ??
      item?.profilePicture ??
      nestedUser?.avatar ??
      nestedUser?.profile_picture ??
      nestedUser?.profilePicture ??
      null,

    level: Number(level) || 1,

    badges: Number(badges) || 0,

    isCurrentUser,

    ownXp:
      isCurrentUser && ownXp !== null && ownXp !== undefined
        ? Number(ownXp) || 0
        : null,
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(
    Number(value) || 0
  );
}

function getRankStyle(rank) {
  if (rank === 1) {
    return {
      wrapper: "border-amber-200 bg-amber-50",
      badge: "bg-amber-500 text-white",
      icon: Crown,
      iconClass: "text-amber-600",
    };
  }

  if (rank === 2) {
    return {
      wrapper: "border-slate-200 bg-slate-50",
      badge: "bg-slate-500 text-white",
      icon: Medal,
      iconClass: "text-slate-500",
    };
  }

  if (rank === 3) {
    return {
      wrapper: "border-orange-200 bg-orange-50",
      badge: "bg-orange-500 text-white",
      icon: Medal,
      iconClass: "text-orange-600",
    };
  }

  return {
    wrapper: "border-slate-200 bg-white",
    badge: "bg-slate-100 text-slate-600",
    icon: Trophy,
    iconClass: "text-slate-400",
  };
}

function Leaderboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [page, setPage] = useState(1);

  const pageSize = 20;

  const [pagination, setPagination] = useState({
    count: null,
    next: null,
    previous: null,
  });

  async function loadLeaderboard(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("page_size", String(pageSize));

      if (period !== "all") {
        params.set("period", period);
      }

      const response = await api.get(
        `/api/gamification/leaderboard/?${params.toString()}`
      );

      const data = unwrap(response);

      const rawItems = extractItems(data);

      const normalizedItems = rawItems.map(
        (item, index) =>
          normalizeEntry(
            item,
            index,
            page,
            pageSize
          )
      );

      setEntries(normalizedItems);

      setPagination({
        count:
          data?.count ??
          data?.total_count ??
          data?.total ??
          null,

        next: data?.next ?? null,

        previous:
          data?.previous ??
          data?.prev ??
          null,
      });
    } catch (requestError) {
      setError(
        extractError(
          requestError,
          "Could not load the leaderboard."
        )
      );

      setEntries([]);

      setPagination({
        count: null,
        next: null,
        previous: null,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadLeaderboard();
  }, [page, period]);

  useEffect(() => {
    setPage(1);
  }, [period]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return entries;
    }

    return entries.filter((entry) =>
      [entry.name, entry.username]
        .filter(
          (value) =>
            value !== null &&
            value !== undefined &&
            value !== ""
        )
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        )
    );
  }, [entries, search]);

  const topThree = useMemo(
    () =>
      entries
        .filter((entry) => entry.rank <= 3)
        .sort((a, b) => a.rank - b.rank),
    [entries]
  );

  const totalPages =
    pagination.count !== null
      ? Math.max(
          1,
          Math.ceil(
            Number(pagination.count) / pageSize
          )
        )
      : null;

  const canPrevious =
    Boolean(pagination.previous) || page > 1;

  const canNext =
    Boolean(pagination.next) ||
    (totalPages !== null && page < totalPages);

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Hero */}
        <section className="overflow-hidden rounded-3xl bg-blue-600 shadow-lg">
          <div className="px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">

              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  <Trophy className="h-4 w-4" />
                  SkillHive community
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Leaderboard
                </h1>

                <p className="mt-3 text-sm leading-7 text-blue-100 sm:text-base">
                  Discover active members of the SkillHive
                  community and see how they are progressing
                  through learning and skill-sharing activities.
                </p>
              </div>

              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white text-blue-600 shadow-sm">
                <Trophy className="h-10 w-10" />
              </div>
            </div>
          </div>
        </section>

        {/* Controls */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

            <div className="relative w-full xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search by name or username..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">

              {[
                ["all", "All time"],
                ["month", "This month"],
                ["week", "This week"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setPeriod(value)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    period === value
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => loadLeaderboard(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />

                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">

              <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div className="flex-1">
                <h2 className="text-sm font-bold text-red-800">
                  Leaderboard unavailable
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => loadLeaderboard()}
                  className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 */}
        {!loading && !error && topThree.length > 0 && (
          <section className="mt-6">

            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Community leaders
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Members currently holding the top positions.
                </p>
              </div>

              <Sparkles className="h-5 w-5 text-blue-600" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {topThree.map((entry) => (
                <TopLearnerCard
                  key={entry.id}
                  entry={entry}
                />
              ))}
            </div>
          </section>
        )}

        {/* Ranking */}
        <section className="mt-8">

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Community ranking
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Ranking shows position, level, and badges.
                Individual XP remains private.
              </p>
            </div>

            {pagination.count !== null && (
              <p className="text-xs font-medium text-slate-400">
                {formatNumber(pagination.count)} members
              </p>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-2xl bg-slate-200"
                />
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Users className="h-7 w-7" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                No members found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Try another name or username, or change the
                leaderboard period.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                {/* Desktop header */}
                <div className="hidden grid-cols-[70px_minmax(220px,1fr)_120px_120px] items-center gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 md:grid">
                  <span>Rank</span>
                  <span>Member</span>
                  <span>Level</span>
                  <span>Badges</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredEntries.map((entry) => (
                    <LeaderboardRow
                      key={entry.id}
                      entry={entry}
                    />
                  ))}
                </div>
              </div>

              {/* Pagination */}
              {(canPrevious || canNext) && (
                <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

                  <button
                    type="button"
                    disabled={!canPrevious}
                    onClick={() =>
                      setPage((current) =>
                        Math.max(1, current - 1)
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <span className="text-xs font-semibold text-slate-500">
                    {totalPages
                      ? `Page ${page} of ${totalPages}`
                      : `Page ${page}`}
                  </span>

                  <button
                    type="button"
                    disabled={!canNext}
                    onClick={() =>
                      setPage((current) =>
                        current + 1
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Privacy explanation */}
        <section className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">

            <Award className="mt-0.5 h-6 w-6 shrink-0 text-blue-600" />

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Leaderboard privacy
              </h2>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                SkillHive shows community ranking without exposing
                another member's personal XP balance. Members can
                see their own XP privately while the community
                leaderboard focuses on rank, level, badges, and
                profiles.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function TopLearnerCard({ entry }) {
  const rankStyle = getRankStyle(entry.rank);
  const RankIcon = rankStyle.icon;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm ${rankStyle.wrapper}`}
    >
      <div className="flex items-start justify-between gap-4">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${rankStyle.badge}`}
        >
          <RankIcon className="h-5 w-5" />
        </div>

        <span className="text-xs font-bold text-slate-500">
          #{entry.rank}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Avatar entry={entry} size="large" />

        <div className="min-w-0">
          {entry.username ? (
            <Link
              to={`/profile/${encodeURIComponent(
                entry.username
              )}`}
              className="block truncate text-sm font-bold text-slate-900 hover:text-blue-600"
            >
              {entry.name}
            </Link>
          ) : (
            <p className="truncate text-sm font-bold text-slate-900">
              {entry.name}
            </p>
          )}

          {entry.username && (
            <p className="truncate text-xs text-slate-500">
              @{entry.username}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">

        <div className="rounded-xl bg-white/70 p-3">
          <p className="text-xs font-medium text-slate-500">
            Level
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {entry.level}
          </p>
        </div>

        <div className="rounded-xl bg-white/70 p-3">
          <p className="text-xs font-medium text-slate-500">
            Badges
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {entry.badges}
          </p>
        </div>
      </div>

      {entry.isCurrentUser && entry.ownXp !== null && (
        <div className="mt-3 rounded-xl bg-white/70 px-3 py-2">
          <p className="text-xs font-medium text-slate-500">
            Your XP
          </p>

          <p className="mt-1 text-sm font-bold text-slate-900">
            {formatNumber(entry.ownXp)}
          </p>
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({ entry }) {
  const rankStyle = getRankStyle(entry.rank);
  const RankIcon = rankStyle.icon;

  return (
    <div className="grid gap-3 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[70px_minmax(220px,1fr)_120px_120px] md:items-center md:gap-4">

      {/* Rank */}
      <div className="flex items-center justify-between md:justify-start">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${rankStyle.badge}`}
        >
          {entry.rank <= 3 ? (
            <RankIcon className="h-4 w-4" />
          ) : (
            <span className="text-xs font-bold">
              {entry.rank}
            </span>
          )}
        </div>

        <span className="text-xs font-semibold text-slate-400 md:hidden">
          Rank #{entry.rank}
        </span>
      </div>

      {/* Member */}
      <div className="flex min-w-0 items-center gap-3">

        <Avatar entry={entry} />

        <div className="min-w-0">
          {entry.username ? (
            <Link
              to={`/profile/${encodeURIComponent(
                entry.username
              )}`}
              className="block truncate text-sm font-bold text-slate-900 hover:text-blue-600"
            >
              {entry.name}
            </Link>
          ) : (
            <p className="truncate text-sm font-bold text-slate-900">
              {entry.name}
            </p>
          )}

          {entry.username ? (
            <p className="truncate text-xs text-slate-500">
              @{entry.username}
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              SkillHive member
            </p>
          )}
        </div>
      </div>

      {/* Level */}
      <div className="flex items-center justify-between md:block">

        <span className="text-xs text-slate-400 md:hidden">
          Level
        </span>

        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          {entry.level}
        </span>
      </div>

      {/* Badges */}
      <div className="flex items-center justify-between md:block">

        <span className="text-xs text-slate-400 md:hidden">
          Badges
        </span>

        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Award className="h-3.5 w-3.5 text-amber-500" />
          {entry.badges}
        </span>
      </div>

      {/* Own XP only */}
      {entry.isCurrentUser && entry.ownXp !== null && (
        <div className="mt-1 rounded-lg bg-blue-50 px-3 py-2 md:hidden">
          <span className="text-xs font-medium text-blue-600">
            Your XP
          </span>

          <span className="ml-2 text-xs font-bold text-blue-700">
            {formatNumber(entry.ownXp)}
          </span>
        </div>
      )}
    </div>
  );
}

function Avatar({ entry, size = "normal" }) {
  const dimensions =
    size === "large"
      ? "h-12 w-12"
      : "h-10 w-10";

  if (entry.avatar) {
    return (
      <img
        src={entry.avatar}
        alt={entry.name}
        className={`${dimensions} shrink-0 rounded-full object-cover ring-2 ring-white`}
      />
    );
  }

  return (
    <div
      className={`${dimensions} flex shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 ring-2 ring-white`}
    >
      <User
        className={
          size === "large"
            ? "h-6 w-6"
            : "h-5 w-5"
        }
      />
    </div>
  );
}

export default Leaderboard;