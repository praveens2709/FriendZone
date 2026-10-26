import AppRefreshControl from "@/components/AppRefreshControl";
import ScreenBackground from "@/components/ui/ScreenBackground";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTabBarSpace } from "@/hooks/useTabBarSpace";
import { useFocusEffect, useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import ThemedScrollView from "@/components/ThemedScrollView";
import { ThemedText } from "@/components/ThemedText";
import UserAvatar from "@/components/UserAvatar";
import Button from "@/components/Button";
import WordleGameModal from "@/components/modals/WordleGameModal";
import SectionTitle from "@/components/circle/SectionTitle";
import HeroCard from "@/components/circle/HeroCard";
import FreeNowCarousel from "@/components/circle/FreeNowCarousel";
import PlanCard from "@/components/circle/PlanCard";
import RitualCard from "@/components/circle/RitualCard";
import SuggestionCarousel from "@/components/circle/SuggestionCarousel";
import CompactButton from "@/components/circle/CompactButton";
import VibeService, { Vibe } from "@/services/VibeService";
import MeetingService from "@/services/MeetingService";
import WordleService from "@/services/WordleService";
import ChatService from "@/services/ChatService";
import KnockService, {
  KnockRequest,
  Suggestion,
  UserSearchResult,
} from "@/services/knockService";
import { Meeting } from "@/types/meeting.type";
import { readableTextOn } from "@/utils/theme-utils";

const FREE_KINDS = ["free_tonight", "coffee", "game_night", "need_company"];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface SearchUser {
  id: string;
  name: string;
  avatar: string | null;
  relation: "stranger" | "knocker" | "knocked" | "lockedIn";
  status?: KnockRequest["status"];
  knockId?: string;
}

interface Friend {
  id: string;
  avatar: string | null;
}

const fullName = (u: { firstName: string; lastName?: string }) =>
  `${u.firstName} ${u.lastName || ""}`.trim();

export default function CircleScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const { socket } = useSocket();
  const { space: tabSpace } = useTabBarSpace();

  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [plans, setPlans] = useState<Meeting[]>([]);
  const [requests, setRequests] = useState<KnockRequest[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [wordle, setWordle] = useState<{ hasPlayed: boolean; streak: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [wordleOpen, setWordleOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchUser[]>([]);
  const queryRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;

    const [vibeRes, planRes, requestRes, suggestionRes, wordleRes, knockedRes] = await Promise.allSettled([
      VibeService.getVibes(accessToken),
      MeetingService.getMeetings(accessToken, { status: "upcoming", limit: 20 }),
      KnockService.getPendingKnockRequests(accessToken),
      KnockService.getSuggestions(accessToken),
      WordleService.getTodayGame(accessToken),
      KnockService.getKnocked(accessToken),
    ]);

    if (vibeRes.status === "fulfilled") setVibes(vibeRes.value.circle);
    if (planRes.status === "fulfilled") {
      const horizon = Date.now() + WEEK_MS;
      setPlans(
        planRes.value.meetings
          .filter((m) => new Date(m.startTime).getTime() <= horizon && m.status !== "cancelled")
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      );
    }
    if (requestRes.status === "fulfilled") setRequests(requestRes.value);
    if (suggestionRes.status === "fulfilled") setSuggestions(suggestionRes.value);
    if (wordleRes.status === "fulfilled") {
      setWordle({ hasPlayed: wordleRes.value.hasPlayed, streak: wordleRes.value.streak });
    }
    if (knockedRes.status === "fulfilled") {
      setFriends(
        knockedRes.value
          .filter((k) => k.status === "lockedIn")
          .map((k) => ({ id: k.user.id, avatar: k.user.avatar }))
      );
    }

    setRefreshKey((k) => k + 1);
    setLoading(false);
    setRefreshing(false);
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    const events = ["vibeChanged", "knockStatusChanged", "newKnockRequest", "meetingCreated", "meetingUpdated", "wordleChanged", "blockChanged"];
    events.forEach((event) => socket.on(event, refresh));
    return () => {
      events.forEach((event) => socket.off(event, refresh));
    };
  }, [socket, load]);

  const openProfile = (userId: string) =>
    router.push({ pathname: "/profile/UserProfile", params: { userId } });

  const openChat = async (userId: string, name: string, avatar: string | null) => {
    if (!accessToken || busyId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setBusyId(userId);
      const chat = await ChatService.createChat(accessToken, userId);
      router.push({
        pathname: "/(chat)/[id]",
        params: {
          id: chat.chatId,
          chatName: name,
          chatAvatar: avatar || "",
          isRestricted: String(chat.isRestricted),
          firstMessageByKnockerId: chat.firstMessageByKnockerId || "",
        },
      });
    } catch (error: any) {

    } finally {
      setBusyId(null);
    }
  };

  const knockSuggestion = async (suggestion: Suggestion) => {
    if (!accessToken || busyId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      setBusyId(suggestion.id);
      await KnockService.knockUser(suggestion.id, accessToken);
      setSuggestions((current) => current.filter((s) => s.id !== suggestion.id));
    } catch (error: any) {

    } finally {
      setBusyId(null);
    }
  };

  const runSearch = useCallback(
    async (text: string) => {
      if (!accessToken || !user?._id) return;
      try {
        const [found, knockers, knocked] = await Promise.all([
          KnockService.searchUsers(accessToken, text),
          KnockService.getKnockers(accessToken),
          KnockService.getKnocked(accessToken),
        ]);

        const map = new Map<string, SearchUser>();
        found.forEach((u: UserSearchResult) => {
          if (u._id === user._id) return;
          map.set(u._id, { id: u._id, name: fullName(u), avatar: u.profileImage, relation: "stranger" });
        });
        knockers.forEach((k) => {
          const existing = map.get(k.user.id);
          if (existing) map.set(k.user.id, { ...existing, relation: "knocker", status: k.status, knockId: k.id });
        });
        knocked.forEach((k) => {
          const existing = map.get(k.user.id);
          if (!existing) return;
          if (k.status === "lockedIn") {
            map.set(k.user.id, { ...existing, relation: "lockedIn", status: k.status, knockId: existing.knockId || k.id });
          } else if (existing.relation !== "knocker") {
            map.set(k.user.id, { ...existing, relation: "knocked", status: k.status, knockId: k.id });
          }
        });

        if (queryRef.current === text) setResults(Array.from(map.values()));
      } catch {
        setResults([]);
      } finally {
        if (queryRef.current === text) setSearching(false);
      }
    },
    [accessToken, user?._id]
  );

  const onSearchChange = (text: string) => {
    setQuery(text);
    queryRef.current = text.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => runSearch(text.trim()), 400);
  };

  const searchAction = async (person: SearchUser) => {
    if (!accessToken || busyId) return;
    try {
      setBusyId(person.id);
      if (person.relation === "lockedIn") {
        await openChat(person.id, person.name, person.avatar);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (person.relation === "knocker" && person.knockId) {
        await KnockService.knockBack(person.knockId, accessToken);
      } else if (person.relation === "stranger") {
        await KnockService.knockUser(person.id, accessToken);
      }
      await runSearch(queryRef.current);
    } catch (error: any) {

    } finally {
      setBusyId(null);
    }
  };

  const freeNow = vibes.filter((v) => FREE_KINDS.includes(v.kind) && v.user);
  const isSearching = query.trim().length > 0;
  const bannerInk = readableTextOn(colors.primary, colors.buttonText);

  const renderSearch = () => {
    if (searching && results.length === 0) {
      return <ActivityIndicator style={styles.loader} color={colors.primary} />;
    }
    if (results.length === 0) {
      return (
        <ThemedText style={[styles.empty, { color: colors.textDim }]}>
          Nobody found for "{query.trim()}".
        </ThemedText>
      );
    }

    return results.map((person) => {
      const label =
        person.relation === "lockedIn"
          ? "Message"
          : person.relation === "knocker"
            ? "Knock back"
            : person.relation === "knocked"
              ? person.status === "pending"
                ? "Requested"
                : "Knocked"
              : "Knock";
      const done = person.relation === "knocked";

      return (
        <TouchableOpacity
          key={person.id}
          activeOpacity={0.85}
          onPress={() => openProfile(person.id)}
          style={[styles.row, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
        >
          <UserAvatar imageUri={person.avatar} size={46} />
          <ThemedText style={styles.rowName} numberOfLines={1}>
            {person.name}
          </ThemedText>
          <CompactButton
            title={label}
            variant={done || person.relation === "lockedIn" ? "outline" : "default"}
            disabled={done || busyId === person.id}
            onPress={() => searchAction(person)}
          />
        </TouchableOpacity>
      );
    });
  };

  const renderSections = () => (
    <>
      <View>
        <HeroCard
          name={user?.firstName || ""}
          friends={friends}
          friendCount={friends.length}
          freeCount={freeNow.length}
          planCount={plans.length}
          streak={wordle?.streak ?? 0}
        />
      </View>

      {requests.length > 0 && (
        <View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/(notifications)/requests")}
            style={[styles.banner, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Ionicons name="hand-left-outline" size={20} color={bannerInk} />
            <Text style={[styles.bannerText, { color: bannerInk }]}>
              {requests.length === 1 ? "1 person wants to knock" : `${requests.length} people want to knock`}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={bannerInk} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <SectionTitle icon="moon-outline" title="Free right now" subtitle="Friends up for something" />
        {freeNow.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: colors.outline }]}>
            <Ionicons name="moon-outline" size={28} color={colors.textDim} />
            <ThemedText style={[styles.emptyText, { color: colors.textDim }]}>
              Nobody's marked free yet. Set your own vibe on Home so friends can plan around you.
            </ThemedText>
          </View>
        ) : (
          <FreeNowCarousel
            vibes={freeNow}
            busyId={busyId}
            onProfile={openProfile}
            onMessage={openChat}
            onPlan={(id) => router.push({ pathname: "/meetings/create", params: { invitee: id } })}
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionTitle
          icon="calendar-outline"
          title="Plans this week"
          subtitle="Hangouts on the calendar"
          action={{ label: "See all", onPress: () => router.push("/meetings") }}
        />
        {plans.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: colors.outline }]}>
            <Ionicons name="calendar-outline" size={28} color={colors.textDim} />
            <ThemedText style={[styles.emptyText, { color: colors.textDim }]}>
              Nothing planned this week. Pick a friend and get something on the calendar.
            </ThemedText>
            <Button title="Make a plan" onPress={() => router.push("/meetings/create")} />
          </View>
        ) : (
          <>
            {plans.slice(0, 3).map((meeting) => (
              <PlanCard
                key={meeting._id}
                meeting={meeting}
                myId={user?._id}
                onPress={() => router.push(`/plan/${meeting._id}`)}
              />
            ))}
            <Button title="Make a plan" variant="outline" onPress={() => router.push("/meetings/create")} />
          </>
        )}
      </View>

      <View style={suggestions.length > 0 ? styles.section : styles.lastSection}>
        <SectionTitle icon="sparkles-outline" title="Today's ritual" subtitle="Same word for the whole circle" />
        <RitualCard
          hasPlayed={!!wordle?.hasPlayed}
          streak={wordle?.streak ?? 0}
          refreshKey={refreshKey}
          onPlay={() => setWordleOpen(true)}
        />
      </View>

      {suggestions.length > 0 && (
        <View style={styles.lastSection}>
          <SectionTitle icon="people-outline" title="People you may know" subtitle="Through your circle" />
          <SuggestionCarousel
            suggestions={suggestions}
            busyId={busyId}
            onProfile={openProfile}
            onKnock={knockSuggestion}
          />
        </View>
      )}
    </>
  );

  return (
    <ScreenBackground style={styles.container}>
      <ThemedSafeArea style={styles.safeArea} edges={["top", "left", "right"]}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.container}>
            <View
              style={[
                styles.search,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.textDim,
                },
              ]}
            >
              <Feather name="search" size={18} color={colors.textDim} />
              <TextInput
                value={query}
                onChangeText={onSearchChange}
                placeholder="Find someone to knock"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.searchInput, { color: colors.text }]}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => onSearchChange("")}>
                  <Feather name="x" size={18} color={colors.textDim} />
                </TouchableOpacity>
              )}
            </View>

            <ThemedScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: tabSpace }]}
              refreshControl={
                <AppRefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    load();
                  }}
                  tintColor={colors.primary}
                />
              }
            >
              {isSearching ? (
                <View>{renderSearch()}</View>
              ) : loading ? (
                <ActivityIndicator style={styles.loader} color={colors.primary} />
              ) : (
                renderSections()
              )}
            </ThemedScrollView>
          </View>
        </TouchableWithoutFeedback>
      </ThemedSafeArea>

      <WordleGameModal
        visible={wordleOpen}
        onClose={() => {
          setWordleOpen(false);
          load();
        }}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 16, height: "100%" },
  scrollContent: { paddingHorizontal: 20 },
  section: { marginBottom: 26 },
  lastSection: { marginBottom: 0 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginTop: -6,
    marginBottom: 22,
  },
  bannerText: { flex: 1, fontSize: 15, fontWeight: "700" },
  emptyCard: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    gap: 10,
  },
  emptyText: { textAlign: "center", lineHeight: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 10,
    marginBottom: 8,
  },
  rowName: { flex: 1, fontSize: 16, fontWeight: "700" },
  loader: { marginTop: 40 },
  empty: { textAlign: "center", marginTop: 40 },
});
