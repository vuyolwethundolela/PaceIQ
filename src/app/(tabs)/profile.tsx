import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) {
      setProfile(data);
      if (data.avatar_url) setAvatarUrl(data.avatar_url);
    }
    setLoading(false);
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) uploadAvatar(result.assets[0].uri);
  }

  async function uploadAvatar(uri: string) {
    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split(".").pop();
      const fileName = `${user.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      await supabase
        .from("users")
        .update({ avatar_url: data.publicUrl })
        .eq("id", user.id);
      setAvatarUrl(data.publicUrl);
    } catch (error) {
      console.error("Upload error:", error);
    }
    setUploading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await supabase.rpc("delete_user");
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Delete error:", error);
    }
    setDeleting(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#39FF14" size="large" />
      </View>
    );
  }

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Profile</Text>

      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          {uploading ? (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color="#39FF14" />
            </View>
          ) : (
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>Edit</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.profileName}>{profile?.name || "Runner"}</Text>
        <Text style={styles.profileEmail}>{profile?.email || ""}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{profile?.fitness_level || "—"}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{profile?.weekly_goal_km || "—"}</Text>
          <Text style={styles.statLabel}>Weekly Goal km</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {profile?.target?.replace(/_/g, " ") || "—"}
          </Text>
          <Text style={styles.statLabel}>Target</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{profile?.name || "—"}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{profile?.email || "—"}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Age</Text>
          <Text style={styles.infoValue}>
            {profile?.age ? `${profile.age} years` : "—"}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Weight</Text>
          <Text style={styles.infoValue}>
            {profile?.weight_kg ? `${profile.weight_kg} kg` : "—"}
          </Text>
        </View>
      </View>

      <View style={[styles.card, styles.planCard]}>
        <Text style={styles.planLabel}>Current Plan</Text>
        <View
          style={[styles.planBadge, profile?.is_pro && styles.planBadgePro]}
        >
          <Text
            style={[
              styles.planBadgeText,
              profile?.is_pro && styles.planBadgeTextPro,
            ]}
          >
            {profile?.is_pro ? "PRO" : "FREE"}
          </Text>
        </View>
        {!profile?.is_pro && (
          <TouchableOpacity style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => setShowDeleteModal(true)}
      >
        <Text style={styles.deleteText}>Delete Account</Text>
      </TouchableOpacity>

      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Delete Account?</Text>
            <Text style={styles.modalMessage}>
              This will permanently delete your account, all your runs, and
              coaching history. This cannot be undone.
            </Text>
            <TouchableOpacity
              style={styles.modalDeleteButton}
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              <Text style={styles.modalDeleteText}>
                {deleting ? "Deleting..." : "Yes, Delete My Account"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowDeleteModal(false)}
              disabled={deleting}
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
  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatarWrapper: { position: "relative", marginBottom: 12 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#39FF14",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#39FF14",
  },
  avatarInitials: { color: "#39FF14", fontSize: 32, fontWeight: "bold" },
  uploadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#39FF14",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  editBadgeText: { color: "#0D0D0D", fontSize: 11, fontWeight: "bold" },
  profileName: { color: "#FFFFFF", fontSize: 22, fontWeight: "bold" },
  profileEmail: { color: "#888888", fontSize: 14, marginTop: 4 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginHorizontal: 4,
  },
  statValue: {
    color: "#39FF14",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  statLabel: {
    color: "#888888",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
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
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  infoLabel: { color: "#888888", fontSize: 15 },
  infoValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "500" },
  divider: { height: 1, backgroundColor: "#1A1A1A" },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  planLabel: { color: "#888888", fontSize: 15 },
  planBadge: {
    backgroundColor: "#1A1A1A",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  planBadgePro: { backgroundColor: "#39FF14" },
  planBadgeText: { color: "#888888", fontWeight: "bold", fontSize: 13 },
  planBadgeTextPro: { color: "#0D0D0D" },
  upgradeButton: {
    width: "100%",
    backgroundColor: "#39FF14",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginTop: 12,
  },
  upgradeButtonText: { color: "#0D0D0D", fontWeight: "bold", fontSize: 15 },
  logoutButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#888888",
    marginBottom: 12,
  },
  logoutText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  deleteButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF4444",
  },
  deleteText: { color: "#FF4444", fontSize: 16, fontWeight: "bold" },
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
    marginBottom: 12,
    textAlign: "center",
  },
  modalMessage: {
    color: "#888888",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalDeleteButton: {
    backgroundColor: "#FF4444",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  modalDeleteText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  modalCancelButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#888888",
  },
  modalCancelText: { color: "#FFFFFF", fontSize: 16 },
});
