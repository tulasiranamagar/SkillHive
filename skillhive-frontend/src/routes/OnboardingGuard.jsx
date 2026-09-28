import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function OnboardingGuard({ children }) {
  const {
    needsOnboarding,
    loading,
  } = useAuth();

  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading SkillHive...
          </p>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <Navigate
        to="/onboarding"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return children;
}

export default OnboardingGuard;