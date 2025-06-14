// types/form.type.ts
export type TFormData = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  gender?: 'male' | 'female' | '';
  dob?: Date | null;
  profileImageUri?: string | null;
};

export type ProfileDetailsForm = {
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | '';
  dob: Date | null;
  profileImageUri: string | null;
};