import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import Button from "@/components/Button";

export default function CompactButton({
  title,
  onPress,
  variant = "default",
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "default" | "outline";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Button
      title={title}
      onPress={onPress}
      variant={variant}
      disabled={disabled}
      style={[
        { width: "auto", height: 30, minWidth: 84, paddingVertical: 0, paddingHorizontal: 14, marginVertical: 0, justifyContent: "center", borderRadius: 12, borderWidth: variant === "outline" ? 1 : 0, borderBottomWidth: variant === "outline" ? 1 : 0 },
        style as ViewStyle,
      ]}
      textStyle={{ fontSize: 13, lineHeight: 16 }}
    />
  );
}
