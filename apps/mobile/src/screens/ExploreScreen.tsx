import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";
import { supabase } from "../lib/supabase";

interface Recording {
  id: string;
  title: string;
  created_at: string;
  duration_seconds: number;
}

export const ExploreScreen: React.FC = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecordings() {
      const { data, error } = await supabase
        .from("recordings")
        .select("id, title, created_at, duration_seconds")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setRecordings(data);
      }
      setLoading(false);
    }

    fetchRecordings();
  }, []);

  const renderItem = ({ item }: { item: Recording }) => (
    <Pressable style={styles.card}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardMeta}>
        {new Date(item.created_at).toLocaleDateString()} ·{" "}
        {Math.round(item.duration_seconds / 60)} min
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore</Text>
      {loading ? (
        <Text style={styles.empty}>Loading recordings...</Text>
      ) : recordings.length === 0 ? (
        <Text style={styles.empty}>No recordings yet. Start by recording something.</Text>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  cardMeta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  empty: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xxl,
  },
});
