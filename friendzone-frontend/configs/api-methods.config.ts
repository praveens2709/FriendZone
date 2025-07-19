import { AxiosResponse } from 'axios';
import httpClient from './axios.config';

export const _get = async <T>(url: string, accessToken?: string, params?: any): Promise<T> => {
  const config: { headers?: any; params?: any } = {};

  if (accessToken) {
    config.headers = {
      Authorization: `Bearer ${accessToken}`,
    };
  }

  if (params) {
    config.params = params;
  }

  try {
    const response: AxiosResponse<T, any> = await httpClient.get<T>(url, config);
    return response.data;
  } catch (error) {
    const endpoint = url.split('/').filter(Boolean).pop();
    console.error(`_get ${endpoint} fetching error:`, error);
    throw error;
  }
};

export const _post = async <T>(
  url: string,
  data?: any,
  accessToken?: string
): Promise<T> => {
  const endpoint = url.split('/').filter(Boolean).pop();
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
  accessToken?: string
): Promise<T> => {
  const endpoint = url.split('/').filter(Boolean).pop();
  const headers: any = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
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