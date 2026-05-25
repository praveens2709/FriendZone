import React, { useState, useEffect } from "react";
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import MeetingService from "@/services/MeetingService";
import { StreamVideoClient } from "@stream-io/video-react-native-sdk";
import { format } from "date-fns";
import CustomVideoPlayer from "@/components/CustomVideoPlayer";

export default function MeetingRecordingsScreen() {
    const { colors } = useTheme();
    const { accessToken, user } = useAuth();
    const { meetingId } = useLocalSearchParams<{ meetingId: string }>();

    const [loading, setLoading] = useState(true);
    const [recordings, setRecordings] = useState<any[]>([]);
    const [meetingTitle, setMeetingTitle] = useState("Meeting");
    const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
    const [playingVideoTitle, setPlayingVideoTitle] = useState<string>("");



    useEffect(() => {
        let streamClient: StreamVideoClient | null = null;

        const loadData = async () => {
            if (!meetingId || !accessToken || !user) return;
            setLoading(true);

            try {
                // Get Meeting Title
                const meetingData = await MeetingService.getMeetingById(meetingId, accessToken);
                setMeetingTitle(meetingData.title);

                // Get Token & Init Stream to fetch recordings
                const tokenData = await MeetingService.getMeetingToken(meetingId, accessToken);

                // Initialize client
                streamClient = new StreamVideoClient({
                    apiKey: tokenData.apiKey,
                    user: { id: user._id },
                    token: tokenData.token,
                });

                const call = streamClient.call('default', meetingId);

                try {
                    const { recordings } = await call.queryRecordings();
                    // Sort by end_time desc
                    recordings.sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());
                    setRecordings(recordings);
                } catch (err: any) {
                    // Check for specific "Call not found" error (code 16 or 404)
                    // If call doesn't exist, it simply means no recordings yet.
                    if (err?.code === 16 || err?.status === 404 || err?.message?.includes("Can't find call")) {
                        console.log("Call not found on Stream, treating as no recordings.");
                        setRecordings([]);
                    } else {
                        throw err;
                    }
                }

            } catch (error) {
                console.error("Error fetching recordings:", error);
                Alert.alert("Error", "Failed to load recordings");
            } finally {
                setLoading(false);
            }
        };

        loadData();

        return () => {
            if (streamClient) {
                streamClient.disconnectUser();
            }
        };
    }, [meetingId, accessToken, user]);

    const handlePlay = (url: string, index: number) => {
        const title = `${meetingTitle} - Recording ${recordings.length - index}`;
        setPlayingVideoTitle(title);
        setPlayingVideoUrl(url);
    };

    return (
        <LinearGradient colors={colors.gradient} style={styles.container}>
            <ThemedSafeArea style={styles.safeArea}>
                <CommonHeader
                    title="Recordings"
                    leftContent={<BackButton color={colors.text} />}
                />

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.content}>
                        {recordings.length === 0 ? (
                            <View style={styles.center}>
                                <Ionicons name="videocam-off-outline" size={64} color={colors.textDim} />
                                <ThemedText style={{ color: colors.textDim, marginTop: 16 }}>
                                    No recordings available
                                </ThemedText>
                            </View>
                        ) : (
                            recordings.map((rec, index) => {
                                // Logic for naming: "Title 1", "Title 2" etc.
                                // Since we sorted desc, listing them in order.
                                // To keep logical order "Part 1, Part 2", we might want to reverse index naming visually
                                // or just use the index from map if we sort asc.
                                // Let's use "Recording X" based on chronological order (index if sorted asc, len-index if descending)
                                const name = `${meetingTitle} - Part ${recordings.length - index}`;

                                return (
                                    <TouchableOpacity
                                        key={rec.filename}
                                        style={[styles.card, { backgroundColor: colors.buttonBackgroundSecondary }]}
                                        onPress={() => handlePlay(rec.url, index)}
                                    >
                                        <View style={styles.iconContainer}>
                                            <Ionicons name="play-circle" size={40} color={colors.primary} />
                                        </View>
                                        <View style={styles.infoContainer}>
                                            <ThemedText style={[styles.recName, { color: colors.text }]}>
                                                {name}
                                            </ThemedText>
                                            <ThemedText style={{ color: colors.textDim, fontSize: 12 }}>
                                                {format(new Date(rec.end_time), "MMM d, yyyy • h:mm a")}
                                            </ThemedText>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>
                )}

                <CustomVideoPlayer
                    visible={!!playingVideoUrl}
                    videoUrl={playingVideoUrl}
                    title={playingVideoTitle}
                    onClose={() => setPlayingVideoUrl(null)}
                />

            </ThemedSafeArea>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    content: { padding: 20 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    iconContainer: {
        marginRight: 16,
    },
    infoContainer: {
        flex: 1,
    },
    recName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
});
