import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
});



export const getAccessToken = () => {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    null
  );
};

export const getRefreshToken = () => {
  return (
    localStorage.getItem("refresh_token") ||
    null
  );
};

export const setAuthTokens = (
  accessToken,
  refreshToken = null
) => {
  if (accessToken) {
    localStorage.setItem(
      "access_token",
      accessToken
    );

   
    localStorage.setItem(
      "token",
      accessToken
    );
  }

  if (refreshToken) {
    localStorage.setItem(
      "refresh_token",
      refreshToken
    );
  }
};

export const clearAuthStorage = () => {
  localStorage.removeItem(
    "access_token"
  );

  localStorage.removeItem(
    "refresh_token"
  );

  localStorage.removeItem(
    "token"
  );

  localStorage.removeItem(
    "skillhive_user"
  );
};


api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


let isRefreshing = false;

let refreshSubscribers = [];


const subscribeToTokenRefresh = (
  resolve,
  reject
) => {
  refreshSubscribers.push({
    resolve,
    reject,
  });
};


const resolveRefreshSubscribers = (
  newAccessToken
) => {
  const subscribers =
    refreshSubscribers;

  refreshSubscribers = [];

  subscribers.forEach(
    ({ resolve }) => {
      resolve(newAccessToken);
    }
  );
};



const rejectRefreshSubscribers = (
  error
) => {
  const subscribers =
    refreshSubscribers;

  refreshSubscribers = [];

  subscribers.forEach(
    ({ reject }) => {
      reject(error);
    }
  );
};


const refreshAccessToken = async () => {
  const refreshToken =
    getRefreshToken();

  if (!refreshToken) {
    throw new Error(
      "No refresh token available."
    );
  }

  const response =
    await axios.post(
      `${API_BASE_URL}/api/token/refresh/`,
      {
        refresh: refreshToken,
      },
      {
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );

  const newAccessToken =
    response.data?.access ||
    response.data?.data?.access ||
    null;

  const newRefreshToken =
    response.data?.refresh ||
    response.data?.data?.refresh ||
    null;

  if (!newAccessToken) {
    throw new Error(
      "Token refresh did not return an access token."
    );
  }

  setAuthTokens(
    newAccessToken,
    newRefreshToken || refreshToken
  );

  return newAccessToken;
};

api.interceptors.response.use(
  (response) => {
    return response;
  },

  async (error) => {
    const originalRequest =
      error.config;

  
    if (!error.response) {
      return Promise.reject(error);
    }

  
    if (
      error.response.status !== 401 ||
      !originalRequest
    ) {
      return Promise.reject(error);
    }

    const requestUrl =
      originalRequest.url || "";

    if (
      requestUrl.includes(
        "/api/token/"
      )
    ) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      clearAuthStorage();

      return Promise.reject(error);
    }

    const refreshToken =
      getRefreshToken();

    if (!refreshToken) {
      clearAuthStorage();

      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise(
        (resolve, reject) => {
          subscribeToTokenRefresh(
            resolve,
            reject
          );
        }
      ).then(
        (newAccessToken) => {
          originalRequest._retry =
            true;

          originalRequest.headers =
            originalRequest.headers || {};

          originalRequest.headers.Authorization =
            `Bearer ${newAccessToken}`;

          return api(
            originalRequest
          );
        }
      );
    }

    
    originalRequest._retry = true;

    isRefreshing = true;

    try {
      const newAccessToken =
        await refreshAccessToken();

    
      resolveRefreshSubscribers(
        newAccessToken
      );


      originalRequest.headers =
        originalRequest.headers || {};

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return api(
        originalRequest
      );
    } catch (refreshError) {
   
      clearAuthStorage();

      rejectRefreshSubscribers(
        refreshError
      );

      return Promise.reject(
        refreshError
      );
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;