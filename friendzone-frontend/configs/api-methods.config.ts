// configs/api-methods.config.ts
import { AxiosResponse } from 'axios';
import httpClient from './axios.config';

export const _get = async <T>(url: string, data?: any, headers?: any): Promise<T> => {
  const endpoint = url.split('/').filter(Boolean).pop();
  console.log(endpoint);

  if (data) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      if (value !== null) {
        Array.isArray(value)
          ? params.append(key, JSON.stringify(value))
          : params.append(key, (value as string | number).toString());
      }
    }
    url += `?${params}`;
  }

  try {
    const response: AxiosResponse<T, any> = await httpClient.get<T>(url, headers && headers);
    return response.data;
  } catch (error) {
    console.error(`${endpoint} fetching error:`, error);
    throw error;
  }
};

export const _post = async <T>(
  url: string,
  data?: any,
  accessToken?: string
): Promise<T> => {
  const endpoint = url.split('/').filter(Boolean).pop();
  console.log(endpoint);

  const headers: any = {};

  headers.Authorization = accessToken ? `Bearer ${accessToken}` : '';

  if (data instanceof FormData) headers['Content-Type'] = 'multipart/form-data';

  try {
    const response: AxiosResponse<T, any> = await httpClient.post<T>(url, data || {}, { headers });
    return response.data;
  } catch (error) {
    console.error(`${endpoint} request error: `, error);
    throw error;
  }
};

export const _put = async <T>(
  url: string,
  data?: any,
  accessToken?: string
): Promise<T> => {
  const endpoint = url.split('/').filter(Boolean).pop();
  console.log(endpoint);

  const headers: any = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (data instanceof FormData) headers['Content-Type'] = 'multipart/form-data';

  try {
    const response: AxiosResponse<T, any> = await httpClient.put<T>(url, data || {}, { headers });
    return response.data;
  } catch (error) {
    console.error(`${endpoint} put error:`, error);
    throw error;
  }
};

export const _patch = async <T>(
  url: string,
  data?: any,
  accessToken?: string // ADD THIS PARAMETER
): Promise<T> => {
  const endpoint = url.split('/').filter(Boolean).pop();
  console.log(endpoint);

  const headers: any = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`; // ADD THIS LINE
  if (data instanceof FormData) headers['Content-Type'] = 'multipart/form-data';

  try {
    const response: AxiosResponse<T, any> = await httpClient.patch<T>(url, data || {}, { headers });
    return response.data;
  } catch (error) {
    console.error(`${endpoint} patch error: `, error);
    throw error;
  }
};

export const _delete = async <T>(url: string, data?: any, headers?: any): Promise<T> => {
  const endpoint = url.split('/').filter(Boolean).pop();
  console.log(endpoint);

  if (data) {
    url += '?';
    for (let key in data) {
      url = `${url}${key}=${data[key]}&`;
    }
    url = url.substring(0, url.length - 1);
  }

  try {
    const response: AxiosResponse<T, any> = await httpClient.delete<T>(url, headers && headers);
    return response.data;
  } catch (error) {
    console.error(`${endpoint} delete error: `, error);
    throw error;
  }
};