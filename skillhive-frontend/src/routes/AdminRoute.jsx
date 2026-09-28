import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

function AdminRoute({ children }) {
  const {
    user,
    isAuthenticated,
    isAdmin,
    loading,
  } = useAuth();

  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Checking administrator access...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        }}
      />
    );
  }

  const userIsAdmin =
    user?.is_admin === true ||
    user?.role === "admin" ||
    user?.is_staff === true ||
    user?.profile?.role === "admin" ||
    isAdmin === true;

  if (!userIsAdmin) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
}

export default AdminRoute;