"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

export const ACCENT_COLORS: Record<string, { main: string; dark: string; light: string }> = {
  rose:   { main: "#f43f5e", dark: "#e11d48", light: "#fb7185" },
  purple: { main: "#a855f7", dark: "#7c3aed", light: "#c084fc" },
  gold:   { main: "#f59e0b", dark: "#d97706", light: "#fbbf24" },
  teal:   { main: "#06b6d4", dark: "#0891b2", light: "#22d3ee" },
  green:  { main: "#10b981", dark: "#059669", light: "#34d399" },
};

export function applyAccentColor(color: string) {
  const pal = ACCENT_COLORS[color] || ACCENT_COLORS.rose;
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--accent-rose", pal.main);
    document.documentElement.style.setProperty("--accent-rose-dark", pal.dark);
    document.documentElement.style.setProperty("--accent-rose-light", pal.light);
  }
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  accentColor: "rose",
  setAccentColor: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [accentColor, setAccentColorState] = useState<string>("rose");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("wyapar-theme") as Theme | null;
    const preferredTheme = storedTheme || "light";
    setTheme(preferredTheme);
    document.documentElement.setAttribute("data-theme", preferredTheme);

    const storedAccent = localStorage.getItem("wyapar-accent-color") || "rose";
    setAccentColorState(storedAccent);
    applyAccentColor(storedAccent);

    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("wyapar-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    localStorage.setItem("wyapar-accent-color", color);
    applyAccentColor(color);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

