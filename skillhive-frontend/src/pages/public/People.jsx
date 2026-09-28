import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Search,
  Users,
  MapPin,
  ArrowRight,
  RefreshCw,
  UserRound,
  Sparkles,
  BookOpen,
  GraduationCap,
  MessageCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

function firstValue(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
  );
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.users)) {
    return value.users;
  }

  return [];
}

function getSkillName(item) {
  if (!item) {
    return "";
  }

  if (typeof item === "string") {
    return item;
  }

  return (
    firstValue(
      item.display_name,
      item.custom_name,
      item.name,
      item.skill_name,
      item.title,
      item.skill?.display_name,
      item.skill?.custom_name,
      item.skill?.name,
      item.skill?.skill_name
    ) || ""
  );
}

function getSkillNames(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(getSkillName)
    .map((skill) => String(skill).trim())
    .filter(Boolean);
}

function uniqueSkills(skills) {
  const seen = new Set();

  return skills.filter((skill) => {
    const key = normalizeText(skill);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getKnownSkills(person) {
  const values = [
    person?.known_skills,
    person?.knownSkills,
    person?.skills_known,
    person?.skills?.known,
    person?.profile?.known_skills,
    person?.profile?.knownSkills,
    person?.user?.known_skills,
    person?.user?.knownSkills,
  ];

  for (const value of values) {
    if (Array.isArray(value)) {
      return uniqueSkills(getSkillNames(value));
    }
  }

  return [];
}

function getWantedSkills(person) {
  const values = [
    person?.wanted_skills,
    person?.wantedSkills,
    person?.skills_wanted,
    person?.skills?.wanted,
    person?.profile?.wanted_skills,
    person?.profile?.wantedSkills,
    person?.user?.wanted_skills,
    person?.user?.wantedSkills,
  ];

  for (const value of values) {
    if (Array.isArray(value)) {
      return uniqueSkills(getSkillNames(value));
    }
  }

  return [];
}

function getName(person) {
  return (
    firstValue(
      person?.name,
      person?.full_name,
      person?.display_name,
      person?.user?.name,
      person?.user?.full_name,
      person?.profile?.name,
      person?.username,
      person?.user?.username
    ) || "User"
  );
}

function getUsername(person) {
  return (
    firstValue(
      person?.username,
      person?.user?.username,
      person?.profile?.username
    ) || ""
  );
}

function getUserId(person) {
  return firstValue(
    person?.id,
    person?.user_id,
    person?.user?.id,
    person?.profile?.id
  );
}

function getBio(person) {
  return (
    firstValue(
      person?.bio,
      person?.profile?.bio,
      person?.user?.bio
    ) || ""
  );
}

function getLocation(person) {
  const directLocation = firstValue(
    person?.location,
    person?.profile?.location
  );

  if (directLocation) {
    return directLocation;
  }

  const city = firstValue(
    person?.city,
    person?.profile?.city
  );

  const country = firstValue(
    person?.country,
    person?.profile?.country
  );

  return [city, country]
    .filter(Boolean)
    .join(", ");
}


function getAvatar(person) {
  const values = [
    person?.profile_picture,
    person?.avatar,
    person?.image,
    person?.profile_image,
    person?.profile?.profile_picture,
    person?.profile?.avatar,
    person?.profile?.image,
    person?.profile?.profile_image,
    person?.user?.profile_picture,
    person?.user?.avatar,
    person?.user?.image,
    person?.user?.profile_image,
  ];

  for (const value of values) {
    if (!value) {
      continue;
    }

    if (typeof value === "object") {
      const nestedUrl =
        value?.url ||
        value?.image ||
        value?.src ||
        value?.path;

      if (nestedUrl) {
        return String(nestedUrl);
      }

      continue;
    }

    const stringValue = String(value).trim();

    if (stringValue) {
      return stringValue;
    }
  }

  return "";
}

function getMediaUrl(value) {
  if (!value) {
    return "";
  }

  const url = String(value).trim();

  if (!url) {
    return "";
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  let baseURL = api?.defaults?.baseURL || "";

  if (!baseURL) {
    baseURL = "http://localhost:8000";
  }

  baseURL = baseURL.replace(/\/+$/, "");

  const backendOrigin = baseURL.replace(/\/api(?:\/.*)?$/i, "");

  if (url.startsWith("/")) {
    return `${backendOrigin}${url}`;
  }

  return `${backendOrigin}/${url}`;
}

function getProfileUrl(username) {
  if (!username) {
    return "/people";
  }

  return `/profile/${encodeURIComponent(username)}`;
}


function isSameUser(person, currentUser) {
  if (!person || !currentUser) {
    return false;
  }

  const personId = normalizeText(getUserId(person));
  const currentUserId = normalizeText(
    getUserId(currentUser)
  );

  if (personId && currentUserId) {
    return personId === currentUserId;
  }

  const personUsername = normalizeText(
    getUsername(person)
  );

  const currentUsername = normalizeText(
    getUsername(currentUser)
  );

  if (personUsername && currentUsername) {
    return personUsername === currentUsername;
  }

  return false;
}


function getSkillOverlap(sourceSkills, targetSkills) {
  const target = new Set(
    targetSkills.map((skill) => normalizeText(skill))
  );

  return uniqueSkills(sourceSkills).filter((skill) =>
    target.has(normalizeText(skill))
  );
}

function calculateMatch(
  person,
  myKnownSkills,
  myWantedSkills
) {
  const personKnown = getKnownSkills(person);
  const personWanted = getWantedSkills(person);

  const theyKnowWhatIWant = getSkillOverlap(
    personKnown,
    myWantedSkills
  );

  const theyWantWhatIKnow = getSkillOverlap(
    personWanted,
    myKnownSkills
  );

  let score = 0;

  if (theyKnowWhatIWant.length > 0) {
    score += 100;
    score += theyKnowWhatIWant.length * 10;
  }

  if (theyWantWhatIKnow.length > 0) {
    score += 100;
    score += theyWantWhatIKnow.length * 10;
  }

  if (
    theyKnowWhatIWant.length > 0 &&
    theyWantWhatIKnow.length > 0
  ) {
    score += 50;
  }

  return {
    score,
    theyKnowWhatIWant,
    theyWantWhatIKnow,
    personKnown,
    personWanted,
  };
}


export default function People() {
  const [people, setPeople] = useState([]);
  const [myKnownSkills, setMyKnownSkills] = useState([]);
  const [myWantedSkills, setMyWantedSkills] = useState([]);

  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  const loadPeople = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        peopleResponse,
        meResponse,
        knownResponse,
        wantedResponse,
      ] = await Promise.all([
        api.get("/api/accounts/users/"),

        api.get("/api/accounts/me/"),

        api.get("/api/skills/user/", {
          params: {
            type: "known",
          },
        }),

        api.get("/api/skills/user/", {
          params: {
            type: "wanted",
          },
        }),
      ]);

      const users = normalizeList(
        peopleResponse?.data
      );

 
      const currentUser =
        meResponse?.data?.data ||
        meResponse?.data?.user ||
        meResponse?.data;

      const otherUsers = users.filter(
        (person) => !isSameUser(person, currentUser)
      );

      const knownItems = normalizeList(
        knownResponse?.data
      );

      const wantedItems = normalizeList(
        wantedResponse?.data
      );

      setPeople(otherUsers);

      setMyKnownSkills(
        uniqueSkills(
          knownItems
            .map(getSkillName)
            .filter(Boolean)
        )
      );

      setMyWantedSkills(
        uniqueSkills(
          wantedItems
            .map(getSkillName)
            .filter(Boolean)
        )
      );
    } catch (requestError) {
      console.error(
        "Unable to load people:",
        requestError
      );

      setError(
        requestError?.response?.data?.message ||
          requestError?.response?.data?.detail ||
          "Unable to load people right now."
      );

      setPeople([]);
      setMyKnownSkills([]);
      setMyWantedSkills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPeople();
  }, [loadPeople, refreshKey]);

  const availableSkills = useMemo(() => {
    const skills = [];

    people.forEach((person) => {
      skills.push(...getKnownSkills(person));
      skills.push(...getWantedSkills(person));
    });

    return uniqueSkills(skills).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [people]);


  const displayedPeople = useMemo(() => {
    const searchTerm = normalizeText(search);
    const selectedSkill = normalizeText(skillFilter);

    return people
      .map((person) => {
        const match = calculateMatch(
          person,
          myKnownSkills,
          myWantedSkills
        );

        return {
          person,
          ...match,
        };
      })
      .filter(
        ({
          person,
          personKnown,
          personWanted,
        }) => {
          const name = normalizeText(
            getName(person)
          );

          const username = normalizeText(
            getUsername(person)
          );

          const bio = normalizeText(
            getBio(person)
          );

          const location = normalizeText(
            getLocation(person)
          );

          const allSkills = [
            ...personKnown,
            ...personWanted,
          ].map(normalizeText);

          const matchesSearch =
            !searchTerm ||
            name.includes(searchTerm) ||
            username.includes(searchTerm) ||
            bio.includes(searchTerm) ||
            location.includes(searchTerm) ||
            allSkills.some((skill) =>
              skill.includes(searchTerm)
            );

          const matchesSkill =
            !selectedSkill ||
            personKnown.some(
              (skill) =>
                normalizeText(skill) ===
                selectedSkill
            ) ||
            personWanted.some(
              (skill) =>
                normalizeText(skill) ===
                selectedSkill
            );

          return matchesSearch && matchesSkill;
        }
      )
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return getName(a.person).localeCompare(
          getName(b.person)
        );
      });
  }, [
    people,
    search,
    skillFilter,
    myKnownSkills,
    myWantedSkills,
  ]);

  const twoWayMatches = useMemo(
    () =>
      people.filter((person) => {
        const match = calculateMatch(
          person,
          myKnownSkills,
          myWantedSkills
        );

        return (
          match.theyKnowWhatIWant.length > 0 &&
          match.theyWantWhatIKnow.length > 0
        );
      }).length,
    [people, myKnownSkills, myWantedSkills]
  );

  const oneWayMatches = useMemo(
    () =>
      people.filter((person) => {
        const match = calculateMatch(
          person,
          myKnownSkills,
          myWantedSkills
        );

        return (
          match.theyKnowWhatIWant.length > 0 ||
          match.theyWantWhatIKnow.length > 0
        );
      }).length,
    [people, myKnownSkills, myWantedSkills]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        <div className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                <Users className="h-4 w-4" />
                Find People
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Discover people through skills
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Find people based on the skills they know
                and the skills they want to learn.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setRefreshKey((value) => value + 1)
              }
              disabled={loading}
              className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                <BookOpen className="h-4 w-4 text-slate-700" />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  You know
                </h2>

                <p className="text-xs text-slate-500">
                  Skills you can share with peers
                </p>
              </div>
            </div>

            {myKnownSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {myKnownSkills
                  .slice(0, 8)
                  .map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      {skill}
                    </span>
                  ))}

                {myKnownSkills.length > 8 && (
                  <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                    +{myKnownSkills.length - 8} more
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Add your known skills to discover better
                peer matches.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                <GraduationCap className="h-4 w-4 text-slate-700" />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  You want to learn
                </h2>

                <p className="text-xs text-slate-500">
                  Skills you are looking for
                </p>
              </div>
            </div>

            {myWantedSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {myWantedSkills
                  .slice(0, 8)
                  .map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      {skill}
                    </span>
                  ))}

                {myWantedSkills.length > 8 && (
                  <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                    +{myWantedSkills.length - 8} more
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Add wanted skills to find people who can
                share those skills with you.
              </p>
            )}
          </div>
        </div>

        {!loading && people.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                People
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {people.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                Skill matches
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {oneWayMatches}
              </p>
            </div>

            <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-1">
              <p className="text-xs font-medium text-slate-500">
                Two-way matches
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {twoWayMatches}
              </p>
            </div>
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search people or skills..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              />
            </div>

            <select
              value={skillFilter}
              onChange={(event) =>
                setSkillFilter(event.target.value)
              }
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            >
              <option value="">All skills</option>

              {availableSkills.map((skill) => (
                <option
                  key={skill}
                  value={skill}
                >
                  {skill}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-medium text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                setRefreshKey((value) => value + 1)
              }
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        )}

        {loading && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 animate-pulse rounded-full bg-slate-100" />

                  <div className="flex-1">
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />

                    <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-100" />

                    <div className="mt-3 h-3 w-20 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>

                <div className="mt-5 h-10 animate-pulse rounded-xl bg-slate-100" />

                <div className="mt-5 flex gap-2">
                  <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
                  <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading &&
          !error &&
          displayedPeople.length > 0 && (
            <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
              {displayedPeople.map(
                ({
                  person,
                  score,
                  theyKnowWhatIWant,
                  theyWantWhatIKnow,
                  personKnown,
                  personWanted,
                }) => {
                  const username = getUsername(person);
                  const name = getName(person);
                  const bio = getBio(person);
                  const location = getLocation(person);
                  const userId = getUserId(person);

                  const avatar = getMediaUrl(
                    getAvatar(person)
                  );

                  const isTwoWay =
                    theyKnowWhatIWant.length > 0 &&
                    theyWantWhatIKnow.length > 0;

                  return (
                    <article
                      key={`${userId || username || name}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
                    >

                      <div className="p-5 pb-4">
                        <div className="flex items-start gap-4">
                          <Link
                            to={getProfileUrl(username)}
                            className="shrink-0"
                          >
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={name}
                                className="h-16 w-16 rounded-full object-cover ring-1 ring-slate-200"
                                onError={(event) => {
                                  event.currentTarget.style.display =
                                    "none";

                                  const fallback =
                                    event.currentTarget
                                      .nextElementSibling;

                                  if (fallback) {
                                    fallback.style.display =
                                      "flex";
                                  }
                                }}
                              />
                            ) : null}

                            <div
                              className={`${
                                avatar
                                  ? "hidden"
                                  : "flex"
                              } h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200`}
                            >
                              <UserRound className="h-7 w-7" />
                            </div>
                          </Link>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <Link
                                  to={getProfileUrl(
                                    username
                                  )}
                                  className="block truncate text-base font-bold text-slate-900 transition hover:text-slate-700"
                                >
                                  {name}
                                </Link>

                                {username && (
                                  <p className="mt-0.5 truncate text-xs text-slate-500">
                                    @{username}
                                  </p>
                                )}
                              </div>

                              {score > 0 && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                  <Sparkles className="h-3 w-3" />
                                  Match
                                </span>
                              )}
                            </div>

                            {location && (
                              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />

                                <span className="truncate">
                                  {location}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {bio && (
                          <p className="mt-4 line-clamp-2 text-sm leading-5 text-slate-600">
                            {bio}
                          </p>
                        )}
                      </div>

                      {(isTwoWay ||
                        theyKnowWhatIWant.length > 0 ||
                        theyWantWhatIKnow.length > 0) && (
                        <div className="mx-5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 shrink-0 text-slate-700" />

                            <p className="text-xs font-bold text-slate-800">
                              {isTwoWay
                                ? "Two-way skill match"
                                : "Potential skill match"}
                            </p>
                          </div>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {isTwoWay
                              ? "You can potentially exchange skills with each other."
                              : "There is a skill connection between your learning interests."}
                          </p>
                        </div>
                      )}

                      <div className="flex-1 px-5 py-4">

                      
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              They know
                            </p>

                            {personKnown.length > 5 && (
                              <span className="text-[11px] text-slate-400">
                                +
                                {personKnown.length -
                                  5}
                              </span>
                            )}
                          </div>

                          {personKnown.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {personKnown
                                .slice(0, 5)
                                .map((skill) => {
                                  const matched =
                                    theyKnowWhatIWant.some(
                                      (wantedSkill) =>
                                        normalizeText(
                                          wantedSkill
                                        ) ===
                                        normalizeText(
                                          skill
                                        )
                                    );

                                  return (
                                    <span
                                      key={skill}
                                      className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                                        matched
                                          ? "bg-slate-900 text-white"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {skill}
                                    </span>
                                  );
                                })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">
                              No known skills listed.
                            </p>
                          )}
                        </div>

                        <div className="my-4 border-t border-slate-100" />

                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              Wants to learn
                            </p>

                            {personWanted.length > 5 && (
                              <span className="text-[11px] text-slate-400">
                                +
                                {personWanted.length -
                                  5}
                              </span>
                            )}
                          </div>

                          {personWanted.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {personWanted
                                .slice(0, 5)
                                .map((skill) => {
                                  const matched =
                                    theyWantWhatIKnow.some(
                                      (knownSkill) =>
                                        normalizeText(
                                          knownSkill
                                        ) ===
                                        normalizeText(
                                          skill
                                        )
                                    );

                                  return (
                                    <span
                                      key={skill}
                                      className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                                        matched
                                          ? "bg-slate-900 text-white"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {skill}
                                    </span>
                                  );
                                })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">
                              No wanted skills listed.
                            </p>
                          )}
                        </div>
                      </div>


                      <div className="border-t border-slate-100 bg-slate-50/60 p-4">
                        <div className="flex gap-2">
                          <Link
                            to={getProfileUrl(username)}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            View Profile

                            <ArrowRight className="h-4 w-4" />
                          </Link>

                          {username && (
                            <Link
                              to={`/chat/${encodeURIComponent(
                                username
                              )}`}
                              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                              title={`Message ${name}`}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}

        {!loading &&
          !error &&
          displayedPeople.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <Users className="h-6 w-6 text-slate-500" />
              </div>

              <h2 className="mt-4 text-lg font-bold text-slate-900">
                No people found
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Try another search or skill filter. Adding
                more known and wanted skills to your profile
                will also make skill-based discovery more
                useful.
              </p>

              {(search || skillFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSkillFilter("");
                  }}
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
      </div>
    </div>
  );
}