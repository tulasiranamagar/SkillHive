import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Compass,
  Heart,
  Rocket,
  Search,
  SkipForward,
  Sparkles,
} from "lucide-react";

import api from "../../api/axios";
import { useAuth } from "../../hooks/useAuth";

function Onboarding() {
  const navigate = useNavigate();

  const {
    user,
    needsOnboarding,
    loading: authLoading,
    refreshUser,
  } = useAuth();

  const [step, setStep] = useState(1);

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [skills, setSkills] = useState([]);
  const [careerGoals, setCareerGoals] = useState([]);

  const [skillSearch, setSkillSearch] = useState("");
  const [goalSearch, setGoalSearch] = useState("");

  const [interests, setInterests] = useState([]);
  const [knownSkills, setKnownSkills] = useState([]);
  const [wantedSkills, setWantedSkills] = useState([]);
  const [careerGoal, setCareerGoal] = useState(null);


  useEffect(() => {
    if (!authLoading && user && !needsOnboarding) {
      navigate("/explore", {
        replace: true,
      });
    }
  }, [
    authLoading,
    user,
    needsOnboarding,
    navigate,
  ]);

  useEffect(() => {
    if (authLoading || !user || !needsOnboarding) {
      return;
    }

    const loadOnboardingData = async () => {
      try {
        setLoadingData(true);
        setMessage("");

        const [skillsResponse, goalsResponse] =
          await Promise.all([
            api.get("/api/skills/"),
            api.get("/api/goals/"),
          ]);

        const skillsData =
          skillsResponse.data?.results || [];

        const goalsData =
          Array.isArray(goalsResponse.data)
            ? goalsResponse.data
            : goalsResponse.data?.results || [];

        setSkills(
          Array.isArray(skillsData)
            ? skillsData
            : []
        );

        setCareerGoals(
          Array.isArray(goalsData)
            ? goalsData
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load onboarding data:",
          error
        );

        setMessage(
          "Unable to load skills and career goals. Please refresh and try again."
        );
      } finally {
        setLoadingData(false);
      }
    };

    loadOnboardingData();
  }, [
    authLoading,
    user,
    needsOnboarding,
  ]);


  const filteredSkills = useMemo(() => {
    const search = skillSearch
      .trim()
      .toLowerCase();

    if (!search) {
      return skills;
    }

    return skills.filter((skill) =>
      String(skill.name || "")
        .toLowerCase()
        .includes(search)
    );
  }, [skills, skillSearch]);

  const filteredCareerGoals = useMemo(() => {
    const search = goalSearch
      .trim()
      .toLowerCase();

    if (!search) {
      return careerGoals;
    }

    return careerGoals.filter((goal) =>
      String(goal.title || "")
        .toLowerCase()
        .includes(search)
    );
  }, [careerGoals, goalSearch]);

  const toggleInterest = (skillId) => {
    setInterests((current) => {
      if (current.includes(skillId)) {
        return current.filter(
          (id) => id !== skillId
        );
      }

      return [...current, skillId];
    });
  };

  const toggleKnownSkill = (skillId) => {
    setKnownSkills((current) => {
      const exists = current.some(
        (item) => item.skill === skillId
      );

      if (exists) {
        return current.filter(
          (item) => item.skill !== skillId
        );
      }

      return [
        ...current,
        {
          skill: skillId,
          level: 1,
          experience_years: 0,
        },
      ];
    });


    setWantedSkills((current) =>
      current.filter(
        (item) => item.skill !== skillId
      )
    );
  };

  const toggleWantedSkill = (skillId) => {
    setWantedSkills((current) => {
      const exists = current.some(
        (item) => item.skill === skillId
      );

      if (exists) {
        return current.filter(
          (item) => item.skill !== skillId
        );
      }

      return [
        ...current,
        {
          skill: skillId,
          level: 1,
          experience_years: 0,
        },
      ];
    });

    setKnownSkills((current) =>
      current.filter(
        (item) => item.skill !== skillId
      )
    );
  };


  const changeKnownSkillLevel = (
    skillId,
    level
  ) => {
    setKnownSkills((current) =>
      current.map((item) =>
        item.skill === skillId
          ? {
              ...item,
              level: Number(level),
            }
          : item
      )
    );
  };

  const changeKnownSkillExperience = (
    skillId,
    experienceYears
  ) => {
    const numericValue = Number(
      experienceYears
    );

    setKnownSkills((current) =>
      current.map((item) =>
        item.skill === skillId
          ? {
              ...item,
              experience_years:
                Number.isFinite(numericValue) &&
                numericValue >= 0
                  ? numericValue
                  : 0,
            }
          : item
      )
    );
  };


  const isInterestSelected = (skillId) =>
    interests.includes(skillId);

  const isKnownSkillSelected = (skillId) =>
    knownSkills.some(
      (item) => item.skill === skillId
    );

  const isWantedSkillSelected = (skillId) =>
    wantedSkills.some(
      (item) => item.skill === skillId
    );

  const saveInterests = async () => {
    for (const skillId of interests) {
      await api.post(
        "/api/skills/interests/",
        {
          skill: skillId,
        }
      );
    }
  };

  const saveKnownSkills = async () => {
    for (const item of knownSkills) {
      await api.post(
        "/api/skills/user/",
        {
          skill: item.skill,
          skill_type: "known",
          level: item.level,
          experience_years:
            item.experience_years,
        }
      );
    }
  };


  const saveWantedSkills = async () => {
    for (const item of wantedSkills) {
      await api.post(
        "/api/skills/user/",
        {
          skill: item.skill,
          skill_type: "wanted",
          level: item.level,
          experience_years:
            item.experience_years,
        }
      );
    }
  };

  const saveCareerGoal = async () => {
    if (!careerGoal) {
      return;
    }

    await api.post(
      "/api/goals/select/",
      {
        goal_id: careerGoal,
      }
    );
  };

  const validateStep = () => {
    setMessage("");

    if (step === 1) {
      if (interests.length === 0) {
        setMessage(
          "Please select at least one interest, or choose Skip for now."
        );

        return false;
      }
    }

    if (step === 2) {
      if (knownSkills.length === 0) {
        setMessage(
          "Please select at least one skill you already know."
        );

        return false;
      }
    }

    if (step === 3) {
      if (wantedSkills.length === 0) {
        setMessage(
          "Please select at least one skill you want to learn."
        );

        return false;
      }
    }

    if (step === 4) {
      if (!careerGoal) {
        setMessage(
          "Please select a career goal."
        );

        return false;
      }
    }

    return true;
  };

  const goNext = async () => {
    if (saving) {
      return;
    }

    setMessage("");

    if (!validateStep()) {
      return;
    }

    if (step < 5) {
      setSkillSearch("");
      setGoalSearch("");

      setStep(
        (currentStep) =>
          currentStep + 1
      );

      return;
    }

    try {
      setSaving(true);

      await saveInterests();
      await saveKnownSkills();
      await saveWantedSkills();
      await saveCareerGoal();

      await api.post(
        "/api/accounts/onboarding/complete/"
      );


      await refreshUser();

      navigate("/explore", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Onboarding completion failed:",
        error
      );

      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Something went wrong while saving your onboarding information.";

      setMessage(detail);
    } finally {
      setSaving(false);
    }
  };


  const skipOnboarding = async () => {
    if (saving) {
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      await api.post(
        "/api/accounts/onboarding/skip/"
      );

      await refreshUser();

      navigate("/explore", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Skipping onboarding failed:",
        error
      );

      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Unable to skip onboarding right now.";

      setMessage(detail);
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (saving) {
      return;
    }

    setMessage("");
    setSkillSearch("");
    setGoalSearch("");

    if (step > 1) {
      setStep(
        (currentStep) =>
          currentStep - 1
      );
    }
  };

  if (
    authLoading ||
    loadingData
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Preparing your SkillHive experience...
          </p>
        </div>
      </div>
    );
  }


  if (!user || !needsOnboarding) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
            <Sparkles size={28} />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome to SkillHive
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Tell us about your interests, skills, and
            career direction. This helps SkillHive
            personalize the learning experience for you.
          </p>
        </div>

        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>
              Step {step} of 5
            </span>

            <span>
              {Math.round(
                (step / 5) * 100
              )}
              %
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{
                width: `${
                  (step / 5) * 100
                }%`,
              }}
            />
          </div>
        </div>

   
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

          {step === 1 && (
            <div>
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
                  <Heart size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Your interests
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Choose areas you are interested
                    in learning or exploring.
                  </p>
                </div>
              </div>

              <div className="relative mb-5">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={skillSearch}
                  onChange={(event) =>
                    setSkillSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search skills..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid max-h-[420px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSkills.map(
                  (skill) => {
                    const selected =
                      isInterestSelected(
                        skill.id
                      );

                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() =>
                          toggleInterest(
                            skill.id
                          )
                        }
                        className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                          selected
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-sm font-medium">
                          {skill.name}
                        </span>

                        {selected && (
                          <CheckCircle2
                            size={18}
                            className="shrink-0"
                          />
                        )}
                      </button>
                    );
                  }
                )}
              </div>

              {filteredSkills.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  No skills found.
                </p>
              )}

              <p className="mt-4 text-xs text-slate-500">
                {interests.length} interest
                {interests.length === 1
                  ? ""
                  : "s"} selected
              </p>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Check size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Skills you already know
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Select skills you already have
                    and tell us your current level.
                  </p>
                </div>
              </div>

              <div className="relative mb-5">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={skillSearch}
                  onChange={(event) =>
                    setSkillSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search skills..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid max-h-[500px] grid-cols-1 gap-3 overflow-y-auto pr-1">
                {filteredSkills.map(
                  (skill) => {
                    const selected =
                      isKnownSkillSelected(
                        skill.id
                      );

                    const selectedItem =
                      knownSkills.find(
                        (item) =>
                          item.skill ===
                          skill.id
                      );

                    const wanted =
                      isWantedSkillSelected(
                        skill.id
                      );

                    return (
                      <div
                        key={skill.id}
                        className={`rounded-xl border p-4 transition ${
                          selected
                            ? "border-blue-500 bg-blue-50"
                            : wanted
                            ? "border-slate-200 bg-slate-100 opacity-60"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          disabled={wanted}
                          onClick={() =>
                            toggleKnownSkill(
                              skill.id
                            )
                          }
                          className="flex w-full items-center justify-between text-left disabled:cursor-not-allowed"
                        >
                          <span className="text-sm font-semibold text-slate-800">
                            {skill.name}
                          </span>

                          {selected && (
                            <CheckCircle2
                              size={19}
                              className="text-blue-600"
                            />
                          )}
                        </button>

                        {wanted && !selected && (
                          <p className="mt-2 text-xs text-slate-500">
                            Already selected as a wanted
                            skill.
                          </p>
                        )}

                        {selected &&
                          selectedItem && (
                            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-blue-100 pt-4 sm:grid-cols-2">
                              <label className="text-sm">
                                <span className="mb-1 block font-medium text-slate-600">
                                  Skill level
                                </span>

                                <select
                                  value={
                                    selectedItem.level
                                  }
                                  onChange={(event) =>
                                    changeKnownSkillLevel(
                                      skill.id,
                                      event.target.value
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
                                >
                                  <option value={1}>
                                    Beginner
                                  </option>

                                  <option value={2}>
                                    Basic
                                  </option>

                                  <option value={3}>
                                    Intermediate
                                  </option>

                                  <option value={4}>
                                    Advanced
                                  </option>

                                  <option value={5}>
                                    Expert
                                  </option>
                                </select>
                              </label>

                              <label className="text-sm">
                                <span className="mb-1 block font-medium text-slate-600">
                                  Experience (years)
                                </span>

                                <input
                                  type="number"
                                  min="0"
                                  max="99"
                                  step="0.5"
                                  value={
                                    selectedItem.experience_years
                                  }
                                  onChange={(event) =>
                                    changeKnownSkillExperience(
                                      skill.id,
                                      event.target.value
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500"
                                />
                              </label>
                            </div>
                          )}
                      </div>
                    );
                  }
                )}
              </div>

              {filteredSkills.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  No skills found.
                </p>
              )}

              <p className="mt-4 text-xs text-slate-500">
                {knownSkills.length} known skill
                {knownSkills.length === 1
                  ? ""
                  : "s"} selected
              </p>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Rocket size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Skills you want to learn
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Choose the skills you want to
                    develop through SkillHive.
                  </p>
                </div>
              </div>

              <div className="relative mb-5">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={skillSearch}
                  onChange={(event) =>
                    setSkillSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search skills..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid max-h-[500px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSkills.map(
                  (skill) => {
                    const selected =
                      isWantedSkillSelected(
                        skill.id
                      );

                    const known =
                      isKnownSkillSelected(
                        skill.id
                      );

                    return (
                      <button
                        key={skill.id}
                        type="button"
                        disabled={known}
                        onClick={() =>
                          toggleWantedSkill(
                            skill.id
                          )
                        }
                        className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                          selected
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : known
                            ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"
                            : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-slate-50"
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-medium">
                            {skill.name}
                          </span>

                          {known && (
                            <span className="mt-1 block text-xs text-slate-500">
                              Already selected as a known
                              skill.
                            </span>
                          )}
                        </span>

                        {selected && (
                          <CheckCircle2
                            size={18}
                            className="shrink-0"
                          />
                        )}
                      </button>
                    );
                  }
                )}
              </div>

              {filteredSkills.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  No skills found.
                </p>
              )}

              <p className="mt-4 text-xs text-slate-500">
                {wantedSkills.length} wanted skill
                {wantedSkills.length === 1
                  ? ""
                  : "s"} selected
              </p>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Compass size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Your career goal
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Choose the career direction you
                    want SkillHive to help you work toward.
                  </p>
                </div>
              </div>

              <div className="relative mb-5">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={goalSearch}
                  onChange={(event) =>
                    setGoalSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search career goals..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid max-h-[500px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {filteredCareerGoals.map(
                  (goal) => {
                    const selected =
                      careerGoal === goal.id;

                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() =>
                          setCareerGoal(
                            goal.id
                          )
                        }
                        className={`flex items-center justify-between rounded-xl border p-5 text-left transition ${
                          selected
                            ? "border-amber-500 bg-amber-50 text-amber-800"
                            : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-sm font-semibold">
                          {goal.title}
                        </span>

                        {selected && (
                          <CheckCircle2
                            size={19}
                            className="shrink-0"
                          />
                        )}
                      </button>
                    );
                  }
                )}
              </div>

              {filteredCareerGoals.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  No career goals found.
                </p>
              )}

              <p className="mt-4 text-xs text-slate-500">
                {careerGoal
                  ? "Career goal selected"
                  : "No career goal selected"}
              </p>
            </div>
          )}

          {step === 5 && (
            <div>
              <div className="mb-8 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Sparkles size={30} />
                </div>

                <h2 className="text-2xl font-bold text-slate-900">
                  You're ready to explore SkillHive
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
                  Your selections will help SkillHive
                  personalize recommendations and connect
                  you with relevant learning resources,
                  people, exchanges, and sessions.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3">
                    <Heart
                      size={19}
                      className="text-pink-600"
                    />

                    <span className="text-sm font-semibold text-slate-800">
                      Interests
                    </span>
                  </div>

                  <p className="mt-3 text-2xl font-bold text-slate-900">
                    {interests.length}
                  </p>

                  <p className="text-xs text-slate-500">
                    selected
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3">
                    <Check
                      size={19}
                      className="text-blue-600"
                    />

                    <span className="text-sm font-semibold text-slate-800">
                      Known skills
                    </span>
                  </div>

                  <p className="mt-3 text-2xl font-bold text-slate-900">
                    {knownSkills.length}
                  </p>

                  <p className="text-xs text-slate-500">
                    selected
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3">
                    <Rocket
                      size={19}
                      className="text-violet-600"
                    />

                    <span className="text-sm font-semibold text-slate-800">
                      Wanted skills
                    </span>
                  </div>

                  <p className="mt-3 text-2xl font-bold text-slate-900">
                    {wantedSkills.length}
                  </p>

                  <p className="text-xs text-slate-500">
                    selected
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3">
                    <Compass
                      size={19}
                      className="text-amber-600"
                    />

                    <span className="text-sm font-semibold text-slate-800">
                      Career goal
                    </span>
                  </div>

                  <p className="mt-3 text-base font-bold text-slate-900">
                    {careerGoal
                      ? careerGoals.find(
                          (goal) =>
                            goal.id ===
                            careerGoal
                        )?.title ||
                        "Selected"
                      : "Not selected"}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <div className="flex gap-3">
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 shrink-0 text-blue-600"
                  />

                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      Personalized SkillHive experience
                    </p>

                    <p className="mt-1 text-sm leading-6 text-blue-800">
                      These preferences can be used by
                      SkillHive's recommendation system to
                      identify relevant skills, learning
                      resources, people, exchanges, and
                      sessions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {message && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft size={17} />
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={skipOnboarding}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <SkipForward size={17} />
                  Skip for now
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={goNext}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                "Saving..."
              ) : step === 5 ? (
                <>
                  Explore SkillHive
                  <ArrowRight size={17} />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
