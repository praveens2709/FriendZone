import React, { useEffect } from "react";
import { StyleSheet, TextInput, Alert, ScrollView } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Button from "@/components/Button";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { useLoadingDialog } from "@/context/LoadingContext";
import AuthFormLayout from "@/components/AuthFormLayout";
import ImagePickerComponent from "@/components/ImagePickerComponent";
import DateTimePickerComponent from "@/components/DateTimePickerComponent";
import { ProfileDetailsForm } from "@/types/form.type";
import { showToast } from "@/constants/Functions";
import ModalComponent from "@/components/ModalComponent";
import ThemedScrollView from "@/components/ThemedScrollView";

export default function ProfileDetailsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const loadingDialog = useLoadingDialog();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileDetailsForm>({
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      gender: user?.gender || "",
      dob: user?.dob ? new Date(user.dob) : null,
      profileImage: user?.profileImage || null,
    },
  });

  const selectedProfileImage = watch("profileImage");

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);

  useEffect(() => {
    if (user) {
      setValue("firstName", user.firstName || "");
      setValue("lastName", user.lastName || "");
      setValue("gender", user.gender || "");
      setValue("dob", user.dob ? new Date(user.dob) : null);
      setValue("profileImage", user.profileImage || null);
    }
  }, [user, setValue]);

  const onSubmit: SubmitHandler<ProfileDetailsForm> = async (data) => {
    try {
      loadingDialog.show();
      console.log("Profile details submitted:", data);
      await updateProfile(data);
      showToast("success", "Profile details saved successfully!");
      router.push("/home");
    } catch (err: any) {
      showToast("error", err.message || "Failed to save profile details.");
    } finally {
      loadingDialog.hide();
    }
  };

  return (
    <AuthFormLayout>
      <ThemedScrollView
        style={{ backgroundColor: "transparent"}}
      >
        <ThemedView style={styles.container}>
          <ThemedText style={styles.title}>
            Profile Details
          </ThemedText>
          <Controller
            control={control}
            name="profileImage"
            render={({ field: { onChange, value } }) => (
              <ThemedView style={styles.textBoxContainer}>
                <ImagePickerComponent
                  currentImageUri={selectedProfileImage}
                  onImageSelected={(uri) => onChange(uri)}
                />
                {errors.profileImage && (
                  <ThemedText style={styles.errorText}>
                    {errors.profileImage.message}
                  </ThemedText>
                )}
              </ThemedView>
            )}
          />
          <ThemedView style={styles.formContent}>
            <Controller
              control={control}
              name="firstName"
              rules={{ required: "First Name is required" }}
              render={({ field: { onChange, onBlur, value } }) => (
                <ThemedView style={styles.textBoxContainer}>
                  <ThemedText style={styles.label}>
                    First Name
                  </ThemedText>
                  <TextInput
                    placeholder="First Name"
                    placeholderTextColor={colors.textDim}
                    style={[
                      styles.input,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    value={value}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    onChangeText={onChange}
                  />
                  {errors.firstName && (
                    <ThemedText style={styles.errorText}>
                      {errors.firstName.message}
                    </ThemedText>
                  )}
                </ThemedView>
              )}
            />
            <Controller
              control={control}
              name="lastName"
              rules={{ required: "Last Name is required" }}
              render={({ field: { onChange, onBlur, value } }) => (
                <ThemedView style={styles.textBoxContainer}>
                  <ThemedText style={styles.label}>
                    Last Name
                  </ThemedText>
                  <TextInput
                    placeholder="Last Name"
                    placeholderTextColor={colors.textDim}
                    style={[
                      styles.input,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    value={value}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    onChangeText={onChange}
                  />
                  {errors.lastName && (
                    <ThemedText style={styles.errorText}>
                      {errors.lastName.message}
                    </ThemedText>
                  )}
                </ThemedView>
              )}
            />
            <Controller
              control={control}
              name="gender"
              rules={{ required: "Gender is required" }}
              render={({ field: { onChange, value } }) => (
                <ThemedView style={styles.textBoxContainer}>
                  <ModalComponent
                    label="Gender"
                    data={[
                      { label: "Male", value: "male" },
                      { label: "Female", value: "female" },
                    ]}
                    value={value}
                    onValueChange={onChange}
                    placeholder="Select Gender"
                  />
                  {errors.gender && (
                    <ThemedText style={styles.errorText}>
                      {errors.gender.message}
                    </ThemedText>
                  )}
                </ThemedView>
              )}
            />
            <Controller
              control={control}
              name="dob"
              rules={{
                required: "Date of Birth is required",
                validate: (value) => {
                  if (!value) return "Date of Birth is required";
                  const dobDate =
                    value instanceof Date ? value : new Date(value);
                  const age = new Date().getFullYear() - dobDate.getFullYear();
                  return age >= 18 || "You must be at least 18 years old.";
                },
              }}
              render={({ field: { onChange, value } }) => (
                <ThemedView style={styles.textBoxContainer}>
                  <DateTimePickerComponent
                    label="Date of Birth"
                    value={value}
                    onDateChange={onChange}
                    maximumDate={maxDate}
                  />
                  {errors.dob && (
                    <ThemedText style={styles.errorText}>
                      {errors.dob.message}
                    </ThemedText>
                  )}
                </ThemedView>
              )}
            />
          </ThemedView>
          <Button
            title="Save Profile"
            onPress={handleSubmit(onSubmit)}
            style={styles.saveButton}
          />
        </ThemedView>
      </ThemedScrollView>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 20,
  },
  formContent: {
    width: "100%",
    gap: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    marginLeft: 5,
    fontWeight: 500,
  },
  textBoxContainer: {
    width: "100%",
  },
  input: {
    width: "100%",
    padding: 15,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
  },
  saveButton: {
    width: "100%",
    marginBottom: 20,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 0,
    marginLeft: 5,
  },
});
