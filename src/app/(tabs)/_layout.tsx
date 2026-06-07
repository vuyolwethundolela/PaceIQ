import { Tabs } from "expo-router";
import { useTheme } from "../../lib/themeContext";

export default function TabLayout() {
  const { primaryColor } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1A1A1A",
          borderTopColor: "#1A1A1A",
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: primaryColor,
        tabBarInactiveTintColor: "#888888",
        tabBarLabelStyle: { fontSize: 13, fontWeight: "bold" },
        tabBarShowIcon: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="run" options={{ title: "Run" }} />
      <Tabs.Screen name="stats" options={{ title: "Stats" }} />
      <Tabs.Screen name="safety" options={{ title: "Safety" }} />
      <Tabs.Screen name="match" options={{ title: "Match" }} />
      <Tabs.Screen name="coach" options={{ title: "Coach" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
