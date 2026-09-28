import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  File,
  FileText,
  Filter,
  Image as ImageIcon,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Search,
  ShoppingBag,
  Video,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

function unwrap(response) {
  const data = response?.data;

  if (data?.data !== undefined) {
    return data.data;
  }

  return data;
}

function extractError(
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

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  if (typeof data.error === "string") {
    return data.error;
  }

  const firstValue = Object.values(data)[0];

  if (Array.isArray(firstValue) && firstValue.length) {
    return String(firstValue[0]);
  }

  if (typeof firstValue === "string") {
    return firstValue;
  }

  return fallback;
}

function normalizePurchase(item) {
  const content =
    item?.content ??
    item?.marketplace_content ??
    item?.listing ??
    item;

  const creator =
    content?.creator ??
    item?.creator ??
    {};

  const resource =
    item?.resource ??
    content?.resource ??
    content?.resource_url ??
    content?.file ??
    content?.file_url ??
    null;

  return {
    id:
      item?.id ??
      item?.unlock_id ??
      item?.purchase_id ??
      null,

    contentId:
      item?.content_id ??
      item?.contentId ??
      content?.id ??
      item?.marketplace_content_id ??
      null,

    title:
      content?.title ??
      content?.name ??
      item?.title ??
      "Learning content",

    description:
      content?.description ??
      item?.description ??
      "",

    contentType:
      content?.content_type ??
      content?.contentType ??
      content?.type ??
      item?.content_type ??
      "file",

    unlockType:
      content?.unlock_type ??
      content?.unlockType ??
      item?.unlock_type ??
      "free",

    unlockMethod:
      item?.unlock_method ??
      item?.method ??
      item?.payment_method ??
      null,

    amountPaid:
      item?.amount_paid ??
      item?.amountPaid ??
      item?.price_paid ??
      0,

    xpSpent:
      item?.xp_spent ??
      item?.xpSpent ??
      0,

    resource,

    creatorName:
      creator?.name ??
      creator?.full_name ??
      creator?.username ??
      item?.creator_name ??
      "SkillHive creator",

    creatorUsername:
      creator?.username ??
      item?.creator_username ??
      "",

    skill:
      content?.skill?.name ??
      content?.skill_name ??
      item?.skill_name ??
      "",

    category:
      content?.category?.name ??
      content?.category_name ??
      content?.category ??
      item?.category ??
      "",

    unlockedAt:
      item?.created_at ??
      item?.unlocked_at ??
      item?.unlockedAt ??
      item?.purchased_at ??
      null,

    active:
      content?.is_active ??
      content?.active ??
      true,
  };
}

function normalizeItems(data) {
  const items = Array.isArray(data)
    ? data
    : data?.results ??
      data?.purchases ??
      data?.unlocks ??
      data?.items ??
      data?.data ??
      [];

  return Array.isArray(items)
    ? items.map(normalizePurchase)
    : [];
}

function getContentIcon(type) {
  const value = String(type || "").toLowerCase();

  if (value === "video") {
    return Video;
  }

  if (value === "image") {
    return ImageIcon;
  }

  return FileText;
}

function formatDate(value) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getMethodLabel(method, unlockType) {
  const value = String(method || "").toLowerCase();

  if (
    value === "xp" ||
    value === "experience"
  ) {
    return "Unlocked with XP";
  }

  if (
    value === "money" ||
    value === "payment"
  ) {
    return "Purchased";
  }

  if (
    value === "free" ||
    unlockType === "free"
  ) {
    return "Free access";
  }

  return "Unlocked";
}

function getResourceUrl(resource) {
  if (!resource) {
    return null;
  }

  if (typeof resource === "string") {
    return resource;
  }

  return (
    resource?.url ??
    resource?.file ??
    resource?.resource_url ??
    null
  );
}

function MarketplacePurchases() {
  const [purchases, setPurchases] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedPurchase, setSelectedPurchase] =
    useState(null);

  async function loadPurchases({
    showLoader = true,
  } = {}) {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    const endpoints = [
      `/api/marketplace/purchases/?page=${page}&page_size=${pageSize}`,
      `/api/marketplace/unlocks/?page=${page}&page_size=${pageSize}`,
      `/api/marketplace/my-purchases/?page=${page}&page_size=${pageSize}`,
      `/api/marketplace/content/unlocked/?page=${page}&page_size=${pageSize}`,
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);

        const raw = unwrap(response);
        const items = normalizeItems(raw);

        setPurchases(items);

        const count =
          raw?.count ??
          raw?.total ??
          raw?.pagination?.count ??
          raw?.pagination?.total ??
          null;

        if (count !== null) {
          setTotalPages(
            Math.max(
              1,
              Math.ceil(
                Number(count) / pageSize
              )
            )
          );
        } else {
          const next =
            raw?.next ??
            raw?.pagination?.next;

          setTotalPages(
            next || items.length === pageSize
              ? page + 1
              : page
          );
        }

        return;
      } catch (requestError) {
        lastError = requestError;
      }
    }

    setError(
      extractError(
        lastError,
        "Could not load your unlocked content."
      )
    );

    setPurchases([]);

    if (showLoader) {
      setLoading(false);
    } else {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPurchases();
  }, [page]);

  const filteredPurchases = useMemo(() => {
    const query = search.trim().toLowerCase();

    return purchases.filter((purchase) => {
      const matchesSearch =
        !query ||
        purchase.title
          .toLowerCase()
          .includes(query) ||
        purchase.description
          .toLowerCase()
          .includes(query) ||
        purchase.creatorName
          .toLowerCase()
          .includes(query) ||
        purchase.skill
          .toLowerCase()
          .includes(query);

      const matchesType =
        typeFilter === "all" ||
        String(
          purchase.contentType
        ).toLowerCase() === typeFilter;

      const method =
        String(
          purchase.unlockMethod ||
            purchase.unlockType ||
            ""
        ).toLowerCase();

      const matchesMethod =
        methodFilter === "all" ||
        method === methodFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesMethod
      );
    });
  }, [
    purchases,
    search,
    typeFilter,
    methodFilter,
  ]);

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setMethodFilter("all");
    setPage(1);
  }

  async function handleRefresh() {
    await loadPurchases({
      showLoader: false,
    });
  }

  const totalUnlocked = purchases.length;

  const xpUnlocks = purchases.filter(
    (purchase) =>
      String(
        purchase.unlockMethod
      ).toLowerCase() === "xp"
  ).length;

  const moneyPurchases = purchases.filter(
    (purchase) =>
      String(
        purchase.unlockMethod
      ).toLowerCase() === "money" ||
      String(
        purchase.unlockMethod
      ).toLowerCase() === "payment"
  ).length;

  const totalXpSpent = purchases.reduce(
    (sum, purchase) =>
      sum + (Number(purchase.xpSpent) || 0),
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-52 animate-pulse rounded-3xl bg-slate-200" />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-2xl bg-slate-200"
              />
            ))}
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-80 animate-pulse rounded-2xl bg-slate-200"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="overflow-hidden rounded-3xl bg-blue-600 shadow-sm">
          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white">
                  <ShoppingBag className="h-5 w-5" />
                </div>

                <h1 className="mt-5 text-2xl font-bold text-white sm:text-3xl">
                  My Learning Library
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                  Everything you have unlocked or purchased
                  from the SkillHive marketplace in one place.
                </p>
              </div>

              <Link
                to="/marketplace"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                <BookOpen className="h-4 w-4" />
                Explore marketplace
              </Link>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <X className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <p className="text-sm font-medium text-red-700">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadPurchases({
                    showLoader: false,
                  })
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-100"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={ShoppingBag}
            label="Unlocked"
            value={totalUnlocked}
            description="Resources in your library"
          />

          <StatCard
            icon={Award}
            label="XP unlocks"
            value={xpUnlocks}
            description="Resources unlocked with XP"
          />

          <StatCard
            icon={CheckCircle2}
            label="Purchases"
            value={moneyPurchases}
            description="Resources unlocked with money"
          />

          <StatCard
            icon={Award}
            label="XP spent"
            value={totalXpSpent}
            description="XP used for marketplace access"
          />
        </section>

        {/* Toolbar */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search your learning library..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <select
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-40"
                >
                  <option value="all">
                    All types
                  </option>

                  <option value="video">
                    Videos
                  </option>

                  <option value="file">
                    Files
                  </option>

                  <option value="image">
                    Images
                  </option>
                </select>
              </div>

              <select
                value={methodFilter}
                onChange={(event) => {
                  setMethodFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-40"
              >
                <option value="all">
                  All access
                </option>

                <option value="free">
                  Free
                </option>

                <option value="money">
                  Money
                </option>

                <option value="xp">
                  XP
                </option>
              </select>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}

                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="mt-6">
          {filteredPurchases.length === 0 ? (
            <EmptyState
              hasFilters={
                Boolean(search) ||
                typeFilter !== "all" ||
                methodFilter !== "all"
              }
              onClear={clearFilters}
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredPurchases.map(
                (purchase, index) => (
                  <PurchaseCard
                    key={
                      purchase.id ??
                      purchase.contentId ??
                      `${purchase.title}-${index}`
                    }
                    purchase={purchase}
                    onOpen={() =>
                      setSelectedPurchase(purchase)
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* Pagination */}
        {filteredPurchases.length > 0 &&
          totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((current) =>
                    Math.max(1, current - 1)
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <span className="text-xs font-semibold text-slate-500">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) =>
                    Math.min(
                      totalPages,
                      current + 1
                    )
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
      </main>

      {selectedPurchase && (
        <ResourceModal
          purchase={selectedPurchase}
          onClose={() =>
            setSelectedPurchase(null)
          }
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>

        <span className="text-2xl font-bold text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm font-bold text-slate-900">
        {label}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function PurchaseCard({
  purchase,
  onOpen,
}) {
  const Icon = getContentIcon(
    purchase.contentType
  );

  const methodLabel = getMethodLabel(
    purchase.unlockMethod,
    purchase.unlockType
  );

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="relative flex h-36 items-center justify-center bg-blue-50">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
          <Icon className="h-7 w-7" />
        </div>

        <span className="absolute left-4 top-4 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 shadow-sm">
          {purchase.contentType}
        </span>

        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-[10px] font-semibold text-white">
          <CheckCircle2 className="h-3 w-3" />
          Unlocked
        </span>
      </div>

      <div className="p-5">
        <h2 className="line-clamp-2 text-base font-bold leading-6 text-slate-900">
          {purchase.title}
        </h2>

        {purchase.skill && (
          <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
            {purchase.skill}
          </div>
        )}

        <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
          {purchase.description ||
            "Learning resource available in your SkillHive library."}
        </p>

        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Creator
            </span>

            <span className="max-w-[180px] truncate text-xs font-semibold text-slate-700">
              {purchase.creatorName}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Access
            </span>

            <span className="text-xs font-semibold text-blue-600">
              {methodLabel}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Unlocked
            </span>

            <span className="text-xs font-medium text-slate-600">
              {formatDate(
                purchase.unlockedAt
              )}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <BookOpen className="h-4 w-4" />
          Open resource
        </button>
      </div>
    </article>
  );
}

function ResourceModal({
  purchase,
  onClose,
}) {
  const Icon = getContentIcon(
    purchase.contentType
  );

  const resourceUrl = getResourceUrl(
    purchase.resource
  );

  const contentType = String(
    purchase.contentType || ""
  ).toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-slate-900">
                {purchase.title}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {getMethodLabel(
                  purchase.unlockMethod,
                  purchase.unlockType
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {contentType === "video" &&
            resourceUrl && (
              <video
                src={resourceUrl}
                controls
                className="max-h-[55vh] w-full rounded-2xl bg-black"
              />
            )}

          {contentType === "image" &&
            resourceUrl && (
              <div className="flex max-h-[60vh] justify-center overflow-auto rounded-2xl bg-slate-100 p-4">
                <img
                  src={resourceUrl}
                  alt={purchase.title}
                  className="max-h-[55vh] max-w-full rounded-xl object-contain"
                />
              </div>
            )}

          {contentType === "file" &&
            resourceUrl && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  <File className="h-8 w-8" />
                </div>

                <h3 className="mt-5 text-base font-bold text-slate-900">
                  Your learning file is ready
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Open the unlocked resource in a new tab.
                </p>

                <a
                  href={resourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open file
                </a>
              </div>
            )}

          {!resourceUrl && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
              <LockKeyhole className="mx-auto h-8 w-8 text-amber-600" />

              <h3 className="mt-4 text-base font-bold text-slate-900">
                Resource unavailable
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Your unlock record exists, but the resource URL
                was not returned by the server. Please refresh
                later or contact the creator/platform administrator.
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Creator
              </p>

              <p className="mt-1 text-sm font-bold text-slate-900">
                {purchase.creatorName}
              </p>

              {purchase.creatorUsername && (
                <p className="mt-1 text-xs text-slate-500">
                  @{purchase.creatorUsername}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Unlocked
              </p>

              <div className="mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />

                <p className="text-sm font-bold text-slate-900">
                  {formatDate(
                    purchase.unlockedAt
                  )}
                </p>
              </div>
            </div>
          </div>

          {purchase.description && (
            <div className="mt-5 rounded-xl bg-slate-50 p-5">
              <h3 className="text-sm font-bold text-slate-900">
                About this resource
              </h3>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {purchase.description}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  hasFilters,
  onClear,
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <ShoppingBag className="h-7 w-7" />
      </div>

      <h2 className="mt-5 text-lg font-bold text-slate-900">
        {hasFilters
          ? "No matching resources"
          : "Your learning library is empty"}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilters
          ? "Try changing your search or filters."
          : "When you unlock marketplace content, it will appear here so you can easily return to it."}
      </p>

      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            Clear filters
          </button>
        )}

        <Link
          to="/marketplace"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <BookOpen className="h-4 w-4" />
          Explore marketplace
        </Link>
      </div>
    </div>
  );
}

export default MarketplacePurchases;