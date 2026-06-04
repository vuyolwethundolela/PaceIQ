import * as Speech from "expo-speech";
import { useRef, useState } from "react";
import {
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

export default function CoachScreen() {
  const [messages, setMessages] = useState<any[]>([
    {
      role: "assistant",
      content:
        "Hi! I am your PaceIQ AI Coach. Ask me anything about your training, pace, recovery, or nutrition!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPro] = useState(true);
  const scrollRef = useRef<any>(null);

  async function speakText(text: string) {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    Speech.speak(text, {
      language: "en-US",
      pitch: 1.0,
      rate: 0.9,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }

  async function sendMessage() {
    if (!input.trim() || loading || !isPro) return;

    const userMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.id)
        .single();
      const { data: runs } = await supabase
        .from("runs")
        .select("*")
        .eq("user_id", user?.id)
        .order("date", { ascending: false })
        .limit(5);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "YOUR_API_KEY_HERE",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are PaceIQ, a friendly but expert running coach. You speak in clear, encouraging, and specific language. Keep responses under 150 words. Runner profile: ${JSON.stringify(profile)}. Last 5 runs: ${JSON.stringify(runs)}.`,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      const reply =
        data.content?.[0]?.text || "Sorry, I could not respond right now.";
      const assistantMessage = { role: "assistant", content: reply };
      setMessages((prev) => [...prev, assistantMessage]);
      speakText(reply);

      await supabase.from("chat_messages").insert([
        { user_id: user?.id, role: "user", content: userMessage.content },
        { user_id: user?.id, role: "assistant", content: reply },
      ]);
    } catch (error) {
      const errorMsg = {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.pageTitle}>AI Coach</Text>

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
            <View
              style={[
                styles.bubble,
                msg.role === "user"
                  ? styles.userBubble
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
                  onPress={() => speakText(msg.content)}
                >
                  <Text style={styles.speakButtonText}>
                    {isSpeaking ? "⏹ Stop" : "🔊 Listen"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
        {loading && (
          <View style={styles.bubbleRowLeft}>
            <View style={styles.assistantBubble}>
              <Text style={styles.assistantText}>Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask your coach..."
          placeholderTextColor="#888888"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !input.trim() && styles.sendButtonDisabled,
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
  pageTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 48,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  messagesContainer: { flex: 1, paddingHorizontal: 20 },
  messages: { paddingVertical: 16 },
  bubbleRow: { marginBottom: 10 },
  bubbleRowRight: { alignItems: "flex-end" },
  bubbleRowLeft: { alignItems: "flex-start" },
  bubble: { maxWidth: "80%", borderRadius: 16, padding: 14 },
  userBubble: { backgroundColor: "#39FF14", borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: "#141414", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: "#0D0D0D" },
  assistantText: { color: "#FFFFFF" },
  speakButton: { marginTop: 8, alignSelf: "flex-start" },
  speakButtonText: { color: "#39FF14", fontSize: 12, fontWeight: "bold" },
  inputRow: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#141414",
    color: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#39FF14",
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { color: "#0D0D0D", fontWeight: "bold", fontSize: 15 },
});
