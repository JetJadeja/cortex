import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { colors, fontFamily, spacing, fontSize, borderRadius, shadow } from "../constants/theme";

const TITLE_MAX = 100;
const TITLE_SOFT = 60;
const ACCENT = colors.primary;

type Mode = "actions" | "confirmDelete";

interface SessionTarget {
  sessionId: string;
  title: string;
  cardCount: number;
  timestamp: string;
}

interface SessionActionModalProps {
  session: SessionTarget | null;
  visible: boolean;
  onRename: (sessionId: string, newTitle: string | null) => Promise<void>;
  onDelete: (sessionId: string) => Promise<void>;
  onClose: () => void;
}

export function SessionActionModal({
  session,
  visible,
  onRename,
  onDelete,
  onClose,
}: SessionActionModalProps) {
  const [mode, setMode] = useState<Mode>("actions");
  const [isRenaming, setIsRenaming] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (session) {
      setMode("actions");
      setIsRenaming(false);
      setIsPending(false);
    }
  }, [session]);

  if (!session) return null;

  const handleRenameDone = async (value: string) => {
    const trimmed = value.trim();
    const newTitle = trimmed.length > 0 ? trimmed : null;
    const isUnchanged =
      newTitle === session.title ||
      (newTitle === null && session.title === "Untitled session");
    if (isUnchanged) {
      setIsRenaming(false);
      return;
    }
    setIsPending(true);
    try {
      await onRename(session.sessionId, newTitle);
      setIsRenaming(false);
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await onDelete(session.sessionId);
    } finally {
      setIsPending(false);
    }
  };

  const handleClose = () => {
    if (isPending) return;
    if (mode !== "actions") {
      setMode("actions");
      return;
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={mode === "confirmDelete" ? undefined : handleClose}
        accessibilityRole="button"
        accessibilityLabel="Close modal"
      >
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {mode === "actions" && (
            <ActionsView
              session={session}
              onRename={() => setIsRenaming(true)}
              onDelete={() => setMode("confirmDelete")}
              onClose={onClose}
            />
          )}

          {mode === "confirmDelete" && (
            <ConfirmDeleteView
              session={session}
              isPending={isPending}
              onConfirm={handleDelete}
              onCancel={() => setMode("actions")}
            />
          )}
        </Pressable>
      </Pressable>

      <RenameEditorModal
        visible={isRenaming}
        value={session.title === "Untitled session" ? "" : session.title}
        isPending={isPending}
        onDone={handleRenameDone}
        onCancel={() => setIsRenaming(false)}
      />
    </Modal>
  );
}

/* ── Actions View ── */

function ActionsView({
  session,
  onRename,
  onDelete,
  onClose,
}: {
  session: SessionTarget;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.body}>
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionTitle} numberOfLines={2}>
          {session.title}
        </Text>
        {session.timestamp !== "" && (
          <Text style={styles.sessionTimestamp}>{session.timestamp}</Text>
        )}
        <Text style={styles.sessionMeta}>
          {session.cardCount} {session.cardCount === 1 ? "card" : "cards"}
        </Text>
      </View>

      <View style={styles.divider} />

      <Pressable
        style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
        onPress={onRename}
      >
        <Text style={styles.actionText}>Rename</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
        onPress={onDelete}
      >
        <Text style={styles.actionTextDestructive}>Delete session</Text>
      </Pressable>

      <View style={styles.divider} />

      <Pressable
        style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
        onPress={onClose}
      >
        <Text style={styles.actionTextMuted}>Cancel</Text>
      </Pressable>
    </View>
  );
}

/* ── Rename Editor Modal (matches CardInfoModal's FieldEditorModal) ── */

function RenameEditorModal({
  visible,
  value,
  isPending,
  onDone,
  onCancel,
}: {
  visible: boolean;
  value: string;
  isPending: boolean;
  onDone: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setDraft(value);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [visible, value]);

  if (!visible) return null;

  const count = draft.length;
  const overLimit = count > TITLE_MAX;
  const nearLimit = count > TITLE_SOFT;
  const hasChanged = draft !== value;

  const countColor = overLimit
    ? colors.error
    : nearLimit
      ? "#a68529"
      : colors.textMuted;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.editorWrap}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.editorBackdrop} onPress={onCancel} />
        <View style={styles.editorCard}>
          <View style={styles.editorHeader}>
            <Pressable onPress={onCancel} hitSlop={8} disabled={isPending}>
              <Text style={styles.editorCancel}>Cancel</Text>
            </Pressable>
            <View style={[styles.editorLabelPill, { backgroundColor: ACCENT + "1A" }]}>
              <Text style={[styles.editorLabel, { color: ACCENT }]}>TITLE</Text>
            </View>
            <Pressable
              onPress={() => onDone(draft)}
              hitSlop={8}
              disabled={overLimit || isPending}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={ACCENT} />
              ) : (
                <Text
                  style={[
                    styles.editorDone,
                    (!hasChanged || overLimit) && styles.editorDoneDisabled,
                  ]}
                >
                  {hasChanged ? "Save" : "Done"}
                </Text>
              )}
            </Pressable>
          </View>

          <TextInput
            ref={inputRef}
            style={styles.editorInput}
            value={draft}
            onChangeText={setDraft}
            autoFocus={false}
            placeholder="Session title"
            placeholderTextColor={colors.textMuted}
            selectionColor={ACCENT + "80"}
            autoCorrect={false}
            autoCapitalize="sentences"
            returnKeyType="done"
            onSubmitEditing={hasChanged && !overLimit ? () => onDone(draft) : undefined}
            editable={!isPending}
          />

          <View style={styles.editorFooter}>
            <View style={styles.editorCountRow}>
              <Text style={[styles.editorCount, { color: countColor }]}>
                {count}
              </Text>
              <Text style={styles.editorCountSep}>/</Text>
              <Text style={styles.editorCountMax}>{TITLE_MAX}</Text>
            </View>
            {overLimit && (
              <Text style={styles.editorWarning}>
                {count - TITLE_MAX} over limit
              </Text>
            )}
            {!overLimit && nearLimit && (
              <Text style={[styles.editorHint, { color: "#a68529" }]}>
                Aim for under {TITLE_SOFT}
              </Text>
            )}
            {!overLimit && !nearLimit && count === 0 && (
              <Text style={styles.editorHint}>
                Empty resets to "Untitled session"
              </Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ── Confirm Delete View ── */

function ConfirmDeleteView({
  session,
  isPending,
  onConfirm,
  onCancel,
}: {
  session: SessionTarget;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.body}>
      <View style={styles.confirmHeader}>
        <Text style={styles.confirmTitle}>Delete session?</Text>
        <Text style={styles.confirmSubtitle}>
          This will permanently remove "{session.title}" and its{" "}
          {session.cardCount} {session.cardCount === 1 ? "card" : "cards"}.
          This can't be undone.
        </Text>
      </View>

      <View style={styles.confirmActions}>
        <Pressable
          style={({ pressed }) => [
            styles.confirmBtn,
            styles.confirmCancelBtn,
            pressed && styles.btnPressed,
          ]}
          onPress={onCancel}
          disabled={isPending}
        >
          <Text style={styles.confirmCancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.confirmBtn,
            styles.confirmDeleteBtn,
            pressed && !isPending && styles.btnPressed,
            isPending && styles.disabled,
          ]}
          onPress={onConfirm}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Text style={styles.confirmDeleteText}>Delete</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  /* Main sheet */
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...shadow.cardLarge,
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 40,
  },

  /* Actions */
  sessionInfo: {
    gap: 4,
    marginBottom: spacing.sm,
  },
  sessionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
    textTransform: "capitalize",
  },
  sessionTimestamp: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  sessionMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  actionRow: {
    paddingVertical: 14,
    borderRadius: borderRadius.sm,
  },
  rowPressed: {
    backgroundColor: colors.surfaceLight,
  },
  actionText: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
  },
  actionTextDestructive: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.error,
  },
  actionTextMuted: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },

  /* Rename editor modal */
  editorWrap: {
    flex: 1,
    justifyContent: "flex-start",
  },
  editorBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  editorCard: {
    marginTop: 60,
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    ...shadow.cardLarge,
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  editorCancel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  editorLabelPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  editorLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  editorDone: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.primary,
  },
  editorDoneDisabled: {
    color: colors.textMuted,
  },
  editorInput: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontSize: 17,
    lineHeight: 26,
    color: colors.text,
    minHeight: 56,
  },
  editorFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  editorCountRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  editorCount: {
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  editorCountSep: {
    fontSize: 13,
    color: colors.textMuted,
    marginHorizontal: 1,
  },
  editorCountMax: {
    fontSize: 13,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  editorWarning: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.error,
  },
  editorHint: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
  },

  /* Confirm delete */
  confirmHeader: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  confirmTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
  },
  confirmSubtitle: {
    fontSize: fontSize.sm,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  confirmActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  confirmBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: borderRadius.md,
  },
  btnPressed: {
    opacity: 0.7,
  },
  confirmCancelBtn: {
    backgroundColor: colors.surfaceLight,
  },
  confirmCancelText: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.text,
  },
  confirmDeleteBtn: {
    backgroundColor: "rgba(212, 86, 78, 0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212, 86, 78, 0.25)",
  },
  confirmDeleteText: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.error,
  },
  disabled: {
    opacity: 0.4,
  },
});
