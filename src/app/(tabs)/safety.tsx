import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function SafetyScreen() {
  const [location, setLocation] = useState<any>(null);
  const [nearbyRunners, setNearbyRunners] = useState<any[]>([]);
  const [unsafeAreas, setUnsafeAreas] = useState<any[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showReportArea, setShowReportArea] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [areaName, setAreaName] = useState("");
  const [areaDescription, setAreaDescription] = useState("");
  const [areaSeverity, setAreaSeverity] = useState("medium");
  const [isSharing, setIsSharing] = useState(false);
  const [loading, setLoading] = useState(false);
  const locationWatcher = useRef<any>(null);
  const updateInterval = useRef<any>(null);

  useEffect(() => {
    loadData();
    return () => {
      stopSharing();
    };
  }, []);

  async function loadData() {
    await loadEmergencyContacts();
    await loadUnsafeAreas();
    await loadNearbyRunners();
  }

  async function loadEmergencyContacts() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("user_id", user.id);
    if (data) setEmergencyContacts(data);
  }

  async function loadUnsafeAreas() {
    const { data } = await supabase
      .from("unsafe_areas")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setUnsafeAreas(data);
  }

  async function loadNearbyRunners() {
    const { data } = await supabase
      .from("runner_locations")
      .select("*")
      .eq("is_running", true);
    if (data) setNearbyRunners(data);
  }

  async function triggerSOS() {
    if (emergencyContacts.length === 0) {
      alert("Please add emergency contacts first!");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("users")
      .select("name")
      .eq("id", user?.id)
      .single();
    const userName = profile?.name || "A PaceIQ Runner";

    let locationText = "Location not available";
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        locationText = `https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;
        setLocation(loc.coords);
      }
    } catch (e) {
      console.log("Location error:", e);
    }

    const message = encodeURIComponent(
      `🆘 EMERGENCY SOS!\n\n` +
        `${userName} needs immediate help!\n\n` +
        `📍 Last known location:\n${locationText}\n\n` +
        `Please call or go to their location immediately!\n\n` +
        `Sent via PaceIQ Safety`,
    );
    let phone = emergencyContacts[0].phone.replace(/\D/g, "");
    if (phone.startsWith("0")) phone = "27" + phone.substring(1);
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  }

  async function startSharing() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    setIsSharing(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    locationWatcher.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10 },
      async (loc) => {
        setLocation(loc.coords);
        await supabase.from("runner_locations").upsert(
          {
            user_id: user.id,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            is_running: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      },
    );
    updateInterval.current = setInterval(loadNearbyRunners, 10000);
  }

  async function stopSharing() {
    setIsSharing(false);
    if (locationWatcher.current) locationWatcher.current.remove();
    if (updateInterval.current) clearInterval(updateInterval.current);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("runner_locations")
      .update({ is_running: false })
      .eq("user_id", user.id);
  }

  async function addEmergencyContact() {
    if (!contactName || !contactPhone) return;
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("emergency_contacts").insert({
      user_id: user.id,
      name: contactName,
      phone: contactPhone,
    });
    setContactName("");
    setContactPhone("");
    setShowAddContact(false);
    await loadEmergencyContacts();
    setLoading(false);
  }

  async function deleteContact(id: string) {
    await supabase.from("emergency_contacts").delete().eq("id", id);
    await loadEmergencyContacts();
  }

  async function reportUnsafeArea() {
    if (!areaName || !location) return;
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("unsafe_areas").insert({
      name: areaName,
      description: areaDescription,
      latitude: location.latitude,
      longitude: location.longitude,
      severity: areaSeverity,
      reported_by: user?.id,
    });
    setAreaName("");
    setAreaDescription("");
    setShowReportArea(false);
    await loadUnsafeAreas();
    setLoading(false);
  }

  function getSeverityColor(severity: string) {
    if (severity === "high") return "#FF4444";
    if (severity === "medium") return "#FFA500";
    return "#FFD700";
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Safety</Text>

      <TouchableOpacity style={styles.sosButton} onPress={triggerSOS}>
        <Text style={styles.sosText}>🆘 SOS Emergency</Text>
        <Text style={styles.sosSubtext}>
          Press to alert emergency contacts via WhatsApp
        </Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Location Sharing</Text>
        <Text style={styles.cardDesc}>
          Share your location with nearby runners while you run
        </Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              isSharing ? styles.dotActive : styles.dotInactive,
            ]}
          />
          <Text style={styles.statusText}>
            {isSharing ? "Sharing location" : "Location not shared"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.shareButton, isSharing && styles.shareButtonActive]}
          onPress={isSharing ? stopSharing : startSharing}
        >
          <Text style={styles.shareButtonText}>
            {isSharing ? "Stop Sharing" : "Start Sharing"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Nearby Runners ({nearbyRunners.length})
        </Text>
        {nearbyRunners.length === 0 ? (
          <Text style={styles.emptyText}>No runners nearby right now</Text>
        ) : (
          nearbyRunners.map((runner, i) => (
            <View key={runner.id} style={styles.runnerRow}>
              <View style={styles.runnerDot} />
              <Text style={styles.runnerText}>Runner {i + 1}</Text>
              <Text style={styles.runnerDistance}>Nearby</Text>
            </View>
          ))
        )}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadNearbyRunners}
        >
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            Unsafe Areas ({unsafeAreas.length})
          </Text>
          <TouchableOpacity onPress={() => setShowReportArea(true)}>
            <Text style={styles.addButton}>+ Report</Text>
          </TouchableOpacity>
        </View>
        {unsafeAreas.length === 0 ? (
          <Text style={styles.emptyText}>No unsafe areas reported yet</Text>
        ) : (
          unsafeAreas.slice(0, 5).map((area) => (
            <View key={area.id} style={styles.areaRow}>
              <View
                style={[
                  styles.severityBadge,
                  { backgroundColor: getSeverityColor(area.severity) },
                ]}
              >
                <Text style={styles.severityText}>
                  {area.severity.toUpperCase()}
                </Text>
              </View>
              <View style={styles.areaInfo}>
                <Text style={styles.areaName}>{area.name}</Text>
                {area.description && (
                  <Text style={styles.areaDesc}>{area.description}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Emergency Contacts</Text>
          <TouchableOpacity onPress={() => setShowAddContact(true)}>
            <Text style={styles.addButton}>+ Add</Text>
          </TouchableOpacity>
        </View>
        {emergencyContacts.length === 0 ? (
          <Text style={styles.emptyText}>
            Add contacts to alert in an emergency
          </Text>
        ) : (
          emergencyContacts.map((contact) => (
            <View key={contact.id} style={styles.contactRow}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteContact(contact.id)}>
                <Text style={styles.deleteButton}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <Modal visible={showAddContact} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Emergency Contact</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#888888"
              value={contactName}
              onChangeText={setContactName}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone (e.g. 0658938239 or +27658938239)"
              placeholderTextColor="#888888"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={addEmergencyContact}
              disabled={loading}
            >
              <Text style={styles.modalButtonText}>
                {loading ? "Saving..." : "Save Contact"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowAddContact(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showReportArea} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Report Unsafe Area</Text>
            {!location && (
              <Text style={styles.warningText}>
                Start sharing location first to report an area at your current
                position
              </Text>
            )}
            <TextInput
              style={styles.input}
              placeholder="Area Name (e.g. Park near Main St)"
              placeholderTextColor="#888888"
              value={areaName}
              onChangeText={setAreaName}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              placeholderTextColor="#888888"
              value={areaDescription}
              onChangeText={setAreaDescription}
              multiline
            />
            <Text style={styles.severityLabel}>Severity</Text>
            <View style={styles.severityRow}>
              {["low", "medium", "high"].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.severityBtn,
                    areaSeverity === s && styles.severityBtnSelected,
                  ]}
                  onPress={() => setAreaSeverity(s)}
                >
                  <Text
                    style={[
                      styles.severityBtnText,
                      areaSeverity === s && styles.severityBtnTextSelected,
                    ]}
                  >
                    {s.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[
                styles.modalButton,
                !location && styles.modalButtonDisabled,
              ]}
              onPress={reportUnsafeArea}
              disabled={!location || loading}
            >
              <Text style={styles.modalButtonText}>
                {loading ? "Reporting..." : "Report Area"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowReportArea(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  sosButton: {
    backgroundColor: "#FF4444",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  sosText: { color: "#FFFFFF", fontSize: 20, fontWeight: "bold" },
  sosSubtext: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    color: "#888888",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardDesc: { color: "#888888", fontSize: 13, marginBottom: 12 },
  statusRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  dotActive: { backgroundColor: "#39FF14" },
  dotInactive: { backgroundColor: "#888888" },
  statusText: { color: "#FFFFFF", fontSize: 14 },
  shareButton: {
    backgroundColor: "#39FF14",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  shareButtonActive: { backgroundColor: "#FF4444" },
  shareButtonText: { color: "#0D0D0D", fontWeight: "bold", fontSize: 15 },
  emptyText: {
    color: "#888888",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 12,
  },
  runnerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  runnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#39FF14",
    marginRight: 10,
  },
  runnerText: { color: "#FFFFFF", fontSize: 14, flex: 1 },
  runnerDistance: { color: "#888888", fontSize: 13 },
  refreshButton: { marginTop: 8, alignItems: "center" },
  refreshText: { color: "#39FF14", fontSize: 13 },
  addButton: { color: "#39FF14", fontSize: 14, fontWeight: "bold" },
  areaRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  severityBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 10,
  },
  severityText: { color: "#0D0D0D", fontSize: 10, fontWeight: "bold" },
  areaInfo: { flex: 1 },
  areaName: { color: "#FFFFFF", fontSize: 14, fontWeight: "bold" },
  areaDesc: { color: "#888888", fontSize: 12, marginTop: 2 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  contactInfo: { flex: 1 },
  contactName: { color: "#FFFFFF", fontSize: 15, fontWeight: "bold" },
  contactPhone: { color: "#888888", fontSize: 13, marginTop: 2 },
  deleteButton: { color: "#FF4444", fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#141414",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    width: "100%",
    backgroundColor: "#1A1A1A",
    color: "#FFFFFF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  warningText: {
    color: "#FFA500",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  severityLabel: {
    color: "#888888",
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  severityRow: { flexDirection: "row", marginBottom: 16, gap: 8 },
  severityBtn: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  severityBtnSelected: { backgroundColor: "#39FF14", borderColor: "#39FF14" },
  severityBtnText: { color: "#888888", fontWeight: "bold", fontSize: 12 },
  severityBtnTextSelected: { color: "#0D0D0D" },
  modalButton: {
    backgroundColor: "#39FF14",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  modalButtonDisabled: { opacity: 0.5 },
  modalButtonText: { color: "#0D0D0D", fontSize: 16, fontWeight: "bold" },
  modalCancelButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  modalCancelText: { color: "#FFFFFF", fontSize: 16 },
});
