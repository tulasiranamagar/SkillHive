import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Compass,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import api from "../../api/axios";


function unwrap(response) {
  return (
    response?.data?.data ??
    response?.data?.result ??
    response?.data ??
    response
  );
}

function extractList(payload, possibleKeys = []) {
  if (Array.isArray(payload)) return payload;

  for (const key of possibleKeys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
}

function extractError(error, fallback = "Something went wrong.") {
  const data = error?.response?.data;

  if (!data) {
    return error?.message || fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.message) {
    return data.message;
  }

  if (data.detail) {
    return data.detail;
  }

  if (data.error) {
    return typeof data.error === "string"
      ? data.error
      : JSON.stringify(data.error);
  }

  if (data.errors) {
    if (typeof data.errors === "string") {
      return data.errors;
    }

    const values = Object.values(data.errors);

    for (const value of values) {
      if (Array.isArray(value) && value.length > 0) {
        return String(value[0]);
      }

      if (typeof value === "string") {
        return value;
      }
    }
  }

  const firstValue = Object.values(data)[0];

  if (Array.isArray(firstValue) && firstValue.length > 0) {
    return String(firstValue[0]);
  }

  if (typeof firstValue === "string") {
    return firstValue;
  }

  return fallback;
}

function normalizeCareerGoal(goal) {
  if (!goal) return null;

  return {
    ...goal,

    id:
      goal.id ??
      goal.goal_id ??
      goal.pk,

    title:
      goal.title ||
      goal.name ||
      goal.goal_title ||
      "Career Goal",

    description:
      goal.description ||
      goal.summary ||
      goal.short_description ||
      "",

    skillCount:
      Number(
        goal.skill_count ??
          goal.skills_count ??
          goal.total_skills ??
          goal.goalskill_count ??
          0,
      ) || 0,
  };
}

function normalizeGoalSkill(item) {
  if (!item) return null;

  const skill =
    item.skill ||
    item.skills ||
    item.skill_detail ||
    null;

  return {
    ...item,

    id:
      item.id ??
      item.goal_skill_id ??
      item.pk,

    skillId:
      skill?.id ??
      item.skill_id ??
      item.skillId ??
      item.id,

    name:
      skill?.name ||
      skill?.title ||
      item.skill_name ||
      item.name ||
      "Skill",

    importance:
      Number(
        item.importance ??
          item.priority ??
          1,
      ) || 1,

    status:
      item.status ||
      item.skill_status ||
      null,
  };
}

function normalizeUserGoal(item) {
  if (!item) return null;

  const goal =
    item.career_goal ||
    item.goal ||
    item.careerGoal ||
    null;

  return {
    ...item,

    // This is the UserGoal ID.
    id:
      item.id ??
      item.user_goal_id ??
      item.pk,

    // This MUST be the CareerGoal ID.
    careerGoalId:
      goal?.id ??
      item.career_goal_id ??
      item.goal_id ??
      null,

    title:
      goal?.title ||
      goal?.name ||
      item.goal_title ||
      item.title ||
      "Career Goal",

    description:
      goal?.description ||
      item.goal_description ||
      "",

    isActive:
      item.is_active ??
      item.active ??
      true,

    progress:
      Number(
        item.progress_percentage ??
          item.progress ??
          item.completion_percentage ??
          0,
      ) || 0,

    completedTasks:
      Number(
        item.completed_tasks ??
          item.tasks_completed ??
          item.completed_task_count ??
          0,
      ) || 0,

    totalTasks:
      Number(
        item.total_tasks ??
          item.task_count ??
          item.total_task_count ??
          0,
      ) || 0,
  };
}

function getCareerGoalId(goal) {
  return (
    goal?.careerGoalId ??
    goal?.career_goal_id ??
    goal?.goal_id ??
    goal?.career_goal?.id ??
    goal?.goal?.id ??
    null
  );
}

function getGoalId(goal) {
  return (
    goal?.id ??
    goal?.goal_id ??
    goal?.pk ??
    null
  );
}

function getGoalTitle(goal) {
  return (
    goal?.title ||
    goal?.name ||
    goal?.goal_title ||
    "Career Goal"
  );
}

function getImportanceLabel(importance) {
  if (importance >= 5) return "Core";
  if (importance >= 4) return "High";
  if (importance >= 3) return "Important";
  if (importance >= 2) return "Useful";
  return "Supporting";
}

function getImportanceWidth(importance) {
  return `${Math.min(Math.max(importance, 1), 5) * 20}%`;
}

function extractAIRequiredSkills(payload) {
  const analysis =
    payload?.analysis ??
    payload;

  if (
    !Array.isArray(
      analysis?.required_skills,
    )
  ) {
    return [];
  }

  return analysis.required_skills
    .map(normalizeGoalSkill)
    .filter(Boolean)
    .slice(0, 10);
}


function Goals() {
  const [goals, setGoals] = useState([]);
  const [activeGoal, setActiveGoal] = useState(null);

  const [selectedGoal, setSelectedGoal] = useState(null);


  const [selectedGoalSkills, setSelectedGoalSkills] = useState([]);


  const [aiGoalSkills, setAiGoalSkills] = useState([]);

  const [search, setSearch] = useState("");
  const [showSelector, setShowSelector] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [selectingGoal, setSelectingGoal] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);

  const [error, setError] = useState("");
  const [skillsError, setSkillsError] = useState("");
  const [aiError, setAiError] = useState("");
  const [success, setSuccess] = useState("");


  const loadGoals = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        goalsResponse,
        activeResponse,
      ] = await Promise.allSettled([
        api.get("/api/goals/"),
        api.get("/api/goals/my/"),
      ]);

      if (goalsResponse.status === "fulfilled") {
        const payload = unwrap(
          goalsResponse.value,
        );

        const list = extractList(
          payload,
          [
            "goals",
            "career_goals",
            "results",
          ],
        )
          .map(normalizeCareerGoal)
          .filter(Boolean);

        setGoals(list);
      } else {
        throw goalsResponse.reason;
      }

      if (
        activeResponse.status ===
        "fulfilled"
      ) {
        const payload = unwrap(
          activeResponse.value,
        );

        let activeData = payload;

        if (Array.isArray(payload)) {
          activeData =
            payload.find(
              (item) =>
                item?.is_active === true ||
                item?.active === true,
            ) ||
            payload[0];
        }

        if (payload?.user_goal) {
          activeData =
            payload.user_goal;
        }

        if (payload?.active_goal) {
          activeData =
            payload.active_goal;
        }

        if (payload?.goal) {
          activeData =
            payload.goal;
        }

        const normalized =
          normalizeUserGoal(
            activeData,
          );

        setActiveGoal(
          normalized?.isActive === false
            ? null
            : normalized,
        );
      } else {
        setActiveGoal(null);
      }
    } catch (requestError) {
      setError(
        extractError(
          requestError,
          "Unable to load career goals.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);


  const loadGoalSkills = useCallback(
    async (goalId) => {
      if (!goalId) {
        setSelectedGoalSkills([]);
        setAiGoalSkills([]);
        return;
      }

      setLoadingSkills(true);
      setSkillsError("");
      setAiError("");

      try {

        const response = await api.get(
          `/api/goals/${goalId}/`,
        );

        const payload = unwrap(response);

        let rawSkills = [];

        if (Array.isArray(payload)) {
          rawSkills = payload;
        } else if (
          Array.isArray(payload?.skills)
        ) {
          rawSkills =
            payload.skills;
        } else if (
          Array.isArray(
            payload?.goal_skills,
          )
        ) {
          rawSkills =
            payload.goal_skills;
        } else if (
          Array.isArray(
            payload?.goalSkills,
          )
        ) {
          rawSkills =
            payload.goalSkills;
        } else if (payload?.goal) {
          if (
            Array.isArray(
              payload.goal.skills,
            )
          ) {
            rawSkills =
              payload.goal.skills;
          } else if (
            Array.isArray(
              payload.goal.goal_skills,
            )
          ) {
            rawSkills =
              payload.goal.goal_skills;
          }
        }

        const normalizedSkills =
          rawSkills
            .map(normalizeGoalSkill)
            .filter(Boolean)
            .sort(
              (a, b) =>
                Number(
                  b.importance || 0,
                ) -
                Number(
                  a.importance || 0,
                ),
            );

 
        setSelectedGoalSkills(
          normalizedSkills,
        );
      } catch (requestError) {
        setSelectedGoalSkills([]);

        setSkillsError(
          extractError(
            requestError,
            "Goal skills could not be loaded.",
          ),
        );
      } finally {
        setLoadingSkills(false);
      }
    },
    [],
  );



  const loadAIPrioritySkills =
    useCallback(async (goalId) => {
      if (!goalId) {
        setAiGoalSkills([]);
        return;
      }

      setLoadingAI(true);
      setAiError("");

      try {
        const response =
          await api.post(
            "/api/ai/skill-gap/",
            {
              goal_id: Number(goalId),
            },
          );

        const payload =
          unwrap(response);

        const rankedSkills =
          extractAIRequiredSkills(
            payload,
          );

        setAiGoalSkills(
          rankedSkills.slice(0, 10),
        );
      } catch (requestError) {
        setAiGoalSkills([]);

        setAiError(
          extractError(
            requestError,
            "AI priority skills could not be loaded.",
          ),
        );
      } finally {
        setLoadingAI(false);
      }
    }, []);


  useEffect(() => {
    const careerGoalId =
      getCareerGoalId(activeGoal);

    if (!careerGoalId) {
      setSelectedGoalSkills([]);
      setAiGoalSkills([]);
      return;
    }

    const loadActiveGoalData =
      async () => {
        await Promise.all([
          loadGoalSkills(
            careerGoalId,
          ),
          loadAIPrioritySkills(
            careerGoalId,
          ),
        ]);
      };

    loadActiveGoalData();
  }, [
    activeGoal,
    loadGoalSkills,
    loadAIPrioritySkills,
  ]);



  const handlePreviewGoal =
    async (goal) => {
      setSelectedGoal(goal);

      const careerGoalId =
        getGoalId(goal);

      await loadGoalSkills(
        careerGoalId,
      );

      const activeCareerGoalId =
        getCareerGoalId(activeGoal);

      if (
        String(activeCareerGoalId) ===
        String(careerGoalId)
      ) {
        await loadAIPrioritySkills(
          careerGoalId,
        );
      } else {
        setAiGoalSkills([]);
        setAiError("");
      }
    };

  const displayedGoalSkills =
    aiGoalSkills.length > 0
      ? aiGoalSkills.slice(0, 10)
      : selectedGoalSkills.slice(
          0,
          10,
        );

  const isAISkillListActive =
    aiGoalSkills.length > 0;

  const generateRoadmap =
    async (careerGoalId) => {
      if (!careerGoalId) {
        throw new Error(
          "The career goal ID is missing, so the roadmap cannot be generated.",
        );
      }

      setGeneratingRoadmap(true);

      try {
        const response =
          await api.post(
            "/api/roadmaps/generate/",
            {
              goal_id: careerGoalId,
            },
          );

        return unwrap(response);
      } finally {
        setGeneratingRoadmap(false);
      }
    };

  const handleSelectGoal =
    async (goal) => {
      const careerGoalId =
        getGoalId(goal);

      if (!careerGoalId) {
        setError(
          "This career goal does not have a valid ID.",
        );
        return;
      }

      setSelectingGoal(true);
      setError("");
      setSuccess("");

      try {

        const response =
          await api.post(
            "/api/goals/select/",
            {
              goal_id: careerGoalId,
            },
          );

        const payload =
          unwrap(response);

        const returnedGoal =
          payload?.user_goal ||
          payload?.goal ||
          payload?.active_goal ||
          payload;

        const normalized =
          normalizeUserGoal(
            returnedGoal,
          );

        const nextActiveGoal =
          normalized
            ? {
                ...normalized,

                careerGoalId:
                  normalized.careerGoalId ||
                  careerGoalId,

                title:
                  normalized.title ||
                  getGoalTitle(goal),

                description:
                  normalized.description ||
                  goal.description ||
                  "",
              }
            : {
                id: null,
                careerGoalId,
                title:
                  getGoalTitle(goal),
                description:
                  goal.description ||
                  "",
                isActive: true,
                progress: 0,
                completedTasks: 0,
                totalTasks: 0,
              };

        setActiveGoal(
          nextActiveGoal,
        );


        await generateRoadmap(
          careerGoalId,
        );

        await loadGoals();

        await loadGoalSkills(
          careerGoalId,
        );

        await loadAIPrioritySkills(
          careerGoalId,
        );

        setSuccess(
          `“${getGoalTitle(
            goal,
          )}” is now your active career goal and your learning roadmap has been generated.`,
        );

        setShowSelector(false);
        setSelectedGoal(null);
        setSearch("");
      } catch (requestError) {
        setError(
          extractError(
            requestError,
            "Unable to select the career goal or generate its roadmap.",
          ),
        );
      } finally {
        setSelectingGoal(false);
        setGeneratingRoadmap(false);
      }
    };

  const handleDeactivateGoal =
    async () => {
      const careerGoalId =
        activeGoal?.careerGoalId ||
        activeGoal?.career_goal_id ||
        activeGoal?.goal_id;

      if (!careerGoalId) {
        setError(
          "The active career goal could not be identified.",
        );
        return;
      }

      const confirmed =
        window.confirm(
          "Deactivate your current career goal? Your roadmap progress will remain stored, but this goal will no longer be your active goal.",
        );

      if (!confirmed) return;

      setDeactivating(true);
      setError("");
      setSuccess("");

      try {
        await api.post(
          "/api/goals/deactivate/",
          {
            goal_id:
              careerGoalId,
          },
        );

        setActiveGoal(null);
        setSelectedGoal(null);
        setSelectedGoalSkills([]);
        setAiGoalSkills([]);

        setSuccess(
          "Your active career goal has been deactivated.",
        );

        await loadGoals();
      } catch (requestError) {
        setError(
          extractError(
            requestError,
            "Unable to deactivate the career goal.",
          ),
        );
      } finally {
        setDeactivating(false);
      }
    };

  const filteredGoals =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) return goals;

      return goals.filter(
        (goal) => {
          const title =
            getGoalTitle(
              goal,
            ).toLowerCase();

          const description =
            String(
              goal?.description ||
                "",
            ).toLowerCase();

          return (
            title.includes(query) ||
            description.includes(query)
          );
        },
      );
    }, [goals, search]);

  const activeCareerGoal =
    useMemo(() => {
      if (!activeGoal) return null;

      const careerGoalId =
        activeGoal.careerGoalId ||
        activeGoal.career_goal_id ||
        activeGoal.goal_id;

      return (
        goals.find(
          (goal) =>
            String(
              getGoalId(goal),
            ) ===
            String(careerGoalId),
        ) || {
          id: careerGoalId,
          title:
            activeGoal.title,
          description:
            activeGoal.description,
        }
      );
    }, [activeGoal, goals]);

  const activeCareerGoalId =
    getCareerGoalId(
      activeGoal,
    );

  const progress = Math.min(
    Math.max(
      Number(
        activeGoal?.progress || 0,
      ),
      0,
    ),
    100,
  );

  const hasActiveGoal =
    Boolean(activeGoal);

  const selectingOrGenerating =
    selectingGoal ||
    generatingRoadmap;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-48 rounded-3xl bg-slate-200" />

            <div className="grid gap-5 md:grid-cols-3">
              <div className="h-32 rounded-2xl bg-slate-200" />
              <div className="h-32 rounded-2xl bg-slate-200" />
              <div className="h-32 rounded-2xl bg-slate-200" />
            </div>

            <div className="h-72 rounded-3xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        <section className="overflow-hidden rounded-3xl bg-blue-600 shadow-xl">
          <div className="px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20">
                  <Target size={14} />
                  Career Direction
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Build your learning path around a goal
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                  Choose a career goal and
                  SkillHive will connect
                  the required skills to
                  your personalized
                  learning roadmap.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row text-white">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSelector(true);
                      setSelectedGoal(null);
                      setSearch("");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    <Compass size={18} />

                    {hasActiveGoal
                      ? "Change Career Goal"
                      : "Choose Career Goal"}
                  </button>

                  {hasActiveGoal && (
                    <Link
                      to={`/goals/${activeCareerGoalId}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                    >
                      View Goal
                      <ArrowRight size={17} />
                    </Link>
                  )}
                </div>
              </div>

              <div className="hidden shrink-0 lg:block">
                <div className="flex h-36 w-36 items-center justify-center rounded-3xl border border-white/20 bg-white/10">
                  <Target
                    size={64}
                    strokeWidth={1.5}
                    className="text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 space-y-3">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              <X
                className="mt-0.5 shrink-0"
                size={18}
              />

              <div className="flex-1">
                <p className="font-semibold">
                  Something went wrong
                </p>

                <p className="mt-1 leading-5">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
                className="text-red-500 transition hover:text-red-700"
                aria-label="Dismiss error"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700">
              <CheckCircle2
                className="mt-0.5 shrink-0"
                size={18}
              />

              <div className="flex-1">
                <p className="font-semibold">
                  Goal updated
                </p>

                <p className="mt-1 leading-5">
                  {success}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSuccess("")
                }
                className="text-green-500 transition hover:text-green-700"
                aria-label="Dismiss success message"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {aiError && hasActiveGoal && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
              <Sparkles
                className="mt-0.5 shrink-0"
                size={18}
              />

              <div className="flex-1">
                <p className="font-semibold">
                  AI priority analysis unavailable
                </p>

                <p className="mt-1 leading-5">
                  {aiError}
                </p>
              </div>
            </div>
          )}
        </div>

        {hasActiveGoal ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <BriefcaseBusiness size={27} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                      <CheckCircle2 size={13} />
                      Active Goal
                    </span>

                    <span className="text-xs font-medium text-slate-400">
                      Career direction
                    </span>
                  </div>

                  <h2 className="mt-3 text-2xl font-bold text-slate-900">
                    {getGoalTitle(
                      activeCareerGoal,
                    )}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {activeCareerGoal?.description ||
                      activeGoal?.description ||
                      "Your personalized roadmap is based on the skills required for this career goal."}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0 text-white">
                <Link
                  to={`/goals/${activeCareerGoalId}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Open Goal
                  <ArrowRight size={16} />
                </Link>

                <button
                  type="button"
                  onClick={
                    handleDeactivateGoal
                  }
                  disabled={deactivating}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deactivating ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <X size={16} />
                  )}

                  Deactivate
                </button>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Roadmap progress
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Keep completing learning
                    activities and
                    assessments to move
                    forward.
                  </p>
                </div>

                <span className="text-2xl font-bold text-blue-600">
                  {progress}%
                </span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                <span>
                  {activeGoal?.completedTasks ||
                    0}{" "}
                  completed
                </span>

                <span>
                  {activeGoal?.totalTasks ||
                    0}{" "}
                  total roadmap tasks
                </span>
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-slate-500">
                  <Target size={17} />

                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Goal
                  </span>
                </div>

                <p className="mt-2 text-lg font-bold text-slate-900">
                  Active
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-slate-500">
                  <TrendingUp size={17} />

                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Progress
                  </span>
                </div>

                <p className="mt-2 text-lg font-bold text-slate-900">
                  {progress}%
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-slate-500">
                  <Sparkles size={17} />

                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Priority skills
                  </span>
                </div>

                <p className="mt-2 text-lg font-bold text-slate-900">
                  {loadingAI
                    ? "..."
                    : aiGoalSkills.length ||
                      displayedGoalSkills.length ||
                      "—"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  AI-selected
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between text-white">
              <div>
                <p className="font-semibold text-slate-900">
                  Continue your learning
                  roadmap
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Open your generated tasks
                  and continue learning.
                </p>
              </div>

              <Link
                to="/roadmap"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Open Roadmap
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                <Target size={27} />
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900">
                  You haven't selected a
                  career goal yet
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Select a career direction
                  to let SkillHive build
                  your skill-based roadmap.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSelector(true);
                  setSearch("");
                  setSelectedGoal(null);
                }}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Choose Goal
                <ArrowRight size={17} />
              </button>
            </div>
          </section>
        )}

        {hasActiveGoal && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  AI skill analysis
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Priority skills for your goal
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  SkillHive uses the career goal
                  requirements and your skill
                  profile to identify the most
                  relevant skills to focus on.
                </p>
              </div>

              <Link
                to="/roadmap"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Open roadmap
                <ChevronRight size={16} />
              </Link>
            </div>

            {loadingSkills ||
            loadingAI ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(
                  (item) => (
                    <div
                      key={item}
                      className="animate-pulse rounded-2xl border border-slate-100 p-5"
                    >
                      <div className="h-5 w-32 rounded bg-slate-200" />

                      <div className="mt-4 h-2 rounded bg-slate-200" />

                      <div className="mt-3 h-3 w-20 rounded bg-slate-200" />
                    </div>
                  ),
                )}
              </div>
            ) : skillsError ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-semibold text-amber-900">
                  Goal skills are temporarily
                  unavailable.
                </p>

                <p className="mt-1 text-sm text-amber-700">
                  {skillsError}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    loadGoalSkills(
                      activeCareerGoalId,
                    );
                    loadAIPrioritySkills(
                      activeCareerGoalId,
                    );
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 shadow-sm ring-1 ring-amber-200 hover:bg-amber-50"
                >
                  <RefreshCw size={15} />
                  Try Again
                </button>
              </div>
            ) : displayedGoalSkills.length ===
              0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <Sparkles
                  size={28}
                  className="mx-auto text-slate-400"
                />

                <p className="mt-3 font-semibold text-slate-700">
                  No priority skills are
                  available yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Skill requirements need to
                  be available before SkillHive
                  can identify the priority
                  skills.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
                  <Sparkles
                    size={14}
                    className="text-blue-600"
                  />

                  {isAISkillListActive
                    ? `AI-ranked priority skills · showing ${Math.min(
                        aiGoalSkills.length,
                        10,
                      )} of the available goal requirements`
                    : "Showing the available goal requirements while AI analysis is unavailable"}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {displayedGoalSkills.map(
                    (goalSkill) => (
                      <div
                        key={
                          goalSkill.id ||
                          `${goalSkill.skillId}-${goalSkill.name}`
                        }
                        className="rounded-2xl border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <Check size={17} />
                            </div>

                            <h3 className="truncate font-semibold text-slate-900">
                              {
                                goalSkill.name
                              }
                            </h3>
                          </div>

                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            {getImportanceLabel(
                              goalSkill.importance,
                            )}
                          </span>
                        </div>

                        <div className="mt-5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-500">
                              Importance
                            </span>

                            <span className="font-semibold text-slate-700">
                              {
                                goalSkill.importance
                              }
                              /5
                            </span>
                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{
                                width:
                                  getImportanceWidth(
                                    goalSkill.importance,
                                  ),
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </>
            )}
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Explore career directions
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Available career goals
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Explore the career goals
                configured in SkillHive.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowSelector(true);
                setSearch("");
                setSelectedGoal(null);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Compass size={17} />
              Browse Goals
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
              <BriefcaseBusiness
                size={30}
                className="mx-auto text-slate-400"
              />

              <h3 className="mt-4 font-semibold text-slate-800">
                No career goals available
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Career goals need to be
                configured before users can
                select them.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {goals
                .slice(0, 6)
                .map((goal) => {
                  const isActive =
                    activeGoal &&
                    String(
                      activeGoal.careerGoalId ||
                        activeGoal.career_goal_id ||
                        activeGoal.goal_id,
                    ) ===
                      String(
                        getGoalId(goal),
                      );

                  return (
                    <button
                      type="button"
                      key={getGoalId(goal)}
                      onClick={() => {
                        setShowSelector(true);
                        handlePreviewGoal(
                          goal,
                        );
                      }}
                      className={`group rounded-2xl border p-5 text-left transition ${
                        isActive
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                          <BriefcaseBusiness size={20} />
                        </div>

                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                            <Check size={13} />
                            Active
                          </span>
                        ) : (
                          <ChevronRight
                            size={18}
                            className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
                          />
                        )}
                      </div>

                      <h3 className="mt-5 font-bold text-slate-900">
                        {getGoalTitle(
                          goal,
                        )}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">
                        {goal.description ||
                          "Build the skills needed for this career direction."}
                      </p>

                      <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
                        <Sparkles size={14} />

                        {isActive
                          ? `${Math.min(
                              aiGoalSkills.length ||
                                goal.skillCount ||
                                0,
                              10,
                            ) || "Multiple"} priority skills`
                          : `${goal.skillCount || "Multiple"} available skills`}
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </section>
      </main>

      {showSelector && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => {
              if (!selectingOrGenerating) {
                setShowSelector(false);
                setSelectedGoal(null);
              }
            }}
          />

          <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
            <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">


              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-7">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Career goals
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    Choose your career
                    direction
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      !selectingOrGenerating
                    ) {
                      setShowSelector(
                        false,
                      );
                      setSelectedGoal(null);
                    }
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[75vh] overflow-y-auto p-5 sm:p-7">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Search career goals..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-5">


                  <div className="lg:col-span-3">
                    {filteredGoals.length ===
                    0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                        <Search
                          size={28}
                          className="mx-auto text-slate-400"
                        />

                        <p className="mt-3 font-semibold text-slate-700">
                          No matching goals
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Try another search
                          term.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredGoals.map(
                          (goal) => {
                            const goalId =
                              getGoalId(
                                goal,
                              );

                            const isSelected =
                              selectedGoal &&
                              String(
                                getGoalId(
                                  selectedGoal,
                                ),
                              ) ===
                                String(
                                  goalId,
                                );

                            const isActive =
                              activeGoal &&
                              String(
                                activeGoal.careerGoalId ||
                                  activeGoal.career_goal_id ||
                                  activeGoal.goal_id,
                              ) ===
                                String(
                                  goalId,
                                );

                            return (
                              <button
                                type="button"
                                key={goalId}
                                onClick={() =>
                                  handlePreviewGoal(
                                    goal,
                                  )
                                }
                                className={`w-full rounded-2xl border p-4 text-left transition ${
                                  isSelected
                                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                                    : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-start gap-4">
                                  <div
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                      isSelected ||
                                      isActive
                                        ? "bg-blue-600 text-white"
                                        : "bg-blue-50 text-blue-600"
                                    }`}
                                  >
                                    {isSelected ? (
                                      <Check size={20} />
                                    ) : (
                                      <BriefcaseBusiness
                                        size={20}
                                      />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="font-semibold text-slate-900">
                                        {getGoalTitle(
                                          goal,
                                        )}
                                      </h3>

                                      {isActive && (
                                        <span className="rounded-full bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700">
                                          Current
                                        </span>
                                      )}
                                    </div>

                                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                                      {goal.description ||
                                        "A skill-based career learning direction."}
                                    </p>

                                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-400">
                                      <Sparkles size={13} />

                                      {isActive
                                        ? `${Math.min(
                                            aiGoalSkills.length ||
                                              goal.skillCount ||
                                              0,
                                            10,
                                          ) || "Multiple"} priority skills`
                                        : `${goal.skillCount || "Multiple"} available skills`}
                                    </div>
                                  </div>

                                  <ChevronRight
                                    size={18}
                                    className={`mt-1 shrink-0 ${
                                      isSelected
                                        ? "text-blue-600"
                                        : "text-slate-300"
                                    }`}
                                  />
                                </div>
                              </button>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-2">
                    <div className="sticky top-0 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      {selectedGoal ? (
                        <>
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                            <Target size={23} />
                          </div>

                          <h3 className="mt-4 text-lg font-bold text-slate-900">
                            {getGoalTitle(
                              selectedGoal,
                            )}
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            {selectedGoal.description ||
                              "This goal will become the foundation for your SkillHive learning roadmap."}
                          </p>

                          <div className="mt-5">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {isAISkillListActive &&
                                String(
                                  getGoalId(
                                    selectedGoal,
                                  ),
                                ) ===
                                  String(
                                    activeCareerGoalId,
                                  )
                                  ? "AI priority skills"
                                  : "Available skills"}
                              </p>

                              <span className="text-xs font-semibold text-blue-600">
                                {loadingSkills ||
                                loadingAI
                                  ? "..."
                                  : displayedGoalSkills.length}
                              </span>
                            </div>

                            {loadingSkills ||
                            loadingAI ? (
                              <div className="mt-3 space-y-2">
                                {[1, 2, 3].map(
                                  (item) => (
                                    <div
                                      key={item}
                                      className="h-10 animate-pulse rounded-xl bg-slate-200"
                                    />
                                  ),
                                )}
                              </div>
                            ) : displayedGoalSkills.length >
                              0 ? (
                              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                                {displayedGoalSkills.map(
                                  (
                                    goalSkill,
                                  ) => (
                                    <div
                                      key={
                                        goalSkill.id ||
                                        goalSkill.skillId
                                      }
                                      className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5"
                                    >
                                      <div className="flex min-w-0 items-center gap-2">
                                        <Circle
                                          size={8}
                                          fill="currentColor"
                                          className="shrink-0 text-blue-600"
                                        />

                                        <span className="truncate text-sm font-medium text-slate-700">
                                          {
                                            goalSkill.name
                                          }
                                        </span>
                                      </div>

                                      <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                                        {
                                          goalSkill.importance
                                        }
                                        /5
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-slate-500">
                                No skills were
                                returned for
                                this goal.
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleSelectGoal(
                                selectedGoal,
                              )
                            }
                            disabled={
                              selectingOrGenerating
                            }
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {selectingOrGenerating ? (
                              <>
                                <Loader2
                                  size={17}
                                  className="animate-spin"
                                />

                                {generatingRoadmap
                                  ? "Generating roadmap..."
                                  : "Setting up goal..."}
                              </>
                            ) : (
                              <>
                                {activeGoal
                                  ? "Switch to Goal"
                                  : "Select Goal"}

                                <ArrowRight size={17} />
                              </>
                            )}
                          </button>

                          <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                            Selecting this
                            goal activates
                            it and
                            generates the
                            learning roadmap
                            from its required
                            skills.
                          </p>
                        </>
                      ) : (
                        <div className="py-10 text-center">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                            <Compass size={23} />
                          </div>

                          <h3 className="mt-4 font-semibold text-slate-800">
                            Select a goal
                          </h3>

                          <p className="mt-1 text-sm leading-5 text-slate-500">
                            Choose a career
                            goal from the
                            list to see its
                            available skills.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Goals;