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
import { useTheme } from "../../lib/themeContext";

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
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

export default function SafetyScreen() {
  const { primaryColor } = useTheme();
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
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [loading, setLoading] = useState(false);
  const locationWatcher = useRef<any>(null);
  const updateInterval = useRef<any>(null);

  useEffect(() => {
    loadData();
    getCurrentLocation();
    return () => {
      stopSharing();
    };
  }, []);

  async function getCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(loc.coords);
      }
    } catch (e) {}
  }

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
    if (data) {
      if (location) {
        const sorted = data
          .map((area) => ({
            ...area,
            distance: getDistanceKm(
              location.latitude,
              location.longitude,
              area.latitude,
              area.longitude,
            ),
          }))
          .sort((a, b) => a.distance - b.distance);
        setUnsafeAreas(sorted);
      } else {
        setUnsafeAreas(data);
      }
    }
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
    } catch (e) {}
    const message = encodeURIComponent(
      `🆘 EMERGENCY SOS!\n\n${userName} needs immediate help!\n\n📍 Last known location:\n${locationText}\n\nPlease call or go to their location immediately!\n\nSent via PaceIQ Safety`,
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
    await supabase
      .from("emergency_contacts")
      .insert({ user_id: user.id, name: contactName, phone: contactPhone });
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
    if (!areaName) return;
    setLoading(true);
    let lat = location?.latitude;
    let lng = location?.longitude;
    if (!useCurrentLocation) {
      lat = parseFloat(manualLat);
      lng = parseFloat(manualLng);
      if (isNaN(lat) || isNaN(lng)) {
        alert("Please enter valid coordinates");
        setLoading(false);
        return;
      }
    }
    if (!lat || !lng) {
      alert(
        "Location not available. Please enable location or enter coordinates manually.",
      );
      setLoading(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("unsafe_areas").insert({
      name: areaName,
      description: areaDescription,
      latitude: lat,
      longitude: lng,
      severity: areaSeverity,
      reported_by: user?.id,
    });
    setAreaName("");
    setAreaDescription("");
    setManualLat("");
    setManualLng("");
    setShowReportArea(false);
    await loadUnsafeAreas();
    setLoading(false);
  }

  function getSeverityColor(severity: string) {
    if (severity === "high") return "#FF4444";
    if (severity === "medium") return "#FFA500";
    return "#FFD700";
  }

  const nearbyUnsafeAreas = location
    ? unsafeAreas.filter(
        (a) =>
          getDistanceKm(
            location.latitude,
            location.longitude,
            a.latitude,
            a.longitude,
          ) <= 5,
      )
    : unsafeAreas;

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
              { backgroundColor: isSharing ? primaryColor : "#888888" },
            ]}
          />
          <Text style={styles.statusText}>
            {isSharing ? "Sharing location" : "Location not shared"}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.shareButton,
            { backgroundColor: isSharing ? "#FF4444" : primaryColor },
          ]}
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
              <View
                style={[styles.runnerDot, { backgroundColor: primaryColor }]}
              />
              <Text style={styles.runnerText}>Runner {i + 1}</Text>
              <Text style={styles.runnerDistance}>Nearby</Text>
            </View>
          ))
        )}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadNearbyRunners}
        >
          <Text style={[styles.refreshText, { color: primaryColor }]}>
            Refresh
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            Unsafe Areas {location ? "(within 5km)" : ""} (
            {nearbyUnsafeAreas.length})
          </Text>
          <TouchableOpacity onPress={() => setShowReportArea(true)}>
            <Text style={[styles.addButton, { color: primaryColor }]}>
              + Report
            </Text>
          </TouchableOpacity>
        </View>
        {nearbyUnsafeAreas.length === 0 ? (
          <Text style={styles.emptyText}>No unsafe areas reported nearby</Text>
        ) : (
          nearbyUnsafeAreas.slice(0, 8).map((area) => (
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
                {area.distance !== undefined && (
                  <Text style={[styles.areaDistance, { color: primaryColor }]}>
                    {area.distance.toFixed(1)} km away
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
        {unsafeAreas.length > nearbyUnsafeAreas.length && (
          <Text style={styles.moreAreasText}>
            + {unsafeAreas.length - nearbyUnsafeAreas.length} more areas outside
            5km radius
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Emergency Contacts</Text>
          <TouchableOpacity onPress={() => setShowAddContact(true)}>
            <Text style={[styles.addButton, { color: primaryColor }]}>
              + Add
            </Text>
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
              placeholder="Phone (e.g. 0658938239)"
              placeholderTextColor="#888888"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: primaryColor }]}
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
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Report Unsafe Area</Text>
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
                      areaSeverity === s && {
                        backgroundColor: primaryColor,
                        borderColor: primaryColor,
                      },
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
              <Text style={styles.severityLabel}>Location</Text>
              <View style={styles.locationToggle}>
                <TouchableOpacity
                  style={[
                    styles.locationBtn,
                    useCurrentLocation && {
                      backgroundColor: primaryColor,
                      borderColor: primaryColor,
                    },
                  ]}
                  onPress={() => setUseCurrentLocation(true)}
                >
                  <Text
                    style={[
                      styles.locationBtnText,
                      useCurrentLocation && styles.locationBtnTextSelected,
                    ]}
                  >
                    📍 Use My Current Location
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.locationBtn,
                    !useCurrentLocation && {
                      backgroundColor: primaryColor,
                      borderColor: primaryColor,
                    },
                  ]}
                  onPress={() => setUseCurrentLocation(false)}
                >
                  <Text
                    style={[
                      styles.locationBtnText,
                      !useCurrentLocation && styles.locationBtnTextSelected,
                    ]}
                  >
                    ✏️ Enter Coordinates
                  </Text>
                </TouchableOpacity>
              </View>
              {useCurrentLocation ? (
                <View style={styles.currentLocBox}>
                  {location ? (
                    <Text
                      style={[styles.currentLocText, { color: primaryColor }]}
                    >
                      ✅ Location: {location.latitude.toFixed(4)},{" "}
                      {location.longitude.toFixed(4)}
                    </Text>
                  ) : (
                    <Text style={styles.warningText}>
                      ⚠️ Getting your location...
                    </Text>
                  )}
                </View>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Latitude (e.g. -26.2041)"
                    placeholderTextColor="#888888"
                    value={manualLat}
                    onChangeText={setManualLat}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Longitude (e.g. 28.0473)"
                    placeholderTextColor="#888888"
                    value={manualLng}
                    onChangeText={setManualLng}
                    keyboardType="numeric"
                  />
                </>
              )}
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: primaryColor }]}
                onPress={reportUnsafeArea}
                disabled={loading}
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
          </ScrollView>
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
  statusText: { color: "#FFFFFF", fontSize: 14 },
  shareButton: { borderRadius: 10, padding: 14, alignItems: "center" },
  shareButtonText: { color: "#0D0D0D", fontWeight: "bold", fontSize: 15 },
  emptyText: {
    color: "#888888",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 12,
  },
  runnerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  runnerDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  runnerText: { color: "#FFFFFF", fontSize: 14, flex: 1 },
  runnerDistance: { color: "#888888", fontSize: 13 },
  refreshButton: { marginTop: 8, alignItems: "center" },
  refreshText: { fontSize: 13 },
  addButton: { fontSize: 14, fontWeight: "bold" },
  areaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  severityBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 10,
    marginTop: 2,
  },
  severityText: { color: "#0D0D0D", fontSize: 10, fontWeight: "bold" },
  areaInfo: { flex: 1 },
  areaName: { color: "#FFFFFF", fontSize: 14, fontWeight: "bold" },
  areaDesc: { color: "#888888", fontSize: 12, marginTop: 2 },
  areaDistance: { fontSize: 11, marginTop: 2 },
  moreAreasText: {
    color: "#888888",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
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
    justifyContent: "center",
    padding: 24,
  },
  modalScroll: { justifyContent: "center" },
  modalBox: {
    backgroundColor: "#141414",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
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
  severityBtnText: { color: "#888888", fontWeight: "bold", fontSize: 12 },
  severityBtnTextSelected: { color: "#0D0D0D" },
  locationToggle: { gap: 8, marginBottom: 12 },
  locationBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  locationBtnText: { color: "#888888", fontSize: 13, fontWeight: "bold" },
  locationBtnTextSelected: { color: "#0D0D0D" },
  currentLocBox: {
    backgroundColor: "#1A1A1A",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  currentLocText: { fontSize: 13 },
  modalButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
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
