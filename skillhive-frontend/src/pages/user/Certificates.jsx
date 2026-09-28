import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Calendar,
  CheckCircle2,
  FileBadge,
  Loader2,
  Search,
  ShieldCheck,
  Trophy,
  XCircle,
} from "lucide-react";
import api from "../../api/axios";

function unwrap(response) {
  const data = response?.data;

  if (data?.data !== undefined) {
    return data.data;
  }

  return data;
}

function extractItems(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.certificates)) {
    return data.certificates;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
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

function normalizeCertificate(item) {
  return {
    id:
      item?.id ??
      item?.certificate_id,

    certificateId:
      item?.certificate_id ?? "",

    title:
      item?.title ||
      "SkillHive Certificate",

    userName:
      item?.user_name ||
      "",

    careerGoal:
      item?.career_goal ||
      "",

    issuedAt:
      item?.issued_at ||
      null,

    completionDate:
      item?.completion_date ||
      null,

    assessmentScore:
      item?.assessment_score ??
      null,

    status:
      String(
        item?.status || "issued"
      ).toLowerCase(),
  };
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  ).format(date);
}

function formatScore(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return Number.isInteger(number)
    ? `${number}%`
    : `${number.toFixed(1)}%`;
}

function statusConfig(status) {
  if (status === "revoked") {
    return {
      label: "Revoked",
      className:
        "bg-red-50 text-red-700 border-red-200",
      icon: XCircle,
    };
  }

  return {
    label: "Issued",
    className:
      "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle2,
  };
}

function Certificates() {
  const [certificates, setCertificates] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [generationMessage, setGenerationMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const loadCertificates =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await api.get(
            "/api/certificates/my/"
          );

        const items = extractItems(
          unwrap(response)
        ).map(normalizeCertificate);

        setCertificates(items);
      } catch (err) {
        setError(
          extractError(
            err,
            "Could not load your certificates."
          )
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  const generateCertificate =
    async () => {
      setGenerating(true);
      setError("");
      setGenerationMessage("");

      try {
        const response =
          await api.post(
            "/api/certificates/generate/"
          );

        const data =
          unwrap(response);

        const certificate =
          data?.certificate;

        if (certificate) {
          const normalized =
            normalizeCertificate(
              certificate
            );

          setCertificates(
            (previous) => {
              const exists =
                previous.some(
                  (item) =>
                    item.certificateId ===
                    normalized.certificateId
                );

              if (exists) {
                return previous.map(
                  (item) =>
                    item.certificateId ===
                    normalized.certificateId
                      ? normalized
                      : item
                );
              }

              return [
                normalized,
                ...previous,
              ];
            }
          );
        }

        setGenerationMessage(
          data?.message ||
            "Your certificate is available."
        );
      } catch (err) {
        setGenerationMessage(
          extractError(
            err,
            "Your certificate is not available yet."
          )
        );
      } finally {
        setGenerating(false);
      }
    };

  const filteredCertificates =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return certificates.filter(
        (certificate) => {
          const matchesStatus =
            statusFilter === "all" ||
            certificate.status ===
              statusFilter;

          if (!matchesStatus) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            certificate.title,
            certificate.certificateId,
            certificate.careerGoal,
            certificate.userName,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(query)
            );
        }
      );
    }, [
      certificates,
      search,
      statusFilter,
    ]);

  const issuedCount =
    certificates.filter(
      (certificate) =>
        certificate.status ===
        "issued"
    ).length;

  const revokedCount =
    certificates.filter(
      (certificate) =>
        certificate.status ===
        "revoked"
    ).length;

  const averageScore =
    useMemo(() => {
      const scores =
        certificates
          .filter(
            (certificate) =>
              certificate.status ===
                "issued" &&
              certificate.assessmentScore !==
                null &&
              certificate.assessmentScore !==
                undefined
          )
          .map((certificate) =>
            Number(
              certificate.assessmentScore
            )
          )
          .filter(
            (score) =>
              !Number.isNaN(score)
          );

      if (!scores.length) {
        return null;
      }

      return (
        scores.reduce(
          (total, score) =>
            total + score,
          0
        ) / scores.length
      );
    }, [certificates]);

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl bg-blue-600 shadow-lg">
          <div className="px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  <Award className="h-4 w-4" />
                  Learning achievements
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Your Certificates
                </h1>

                <p className="mt-3 text-sm leading-7 text-blue-100 sm:text-base">
                  Certificates are issued after every required
                  roadmap task has been completed and its
                  assessment has been passed.
                </p>
              </div>

              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white text-blue-600 shadow-sm">
                <FileBadge className="h-10 w-10" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Award}
            label="Total certificates"
            value={certificates.length}
          />

          <StatCard
            icon={CheckCircle2}
            label="Issued"
            value={issuedCount}
          />

          <StatCard
            icon={XCircle}
            label="Revoked"
            value={revokedCount}
          />

          <StatCard
            icon={Trophy}
            label="Average score"
            value={
              averageScore === null
                ? "—"
                : `${averageScore.toFixed(
                    1
                  )}%`
            }
          />
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Certificate generation
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                If all roadmap tasks are completed, the backend
                will issue your certificate.
              </p>
            </div>

            <button
              type="button"
              onClick={
                generateCertificate
              }
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Award className="h-4 w-4" />
                  Generate Certificate
                </>
              )}
            </button>
          </div>

          {generationMessage && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
              {generationMessage}
            </div>
          )}
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div className="flex-1">
                <h2 className="text-sm font-bold text-red-800">
                  Certificates could not be loaded
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={
                    loadCertificates
                  }
                  className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search certificates..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["issued", "Issued"],
                ["revoked", "Revoked"],
              ].map(
                ([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() =>
                      setStatusFilter(
                        value
                      )
                    }
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      statusFilter ===
                      value
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>
        </section>

        <section className="mt-6">
          {loading ? (
            <div className="grid gap-5 md:grid-cols-2">
              {[1, 2, 3, 4].map(
                (item) => (
                  <div
                    key={item}
                    className="h-72 animate-pulse rounded-2xl bg-slate-200"
                  />
                )
              )}
            </div>
          ) : filteredCertificates.length ===
            0 ? (
            <EmptyState
              hasCertificates={
                certificates.length >
                0
              }
              search={search}
              statusFilter={
                statusFilter
              }
              onGenerate={
                generateCertificate
              }
              generating={
                generating
              }
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {filteredCertificates.map(
                (certificate) => (
                  <CertificateCard
                    key={
                      certificate.id ??
                      certificate.certificateId
                    }
                    certificate={
                      certificate
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-blue-600" />

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Certificate verification
              </h2>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                Every issued certificate has a unique certificate
                ID. Anyone can use that ID to verify the certificate
                publicly through SkillHive.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}) {
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

function CertificateCard({
  certificate,
}) {
  const status = statusConfig(
    certificate.status
  );

  const StatusIcon =
    status.icon;

  const score = formatScore(
    certificate.assessmentScore
  );

  const verificationPath =
    certificate.certificateId
      ? `/certificate/${encodeURIComponent(
          certificate.certificateId
        )}`
      : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="bg-blue-600 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
            <Award className="h-7 w-7" />
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${status.className}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />

            {status.label}
          </span>
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-blue-100">
          SkillHive Certificate
        </p>

        <h2 className="mt-2 line-clamp-2 text-xl font-bold text-white">
          {certificate.title}
        </h2>

        {certificate.careerGoal && (
          <p className="mt-2 text-sm text-blue-100">
            {certificate.careerGoal}
          </p>
        )}
      </div>

      <div className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail
            icon={Calendar}
            label="Issued"
            value={formatDate(
              certificate.issuedAt
            )}
          />

          <Detail
            icon={CheckCircle2}
            label="Completed"
            value={formatDate(
              certificate.completionDate
            )}
          />

          {score && (
            <Detail
              icon={Trophy}
              label="Assessment score"
              value={score}
            />
          )}

          <Detail
            icon={ShieldCheck}
            label="Certificate ID"
            value={
              certificate.certificateId ||
              "Not available"
            }
            mono
          />
        </div>

        {verificationPath && (
          <Link
            to={verificationPath}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <ShieldCheck className="h-4 w-4" />
            Verify certificate
          </Link>
        )}
      </div>
    </article>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  mono = false,
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>

      <p
        className={`mt-1 truncate text-sm font-semibold text-slate-800 ${
          mono
            ? "font-mono text-xs"
            : ""
        }`}
        title={String(value)}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  hasCertificates,
  search,
  statusFilter,
  onGenerate,
  generating,
}) {
  const filtered =
    hasCertificates &&
    (search.trim() ||
      statusFilter !== "all");

  if (filtered) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Search className="h-7 w-7" />
        </div>

        <h2 className="mt-5 text-lg font-bold text-slate-900">
          No matching certificates
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Try a different search term or change the certificate
          status filter.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Award className="h-8 w-8" />
      </div>

      <h2 className="mt-5 text-xl font-bold text-slate-900">
        No certificates yet
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Complete every required roadmap task and pass each
        assessment. Once the entire active learning goal is
        complete, SkillHive can issue your certificate.
      </p>

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to="/roadmap"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Trophy className="h-4 w-4" />
          View Roadmap
        </Link>

        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Award className="h-4 w-4" />
          )}
          Check Certificate Eligibility
        </button>
      </div>
    </div>
  );
}

export default Certificates;