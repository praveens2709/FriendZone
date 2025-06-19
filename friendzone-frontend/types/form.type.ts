// types/form.type.ts
export type TFormData = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dob?: Date | null;
  profileImage?: string | null;
};

export type ProfileDetailsForm = {
  firstName: string;
  lastName: string;
  gender: string;
  dob: Date | null;
  profileImage: string | null;
};