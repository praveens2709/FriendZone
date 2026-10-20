export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  additionalImages?: string[];
  gender?: string;
  dob?: Date;
  bio?: string;
  phone?: string;
  theme: string;
  isVerified: boolean;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  __v?: number;
  hasStory?: boolean;
  storySeen?: boolean;
  isLockedIn?: boolean;
  termsAccepted?: boolean;
  vibe?: { kind: string; note?: string; expiresAt: string } | null;
  relationship?: UserRelationship;
}

export interface UserRelationship {
  isLockedIn: boolean;
  lockedInCount: number;
  mutualCount: number;
  mutualNames: string[];
  vibe: { kind: string; note?: string; expiresAt: string } | null;
}

export interface UserProfileResponse {
  success: boolean;
  user: User;
  relationship?: UserRelationship;
}