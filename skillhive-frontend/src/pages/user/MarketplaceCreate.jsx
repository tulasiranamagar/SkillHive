import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  FileText,
  Image as ImageIcon,
  Info,
  Link as LinkIcon,
  Loader2,
  LockKeyhole,
  Save,
  Upload,
  Video,
  X,
  Zap,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../../api/axios";

const CONTENT_TYPES = {
  VIDEO: {
    label: "Video",
    description: "Share a video lesson, demonstration, or tutorial.",
    icon: Video,
  },
  FILE: {
    label: "File",
    description: "Share notes, documents, PDFs, slides, or other files.",
    icon: FileText,
  },
  IMAGE: {
    label: "Image",
    description: "Share diagrams, illustrations, slides, or visual resources.",
    icon: ImageIcon,
  },
};

const UNLOCK_TYPES = {
  FREE: {
    label: "Free",
    description: "Anyone can access this content without an unlock cost.",
  },
  MONEY: {
    label: "Money",
    description: "Users pay the price you set to unlock this content.",
  },
  XP: {
    label: "XP",
    description: "Users spend their SkillHive XP to unlock this content.",
  },
  MONEY_OR_XP: {
    label: "Money or XP",
    description: "Users can choose either the money or XP unlock method.",
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

  const entries = Object.entries(data);

  for (const [, value] of entries) {
    if (Array.isArray(value) && value.length) {
      return String(value[0]);
    }

    if (typeof value === "string") {
      return value;
    }
  }

  return fallback;
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

function getExistingResourceLabel(content) {
  if (!content) {
    return "";
  }

  if (content.content_type === "VIDEO") {
    if (content.video_url) {
      return "Existing video URL";
    }

    if (content.content_file) {
      return "Existing video file";
    }
  }

  if (content.content_type === "FILE" && content.content_file) {
    return "Existing learning file";
  }

  if (content.content_type === "IMAGE" && content.content_image) {
    return "Existing image";
  }

  return "";
}

function MarketplaceCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const editId = new URLSearchParams(location.search).get("edit");
  const isEditing = Boolean(editId);

  const [form, setForm] = useState({
    title: "",
    description: "",
    contentType: "VIDEO",
    unlockType: "FREE",
    price: "",
    xpUnlockCost: "",
    videoUrl: "",
  });

  const [existingContent, setExistingContent] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedType = useMemo(
    () => CONTENT_TYPES[form.contentType],
    [form.contentType]
  );

  const selectedUnlock = useMemo(
    () => UNLOCK_TYPES[form.unlockType],
    [form.unlockType]
  );

  const SelectedTypeIcon = selectedType.icon;

  useEffect(() => {
    if (isEditing) {
      loadContent(editId);
    } else {
      setLoading(false);
    }
  }, [editId, isEditing]);

  async function loadContent(id) {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/api/marketplace/content/${id}/`
      );

      const content = response?.data;

      setExistingContent(content);

      setForm({
        title: content?.title || "",
        description: content?.description || "",
        contentType: content?.content_type || "VIDEO",
        unlockType: content?.unlock_type || "FREE",
        price:
          content?.price !== null &&
          content?.price !== undefined
            ? String(content.price)
            : "",
        xpUnlockCost:
          content?.xp_unlock_cost !== null &&
          content?.xp_unlock_cost !== undefined
            ? String(content.xp_unlock_cost)
            : "",
        videoUrl: content?.video_url || "",
      });
    } catch (requestError) {
      setError(
        extractError(
          requestError,
          "Could not load the content you want to edit."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  function handleContentTypeChange(type) {
    setForm((current) => ({
      ...current,
      contentType: type,
      videoUrl: type === "VIDEO" ? current.videoUrl : "",
    }));

    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setError("");
    setSuccess("");
  }

  function handleUnlockTypeChange(type) {
    setForm((current) => ({
      ...current,
      unlockType: type,
      price: type === "XP" ? "" : current.price,
      xpUnlockCost:
        type === "MONEY" ? "" : current.xpUnlockCost,
    }));

    setError("");
    setSuccess("");
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;

    setSelectedFile(file);
    setError("");
    setSuccess("");

    if (file && form.contentType === "VIDEO") {
      setForm((current) => ({
        ...current,
        videoUrl: "",
      }));
    }
  }

  function clearSelectedFile() {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function validate() {
    if (!form.title.trim()) {
      return "Please enter a title.";
    }

    if (form.title.trim().length < 3) {
      return "The title should contain at least 3 characters.";
    }

    if (!form.description.trim()) {
      return "Please add a description.";
    }

    if (
      ["MONEY", "MONEY_OR_XP"].includes(form.unlockType)
    ) {
      if (
        form.price === "" ||
        Number(form.price) <= 0
      ) {
        return "Please enter a valid money price.";
      }
    }

    if (
      ["XP", "MONEY_OR_XP"].includes(form.unlockType)
    ) {
      if (
        form.xpUnlockCost === "" ||
        Number(form.xpUnlockCost) <= 0
      ) {
        return "Please enter a valid XP unlock cost.";
      }
    }

    if (form.contentType === "VIDEO") {
      const hasExistingVideo =
        isEditing &&
        Boolean(
          existingContent?.video_url ||
            existingContent?.content_file
        );

      if (
        !selectedFile &&
        !form.videoUrl.trim() &&
        !hasExistingVideo
      ) {
        return "Please upload a video or provide a video URL.";
      }

      if (
        selectedFile &&
        !selectedFile.type.startsWith("video/")
      ) {
        return "Please select a valid video file.";
      }
    }

    if (form.contentType === "FILE") {
      const hasExistingFile =
        isEditing &&
        Boolean(existingContent?.content_file);

      if (!selectedFile && !hasExistingFile) {
        return "Please upload a learning file.";
      }
    }

    if (form.contentType === "IMAGE") {
      const hasExistingImage =
        isEditing &&
        Boolean(existingContent?.content_image);

      if (!selectedFile && !hasExistingImage) {
        return "Please upload an image.";
      }

      if (
        selectedFile &&
        !selectedFile.type.startsWith("image/")
      ) {
        return "Please select a valid image file.";
      }
    }

    return "";
  }

  async function submitContent(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const payload = new FormData();

      payload.append("title", form.title.trim());
      payload.append("description", form.description.trim());
      payload.append("content_type", form.contentType);
      payload.append("unlock_type", form.unlockType);

      if (
        ["MONEY", "MONEY_OR_XP"].includes(
          form.unlockType
        )
      ) {
        payload.append(
          "price",
          String(Number(form.price))
        );
      } else {
        payload.append("price", "0");
      }

      if (
        ["XP", "MONEY_OR_XP"].includes(
          form.unlockType
        )
      ) {
        payload.append(
          "xp_unlock_cost",
          String(Number(form.xpUnlockCost))
        );
      } else {
        payload.append("xp_unlock_cost", "0");
      }

      if (form.contentType === "VIDEO") {
        if (form.videoUrl.trim() && !selectedFile) {
          payload.append(
            "video_url",
            form.videoUrl.trim()
          );
        }

        if (selectedFile) {
          payload.append(
            "content_file",
            selectedFile
          );
        }
      }

      if (
        form.contentType === "FILE" &&
        selectedFile
      ) {
        payload.append(
          "content_file",
          selectedFile
        );
      }

      if (
        form.contentType === "IMAGE" &&
        selectedFile
      ) {
        payload.append(
          "content_image",
          selectedFile
        );
      }

      if (isEditing) {
        await api.patch(
          `/api/marketplace/content/${editId}/`,
          payload
        );

        setSuccess(
          "Your learning content has been updated successfully."
        );

        setTimeout(() => {
          navigate("/marketplace/my-content");
        }, 700);

        return;
      }

      await api.post(
        "/api/marketplace/content/",
        payload
      );

      setSuccess(
        "Your learning content has been published successfully."
      );

      setTimeout(() => {
        navigate("/marketplace/my-content");
      }, 700);
    } catch (requestError) {
      setError(
        extractError(
          requestError,
          isEditing
            ? "Could not update your content."
            : "Could not publish your content."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  const resourceUrl = getResourceUrl(existingContent);

  const existingResourceLabel =
    getExistingResourceLabel(existingContent);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />

          <div className="mt-5 h-44 animate-pulse rounded-3xl bg-slate-200" />

          <div className="mt-6 h-[600px] animate-pulse rounded-2xl bg-slate-200" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/marketplace/my-content"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft size={16} />
          Back to my content
        </Link>

        <section className="mt-5 overflow-hidden rounded-3xl bg-blue-600 shadow-sm">
          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white">
              {isEditing ? (
                <FileText size={24} />
              ) : (
                <Upload size={24} />
              )}
            </div>

            <h1 className="mt-5 text-2xl font-bold text-white sm:text-3xl">
              {isEditing
                ? "Edit learning content"
                : "Create learning content"}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
              {isEditing
                ? "Update your learning resource, access method, or description."
                : "Share a useful learning resource with the SkillHive community."}
            </p>
          </div>
        </section>

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

        <form
          onSubmit={submitContent}
          className="mt-6 space-y-6"
        >
          {/* Basic information */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">
                Basic information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Describe what learners will receive from this resource.
              </p>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label
                  htmlFor="title"
                  className="text-sm font-semibold text-slate-700"
                >
                  Title
                </label>

                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  maxLength={200}
                  placeholder="e.g. Django REST API Fundamentals"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="description"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Description
                  </label>

                  <span className="text-xs text-slate-400">
                    {form.description.length}/2000
                  </span>
                </div>

                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  maxLength={2000}
                  rows={6}
                  placeholder="Explain what this resource contains and what learners can expect..."
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </section>

          {/* Content type */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">
                Content type
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select the type of learning resource you want to publish.
              </p>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-3">
              {Object.entries(CONTENT_TYPES).map(
                ([value, type]) => {
                  const Icon = type.icon;

                  const selected =
                    form.contentType === value;

                  return (
                    <button
                      type="button"
                      key={value}
                      onClick={() =>
                        handleContentTypeChange(value)
                      }
                      className={`relative rounded-2xl border p-5 text-left transition ${
                        selected
                          ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                          : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                      }`}
                    >
                      {selected && (
                        <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                          <Check size={14} />
                        </span>
                      )}

                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                          selected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon size={21} />
                      </div>

                      <h3 className="mt-4 text-sm font-bold text-slate-900">
                        {type.label}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {type.description}
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </section>

          {/* Resource */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">
                Learning resource
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Provide the actual resource learners will unlock.
              </p>
            </div>

            <div className="p-6">
              {form.contentType === "VIDEO" && (
                <div className="mb-5">
                  <label
                    htmlFor="videoUrl"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Video URL

                    <span className="ml-1 font-normal text-slate-400">
                      optional if uploading a video
                    </span>
                  </label>

                  <div className="relative mt-2">
                    <LinkIcon
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="videoUrl"
                      name="videoUrl"
                      type="url"
                      value={form.videoUrl}
                      onChange={handleChange}
                      disabled={Boolean(selectedFile)}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                    />
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Use a video URL instead of uploading a video file, if preferred.
                  </p>
                </div>
              )}

              <label
                htmlFor="marketplace-resource"
                className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  <SelectedTypeIcon size={27} />
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-900">
                  {selectedFile
                    ? selectedFile.name
                    : isEditing && resourceUrl
                    ? "Replace existing resource"
                    : `Upload ${selectedType.label.toLowerCase()}`}
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-slate-500">
                  {selectedFile
                    ? `${(
                        selectedFile.size /
                        (1024 * 1024)
                      ).toFixed(2)} MB`
                    : isEditing && resourceUrl
                    ? `${existingResourceLabel}. Choose a new file only if you want to replace it.`
                    : `Select the ${selectedType.label.toLowerCase()} you want to publish.`}
                </p>

                <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white">
                  <Upload size={15} />
                  Choose file
                </span>

                <input
                  ref={fileInputRef}
                  id="marketplace-resource"
                  type="file"
                  accept={
                    form.contentType === "VIDEO"
                      ? "video/*"
                      : form.contentType === "IMAGE"
                      ? "image/*"
                      : ".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.csv,.xlsx"
                  }
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {selectedFile && (
                <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <FileText size={16} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {selectedFile.name}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        {(
                          selectedFile.size /
                          (1024 * 1024)
                        ).toFixed(2)}{" "}
                        MB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove selected file"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {isEditing &&
                resourceUrl &&
                !selectedFile && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <Info
                      size={16}
                      className="mt-0.5 shrink-0 text-blue-600"
                    />

                    <p className="text-xs leading-5 text-blue-800">
                      Your existing resource will remain unchanged unless
                      you provide a replacement file or change the video URL.
                    </p>
                  </div>
                )}
            </div>
          </section>

          {/* Access */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <LockKeyhole size={19} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Access and pricing
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Choose how learners can unlock your content.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(UNLOCK_TYPES).map(
                  ([value, type]) => {
                    const selected =
                      form.unlockType === value;

                    return (
                      <button
                        type="button"
                        key={value}
                        onClick={() =>
                          handleUnlockTypeChange(value)
                        }
                        className={`relative rounded-2xl border p-5 text-left transition ${
                          selected
                            ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                            : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                        }`}
                      >
                        {selected && (
                          <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                            <Check size={14} />
                          </span>
                        )}

                        <h3 className="text-sm font-bold text-slate-900">
                          {type.label}
                        </h3>

                        <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                          {type.description}
                        </p>
                      </button>
                    );
                  }
                )}
              </div>

              {form.unlockType !== "FREE" && (
                <div className="mt-6 grid gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
                  {["MONEY", "MONEY_OR_XP"].includes(
                    form.unlockType
                  ) && (
                    <div>
                      <label
                        htmlFor="price"
                        className="text-sm font-semibold text-slate-700"
                      >
                        Money price
                      </label>

                      <div className="relative mt-2">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                          Rs.
                        </span>

                        <input
                          id="price"
                          name="price"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={form.price}
                          onChange={handleChange}
                          placeholder="e.g. 500"
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>
                  )}

                  {["XP", "MONEY_OR_XP"].includes(
                    form.unlockType
                  ) && (
                    <div>
                      <label
                        htmlFor="xpUnlockCost"
                        className="text-sm font-semibold text-slate-700"
                      >
                        XP unlock cost
                      </label>

                      <div className="relative mt-2">
                        <Zap
                          size={17}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-500"
                        />

                        <input
                          id="xpUnlockCost"
                          name="xpUnlockCost"
                          type="number"
                          min="1"
                          step="1"
                          value={form.xpUnlockCost}
                          onChange={handleChange}
                          placeholder="e.g. 100"
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {["XP", "MONEY_OR_XP"].includes(
                form.unlockType
              ) && (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50 p-4">
                  <Zap
                    size={17}
                    className="mt-0.5 shrink-0 text-violet-600"
                  />

                  <p className="text-xs leading-5 text-violet-800">
                    The XP amount here is the{" "}
                    <strong>unlock cost</strong>. SkillHive controls how
                    users earn XP; creators do not award XP manually.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              to="/marketplace/my-content"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />

                  {isEditing
                    ? "Saving changes..."
                    : "Publishing..."}
                </>
              ) : (
                <>
                  <Save size={17} />

                  {isEditing
                    ? "Save changes"
                    : "Publish content"}
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default MarketplaceCreate;

