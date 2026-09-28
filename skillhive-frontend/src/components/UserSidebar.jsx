import {
  Bell,
  BookOpen,
  Compass,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  Store,
  Trophy,
  User,
} from "lucide-react";

import {
  Link,
  NavLink,
} from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

const navigation = [
  {
    label: "Explore Skills",
    to: "/explore",
    icon: Compass,
  },
  {
    label: "My Skills",
    to: "/my-skills",
    icon: BookOpen,
  },
  {
    label: "Exchange",
    to: "/exchange",
    icon: Handshake,
  },
  {
    label: "Marketplace",
    to: "/marketplace",
    icon: Store,
  },
  {
    label: "Sessions",
    to: "/my-sessions",
    icon: GraduationCap,
  },
  {
    label: "Goals",
    to: "/goals",
    icon: Trophy,
  },
  {
    label: "Learning",
    to: "/learning",
    icon: BookOpen,
  },
];

const secondaryNavigation = [
  {
    label: "Leaderboard",
    to: "/leaderboard",
    icon: Trophy,
  },
  {
    label: "Notifications",
    to: "/notifications",
    icon: Bell,
  },
  {
    label: "Messages",
    to: "/chat",
    icon: MessageCircle,
  },
];


function getUserInitials(user) {
  if (!user) {
    return "U";
  }

  const name =
    [
      user?.first_name,
      user?.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    user?.name ||
    user?.full_name ||
    user?.username ||
    user?.email ||
    "User";

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase();
}


function UserSidebar({
  collapsed = false,
  onNavigate,
}) {
  const {
    user,
    logout,
    isAdmin,
  } = useAuth();

  const userIsAdmin =
    isAdmin === true ||
    user?.is_admin === true ||
    user?.is_staff === true ||
    user?.role === "admin" ||
    user?.profile?.role === "admin";


  const displayName =
    [
      user?.first_name,
      user?.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    user?.name ||
    user?.full_name ||
    user?.username ||
    "SkillHive User";

  const username = user?.username
    ? `@${user.username}`
    : null;

  const email =
    user?.email ||
    "SkillHive member";

  const initials =
    getUserInitials(user);

  const profilePicture =
    user?.profile?.profile_picture ||
    user?.profile_picture ||
    null;



  const closeSidebar = () => {
    if (onNavigate) {
      onNavigate();
    }
  };


  const handleLogout = () => {
    closeSidebar();
    logout();
  };


  const navLinkClass = ({
    isActive,
  }) =>
    [
      "group flex items-center rounded-xl py-2.5 text-sm font-medium transition",
      collapsed
        ? "justify-center px-2"
        : "gap-3 px-3",
      isActive
        ? "bg-blue-50 text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    ].join(" ");



  const getTitle = (label) =>
    collapsed ? label : undefined;


  const homePath = userIsAdmin
    ? "/admin/dashboard"
    : "/dashboard";


  return (
    <div className="flex h-full w-full flex-col border-r border-slate-200 bg-white">


      <div
        className={[
          "flex h-16 shrink-0 items-center border-b border-slate-200",
          collapsed
            ? "justify-center px-2"
            : "justify-center px-4",
        ].join(" ")}
      >
        <Link
          to={homePath}
          onClick={closeSidebar}
          className={[
            "flex items-center",
            collapsed
              ? "justify-center"
              : "gap-2.5",
          ].join(" ")}
          title={
            collapsed
              ? "SkillHive"
              : undefined
          }
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <BookOpen className="h-5 w-5" />
          </div>

          {!collapsed && (
            <span className="text-lg font-bold text-slate-900">
              SkillHive
            </span>
          )}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">

        {userIsAdmin && (
          <>
            {!collapsed && (
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Administration
              </p>
            )}

            <nav
              className={[
                "space-y-1",
                collapsed
                  ? "mt-1"
                  : "mt-3",
              ].join(" ")}
            >
              <NavLink
                to="/admin/dashboard"
                onClick={closeSidebar}
                className={navLinkClass}
                title={getTitle(
                  "Admin Dashboard"
                )}
              >
                <ShieldCheck className="h-5 w-5 shrink-0" />

                {!collapsed && (
                  <span className="truncate">
                    Admin Dashboard
                  </span>
                )}
              </NavLink>
            </nav>
          </>
        )}

        {!collapsed && (
          <p
            className={[
              "px-3 text-xs font-semibold uppercase tracking-wider text-slate-400",
              userIsAdmin
                ? "mt-8"
                : "",
            ].join(" ")}
          >
            Workspace
          </p>
        )}

        <nav
          className={[
            "space-y-1",
            collapsed
              ? userIsAdmin
                ? "mt-5"
                : "mt-1"
              : "mt-3",
          ].join(" ")}
        >
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeSidebar}
                className={navLinkClass}
                title={getTitle(
                  item.label
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />

                {!collapsed && (
                  <span className="truncate">
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {!collapsed && (
          <p className="mt-8 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Community
          </p>
        )}

        <nav
          className={[
            "space-y-1",
            collapsed
              ? "mt-5"
              : "mt-3",
          ].join(" ")}
        >
          {secondaryNavigation.map(
            (item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeSidebar}
                  className={navLinkClass}
                  title={getTitle(
                    item.label
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />

                  {!collapsed && (
                    <span className="truncate">
                      {item.label}
                    </span>
                  )}
                </NavLink>
              );
            }
          )}
        </nav>

        {!collapsed && (
          <p className="mt-8 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Account
          </p>
        )}

        <nav
          className={[
            "space-y-1",
            collapsed
              ? "mt-5"
              : "mt-3",
          ].join(" ")}
        >

          <NavLink
            to="/profile"
            onClick={closeSidebar}
            className={navLinkClass}
            title={getTitle(
              "Profile"
            )}
          >
            <User className="h-5 w-5 shrink-0" />

            {!collapsed && (
              <span>Profile</span>
            )}
          </NavLink>

          {/* Settings */}

          <NavLink
            to="/settings"
            onClick={closeSidebar}
            className={navLinkClass}
            title={getTitle(
              "Settings"
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />

            {!collapsed && (
              <span>Settings</span>
            )}
          </NavLink>
        </nav>
      </div>


      <div className="shrink-0 border-t border-slate-200 p-3">

        {/* Logged-in user information */}

        {!collapsed && (
          <div className="mb-3 flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {displayName}
              </p>

              <p className="truncate text-xs text-slate-500">
                {username || email}
              </p>
            </div>
          </div>
        )}

        {/* Logout */}

        <button
          type="button"
          onClick={handleLogout}
          className={[
            "flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50",
            collapsed
              ? "justify-center px-2"
              : "gap-3 px-3",
          ].join(" ")}
          title={
            collapsed
              ? "Log out"
              : undefined
          }
        >
          <LogOut className="h-5 w-5 shrink-0" />

          {!collapsed && (
            <span>Log out</span>
          )}
        </button>
      </div>
    </div>
  );
}

export default UserSidebar;

