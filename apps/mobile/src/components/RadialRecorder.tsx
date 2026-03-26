import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { colors } from "../constants/theme";

const SIZE = 280;
const CX = SIZE / 2;
const CY = SIZE / 2;
const TICK_COUNT = 120;
const BASE_RADIUS = 105;
const BASE_TICK = 4;
const ORBIT_RADIUS = 88;
const BUTTON_SIZE = 60;
const ICON_IDLE = 8;
const ICON_REC = 12;

interface RadialRecorderProps {
  isRecording: boolean;
  currentLevel: number;
  onPress: () => void;
}

interface FrameState {
  tickPath: string;
  orbitDeg: number;
}

function buildTickPath(
  time: number,
  level: number,
  recording: boolean,
): string {
  let d = "";
  for (let i = 0; i < TICK_COUNT; i++) {
    const angle = (i / TICK_COUNT) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let noise = 0;
    if (recording) {
      noise =
        Math.sin(i * 0.2 + time) *
        Math.cos(i * 0.1 - time * 2) *
        32 *
        level;
      noise += Math.sin(i * 0.7 + time * 3) * 10 * level;
    } else {
      noise = Math.sin(i * 0.1 + time) * 5;
    }

    const tickLen = BASE_TICK + Math.max(0, noise);
    const x1 = CX + cos * BASE_RADIUS;
    const y1 = CY + sin * BASE_RADIUS;
    const x2 = CX + cos * (BASE_RADIUS + tickLen);
    const y2 = CY + sin * (BASE_RADIUS + tickLen);

    d += "M" + x1.toFixed(1) + "," + y1.toFixed(1) +
         "L" + x2.toFixed(1) + "," + y2.toFixed(1);
  }
  return d;
}

export const RadialRecorder: React.FC<RadialRecorderProps> = React.memo(
  ({ isRecording, currentLevel, onPress }) => {
    const levelRef = useRef(0);
    const isRecRef = useRef(false);
    const startRef = useRef(Date.now());
    const [frame, setFrame] = useState<FrameState>({
      tickPath: "",
      orbitDeg: 0,
    });

    useEffect(() => { levelRef.current = currentLevel; }, [currentLevel]);
    useEffect(() => { isRecRef.current = isRecording; }, [isRecording]);

    useEffect(() => {
      let rafId: number;
      startRef.current = Date.now();

      const animate = () => {
        const time = (Date.now() - startRef.current) * 0.002;
        const rec = isRecRef.current;
        const tickPath = buildTickPath(time, levelRef.current, rec);
        const orbitDeg = rec ? (time / 120) * 360 : 0;
        setFrame({ tickPath, orbitDeg });
        rafId = requestAnimationFrame(animate);
      };

      rafId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafId);
    }, []);

    const pulseScale = useRef(new Animated.Value(0.8)).current;
    const pulseOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (isRecording) {
        pulseScale.setValue(0.8);
        pulseOpacity.setValue(0);
        const scaleLoop = Animated.loop(
          Animated.timing(pulseScale, {
            toValue: 1.5,
            duration: 2000,
            easing: Easing.bezier(0.215, 0.61, 0.355, 1),
            useNativeDriver: true,
          }),
        );
        const opacityLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseOpacity, {
              toValue: 0.3,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        );
        scaleLoop.start();
        opacityLoop.start();
        return () => {
          scaleLoop.stop();
          opacityLoop.stop();
        };
      }
      pulseScale.setValue(0.8);
      pulseOpacity.setValue(0);
    }, [isRecording, pulseScale, pulseOpacity]);

    const buttonScale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.timing(buttonScale, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }).start();
    };

    const tickStroke = isRecording
      ? colors.radialTickActive
      : colors.radialTickIdle;

    return (
      <View style={styles.container}>
        <Svg width={SIZE} height={SIZE} style={styles.svg}>
          <Path
            d={frame.tickPath}
            stroke={tickStroke}
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
          />
          <Circle
            cx={CX}
            cy={CY}
            r={ORBIT_RADIUS}
            stroke={colors.radialOrbit}
            strokeWidth={1}
            strokeDasharray="4,4"
            fill="none"
            rotation={frame.orbitDeg}
            origin={`${CX},${CY}`}
          />
        </Svg>

        <Animated.View
          style={[
            styles.pulse,
            {
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.buttonWrap,
            { transform: [{ scale: buttonScale }] },
          ]}
        >
          <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.button}
          >
            <View
              style={
                isRecording ? styles.iconRecording : styles.iconIdle
              }
            />
          </Pressable>
        </Animated.View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  svg: {
    position: "absolute",
  },
  buttonWrap: {
    zIndex: 10,
  },
  pulse: {
    position: "absolute",
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 1,
    borderColor: colors.radialPulse,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 1,
    borderColor: colors.textMuted,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  iconIdle: {
    width: ICON_IDLE,
    height: ICON_IDLE,
    backgroundColor: colors.text,
    borderRadius: 1,
  },
  iconRecording: {
    width: ICON_REC,
    height: ICON_REC,
    backgroundColor: colors.recording,
    borderRadius: 2,
    shadowColor: colors.recording,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
});
