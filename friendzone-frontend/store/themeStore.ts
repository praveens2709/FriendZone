import { create } from 'zustand';
import { Colors } from '../constants/Colors';

export type ThemeType = keyof typeof Colors;

interface ThemeState {
  theme: ThemeType;
  availableThemes: ThemeType[];
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  availableThemes: Object.keys(Colors) as ThemeType[],
  setTheme: (theme: ThemeType) => set({ theme }),
  toggleTheme: () => {
    const { theme, availableThemes } = get();
    const currentIndex = availableThemes.indexOf(theme);
    const nextTheme = availableThemes[(currentIndex + 1) % availableThemes.length];
    set({ theme: nextTheme });
  },
}));
