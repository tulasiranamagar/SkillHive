import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Moon,
  Save,
  Shield,
  User,
  X,
} from "lucide-react";
import api from "../../api/axios";
import { useAuth } from "../../hooks/useAuth";

function unwrap(response) {
  const data = response?.data;

  if (data?.data !== undefined) {
    return data.data;
  }

  return data;
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

function getUserValue(user, key, fallback = "") {
  if (!user) return fallback;

  return (
    user[key] ??
    user?.profile?.[key] ??
    fallback
  );
}

function formatDeadline(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Settings() {
  const { user, logout } = useAuth();

  const [activeSection, setActiveSection] =
    useState("account");

  const [profileForm, setProfileForm] = useState({
    name: "",
    username: "",
    email: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    learningReminders: true,
    exchangeNotifications: true,
    sessionNotifications: true,
    marketingEmails: false,
  });

  const [deactivatePassword, setDeactivatePassword] =
    useState("");

  const [showDeactivatePassword, setShowDeactivatePassword] =
    useState(false);

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] =
    useState(false);
  const [changingPassword, setChangingPassword] =
    useState(false);
  const [savingPreferences, setSavingPreferences] =
    useState(false);
  const [deactivatingAccount, setDeactivatingAccount] =
    useState(false);

  const [showDeactivateConfirm, setShowDeactivateConfirm] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      setError("");

      try {
        let account = user;

        try {
          const response = await api.get(
            "/api/accounts/me/"
          );

          account = unwrap(response);
        } catch {
          // Use AuthContext user if the profile endpoint is unavailable.
        }

        setProfileForm({
          name:
            getUserValue(account, "name") ||
            getUserValue(account, "full_name"),
          username: getUserValue(
            account,
            "username"
          ),
          email: getUserValue(account, "email"),
        });

        try {
          const response = await api.get(
            "/api/accounts/preferences/"
          );

          const data = unwrap(response);

          setPreferences((current) => ({
            ...current,
            ...(data || {}),
          }));
        } catch {
          // Preferences are optional until the backend endpoint exists.
        }
      } catch (requestError) {
        setError(
          extractError(
            requestError,
            "Could not load your settings."
          )
        );
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [user]);

  function updateProfileField(field, value) {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updatePasswordField(field, value) {
    setPasswordForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updatePreference(field, value) {
    setPreferences((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function showSuccess(message) {
    setSuccess(message);
    setError("");

    window.setTimeout(() => {
      setSuccess("");
    }, 3500);
  }

  async function saveProfile(event) {
    event.preventDefault();

    setSavingProfile(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: profileForm.name.trim(),
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
      };

      let response;

      try {
        response = await api.patch(
          "/api/accounts/me/",
          payload
        );
      } catch {
        response = await api.put(
          "/api/accounts/me/",
          payload
        );
      }

      unwrap(response);

      showSuccess(
        "Your account information was updated."
      );
    } catch (requestError) {
      setError(
        extractError(
          requestError,
          "Could not update your account information."
        )
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setError("Please complete all password fields.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError(
        "Your new password must contain at least 8 characters."
      );
      return;
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setError("The new passwords do not match.");
      return;
    }

    setChangingPassword(true);

    try {
      const payload = {
        current_password:
          passwordForm.currentPassword,
        new_password:
          passwordForm.newPassword,
        confirm_password:
          passwordForm.confirmPassword,
      };

      let response;

      try {
        response = await api.post(
          "/api/accounts/change-password/",
          payload
        );
      } catch {
        response = await api.post(
          "/api/accounts/password/change/",
          payload
        );
      }

      unwrap(response);

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      showSuccess(
        "Your password has been changed."
      );
    } catch (requestError) {
      setError(
        extractError(
          requestError,
          "Could not change your password."
        )
      );
    } finally {
      setChangingPassword(false);
    }
  }

  async function savePreferences(event) {
    event.preventDefault();

    setSavingPreferences(true);
    setError("");
    setSuccess("");

    try {
      let response;

      try {
        response = await api.patch(
          "/api/accounts/preferences/",
          preferences
        );
      } catch {
        response = await api.put(
          "/api/accounts/preferences/",
          preferences
        );
      }

      unwrap(response);

      showSuccess(
        "Notification preferences saved."
      );
    } catch (requestError) {
      setError(
        extractError(
          requestError,
          "Could not save your notification preferences."
        )
      );
    } finally {
      setSavingPreferences(false);
    }
  }

  async function handleDeactivateAccount() {
    if (!deactivatePassword) {
      setError(
        "Please enter your current password to deactivate your account."
      );
      setShowDeactivateConfirm(false);
      return;
    }

    setDeactivatingAccount(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        "/api/accounts/deactivate/",
        {
          current_password: deactivatePassword,
        }
      );

      const data = unwrap(response);

      const deadline =
        data?.reactivation_deadline ||
        data?.deactivation_deadline ||
        null;

      setShowDeactivateConfirm(false);
      setDeactivatePassword("");

      try {
        await logout();
      } catch {
        logout();
      }

      try {
        sessionStorage.setItem(
          "skillhive_deactivation_message",
          deadline
            ? `Your account has been deactivated. You can reactivate it by logging in before ${formatDeadline(
                deadline
              )}.`
            : "Your account has been deactivated. You can reactivate it by logging in within 30 days."
        );
      } catch {
        // Ignore storage errors.
      }

      window.location.href = "/login";
    } catch (requestError) {
      setError(
        extractError(
          requestError,
          "Could not deactivate your account."
        )
      );

      setShowDeactivateConfirm(false);
    } finally {
      setDeactivatingAccount(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      logout();
    }
  }

  const sections = [
    {
      id: "account",
      label: "Account",
      description: "Your basic account information",
      icon: User,
    },
    {
      id: "security",
      label: "Security",
      description: "Password and account security",
      icon: Shield,
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Control your SkillHive updates",
      icon: Bell,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-44 rounded-3xl bg-slate-200" />

            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <div className="h-80 rounded-2xl bg-slate-200" />
              <div className="h-[500px] rounded-2xl bg-slate-200" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
   
        <section className="overflow-hidden rounded-3xl bg-blue-600 shadow-lg">
          <div className="px-6 py-8 sm:px-8 lg:px-10 lg:py-9">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                  <Shield className="h-3.5 w-3.5" />
                  Account settings
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Settings
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
                  Manage your account details, security,
                  notification preferences, and account status
                  from one place.
                </p>
              </div>

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                <KeyRound className="h-8 w-8" />
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <X className="mt-0.5 h-5 w-5 shrink-0" />

            <p className="flex-1">{error}</p>

            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-lg p-1 hover:bg-red-100"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
              <Check className="h-4 w-4" />
            </div>

            <p className="flex-1">{success}</p>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="rounded-lg p-1 hover:bg-green-100"
              aria-label="Dismiss success message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {sections.map((section) => {
              const Icon = section.icon;
              const active =
                activeSection === section.id;

              return (
                <button
                  type="button"
                  key={section.id}
                  onClick={() =>
                    setActiveSection(section.id)
                  }
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      active
                        ? "bg-white/15 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        active
                          ? "text-white"
                          : "text-slate-800"
                      }`}
                    >
                      {section.label}
                    </p>

                    <p
                      className={`mt-0.5 text-[11px] leading-4 ${
                        active
                          ? "text-blue-100"
                          : "text-slate-400"
                      }`}
                    >
                      {section.description}
                    </p>
                  </div>
                </button>
              );
            })}

            <div className="my-2 border-t border-slate-100" />

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-red-600 hover:bg-red-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <LogOut className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Sign out
                </p>

                <p className="mt-0.5 text-[11px] text-red-400">
                  Leave your SkillHive account
                </p>
              </div>
            </button>
          </aside>

   
          <section className="min-w-0">
            {activeSection === "account" && (
              <div className="space-y-6">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <h2 className="text-lg font-bold text-slate-900">
                      Account information
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Update the basic information associated
                      with your SkillHive account.
                    </p>
                  </div>

                  <form
                    onSubmit={saveProfile}
                    className="space-y-6 p-6"
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="settings-name"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Full name
                        </label>

                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                          <input
                            id="settings-name"
                            type="text"
                            value={profileForm.name}
                            onChange={(event) =>
                              updateProfileField(
                                "name",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            placeholder="Your name"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="settings-username"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Username
                        </label>

                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                          <input
                            id="settings-username"
                            type="text"
                            value={profileForm.username}
                            onChange={(event) =>
                              updateProfileField(
                                "username",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            placeholder="username"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="settings-email"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Email address
                        </label>

                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                          <input
                            id="settings-email"
                            type="email"
                            value={profileForm.email}
                            onChange={(event) =>
                              updateProfileField(
                                "email",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            placeholder="you@example.com"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <div className="flex items-start gap-3">
                        <Globe className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Profile information
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Your public profile, skills, interests,
                            social links, and other profile details
                            can be managed from your Profile page.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end border-t border-slate-100 pt-5">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingProfile ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
                  <div className="border-b border-red-100 bg-red-50 px-6 py-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-red-900">
                          Deactivate account
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-red-700">
                          Temporarily deactivate your SkillHive
                          account. You will have 30 days to log in
                          and automatically reactivate it.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="space-y-2 text-sm text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-800">
                            What happens after deactivation?
                          </span>
                        </p>

                        <ul className="list-disc space-y-1.5 pl-5 text-xs leading-5">
                          <li>
                            Your account is immediately
                            deactivated.
                          </li>

                          <li>
                            SkillHive will send a confirmation
                            email to your registered Gmail address.
                          </li>

                          <li>
                            The email contains a login link for
                            returning to your account.
                          </li>

                          <li>
                            Logging in within 30 days automatically
                            reactivates your account.
                          </li>

                          <li>
                            After 30 days, the account becomes
                            permanently deactivated and can no
                            longer be reactivated or used to log in.
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="mt-5">
                      <label
                        htmlFor="deactivate-password"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Current password
                      </label>

                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          id="deactivate-password"
                          type={
                            showDeactivatePassword
                              ? "text"
                              : "password"
                          }
                          value={deactivatePassword}
                          onChange={(event) =>
                            setDeactivatePassword(
                              event.target.value
                            )
                          }
                          placeholder="Enter your current password"
                          autoComplete="current-password"
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowDeactivatePassword(
                              (current) => !current
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          aria-label={
                            showDeactivatePassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showDeactivatePassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end border-t border-slate-100 pt-5">
                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          setSuccess("");

                          if (!deactivatePassword) {
                            setError(
                              "Please enter your current password before continuing."
                            );
                            return;
                          }

                          setShowDeactivateConfirm(true);
                        }}
                        disabled={deactivatingAccount}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Lock className="h-4 w-4" />
                        Deactivate account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "security" && (
              <div className="space-y-6">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <h2 className="text-lg font-bold text-slate-900">
                      Change password
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Use a strong password that you do not reuse
                      on other services.
                    </p>
                  </div>

                  <form
                    onSubmit={changePassword}
                    className="space-y-5 p-6"
                  >
                    <div>
                      <label
                        htmlFor="current-password"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Current password
                      </label>

                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          id="current-password"
                          type={
                            showCurrentPassword
                              ? "text"
                              : "password"
                          }
                          value={
                            passwordForm.currentPassword
                          }
                          onChange={(event) =>
                            updatePasswordField(
                              "currentPassword",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          autoComplete="current-password"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowCurrentPassword(
                              (current) => !current
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          aria-label={
                            showCurrentPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="new-password"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        New password
                      </label>

                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          id="new-password"
                          type={
                            showNewPassword
                              ? "text"
                              : "password"
                          }
                          value={
                            passwordForm.newPassword
                          }
                          onChange={(event) =>
                            updatePasswordField(
                              "newPassword",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          autoComplete="new-password"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowNewPassword(
                              (current) => !current
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          aria-label={
                            showNewPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        Minimum 8 characters.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="confirm-password"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Confirm new password
                      </label>

                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          id="confirm-password"
                          type={
                            showConfirmPassword
                              ? "text"
                              : "password"
                          }
                          value={
                            passwordForm.confirmPassword
                          }
                          onChange={(event) =>
                            updatePasswordField(
                              "confirmPassword",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          autoComplete="new-password"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(
                              (current) => !current
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          aria-label={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end border-t border-slate-100 pt-5">
                      <button
                        type="submit"
                        disabled={changingPassword}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {changingPassword ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <KeyRound className="h-4 w-4" />
                            Change password
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <div className="flex items-start gap-3">
                    <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Keep your account secure
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Never share your password or authentication
                        tokens with another person. SkillHive will
                        not ask you to send your password through
                        chat or email.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "notifications" && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5">
                  <h2 className="text-lg font-bold text-slate-900">
                    Notification preferences
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Choose which types of updates you want to
                    receive.
                  </p>
                </div>

                <form
                  onSubmit={savePreferences}
                  className="p-6"
                >
                  <div className="divide-y divide-slate-100">
                    {[
                      {
                        key: "emailNotifications",
                        title: "Email notifications",
                        description:
                          "Receive important SkillHive notifications by email.",
                      },
                      {
                        key: "learningReminders",
                        title: "Learning reminders",
                        description:
                          "Receive reminders about roadmap tasks and learning activity.",
                      },
                      {
                        key: "exchangeNotifications",
                        title: "Skill exchange updates",
                        description:
                          "Get notified about requests, acceptances, rejections, and exchange activity.",
                      },
                      {
                        key: "sessionNotifications",
                        title: "Session updates",
                        description:
                          "Receive updates about scheduled sessions and session activity.",
                      },
                      {
                        key: "marketingEmails",
                        title: "Product updates",
                        description:
                          "Receive optional information about SkillHive features and improvements.",
                      },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex cursor-pointer items-center justify-between gap-5 py-5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Bell className="h-4 w-4" />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {item.title}
                            </p>

                            <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={Boolean(
                            preferences[item.key]
                          )}
                          onChange={(event) =>
                            updatePreference(
                              item.key,
                              event.target.checked
                            )
                          }
                          className="h-5 w-5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Important account notifications
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Some security and account-related
                          notifications may still be sent when they
                          are necessary to protect your account or
                          provide an important service update.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-slate-100 pt-5">
                    <button
                      type="submit"
                      disabled={savingPreferences}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingPreferences ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save preferences
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

      
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Moon className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Interface preferences
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    SkillHive currently uses a consistent light
                    interface across the platform so navigation and
                    accessibility remain predictable.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {showDeactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deactivate-account-title"
          >
            <div className="border-b border-red-100 bg-red-50 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                  <h2
                    id="deactivate-account-title"
                    className="text-lg font-bold text-red-900"
                  >
                    Deactivate your account?
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-red-700">
                    This will immediately deactivate your
                    SkillHive account.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <p className="text-sm leading-6 text-slate-600">
                You will have <strong>30 days</strong> to return
                by logging in. Logging in during this period will
                automatically reactivate your account.
              </p>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold leading-5 text-amber-800">
                  After 30 days, your account will be permanently
                  deactivated and you will no longer be able to log
                  in or reactivate it.
                </p>
              </div>

              <p className="text-sm leading-6 text-slate-500">
                A confirmation email with a login link will be sent
                to your registered email address.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setShowDeactivateConfirm(false);
                  setDeactivatePassword("");
                }}
                disabled={deactivatingAccount}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Keep account
              </button>

              <button
                type="button"
                onClick={handleDeactivateAccount}
                disabled={deactivatingAccount}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deactivatingAccount ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Deactivating...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Deactivate account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;