import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Info,
  Loader2,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";

const ACCESS_TYPES = [
  {
    value: "free",
    label: "Free",
    description:
      "Anyone eligible can join without payment.",
    icon: CheckCircle2,
  },
  {
    value: "money",
    label: "Money",
    description:
      "Participants pay the configured monetary price.",
    icon: DollarSign,
  },
  {
    value: "xp",
    label: "XP",
    description:
      "Participants spend SkillHive XP to join.",
    icon: Zap,
  },
  {
    value: "money_or_xp",
    label: "Money or XP",
    description:
      "Participants can use either available option.",
    icon: DollarSign,
  },
];

function unwrap(response) {
  const data = response?.data;

  if (data?.data !== undefined) {
    return data.data;
  }

  return data;
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

  const firstValue = Object.values(data)[0];

  if (Array.isArray(firstValue) && firstValue.length) {
    return String(firstValue[0]);
  }

  if (typeof firstValue === "string") {
    return firstValue;
  }

  return fallback;
}

function formatDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (number) =>
    String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function getMinimumDateTime() {
  const date = new Date(
    Date.now() + 10 * 60 * 1000
  );

  return formatDateTimeLocal(date);
}

function SessionCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    skill_name: "",
    session_type: "one_to_one",
    access_type: "free",
    price: "",
    xp_unlock_cost: "",
    max_participants: "1",
    scheduled_at: getMinimumDateTime(),
    duration_minutes: "60",
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] =
    useState("");
  const [submitting, setSubmitting] =
    useState(false);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: "",
    }));

    setSubmitError("");
  }

  function handleSessionTypeChange(value) {
    setForm((current) => ({
      ...current,
      session_type: value,
      max_participants:
        value === "one_to_one"
          ? "1"
          : Math.max(
              Number(current.max_participants) || 2,
              2
            ).toString(),
    }));

    setErrors((current) => ({
      ...current,
      session_type: "",
      max_participants: "",
    }));
  }

  function handleAccessTypeChange(value) {
    setForm((current) => ({
      ...current,
      access_type: value,
      price:
        value === "money" ||
        value === "money_or_xp"
          ? current.price
          : "",
      xp_unlock_cost:
        value === "xp" ||
        value === "money_or_xp"
          ? current.xp_unlock_cost
          : "",
    }));

    setErrors((current) => ({
      ...current,
      access_type: "",
      price: "",
      xp_unlock_cost: "",
    }));
  }

  function validate() {
    const nextErrors = {};

    const title = form.title.trim();
    const description =
      form.description.trim();
    const skillName =
      form.skill_name.trim();

    if (!title) {
      nextErrors.title =
        "Session title is required.";
    } else if (title.length < 5) {
      nextErrors.title =
        "Session title must be at least 5 characters.";
    }

    if (!description) {
      nextErrors.description =
        "Please describe what participants will learn.";
    }

    if (!skillName) {
      nextErrors.skill_name =
        "Enter the skill covered by this session.";
    } else if (skillName.length < 2) {
      nextErrors.skill_name =
        "Skill name must be at least 2 characters.";
    } else if (skillName.length > 150) {
      nextErrors.skill_name =
        "Skill name cannot exceed 150 characters.";
    }

    if (!form.scheduled_at) {
      nextErrors.scheduled_at =
        "Choose a session date and time.";
    } else {
      const scheduledDate = new Date(
        form.scheduled_at
      );

      if (
        Number.isNaN(scheduledDate.getTime())
      ) {
        nextErrors.scheduled_at =
          "Enter a valid date and time.";
      } else if (
        scheduledDate.getTime() <= Date.now()
      ) {
        nextErrors.scheduled_at =
          "Session must be scheduled in the future.";
      }
    }

    const duration = Number(
      form.duration_minutes
    );

    if (
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 480
    ) {
      nextErrors.duration_minutes =
        "Duration must be between 1 and 480 minutes.";
    }

    const maxParticipants = Number(
      form.max_participants
    );

    if (
      !Number.isInteger(maxParticipants) ||
      maxParticipants < 1 ||
      maxParticipants > 100
    ) {
      nextErrors.max_participants =
        "Participant limit must be between 1 and 100.";
    }

    if (
      form.session_type === "one_to_one" &&
      maxParticipants !== 1
    ) {
      nextErrors.max_participants =
        "A one-to-one session can only have one participant.";
    }

    if (
      form.session_type === "group" &&
      maxParticipants < 2
    ) {
      nextErrors.max_participants =
        "Group sessions must allow at least 2 participants.";
    }

    if (
      form.access_type === "money" ||
      form.access_type === "money_or_xp"
    ) {
      const price = Number(form.price);

      if (
        !Number.isFinite(price) ||
        price <= 0
      ) {
        nextErrors.price =
          "Enter a valid monetary price.";
      }
    }

    if (
      form.access_type === "xp" ||
      form.access_type === "money_or_xp"
    ) {
      const xpCost = Number(
        form.xp_unlock_cost
      );

      if (
        !Number.isInteger(xpCost) ||
        xpCost <= 0
      ) {
        nextErrors.xp_unlock_cost =
          "Enter a valid XP unlock cost.";
      }
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      skill_name: form.skill_name.trim(),
      session_type: form.session_type,
      access_type: form.access_type,
      scheduled_at: new Date(
        form.scheduled_at
      ).toISOString(),
      duration_minutes: Number(
        form.duration_minutes
      ),
      max_participants: Number(
        form.max_participants
      ),
    };

    if (
      form.access_type === "money" ||
      form.access_type === "money_or_xp"
    ) {
      payload.price = Number(form.price);
    }

    if (
      form.access_type === "xp" ||
      form.access_type === "money_or_xp"
    ) {
      payload.xp_unlock_cost = Number(
        form.xp_unlock_cost
      );
    }

    const endpoints = [
      "/api/skill-sessions/",
      "/api/skill-sessions/create/",
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const response = await api.post(
          endpoint,
          payload
        );

        const data = unwrap(response);

        const session =
          data?.session ??
          data?.data ??
          data;

        const sessionId =
          session?.id ??
          data?.id;

        if (sessionId) {
          navigate(
            `/sessions/${sessionId}`
          );
        } else {
          navigate("/sessions/my");
        }

        return;
      } catch (error) {
        lastError = error;
      }
    }

    setSubmitError(
      extractError(
        lastError,
        "Could not create the session."
      )
    );

    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            to="/sessions/my"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to my sessions
          </Link>
        </div>

        <section className="overflow-hidden rounded-3xl bg-blue-600 shadow-sm">
          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white">
              <Video className="h-6 w-6" />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-white sm:text-3xl">
              Create a Learning Session
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
              Share your skill through a structured
              one-to-one or group learning session.
              The session room is created automatically
              when your session is created.
            </p>
          </div>
        </section>

        {submitError && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <X className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <p className="text-sm font-medium text-red-700">
                {submitError}
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-6"
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                Session information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Tell participants what this session is about.
              </p>
            </div>

            <div className="space-y-5">
              <Field
                label="Session title"
                required
                error={errors.title}
              >
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    updateField(
                      "title",
                      event.target.value
                    )
                  }
                  placeholder="e.g. Learn React Component Design"
                  maxLength={150}
                  className={inputClass(
                    errors.title
                  )}
                />
              </Field>

              <Field
                label="Description"
                required
                error={errors.description}
              >
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Explain what participants will learn, what they should know beforehand, and what they can expect."
                  rows={5}
                  maxLength={2000}
                  className={`${inputClass(
                    errors.description
                  )} resize-y`}
                />

                <p className="mt-1 text-right text-[11px] text-slate-400">
                  {form.description.length}/2000
                </p>
              </Field>

              <Field
                label="Skill"
                required
                error={errors.skill_name}
              >
                <input
                  type="text"
                  value={form.skill_name}
                  onChange={(event) =>
                    updateField(
                      "skill_name",
                      event.target.value
                    )
                  }
                  placeholder="e.g. React, Python, UI/UX Design, Excel"
                  maxLength={150}
                  className={inputClass(
                    errors.skill_name
                  )}
                />

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Enter the skill you want to share.
                  You can add any skill yourself; it does
                  not have to exist in SkillHive's skill list.
                </p>
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                Session format
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Choose how people will participate.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ChoiceCard
                selected={
                  form.session_type ===
                  "one_to_one"
                }
                icon={Users}
                title="One-to-one"
                description="A private learning session between you and one participant."
                onClick={() =>
                  handleSessionTypeChange(
                    "one_to_one"
                  )
                }
              />

              <ChoiceCard
                selected={
                  form.session_type === "group"
                }
                icon={Users}
                title="Group session"
                description="Allow multiple participants to learn together."
                onClick={() =>
                  handleSessionTypeChange(
                    "group"
                  )
                }
              />
            </div>

            {errors.session_type && (
              <p className="mt-2 text-xs text-red-600">
                {errors.session_type}
              </p>
            )}

            <div className="mt-5">
              <Field
                label="Maximum participants"
                required
                error={
                  errors.max_participants
                }
              >
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={
                    form.max_participants
                  }
                  disabled={
                    form.session_type ===
                    "one_to_one"
                  }
                  onChange={(event) =>
                    updateField(
                      "max_participants",
                      event.target.value
                    )
                  }
                  className={inputClass(
                    errors.max_participants
                  )}
                />

                <p className="mt-1 text-xs text-slate-400">
                  {form.session_type ===
                  "one_to_one"
                    ? "One-to-one sessions are limited to one participant."
                    : "Choose how many participants can join the session."}
                </p>
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                Schedule
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Set when the live learning session will take place.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Date and time"
                required
                error={errors.scheduled_at}
              >
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="datetime-local"
                    min={getMinimumDateTime()}
                    value={
                      form.scheduled_at
                    }
                    onChange={(event) =>
                      updateField(
                        "scheduled_at",
                        event.target.value
                      )
                    }
                    className={`${inputClass(
                      errors.scheduled_at
                    )} pl-10`}
                  />
                </div>
              </Field>

              <Field
                label="Duration"
                required
                error={
                  errors.duration_minutes
                }
              >
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="number"
                    min="1"
                    max="480"
                    value={
                      form.duration_minutes
                    }
                    onChange={(event) =>
                      updateField(
                        "duration_minutes",
                        event.target.value
                      )
                    }
                    className={`${inputClass(
                      errors.duration_minutes
                    )} pl-10`}
                  />
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  Maximum session duration: 480 minutes.
                </p>
              </Field>
            </div>

            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Session room access
                  </p>

                  <ul className="mt-2 space-y-1.5 text-xs leading-5 text-blue-700">
                    <li>
                      • Your meeting room is created
                      when the session is created.
                    </li>

                    <li>
                      • As the host, you can enter
                      the room anytime.
                    </li>

                    <li>
                      • Participants can access the
                      meeting link starting 10 minutes
                      before the scheduled time.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                Session access
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Choose how participants can unlock this session.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {ACCESS_TYPES.map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      handleAccessTypeChange(
                        option.value
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      form.access_type ===
                      option.value
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                        : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          form.access_type ===
                          option.value
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {option.label}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {errors.access_type && (
              <p className="mt-2 text-xs text-red-600">
                {errors.access_type}
              </p>
            )}

            {(form.access_type ===
              "money" ||
              form.access_type ===
                "money_or_xp") && (
              <div className="mt-5">
                <Field
                  label="Money price"
                  required
                  error={errors.price}
                >
                  <div className="relative">
                    <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(event) =>
                        updateField(
                          "price",
                          event.target.value
                        )
                      }
                      placeholder="Enter price"
                      className={`${inputClass(
                        errors.price
                      )} pl-10`}
                    />
                  </div>

                  <p className="mt-1 text-xs text-slate-400">
                    Enter the monetary amount participants
                    must pay to unlock the session.
                  </p>
                </Field>
              </div>
            )}

            {(form.access_type ===
              "xp" ||
              form.access_type ===
                "money_or_xp") && (
              <div className="mt-5">
                <Field
                  label="XP unlock cost"
                  required
                  error={
                    errors.xp_unlock_cost
                  }
                >
                  <div className="relative">
                    <Zap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={
                        form.xp_unlock_cost
                      }
                      onChange={(event) =>
                        updateField(
                          "xp_unlock_cost",
                          event.target.value
                        )
                      }
                      placeholder="Enter XP cost"
                      className={`${inputClass(
                        errors.xp_unlock_cost
                      )} pl-10`}
                    />
                  </div>

                  <p className="mt-1 text-xs text-slate-400">
                    Participants spend their own SkillHive XP.
                    Creators cannot award XP.
                  </p>
                </Field>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-blue-900">
                  Session summary
                </h2>

                <div className="mt-3 grid gap-2 text-xs text-blue-800 sm:grid-cols-2">
                  <p>
                    <span className="font-semibold">
                      Skill:
                    </span>{" "}
                    {form.skill_name.trim() ||
                      "Not entered"}
                  </p>

                  <p>
                    <span className="font-semibold">
                      Format:
                    </span>{" "}
                    {form.session_type ===
                    "one_to_one"
                      ? "One-to-one"
                      : "Group"}
                  </p>

                  <p>
                    <span className="font-semibold">
                      Duration:
                    </span>{" "}
                    {form.duration_minutes ||
                      "—"}{" "}
                    minutes
                  </p>

                  <p>
                    <span className="font-semibold">
                      Access:
                    </span>{" "}
                    {ACCESS_TYPES.find(
                      (item) =>
                        item.value ===
                        form.access_type
                    )?.label ||
                      "Free"}
                  </p>
                </div>

                <div className="mt-4 rounded-xl border border-blue-200 bg-white/70 p-3 text-xs leading-5 text-blue-800">
                  <strong>
                    Room access:
                  </strong>{" "}
                  You can enter your host room anytime.
                  Participants will receive access to the
                  meeting link 10 minutes before the scheduled
                  start.
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              to="/sessions/my"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating session...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  Create session
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  required = false,
  error,
  children,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(error) {
  return `w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${
    error
      ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
  }`;
}

function ChoiceCard({
  selected,
  icon: Icon,
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition ${
        selected
          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
          : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            selected
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              {title}
            </h3>

            {selected && (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            )}
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

export default SessionCreate;