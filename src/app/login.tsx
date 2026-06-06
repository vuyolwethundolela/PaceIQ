import { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);

const FITNESS_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const TARGETS = [
  { label: "Lose Weight", value: "lose_weight" },
  { label: "Run a 5K", value: "run_5k" },
  { label: "Run a 10K", value: "run_10k" },
  { label: "Half Marathon", value: "half_marathon" },
  { label: "Marathon", value: "marathon" },
  { label: "General Fitness", value: "general_fitness" },
];

const TERMS_TEXT = `PACEIQ TERMS & CONDITIONS AND PRIVACY POLICY

Last updated: June 2026

1. ACCEPTANCE OF TERMS
By creating an account and using PaceIQ, you agree to these Terms & Conditions. If you do not agree, please do not use the app.

2. USE OF THE APP
PaceIQ is a running coach and fitness tracking app. You must be at least 13 years old to use this app. You are responsible for all activity on your account.

3. HEALTH & FITNESS DISCLAIMER
PaceIQ provides general fitness guidance only. It is NOT a substitute for professional medical advice. Always consult a doctor before starting any exercise program. Stop exercising immediately if you feel pain, dizziness, or discomfort.

4. SAFETY FEATURES
The SOS and location sharing features are provided as safety tools only. PaceIQ is not responsible for emergency response times or outcomes. Always ensure your emergency contacts are aware and reachable.

5. LOCATION DATA
With your permission, PaceIQ collects your GPS location to track runs and show nearby runners. Location data is stored securely and never sold to third parties.

6. PERSONAL DATA
We collect your name, email, age, weight, and fitness data to personalise your experience. Your data is stored securely on Supabase servers. You can delete your account and all data at any time from the Profile screen.

7. RUNNER MATCHING
The Run Dates feature is for finding running partners only. PaceIQ is not responsible for interactions between users. Always meet in public places and inform someone of your plans.

8. UNSAFE AREA REPORTS
Users can report unsafe areas to help the community. PaceIQ does not verify these reports. Always use your own judgement about route safety.

9. AI COACHING
AI coaching is provided for informational purposes only. The AI coach uses your running data to provide suggestions but is not a certified coach or medical professional.

10. SUBSCRIPTION & PAYMENTS
Pro features require a paid subscription. Subscriptions auto-renew unless cancelled. Refunds are handled per app store policies.

11. CHANGES TO TERMS
We may update these terms. Continued use of the app means you accept the new terms.

12. CONTACT
For questions: support@paceiq.app

By tapping "I Agree", you confirm you have read and agree to these Terms & Conditions and Privacy Policy.`;

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [weight, setWeight] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [target, setTarget] = useState("");
  const [weeklyGoal, setWeeklyGoal] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showEmailExistsModal, setShowEmailExistsModal] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  function getFormattedDob() {
    if (!dobDay || !dobMonth || !dobYear) return null;
    const month = MONTHS.indexOf(dobMonth) + 1;
    return `${dobYear}-${String(month).padStart(2, "0")}-${String(dobDay).padStart(2, "0")}`;
  }

  function getDobDisplay() {
    if (!dobDay || !dobMonth || !dobYear) return "Select Date of Birth";
    return `${dobDay} ${dobMonth} ${dobYear}`;
  }

  function calculateAge(dobString: string) {
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }

  function validateStep1() {
    if (!firstName || !lastName) {
      setError("Please enter your first and last name");
      return false;
    }
    if (!email) {
      setError("Please enter your email");
      return false;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (!agreedToTerms) {
      setError("Please agree to the Terms & Conditions");
      return false;
    }
    return true;
  }

  function validateStep2() {
    if (!dobDay || !dobMonth || !dobYear) {
      setError("Please select your date of birth");
      return false;
    }
    if (!weight || isNaN(Number(weight))) {
      setError("Please enter a valid weight");
      return false;
    }
    if (!fitnessLevel) {
      setError("Please select your fitness level");
      return false;
    }
    if (!target) {
      setError("Please select your goal");
      return false;
    }
    if (!weeklyGoal || isNaN(Number(weeklyGoal))) {
      setError("Please enter your weekly km goal");
      return false;
    }
    return true;
  }

  function handleNextStep() {
    setError("");
    if (validateStep1()) setStep(2);
  }

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function handleSignUp() {
    setLoading(true);
    setError("");
    if (!validateStep2()) {
      setLoading(false);
      return;
    }

    const dob = getFormattedDob();
    const age = dob ? calculateAge(dob) : null;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dob,
        },
      },
    });

    if (error) {
      if (
        error.message.toLowerCase().includes("already") ||
        error.message.toLowerCase().includes("exists")
      ) {
        setShowEmailExistsModal(true);
      } else {
        setError(error.message);
      }
    } else if (data.user) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const { error: rpcError } = await supabase.rpc("update_user_profile", {
        p_user_id: data.user.id,
        p_name: `${firstName} ${lastName}`,
        p_age: age,
        p_weight_kg: parseFloat(weight),
        p_fitness_level: fitnessLevel.toLowerCase(),
        p_target: target,
        p_weekly_goal_km: parseFloat(weeklyGoal),
      });
      if (rpcError) console.error("RPC error:", rpcError);
      setMessage("Account created! You can now log in.");
      setIsLogin(true);
      setStep(1);
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: false,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data?.url) window.location.href = data.url;
    setLoading(false);
  }

  async function handleForgotPassword() {
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
    setResetLoading(false);
  }

  const monthIndex = MONTHS.indexOf(dobMonth);
  const daysInMonth =
    dobYear && dobMonth ? getDaysInMonth(monthIndex, parseInt(dobYear)) : 31;
  const DAYS = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>PaceIQ</Text>
      <Text style={styles.sub}>Your AI Running Coach</Text>

      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, isLogin && styles.toggleActive]}
          onPress={() => {
            setIsLogin(true);
            setError("");
            setMessage("");
            setStep(1);
          }}
        >
          <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
            Login
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, !isLogin && styles.toggleActive]}
          onPress={() => {
            setIsLogin(false);
            setError("");
            setMessage("");
            setStep(1);
          }}
        >
          <Text
            style={[styles.toggleText, !isLogin && styles.toggleTextActive]}
          >
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>

      {isLogin && (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.success}>{message}</Text> : null}
          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Loading..." : "Login"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => setShowForgotPassword(true)}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
          <Text style={styles.orText}>— or —</Text>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLogin && step === 1 && (
        <View style={styles.formContainer}>
          <Text style={styles.stepLabel}>Step 1 of 2 — Personal Info</Text>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            placeholderTextColor="#888888"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            placeholderTextColor="#888888"
            value={lastName}
            onChangeText={setLastName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters)"
            placeholderTextColor="#888888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
          >
            <View
              style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
            >
              {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree to the{" "}
              <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>
                Terms & Conditions
              </Text>{" "}
              and{" "}
              <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.button} onPress={handleNextStep}>
            <Text style={styles.buttonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLogin && step === 2 && (
        <View style={styles.formContainer}>
          <Text style={styles.stepLabel}>Step 2 of 2 — Runner Profile</Text>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDobPicker(!showDobPicker)}
          >
            <Text
              style={
                dobDay ? styles.dateTextSelected : styles.dateTextPlaceholder
              }
            >
              {getDobDisplay()}
            </Text>
            <Text style={styles.calendarIcon}>📅</Text>
          </TouchableOpacity>

          {showDobPicker && (
            <View style={styles.dobPicker}>
              <Text style={styles.dobTitle}>Date of Birth</Text>
              <Text style={styles.dobLabel}>Year</Text>
              <ScrollView style={styles.scrollList} nestedScrollEnabled>
                {YEARS.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[
                      styles.dobOption,
                      dobYear === String(y) && styles.dobOptionSelected,
                    ]}
                    onPress={() => setDobYear(String(y))}
                  >
                    <Text
                      style={[
                        styles.dobOptionText,
                        dobYear === String(y) && styles.dobOptionTextSelected,
                      ]}
                    >
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.dobLabel}>Month</Text>
              <ScrollView style={styles.scrollList} nestedScrollEnabled>
                {MONTHS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.dobOption,
                      dobMonth === m && styles.dobOptionSelected,
                    ]}
                    onPress={() => setDobMonth(m)}
                  >
                    <Text
                      style={[
                        styles.dobOptionText,
                        dobMonth === m && styles.dobOptionTextSelected,
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.dobLabel}>Day</Text>
              <ScrollView style={styles.scrollList} nestedScrollEnabled>
                {DAYS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.dobOption,
                      dobDay === d && styles.dobOptionSelected,
                    ]}
                    onPress={() => setDobDay(d)}
                  >
                    <Text
                      style={[
                        styles.dobOptionText,
                        dobDay === d && styles.dobOptionTextSelected,
                      ]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.dobConfirm}
                onPress={() => setShowDobPicker(false)}
              >
                <Text style={styles.dobConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Weight (kg)"
            placeholderTextColor="#888888"
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Weekly running goal (km)"
            placeholderTextColor="#888888"
            value={weeklyGoal}
            onChangeText={setWeeklyGoal}
            keyboardType="numeric"
          />

          <Text style={styles.sectionLabel}>Fitness Level</Text>
          <View style={styles.optionRow}>
            {FITNESS_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.optionBtn,
                  fitnessLevel === level && styles.optionBtnSelected,
                ]}
                onPress={() => setFitnessLevel(level)}
              >
                <Text
                  style={[
                    styles.optionText,
                    fitnessLevel === level && styles.optionTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>My Goal</Text>
          <View style={styles.targetGrid}>
            {TARGETS.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.targetBtn,
                  target === t.value && styles.targetBtnSelected,
                ]}
                onPress={() => setTarget(t.value)}
              >
                <Text
                  style={[
                    styles.targetText,
                    target === t.value && styles.targetTextSelected,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.stepButtons}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setStep(1);
                setError("");
              }}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Creating..." : "Create Account"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Email Exists Modal */}
      <Modal visible={showEmailExistsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Email Already Exists</Text>
            <Text style={styles.modalMessage}>
              An account with this email already exists. Please log in instead.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowEmailExistsModal(false);
                setIsLogin(true);
                setStep(1);
                setError("");
              }}
            >
              <Text style={styles.modalButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal visible={showForgotPassword} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {!resetSent ? (
              <>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalMessage}>
                  Enter your email and we will send you a reset link.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your email address"
                  placeholderTextColor="#888888"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleForgotPassword}
                  disabled={resetLoading}
                >
                  <Text style={styles.modalButtonText}>
                    {resetLoading ? "Sending..." : "Send Reset Link"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowForgotPassword(false);
                    setResetEmail("");
                    setError("");
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Email Sent!</Text>
                <Text style={styles.modalMessage}>
                  Check your inbox for a password reset link.
                </Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setShowForgotPassword(false);
                    setResetSent(false);
                    setResetEmail("");
                  }}
                >
                  <Text style={styles.modalButtonText}>Back to Login</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Terms & Conditions Modal */}
      <Modal visible={showTerms} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.termsModalBox}>
            <Text style={styles.modalTitle}>Terms & Conditions</Text>
            <ScrollView style={styles.termsScroll}>
              <Text style={styles.termsContent}>{TERMS_TEXT}</Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setAgreedToTerms(true);
                setShowTerms(false);
              }}
            >
              <Text style={styles.modalButtonText}>I Agree</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowTerms(false)}
            >
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0D0D0D",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { color: "#39FF14", fontSize: 36, fontWeight: "bold" },
  sub: { color: "#888888", fontSize: 16, marginBottom: 32 },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    marginBottom: 24,
    width: "100%",
    padding: 4,
  },
  toggleBtn: { flex: 1, padding: 12, alignItems: "center", borderRadius: 8 },
  toggleActive: { backgroundColor: "#39FF14" },
  toggleText: { color: "#888888", fontWeight: "bold", fontSize: 15 },
  toggleTextActive: { color: "#0D0D0D", fontWeight: "bold", fontSize: 15 },
  formContainer: { width: "100%" },
  stepLabel: {
    color: "#39FF14",
    fontSize: 13,
    marginBottom: 16,
    fontWeight: "bold",
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
  dateButton: {
    width: "100%",
    backgroundColor: "#1A1A1A",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateTextPlaceholder: { color: "#888888", fontSize: 16 },
  dateTextSelected: { color: "#FFFFFF", fontSize: 16 },
  calendarIcon: { fontSize: 20 },
  dobPicker: {
    width: "100%",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dobTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  dobLabel: {
    color: "#39FF14",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
  },
  scrollList: {
    maxHeight: 120,
    backgroundColor: "#0D0D0D",
    borderRadius: 8,
    marginBottom: 8,
  },
  dobOption: { padding: 10, borderRadius: 6 },
  dobOptionSelected: { backgroundColor: "#39FF14" },
  dobOptionText: { color: "#FFFFFF", fontSize: 15 },
  dobOptionTextSelected: { color: "#0D0D0D", fontWeight: "bold" },
  dobConfirm: {
    backgroundColor: "#39FF14",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  dobConfirmText: { color: "#0D0D0D", fontWeight: "bold", fontSize: 16 },
  sectionLabel: {
    color: "#888888",
    fontSize: 12,
    marginBottom: 8,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  optionRow: { flexDirection: "row", width: "100%", marginBottom: 16 },
  optionBtn: {
    flex: 1,
    padding: 10,
    backgroundColor: "#1A1A1A",
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#333333",
  },
  optionBtnSelected: { backgroundColor: "#39FF14", borderColor: "#39FF14" },
  optionText: { color: "#888888", fontSize: 13, fontWeight: "bold" },
  optionTextSelected: { color: "#0D0D0D" },
  targetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    marginBottom: 16,
  },
  targetBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 8,
    padding: 10,
    margin: 4,
    borderWidth: 1,
    borderColor: "#333333",
  },
  targetBtnSelected: { backgroundColor: "#39FF14", borderColor: "#39FF14" },
  targetText: { color: "#888888", fontSize: 13, fontWeight: "bold" },
  targetTextSelected: { color: "#0D0D0D" },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#39FF14",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxChecked: { backgroundColor: "#39FF14" },
  checkmark: { color: "#0D0D0D", fontSize: 14, fontWeight: "bold" },
  termsText: { color: "#888888", fontSize: 13, flex: 1, flexWrap: "wrap" },
  termsLink: { color: "#39FF14", textDecorationLine: "underline" },
  button: {
    width: "100%",
    backgroundColor: "#39FF14",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#0D0D0D", fontSize: 16, fontWeight: "bold" },
  stepButtons: { flexDirection: "row", width: "100%", gap: 12, marginTop: 8 },
  backButton: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  backButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  submitButton: {
    flex: 1,
    backgroundColor: "#39FF14",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  forgotButton: { alignItems: "center", marginTop: 12 },
  forgotText: { color: "#39FF14", fontSize: 14 },
  orText: { color: "#888888", marginVertical: 16, textAlign: "center" },
  googleButton: {
    width: "100%",
    backgroundColor: "#1A1A1A",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  googleText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  error: { color: "#FF4444", marginBottom: 8 },
  success: { color: "#39FF14", marginBottom: 8 },
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
  termsModalBox: {
    backgroundColor: "#141414",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  termsScroll: { maxHeight: 400, marginBottom: 16 },
  termsContent: { color: "#CCCCCC", fontSize: 13, lineHeight: 22 },
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
  modalButton: {
    backgroundColor: "#39FF14",
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
