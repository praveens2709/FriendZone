import { StyleSheet } from 'react-native';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/context/ThemeContext';

export default function Divider({ text = 'or' }) {
  const { colors } = useTheme();

  return (
    <ThemedView style={styles.dividerContainer}>
      <ThemedView style={[styles.line, {backgroundColor: colors.textDim}]} />
      <ThemedText style={[styles.dividerText, {color: colors.textDim}]}>{text}</ThemedText>
      <ThemedView style={[styles.line, {backgroundColor: colors.textDim}]} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 8,
    fontWeight: '500',
  },
});
