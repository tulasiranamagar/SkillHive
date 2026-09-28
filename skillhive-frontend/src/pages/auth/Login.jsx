import { useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../../hooks/useAuth";

function Login() {
  const {
    login,
    isAuthenticated,
    isAdmin,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (!location.state?.passwordReset) {
      return;
    }

    toast.success(
      "Password reset successfully. You can now sign in."
    );

    navigate("/login", {
      replace: true,
      state: {},
    });
  }, [location.state, navigate]);


  useEffect(() => {
    if (!isAuthenticated || loading) {
      return;
    }

    if (isAdmin) {
      navigate("/admin/dashboard", {
        replace: true,
      });

      return;
    }

    const from = location.state?.from?.pathname;

    if (from) {
      navigate(from, {
        replace: true,
      });

      return;
    }

    navigate("/dashboard", {
      replace: true,
    });
  }, [
    isAuthenticated,
    isAdmin,
    loading,
    navigate,
    location.state,
  ]);


  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };


  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.email.trim()) {
      toast.error(
        "Please enter your email address."
      );

      return;
    }

    if (!form.password) {
      toast.error(
        "Please enter your password."
      );

      return;
    }

    setLoading(true);

    try {

      const loggedInUser = await login({
        email: form.email.trim(),
        password: form.password,
      });

      toast.success(
        "Welcome back to SkillHive!"
      );

      const userIsAdmin =
        loggedInUser?.is_admin === true ||
        loggedInUser?.is_staff === true ||
        loggedInUser?.role === "admin" ||
        loggedInUser?.profile?.role === "admin";


      if (userIsAdmin) {
        navigate("/admin/dashboard", {
          replace: true,
        });

        return;
      }


      const from =
        location.state?.from?.pathname;

      if (from) {
        navigate(from, {
          replace: true,
        });

        return;
      }

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        "Unable to sign in. Please check your credentials.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">

          <div className="hidden bg-blue-600 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <ShieldCheck
                  size={25}
                  strokeWidth={2}
                />
              </div>

              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-100">
                Welcome back
              </p>

              <h1 className="max-w-md text-4xl font-bold leading-tight">
                Continue learning.
                <br />
                Continue sharing.
              </h1>

              <p className="mt-5 max-w-md text-base leading-7 text-blue-100">
                Sign in to SkillHive and connect
                with people who can help you
                learn, practice, and exchange
                skills.
              </p>
            </div>

            <div className="flex items-center gap-3 text-sm text-blue-100">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <ShieldCheck size={18} />
              </div>

              Secure account authentication
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 lg:hidden">
                  <ShieldCheck size={22} />
                </div>

                <h2 className="text-2xl font-bold text-slate-900">
                  Sign in to SkillHive
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Enter your account details to
                  continue.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
  
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>


                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Password
                    </label>
                  </div>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={form.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (current) => !current
                        )
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  <div className="mt-2 text-center">
                    <Link
                      to="/forgot-password"
                      className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Signing in..."
                    : "Sign in"}

                  {!loading && (
                    <ArrowRight size={18} />
                  )}
                </button>
              </form>

              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />

                <span className="text-xs text-slate-400">
                  OR
                </span>

                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <p className="text-center text-sm text-slate-500">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-blue-600 hover:text-blue-700"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;