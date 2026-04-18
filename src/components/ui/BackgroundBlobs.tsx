import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Animated, Easing } from "react-native";

const { width, height } = Dimensions.get("window");

export const BackgroundBlobs = () => {
  const blob1X = useRef(new Animated.Value(0)).current;
  const blob1Y = useRef(new Animated.Value(0)).current;
  const blob2X = useRef(new Animated.Value(0)).current;
  const blob2Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (value: Animated.Value, toValue: number, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anims = [
      createAnimation(blob1X, width * 0.2, 8000),
      createAnimation(blob1Y, height * 0.1, 10000),
      createAnimation(blob2X, -width * 0.2, 9000),
      createAnimation(blob2Y, height * 0.15, 11000),
    ];

    anims.forEach((anim) => anim.start());

    return () => anims.forEach((anim) => anim.stop());
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.blob,
          styles.blob1,
          {
            transform: [{ translateX: blob1X }, { translateY: blob1Y }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blob2,
          {
            transform: [{ translateX: blob2X }, { translateY: blob2Y }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: (width * 1.5) / 2,
    opacity: 0.15,
  },
  blob1: {
    top: -width * 0.5,
    left: -width * 0.2,
    backgroundColor: "#FF7A28",
  },
  blob2: {
    bottom: -width * 0.5,
    right: -width * 0.3,
    backgroundColor: "#1E293B",
  },
});
