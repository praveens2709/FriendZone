// types.ts

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  additionalImages?: string[];
  gender?: string;
  dob?: string;
  bio?: string;
  theme: string;
  isVerified: boolean;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface UserProfileResponse {
  success: boolean;
  user: User;
}
