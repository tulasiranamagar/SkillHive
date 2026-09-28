import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock3,
  Handshake,
  Search,
  Sparkles,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";

import api from "../../api/axios";
import { useAuth } from "../../hooks/useAuth";

const categories = [
  "All",
  "Programming",
  "Design",
  "Data",
  "Business",
  "Marketing",
  "Languages",
  "Other",
];

const normalizeArray = (payload) => {
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

  return [];
};

const getSkillName = (item) => {
  return (
    item?.skill?.name ||
    item?.skill_name ||
    item?.name ||
    "Skill"
  );
};

const getUserName = (user) => {
  return (
    user?.name ||
    user?.full_name ||
    user?.username ||
    "SkillHive member"
  );
};

const getInitials = (user) => {
  const name = getUserName(user);
  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getCurrentUser = (payload) => {
  return (
    payload?.data?.user ||
    payload?.data ||
    payload?.user ||
    payload ||
    null
  );
};

const getPersonId = (person) => {
  return (
    person?.id ||
    person?.user_id ||
    person?.user?.id ||
    null
  );
};

const getPersonUsername = (person) => {
  return (
    person?.username ||
    person?.user?.username ||
    ""
  );
};

function Explore() {
  const { isAuthenticated } = useAuth();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const [skills, setSkills] = useState([]);
  const [people, setPeople] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [content, setContent] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  const getAuthDestination = (path) => {
    return isAuthenticated ? path : "/login";
  };

  useEffect(() => {
    let mounted = true;

    const loadExploreData = async () => {
      setLoading(true);
      setError("");

      try {
        const requests = await Promise.allSettled([
         
          api.get("/api/skills/"),

          api.get("/api/accounts/users/"),

          api.get("/api/exchanges/posts/"),

          api.get("/api/marketplace/content/"),

          api.get("/api/skill-sessions/"),

          api.get("/api/accounts/me/"),
        ]);

        if (!mounted) {
          return;
        }

        const [
          skillsResponse,
          peopleResponse,
          exchangesResponse,
          contentResponse,
          sessionsResponse,
          currentUserResponse,
        ] = requests;

        if (skillsResponse.status === "fulfilled") {
          setSkills(
            normalizeArray(skillsResponse.value.data)
          );
        }

        if (peopleResponse.status === "fulfilled") {
          setPeople(
            normalizeArray(peopleResponse.value.data)
          );
        }

        if (exchangesResponse.status === "fulfilled") {
          setExchanges(
            normalizeArray(exchangesResponse.value.data)
          );
        }

        if (contentResponse.status === "fulfilled") {
          setContent(
            normalizeArray(contentResponse.value.data)
          );
        }

        if (sessionsResponse.status === "fulfilled") {
          setSessions(
            normalizeArray(sessionsResponse.value.data)
          );
        }

        if (currentUserResponse.status === "fulfilled") {
          setCurrentUser(
            getCurrentUser(
              currentUserResponse.value.data
            )
          );
        }

        const failedRequests = requests.filter(
          (request) => request.status === "rejected"
        );

        if (
          failedRequests.length ===
          requests.length
        ) {
          setError(
            "We couldn't load discovery data right now."
          );
        }
      } catch {
        if (mounted) {
          setError(
            "Something went wrong while loading Explore."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadExploreData();

    return () => {
      mounted = false;
    };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredSkills = useMemo(() => {
    return skills
      .filter((skill) => {
        if (activeCategory === "All") {
          return true;
        }

        const category =
          skill?.category?.name ||
          skill?.category_name ||
          "";

        return (
          category.toLowerCase() ===
          activeCategory.toLowerCase()
        );
      })
      .filter((skill) => {
        if (!normalizedSearch) {
          return true;
        }

        const name = getSkillName(skill).toLowerCase();

        const description = (
          skill?.description || ""
        ).toLowerCase();

        return (
          name.includes(normalizedSearch) ||
          description.includes(normalizedSearch)
        );
      })
      .slice(0, 8);
  }, [
    skills,
    activeCategory,
    normalizedSearch,
  ]);

  const filteredPeople = useMemo(() => {
    const currentUserId = getPersonId(currentUser);
    const currentUsername =
      getPersonUsername(currentUser).toLowerCase();

    return people
      .filter((person) => {
        const personId = getPersonId(person);
        const personUsername =
          getPersonUsername(person).toLowerCase();
          
        if (
          currentUserId &&
          personId &&
          String(currentUserId) === String(personId)
        ) {
          return false;
        }

        if (
          currentUsername &&
          personUsername &&
          currentUsername === personUsername
        ) {
          return false;
        }

        return true;
      })
      .filter((person) => {
        if (!normalizedSearch) {
          return true;
        }

        const name = getUserName(person).toLowerCase();

        const username = (
          person?.username || ""
        ).toLowerCase();

        const bio = (
          person?.bio || ""
        ).toLowerCase();

        return (
          name.includes(normalizedSearch) ||
          username.includes(normalizedSearch) ||
          bio.includes(normalizedSearch)
        );
      })
      .slice(0, 4);
  }, [
    people,
    currentUser,
    normalizedSearch,
  ]);

  const filteredExchanges = useMemo(() => {
    return exchanges
      .filter((exchange) => {
        if (!normalizedSearch) {
          return true;
        }

        const title = (
          exchange?.title ||
          exchange?.name ||
          ""
        ).toLowerCase();

        const description = (
          exchange?.description || ""
        ).toLowerCase();

        const skill =
          exchange?.skill?.name ||
          exchange?.skill_name ||
          "";

        return (
          title.includes(normalizedSearch) ||
          description.includes(normalizedSearch) ||
          skill.toLowerCase().includes(normalizedSearch)
        );
      })
      .slice(0, 3);
  }, [exchanges, normalizedSearch]);

  const filteredContent = useMemo(() => {
    return content
      .filter((item) => {
        if (!normalizedSearch) {
          return true;
        }

        const title = (
          item?.title || ""
        ).toLowerCase();

        const description = (
          item?.description || ""
        ).toLowerCase();

        return (
          title.includes(normalizedSearch) ||
          description.includes(normalizedSearch)
        );
      })
      .slice(0, 3);
  }, [content, normalizedSearch]);

  const filteredSessions = useMemo(() => {
    return sessions
      .filter((session) => {
        if (!normalizedSearch) {
          return true;
        }

        const title = (
          session?.title || ""
        ).toLowerCase();

        const description = (
          session?.description || ""
        ).toLowerCase();

        const skill =
          session?.skill?.name ||
          session?.skill_name ||
          "";

        return (
          title.includes(normalizedSearch) ||
          description.includes(normalizedSearch) ||
          skill.toLowerCase().includes(normalizedSearch)
        );
      })
      .slice(0, 3);
  }, [sessions, normalizedSearch]);

  const clearSearch = () => {
    setSearch("");
  };

  return (
    <div className="min-h-screen bg-slate-50">
     
      <section className="bg-blue-600">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/40 bg-blue-500/50 px-3.5 py-2 text-xs font-semibold text-white">
              <Sparkles className="h-4 w-4" />
              Discover your next learning opportunity
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Explore skills, people, exchanges, and learning.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
              Find people who can help you learn, share what
              you know, discover useful content, and join
              learning experiences that match your goals.
            </p>

            <div className="relative mt-8 max-w-2xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search skills, people, exchanges, or learning..."
                className="w-full rounded-2xl border border-white/20 bg-white py-4 pl-12 pr-12 text-sm text-slate-900 shadow-lg outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-white/60"
              />

              {search && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-max gap-2 py-4">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() =>
                  setActiveCategory(category)
                }
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  activeCategory === category
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900",
                ].join(" ")}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>


      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {error}
          </div>
        )}


        <section>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              to={getAuthDestination("/people")}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>

                <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" />
              </div>

              <h2 className="mt-5 font-semibold text-slate-900">
                Find people
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Discover people based on the skills they know
                and want to learn.
              </p>
            </Link>

            <Link
              to="/skills"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <BookOpen className="h-5 w-5" />
                </div>

                <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" />
              </div>

              <h2 className="mt-5 font-semibold text-slate-900">
                Explore skills
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Browse skills and discover what you can learn
                or share with the community.
              </p>
            </Link>

            <Link
              to={getAuthDestination("/exchange")}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Handshake className="h-5 w-5" />
                </div>

                <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" />
              </div>

              <h2 className="mt-5 font-semibold text-slate-900">
                Skill exchanges
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Find active peer-to-peer opportunities and
                exchange knowledge.
              </p>
            </Link>
          </div>
        </section>

        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Skills
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Explore skills
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Discover skills shared across the SkillHive
                community.
              </p>
            </div>

            <Link
              to="/skills"
              className="hidden items-center gap-1 text-sm font-semibold text-blue-600 sm:inline-flex"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <SkillSkeleton />
          ) : filteredSkills.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredSkills.map((skill) => (
                <Link
                  key={skill.id}
                  to="/skills"
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <BookOpen className="h-5 w-5" />
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-900">
                    {getSkillName(skill)}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {skill?.category?.name ||
                      skill?.category_name ||
                      "Learning skill"}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptySection
              icon={BookOpen}
              title="No skills found"
              description={
                search
                  ? "Try a different search term."
                  : "Skills will appear here as they become available."
              }
              actionLabel="Browse all skills"
              actionTo="/skills"
            />
          )}
        </section>

        <section className="mt-14">
          <SectionHeader
            eyebrow="Community"
            title="People you can learn with"
            description="Discover members who are sharing knowledge and building their skills."
            actionLabel="View people"
            actionTo={getAuthDestination("/people")}
          />

          {loading ? (
            <PeopleSkeleton />
          ) : filteredPeople.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredPeople.map((person) => {
                const username =
                  person?.username ||
                  person?.id;

                return (
                  <Link
                    key={person.id || username}
                    to={`/profile/${username}`}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {person?.profile_picture ? (
                          <img
                            src={person.profile_picture}
                            alt={getUserName(person)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(person)
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900">
                          {getUserName(person)}
                        </h3>

                        <p className="truncate text-xs text-slate-500">
                          {person?.username
                            ? `@${person.username}`
                            : "SkillHive member"}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">
                      {person?.bio ||
                        "Open to learning, sharing, and connecting with the SkillHive community."}
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-600">
                      <Users className="h-4 w-4" />
                      View profile
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptySection
              icon={Users}
              title="No people found"
              description="Try searching for another person or explore the community."
              actionLabel="Explore people"
              actionTo={getAuthDestination("/people")}
            />
          )}
        </section>

        <section className="mt-14 text-white">
          <SectionHeader
            eyebrow="Peer learning"
            title="Active skill exchanges"
            description="See what members are currently looking to learn and share."
            actionLabel="View exchanges"
            actionTo={getAuthDestination("/exchange")}
          />

          {loading ? (
            <ExchangeSkeleton />
          ) : filteredExchanges.length > 0 ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {filteredExchanges.map((exchange) => (
                <Link
                  key={exchange.id}
                  to={getAuthDestination(
                    `/exchange/${exchange.id}`
                  )}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Handshake className="h-5 w-5" />
                    </div>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      Skill Exchange
                    </span>
                  </div>

                  <h3 className="mt-5 line-clamp-2 font-semibold text-slate-900">
                    {exchange?.title ||
                      exchange?.name ||
                      "Skill exchange opportunity"}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                    {exchange?.description ||
                      "Connect with another member and exchange practical knowledge."}
                  </p>

                  {(exchange?.skill?.name ||
                    exchange?.skill_name) && (
                    <div className="mt-4 inline-flex rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                      {exchange?.skill?.name ||
                        exchange?.skill_name}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <EmptySection
              icon={Handshake}
              title="No active exchanges yet"
              description="New peer-to-peer exchanges will appear here."
              actionLabel="Explore exchanges"
              actionTo={getAuthDestination("/exchange")}
            />
          )}
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-2">
   
          <div>
            <SectionHeader
              eyebrow="Learn at your pace"
              title="Marketplace"
              description="Discover learning content shared by the community."
              actionLabel="View marketplace"
              actionTo="/marketplace"
            />

            {loading ? (
              <ContentSkeleton />
            ) : filteredContent.length > 0 ? (
              <div className="mt-6 space-y-3">
                {filteredContent.map((item) => (
                  <Link
                    key={item.id}
                    to={`/marketplace/content/${item.id}`}
                    className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <BookOpen className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-slate-900">
                        {item?.title ||
                          "Learning content"}
                      </h3>

                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        {item?.description ||
                          "Explore this learning resource from the SkillHive community."}
                      </p>
                    </div>

                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptySection
                icon={BookOpen}
                title="No learning content yet"
                description="Marketplace resources will appear here."
                actionLabel="Browse marketplace"
                actionTo="/marketplace"
              />
            )}
          </div>

          <div className="text-white">
            <SectionHeader
              eyebrow="Learn together"
              title="Upcoming sessions"
              description="Join live learning experiences created by the community."
              actionLabel="View sessions"
              actionTo="/sessions"
            />

            {loading ? (
              <ContentSkeleton />
            ) : filteredSessions.length > 0 ? (
              <div className="mt-6 space-y-3">
                {filteredSessions.map((session) => (
                  <Link
                    key={session.id}
                    to="/sessions"
                    className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Video className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-slate-900">
                        {session?.title ||
                          "Learning session"}
                      </h3>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {session?.scheduled_at && (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDate(
                              session.scheduled_at
                            )}
                          </span>
                        )}

                        {(session?.skill?.name ||
                          session?.skill_name) && (
                          <span>
                            {session?.skill?.name ||
                              session?.skill_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptySection
                icon={Video}
                title="No upcoming sessions"
                description="New learning sessions will appear here."
                actionLabel="Explore sessions"
                actionTo="/sessions"
              />
            )}
          </div>
        </section>

        <section className="mt-16 overflow-hidden rounded-3xl bg-blue-600">
          <div className="px-6 py-12 text-center sm:px-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white">
              <Zap className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-white sm:text-3xl">
              Ready to turn your skills into opportunities to learn?
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
              Build your skill profile, discover people, and start
              your learning journey with SkillHive.
            </p>

            <Link
              to="/register"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Join SkillHive
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  actionLabel,
  actionTo,
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-blue-600">
          {eyebrow}
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 sm:inline-flex"
        >
          {actionLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function EmptySection({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="mt-4 font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>

      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function SkillSkeleton() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="h-10 w-10 rounded-xl bg-slate-200" />
          <div className="mt-4 h-4 w-2/3 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function PeopleSkeleton() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-200" />

            <div className="flex-1">
              <div className="h-4 w-2/3 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
            </div>
          </div>

          <div className="mt-4 h-8 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function ExchangeSkeleton() {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6"
        >
          <div className="h-10 w-10 rounded-xl bg-slate-200" />
          <div className="mt-5 h-4 w-3/4 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-full rounded bg-slate-100" />
          <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-xl bg-slate-200" />

            <div className="flex-1">
              <div className="h-4 w-2/3 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-full rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default Explore;

