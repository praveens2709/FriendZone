// types/user.type.ts
export interface UserProfile {
  firstName: string;
  lastName: string;
  gender: "male" | "female" | "";
  dob: string;
  profileImageUri: string | null;
  email: string;
  bio?: string;
  phone?: string;
}