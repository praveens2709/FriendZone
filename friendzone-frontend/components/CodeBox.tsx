import React, { forwardRef } from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface CodeBoxProps extends TextInputProps {
  digit: string;
  index: number;
  activeIndex: number;
}

const CodeBox = forwardRef<TextInput, CodeBoxProps>(
  ({ digit, index, activeIndex, ...props }, ref) => {
    const { colors } = useTheme();

    const isActive = index === activeIndex;
    const showPlaceholder = digit === '';

    return (
      <TextInput
        ref={ref}
        style={[
          styles.codeBox,
          {
            backgroundColor: showPlaceholder ? colors.background : colors.primary,
            color: showPlaceholder ? colors.textSecondary : (colors.isDark ? colors.text : "#FFF"),
            borderColor: isActive ? colors.primary : `${colors.border}30`,
            borderWidth: 2,
          },
        ]}
        value={digit}
        placeholder="_"
        placeholderTextColor={`${colors.textDim}80`}
        keyboardType="number-pad"
        maxLength={1}
        caretHidden
        textAlign="center"
        {...props}
      />
    );
  }
);

const styles = StyleSheet.create({
  codeBox: {
    width: 60,
    height: 60,
    borderRadius: 14,
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
  },
});

export default CodeBox;
