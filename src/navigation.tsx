import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { Text } from "react-native";
import { theme } from "./types/theme";

import CoachScreen from "./screens/CoachScreen";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import RunScreen from "./screens/RunScreen";
import StatsScreen from "./screens/StatsScreen";

const Tab = createBottomTabNavigator();

export default function Navigation() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.colors.darkGrey,
            borderTopColor: theme.colors.darkGrey,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.grey,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color }) => <Text style={{ color }}>🏠</Text>,
          }}
        />
        <Tab.Screen
          name="Run"
          component={RunScreen}
          options={{
            tabBarIcon: ({ color }) => <Text style={{ color }}>🏃</Text>,
          }}
        />
        <Tab.Screen
          name="Stats"
          component={StatsScreen}
          options={{
            tabBarIcon: ({ color }) => <Text style={{ color }}>📊</Text>,
          }}
        />
        <Tab.Screen
          name="Coach"
          component={CoachScreen}
          options={{
            tabBarIcon: ({ color }) => <Text style={{ color }}>🤖</Text>,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ color }) => <Text style={{ color }}>👤</Text>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
