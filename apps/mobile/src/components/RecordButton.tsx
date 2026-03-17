import React, { useEffect, useRef } from "react";
import { Animated, Pressable, View, StyleSheet } from "react-native";
import { colors } from "../constants/theme";

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
}

const SIZE = 140;
const RING_SIZE = SIZE + 32;

export const RecordButton: React.FC<RecordButtonProps> = React.memo(
  ({ isRecording, onPress }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0.3)).current;
    const innerScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      if (isRecording) {
        Animated.spring(innerScale, {
          toValue: 0.5,
          useNativeDriver: true,
          friction: 6,
        }).start();

        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        );
        const glow = Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 0.6,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.2,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        );
        pulse.start();
        glow.start();

        return () => {
          pulse.stop();
          glow.stop();
        };
      } else {
        Animated.spring(innerScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
        }).start();
        pulseAnim.setValue(1);
        glowAnim.setValue(0.3);
      }
    }, [isRecording, pulseAnim, glowAnim, innerScale]);

    return (
      <View style={styles.wrapper}>
        <Animated.View
          style={[
            styles.ring,
            {
              transform: [{ scale: pulseAnim }],
              opacity: glowAnim,
            },
          ]}
        />
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.button,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Animated.View
            style={[
              styles.inner,
              {
                transform: [{ scale: innerScale }],
                borderRadius: isRecording ? 12 : SIZE / 2,
              },
            ]}
          />
        </Pressable>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  ring: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: "rgba(108, 92, 231, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  inner: {
    width: 56,
    height: 56,
    backgroundColor: colors.primary,
  },
});
