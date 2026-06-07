import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/themeContext";

export default function HomeScreen() {
  const router = useRouter();
  const { primaryColor } = useTheme();
  const [userName, setUserName] = useState("Runner");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [weeklyKm, setWeeklyKm] = useState(0);
  const [weeklyGoal, setWeeklyGoal] = useState(20);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("users")
      .select("name, weekly_goal_km, avatar_url")
      .eq("id", user.id)
      .single();
    if (profile) {
      setUserName(profile.name?.split(" ")[0] || "Runner");
      setWeeklyGoal(profile.weekly_goal_km || 20);
      setAvatarUrl(profile.avatar_url || null);
    }
    const { data: runs } = await supabase
      .from("runs")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(3);
    if (runs) setRecentRuns(runs);
    const { data: weekData } = await supabase.rpc("get_weekly_km", {
      p_user_id: user.id,
    });
    if (weekData) setWeeklyKm(weekData);
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  function formatPace(seconds: number) {
    if (!seconds) return "--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")} /km`;
  }

  function formatDistance(km: number) {
    return `${km.toFixed(2)} km`;
  }

  function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  }

  const progress = Math.min((weeklyKm / weeklyGoal) * 100, 100);
  const initials = userName ? userName[0].toUpperCase() : "?";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.name}>{userName}</Text>
        </View>
        <View style={[styles.avatarWrapper, { borderColor: primaryColor }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={[styles.avatarInitials, { color: primaryColor }]}>
                {initials}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly Progress</Text>
        <View style={styles.progressRow}>
          <Text style={[styles.progressKm, { color: primaryColor }]}>
            {weeklyKm.toFixed(1)} km
          </Text>
          <Text style={styles.progressGoal}>/ {weeklyGoal} km goal</Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: primaryColor },
            ]}
          />
        </View>
        <Text style={styles.progressPercent}>
          {Math.round(progress)}% complete
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Workout</Text>
        <Text style={styles.workoutText}>
          Easy Run — 5 km at comfortable pace
        </Text>
        <Text style={styles.workoutSub}>Keep your heart rate in zone 2</Text>
      </View>

      <TouchableOpacity
        style={[styles.startButton, { backgroundColor: primaryColor }]}
        onPress={() => router.push("/(tabs)/run")}
      >
        <Text style={styles.startButtonText}>Start Run</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Recent Runs</Text>

      {recentRuns.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No runs yet — let's go!</Text>
        </View>
      ) : (
        recentRuns.map((run) => (
          <View key={run.id} style={styles.runCard}>
            <View style={styles.runInfo}>
              <Text style={styles.runDate}>{run.date}</Text>
              <Text style={styles.runDistance}>
                {formatDistance(run.distance_km)}
              </Text>
            </View>
            <View style={styles.runRight}>
              <Text style={styles.runStat}>
                {formatDuration(run.duration_seconds)}
              </Text>
              <Text style={[styles.runPace, { color: primaryColor }]}>
                {formatPace(run.avg_pace_sec_per_km)}
              </Text>
            </View>
          </View>
        ))
      )}

      <TouchableOpacity
        style={[styles.coachButton, { backgroundColor: primaryColor }]}
        onPress={() => router.push("/(tabs)/coach")}
      >
        <Text style={styles.coachButtonText}>Ask your Coach</Text>
        <View style={styles.proBadge}>
          <Text style={[styles.proBadgeText, { color: primaryColor }]}>
            PRO
          </Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 48,
    marginBottom: 24,
  },
  greeting: { color: "#888888", fontSize: 16 },
  name: { color: "#FFFFFF", fontSize: 26, fontWeight: "bold" },
  avatarWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    overflow: "hidden",
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 20, fontWeight: "bold" },
  card: {
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: "#888888",
    fontSize: 13,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  progressKm: { fontSize: 28, fontWeight: "bold" },
  progressGoal: { color: "#888888", fontSize: 14, marginLeft: 6 },
  progressBar: {
    height: 8,
    backgroundColor: "#1A1A1A",
    borderRadius: 4,
    marginBottom: 6,
  },
  progressFill: { height: 8, borderRadius: 4 },
  progressPercent: { color: "#888888", fontSize: 12 },
  workoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  workoutSub: { color: "#888888", fontSize: 13 },
  startButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  startButtonText: { color: "#0D0D0D", fontSize: 18, fontWeight: "bold" },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  emptyText: { color: "#888888", fontSize: 15 },
  runCard: {
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  runInfo: { flex: 1 },
  runDate: { color: "#888888", fontSize: 12 },
  runDistance: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  runRight: { alignItems: "flex-end" },
  runStat: { color: "#FFFFFF", fontSize: 14 },
  runPace: { fontSize: 13 },
  coachButton: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  coachButtonText: {
    color: "#0D0D0D",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  proBadge: {
    backgroundColor: "#0D0D0D",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  proBadgeText: { fontSize: 11, fontWeight: "bold" },
});
