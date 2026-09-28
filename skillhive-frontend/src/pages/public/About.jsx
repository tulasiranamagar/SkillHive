import {
  ArrowRight,
  BookOpen,
  Handshake,
  Heart,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

function About() {
  return (
    <main className="min-h-screen bg-slate-50">
      
      <section className="border-b border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-100/70 px-3.5 py-2 text-sm font-medium text-blue-700">
              <Sparkles className="h-4 w-4" />
              About SkillHive
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Learn from people.
              <span className="block text-blue-600">
                Share what you know.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              SkillHive is a peer-to-peer learning and skill sharing platform
              where people can discover skills, connect with others, exchange
              knowledge, and learn through practical experiences.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row text-white">
              <Link
                to="/explore"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Explore SkillHive
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/exchange"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Explore Skill Exchanges
                <Handshake className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Our purpose
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                Learning should be a two-way experience.
              </h2>

              <p className="mt-5 text-base leading-7 text-slate-600">
                Everyone has something they can teach and something they want
                to learn. SkillHive brings these two sides together so users
                can share their knowledge while discovering opportunities to
                develop new skills.
              </p>

              <p className="mt-4 text-base leading-7 text-slate-600">
                Instead of separating people into fixed roles, SkillHive
                encourages users to participate as both learners and
                contributors depending on what they know and what they want to
                learn.
              </p>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50/80 p-8 shadow-sm">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <Users className="h-5 w-5" />
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-900">
                    People
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Discover people with skills, interests, and learning goals
                    that connect with yours.
                  </p>
                </div>

                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <Handshake className="h-5 w-5" />
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-900">
                    Skill Exchange
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Exchange knowledge directly with other members of the
                    SkillHive community.
                  </p>
                </div>

                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <BookOpen className="h-5 w-5" />
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-900">
                    Learning
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Access learning content, roadmaps, and sessions to build
                    practical skills.
                  </p>
                </div>

                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <Heart className="h-5 w-5" />
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-900">
                    Community
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Build meaningful connections around shared interests and
                    knowledge.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              What you can do
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              One platform for sharing and learning skills
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              SkillHive brings different parts of the learning experience
              together in one place.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Discover Skills",
                description:
                  "Explore skills and discover people who can help you learn something new.",
                icon: BookOpen,
              },
              {
                title: "Exchange Skills",
                description:
                  "Create or join skill exchanges and share knowledge directly with other users.",
                icon: Handshake,
              },
              {
                title: "Learn Through Sessions",
                description:
                  "Participate in learning sessions and connect with people around shared interests.",
                icon: Users,
              },
              {
                title: "Follow Your Goals",
                description:
                  "Set learning goals and follow structured roadmaps toward completing them.",
                icon: Sparkles,
              },
              {
                title: "Build Your Profile",
                description:
                  "Showcase your skills, interests, learning progress, and contributions.",
                icon: Heart,
              },
              {
                title: "Grow Together",
                description:
                  "Earn recognition through participation while contributing to the community.",
                icon: ArrowRight,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="mt-5 text-lg font-semibold text-slate-900">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8 text-white">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Ready to start learning and sharing?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Join SkillHive and become part of a community where knowledge can
            move in both directions.
          </p>

          <Link
            to="/register"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

export default About;