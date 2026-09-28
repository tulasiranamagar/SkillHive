import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  File,
  Filter,
  Image as ImageIcon,
  Search,
  Sparkles,
  Star,
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

const getContentId = (content) =>
  content?.id ||
  content?.content_id ||
  content?.pk ||
  content?.uuid;

const getTitle = (content) =>
  content?.title ||
  content?.name ||
  "Untitled learning resource";

const getDescription = (content) =>
  content?.description ||
  content?.summary ||
  "Explore this learning resource on SkillHive.";

const getContentType = (content) =>
  String(
    content?.content_type ||
      content?.type ||
      content?.resource_type ||
      "other"
  ).toLowerCase();

const getUnlockType = (content) =>
  String(
    content?.unlock_type ||
      content?.access_type ||
      content?.pricing_type ||
      "free"
  ).toLowerCase();

const getPrice = (content) =>
  content?.price ??
  content?.access_price ??
  content?.amount ??
  0;

const getXpCost = (content) =>
  content?.xp_cost ??
  content?.xp_unlock_cost ??
  content?.unlock_xp ??
  0;

const getViews = (content) =>
  content?.view_count ??
  content?.views ??
  0;

const getRating = (content) =>
  content?.average_rating ??
  content?.rating ??
  0;

const getReviewCount = (content) =>
  content?.review_count ??
  content?.reviews_count ??
  0;

const getCreator = (content) =>
  content?.creator ||
  content?.user ||
  content?.owner ||
  content?.author ||
  null;

const getCreatorName = (content) => {
  const creator = getCreator(content);

  if (!creator) {
    return content?.creator_name || "SkillHive Creator";
  }

  return (
    creator?.name ||
    creator?.full_name ||
    creator?.username ||
    content?.creator_name ||
    "SkillHive Creator"
  );
};

const getCreatorUsername = (content) => {
  const creator = getCreator(content);

  return (
    creator?.username ||
    content?.creator_username ||
    ""
  );
};

const getThumbnail = (content) =>
  content?.thumbnail ||
  content?.thumbnail_url ||
  content?.cover_image ||
  content?.image ||
  null;

const getDuration = (content) =>
  content?.duration ||
  content?.duration_minutes ||
  null;

const getCategory = (content) =>
  content?.category_name ||
  content?.category?.name ||
  content?.category ||
  "";

const contentTypeConfig = {
  video: {
    label: "Video",
    Icon: Video,
  },
  file: {
    label: "File",
    Icon: File,
  },
  image: {
    label: "Image",
    Icon: ImageIcon,
  },
};

const unlockConfig = {
  free: {
    label: "Free",
    className:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  },
  money: {
    label: "Paid",
    className:
      "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  },
  xp: {
    label: "XP",
    className:
      "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
  },
  money_or_xp: {
    label: "Money or XP",
    className:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  },
};

function Marketplace() {
  const [content, setContent] = useState([]);
  const [search, setSearch] = useState("");
  const [contentType, setContentType] = useState("all");
  const [unlockType, setUnlockType] = useState("all");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadContent = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/api/marketplace/content/");

        if (mounted) {
          setContent(normalizeList(response));
        }
      } catch (err) {
        if (mounted) {
          setContent([]);
          setError(
            err?.response?.data?.message ||
              "We couldn't load marketplace content right now."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const values = content
      .map((item) => getCategory(item))
      .filter(Boolean);

    return [...new Set(values)].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [content]);

  const filteredContent = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = content.filter((item) => {
      const title = getTitle(item).toLowerCase();
      const description = getDescription(item).toLowerCase();
      const creator = getCreatorName(item).toLowerCase();
      const itemCategory = getCategory(item).toLowerCase();

      const matchesSearch =
        !query ||
        title.includes(query) ||
        description.includes(query) ||
        creator.includes(query) ||
        itemCategory.includes(query);

      const matchesType =
        contentType === "all" ||
        getContentType(item) === contentType;

      const matchesUnlock =
        unlockType === "all" ||
        getUnlockType(item) === unlockType;

      const matchesCategory =
        category === "all" ||
        itemCategory === category.toLowerCase();

      return (
        matchesSearch &&
        matchesType &&
        matchesUnlock &&
        matchesCategory
      );
    });

    return [...result].sort((a, b) => {
      if (sortBy === "popular") {
        return getViews(b) - getViews(a);
      }

      if (sortBy === "rating") {
        return getRating(b) - getRating(a);
      }

      if (sortBy === "price_low") {
        return Number(getPrice(a)) - Number(getPrice(b));
      }

      if (sortBy === "price_high") {
        return Number(getPrice(b)) - Number(getPrice(a));
      }

      const dateA = new Date(
        a?.created_at ||
          a?.created ||
          a?.updated_at ||
          0
      ).getTime();

      const dateB = new Date(
        b?.created_at ||
          b?.created ||
          b?.updated_at ||
          0
      ).getTime();

      return dateB - dateA;
    });
  }, [
    content,
    search,
    contentType,
    unlockType,
    category,
    sortBy,
  ]);

  const clearFilters = () => {
    setSearch("");
    setContentType("all");
    setUnlockType("all");
    setCategory("all");
    setSortBy("newest");
  };

  const hasFilters =
    search ||
    contentType !== "all" ||
    unlockType !== "all" ||
    category !== "all" ||
    sortBy !== "newest";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HERO */}
      <section className="relative overflow-hidden bg-blue-600 text-white">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20">
              <Sparkles className="h-4 w-4" />
              SkillHive Learning Marketplace
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Learn from the SkillHive community
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-blue-50 sm:text-lg">
              Discover practical learning resources created and
              shared by people in the SkillHive community.
            </p>

            <div className="mt-7 max-w-2xl">
              <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-2xl">
                <Search className="ml-3 h-5 w-5 shrink-0 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search videos, files, skills..."
                  className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSearch(search.trim())}
                  className="hidden rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 sm:block"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
        {/* INTRO */}
        <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between text-white">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
              <BookOpen className="h-4 w-4" />
              Learn at your pace
            </div>

            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
              Explore learning content
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Find useful resources based on your interests,
              preferred format, and learning goals.
            </p>
          </div>

          <Link
            to="/marketplace/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md"
          >
            <Sparkles className="h-4 w-4" />
            Share your knowledge
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* FILTERS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Filter className="h-4 w-4 text-blue-600" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Filter marketplace
              </h3>

              <p className="text-xs text-slate-500">
                Narrow down resources to find what you need.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <select
              value={contentType}
              onChange={(event) =>
                setContentType(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All formats</option>
              <option value="video">Video</option>
              <option value="file">File</option>
              <option value="image">Image</option>
            </select>

            <select
              value={unlockType}
              onChange={(event) =>
                setUnlockType(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All access types</option>
              <option value="free">Free</option>
              <option value="money">Money</option>
              <option value="xp">XP</option>
              <option value="money_or_xp">
                Money or XP
              </option>
            </select>

            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All categories</option>

              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="newest">Newest</option>
              <option value="popular">Most viewed</option>
              <option value="rating">Highest rated</option>
              <option value="price_low">
                Price: low to high
              </option>
              <option value="price_high">
                Price: high to low
              </option>
            </select>

            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
              >
                Clear filters
              </button>
            ) : (
              <div className="hidden lg:block" />
            )}
          </div>
        </section>

        {/* CONTENT */}
        <section className="py-8">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse overflow-hidden rounded-3xl border border-slate-200 bg-white"
                >
                  <div className="h-44 bg-slate-200" />

                  <div className="p-5">
                    <div className="h-3 w-20 rounded bg-slate-200" />
                    <div className="mt-3 h-6 w-3/4 rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-full rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-4/5 rounded bg-slate-200" />

                    <div className="mt-5 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-200" />
                      <div className="h-4 w-24 rounded bg-slate-200" />
                    </div>

                    <div className="mt-5 h-10 rounded-xl bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <BookOpen className="h-5 w-5 text-red-600" />
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Marketplace unavailable
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                {error}
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Try again
              </button>
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <Search className="h-7 w-7 text-blue-600" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                No learning content found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Try changing your search or filters. New learning
                resources will appear here as creators publish them.
              </p>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
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
                  <span className="font-bold text-slate-800">
                    {filteredContent.length}
                  </span>{" "}
                  {filteredContent.length === 1
                    ? "resource"
                    : "resources"}
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredContent.map((item, index) => {
                  const id = getContentId(item);
                  const title = getTitle(item);
                  const description = getDescription(item);
                  const type = getContentType(item);
                  const unlock = getUnlockType(item);
                  const thumbnail = getThumbnail(item);
                  const categoryName = getCategory(item);
                  const creatorName = getCreatorName(item);
                  const creatorUsername =
                    getCreatorUsername(item);
                  const rating =
                    Number(getRating(item)) || 0;
                  const reviews = getReviewCount(item);
                  const views = getViews(item);
                  const duration = getDuration(item);
                  const price = getPrice(item);
                  const xpCost = getXpCost(item);

                  const typeConfig =
                    contentTypeConfig[type] || {
                      label: "Resource",
                      Icon: BookOpen,
                    };

                  const TypeIcon = typeConfig.Icon;

                  const unlockInfo =
                    unlockConfig[unlock] ||
                    unlockConfig.free;

                  const contentDetailUrl =
                    `/marketplace/content/${id}`;

                  return (
                    <article
                      key={id || `${title}-${index}`}
                      className="group flex h-full min-h-[470px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
                    >
                      {/* THUMBNAIL */}
                      <div className="relative h-44 shrink-0 overflow-hidden bg-blue-50">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-md">
                              <TypeIcon className="h-9 w-9 text-blue-600" />
                            </div>
                          </div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/30 to-transparent" />

                        <div className="absolute left-4 top-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-lg">
                            <TypeIcon className="h-3.5 w-3.5 text-blue-600" />
                            {typeConfig.label}
                          </span>
                        </div>

                        <div className="absolute right-4 top-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold shadow-lg ${unlockInfo.className}`}
                          >
                            {unlockInfo.label}
                          </span>
                        </div>

                        {type === "video" && duration && (
                          <div className="absolute bottom-4 left-4">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950/80 px-2.5 py-1.5 text-xs font-semibold text-white">
                              <Clock className="h-3.5 w-3.5" />
                              {duration}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* BODY */}
                      <div className="flex flex-1 flex-col p-6">
                        {categoryName && (
                          <div className="mb-2 flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />

                            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">
                              {categoryName}
                            </p>
                          </div>
                        )}

                        <h3 className="line-clamp-2 text-xl font-bold leading-6 tracking-tight text-slate-900">
                          {title}
                        </h3>

                        <p className="mt-2 line-clamp-2 min-h-[2.75rem] text-sm font-normal leading-5 text-slate-500">
                          {description}
                        </p>

                        {/* CREATOR */}
                        <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                              <Users className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Created by
                              </p>

                              {creatorUsername ? (
                                <Link
                                  to={`/profile/${encodeURIComponent(
                                    creatorUsername
                                  )}`}
                                  className="block truncate text-sm font-semibold text-slate-800 transition hover:text-blue-600"
                                >
                                  {creatorName}
                                </Link>
                              ) : (
                                <p className="truncate text-sm font-semibold text-slate-800">
                                  {creatorName}
                                </p>
                              )}
                            </div>
                          </div>

                          <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                        </div>

                        {/* RATING + VIEWS */}
                        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3.5 py-3">
                          {/* RATING / REVIEWS */}
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            </div>

                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                {rating > 0
                                  ? rating.toFixed(1)
                                  : "New"}
                              </p>

                              {reviews > 0 ? (
                                <p className="text-[10px] font-medium text-slate-400">
                                  {reviews}{" "}
                                  {reviews === 1
                                    ? "review"
                                    : "reviews"}
                                </p>
                              ) : (
                                <p className="text-[10px] font-medium text-slate-400">
                                  No reviews yet
                                </p>
                              )}
                            </div>
                          </div>

                          {/* VIEWS */}
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                              <Eye className="h-3.5 w-3.5 text-blue-600" />
                            </div>

                            <div className="text-right">
                              <p className="text-xs font-bold text-slate-800">
                                {views}
                              </p>

                              <p className="text-[10px] font-medium text-slate-400">
                                views
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* PRICE + VIEW */}
                        <div className="mt-auto pt-5 text-white">
                          <div className="mb-4 flex min-h-[38px] items-center">
                            {unlock === "free" ? (
                              <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">
                                Free
                              </span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                {(unlock === "money" ||
                                  unlock === "money_or_xp") && (
                                  <span className="text-base font-bold text-slate-900">
                                    {price
                                      ? `Rs. ${price}`
                                      : "Paid access"}
                                  </span>
                                )}

                                {(unlock === "xp" ||
                                  unlock === "money_or_xp") && (
                                  <span className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-bold text-violet-700">
                                    {xpCost
                                      ? `${xpCost} XP`
                                      : "XP access"}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <Link
                            to={contentDetailUrl}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md"
                          >
                            View content
                            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* CREATOR CTA */}
        <section className="mt-3 overflow-hidden rounded-3xl bg-blue-600 shadow-lg">
          <div className="relative flex flex-col gap-7 px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12 lg:py-12">
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />

            <div className="relative max-w-2xl">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-100">
                <Sparkles className="h-4 w-4" />
                Share what you know
              </div>

              <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Turn your knowledge into useful learning resources
              </h2>

              <p className="mt-3 text-sm leading-6 text-blue-50 sm:text-base">
                Create videos, files, images, and other resources
                for people learning skills on SkillHive.
              </p>
            </div>

            <Link
              to="/marketplace/create"
              className="relative inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 hover:shadow-md"
            >
              Create content
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Marketplace;