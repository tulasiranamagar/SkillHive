import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Code2,
  Database,
  Palette,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import api from "../../api/axios";

const normalizeList = (response) => {
  const payload = response?.data;

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

const getSkillId = (skill) =>
  skill?.id ||
  skill?.skill_id ||
  skill?.pk ||
  skill?.uuid ||
  null;

const getSkillName = (skill) =>
  skill?.name ||
  skill?.title ||
  skill?.skill_name ||
  skill?.label ||
  "Unnamed Skill";

const getSkillDescription = (skill) =>
  skill?.description ||
  skill?.summary ||
  "Build practical knowledge and connect with people interested in this skill.";

const getCategoryName = (skill) => {
  if (typeof skill?.category_name === "string") {
    return skill.category_name;
  }

  if (typeof skill?.category?.name === "string") {
    return skill.category.name;
  }

  if (typeof skill?.category === "string") {
    return skill.category;
  }

  if (typeof skill?.group === "string") {
    return skill.group;
  }

  return "";
};

const categoryIcons = {
  programming: Code2,
  development: Code2,
  "web development": Code2,
  software: Code2,
  "software development": Code2,

  data: Database,
  "data science": Database,
  database: Database,
  analytics: Database,

  design: Palette,
  "ui/ux": Palette,
  "ui ux": Palette,
  "user interface": Palette,
  "user experience": Palette,
};

const getCategoryIcon = (category = "") => {
  const key = category.toLowerCase().trim();

  for (const [name, Icon] of Object.entries(categoryIcons)) {
    if (key.includes(name)) {
      return Icon;
    }
  }

  return Sparkles;
};

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (typeof data?.error === "string") {
    return data.error;
  }

  if (typeof data === "string") {
    return data;
  }

  return "We couldn't load the available skills right now.";
};

function Skills() {
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadSkills = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/api/skills/");

        if (!mounted) {
          return;
        }

        const skillList = normalizeList(response);

        setSkills(skillList);
      } catch (err) {
        if (!mounted) {
          return;
        }

        setSkills([]);
        setError(getErrorMessage(err));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSkills();

    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const values = skills
      .map((skill) => getCategoryName(skill).trim())
      .filter(Boolean);

    return [...new Set(values)].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [skills]);

  const filteredSkills = useMemo(() => {
    const query = search.trim().toLowerCase();

    return skills.filter((skill) => {
      const name = getSkillName(skill).toLowerCase();
      const description = getSkillDescription(skill).toLowerCase();
      const category = getCategoryName(skill).toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        description.includes(query) ||
        category.includes(query);

      const matchesCategory =
        selectedCategory === "All" ||
        category === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [skills, search, selectedCategory]);

  const featuredCategories = useMemo(() => {
    const counts = {};

    skills.forEach((skill) => {
      const category = getCategoryName(skill).trim();

      if (!category) {
        return;
      }

      counts[category] = (counts[category] || 0) + 1;
    });

    return Object.entries(counts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 6)
      .map(([name, count]) => ({
        name,
        count,
      }));
  }, [skills]);

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("All");
  };

  const hasFilters =
    search.trim().length > 0 ||
    selectedCategory !== "All";

  return (
    <div className="min-h-screen bg-slate-50">

      <section className="bg-blue-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20">
              <BookOpen className="h-4 w-4" />
              Explore the SkillHive Skill Library
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Discover skills worth learning
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-blue-50 sm:text-lg">
              Explore skills shared across the SkillHive community and find
              people, exchanges, content, and learning opportunities around
              what interests you.
            </p>

            <div className="mt-8 max-w-2xl">
              <div className="flex items-center gap-3 rounded-2xl bg-white p-2 shadow-xl">
                <Search className="ml-3 h-5 w-5 shrink-0 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search skills..."
                  className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  aria-label="Search skills"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Clear skill search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSearch(search.trim())}
                  className="hidden rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:block"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

        {!loading &&
          featuredCategories.length > 0 &&
          !search.trim() && (
            <section className="mb-12">
              <div className="mb-6">
                <p className="text-sm font-semibold text-blue-600">
                  Browse by area
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Popular skill categories
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Start with an area that matches what you want to explore.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredCategories.map(({ name, count }) => {
                  const Icon = getCategoryIcon(name);

                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelectedCategory(name)}
                      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-slate-900">
                          {name}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {count}{" "}
                          {count === 1 ? "skill" : "skills"}
                        </p>
                      </div>

                      <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

        <section>
          <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Skill library
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                All available skills
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Search the skill library and discover learning opportunities
                connected to each skill.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {categories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(event) =>
                    setSelectedCategory(event.target.value)
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  aria-label="Filter skills by category"
                >
                  <option value="All">All categories</option>

                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              )}

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div className="py-8">
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6"
                  >
                    <div className="h-11 w-11 rounded-xl bg-slate-200" />

                    <div className="mt-5 h-5 w-32 rounded bg-slate-200" />

                    <div className="mt-3 h-3 w-full rounded bg-slate-200" />

                    <div className="mt-2 h-3 w-4/5 rounded bg-slate-200" />

                    <div className="mt-6 h-9 rounded-lg bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <BookOpen className="h-5 w-5 text-red-600" />
                </div>

                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  Unable to load skills
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Try again
                </button>
              </div>
            ) : filteredSkills.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                  <Search className="h-6 w-6 text-blue-600" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  No matching skills
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Try a different search term or category. You can clear the
                  filters to see the complete skill library.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Show all skills
                </button>
              </div>
            ) : (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    Showing{" "}
                    <span className="font-semibold text-slate-700">
                      {filteredSkills.length}
                    </span>{" "}
                    {filteredSkills.length === 1
                      ? "skill"
                      : "skills"}
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredSkills.map((skill, index) => {
                    const id = getSkillId(skill);
                    const name = getSkillName(skill);
                    const description =
                      getSkillDescription(skill);
                    const category = getCategoryName(skill);

                    const Icon = getCategoryIcon(
                      category || name
                    );

                    return (
                      <article
                        key={id || `${name}-${index}`}
                        className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                            <Icon className="h-5 w-5" />
                          </div>

                          {category && (
                            <span className="max-w-[55%] truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                              {category}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-5 text-lg font-bold text-slate-900">
                          {name}
                        </h3>

                        <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">
                          {description}
                        </p>

                        <div className="mt-auto pt-6">
                          <Link
                            to={`/people?skill=${encodeURIComponent(
                              name
                            )}`}
                            className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-600 hover:text-white"
                          >
                            Find people
                            <Users className="h-4 w-4" />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-3xl bg-blue-600 text-white">
          <div className="flex flex-col gap-8 px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12 lg:py-12 text-black">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-100">
                <Sparkles className="h-4 w-4" />
                Learn by sharing
              </div>

              <h2 className="mt-3 text-2xl font-bold sm:text-3xl text-white">
                Know a skill someone else wants to learn?
              </h2>

              <p className="mt-3 text-sm leading-6 text-blue-50 sm:text-base">
                Join SkillHive, share what you know, discover what you want
                to learn, and build meaningful peer-to-peer learning
                connections.
              </p>
            </div>

            <Link
              to="/register"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
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

export default Skills;