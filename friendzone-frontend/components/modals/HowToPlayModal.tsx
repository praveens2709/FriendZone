import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from "react-native";
import ThemedModal from "@/components/ThemedModal";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

interface HowToPlayModalProps {
  visible: boolean;
  onClose: () => void;
}

const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();

  const renderExampleTiles = (letters: string[], highlightIndex: number, highlightColor: string) => {
    return (
      <View style={styles.exampleRow}>
        {letters.map((letter, index) => (
          <View
            key={index}
            style={[
              styles.exampleTile,
              {
                backgroundColor: index === highlightIndex ? highlightColor : 'transparent',
                borderColor: index === highlightIndex ? highlightColor : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.exampleTileText,
                { color: index === highlightIndex ? 'white' : colors.text },
              ]}
            >
              {letter}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ThemedModal visible={visible} onClose={onClose} containerStyle={styles.modalContent}>
      <ThemedView>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>How To Play</ThemedText>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </ThemedView>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.subtitle, { color: colors.textDim }]}>
          Guess the Wordle in 6 tries.
        </ThemedText>

        <View style={styles.rulesContainer}>
          <ThemedText style={[styles.bulletPoint, { color: colors.text }]}>
            • Each guess must be a valid 5-letter word.
          </ThemedText>
          <ThemedText style={[styles.bulletPoint, { color: colors.text }]}>
            • The color of the tiles will change to show how close your guess was to the word.
          </ThemedText>
        </View>

        <ThemedText style={styles.examplesTitle}>Examples</ThemedText>

        <View style={styles.exampleContainer}>
          {renderExampleTiles(['W', 'O', 'R', 'D', 'Y'], 0, '#6aaa64')}
          <ThemedText style={[styles.exampleDescription, { color: colors.text }]}>
            <Text style={styles.bold}>W</Text> is in the word and in the correct spot.
          </ThemedText>
        </View>

        <View style={styles.exampleContainer}>
          {renderExampleTiles(['L', 'I', 'G', 'H', 'T'], 1, '#c9b458')}
          <ThemedText style={[styles.exampleDescription, { color: colors.text }]}>
            <Text style={styles.bold}>I</Text> is in the word but in the wrong spot.
          </ThemedText>
        </View>

        <View style={styles.exampleContainer}>
          {renderExampleTiles(['R', 'O', 'G', 'U', 'E'], 3, '#787c7e')}
          <ThemedText style={[styles.exampleDescription, { color: colors.text }]}>
            <Text style={styles.bold}>U</Text> is not in the word in any spot.
          </ThemedText>
        </View>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <ThemedText style={[styles.footerText, { color: colors.textDim }]}>
            A new puzzle is released daily at midnight.
          </ThemedText>
        </View>
      </ScrollView>
      </ThemedView>
    </ThemedModal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
    margin: -8,
  },
  scrollView: {
    // flex: 1,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  rulesContainer: {
    marginBottom: 25,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  examplesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  exampleContainer: {
    marginBottom: 20,
  },
  exampleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  exampleTile: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
    borderRadius: 4,
    borderWidth: 2,
  },
  exampleTileText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  exampleDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 15,
    marginTop: 10,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default HowToPlayModal;