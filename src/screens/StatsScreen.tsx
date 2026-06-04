import { StyleSheet, Text, View } from "react-native";
import { theme } from "../types/theme";

export default function StatsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>📊 Stats</Text>
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
