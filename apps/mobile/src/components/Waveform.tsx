import React from "react";
import { View, StyleSheet } from "react-native";

interface WaveformProps {
  levels: number[];
  barCount: number;
  height: number;
  color: string;
  accentColor: string;
}

const BAR_WIDTH = 2.5;

export const Waveform: React.FC<WaveformProps> = React.memo(
  ({ levels, barCount, height, color, accentColor }) => {
    const halfCount = Math.floor(barCount / 2);
    const halfHeight = height / 2;

    return (
      <View style={[styles.container, { height }]}>
        {Array.from({ length: barCount }, (_, i) => {
          const distFromCenter = Math.abs(i - halfCount) / halfCount;
          const levelIndex = levels.length - barCount + i;
          const level = levels[levelIndex] ?? 0;
          const barHeight = 2 + level * (halfHeight - 2);
          const isHot = level > 0.6;

          return (
            <View key={i} style={styles.barColumn}>
              <View
                style={{
                  width: BAR_WIDTH,
                  height: barHeight,
                  borderRadius: BAR_WIDTH / 2,
                  backgroundColor: isHot ? accentColor : color,
                  opacity: 0.3 + (1 - distFromCenter) * 0.7,
                }}
              />
              <View
                style={{
                  width: BAR_WIDTH,
                  height: barHeight,
                  borderRadius: BAR_WIDTH / 2,
                  backgroundColor: isHot ? accentColor : color,
                  opacity: 0.3 + (1 - distFromCenter) * 0.7,
                }}
              />
            </View>
          );
        })}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    width: "100%",
    paddingHorizontal: 20,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
});
