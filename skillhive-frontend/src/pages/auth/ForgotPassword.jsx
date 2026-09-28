import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import api from "../../api/axios";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/api/accounts/password-reset/",
        {
          email: normalizedEmail,
        }
      );

      setSubmitted(true);

      toast.success(
        response?.data?.detail ||
          "If an account exists, a reset link has been sent."
      );
    } catch (error) {
 
      const message =
        error?.response?.data?.detail ||
        "We couldn't process the request. Please try again.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
     
          <div className="mb-8 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <BookOpen className="h-5 w-5" />
              </div>

              <span className="text-xl font-bold text-slate-900">
                SkillHive
              </span>
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {!submitted ? (
              <>
              
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Mail className="h-7 w-7" />
                  </div>

                  <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
                    Forgot your password?
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Enter the email associated with your SkillHive
                    account and we'll send you a password reset link.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="mt-8 space-y-5"
                >
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Email address
                    </label>

                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) =>
                          setEmail(event.target.value)
                        }
                        placeholder="you@example.com"
                        disabled={loading}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending reset link...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send reset link
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
             
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                  <CheckCircle2 className="h-7 w-7" />
                </div>

                <h1 className="mt-5 text-2xl font-bold text-slate-900">
                  Check your email
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  If an account exists for{" "}
                  <span className="font-semibold text-slate-700">
                    {email.trim()}
                  </span>
                  , we've sent a password reset link.
                </p>

                <p className="mt-3 text-xs leading-5 text-slate-400">
                  Check your inbox and spam folder. The reset link
                  will take you back to SkillHive.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                  }}
                  className="mt-6 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Try another email
                </button>
              </div>
            )}
          </div>

       
          <Link
            to="/login"
            className="mx-auto mt-6 flex w-fit items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;