import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  Check,
  ChevronDown,
  CirclePlus,
  Edit3,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import api from "../../api/axios";

function unwrap(response) {
  const data = response?.data;

  if (data?.data !== undefined) {
    return data.data;
  }

  return data;
}

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

  const firstValue = Object.values(data)[0];

  if (Array.isArray(firstValue) && firstValue.length) {
    return String(firstValue[0]);
  }

  if (typeof firstValue === "string") {
    return firstValue;
  }

  return fallback;
}

function normalizeSkill(item) {
  const skill = item?.skill ?? item;

  const isCustom =
    !item?.skill &&
    Boolean(
      item?.custom_name ||
        item?.display_name
    );

  return {
    id: item?.id ?? null,

    skillId:
      item?.skill_id ??
      item?.skillId ??
      skill?.id ??
      null,

    name:
      item?.display_name ??
      item?.custom_name ??
      skill?.name ??
      skill?.title ??
      item?.skill_name ??
      item?.name ??
      "Unnamed skill",

    category:
      skill?.category?.name ??
      skill?.category_name ??
      item?.category_name ??
      item?.category ??
      (isCustom ? "Custom skill" : "General"),

    description:
      skill?.description ??
      item?.description ??
      "",

    level:
      Number(
        item?.level ??
          item?.proficiency ??
          item?.skill_level ??
          1
      ) || 1,

    experienceYears:
      item?.experience_years ??
      item?.experienceYears ??
      item?.years_of_experience ??
      "",

    type:
      item?.skill_type ??
      item?.type ??
      null,

    customName:
      item?.custom_name ??
      null,

    isCustom,
  };
}

function normalizeCatalogSkill(item) {
  const skill = item?.skill ?? item;

  return {
    id:
      item?.id ??
      item?.skill_id ??
      item?.skillId ??
      skill?.id ??
      null,

    name:
      skill?.name ??
      skill?.title ??
      item?.name ??
      item?.title ??
      "Unnamed skill",

    category:
      skill?.category?.name ??
      skill?.category_name ??
      item?.category_name ??
      item?.category ??
      "General",

    description:
      skill?.description ??
      item?.description ??
      "",
  };
}

function normalizeItems(data) {
  const items = Array.isArray(data)
    ? data
    : data?.results ??
      data?.skills ??
      data?.items ??
      data?.data ??
      [];

  return Array.isArray(items) ? items : [];
}

function getSkillId(skill) {
  return (
    skill?.skillId ??
    skill?.skill_id ??
    skill?.skill?.id ??
    null
  );
}

function Skills() {
  const [knownSkills, setKnownSkills] = useState([]);
  const [wantedSkills, setWantedSkills] = useState([]);
  const [catalogSkills, setCatalogSkills] = useState([]);

  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] =
    useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeTab, setActiveTab] =
    useState("known");

  const [search, setSearch] = useState("");
  const [catalogSearch, setCatalogSearch] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [editingSkill, setEditingSkill] =
    useState(null);

  const [skillMode, setSkillMode] =
    useState("catalog");

  const [form, setForm] = useState({
    skillId: "",
    customName: "",
    level: "1",
    experienceYears: "",
  });

  async function fetchUserSkills(type) {
    try {
      const response = await api.get(
        "/api/skills/user/",
        {
          params: {
            type,
          },
        }
      );

      return normalizeItems(
        unwrap(response)
      ).map(normalizeSkill);
    } catch (requestError) {
      throw requestError;
    }
  }

  async function loadSkills() {
    setLoading(true);
    setError("");

    try {
      const [
        knownResult,
        wantedResult,
      ] = await Promise.all([
        fetchUserSkills("known"),
        fetchUserSkills("wanted"),
      ]);

      setKnownSkills(knownResult);
      setWantedSkills(wantedResult);
    } catch (requestError) {
      setError(
        extractError(
          requestError,
          "Could not load your skills."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalog() {
    setCatalogLoading(true);

    try {
      const endpoints = [
        "/api/skills/",
        "/api/skills/all/",
      ];

      let loaded = false;

      for (const endpoint of endpoints) {
        try {
          const response = await api.get(
            endpoint
          );

          const skills = normalizeItems(
            unwrap(response)
          )
            .map(normalizeCatalogSkill)
            .filter((skill) => skill.id);

          setCatalogSkills(skills);
          loaded = true;
          break;
        } catch {
          // Try the next supported endpoint.
        }
      }

      if (!loaded) {
        setCatalogSkills([]);
      }
    } finally {
      setCatalogLoading(false);
    }
  }

  useEffect(() => {
    loadSkills();
    loadCatalog();
  }, []);

  const currentSkills =
    activeTab === "known"
      ? knownSkills
      : wantedSkills;

  const filteredSkills = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return currentSkills;
    }

    return currentSkills.filter((skill) => {
      return (
        skill.name
          .toLowerCase()
          .includes(query) ||
        skill.category
          .toLowerCase()
          .includes(query)
      );
    });
  }, [currentSkills, search]);

  const filteredCatalog = useMemo(() => {
    const query = catalogSearch
      .trim()
      .toLowerCase();

    let result = catalogSkills;

    if (query) {
      result = result.filter((skill) => {
        return (
          skill.name
            .toLowerCase()
            .includes(query) ||
          skill.category
            .toLowerCase()
            .includes(query)
        );
      });
    }

    const existingIds = new Set(
      currentSkills
        .map(getSkillId)
        .filter(Boolean)
        .map(String)
    );

    return result.filter(
      (skill) =>
        !existingIds.has(
          String(skill.id)
        )
    );
  }, [
    catalogSkills,
    catalogSearch,
    currentSkills,
  ]);

  function openAddModal() {
    setEditingSkill(null);
    setSkillMode("catalog");

    setForm({
      skillId: "",
      customName: "",
      level: "1",
      experienceYears: "",
    });

    setCatalogSearch("");
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(skill) {
    setEditingSkill(skill);

    const custom =
      Boolean(skill.isCustom) ||
      Boolean(skill.customName);

    setSkillMode(
      custom ? "custom" : "catalog"
    );

    setForm({
      skillId: String(
        getSkillId(skill) ?? ""
      ),
      customName:
        skill.customName ??
        (custom ? skill.name : ""),
      level: String(
        Math.min(
          5,
          Math.max(
            1,
            Number(skill.level) || 1
          )
        )
      ),
      experienceYears:
        skill.experienceYears ?? "",
    });

    setCatalogSearch("");
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingSkill(null);
    setSkillMode("catalog");

    setForm({
      skillId: "",
      customName: "",
      level: "1",
      experienceYears: "",
    });

    setCatalogSearch("");
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function createSkill(payload) {
    return await api.post(
      "/api/skills/user/",
      payload
    );
  }

  async function updateSkill(id, payload) {
    return await api.patch(
      `/api/skills/user/${id}/`,
      payload
    );
  }

  async function deleteSkill(id) {
    return await api.delete(
      `/api/skills/user/${id}/`
    );
  }

  function buildPayload() {
    const numericLevel = Number(
      form.level
    );

    const experienceYears =
      form.experienceYears === ""
        ? 0
        : Number(form.experienceYears);

    if (skillMode === "custom") {
      return {
        custom_name:
          form.customName.trim(),
        skill_type: activeTab,
        level: numericLevel,
        experience_years:
          experienceYears,
      };
    }

    return {
      skill: Number(form.skillId),
      skill_type: activeTab,
      level: numericLevel,
      experience_years:
        experienceYears,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (skillMode === "custom") {
      const customName =
        form.customName.trim();

      if (!customName) {
        setError(
          "Please enter your custom skill name."
        );
        return;
      }

      if (customName.length > 255) {
        setError(
          "Custom skill name cannot exceed 255 characters."
        );
        return;
      }
    } else if (!form.skillId) {
      setError(
        "Please select a skill from the Skill Library."
      );
      return;
    }

    const numericLevel = Number(
      form.level
    );

    if (
      !Number.isInteger(numericLevel) ||
      numericLevel < 1 ||
      numericLevel > 5
    ) {
      setError(
        "Skill level must be between 1 and 5."
      );
      return;
    }

    if (
      form.experienceYears !== "" &&
      (
        Number.isNaN(
          Number(form.experienceYears)
        ) ||
        Number(form.experienceYears) < 0
      )
    ) {
      setError(
        "Experience years cannot be negative."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = buildPayload();

      if (editingSkill) {
        await updateSkill(
          editingSkill.id,
          payload
        );
      } else {
        await createSkill(payload);
      }

      await loadSkills();

      setShowModal(false);
      setEditingSkill(null);

      setSuccess(
        editingSkill
          ? "Skill updated successfully."
          : "Skill added successfully."
      );

      setForm({
        skillId: "",
        customName: "",
        level: "1",
        experienceYears: "",
      });

      setCatalogSearch("");
    } catch (requestError) {
      setError(
        extractError(
          requestError,
          editingSkill
            ? "Could not update the skill."
            : "Could not add the skill."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(skill) {
    const confirmed = window.confirm(
      `Remove "${skill.name}" from your ${
        activeTab === "known"
          ? "known"
          : "wanted"
      } skills?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await deleteSkill(skill.id);

      await loadSkills();

      setSuccess(
        `"${skill.name}" was removed successfully.`
      );
    } catch (requestError) {
      setError(
        extractError(
          requestError,
          "Could not remove the skill."
        )
      );
    }
  }

  function selectCatalogSkill(skill) {
    setSkillMode("catalog");

    setForm((current) => ({
      ...current,
      skillId: String(skill.id),
    }));

    setCatalogSearch(skill.name);
  }

  function switchSkillMode(mode) {
    if (editingSkill) {
      return;
    }

    setSkillMode(mode);

    setError("");

    if (mode === "catalog") {
      setForm((current) => ({
        ...current,
        customName: "",
      }));
    } else {
      setForm((current) => ({
        ...current,
        skillId: "",
      }));
    }
  }

  const knownCount = knownSkills.length;
  const wantedCount = wantedSkills.length;

  const averageKnownLevel =
    knownSkills.length > 0
      ? (
          knownSkills.reduce(
            (sum, skill) =>
              sum +
              (Number(skill.level) || 0),
            0
          ) / knownSkills.length
        ).toFixed(1)
      : "0";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-48 animate-pulse rounded-3xl bg-slate-200" />

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl bg-slate-200"
              />
            ))}
          </div>

          <div className="mt-6 h-96 animate-pulse rounded-2xl bg-slate-200" />
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
            <div className="max-w-3xl">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white">
                <Sparkles className="h-5 w-5" />
              </div>

              <h1 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                My Skills
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                Tell SkillHive what you know and
                what you want to learn. Your skills
                help power peer matching,
                recommendations, skill exchanges,
                and your learning roadmap.
              </p>

              <button
                type="button"
                onClick={openAddModal}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
              >
                <Plus className="h-4 w-4" />
                Add skill
              </button>
            </div>
          </div>
        </section>

        {/* Alerts */}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <X className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <p className="text-sm font-medium text-red-700">
                {error}
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

              <p className="text-sm font-medium text-green-700">
                {success}
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={Award}
            label="Skills I know"
            value={knownCount}
            description="Skills you can share"
          />

          <StatCard
            icon={BookOpen}
            label="Skills I want"
            value={wantedCount}
            description="Skills you want to learn"
          />

          <StatCard
            icon={Sparkles}
            label="Average level"
            value={`${averageKnownLevel}/5`}
            description="Across known skills"
          />
        </section>

        {/* Tabs */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Your skill profile
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Keep your learning and exchange
                preferences up to date.
              </p>
            </div>

            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("known");
                  setSearch("");
                  setSuccess("");
                  setError("");
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "known"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Skills I know

                <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                  {knownCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("wanted");
                  setSearch("");
                  setSuccess("");
                  setError("");
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "wanted"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Skills I want

                <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                  {wantedCount}
                </span>
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder={`Search ${
                  activeTab === "known"
                    ? "known"
                    : "wanted"
                } skills...`}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <CirclePlus className="h-4 w-4" />
              Add skill
            </button>
          </div>

          {/* Skills */}
          <div className="p-5 sm:p-6">
            {filteredSkills.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  {activeTab === "known" ? (
                    <Award className="h-6 w-6" />
                  ) : (
                    <BookOpen className="h-6 w-6" />
                  )}
                </div>

                <h3 className="mt-4 text-base font-bold text-slate-900">
                  {search
                    ? "No matching skills"
                    : activeTab === "known"
                    ? "No known skills yet"
                    : "No wanted skills yet"}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {search
                    ? "Try another search term."
                    : activeTab === "known"
                    ? "Add the skills you can confidently share with other members."
                    : "Add the skills you would like to learn through SkillHive."}
                </p>

                {!search && (
                  <button
                    type="button"
                    onClick={openAddModal}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add your first skill
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredSkills.map(
                  (skill, index) => (
                    <SkillCard
                      key={
                        skill.id ??
                        `${skill.name}-${index}`
                      }
                      skill={skill}
                      type={activeTab}
                      onEdit={() =>
                        openEditModal(skill)
                      }
                      onDelete={() =>
                        handleDelete(skill)
                      }
                    />
                  )
                )}
              </div>
            )}
          </div>
        </section>

        {/* Explanation */}
        <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Why your skills matter
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                SkillHive uses your known skills and
                wanted skills to improve peer discovery,
                skill exchange recommendations,
                career-goal skill-gap analysis, and
                personalized learning suggestions.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingSkill
                    ? "Edit skill"
                    : "Add skill"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {activeTab === "known"
                    ? "Add a skill you can share with other members."
                    : "Add a skill you want to learn."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[calc(90vh-100px)] overflow-y-auto p-6"
            >
              {/* Skill source selector */}
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Skill
                </label>

                {!editingSkill && (
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() =>
                        switchSkillMode(
                          "catalog"
                        )
                      }
                      className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                        skillMode === "catalog"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Skill Library
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        switchSkillMode(
                          "custom"
                        )
                      }
                      className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                        skillMode === "custom"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      My own skill
                    </button>
                  </div>
                )}

                {/* Catalog skill */}
                {skillMode === "catalog" && (
                  <>
                    <div className="relative mt-3">
                      <select
                        id="skillId"
                        name="skillId"
                        value={form.skillId}
                        onChange={
                          handleFormChange
                        }
                        disabled={
                          Boolean(
                            editingSkill
                          ) ||
                          catalogLoading
                        }
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
                      >
                        <option value="">
                          {catalogLoading
                            ? "Loading skills..."
                            : "Select a skill from Skill Library"}
                        </option>

                        {filteredCatalog.map(
                          (skill) => (
                            <option
                              key={skill.id}
                              value={skill.id}
                            >
                              {skill.name}
                              {skill.category
                                ? ` — ${skill.category}`
                                : ""}
                            </option>
                          )
                        )}

                        {editingSkill &&
                          form.skillId && (
                            <option
                              value={
                                form.skillId
                              }
                            >
                              {editingSkill.name}
                            </option>
                          )}
                      </select>

                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>

                    {!editingSkill && (
                      <div className="mt-4">
                        <label className="block text-xs font-semibold text-slate-500">
                          Or search the Skill Library
                        </label>

                        <div className="relative mt-2">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                          <input
                            value={
                              catalogSearch
                            }
                            onChange={(
                              event
                            ) =>
                              setCatalogSearch(
                                event.target
                                  .value
                              )
                            }
                            placeholder="Search skills..."
                            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        {catalogSearch &&
                          filteredCatalog.length >
                            0 && (
                            <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                              {filteredCatalog
                                .slice(0, 8)
                                .map(
                                  (
                                    skill
                                  ) => (
                                    <button
                                      type="button"
                                      key={
                                        skill.id
                                      }
                                      onClick={() =>
                                        selectCatalogSkill(
                                          skill
                                        )
                                      }
                                      className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-blue-50"
                                    >
                                      <span className="text-sm font-medium text-slate-700">
                                        {
                                          skill.name
                                        }
                                      </span>

                                      <span className="text-xs text-slate-400">
                                        {
                                          skill.category
                                        }
                                      </span>
                                    </button>
                                  )
                                )}
                            </div>
                          )}

                        {catalogSearch &&
                          filteredCatalog.length ===
                            0 && (
                            <p className="mt-2 text-xs text-slate-400">
                              No Skill Library
                              match found.
                              You can switch to
                              <strong className="ml-1 text-slate-600">
                                My own skill
                              </strong>{" "}
                              to add it manually.
                            </p>
                          )}
                      </div>
                    )}
                  </>
                )}

                {/* Custom skill */}
                {skillMode === "custom" && (
                  <div className="mt-3">
                    <input
                      id="customName"
                      name="customName"
                      type="text"
                      value={form.customName}
                      onChange={
                        handleFormChange
                      }
                      disabled={Boolean(
                        editingSkill
                      )}
                      maxLength={255}
                      placeholder="e.g. Figma, Video Editing, Public Speaking"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
                    />

                    <div className="mt-2 flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />

                      <p className="text-xs leading-5 text-slate-500">
                        Add any skill that is not
                        currently available in the
                        Skill Library. Custom skills
                        can still be used in your
                        personal skill profile.
                      </p>
                    </div>
                  </div>
                )}

                {editingSkill && (
                  <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                    <p className="text-xs leading-5 text-blue-700">
                      {editingSkill.isCustom
                        ? "This is your custom skill. You can update its level and experience."
                        : "This Skill Library skill is linked to the official SkillHive skill catalog."}
                    </p>
                  </div>
                )}
              </div>

              {/* Level */}
              <div className="mt-6">
                <label
                  htmlFor="level"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Proficiency level
                </label>

                <div className="mt-3 grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(
                    (level) => (
                      <button
                        type="button"
                        key={level}
                        onClick={() =>
                          setForm(
                            (current) => ({
                              ...current,
                              level: String(
                                level
                              ),
                            })
                          )
                        }
                        className={`rounded-xl border px-3 py-3 text-center transition ${
                          Number(
                            form.level
                          ) === level
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                        }`}
                      >
                        <span className="block text-sm font-bold">
                          {level}
                        </span>

                        <span className="mt-1 block text-[10px]">
                          {getLevelLabel(
                            level
                          )}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Experience */}
              <div className="mt-6">
                <label
                  htmlFor="experienceYears"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Experience in years
                </label>

                <input
                  id="experienceYears"
                  name="experienceYears"
                  type="number"
                  min="0"
                  max="60"
                  step="0.1"
                  value={
                    form.experienceYears
                  }
                  onChange={
                    handleFormChange
                  }
                  placeholder="e.g. 2"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-2 text-xs text-slate-400">
                  This helps other members understand
                  your practical experience.
                </p>
              </div>

              {/* Info */}
              <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs leading-5 text-slate-600">
                  {activeTab === "known"
                    ? "Known skills can be used to discover people who want to learn from you or exchange skills with you."
                    : "Wanted skills help SkillHive find relevant peers, content, sessions, and roadmap opportunities."}
                </p>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    (skillMode ===
                      "catalog" &&
                      !form.skillId) ||
                    (skillMode ===
                      "custom" &&
                      !form.customName.trim())
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {editingSkill
                        ? "Save changes"
                        : "Add skill"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
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

function SkillCard({
  skill,
  type,
  onEdit,
  onDelete,
}) {
  const level = Math.min(
    5,
    Math.max(
      1,
      Number(skill.level) || 1
    )
  );

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-slate-900">
              {skill.name}
            </h3>

            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                skill.isCustom
                  ? "bg-purple-50 text-purple-600"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {skill.isCustom
                ? "Custom"
                : skill.category}
            </span>
          </div>

          {skill.isCustom && (
            <p className="mt-1 text-xs text-slate-400">
              Custom skill added by you
            </p>
          )}

          {skill.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
              {skill.description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600"
            title="Edit skill"
          >
            <Edit3 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Remove skill"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {type === "known" && (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Proficiency
            </span>

            <span className="text-xs font-bold text-blue-600">
              {level}/5
            </span>
          </div>

          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map(
              (item) => (
                <div
                  key={item}
                  className={`h-2 flex-1 rounded-full ${
                    item <= level
                      ? "bg-blue-600"
                      : "bg-slate-100"
                  }`}
                />
              )
            )}
          </div>

          {skill.experienceYears !==
            null &&
            skill.experienceYears !==
              "" && (
              <p className="mt-3 text-xs text-slate-400">
                {skill.experienceYears}{" "}
                {Number(
                  skill.experienceYears
                ) === 1
                  ? "year"
                  : "years"}{" "}
                of experience
              </p>
            )}
        </div>
      )}

      {type === "wanted" && (
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5">
          <BookOpen className="h-4 w-4 text-blue-600" />

          <span className="text-xs font-medium text-blue-700">
            Learning goal
          </span>
        </div>
      )}
    </article>
  );
}

function getLevelLabel(level) {
  const labels = {
    1: "Beginner",
    2: "Basic",
    3: "Intermediate",
    4: "Advanced",
    5: "Expert",
  };

  return labels[level] || "Level";
}

export default Skills;