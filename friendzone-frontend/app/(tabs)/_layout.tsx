import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { HapticTab } from "@/components/HapticTab";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Feather,
  FontAwesome5,
  Octicons,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const basePaddingTop = 5;
  const basePaddingBottomAndroid = 5;
  const basePaddingBottomIos = 20;

  const dynamicPaddingBottom = Platform.select({
    ios: Math.max(basePaddingBottomIos, insets.bottom),
    android: basePaddingBottomAndroid + insets.bottom,
    default: basePaddingBottomAndroid + insets.bottom,
  });

  const contentHeight = 55;
  const totalTabBarHeight =
    contentHeight + basePaddingTop + dynamicPaddingBottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: [
          styles.tabBarBase,
          {
            backgroundColor: colors.tabBarBackground,
            borderColor: colors.border,
            borderTopColor: colors.border,
            height: totalTabBarHeight,
            paddingBottom: dynamicPaddingBottom,
            paddingTop: basePaddingTop,
          },
          { position: "absolute" },
        ],
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <Octicons
              name={focused ? "home" : "home"}
              size={24}
              color={focused ? colors.tabBarActive : colors.tabBarInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="circle"
        options={{
          title: "Circle",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={26}
              color={focused ? colors.tabBarActive : colors.tabBarInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="posts"
        options={{
          title: "Post",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "add-circle" : "add-circle-outline"}
              size={28}
              color={focused ? colors.tabBarActive : colors.tabBarInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="meetings"
        options={{
          title: "Plans",
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={focused ? "calendar-clock" : "calendar-clock-outline"}
              size={24}
              color={focused ? colors.tabBarActive : colors.tabBarInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <FontAwesome5
              name={focused ? "user-circle" : "user-circle"}
              size={24}
              color={focused ? colors.tabBarActive : colors.tabBarInactive}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBase: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    overflow: "hidden",
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});
