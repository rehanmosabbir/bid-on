"use client";

import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";
import { useEffect } from "react";
import { useThemeStore } from "@/stores/theme-store";

function ThemeBridge({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, setTheme: setNextTheme } = useNextTheme();

  useEffect(() => {
    const next: "light" | "dark" =
      resolvedTheme === "dark" ? "dark" : "light";
    useThemeStore.setState({ theme: next });
    document.documentElement.setAttribute("data-theme", next);
  }, [resolvedTheme]);

  useEffect(() => {
    return useThemeStore.subscribe((state, prev) => {
      if (state.theme !== prev.theme) {
        setNextTheme(state.theme);
      }
    });
  }, [setNextTheme]);

  return <>{children}</>;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      storageKey="bidon-theme"
      disableTransitionOnChange
    >
      <ThemeBridge>{children}</ThemeBridge>
    </NextThemesProvider>
  );
}

export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  return { theme, setTheme, toggleTheme };
}
