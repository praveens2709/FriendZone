import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import Button from './Button';
import ThemedModal from './ThemedModal';
import { ThemedView } from './ThemedView';

interface ModalItem {
  label: string;
  value: string;
}

interface ModalComponentProps {
  label: string;
  data: ModalItem[];
  value: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export default function ModalComponent({
  label,
  data,
  value,
  onValueChange,
  placeholder = 'Select an option',
}: ModalComponentProps) {
  const { colors } = useTheme();
  const [showModal, setShowModal] = useState(false);

  const handleSelect = (itemValue: string) => {
    onValueChange(itemValue);
    setShowModal(false);
  };

  const selectedLabel = data.find(item => item.value === value)?.label || '';

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.label}>{label}</ThemedText>

      <TouchableOpacity
        onPress={() => setShowModal(true)}
        style={[
          styles.modalTrigger,
          {
            backgroundColor: "transparent",
            borderColor: colors.border,
          },
        ]}
      >
        <ThemedText style={{ color: value ? colors.text : colors.textDim }}>
          {value ? selectedLabel : placeholder}
        </ThemedText>
      </TouchableOpacity>

      <ThemedModal visible={showModal} onClose={() => setShowModal(false)}>
        <ThemedText style={[styles.modalTitle, { color: colors.primary }]}>
          {label || placeholder}
        </ThemedText>
        <ThemedView style={styles.optionsView}>
          {data.map((item, index) => (
            <ThemedView key={item.value}>
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  {
                    backgroundColor:
                      value === item.value ? colors.selectedItemBackground : "transparent",
                  },
                ]}
                onPress={() => handleSelect(item.value)}
              >
                <ThemedText
                  style={[
                    styles.optionText,
                    {
                      color: value === item.value ? colors.primary : colors.textSecondary,
                      fontWeight: value === item.value ? "bold" : "normal",
                    },
                  ]}
                >
                  {item.label}
                </ThemedText>
              </TouchableOpacity>
              {index < data.length - 1 && (
                <ThemedView style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </ThemedView>
          ))}
        </ThemedView>
        <Button title="Cancel" onPress={() => setShowModal(false)} style={styles.modalButton} />
      </ThemedModal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    marginLeft: 5,
    fontWeight: "500",
  },
  modalTrigger: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    justifyContent: "center",
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  optionsView: {
    maxHeight: 200,
    marginBottom: 15,
  },
  optionItem: {
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  optionText: {
    fontSize: 16,
  },
  divider: {
    height: 1,
  },
  modalButton: {
    width: "100%",
    marginBottom: Platform.OS === "ios" ? 15 : 40,
  },
});