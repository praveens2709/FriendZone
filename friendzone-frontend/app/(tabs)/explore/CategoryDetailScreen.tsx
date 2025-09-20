import React, { useState, useEffect } from "react";
import { StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import UserProfileCard from "@/components/UserProfileCard";
import CommonHeader from "@/components/CommonHeader";
import BackButton from "@/components/BackButton";
import ThemedSafeArea from "@/components/ThemedSafeArea";

interface UserProfile {
  id: string;
  username: string;
  avatar: string | null;
  description: string;
  frameType?: 'birthday' | 'creative' | 'coder' | 'location';
}

interface GroupedData {
  title: string;
  data: UserProfile[];
}

const mockFetchUsers = (categoryId: string): Promise<GroupedData[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let data: GroupedData[] = [];
      if (categoryId === "birthdays") {
        data = [
          {
            title: "Today",
            data: [
              { id: "b1", username: "Alex", avatar: "https://randomuser.me/api/portraits/men/1.jpg", description: "Birthday Today", frameType: 'birthday' },
            ],
          },
          {
            title: "Tomorrow",
            data: [
              { id: "b2", username: "Jessica", avatar: "https://randomuser.me/api/portraits/women/3.jpg", description: "Birthday Tomorrow" },
            ],
          },
          {
            title: "Yesterday",
            data: [
              { id: "b3", username: "Sam", avatar: "https://randomuser.me/api/portraits/women/2.jpg", description: "Birthday Yesterday" },
            ],
          },
        ];
      } else if (categoryId === "locationBased") {
        data = [
          {
            title: "Jodhpur, Rajasthan",
            data: [
              { id: "l1", username: "Chloe", avatar: "https://randomuser.me/api/portraits/women/4.jpg", description: "In Jodhpur, Rajasthan", frameType: 'location' },
              { id: "l2", username: "David", avatar: "https://randomuser.me/api/portraits/men/5.jpg", description: "In Jodhpur, Rajasthan", frameType: 'location' },
            ],
          },
        ];
      } else {
        data = [
          {
            title: "Creative Souls",
            data: [
              { id: "u1", username: "Alice", avatar: "https://randomuser.me/api/portraits/women/71.jpg", description: "Creative Soul", frameType: 'creative' },
              { id: "u2", username: "Charlie", avatar: "https://randomuser.me/api/portraits/women/61.jpg", description: "Creative Soul", frameType: 'creative' },
            ],
          },
          {
            title: "Crazy Coders",
            data: [
              { id: "u3", username: "Bob", avatar: "https://randomuser.me/api/portraits/men/81.jpg", description: "Crazy Coder", frameType: 'coder' },
            ],
          },
        ];
      }
      resolve(data);
    }, 1000);
  });
};

export default function CategoryDetailScreen() {
  const { categoryId, categoryName } = useLocalSearchParams();
  const { colors } = useTheme();
  const router = useRouter();

  const [groupedData, setGroupedData] = useState<GroupedData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const fetchedData = await mockFetchUsers(categoryId as string);
        setGroupedData(fetchedData);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [categoryId]);

  const renderItem = ({ item }: { item: GroupedData }) => (
    <ThemedView>
      <ThemedText style={[styles.headingText, { color: colors.textDim }]}>
        {item.title}
      </ThemedText>
      {item.data.map((userProfile) => (
        <UserProfileCard
          key={userProfile.id}
          userId={userProfile.id}
          username={userProfile.username}
          avatar={userProfile.avatar}
          description={userProfile.description}
          frameType={userProfile.frameType}
        />
      ))}
    </ThemedView>
  );

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <ThemedSafeArea style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: false }} />
        <CommonHeader
          leftContent={<BackButton color={colors.text} />}
          title={categoryName as string}
          showBottomBorder={true}
        />
        {loading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <ThemedText style={[styles.loadingText, { color: colors.textDim }]}>
              Loading...
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={styles.listContainer}>
            <FlatList
              data={groupedData}
              keyExtractor={(item, index) => `${item.title}-${index}`}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={() => (
                <ThemedView style={styles.emptyContainer}>
                  <ThemedText style={[styles.emptyText, { color: colors.textDim }]}>
                    No users in this category.
                  </ThemedText>
                </ThemedView>
              )}
            />
          </ThemedView>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  loadingText: {
    marginTop: 10,
  },
  listContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headingText: {
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 5,
    paddingHorizontal: 15,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
    backgroundColor: "transparent",
  },
  emptyText: {
    fontSize: 16,
  },
});