import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  ExternalLink,
  Globe,
  Link2,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Plus,
  Sparkles,
  Users,
  Video,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const MEDIA_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

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
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.users)) return value.users;
  return [];
};

const getResponseData = (response) => {
  const payload = response?.data;

  return payload?.data ?? payload?.profile ?? payload;
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

const getUsername = (person) =>
  firstValue(
    person?.username,
    person?.user?.username,
    person?.profile?.username
  );

const getFullName = (person) =>
  firstValue(
    person?.full_name,
    `${person?.first_name || ""} ${
      person?.last_name || ""
    }`.trim(),
    person?.user?.full_name,
    getUsername(person)
  );

const getInitials = (person) => {
  const name = getFullName(person);

  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
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

const getLinkType = (link) => {
  const value = firstValue(
    link?.platform,
    link?.type,
    link?.name,
    link?.label
  ).toLowerCase();

  if (value.includes("website")) {
    return "website";
  }

  return "other";
};

const getLinkIcon = (type) => {
  if (type === "website") {
    return Globe;
  }

  return Link2;
};

const getLinkUrl = (link) =>
  firstValue(
    link?.url,
    link?.link,
    link?.value
  );

const getCreatorUsername = (item) =>
  firstValue(
    item?.creator_username,
    item?.creator?.username,
    item?.user?.username,
    item?.owner?.username,
    item?.author?.username
  );

const getExchangeOwner = (item) =>
  firstValue(
    item?.username,
    item?.user?.username,
    item?.creator_username,
    item?.creator?.username,
    item?.owner?.username,
    item?.author?.username
  );

const getPostTitle = (item) =>
  firstValue(
    item?.title,
    item?.name,
    item?.content_title,
    "Learning content"
  );

const getPostDescription = (item) =>
  firstValue(
    item?.description,
    item?.short_description,
    item?.summary
  );

const getExchangeTitle = (item) =>
  firstValue(
    item?.title,
    item?.name,
    item?.skill_name,
    item?.skill?.name,
    item?.offered_skill?.name,
    "Skill exchange"
  );

const getExchangeDescription = (item) =>
  firstValue(
    item?.description,
    item?.message,
    item?.details
  );


const getPostLink = (item) => {
  if (!item) {
    return null;
  }

  const directLink = firstValue(
    item?.detail_url,
    item?.detailUrl,
    item?.content_url,
    item?.contentUrl,
    item?.url,
    item?.link
  );

  if (directLink) {
    return directLink;
  }

  const id =
    item?.id ??
    item?.content_id ??
    item?.contentId;

  if (!id) {
    return null;
  }

  return `/marketplace/content/${id}`;
};


export default function PublicProfile() {
  const { username: routeUsername } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const username = decodeURIComponent(
    routeUsername || ""
  ).trim();

  const [person, setPerson] = useState(null);
  const [posts, setPosts] = useState([]);
  const [exchanges, setExchanges] = useState([]);

  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [tab, setTab] = useState("posts");

  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] =
    useState(false);

  const [actionMessage, setActionMessage] =
    useState("");


  const currentUsername = firstValue(
    user?.username,
    user?.user?.username,
    user?.profile?.username,
    user?.data?.username
  );

  const actualUsername =
    getUsername(person) || username;

  const isOwnProfile =
    Boolean(
      currentUsername &&
        actualUsername &&
        currentUsername.toLowerCase() ===
          actualUsername.toLowerCase()
    );

  const showTemporaryMessage = (message) => {
    setActionMessage(message);

    window.setTimeout(() => {
      setActionMessage("");
    }, 2000);
  };


  useEffect(() => {
    if (!username) {
      setLoading(false);
      setError("Profile not found.");
      return;
    }

    loadProfile();
  }, [username]);


  const loadFollowState = async (targetUsername) => {
  
    if (
      !currentUsername ||
      !targetUsername ||
      currentUsername.toLowerCase() ===
        targetUsername.toLowerCase()
    ) {
      setFollowing(false);
      return;
    }

    try {

      const response = await api.get(
        `/accounts/users/${encodeURIComponent(
          targetUsername
        )}/followers/`
      );

      const data = getResponseData(response);

      const followers = normalizeList(data);

      const isAlreadyFollowing =
        followers.some((item) => {
          const followerUsername = firstValue(
            item?.username,
            item?.user?.username,
            item?.follower?.username,
            item?.profile?.username
          );

          return (
            followerUsername &&
            followerUsername.toLowerCase() ===
              currentUsername.toLowerCase()
          );
        });

      setFollowing(isAlreadyFollowing);
    } catch (err) {
      console.error(
        "Unable to load follow state:",
        err
      );

      setFollowing(false);
    }
  };


  const loadProfile = async () => {
    setLoading(true);
    setError("");

    try {
   

      const response = await api.get(
        `/accounts/users/${encodeURIComponent(
          username
        )}/`
      );

      const profileData = getResponseData(response);

      if (!profileData) {
        throw new Error("NOT_FOUND");
      }

      setPerson(profileData);

      const targetUsername =
        getUsername(profileData) || username;

      await loadFollowState(targetUsername);

      await loadContent(targetUsername);
    } catch (err) {
      console.error(
        "Public profile loading error:",
        err
      );

      if (
        err?.message === "NOT_FOUND" ||
        err?.response?.status === 404
      ) {
        setError(
          "This profile could not be found."
        );
      } else {
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.detail ||
            "Unable to load this profile."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const loadContent = async (targetUsername) => {
    setContentLoading(true);

    try {

      try {
        const response = await api.get(
          "/marketplace/content/",
          {
            params: {
              creator: targetUsername,
            },
          }
        );

        const allPosts = normalizeList(
          getResponseData(response)
        );

        const filteredPosts = allPosts.filter(
          (item) => {
            const owner =
              getCreatorUsername(item);

            if (!owner) {
              return true;
            }

            return (
              owner.toLowerCase() ===
              targetUsername.toLowerCase()
            );
          }
        );

        setPosts(filteredPosts);
      } catch (err) {
        console.error(
          "Unable to load marketplace content:",
          err
        );

        setPosts([]);
      }

      try {
        const response = await api.get(
          "/exchanges/posts/"
        );

        const allExchanges = normalizeList(
          getResponseData(response)
        );

        const filteredExchanges =
          allExchanges.filter((item) => {
            const owner =
              getExchangeOwner(item);

            if (!owner) {
              return false;
            }

            return (
              owner.toLowerCase() ===
              targetUsername.toLowerCase()
            );
          });

        setExchanges(filteredExchanges);
      } catch (err) {
        console.error(
          "Unable to load skill exchanges:",
          err
        );

        setExchanges([]);
      }
    } finally {
      setContentLoading(false);
    }
  };


  const handleFollow = async () => {
    const targetUsername =
      getUsername(person) || username;


    if (
      currentUsername &&
      targetUsername &&
      currentUsername.toLowerCase() ===
        targetUsername.toLowerCase()
    ) {
      showTemporaryMessage(
        "You can't follow yourself."
      );
      return;
    }

    if (!targetUsername || followLoading) {
      return;
    }


    if (!currentUsername) {
      showTemporaryMessage(
        "Please log in to follow users."
      );
      return;
    }

    setFollowLoading(true);

    try {


      if (following) {
        await api.delete(
          `/accounts/users/${encodeURIComponent(
            targetUsername
          )}/follow/`
        );

        setFollowing(false);

        setPerson((previous) => {
          if (!previous) {
            return previous;
          }

          const currentCount = Number(
            previous?.followers_count ??
              previous?.profile?.followers_count ??
              0
          );

          return {
            ...previous,
            followers_count: Math.max(
              0,
              currentCount - 1
            ),
          };
        });
      } else {
        await api.post(
          `/accounts/users/${encodeURIComponent(
            targetUsername
          )}/follow/`
        );

        setFollowing(true);

        setPerson((previous) => {
          if (!previous) {
            return previous;
          }

          const currentCount = Number(
            previous?.followers_count ??
              previous?.profile?.followers_count ??
              0
          );

          return {
            ...previous,
            followers_count:
              currentCount + 1,
          };
        });
      }
    } catch (err) {
      console.error(
        "Follow action failed:",
        err
      );

      const backendMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "";

      if (
        backendMessage
          .toLowerCase()
          .includes("yourself")
      ) {
        showTemporaryMessage(
          "You can't follow yourself."
        );
      } else if (
        err?.response?.status === 401 ||
        err?.response?.status === 403
      ) {
        showTemporaryMessage(
          "Please log in to follow users."
        );
      } else {
        showTemporaryMessage(
          backendMessage ||
            "Unable to update follow status."
        );
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = () => {
    const targetUsername =
      getUsername(person) || username;

    if (
      currentUsername &&
      targetUsername &&
      currentUsername.toLowerCase() ===
        targetUsername.toLowerCase()
    ) {
      showTemporaryMessage(
        "You can't message yourself."
      );
      return;
    }

    if (!targetUsername) {
      showTemporaryMessage(
        "Unable to open this conversation."
      );
      return;
    }

    navigate(
      `/chat?username=${encodeURIComponent(
        targetUsername
      )}`
    );
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f8fc]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

          <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">

            <div className="h-56 animate-pulse bg-slate-200 sm:h-64 lg:h-72" />

            <div className="relative px-5 pb-7 sm:px-8 lg:px-10">

              <div className="absolute -top-16 left-5 h-32 w-32 animate-pulse rounded-full border-[5px] border-white bg-slate-300 shadow-lg sm:-top-20 sm:left-8 sm:h-40 sm:w-40 lg:left-10" />

              <div className="pt-20 sm:pt-24">

                <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />

                <div className="mt-3 h-4 w-32 animate-pulse rounded bg-slate-200" />

                <div className="mt-3 h-7 w-36 animate-pulse rounded-full bg-slate-200" />
              </div>

              <div className="mt-7 flex gap-8 border-t border-slate-100 pt-6">
                <div className="h-7 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-7 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-7 w-24 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_350px]">
            <div className="h-64 animate-pulse rounded-[26px] bg-white" />
            <div className="h-64 animate-pulse rounded-[26px] bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (!person || error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4">

        <div className="w-full max-w-md rounded-[30px] border border-slate-200 bg-white p-9 text-center shadow-sm">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
            <Users
              size={29}
              className="text-blue-600"
            />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
            Profile not found
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error ||
              "This profile does not exist or is no longer available."}
          </p>

          <Link
            to="/people"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            <ArrowLeft size={16} />
            Back to people
          </Link>
        </div>
      </div>
    );
  }

  const fullName = getFullName(person);

  const profileImage = getMediaUrl(
    firstValue(
      person?.profile_picture,
      person?.avatar,
      person?.profile?.profile_picture
    )
  );

  const coverImage = getMediaUrl(
    firstValue(
      person?.cover_picture,
      person?.cover,
      person?.profile?.cover_picture
    )
  );

  const bio = firstValue(
    person?.bio,
    person?.profile?.bio
  );

  const city = firstValue(
    person?.city,
    person?.profile?.city
  );

  const country = firstValue(
    person?.country,
    person?.profile?.country
  );

  const location = [city, country]
    .filter(Boolean)
    .join(", ");

  const knownSkills = normalizeList(
    firstValue(
      person?.known_skills,
      person?.profile?.known_skills
    )
  );

  const wantedSkills = normalizeList(
    firstValue(
      person?.wanted_skills,
      person?.profile?.wanted_skills
    )
  );

  const links = normalizeList(
    firstValue(
      person?.links,
      person?.profile?.links
    )
  ).filter((link) => getLinkUrl(link));

  const followersCount =
    person?.followers_count ??
    person?.profile?.followers_count ??
    0;

  const followingCount =
    person?.following_count ??
    person?.profile?.following_count ??
    0;

  const isVerified = Boolean(
    person?.is_verified ??
      person?.profile?.is_verified
  );

  const contentCount =
    posts.length + exchanges.length;

  return (
    <div className="min-h-screen bg-[#f6f8fc] pb-16">

      {actionMessage && (
        <div className="fixed inset-x-0 top-5 z-[100] flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-[0_12px_35px_rgba(15,23,42,0.15)]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <X size={15} />
            </div>

            {actionMessage}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">

        <div className="mb-5 flex items-center justify-between">

          <Link
            to="/people"
            className="group inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-500 transition hover:text-blue-600"
          >
            <ArrowLeft
              size={17}
              className="transition-transform group-hover:-translate-x-1"
            />

            People
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-400 shadow-sm sm:flex">
            <Sparkles
              size={13}
              className="text-blue-500"
            />

            SkillHive profile
          </div>
        </div>

        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.07)]">

          <div className="relative h-56 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 sm:h-64 lg:h-72">

            {coverImage ? (
              <img
                src={coverImage}
                alt={`${fullName} cover`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.22),transparent_28%),radial-gradient(circle_at_85%_80%,rgba(255,255,255,0.14),transparent_30%)]" />

                <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full border border-white/10 bg-white/5 blur-2xl" />

                <div className="absolute -bottom-44 left-1/3 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />

                <div className="absolute left-8 top-12 h-20 w-20 rounded-full border border-white/10 bg-white/5" />
              </>
            )}

            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          <div className="relative px-5 pb-7 sm:px-8 lg:px-10">

            <div className="absolute left-5 top-0 z-20 -translate-y-1/2 sm:left-8 lg:left-10">

              {profileImage ? (
                <img
                  src={profileImage}
                  alt={fullName}
                  className="h-32 w-32 rounded-full border-[5px] border-white bg-white object-cover shadow-[0_12px_35px_rgba(15,23,42,0.22)] sm:h-40 sm:w-40"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full border-[5px] border-white bg-blue-100 text-4xl font-bold text-blue-700 shadow-[0_12px_35px_rgba(15,23,42,0.22)] sm:h-40 sm:w-40 sm:text-5xl">
                  {getInitials(person)}
                </div>
              )}

              {isVerified && (
                <span
                  title="Verified"
                  className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-blue-600 text-white shadow-md sm:bottom-2 sm:right-2"
                >
                  <Check
                    size={16}
                    strokeWidth={3}
                  />
                </span>
              )}
            </div>

            <div className="pt-20 sm:pt-24 lg:pt-24">

              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

                <div className="min-w-0">

                  <div className="flex flex-wrap items-center gap-2.5">

                    <h1 className="break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                      {fullName}
                    </h1>

                    {isVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                        <Check
                          size={12}
                          strokeWidth={3}
                        />
                        Verified
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm font-medium text-slate-500">
                    @{actualUsername}
                  </p>

                  {location && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                      <MapPin size={14} />
                      {location}
                    </div>
                  )}
                </div>

                {!isOwnProfile && (
                  <div className="flex w-full gap-2 lg:w-auto">

                    <button
                      type="button"
                      onClick={handleMessage}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:flex-none"
                    >
                      <MessageCircle size={17} />
                      Message
                    </button>

                    <button
                      type="button"
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-sm transition sm:flex-none ${
                        following
                          ? "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      } ${
                        followLoading
                          ? "cursor-not-allowed opacity-70"
                          : ""
                      }`}
                    >
                      {followLoading ? (
                        <LoaderCircle
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <Plus size={17} />
                      )}

                      {following
                        ? "Following"
                        : "Follow"}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-7 flex flex-wrap gap-x-10 gap-y-5 border-t border-slate-100 pt-6">

                <div>
                  <strong className="text-xl font-bold text-slate-950">
                    {followersCount}
                  </strong>

                  <p className="mt-0.5 text-xs font-medium text-slate-400">
                    Followers
                  </p>
                </div>

                <div>
                  <strong className="text-xl font-bold text-slate-950">
                    {followingCount}
                  </strong>

                  <p className="mt-0.5 text-xs font-medium text-slate-400">
                    Following
                  </p>
                </div>

                <div>
                  <strong className="text-xl font-bold text-slate-950">
                    {contentCount}
                  </strong>

                  <p className="mt-0.5 text-xs font-medium text-slate-400">
                    Shared
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">

          <section className="rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.045)]">

            <div className="border-b border-slate-100 px-6 py-6 sm:px-7">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users size={19} />
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
                    Introduction
                  </p>

                  <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-950">
                    About
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-7">

              {bio ? (
                <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-600">
                  {bio}
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  This user has not added a bio yet.
                </p>
              )}

              {links.length > 0 && (
                <div className="mt-7 border-t border-slate-100 pt-6">

                  <div className="flex items-center gap-2">

                    <Link2
                      size={16}
                      className="text-slate-400"
                    />

                    <h3 className="text-sm font-bold text-slate-800">
                      Links
                    </h3>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2.5">

                    {links.map((link, index) => {
                      const Icon = getLinkIcon(
                        getLinkType(link)
                      );

                      const url = getLinkUrl(link);

                      if (!url) {
                        return null;
                      }

                      const finalUrl =
                        /^https?:\/\//i.test(url)
                          ? url
                          : `https://${url}`;

                      return (
                        <a
                          key={
                            link.id ||
                            `${url}-${index}`
                          }
                          href={finalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Icon
                            size={16}
                            className="text-slate-400 group-hover:text-blue-600"
                          />

                          {firstValue(
                            link.label,
                            link.title,
                            link.name,
                            link.platform,
                            "Link"
                          )}

                          <ExternalLink
                            size={13}
                            className="text-slate-300 group-hover:text-blue-500"
                          />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.045)]">

            <div className="border-b border-slate-100 px-6 py-6 sm:px-7">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Sparkles size={18} />
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
                    Skill profile
                  </p>

                  <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-950">
                    Skills
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-7">

              <div>

                <div className="flex items-center justify-between">

                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Known skills
                  </h3>

                  <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600">
                    {knownSkills.length}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">

                  {knownSkills.length ? (
                    knownSkills.map((skill, index) => {
                      const name =
                        getSkillName(skill);

                      if (!name) {
                        return null;
                      }

                      return (
                        <span
                          key={`${name}-${index}`}
                          className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                        >
                          {name}
                        </span>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-400">
                      No known skills listed.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-7 border-t border-slate-100 pt-6">

                <div className="flex items-center justify-between">

                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Wants to learn
                  </h3>

                  <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600">
                    {wantedSkills.length}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">

                  {wantedSkills.length ? (
                    wantedSkills.map(
                      (skill, index) => {
                        const name =
                          getSkillName(skill);

                        if (!name) {
                          return null;
                        }

                        return (
                          <span
                            key={`${name}-${index}`}
                            className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                          >
                            {name}
                          </span>
                        );
                      }
                    )
                  ) : (
                    <p className="text-sm text-slate-400">
                      No wanted skills listed.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.045)]">

          <div className="border-b border-slate-100 px-5 pt-7 sm:px-7">

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
              Community activity
            </p>

            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              Shared with SkillHive
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Explore learning content and skill exchanges shared by{" "}
              {fullName}.
            </p>

            <div className="mt-7 flex gap-8 overflow-x-auto">

              <button
                type="button"
                onClick={() => setTab("posts")}
                className={`relative flex shrink-0 items-center gap-2 pb-4 text-sm font-bold transition ${
                  tab === "posts"
                    ? "text-blue-600"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <BookOpen size={16} />

                Learning posts

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    tab === "posts"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {posts.length}
                </span>

                {tab === "posts" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setTab("exchanges")}
                className={`relative flex shrink-0 items-center gap-2 pb-4 text-sm font-bold transition ${
                  tab === "exchanges"
                    ? "text-blue-600"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Users size={16} />

                Skill exchanges

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    tab === "exchanges"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {exchanges.length}
                </span>

                {tab === "exchanges" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600" />
                )}
              </button>
            </div>
          </div>

          {contentLoading ? (
            <div className="flex min-h-80 items-center justify-center">

              <div className="flex flex-col items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                  <LoaderCircle
                    size={23}
                    className="animate-spin text-blue-600"
                  />
                </div>

                <p className="text-sm text-slate-400">
                  Loading shared activity...
                </p>
              </div>
            </div>
          ) : tab === "posts" ? (

            posts.length ? (
              <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">

                {posts.map((post, index) => {

                  const title =
                    getPostTitle(post);

                  const description =
                    getPostDescription(post);

                  const image = getMediaUrl(
                    firstValue(
                      post?.thumbnail,
                      post?.thumbnail_url,
                      post?.cover_image,
                      post?.image
                    )
                  );

                  const postLink =
                    getPostLink(post);

                  return (
                    <article
                      key={
                        post?.id ||
                        `post-${index}`
                      }
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_16px_35px_rgba(15,23,42,0.10)]"
                    >

                      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">

                        {image ? (
                          <img
                            src={image}
                            alt={title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-blue-50">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                              <Video
                                size={26}
                                className="text-blue-600"
                              />
                            </div>
                          </div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />

                        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 shadow-sm">
                          <BookOpen size={11} />
                          Learning
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col p-5">

                        <div className="flex items-start justify-between gap-3">

                          <h3 className="line-clamp-2 text-base font-bold leading-6 text-slate-900 transition group-hover:text-blue-600">
                            {title}
                          </h3>

                          <ArrowUpRight
                            size={17}
                            className="mt-0.5 shrink-0 text-slate-300 transition group-hover:text-blue-600"
                          />
                        </div>

                        {description && (
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                            {description}
                          </p>
                        )}

                        <div className="mt-auto pt-5">

                          {postLink ? (
                            postLink.startsWith(
                              "http://"
                            ) ||
                            postLink.startsWith(
                              "https://"
                            ) ? (
                              <a
                                href={postLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                              >
                                View content
                                <ArrowUpRight
                                  size={15}
                                />
                              </a>
                            ) : (
                              <Link
                                to={postLink}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                              >
                                View content
                                <ArrowUpRight
                                  size={15}
                                />
                              </Link>
                            )
                          ) : (
                            <div className="inline-flex w-full items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400">
                              Content unavailable
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No learning posts yet"
                text={`${fullName} has not published learning content yet.`}
              />
            )
          ) : (

            exchanges.length ? (
              <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">

                {exchanges.map(
                  (exchange, index) => (

                    <article
                      key={
                        exchange?.id ||
                        `exchange-${index}`
                      }
                      className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)]"
                    >

                      <div className="flex gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                          <Users size={21} />
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex items-start justify-between gap-3">

                            <h3 className="font-bold leading-6 text-slate-900 transition group-hover:text-blue-600">
                              {getExchangeTitle(
                                exchange
                              )}
                            </h3>

                            <ArrowUpRight
                              size={17}
                              className="mt-1 shrink-0 text-slate-300 transition group-hover:text-blue-600"
                            />
                          </div>

                          {getExchangeDescription(
                            exchange
                          ) && (
                            <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-500">
                              {getExchangeDescription(
                                exchange
                              )}
                            </p>
                          )}

                          <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                            <Users size={12} />
                            Skill exchange
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No skill exchanges yet"
                text={`${fullName} has not posted a skill exchange yet.`}
              />
            )
          )}
        </section>
      </div>
    </div>
  );
}


function EmptyState({
  icon: Icon = Users,
  title,
  text,
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">

      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
        <Icon
          size={28}
          className="text-slate-300"
        />
      </div>

      <h3 className="mt-5 font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
        {text}
      </p>
    </div>
  );
}

