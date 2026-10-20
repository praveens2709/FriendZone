import axios, {
  AxiosRequestConfig,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { API_BASE_URL } from '@/constants/const';
import { AuthSession } from '@/types/auth-session.type';
import AuthServices from '@/services/AuthService';
import { getAuthSession, removeAuthSession } from '@/utils/auth-storage';

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

let refreshPromise: Promise<string> | null = null;

const refreshOnce = () => {
  if (!refreshPromise) {
    refreshPromise = AuthServices.refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

httpClient.interceptors.request.use(
  async (config: AxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    if (config.url?.includes('/refresh-token')) {
      return config as InternalAxiosRequestConfig;
    }

    const storedSession = await getAuthSession();
    if (storedSession) {
      const session: AuthSession = JSON.parse(storedSession);
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${session.accessToken}`,
      };
    }

    return config as InternalAxiosRequestConfig;
  },
  (error: AxiosError) => Promise.reject(error)
);

httpClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const errorData = error.response?.data as { message?: string };

    const isTokenExpired =
      error.response?.status === 401 &&
      errorData?.message === 'Not authorized, token failed';

    if (isTokenExpired && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshOnce();

        originalRequest.timeout = 15000;
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };

        return httpClient(originalRequest);
      } catch (refreshError) {
        await removeAuthSession();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default httpClient;
