import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import api, {
  clearAuthStorage,
  getAccessToken,
  setAuthTokens,
} from "../api/axios";

export const AuthContext = createContext(null);

function normalizeUser(responseData) {
  const baseUser =
    responseData?.user ||
    responseData?.data?.user ||
    null;

  const profile =
    responseData?.profile ||
    responseData?.data?.profile ||
    baseUser?.profile ||
    {};

  const accountStatus =
    responseData?.account_status ||
    responseData?.data?.account_status ||
    {};

  if (!baseUser) {
    return null;
  }

  return {
    ...baseUser,

    profile,

    onboarding_completed:
      baseUser?.onboarding_completed ??
      profile?.onboarding_completed ??
      accountStatus?.onboarding_completed ??
      false,

    onboarding_skipped:
      baseUser?.onboarding_skipped ??
      profile?.onboarding_skipped ??
      accountStatus?.onboarding_skipped ??
      false,
  };
}

function checkIsAdmin(currentUser) {
  if (!currentUser) {
    return false;
  }

  return (
    currentUser.is_admin === true ||
    currentUser.role === "admin" ||
    currentUser.is_staff === true ||
    currentUser.profile?.role === "admin"
  );
}



function checkNeedsOnboarding(currentUser) {
  if (!currentUser) {
    return false;
  }

  return (
    currentUser.onboarding_completed !== true &&
    currentUser.onboarding_skipped !== true
  );
}


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);


  const initializationStarted = useRef(false);

 

  const loadCurrentUser = useCallback(async () => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      setUser(null);
      setLoading(false);

      return null;
    }

    try {
      setLoading(true);

      const response = await api.get("/api/accounts/me/");

      const normalizedUser = normalizeUser(response.data);

      if (!normalizedUser) {
        throw new Error(
          "Invalid account response from /api/accounts/me/."
        );
      }

      setUser(normalizedUser);

      localStorage.setItem(
        "skillhive_user",
        JSON.stringify(normalizedUser)
      );

      return normalizedUser;
    } catch (error) {
      console.error(
        "Failed to load current user:",
        error
      );

      clearAuthStorage();

      setUser(null);

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initializationStarted.current) {
      return;
    }

    initializationStarted.current = true;

    loadCurrentUser();
  }, [loadCurrentUser]);

 

  const login = useCallback(async (credentials) => {
 
    clearAuthStorage();

    setUser(null);

    const email = credentials?.email
      ?.trim()
      .toLowerCase();

    const password = credentials?.password;

    if (!email || !password) {
      throw new Error(
        "Email and password are required."
      );
    }

    const response = await api.post(
      "/api/token/",
      {
        email,
        password,
      }
    );

    const responseData = response.data;

    const access =
      responseData?.access ||
      responseData?.data?.access ||
      null;

    const refresh =
      responseData?.refresh ||
      responseData?.data?.refresh ||
      null;

    if (!access) {
      throw new Error(
        "Login succeeded but no access token was returned."
      );
    }

    setAuthTokens(access, refresh);

    try {
      const meResponse =
        await api.get("/api/accounts/me/");

      const normalizedUser =
        normalizeUser(meResponse.data);

      if (!normalizedUser) {
        throw new Error(
          "Invalid account response from /api/accounts/me/."
        );
      }

      const authenticatedUser = {
        ...normalizedUser,

        is_admin:
          normalizedUser.is_admin === true ||
          normalizedUser.role === "admin" ||
          normalizedUser.is_staff === true ||
          normalizedUser.profile?.role === "admin",
      };

      setUser(authenticatedUser);

      localStorage.setItem(
        "skillhive_user",
        JSON.stringify(authenticatedUser)
      );

      
      return authenticatedUser;
    } catch (error) {
      console.error(
        "Failed to load account after login:",
        error
      );

      clearAuthStorage();

      setUser(null);

      throw error;
    }
  }, []);

  
  const register = useCallback(
    async (payload) => {
      const response = await api.post(
        "/api/accounts/register/",
        payload
      );

      const responseData = response.data;

      const access =
        responseData?.access ||
        responseData?.data?.access ||
        null;

      const refresh =
        responseData?.refresh ||
        responseData?.data?.refresh ||
        null;

      
      if (!access) {
        return responseData;
      }

      setAuthTokens(access, refresh);

      try {
        const meResponse =
          await api.get("/api/accounts/me/");

        const normalizedUser =
          normalizeUser(meResponse.data);

        if (!normalizedUser) {
          throw new Error(
            "Invalid account response from /api/accounts/me/."
          );
        }

        const authenticatedUser = {
          ...normalizedUser,

          is_admin:
            normalizedUser.is_admin === true ||
            normalizedUser.role === "admin" ||
            normalizedUser.is_staff === true ||
            normalizedUser.profile?.role === "admin",
        };

        setUser(authenticatedUser);

        localStorage.setItem(
          "skillhive_user",
          JSON.stringify(authenticatedUser)
        );

        return authenticatedUser;
      } catch (error) {
        console.error(
          "Failed to load account after registration:",
          error
        );

        clearAuthStorage();

        setUser(null);

        throw error;
      }
    },
    []
  );

  const logout = useCallback(() => {
    clearAuthStorage();

    setUser(null);
  }, []);


  const refreshUser = useCallback(async () => {
    return loadCurrentUser();
  }, [loadCurrentUser]);


  const markOnboardingCompleted =
    useCallback(() => {
      setUser((currentUser) => {
        if (!currentUser) {
          return currentUser;
        }

        const updatedUser = {
          ...currentUser,

          onboarding_completed: true,

          onboarding_skipped: false,

          profile: {
            ...(currentUser.profile || {}),

            onboarding_completed: true,

            onboarding_skipped: false,
          },
        };

        localStorage.setItem(
          "skillhive_user",
          JSON.stringify(updatedUser)
        );

        return updatedUser;
      });
    }, []);

  const markOnboardingSkipped =
    useCallback(() => {
      setUser((currentUser) => {
        if (!currentUser) {
          return currentUser;
        }

        const updatedUser = {
          ...currentUser,

          onboarding_completed: false,

          onboarding_skipped: true,

          profile: {
            ...(currentUser.profile || {}),

            onboarding_completed: false,

            onboarding_skipped: true,
          },
        };

        localStorage.setItem(
          "skillhive_user",
          JSON.stringify(updatedUser)
        );

        return updatedUser;
      });
    }, []);

  const isAuthenticated = Boolean(user);

  const isAdmin = useMemo(
    () => checkIsAdmin(user),
    [user]
  );

  const needsOnboarding = useMemo(
    () => checkNeedsOnboarding(user),
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      loading,

      isAuthenticated,
      isAdmin,
      needsOnboarding,

      login,
      register,
      logout,
      refreshUser,

      markOnboardingCompleted,
      markOnboardingSkipped,
    }),
    [
      user,
      loading,

      isAuthenticated,
      isAdmin,
      needsOnboarding,

      login,
      register,
      logout,
      refreshUser,

      markOnboardingCompleted,
      markOnboardingSkipped,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;