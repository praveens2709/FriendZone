import React from "react";
import {
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/Button";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";

const { width } = Dimensions.get("window");
const POST_ITEM_SIZE = (width - 6) / 3;

const STATIC_USER_DATA = {
  username: "Dogesh",
  fullName: "Dogesh Bhai",
  bio: "Exploring the world one photo at a time. 🌍📸",
  profileImage:
    "https://media.newyorker.com/photos/665f65409ad64d9e7a494208/4:3/w_1003,h_752,c_limit/Chayka-screenshot-06-05-24.jpg",
  postsCount: 125,
  followersCount: "1.2M",
  followingCount: 500,
};

// const STATIC_POSTS = Array.from({ length: 15 }).map((_, i) => ({
//   id: String(i),
//   image: `https://picsum.photos/id/${100 + i}/200/200`,
// }));

export default function ProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  // const renderPostItem = ({ item }: { item: { id: string; image: string } }) => (
  //   <TouchableOpacity style={styles.postItem}>
  //     <Image source={{ uri: item.image }} style={styles.postImage} />
  //   </TouchableOpacity>
  // );

  return (
    <>
      <LinearGradient colors={colors.gradient} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={[styles.header, { borderBottomColor: colors.border }]}>
            <ThemedText
              type="subtitle"
              style={[styles.username, { color: colors.text }]}
            >
              {STATIC_USER_DATA.username}
            </ThemedText>
            <TouchableOpacity onPress={() => router.push("/profile/settings")}>
              <Ionicons name="menu" size={28} color={colors.text} />
            </TouchableOpacity>
          </ThemedView>
          <ThemedView style={styles.profileInfoContainer}>
            <Image
              source={{ uri: STATIC_USER_DATA.profileImage }}
              style={styles.profileImage}
            />
            <ThemedText
              type="title"
              style={[styles.fullName, { color: colors.text }]}
            >
              {STATIC_USER_DATA.fullName}
            </ThemedText>
            <ThemedText
              type="default"
              style={[styles.bio, { color: colors.textDim }]}
            >
              {STATIC_USER_DATA.bio}
            </ThemedText>
            <Button
              title="Edit Profile"
              onPress={() => {
                /* Navigate to Edit Profile Screen */
              }}
              style={styles.editProfileButton}
            />
          </ThemedView>
          {/* <FlatList
            data={STATIC_POSTS}
            keyExtractor={(item) => item.id}
            numColumns={3}
            renderItem={renderPostItem}
            contentContainerStyle={styles.postsGrid}
            showsVerticalScrollIndicator={false}
          /> */}
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  username: {
    fontSize: 22,
    fontWeight: "bold",
  },
  profileInfoContainer: {
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    marginBottom: 5,
    paddingHorizontal: 20, // Horizontal padding for this container
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#fff",
    marginBottom: 10,
  },
  fullName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  bio: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
  },
  editProfileButton: {
    // No specific width needed here as Button has width: '100%' default
    // Any other styling for this specific button can go here, e.g. marginTop
  },
  postsGrid: {
    paddingHorizontal: 2,
  },
  postItem: {
    width: POST_ITEM_SIZE,
    height: POST_ITEM_SIZE,
    margin: 1,
    backgroundColor: "#333",
  },
  postImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
});
