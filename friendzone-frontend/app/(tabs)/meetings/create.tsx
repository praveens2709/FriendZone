import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useState, useEffect } from "react";
import {
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    View,
    Platform,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { readableTextOn } from "@/utils/theme-utils";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import { useTabBarSpace } from "@/hooks/useTabBarSpace";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons, Feather } from "@expo/vector-icons";
import Button from "@/components/Button";
import UserAvatar from "@/components/UserAvatar";
import ProfileServices from "@/services/ProfileService";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import MeetingService from "@/services/MeetingService";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, addHours } from "date-fns";
import InviteParticipantsModal, { InviteeUser } from "@/components/InviteParticipantsModal";



export default function CreateMeetingScreen() {
    const { colors } = useTheme();
    const { space: tabSpace } = useTabBarSpace();
    const { accessToken, user } = useAuth();
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [kind, setKind] = useState<"in_person" | "video">("in_person");
    const [location, setLocation] = useState("");
    const [locationError, setLocationError] = useState("");
    const [startTime, setStartTime] = useState(addHours(new Date(), 1));
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const [showInviteModal, setShowInviteModal] = useState(false);
    const { invitee, editId } = useLocalSearchParams<{ invitee?: string; editId?: string }>();
    const isEditing = !!editId;
    const [editStatus, setEditStatus] = useState<"upcoming" | "live" | null>(null);
    const [endTime, setEndTime] = useState(addHours(new Date(), 3));
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [loadingPlan, setLoadingPlan] = useState(isEditing);
    const [selectedInviteeIds, setSelectedInviteeIds] = useState<Set<string>>(
        new Set(invitee ? [String(invitee)] : [])
    );

    const [titleError, setTitleError] = useState("");
    const [timeError, setTimeError] = useState("");
    const [submitError, setSubmitError] = useState("");

    const [inviteeProfiles, setInviteeProfiles] = useState<Record<string, InviteeUser>>({});

    useEffect(() => {
        if (!invitee || !accessToken) return;
        ProfileServices.getProfileById(accessToken, String(invitee))
            .then((profile) =>
                setInviteeProfiles((prev) => ({
                    ...prev,
                    [profile._id]: {
                        _id: profile._id,
                        firstName: profile.firstName,
                        lastName: profile.lastName,
                        profileImage: profile.profileImage,
                        relationship: "lockedIn",
                    },
                }))
            )
            .catch(() => undefined);
    }, [invitee, accessToken]);

    useEffect(() => {
        if (!editId || !accessToken) return;
        MeetingService.getMeetingById(String(editId), accessToken)
            .then((plan) => {
                if (plan.host._id !== user?._id || (plan.status !== "upcoming" && plan.status !== "live")) {
                    router.back();
                    return;
                }
                setTitle(plan.title);
                setDescription(plan.description || "");
                setKind(plan.kind === "video" ? "video" : "in_person");
                setLocation(plan.location || "");
                setStartTime(new Date(plan.startTime));
                setEndTime(plan.endTime ? new Date(plan.endTime) : addHours(new Date(plan.startTime), 2));
                setEditStatus(plan.status);
            })
            .catch(() => setSubmitError("Couldn't load this plan."))
            .finally(() => setLoadingPlan(false));
    }, [editId, accessToken, user?._id, router]);

    const removeInvitee = (id: string) => {
        setSelectedInviteeIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const toggleInvite = (user: InviteeUser) => {
        setInviteeProfiles(prev => ({ ...prev, [user._id]: user }));
        setSelectedInviteeIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(user._id)) {
                newSet.delete(user._id);
            } else {
                newSet.add(user._id);
            }
            return newSet;
        });
    };

    const handleCreate = async () => {
        setTitleError("");
        setTimeError("");
        setLocationError("");
        setSubmitError("");

        let hasError = false;

        if (!title.trim()) {
            setTitleError("Give your plan a name");
            hasError = true;
        }

        if (kind === "in_person" && !location.trim()) {
            setLocationError("Where are you meeting?");
            hasError = true;
        }

        if (!isEditing && startTime < new Date()) {
            setTimeError("Start time cannot be in the past");
            hasError = true;
        }

        if (isEditing && endTime <= startTime) {
            setTimeError("End time must be after the start");
            hasError = true;
        }

        if (isEditing && editStatus === "live" && endTime <= new Date()) {
            setTimeError("End time must be in the future");
            hasError = true;
        }

        if (!accessToken) {
            setSubmitError("Please log in to create a meeting");
            return;
        }

        if (hasError) return;

        setLoading(true);
        try {
            if (isEditing) {
                await MeetingService.updateMeeting(
                    String(editId),
                    {
                        title: title.trim(),
                        description: description.trim(),
                        location: kind === "in_person" ? location.trim() : undefined,
                        startTime: editStatus === "upcoming" ? startTime.toISOString() : undefined,
                        endTime: endTime.toISOString(),
                    },
                    accessToken
                );
                router.back();
                return;
            }
            await MeetingService.createMeeting({
                title: title.trim(),
                kind,
                location: kind === "in_person" ? location.trim() : undefined,
                description: description.trim() || undefined,
                startTime: startTime.toISOString(),
                participants: Array.from(selectedInviteeIds),
            }, accessToken);

            router.back();
        } catch (error: any) {
            console.error("Error creating meeting:", error);
            setSubmitError(error?.response?.data?.message || "Failed to create meeting");
        } finally {
            setLoading(false);
        }
    };

    const onStartTimeChange = (event: any, selectedDate?: Date) => {
        setShowStartPicker(Platform.OS === "ios");
        if (selectedDate) {
            setStartTime(selectedDate);
        }
    };

    return (
        <ScreenBackground style={styles.container}>
            <ThemedSafeArea style={styles.safeArea} edges={["top", "left", "right"]}>
                <CommonHeader
                    title={isEditing ? "Edit plan" : "Make a plan"}
                    leftContent={<BackButton color={colors.text} />}
                />

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                    <ThemedView style={styles.formSection}>
                        <ThemedText style={[styles.label, { color: colors.textDim }]}>HOW ARE YOU HANGING OUT?</ThemedText>
                        <View style={[styles.kindRow, isEditing && { opacity: 0.5 }]} pointerEvents={isEditing ? "none" : "auto"}>
                            {([
                                { value: "in_person", label: "In person", icon: "location-outline" },
                                { value: "video", label: "Video call", icon: "videocam-outline" },
                            ] as const).map((option) => {
                                const selected = kind === option.value;
                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        onPress={() => setKind(option.value)}
                                        style={[
                                            styles.kindOption,
                                            {
                                                backgroundColor: selected ? colors.primary : colors.buttonBackgroundSecondary,
                                                borderColor: selected ? colors.primary : colors.border,
                                            },
                                        ]}
                                    >
                                        <Ionicons name={option.icon} size={18} color={selected ? readableTextOn(colors.primary, colors.buttonText) : colors.text} />
                                        <ThemedText style={{ color: selected ? readableTextOn(colors.primary, colors.buttonText) : colors.text, fontWeight: "600" }}>
                                            {option.label}
                                        </ThemedText>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ThemedView>

                    <ThemedView style={styles.formSection}>
                        <ThemedText style={[styles.label, { color: colors.textDim }]}>WHAT'S THE PLAN?</ThemedText>
                        <TextInput
                            style={[styles.input, { color: colors.text, backgroundColor: colors.buttonBackgroundSecondary, borderColor: titleError ? '#EF4444' : colors.border }]}
                            placeholder={kind === "in_person" ? "e.g. Chai at Sardar Market" : "e.g. Late-night catch up"}
                            placeholderTextColor={colors.textDim}
                            value={title}
                            onChangeText={(text) => {
                                setTitle(text);
                                if (titleError) setTitleError("");
                            }}
                            maxLength={100}
                        />
                        {titleError ? <ThemedText style={styles.errorText}>{titleError}</ThemedText> : null}
                    </ThemedView>

                    {kind === "in_person" && (
                        <ThemedView style={styles.formSection}>
                            <ThemedText style={[styles.label, { color: colors.textDim }]}>WHERE</ThemedText>
                            <TextInput
                                style={[styles.input, { color: colors.text, backgroundColor: colors.buttonBackgroundSecondary, borderColor: locationError ? '#EF4444' : colors.border }]}
                                placeholder="Place or area"
                                placeholderTextColor={colors.textDim}
                                value={location}
                                onChangeText={(text) => {
                                    setLocation(text);
                                    if (locationError) setLocationError("");
                                }}
                                maxLength={200}
                            />
                            {locationError ? <ThemedText style={styles.errorText}>{locationError}</ThemedText> : null}
                        </ThemedView>
                    )}

                    <ThemedView style={styles.formSection}>
                        <ThemedText style={[styles.label, { color: colors.textDim }]}>DETAILS (OPTIONAL)</ThemedText>
                        <TextInput
                            style={[styles.textArea, { color: colors.text, backgroundColor: colors.buttonBackgroundSecondary, borderColor: colors.border }]}
                            placeholder="Anything people should know?"
                            placeholderTextColor={colors.textDim}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                            maxLength={500}
                        />
                    </ThemedView>

                    {(!isEditing || editStatus === "upcoming") && (
                    <ThemedView style={styles.formSection}>
                        <ThemedText style={[styles.label, { color: colors.textDim }]}>WHEN</ThemedText>
                        <TouchableOpacity
                            style={[styles.dateButton, { backgroundColor: colors.buttonBackgroundSecondary, borderColor: timeError ? '#EF4444' : colors.border }]}
                            onPress={() => {
                                setShowStartPicker(true);
                                if (timeError) setTimeError("");
                            }}
                        >
                            <ThemedText style={{ color: colors.text }}>
                                {format(startTime, "MMM d, yyyy 'at' h:mm a")}
                            </ThemedText>
                            <Ionicons name="calendar-outline" size={20} color={colors.textDim} />
                        </TouchableOpacity>
                        {showStartPicker && (
                            <DateTimePicker
                                value={startTime}
                                mode="datetime"
                                display={Platform.OS === "ios" ? "spinner" : "default"}
                                onChange={onStartTimeChange}
                                minimumDate={new Date()}
                            />
                        )}
                        {timeError && !isEditing ? <ThemedText style={styles.errorText}>{timeError}</ThemedText> : null}
                    </ThemedView>
                    )}

                    {isEditing && (
                        <ThemedView style={styles.formSection}>
                            <ThemedText style={[styles.label, { color: colors.textDim }]}>ENDS</ThemedText>
                            <TouchableOpacity
                                style={[styles.dateButton, { backgroundColor: colors.buttonBackgroundSecondary, borderColor: timeError ? '#EF4444' : colors.border }]}
                                onPress={() => {
                                    setShowEndPicker(true);
                                    if (timeError) setTimeError("");
                                }}
                            >
                                <ThemedText style={{ color: colors.text }}>
                                    {format(endTime, "MMM d, yyyy 'at' h:mm a")}
                                </ThemedText>
                                <Ionicons name="time-outline" size={20} color={colors.textDim} />
                            </TouchableOpacity>
                            {showEndPicker && (
                                <DateTimePicker
                                    value={endTime}
                                    mode="datetime"
                                    display={Platform.OS === "ios" ? "spinner" : "default"}
                                    onChange={(_event: any, selectedDate?: Date) => {
                                        setShowEndPicker(Platform.OS === "ios");
                                        if (selectedDate) setEndTime(selectedDate);
                                    }}
                                    minimumDate={new Date()}
                                />
                            )}
                            {timeError ? <ThemedText style={styles.errorText}>{timeError}</ThemedText> : null}
                        </ThemedView>
                    )}

                    {!isEditing && (
                    <ThemedView style={styles.formSection}>
                        <ThemedText style={[styles.label, { color: colors.textDim }]}>
                            WHO'S INVITED {selectedInviteeIds.size > 0 && `(${selectedInviteeIds.size})`}
                        </ThemedText>

                        <TouchableOpacity
                            style={[styles.inviteButton, { borderColor: colors.outline }]}
                            onPress={() => setShowInviteModal(true)}
                        >
                            <Ionicons name="add-circle-outline" size={24} color={colors.text} />
                            <ThemedText style={{ color: colors.accent, fontWeight: '600' }}>Add People</ThemedText>
                        </TouchableOpacity>
                        {Array.from(selectedInviteeIds).map((id) => {
                            const person = inviteeProfiles[id];
                            return (
                                <View key={id} style={[styles.inviteeRow, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                                    <UserAvatar imageUri={person?.profileImage || ""} size={36} />
                                    <ThemedText style={styles.inviteeName} numberOfLines={1}>
                                        {person ? `${person.firstName} ${person.lastName || ""}`.trim() : "Loading..."}
                                    </ThemedText>
                                    <TouchableOpacity onPress={() => removeInvitee(id)} hitSlop={10}>
                                        <Ionicons name="close" size={20} color={colors.textDim} />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                        <ThemedText style={{ color: colors.textDim, fontSize: 12, marginTop: 8 }}>
                            {selectedInviteeIds.size === 0
                                ? "No one invited, so this stays private to you."
                                : "Only the people you add will see this plan."}
                        </ThemedText>
                    </ThemedView>
                    )}

                </ScrollView>

                <View style={[styles.footer, { paddingBottom: isEditing ? 28 : tabSpace - 4, borderTopColor: colors.border }]}>
                    {submitError ? <ThemedText style={[styles.errorText, { textAlign: 'center', marginBottom: 10 }]}>{submitError}</ThemedText> : null}
                    <Button
                        title={isEditing ? (loading ? "Saving..." : "Save changes") : loading ? "Scheduling..." : "Schedule Plan"}
                        onPress={handleCreate}
                        disabled={loading || loadingPlan}
                    />
                </View>

                <InviteParticipantsModal
                    visible={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    accessToken={accessToken!}
                    currentUserId={user?._id!}
                    mode="batch"
                    selectedIds={selectedInviteeIds}
                    onToggleSelect={toggleInvite}
                />

            </ThemedSafeArea>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inviteeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, borderWidth: 1, marginTop: 8 },
    inviteeName: { flex: 1, fontWeight: '600' },
    safeArea: { flex: 1, backgroundColor: 'transparent' },
    content: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 24 },
    formSection: { marginBottom: 25 },
    kindRow: { flexDirection: 'row', gap: 10 },
    kindOption: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    label: { fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
    input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 15, fontSize: 16 },
    textArea: {
        minHeight: 80,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 15,
        paddingTop: 12,
        fontSize: 16,
        textAlignVertical: 'top',
    },
    dateButton: { height: 50, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15 },
    inviteButton: { height: 50, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 6,
    },
});
