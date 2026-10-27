import React, { useState, useEffect, useCallback } from "react";
import {
    StyleSheet,
    TouchableOpacity,
    TextInput,
    View,
    FlatList,
    ActivityIndicator,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import UserProfileCard from "@/components/UserProfileCard";
import ThemedModal from "@/components/ThemedModal";
import KnockService from "@/services/knockService";
import { _get } from "@/configs/api-methods.config";

export interface InviteeUser {
    _id: string;
    firstName: string;
    lastName?: string;
    profileImage?: string;
    relationship: 'lockedIn' | 'knocker' | 'knocked' | 'none';
}

interface InviteParticipantsModalProps {
    visible: boolean;
    onClose: () => void;
    accessToken: string;
    currentUserId: string;
    existingParticipantIds?: Set<string>;

    mode: 'batch' | 'instant';

    selectedIds?: Set<string>;
    onToggleSelect?: (user: InviteeUser) => void;

    invitedIds?: Set<string>;
    invitingIds?: Set<string>;
    onInviteUser?: (user: InviteeUser) => Promise<void>;
}

export default function InviteParticipantsModal({
    visible,
    onClose,
    accessToken,
    currentUserId,
    existingParticipantIds = new Set(),
    mode,
    selectedIds = new Set(),
    onToggleSelect,
    invitedIds = new Set(),
    invitingIds = new Set(),
    onInviteUser
}: InviteParticipantsModalProps) {
    const { colors } = useTheme();

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<InviteeUser[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [connections, setConnections] = useState<InviteeUser[]>([]);
    const [connectionsLoading, setConnectionsLoading] = useState(false);

    const searchUsers = useCallback(async (query: string) => {
        if (!query.trim() || !accessToken) {
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        try {
            const results = await _get<InviteeUser[]>(
                `meetings/search-invitees?q=${encodeURIComponent(query)}`,
                accessToken
            );

            const filtered = results.filter(u =>
                !existingParticipantIds.has(u._id) && u._id !== currentUserId
            );
            setSearchResults(filtered);
        } catch (error) {
            console.error("Error searching users:", error);
        } finally {
            setSearchLoading(false);
        }
    }, [accessToken, Array.from(existingParticipantIds).sort().join(','), currentUserId]);

    useEffect(() => {
        if (!visible || !accessToken) return;

        let mounted = true;

        const loadConnections = async () => {
            setConnectionsLoading(true);
            try {
                const [knockers, knocked] = await Promise.all([
                    KnockService.getKnockers(accessToken),
                    KnockService.getKnocked(accessToken)
                ]);

                const connectionsList: InviteeUser[] = [];
                const addedIds = new Set<string>();

                const isEligible = (id: string) =>
                    !addedIds.has(id) &&
                    !existingParticipantIds.has(id) &&
                    id !== currentUserId;

                const addUser = (k: any, relationship: 'lockedIn' | 'knocker' | 'knocked') => {
                    if (isEligible(k.user.id)) {
                        connectionsList.push({
                            _id: k.user.id,
                            firstName: k.user.username.split(' ')[0],
                            lastName: k.user.username.split(' ').slice(1).join(' '),
                            profileImage: k.user.avatar || undefined,
                            relationship
                        });
                        addedIds.add(k.user.id);
                    }
                };

                knockers.forEach(k => { if (k.status === 'lockedIn') addUser(k, 'lockedIn'); });
                knocked.forEach(k => { if (k.status === 'lockedIn') addUser(k, 'lockedIn'); });
                knockers.forEach(k => { if (k.status === 'onesidedlock') addUser(k, 'knocker'); });
                knocked.forEach(k => {
                    if (k.status === 'onesidedlock' || k.status === 'pending') addUser(k, 'knocked');
                });

                if (mounted) setConnections(connectionsList);
            } catch (error) {
                console.error("Error loading connections:", error);
            } finally {
                if (mounted) setConnectionsLoading(false);
            }
        };

        loadConnections();
        setSearchQuery("");
        setSearchResults([]);

        return () => {
            mounted = false;
        };
    }, [visible, accessToken, Array.from(existingParticipantIds).sort().join(','), currentUserId]);

    const handleSearchChange = (text: string) => {
        setSearchQuery(text);
        if (text.trim()) {
            const timeoutId = setTimeout(() => {
                searchUsers(text);
            }, 300);
            return () => clearTimeout(timeoutId);
        } else {
            setSearchResults([]);
        }
    };

    const getRelationshipLabel = (relationship: string) => {
        switch (relationship) {
            case 'lockedIn': return 'LockedIn';
            case 'knocker': return 'Knockers';
            case 'knocked': return 'Knocking';
            default: return '';
        }
    };

    const isSearching = searchQuery.trim().length > 0;
    const displayList = isSearching ? searchResults : connections;

    const handlePress = (item: InviteeUser) => {
        if (mode === 'batch' && onToggleSelect) {
            onToggleSelect(item);
        } else if (mode === 'instant' && onInviteUser) {
            onInviteUser(item);
        }
    };

    const renderRightAction = (item: InviteeUser) => {
        if (mode === 'batch') {
            const isSelected = selectedIds.has(item._id);
            return (
                <TouchableOpacity
                    style={[
                        styles.statusButton,
                        {
                            backgroundColor: isSelected ? colors.buttonBackgroundSecondary : colors.primary,
                            borderColor: isSelected ? colors.border : colors.primary,
                        }
                    ]}
                    onPress={() => handlePress(item)}
                >
                    <ThemedText style={[
                        styles.statusButtonText,
                        { color: isSelected ? colors.text : '#fff' }
                    ]}>
                        {isSelected ? 'Selected' : 'Invite'}
                    </ThemedText>
                </TouchableOpacity>
            );
        }
        const isInvited = invitedIds.has(item._id);
        const isLoading = invitingIds.has(item._id);

        return (
            <TouchableOpacity
                style={[
                    styles.statusButton,
                    {
                        backgroundColor: isInvited ? colors.buttonBackgroundSecondary : colors.primary,
                        borderColor: isInvited ? colors.border : colors.primary,
                    }
                ]}
                onPress={() => !isInvited && !isLoading && handlePress(item)}
                disabled={isInvited || isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <ThemedText style={[
                        styles.statusButtonText,
                        { color: isInvited ? colors.text : '#fff' }
                    ]}>
                        {isInvited ? 'Invited' : 'Invite'}
                    </ThemedText>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <ThemedModal
            visible={visible}
            onClose={onClose}
            containerStyle={styles.fullScreenModal}
        >
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={onClose}>
                    <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                    {mode === 'batch' ? 'Add People' : 'Add Participants'}
                </ThemedText>
                <View style={{ width: 24 }} />
            </View>

            <ThemedView style={[styles.searchContainer, { backgroundColor: colors.buttonBackgroundSecondary, borderColor: colors.border }]}>
                <Feather name="search" size={20} color={colors.textDim} style={styles.searchIcon} />
                <TextInput
                    placeholder="Search by name..."
                    placeholderTextColor={colors.textDim}
                    style={[styles.searchInput, { color: colors.text }]}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                />
            </ThemedView>

            {!isSearching && (
                <ThemedText style={[styles.sectionLabel, { color: colors.textDim }]}>
                    {isSearching ? 'Search Results' : 'Suggested'}
                </ThemedText>
            )}

            {(searchLoading || connectionsLoading) ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={displayList}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                        <UserProfileCard
                            userId={item._id}
                            username={`${item.firstName} ${item.lastName || ''}`}
                            avatar={item.profileImage || null}
                            description={getRelationshipLabel(item.relationship)}
                            onPress={() => handlePress(item)}
                            rightActionComponent={renderRightAction(item)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <ThemedText style={[styles.emptyText, { color: colors.textDim }]}>
                            {isSearching ? 'No users found' : 'No connections to invite'}
                        </ThemedText>
                    }
                />
            )}
        </ThemedModal>
    );
}

const styles = StyleSheet.create({
    fullScreenModal: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    modalTitle: { fontSize: 18, fontWeight: "bold" },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 10,
        marginVertical: 10,
        paddingHorizontal: 10,
        height: 45,
        borderWidth: 1,
        marginBottom: 15,
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, height: "100%", fontSize: 16, lineHeight: 18.8 },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    listContent: {
        paddingBottom: 20,
        flexGrow: 1,
    },
    statusButton: {
        paddingVertical: 2,
        paddingHorizontal: 12,
        borderRadius: 20,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 90,
        borderWidth: 1,
    },
    statusButtonText: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    emptyText: { textAlign: 'center', marginTop: 30, fontSize: 16 },
});
