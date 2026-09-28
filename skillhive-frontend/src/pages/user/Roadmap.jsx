import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileCheck2,
  Map as MapIcon,
  RefreshCw,
  Target,
  Trophy,
} from "lucide-react";
import api from "../../api/axios";

function unwrap(response) {
  const data = response?.data;

  if (data?.data !== undefined) {
    return data.data;
  }

  return data;
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
}

function getId(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value.id ?? value.pk ?? null;
  }

  return value;
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

  if (data.errors && typeof data.errors === "object") {
    return Object.values(data.errors)
      .flat()
      .filter(Boolean)
      .join(" ");
  }

  return fallback;
}

function getProgressValue(progress) {
  const value = Number(
    progress?.progress_percent ??
      progress?.progress_percentage ??
      progress?.completion_percentage ??
      progress?.percentage ??
      0
  );

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function normalizeTask(task) {
  const progress =
    task?.progress ||
    task?.roadmap_progress ||
    task?.user_progress ||
    {};

  const assessment =
    task?.assessment ||
    task?.latest_assessment ||
    task?.assessment_result ||
    {};

  const skill =
    typeof task?.skill === "object"
      ? task.skill
      : null;

  return {
    ...task,

    id: getId(task),

    title:
      task?.title ||
      task?.skill_name ||
      skill?.name ||
      "Roadmap Task",

    skillName:
      task?.skill_name ||
      skill?.name ||
      task?.skill?.title ||
      "Skill",

    order: Number(task?.order ?? 0),

    completed:
      task?.completed === true ||
      progress?.completed === true ||
      String(task?.status || "").toLowerCase() ===
        "completed",

    progress,

    progressPercent: getProgressValue(progress),

    assessment,

    assessmentPassed:
      task?.assessment_passed === true ||
      assessment?.passed === true ||
      String(assessment?.status || "").toLowerCase() ===
        "passed",

    questionsCount: Number(
      task?.questions_count ??
        task?.questionsCount ??
        0
    ),
  };
}

function ProgressBar({ value }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-blue-600 transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function StatusBadge({ task }) {
  if (task.completed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Completed
      </span>
    );
  }

  if (task.progressPercent >= 100) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
        <FileCheck2 className="h-3.5 w-3.5" />
        Assessment Ready
      </span>
    );
  }

  if (task.progressPercent > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
        <BookOpen className="h-3.5 w-3.5" />
        In Progress
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
      <Circle className="h-3.5 w-3.5" />
      Not Started
    </span>
  );
}

function TaskCard({ task, index }) {
  const navigate = useNavigate();

  const actionLabel = task.completed
    ? "Review Learning"
    : task.progressPercent >= 100
      ? "Take Assessment"
      : task.progressPercent > 0
        ? "Continue Learning"
        : "Start Learning";

  function handleOpen() {
    if (task.progressPercent >= 100 && !task.completed) {
      navigate(`/assessment/${task.id}`);
      return;
    }

    navigate(
      `/learning?task=${encodeURIComponent(task.id)}`
    );
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
            task.completed
              ? "bg-emerald-50 text-emerald-700"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          {task.completed ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            index + 1
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Task {index + 1}
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-900">
                {task.title}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {task.skillName}
              </p>
            </div>

            <StatusBadge task={task} />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500">
                Learning progress
              </span>

              <span className="font-bold text-slate-800">
                {Math.round(task.progressPercent)}%
              </span>
            </div>

            <ProgressBar value={task.progressPercent} />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              {task.completed
                ? "Assessment passed and task completed."
                : task.progressPercent >= 100
                  ? "Learning complete. Assessment is ready."
                  : "Complete the required learning activities to unlock the assessment."}
            </p>

            <button
              type="button"
              onClick={handleOpen}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {actionLabel}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Roadmap() {
  const [tasks, setTasks] = useState([]);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadRoadmap = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [tasksResponse, progressResponse, goalsResponse] =
        await Promise.all([
          api.get("/api/roadmaps/"),
          api.get("/api/roadmaps/progress/"),
          api.get("/api/goals/my/"),
        ]);

      const rawTasks = asArray(
        unwrap(tasksResponse)
      );

      const rawProgress = asArray(
        unwrap(progressResponse)
      );

      const rawGoals = asArray(
        unwrap(goalsResponse)
      );

      const progressMap = new Map();

      rawProgress.forEach((item) => {
        const taskId = getId(item?.task);

        if (taskId !== null) {
          progressMap.set(String(taskId), item);
        }
      });

      const normalizedTasks = rawTasks
        .map((task) => {
          const normalized = normalizeTask(task);

          const backendProgress =
            progressMap.get(String(normalized.id));

          if (backendProgress) {
            normalized.progress =
              backendProgress;

            normalized.progressPercent =
              getProgressValue(backendProgress);
          }

          return normalized;
        })
        .sort(
          (a, b) =>
            a.order - b.order ||
            Number(a.id || 0) -
              Number(b.id || 0)
        );

      setTasks(normalizedTasks);

      if (rawGoals.length) {
        const activeGoal =
          rawGoals.find(
            (item) =>
              item?.is_active === true ||
              item?.active === true
          ) || rawGoals[0];

        setGoal(activeGoal);
      } else {
        setGoal(null);
      }
    } catch (err) {
      setError(
        extractError(
          err,
          "We could not load your roadmap."
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRoadmap();
  }, [loadRoadmap]);

  const overallProgress = useMemo(() => {
    if (!tasks.length) {
      return 0;
    }

    const total = tasks.reduce(
      (sum, task) =>
        sum + task.progressPercent,
      0
    );

    return Math.round(total / tasks.length);
  }, [tasks]);

  const completedCount = useMemo(
    () =>
      tasks.filter(
        (task) => task.completed
      ).length,
    [tasks]
  );

  const assessmentReadyCount = useMemo(
    () =>
      tasks.filter(
        (task) =>
          !task.completed &&
          task.progressPercent >= 100
      ).length,
    [tasks]
  );

  const currentTask = useMemo(
    () =>
      tasks.find(
        (task) =>
          !task.completed &&
          task.progressPercent < 100
      ) ||
      tasks.find(
        (task) => !task.completed
      ) ||
      null,
    [tasks]
  );

  const allTasksCompleted =
    tasks.length > 0 &&
    tasks.every(
      (task) => task.completed
    );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-32 rounded bg-slate-200" />

            <div className="h-52 rounded-3xl bg-slate-200" />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="h-24 rounded-2xl bg-slate-200" />
              <div className="h-24 rounded-2xl bg-slate-200" />
              <div className="h-24 rounded-2xl bg-slate-200" />
            </div>

            <div className="h-52 rounded-2xl bg-slate-200" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/goals"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Goals
          </Link>

          <button
            type="button"
            onClick={() => loadRoadmap(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="text-sm font-bold text-red-800">
                  Roadmap could not be loaded
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        <section className="overflow-hidden rounded-3xl bg-blue-600 shadow-lg">
          <div className="px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50">
                  <MapIcon className="h-4 w-4" />
                  Learning roadmap
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {goal?.goal?.title ||
                    goal?.goal_title ||
                    goal?.title ||
                    "Your Learning Roadmap"}
                </h1>

                <p className="mt-3 text-sm leading-7 text-blue-100 sm:text-base">
                  Follow each skill task, complete its learning
                  activities, and pass the assessment to move
                  forward.
                </p>

                <div className="mt-7 max-w-xl">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-blue-100">
                    <span>Overall progress</span>
                    <span>{overallProgress}%</span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-500"
                      style={{
                        width: `${overallProgress}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white text-blue-600 shadow-sm">
                <MapIcon className="h-12 w-12" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={Target}
            label="Roadmap tasks"
            value={tasks.length}
          />

          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={`${completedCount}/${tasks.length}`}
          />

          <StatCard
            icon={FileCheck2}
            label="Assessments ready"
            value={assessmentReadyCount}
          />
        </section>

        {!tasks.length ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <MapIcon className="h-8 w-8" />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              No roadmap tasks yet
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Your active learning goal does not have any roadmap
              tasks yet.
            </p>

            <Link
              to="/goals"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              View Goals
              <ChevronRight className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <>
            {allTasksCompleted ? (
              <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                      <Trophy className="h-5 w-5" />
                      Roadmap completed
                    </div>

                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                      You completed every roadmap task
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      Your assessments have been passed for all
                      required tasks. You can now generate your
                      certificate from the Certificates page.
                    </p>
                  </div>

                  <Link
                    to="/certificates"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    <Trophy className="h-4 w-4" />
                    Open Certificates
                  </Link>
                </div>
              </section>
            ) : currentTask ? (
              <section className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-6 sm:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between text-white">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                      Continue your roadmap
                    </p>

                    <h2 className="mt-2 text-xl font-bold text-slate-900">
                      {currentTask.title}
                    </h2>

                    <p className="mt-1 text-sm text-slate-600">
                      {currentTask.skillName}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Complete the learning activities for this
                      task before taking its assessment.
                    </p>
                  </div>

                  <Link
                    to={`/learning?task=${encodeURIComponent(
                      currentTask.id
                    )}`}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Continue Learning
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </section>
            ) : null}

            <section className="mt-8">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Roadmap
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    Learning tasks
                  </h2>
                </div>

                <span className="text-sm font-semibold text-slate-500">
                  {completedCount} of {tasks.length} completed
                </span>
              </div>

              <div className="space-y-4">
                {tasks.map((task, index) => (
                  <TaskCard
                    key={task.id ?? index}
                    task={task}
                    index={index}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                How the roadmap works
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Each task has five learning activity categories.
                Completing them brings the task to 100%. The
                assessment then becomes available. Passing the
                assessment completes that roadmap task.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default Roadmap;