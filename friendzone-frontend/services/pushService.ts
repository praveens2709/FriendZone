import { Platform } from "react-native";
import Constants from "expo-constants";
import httpClient from "@/configs/axios.config";

let currentToken: string | null = null;

const loadModules = () => {
  try {
    const Notifications = require("expo-notifications");
    const Device = require("expo-device");
    return { Notifications, Device };
  } catch {
    return null;
  }
};

export const configureForegroundBehavior = () => {
  if (Platform.OS !== "android") return;
  const modules = loadModules();
  if (!modules) return;
  modules.Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
};

export const registerForPush = async (): Promise<void> => {
  if (Platform.OS !== "android") return;
  const modules = loadModules();
  if (!modules) return;
  const { Notifications, Device } = modules;
  try {
    if (!Device.isDevice) return;

    await Notifications.setNotificationChannelAsync("default", {
      name: "General",
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync("calls", {
      name: "Calls",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 300, 500],
    });

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const result = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    currentToken = result.data;
    await httpClient.post("push/register", { token: result.data, platform: "android" });
  } catch {
    currentToken = null;
  }
};

export const unregisterPush = async (): Promise<void> => {
  const token = currentToken;
  currentToken = null;
  if (!token) return;
  try {
    await httpClient.post("push/unregister", { token });
  } catch {}
};

export const listenForNotificationTaps = (open: (route: string) => void): (() => void) => {
  if (Platform.OS !== "android") return () => undefined;
  const modules = loadModules();
  if (!modules) return () => undefined;
  const { Notifications } = modules;

  const routeFrom = (response: any): string | null => {
    const route = response?.notification?.request?.content?.data?.route;
    return typeof route === "string" && route.startsWith("/") ? route : null;
  };

  Notifications.getLastNotificationResponseAsync()
    .then((response: any) => {
      const route = routeFrom(response);
      if (route) open(route);
    })
    .catch(() => undefined);

  const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
    const route = routeFrom(response);
    if (route) open(route);
  });
  return () => subscription.remove();
};
