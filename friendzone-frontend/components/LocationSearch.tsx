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
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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
    }, 600);

    return () => {
      active = false;
      clearTimeout(delayDebounce);
    };
  }, [value]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <ThemedView
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.buttonBackgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Feather
          name="search"
          size={20}
          color={colors.textDim}
          style={styles.searchIcon}
        />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={colors.textDim}
          value={value}
          onChangeText={onChangeText}
          style={[
            styles.searchInput,
            {
              color: colors.text,
            },
          ]}
          onFocus={() => setIsTyping(true)}
          onBlur={() => setIsTyping(false)}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText("")}
            style={styles.clearIcon}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={colors.textDim}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 45,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    lineHeight: 18.8,
  },
  clearIcon: {
    padding: 5,
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
