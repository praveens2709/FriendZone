import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { format } from "date-fns";
import UserAvatar from "@/components/UserAvatar";
import { Meeting } from "@/types/meeting.type";

interface MeetingCardProps {
    meeting: Meeting;
    onJoin: () => void;
    onPress: () => void;
    onDelete?: () => void;
}

export default function MeetingCard({ meeting, onJoin, onPress, onDelete }: MeetingCardProps) {
    const { colors } = useTheme();
    const startDate = new Date(meeting.startTime);
    const endDate = meeting.endTime ? new Date(meeting.endTime) : new Date(startDate.getTime() + 60 * 60 * 1000);
    const isLive = meeting.status === "live";
    const isCompleted = meeting.status === "completed";
    const isCancelled = meeting.status === "cancelled";

    // Build host display name
    const hostName = `${meeting.host.firstName} ${meeting.host.lastName || ""}`.trim();

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
            <ThemedView
                style={[
                    styles.card,
                    {
                        backgroundColor: colors.buttonBackgroundSecondary,
                        borderColor: isLive ? colors.primary : colors.border,
                        opacity: isCompleted || isCancelled ? 0.7 : 1,
                    },
                ]}
            >
                <View style={styles.header}>
                    <View style={styles.timeContainer}>
                        <MaterialCommunityIcons
                            name="video"
                            size={16}
                            color={isLive ? colors.primary : colors.textDim}
                            style={{ marginRight: 6 }}
                        />
                        <ThemedText
                            style={[
                                styles.timeText,
                                { color: isLive ? colors.primary : colors.textDim },
                            ]}
                        >
                            {format(startDate, "MMM d, h:mm a")}
                        </ThemedText>
                    </View>

                    <View style={{ flex: 1 }} />

                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        {isLive && (
                            <View style={[styles.badge, { backgroundColor: colors.red }]}>
                                <ThemedText style={styles.badgeText}>LIVE</ThemedText>
                            </View>
                        )}
                        {isCompleted && (
                            <View style={[styles.badge, { backgroundColor: colors.border }]}>
                                <ThemedText style={[styles.badgeText, { color: colors.text }]}>ENDED</ThemedText>
                            </View>
                        )}
                        {isCancelled && (
                            <View style={[styles.badge, { backgroundColor: colors.border }]}>
                                <ThemedText style={[styles.badgeText, { color: colors.textDim }]}>CANCELLED</ThemedText>
                            </View>
                        )}

                        {onDelete && !isLive && (
                            <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
                                <MaterialCommunityIcons name="delete-outline" size={20} color={colors.red} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <ThemedText style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                    {meeting.title}
                </ThemedText>

                <View style={styles.footer}>
                    <View style={styles.participants}>
                        <UserAvatar imageUri={meeting.host.profileImage} size={28} />
                        {meeting.participants.slice(0, 3).map((p, i) => (
                            <View key={p.user._id} style={[styles.participantAvatar, { marginLeft: -10, zIndex: -i }]}>
                                <UserAvatar imageUri={p.user.profileImage} size={28} />
                            </View>
                        ))}
                        {meeting.participants.length > 3 && (
                            <View style={[styles.moreCount, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <ThemedText style={[styles.moreCountText, { color: colors.textDim }]}>
                                    +{meeting.participants.length - 3}
                                </ThemedText>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.joinButton,
                            {
                                backgroundColor: isLive ? colors.primary : 'transparent',
                                borderColor: isLive ? colors.primary : colors.border,
                                borderWidth: 1
                            }
                        ]}
                        onPress={onJoin}
                        disabled={isCompleted || isCancelled}
                    >
                        <ThemedText style={[styles.joinText, {
                            color: isLive ? colors.buttonText : (isCompleted || isCancelled) ? colors.textDim : colors.primary
                        }]}>
                            {isLive ? "Join Now" : isCompleted ? "Summary" : isCancelled ? "Cancelled" : "Details"}
                        </ThemedText>
                    </TouchableOpacity>
                </View>
            </ThemedView>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    timeContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    timeText: {
        fontSize: 13,
        fontWeight: "600",
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        color: "white",
        fontSize: 10,
        fontWeight: "bold",
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 16,
        lineHeight: 24
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    participants: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    participantAvatar: {
        borderWidth: 2,
        borderColor: 'white',
        borderRadius: 30
    },
    moreCount: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginLeft: -10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        zIndex: -10
    },
    moreCountText: {
        fontSize: 10,
        fontWeight: 'bold'
    },
    joinButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20
    },
    joinText: {
        fontSize: 13,
        fontWeight: '600'
    },
    deleteButton: {
        padding: 4,
        marginLeft: 4,
    }
});
