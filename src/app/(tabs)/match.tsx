import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function MatchScreen() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [runners, setRunners] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState<any[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [bio, setBio] = useState("");
  const [paceRange, setPaceRange] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedRunner, setMatchedRunner] = useState<any>(null);

  const PACE_OPTIONS = [
    "< 5 min/km",
    "5-6 min/km",
    "6-7 min/km",
    "7-8 min/km",
    "> 8 min/km",
  ];
  const TIME_OPTIONS = [
    "Early Morning",
    "Morning",
    "Afternoon",
    "Evening",
    "Weekend Only",
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();
    setCurrentUser(profile);

    const { data: myProfile } = await supabase
      .from("runner_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (myProfile) {
      setBio(myProfile.bio || "");
      setPaceRange(myProfile.pace_range || "");
      setPreferredTime(myProfile.preferred_time || "");
    }

    const { data: myActions } = await supabase
      .from("runner_matches")
      .select("target_user_id")
      .eq("user_id", user.id);
    const seenIds = myActions?.map((a) => a.target_user_id) || [];

    const { data: allRunners } = await supabase
      .from("users")
      .select("*, runner_profiles(*)")
      .neq("id", user.id)
      .not(
        "id",
        "in",
        seenIds.length > 0
          ? `(${seenIds.join(",")})`
          : "(00000000-0000-0000-0000-000000000000)",
      );

    const visible =
      allRunners?.filter(
        (r) =>
          r.runner_profiles?.length > 0 && r.runner_profiles[0]?.is_visible,
      ) || [];
    setRunners(visible);

    await loadMatches(user.id);
    setLoading(false);
  }

  async function loadMatches(userId: string) {
    const { data: myLikes } = await supabase
      .from("runner_matches")
      .select("target_user_id")
      .eq("user_id", userId)
      .eq("action", "like");
    const likedIds = myLikes?.map((l) => l.target_user_id) || [];
    if (likedIds.length === 0) {
      setMatches([]);
      return;
    }

    const { data: theirLikes } = await supabase
      .from("runner_matches")
      .select("user_id")
      .in("user_id", likedIds)
      .eq("target_user_id", userId)
      .eq("action", "like");
    const matchIds = theirLikes?.map((l) => l.user_id) || [];
    if (matchIds.length === 0) {
      setMatches([]);
      return;
    }

    const { data: matchedUsers } = await supabase
      .from("users")
      .select("*")
      .in("id", matchIds);
    setMatches(matchedUsers || []);
  }

  async function saveProfile() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("runner_profiles").upsert(
      {
        user_id: user.id,
        bio,
        pace_range: paceRange,
        preferred_time: preferredTime,
        is_visible: true,
      },
      { onConflict: "user_id" },
    );
    setShowProfile(false);
    setSaving(false);
  }

  async function handleAction(action: "like" | "pass") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || currentIndex >= runners.length) return;

    const targetRunner = runners[currentIndex];

    await supabase.from("runner_matches").insert({
      user_id: user.id,
      target_user_id: targetRunner.id,
      action,
    });

    if (action === "like") {
      const { data: theirLike } = await supabase
        .from("runner_matches")
        .select("*")
        .eq("user_id", targetRunner.id)
        .eq("target_user_id", user.id)
        .eq("action", "like")
        .single();

      if (theirLike) {
        setMatchedRunner(targetRunner);
        setShowMatch(true);
        await loadMatches(user.id);
      }
    }

    setCurrentIndex((prev) => prev + 1);
  }

  async function sendMatchMessage(runner: any) {
    const message = encodeURIComponent(
      `Hey! We matched on PaceIQ! Want to go for a run together? 🏃‍♂️⚡`,
    );
    const phone = runner.phone?.replace(/\D/g, "") || "";
    if (phone) {
      if (phone.startsWith("0")) {
        window.open(
          `https://wa.me/27${phone.substring(1)}?text=${message}`,
          "_blank",
        );
      } else {
        window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
      }
    }
  }

  const currentRunner = runners[currentIndex];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#39FF14" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Run Dates 🏃</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowMatches(true)}
          >
            <Text style={styles.headerBtnText}>
              Matches {matches.length > 0 ? `(${matches.length})` : ""}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowProfile(true)}
          >
            <Text style={styles.headerBtnText}>My Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!bio && (
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>
            Set up your runner profile first!
          </Text>
          <Text style={styles.setupText}>
            Add your bio and pace to start matching with other runners.
          </Text>
          <TouchableOpacity
            style={styles.setupButton}
            onPress={() => setShowProfile(true)}
          >
            <Text style={styles.setupButtonText}>Set Up Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {bio && currentIndex < runners.length && currentRunner ? (
        <View style={styles.card}>
          {currentRunner.avatar_url ? (
            <Image
              source={{ uri: currentRunner.avatar_url }}
              style={styles.runnerImage}
            />
          ) : (
            <View style={styles.runnerImagePlaceholder}>
              <Text style={styles.runnerInitials}>
                {currentRunner.name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase() || "?"}
              </Text>
            </View>
          )}

          <View style={styles.runnerInfo}>
            <Text style={styles.runnerName}>
              {currentRunner.name || "Runner"}
            </Text>
            {currentRunner.age && (
              <Text style={styles.runnerAge}>
                {currentRunner.age} years old
              </Text>
            )}
            {currentRunner.fitness_level && (
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>
                  {currentRunner.fitness_level}
                </Text>
              </View>
            )}
          </View>

          {currentRunner.runner_profiles?.[0] && (
            <View style={styles.runnerDetails}>
              {currentRunner.runner_profiles[0].bio && (
                <Text style={styles.bio}>
                  {currentRunner.runner_profiles[0].bio}
                </Text>
              )}
              <View style={styles.detailRow}>
                {currentRunner.runner_profiles[0].pace_range && (
                  <View style={styles.detailBadge}>
                    <Text style={styles.detailBadgeText}>
                      ⚡ {currentRunner.runner_profiles[0].pace_range}
                    </Text>
                  </View>
                )}
                {currentRunner.runner_profiles[0].preferred_time && (
                  <View style={styles.detailBadge}>
                    <Text style={styles.detailBadgeText}>
                      🕐 {currentRunner.runner_profiles[0].preferred_time}
                    </Text>
                  </View>
                )}
              </View>
              {currentRunner.weekly_goal_km && (
                <Text style={styles.weeklyGoal}>
                  🎯 Weekly goal: {currentRunner.weekly_goal_km} km
                </Text>
              )}
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.passButton}
              onPress={() => handleAction("pass")}
            >
              <Text style={styles.passButtonText}>✕ Pass</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.likeButton}
              onPress={() => handleAction("like")}
            >
              <Text style={styles.likeButtonText}>♥ Like</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : bio ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No more runners!</Text>
          <Text style={styles.emptyText}>
            Check back later for new runners in your area.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Edit Profile Modal */}
      <Modal visible={showProfile} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>My Runner Profile</Text>
              <Text style={styles.inputLabel}>About me</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell other runners about yourself..."
                placeholderTextColor="#888888"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
              />
              <Text style={styles.inputLabel}>My Pace</Text>
              <View style={styles.optionGrid}>
                {PACE_OPTIONS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.optionBtn,
                      paceRange === p && styles.optionBtnSelected,
                    ]}
                    onPress={() => setPaceRange(p)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        paceRange === p && styles.optionTextSelected,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>Preferred Running Time</Text>
              <View style={styles.optionGrid}>
                {TIME_OPTIONS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.optionBtn,
                      preferredTime === t && styles.optionBtnSelected,
                    ]}
                    onPress={() => setPreferredTime(t)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        preferredTime === t && styles.optionTextSelected,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveProfile}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? "Saving..." : "Save Profile"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowProfile(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Matches Modal */}
      <Modal visible={showMatches} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Your Matches 🎉</Text>
            {matches.length === 0 ? (
              <Text style={styles.emptyText}>
                No matches yet — keep swiping!
              </Text>
            ) : (
              matches.map((match) => (
                <View key={match.id} style={styles.matchRow}>
                  {match.avatar_url ? (
                    <Image
                      source={{ uri: match.avatar_url }}
                      style={styles.matchAvatar}
                    />
                  ) : (
                    <View style={styles.matchAvatarPlaceholder}>
                      <Text style={styles.matchInitials}>
                        {match.name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase() || "?"}
                      </Text>
                    </View>
                  )}
                  <View style={styles.matchInfo}>
                    <Text style={styles.matchName}>{match.name}</Text>
                    <Text style={styles.matchLevel}>
                      {match.fitness_level || "Runner"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.messageButton}
                    onPress={() => sendMatchMessage(match)}
                  >
                    <Text style={styles.messageButtonText}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowMatches(false)}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* It's a Match Modal */}
      <Modal visible={showMatch} transparent animationType="fade">
        <View style={styles.matchOverlay}>
          <View style={styles.matchBox}>
            <Text style={styles.matchTitle}>It's a Match! 🎉</Text>
            <Text style={styles.matchSubtitle}>
              You and {matchedRunner?.name} both want to run together!
            </Text>
            {matchedRunner?.avatar_url ? (
              <Image
                source={{ uri: matchedRunner.avatar_url }}
                style={styles.matchBigAvatar}
              />
            ) : (
              <View style={styles.matchBigAvatarPlaceholder}>
                <Text style={styles.matchBigInitials}>
                  {matchedRunner?.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase() || "?"}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={() => {
                sendMatchMessage(matchedRunner);
                setShowMatch(false);
              }}
            >
              <Text style={styles.whatsappButtonText}>
                Send WhatsApp Message
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.laterButton}
              onPress={() => setShowMatch(false)}
            >
              <Text style={styles.laterButtonText}>Maybe Later</Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 48,
    marginBottom: 24,
  },
  pageTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "bold" },
  headerButtons: { flexDirection: "row", gap: 8 },
  headerBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#39FF14",
  },
  headerBtnText: { color: "#39FF14", fontSize: 13, fontWeight: "bold" },
  setupCard: {
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  setupTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  setupText: {
    color: "#888888",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  setupButton: {
    backgroundColor: "#39FF14",
    borderRadius: 10,
    padding: 14,
    paddingHorizontal: 24,
  },
  setupButtonText: { color: "#0D0D0D", fontWeight: "bold", fontSize: 15 },
  card: {
    backgroundColor: "#141414",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
  },
  runnerImage: { width: "100%", height: 280, resizeMode: "cover" },
  runnerImagePlaceholder: {
    width: "100%",
    height: 280,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  runnerInitials: { color: "#39FF14", fontSize: 72, fontWeight: "bold" },
  runnerInfo: { padding: 16, paddingBottom: 8 },
  runnerName: { color: "#FFFFFF", fontSize: 24, fontWeight: "bold" },
  runnerAge: { color: "#888888", fontSize: 15, marginTop: 2 },
  levelBadge: {
    backgroundColor: "#39FF14",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  levelText: { color: "#0D0D0D", fontSize: 12, fontWeight: "bold" },
  runnerDetails: { paddingHorizontal: 16, paddingBottom: 8 },
  bio: { color: "#CCCCCC", fontSize: 15, lineHeight: 22, marginBottom: 10 },
  detailRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  detailBadge: {
    backgroundColor: "#1A1A1A",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  detailBadgeText: { color: "#FFFFFF", fontSize: 13 },
  weeklyGoal: { color: "#888888", fontSize: 13 },
  actionButtons: { flexDirection: "row", padding: 16, gap: 12 },
  passButton: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF4444",
  },
  passButtonText: { color: "#FF4444", fontSize: 16, fontWeight: "bold" },
  likeButton: {
    flex: 1,
    backgroundColor: "#39FF14",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  likeButtonText: { color: "#0D0D0D", fontSize: 16, fontWeight: "bold" },
  emptyCard: {
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptyText: {
    color: "#888888",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: "#39FF14",
    borderRadius: 10,
    padding: 12,
    paddingHorizontal: 24,
  },
  refreshText: { color: "#0D0D0D", fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalScroll: { justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: "#141414",
    borderRadius: 20,
    padding: 24,
    margin: 16,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  inputLabel: {
    color: "#888888",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1A1A1A",
    color: "#FFFFFF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  optionBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#333333",
  },
  optionBtnSelected: { backgroundColor: "#39FF14", borderColor: "#39FF14" },
  optionText: { color: "#888888", fontSize: 13, fontWeight: "bold" },
  optionTextSelected: { color: "#0D0D0D" },
  saveButton: {
    backgroundColor: "#39FF14",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  saveButtonText: { color: "#0D0D0D", fontSize: 16, fontWeight: "bold" },
  cancelButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  cancelButtonText: { color: "#FFFFFF", fontSize: 16 },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  matchAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  matchAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#39FF14",
  },
  matchInitials: { color: "#39FF14", fontSize: 16, fontWeight: "bold" },
  matchInfo: { flex: 1 },
  matchName: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  matchLevel: { color: "#888888", fontSize: 13 },
  messageButton: {
    backgroundColor: "#25D366",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "bold" },
  matchOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  matchBox: {
    backgroundColor: "#141414",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
  },
  matchTitle: {
    color: "#39FF14",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  matchSubtitle: {
    color: "#888888",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  matchBigAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: "#39FF14",
  },
  matchBigAvatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 3,
    borderColor: "#39FF14",
  },
  matchBigInitials: { color: "#39FF14", fontSize: 40, fontWeight: "bold" },
  whatsappButton: {
    backgroundColor: "#25D366",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },
  whatsappButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  laterButton: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#333333",
  },
  laterButtonText: { color: "#FFFFFF", fontSize: 16 },
});
