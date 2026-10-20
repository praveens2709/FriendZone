import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, isToday, isTomorrow } from "date-fns";
import UserAvatar from "@/components/UserAvatar";
import { useTheme } from "@/context/ThemeContext";
import { Meeting } from "@/types/meeting.type";
import { readableTextOn } from "@/utils/theme-utils";

export default function PlanCard({
  meeting,
  myId,
  onPress,
}: {
  meeting: Meeting;
  myId?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const ink = readableTextOn(colors.primary, colors.buttonText);
  const start = new Date(meeting.startTime);
  const isInPerson = meeting.kind === "in_person";
  const isHost = meeting.host._id === myId;
  const mine = meeting.participants.find((p) => p.user._id === myId);

  const when = isToday(start) ? "Today" : isTomorrow(start) ? "Tomorrow" : format(start, "EEE");
  const role = isHost
    ? "You're hosting"
    : mine?.status === "accepted"
      ? "You're in"
      : mine?.status === "declined"
        ? "Can't make it"
        : "Invited";

  const people = [meeting.host, ...meeting.participants.map((p) => p.user)];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
    >
      <View style={[styles.date, { backgroundColor: colors.primary }]}>
        <Text style={[styles.day, { color: ink }]}>{format(start, "d")}</Text>
        <Text style={[styles.month, { color: ink }]}>{format(start, "MMM").toUpperCase()}</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {meeting.title}
        </Text>
        <View style={styles.line}>
          <Ionicons name="time-outline" size={14} color={colors.textDim} />
          <Text style={[styles.meta, { color: colors.textDim }]}>
            {when} · {format(start, "h:mm a")}
          </Text>
        </View>
        <View style={styles.line}>
          <Ionicons name={isInPerson ? "location-outline" : "videocam-outline"} size={14} color={colors.textDim} />
          <Text style={[styles.meta, { color: colors.textDim }]} numberOfLines={1}>
            {isInPerson ? meeting.location || "In person" : "Video call"}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.stack}>
            {people.slice(0, 4).map((person, index) => (
              <View
                key={person._id}
                style={[styles.avatar, { borderColor: colors.backgroundSecondary, marginLeft: index === 0 ? 0 : -10 }]}
              >
                <UserAvatar imageUri={person.profileImage} size={24} />
              </View>
            ))}
            {people.length > 4 && (
              <Text style={[styles.meta, { color: colors.textDim, marginLeft: 6 }]}>+{people.length - 4}</Text>
            )}
          </View>
          <View style={[styles.role, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.roleText, { color: colors.text }]}>{role}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", borderWidth: 1, borderRadius: 20, padding: 12, gap: 14, marginBottom: 10 },
  date: { width: 58, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingVertical: 10 },
  day: { fontSize: 24, fontWeight: "900", lineHeight: 28 },
  month: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontWeight: "800" },
  line: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 13 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  stack: { flexDirection: "row", alignItems: "center" },
  avatar: { borderWidth: 2, borderRadius: 16 },
  role: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  roleText: { fontSize: 11, fontWeight: "700" },
});
