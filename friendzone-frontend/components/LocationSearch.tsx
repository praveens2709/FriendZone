import React, { useState, useEffect } from "react";
import {
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { fetchPlaces } from "@/constants/Functions";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedView } from "./ThemedView";

type Props = {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onAddressSelect: (address: string) => void;
  popularSearches?: string[];
};

const LocationSearch = ({
  placeholder = "Search for a location...",
  value,
  onChangeText,
  onAddressSelect,
  popularSearches = [],
}: Props) => {
  const { colors } = useTheme();
  const [results, setResults] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let active = true;
    const delayDebounce = setTimeout(async () => {
      setIsTyping(value.length > 0);
      if (value.length > 0) {
        const places = await fetchPlaces(value);
        if (active) setResults(places);
      } else {
        setResults([]);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(delayDebounce);
    };
  }, [value]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <ThemedView style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={colors.text}
          value={value}
          onChangeText={onChangeText}
          style={[
            styles.input,
            {
              flex: 1,
              color: colors.text,
              backgroundColor: colors.buttonBackgroundSecondary,
              borderColor: colors.border,
            },
          ]}
          onFocus={() => setIsTyping(true)}
          onBlur={() => setIsTyping(false)}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText("")}
            style={{ marginLeft: -40, padding: 10 }}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={colors.text}
            />
          </TouchableOpacity>
        )}
      </ThemedView>

      {(results.length > 0 || (!isTyping && popularSearches.length > 0)) && (
        <ThemedView
          style={[
            styles.listContainer,
            {
              borderColor: colors.border,
            },
          ]}
        >
          <FlatList
            data={results.length > 0 ? results : popularSearches}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, { borderBottomColor: colors.border }]}
                onPress={() => {
                  onAddressSelect(
                    typeof item === "string" ? item : item.description
                  );
                }}
              >
                <Text style={{ color: colors.text }}>
                  {typeof item === "string" ? item : item.description}
                </Text>
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
          />
        </ThemedView>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  input: {
    height: 50,
    borderRadius: 12,
    fontSize: 16,
    lineHeight: 18,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
  },
  listContainer: {
    marginTop: 8,
  },
  list: {
    flexGrow: 1,
  },
  row: {
    padding: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

export default LocationSearch;
