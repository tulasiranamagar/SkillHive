import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileCheck2,
  Loader2,
  LockKeyhole,
  Send,
  Target,
  XCircle,
} from "lucide-react";
import api from "../../api/axios";

const QUESTION_COUNT = 10;
const PASSING_PERCENTAGE = 70;

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

  if (Array.isArray(value?.questions)) {
    return value.questions;
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

function extractError(
  error,
  fallback = "Something went wrong."
) {
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
  const skill =
    typeof task?.skill === "object"
      ? task.skill
      : null;

  const progress =
    task?.progress ||
    task?.roadmap_progress ||
    {};

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
      "Skill",

    completed:
      task?.completed === true,

    progressPercent:
      getProgressValue(progress),
  };
}

function normalizeQuestion(question, index) {
  const optionFields = [
    ["A", question?.option_a],
    ["B", question?.option_b],
    ["C", question?.option_c],
    ["D", question?.option_d],
  ];

  const directOptions = Array.isArray(
    question?.options
  )
    ? question.options
    : [];

  const options = directOptions.length
    ? directOptions.map(
        (option, optionIndex) => {
          if (
            option &&
            typeof option === "object"
          ) {
            return {
              id:
                option.id ??
                option.value ??
                option.key ??
                String.fromCharCode(
                  65 + optionIndex
                ),
              label:
                option.label ??
                option.text ??
                option.value ??
                "",
            };
          }

          return {
            id: String.fromCharCode(
              65 + optionIndex
            ),
            label: String(option),
          };
        }
      )
    : optionFields
        .filter(
          ([, value]) =>
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
        )
        .map(([id, value]) => ({
          id,
          label: String(value),
        }));

  return {
    ...question,

    id:
      getId(question) ??
      `question-${index + 1}`,

    question:
      question?.question ||
      question?.text ||
      question?.prompt ||
      `Question ${index + 1}`,

    questionType: String(
      question?.question_type ??
        question?.type ??
        "mcq"
    ).toLowerCase(),

    options,
  };
}

function getScore(result) {
  const score = Number(
    result?.score ??
      result?.percentage ??
      result?.score_percentage ??
      result?.percent ??
      0
  );

  return Number.isFinite(score)
    ? Math.max(0, Math.min(100, score))
    : 0;
}

function getPassed(result) {
  if (
    typeof result?.passed === "boolean"
  ) {
    return result.passed;
  }

  if (
    typeof result?.is_passed === "boolean"
  ) {
    return result.is_passed;
  }

  return (
    String(result?.status || "").toLowerCase() ===
      "passed" ||
    getScore(result) >= PASSING_PERCENTAGE
  );
}

function getAssessmentStatus(assessment) {
  return String(
    assessment?.status || ""
  ).toLowerCase();
}

function normalizeAssessment(
  assessment
) {
  if (!assessment) {
    return null;
  }

  return {
    ...assessment,

    id:
      assessment?.id ??
      assessment?.assessment_id,

    taskId: getId(assessment?.task),

    status: getAssessmentStatus(
      assessment
    ),

    questions: asArray(
      assessment?.questions
    ).map(normalizeQuestion),
  };
}

function isCompletedStatus(status) {
  return [
    "submitted",
    "passed",
    "failed",
  ].includes(status);
}

function getQuestionAnswer(
  question,
  value
) {
  if (
    question.questionType ===
      "multiple_select" ||
    question.questionType ===
      "multiple-select"
  ) {
    return Array.isArray(value)
      ? value
      : [];
  }

  if (
    question.questionType ===
    "true_false"
  ) {
    if (value === true || value === false) {
      return value;
    }

    return value;
  }

  return value;
}

function isAnswered(question, answers) {
  const value =
    answers[question.id];

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return false;
  }

  if (
    Array.isArray(value) &&
    value.length === 0
  ) {
    return false;
  }

  return true;
}

function Assessment() {
  const navigate = useNavigate();
  const { taskId } = useParams();

  const [task, setTask] = useState(null);
  const [assessment, setAssessment] =
    useState(null);
  const [questions, setQuestions] =
    useState([]);

  const [answers, setAnswers] =
    useState({});

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [starting, setStarting] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [submittedResult, setSubmittedResult] =
    useState(null);

  const loadTask = useCallback(
    async () => {
      const response =
        await api.get(
          "/api/roadmaps/"
        );

      const items = asArray(
        unwrap(response)
      );

      const found = items.find(
        (item) =>
          String(getId(item)) ===
          String(taskId)
      );

      if (!found) {
        throw new Error(
          "The requested roadmap task could not be found."
        );
      }

      const normalized =
        normalizeTask(found);

      setTask(normalized);

      return normalized;
    },
    [taskId]
  );

  const loadProgress = useCallback(
    async () => {
      const response =
        await api.get(
          "/api/roadmaps/progress/"
        );

      const items = asArray(
        unwrap(response)
      );

      const progress = items.find(
        (item) =>
          String(getId(item?.task)) ===
          String(taskId)
      );

      return progress || null;
    },
    [taskId]
  );

  const loadExistingAssessment =
    useCallback(async () => {
      try {
        const response =
          await api.get(
            "/api/roadmaps/assessments/"
          );

        const assessments = asArray(
          unwrap(response)
        );

        const matching =
          assessments
            .filter(
              (item) =>
                String(
                  getId(item?.task)
                ) ===
                String(taskId)
            )
            .sort((a, b) => {
              const aTime =
                new Date(
                  a?.created_at ||
                    a?.started_at ||
                    0
                ).getTime();

              const bTime =
                new Date(
                  b?.created_at ||
                    b?.started_at ||
                    0
                ).getTime();

              return bTime - aTime;
            });

        const latest = matching[0];

        if (!latest) {
          return null;
        }

        const normalized =
          normalizeAssessment(
            latest
          );

        setAssessment(normalized);

        if (
          normalized?.questions?.length
        ) {
          setQuestions(
            normalized.questions
          );
        }

        if (
          isCompletedStatus(
            normalized.status
          )
        ) {
          setSubmittedResult(
            normalized
          );
        }

        return normalized;
      } catch {
        return null;
      }
    }, [taskId]);

  const initialize =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const [taskData, progress] =
          await Promise.all([
            loadTask(),
            loadProgress(),
          ]);

        const progressPercent =
          getProgressValue(progress);

        setTask((previous) => ({
          ...previous,
          progressPercent:
            Math.max(
              previous?.progressPercent ??
                0,
              progressPercent,
              previous?.completed
                ? 100
                : 0
            ),
        }));

        await loadExistingAssessment();

        if (
          taskData.completed
        ) {
          await loadExistingAssessment();
        }
      } catch (err) {
        setError(
          extractError(
            err,
            "We could not load this assessment."
          )
        );
      } finally {
        setLoading(false);
      }
    }, [
      loadTask,
      loadProgress,
      loadExistingAssessment,
    ]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const taskProgress =
    task?.progressPercent ?? 0;

  const assessmentLocked =
    !task?.completed &&
    taskProgress < 100;

  const startAssessment =
    async () => {
      setStarting(true);
      setError("");

      try {
        const response =
          await api.post(
            "/api/roadmaps/assessment/start/",
            {
              task_id: taskId,
              question_count:
                QUESTION_COUNT,
            }
          );

        const data =
          unwrap(response);

        const rawAssessment =
          data?.assessment ??
          data;

        const normalizedAssessment =
          normalizeAssessment(
            rawAssessment
          );

        const returnedQuestions =
          asArray(
            data?.questions ??
              rawAssessment?.questions ??
              []
          ).map(normalizeQuestion);

        const finalQuestions =
          returnedQuestions.length
            ? returnedQuestions
            : normalizedAssessment?.questions ||
              [];

        setAssessment(
          normalizedAssessment
        );

        setQuestions(
          finalQuestions
        );

        setAnswers({});
        setCurrentIndex(0);
        setSubmittedResult(null);
      } catch (err) {
        setError(
          extractError(
            err,
            "The assessment could not be started."
          )
        );
      } finally {
        setStarting(false);
      }
    };

  function selectAnswer(
    question,
    optionId
  ) {
    if (submittedResult) {
      return;
    }

    if (
      question.questionType ===
        "multiple_select" ||
      question.questionType ===
        "multiple-select"
    ) {
      setAnswers((previous) => {
        const existing = Array.isArray(
          previous[question.id]
        )
          ? previous[question.id]
          : [];

        const alreadySelected =
          existing.some(
            (item) =>
              String(item) ===
              String(optionId)
          );

        const next = alreadySelected
          ? existing.filter(
              (item) =>
                String(item) !==
                String(optionId)
            )
          : [
              ...existing,
              optionId,
            ];

        return {
          ...previous,
          [question.id]: next,
        };
      });

      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [question.id]: optionId,
    }));
  }

  function selectTrueFalse(
    question,
    value
  ) {
    setAnswers((previous) => ({
      ...previous,
      [question.id]: value,
    }));
  }

  const answeredCount =
    questions.filter((question) =>
      isAnswered(question, answers)
    ).length;

  const allAnswered =
    questions.length > 0 &&
    answeredCount ===
      questions.length;

  const submitAssessment =
    async () => {
      if (!assessment?.id) {
        setError(
          "There is no active assessment to submit."
        );
        return;
      }

      if (!questions.length) {
        setError(
          "This assessment does not contain any questions."
        );
        return;
      }

      if (!allAnswered) {
        setError(
          "Please answer all questions before submitting the assessment."
        );
        return;
      }

      setSubmitting(true);
      setError("");

      const payloadAnswers =
        questions.map((question) => ({
          question_id:
            question.id,

          answer: getQuestionAnswer(
            question,
            answers[question.id]
          ),
        }));

      try {
        const response =
          await api.post(
            "/api/roadmaps/assessment/submit/",
            {
              assessment_id:
                assessment.id,
              answers:
                payloadAnswers,
            }
          );

        const data =
          unwrap(response);

        const result =
          data?.assessment ??
          data?.result ??
          data;

        const normalized =
          normalizeAssessment(
            result
          );

        setSubmittedResult(
          normalized
        );

        setAssessment(
          normalized
        );
      } catch (err) {
        setError(
          extractError(
            err,
            "The assessment could not be submitted."
          )
        );
      } finally {
        setSubmitting(false);
      }
    };

  const currentQuestion =
    questions[currentIndex];

  const score = submittedResult
    ? getScore(submittedResult)
    : null;

  const passed = submittedResult
    ? getPassed(submittedResult)
    : false;

  const restartAfterFailure =
    () => {
      setSubmittedResult(null);
      setAssessment(null);
      setQuestions([]);
      setAnswers({});
      setCurrentIndex(0);
      setError("");
    };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-40 rounded bg-slate-200" />
            <div className="h-40 rounded-3xl bg-slate-200" />
            <div className="h-64 rounded-2xl bg-slate-200" />
          </div>
        </main>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4">
          <div className="w-full rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />

            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              Assessment unavailable
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              {error}
            </p>

            <Link
              to="/roadmap"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Roadmap
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (assessmentLocked) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            to={`/learning?task=${encodeURIComponent(
              taskId
            )}`}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Learning
          </Link>

          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <LockKeyhole className="h-8 w-8" />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-900">
              Assessment Locked
            </h1>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
              Complete 100% of this roadmap task's learning
              activities before taking the assessment.
            </p>

            <div className="mx-auto mt-6 max-w-md">
              <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
                <span>Learning progress</span>
                <span>
                  {Math.round(taskProgress)}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{
                    width: `${taskProgress}%`,
                  }}
                />
              </div>
            </div>

            <Link
              to={`/learning?task=${encodeURIComponent(
                taskId
              )}`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Continue Learning
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (submittedResult) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <Link
            to={`/learning?task=${encodeURIComponent(
              taskId
            )}`}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Learning
          </Link>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
                passed
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {passed ? (
                <CheckCircle2 className="h-8 w-8" />
              ) : (
                <XCircle className="h-8 w-8" />
              )}
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">
              Assessment Result
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {passed
                ? "Assessment Passed"
                : "Assessment Not Passed"}
            </h1>

            <div className="mx-auto mt-6 max-w-xs rounded-2xl bg-slate-50 p-6">
              <p className="text-4xl font-bold text-slate-900">
                {Math.round(score)}%
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Passing score: {PASSING_PERCENTAGE}%
              </p>
            </div>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-slate-600">
              {passed
                ? "This roadmap task has been completed. Return to your roadmap to continue with the next task."
                : "Review the learning activities for this task and retry the assessment when you are ready."}
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/roadmap"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Target className="h-4 w-4" />
                View Roadmap
              </Link>

              {passed ? (
                <Link
                  to="/certificates"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  <FileCheck2 className="h-4 w-4" />
                  Certificates
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={
                    restartAfterFailure
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  Retry Assessment
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (
    !assessment ||
    !questions.length
  ) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            to={`/learning?task=${encodeURIComponent(
              taskId
            )}`}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Learning
          </Link>

          <section className="overflow-hidden rounded-3xl bg-violet-600 shadow-lg">
            <div className="px-6 py-8 sm:px-8">
              <div className="flex items-center gap-2 text-sm font-semibold text-violet-100">
                <FileCheck2 className="h-5 w-5" />
                Roadmap Assessment
              </div>

              <h1 className="mt-4 text-3xl font-bold text-white">
                {task?.title ||
                  "Task Assessment"}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-violet-100">
                The assessment system will select up to{" "}
                {QUESTION_COUNT} approved questions for this
                roadmap task.
              </p>
            </div>
          </section>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">
                {error}
              </p>
            </div>
          )}

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-3">
              <InfoCard
                icon={FileCheck2}
                value={`Up to ${QUESTION_COUNT}`}
                label="Questions"
              />

              <InfoCard
                icon={Target}
                value={`${PASSING_PERCENTAGE}%`}
                label="Passing Score"
              />

              <InfoCard
                icon={Clock3}
                value="Required"
                label="All Questions"
              />
            </div>

            <button
              type="button"
              onClick={
                startAssessment
              }
              disabled={starting}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {starting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing Assessment...
                </>
              ) : (
                <>
                  Start Assessment
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </section>
        </main>
      </div>
    );
  }

  const questionType =
    currentQuestion?.questionType;

  const isMultiple =
    questionType ===
      "multiple_select" ||
    questionType ===
      "multiple-select";

  const isTrueFalse =
    questionType === "true_false";

  const currentAnswer =
    answers[currentQuestion?.id];

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to={`/learning?task=${encodeURIComponent(
            taskId
          )}`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Learning
        </Link>

        <section className="rounded-3xl bg-violet-600 p-6 shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-violet-100">
                Task Assessment
              </p>

              <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                {task?.title ||
                  "Roadmap Assessment"}
              </h1>

              <p className="mt-2 text-sm text-violet-100">
                Answer all {questions.length} questions.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-5 py-4 text-center text-white">
              <p className="text-2xl font-bold">
                {answeredCount}/
                {questions.length}
              </p>

              <p className="text-xs text-violet-100">
                Answered
              </p>
            </div>
          </div>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{
                width: `${
                  ((currentIndex + 1) /
                    questions.length) *
                  100
                }%`,
              }}
            />
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <p className="text-sm font-medium text-red-700">
                {error}
              </p>
            </div>
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
              Question {currentIndex + 1} of{" "}
              {questions.length}
            </p>

            <h2 className="mt-4 text-xl font-bold leading-8 text-slate-900">
              {currentQuestion?.question}
            </h2>

            {isMultiple && (
              <p className="mt-2 text-xs font-medium text-slate-400">
                Select all applicable answers.
              </p>
            )}
          </div>

          {isTrueFalse ? (
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                [true, "True"],
                [false, "False"],
              ].map(([value, label]) => {
                const selected =
                  currentAnswer === value ||
                  String(
                    currentAnswer
                  ) === String(value);

                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      selectTrueFalse(
                        currentQuestion,
                        value
                      )
                    }
                    className={`rounded-xl border p-5 text-left font-semibold transition ${
                      selected
                        ? "border-violet-500 bg-violet-50 text-violet-900"
                        : "border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 space-y-3">
              {currentQuestion?.options
                ?.length ? (
                currentQuestion.options.map(
                  (option, index) => {
                    const selected =
                      isMultiple
                        ? Array.isArray(
                            currentAnswer
                          ) &&
                          currentAnswer.some(
                            (item) =>
                              String(
                                item
                              ) ===
                              String(
                                option.id
                              )
                          )
                        : String(
                            currentAnswer
                          ) ===
                          String(
                            option.id
                          );

                    return (
                      <button
                        key={
                          option.id ??
                          `option-${index}`
                        }
                        type="button"
                        onClick={() =>
                          selectAnswer(
                            currentQuestion,
                            option.id
                          )
                        }
                        className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition ${
                          selected
                            ? "border-violet-500 bg-violet-50"
                            : "border-slate-200 hover:border-violet-300 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                            selected
                              ? "bg-violet-600 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {String.fromCharCode(
                            65 + index
                          )}
                        </span>

                        <span
                          className={`pt-1 text-sm font-medium ${
                            selected
                              ? "text-violet-900"
                              : "text-slate-700"
                          }`}
                        >
                          {option.label}
                        </span>
                      </button>
                    );
                  }
                )
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  This question type does not provide selectable
                  options. Please return to the assessment later.
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() =>
                setCurrentIndex(
                  (index) =>
                    Math.max(
                      0,
                      index - 1
                    )
                )
              }
              disabled={
                currentIndex === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            {currentIndex <
            questions.length - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex(
                    (index) =>
                      Math.min(
                        questions.length - 1,
                        index + 1
                      )
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={
                  submitAssessment
                }
                disabled={
                  submitting ||
                  !allAnswered
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Assessment
                  </>
                )}
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  value,
  label,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <Icon className="h-5 w-5 text-violet-600" />

      <p className="mt-3 text-lg font-bold text-slate-900">
        {value}
      </p>

      <p className="text-sm text-slate-500">
        {label}
      </p>
    </div>
  );
}

export default Assessment;