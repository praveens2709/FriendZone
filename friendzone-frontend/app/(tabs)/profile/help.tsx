import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useLocalSearchParams } from "expo-router";
import ScreenBackground from "@/components/ui/ScreenBackground";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import InlineError from "@/components/InlineError";
import Card from "@/components/ui/Card";
import { useTheme } from "@/context/ThemeContext";
import SupportService, { FeedbackType } from "@/services/SupportService";
import { getApiError } from "@/constants/Functions";
import { readableTextOn } from "@/utils/theme-utils";

const FAQ = [
  {
    q: "What does knocking mean?",
    a: "A knock is how you connect. Knock on someone; if they knock back, you're LockedIn. Private accounts need to approve your knock first.",
  },
  {
    q: "What's a vibe?",
    a: "A vibe is a short status like 'Free tonight' that lasts up to 24 hours. Only people you're LockedIn with can see it, and you can clear it any time.",
  },
  {
    q: "How do plans work?",
    a: "Make a plan from the Plans tab or from a friend's card on Circle. Choose in person or video, pick a time, invite friends and they can reply 'I'm in' or 'Can't make it'.",
  },
  {
    q: "Who can see my posts?",
    a: "Public accounts are visible to everyone you're connected with. Private accounts are visible only to people who knocked and were accepted. Change this in Account privacy.",
  },
  {
    q: "How do I hide a post without deleting it?",
    a: "Open the post menu and choose Archive. Find it later under Archive in Settings, where you can restore or delete it.",
  },
  {
    q: "How do I block or report someone?",
    a: "Open their profile or a post's menu and choose Report or Block. Blocked people can't find, message or see you. Manage them under Blocked accounts.",
  },
  {
    q: "I forgot my password.",
    a: "On the login screen tap Forgot password, enter your email and use the 6-digit code we send you.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Settings, then Delete account, and confirm with your password. This permanently removes your profile, posts, knocks, plans and the messages you sent.",
  },
  {
    q: "Can I change my date of birth?",
    a: "For safety, your date of birth is fixed once set. If it's wrong, send us a message below and choose 'Date of birth change'.",
  },
];

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: "help", label: "Help" },
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "dob_change", label: "Date of birth" },
];

export default function HelpScreen() {
  const { colors } = useTheme();
  const { topic } = useLocalSearchParams<{ topic?: string }>();
  const [open, setOpen] = useState<number | null>(null);
  const [type, setType] = useState<FeedbackType>(topic === "dob" ? "dob_change" : "help");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

  const send = async () => {
    if (message.trim().length < 5 || sending) return;
    try {
      setSending(true);
      setSendError("");
      await SupportService.sendFeedback(type, message.trim(), Constants.expoConfig?.version);
      setMessage("");
      setSent(true);
    } catch (error) {
      setSendError(getApiError(error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenBackground>
      <ThemedSafeArea style={styles.safe}>
        <CommonHeader title="Help" leftContent={<BackButton color={colors.text} />} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={"padding"}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.section, { color: colors.textDim }]}>COMMON QUESTIONS</Text>
            {FAQ.map((item, index) => {
              const isOpen = open === index;
              return (
                <TouchableOpacity key={item.q} activeOpacity={0.85} onPress={() => setOpen(isOpen ? null : index)}>
                  <Card style={styles.faq}>
                    <View style={styles.faqHead}>
                      <Text style={[styles.question, { color: colors.text }]}>{item.q}</Text>
                      <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textDim} />
                    </View>
                    {isOpen && <Text style={[styles.answer, { color: colors.textDim }]}>{item.a}</Text>}
                  </Card>
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.section, { color: colors.textDim, marginTop: 22 }]}>CONTACT US</Text>
            <View style={styles.types}>
              {TYPES.map((t) => {
                const on = type === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setType(t.value)}
                    style={[
                      styles.chip,
                      { backgroundColor: on ? colors.primary : colors.backgroundSecondary, borderColor: on ? colors.primary : colors.border },
                    ]}
                  >
                    <Text style={{ color: on ? readableTextOn(colors.primary, colors.buttonText) : colors.text, fontWeight: "700" }}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                setSent(false);
                setSendError("");
              }}
              multiline
              maxLength={2000}
              placeholder="Tell us what's going on"
              placeholderTextColor={colors.textDim}
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
            />
            <InlineError message={sendError} />
            <Button
              title={sending ? "Sending..." : sent ? "Message sent" : "Send message"}
              onPress={send}
              disabled={sending || sent || message.trim().length < 5}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedSafeArea>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  section: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, marginVertical: 10 },
  faq: { marginBottom: 8, padding: 14 },
  faqHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  question: { flex: 1, fontSize: 15, fontWeight: "700" },
  answer: { fontSize: 14, lineHeight: 21, marginTop: 10 },
  types: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  input: { minHeight: 120, borderWidth: 1, borderRadius: 16, padding: 14, fontSize: 15, textAlignVertical: "top", marginBottom: 12 },
});
