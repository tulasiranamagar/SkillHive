import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Image as ImageIcon,
  Loader2,
  PlayCircle,
  Search,
  ShoppingBag,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/axios";

const PAGE_SIZE = 9;

function unwrapList(payload) {
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

  if (Array.isArray(payload?.purchases)) {
    return payload.purchases;
  }

  if (Array.isArray(payload?.data?.purchases)) {
    return payload.data.purchases;
  }

  return [];
}

function getId(item) {
  return (
    item?.id ??
    item?.purchase_id ??
    item?.unlock_id ??
    item?.content_id ??
    item?.content?.id
  );
}

function getContent(item) {
  return item?.content || item?.marketplace_content || item;
}

function getTitle(item) {
  const content = getContent(item);

  return (
    content?.title ||
    item?.title ||
    "Untitled learning resource"
  );
}

function getDescription(item) {
  const content = getContent(item);

  return (
    content?.description ||
    item?.description ||
    "Learning resource available in your library."
  );
}

function getType(item) {
  const content = getContent(item);

  return String(
    content?.content_type ||
      content?.type ||
      item?.content_type ||
      item?.type ||
      "resource"
  ).toLowerCase();
}

function getCreator(item) {
  const content = getContent(item);

  const creator =
    content?.creator ||
    content?.owner ||
    item?.creator ||
    item?.owner;

  if (!creator) {
    return "SkillHive creator";
  }

  if (typeof creator === "string") {
    return creator;
  }

  return (
    creator?.name ||
    creator?.username ||
    creator?.full_name ||
    "SkillHive creator"
  );
}

function getResourceUrl(item) {
  const content = getContent(item);

  return (
    content?.resource_url ||
    content?.file_url ||
    content?.video_url ||
    content?.image_url ||
    content?.resource ||
    content?.file ||
    item?.resource_url ||
    item?.file_url ||
    item?.video_url ||
    item?.image_url ||
    item?.resource ||
    item?.file ||
    null
  );
}

function getUnlockedAt(item) {
  return (
    item?.unlocked_at ||
    item?.created_at ||
    item?.purchased_at ||
    item?.purchase_date ||
    null
  );
}

function formatDate(value) {
  if (!value) {
    return "Recently unlocked";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently unlocked";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function TypeIcon({ type, className = "h-5 w-5" }) {
  if (type.includes("video")) {
    return <Video className={className} />;
  }

  if (type.includes("image")) {
    return <ImageIcon className={className} />;
  }

  if (
    type.includes("file") ||
    type.includes("pdf") ||
    type.includes("document")
  ) {
    return <FileText className={className} />;
  }

  return <BookOpen className={className} />;
}

function typeLabel(type) {
  if (type.includes("video")) return "Video";
  if (type.includes("image")) return "Image";
  if (
    type.includes("file") ||
    type.includes("pdf") ||
    type.includes("document")
  ) {
    return "File";
  }

  return "Resource";
}

function ResourceViewer({ item, onClose }) {
  const title = getTitle(item);
  const type = getType(item);
  const resourceUrl = getResourceUrl(item);

  if (!resourceUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Resource unavailable
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                This resource does not currently have a usable file or
                media URL.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isVideo = type.includes("video");
  const isImage = type.includes("image");
  const isPdf =
    type.includes("pdf") ||
    resourceUrl.toLowerCase().split("?")[0].endsWith(".pdf");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {typeLabel(type)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close resource"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4">
          {isVideo ? (
            <video
              src={resourceUrl}
              controls
              className="mx-auto max-h-[72vh] w-full rounded-xl bg-black"
            >
              Your browser does not support video playback.
            </video>
          ) : isImage ? (
            <img
              src={resourceUrl}
              alt={title}
              className="mx-auto max-h-[72vh] rounded-xl object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={resourceUrl}
              title={title}
              className="h-[72vh] w-full rounded-xl border-0 bg-white"
            />
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl bg-white px-6 text-center">
              <FileText className="h-12 w-12 text-blue-600" />

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Open learning resource
              </h3>

              <p className="mt-2 max-w-md text-sm text-slate-500">
                This resource is available as a downloadable file.
              </p>

              <a
                href={resourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Open Resource
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MarketplacePurchases() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadPurchases() {
      setLoading(true);

      const endpoints = [
        "/api/marketplace/purchases/",
        "/api/marketplace/unlocks/",
        "/api/marketplace/my-purchases/",
        "/api/marketplace/my-unlocks/",
      ];

      let loaded = false;

      for (const endpoint of endpoints) {
        try {
          const response = await api.get(endpoint);
          const data = unwrapList(response.data);

          if (mounted) {
            setItems(data);
          }

          loaded = true;
          break;
        } catch (error) {
          const status = error?.response?.status;

          if (status !== 404) {
            if (mounted) {
              setItems([]);
            }

            break;
          }
        }
      }

      if (mounted) {
        setLoading(false);

        if (!loaded) {
          setItems([]);
        }
      }
    }

    loadPurchases();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const title = getTitle(item).toLowerCase();
      const description = getDescription(item).toLowerCase();
      const creator = getCreator(item).toLowerCase();
      const type = getType(item);

      const matchesSearch =
        !normalizedSearch ||
        title.includes(normalizedSearch) ||
        description.includes(normalizedSearch) ||
        creator.includes(normalizedSearch);

      const matchesFilter =
        filter === "all" ||
        (filter === "video" && type.includes("video")) ||
        (filter === "image" && type.includes("image")) ||
        (filter === "file" &&
          (type.includes("file") ||
            type.includes("pdf") ||
            type.includes("document")));

      return matchesSearch && matchesFilter;
    });
  }, [items, search, filter]);

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      videos: items.filter((item) =>
        getType(item).includes("video")
      ).length,
      files: items.filter((item) => {
        const type = getType(item);

        return (
          type.includes("file") ||
          type.includes("pdf") ||
          type.includes("document")
        );
      }).length,
      images: items.filter((item) =>
        getType(item).includes("image")
      ).length,
    };
  }, [items]);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="rounded-2xl bg-blue-600 px-6 py-7 text-white shadow-sm sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                  <ShoppingBag className="h-6 w-6 text-white" />
                </div>

                <div>
                  <p className="text-sm font-medium text-blue-100">
                    Marketplace
                  </p>

                  <h1 className="text-2xl font-bold sm:text-3xl">
                    My Learning Library
                  </h1>
                </div>
              </div>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                Access the learning resources you have unlocked from
                SkillHive creators.
              </p>
            </div>

            <div className="hidden rounded-xl bg-white/10 px-4 py-3 text-right sm:block">
              <div className="text-2xl font-bold">
                {stats.total}
              </div>
              <div className="text-xs text-blue-100">
                Resources unlocked
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<BookOpen className="h-5 w-5" />}
            label="All resources"
            value={stats.total}
          />

          <StatCard
            icon={<PlayCircle className="h-5 w-5" />}
            label="Videos"
            value={stats.videos}
          />

          <StatCard
            icon={<FileText className="h-5 w-5" />}
            label="Files"
            value={stats.files}
          />

          <StatCard
            icon={<ImageIcon className="h-5 w-5" />}
            label="Images"
            value={stats.images}
          />
        </div>

        {/* Toolbar */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search your learning library..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["video", "Videos"],
                ["file", "Files"],
                ["image", "Images"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    filter === value
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="mt-8 flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />

              <p className="mt-3 text-sm font-medium text-slate-600">
                Loading your learning library...
              </p>
            </div>
          </div>
        ) : paginatedItems.length === 0 ? (
          <EmptyLibrary
            hasFilters={Boolean(search.trim()) || filter !== "all"}
            onClear={() => {
              setSearch("");
              setFilter("all");
            }}
          />
        ) : (
          <>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {paginatedItems.map((item, index) => (
                <PurchaseCard
                  key={getId(item) ?? `${getTitle(item)}-${index}`}
                  item={item}
                  onOpen={() => setSelectedItem(item)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-sm text-slate-500">
                  Page{" "}
                  <span className="font-semibold text-slate-900">
                    {currentPage}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-900">
                    {totalPages}
                  </span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setPage((value) => Math.max(1, value - 1))
                    }
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setPage((value) =>
                        Math.min(totalPages, value + 1)
                      )
                    }
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedItem && (
        <ResourceViewer
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-0.5 text-xl font-bold text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function PurchaseCard({ item, onOpen }) {
  const title = getTitle(item);
  const description = getDescription(item);
  const type = getType(item);
  const creator = getCreator(item);
  const unlockedAt = getUnlockedAt(item);
  const resourceUrl = getResourceUrl(item);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative flex h-36 items-center justify-center bg-blue-50">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
          <TypeIcon type={type} className="h-8 w-8" />
        </div>

        <div className="absolute left-4 top-4 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
          {typeLabel(type)}
        </div>

        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-green-700 shadow-sm">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Unlocked
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="line-clamp-2 text-lg font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
          {description}
        </p>

        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
            {creator.charAt(0).toUpperCase()}
          </div>

          <span className="truncate">
            {creator}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <Clock3 className="h-3.5 w-3.5" />
          Unlocked {formatDate(unlockedAt)}
        </div>

        <button
          type="button"
          onClick={onOpen}
          disabled={!resourceUrl}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {type.includes("video") ? (
            <PlayCircle className="h-4 w-4" />
          ) : (
            <BookOpen className="h-4 w-4" />
          )}

          {resourceUrl ? "Open Resource" : "Resource Unavailable"}
        </button>
      </div>
    </article>
  );
}

function EmptyLibrary({ hasFilters, onClear }) {
  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        {hasFilters ? (
          <Search className="h-8 w-8" />
        ) : (
          <Sparkles className="h-8 w-8" />
        )}
      </div>

      <h2 className="mt-5 text-xl font-bold text-slate-900">
        {hasFilters
          ? "No matching resources"
          : "Your learning library is empty"}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilters
          ? "Try another search term or remove the current filters."
          : "Resources you unlock from the SkillHive Marketplace will appear here."}
      </p>

      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Clear Filters
        </button>
      ) : null}
    </div>
  );
}

export default MarketplacePurchases;