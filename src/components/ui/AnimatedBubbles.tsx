import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

interface BubbleProps {
  size: number;
  initialX: number;
  initialY: number;
  duration: number;
  delay: number;
}

const Bubble = ({ size, initialX, initialY, duration, delay }: BubbleProps) => {
  const moveAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      // Reset values
      moveAnim.setValue(0);
      opacityAnim.setValue(0);

      Animated.parallel([
        // Float upwards and drift
        Animated.timing(moveAnim, {
          toValue: 1,
          duration: duration,
          delay: delay,
          useNativeDriver: true,
        }),
        // Fade in and out
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.15,
            duration: duration * 0.3,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: duration * 0.7,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => startAnimation());
    };

    startAnimation();
  }, []);

  const translateY = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [initialY, initialY - 150],
  });

  const translateX = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [initialX, initialX + (Math.random() * 40 - 20)],
  });

  const scale = moveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.2, 1],
  });

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: opacityAnim,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
    />
  );
};

export default function AnimatedBubbles() {
  const bubbles = [
    { size: 120, x: width * 0.1, y: 150, duration: 8000, delay: 0 },
    { size: 80, x: width * 0.7, y: 120, duration: 10000, delay: 1000 },
    { size: 150, x: width * 0.4, y: 200, duration: 12000, delay: 2000 },
    { size: 60, x: width * 0.8, y: 50, duration: 7000, delay: 500 },
    { size: 100, x: width * 0.2, y: 80, duration: 9000, delay: 1500 },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {bubbles.map((b, i) => (
        <Bubble key={i} size={b.size} initialX={b.x} initialY={b.y} duration={b.duration} delay={b.delay} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
  },
});
