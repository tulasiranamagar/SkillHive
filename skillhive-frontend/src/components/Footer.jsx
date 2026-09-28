import {
  ArrowRight,
  BookOpen,
  Heart,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

const exploreLinks = [
  {
    label: "Explore Skills",
    to: "/explore",
    requiresAuth: false,
  },
  {
    label: "Find People",
    to: "/people",
    requiresAuth: true,
  },
  {
    label: "Skill Exchanges",
    to: "/exchange",
    requiresAuth: true,
  },
  {
    label: "Marketplace",
    to: "/marketplace",
    requiresAuth: false,
  },
];

const learningLinks = [
  {
    label: "Sessions",
    to: "/sessions",
    requiresAuth: true,
  },
  {
    label: "Learning",
    to: "/learning",
    requiresAuth: true,
  },
  {
    label: "Goals",
    to: "/goals",
    requiresAuth: true,
  },
  {
    label: "Leaderboard",
    to: "/leaderboard",
    requiresAuth: true,
  },
];

const companyLinks = [
  {
    label: "About",
    to: "/about",
    requiresAuth: false,
  },
  {
    label: "Contact Us",
    to: "/contact",
    requiresAuth: false,
  },
];

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex rounded-lg py-1 text-sm text-slate-600 transition hover:bg-blue-200/70 hover:text-blue-700"
    >
      {children}
    </Link>
  );
}

function Footer() {
  const {
    isAuthenticated,
  } = useAuth();

  const getDestination = (link) => {
    if (link.requiresAuth && !isAuthenticated) {
      return "/login";
    }

    return link.to;
  };

  const accountLinks = isAuthenticated
    ? [
        {
          label: "Profile",
          to: "/profile",
        },
        {
          label: "Dashboard",
          to: "/dashboard",
        },
      ]
    : [
        {
          label: "Log in",
          to: "/login",
        },
        {
          label: "Create account",
          to: "/register",
        },
      ];

  return (
    <footer className="border-t border-blue-200/80 bg-blue-100/70 text-slate-700 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

       
        <div className="grid items-start gap-10 lg:grid-cols-[1.7fr_1fr_1fr_1fr_1fr]">

        
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2.5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700">
                <BookOpen className="h-5 w-5" />
              </div>

              <span className="text-xl font-bold tracking-tight text-slate-900">
                SkillHive
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
              Learn from people, share what you know, and grow together
              through meaningful skill exchanges.
            </p>

           
            <Link
              to="/explore"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md"
            >
              <span className="text-white">
                Explore SkillHive
              </span>

              <ArrowRight className="h-4 w-4 text-white transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Explore
            </h3>

            <ul className="mt-4 space-y-2">
              {exploreLinks.map((link) => (
                <li key={link.to}>
                  <FooterLink
                    to={getDestination(link)}
                  >
                    {link.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Learning
            </h3>

            <ul className="mt-4 space-y-2">
              {learningLinks.map((link) => (
                <li key={link.to}>
                  <FooterLink
                    to={getDestination(link)}
                  >
                    {link.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Company
            </h3>

            <ul className="mt-4 space-y-2">
              {companyLinks.map((link) => (
                <li key={link.to}>
                  <FooterLink
                    to={getDestination(link)}
                  >
                    {link.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>

          
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Account
            </h3>

            <ul className="mt-4 space-y-2">
              {accountLinks.map((link) => (
                <li key={link.to}>
                  <FooterLink to={link.to}>
                    {link.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

    
        <div className="mt-10 flex flex-col gap-4 border-t border-blue-200/80 pt-6 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} SkillHive. All rights reserved.
          </p>

          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            Built for peer-to-peer learning

            <Heart className="h-3.5 w-3.5 text-blue-500" />
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;