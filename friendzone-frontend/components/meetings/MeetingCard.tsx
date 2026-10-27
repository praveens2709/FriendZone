import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, isToday, isTomorrow } from "date-fns";
import UserAvatar from "@/components/UserAvatar";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Meeting } from "@/types/meeting.type";
import ArtBackground from "@/components/ui/ArtBackground";
import { planCountdown, planTheme } from "@/utils/planStyle";

interface MeetingCardProps {
    meeting: Meeting;
    onJoin: () => void;
    onPress: () => void;
    onDelete?: () => void;
}

export default function MeetingCard({ meeting, onJoin, onPress, onDelete }: MeetingCardProps) {
    const { colors } = useTheme();
    const { user } = useAuth();

    const start = new Date(meeting.startTime);
    const theme = planTheme({ ...meeting });
    const tileInk = "#FFFFFF";
    const isLive = meeting.status === "live";
    const isCompleted = meeting.status === "completed";
    const isCancelled = meeting.status === "cancelled";
    const isInPerson = meeting.kind === "in_person";
    const isHost = meeting.host._id === user?._id;
    const mine = meeting.participants.find((p) => p.user._id === user?._id);
    const inactive = isCompleted || isCancelled;

    const when = isToday(start) ? "Today" : isTomorrow(start) ? "Tomorrow" : format(start, "EEE");
    const status = isLive
        ? "Live now"
        : isCancelled
            ? "Cancelled"
            : isCompleted
                ? "Ended"
                : isHost
                    ? "You're hosting"
                    : mine?.status === "accepted"
                        ? "You're in"
                        : mine?.status === "declined"
                            ? "Can't make it"
                            : "Invited";

    const people = [meeting.host, ...meeting.participants.map((p) => p.user)];
    const actionLabel = isLive && !isInPerson ? "Join now" : isCompleted ? "Summary" : "Details";

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
            <View
                style={[
                    styles.card,
                    {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: isLive ? colors.primary : colors.border,
                        opacity: inactive ? 0.65 : 1,
                    },
                ]}
            >
                <View style={styles.date}>
                    <ArtBackground palette={theme.palette} glyph={theme.glyph} watermark={54} />
                    <Text style={[styles.day, { color: tileInk }]}>{format(start, "d")}</Text>
                    <Text style={[styles.month, { color: tileInk }]}>{format(start, "MMM").toUpperCase()}</Text>
                </View>

                <View style={styles.body}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                            {meeting.title}
                        </Text>
                        {onDelete && !isLive && (
                            <TouchableOpacity onPress={onDelete} hitSlop={8}>
                                <Ionicons name="trash-outline" size={18} color={colors.red} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.line}>
                        <Ionicons name="time-outline" size={14} color={colors.textDim} />
                        <Text style={[styles.meta, { color: colors.textDim }]}>
                            {when} · {format(start, "h:mm a")}
                        </Text>
                        {!inactive && (
                            <Text style={[styles.countdown, { color: isLive ? colors.red : colors.accent }]}>
                                · {planCountdown(meeting).replace("Live · ", "")}
                            </Text>
                        )}
                    </View>
                    <View style={styles.line}>
                        <Ionicons
                            name={isInPerson ? "location-outline" : "videocam-outline"}
                            size={14}
                            color={colors.textDim}
                        />
                        <Text style={[styles.meta, { color: colors.textDim }]} numberOfLines={1}>
                            {isInPerson ? meeting.location || "In person" : "Video call"}
                        </Text>
                    </View>

                    <View style={styles.footer}>
                        <View style={styles.stack}>
                            {people.slice(0, 4).map((person, index) => (
                                <View
                                    key={person._id}
                                    style={[
                                        styles.avatar,
                                        { borderColor: colors.backgroundSecondary, marginLeft: index === 0 ? 0 : -10 },
                                    ]}
                                >
                                    <UserAvatar imageUri={person.profileImage} size={24} />
                                </View>
                            ))}
                            {people.length > 4 && (
                                <Text style={[styles.meta, { color: colors.textDim, marginLeft: 6 }]}>
                                    +{people.length - 4}
                                </Text>
                            )}
                        </View>

                        <View style={styles.right}>
                            <View
                                style={[
                                    styles.status,
                                    { backgroundColor: isLive ? colors.red : colors.primary + "1F" },
                                ]}
                            >
                                <Text style={[styles.statusText, { color: isLive ? "#FFFFFF" : colors.text }]}>
                                    {status}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={onJoin} disabled={isCancelled}>
                                <Text style={[styles.action, { color: isCancelled ? colors.textDim : colors.accent }]}>
                                    {actionLabel}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: { flexDirection: "row", borderWidth: 1, borderRadius: 20, padding: 12, gap: 14, marginBottom: 12 },
    date: { width: 58, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingVertical: 10, overflow: "hidden" },
    countdown: { fontSize: 12, fontWeight: "800" },
    day: { fontSize: 24, fontWeight: "900", lineHeight: 28 },
    month: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
    body: { flex: 1, gap: 3 },
    titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    title: { flex: 1, fontSize: 16, fontWeight: "800" },
    line: { flexDirection: "row", alignItems: "center", gap: 6 },
    meta: { fontSize: 13 },
    footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
    stack: { flexDirection: "row", alignItems: "center" },
    avatar: { borderWidth: 2, borderRadius: 16 },
    right: { flexDirection: "row", alignItems: "center", gap: 10 },
    status: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
    statusText: { fontSize: 11, fontWeight: "700" },
    action: { fontSize: 13, fontWeight: "800" },
});
