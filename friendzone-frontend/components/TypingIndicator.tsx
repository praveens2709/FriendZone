import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ThemedView } from '@/components/ThemedView';

interface TypingIndicatorProps {
  isTyping: boolean;
}

const DOT_SIZE = 7;
const DOT_MARGIN = 2;
const ANIMATION_DURATION = 900;

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isTyping }) => {
  const { colors } = useTheme();
  const dotAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    if (isTyping) {
      const animateDot = (dotIndex: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(dotAnimations[dotIndex], {
              toValue: 1,
              duration: ANIMATION_DURATION / 2,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(dotAnimations[dotIndex], {
              toValue: 0,
              duration: ANIMATION_DURATION / 2,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          { iterations: -1 }
        ).start();
      };

      dotAnimations.forEach((_, index) => {
        setTimeout(() => animateDot(index), index * (ANIMATION_DURATION / 3));
      });

    } else {
      dotAnimations.forEach(anim => anim.stopAnimation());
      dotAnimations.forEach(anim => anim.setValue(0));
    }
    return () => {
      dotAnimations.forEach(anim => anim.stopAnimation());
    };
  }, [isTyping, dotAnimations]);

  if (!isTyping) {
    return null;
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.buttonBackgroundSecondary }]}>
      <View style={styles.dotsContainer}>
        {dotAnimations.map((animation, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: colors.textDim,
                transform: [
                  {
                    translateY: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -DOT_SIZE / 2],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    marginHorizontal: 10,
    marginBottom: 5,
    marginTop: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 2,
    minWidth: 50,
    maxWidth: '50%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: DOT_SIZE * 1.5,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginHorizontal: DOT_MARGIN,
  },
});

export default TypingIndicator;