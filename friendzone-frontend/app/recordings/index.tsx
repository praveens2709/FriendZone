import { useConfirm } from "@/components/ConfirmProvider";
import AppRefreshControl from "@/components/AppRefreshControl";
import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useState, useEffect } from "react";
import {
    StyleSheet,
    View,
    FlatList,
    TouchableOpacity,
    Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import MeetingService from "@/services/MeetingService";
import { Meeting } from "@/types/meeting.type";
import { format } from "date-fns";
import { StreamVideoClient, CallRecording } from "@stream-io/video-react-native-sdk";
import CustomVideoPlayer from "@/components/CustomVideoPlayer";

type FlatRecordingItem = {
    id: string;
    meetingId: string;
    recordingName: string;
    sessionId: string;
    url: string;
    filename: string;
    startTime: string;
    endTime: string;
    title: string;
    meetingTitle: string;
    partNumber: number;
    totalParts: number;
};

export default function RecordingsListScreen() {
  const confirm = useConfirm();
    const { colors } = useTheme();
    const { accessToken, user } = useAuth();
    const router = useRouter();

    const [allRecordings, setAllRecordings] = useState<FlatRecordingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [playingRecording, setPlayingRecording] = useState<FlatRecordingItem | null>(null);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (accessToken && user) {
            fetchAllRecordings();
        }
    }, [accessToken, user]);

    const fetchAllRecordings = async () => {
        if (!accessToken || !user) return;
        setLoading(true);
        try {
            const response = await MeetingService.getMeetings(accessToken, { includeInstant: true, limit: 100 });
            const candidateMeetings = response.meetings.filter((m: Meeting) => m.status === 'completed' || m.status === 'live');

            const flattened: FlatRecordingItem[] = [];

            await Promise.all(candidateMeetings.map(async (meeting: Meeting) => {
                try {
                    const tokenData = await MeetingService.getMeetingToken(meeting._id, accessToken);

                    const client = new StreamVideoClient({
                        apiKey: tokenData.apiKey,
                        user: { id: user._id },
                        token: tokenData.token,
                    });

                    const call = client.call('default', meeting._id);
                    const { recordings } = await call.queryRecordings();

                    if (recordings && recordings.length > 0) {
                        const sorted = [...recordings].sort((a, b) =>
                            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
                        );

                        sorted.forEach((rec, index) => {
                            const partNum = index + 1;
                            const isMultiPart = sorted.length > 1;

                            let displayTitle = meeting.title;
                            if (isMultiPart) {
                                displayTitle = `${meeting.title} - Part ${partNum}`;
                            }


                            flattened.push({
                                id: `${meeting._id}_${rec.filename}`,
                                meetingId: meeting._id,
                                recordingName: rec.filename,
                                sessionId: (rec as any).session_id,
                                url: rec.url,
                                filename: rec.filename,
                                startTime: rec.start_time,
                                endTime: rec.end_time,
                                title: displayTitle,
                                meetingTitle: meeting.title,
                                partNumber: partNum,
                                totalParts: sorted.length
                            });
                        });
                    }
                } catch (e) {
                    console.log(`Failed to fetch recordings for ${meeting._id}`, e);
                }
            }));

            flattened.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

            setAllRecordings(flattened);
        } catch (error) {
            console.error("Error fetching all recordings:", error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAllRecordings();
        setRefreshing(false);
    };

    const handlePress = (item: FlatRecordingItem) => {
        if (isSelectionMode) {
            toggleSelection(item.id);
        } else {
            setPlayingRecording(item);
        }
    };

    const handleLongPress = (id: string) => {
        setIsSelectionMode(true);
        toggleSelection(id);
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);

            if (next.size === 0) setIsSelectionMode(false);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === allRecordings.length) {
            setSelectedIds(new Set());
            setIsSelectionMode(false);
        } else {
            setSelectedIds(new Set(allRecordings.map(r => r.id)));
        }
    };

    const handleDelete = () => {
        confirm({ title: "Delete Recordings", message: `Are you sure you want to delete the ${selectedIds.size} selected recording(s)?\nThis action cannot be undone.`, confirmLabel: "Delete", onConfirm: async () => {
                        setIsDeleting(true);
                        try {
                            const deletionPromises = Array.from(selectedIds).map(async (comboId) => {
                                const item = allRecordings.find(r => r.id === comboId);
                                if (!item) return;

                                try {
                                    await MeetingService.deleteRecording(
                                        item.meetingId,
                                        item.recordingName,
                                        item.sessionId,
                                        accessToken!
                                    );
                                } catch (err) {
                                    console.error(`Failed to delete recording ${item.recordingName}`, err);
                                    throw err;
                                }
                            });

                            await Promise.all(deletionPromises);

                            await fetchAllRecordings();
                            setIsSelectionMode(false);
                            setSelectedIds(new Set());
                            console.log("Recordings deleted successfully");

                        } catch (error) {
                            console.error("Error deleting recordings:", error);
                        } finally {
                            setIsDeleting(false);
                        }
                    } });
    };

    return (
        <ScreenBackground style={styles.container}>
            <ThemedSafeArea style={styles.safeArea}>
                <CommonHeader
                    title={isSelectionMode ? `${selectedIds.size} Selected` : "All Recordings"}
                    leftContent={isSelectionMode ? (
                        <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    ) : (
                        <BackButton color={colors.text} />
                    )}
                    rightContent1={isSelectionMode && (
                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            <TouchableOpacity onPress={handleSelectAll}>
                                <Ionicons
                                    name={selectedIds.size === allRecordings.length ? "checkmark-done-circle" : "checkmark-circle-outline"}
                                    size={24}
                                    color={colors.text}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDelete}>
                                <Ionicons name="trash-outline" size={24} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    )}
                />

                {loading && !refreshing ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={allRecordings}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.content}
                        refreshControl={
                            <AppRefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={colors.text}
                                colors={[colors.primary]}
                            />
                        }
                        ListEmptyComponent={() => (
                            <View style={styles.center}>
                                <Ionicons name="videocam-off-outline" size={64} color={colors.textDim} />
                                <ThemedText style={{ color: colors.textDim, marginTop: 16 }}>
                                    No recordings found
                                </ThemedText>
                            </View>
                        )}
                        renderItem={({ item }) => {
                            const isSelected = selectedIds.has(item.id);
                            return (
                                <TouchableOpacity
                                    onPress={() => handlePress(item)}
                                    onLongPress={() => handleLongPress(item.id)}
                                    delayLongPress={300}
                                    style={[
                                        styles.item,
                                        {
                                            backgroundColor: isSelected
                                                ? 'rgba(239, 68, 68, 0.1)'
                                                : colors.buttonBackgroundSecondary,
                                            borderColor: isSelected ? '#EF4444' : 'transparent',
                                            borderWidth: 1,
                                        }
                                    ]}
                                >
                                    <View style={styles.iconBox}>
                                        {isSelectionMode ? (
                                            <Ionicons
                                                name={isSelected ? "checkbox" : "square-outline"}
                                                size={24}
                                                color={isSelected ? "#EF4444" : colors.textDim}
                                            />
                                        ) : (
                                            <Ionicons name="play" size={20} color={colors.primary} />
                                        )}
                                    </View>
                                    <View style={styles.info}>
                                        <ThemedText style={[styles.title, { color: colors.text }]}>
                                            {item.title}
                                        </ThemedText>
                                        <ThemedText style={[styles.date, { color: colors.textDim }]}>
                                            {format(new Date(item.endTime), "MMM d, yyyy • h:mm a")}
                                            {item.totalParts > 1 && ` • Part ${item.partNumber} of ${item.totalParts}`}
                                        </ThemedText>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}

                <CustomVideoPlayer
                    visible={!!playingRecording}
                    videoUrl={playingRecording?.url || null}
                    onClose={() => setPlayingRecording(null)}
                    title={playingRecording?.title}
                />

            </ThemedSafeArea>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    content: { padding: 20 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    date: {
        fontSize: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: "center"
    },
    videoContainer: {
        width: '100%',
        height: 300,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        overflow: 'hidden',
    },
    video: {
        width: '100%',
        height: '100%',
    },
});
