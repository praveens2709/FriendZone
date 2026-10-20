
import React, { useEffect, useRef, useState } from "react";
import {
    View,
    ActivityIndicator,
    StyleSheet,
    Alert,
    TouchableOpacity,
    Text,
    Platform,
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
    useScreenShareButton,
    callManager,
} from "@stream-io/video-react-native-sdk";
import { ScreenCapturePickerView } from "@stream-io/react-native-webrtc";
import { useAuth } from "@/context/AuthContext";
import MeetingService from "@/services/MeetingService";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
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
    const sharer = participants.find((p) => !!(p as any).screenShareStream && !p.isLocalParticipant);
    const sharingLocally = participants.some((p) => p.isLocalParticipant && !!(p as any).screenShareStream);

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

    if (sharer) {
        const others = participants;
        return (
            <View style={styles.shareContainer}>
                <View style={styles.shareMain}>
                    <ParticipantView
                        participant={sharer}
                        trackType="screenShareTrack"
                        style={styles.videoView}
                        ParticipantLabel={() => null}
                        ParticipantNetworkQualityIndicator={() => null}
                    />
                    <View style={styles.shareLabel}>
                        <Text style={styles.nameText}>
                            {`${sharer.name || sharer.userId} is sharing`}
                        </Text>
                    </View>
                </View>
                <View style={styles.shareStrip}>
                    {others.map((p) => (
                        <View key={p.sessionId} style={styles.shareThumb}>
                            <ParticipantView
                                participant={p}
                                style={styles.videoView}
                                ParticipantLabel={() => null}
                                ParticipantNetworkQualityIndicator={() => null}
                            />
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.gridContainer}>
            {sharingLocally && (
                <View style={styles.sharingBanner} pointerEvents="none">
                    <MaterialIcons name="screen-share" size={16} color="white" />
                    <Text style={styles.nameText}>You are sharing your screen</Text>
                </View>
            )}
            {count <= 1 && (
                <View style={styles.waiting} pointerEvents="none">
                    <Text style={styles.waitingText}>Waiting for others to join...</Text>
                </View>
            )}
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

const BottomControls = ({ onLeave, isHost, audioOnly }: { onLeave: () => void; isHost: boolean; audioOnly: boolean }) => {
    const call = useCall();
    const { useMicrophoneState, useCameraState } = useCallStateHooks();
    const { status: micStatus } = useMicrophoneState();
    const { status: camStatus } = useCameraState();

    const [isRecording, setIsRecording] = useState(false);
    const [recordingBusy, setRecordingBusy] = useState(false);
    const [speakerOn, setSpeakerOn] = useState(!audioOnly);

    useEffect(() => {
        if (!call) return;
        setIsRecording(call.state.recording);
        const unsubscribe = call.on('call.recording_started', () => {
            setIsRecording(true);
            setRecordingBusy(false);
        });
        const unsubscribe2 = call.on('call.recording_stopped', () => {
            setIsRecording(false);
            setRecordingBusy(false);
        });
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

    const toggleRecording = async () => {
        if (!call || recordingBusy) return;
        setRecordingBusy(true);
        try {
            if (isRecording) await call.stopRecording();
            else await call.startRecording();
        } catch (e) {
            setRecordingBusy(false);
        }
    };

    const toggleSpeaker = () => {
        const next = !speakerOn;
        setSpeakerOn(next);
        callManager.speaker.setForceSpeakerphoneOn(next);
    };

    return (
        <View style={styles.controlsBar}>
            {isHost && (
                <TouchableOpacity
                    style={[styles.roundButton, (isRecording || recordingBusy) && { backgroundColor: "#FF3B30" }]}
                    onPress={toggleRecording}
                    disabled={recordingBusy}
                >
                    {recordingBusy ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <MaterialCommunityIcons name={isRecording ? "stop-circle-outline" : "record-circle-outline"} size={24} color={"white"} />
                    )}
                </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.roundButton, speakerOn && { backgroundColor: "white" }]} onPress={toggleSpeaker}>
                <Ionicons name={speakerOn ? "volume-high" : "volume-medium"} size={24} color={speakerOn ? "black" : "white"} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roundButton, isMicMuted && { backgroundColor: "white" }]} onPress={toggleMic}>
                <Ionicons name={isMicMuted ? "mic-off" : "mic"} size={24} color={isMicMuted ? "black" : "white"} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roundButton, isCamOff && { backgroundColor: "white" }]} onPress={toggleCam}>
                <Ionicons name={isCamOff ? "videocam-off" : "videocam"} size={24} color={isCamOff ? "black" : "white"} />
            </TouchableOpacity>
            {!isCamOff && (
                <TouchableOpacity style={styles.roundButton} onPress={flipCamera}>
                    <Ionicons name="camera-reverse-outline" size={24} color="white" />
                </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.roundButton, { backgroundColor: "#FF3B30" }]} onPress={onLeave}>
                <MaterialCommunityIcons name="phone-hangup" size={24} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const ScreenShareButton = () => {
    const pickerRef = useRef<any>(null);
    const { onPress, hasPublishedScreenShare } = useScreenShareButton(pickerRef);

    if (!onPress) return null;

    return (
        <TouchableOpacity
            style={[styles.verticalButton, hasPublishedScreenShare && { backgroundColor: 'rgba(255, 149, 0, 0.9)' }]}
            onPress={onPress}
        >
            <MaterialIcons
                name={hasPublishedScreenShare ? "stop-screen-share" : "screen-share"}
                size={24}
                color="white"
            />
            {Platform.OS === 'ios' && <ScreenCapturePickerView ref={pickerRef} />}
        </TouchableOpacity>
    );
};

const TopRightControls = ({
    isHost,
    onAddParticipants,
    onEndForAll,
}: {
    isHost: boolean;
    onAddParticipants: () => void;
    onEndForAll: () => void;
}) => {
    const { useIsCallRecordingInProgress } = useCallStateHooks();
    const recording = useIsCallRecordingInProgress();
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        if (!recording) {
            setSeconds(0);
            return;
        }
        const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
        return () => clearInterval(timer);
    }, [recording]);

    const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

    return (
        <View style={styles.topRightContainer}>
            {recording && (
                <View style={styles.recBadge}>
                    <View style={styles.recDot} />
                    <Text style={styles.recText}>REC {clock}</Text>
                </View>
            )}
            <ScreenShareButton />
            {isHost && (
                <TouchableOpacity style={styles.verticalButton} onPress={onAddParticipants}>
                    <Ionicons name="person-add-outline" size={24} color="white" />
                </TouchableOpacity>
            )}
            {isHost && (
                <TouchableOpacity
                    style={[styles.verticalButton, { backgroundColor: 'rgba(255, 59, 48, 0.8)' }]}
                    onPress={onEndForAll}
                >
                    <MaterialCommunityIcons name="close-circle-outline" size={24} color="white" />
                </TouchableOpacity>
            )}
        </View>
    );
};

export default function LiveMeetingScreen() {
    const { roomId, isHost: isHostParam, audio, instant } = useLocalSearchParams<{
        roomId: string;
        isHost?: string;
        audio?: string;
        instant?: string;
    }>();
    const isHost = isHostParam === "true";
    const audioOnly = audio === "1";
    const isInstant = instant === "1";
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
                try {
                    await currentCall.microphone.enable();
                    if (audioOnly) await currentCall.camera.disable();
                    else await currentCall.camera.enable();
                } catch (mediaError) {
                    console.warn("Could not enable devices", mediaError);
                }
                MeetingService.recordJoin(roomId, accessToken).catch(() => undefined);
                setTimeout(() => {
                    try {
                        callManager.speaker.setForceSpeakerphoneOn(!audioOnly);
                    } catch (speakerError) {
                        console.warn("Could not set audio route", speakerError);
                    }
                }, 700);

                currentCall.on("call.ended", () => {
                    if (!mounted) return;

                    router.back();
                });

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

    const handleEndForAll = () => {
        if (!call) return;
        Alert.alert("End call", "End the call for everyone?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "End",
                style: "destructive",
                onPress: async () => {
                    try {
                        await call.endCall();
                        await MeetingService.updateMeetingStatus(roomId!, "completed", accessToken!);
                    } catch (e) {
                        console.error("End call failed", e);
                    }
                    await handleLeave();
                },
            },
        ]);
    };

    useEffect(() => {
        if (!call || !isInstant || !isHost) return;
        const timer = setTimeout(async () => {
            if (call.state.participantCount <= 1) {
                await MeetingService.cancelCall(roomId!).catch(() => undefined);

                await handleLeave();
            }
        }, 60000);
        return () => clearTimeout(timer);
    }, [call]);

    const handleLeave = async () => {
        if (isInstant && isHost && call && call.state.participantCount <= 1) {
            await MeetingService.cancelCall(roomId!).catch(() => undefined);
        }
        if (call) await call.leave().catch(e => console.error(e));
        if (client) await client.disconnectUser().catch(e => console.error(e));
        router.back();
    };

    const handleInvite = async (userToInvite: any) => {
        if (!call) return;
        try {
            await MeetingService.addParticipants(roomId!, [userToInvite._id], accessToken!);

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
                <ThemedText style={{ color: "red", marginBottom: 20 }}>{error || "Failed to initialize meeting"}</ThemedText>
                <Button title="Go back" onPress={() => router.back()} style={{ alignSelf: "stretch", marginHorizontal: 24 }} />
            </View>
        );
    }

    return (
        <StreamVideo client={client}>
            <StreamCall call={call}>
                <View style={styles.container}>

                    <ParticipantsGrid />

                    <TopRightControls
                        isHost={isHost}
                        onAddParticipants={() => setShowInviteModal(true)}
                        onEndForAll={handleEndForAll}
                    />

                    <View style={styles.bottomContainer}>
                        <BottomControls onLeave={handleLeave} isHost={isHost} audioOnly={audioOnly} />
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
    gridContainer: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: 'black',
    },
    gridItem: {
        position: 'relative',
        borderColor: '#000',
        borderWidth: 1,
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
    shareContainer: { flex: 1, backgroundColor: 'black' },
    shareMain: { flex: 1, backgroundColor: '#111', marginTop: 50 },
    shareLabel: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    shareStrip: { flexDirection: 'row', height: 130, paddingBottom: 90, gap: 6, paddingHorizontal: 6 },
    shareThumb: { width: 90, height: 120, borderRadius: 10, overflow: 'hidden', backgroundColor: '#1c1c1e' },
    waiting: {
        position: 'absolute',
        top: 110,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 50,
    },
    waitingText: {
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        fontSize: 14,
        fontWeight: '600',
        overflow: 'hidden',
    },
    recBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
    },
    sharingBanner: {
        position: 'absolute',
        top: 90,
        alignSelf: 'center',
        zIndex: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 149, 0, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' },
    recText: { color: 'white', fontSize: 11, fontWeight: '800' },
    speakingBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 3,
        borderColor: '#34C759',
    },

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
