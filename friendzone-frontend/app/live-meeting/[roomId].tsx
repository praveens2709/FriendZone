
import React, { useEffect, useState } from "react";
import {
    View,
    ActivityIndicator,
    StyleSheet,
    Alert,
    TouchableOpacity,
    Text,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    StreamVideo,
    StreamVideoClient,
    StreamCall,
    Call,
    useCallStateHooks,
    useCall,
    ParticipantView,
    ParticipantNetworkQualityIndicator,
} from "@stream-io/video-react-native-sdk";
import { useAuth } from "@/context/AuthContext";
import MeetingService from "@/services/MeetingService";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import InviteParticipantsModal from "@/components/InviteParticipantsModal";

import type { StyleProp, ViewStyle } from 'react-native';

const ParticipantsGrid = () => {
    const { useParticipants } = useCallStateHooks();
    const rawParticipants = useParticipants();

    const participants = [...rawParticipants].sort((a, b) => {
        if (a.isLocalParticipant) return 1;
        if (b.isLocalParticipant) return -1;
        return 0;
    });

    const count = participants.length;

    const getItemStyle = (index: number): StyleProp<ViewStyle> => {
        if (count === 1) return { width: '100%', height: '100%' };
        if (count === 2) return { width: '100%', height: '50%' };
        if (count === 3) {
            if (index < 2) return { width: '50%', height: '50%' };
            return { width: '100%', height: '50%' };
        }
        if (count === 4) return { width: '50%', height: '50%' };
        return { width: '50%', height: 250 };
    };

    return (
        <View style={styles.gridContainer}>
            {participants.map((p, index) => {
                const published = p.publishedTracks || [];
                const isAudioOn = published.includes(1 as any) || published.includes('audio' as any);
                const isVideoOn = published.includes(2 as any) || published.includes('video' as any);

                return (
                    <View key={p.sessionId} style={[styles.gridItem, getItemStyle(index)]}>
                        <ParticipantView
                            participant={p}
                            style={styles.videoView}
                            ParticipantLabel={() => null}
                            ParticipantNetworkQualityIndicator={() => null}
                        />

                        {p.isLocalParticipant && (
                            <View style={[styles.participantOverlay, { left: 20, right: 20 }]}>
                                <View style={styles.nameBadge}>
                                    <Text style={styles.nameText}>{p.name || p.userId} (You)</Text>
                                </View>
                                <View style={{ marginRight: 10 }}>
                                    <ParticipantNetworkQualityIndicator participant={p} />
                                </View>
                            </View>
                        )}

                        {!p.isLocalParticipant && (
                            <View style={styles.participantOverlay}>
                                <View style={styles.nameBadge}>
                                    <Text style={styles.nameText} numberOfLines={1}>
                                        {p.name || p.userId}
                                    </Text>
                                </View>
                                <View style={styles.statusIcons}>
                                    {!isAudioOn && <Ionicons name="mic-off" size={14} color="#FF3B30" style={{ marginRight: 4 }} />}
                                    {!isVideoOn && <Ionicons name="videocam-off" size={14} color="#FF3B30" />}
                                </View>
                            </View>
                        )}

                        {p.isSpeaking && !p.isLocalParticipant && (
                            <View style={styles.speakingBorder} />
                        )}
                    </View>
                );
            })}
        </View>
    );
};

const BottomControls = ({ onLeave }: { onLeave: () => void }) => {
    const call = useCall();
    const { useMicrophoneState, useCameraState } = useCallStateHooks();
    const { status: micStatus } = useMicrophoneState();
    const { status: camStatus } = useCameraState();

    const [isRecording, setIsRecording] = useState(false);

    useEffect(() => {
        if (!call) return;
        setIsRecording(call.state.recording);
        const unsubscribe = call.on('call.recording_started', () => setIsRecording(true));
        const unsubscribe2 = call.on('call.recording_stopped', () => setIsRecording(false));
        return () => {
            unsubscribe();
            unsubscribe2();
        };
    }, [call]);

    const isMicMuted = micStatus === "disabled";
    const isCamOff = camStatus === "disabled";

    const toggleMic = async () => { if (call) await call.microphone.toggle(); };
    const toggleCam = async () => { if (call) await call.camera.toggle(); };
    const flipCamera = async () => { if (call) await call.camera.flip(); };

    // Sound placeholders
    const playSound = async (type: 'start' | 'stop') => {
        // Logic for sound playback (requires files)
    };

    const toggleRecording = async () => {
        if (!call) return;
        try {
            if (isRecording) {
                await playSound('stop');
                await call.stopRecording();
            } else {
                await playSound('start');
                await call.startRecording();
            }
        } catch (e) {
            console.error("Recording error", e);
        }
    };

    return (
        <View style={styles.controlsBar}>
            <TouchableOpacity style={[styles.roundButton, isRecording && { backgroundColor: "#FF3B30" }]} onPress={toggleRecording}>
                <MaterialCommunityIcons name={isRecording ? "stop-circle-outline" : "record-circle-outline"} size={24} color={"white"} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roundButton, isMicMuted && { backgroundColor: "white" }]} onPress={toggleMic}>
                <Ionicons name={isMicMuted ? "mic-off" : "mic"} size={24} color={isMicMuted ? "black" : "white"} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roundButton, isCamOff && { backgroundColor: "white" }]} onPress={toggleCam}>
                <Ionicons name={isCamOff ? "videocam-off" : "videocam"} size={24} color={isCamOff ? "black" : "white"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.roundButton} onPress={flipCamera}>
                <Ionicons name="camera-reverse-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roundButton, { backgroundColor: "#FF3B30" }]} onPress={onLeave}>
                <MaterialCommunityIcons name="phone-hangup" size={24} color="white" />
            </TouchableOpacity>
        </View>
    );
};

// --- Top Right Controls ---
const TopRightControls = ({ onAddParticipants }: { onAddParticipants: () => void }) => {
    const call = useCall();

    const toggleScreenShare = () => { Alert.alert("Feature", "Screen share requires additional setup on mobile."); };
    const endMeetingForAll = () => {
        if (call) {
            Alert.alert("End Meeting", "End meeting for everyone?", [
                { text: "Cancel", style: "cancel" },
                { text: "End", style: "destructive", onPress: async () => await call.endCall() }
            ]);
        }
    };

    return (
        <View style={styles.topRightContainer}>
            <TouchableOpacity style={styles.verticalButton} onPress={onAddParticipants}>
                <Ionicons name="person-add-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.verticalButton} onPress={toggleScreenShare}>
                <MaterialIcons name="screen-share" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.verticalButton, { backgroundColor: 'rgba(255, 59, 48, 0.8)' }]} onPress={endMeetingForAll}>
                <MaterialCommunityIcons name="close-circle-outline" size={24} color="white" />
            </TouchableOpacity>
        </View>
    )
}

export default function LiveMeetingScreen() {
    const { roomId } = useLocalSearchParams<{ roomId: string }>();
    const { accessToken, user } = useAuth();
    const router = useRouter();
    const { colors } = useTheme();

    const [client, setClient] = useState<StreamVideoClient | null>(null);
    const [call, setCall] = useState<Call | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);

    useEffect(() => {
        let currentClient: StreamVideoClient | null = null;
        let currentCall: Call | null = null;
        let mounted = true;

        const initMeeting = async () => {
            if (!roomId || !accessToken || !user) {
                setError("Missing meeting details or authentication");
                setLoading(false);
                return;
            }

            try {
                const { token, apiKey, userName, userId } = await MeetingService.getMeetingToken(roomId, accessToken);
                if (!mounted) return;

                const userObj = { id: userId, name: userName, image: user.profileImage };

                currentClient = new StreamVideoClient({ apiKey, user: userObj, token });
                currentCall = currentClient.call("default", roomId);

                await currentCall.join({ create: true });

                if (mounted) {
                    setClient(currentClient);
                    setCall(currentCall);
                    setLoading(false);
                }
            } catch (err: any) {
                console.error("Failed to join meeting:", err);
                if (mounted) {
                    setError(err?.message || "Failed to join meeting");
                    setLoading(false);
                    Alert.alert("Error", "Failed to join meeting. Please try again.");
                    router.back();
                }
            }
        };

        initMeeting();

        return () => {
            mounted = false;
            const cleanup = async () => {
                if (currentCall) await currentCall.leave().catch(e => console.log("Cleanup Leave Error", e));
                if (currentClient) await currentClient.disconnectUser().catch(e => console.log("Cleanup Disconnect Error", e));
            };
            cleanup();
        };
    }, [roomId, accessToken, user]);

    const handleLeave = async () => {
        // Force cleanup on intentional leave
        if (call) await call.leave().catch(e => console.error(e));
        if (client) await client.disconnectUser().catch(e => console.error(e));
        router.back();
    };

    const handleInvite = async (userToInvite: any) => {
        if (!call) return;
        try {
            await MeetingService.addParticipants(roomId!, [userToInvite._id], accessToken!);
            Alert.alert("Success", `Invited ${userToInvite.firstName}`);
        } catch (e) {
            Alert.alert("Error", "Failed to invite user");
        }
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <ThemedText style={{ marginTop: 20 }}>Joining Meeting...</ThemedText>
            </View>
        );
    }

    if (error || !client || !call) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ThemedText style={{ color: "red" }}>{error || "Failed to initialize meeting"}</ThemedText>
            </View>
        );
    }

    return (
        <StreamVideo client={client}>
            <StreamCall call={call}>
                <View style={styles.container}>

                    {/* Dynamic Grid Layout */}
                    <ParticipantsGrid />

                    {/* Overlays */}
                    <TopRightControls onAddParticipants={() => setShowInviteModal(true)} />

                    <View style={styles.bottomContainer}>
                        <BottomControls onLeave={handleLeave} />
                    </View>

                    <InviteParticipantsModal
                        visible={showInviteModal}
                        onClose={() => setShowInviteModal(false)}
                        accessToken={accessToken!}
                        currentUserId={user?._id!}
                        mode="instant"
                        onInviteUser={(user: any) => handleInvite(user)}
                    />
                </View>
            </StreamCall>
        </StreamVideo>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    // Dynamic Grid
    gridContainer: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: 'black',
    },
    gridItem: {
        position: 'relative',
        borderColor: '#000',
        borderWidth: 1, // Slight separation
        backgroundColor: '#1c1c1e',
        overflow: 'hidden',
    },
    videoView: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    participantOverlay: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        right: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    nameBadge: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    nameText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    statusIcons: {
        flexDirection: 'row',
        gap: 5,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 4,
        borderRadius: 4,
    },
    speakingBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 3,
        borderColor: '#34C759', // Green
    },

    // Controls
    bottomContainer: {
        position: "absolute",
        bottom: 30,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 100,
    },
    controlsBar: {
        flexDirection: "row",
        backgroundColor: "rgba(0,0,0,0.85)",
        borderRadius: 35,
        paddingVertical: 12,
        paddingHorizontal: 20,
        gap: 15,
        alignItems: 'center',
    },
    roundButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "rgba(255,255,255,0.15)",
        justifyContent: "center",
        alignItems: "center",
    },
    topRightContainer: {
        position: "absolute",
        top: 60,
        right: 20,
        gap: 15,
        zIndex: 200,
        alignItems: 'center',
    },
    verticalButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 5,
    },
});
