import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import api from "../../api/axios";

const normalizeCertificate = (response) => {
  const payload = response?.data;

  if (payload?.data && typeof payload.data === "object") {
    return payload.data;
  }

  if (payload?.certificate && typeof payload.certificate === "object") {
    return payload.certificate;
  }

  if (payload && typeof payload === "object") {
    return payload;
  }

  return null;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

const getUserName = (certificate) =>
  certificate?.user_name ||
  certificate?.user?.name ||
  certificate?.user?.full_name ||
  certificate?.username ||
  certificate?.user?.username ||
  "SkillHive Member";

const getUserUsername = (certificate) =>
  certificate?.username ||
  certificate?.user?.username ||
  "";

function CertificateVerify() {
  const { certificateId } = useParams();

  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const verifyCertificate = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(
          `/api/certificates/verify/${encodeURIComponent(certificateId)}/`
        );

        if (!mounted) return;

        setCertificate(normalizeCertificate(response));
      } catch (err) {
        if (!mounted) return;

        setCertificate(null);

        setError(
          err?.response?.data?.message ||
            err?.response?.data?.detail ||
            "This certificate could not be verified."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (certificateId) {
      verifyCertificate();
    } else {
      setLoading(false);
      setError("No certificate ID was provided.");
    }

    return () => {
      mounted = false;
    };
  }, [certificateId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <section className="bg-blue-600 px-4 py-16 text-white">
          <div className="mx-auto max-w-4xl">
            <div className="h-8 w-72 animate-pulse rounded bg-white/20" />
            <div className="mt-4 h-5 w-96 max-w-full animate-pulse rounded bg-white/20" />
          </div>
        </section>

        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
            <div className="mx-auto h-20 w-20 animate-pulse rounded-full bg-slate-200" />

            <div className="mx-auto mt-6 h-7 w-64 animate-pulse rounded bg-slate-200" />

            <div className="mx-auto mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-slate-200" />

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-slate-50">
        <section className="bg-blue-600 px-4 py-16 text-white sm:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8" />

              <h1 className="text-3xl font-bold sm:text-4xl">
                Certificate Verification
              </h1>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">
              Verify the authenticity and current status of a SkillHive
              certificate.
            </p>
          </div>
        </section>

        <main className="mx-auto flex min-h-[55vh] max-w-4xl items-center px-4 py-12 sm:px-6">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-9 w-9 text-red-600" />
            </div>

            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              Certificate could not be verified
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
              {error ||
                "The certificate ID may be invalid, unavailable, or the certificate may no longer exist."}
            </p>

            {certificateId && (
              <div className="mx-auto mt-6 max-w-md rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Certificate ID
                </p>

                <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                  {certificateId}
                </p>
              </div>
            )}

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to SkillHive
              </Link>

              <Link
                to="/people"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-600"
              >
                Discover people
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const userName = getUserName(certificate);
  const username = getUserUsername(certificate);

  const title =
    certificate?.title ||
    certificate?.certificate_title ||
    certificate?.user_goal_title ||
    certificate?.goal_title ||
    "SkillHive Learning Certificate";

  const status = String(
    certificate?.status || "issued"
  ).toLowerCase();

  const isIssued =
    status === "issued" ||
    status === "active" ||
    status === "valid";

  const isRevoked = status === "revoked";

  const completionDate =
    certificate?.completion_date ||
    certificate?.completed_at ||
    certificate?.user_goal?.completed_at;

  const issuedDate =
    certificate?.issued_at ||
    certificate?.issue_date ||
    certificate?.created_at;

  const score =
    certificate?.assessment_score ??
    certificate?.score ??
    certificate?.final_score;

  const certificateNumber =
    certificate?.certificate_id ||
    certificate?.id ||
    certificateId;

  return (
    <div className="min-h-screen bg-slate-50">
  
      <section className="bg-blue-600 px-4 py-14 text-white sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to SkillHive
          </Link>

          <div className="mt-10 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600">
              <ShieldCheck className="h-7 w-7" />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
                Public verification
              </p>

              <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
                Certificate Verification
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">
                This page confirms the authenticity and current status of a
                SkillHive certificate.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
 
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div
            className={`flex items-center justify-between gap-4 border-b px-6 py-4 sm:px-8 ${
              isRevoked
                ? "border-red-100 bg-red-50"
                : "border-emerald-100 bg-emerald-50"
            }`}
          >
            <div className="flex items-center gap-3">
              {isRevoked ? (
                <XCircle className="h-6 w-6 text-red-600" />
              ) : (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              )}

              <div>
                <p
                  className={`text-sm font-bold ${
                    isRevoked
                      ? "text-red-700"
                      : "text-emerald-700"
                  }`}
                >
                  {isRevoked
                    ? "Certificate revoked"
                    : isIssued
                      ? "Certificate verified"
                      : `Certificate status: ${status}`}
                </p>

                <p
                  className={`mt-0.5 text-xs ${
                    isRevoked
                      ? "text-red-600"
                      : "text-emerald-600"
                  }`}
                >
                  Certificate ID: {certificateNumber}
                </p>
              </div>
            </div>

            <ShieldCheck
              className={`hidden h-6 w-6 sm:block ${
                isRevoked
                  ? "text-red-500"
                  : "text-emerald-500"
              }`}
            />
          </div>

          <div className="p-6 sm:p-10">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                <Award className="h-9 w-9 text-blue-600" />
              </div>

              <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                SkillHive Certificate
              </p>

              <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
                {title}
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                This certificate recognizes the successful completion of a
                SkillHive learning goal and its required learning and
                assessment requirements.
              </p>
            </div>

            <div className="mt-10 rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                  <User className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-500">
                    Awarded to
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {userName}
                  </p>

                  {username && (
                    <p className="mt-0.5 text-sm text-slate-500">
                      @{username}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-blue-600" />

                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Completion date
                  </p>
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-900">
                  {formatDate(completionDate)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />

                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Issued date
                  </p>
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-900">
                  {formatDate(issuedDate)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-5 w-5 text-blue-600" />

                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Assessment score
                  </p>
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-900">
                  {score !== null && score !== undefined
                    ? `${score}%`
                    : "Completed"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-blue-600" />

                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Certificate ID
                  </p>
                </div>

                <p className="mt-3 break-all text-sm font-semibold text-slate-900">
                  {certificateNumber}
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Verification information
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    The certificate information displayed on this page is
                    retrieved directly from SkillHive's certificate
                    verification service. The certificate ID can be used to
                    verify this credential again.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {username && (
                <Link
                  to={`/profile/${encodeURIComponent(username)}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <User className="h-4 w-4" />
                  View profile
                </Link>
              )}

              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-600"
              >
                Explore SkillHive
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-blue-50">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
          </div>

          <h2 className="mt-4 text-base font-bold text-slate-900">
            SkillHive credential verification
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            SkillHive certificates are linked to a unique certificate ID so
            that anyone can independently verify the credential.
          </p>
        </section>
      </main>
    </div>
  );
}

export default CertificateVerify;