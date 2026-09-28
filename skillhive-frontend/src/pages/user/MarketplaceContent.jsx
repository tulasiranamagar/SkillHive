import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock3,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  LockKeyhole,
  PlayCircle,
  Star,
  User,
  Video,
  X,
  Zap,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";

const CONTENT_TYPES = {
  VIDEO: {
    label: "Video",
    icon: Video,
  },
  FILE: {
    label: "File",
    icon: FileText,
  },
  IMAGE: {
    label: "Image",
    icon: ImageIcon,
  },
};

const UNLOCK_TYPES = {
  FREE: {
    label: "Free access",
  },
  MONEY: {
    label: "Paid access",
  },
  XP: {
    label: "XP unlock",
  },
  MONEY_OR_XP: {
    label: "Money or XP",
  },
};

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

  for (const [, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.length) {
      return String(value[0]);
    }

    if (typeof value === "string") {
      return value;
    }
  }

  return fallback;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getCreatorName(content) {
  if (!content) {
    return "Unknown creator";
  }

  if (content.creator_name) {
    return content.creator_name;
  }

  if (content.creator?.first_name || content.creator?.last_name) {
    return `${content.creator.first_name || ""} ${
      content.creator.last_name || ""
    }`.trim();
  }

  if (content.creator?.username) {
    return content.creator.username;
  }

  return "Unknown creator";
}

function getResourceUrl(content) {
  if (!content) {
    return null;
  }

  if (content.content_type === "VIDEO") {
    return content.video_url || content.content_file || null;
  }

  if (content.content_type === "FILE") {
    return content.content_file || null;
  }

  if (content.content_type === "IMAGE") {
    return content.content_image || null;
  }

  return null;
}

function getFileName(url) {
  if (!url) {
    return "Learning resource";
  }

  try {
    const cleanUrl = url.split("?")[0];
    const name = cleanUrl.split("/").pop();

    if (!name) {
      return "Learning resource";
    }

    return decodeURIComponent(name);
  } catch {
    return "Learning resource";
  }
}

function MarketplaceContent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const contentType = useMemo(() => {
    return (
      CONTENT_TYPES[content?.content_type] ||
      CONTENT_TYPES.FILE
    );
  }, [content?.content_type]);

  const ContentIcon = contentType.icon;

  const unlockType =
    UNLOCK_TYPES[content?.unlock_type] ||
    UNLOCK_TYPES.FREE;

  const resourceUrl = getResourceUrl(content);

  const isUnlocked =
    Boolean(content?.unlocked) ||
    content?.unlock_type === "FREE";

  const requiredXp = Number(content?.xp_unlock_cost || 0);
  const currentXp = Number(content?.current_user_xp || 0);
  const xpShortage = Number(
    content?.xp_shortage ??
      Math.max(requiredXp - currentXp, 0)
  );

  const hasEnoughXp =
    requiredXp > 0 && currentXp >= requiredXp;

  const supportsXp =
    content?.unlock_type === "XP" ||
    content?.unlock_type === "MONEY_OR_XP";

  useEffect(() => {
    loadContent();
  }, [id]);

  async function loadContent() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.get(
        `/api/marketplace/content/${id}/`
      );

      setContent(response?.data || null);
    } catch (requestError) {
      setError(
        extractError(
          requestError,
          "Could not load this learning content."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlock(method) {
    if (method === "XP" && !hasEnoughXp) {
      setError(
        `Insufficient XP. You have ${currentXp} XP, but ${requiredXp} XP is required. You need ${xpShortage} more XP.`
      );
      return;
    }

    setError("");
    setSuccess("");
    setUnlocking(true);

    try {
      await api.post(
        `/api/marketplace/content/${id}/unlock/`,
        {
          method,
        }
      );

      setSuccess(
        method === "XP"
          ? "Content unlocked successfully using XP."
          : "Content unlocked successfully."
      );

      await loadContent();
    } catch (requestError) {
      setError(
        extractError(
          requestError,
          "Could not unlock this content."
        )
      );
    } finally {
      setUnlocking(false);
    }
  }

  function renderResource() {
    if (!resourceUrl) {
      return (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 text-center">
          <LockKeyhole
            size={42}
            className="text-slate-400"
          />

          <h3 className="mt-4 text-lg font-bold text-slate-800">
            Resource is locked
          </h3>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Unlock this learning resource to access the content.
          </p>
        </div>
      );
    }

    if (content.content_type === "VIDEO") {
      return (
        <div className="overflow-hidden rounded-2xl bg-black">
          <video
            src={resourceUrl}
            controls
            playsInline
            className="max-h-[680px] w-full"
          >
            Your browser does not support video playback.
          </video>
        </div>
      );
    }

    if (content.content_type === "IMAGE") {
      return (
        <div className="flex justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <img
            src={resourceUrl}
            alt={content.title || "Learning resource"}
            className="max-h-[700px] max-w-full rounded-xl object-contain"
          />
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
        <div className="mx-auto flex max-w-lg flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <FileText size={30} />
          </div>

          <h3 className="mt-5 text-lg font-bold text-slate-900">
            {getFileName(resourceUrl)}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your learning file is ready to open.
          </p>

          <a
            href={resourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Download size={17} />
            Open learning file
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />

          <div className="mt-6 h-52 animate-pulse rounded-3xl bg-slate-200" />

          <div className="mt-6 h-[500px] animate-pulse rounded-2xl bg-slate-200" />
        </main>
      </div>
    );
  }

  if (error && !content) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
          >
            <ArrowLeft size={16} />
            Go back
          </button>

          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <X
                size={19}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <h2 className="font-bold text-red-800">
                  Could not load content
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!content) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <X
              size={18}
              className="mt-0.5 shrink-0 text-red-600"
            />

            <p className="text-sm font-medium text-red-700">
              {error}
            </p>
          </div>
        )}

        {success && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <Check
              size={18}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <p className="text-sm font-medium text-emerald-700">
              {success}
            </p>
          </div>
        )}

        {/* Header */}
        <section className="mt-5 overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-blue-600 px-6 py-8 sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
                  <ContentIcon size={27} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      {contentType.label}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
                      {unlockType.label}
                    </span>
                  </div>

                  <h1 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
                    {content.title}
                  </h1>

                  <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
                    {content.description ||
                      "No description provided."}
                  </p>
                </div>
              </div>

              {content.unlocked && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white">
                  <Check size={15} />
                  Unlocked
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <User size={18} />
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Creator
                </p>

                <p className="text-sm font-semibold text-slate-800">
                  {getCreatorName(content)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <PlayCircle size={18} />
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Views
                </p>

                <p className="text-sm font-semibold text-slate-800">
                  {content.view_count ?? 0}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Clock3 size={18} />
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Created
                </p>

                <p className="text-sm font-semibold text-slate-800">
                  {formatDate(content.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <LockKeyhole size={18} />
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Access
                </p>

                <p className="text-sm font-semibold text-slate-800">
                  {unlockType.label}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Unlock section */}
        {!isUnlocked && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <LockKeyhole
                  size={20}
                  className="text-blue-600"
                />

                <h2 className="text-lg font-bold text-slate-900">
                  Unlock this content
                </h2>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose one of the available ways to access this
                learning resource.
              </p>
            </div>

            {/* XP information */}
            {supportsXp && (
              <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                      <Zap size={20} />
                    </div>

                    <div>
                      <h3 className="font-bold text-violet-900">
                        XP unlock
                      </h3>

                      <p className="mt-1 text-sm text-violet-700">
                        Required:{" "}
                        <strong>{requiredXp} XP</strong>
                      </p>

                      <p className="mt-1 text-sm text-violet-700">
                        Your XP:{" "}
                        <strong>{currentXp} XP</strong>
                      </p>
                    </div>
                  </div>

                  <div
                    className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                      hasEnoughXp
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {hasEnoughXp
                      ? "You have enough XP"
                      : `You need ${xpShortage} more XP`}
                  </div>
                </div>

                {!hasEnoughXp && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm font-medium text-red-700">
                      You do not have enough XP to unlock this
                      content. You currently have{" "}
                      <strong>{currentXp} XP</strong>, but{" "}
                      <strong>{requiredXp} XP</strong> is required.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  disabled={unlocking || !hasEnoughXp}
                  onClick={() => handleUnlock("XP")}
                  className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition sm:w-auto ${
                    hasEnoughXp
                      ? "bg-violet-600 text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                      : "cursor-not-allowed bg-slate-300 text-slate-500"
                  }`}
                >
                  {unlocking ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Zap size={17} />
                  )}

                  {hasEnoughXp
                    ? `Unlock for ${requiredXp} XP`
                    : `Need ${xpShortage} More XP`}
                </button>
              </div>
            )}

            {/* Money access */}
            {content.unlock_type === "MONEY" && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Paid access
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Price:{" "}
                      <strong>
                        Rs. {content.price ?? 0}
                      </strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled
                    className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-300 px-5 py-3 text-sm font-semibold text-slate-600"
                  >
                    Payment unavailable
                  </button>
                </div>
              </div>
            )}

            {/* Money alternative for MONEY_OR_XP */}
            {content.unlock_type === "MONEY_OR_XP" && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Money alternative
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Price:{" "}
                      <strong>
                        Rs. {content.price ?? 0}
                      </strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled
                    className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-600"
                  >
                    Payment unavailable
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Resource */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Learning resource
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {isUnlocked
                  ? "You can access this learning resource below."
                  : "Unlock this resource to access the content."}
              </p>
            </div>

            {isUnlocked && (
              <span className="hidden items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:inline-flex">
                <Check size={15} />
                Available
              </span>
            )}
          </div>

          {isUnlocked ? (
            renderResource()
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">
                <LockKeyhole size={30} />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                This resource is locked
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Unlock the content above to view the video, image,
                or learning file.
              </p>
            </div>
          )}
        </section>

        {/* Reviews */}
        {Array.isArray(content.reviews) &&
          content.reviews.length > 0 && (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-2">
                <Star
                  size={20}
                  className="text-amber-500"
                />

                <h2 className="text-xl font-bold text-slate-900">
                  Reviews
                </h2>
              </div>

              <div className="mt-5 space-y-4">
                {content.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-slate-800">
                        {review.reviewer_name ||
                          review.reviewer?.username ||
                          "User"}
                      </p>

                      <div className="flex items-center gap-1">
                        {Array.from({
                          length: 5,
                        }).map((_, index) => (
                          <Star
                            key={index}
                            size={14}
                            className={
                              index <
                              Number(review.rating || 0)
                                ? "fill-current text-amber-500"
                                : "text-slate-300"
                            }
                          />
                        ))}
                      </div>
                    </div>

                    {review.comment && (
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* Bottom back action */}
        <div className="mt-6">
          <Link
            to="/marketplace/my-content"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back to my content
          </Link>
        </div>
      </main>
    </div>
  );
}

export default MarketplaceContent;

