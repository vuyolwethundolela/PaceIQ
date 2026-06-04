import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function StatsScreen() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalKm, setTotalKm] = useState(0);
  const [totalRuns, setTotalRuns] = useState(0);
  const [avgPace, setAvgPace] = useState(0);
  const [totalCalories, setTotalCalories] = useState(0);
  const [personalBests, setPersonalBests] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: runsData } = await supabase
      .from("runs")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (runsData) {
      setRuns(runsData);
      setTotalRuns(runsData.length);
      const km = runsData.reduce((sum, r) => sum + (r.distance_km || 0), 0);
      setTotalKm(km);
      const cal = runsData.reduce((sum, r) => sum + (r.calories || 0), 0);
      setTotalCalories(cal);
      const paces = runsData.filter((r) => r.avg_pace_sec_per_km > 0);
      if (paces.length > 0) {
        setAvgPace(
          Math.round(
            paces.reduce((sum, r) => sum + r.avg_pace_sec_per_km, 0) /
              paces.length,
          ),
        );
      }
      buildMonthlyData(runsData);
      buildPersonalBests(runsData);
    }
    setLoading(false);
  }

  function buildMonthlyData(runsData: any[]) {
    const months: any = {};
    runsData.forEach((run) => {
      const month = run.date?.substring(0, 7);
      if (!month) return;
      if (!months[month]) months[month] = 0;
      months[month] += run.distance_km || 0;
    });
    const sorted = Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, km]) => ({
        month,
        km: parseFloat((km as number).toFixed(1)),
      }));
    setMonthlyData(sorted);
  }

  function buildPersonalBests(runsData: any[]) {
    const bests: any[] = [];
    const categories = [
      { label: "5K", min: 4.9, max: 5.1 },
      { label: "10K", min: 9.9, max: 10.1 },
      { label: "Half Marathon", min: 20.9, max: 21.2 },
      { label: "Marathon", min: 41.9, max: 42.3 },
    ];
    categories.forEach((cat) => {
      const matching = runsData.filter(
        (r) => r.distance_km >= cat.min && r.distance_km <= cat.max,
      );
      if (matching.length > 0) {
        const best = matching.reduce((prev, curr) =>
          prev.duration_seconds < curr.duration_seconds ? prev : curr,
        );
        bests.push({
          label: cat.label,
          duration: best.duration_seconds,
          date: best.date,
        });
      }
    });
    setPersonalBests(bests);
  }

  function formatPace(seconds: number) {
    if (!seconds) return "--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")} /km`;
  }

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  }

  function getMonthLabel(month: string) {
    const date = new Date(month + "-01");
    return date.toLocaleDateString("en", { month: "short", year: "2-digit" });
  }

  const maxKm = Math.max(...monthlyData.map((d) => d.km), 1);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#39FF14" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Stats</Text>

      {/* Summary Cards */}
      <View style={styles.grid}>
        <View style={styles.gridCard}>
          <Text style={styles.gridValue}>{totalKm.toFixed(1)}</Text>
          <Text style={styles.gridLabel}>Total km</Text>
        </View>
        <View style={styles.gridCard}>
          <Text style={styles.gridValue}>{totalRuns}</Text>
          <Text style={styles.gridLabel}>Total Runs</Text>
        </View>
        <View style={styles.gridCard}>
          <Text style={styles.gridValue}>{formatPace(avgPace)}</Text>
          <Text style={styles.gridLabel}>Avg Pace</Text>
        </View>
        <View style={styles.gridCard}>
          <Text style={styles.gridValue}>{totalCalories}</Text>
          <Text style={styles.gridLabel}>Total Calories</Text>
        </View>
      </View>

      {/* Monthly Chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Monthly Distance (km)</Text>
        {monthlyData.length === 0 ? (
          <Text style={styles.emptyText}>No data yet — start running!</Text>
        ) : (
          <View style={styles.chart}>
            {monthlyData.map((d, i) => (
              <View key={i} style={styles.barWrapper}>
                <Text style={styles.barValue}>{d.km}</Text>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      { height: Math.max((d.km / maxKm) * 120, 4) },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{getMonthLabel(d.month)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Personal Bests */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Bests</Text>
        {personalBests.length === 0 ? (
          <Text style={styles.emptyText}>
            Complete a 5K, 10K, half or full marathon to see your bests!
          </Text>
        ) : (
          personalBests.map((pb, i) => (
            <View key={i}>
              <View style={styles.pbRow}>
                <Text style={styles.pbLabel}>{pb.label}</Text>
                <View style={styles.pbRight}>
                  <Text style={styles.pbTime}>{formatTime(pb.duration)}</Text>
                  <Text style={styles.pbDate}>{pb.date}</Text>
                </View>
              </View>
              {i < personalBests.length - 1 && <View style={styles.divider} />}
            </View>
          ))
        )}
      </View>

      {/* Recent Runs List */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>All Runs</Text>
        {runs.length === 0 ? (
          <Text style={styles.emptyText}>No runs yet!</Text>
        ) : (
          runs.map((run, i) => (
            <View key={run.id}>
              <View style={styles.runRow}>
                <View>
                  <Text style={styles.runDate}>{run.date}</Text>
                  <Text style={styles.runDistance}>
                    {run.distance_km?.toFixed(2)} km
                  </Text>
                </View>
                <View style={styles.runRight}>
                  <Text style={styles.runStat}>
                    {formatTime(run.duration_seconds)}
                  </Text>
                  <Text style={styles.runPace}>
                    {formatPace(run.avg_pace_sec_per_km)}
                  </Text>
                </View>
              </View>
              {i < runs.length - 1 && <View style={styles.divider} />}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 48,
    marginBottom: 24,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16 },
  gridCard: {
    width: "50%",
    backgroundColor: "#141414",
    padding: 16,
    borderWidth: 1,
    borderColor: "#0D0D0D",
    alignItems: "center",
  },
  gridValue: { color: "#39FF14", fontSize: 22, fontWeight: "bold" },
  gridLabel: {
    color: "#888888",
    fontSize: 12,
    marginTop: 4,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: "#888888",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  emptyText: {
    color: "#888888",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 16,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 160,
    paddingTop: 20,
  },
  barWrapper: { alignItems: "center", flex: 1 },
  barValue: { color: "#39FF14", fontSize: 10, marginBottom: 4 },
  barContainer: { width: 28, justifyContent: "flex-end", height: 120 },
  bar: { width: 28, backgroundColor: "#39FF14", borderRadius: 4 },
  barLabel: {
    color: "#888888",
    fontSize: 10,
    marginTop: 6,
    textAlign: "center",
  },
  pbRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  pbLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  pbRight: { alignItems: "flex-end" },
  pbTime: { color: "#39FF14", fontSize: 16, fontWeight: "bold" },
  pbDate: { color: "#888888", fontSize: 12 },
  runRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  runDate: { color: "#888888", fontSize: 12 },
  runDistance: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  runRight: { alignItems: "flex-end" },
  runStat: { color: "#FFFFFF", fontSize: 14 },
  runPace: { color: "#39FF14", fontSize: 13 },
  divider: { height: 1, backgroundColor: "#1A1A1A" },
});
