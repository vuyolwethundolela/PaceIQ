import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";

export const THEMES = [
  { name: "Electric Green", primary: "#39FF14", label: "⚡ Default" },
  { name: "Neon Blue", primary: "#00B4FF", label: "💙 Ocean" },
  { name: "Hot Pink", primary: "#FF0080", label: "💗 Pink" },
  { name: "Orange Fire", primary: "#FF6B00", label: "🔥 Fire" },
  { name: "Purple", primary: "#9B59B6", label: "💜 Purple" },
  { name: "Gold", primary: "#FFD700", label: "⭐ Gold" },
  { name: "Red", primary: "#FF4444", label: "❤️ Red" },
  { name: "Cyan", primary: "#00FFFF", label: "🩵 Cyan" },
];

type ThemeContextType = {
  primaryColor: string;
  themeName: string;
  setTheme: (theme: (typeof THEMES)[0]) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  primaryColor: "#39FF14",
  themeName: "Electric Green",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: any }) {
  const [primaryColor, setPrimaryColor] = useState("#39FF14");
  const [themeName, setThemeName] = useState("Electric Green");

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    try {
      const saved = await AsyncStorage.getItem("paceiq_theme");
      if (saved) {
        const theme = JSON.parse(saved);
        setPrimaryColor(theme.primary);
        setThemeName(theme.name);
      }
    } catch (e) {}
  }

  async function setTheme(theme: (typeof THEMES)[0]) {
    setPrimaryColor(theme.primary);
    setThemeName(theme.name);
    try {
      await AsyncStorage.setItem("paceiq_theme", JSON.stringify(theme));
    } catch (e) {}
  }

  return (
    <ThemeContext.Provider value={{ primaryColor, themeName, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
