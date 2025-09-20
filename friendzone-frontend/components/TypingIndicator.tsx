import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Easing } from 'react-native';
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
  const slideAnim = useRef(new Animated.Value(12)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isTyping) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

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
      slideAnim.setValue(12);
      fadeAnim.setValue(0);
    }
    return () => {
      dotAnimations.forEach(anim => anim.stopAnimation());
    };
  }, [isTyping, dotAnimations, slideAnim, fadeAnim]);

  if (!isTyping) {
    return null;
  }

  return (
    <ThemedView
      style={[
        styles.messageBubbleContainer,
        styles.otherMessageContainer,
      ]}
    >
      <Animated.View
        style={{
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        }}
      >
        <ThemedView 
          style={[
            styles.messageBubble,
            styles.otherMessageBubble,
            { backgroundColor: colors.buttonBackgroundSecondary }
          ]}
        >
          <ThemedView style={styles.dotsContainer}>
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
          </ThemedView>
        </ThemedView>
      </Animated.View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  messageBubbleContainer: {
    maxWidth: "80%",
    marginVertical: 5,
  },
  otherMessageContainer: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 18,
    maxWidth: "100%",
    flexDirection: "column",
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: DOT_SIZE * 1.5,
    justifyContent: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginHorizontal: DOT_MARGIN,
  },
});

export default TypingIndicator;