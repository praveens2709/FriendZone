import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import Button from './Button'; // Assuming you have a Button component

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

  const handleCancel = () => {
    setShowModal(false);
  };

  const selectedLabel = data.find(item => item.value === value)?.label || '';

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: colors.text }]}>{label}</ThemedText>

      <TouchableOpacity
        onPress={() => setShowModal(true)}
        style={[
          styles.modalTrigger,
          {
            backgroundColor: 'transparent',
            borderColor: colors.border,
          },
        ]}
      >
        <ThemedText style={{ color: value ? colors.text : colors.textDim }}>
          {value ? selectedLabel : placeholder}
        </ThemedText>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent
        visible={showModal}
        onRequestClose={handleCancel}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={handleCancel}>
          <Pressable style={[styles.pickerWrapper, { backgroundColor: colors.backgroundSecondary }]}>
            <ThemedText style={[styles.modalTitle, { color: colors.primary }]}>
              {label || placeholder}
            </ThemedText>
            <ScrollView style={styles.optionsScrollView}>
              {data.map((item, index) => (
                <View key={item.value}>
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor: value === item.value ? colors.selectedItemBackground : 'transparent',
                      },
                    ]}
                    onPress={() => handleSelect(item.value)}
                  >
                    <ThemedText
                      style={[
                        styles.optionText,
                        {
                          color: value === item.value ? colors.primary : colors.textSecondary,
                          fontWeight: value === item.value ? 'bold' : 'normal',
                        },
                      ]}
                    >
                      {item.label}
                    </ThemedText>
                  </TouchableOpacity>
                  {index < data.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))}
            </ScrollView>
            <Button title="Cancel" onPress={handleCancel} style={styles.modalButton} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    marginLeft: 5,
    fontWeight: '500',
  },
  modalTrigger: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    justifyContent: 'center',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerWrapper: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  optionsScrollView: {
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
    width: '100%',
    marginBottom: Platform.OS === 'ios' ? 15 : 40,
  },
});