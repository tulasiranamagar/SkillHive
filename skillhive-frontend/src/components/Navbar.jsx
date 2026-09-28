import {
  Menu,
  X,
  User,
  LayoutDashboard,
  ShieldCheck,
  Compass,
  BookOpen,
  Handshake,
  Store,
  GraduationCap,
  LogIn,
  Info,
  Mail,
} from "lucide-react";

import {
  Link,
  NavLink,
} from "react-router-dom";

import { useState } from "react";

import { useAuth } from "../hooks/useAuth";

const publicNavigation = [
  {
    label: "Explore",
    to: "/explore",
    icon: Compass,
  },
  {
    label: "Skills",
    to: "/skills",
    icon: BookOpen,
  },
  {
    label: "Marketplace",
    to: "/marketplace",
    icon: Store,
  },
  {
    label: "About Us",
    to: "/about",
    icon: Info,
  },
  {
    label: "Contact Us",
    to: "/contact",
    icon: Mail,
  },
];


function Navbar() {
  const {
    isAuthenticated,
    isAdmin,
  } = useAuth();

  const [mobileOpen, setMobileOpen] =
    useState(false);


  const closeMobileMenu = () => {
    setMobileOpen(false);
  };


  const publicNavLinkClass = ({
    isActive,
  }) =>
    [
      "relative inline-flex items-center gap-1.5 text-sm font-medium transition",
      isActive
        ? "text-blue-600"
        : "text-slate-600 hover:text-blue-600",
    ].join(" ");


  const mobileNavLinkClass = ({
    isActive,
  }) =>
    [
      "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
      isActive
        ? "bg-blue-50 text-blue-600"
        : "text-slate-700 hover:bg-slate-50 hover:text-blue-600",
    ].join(" ");



  const exchangePath = isAuthenticated
    ? "/exchange"
    : "/login";


  const sessionsPath = isAuthenticated
    ? "/sessions"
    : "/login";


  const renderExchangeLink = ({
    mobile = false,
  } = {}) => {
    if (mobile) {
      return (
        <Link
          to={exchangePath}
          onClick={closeMobileMenu}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-blue-600"
        >
          <Handshake className="h-5 w-5 shrink-0" />

          <span>
            Exchange
          </span>
        </Link>
      );
    }

    return (
      <Link
        to={exchangePath}
        className="relative inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-blue-600"
      >
        Exchange
      </Link>
    );
  };


  const renderSessionsLink = ({
    mobile = false,
  } = {}) => {
    if (mobile) {
      return (
        <Link
          to={sessionsPath}
          onClick={closeMobileMenu}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-blue-600"
        >
          <GraduationCap className="h-5 w-5 shrink-0" />

          <span>
            Sessions
          </span>
        </Link>
      );
    }

    return (
      <Link
        to={sessionsPath}
        className="relative inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-blue-600"
      >
        Sessions
      </Link>
    );
  };


  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">


        <div className="flex h-16 items-center justify-between">


          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>

            <span className="text-xl font-bold tracking-tight text-slate-900">
              SkillHive
            </span>
          </Link>


          <nav className="hidden items-center gap-7 lg:flex">

          
            <NavLink
              to="/explore"
              className={publicNavLinkClass}
            >
              Explore
            </NavLink>

            <NavLink
              to="/skills"
              className={publicNavLinkClass}
            >
              Skills
            </NavLink>

            <NavLink
              to="/marketplace"
              className={publicNavLinkClass}
            >
              Marketplace
            </NavLink>

            {renderExchangeLink()}

            {renderSessionsLink()}

            <NavLink
              to="/about"
              className={publicNavLinkClass}
            >
              About Us
            </NavLink>

            <NavLink
              to="/contact"
              className={publicNavLinkClass}
            >
              Contact Us
            </NavLink>

          </nav>

          <div className="hidden items-center gap-3 lg:flex text-white">

            {!isAuthenticated ? (
              <>
               

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Login
                </Link>

               

                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Get Started
                </Link>
              </>
            ) : isAdmin ? (
              <>
                

                <Link
                  to="/admin/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <ShieldCheck className="h-4 w-4" />

                  <span>
                    Admin Dashboard
                  </span>
                </Link>
              </>
            ) : (
              <>
              

                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <User className="h-4 w-4" />

                  <span>
                    Profile
                  </span>
                </Link>

                

                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <LayoutDashboard className="h-4 w-4" />

                  <span>
                    Dashboard
                  </span>
                </Link>
              </>
            )}

          </div>

          <button
            type="button"
            onClick={() =>
              setMobileOpen(
                (current) => !current
              )
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 lg:hidden"
            aria-label={
              mobileOpen
                ? "Close navigation"
                : "Open navigation"
            }
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

        </div>

        {mobileOpen && (
          <div className="border-t border-slate-200 py-4 lg:hidden">

            <nav className="space-y-1">

              <NavLink
                to="/explore"
                onClick={closeMobileMenu}
                className={mobileNavLinkClass}
              >
                <Compass className="h-5 w-5 shrink-0" />

                <span>
                  Explore
                </span>
              </NavLink>

              <NavLink
                to="/skills"
                onClick={closeMobileMenu}
                className={mobileNavLinkClass}
              >
                <BookOpen className="h-5 w-5 shrink-0" />

                <span>
                  Skills
                </span>
              </NavLink>

              <NavLink
                to="/marketplace"
                onClick={closeMobileMenu}
                className={mobileNavLinkClass}
              >
                <Store className="h-5 w-5 shrink-0" />

                <span>
                  Marketplace
                </span>
              </NavLink>

              {renderExchangeLink({
                mobile: true,
              })}

              {renderSessionsLink({
                mobile: true,
              })}

              <NavLink
                to="/about"
                onClick={closeMobileMenu}
                className={mobileNavLinkClass}
              >
                <Info className="h-5 w-5 shrink-0" />

                <span>
                  About Us
                </span>
              </NavLink>

              <NavLink
                to="/contact"
                onClick={closeMobileMenu}
                className={mobileNavLinkClass}
              >
                <Mail className="h-5 w-5 shrink-0" />

                <span>
                  Contact Us
                </span>
              </NavLink>

            </nav>

            <div className="mt-4 border-t border-slate-200 pt-4">

              {!isAuthenticated ? (
                <div className="grid grid-cols-2 gap-3">

                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <LogIn className="h-4 w-4" />

                    <span>
                      Login
                    </span>
                  </Link>

                  <Link
                    to="/register"
                    onClick={closeMobileMenu}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Get Started
                  </Link>

                </div>
              ) : isAdmin ? (

                <Link
                  to="/admin/dashboard"
                  onClick={closeMobileMenu}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <ShieldCheck className="h-5 w-5" />

                  <span>
                    Admin Dashboard
                  </span>
                </Link>
              ) : (
            

                <div className="grid grid-cols-2 gap-3">

                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <User className="h-4 w-4" />

                    <span>
                      Profile
                    </span>
                  </Link>

                  <Link
                    to="/dashboard"
                    onClick={closeMobileMenu}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <LayoutDashboard className="h-4 w-4" />

                    <span>
                      Dashboard
                    </span>
                  </Link>

                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </header>
  );
}

export default Navbar;