import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Handshake,
  Search,
  Sparkles,
  Star,
  Users,
  Video,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Find People",
    description:
      "Discover people with skills you know and skills you want to learn.",
  },
  {
    icon: Handshake,
    title: "Exchange Skills",
    description:
      "Connect with peers and exchange knowledge in a simple, mutual way.",
  },
  {
    icon: BookOpen,
    title: "Learn Your Way",
    description:
      "Explore learning content, sessions, roadmaps, and practical activities.",
  },
  {
    icon: Zap,
    title: "Level Up",
    description:
      "Earn XP through meaningful learning activities and track your progress.",
  },
];

const steps = [
  {
    number: "01",
    title: "Build your skill profile",
    description:
      "Tell SkillHive what you already know and what you want to learn.",
    icon: Users,
  },
  {
    number: "02",
    title: "Discover opportunities",
    description:
      "Find people, skills, learning content, sessions, and exchanges that match your interests.",
    icon: Search,
  },
  {
    number: "03",
    title: "Learn and exchange",
    description:
      "Share your knowledge, learn from peers, join sessions, and complete your roadmap.",
    icon: Handshake,
  },
  {
    number: "04",
    title: "Grow your progress",
    description:
      "Earn XP, unlock achievements, complete goals, and build your learning journey.",
    icon: GraduationCap,
  },
];

const highlights = [
  "Peer-to-peer skill sharing",
  "Personalized skill discovery",
  "Learning roadmaps and goals",
  "Live learning sessions",
  "XP, badges, and leaderboards",
  "Free and paid learning content",
];

function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* =========================================================
          HERO
      ========================================================== */}
      <section className="relative overflow-hidden bg-blue-600">
        <div className="absolute inset-0">
          <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-blue-500 opacity-40" />
          <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-blue-700 opacity-50" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            {/* Hero copy */}
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300/40 bg-blue-500/50 px-4 py-2 text-sm font-medium text-white">
                <Sparkles className="h-4 w-4" />
                Learn. Share. Grow together.
              </div>

              <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Turn the skills you have into the skills someone else needs.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-blue-100 sm:text-lg">
                SkillHive is a peer-to-peer learning and skill-sharing
                platform where people discover skills, exchange knowledge,
                learn together, and grow through meaningful learning
                experiences.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/explore"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
                >
                  Explore Skills
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
                >
                  Join SkillHive
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-blue-100">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  Peer learning
                </span>

                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  Skill exchange
                </span>

                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  Learning roadmaps
                </span>
              </div>
            </div>

            {/* Hero visual */}
            <div className="lg:pl-8">
              <div className="mx-auto max-w-lg rounded-3xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-sm">
                <div className="rounded-2xl bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Your learning journey
                      </p>

                      <h2 className="mt-1 text-xl font-bold text-slate-900">
                        Full Stack Development
                      </h2>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        Roadmap progress
                      </span>

                      <span className="font-semibold text-blue-600">
                        68%
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-[68%] rounded-full bg-blue-600" />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Zap className="h-4 w-4" />
                        <span className="text-xs font-medium text-slate-500">
                          XP earned
                        </span>
                      </div>

                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        840
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-blue-600">
                        <BookOpen className="h-4 w-4" />
                        <span className="text-xs font-medium text-slate-500">
                          Skills
                        </span>
                      </div>

                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        12
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-blue-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                        <Handshake className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          Skill Exchange
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Someone wants to learn Python from you
                        </p>
                      </div>

                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          TRUST / INTRODUCTION
      ========================================================== */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Users className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Learn from people
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Discover real people with knowledge and experience you can
                  learn from.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Handshake className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Share what you know
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Turn your existing skills into useful learning experiences
                  for other people.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Zap className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Track your growth
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Build momentum with goals, roadmaps, XP, badges, and
                  completed learning activities.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-blue-600">
              Everything in one place
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              A better way to learn and share skills
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              SkillHive brings discovery, peer learning, skill exchange,
              structured learning, and progress tracking into one connected
              experience.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="mt-5 text-lg font-semibold text-slate-900">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-10">
          <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                How SkillHive works
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Your skills can open the door to someone else's learning
                journey.
              </h2>

              <p className="mt-5 text-base leading-7 text-slate-600">
                Whether you want to learn something new or share something you
                already know, SkillHive connects both sides through a
                peer-to-peer experience.
              </p>

              <Link
                to="/explore"
                className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Start exploring
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {steps.map((step) => {
                const Icon = step.icon;

                return (
                  <div
                    key={step.number}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-blue-600">
                        {step.number}
                      </span>

                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <h3 className="mt-5 font-semibold text-slate-900">
                      {step.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-10">
          <div className="overflow-hidden rounded-3xl bg-blue-600">
            <div className="grid lg:grid-cols-2">
              <div className="p-8 sm:p-10 lg:p-14">
                <p className="text-sm font-semibold text-blue-100">
                  Built for continuous learning
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  More than just a place to find courses.
                </h2>

                <p className="mt-5 max-w-xl text-base leading-7 text-blue-100">
                  SkillHive combines people, skills, exchanges, content,
                  sessions, roadmaps, and gamification so your learning
                  journey stays connected.
                </p>

                <Link
                  to="/register"
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  Create your profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="bg-blue-700 p-8 sm:p-10 lg:p-14">
                <div className="grid gap-4 sm:grid-cols-2">
                  {highlights.map((highlight) => (
                    <div
                      key={highlight}
                      className="flex items-start gap-3 rounded-xl border border-blue-500/40 bg-blue-600/50 p-4"
                    >
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-white" />

                      <span className="text-sm font-medium leading-5 text-white">
                        {highlight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Video className="h-6 w-6" />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                Learn together
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Join live learning sessions and connect with peers around
                practical skills.
              </p>

              <Link
                to="/sessions"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600"
              >
                Explore sessions
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BookOpen className="h-6 w-6" />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                Learn at your pace
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Discover useful learning content and unlock resources based on
                the access option you choose.
              </p>

              <Link
                to="/marketplace"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600"
              >
                Explore marketplace
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Star className="h-6 w-6" />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                Build your reputation
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Grow your profile through meaningful participation, learning
                progress, ratings, badges, and achievements.
              </p>

              <Link
                to="/leaderboard"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600"
              >
                See leaderboard
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
            <Sparkles className="h-7 w-7" />
          </div>

          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Your next skill could come from your next connection.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Create your SkillHive profile, discover people and skills, and
            start building a learning journey around what you want to achieve.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row text-white">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/explore"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
              Explore SkillHive
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;