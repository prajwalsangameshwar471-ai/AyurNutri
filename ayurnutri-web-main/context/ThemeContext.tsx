"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export const LightColors = {
  green: "#1B4332",
  gold: "#D4A24E",
  cream: "#FDF8F0",
  background: "#F5F0E8",
  surface: "#F5F0E8",
  card: "#FFFFFF",
  headerBg: "#1B4332",
  text: "#1B4332",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  textOnHeader: "#FDF8F0",
  textOnHeaderSub: "rgba(253,248,240,0.45)",
  inputBg: "#F5F0E8",
  inputText: "#1F2937",
  inputBorder: "rgba(0,0,0,0.04)",
  cardBorder: "rgba(0,0,0,0.08)",
  divider: "rgba(0,0,0,0.04)",
  primaryBtn: "#1B4332",
  primaryBtnText: "#D4A24E",
  tabBarActive: "#D4A24E",
  tabBarInactive: "#B8B0A4",
  tipBg: "#FFFBEB",
  tipBorder: "#FEF3C7",
  tipText: "#92400E",
  successBg: "#ECFDF5",
  successBorder: "#A7F3D0",
  successText: "#059669",
  errorBg: "#FEF2F2",
  errorBorder: "#FECACA",
  errorText: "#DC2626",
  shadow: "#000",
  headerOverlay: "rgba(255,255,255,0.1)",
  headerBorder: "rgba(255,255,255,0.2)",
};

export const DarkColors = {
  green: "#34D399",
  gold: "#FDE047",
  cream: "#F3F4F6",
  background: "#090E0B",
  surface: "#111A14",
  card: "#16221A",
  headerBg: "#0B120E",
  text: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  textOnHeader: "#F8FAFC",
  textOnHeaderSub: "rgba(248,250,252,0.6)",
  inputBg: "#111A14",
  inputText: "#F8FAFC",
  inputBorder: "rgba(255,255,255,0.08)",
  cardBorder: "rgba(255,255,255,0.08)",
  divider: "rgba(255,255,255,0.06)",
  primaryBtn: "#10B981",
  primaryBtnText: "#022C22",
  tabBarActive: "#FDE047",
  tabBarInactive: "#FFFFFF",
  tipBg: "rgba(253, 224, 71, 0.08)",
  tipBorder: "rgba(253, 224, 71, 0.15)",
  tipText: "#FDE047",
  successBg: "rgba(16, 185, 129, 0.08)",
  successBorder: "rgba(16, 185, 129, 0.2)",
  successText: "#34D399",
  errorBg: "rgba(239, 68, 68, 0.08)",
  errorBorder: "rgba(239, 68, 68, 0.2)",
  errorText: "#F87171",
  shadow: "#000",
  headerOverlay: "rgba(255,255,255,0.05)",
  headerBorder: "rgba(255,255,255,0.1)",
};

export type ThemeColors = typeof LightColors;
export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const defaultValue: ThemeContextType = {
  colors: LightColors,
  isDark: false,
  themeMode: "system",
  setThemeMode: () => {},
  toggleTheme: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultValue);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("themeMode") as ThemeMode;
    if (saved) setThemeMode(saved);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("themeMode", themeMode);
    }
  }, [themeMode, mounted]);

  const systemDark = mounted
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;

  const isDark = themeMode === "system" ? systemDark : themeMode === "dark";
  const colors = isDark ? DarkColors : LightColors;

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ colors, isDark, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
