import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import UserLayout from "../layouts/UserLayout";
import AdminLayout from "../layouts/AdminLayout";

import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import OnboardingGuard from "./OnboardingGuard";

import { useAuth } from "../hooks/useAuth";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminUsers from "../pages/admin/AdminUsers";
import AdminReports from "../pages/admin/AdminReports";
import AdminVerifications from "../pages/admin/AdminVerifications";
import AdminActivity from "../pages/admin/AdminActivity";
import AdminNotifications from "../pages/admin/AdminNotifications";
import AdminContactMessages from "../pages/admin/AdminContactMessages";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import Onboarding from "../pages/auth/Onboarding";

import Home from "../pages/public/Home";
import Explore from "../pages/public/Explore";
import People from "../pages/public/People";
import PublicMarketplace from "../pages/public/Marketplace";
import PublicSessions from "../pages/public/Sessions";
import PublicSkills from "../pages/public/Skills";
import PublicProfile from "../pages/public/Profile";
import CertificateVerify from "../pages/public/CertificateVerify";
import PublicMarketplacePurchases from "../pages/public/MarketplacePurchases";
import About from "../pages/public/About";
import Contact from "../pages/public/Contact";

import Dashboard from "../pages/user/Dashboard";
import Profile from "../pages/user/Profile";
import Settings from "../pages/user/Settings";
import Skills from "../pages/user/Skills";
import Goals from "../pages/user/Goals";
import GoalDetails from "../pages/user/GoalDetails";

import Exchanges from "../pages/user/Exchanges";
import ExchangeDetails from "../pages/user/ExchangeDetails";

import MarketplaceCreate from "../pages/user/MarketplaceCreate";
import MarketplaceContent from "../pages/user/MarketplaceContent";
import MyContent from "../pages/user/MyContent";
import MarketplacePurchases from "../pages/user/MarketplacePurchases";

import MySessions from "../pages/user/MySessions";
import SessionCreate from "../pages/user/SessionCreate";
import SessionDetails from "../pages/user/SessionDetails";
import SessionRoom from "../pages/user/SessionRoom";

import Roadmap from "../pages/user/Roadmap";
import Learning from "../pages/user/Learning";
import Assessment from "../pages/user/Assessment";
import Certificates from "../pages/user/Certificates";

import Chat from "../pages/user/Chat";
import Notifications from "../pages/user/Notifications";
import Gamification from "../pages/user/Gamification";
import Leaderboard from "../pages/user/Leaderboard";


function AuthAwareLayout() {
  const { isAuthenticated, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      </div>
    );
  }

  const isSessionsPage =
    location.pathname === "/sessions" ||
    location.pathname.startsWith("/sessions/");

  if (isSessionsPage && !isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }


  if (isAuthenticated && !isAdmin) {
    return <UserLayout />;
  }

  
  return <PublicLayout />;
}


function UserProtectedLayout() {
  return (
    <ProtectedRoute>
      <OnboardingGuard>
        <UserLayout />
      </OnboardingGuard>
    </ProtectedRoute>
  );
}

function AdminProtectedLayout() {
  return (
    <AdminRoute>
      <AdminLayout />
    </AdminRoute>
  );
}

function AppRoutes() {
  return (
    <Routes>
     
      <Route element={<PublicLayout />}>
        <Route
          path="/"
          element={<Home />}
        />
      </Route>


      <Route element={<AuthAwareLayout />}>
        
        <Route
          path="/explore"
          element={<Explore />}
        />

  
        <Route
          path="/people"
          element={<People />}
        />

        <Route
          path="/marketplace"
          element={<PublicMarketplace />}
        />

        <Route
          path="/sessions"
          element={<PublicSessions />}
        />

        <Route
          path="/skills"
          element={<PublicSkills />}
        />

        <Route
          path="/profile/:username"
          element={<PublicProfile />}
        />

        <Route
          path="/certificate/:certificateNumber"
          element={<CertificateVerify />}
        />

        <Route
          path="/marketplace/purchases"
          element={<PublicMarketplacePurchases />}
        />

        <Route
          path="/about"
          element={<About />}
        />

        <Route
          path="/contact"
          element={<Contact />}
        />

        <Route
          path="/exchange"
          element={<Exchanges />}
        />

        <Route
          path="/exchange/:id"
          element={<ExchangeDetails />}
        />

        <Route
          path="/leaderboard"
          element={<Leaderboard />}
        />
      </Route>

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password/:uid/:token"
        element={<ResetPassword />}
      />

      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      <Route element={<UserProtectedLayout />}>
      
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />
        <Route
          path="/profile"
          element={<Profile />}
        />

        <Route
          path="/settings"
          element={<Settings />}
        />

        <Route
          path="/my-skills"
          element={<Skills />}
        />

        <Route
          path="/goals"
          element={<Goals />}
        />

        <Route
          path="/goals/:id"
          element={<GoalDetails />}
        />

        <Route
          path="/exchange"
          element={<Exchanges />}
        />

        <Route
          path="/exchange/:id"
          element={<ExchangeDetails />}
        />
        <Route
          path="/marketplace/create"
          element={<MarketplaceCreate />}
        />

        <Route
          path="/marketplace/content/:id"
          element={<MarketplaceContent />}
        />

        <Route
          path="/marketplace/my-content"
          element={<MyContent />}
        />

        <Route
          path="/marketplace/my-purchases"
          element={<MarketplacePurchases />}
        />
        <Route
          path="/my-sessions"
          element={<MySessions />}
        />

        <Route
          path="/sessions/create"
          element={<SessionCreate />}
        />

        <Route
          path="/sessions/:id"
          element={<SessionDetails />}
        />

        <Route
          path="/sessions/:id/room"
          element={<SessionRoom />}
        />

        <Route
          path="/roadmap"
          element={<Roadmap />}
        />

        <Route
          path="/roadmap/:id"
          element={<Roadmap />}
        />

        <Route
          path="/learning"
          element={<Learning />}
        />

        <Route
          path="/assessment/:taskId"
          element={<Assessment />}
        />

        <Route
          path="/certificates"
          element={<Certificates />}
        />
        <Route
          path="/chat"
          element={<Chat />}
        />

        <Route
          path="/notifications"
          element={<Notifications />}
        />
        <Route
          path="/gamification"
          element={<Gamification />}
        />

        <Route
          path="/leaderboard"
          element={<Leaderboard />}
        />
      </Route>

      <Route element={<AdminProtectedLayout />}>
        
        <Route
          path="/admin"
          element={
            <Navigate
              to="/admin/dashboard"
              replace
            />
          }
        />

        
        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />

     
        <Route
          path="/admin/users"
          element={<AdminUsers />}
        />

        <Route
          path="/admin/users/:userId"
          element={<AdminUsers />}
        />

    
        <Route
          path="/admin/reports"
          element={<AdminReports />}
        />

      
        <Route
          path="/admin/verifications"
          element={<AdminVerifications />}
        />

     
        <Route
          path="/admin/activity"
          element={<AdminActivity />}
        />

      
        <Route
          path="/admin/notifications"
          element={<AdminNotifications />}
        />

      
        <Route
          path="/admin/contact-messages"
          element={<AdminContactMessages />}
        />

        <Route
          path="/admin/contact-messages/:messageId"
          element={<AdminContactMessages />}
        />
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}

export default AppRoutes;