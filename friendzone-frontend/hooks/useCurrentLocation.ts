import { useCallback } from "react";
import * as Location from "expo-location";

export type LatLng = { latitude: number; longitude: number };

export default function useCurrentLocation() {
  return useCallback(async (): Promise<LatLng | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
    } catch {
      return null;
    }
  }, []);
}
