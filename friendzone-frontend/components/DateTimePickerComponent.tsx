import React, { useState } from "react";
import {
  Platform,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/context/ThemeContext";
import Button from "./Button";
import { ThemedView } from "./ThemedView";

interface DateTimePickerComponentProps {
  label: string;
  value: Date | null;
  onDateChange: (date: Date | null) => void;
  maximumDate?: Date;
  minimumDate?: Date;
}

export default function DateTimePickerComponent({
  label,
  value,
  onDateChange,
  maximumDate,
  minimumDate,
}: DateTimePickerComponentProps) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(value || new Date());
  const { colors } = useTheme();

  const handleConfirm = () => {
    setShow(false);
    if (tempDate) {
      onDateChange(tempDate);
    }
  };

  const handleCancel = () => {
    setShow(false);
    setTempDate(value || new Date());
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.label}>
        {label}
      </ThemedText>

      <TouchableOpacity
        onPress={() => {
          setTempDate(value || new Date());
          setShow(true);
        }}
        style={[
          styles.dateInput,
          {
            borderColor: colors.border,
            backgroundColor: 'transparent',
          },
        ]}
      >
        <ThemedText style={{ color: value ? colors.text : colors.textDim }}>
          {value ? value.toDateString() : "Select Date of Birth"}
        </ThemedText>
      </TouchableOpacity>

      {show && Platform.OS === "android" && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display="calendar"
          onChange={(_e, selectedDate) => {
            setShow(false);
            if (selectedDate) onDateChange(selectedDate);
          }}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      )}

      {show && Platform.OS === "ios" && (
        <Modal
          animationType="fade"
          transparent
          visible={show}
          onRequestClose={handleCancel}
        >
          <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={handleCancel}>
            <Pressable style={[styles.pickerWrapper, { backgroundColor: colors.backgroundSecondary }]}>
              <DateTimePicker
                value={tempDate || new Date()}
                mode="date"
                display="spinner"
                onChange={(_event, date) => {
                  if (date) setTempDate(date);
                }}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                style={{ width: "100%" }}
                textColor={colors.textSecondary}
              />
              <ThemedView style={styles.modalButtonRow}>
                <Button title="Cancel" onPress={handleCancel} style={styles.modalButton} />
                <Button title="Confirm" onPress={handleConfirm} style={styles.modalButton} />
              </ThemedView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    marginLeft: 5,
    fontWeight: "500",
  },
  dateInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    justifyContent: "center",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  pickerWrapper: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Platform.OS === 'ios' ? 15 : 40,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
  },
});