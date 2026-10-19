"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [highContrast, setHighContrastState] = useState(false);
  const [mounted, setMounted] = useState(false);
  const highContrastStorageKey = `${storageKey}-high-contrast`;

  // Resolve system theme preference
  const resolveTheme = (t: Theme): "light" | "dark" => {
    if (t !== "system") return t;
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  // Initialize theme from storage or use default
  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Theme | null;
    const initial = stored || defaultTheme;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate persisted preferences after mount
    setThemeState(initial);
    setResolvedTheme(resolveTheme(initial));
    setHighContrastState(localStorage.getItem(highContrastStorageKey) === "true");
    setMounted(true);
  }, [defaultTheme, highContrastStorageKey, storageKey]);

  // Listen to system theme changes
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      setResolvedTheme(resolveTheme("system"));
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Apply theme to DOM
  useEffect(() => {
    if (!mounted) return;

    const html = document.documentElement;
    const isDark = resolvedTheme === "dark";

    // Update class
    if (isDark) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }

    // Update media query for consistency
    html.classList.toggle("high-contrast", highContrast);
    html.style.colorScheme = highContrast ? "light" : resolvedTheme;
  }, [resolvedTheme, highContrast, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    setResolvedTheme(resolveTheme(newTheme));
    localStorage.setItem(storageKey, newTheme);
  };

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
    localStorage.setItem(highContrastStorageKey, String(enabled));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        highContrast,
        setHighContrast,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
