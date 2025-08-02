import axios, {
  AxiosRequestConfig,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/const';
import { AuthSession } from '@/types/auth-session.type';
import AuthServices from '@/services/AuthService';

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

httpClient.interceptors.request.use(
  async (config: AxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    if (config.url?.includes('/refresh-token')) {
      return config as InternalAxiosRequestConfig;
    }

    const storedSession = await AsyncStorage.getItem('AuthSession');
    if (storedSession) {
      const session: AuthSession = JSON.parse(storedSession);
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${session.accessToken}`,
      };
    }

    return config as InternalAxiosRequestConfig;
  },
  (error: AxiosError) => {
    console.error('Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

httpClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const errorData = error.response?.data as { message?: string };

    const isTokenExpired =
      error.response?.status === 401 &&
      errorData?.message === 'Not authorized, token failed';

    if (isTokenExpired && !originalRequest._retry) {
      originalRequest._retry = true;

      console.log('[Interceptor] Token expired. Attempting refresh...');

      try {
        const newAccessToken = await AuthServices.refreshAccessToken();

        console.log('[Interceptor] New access token:', newAccessToken);

        originalRequest.timeout = 15000;

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };

        return httpClient(originalRequest);
      } catch (refreshError) {
        console.error('[Interceptor] Token refresh failed:', refreshError);
        await AsyncStorage.removeItem('AuthSession');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default httpClient;
