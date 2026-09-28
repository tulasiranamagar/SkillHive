import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api/axios";
import { useAuth } from "../hooks/useAuth";

const NotificationContext = createContext(null);

function extractNotifications(response) {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function extractUnreadCount(response, notifications = []) {
  const data = response?.data;

  if (typeof data?.unread_count === "number") {
    return data.unread_count;
  }

  if (typeof data?.unreadCount === "number") {
    return data.unreadCount;
  }

  if (typeof data?.data?.unread_count === "number") {
    return data.data.unread_count;
  }

  return notifications.filter(
    (notification) =>
      notification?.is_read === false ||
      notification?.read === false
  ).length;
}

export function NotificationProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);

    try {
      const response = await api.get("/api/notifications/");

      const nextNotifications = extractNotifications(response);

      setNotifications(nextNotifications);
      setUnreadCount(
        extractUnreadCount(response, nextNotifications)
      );
    } catch (error) {
   
      console.error(
        "Failed to load notifications:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const markNotificationRead = useCallback(
    async (notificationId) => {
      if (!notificationId) {
        return;
      }

      try {
        await api.patch(
          `/api/notifications/${notificationId}/read/`
        );

        setNotifications((current) =>
          current.map((notification) =>
            notification.id === notificationId
              ? {
                  ...notification,
                  is_read: true,
                  read: true,
                }
              : notification
          )
        );

        setUnreadCount((current) =>
          Math.max(current - 1, 0)
        );
      } catch (error) {
        console.error(
          "Failed to mark notification as read:",
          error
        );
      }
    },
    []
  );

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await api.patch("/api/notifications/read-all/");

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
          read: true,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        "Failed to mark all notifications as read:",
        error
      );
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();
  }, [
    authLoading,
    isAuthenticated,
    fetchNotifications,
  ]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider."
    );
  }

  return context;
}

export default NotificationContext;