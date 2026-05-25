import React, { useState, useEffect } from "react";
import {
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    View,
    Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons, Feather } from "@expo/vector-icons"; // Feather unused, will check
import Button from "@/components/Button";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import MeetingService from "@/services/MeetingService";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, addHours } from "date-fns";
import InviteParticipantsModal, { InviteeUser } from "@/components/InviteParticipantsModal";

// Remove InviteeUser local interface as it's imported now


export default function CreateMeetingScreen() {
    const { colors } = useTheme();
    const { accessToken, user } = useAuth();
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startTime, setStartTime] = useState(addHours(new Date(), 1));
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    // Invitee state
    // Invitee state
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedInviteeIds, setSelectedInviteeIds] = useState<Set<string>>(new Set());

    // Error state
    const [titleError, setTitleError] = useState("");
    const [timeError, setTimeError] = useState("");
    const [submitError, setSubmitError] = useState("");

    const toggleInvite = (user: InviteeUser) => {
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
        // Clear previous errors
        setTitleError("");
        setTimeError("");
        setSubmitError("");

        let hasError = false;

        if (!title.trim()) {
            setTitleError("Please enter a meeting title");
            hasError = true;
        }

        if (startTime < new Date()) {
            setTimeError("Start time cannot be in the past");
            hasError = true;
        }

        if (!accessToken) {
            setSubmitError("Please log in to create a meeting");
            return;
        }

        if (hasError) return;

        setLoading(true);
        try {
            await MeetingService.createMeeting({
                title: title.trim(),
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
        <LinearGradient colors={colors.gradient} style={styles.container}>
            <ThemedSafeArea style={styles.safeArea}>
                <CommonHeader
                    title="Schedule Meeting"
                    leftContent={<BackButton color={colors.text} />}
                />

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                    <ThemedView style={styles.formSection}>
                        <ThemedText style={[styles.label, { color: colors.textDim }]}>TITLE</ThemedText>
                        <TextInput
                            style={[styles.input, { color: colors.text, backgroundColor: colors.buttonBackgroundSecondary, borderColor: titleError ? '#EF4444' : colors.border }]}
                            placeholder="e.g. Weekly Team Sync"
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

                    <ThemedView style={styles.formSection}>
                        <ThemedText style={[styles.label, { color: colors.textDim }]}>DESCRIPTION (OPTIONAL)</ThemedText>
                        <TextInput
                            style={[styles.textArea, { color: colors.text, backgroundColor: colors.buttonBackgroundSecondary, borderColor: colors.border }]}
                            placeholder="Meeting agenda or notes..."
                            placeholderTextColor={colors.textDim}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                            maxLength={500}
                        />
                    </ThemedView>

                    <ThemedView style={styles.formSection}>
                        <ThemedText style={[styles.label, { color: colors.textDim }]}>START TIME</ThemedText>
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
                        {timeError ? <ThemedText style={styles.errorText}>{timeError}</ThemedText> : null}
                    </ThemedView>

                    <ThemedView style={styles.formSection}>
                        <ThemedText style={[styles.label, { color: colors.textDim }]}>
                            INVITEES {selectedInviteeIds.size > 0 && `(${selectedInviteeIds.size})`}
                        </ThemedText>

                        <TouchableOpacity
                            style={[styles.inviteButton, { borderColor: colors.primary }]}
                            onPress={() => setShowInviteModal(true)}
                        >
                            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                            <ThemedText style={{ color: colors.primary, fontWeight: '600' }}>Add People</ThemedText>
                        </TouchableOpacity>
                    </ThemedView>

                </ScrollView>

                <View style={styles.footer}>
                    {submitError ? <ThemedText style={[styles.errorText, { textAlign: 'center', marginBottom: 10 }]}>{submitError}</ThemedText> : null}
                    <Button
                        title={loading ? "Creating..." : "Schedule Meeting"}
                        onPress={handleCreate}
                        disabled={loading}
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
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1, backgroundColor: 'transparent' },
    content: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 120 },
    formSection: { marginBottom: 25 },
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
    footer: { padding: 20, paddingBottom: 100 },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 6,
    },
});
