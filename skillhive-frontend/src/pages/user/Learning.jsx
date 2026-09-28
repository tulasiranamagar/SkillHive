import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Lock,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Target,
  Video,
  Wrench,
  XCircle,
} from "lucide-react";

import api from "../../api/axios";


function unwrap(payload) {
  if (!payload) return payload;

  if (payload.data !== undefined) {
    return payload.data;
  }

  return payload;
}

function asArray(payload) {
  const value = unwrap(payload);

  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.tasks)) {
    return value.tasks;
  }

  if (Array.isArray(value?.progress)) {
    return value.progress;
  }

  return [];
}

function getId(value) {
  if (!value) return null;

  return (
    value.id ??
    value.task_id ??
    value.pk ??
    null
  );
}

function extractError(
  error,
  fallback = "Something went wrong."
) {
  const responseData = error?.response?.data;

  if (typeof responseData === "string") {
    return responseData;
  }

  if (responseData?.detail) {
    return responseData.detail;
  }

  if (responseData?.message) {
    return responseData.message;
  }

  if (responseData?.error) {
    return responseData.error;
  }

  if (responseData?.errors) {
    if (typeof responseData.errors === "string") {
      return responseData.errors;
    }

    try {
      return Object.values(responseData.errors)
        .flat()
        .join(" ");
    } catch {
      return fallback;
    }
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
}

function getProgressValue(progress) {
  if (!progress) return 0;

  const value =
    progress.progress_percent ??
    progress.progress_percentage ??
    progress.progress ??
    progress.completion_percentage ??
    0;

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.min(100, Math.max(0, number));
}

function normalizeTask(item) {
  if (!item) return null;

  const skill =
    item.skill ??
    item.skill_detail ??
    item.skills ??
    null;

  const skillName =
    skill?.name ??
    skill?.title ??
    item.skill_name ??
    item.title ??
    "Learning Task";

  return {
    ...item,
    id: getId(item),
    title:
      item.title ??
      item.name ??
      `Learn ${skillName}`,
    skillName,
    order: Number(item.order ?? 0),
    completed: Boolean(item.completed),
    completedAt:
      item.completed_at ??
      item.completedAt ??
      null,
    skillId:
      skill?.id ??
      item.skill_id ??
      null,
  };
}

function normalizeProgress(item) {
  if (!item) return null;

  const task = item.task ?? null;

  const taskId =
    item.task_id ??
    task?.id ??
    item.taskId ??
    null;

  return {
    ...item,
    taskId,
    progressPercent: getProgressValue(item),

    videoSeconds: Number(
      item.video_seconds ??
        item.videoSeconds ??
        0
    ),

    documentSeconds: Number(
      item.document_seconds ??
        item.documentSeconds ??
        0
    ),

    sessionsAttended: Number(
      item.sessions_attended ??
        item.sessionsAttended ??
        0
    ),

    practicalTasksCompleted: Number(
      item.practical_tasks_completed ??
        item.practicalTasksCompleted ??
        0
    ),
  };
}


const ACTIVITY_CONFIG = [
  {
    type: "video",
    label: "Video learning",
    description:
      "Watch the learning material for this skill.",
    weight: 30,
    icon: Video,
  },
  {
    type: "document",
    label: "Document learning",
    description:
      "Read and understand the supporting material.",
    weight: 25,
    icon: FileText,
  },
  {
    type: "session",
    label: "Peer session",
    description:
      "Learn through a peer-to-peer learning session.",
    weight: 25,
    icon: PlayCircle,
  },
  {
    type: "practical",
    label: "Practical activity",
    description:
      "Complete the practical learning task.",
    weight: 20,
    icon: Wrench,
  },
];


function isActivityCompleted(
  activityType,
  progress
) {
  if (!progress) return false;

  switch (activityType) {
    case "video":
      return progress.videoSeconds > 0;

    case "document":
      return progress.documentSeconds > 0;

    case "session":
      return progress.sessionsAttended > 0;

    case "practical":
      return progress.practicalTasksCompleted > 0;

    default:
      return false;
  }
}


function ActivityCard({
  activity,
  completed,
  disabled,
  onComplete,
  onPractical,
  completing,
}) {
  const Icon = activity.icon;

  return (
    <div
      className={[
        "rounded-2xl border p-5 transition",
        completed
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-slate-200 bg-white",
        disabled
          ? "opacity-60"
          : "hover:border-blue-200 hover:shadow-sm",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            completed
              ? "bg-emerald-100 text-emerald-700"
              : "bg-blue-50 text-blue-600",
          ].join(" ")}
        >
          {completed ? (
            <CheckCircle2 size={21} />
          ) : (
            <Icon size={21} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900">
                {activity.label}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {activity.description}
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              +{activity.weight}%
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-sm">
              {completed ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                  <Check size={15} />
                  Completed
                </span>
              ) : (
                <span className="text-slate-500">
                  Not completed
                </span>
              )}
            </div>

            {!completed && !disabled && (
              <>
                {activity.type === "practical" ? (
                  <button
                    type="button"
                    onClick={onPractical}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Start Practical
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onComplete}
                    disabled={completing}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {completing ? (
                      <>
                        <RotateCcw
                          size={15}
                          className="animate-spin"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        Mark Complete
                        <Check size={15} />
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function PracticalActivityPanel({
  onComplete,
  completing,
  onClose,
}) {
  const [understood, setUnderstood] =
    useState(false);

  const [completed, setCompleted] =
    useState(false);

  const [reviewed, setReviewed] =
    useState(false);

  const ready =
    understood &&
    completed &&
    reviewed;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 px-4 py-8">
      <div className="mx-auto max-w-xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <Wrench
                size={20}
                className="text-blue-600"
              />

              <h2 className="text-xl font-bold text-slate-900">
                Practical Activity
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Complete the practical learning cycle before
              marking this activity complete.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <XCircle size={22} />
          </button>
        </div>

        <div className="space-y-3 p-6">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-blue-200">
            <input
              type="checkbox"
              checked={understood}
              onChange={(event) =>
                setUnderstood(
                  event.target.checked
                )
              }
              className="accent-blue-600"
            />

            <span className="text-sm text-slate-700">
              I understand what I need to practice.
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-blue-200">
            <input
              type="checkbox"
              checked={completed}
              onChange={(event) =>
                setCompleted(
                  event.target.checked
                )
              }
              className="accent-blue-600"
            />

            <span className="text-sm text-slate-700">
              I completed the practical task.
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-blue-200">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(event) =>
                setReviewed(
                  event.target.checked
                )
              }
              className="accent-blue-600"
            />

            <span className="text-sm text-slate-700">
              I reviewed my result.
            </span>
          </label>
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-5">
          <button
            type="button"
            disabled={!ready || completing}
            onClick={onComplete}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {completing ? (
              <>
                <RotateCcw
                  size={16}
                  className="animate-spin"
                />
                Saving...
              </>
            ) : (
              <>
                Complete Practical Activity
                <Check size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function Learning() {
  const [searchParams] =
    useSearchParams();

  const requestedTaskId =
    searchParams.get("task");

  const [tasks, setTasks] =
    useState([]);

  const [progressList, setProgressList] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [completing, setCompleting] =
    useState("");

  const [error, setError] =
    useState("");

  const [activityError, setActivityError] =
    useState("");

  const [practicalOpen, setPracticalOpen] =
    useState(false);

  const loadData = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const [
          tasksResponse,
          progressResponse,
        ] = await Promise.all([
          api.get("/api/roadmaps/"),
          api.get("/api/roadmaps/progress/"),
        ]);

        const normalizedTasks =
          asArray(tasksResponse.data)
            .map(normalizeTask)
            .filter(Boolean);

        const normalizedProgress =
          asArray(progressResponse.data)
            .map(normalizeProgress)
            .filter(Boolean);

        setTasks(normalizedTasks);
        setProgressList(
          normalizedProgress
        );
      } catch (requestError) {
        setError(
          extractError(
            requestError,
            "Unable to load your learning roadmap."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );


  useEffect(() => {
    loadData();
  }, [loadData]);


  const selectedTask = useMemo(() => {
    if (!tasks.length) {
      return null;
    }

    if (requestedTaskId) {
      const requested = tasks.find(
        (task) =>
          String(task.id) ===
          String(requestedTaskId)
      );

      if (requested) {
        return requested;
      }
    }

    return (
      tasks.find(
        (task) => !task.completed
      ) ?? tasks[0]
    );
  }, [
    tasks,
    requestedTaskId,
  ]);


  const selectedProgress = useMemo(() => {
    if (!selectedTask) {
      return null;
    }

    return (
      progressList.find(
        (item) =>
          String(item.taskId) ===
          String(selectedTask.id)
      ) ?? null
    );
  }, [
    progressList,
    selectedTask,
  ]);


  const effectiveProgress = useMemo(() => {
    if (!selectedTask) {
      return 0;
    }

    if (selectedTask.completed) {
      return 100;
    }

    return (
      selectedProgress?.progressPercent ?? 0
    );
  }, [
    selectedTask,
    selectedProgress,
  ]);


  const completedActivityCount =
    useMemo(() => {
      if (!selectedProgress) {
        return 0;
      }

      return ACTIVITY_CONFIG.filter(
        (activity) =>
          isActivityCompleted(
            activity.type,
            selectedProgress
          )
      ).length;
    }, [selectedProgress]);

  const completeActivity =
    useCallback(
      async (activityType) => {
        if (!selectedTask) {
          return;
        }

        try {
          setCompleting(activityType);
          setActivityError("");

          await api.post(
            "/api/roadmaps/learning-activity/",
            {
              task_id: selectedTask.id,
              activity_type:
                activityType,
              duration_seconds: 0,
              completed: true,
              metadata: {
                source: "learning_page",
              },
            }
          );

          await loadData(true);
        } catch (requestError) {
          setActivityError(
            extractError(
              requestError,
              "Unable to complete this learning activity."
            )
          );
        } finally {
          setCompleting("");
        }
      },
      [
        selectedTask,
        loadData,
      ]
    );

  const openPracticalActivity =
    useCallback(() => {
      setPracticalOpen(true);
      setActivityError("");
    }, []);


  const completePracticalActivity =
    useCallback(async () => {
      if (!selectedTask) {
        return;
      }

      try {
        setCompleting("practical");
        setActivityError("");

        await api.post(
          "/api/roadmaps/learning-activity/",
          {
            task_id: selectedTask.id,
            activity_type: "practical",
            duration_seconds: 0,
            completed: true,
            metadata: {
              source:
                "practical_activity",
              understand: true,
              complete: true,
              review: true,
            },
          }
        );

        setPracticalOpen(false);

        await loadData(true);
      } catch (requestError) {
        setActivityError(
          extractError(
            requestError,
            "Unable to complete the practical activity."
          )
        );
      } finally {
        setCompleting("");
      }
    }, [
      selectedTask,
      loadData,
    ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex items-center justify-center py-24 text-slate-500">
            <RotateCcw
              size={24}
              className="mr-2 animate-spin"
            />
            Loading your learning workspace...
          </div>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <Link
            to="/roadmap"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Roadmap
          </Link>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }



  if (!selectedTask) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <Link
            to="/roadmap"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Roadmap
          </Link>

          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <Target
              size={42}
              className="mx-auto text-slate-400"
            />

            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              No learning tasks yet
            </h1>

            <p className="mx-auto mt-2 max-w-lg text-slate-500">
              Generate your roadmap first, then come back
              here to complete your learning activities.
            </p>

            <Link
              to="/roadmap"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Open Roadmap
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

       
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link
            to="/roadmap"
            className="hover:text-slate-900"
          >
            Roadmap
          </Link>

          <ChevronRight size={14} />

          <span className="font-medium text-slate-900">
            Learning
          </span>
        </div>


        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                <Sparkles size={14} />
                Learning Workspace
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {selectedTask.title}
              </h1>

              <p className="mt-2 text-slate-500">
                Build your knowledge step by step and
                complete every activity for this skill.
              </p>

              {selectedTask.skillName && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
                  <BookOpen size={16} />
                  {selectedTask.skillName}
                </div>
              )}
            </div>

            <Link
              to="/roadmap"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <ArrowLeft size={16} />
              Back to Roadmap
            </Link>
          </div>
        </section>


        
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Learning progress
              </p>

              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900">
                  {effectiveProgress}%
                </span>

                <span className="text-sm text-slate-500">
                  complete
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-slate-500">
                Activities
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {completedActivityCount}/
                {ACTIVITY_CONFIG.length}
              </p>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${effectiveProgress}%`,
              }}
            />
          </div>

          <div className="mt-3 flex justify-between text-xs text-slate-400">
            <span>0%</span>
            <span>100%</span>
          </div>
        </section>


      
        {activityError && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <XCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span>{activityError}</span>
          </div>
        )}


      
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Learning activities
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Complete all four activities to reach 100%.
            </p>
          </div>

          <div className="space-y-4">
            {ACTIVITY_CONFIG.map(
              (activity) => {
                const completed =
                  isActivityCompleted(
                    activity.type,
                    selectedProgress
                  );

                return (
                  <ActivityCard
                    key={activity.type}
                    activity={activity}
                    completed={completed}
                    disabled={false}
                    completing={
                      completing ===
                      activity.type
                    }
                    onComplete={() =>
                      completeActivity(
                        activity.type
                      )
                    }
                    onPractical={
                      openPracticalActivity
                    }
                  />
                );
              }
            )}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={[
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                  effectiveProgress >= 100
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-blue-50 text-blue-600",
                ].join(" ")}
              >
                {effectiveProgress >= 100 ? (
                  <CheckCircle2 size={23} />
                ) : (
                  <Lock size={21} />
                )}
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Final Assessment
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Complete 100% of the learning activities
                  before starting the assessment.
                </p>
              </div>
            </div>

            {effectiveProgress >= 100 ? (
              <Link
                to={`/assessment/${selectedTask.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Start Assessment
                <ChevronRight size={16} />
              </Link>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-600">
                <Lock size={15} />
                Locked
              </div>
            )}
          </div>

          {effectiveProgress < 100 && (
            <div className="mt-5 rounded-2xl bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Clock3 size={16} />

                <span>
                  {100 - effectiveProgress}% more learning
                  progress required.
                </span>
              </div>
            </div>
          )}
        </section>



        {tasks.length > 1 && (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Roadmap tasks
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Continue learning other skills from your
                  roadmap.
                </p>
              </div>

              <Link
                to="/roadmap"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                View roadmap
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tasks.map((task) => {
                const taskProgress =
                  progressList.find(
                    (item) =>
                      String(item.taskId) ===
                      String(task.id)
                  );

                const progress =
                  task.completed
                    ? 100
                    : taskProgress?.progressPercent ??
                      0;

                const isSelected =
                  String(task.id) ===
                  String(selectedTask.id);

                return (
                  <Link
                    key={task.id}
                    to={`/learning?task=${task.id}`}
                    className={[
                      "rounded-2xl border bg-white p-4 transition",
                      isSelected
                        ? "border-blue-600 shadow-sm"
                        : "border-slate-200 hover:border-blue-200",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Task {task.order || ""}
                        </p>

                        <h3 className="mt-1 line-clamp-2 font-semibold text-slate-900">
                          {task.title}
                        </h3>
                      </div>

                      {task.completed && (
                        <CheckCircle2
                          size={19}
                          className="shrink-0 text-emerald-600"
                        />
                      )}
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>

                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}


        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() =>
              loadData(true)
            }
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh Progress
          </button>
        </div>
      </main>


      {practicalOpen && (
        <PracticalActivityPanel
          onComplete={
            completePracticalActivity
          }
          completing={
            completing === "practical"
          }
          onClose={() => {
            if (
              completing !==
              "practical"
            ) {
              setPracticalOpen(false);
            }
          }}
        />
      )}
    </div>
  );
}