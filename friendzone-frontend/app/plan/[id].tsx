import { useConfirm } from "@/components/ConfirmProvider";
import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useState, useEffect } from "react";
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import InviteParticipantsModal, { InviteeUser } from "@/components/InviteParticipantsModal";
import BackButton from "@/components/BackButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Button from "@/components/Button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, type Href } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import MeetingService from "@/services/MeetingService";
import { Meeting } from "@/types/meeting.type";
import { format } from "date-fns";
import UserAvatar from "@/components/UserAvatar";
import UserProfileCard from "@/components/UserProfileCard";
import PlanBanner from "@/components/meetings/PlanBanner";

export default function MeetingDetailsScreen() {
  const confirm = useConfirm();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { accessToken, user } = useAuth();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [rsvpSubmitting, setRsvpSubmitting] = useState<"accepted" | "declined" | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set());
    const [invitingIds, setInvitingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (id && accessToken) {
            fetchMeeting();
        }
    }, [id, accessToken]);

    const fetchMeeting = async () => {
        try {
            const data = await MeetingService.getMeetingById(id!, accessToken!);
            setMeeting(data);
        } catch (error) {
            console.error("Error fetching meeting:", error);
        } finally {
            setLoading(false);
        }
    };

    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;
        const onUpdate = (updated: Meeting) => {
            if (updated._id === id) setMeeting(updated);
        };
        const onDeleted = ({ meetingId }: { meetingId: string }) => {
            if (meetingId === id) router.back();
        };
        socket.on("meetingUpdated", onUpdate);
        socket.on("meetingDeleted", onDeleted);
        return () => {
            socket.off("meetingUpdated", onUpdate);
            socket.off("meetingDeleted", onDeleted);
        };
    }, [socket, id]);

    const handleRsvp = async (response: "accepted" | "declined") => {
        if (!meeting || !accessToken) return;
        setRsvpSubmitting(response);
        setActionLoading(true);

        const currentUserId = user?._id?.toString();
        setMeeting(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                participants: prev.participants.map(p => {
                    const pUserId = (p.user?._id || p.user)?.toString();
                    if (pUserId === currentUserId) {
                        return { ...p, status: response };
                    }
                    return p;
                })
            };
        });

        try {
            await MeetingService.respondToInvitation(meeting._id, response, accessToken);
            await fetchMeeting();
        } catch (error) {
            console.error("Error responding to plan:", error);
            await fetchMeeting();
        } finally {
            setActionLoading(false);
            setRsvpSubmitting(null);
        }
    };

    const handleJoinMeeting = async () => {
        if (!meeting) return;

        setActionLoading(true);
        try {
            if (meeting.status === "upcoming" && meeting.host._id === user?._id) {
                await MeetingService.updateMeetingStatus(meeting._id, "live", accessToken!);
            }

            router.push(`/live-meeting/${meeting._id}?isHost=${meeting.host._id === user?._id}`);
        } catch (error) {
            console.error("Error joining meeting:", error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelMeeting = async () => {
        if (!meeting) return;

        confirm({
            title: "Cancel this meeting?",
            message: "Everyone invited will see that it's cancelled.",
            confirmLabel: "Yes, cancel",
            onConfirm: async () => {
                setActionLoading(true);
                try {
                    await MeetingService.deleteMeeting(meeting._id, accessToken!);
                    router.back();
                } catch (error) {
                    console.error("Error cancelling meeting:", error);
                } finally {
                    setActionLoading(false);
                }
            },
        });
    };

    const handleInviteSingleUser = async (user: InviteeUser) => {
        if (!accessToken || !meeting || invitingIds.has(user._id) || invitedUserIds.has(user._id)) return;

        setInvitingIds(prev => new Set(prev).add(user._id));
        try {
            await MeetingService.addParticipants(meeting._id, [user._id], accessToken);
            setInvitedUserIds(prev => new Set(prev).add(user._id));

            fetchMeeting();
        } catch (error: any) {
            console.error("Failed to invite user:", error);
        } finally {
            setInvitingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(user._id);
                return newSet;
            });
        }
    };


    if (loading) {
        return (
            <ScreenBackground style={styles.container}>
                <ThemedSafeArea style={styles.safeArea}>
                    <CommonHeader title="Meeting Details" leftContent={<BackButton color={colors.text} />} />
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                </ThemedSafeArea>
            </ScreenBackground>
        );
    }

    if (!meeting) {
        return (
            <ScreenBackground style={styles.container}>
                <ThemedSafeArea style={styles.safeArea}>
                    <CommonHeader title="Meeting Details" leftContent={<BackButton color={colors.text} />} />
                    <View style={styles.loadingContainer}>
                        <ThemedText style={{ color: colors.textDim }}>Meeting not found</ThemedText>
                    </View>
                </ThemedSafeArea>
            </ScreenBackground>
        );
    }

    const currentUserId = user?._id?.toString();
    const hostId = (meeting.host?._id || meeting.host)?.toString();
    const isHost = hostId === currentUserId;
    const isInPerson = meeting.kind === "in_person";
    const myParticipant = meeting.participants.find(
        (p) => (p.user?._id || p.user)?.toString() === currentUserId
    );
    const isPendingRsvp = !isHost && myParticipant && myParticipant.status === "pending";
    const startDate = new Date(meeting.startTime);

    return (
        <ScreenBackground style={styles.container}>
            <ThemedSafeArea style={styles.safeArea} edges={["top", "left", "right"]}>
                <CommonHeader
                    title={isInPerson ? "Plan" : "Meeting Details"}
                    leftContent={<BackButton color={colors.text} />}
                    rightContent1={
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {isHost && (meeting.status === 'upcoming' || meeting.status === 'live') && (
                                <TouchableOpacity
                                    onPress={() =>
                                        router.push(`/plan/edit?editId=${meeting._id}` as Href)
                                    }
                                >
                                    <Ionicons name="create-outline" size={24} color={colors.text} />
                                </TouchableOpacity>
                            )}
                            {isHost && (meeting.status === 'upcoming' || meeting.status === 'live') && (
                                <TouchableOpacity onPress={() => setShowInviteModal(true)}>
                                    <Ionicons name="person-add-outline" size={24} color={colors.text} />
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                    <PlanBanner meeting={meeting} />

                    {meeting.description && (
                        <ThemedText style={[styles.description, { color: colors.textDim }]}>
                            {meeting.description}
                        </ThemedText>
                    )}

                    {isInPerson && !!meeting.location && (
                        <ThemedView style={[styles.infoCard, { backgroundColor: colors.buttonBackgroundSecondary }]}>
                            <View style={styles.infoRow}>
                                <Ionicons name="location-outline" size={20} color={colors.primary} />
                                <View style={styles.infoTextContainer}>
                                    <ThemedText style={[styles.infoLabel, { color: colors.textDim }]}>Where</ThemedText>
                                    <ThemedText style={[styles.infoValue, { color: colors.text }]}>
                                        {meeting.location}
                                    </ThemedText>
                                </View>
                            </View>
                        </ThemedView>
                    )}

                    <ThemedView style={[styles.infoCard, { backgroundColor: colors.buttonBackgroundSecondary }]}>
                        <View style={styles.infoRow}>
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                            <View style={styles.infoTextContainer}>
                                <ThemedText style={[styles.infoLabel, { color: colors.textDim }]}>Date</ThemedText>
                                <ThemedText style={[styles.infoValue, { color: colors.text }]}>
                                    {format(startDate, "EEEE, MMMM d, yyyy")}
                                </ThemedText>
                            </View>
                        </View>
                        {meeting.endTime && (
                            <>
                                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                                <View style={styles.infoRow}>
                                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                                    <View style={styles.infoTextContainer}>
                                        <ThemedText style={[styles.infoLabel, { color: colors.textDim }]}>Time</ThemedText>
                                        <ThemedText style={[styles.infoValue, { color: colors.text }]}>
                                            {format(startDate, "h:mm a")}
                                        </ThemedText>
                                    </View>
                                </View>
                            </>
                        )}
                    </ThemedView>

                    <ThemedView style={[styles.infoCard, { backgroundColor: colors.buttonBackgroundSecondary }]}>
                        <ThemedText style={[styles.sectionTitle, { color: colors.textDim }]}>HOST</ThemedText>
                        <View style={styles.hostRow}>
                            <UserAvatar imageUri={meeting.host.profileImage} size={40} />
                            <View style={styles.hostInfo}>
                                <ThemedText style={[styles.hostName, { color: colors.text }]}>
                                    {meeting.host.firstName} {meeting.host.lastName}
                                </ThemedText>
                                {isHost && (
                                    <ThemedText style={[styles.youBadge, { color: colors.primary }]}>You</ThemedText>
                                )}
                            </View>
                        </View>
                    </ThemedView>

                    {meeting.participants.length > 0 && (
                        <ThemedView style={[styles.infoCard, { backgroundColor: colors.buttonBackgroundSecondary }]}>
                            <ThemedText style={[styles.sectionTitle, { color: colors.textDim }]}>
                                PARTICIPANTS ({meeting.participants.length})
                            </ThemedText>
                            {meeting.participants.map((participant) => (
                                <View key={participant.user._id} style={styles.participantRow}>
                                    <UserAvatar imageUri={participant.user.profileImage} size={36} />
                                    <View style={styles.participantInfo}>
                                        <ThemedText style={[styles.participantName, { color: colors.text }]}>
                                            {participant.user.firstName} {participant.user.lastName}
                                        </ThemedText>
                                        <ThemedText style={[styles.participantStatus, {
                                            color: participant.status === "accepted" ? "#10B981" :
                                                participant.status === "declined" ? "#EF4444" : colors.textDim
                                        }]}>
                                            {participant.status}
                                        </ThemedText>
                                    </View>
                                </View>
                            ))}
                        </ThemedView>
                    )}
                </ScrollView>

                {meeting.status !== "completed" && meeting.status !== "cancelled" && (
                    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8, borderTopColor: colors.border }]}>
                        {isHost && meeting.status === "upcoming" && (
                            <Button
                                title="Cancel Meeting"
                                variant="outline"
                                onPress={handleCancelMeeting}
                                disabled={actionLoading}
                                style={{ borderColor: "#EF4444" }}
                                textStyle={{ color: "#EF4444" }}
                            />
                        )}
                        {isPendingRsvp && meeting.status === "upcoming" && (
                            <View style={{ flexDirection: "row", gap: 10 }}>
                                <Button
                                    title={rsvpSubmitting === "accepted" ? "Accepting..." : "I'm in"}
                                    onPress={() => handleRsvp("accepted")}
                                    disabled={actionLoading}
                                    style={{ flex: 1 }}
                                />
                                <Button
                                    title={rsvpSubmitting === "declined" ? "Declining..." : "Can't make it"}
                                    variant="outline"
                                    onPress={() => handleRsvp("declined")}
                                    disabled={actionLoading}
                                    style={{ flex: 1 }}
                                />
                            </View>
                        )}
                        {!isHost && myParticipant && myParticipant.status === "accepted" && (
                            <View style={[styles.rsvpConfirmedBadge, { backgroundColor: "#10B98115", borderColor: "#10B98140" }]}>
                                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                <ThemedText style={{ color: "#10B981", fontWeight: "600", fontSize: 14 }}>
                                    You're in for this {isInPerson ? "plan" : "meeting"}
                                </ThemedText>
                            </View>
                        )}
                        {!isHost && myParticipant && myParticipant.status === "declined" && (
                            <View style={[styles.rsvpConfirmedBadge, { backgroundColor: "#EF444415", borderColor: "#EF444440" }]}>
                                <Ionicons name="close-circle" size={18} color="#EF4444" />
                                <ThemedText style={{ color: "#EF4444", fontWeight: "600", fontSize: 14 }}>
                                    You can't make it to this {isInPerson ? "plan" : "meeting"}
                                </ThemedText>
                            </View>
                        )}
                        {!isInPerson && (
                            <Button
                                title={actionLoading ? "Loading..." : (meeting.status === "live" ? "Join Now" : "Start Meeting")}
                                onPress={handleJoinMeeting}
                                disabled={actionLoading || (!isHost && meeting.status === "upcoming")}
                            />
                        )}
                        {!isInPerson && !isHost && meeting.status === "upcoming" && (
                            <ThemedText style={[styles.waitingText, { color: colors.textDim }]}>
                                Waiting for host to start the meeting
                            </ThemedText>
                        )}
                    </View>
                )}

                <InviteParticipantsModal
                    visible={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    accessToken={accessToken!}
                    currentUserId={user?._id!}
                    mode="instant"
                    invitedIds={invitedUserIds}
                    invitingIds={invitingIds}
                    onInviteUser={handleInviteSingleUser}
                    existingParticipantIds={new Set(meeting.participants.map(p => (p.user?._id || p.user)?.toString()))}
                />
            </ThemedSafeArea>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1, backgroundColor: "transparent" },
    content: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 20 },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    statusRow: { marginBottom: 16 },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    statusText: { color: "white", fontSize: 12, fontWeight: "bold" },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
    description: { fontSize: 16, lineHeight: 22, marginBottom: 20 },
    infoCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    infoTextContainer: { flex: 1 },
    infoLabel: { fontSize: 12, marginBottom: 2 },
    infoValue: { fontSize: 16, fontWeight: "500" },
    divider: { height: 1, marginVertical: 12 },
    sectionTitle: { fontSize: 12, fontWeight: "600", marginBottom: 12, letterSpacing: 0.5 },
    hostRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    hostInfo: { flex: 1 },
    hostName: { fontSize: 16, fontWeight: "600" },
    youBadge: { fontSize: 12, fontWeight: "500" },
    participantRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
    participantInfo: { flex: 1 },
    participantName: { fontSize: 14, fontWeight: "500" },
    participantStatus: { fontSize: 12, textTransform: "capitalize" },
    footer: { paddingHorizontal: 20, paddingTop: 12, gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
    waitingText: { fontSize: 12, textAlign: "center" },
    statusButton: {
        paddingVertical: 2,
        paddingHorizontal: 12,
        borderRadius: 20,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 90,
        borderWidth: 1,
    },
    statusButtonText: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    rsvpConfirmedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    emptyText: { textAlign: 'center', marginTop: 30, fontSize: 16 },
});
