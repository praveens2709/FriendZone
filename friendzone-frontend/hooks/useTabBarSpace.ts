import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const useTabBarSpace = () => {
  const insets = useSafeAreaInsets();
  const bottom = Platform.select({
    ios: Math.max(20, insets.bottom),
    default: 5 + insets.bottom,
  }) as number;
  const barHeight = 55 + 5 + bottom;
  return { offset: 0, space: barHeight + 16 };
};
