import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useLayoutEffect,
  useCallback,
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
import { User } from "@/types/user.type";
import { getApiError } from "@/constants/Functions";
import ProfileServices from "@/services/ProfileService";

interface AuthContextType {
  isAuthenticated: boolean;
  session: AuthSession | null;
  authLoading: boolean;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  updateUserTheme: (theme: ThemeType) => Promise<void>;
  user: User | null;
  loadUserProfile: (tokenOverride?: string | null) => Promise<void>;
  fetchProfile: () => Promise<User>;
  updateProfile: (data: any) => Promise<void>;
  accessToken: string | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const setThemeFromStore = useThemeStore((state) => state.setTheme);
  const availableThemes = useThemeStore((state) => state.availableThemes);

  const signOut = useCallback(async () => {
    await AuthServices.logout();
    await removeAuthSession();
    await removeFilterSettings();
    setSession(null);
    setAccessToken(null);
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const loadUserProfile = useCallback(
    async (tokenOverride?: string | null) => {
      let token = tokenOverride;
      if (!token) {
        const stored = await getAuthSession();
        token = stored ? (JSON.parse(stored) as AuthSession).accessToken : null;
      }
      try {
        if (token) {
          const userProfile = await ProfileServices.getProfile(token);
          setUser(userProfile);
        }
      } catch (error: any) {
        await signOut();
        throw error;
      }
    },
    [signOut]
  );

  const fetchProfile = useCallback(async () => {
    if (!accessToken) {
      throw new Error("No access token available.");
    }
    const userProfile = await ProfileServices.getProfile(accessToken);
    setUser(userProfile);
    return userProfile;
  }, [accessToken]);

  useLayoutEffect(() => {
    (async () => {
      try {
        const storedSessionString = await getAuthSession();
        if (!storedSessionString) {
          setIsAuthenticated(false);
          setAccessToken(null);
          return;
        }

        const parsedSession: AuthSession = JSON.parse(storedSessionString);
        setSession(parsedSession);
        setAccessToken(parsedSession.accessToken || null);

        if (
          parsedSession.theme &&
          availableThemes.includes(parsedSession.theme as ThemeType)
        ) {
          setThemeFromStore(parsedSession.theme as ThemeType);
        }

        try {
          await loadUserProfile(parsedSession.accessToken);
          setIsAuthenticated(true);
        } catch {
          await signOut();
        }
      } catch (err) {
        setIsAuthenticated(false);
        setAccessToken(null);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, [setThemeFromStore, availableThemes, loadUserProfile, signOut]);

  const signIn = async (sessionData: AuthSession) => {
    await storeAuthSession(sessionData);
    setSession(sessionData);
    setAccessToken(sessionData.accessToken || null);
    setIsAuthenticated(true);
    if (
      sessionData.theme &&
      availableThemes.includes(sessionData.theme as ThemeType)
    ) {
      setThemeFromStore(sessionData.theme as ThemeType);
    }
    await loadUserProfile(sessionData.accessToken);
  };

  const signUp = async (email: string, password: string) => {
    await AuthServices.signUp({ email, password, acceptedTerms: true });
  };

  const updateUserTheme = async (theme: ThemeType) => {
    if (!session) {
      throw new Error("No active session to update theme.");
    }

    const previousTheme = useThemeStore.getState().theme;
    setThemeFromStore(theme);

    try {
      await AuthServices.updateTheme(session.accessToken, theme);
      const updatedSession = { ...session, theme };
      setSession(updatedSession);
      await storeAuthSession(updatedSession);
    } catch (error) {
      setThemeFromStore(previousTheme);
      throw error;
    }
  };

  const updateProfile = async (profileData: any) => {
    try {
      if (!accessToken) {
        throw new Error("No access token available for profile update.");
      }

      const formData = new FormData();
      if (profileData.firstName) {
        formData.append("firstName", profileData.firstName);
      }
      
      if (profileData.lastName) {
        formData.append("lastName", profileData.lastName);
      }
      
      if (profileData.bio !== undefined) {
        formData.append("bio", profileData.bio);
      }
      
      if (profileData.gender) {
        formData.append("gender", profileData.gender);
      }
      if (profileData.dob) {
        const dob =
          profileData.dob instanceof Date
            ? profileData.dob
            : new Date(profileData.dob);
        if (!Number.isNaN(dob.getTime())) {
          const formattedDob = `${dob.getFullYear()}-${(dob.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${dob.getDate().toString().padStart(2, "0")}`;
          formData.append("dob", formattedDob);
        }
      }

      if (profileData.profileImage && !/^https?:\/\//i.test(profileData.profileImage)) {
        const uriParts = profileData.profileImage.split(".");
        const rawType = (uriParts[uriParts.length - 1] || "jpeg").toLowerCase().split("?")[0];
        const fileType = rawType === "jpg" ? "jpeg" : rawType;
        formData.append("profileImage", {
          uri: profileData.profileImage,
          name: `profile.${rawType}`,
          type: `image/${fileType}`,
        } as any);
      }

      const response = await ProfileServices.updateProfile(
        formData,
        accessToken
      );
      setUser(response.user);
    } catch (error) {
      throw new Error(getApiError(error).message);
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
        fetchProfile,
        updateProfile,
        accessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
