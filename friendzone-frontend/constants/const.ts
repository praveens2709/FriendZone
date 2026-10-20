export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/';

export const MIN_USER_AGE = 18;
export const MAX_USER_AGE = 100;

export const USER_GENDER = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
