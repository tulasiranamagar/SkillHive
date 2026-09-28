import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import EmojiPicker from "emoji-picker-react";
import {
  ArrowLeft,
  Camera,
  Check,
  ExternalLink,
  Link2,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  Save,
  Smile,
  Trash2,
  Type,
  X,
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api";

const MEDIA_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const firstValue = (...values) =>
  values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
  ) ?? "";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
};

const getResponseData = (response) => {
  const payload = response?.data;

  return (
    payload?.data ??
    payload?.profile ??
    payload
  );
};

const getMediaUrl = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    value = firstValue(
      value.url,
      value.image,
      value.path
    );
  }

  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${MEDIA_BASE_URL}${value}`;
  }

  return `${MEDIA_BASE_URL}/${value}`;
};

const getUsername = (profile) =>
  firstValue(
    profile?.username,
    profile?.user?.username
  );

const getFullName = (profile) =>
  firstValue(
    profile?.full_name,
    `${profile?.first_name || ""} ${
      profile?.last_name || ""
    }`.trim(),
    profile?.user?.full_name,
    getUsername(profile),
    "User"
  );

const getInitials = (profile) => {
  const name = getFullName(profile);

  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part[0]?.toUpperCase()
      )
      .join("") || "U"
  );
};

const getSkillName = (skill) => {
  if (!skill) return "";

  if (typeof skill === "string") {
    return skill;
  }

  return firstValue(
    skill.name,
    skill.skill_name,
    skill.title,
    skill.skill?.name,
    skill.skill?.skill_name
  );
};

const getLinkUrl = (link) =>
  firstValue(
    link?.url,
    link?.link,
    link?.value
  );

const getLinkLabel = (link) =>
  firstValue(
    link?.label,
    link?.title,
    link?.name,
    link?.platform,
    "Link"
  );

const normalizeLink = (link) => ({
  id:
    link?.id ??
    `local-${Date.now()}-${Math.random()}`,
  label: getLinkLabel(link),
  url: getLinkUrl(link),
  platform: firstValue(
    link?.platform,
    link?.type,
    "website"
  ),
});

const makeTempId = () =>
  `new-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

const BIO_FONT_STYLES = {
  modern: {
    label: "Modern",
    description: "Clean & professional",
    className:
      "font-sans text-[17px] leading-8 tracking-[0.01em]",
    previewClass: "font-sans",
  },

  elegant: {
    label: "Elegant",
    description: "Soft & refined",
    className:
      "font-serif text-[18px] leading-8 tracking-[0.01em]",
    previewClass: "font-serif italic",
  },

  editorial: {
    label: "Editorial",
    description: "Classic & expressive",
    className:
      "font-serif text-[19px] leading-8 tracking-[0.015em]",
    previewClass: "font-serif",
  },

  handwritten: {
    label: "Handwritten",
    description: "Personal & creative",
    className:
      "text-[18px] leading-8 tracking-[0.01em]",
    previewClass: "",
    style: {
      fontFamily:
        '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive',
    },
  },

  classic: {
    label: "Classic",
    description: "Simple & timeless",
    className:
      "text-[17px] leading-8 tracking-[0.01em]",
    previewClass: "",
    style: {
      fontFamily:
        '"Trebuchet MS", Arial, sans-serif',
    },
  },

  typewriter: {
    label: "Typewriter",
    description: "Technical & distinctive",
    className:
      "font-mono text-[16px] leading-8 tracking-[0.02em]",
    previewClass: "font-mono",
  },
};

const getBioStyle = (styleKey) =>
  BIO_FONT_STYLES[styleKey] ||
  BIO_FONT_STYLES.elegant;

export default function Profile() {
  const bioRef = useRef(null);
  const profileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const successTimeoutRef = useRef(null);

  const [profile, setProfile] = useState(null);

  const [knownSkills, setKnownSkills] =
    useState([]);

  const [wantedSkills, setWantedSkills] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [editing, setEditing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const showSuccessMessage = (message) => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }

    setSuccess(message);

    successTimeoutRef.current =
      setTimeout(() => {
        setSuccess("");
        successTimeoutRef.current = null;
      }, 2500);
  };

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    city: "",
    country: "",
    date_of_birth: "",
    bio: "",
  });

  const [originalForm, setOriginalForm] =
    useState(null);

  const [links, setLinks] = useState([]);

  const [originalLinks, setOriginalLinks] =
    useState([]);

  const [linkEditor, setLinkEditor] =
    useState(null);

  const [deletedLinkIds, setDeletedLinkIds] =
    useState([]);

  const [profilePreview, setProfilePreview] =
    useState("");

  const [coverPreview, setCoverPreview] =
    useState("");

  const [originalProfileImage, setOriginalProfileImage] =
    useState("");

  const [originalCoverImage, setOriginalCoverImage] =
    useState("");

  const [profileImageFile, setProfileImageFile] =
    useState(null);

  const [coverImageFile, setCoverImageFile] =
    useState(null);

  const [profileImageRemoved, setProfileImageRemoved] =
    useState(false);

  const [coverImageRemoved, setCoverImageRemoved] =
    useState(false);

  const [showEmojiPicker, setShowEmojiPicker] =
    useState(false);

  const [showFontPicker, setShowFontPicker] =
    useState(false);

  const [bioFontStyle, setBioFontStyle] =
    useState("elegant");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        "/accounts/me/"
      );

      const data = getResponseData(response);

      if (!data) {
        throw new Error(
          "Profile data was not returned."
        );
      }

      applyLoadedProfile(data);

      let known =
        normalizeList(data?.known_skills);

      let wanted =
        normalizeList(data?.wanted_skills);

      if (!known.length || !wanted.length) {
        const skillRequests = [];

        if (!known.length) {
          skillRequests.push(
            api
              .get("/skills/user/", {
                params: {
                  type: "known",
                },
              })
              .then((res) => ({
                type: "known",
                data: normalizeList(
                  getResponseData(res)
                ),
              }))
              .catch(() => ({
                type: "known",
                data: [],
              }))
          );
        }

        if (!wanted.length) {
          skillRequests.push(
            api
              .get("/skills/user/", {
                params: {
                  type: "wanted",
                },
              })
              .then((res) => ({
                type: "wanted",
                data: normalizeList(
                  getResponseData(res)
                ),
              }))
              .catch(() => ({
                type: "wanted",
                data: [],
              }))
          );
        }

        const results =
          await Promise.all(
            skillRequests
          );

        results.forEach((result) => {
          if (
            result.type === "known" &&
            result.data.length
          ) {
            known = result.data;
          }

          if (
            result.type === "wanted" &&
            result.data.length
          ) {
            wanted = result.data;
          }
        });
      }

      setKnownSkills(known);
      setWantedSkills(wanted);

      if (!Array.isArray(data?.links)) {
        try {
          const linksResponse =
            await api.get(
              "/accounts/me/links/"
            );

          setLinks(
            normalizeList(
              getResponseData(
                linksResponse
              )
            ).map(normalizeLink)
          );
        } catch {
          setLinks([]);
        }
      }
    } catch (err) {
      console.error(
        "Profile loading error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  };


  const applyLoadedProfile = (data) => {
    const nextForm = {
      first_name: firstValue(
        data?.first_name,
        data?.user?.first_name
      ),

      last_name: firstValue(
        data?.last_name,
        data?.user?.last_name
      ),

      city: firstValue(data?.city),

      country: firstValue(data?.country),

      date_of_birth: firstValue(
        data?.date_of_birth
      ),

      bio: firstValue(data?.bio),
    };

    const nextLinks =
      normalizeList(
        data?.links
      ).map(normalizeLink);

    const nextProfileImage =
      getMediaUrl(
        data?.profile_picture
      );

    const nextCoverImage =
      getMediaUrl(
        data?.cover_picture
      );

    setProfile(data);

    setForm(nextForm);

    setOriginalForm(nextForm);

    setLinks(nextLinks);

    setOriginalLinks(nextLinks);

    setProfilePreview(
      nextProfileImage
    );

    setOriginalProfileImage(
      nextProfileImage
    );

    setCoverPreview(
      nextCoverImage
    );

    setOriginalCoverImage(
      nextCoverImage
    );

    setProfileImageFile(null);

    setCoverImageFile(null);

    setProfileImageRemoved(false);

    setCoverImageRemoved(false);

    setDeletedLinkIds([]);

    setLinkEditor(null);
  };


  const startEditing = () => {
    setError("");
    setSuccess("");

    if (successTimeoutRef.current) {
      clearTimeout(
        successTimeoutRef.current
      );

      successTimeoutRef.current = null;
    }

    setOriginalForm({
      ...form,
    });

    setOriginalLinks(
      links.map((link) => ({
        ...link,
      }))
    );

    setOriginalProfileImage(
      profilePreview
    );

    setOriginalCoverImage(
      coverPreview
    );

    setProfileImageFile(null);

    setCoverImageFile(null);

    setProfileImageRemoved(false);

    setCoverImageRemoved(false);

    setDeletedLinkIds([]);

    setLinkEditor(null);

    setShowEmojiPicker(false);

    setShowFontPicker(false);

    setEditing(true);
  };

  const cancelEditing = () => {
    if (!originalForm) {
      setEditing(false);
      return;
    }

    setForm({
      ...originalForm,
    });

    setLinks(
      originalLinks.map((link) => ({
        ...link,
      }))
    );

    setProfilePreview(
      originalProfileImage
    );

    setCoverPreview(
      originalCoverImage
    );

    setProfileImageFile(null);

    setCoverImageFile(null);

    setProfileImageRemoved(false);

    setCoverImageRemoved(false);

    setDeletedLinkIds([]);

    setLinkEditor(null);

    setShowEmojiPicker(false);

    setShowFontPicker(false);

    setError("");

    setSuccess("");

    setEditing(false);
  };

  const updateForm = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccess("");
  };


  const insertEmoji = (emoji) => {
    const textarea =
      bioRef.current;

    if (!textarea) {
      updateForm(
        "bio",
        `${form.bio}${emoji}`
      );

      return;
    }

    const start =
      textarea.selectionStart ??
      form.bio.length;

    const end =
      textarea.selectionEnd ??
      form.bio.length;

    const nextValue =
      form.bio.slice(0, start) +
      emoji +
      form.bio.slice(end);

    updateForm(
      "bio",
      nextValue
    );

    setShowEmojiPicker(false);

    requestAnimationFrame(() => {
      textarea.focus();

      const cursor =
        start + emoji.length;

      textarea.setSelectionRange(
        cursor,
        cursor
      );
    });
  };

  const handleEmojiClick = (
    emojiData
  ) => {
    insertEmoji(
      emojiData.emoji
    );
  };

  const handleProfileImageSelect = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select a valid image file."
      );

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Profile image must be 5MB or smaller."
      );

      return;
    }

    const preview =
      URL.createObjectURL(file);

    setProfileImageFile(file);

    setProfilePreview(preview);

    setProfileImageRemoved(false);

    setError("");

    setSuccess("");

    event.target.value = "";
  };

  const handleCoverImageSelect = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select a valid image file."
      );

      return;
    }

    if (
      file.size >
      8 * 1024 * 1024
    ) {
      setError(
        "Cover image must be 8MB or smaller."
      );

      return;
    }

    const preview =
      URL.createObjectURL(file);

    setCoverImageFile(file);

    setCoverPreview(preview);

    setCoverImageRemoved(false);

    setError("");

    setSuccess("");

    event.target.value = "";
  };

  const stageProfileImageDelete = () => {
    setProfileImageFile(null);

    setProfilePreview("");

    setProfileImageRemoved(true);

    setError("");

    setSuccess("");
  };

  const stageCoverImageDelete = () => {
    setCoverImageFile(null);

    setCoverPreview("");

    setCoverImageRemoved(true);

    setError("");

    setSuccess("");
  };

  const startNewLink = () => {
    setLinkEditor({
      mode: "new",
      id: null,
      label: "",
      url: "",
    });

    setSuccess("");
  };

  const startEditLink = (
    link
  ) => {
    setLinkEditor({
      mode: "edit",
      id: link.id,
      label: link.label || "",
      url: link.url || "",
    });

    setSuccess("");
  };

  const updateLinkEditor = (
    field,
    value
  ) => {
    setLinkEditor(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  };

  const cancelLinkEditor = () => {
    setLinkEditor(null);
  };

  const finishLinkEditor = () => {
    if (!linkEditor) return;

    const label =
      linkEditor.label.trim();

    const url =
      linkEditor.url.trim();

    if (!label) {
      setError(
        "Please enter a name for the link."
      );

      return;
    }

    if (!url) {
      setError(
        "Please enter the link URL."
      );

      return;
    }

    setError("");

    if (
      linkEditor.mode ===
      "new"
    ) {
      setLinks(
        (current) => [
          ...current,
          {
            id: makeTempId(),
            label,
            url,
            platform: "website",
            isNew: true,
          },
        ]
      );
    } else {
      setLinks(
        (current) =>
          current.map(
            (link) =>
              link.id ===
              linkEditor.id
                ? {
                    ...link,
                    label,
                    url,
                  }
                : link
          )
      );
    }

    setLinkEditor(null);
  };

  const deleteLink = (
    link
  ) => {
    const isNew =
      String(
        link.id
      ).startsWith("new-") ||
      link.isNew;

    if (!isNew) {
      setDeletedLinkIds(
        (current) =>
          current.includes(
            link.id
          )
            ? current
            : [
                ...current,
                link.id,
              ]
      );
    }

    setLinks(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            link.id
        )
    );

    setSuccess("");
  };

  const formChanged =
    JSON.stringify(form) !==
    JSON.stringify(
      originalForm
    );

  const linksChanged =
    JSON.stringify(
      links.map((link) => ({
        id: link.id,
        label: link.label,
        url: link.url,
      }))
    ) !==
      JSON.stringify(
        originalLinks.map(
          (link) => ({
            id: link.id,
            label: link.label,
            url: link.url,
          })
        )
      ) ||
    deletedLinkIds.length > 0;

  const profileImageChanged =
    Boolean(profileImageFile) ||
    profileImageRemoved;

  const coverImageChanged =
    Boolean(coverImageFile) ||
    coverImageRemoved;

  const hasChanges =
    editing &&
    (formChanged ||
      linksChanged ||
      profileImageChanged ||
      coverImageChanged);

  const saveText = async () => {
    let currentProfile =
      profile;

    if (formChanged) {
      const profilePayload = {
        city: form.city,
        country: form.country,
        date_of_birth:
          form.date_of_birth ||
          null,
        bio: form.bio,
      };

      const profileResponse =
        await api.patch(
          "/accounts/me/profile/",
          profilePayload
        );

      const updated =
        getResponseData(
          profileResponse
        );

      if (updated) {
        currentProfile = {
          ...currentProfile,
          ...updated,
        };
      }
    }

    const currentFirstName =
      firstValue(
        profile?.first_name,
        profile?.user?.first_name
      );

    const currentLastName =
      firstValue(
        profile?.last_name,
        profile?.user?.last_name
      );

    if (
      form.first_name !==
        currentFirstName ||
      form.last_name !==
        currentLastName
    ) {
      const userResponse =
        await api.patch(
          "/accounts/me/user/",
          {
            first_name:
              form.first_name,
            last_name:
              form.last_name,
          }
        );

      const updatedUser =
        getResponseData(
          userResponse
        );

      if (updatedUser) {
        currentProfile = {
          ...currentProfile,
          ...updatedUser,
        };
      }
    }

    return currentProfile;
  };

  const saveImages = async (
    currentProfile
  ) => {
    let updatedProfile = {
      ...currentProfile,
    };

    if (profileImageFile) {
      const formData =
        new FormData();

      formData.append(
        "profile_picture",
        profileImageFile
      );

      const response =
        await api.patch(
          "/accounts/me/profile/",
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

      const data =
        getResponseData(
          response
        );

      if (data) {
        updatedProfile = {
          ...updatedProfile,
          ...data,
        };

        const savedImage =
          getMediaUrl(
            data?.profile_picture
          );

        if (savedImage) {
          setProfilePreview(
            savedImage
          );
        }
      }
    }

    if (
      profileImageRemoved &&
      !profileImageFile
    ) {
      await api.delete(
        "/accounts/me/profile-picture/"
      );

      setProfilePreview("");
    }

    if (coverImageFile) {
      const formData =
        new FormData();

      formData.append(
        "cover_picture",
        coverImageFile
      );

      const response =
        await api.patch(
          "/accounts/me/profile/",
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

      const data =
        getResponseData(
          response
        );

      if (data) {
        updatedProfile = {
          ...updatedProfile,
          ...data,
        };

        const savedImage =
          getMediaUrl(
            data?.cover_picture
          );

        if (savedImage) {
          setCoverPreview(
            savedImage
          );
        }
      }
    }

    if (
      coverImageRemoved &&
      !coverImageFile
    ) {
      await api.delete(
        "/accounts/me/cover-picture/"
      );

      setCoverPreview("");
    }

    return updatedProfile;
  };

  const saveLinks = async () => {
    for (
      const id of deletedLinkIds
    ) {
      if (
        id === null ||
        id === undefined
      ) {
        continue;
      }

      if (
        String(id).startsWith(
          "new-"
        )
      ) {
        continue;
      }

      await api.delete(
        `/accounts/me/links/${id}/`
      );
    }

    const savedLinks = [];

    for (
      const link of links
    ) {
      const payload = {
        label: link.label,
        url: link.url,
        platform:
          link.platform ||
          "website",
      };

      let response;

      const isNew =
        link.isNew ||
        String(
          link.id
        ).startsWith(
          "new-"
        );

      if (isNew) {
        response =
          await api.post(
            "/accounts/me/links/",
            payload
          );
      } else {
        response =
          await api.patch(
            `/accounts/me/links/${link.id}/`,
            payload
          );
      }

      const saved =
        getResponseData(
          response
        );

      savedLinks.push(
        normalizeLink(
          saved || {
            ...link,
            ...payload,
          }
        )
      );
    }

    return savedLinks;
  };


  const handleSave = async () => {
    if (
      !hasChanges ||
      saving
    ) {
      return;
    }

    setSaving(true);

    setError("");

    setSuccess("");

    try {
      let updatedProfile =
        profile;

      if (formChanged) {
        updatedProfile =
          await saveText();
      }

      if (
        profileImageChanged ||
        coverImageChanged
      ) {
        updatedProfile =
          await saveImages(
            updatedProfile
          );
      }

      if (linksChanged) {
        const savedLinks =
          await saveLinks();

        setLinks(savedLinks);

        setOriginalLinks(
          savedLinks.map(
            (link) => ({
              ...link,
            })
          )
        );

        setDeletedLinkIds([]);
      }

      const finalProfile = {
        ...updatedProfile,

        first_name:
          form.first_name,

        last_name:
          form.last_name,

        city:
          form.city,

        country:
          form.country,

        date_of_birth:
          form.date_of_birth ||
          null,

        bio:
          form.bio,

        profile_picture:
          profileImageRemoved
            ? null
            : profilePreview,

        cover_picture:
          coverImageRemoved
            ? null
            : coverPreview,
      };

      setProfile(
        finalProfile
      );

      setOriginalForm({
        ...form,
      });

      setOriginalProfileImage(
        profileImageRemoved
          ? ""
          : profilePreview
      );

      setOriginalCoverImage(
        coverImageRemoved
          ? ""
          : coverPreview
      );

      setProfileImageFile(null);

      setCoverImageFile(null);

      setProfileImageRemoved(false);

      setCoverImageRemoved(false);

      showSuccessMessage(
        "Profile changes saved successfully."
      );

      setEditing(false);

      setShowEmojiPicker(false);

      setShowFontPicker(false);

      setLinkEditor(null);
    } catch (err) {
      console.error(
        "Profile save error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          "Some changes could not be saved. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] px-3 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="h-48 animate-pulse bg-slate-200 sm:h-64 lg:h-72" />

          <div className="p-5 sm:p-8">

            <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />

            <div className="mt-3 h-4 w-32 animate-pulse rounded bg-slate-200" />

            <div className="mt-8 h-32 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#f5f7fb] px-4">

        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <X size={21} />
          </div>

          <h1 className="mt-5 text-xl font-bold text-slate-950">
            Unable to load profile
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error ||
              "Your profile could not be loaded."}
          </p>

          <button
            type="button"
            onClick={loadProfile}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const username =
    getUsername(profile);

  const fullName =
    getFullName(profile);

  const location = [
    form.city,
    form.country,
  ]
    .filter(Boolean)
    .join(", ");

  const isVerified =
    Boolean(profile?.is_verified);

  const activeBioStyle =
    getBioStyle(
      bioFontStyle
    );

  return (
    <div className="min-h-screen bg-[#f5f7fb] pb-28 text-slate-900">

      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">

        <div className="mb-5 flex items-center justify-between">

          <Link
            to="/dashboard"
            className="group inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-blue-600"
          >
            <ArrowLeft
              size={16}
              className="transition group-hover:-translate-x-0.5"
            />

            Dashboard
          </Link>

          {!editing && (
            <div className="flex items-center gap-2 text-white">
              <Link
                to="/marketplace/my-content"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <ExternalLink size={15} />
                View My Content
              </Link>

              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Pencil size={15} />

                Edit Profile
              </button>
            </div>
          )}
        </div>

        {success && (
          <div
            role="status"
            className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Check size={15} />
            </div>

            <span>
              {success}
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">

            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100">
              <X size={15} />
            </div>

            <span>
              {error}
            </span>
          </div>
        )}


        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">

          <div className="relative h-52 overflow-visible bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 sm:h-64 lg:h-72">

            {coverPreview ? (
              <img
                src={coverPreview}
                alt={`${fullName} cover`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0">

                <div className="absolute -left-20 -top-28 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />

                <div className="absolute right-[-40px] top-[-40px] h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />

                <div className="absolute bottom-[-80px] left-1/2 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

                <div className="absolute inset-0 opacity-20">

                  <div
                    className="h-full w-full"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(69, 69, 255, 0.08) 1px, transparent 1px)",
                      backgroundSize:
                        "32px 32px",
                    }}
                  />
                </div>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-slate-950/10" />

            {editing && (
              <div className="absolute right-3 top-3 z-20 flex gap-2 sm:right-5 sm:top-5">

                <button
                  type="button"
                  onClick={() =>
                    coverInputRef.current?.click()
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur transition hover:bg-white sm:text-sm"
                >
                  <Camera size={15} />

                  <span className="hidden sm:inline">
                    Change cover
                  </span>

                  <span className="sm:hidden">
                    Cover
                  </span>
                </button>

                {coverPreview && (
                  <button
                    type="button"
                    onClick={
                      stageCoverImageDelete
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/95 text-red-600 shadow-lg backdrop-blur transition hover:bg-white"
                    title="Remove cover"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )}

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={
                handleCoverImageSelect
              }
            />
          </div>

          <div className="relative px-5 pb-7 sm:px-8 sm:pb-8 lg:px-10">

            <div className="absolute left-5 top-0 z-10 -translate-y-1/2 sm:left-8 lg:left-10">

              <div className="relative w-fit">

                {profilePreview ? (
                  <img
                    src={profilePreview}
                    alt={fullName}
                    className="h-28 w-28 rounded-full border-4 border-white bg-white object-cover shadow-[0_8px_25px_rgba(15,23,42,0.18)] sm:h-36 sm:w-36 lg:h-40 lg:w-40"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-100 to-indigo-100 text-3xl font-bold text-blue-700 shadow-[0_8px_25px_rgba(15,23,42,0.18)] sm:h-36 sm:w-36 sm:text-4xl lg:h-40 lg:w-40">
                    {getInitials(
                      profile
                    )}
                  </div>
                )}

                {editing && (
                  <div className="absolute bottom-0 right-0 flex gap-1.5">

                    <button
                      type="button"
                      onClick={() =>
                        profileInputRef.current?.click()
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-md transition hover:bg-blue-700"
                      title="Change profile picture"
                    >
                      <Camera size={14} />
                    </button>

                    {profilePreview && (
                      <button
                        type="button"
                        onClick={
                          stageProfileImageDelete
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-red-600 text-white shadow-md transition hover:bg-red-700"
                        title="Remove profile picture"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}

                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={
                    handleProfileImageSelect
                  }
                />
              </div>
            </div>

            <div className="min-h-[150px] pt-5 sm:min-h-[145px] sm:pt-5 lg:min-h-[150px]">

              <div className="ml-0 pt-14 sm:ml-[152px] sm:pt-5 lg:ml-[172px]">

                <div className="flex flex-wrap items-center gap-2">

                  <h1 className="text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-3xl lg:text-[32px]">
                    {fullName}
                  </h1>

                  {isVerified && (
                    <span
                      title="Verified"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white"
                    >
                      <Check
                        size={12}
                        strokeWidth={3}
                      />
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm font-medium text-slate-400 sm:text-[15px]">
                  @{username}
                </p>

                {location ? (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">

                    <MapPin
                      size={15}
                      className="text-slate-400"
                    />

                    {location}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">
                    Location not added
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:mt-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center">

                  <div className="pr-8 sm:pr-10">

                    <p className="text-2xl font-bold tracking-tight text-slate-950">
                      {profile?.followers_count ??
                        0}
                    </p>

                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Followers
                    </p>
                  </div>

                  <div className="h-10 w-px bg-slate-200" />

                  <div className="pl-8 sm:pl-10">

                    <p className="text-2xl font-bold tracking-tight text-slate-950">
                      {profile?.following_count ??
                        0}
                    </p>

                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Following
                    </p>
                  </div>
                </div>

                {!editing &&
                  username && (
                    <Link
                      to={`/profile/${encodeURIComponent(
                        username
                      )}`}
                      className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      View public profile

                      <ExternalLink
                        size={14}
                      />
                    </Link>
                  )}
              </div>
            </div>
          </div>
        </section>

        {editing && (
          <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">

            <div className="border-b border-slate-100 px-5 py-5 sm:px-7">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Pencil size={17} />
                </div>

                <div>

                  <h2 className="text-lg font-bold tracking-tight text-slate-950">
                    Edit Profile
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
                    Update your personal information and profile details.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7">

              <div>

                <SectionLabel>
                  Personal details
                </SectionLabel>

                <div className="mt-3 grid gap-4 sm:grid-cols-2">

                  <Field
                    label="First name"
                    value={
                      form.first_name
                    }
                    onChange={(value) =>
                      updateForm(
                        "first_name",
                        value
                      )
                    }
                  />

                  <Field
                    label="Last name"
                    value={
                      form.last_name
                    }
                    onChange={(value) =>
                      updateForm(
                        "last_name",
                        value
                      )
                    }
                  />
                </div>
              </div>

              <div className="mt-7 border-t border-slate-100 pt-7">

                <SectionLabel>
                  Location
                </SectionLabel>

                <div className="mt-3 grid gap-4 sm:grid-cols-2">

                  <Field
                    label="City"
                    value={form.city}
                    onChange={(value) =>
                      updateForm(
                        "city",
                        value
                      )
                    }
                  />

                  <Field
                    label="Country"
                    value={
                      form.country
                    }
                    onChange={(value) =>
                      updateForm(
                        "country",
                        value
                      )
                    }
                  />
                </div>
              </div>

              <div className="mt-7 border-t border-slate-100 pt-7">

                <SectionLabel>
                  Date of birth
                </SectionLabel>

                <div className="mt-3 max-w-md">

                  <input
                    type="date"
                    value={
                      form.date_of_birth
                    }
                    onChange={(event) =>
                      updateForm(
                        "date_of_birth",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 pt-7">

                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

                  <div>

                    <SectionLabel>
                      About you
                    </SectionLabel>

                    <p className="mt-1 text-xs text-slate-400">
                      Introduce yourself in your own style.
                    </p>
                  </div>

                  <span className="text-xs font-medium text-slate-400">
                    {
                      form.bio.length
                    }{" "}
                    characters
                  </span>
                </div>

                <div className="relative z-30 flex flex-wrap items-center gap-2 rounded-t-xl border border-slate-200 bg-slate-50 px-3 py-2">

                  <div className="relative">

                    <button
                      type="button"
                      onClick={() => {
                        setShowFontPicker(
                          (current) =>
                            !current
                        );

                        setShowEmojiPicker(
                          false
                        );
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Type size={14} />

                      {
                        getBioStyle(
                          bioFontStyle
                        ).label
                      }
                    </button>

                    {showFontPicker && (
                      <div className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-2xl">

                        <div className="border-b border-slate-100 px-3 pb-3 pt-2">

                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            Bio style
                          </p>
                        </div>

                        <div className="space-y-1 pt-2">

                          {Object.entries(
                            BIO_FONT_STYLES
                          ).map(
                            ([
                              key,
                              style,
                            ]) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => {
                                  setBioFontStyle(
                                    key
                                  );

                                  setShowFontPicker(
                                    false
                                  );
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition ${
                                  bioFontStyle ===
                                  key
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <div>

                                  <p
                                    className={`text-sm font-semibold ${style.previewClass}`}
                                    style={
                                      style.style
                                    }
                                  >
                                    {
                                      style.label
                                    }
                                  </p>

                                  <p className="mt-0.5 text-[11px] text-slate-400">
                                    {
                                      style.description
                                    }
                                  </p>
                                </div>

                                {bioFontStyle ===
                                  key && (
                                  <Check
                                    size={15}
                                    className="shrink-0 text-blue-600"
                                  />
                                )}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative">

                    <button
                      type="button"
                      onClick={() => {
                        setShowEmojiPicker(
                          (current) =>
                            !current
                        );

                        setShowFontPicker(
                          false
                        );
                      }}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                        showEmojiPicker
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                      title="Add emoji"
                    >
                      <Smile size={14} />

                      Emoji
                    </button>

                    {showEmojiPicker && (
                      <div className="absolute left-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">

                        <EmojiPicker
                          onEmojiClick={
                            handleEmojiClick
                          }
                          width={320}
                          height={380}
                          searchDisabled={false}
                          skinTonesDisabled
                          previewConfig={{
                            showPreview:
                              false,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="ml-auto hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:block">
                    Your bio · your style
                  </div>
                </div>

                <textarea
                  ref={bioRef}
                  value={form.bio}
                  onChange={(event) =>
                    updateForm(
                      "bio",
                      event.target.value
                    )
                  }
                  rows={7}
                  placeholder="Tell people a little about yourself..."
                  className={`relative z-10 w-full resize-y rounded-b-xl border border-t-0 border-slate-200 bg-white px-5 py-5 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 ${activeBioStyle.className}`}
                  style={
                    activeBioStyle.style
                  }
                />

                <div className="mt-2 flex flex-col gap-1 text-[11px] text-slate-400 sm:flex-row sm:justify-between">

                  <span>
                    Choose a visual style that fits you.
                  </span>

                  <span>
                    Emojis can be inserted anywhere.
                  </span>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 pt-7">

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

                  <div>

                    <SectionLabel>
                      Links
                    </SectionLabel>

                    <p className="mt-1 text-xs text-slate-400">
                      Add your website, GitHub, social profiles, or other useful links.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      startNewLink
                    }
                    disabled={Boolean(
                      linkEditor
                    )}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={15} />

                    Add link
                  </button>
                </div>

                {linkEditor && (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">

                    <div className="grid gap-3 sm:grid-cols-2">

                      <input
                        type="text"
                        value={
                          linkEditor.label
                        }
                        onChange={(event) =>
                          updateLinkEditor(
                            "label",
                            event.target.value
                          )
                        }
                        placeholder="Link name"
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      />

                      <input
                        type="url"
                        value={
                          linkEditor.url
                        }
                        onChange={(event) =>
                          updateLinkEditor(
                            "url",
                            event.target.value
                          )
                        }
                        placeholder="https://example.com"
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      />
                    </div>

                    <div className="mt-3 flex justify-end gap-2">

                      <button
                        type="button"
                        onClick={
                          cancelLinkEditor
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={
                          finishLinkEditor
                        }
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-2">

                  {links.length ? (
                    links.map(
                      (link) => (
                        <div
                          key={link.id}
                          className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-slate-300 hover:shadow-sm"
                        >

                          <div className="flex min-w-0 items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                              <Link2
                                size={16}
                              />
                            </div>

                            <div className="min-w-0">

                              <p className="truncate text-sm font-semibold text-slate-800">
                                {
                                  link.label
                                }
                              </p>

                              <p className="truncate text-xs text-slate-400">
                                {
                                  link.url
                                }
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 gap-1">

                            <button
                              type="button"
                              onClick={() =>
                                startEditLink(
                                  link
                                )
                              }
                              disabled={Boolean(
                                linkEditor
                              )}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
                              title="Edit link"
                            >
                              <Pencil
                                size={14}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteLink(
                                  link
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              title="Delete link"
                            >
                              <Trash2
                                size={14}
                              />
                            </button>
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">

                      <Link2
                        size={21}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-2 text-sm text-slate-400">
                        No links added yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}


        {!editing && (
          <>
            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_25px_rgba(15,23,42,0.035)]">

                <div className="p-5 sm:p-6">

                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">

                    <div>

                      <h2 className="text-base font-bold text-slate-950">
                        About you
                      </h2>

                      <p className="mt-0.5 text-xs text-slate-400">
                        A little about you person
                      </p>
                    </div>
                  </div>

                  {form.bio ? (
                    <p
                      className={`mt-5 whitespace-pre-wrap text-slate-700 ${activeBioStyle.className}`}
                      style={
                        activeBioStyle.style
                      }
                    >
                      {form.bio}
                    </p>
                  ) : (
                    <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-5">

                      <p className="text-sm leading-6 text-slate-400">
                        You haven't added a bio yet.
                      </p>

                      <button
                        type="button"
                        onClick={
                          startEditing
                        }
                        className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Add a bio
                      </button>
                    </div>
                  )}

                  <div className="mt-7 border-t border-slate-100 pt-5">

                    <div className="flex items-center justify-between">

                      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                        Links
                      </h3>

                      {links.length >
                        0 && (
                        <span className="text-[10px] font-semibold text-slate-300">
                          {
                            links.length
                          }{" "}
                          {links.length ===
                          1
                            ? "link"
                            : "links"}
                        </span>
                      )}
                    </div>

                    {links.length >
                    0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">

                        {links.map(
                          (link) => {
                            const url =
                              getLinkUrl(
                                link
                              );

                            if (!url) {
                              return null;
                            }

                            const finalUrl =
                              /^https?:\/\//i.test(
                                url
                              )
                                ? url
                                : `https://${url}`;

                            return (
                              <a
                                key={
                                  link.id
                                }
                                href={
                                  finalUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                              >

                                <Link2
                                  size={14}
                                  className="shrink-0"
                                />

                                <span className="max-w-[180px] truncate">
                                  {
                                    link.label
                                  }
                                </span>

                                <ExternalLink
                                  size={12}
                                  className="shrink-0"
                                />
                              </a>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-400">
                        No links added yet.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_25px_rgba(15,23,42,0.035)]">

                <div className="p-5 sm:p-6">

                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 text-white">

                    <div>

                      <h2 className="text-base font-bold text-slate-950">
                        Skills
                      </h2>

                      <p className="mt-0.5 text-xs text-slate-400">
                        What you know and want to learn
                      </p>
                    </div>

                    <Link
                      to="/my-skills"
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-blue-600 text-white transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      Manage

                      <ExternalLink
                        size={11}
                      />
                    </Link>
                  </div>

                  <div className="mt-6">

                    <div className="flex items-center justify-between">

                      <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Known skills
                      </h3>

                      {knownSkills.length >
                        0 && (
                        <span className="text-[10px] font-semibold text-slate-300">
                          {
                            knownSkills.length
                          }
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">

                      {knownSkills.length ? (
                        knownSkills.map(
                          (
                            skill,
                            index
                          ) => {
                            const name =
                              getSkillName(
                                skill
                              );

                            if (!name) {
                              return null;
                            }

                            return (
                              <span
                                key={`${name}-${index}`}
                                className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                              >
                                {
                                  name
                                }
                              </span>
                            );
                          }
                        )
                      ) : (
                        <div className="w-full rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">

                          <p className="text-sm text-slate-400">
                            No known skills listed.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-5">

                    <div className="flex items-center justify-between">

                      <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Wants to learn
                      </h3>

                      {wantedSkills.length >
                        0 && (
                        <span className="text-[10px] font-semibold text-slate-300">
                          {
                            wantedSkills.length
                          }
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">

                      {wantedSkills.length ? (
                        wantedSkills.map(
                          (
                            skill,
                            index
                          ) => {
                            const name =
                              getSkillName(
                                skill
                              );

                            if (!name) {
                              return null;
                            }

                            return (
                              <span
                                key={`${name}-${index}`}
                                className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700"
                              >
                                {
                                  name
                                }
                              </span>
                            );
                          }
                        )
                      ) : (
                        <div className="w-full rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">

                          <p className="text-sm text-slate-400">
                            No wanted skills listed.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_25px_rgba(15,23,42,0.035)]">

              <div className="p-5 sm:p-6">

                <div className="border-b border-slate-100 pb-4">

                  <h2 className="text-base font-bold text-slate-950">
                    Personal information
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Basic information associated with your profile
                  </p>
                </div>

                <div className="mt-5 grid gap-x-10 gap-y-0 sm:grid-cols-2 lg:grid-cols-3">

                  <InfoItem
                    label="First name"
                    value={
                      form.first_name ||
                      "Not added"
                    }
                  />

                  <InfoItem
                    label="Last name"
                    value={
                      form.last_name ||
                      "Not added"
                    }
                  />

                  <InfoItem
                    label="City"
                    value={
                      form.city ||
                      "Not added"
                    }
                  />

                  <InfoItem
                    label="Country"
                    value={
                      form.country ||
                      "Not added"
                    }
                  />

                  <InfoItem
                    label="Date of birth"
                    value={
                      form.date_of_birth ||
                      "Not added"
                    }
                  />

                  <InfoItem
                    label="Username"
                    value={
                      username
                        ? `@${username}`
                        : "Not available"
                    }
                  />
                </div>
              </div>
            </section>
          </>
        )}


        {editing && (
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6">

            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">

              <div className="hidden min-w-0 sm:block">

                {hasChanges ? (
                  <div className="flex items-center gap-2">

                    <span className="h-2 w-2 rounded-full bg-amber-500" />

                    <p className="text-sm font-medium text-slate-600">
                      You have unsaved changes.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    No changes to save.
                  </p>
                )}
              </div>

              <div className="ml-auto flex w-full gap-2 sm:w-auto">

                <button
                  type="button"
                  onClick={
                    cancelEditing
                  }
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
                >
                  <X size={15} />

                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleSave
                  }
                  disabled={
                    !hasChanges ||
                    saving
                  }
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  {saving ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className="animate-spin"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />

                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function SectionLabel({
  children,
}) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
      {children}
    </p>
  );
}


function Field({
  label,
  value,
  onChange,
}) {
  return (
    <div>

      <label className="mb-2 block text-xs font-semibold text-slate-600">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
      />
    </div>
  );
}

function InfoItem({
  label,
  value,
}) {
  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0 sm:nth-[3n]:border-b-0">

      <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}