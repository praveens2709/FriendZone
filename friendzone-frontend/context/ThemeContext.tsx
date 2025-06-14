import React, { createContext, useContext, ReactNode } from 'react';
import { Colors } from '../constants/Colors';
import { useThemeStore, ThemeType } from '../store/themeStore';

interface ThemeContextType {
  theme: ThemeType;
  colors: typeof Colors.light;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  colors: Colors.light,
  toggleTheme: () => {},
  setTheme: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const currentColors = Colors[theme] ?? Colors.light;

  return (
    <ThemeContext.Provider value={{ theme, colors: currentColors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
