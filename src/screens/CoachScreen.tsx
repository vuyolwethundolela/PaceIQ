import { StyleSheet, Text, View } from "react-native";
import { theme } from "../types/theme";

export default function CoachScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🤖 Coach</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.heading,
  },
});
