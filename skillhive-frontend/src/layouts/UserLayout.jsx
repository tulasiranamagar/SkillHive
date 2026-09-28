import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu,
  MessageCircle,
  X,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import UserSidebar from "../components/UserSidebar";
import api from "../api/axios";

function unwrap(response) {
  const data = response?.data;

  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data)
  ) {
    if (data.data !== undefined) {
      return data.data;
    }

    if (data.results !== undefined) {
      return data.results;
    }

    if (data.notifications !== undefined) {
      return data.notifications;
    }

    if (data.conversations !== undefined) {
      return data.conversations;
    }

    if (data.messages !== undefined) {
      return data.messages;
    }
  }

  return data;
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    if (Array.isArray(value.results)) {
      return value.results;
    }

    if (Array.isArray(value.notifications)) {
      return value.notifications;
    }

    if (Array.isArray(value.conversations)) {
      return value.conversations;
    }

    if (Array.isArray(value.data)) {
      return value.data;
    }
  }

  return [];
}

function getNotificationUnreadCount(data) {
  const directCount =
    data?.unread_count ??
    data?.unreadCount ??
    data?.unread_notifications_count ??
    data?.unreadNotificationsCount;

  if (
    directCount !== undefined &&
    directCount !== null &&
    !Number.isNaN(Number(directCount))
  ) {
    return Math.max(0, Number(directCount));
  }

  const notifications = asArray(data);

  return notifications.filter(
    (notification) => {
      const isRead =
        notification?.is_read ??
        notification?.read ??
        notification?.isRead;

      return (
        isRead === false ||
        isRead === 0 ||
        isRead === "false"
      );
    }
  ).length;
}

function getConversationUnreadCount(
  conversation
) {
  const count =
    conversation?.unread_count ??
    conversation?.unreadCount ??
    conversation?.unread_messages_count ??
    conversation?.unreadMessagesCount ??
    conversation?.unread_messages ??
    conversation?.unread ??
    0;

  const numericCount = Number(count);

  return Number.isNaN(numericCount)
    ? 0
    : Math.max(0, numericCount);
}

function getChatUnreadCount(data) {
  const directCount =
    data?.unread_count ??
    data?.unreadCount ??
    data?.total_unread ??
    data?.totalUnread ??
    data?.unread_messages_count ??
    data?.unreadMessagesCount;

  if (
    directCount !== undefined &&
    directCount !== null &&
    !Number.isNaN(Number(directCount))
  ) {
    return Math.max(0, Number(directCount));
  }

  const conversations = asArray(data);

  return conversations.reduce(
    (total, conversation) =>
      total +
      getConversationUnreadCount(
        conversation
      ),
    0
  );
}


function UserLayout() {
  const {
    user,
    loading,
    isAuthenticated,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    sidebarCollapsed,
    setSidebarCollapsed,
  ] = useState(false);

  const [
    notificationUnreadCount,
    setNotificationUnreadCount,
  ] = useState(0);

  const [
    chatUnreadCount,
    setChatUnreadCount,
  ] = useState(0);

  useEffect(() => {
    if (
      !loading &&
      !isAuthenticated
    ) {
      navigate("/login", {
        replace: true,
        state: {
          from: location,
        },
      });
    }
  }, [
    loading,
    isAuthenticated,
    navigate,
    location,
  ]);



  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);


  const loadUnreadCounts = useCallback(
    async () => {
      if (!isAuthenticated) {
        setNotificationUnreadCount(0);
        setChatUnreadCount(0);
        return;
      }

      const [
        notificationsResult,
        conversationsResult,
      ] = await Promise.allSettled([
        api.get("/api/notifications/"),
        api.get("/api/chat/conversations/"),
      ]);


      if (
        notificationsResult.status ===
        "fulfilled"
      ) {
        const notificationData =
          unwrap(
            notificationsResult.value
          );

        setNotificationUnreadCount(
          getNotificationUnreadCount(
            notificationData
          )
        );
      }

      if (
        conversationsResult.status ===
        "fulfilled"
      ) {
        const conversationData =
          unwrap(
            conversationsResult.value
          );

        setChatUnreadCount(
          getChatUnreadCount(
            conversationData
          )
        );
      }
    },
    [isAuthenticated]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    loadUnreadCounts();

    const interval = setInterval(
      () => {
        loadUnreadCounts();
      },
      30000
    );

    return () => {
      clearInterval(interval);
    };
  }, [
    isAuthenticated,
    loadUnreadCounts,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    loadUnreadCounts();
  }, [
    location.pathname,
    isAuthenticated,
    loadUnreadCounts,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

          <p className="text-sm text-gray-500">
            Loading...
          </p>
        </div>
      </div>
    );
  }


  if (!isAuthenticated) {
    return null;
  }

  const displayName =
    user?.first_name ||
    user?.name ||
    user?.full_name ||
    user?.username ||
    "User";

  const username =
    user?.username || "";

  const profilePicture =
    user?.profile?.profile_picture ||
    user?.profile_picture ||
    null;

  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");

  const profilePath = "/profile";

  const handleNotificationsClick = () => {
    navigate("/notifications");
  };

  const handleChatClick = () => {
    navigate("/chat");
  };

  const handleProfileClick = () => {
    navigate(profilePath);
  };

  const renderUnreadBadge = (count) => {
    if (!count || count <= 0) {
      return null;
    }

    const displayCount =
      count > 99
        ? "99+"
        : String(count);

    return (
      <span className="absolute -right-0.5 -top-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
        {displayCount}
      </span>
    );
  };


  return (
    <div className="min-h-screen bg-gray-50">

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}


      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 bg-white shadow-xl",
          "transition-all duration-300",
          "w-72",
          "lg:translate-x-0",
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full",
          sidebarCollapsed
            ? "lg:w-20"
            : "lg:w-72",
        ].join(" ")}
      >
        <UserSidebar
          collapsed={sidebarCollapsed}
          onNavigate={() =>
            setSidebarOpen(false)
          }
        />

        <button
          type="button"
          onClick={() =>
            setSidebarCollapsed(
              (value) => !value
            )
          }
          className="absolute -right-3 top-20 hidden h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 lg:flex"
          aria-label={
            sidebarCollapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
        >
          {sidebarCollapsed ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronLeft size={16} />
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            setSidebarOpen(false)
          }
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 lg:hidden"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </aside>

      <div
        className={[
          "min-h-screen transition-all duration-300",
          sidebarCollapsed
            ? "lg:pl-20"
            : "lg:pl-72",
        ].join(" ")}
      >

        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
         

          <div className="flex items-center gap-3">
            

            <button
              type="button"
              onClick={() =>
                setSidebarOpen(true)
              }
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu size={22} />
            </button>

            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">
                Welcome back,{" "}
                {displayName}
              </p>

              <p className="text-xs text-gray-500">
                Continue learning and
                sharing your skills.
              </p>
            </div>
          </div>


          <div className="flex items-center gap-1 sm:gap-2">
         
            <button
              type="button"
              onClick={handleChatClick}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100"
              aria-label={
                chatUnreadCount > 0
                  ? `Messages, ${chatUnreadCount} unread`
                  : "Messages"
              }
            >
              <MessageCircle size={20} />

              {renderUnreadBadge(
                chatUnreadCount
              )}
            </button>


            <button
              type="button"
              onClick={
                handleNotificationsClick
              }
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100"
              aria-label={
                notificationUnreadCount > 0
                  ? `Notifications, ${notificationUnreadCount} unread`
                  : "Notifications"
              }
            >
              <Bell size={20} />

              {renderUnreadBadge(
                notificationUnreadCount
              )}
            </button>


            <button
              type="button"
              onClick={handleProfileClick}
              className="flex items-center gap-2 rounded-full p-1.5 transition hover:bg-gray-100"
              aria-label="Open profile"
            >
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt={displayName}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                  {initials || "U"}
                </div>
              )}

              <div className="hidden text-left sm:block">
                <p className="max-w-32 truncate text-sm font-medium text-gray-900">
                  {displayName}
                </p>

                {username && (
                  <p className="max-w-32 truncate text-xs text-gray-500">
                    @{username}
                  </p>
                )}
              </div>
            </button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default UserLayout;