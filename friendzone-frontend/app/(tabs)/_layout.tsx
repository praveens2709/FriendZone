import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { HapticTab } from "@/components/HapticTab";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome5, FontAwesome6, Octicons } from "@expo/vector-icons";

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
            borderTopColor: colors.tabBarBorder,
            height: totalTabBarHeight,
            paddingBottom: dynamicPaddingBottom,
            paddingTop: basePaddingTop,
          },
          Platform.select({
            ios: {
              position: "absolute",
            },
            default: {},
          }),
        ],
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
              name={focused ? "home-fill" : "home"}
              size={24}
              color={focused ? colors.tabBarActive : colors.tabBarInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ focused }) => (
            <Feather
              name={focused ? "search" : "search"}
              size={25}
              color={focused ? colors.tabBarActive : colors.tabBarInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="posts"
        options={{
          title: "Posts",
          tabBarIcon: ({ focused }) => (
            <FontAwesome6
              name={focused ? "square-plus" : "plus-square"}
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
    // borderTopWidth: 0.5,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});
