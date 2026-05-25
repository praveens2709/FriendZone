import React, { useState, useEffect, useCallback } from "react";
import {
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    View,
    Modal,
    Dimensions,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import CommonHeader from "@/components/CommonHeader";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import MeetingCard from "@/components/meetings/MeetingCard";
import { Calendar, DateData } from "react-native-calendars";
import { useAuth } from "@/context/AuthContext";
import MeetingService from "@/services/MeetingService";
import { Meeting } from "@/types/meeting.type";
import { useSocket } from "@/context/SocketContext";

const { width } = Dimensions.get("window");

type TabType = "live" | "upcoming" | "completed";

export default function MeetingsScreen() {
    const { colors } = useTheme();
    const { accessToken } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>("upcoming");
    const [searchQuery, setSearchQuery] = useState("");
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState("");
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMeetings = useCallback(async () => {
        if (!accessToken) return;

        try {
            const response = await MeetingService.getMeetings(accessToken);
            setMeetings(response.meetings);
        } catch (error) {
            console.error("Error fetching meetings:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [accessToken]);

    useEffect(() => {
        fetchMeetings();
    }, [fetchMeetings]);

    const { socket } = useSocket();
    const { user } = useAuth();

    useEffect(() => {
        if (!socket) return;

        const handleMeetingCreated = (newMeeting: Meeting) => {
            // Only add if relevant to current user (should be, since filtered by notification room)
            setMeetings(prev => {
                // Prevent duplicates
                if (prev.find(m => m._id === newMeeting._id)) return prev;
                return [...prev, newMeeting].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
            });
        };

        const handleMeetingUpdated = (updatedMeeting: Meeting) => {
            setMeetings(prev => prev.map(m => m._id === updatedMeeting._id ? updatedMeeting : m));
        };

        const handleMeetingDeleted = ({ meetingId }: { meetingId: string }) => {
            setMeetings(prev => prev.filter(m => m._id !== meetingId));
        };

        socket.on('meetingCreated', handleMeetingCreated);
        socket.on('meetingUpdated', handleMeetingUpdated);
        socket.on('meetingDeleted', handleMeetingDeleted);

        return () => {
            socket.off('meetingCreated', handleMeetingCreated);
            socket.off('meetingUpdated', handleMeetingUpdated);
            socket.off('meetingDeleted', handleMeetingDeleted);
        };
    }, [socket]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchMeetings();
    }, [fetchMeetings]);

    const handleJoin = async (meeting: Meeting) => {
        if (meeting.status === "live") {
            // Navigate to meeting room
            router.push(`/live-meeting/${meeting._id}`);
        } else if (meeting.status === "upcoming") {
            // Navigate to meeting details
            router.push(`/meetings/${meeting._id}`);
        }
    };

    const handleCreate = () => {
        router.push("/meetings/create");
    };

    const handleDayPress = (day: DateData) => {
        setSelectedDate(day.dateString);
        setShowCalendar(false);
        // TODO: Filter meetings by selected date
    };

    const handleDelete = async (meetingId: string, status: string) => {
        Alert.alert(
            "Delete Meeting",
            status === 'upcoming'
                ? "This meeting will be cancelled and participants will be notified. Continue?"
                : "This meeting will be permanently deleted from your history. Continue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await MeetingService.deleteMeeting(meetingId, accessToken!);
                        } catch (error) {
                            console.error("Error deleting meeting:", error);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Filter meetings by status and search query
    const filteredMeetings = meetings.filter((meeting) => {
        let matchesStatus = false;
        if (activeTab === 'completed') {
            matchesStatus = meeting.status === 'completed' || meeting.status === 'cancelled';
        } else {
            matchesStatus = meeting.status === activeTab;
        }

        const matchesSearch = meeting.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    // Get dates with meetings for calendar marking
    const getMarkedDates = () => {
        const marked: { [key: string]: { marked: boolean; dotColor: string } } = {};
        meetings.forEach((meeting) => {
            const date = new Date(meeting.startTime).toISOString().split("T")[0];
            marked[date] = {
                marked: true,
                dotColor: meeting.status === "live" ? "red" : meeting.status === "upcoming" ? "orange" : "gray",
            };
        });
        return marked;
    };

    const tabWidth = (width - 30) / 3;

    const renderTab = (tab: TabType, label: string) => (
        <TouchableOpacity
            style={[
                styles.tab,
                { width: tabWidth },
                activeTab === tab && { backgroundColor: colors.buttonBackgroundSecondary }
            ]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
        >
            <ThemedText
                style={[
                    styles.tabText,
                    { color: activeTab === tab ? colors.text : colors.textDim, fontWeight: activeTab === tab ? "700" : "400" },
                ]}
            >
                {label}
            </ThemedText>
        </TouchableOpacity>
    );

    return (
        <LinearGradient colors={colors.gradient} style={styles.container}>
            <ThemedSafeArea style={styles.safeArea}>
                <CommonHeader
                    title="Meetings"
                    rightContent1={
                        <TouchableOpacity onPress={() => router.push("/recordings")}>
                            <Ionicons name="recording-outline" size={26} color={colors.text} />
                        </TouchableOpacity>
                    }
                />

                <View style={styles.content}>
                    <ThemedView style={styles.searchRow}>
                        <TouchableOpacity
                            style={[styles.calendarButton, { backgroundColor: colors.buttonBackgroundSecondary }]}
                            onPress={() => setShowCalendar(true)}
                        >
                            <Ionicons name="calendar" size={20} color={colors.text} />
                        </TouchableOpacity>

                        <ThemedView
                            style={[
                                styles.searchContainer,
                                {
                                    backgroundColor: colors.buttonBackgroundSecondary,
                                    borderColor: colors.border,
                                },
                            ]}
                        >
                            <Feather name="search" size={20} color={colors.textDim} style={styles.searchIcon} />
                            <TextInput
                                placeholder="Search meetings..."
                                placeholderTextColor={colors.textDim}
                                style={[styles.searchInput, { color: colors.text }]}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </ThemedView>
                    </ThemedView>

                    <View style={styles.tabsContainer}>
                        {renderTab("live", "Live")}
                        {renderTab("upcoming", "Upcoming")}
                        {renderTab("completed", "Completed")}
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredMeetings}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                                <MeetingCard
                                    meeting={item}
                                    onJoin={() => handleJoin(item)}
                                    onPress={() => router.push(`/meetings/${item._id}`)}
                                    onDelete={item.host._id === user?._id ? () => handleDelete(item._id, item.status) : undefined}
                                />
                            )}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor={colors.primary}
                                />
                            }
                            ListEmptyComponent={() => (
                                <View style={styles.emptyState}>
                                    <Ionicons name="videocam-outline" size={48} color={colors.textDim} />
                                    <ThemedText style={[styles.emptyText, { color: colors.textDim }]}>
                                        No {activeTab} meetings
                                    </ThemedText>
                                </View>
                            )}
                        />
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                    onPress={handleCreate}
                >
                    <Ionicons name="add" size={30} color={colors.buttonText} />
                </TouchableOpacity>

                <Modal visible={showCalendar} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <ThemedView style={[styles.calendarModal, { backgroundColor: colors.background }]}>
                            <View style={styles.modalHeader}>
                                <ThemedText type="subtitle" style={{ color: colors.text }}>
                                    Select Date
                                </ThemedText>
                                <TouchableOpacity onPress={() => setShowCalendar(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                            <Calendar
                                onDayPress={handleDayPress}
                                markedDates={getMarkedDates()}
                                theme={{
                                    backgroundColor: colors.background,
                                    calendarBackground: colors.background,
                                    textSectionTitleColor: colors.textDim,
                                    selectedDayBackgroundColor: colors.primary,
                                    selectedDayTextColor: colors.buttonText,
                                    todayTextColor: colors.primary,
                                    dayTextColor: colors.text,
                                    textDisabledColor: colors.textDim,
                                    arrowColor: colors.primary,
                                    monthTextColor: colors.text,
                                }}
                            />
                        </ThemedView>
                    </View>
                </Modal>
            </ThemedSafeArea>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        backgroundColor: "transparent",
    },
    content: {
        flex: 1,
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 15,
        marginTop: 15,
        marginBottom: 15,
        gap: 10,
        backgroundColor: "transparent",
    },
    calendarButton: {
        width: 45,
        height: 45,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    searchContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 45,
        borderWidth: 1,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        height: "100%",
        lineHeight: 18.8,
    },
    tabsContainer: {
        flexDirection: "row",
        marginBottom: 15,
        paddingHorizontal: 15,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 20,
    },
    tabText: {
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: 15,
        paddingBottom: 100,
        paddingTop: 5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyState: {
        padding: 40,
        alignItems: "center",
        gap: 12,
    },
    emptyText: {
        textAlign: "center",
        fontSize: 16,
    },
    createButton: {
        marginTop: 10,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    fab: {
        position: "absolute",
        bottom: 110,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    calendarModal: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
});
