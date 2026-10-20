import mongoose from 'mongoose';

export const isObjectId = (value) =>
  (typeof value === 'string' || value instanceof mongoose.Types.ObjectId) &&
  mongoose.Types.ObjectId.isValid(value) &&
  String(new mongoose.Types.ObjectId(value)) === String(value);

export const toIdList = (value, max = 100) => {
  if (!Array.isArray(value)) return null;
  const ids = [...new Set(value.map(String))];
  if (ids.length > max || !ids.every(isObjectId)) return null;
  return ids;
};

export const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const cleanString = (value, max) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
};

export const normalizeEmail = (value) =>
  typeof value === 'string' ? value.toLowerCase().trim() : '';

export const isEmail = (value) =>
  typeof value === 'string' &&
  value.length <= 254 &&
  /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/.test(value);

export const calculateAge = (dob) => {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
};
