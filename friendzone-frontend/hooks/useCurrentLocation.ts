// hooks/useCurrentLocation.ts
import { useEffect, useState } from "react";
import { Alert } from "react-native";

import * as Location from "expo-location";

export type LatLng = { latitude: number; longitude: number };

export default function useCurrentLocation() {
  const [location, setLocation] = useState<LatLng | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission denied", "Location access is required.");
          return;
        }

        let current = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
      } catch (error) {
        console.error("Location error:", error);
      }
    })();
  }, []);

  return location;
}
