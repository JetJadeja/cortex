import { Platform } from "react-native";

export const colors = {
  background: "#fbf9f5",
  surface: "#ffffff",
  surfaceLight: "#f5f3ef",
  primary: "#252790",
  primaryLight: "#3d3fba",
  text: "#1a1a2e",
  textSecondary: "#8a8a8a",
  textMuted: "#b5b0a8",
  border: "#d4d0c8",
  error: "#d4564e",
  success: "#6b9e78",
  recording: "#FF4444",
  radialTickIdle: "#b5b0a8",
  radialTickActive: "#252790",
  radialOrbit: "#d4d0c8",
  radialPulse: "rgba(37,39,144,0.2)",
} as const;

export const fontFamily = {
  serif: "Newsreader_400Regular",
  serifItalic: "Newsreader_400Regular_Italic",
  serifBold: "Newsreader_700Bold",
  sans: "Manrope_400Regular",
  sansMedium: "Manrope_500Medium",
  sansSemiBold: "Manrope_600SemiBold",
  sansBold: "Manrope_700Bold",
  mono: Platform.select({ ios: "Menlo", default: "monospace" }),
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  title: 40,
} as const;

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const shadow = {
  card: {
    shadowColor: "#1a1a4e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardLarge: {
    shadowColor: "#1a1a4e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;
