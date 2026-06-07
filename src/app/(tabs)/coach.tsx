import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/themeContext";

const SYSTEM_PROMPT = `You are PaceIQ, an expert AI running coach and fitness advisor. You are friendly, motivating, and specific. You help runners with:
- Training plans and pace advice
- Nutrition and diet for runners
- Recovery and injury prevention
- Motivation and mental coaching
- Race preparation strategies
- Weight management through running
- General fitness and health advice

When you notice a runner's pace is slowing down based on their data, proactively motivate them and suggest reasons why. Always be encouraging. Keep responses concise but helpful — under 200 words unless a detailed plan is requested.`;

export default function CoachScreen() {
  const { primaryColor } = useTheme();
  const [messages, setMessages] = useState<any[]>([
    {
      role: "assistant",
      content:
        "Hi! I am your PaceIQ AI Coach! 💪 I can help you with training plans, nutrition, pace advice, motivation, and anything fitness related. What would you like to work on today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    loadUserContext();
  }, []);

  async function loadUserContext() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: p } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();
    const { data: r } = await supabase
      .from("runs")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(5);
    setProfile(p);
    setRecentRuns(r || []);
  }

  async function speakText(text: string, index: number) {
    if (isSpeaking && speakingIndex === index) {
      Speech.stop();
      setIsSpeaking(false);
      setSpeakingIndex(null);
      return;
    }
    Speech.stop();
    setIsSpeaking(true);
    setSpeakingIndex(index);
    Speech.speak(text, {
      language: "en-US",
      pitch: 1.0,
      rate: 0.9,
      onDone: () => {
        setIsSpeaking(false);
        setSpeakingIndex(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setSpeakingIndex(null);
      },
    });
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const contextPrompt = `${SYSTEM_PROMPT}\n\nRunner Profile: ${JSON.stringify(profile || {})}\nRecent Runs (last 5): ${JSON.stringify(recentRuns || [])}`;

      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "YOUR_API_KEY_HERE",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: contextPrompt,
          messages: apiMessages,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "API error");
      }

      const data = await response.json();
      const reply =
        data.content?.[0]?.text || "Sorry I could not respond right now.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("chat_messages").insert([
          { user_id: user.id, role: "user", content: userMessage.content },
          { user_id: user.id, role: "assistant", content: reply },
        ]);
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I ran into an issue: ${error.message}. Please add your Anthropic API key to enable AI coaching.`,
        },
      ]);
    }

    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.pageTitle}>AI Coach</Text>
        <View style={[styles.proBadge, { backgroundColor: primaryColor }]}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messages}
      >
        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.bubbleRow,
              msg.role === "user"
                ? styles.bubbleRowRight
                : styles.bubbleRowLeft,
            ]}
          >
            {msg.role === "assistant" && (
              <View style={styles.coachAvatar}>
                <Text style={styles.coachAvatarText}>🤖</Text>
              </View>
            )}
            <View
              style={[
                styles.bubble,
                msg.role === "user"
                  ? { ...styles.userBubble, backgroundColor: primaryColor }
                  : styles.assistantBubble,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  msg.role === "user" ? styles.userText : styles.assistantText,
                ]}
              >
                {msg.content}
              </Text>
              {msg.role === "assistant" && (
                <TouchableOpacity
                  style={styles.speakButton}
                  onPress={() => speakText(msg.content, i)}
                >
                  <Text
                    style={[styles.speakButtonText, { color: primaryColor }]}
                  >
                    {isSpeaking && speakingIndex === i ? "⏹ Stop" : "🔊 Listen"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
        {loading && (
          <View style={styles.bubbleRowLeft}>
            <View style={styles.coachAvatar}>
              <Text style={styles.coachAvatarText}>🤖</Text>
            </View>
            <View style={styles.assistantBubble}>
              <ActivityIndicator color={primaryColor} size="small" />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask your coach anything..."
          placeholderTextColor="#888888"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: primaryColor },
            (!input.trim() || loading) && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 48,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  pageTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "bold", flex: 1 },
  proBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  proBadgeText: { color: "#0D0D0D", fontWeight: "bold", fontSize: 13 },
  messagesContainer: { flex: 1, paddingHorizontal: 16 },
  messages: { paddingVertical: 16, gap: 12 },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  bubbleRowRight: { justifyContent: "flex-end" },
  bubbleRowLeft: { justifyContent: "flex-start" },
  coachAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  coachAvatarText: { fontSize: 18 },
  bubble: { maxWidth: "75%", borderRadius: 18, padding: 14 },
  userBubble: { borderBottomRightRadius: 4 },
  assistantBubble: {
    backgroundColor: "#141414",
    borderBottomLeftRadius: 4,
    minWidth: 60,
    minHeight: 44,
    justifyContent: "center",
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: "#0D0D0D" },
  assistantText: { color: "#FFFFFF" },
  speakButton: { marginTop: 8, alignSelf: "flex-start" },
  speakButtonText: { fontSize: 12, fontWeight: "bold" },
  inputRow: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
    gap: 10,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: "#141414",
    color: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    maxHeight: 120,
    minHeight: 48,
  },
  sendButton: {
    borderRadius: 12,
    paddingHorizontal: 20,
    height: 48,
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { color: "#0D0D0D", fontWeight: "bold", fontSize: 15 },
});
