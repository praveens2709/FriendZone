// context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useLayoutEffect,
} from "react";
import {
  getAuthSession,
  storeAuthSession,
  removeAuthSession,
} from "@/utils/auth-storage";
import { removeFilterSettings } from "@/utils/filter-storage";
import { AuthSession } from "@/types/auth-session.type";
import AuthServices from "@/services/AuthService";
import { useThemeStore, ThemeType } from "@/store/themeStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProfile } from "@/types/user.type";
import ProfileServices from "@/services/ProfileService";

interface AuthContextType {
  isAuthenticated: boolean;
  session: AuthSession | null;
  authLoading: boolean;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  updateUserTheme: (theme: ThemeType) => Promise<void>;
  user: UserProfile | null;
  loadUserProfile: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  const setThemeFromStore = useThemeStore((state) => state.setTheme);
  const availableThemes = useThemeStore((state) => state.availableThemes);

  useLayoutEffect(() => {
    (async () => {
      try {
        const storedSessionString = await getAuthSession();
        if (!storedSessionString) {
          console.log("[AuthContext] No stored session found.");
          setIsAuthenticated(false);
          return;
        }

        const parsedSession: AuthSession = JSON.parse(storedSessionString);
        setSession(parsedSession);

        if (
          parsedSession.theme &&
          availableThemes.includes(parsedSession.theme as ThemeType)
        ) {
          setThemeFromStore(parsedSession.theme as ThemeType);
          console.log(
            `[AuthContext] Applied theme from stored session: ${parsedSession.theme}`
          );
        } else {
          console.log(
            "[AuthContext] Stored session has no theme or invalid theme. Keeping existing theme."
          );
        }

        try {
          await loadUserProfile();
          console.log("[AuthContext] User profile loaded successfully.");
          setIsAuthenticated(true);
        } catch {
          console.log(
            "[AuthContext] Invalid session or user deleted. Logging out."
          );
          await signOut();
        }
      } catch (err) {
        console.error("Error loading auth session:", err);
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, [setThemeFromStore, availableThemes]);

  const signIn = async (sessionData: AuthSession) => {
    console.log("[AuthContext] Signing in with session data:", sessionData);
    await storeAuthSession(sessionData);
    const check = await getAuthSession();
    console.log("[AuthContext] Session written to storage?", !!check);
    setSession(sessionData);
    setIsAuthenticated(true);
    if (
      sessionData.theme &&
      availableThemes.includes(sessionData.theme as ThemeType)
    ) {
      setThemeFromStore(sessionData.theme as ThemeType);
      console.log(
        `[AuthContext] Applied theme from sign-in: ${sessionData.theme}`
      );
    } else {
      console.log(
        "[AuthContext] Sign-in session has no theme or invalid theme. Keeping existing theme."
      );
    }
    await loadUserProfile();
  };

  const signOut = async () => {
    console.log("[AuthContext] Signing out.");
    await removeAuthSession();
    await removeFilterSettings();
    await AsyncStorage.removeItem("userToken");
    setSession(null);
    setIsAuthenticated(false);
    setUser(null);
  };

  const signUp = async (email: string, password: string) => {
    await AuthServices.signUp({ email, password });
    console.log("[AuthContext] User signed up.");
  };

  const updateUserTheme = async (theme: ThemeType) => {
    if (!session) {
      throw new Error("No active session to update theme.");
    }

    try {
      await AuthServices.updateTheme(session.accessToken, theme);
      const updatedSession = { ...session, theme };
      setSession(updatedSession);
      await storeAuthSession(updatedSession);
      setThemeFromStore(theme);

      console.log(`[AuthContext] User theme updated to: ${theme}`);
    } catch (error) {
      console.error("Failed to update user theme:", error);
      throw error;
    }
  };

  const loadUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (token) {
        const profileData = await ProfileServices.getProfile();
        setUser(profileData);
      }
    } catch (error: any) {
      console.error("Failed to load user profile:", error);
      await signOut();
      throw error;
    }
  };

  const updateProfile = async (profileData: any) => {
    try {
      const formData = new FormData();
      formData.append("firstName", profileData.firstName);
      formData.append("lastName", profileData.lastName);
      formData.append("gender", profileData.gender);
      const dob =
        profileData.dob instanceof Date
          ? profileData.dob
          : new Date(profileData.dob);
      formData.append("dob", dob.toISOString().split("T")[0]);

      if (profileData.profileImageUri) {
        const uriParts = profileData.profileImageUri.split(".");
        const fileType = uriParts[uriParts.length - 1];
        const fileName = `profile.${fileType}`;
        formData.append("profileImage", {
          uri: profileData.profileImageUri,
          name: fileName,
          type: `image/${fileType}`,
        } as any);
      }

      const response = await ProfileServices.updateProfile(formData);
      setUser(response.user);
      await loadUserProfile();
    } catch (error) {
      console.error("Failed to update profile:", error);
      throw new Error("Failed to update profile");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        session,
        authLoading,
        signIn,
        signOut,
        signUp,
        updateUserTheme,
        user,
        loadUserProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
