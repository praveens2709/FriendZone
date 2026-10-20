import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    View,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    Text,
    StatusBar,
    Animated,
    Dimensions,
    Pressable,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface CustomVideoPlayerProps {
    visible: boolean;
    videoUrl: string | null;
    onClose: () => void;
    title?: string;
}

export default function CustomVideoPlayer({ visible, videoUrl, onClose, title }: CustomVideoPlayerProps) {
    const insets = useSafeAreaInsets();
    const videoRef = useRef<Video>(null);
    const [status, setStatus] = useState<AVPlaybackStatus>({} as AVPlaybackStatus);
    const [showControls, setShowControls] = useState(true);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const controlsTimeoutRef = useRef<any>(null);

    useEffect(() => {
        if (visible) {
            resetControlsTimer();
        }
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [visible]);

    useEffect(() => {
        if ((status as any)?.isPlaying && showControls) {
            resetControlsTimer();
        }
    }, [(status as any)?.isPlaying]);

    const resetControlsTimer = () => {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

        if ((status as any)?.isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    };

    const toggleControls = () => {
        if (showControls) {
            setShowControls(false);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        } else {
            setShowControls(true);
            resetControlsTimer();
        }
    };

    const formatTime = (millis: number) => {
        if (!millis) return "00:00";
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handlePlayPause = async () => {
        if (!videoRef.current) return;
        if ((status as any)?.isPlaying) {
            await videoRef.current.pauseAsync();
        } else {
            await videoRef.current.playAsync();
        }
        resetControlsTimer();
    };

    const handleSeek = async (value: number) => {
        if (!videoRef.current) return;
        await videoRef.current.setPositionAsync(value);
        resetControlsTimer();
    };

    const handleSkip = async (amount: number) => {
        if (!videoRef.current || !(status as any)?.positionMillis) return;
        const newPosition = (status as any).positionMillis + amount;
        await videoRef.current.setPositionAsync(newPosition);
        resetControlsTimer();
    };

    const toggleMute = async () => {
        if (!videoRef.current) return;
        await videoRef.current.setIsMutedAsync(!(status as any).isMuted);
        resetControlsTimer();
    };


    if (!visible || !videoUrl) return null;

    return (
        <Modal visible={visible} animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
            <View style={styles.container}>
                <StatusBar hidden />

                <Pressable style={StyleSheet.absoluteFill} onPress={toggleControls}>
                    <Video
                        ref={videoRef}
                        style={styles.fullscreenVideo}
                        source={{ uri: videoUrl }}
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping={false}
                        useNativeControls={false}
                        shouldPlay
                        onPlaybackStatusUpdate={status => setStatus(status)}
                    />

                    {showControls && (
                        <View style={styles.darkenOverlay} pointerEvents="none" />
                    )}

                    {showControls && (
                        <View style={[styles.controlsContainer, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]} pointerEvents="box-none">

                            <View style={styles.topBar}>
                                <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                                    <Ionicons name="arrow-back" size={28} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.title} numberOfLines={1}>{title || 'Playback'}</Text>
                            </View>

                            <View style={styles.centerControls} pointerEvents="box-none">
                                <TouchableOpacity onPress={() => handleSkip(-10000)} style={styles.skipButton}>
                                    <MaterialIcons name="replay-10" size={40} color="#fff" />
                                </TouchableOpacity>

                                {(status as any)?.isBuffering ? (
                                    <ActivityIndicator size="large" color="#fff" />
                                ) : (
                                    <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
                                        <MaterialIcons
                                            name={(status as any)?.isPlaying ? "pause-circle-filled" : "play-circle-filled"}
                                            size={80}
                                            color="#fff"
                                        />
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity onPress={() => handleSkip(10000)} style={styles.skipButton}>
                                    <MaterialIcons name="forward-10" size={40} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.bottomControls}>
                                <View style={styles.sliderRow}>
                                    <Text style={styles.timeText}>{formatTime((status as any)?.positionMillis)}</Text>
                                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                                        <Slider
                                            style={{ width: '100%', height: 40 }}
                                            minimumValue={0}
                                            maximumValue={(status as any)?.durationMillis || 0}
                                            value={(status as any)?.positionMillis || 0}
                                            onSlidingComplete={handleSeek}
                                            minimumTrackTintColor="#fff"
                                            maximumTrackTintColor="rgba(255,255,255,0.3)"
                                            thumbTintColor="#fff"
                                        />
                                    </View>
                                    <Text style={styles.timeText}>{formatTime((status as any)?.durationMillis)}</Text>
                                </View>

                                <View style={styles.actionsRow}>
                                    <TouchableOpacity onPress={toggleMute} style={styles.muteButton}>
                                        <Ionicons
                                            name={(status as any)?.isMuted ? "volume-mute" : "volume-high"}
                                            size={28}
                                            color="#fff"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                        </View>
                    )}
                </Pressable>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    fullscreenVideo: {
        width: width,
        height: height,
        backgroundColor: '#000',
    },
    darkenOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    controlsContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    iconButton: {
        padding: 5,
        marginRight: 15,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
    },
    centerControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 40,
    },
    playButton: {
        padding: 0,
    },
    skipButton: {
        padding: 10,
    },
    bottomControls: {
        paddingHorizontal: 20,
    },
    sliderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    timeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        width: 45,
        textAlign: 'center',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingLeft: 5,
    },
    muteButton: {
        padding: 5,
    }
});
