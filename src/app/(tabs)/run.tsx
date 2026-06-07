import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/themeContext";

export default function RunScreen() {
  const { primaryColor } = useTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [calories, setCalories] = useState(0);
  const [coords, setCoords] = useState<any[]>([]);
  const [locationPermission, setLocationPermission] = useState(false);
  const [saved, setSaved] = useState(false);

  const timerRef = useRef<any>(null);
  const locationRef = useRef<any>(null);
  const lastCoordRef = useRef<any>(null);

  useEffect(() => {
    requestPermission();
    return () => {
      clearInterval(timerRef.current);
      if (locationRef.current) locationRef.current.remove();
    };
  }, []);

  async function requestPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === "granted");
  }

  function getDistanceBetween(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async function startRun() {
    if (!locationPermission) {
      await requestPermission();
      return;
    }
    setIsRunning(true);
    setIsPaused(false);
    setDuration(0);
    setDistance(0);
    setCalories(0);
    setCoords([]);
    setSaved(false);

    timerRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);

    locationRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5 },
      (loc) => {
        const { latitude, longitude } = loc.coords;
        const newCoord = {
          lat: latitude,
          lng: longitude,
          timestamp: loc.timestamp,
        };
        setCoords((prev) => [...prev, newCoord]);
        if (lastCoordRef.current) {
          const d = getDistanceBetween(
            lastCoordRef.current.lat,
            lastCoordRef.current.lng,
            latitude,
            longitude,
          );
          setDistance((prev) => {
            const newDist = prev + d;
            setCalories(Math.round(newDist * 60));
            return newDist;
          });
        }
        lastCoordRef.current = newCoord;
      },
    );
  }

  function pauseRun() {
    setIsPaused(true);
    clearInterval(timerRef.current);
    if (locationRef.current) locationRef.current.remove();
  }

  function resumeRun() {
    setIsPaused(false);
    timerRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
    startTracking();
  }

  async function startTracking() {
    locationRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5 },
      (loc) => {
        const { latitude, longitude } = loc.coords;
        const newCoord = {
          lat: latitude,
          lng: longitude,
          timestamp: loc.timestamp,
        };
        setCoords((prev) => [...prev, newCoord]);
        if (lastCoordRef.current) {
          const d = getDistanceBetween(
            lastCoordRef.current.lat,
            lastCoordRef.current.lng,
            latitude,
            longitude,
          );
          setDistance((prev) => {
            const newDist = prev + d;
            setCalories(Math.round(newDist * 60));
            return newDist;
          });
        }
        lastCoordRef.current = newCoord;
      },
    );
  }

  async function stopRun() {
    clearInterval(timerRef.current);
    if (locationRef.current) locationRef.current.remove();
    setIsRunning(false);
    setIsPaused(false);
    await saveRun();
  }

  async function saveRun() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || distance < 0.01) return;
    const avgPace = distance > 0 ? Math.round(duration / distance) : 0;
    const { error } = await supabase.from("runs").insert({
      user_id: user.id,
      date: new Date().toISOString().split("T")[0],
      distance_km: parseFloat(distance.toFixed(3)),
      duration_seconds: duration,
      avg_pace_sec_per_km: avgPace,
      calories: calories,
      route_coordinates: coords,
    });
    if (!error) setSaved(true);
  }

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0)
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function formatPace() {
    if (distance < 0.01) return "--'--\"";
    const pace = Math.round(duration / distance);
    const m = Math.floor(pace / 60);
    const s = pace % 60;
    return `${m}'${String(s).padStart(2, "0")}"`;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Run Tracker</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: primaryColor }]}>
            {formatTime(duration)}
          </Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: primaryColor }]}>
            {distance.toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Distance (km)</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: primaryColor }]}>
            {formatPace()}
          </Text>
          <Text style={styles.statLabel}>Pace /km</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: primaryColor }]}>
            {calories}
          </Text>
          <Text style={styles.statLabel}>Calories</Text>
        </View>
      </View>

      <View style={styles.gpsCard}>
        <View
          style={[
            styles.gpsDot,
            { backgroundColor: locationPermission ? primaryColor : "#FF4444" },
          ]}
        />
        <Text style={styles.gpsText}>
          {locationPermission ? "GPS Ready" : "GPS Permission Required"}
        </Text>
        {coords.length > 0 && (
          <Text style={styles.gpsPoints}>{coords.length} points recorded</Text>
        )}
      </View>

      {saved && (
        <View style={[styles.savedCard, { borderColor: primaryColor }]}>
          <Text style={[styles.savedText, { color: primaryColor }]}>
            Run saved successfully!
          </Text>
        </View>
      )}

      {!isRunning && !saved && (
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: primaryColor }]}
          onPress={startRun}
        >
          <Text style={styles.startButtonText}>Start Run</Text>
        </TouchableOpacity>
      )}

      {isRunning && !isPaused && (
        <View style={styles.controlRow}>
          <TouchableOpacity style={styles.pauseButton} onPress={pauseRun}>
            <Text style={styles.pauseButtonText}>Pause</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stopButton} onPress={stopRun}>
            <Text style={styles.stopButtonText}>Stop & Save</Text>
          </TouchableOpacity>
        </View>
      )}

      {isRunning && isPaused && (
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.resumeButton, { borderColor: primaryColor }]}
            onPress={resumeRun}
          >
            <Text style={[styles.resumeButtonText, { color: primaryColor }]}>
              Resume
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stopButton} onPress={stopRun}>
            <Text style={styles.stopButtonText}>Stop & Save</Text>
          </TouchableOpacity>
        </View>
      )}

      {saved && (
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: primaryColor }]}
          onPress={() => {
            setSaved(false);
            setDuration(0);
            setDistance(0);
            setCalories(0);
            setCoords([]);
            lastCoordRef.current = null;
          }}
        >
          <Text style={styles.startButtonText}>Start New Run</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  content: { padding: 20, paddingBottom: 40 },
  pageTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 48,
    marginBottom: 24,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16 },
  statBox: {
    width: "50%",
    backgroundColor: "#141414",
    padding: 20,
    borderWidth: 1,
    borderColor: "#0D0D0D",
    alignItems: "center",
  },
  statValue: { fontSize: 28, fontWeight: "bold" },
  statLabel: {
    color: "#888888",
    fontSize: 12,
    marginTop: 4,
    textTransform: "uppercase",
  },
  gpsCard: {
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  gpsDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  gpsText: { color: "#FFFFFF", fontSize: 14, flex: 1 },
  gpsPoints: { color: "#888888", fontSize: 12 },
  savedCard: {
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
  },
  savedText: { fontSize: 16, fontWeight: "bold" },
  startButton: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginTop: 8,
  },
  startButtonText: { color: "#0D0D0D", fontSize: 18, fontWeight: "bold" },
  controlRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  pauseButton: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#888888",
  },
  pauseButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  resumeButton: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
  },
  resumeButtonText: { fontSize: 18, fontWeight: "bold" },
  stopButton: {
    flex: 1,
    backgroundColor: "#FF4444",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  stopButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
});
