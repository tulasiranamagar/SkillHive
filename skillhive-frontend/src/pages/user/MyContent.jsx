import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  FileText,
  Filter,
  Image as ImageIcon,
  LayoutGrid,
  MoreVertical,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Video,
  X,
  Zap,
} from "lucide-react";

import api from "../../api/axios";

const CONTENT_TYPES = {
  VIDEO: "Video",
  FILE: "File",
  IMAGE: "Image",
};

const UNLOCK_TYPES = {
  FREE: "Free",
  MONEY: "Money",
  XP: "XP",
  MONEY_OR_XP: "Money or XP",
};

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value) || 0);
}

function formatPrice(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Rs. 0.00";
  }

  return `Rs. ${number.toFixed(2)}`;
}

function getContentTypeLabel(type) {
  return CONTENT_TYPES[type] || type || "Content";
}

function getUnlockTypeLabel(type) {
  return UNLOCK_TYPES[type] || type || "Access";
}

function getContentIcon(type) {
  switch (type) {
    case "VIDEO":
      return Video;

    case "FILE":
      return FileText;

    case "IMAGE":
      return ImageIcon;

    default:
      return LayoutGrid;
  }
}

function getDescription(content) {
  return (
    content?.description?.trim() ||
    "No description has been added for this content."
  );
}

function getViewProgress(viewCount) {
  const views = Number(viewCount) || 0;

  if (views >= 50) {
    return 100;
  }

  return Math.min((views / 50) * 100, 100);
}

function getViewMilestoneText(viewCount) {
  const views = Number(viewCount) || 0;

  if (views >= 50) {
    return "50+ views reached";
  }

  return `${Math.max(50 - views, 0)} more views to reach 50`;
}

function getResourceLink(content) {
  return (
    content?.video_url ||
    content?.content_file ||
    content?.content_image ||
    ""
  );
}

function normalizeArrayResponse(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.contents)) {
    return data.contents;
  }

  if (Array.isArray(data?.content)) {
    return data.content;
  }

  return [];
}

function ContentCard({ content, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const TypeIcon = getContentIcon(content.content_type);

  const isActive = Boolean(content.is_active);

  const progress = getViewProgress(content.view_count);

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-slate-900">
        {content.content_type === "IMAGE" && content.content_image ? (
          <img
            src={content.content_image}
            alt={content.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-white">
            <TypeIcon size={42} strokeWidth={1.5} />
            <p className="mt-2 text-xs font-medium text-slate-300">
              {getContentTypeLabel(content.content_type)}
            </p>
          </div>
        )}

        <div className="absolute left-3 top-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              isActive
                ? "bg-green-500 text-white"
                : "bg-slate-700 text-slate-200"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isActive ? "bg-white" : "bg-slate-400"
              }`}
            />

            {isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="absolute right-3 top-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-slate-700 shadow-sm transition hover:bg-white"
              aria-label="Content options"
            >
              <MoreVertical size={18} />
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                />

                <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  <Link
                    to={`/marketplace/create?edit=${content.id}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pencil size={15} />
                    Edit Content
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(content);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 size={15} />
                    Delete Content
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-bold text-slate-950">
              {content.title}
            </h3>

            <p className="mt-1 text-xs font-medium text-slate-400">
              {getContentTypeLabel(content.content_type)}
            </p>
          </div>

          <span className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            {getUnlockTypeLabel(content.unlock_type)}
          </span>
        </div>

        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">
          {getDescription(content)}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Eye size={15} />
              <span className="text-xs font-medium">Views</span>
            </div>

            <p className="mt-1 text-lg font-bold text-slate-900">
              {formatNumber(content.view_count)}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-slate-400">
              <CalendarDays size={15} />
              <span className="text-xs font-medium">Created</span>
            </div>

            <p className="mt-1 truncate text-sm font-bold text-slate-900">
              {formatDate(content.created_at)}
            </p>
          </div>
        </div>

        {(Number(content.price) > 0 ||
          Number(content.xp_unlock_cost) > 0) && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {Number(content.price) > 0 && (
                <span className="font-semibold text-slate-700">
                  {formatPrice(content.price)}
                </span>
              )}

              {Number(content.xp_unlock_cost) > 0 && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-purple-700">
                  <Zap size={14} />
                  {content.xp_unlock_cost} XP
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-400">
              View milestone
            </span>

            <span className="font-semibold text-slate-600">
              {getViewMilestoneText(content.view_count)}
            </span>
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Link
            to={`/marketplace/content/${content.id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
          >
            <Eye size={15} />
            View Content
          </Link>

          <span className="text-xs text-slate-400">
            Updated {formatDate(content.updated_at)}
          </span>
        </div>
      </div>
    </article>
  );
}

function StatCard({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon size={19} />
        </div>

        <span className="text-xs font-medium text-slate-400">
          {description}
        </span>
      </div>

      <p className="mt-4 text-2xl font-bold text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-500">
        {label}
      </p>
    </div>
  );
}

export default function MyContent() {
  const [content, setContent] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [unlockFilter, setUnlockFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showFilters, setShowFilters] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchContent = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/api/marketplace/content/", {
        params: {
          mine: "true",
        },
      });

      const data = normalizeArrayResponse(response.data);

      setContent(data);
    } catch (err) {
      console.error("Error loading my content:", err);

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to load your content right now."
      );
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      try {
        await fetchContent();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [fetchContent]);

  async function handleRefresh() {
    setRefreshing(true);
    setSuccess("");

    try {
      await fetchContent();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      await api.delete(
        `/api/marketplace/content/${deleteTarget.id}/`
      );

      setContent((current) =>
        current.filter(
          (item) => item.id !== deleteTarget.id
        )
      );

      setDeleteTarget(null);

      setSuccess(
        `"${deleteTarget.title}" was permanently deleted.`
      );
    } catch (err) {
      console.error("Error deleting content:", err);

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to delete this content."
      );
    } finally {
      setDeleting(false);
    }
  }

  const filteredContent = useMemo(() => {
    const term = search.trim().toLowerCase();

    return content.filter((item) => {
      const matchesSearch =
        !term ||
        String(item.title || "")
          .toLowerCase()
          .includes(term) ||
        String(item.description || "")
          .toLowerCase()
          .includes(term);

      const matchesType =
        typeFilter === "ALL" ||
        item.content_type === typeFilter;

      const matchesUnlock =
        unlockFilter === "ALL" ||
        item.unlock_type === unlockFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && item.is_active) ||
        (statusFilter === "INACTIVE" && !item.is_active);

      return (
        matchesSearch &&
        matchesType &&
        matchesUnlock &&
        matchesStatus
      );
    });
  }, [
    content,
    search,
    typeFilter,
    unlockFilter,
    statusFilter,
  ]);

  const stats = useMemo(() => {
    const totalViews = content.reduce(
      (sum, item) => sum + (Number(item.view_count) || 0),
      0
    );

    const active = content.filter(
      (item) => item.is_active
    ).length;

    const xpUnlocks = content.filter(
      (item) =>
        item.unlock_type === "XP" ||
        item.unlock_type === "MONEY_OR_XP"
    ).length;

    return {
      total: content.length,
      active,
      views: totalViews,
      xpUnlocks,
    };
  }, [content]);

  const hasFilters =
    search.trim() ||
    typeFilter !== "ALL" ||
    unlockFilter !== "ALL" ||
    statusFilter !== "ALL";

  function clearFilters() {
    setSearch("");
    setTypeFilter("ALL");
    setUnlockFilter("ALL");
    setStatusFilter("ALL");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-9 w-64 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-200" />

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 rounded-2xl bg-white"
                />
              ))}
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[520px] rounded-2xl bg-white"
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <section className="rounded-3xl bg-blue-600 p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-100">
                <Archive size={18} />
                <span className="text-xs font-bold uppercase tracking-[0.16em]">
                  Creator workspace
                </span>
              </div>

              <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                My Content
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                Manage the learning content you have shared with
                the SkillHive community.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing ? "animate-spin" : ""
                  }
                />
                Refresh
              </button>

              <Link
                to="/marketplace/create"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
              >
                <Sparkles size={16} />
                Create Content
              </Link>
            </div>
          </div>
        </section>

        {/* Messages */}
        {success && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <p className="font-medium">{success}</p>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="ml-auto text-green-600 hover:text-green-800"
              aria-label="Dismiss"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">{error}</p>

            <button
              type="button"
              onClick={() => setError("")}
              className="ml-auto text-red-600 hover:text-red-800"
              aria-label="Dismiss"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Stats */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={LayoutGrid}
            label="Total content"
            value={formatNumber(stats.total)}
            description="All posts"
          />

          <StatCard
            icon={CheckCircle2}
            label="Active content"
            value={formatNumber(stats.active)}
            description="Published"
          />

          <StatCard
            icon={BarChart3}
            label="Total views"
            value={formatNumber(stats.views)}
            description="All content"
          />

          <StatCard
            icon={Zap}
            label="XP unlocks"
            value={formatNumber(stats.xpUnlocks)}
            description="Access options"
          />
        </section>

        {/* Search and filters */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search your content..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setShowFilters((current) => !current)
              }
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                showFilters || hasFilters
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Filter size={16} />
              Filters
              <ChevronDown
                size={15}
                className={
                  showFilters ? "rotate-180" : ""
                }
              />
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value)
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="ALL">All content types</option>
                <option value="VIDEO">Video</option>
                <option value="FILE">File</option>
                <option value="IMAGE">Image</option>
              </select>

              <select
                value={unlockFilter}
                onChange={(event) =>
                  setUnlockFilter(event.target.value)
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="ALL">All access types</option>
                <option value="FREE">Free</option>
                <option value="MONEY">Money</option>
                <option value="XP">XP</option>
                <option value="MONEY_OR_XP">
                  Money or XP
                </option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          )}

          {hasFilters && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-400">
                {filteredContent.length} matching content
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <X size={14} />
                Clear filters
              </button>
            </div>
          )}
        </section>

        {/* Content */}
        <section className="mt-6">
          {filteredContent.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <LayoutGrid size={25} />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-900">
                {content.length === 0
                  ? "You haven't created any content yet"
                  : "No content matches your filters"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {content.length === 0
                  ? "Share your knowledge with the SkillHive community by creating your first learning resource."
                  : "Try changing your search or filters to find the content you're looking for."}
              </p>

              {content.length === 0 ? (
                <Link
                  to="/marketplace/create"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Sparkles size={16} />
                  Create Content
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <X size={16} />
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Your learning content
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {filteredContent.length}{" "}
                    {filteredContent.length === 1
                      ? "item"
                      : "items"}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredContent.map((item) => (
                  <ContentCard
                    key={item.id}
                    content={item}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="p-6 sm:p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <Trash2 size={22} />
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-950">
                Delete content?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                You are about to permanently delete{" "}
                <span className="font-semibold text-slate-700">
                  "{deleteTarget.title}"
                </span>
                .
              </p>

              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-sm font-medium leading-6 text-red-700">
                  This action cannot be undone. The content,
                  its unlock records, and its reviews will be
                  permanently removed.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
