import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import api from "../../api/axios";

function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const linkIsValid = useMemo(
    () => Boolean(uid && token),
    [uid, token]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!linkIsValid) {
      toast.error("This password reset link is invalid.");
      return;
    }

    if (!form.password || !form.confirmPassword) {
      toast.error("Please enter and confirm your new password.");
      return;
    }

    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/api/accounts/password-reset/confirm/", {
        uid,
        token,
        password: form.password,
        password_confirm: form.confirmPassword,
      });

      setSuccess(true);

      toast.success("Password reset successfully.");

      setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: {
            passwordReset: true,
          },
        });
      }, 1200);
    } catch (error) {
      const responseData = error?.response?.data;

      let message =
        responseData?.detail ||
        responseData?.password?.[0] ||
        responseData?.password_confirm?.[0] ||
        "This reset link is invalid or expired.";

      if (typeof message !== "string") {
        message = "Unable to reset your password.";
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-8 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <BookOpen className="h-5 w-5" />
              </div>

              <span className="text-xl font-bold tracking-tight text-slate-900">
                SkillHive
              </span>
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {success ? (
              /* SUCCESS STATE */
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                  <CheckCircle2 className="h-7 w-7" />
                </div>

                <h1 className="mt-5 text-2xl font-bold text-slate-900">
                  Password reset complete
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Your SkillHive password has been changed successfully.
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Redirecting you to the login page...
                </p>
              </div>
            ) : !linkIsValid ? (
              /* INVALID LINK */
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <KeyRound className="h-7 w-7" />
                </div>

                <h1 className="mt-5 text-2xl font-bold text-slate-900">
                  Invalid reset link
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  This password reset link is missing required
                  information or is no longer valid.
                </p>

                <Link
                  to="/forgot-password"
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Request a new link
                </Link>
              </div>
            ) : (
              /* RESET FORM */
              <>
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Lock className="h-7 w-7" />
                  </div>

                  <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
                    Create a new password
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Choose a strong password for your SkillHive account.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="mt-8 space-y-5"
                >
                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      New password
                    </label>

                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                        placeholder="Enter new password"
                        disabled={loading}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((current) => !current)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      Use at least 8 characters.
                    </p>
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Confirm new password
                    </label>

                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        value={form.confirmPassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                        placeholder="Confirm new password"
                        disabled={loading}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            (current) => !current
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating password...
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        Reset password
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {!success && (
            <Link
              to="/login"
              className="mx-auto mt-6 flex w-fit items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;