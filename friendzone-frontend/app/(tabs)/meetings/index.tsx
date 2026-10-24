import { useConfirm } from "@/components/ConfirmProvider";
import AppRefreshControl from "@/components/AppRefreshControl";
import { readableTextOn } from "@/utils/theme-utils";
import { useTabBarSpace } from "@/hooks/useTabBarSpace";
import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    StyleSheet,
    Pressable,
    TouchableOpacity,
    FlatList,
    TextInput,
    View,
    Modal,
    Dimensions,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import CommonHeader from "@/components/CommonHeader";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { format } from "date-fns";
import MeetingCard from "@/components/meetings/MeetingCard";
import EmptyState from "@/components/EmptyState";
import { Calendar, DateData } from "react-native-calendars";
import { useAuth } from "@/context/AuthContext";
import MeetingService from "@/services/MeetingService";
import { Meeting } from "@/types/meeting.type";
import { useSocket } from "@/context/SocketContext";

const { width } = Dimensions.get("window");

type TabType = "live" | "upcoming" | "completed";

const PAGE_SIZE = 15;

export default function MeetingsScreen() {
  const confirm = useConfirm();
    const { colors } = useTheme();
    const { space: tabSpace } = useTabBarSpace();
    const { accessToken, user } = useAuth();
    const { socket } = useSocket();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<TabType>("upcoming");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState("");
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const pageRef = useRef(1);
    const busyRef = useRef(false);
    const requestIdRef = useRef(0);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const buildParams = useCallback(
        (page: number) => {
            const params: Record<string, any> = {
                status: activeTab === "completed" ? "past" : activeTab,
                page,
                limit: PAGE_SIZE,
            };
            if (debouncedQuery) params.q = debouncedQuery;
            if (selectedDate) {
                const start = new Date(`${selectedDate}T00:00:00`);
                const end = new Date(`${selectedDate}T23:59:59.999`);
                params.from = start.toISOString();
                params.to = end.toISOString();
            }
            return params;
        },
        [activeTab, debouncedQuery, selectedDate]
    );

    const fetchFirstPage = useCallback(
        async (silent = false) => {
            if (!accessToken) return;
            const requestId = ++requestIdRef.current;
            try {
                if (!silent) setLoading(true);
                const response = await MeetingService.getMeetings(accessToken, buildParams(1));
                if (requestId !== requestIdRef.current) return;
                pageRef.current = 1;
                setMeetings(response.meetings);
                setHasMore(response.pagination.page < response.pagination.pages);
            } catch (error) {
                console.error("Error fetching meetings:", error);
            } finally {
                if (requestId === requestIdRef.current) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        },
        [accessToken, buildParams]
    );

    const fetchNextPage = useCallback(async () => {
        if (!accessToken || !hasMore || busyRef.current || loading) return;
        busyRef.current = true;
        setLoadingMore(true);
        try {
            const next = pageRef.current + 1;
            const response = await MeetingService.getMeetings(accessToken, buildParams(next));
            pageRef.current = next;
            setMeetings((current) => {
                const seen = new Set(current.map((m) => m._id));
                return [...current, ...response.meetings.filter((m) => !seen.has(m._id))];
            });
            setHasMore(response.pagination.page < response.pagination.pages);
        } catch (error) {
            console.error("Error loading more meetings:", error);
        } finally {
            busyRef.current = false;
            setLoadingMore(false);
        }
    }, [accessToken, hasMore, loading, buildParams]);

    useEffect(() => {
        fetchFirstPage();
    }, [fetchFirstPage]);

    useFocusEffect(
        useCallback(() => {
            fetchFirstPage(true);
        }, [fetchFirstPage])
    );

    useEffect(() => {
        if (!socket) return;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const refresh = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => fetchFirstPage(true), 350);
        };
        const events = ["meetingCreated", "meetingUpdated", "meetingDeleted"];
        events.forEach((event) => socket.on(event, refresh));
        return () => {
            if (timer) clearTimeout(timer);
            events.forEach((event) => socket.off(event, refresh));
        };
    }, [socket, fetchFirstPage]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchFirstPage(true);
    }, [fetchFirstPage]);

    const handleJoin = async (meeting: Meeting) => {
        if (meeting.status === "live" && meeting.kind !== "in_person") {
            router.push(`/live-meeting/${meeting._id}?isHost=${meeting.host._id === user?._id}`);
        } else {
            router.push(`/plan/${meeting._id}`);
        }
    };

    const handleCreate = () => {
        router.push("/meetings/create");
    };

    const handleDayPress = (day: DateData) => {
        setSelectedDate(day.dateString === selectedDate ? "" : day.dateString);
        setShowCalendar(false);
    };

    const handleDelete = async (meetingId: string, status: string) => {
        confirm({
            title: status === "upcoming" ? "Cancel this plan?" : "Delete this plan?",
            message:
                status === "upcoming"
                    ? "Everyone invited will see that it's cancelled."
                    : "This removes it from your history for everyone.",
            confirmLabel: status === "upcoming" ? "Cancel plan" : "Delete",
            onConfirm: async () => {
                try {
                    await MeetingService.deleteMeeting(meetingId, accessToken!);
                    fetchFirstPage(true);
                } catch (error) {
                }
            },
        });
    };

    const filteredMeetings = meetings;

    const getMarkedDates = () => {
        const marked: { [key: string]: any } = {};
        meetings.forEach((meeting) => {
            const d = new Date(meeting.startTime);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            marked[key] = {
                marked: true,
                dotColor: meeting.status === "live" ? "red" : meeting.status === "upcoming" ? "orange" : "gray",
            };
        });
        if (selectedDate) {
            marked[selectedDate] = { ...(marked[selectedDate] || {}), selected: true, selectedColor: colors.primary };
        }
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
        <ScreenBackground style={styles.container}>
            <ThemedSafeArea style={styles.safeArea} edges={["top", "left", "right"]}>
                <CommonHeader
                    title="Plans"
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
                                placeholder="Search plans..."
                                placeholderTextColor={colors.textDim}
                                style={[styles.searchInput, { color: colors.text }]}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </ThemedView>
                    </ThemedView>

                    {!!selectedDate && (
                        <TouchableOpacity
                            onPress={() => setSelectedDate("")}
                            style={[styles.dateChip, { backgroundColor: colors.primary + "1F", borderColor: colors.primary }]}
                        >
                            <Ionicons name="calendar" size={14} color={colors.text} />
                            <ThemedText style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>
                                {format(new Date(`${selectedDate}T00:00:00`), "EEE, MMM d")}
                            </ThemedText>
                            <Ionicons name="close" size={14} color={colors.text} />
                        </TouchableOpacity>
                    )}

                    <View style={styles.tabsContainer}>
                        {renderTab("live", "Live")}
                        {renderTab("upcoming", "Upcoming")}
                        {renderTab("completed", "Past")}
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
                                    onPress={() => router.push(`/plan/${item._id}`)}
                                    onDelete={item.host._id === user?._id ? () => handleDelete(item._id, item.status) : undefined}
                                />
                            )}
                            contentContainerStyle={[styles.listContent, { paddingBottom: tabSpace }]}
                            showsVerticalScrollIndicator={false}
                            onEndReached={fetchNextPage}
                            onEndReachedThreshold={0.5}
                            ListFooterComponent={
                                loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : null
                            }
                            refreshControl={
                                <AppRefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor={colors.primary}
                                />
                            }
                            ListEmptyComponent={() => (
                                <EmptyState
                                    icon={activeTab === "live" ? "radio-outline" : "calendar-outline"}
                                    art={activeTab === "live" ? "live" : activeTab === "completed" ? "past" : "hangout"}
                                    title={
                                        debouncedQuery || selectedDate
                                            ? "No plans match"
                                            : activeTab === "completed"
                                                ? "No past plans yet"
                                                : activeTab === "live"
                                                    ? "Nothing live right now"
                                                    : "No upcoming plans"
                                    }
                                    message={
                                        debouncedQuery || selectedDate
                                            ? "Try a different search or date."
                                            : activeTab === "upcoming"
                                                ? "Get something on the calendar with your circle."
                                                : undefined
                                    }
                                    actionLabel={activeTab === "upcoming" && !debouncedQuery && !selectedDate ? "Make a plan" : undefined}
                                    onAction={handleCreate}
                                />
                            )}
                        />
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.primary, bottom: tabSpace - 2 }]}
                    onPress={handleCreate}
                >
                    <Ionicons name="add" size={30} color={readableTextOn(colors.primary, colors.buttonText)} />
                </TouchableOpacity>

                <Modal
                    visible={showCalendar}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowCalendar(false)}
                >
                    <View style={styles.modalOverlay}>
                        <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCalendar(false)} />
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
        </ScreenBackground>
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
    dateChip: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 8,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginHorizontal: 15,
        marginBottom: 8,
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
        right: 20,
        width: 58,
        height: 58,
        borderRadius: 29,
        justifyContent: "center",
        alignItems: "center",
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
