import React from 'react';
import { Image, StyleSheet, ImageStyle, StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';

interface AppLogoProps {
  size?: number;
  showText?: boolean;
  text?: string;
  inline?: boolean;
  style?: StyleProp<ImageStyle>;
  textStyle?: StyleProp<any>;
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

const AppLogo: React.FC<AppLogoProps> = ({
  size = 80,
  showText = false,
  text = '',
  inline = false,
  style,
  textStyle,
  containerStyle,
  resizeMode = 'contain',
}) => {
  const { colors } = useTheme();

  return (
    <ThemedView
      style={[
        styles.container,
        inline ? styles.inlineContainer : styles.verticalContainer,
        containerStyle,
      ]}
    >
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={require('@/assets/images/logo3.png')}
          style={[{ width: size, height: size }, style]}
          resizeMode={resizeMode}
        />
      </View>
      {showText && !!text && (
        <ThemedText
          style={[
            styles.text,
            inline ? styles.inlineText : styles.verticalText,
            textStyle,
          ]}
        >
          {text}
        </ThemedText>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  verticalContainer: {
    flexDirection: 'column',
  },
  inlineContainer: {
    flexDirection: 'row',
  },
  text: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 30,
  },
  verticalText: {
    marginTop: 10,
  },
  inlineText: {
    alignSelf: 'center',
  },
});

export default AppLogo;
