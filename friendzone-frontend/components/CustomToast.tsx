import React from 'react';
import { StyleSheet } from 'react-native';
import { ToastConfigParams, BaseToastProps } from 'react-native-toast-message';
import { useTheme } from '@/context/ThemeContext';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';

const CustomToast = (props: ToastConfigParams<BaseToastProps>) => {
  const { colors } = useTheme();

  const borderColor =
    props.type === 'success'
      ? colors.success
      : props.type === 'error'
      ? colors.error
      : colors.info;

  return (
    <ThemedView
      style={[
        styles.toastContainer,
        {
          backgroundColor: colors.background,
          borderColor,
        },
      ]}
    >
      <ThemedText style={styles.text}>
        {props.text1}
      </ThemedText>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderLeftWidth: 6,
    borderRadius: 6,
    width: '95%',
    maxWidth: 400,
    alignSelf: 'center',
    marginTop: 10,
    elevation: 3,
  },
  text: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
});

export default CustomToast;
