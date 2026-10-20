import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Image, Modal, StyleSheet, Text, TouchableOpacity, Vibration, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import MeetingService from "@/services/MeetingService";

interface IncomingCall {
  meetingId: string;
  chatId: string;
  audioOnly: boolean;
  isGroup: boolean;
  title: string;
  from: { id: string; name: string; profileImage: string | null };
  expiresAt: string;
}

export default function IncomingCallModal() {
  const { socket } = useSocket();
  const { accessToken, isAuthenticated } = useAuth();
  const router = useRouter();
  const [call, setCall] = useState<IncomingCall | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    Vibration.cancel();
    setCall(null);
  }, []);

  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const onIncoming = (incoming: IncomingCall) => {
      setCall(incoming);
      Vibration.vibrate([0, 700, 500, 700, 500, 700], true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (timerRef.current) clearTimeout(timerRef.current);
      const remaining = Math.max(new Date(incoming.expiresAt).getTime() - Date.now(), 5000);
      timerRef.current = setTimeout(dismiss, remaining);
    };

    const onCancelled = ({ meetingId }: { meetingId: string }) => {
      setCall((current) => (current?.meetingId === meetingId ? null : current));
      Vibration.cancel();
    };

    socket.on("incomingCall", onIncoming);
    socket.on("callCancelled", onCancelled);
    return () => {
      socket.off("incomingCall", onIncoming);
      socket.off("callCancelled", onCancelled);
    };
  }, [socket, isAuthenticated, dismiss]);

  const accept = async () => {
    if (!call || !accessToken) return;
    const current = call;
    dismiss();
    try {
      await MeetingService.respondToInvitation(current.meetingId, "accepted", accessToken);
    } catch {}
    router.push(
      `/live-meeting/${current.meetingId}?isHost=false&audio=${current.audioOnly ? 1 : 0}&instant=1`
    );
  };

  const decline = async () => {
    if (!call) return;
    const current = call;
    dismiss();
    try {
      await MeetingService.declineCall(current.meetingId);
    } catch {

    }
  };

  return (
    <Modal visible={!!call} animationType="fade" transparent statusBarTranslucent onRequestClose={decline}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.kind}>{call?.audioOnly ? "Incoming audio call" : "Incoming video call"}</Text>
          {call?.from.profileImage ? (
            <Image source={{ uri: call.from.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={48} color="#fff" />
            </View>
          )}
          <Text style={styles.name}>{call?.isGroup ? call.title : call?.from.name}</Text>
          {call?.isGroup && <Text style={styles.sub}>{call.from.name} is calling the group</Text>}

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, { backgroundColor: "#FF3B30" }]} onPress={decline}>
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: "#34C759" }]} onPress={accept}>
              <Ionicons name={call?.audioOnly ? "call" : "videocam"} size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.labels}>
            <Text style={styles.label}>Decline</Text>
            <Text style={styles.label}>Accept</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { alignItems: "center", width: "100%", gap: 10 },
  kind: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "700", letterSpacing: 0.5, marginBottom: 20 },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarFallback: { backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  name: { color: "#fff", fontSize: 28, fontWeight: "900", marginTop: 12, textAlign: "center" },
  sub: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
  actions: { flexDirection: "row", gap: 90, marginTop: 60 },
  button: { width: 70, height: 70, borderRadius: 35, alignItems: "center", justifyContent: "center" },
  labels: { flexDirection: "row", gap: 90, marginTop: 6 },
  label: { color: "rgba(255,255,255,0.7)", fontSize: 13, width: 70, textAlign: "center" },
});
