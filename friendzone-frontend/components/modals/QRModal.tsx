import React, { useState } from "react";
import { StyleSheet, View, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import ThemedModal from "@/components/ThemedModal";
import { ThemedText } from "@/components/ThemedText";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get('window');

interface QRModalProps {
  visible: boolean;
  onClose: () => void;
  username: string;
}

const THEMES = [
  { id: 'default', qrColor: '#000000', bgColor: '#FFFFFF', name: 'Classic' },
  { id: 'blue', qrColor: '#1E88E5', bgColor: '#E3F2FD', name: 'Ocean' },
  { id: 'green', qrColor: '#43A047', bgColor: '#E8F5E9', name: 'Forest' },
  { id: 'purple', qrColor: '#8E24AA', bgColor: '#F3E5F5', name: 'Lavender' },
  { id: 'orange', qrColor: '#FB8C00', bgColor: '#FFF3E0', name: 'Sunset' },
];

export default function QRModal({ visible, onClose, username }: QRModalProps) {
  const { colors } = useTheme();
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);

  const toggleTheme = () => {
    setCurrentThemeIndex((prevIndex) => (prevIndex + 1) % THEMES.length);
  };

  const currentTheme = THEMES[currentThemeIndex];
  const qrValue = `friendzone.app/profile/${username}`;

  // Simple QR code representation using squares
  const generateQRPattern = () => {
    const size = 21; // Standard QR code size
    const pattern = [];
    
    for (let i = 0; i < size; i++) {
      const row = [];
      for (let j = 0; j < size; j++) {
        // Create a pseudo-random but deterministic pattern based on position
        const seed = (i * size + j + username.length) * 7;
        const shouldFill = (seed % 3) === 0 || 
                          (i < 7 && j < 7) || // Top-left finder pattern
                          (i < 7 && j >= size - 7) || // Top-right finder pattern
                          (i >= size - 7 && j < 7) || // Bottom-left finder pattern
                          (i === 6 || j === 6); // Timing patterns
        row.push(shouldFill);
      }
      pattern.push(row);
    }
    return pattern;
  };

  const qrPattern = generateQRPattern();

  return (
    <ThemedModal visible={visible} onClose={onClose} containerStyle={styles.modalContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
            <Ionicons name="color-palette" size={24} color={colors.text} />
            <ThemedText style={[styles.themeText, { color: colors.text }]}>
              {currentTheme.name}
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="scan" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.qrContent}>
          <View style={[styles.qrCodeContainer, { backgroundColor: currentTheme.bgColor }]}>
            {/* QR Code Pattern */}
            <View style={styles.qrGrid}>
              {qrPattern.map((row, i) => (
                <View key={i} style={styles.qrRow}>
                  {row.map((cell, j) => (
                    <View
                      key={j}
                      style={[
                        styles.qrCell,
                        {
                          backgroundColor: cell ? currentTheme.qrColor : 'transparent',
                        },
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
            
            {/* Profile Logo in center */}
            <View style={[styles.logoContainer, { backgroundColor: currentTheme.bgColor }]}>
              <Ionicons name="person-circle" size={32} color={currentTheme.qrColor} />
            </View>
            
            <ThemedText style={[styles.qrUsername, { color: currentTheme.qrColor }]}>
              @{username}
            </ThemedText>
          </View>
          
          <ThemedText style={[styles.instructionText, { color: colors.textDim }]}>
            Show this QR code to others to connect instantly
          </ThemedText>
        </View>
    </ThemedModal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 60,
  },
  headerButton: {
    padding: 12,
    borderRadius: 20,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  themeText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  qrContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  qrCodeContainer: {
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  qrGrid: {
    width: width * 0.6,
    height: width * 0.6,
    flexDirection: 'column',
  },
  qrRow: {
    flex: 1,
    flexDirection: 'row',
  },
  qrCell: {
    flex: 1,
    margin: 0.5,
  },
  logoContainer: {
    position: 'absolute',
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: width * 0.06,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  qrUsername: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  instructionText: {
    marginTop: 30,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: width * 0.8,
    lineHeight: 20,
  },
});