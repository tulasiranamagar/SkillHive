import { useState } from "react";
import {
  Activity,
  Bell,
  FileWarning,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const navigation = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Users",
    path: "/admin/users",
    icon: Users,
  },
  {
    label: "Reports",
    path: "/admin/reports",
    icon: FileWarning,
  },
  {
    label: "Verification",
    path: "/admin/verifications",
    icon: ShieldCheck,
  },
  {
    label: "Contact Messages",
    path: "/admin/contact-messages",
    icon: Mail,
  },
  {
    label: "Activity",
    path: "/admin/activity",
    icon: Activity,
  },
  {
    label: "Notifications",
    path: "/admin/notifications",
    icon: Bell,
  },
];

function getUserInitials(user) {
  const firstName = user?.first_name?.trim() || "";
  const lastName = user?.last_name?.trim() || "";

  if (firstName || lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  const name =
    user?.full_name?.trim() ||
    user?.username?.trim() ||
    user?.email?.trim() ||
    "A";

  const parts = name.split(/\s+/);

  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }

  return name.charAt(0).toUpperCase();
}

function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-3"
            onClick={closeMobileMenu}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-base font-bold text-slate-900">
                SkillHive
              </p>

              <p className="text-xs font-medium text-blue-600">
                Administration
              </p>
            </div>
          </Link>

          {/* Desktop User */}
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() =>
                setProfileOpen((value) => !value)
              }
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-slate-100"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {getUserInitials(user)}
              </div>

              <div className="hidden text-left lg:block">
                <p className="max-w-[180px] truncate text-sm font-semibold text-slate-900">
                  {user?.full_name ||
                    user?.username ||
                    user?.email ||
                    "Administrator"}
                </p>

                <p className="text-xs text-slate-500">
                  SkillHive Admin
                </p>
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="border-b border-slate-100 px-3 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {user?.full_name ||
                      user?.username ||
                      "Administrator"}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {user?.email || ""}
                  </p>
                </div>

                <Link
                  to={`/profile/${user?.username || ""}`}
                  onClick={() => setProfileOpen(false)}
                  className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <User className="h-4 w-4" />
                  View Profile
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen((value) => !value)
            }
            className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
            aria-label="Toggle admin navigation"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden border-t border-slate-100 md:block">
          <div className="mx-auto flex max-w-[1600px] items-center gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <nav className="space-y-1 p-4">
              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`h-5 w-5 ${
                            isActive
                              ? "text-blue-600"
                              : "text-slate-400"
                          }`}
                        />

                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}

              <div className="mt-4 border-t border-slate-100 pt-4">
                <Link
                  to={`/profile/${user?.username || ""}`}
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-50"
                >
                  <User className="h-5 w-5" />
                  View Profile
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-600 transition hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto min-h-[calc(100vh-65px)] max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;