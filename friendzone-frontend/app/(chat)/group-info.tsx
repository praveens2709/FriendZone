import { useConfirm } from "@/components/ConfirmProvider";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import ScreenBackground from "@/components/ui/ScreenBackground";
import ThemedSafeArea from "@/components/ThemedSafeArea";
import ThemedModal from "@/components/ThemedModal";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";
import UserAvatar from "@/components/UserAvatar";
import Button from "@/components/Button";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import ChatService, { GroupInfo } from "@/services/ChatService";
import KnockService from "@/services/knockService";
import { getApiError } from "@/constants/Functions";

interface Candidate {
  id: string;
  name: string;
  avatar: string | null;
}

export default function GroupInfoScreen() {
  const confirm = useConfirm();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [info, setInfo] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setInfo(await ChatService.getGroupInfo(id));
    } catch {

    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = ({ chatId }: { chatId: string }) => {
      if (chatId === id) load();
    };
    const onRemoved = ({ chatId }: { chatId: string }) => {
      if (chatId === id) router.replace("/(chat)");
    };
    socket.on("groupUpdated", onUpdate);
    socket.on("chatRemoved", onRemoved);
    return () => {
      socket.off("groupUpdated", onUpdate);
      socket.off("chatRemoved", onRemoved);
    };
  }, [socket, id, load, router]);

  const run = async (action: () => Promise<void>, failTitle: string) => {
    try {
      setBusy(true);
      await action();
      await load();
    } catch (error) {

    } finally {
      setBusy(false);
    }
  };

  const saveName = async () => {
    const name = nameDraft.trim();
    if (!name || !info || name === info.name) {
      setEditingName(false);
      return;
    }
    await run(() => ChatService.renameGroup(info.id, name), "Couldn't rename the group");
    setEditingName(false);
  };

  const changePhoto = async () => {
    if (!info?.isAdmin) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    await run(() => ChatService.updateGroupAvatar(info.id, result.assets[0].uri).then(() => undefined), "Couldn't change the photo");
  };

  const removeMember = (memberId: string, name: string) =>
    confirm({ title: `Remove ${name}?`, message: "They'll no longer see this group.", confirmLabel: "Remove", onConfirm: () => { if (info) run(() => ChatService.removeGroupMember(info.id, memberId), "Couldn't remove them"); } });

  const leave = () =>
    confirm({ title: "Leave this group?", message: "You won't get new messages from it.", confirmLabel: "Leave", onConfirm: async () => {
          if (!info) return;
          try {
            setBusy(true);
            await ChatService.leaveGroup(info.id);
            router.replace("/(chat)");
          } catch (error) {

            setBusy(false);
          }
        } });

  const openPicker = async () => {
    if (!info) return;
    try {
      const knocked = await KnockService.getKnocked("");
      const memberIds = new Set(info.members.map((m) => m.id));
      setCandidates(
        knocked
          .filter((k) => k.status === "lockedIn" && !memberIds.has(k.user.id))
          .map((k) => ({ id: k.user.id, name: k.user.username, avatar: k.user.avatar }))
      );
      setPicked(new Set());
      setPickerOpen(true);
    } catch {

    }
  };

  const addPicked = async () => {
    if (!info || picked.size === 0) return;
    setPickerOpen(false);
    await run(() => ChatService.addGroupMembers(info.id, [...picked]), "Couldn't add them");
  };

  if (loading || !info) {
    return (
      <ScreenBackground>
        <ThemedSafeArea style={styles.safe}>
          <CommonHeader title="Group info" leftContent={<BackButton color={colors.text} />} />
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
        </ThemedSafeArea>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <ThemedSafeArea style={styles.safe}>
        <CommonHeader title="Group info" leftContent={<BackButton color={colors.text} />} />
        <FlatList
          data={info.members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.hero}>
              <TouchableOpacity disabled={!info.isAdmin || busy} onPress={changePhoto} activeOpacity={0.8}>
                <UserAvatar imageUri={info.avatar} size={96} />
                {info.isAdmin && (
                  <View style={[styles.camera, { backgroundColor: colors.primary }]}>
                    <Ionicons name="camera" size={14} color={colors.buttonText} />
                  </View>
                )}
              </TouchableOpacity>

              {editingName ? (
                <View style={styles.nameEdit}>
                  <TextInput
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    maxLength={60}
                    autoFocus
                    style={[styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                  />
                  <TouchableOpacity onPress={saveName} style={styles.iconBtn}>
                    <Ionicons name="checkmark-circle" size={30} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  disabled={!info.isAdmin}
                  onPress={() => {
                    setNameDraft(info.name);
                    setEditingName(true);
                  }}
                  style={styles.nameRow}
                >
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                    {info.name}
                  </Text>
                  {info.isAdmin && <Ionicons name="pencil" size={16} color={colors.textDim} />}
                </TouchableOpacity>
              )}
              <Text style={[styles.count, { color: colors.textDim }]}>
                {info.members.length} {info.members.length === 1 ? "member" : "members"}
              </Text>

              {info.isAdmin && (
                <View style={styles.addWrap}>
                  <Button title="Add people" onPress={openPicker} disabled={busy} />
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const name = `${item.firstName} ${item.lastName || ""}`.trim();
            const isMe = item.id === user?._id;
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isMe}
                onPress={() => router.push({ pathname: "/profile/UserProfile", params: { userId: item.id } })}
                style={[styles.row, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
              >
                <UserAvatar imageUri={item.profileImage} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                    {isMe ? "You" : name}
                  </Text>
                  {item.isAdmin && <Text style={[styles.adminTag, { color: colors.textDim }]}>Group admin</Text>}
                </View>
                {info.isAdmin && !isMe && (
                  <TouchableOpacity onPress={() => removeMember(item.id, item.firstName)} hitSlop={10} disabled={busy}>
                    <Ionicons name="close-circle-outline" size={24} color={colors.red} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            <View style={styles.leave}>
              <Button title="Leave group" variant="outline" onPress={leave} disabled={busy} />
            </View>
          }
        />

        <ThemedModal visible={pickerOpen} onClose={() => setPickerOpen(false)} fullHeight>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>Add people</Text>
          {candidates.length === 0 ? (
            <Text style={[styles.pickerEmpty, { color: colors.textDim }]}>
              Everyone you're LockedIn with is already in this group.
            </Text>
          ) : (
            <FlatList
              data={candidates}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => {
                const on = picked.has(item.id);
                return (
                  <TouchableOpacity
                    onPress={() =>
                      setPicked((current) => {
                        const next = new Set(current);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      })
                    }
                    style={styles.pickRow}
                  >
                    <UserAvatar imageUri={item.avatar} size={40} />
                    <Text style={[styles.pickName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Ionicons name={on ? "checkmark-circle" : "ellipse-outline"} size={24} color={on ? colors.accent : colors.textDim} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
          {candidates.length > 0 && (
            <Button title={`Add ${picked.size || ""}`.trim()} onPress={addPicked} disabled={picked.size === 0} />
          )}
        </ThemedModal>
      </ThemedSafeArea>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  hero: { alignItems: "center", paddingVertical: 18, gap: 8 },
  camera: { position: "absolute", right: 0, bottom: 0, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, paddingHorizontal: 20 },
  name: { fontSize: 24, fontWeight: "900", textAlign: "center" },
  nameEdit: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  nameInput: { minWidth: 200, height: 46, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, fontSize: 18, fontWeight: "700" },
  iconBtn: { padding: 2 },
  count: { fontSize: 13 },
  addWrap: { alignSelf: "stretch", marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 18, padding: 10, marginBottom: 8 },
  memberName: { fontSize: 16, fontWeight: "700" },
  adminTag: { fontSize: 12 },
  leave: { marginTop: 18 },
  pickerTitle: { fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  pickerEmpty: { textAlign: "center", lineHeight: 20, marginBottom: 20 },
  pickRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  pickName: { flex: 1, fontSize: 16, fontWeight: "600" },
});
