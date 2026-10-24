import { useEffect } from "react";
import { useRouter, type Href } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import {
  configureForegroundBehavior,
  listenForNotificationTaps,
  registerForPush,
} from "@/services/pushService";

export default function PushRegistrar() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    configureForegroundBehavior();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPush();
    return listenForNotificationTaps((route) => router.push(route as Href));
  }, [isAuthenticated, router]);

  return null;
}
