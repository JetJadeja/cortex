import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import type { GestureResponderEvent } from "react-native";
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

/* ── magnetic attraction constants ── */
const MAX_PULL = 30;
const SPREAD_SIGMA_SQ = 60 * 60;
const ENGAGE_K = 8;
const DECAY_K = 4;
const IDLE_BREATH = 5;
const REC_BLEND_K = 6;

interface RadialRecorderProps {
  isRecording: boolean;
  currentLevel: number;
  onPress: () => void;
  magnetEnabled?: boolean;
}

interface FrameState {
  tickPath: string;
  orbitDeg: number;
}

function buildTickPath(
  time: number,
  level: number,
  recBlend: number,
  touchX: number | null,
  touchY: number | null,
  attraction: number,
): string {
  let d = "";
  for (let i = 0; i < TICK_COUNT; i++) {
    const angle = (i / TICK_COUNT) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const idleNoise = Math.sin(i * 0.1 + time) * IDLE_BREATH;

    let recNoise =
      Math.sin(i * 0.2 + time) *
      Math.cos(i * 0.1 - time * 2) *
      32 *
      level;
    recNoise += Math.sin(i * 0.7 + time * 3) * 10 * level;

    const noise = idleNoise * (1 - recBlend) + recNoise * recBlend;

    let pull = 0;
    if (attraction > 0.001 && touchX !== null && touchY !== null) {
      const tickX = CX + cos * BASE_RADIUS;
      const tickY = CY + sin * BASE_RADIUS;
      const dx = touchX - tickX;
      const dy = touchY - tickY;
      const distSq = dx * dx + dy * dy;
      pull = MAX_PULL * Math.exp(-distSq / (2 * SPREAD_SIGMA_SQ)) * attraction;
    }

    const tickLen = BASE_TICK + Math.max(0, noise) + pull;
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
  ({ isRecording, currentLevel, onPress, magnetEnabled = false }) => {
    const levelRef = useRef(0);
    const isRecRef = useRef(false);
    const startRef = useRef(Date.now());
    const [frame, setFrame] = useState<FrameState>({
      tickPath: "",
      orbitDeg: 0,
    });

    /* ── touch tracking refs ── */
    const viewRef = useRef<View>(null);
    const layoutRef = useRef({ x: 0, y: 0 });
    const touchXRef = useRef<number | null>(null);
    const touchYRef = useRef<number | null>(null);
    const touchActiveRef = useRef(false);
    const attractionRef = useRef(0);
    const recBlendRef = useRef(0);
    const lastFrameRef = useRef(Date.now());

    const magnetRef = useRef(false);

    useEffect(() => { levelRef.current = currentLevel; }, [currentLevel]);
    useEffect(() => { isRecRef.current = isRecording; }, [isRecording]);
    useEffect(() => { magnetRef.current = magnetEnabled; }, [magnetEnabled]);

    const handleLayout = useCallback(() => {
      viewRef.current?.measureInWindow((x, y) => {
        if (x !== undefined) layoutRef.current = { x, y };
      });
    }, []);

    const updateTouchPosition = useCallback((e: GestureResponderEvent) => {
      const { pageX, pageY } = e.nativeEvent;
      touchXRef.current = pageX - layoutRef.current.x;
      touchYRef.current = pageY - layoutRef.current.y;
    }, []);

    const handleTouchStart = useCallback((e: GestureResponderEvent) => {
      if (!magnetRef.current || isRecRef.current) return;
      viewRef.current?.measureInWindow((x, y) => {
        if (x !== undefined) layoutRef.current = { x, y };
      });
      updateTouchPosition(e);
      touchActiveRef.current = true;
    }, [updateTouchPosition]);

    const handleTouchMove = useCallback((e: GestureResponderEvent) => {
      if (!magnetRef.current || isRecRef.current) return;
      updateTouchPosition(e);
    }, [updateTouchPosition]);

    const handleTouchEnd = useCallback(() => {
      touchActiveRef.current = false;
    }, []);

    useEffect(() => {
      let rafId: number;
      startRef.current = Date.now();
      lastFrameRef.current = Date.now();

      const animate = () => {
        const now = Date.now();
        const dt = Math.min((now - lastFrameRef.current) / 1000, 0.05);
        lastFrameRef.current = now;

        const time = (now - startRef.current) * 0.002;
        const rec = isRecRef.current;

        /* smooth recording crossfade */
        const recTarget = rec ? 1 : 0;
        const recAlpha = 1 - Math.exp(-REC_BLEND_K * dt);
        recBlendRef.current += (recTarget - recBlendRef.current) * recAlpha;

        /* magnetic attraction */
        const canAttract = magnetRef.current && !rec;
        if (!canAttract) touchActiveRef.current = false;
        const target = touchActiveRef.current ? 1 : 0;
        const k = touchActiveRef.current ? ENGAGE_K : DECAY_K;
        const alpha = 1 - Math.exp(-k * dt);
        attractionRef.current += (target - attractionRef.current) * alpha;
        if (attractionRef.current < 0.001) attractionRef.current = 0;

        const tickPath = buildTickPath(
          time,
          levelRef.current,
          recBlendRef.current,
          touchXRef.current,
          touchYRef.current,
          attractionRef.current,
        );
        const blend = recBlendRef.current;
        const orbitDeg = blend > 0.01 ? (time / 120) * 360 * blend : 0;
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
      <View
        ref={viewRef}
        style={styles.container}
        onLayout={handleLayout}
        {...(magnetEnabled && {
          onTouchStart: handleTouchStart,
          onTouchMove: handleTouchMove,
          onTouchEnd: handleTouchEnd,
          onTouchCancel: handleTouchEnd,
        })}
      >
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
