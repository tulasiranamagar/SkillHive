import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
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

function extractError(
  error,
  fallback = "Something went wrong.",
) {
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

    for (const value of Object.values(data.errors)) {
      if (Array.isArray(value) && value.length) {
        return String(value[0]);
      }

      if (typeof value === "string") {
        return value;
      }
    }
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

function normalizeGoal(payload) {
  if (!payload) {
    return null;
  }

  const raw =
    payload?.goal_detail ||
    payload?.career_goal ||
    payload?.goal ||
    payload;

  const careerGoal =
    raw?.goal_detail ||
    raw?.career_goal ||
    (raw?.title ? raw : null);

  return {
    ...raw,

    id:
      careerGoal?.id ??
      raw?.id ??
      raw?.goal_id ??
      raw?.career_goal_id ??
      null,

    title:
      careerGoal?.title ||
      raw?.goal_title ||
      raw?.title ||
      "Career Goal",

    description:
      careerGoal?.description ||
      raw?.goal_description ||
      raw?.description ||
      "",

    isActive:
      raw?.is_active ??
      raw?.active ??
      false,

    createdAt:
      raw?.created_at ||
      raw?.createdAt ||
      null,

    updatedAt:
      raw?.updated_at ||
      raw?.updatedAt ||
      null,
  };
}

function normalizeUserGoal(payload) {
  if (!payload) {
    return null;
  }

  const raw =
    payload?.user_goal ||
    payload?.active_goal ||
    payload;

  const goal =
    raw?.goal ||
    raw?.career_goal ||
    raw?.goal_detail ||
    null;

  return {
    ...raw,

    id:
      raw?.id ??
      raw?.user_goal_id ??
      raw?.pk ??
      null,

    careerGoalId:
      goal?.id ??
      raw?.goal_id ??
      raw?.career_goal_id ??
      null,

    title:
      goal?.title ||
      goal?.name ||
      raw?.goal_title ||
      "Career Goal",

    description:
      goal?.description ||
      raw?.goal_description ||
      "",

    isActive:
      raw?.is_active ??
      raw?.active ??
      false,

    progress:
      Number(
        raw?.progress_percentage ??
        raw?.progress ??
        0,
      ) || 0,
  };
}


function normalizeGoalSkill(item) {
  if (!item) {
    return null;
  }

  const skill =
    item?.skill ||
    item?.skill_detail ||
    null;

  const relationType =
    item?.relation_type ||
    item?.relationType ||
    "optional";

  const isEssential =
    relationType === "essential";

  return {
    ...item,

    id:
      item?.id ??
      item?.goal_skill_id ??
      item?.pk ??
      null,

    skillId:
      skill?.id ??
      item?.skill_id ??
      item?.skillId ??
      null,

    name:
      skill?.name ||
      skill?.title ||
      item?.skill_name ||
      item?.name ||
      "Skill",

    relationType,

    relationLabel:
      isEssential
        ? "Essential"
        : "Optional",

    importance:
      isEssential ? 5 : 3,
  };
}


function normalizeSkillGap(item) {
  if (!item) {
    return null;
  }

  const status = String(
    item?.status ||
    item?.gap_status ||
    "MISSING",
  ).toUpperCase();

  const relationType =
    item?.relation_type ||
    item?.relationType ||
    "optional";

  const targetLevel =
    Number(
      item?.target_level ??
      item?.targetLevel ??
      (
        relationType === "essential"
          ? 4
          : 3
      ),
    ) || 0;

  const currentLevel =
    Number(
      item?.current_level ??
      item?.currentLevel ??
      item?.user_level ??
      item?.userLevel ??
      0,
    ) || 0;

  const gapScore =
    Number(
      item?.gap_score ??
      item?.gapScore ??
      0,
    ) || 0;

  return {
    ...item,

    skillId:
      item?.skill_id ??
      item?.skillId ??
      item?.skill?.id ??
      null,

    name:
      item?.skill_name ||
      item?.skillName ||
      item?.skill?.name ||
      item?.name ||
      "Skill",

    status,

    relationType,

    relationLabel:
      relationType === "essential"
        ? "Essential"
        : "Optional",

    targetLevel,

    currentLevel,

    gapScore,

    similarity:
      Number(
        item?.similarity ??
        item?.similarity_score ??
        0,
      ) || 0,

    mastered:
      status === "MASTERED",

    needsImprovement:
      status === "IMPROVE",

    missing:
      status === "MISSING",

    learningGap:
      status === "IMPROVE" ||
      status === "MISSING",
  };
}


function normalizeTask(item, index = 0) {
  if (!item) {
    return null;
  }

  const skill =
    item?.skill ||
    item?.skill_detail ||
    null;

  return {
    ...item,

    id:
      item?.id ??
      item?.task_id ??
      item?.pk ??
      null,

    title:
      item?.title ||
      item?.name ||
      item?.task_title ||
      `Roadmap Task ${index + 1}`,

    description:
      item?.description ||
      item?.summary ||
      "",

    skillName:
      skill?.name ||
      skill?.title ||
      item?.skill_name ||
      "Skill",

    skillId:
      skill?.id ??
      item?.skill_id ??
      null,

    order:
      Number(
        item?.order ??
        item?.sequence ??
        item?.position ??
        index + 1,
      ) || index + 1,

    completed: Boolean(
      item?.completed ??
      item?.is_completed ??
      item?.done ??
      false,
    ),

    status:
      item?.status ||
      (
        item?.completed
          ? "completed"
          : "pending"
      ),

    estimatedMinutes:
      Number(
        item?.estimated_minutes ??
        item?.duration_minutes ??
        0,
      ) || 0,

    userGoalId:
      item?.user_goal?.id ??
      item?.user_goal_id ??
      item?.userGoalId ??
      null,
  };
}

function skillStatusLabel(skill) {
  if (skill.mastered) {
    return "Mastered";
  }

  if (skill.needsImprovement) {
    return "Improve";
  }

  if (skill.missing) {
    return "Missing";
  }

  return "Not analyzed";
}

function skillStatusClass(skill) {
  if (skill.mastered) {
    return "bg-green-50 text-green-700";
  }

  if (skill.needsImprovement) {
    return "bg-amber-50 text-amber-700";
  }

  if (skill.missing) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-500";
}

function skillIconClass(skill) {
  if (skill.mastered) {
    return "bg-green-50 text-green-600";
  }

  if (skill.needsImprovement) {
    return "bg-amber-50 text-amber-600";
  }

  if (skill.missing) {
    return "bg-red-50 text-red-600";
  }

  return "bg-slate-100 text-slate-400";
}

function GoalDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [goal, setGoal] = useState(null);
  const [goalSkills, setGoalSkills] = useState([]);
  const [skillGap, setSkillGap] = useState([]);
  const [skillGapMethod, setSkillGapMethod] = useState("");

  const [tasks, setTasks] = useState([]);
  const [activeUserGoal, setActiveUserGoal] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingSkills, setLoadingSkills] =
    useState(false);
  const [loadingSkillGap, setLoadingSkillGap] =
    useState(false);
  const [loadingTasks, setLoadingTasks] =
    useState(false);
  const [loadingActiveGoal, setLoadingActiveGoal] =
    useState(false);

  const [error, setError] = useState("");
  const [skillsError, setSkillsError] =
    useState("");
  const [skillGapError, setSkillGapError] =
    useState("");
  const [tasksError, setTasksError] =
    useState("");

  const [startingRoadmap, setStartingRoadmap] =
    useState(false);


  const loadGoal = useCallback(async () => {
    if (!id) {
      setError("Career goal ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setLoadingSkills(true);
    setSkillsError("");

    try {
      const response = await api.get(
        `/api/goals/${id}/`,
      );

      const payload = unwrap(response);
      const normalized = normalizeGoal(payload);

      if (!normalized) {
        throw new Error(
          "Career goal information was not returned.",
        );
      }

      setGoal(normalized);

      const rawSkills =
        Array.isArray(payload?.skills)
          ? payload.skills
          : Array.isArray(normalized?.skills)
            ? normalized.skills
            : [];

      const normalizedSkills = rawSkills
        .map(normalizeGoalSkill)
        .filter(Boolean)
        .sort((a, b) => {
          if (
            a.relationType === "essential" &&
            b.relationType !== "essential"
          ) {
            return -1;
          }

          if (
            a.relationType !== "essential" &&
            b.relationType === "essential"
          ) {
            return 1;
          }

          return a.name.localeCompare(b.name);
        });

      setGoalSkills(normalizedSkills);
    } catch (requestError) {
      setGoal(null);
      setGoalSkills([]);

      const message = extractError(
        requestError,
        "Unable to load this career goal.",
      );

      setError(message);

      setSkillsError(
        extractError(
          requestError,
          "Unable to load the required skills.",
        ),
      );
    } finally {
      setLoading(false);
      setLoadingSkills(false);
    }
  }, [id]);

  const loadActiveUserGoal = useCallback(async () => {
    setLoadingActiveGoal(true);

    try {
      const response = await api.get(
        "/api/goals/my/active/",
      );

      const payload = unwrap(response);

      if (
        payload?.goal === null ||
        payload?.user_goal === null
      ) {
        setActiveUserGoal(null);
        return;
      }

      const normalized =
        normalizeUserGoal(payload);

      setActiveUserGoal(normalized);
    } catch {
      setActiveUserGoal(null);
    } finally {
      setLoadingActiveGoal(false);
    }
  }, []);

  const loadSkillGap = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoadingSkillGap(true);
    setSkillGapError("");
    setSkillGap([]);
    setSkillGapMethod("");

    try {
      const response = await api.post(
        "/api/ai/skill-gap/",
        {
          goal_id: Number(id),
        },
      );

      const payload = unwrap(response);


      const analysis =
        payload?.analysis ||
        payload?.result ||
        payload;


      const rawSkills =
        Array.isArray(
          analysis?.required_skills,
        )
          ? analysis.required_skills
          : Array.isArray(
              analysis?.learning_gaps,
            )
            ? analysis.learning_gaps
            : Array.isArray(
                analysis?.missing_skills,
              )
              ? analysis.missing_skills
              : Array.isArray(analysis)
                ? analysis
                : [];

      const normalized = rawSkills
        .map(normalizeSkillGap)
        .filter(Boolean);

      setSkillGap(normalized);

      setSkillGapMethod(
        analysis?.method ||
        "",
      );
    } catch (requestError) {
      setSkillGap([]);

      setSkillGapError(
        extractError(
          requestError,
          "The AI skill-gap analysis could not be loaded.",
        ),
      );
    } finally {
      setLoadingSkillGap(false);
    }
  }, [id]);



  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    setTasksError("");

    try {
      const response = await api.get(
        "/api/roadmaps/",
      );

      const payload = unwrap(response);

      let rawTasks = [];

      if (Array.isArray(payload)) {
        rawTasks = payload;
      } else if (
        Array.isArray(payload?.tasks)
      ) {
        rawTasks = payload.tasks;
      } else if (
        Array.isArray(
          payload?.roadmap_tasks,
        )
      ) {
        rawTasks = payload.roadmap_tasks;
      } else if (
        Array.isArray(
          payload?.roadmap?.tasks,
        )
      ) {
        rawTasks = payload.roadmap.tasks;
      }

      const normalizedTasks = rawTasks
        .map(normalizeTask)
        .filter(Boolean)
        .sort(
          (a, b) =>
            a.order - b.order,
        );

      setTasks(normalizedTasks);
    } catch (requestError) {
      setTasks([]);

      setTasksError(
        extractError(
          requestError,
          "The roadmap tasks could not be loaded.",
        ),
      );
    } finally {
      setLoadingTasks(false);
    }
  }, []);


  useEffect(() => {
    loadGoal();
    loadActiveUserGoal();
    loadTasks();
  }, [
    loadGoal,
    loadActiveUserGoal,
    loadTasks,
  ]);

  useEffect(() => {
    if (!id) {
      return;
    }

    loadSkillGap();
  }, [
    id,
    loadSkillGap,
  ]);


  const skillAnalysis = useMemo(() => {
    const aiMap = new Map();

    skillGap.forEach((item) => {
      if (
        item.skillId !== null &&
        item.skillId !== undefined
      ) {
        aiMap.set(
          String(item.skillId),
          item,
        );
      }

      if (item.name) {
        aiMap.set(
          item.name
            .trim()
            .toLowerCase(),
          item,
        );
      }
    });

    if (skillGap.length > 0) {
      return skillGap.map((item) => ({
        ...item,

        importance:
          item.relationType ===
          "essential"
            ? 5
            : 3,
      }));
    }

    return goalSkills.map(
      (goalSkill) => {
        const byId =
          goalSkill.skillId !==
            null &&
          goalSkill.skillId !==
            undefined
            ? aiMap.get(
                String(
                  goalSkill.skillId,
                ),
              )
            : null;

        const byName =
          aiMap.get(
            String(
              goalSkill.name,
            )
              .trim()
              .toLowerCase(),
          );

        const analysis =
          byId ||
          byName ||
          null;

        return {
          ...goalSkill,
          ai: analysis,

          status:
            analysis?.status ||
            "UNKNOWN",

          currentLevel:
            analysis?.currentLevel ??
            0,

          targetLevel:
            analysis?.targetLevel ??
            (
              goalSkill.relationType ===
              "essential"
                ? 4
                : 3
            ),

          gapScore:
            analysis?.gapScore ??
            0,

          hasAiResult:
            Boolean(analysis),

          mastered:
            analysis?.mastered ===
            true,

          needsImprovement:
            analysis?.needsImprovement ===
            true,

          missing:
            analysis?.missing ===
            true,

          learningGap:
            analysis?.learningGap ===
            true,
        };
      },
    );
  }, [
    goalSkills,
    skillGap,
  ]);


  const hasAiAnalysis =
    skillGap.length > 0 &&
    !skillGapError;

  const masteredCount =
    skillAnalysis.filter(
      (skill) =>
        skill.mastered,
    ).length;

  const improveCount =
    skillAnalysis.filter(
      (skill) =>
        skill.needsImprovement,
    ).length;

  const missingCount =
    skillAnalysis.filter(
      (skill) =>
        skill.missing,
    ).length;

  const gapCount =
    improveCount +
    missingCount;

  const analyzedCount =
    skillAnalysis.filter(
      (skill) =>
        skill.hasAiResult ||
        skill.status !==
          "UNKNOWN",
    ).length;

  const skillCoverage =
    hasAiAnalysis &&
    analyzedCount > 0
      ? Math.round(
          (masteredCount /
            analyzedCount) *
            100,
        )
      : 0;

  const learningGaps = useMemo(() => {
    return skillAnalysis
      .filter(
        (skill) =>
          skill.missing ||
          skill.needsImprovement ||
          skill.learningGap,
      )
      .sort((a, b) => {
        if (
          a.relationType ===
            "essential" &&
          b.relationType !==
            "essential"
        ) {
          return -1;
        }

        if (
          a.relationType !==
            "essential" &&
          b.relationType ===
            "essential"
        ) {
          return 1;
        }

        if (
          a.missing &&
          !b.missing
        ) {
          return -1;
        }

        if (
          !a.missing &&
          b.missing
        ) {
          return 1;
        }

        return (
          Number(
            b.gapScore || 0,
          ) -
          Number(
            a.gapScore || 0,
          )
        );
      });
  }, [skillAnalysis]);


  const masteredSkills = useMemo(() => {
    return skillAnalysis.filter(
      (skill) =>
        skill.mastered,
    );
  }, [skillAnalysis]);


  const visibleTasks = useMemo(() => {
    if (!activeUserGoal?.id) {
      return tasks;
    }

    const tasksWithUserGoal =
      tasks.filter(
        (task) =>
          task.userGoalId !== null,
      );

    if (
      tasksWithUserGoal.length === 0
    ) {
      return tasks;
    }

    return tasks.filter(
      (task) =>
        task.userGoalId === null ||
        String(
          task.userGoalId,
        ) ===
          String(
            activeUserGoal.id,
          ),
    );
  }, [
    tasks,
    activeUserGoal,
  ]);

  const completedTasks =
    visibleTasks.filter(
      (task) =>
        task.completed,
    ).length;

  const calculatedTaskProgress =
    visibleTasks.length > 0
      ? Math.round(
          (completedTasks /
            visibleTasks.length) *
            100,
        )
      : 0;

  const progress = Math.min(
    100,
    Math.max(
      0,
      Number(
        activeUserGoal?.progress_percentage ??
        activeUserGoal?.progress ??
        calculatedTaskProgress ??
        0,
      ) || 0,
    ),
  );


  const activeGoalMatches =
    Boolean(
      activeUserGoal &&
      goal &&
      String(
        activeUserGoal.careerGoalId,
      ) ===
        String(goal.id),
    );

  const activeGoal =
    activeGoalMatches;


  const handleOpenRoadmap =
    async () => {
      if (
        !goal ||
        startingRoadmap
      ) {
        return;
      }

      setStartingRoadmap(true);
      setError("");

      try {
        let userGoal =
          activeGoalMatches
            ? activeUserGoal
            : null;


        if (!userGoal) {
          const selectResponse =
            await api.post(
              "/api/goals/select/",
              {
                goal_id:
                  goal.id,
              },
            );

          const selectPayload =
            unwrap(
              selectResponse,
            );

          userGoal =
            normalizeUserGoal(
              selectPayload,
            );

          setActiveUserGoal(
            userGoal,
          );
        }

        if (!userGoal?.id) {
          throw new Error(
            "The selected career goal could not be linked to your account.",
          );
        }

        try {
          await api.post(
            "/api/roadmaps/generate/",
            {
              goal_id:
                goal.id,
            },
          );
        } catch (
          generationError
        ) {
          if (
            generationError
              ?.response
              ?.status !== 400
          ) {
            throw generationError;
          }
        }

        await Promise.all([
          loadActiveUserGoal(),
          loadSkillGap(),
          loadTasks(),
        ]);

        navigate("/roadmap");
      } catch (
        requestError
      ) {
        setError(
          extractError(
            requestError,
            "Unable to open the learning roadmap.",
          ),
        );
      } finally {
        setStartingRoadmap(
          false,
        );
      }
    };

  const handleOpenTask =
    (taskId) => {
      if (!taskId) {
        return;
      }

      navigate(
        `/learning?task=${encodeURIComponent(
          taskId,
        )}`,
      );
    };

  const handleRetry =
    () => {
      loadGoal();
      loadActiveUserGoal();
      loadSkillGap();
      loadTasks();
    };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-5 w-40 rounded bg-slate-200" />

            <div className="h-72 rounded-3xl bg-slate-200" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                1,
                2,
                3,
                4,
              ].map(
                (item) => (
                  <div
                    key={item}
                    className="h-32 rounded-2xl bg-slate-200"
                  />
                ),
              )}
            </div>

            <div className="h-80 rounded-3xl bg-slate-200" />

            <div className="h-96 rounded-3xl bg-slate-200" />
          </div>
        </main>
      </div>
    );
  }


  if (
    error &&
    !goal
  ) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <X size={28} />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-900">
              Unable to load career goal
            </h1>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
              {error ||
                "The requested career goal could not be found."}
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={
                  handleRetry
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <RefreshCw size={17} />
                Try Again
              </button>

              <Link
                to="/goals"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft size={17} />
                Back to Goals
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }


  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
          <Link
            to="/goals"
            className="font-medium text-slate-500 transition hover:text-blue-600"
          >
            Career Goals
          </Link>

          <ArrowRight
            size={15}
            className="text-slate-300"
          />

          <span className="font-semibold text-slate-800">
            {goal?.title ||
              "Career Goal"}
          </span>
        </div>

        <section className="overflow-hidden rounded-3xl bg-blue-600 shadow-xl">
          <div className="px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20">
                    <BriefcaseBusiness size={14} />
                    Career Goal
                  </span>

                  {activeGoal && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-700">
                      <CheckCircle2
                        size={14}
                      />
                      Active
                    </span>
                  )}
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {goal?.title}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                  {goal?.description ||
                    "Build the skills and practical knowledge needed for this career direction."}
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={
                      handleOpenRoadmap
                    }
                    disabled={
                      startingRoadmap ||
                      loadingActiveGoal
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {startingRoadmap ? (
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                    ) : (
                      <Sparkles
                        size={18}
                      />
                    )}

                    {activeGoal
                      ? "Open Learning Roadmap"
                      : "Start Learning Roadmap"}
                  </button>

                  <Link
                    to="/goals"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    <ArrowLeft
                      size={17}
                    />
                    All Goals
                  </Link>
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

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
            <X
              size={18}
              className="mt-0.5 shrink-0 text-red-600"
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-800">
                Something needs your attention
              </p>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        )}


        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp size={19} />
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Goal progress
            </p>

            <div className="mt-1 flex items-end justify-between gap-3">
              <p className="text-2xl font-bold text-slate-900">
                {progress}%
              </p>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <CheckCircle2 size={19} />
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Skills mastered
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {masteredCount}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {hasAiAnalysis
                ? "Already meeting the AI target"
                : "Available after AI analysis"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Zap size={19} />
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Skills to work on
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {gapCount}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Missing or needing improvement
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Target size={19} />
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Skill coverage
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {skillCoverage}%
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Based on AI skill analysis
            </p>
          </div>
        </section>


        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  <Sparkles size={14} />
                  Personalized AI analysis
                </div>

                <h2 className="mt-3 text-2xl font-bold text-slate-900">
                  What should you learn?
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  SkillHive compares the skills required for this
                  career goal with your known skills and identifies
                  what you already have, what needs improvement, and
                  what is missing.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  loadSkillGap
                }
                disabled={
                  loadingSkillGap
                }
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingSkillGap ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <RefreshCw
                    size={16}
                  />
                )}

                Refresh analysis
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {loadingSkillGap ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    1,
                    2,
                    3,
                  ].map(
                    (item) => (
                      <div
                        key={item}
                        className="h-28 animate-pulse rounded-2xl bg-slate-100"
                      />
                    ),
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    1,
                    2,
                    3,
                    4,
                  ].map(
                    (item) => (
                      <div
                        key={item}
                        className="h-24 animate-pulse rounded-2xl bg-slate-100"
                      />
                    ),
                  )}
                </div>
              </div>
            ) : skillGapError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600">
                    <Sparkles
                      size={19}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-amber-900">
                      AI analysis is not available yet
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-700">
                      {skillGapError}
                    </p>

                    {!activeGoal && (
                      <p className="mt-2 text-sm leading-6 text-amber-700">
                        Start the learning roadmap above to
                        select this career goal and enable its
                        personalized skill-gap analysis.
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {!activeGoal && (
                        <button
                          type="button"
                          onClick={
                            handleOpenRoadmap
                          }
                          disabled={
                            startingRoadmap
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                          {startingRoadmap ? (
                            <Loader2
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Sparkles
                              size={16}
                            />
                          )}

                          Start this goal
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={
                          loadSkillGap
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-50"
                      >
                        <RefreshCw
                          size={15}
                        />
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
             
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-green-600">
                        <CheckCircle2
                          size={18}
                        />
                      </div>

                      <span className="text-sm font-semibold text-green-800">
                        You already know
                      </span>
                    </div>

                    <p className="mt-4 text-3xl font-bold text-green-900">
                      {masteredCount}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-green-700">
                      Skills that meet the AI target level.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-amber-600">
                        <TrendingUp
                          size={18}
                        />
                      </div>

                      <span className="text-sm font-semibold text-amber-800">
                        Improve these
                      </span>
                    </div>

                    <p className="mt-4 text-3xl font-bold text-amber-900">
                      {improveCount}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-700">
                      Skills you have but need to strengthen.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-red-600">
                        <Target
                          size={18}
                        />
                      </div>

                      <span className="text-sm font-semibold text-red-800">
                        You need to learn
                      </span>
                    </div>

                    <p className="mt-4 text-3xl font-bold text-red-900">
                      {missingCount}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-red-700">
                      Skills not currently present in your known skills.
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Your learning gaps
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        These are the skills SkillHive identified as
                        needing attention.
                      </p>
                    </div>

                    {learningGaps.length > 0 && (
                      <span className="text-xs font-semibold text-slate-400">
                        {learningGaps.length} skill
                        {learningGaps.length === 1
                          ? ""
                          : "s"}
                      </span>
                    )}
                  </div>

                  {learningGaps.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 p-6 text-center">
                      <CheckCircle2
                        size={30}
                        className="mx-auto text-green-600"
                      />

                      <p className="mt-3 font-semibold text-green-900">
                        No learning gaps detected
                      </p>

                      <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-green-700">
                        Your current known skills meet the AI-defined
                        requirements for this goal.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {learningGaps
                        .slice(0, 6)
                        .map(
                          (skill) => (
                            <div
                              key={`${skill.skillId}-${skill.name}`}
                              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex min-w-0 items-start gap-3">
                                  <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${skillIconClass(
                                      skill,
                                    )}`}
                                  >
                                    {skill.missing ? (
                                      <Target
                                        size={19}
                                      />
                                    ) : (
                                      <TrendingUp
                                        size={19}
                                      />
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <h4 className="font-semibold text-slate-900">
                                      {skill.name}
                                    </h4>

                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <span
                                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${skillStatusClass(
                                          skill,
                                        )}`}
                                      >
                                        {skillStatusLabel(
                                          skill,
                                        )}
                                      </span>

                                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                                        {skill.relationLabel}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-500">
                                    Current level
                                  </span>

                                  <span className="font-semibold text-slate-700">
                                    {skill.currentLevel}/5
                                  </span>
                                </div>

                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full bg-blue-600"
                                    style={{
                                      width: `${Math.min(
                                        Math.max(
                                          (skill.currentLevel /
                                            5) *
                                            100,
                                          0,
                                        ),
                                        100,
                                      )}%`,
                                    }}
                                  />
                                </div>

                                <div className="mt-3 flex items-center justify-between text-xs">
                                  <span className="text-slate-500">
                                    Target level
                                  </span>

                                  <span className="font-semibold text-slate-700">
                                    {skill.targetLevel}/5
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3">
                                <p className="text-xs leading-5 text-slate-600">
                                  {skill.missing
                                    ? "This skill is not currently in your known skills and is part of your learning gap."
                                    : "You already have this skill, but SkillHive recommends improving your proficiency."}
                                </p>
                              </div>
                            </div>
                          ),
                        )}
                    </div>
                  )}
                </div>

                {skillGapMethod && (
                  <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3.5">
                    <div className="flex items-start gap-2">
                      <Sparkles
                        size={15}
                        className="mt-0.5 shrink-0 text-blue-600"
                      />

                      <p className="text-xs leading-5 text-slate-500">
                        <span className="font-semibold text-slate-700">
                          AI method:
                        </span>{" "}
                        {skillGapMethod}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

    

        {hasAiAnalysis &&
          masteredSkills.length > 0 && (
            <section className="mt-6 rounded-3xl border border-green-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                    <CheckCircle2
                      size={14}
                    />
                    Skills you already have
                  </div>

                  <h2 className="mt-3 text-xl font-bold text-slate-900">
                    Your existing strengths
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    These requirements are already covered according to
                    the AI analysis.
                  </p>
                </div>

                <span className="text-xs font-semibold text-slate-400">
                  {masteredSkills.length} mastered
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2.5">
                {masteredSkills.map(
                  (skill) => (
                    <div
                      key={`${skill.skillId}-${skill.name}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-3.5 py-2.5"
                    >
                      <CheckCircle2
                        size={16}
                        className="text-green-600"
                      />

                      <span className="text-sm font-semibold text-green-800">
                        {skill.name}
                      </span>

                      <span className="text-xs text-green-600">
                        {skill.currentLevel}/5
                      </span>
                    </div>
                  ),
                )}
              </div>
            </section>
          )}


        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                <Target size={14} />
                Career requirements
              </div>

              <h2 className="mt-3 text-xl font-bold text-slate-900">
                Skills this goal requires
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                These skills come from the career goal's configured
                requirements and ESCO-based knowledge.
              </p>
            </div>

            <span className="text-xs font-semibold text-slate-400">
              {goalSkills.length} skill
              {goalSkills.length === 1
                ? ""
                : "s"}
            </span>
          </div>

          {loadingSkills ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                1,
                2,
                3,
                4,
                5,
                6,
              ].map(
                (item) => (
                  <div
                    key={item}
                    className="h-20 animate-pulse rounded-2xl bg-slate-100"
                  />
                ),
              )}
            </div>
          ) : skillsError ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-semibold text-amber-900">
                Required skills could not be loaded
              </p>

              <p className="mt-1 text-sm text-amber-700">
                {skillsError}
              </p>

              <button
                type="button"
                onClick={
                  loadGoal
                }
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-50"
              >
                <RefreshCw
                  size={15}
                />
                Try again
              </button>
            </div>
          ) : goalSkills.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <Target
                size={30}
                className="mx-auto text-slate-400"
              />

              <p className="mt-3 font-semibold text-slate-700">
                No skill requirements found
              </p>

              <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500">
                This career goal does not currently have any configured
                skills.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {skillAnalysis.map(
                (skill) => (
                  <div
                    key={`${skill.skillId}-${skill.name}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-blue-200 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${skillIconClass(
                            skill,
                          )}`}
                        >
                          {skill.mastered ? (
                            <Check
                              size={17}
                            />
                          ) : (
                            <Circle
                              size={17}
                            />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-slate-900">
                            {skill.name}
                          </h3>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {skill.relationLabel}
                          </p>
                        </div>
                      </div>

                      {skill.hasAiResult ? (
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${skillStatusClass(
                            skill,
                          )}`}
                        >
                          {skillStatusLabel(
                            skill,
                          )}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-400">
                          Pending
                        </span>
                      )}
                    </div>

                    {skill.hasAiResult && (
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white px-3 py-2.5">
                          <p className="text-[11px] text-slate-400">
                            Current
                          </p>

                          <p className="mt-0.5 text-sm font-bold text-slate-800">
                            {skill.currentLevel}/5
                          </p>
                        </div>

                        <div className="rounded-xl bg-white px-3 py-2.5">
                          <p className="text-[11px] text-slate-400">
                            Target
                          </p>

                          <p className="mt-0.5 text-sm font-bold text-slate-800">
                            {skill.targetLevel}/5
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                <Sparkles size={14} />
                Personalized learning
              </div>

              <h2 className="mt-3 text-xl font-bold text-slate-900">
                Your learning roadmap
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Follow the roadmap generated from your identified
                learning gaps and complete each step toward your goal.
              </p>
            </div>

            <button
              type="button"
              onClick={
                handleOpenRoadmap
              }
              disabled={
                startingRoadmap ||
                loadingActiveGoal
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {startingRoadmap ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <ArrowRight
                  size={16}
                />
              )}

              {activeGoal
                ? "Open Full Roadmap"
                : "Set Up Roadmap"}
            </button>
          </div>

   
          {activeGoal && (
            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Your progress
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {completedTasks} of{" "}
                    {visibleTasks.length} roadmap tasks completed
                  </p>
                </div>

                <p className="text-2xl font-bold text-blue-700">
                  {progress}%
                </p>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>
          )}

          {loadingTasks ? (
            <div className="mt-6 space-y-3">
              {[
                1,
                2,
                3,
                4,
              ].map(
                (item) => (
                  <div
                    key={item}
                    className="h-20 animate-pulse rounded-2xl bg-slate-100"
                  />
                ),
              )}
            </div>
          ) : tasksError ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-semibold text-amber-900">
                Roadmap tasks unavailable
              </p>

              <p className="mt-1 text-sm text-amber-700">
                {tasksError}
              </p>

              <button
                type="button"
                onClick={
                  loadTasks
                }
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-50"
              >
                <RefreshCw
                  size={15}
                />
                Try Again
              </button>
            </div>
          ) : visibleTasks.length ===
            0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
              <Clock3
                size={32}
                className="mx-auto text-slate-400"
              />

              <p className="mt-3 font-semibold text-slate-700">
                Your roadmap is not ready yet
              </p>

              <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500">
                Start this career goal and SkillHive will generate
                roadmap tasks from the identified learning gaps.
              </p>

              <button
                type="button"
                onClick={
                  handleOpenRoadmap
                }
                disabled={
                  startingRoadmap
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {startingRoadmap ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Sparkles
                    size={17}
                  />
                )}

                Start My Roadmap
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {visibleTasks.map(
                (
                  task,
                  index,
                ) => (
                  <button
                    key={
                      task.id ||
                      `${task.title}-${index}`
                    }
                    type="button"
                    disabled={!task.id}
                    onClick={() =>
                      handleOpenTask(
                        task.id,
                      )
                    }
                    className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600">
                      {task.completed ? (
                        <CheckCircle2
                          size={20}
                          className="text-green-600"
                        />
                      ) : (
                        <span className="text-sm font-bold">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-slate-900">
                          {task.title}
                        </h3>

                        {task.completed && (
                          <span className="rounded-full bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700">
                            Completed
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs font-semibold text-blue-600">
                        {task.skillName}
                      </p>

                      {task.description && (
                        <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="hidden shrink-0 items-center gap-3 sm:flex">
                      {task.estimatedMinutes >
                        0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Clock3
                            size={14}
                          />
                          {
                            task.estimatedMinutes
                          }{" "}
                          min
                        </span>
                      )}

                      <ArrowRight
                        size={17}
                        className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
                      />
                    </div>
                  </button>
                ),
              )}
            </div>
          )}
        </section>
=

        <section className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-6 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
              <Sparkles size={23} />
            </div>

            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900">
                How SkillHive builds your learning path
              </h2>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                SkillHive connects career knowledge, AI relevance
                analysis, your existing skills, and personalized
                learning into one continuous journey.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-white p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Target
                        size={16}
                      />
                    </div>

                    <span className="text-sm font-semibold text-slate-800">
                      1. Career goal
                    </span>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Your selected career direction determines the
                    skills that are relevant to the goal.
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Sparkles
                        size={16}
                      />
                    </div>

                    <span className="text-sm font-semibold text-slate-800">
                      2. AI skill gap
                    </span>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    AI relevance ranking and exact skill matching
                    identify what you already know and what you need.
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <TrendingUp
                        size={16}
                      />
                    </div>

                    <span className="text-sm font-semibold text-slate-800">
                      3. Learning roadmap
                    </span>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Your learning gaps become roadmap tasks that lead
                    into learning, assessment, and certification.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>


        <div className="mt-8 flex flex-col justify-between gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center">
          <Link
            to="/goals"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
          >
            <ArrowLeft
              size={17}
            />
            Back to Career Goals
          </Link>

          <Link
            to="/my-skills"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Manage My Skills
            <ArrowRight
              size={16}
            />
          </Link>
        </div>
      </main>
    </div>
  );
}

export default GoalDetails;