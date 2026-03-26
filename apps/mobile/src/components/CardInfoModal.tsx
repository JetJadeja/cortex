import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { colors, fontFamily, spacing, fontSize, borderRadius, shadow } from "../constants/theme";
import { formatTimeAgo, formatDueIn } from "../lib/explore-helpers";
import type { Card, CardType } from "../lib/cards";

/* ── Character limits from process-transcript.md ── */
const FRONT_MAX = 140;
const FRONT_SOFT = 100;
const BACK_MAX = 300;
const BACK_SOFT = 200;

interface CardInfoModalProps {
  card: Card | null;
  visible: boolean;
  lastReviewed: string | null;
  onEdit: (cardId: string, front: string, back: string) => void;
  onDelete: (cardId: string) => void;
  onClose: () => void;
}

const typeConfig: Record<CardType, { label: string; color: string }> = {
  flashcard: { label: "Flashcard", color: "#252790" },
  explain_aloud: { label: "Explain Aloud", color: "#2d7d5f" },
  scenario: { label: "Scenario", color: "#a68529" },
  connection: { label: "Connection", color: "#b85c3a" },
};

export function CardInfoModal({
  card,
  visible,
  lastReviewed,
  onEdit,
  onDelete,
  onClose,
}: CardInfoModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [editingField, setEditingField] = useState<"front" | "back" | null>(null);

  useEffect(() => {
    if (card) {
      setFront(card.front);
      setBack(card.back);
      setIsEditing(false);
      setEditingField(null);
    }
  }, [card]);

  if (!card) return null;

  const hasChanges = front !== card.front || back !== card.back;
  const frontOverLimit = front.length > FRONT_MAX;
  const backOverLimit = back.length > BACK_MAX;
  const canSave = hasChanges
    && front.trim().length > 0
    && back.trim().length > 0
    && !frontOverLimit
    && !backOverLimit;
  const config = typeConfig[card.card_type] ?? { label: card.card_type, color: colors.textSecondary };

  const handleSave = () => {
    if (!canSave) return;
    onEdit(card.id, front.trim(), back.trim());
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert("Delete card", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(card.id) },
    ]);
  };

  const handleFieldDone = (field: "front" | "back", value: string) => {
    if (field === "front") setFront(value);
    else setBack(value);
    setEditingField(null);
  };

  return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable style={styles.overlay} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close modal">
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handleRow}>
              <View style={styles.handle} />
              <Pressable
                style={styles.closeBtn}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
              >
                <Text style={styles.closeBtnText}>Done</Text>
              </Pressable>
            </View>

            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {isEditing ? (
                <EditView
                  card={card}
                  config={config}
                  front={front}
                  back={back}
                  canSave={canSave}
                  onTapField={setEditingField}
                  onSave={handleSave}
                  onCancel={() => {
                    setFront(card.front);
                    setBack(card.back);
                    setIsEditing(false);
                  }}
                />
              ) : (
                <InfoView
                  card={card}
                  config={config}
                  lastReviewed={lastReviewed}
                  onEdit={() => setIsEditing(true)}
                  onDelete={handleDelete}
                />
              )}
            </ScrollView>
          </Pressable>
        </Pressable>

        {/* Field editor — nested inside main Modal so iOS can present it on top */}
        <FieldEditorModal
          visible={editingField !== null}
          label={editingField === "front" ? "QUESTION" : "ANSWER"}
          value={editingField === "front" ? front : back}
          maxLength={editingField === "front" ? FRONT_MAX : BACK_MAX}
          softLimit={editingField === "front" ? FRONT_SOFT : BACK_SOFT}
          accentColor={config.color}
          onDone={(value) => handleFieldDone(editingField ?? "front", value)}
          onCancel={() => setEditingField(null)}
        />
      </Modal>
  );
}

/* ── Field Editor Modal ── */

function FieldEditorModal({
  visible,
  label,
  value,
  maxLength,
  softLimit,
  accentColor,
  onDone,
  onCancel,
}: {
  visible: boolean;
  label: string;
  value: string;
  maxLength: number;
  softLimit: number;
  accentColor: string;
  onDone: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setDraft(value);
      // Delay focus to let modal animate in
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [visible, value]);

  if (!visible) return null;

  const count = draft.length;
  const overLimit = count > maxLength;
  const nearLimit = count > softLimit;
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
        style={styles.fieldEditorWrap}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.fieldEditorBackdrop} onPress={onCancel} />
        <View style={styles.fieldEditorCard}>
          {/* Header */}
          <View style={styles.fieldEditorHeader}>
            <Pressable onPress={onCancel} hitSlop={8}>
              <Text style={styles.fieldEditorCancel}>Cancel</Text>
            </Pressable>
            <View style={[styles.fieldEditorLabelPill, { backgroundColor: accentColor + "1A" }]}>
              <Text style={[styles.fieldEditorLabel, { color: accentColor }]}>{label}</Text>
            </View>
            <Pressable
              onPress={() => onDone(draft)}
              hitSlop={8}
              disabled={overLimit}
            >
              <Text style={[
                styles.fieldEditorDone,
                (!hasChanged || overLimit) && styles.fieldEditorDoneDisabled,
              ]}>
                {hasChanged ? "Apply" : "Done"}
              </Text>
            </Pressable>
          </View>

          {/* Input */}
          <TextInput
            ref={inputRef}
            style={styles.fieldEditorInput}
            value={draft}
            onChangeText={setDraft}
            multiline
            autoFocus={false}
            placeholder={label === "QUESTION" ? "Write your question..." : "Write the answer..."}
            placeholderTextColor={colors.textMuted}
            selectionColor={accentColor + "80"}
          />

          {/* Footer — character count */}
          <View style={styles.fieldEditorFooter}>
            <View style={styles.fieldEditorCountRow}>
              <Text style={[styles.fieldEditorCount, { color: countColor }]}>
                {count}
              </Text>
              <Text style={styles.fieldEditorCountSep}>/</Text>
              <Text style={styles.fieldEditorCountMax}>{maxLength}</Text>
            </View>
            {overLimit && (
              <Text style={styles.fieldEditorWarning}>
                {count - maxLength} over limit
              </Text>
            )}
            {!overLimit && nearLimit && (
              <Text style={[styles.fieldEditorHint, { color: "#a68529" }]}>
                Aim for under {softLimit}
              </Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ── Info View ── */

function InfoView({
  card,
  config,
  lastReviewed,
  onEdit,
  onDelete,
}: {
  card: Card;
  config: { label: string; color: string };
  lastReviewed: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.body}>
      {/* Type badge */}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: config.color + "1A" }]}>
          <View style={[styles.badgeDot, { backgroundColor: config.color }]} />
          <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>

      {/* Question */}
      <Text style={styles.questionLabel}>QUESTION</Text>
      <Text style={styles.questionText}>{card.front}</Text>

      {/* Answer */}
      <Text style={styles.answerLabel}>ANSWER</Text>
      <Text style={styles.answerText}>{card.back}</Text>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Meta grid */}
      <View style={styles.metaGrid}>
        <MetaCell label="Added" value={formatTimeAgo(card.created_at)} />
        <MetaCell
          label="Last reviewed"
          value={lastReviewed ? formatTimeAgo(lastReviewed) : "Never"}
        />
        <MetaCell label="Next due" value={formatDueIn(card.due_at)} />
        <MetaCell label="Stability" value={`${card.stability.toFixed(1)}d`} />
        <MetaCell label="Difficulty" value={card.difficulty.toFixed(2)} />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.editBtn, pressed && styles.btnPressed]}
          onPress={onEdit}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.deleteBtn, pressed && styles.btnPressed]}
          onPress={onDelete}
        >
          <Text style={styles.deleteBtnText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ── Edit View (tappable field cards, no inline inputs) ── */

function EditView({
  card,
  config,
  front,
  back,
  canSave,
  onTapField,
  onSave,
  onCancel,
}: {
  card: Card;
  config: { label: string; color: string };
  front: string;
  back: string;
  canSave: boolean;
  onTapField: (field: "front" | "back") => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const frontChanged = front !== card.front;
  const backChanged = back !== card.back;
  const frontOver = front.length > FRONT_MAX;
  const backOver = back.length > BACK_MAX;

  return (
    <View style={styles.body}>
      {/* Header badges */}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: config.color + "1A" }]}>
          <View style={[styles.badgeDot, { backgroundColor: config.color }]} />
          <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
        </View>
        <View style={styles.editingBadge}>
          <Text style={styles.editingBadgeText}>Editing</Text>
        </View>
      </View>

      {/* Front — tappable */}
      <Pressable
        style={({ pressed }) => [
          styles.editFieldCard,
          frontChanged && styles.editFieldChanged,
          frontOver && styles.editFieldError,
          pressed && styles.editFieldPressed,
        ]}
        onPress={() => onTapField("front")}
      >
        <View style={styles.editFieldHeader}>
          <Text style={styles.editFieldLabel}>QUESTION</Text>
          <View style={styles.editFieldMeta}>
            {frontChanged && !frontOver && (
              <View style={[styles.changedDot, { backgroundColor: config.color }]} />
            )}
            <Text style={[
              styles.editFieldCount,
              frontOver && { color: colors.error },
            ]}>
              {front.length}/{FRONT_MAX}
            </Text>
          </View>
        </View>
        <Text
          style={[styles.editFieldText, frontOver && { color: colors.error }]}
          numberOfLines={3}
        >
          {front || "Tap to edit..."}
        </Text>
        <Text style={styles.editFieldTapHint}>Tap to edit</Text>
      </Pressable>

      {/* Back — tappable */}
      <Pressable
        style={({ pressed }) => [
          styles.editFieldCard,
          backChanged && styles.editFieldChanged,
          backOver && styles.editFieldError,
          pressed && styles.editFieldPressed,
        ]}
        onPress={() => onTapField("back")}
      >
        <View style={styles.editFieldHeader}>
          <Text style={styles.editFieldLabel}>ANSWER</Text>
          <View style={styles.editFieldMeta}>
            {backChanged && !backOver && (
              <View style={[styles.changedDot, { backgroundColor: config.color }]} />
            )}
            <Text style={[
              styles.editFieldCount,
              backOver && { color: colors.error },
            ]}>
              {back.length}/{BACK_MAX}
            </Text>
          </View>
        </View>
        <Text
          style={[styles.editFieldText, backOver && { color: colors.error }]}
          numberOfLines={4}
        >
          {back || "Tap to edit..."}
        </Text>
        <Text style={styles.editFieldTapHint}>Tap to edit</Text>
      </Pressable>

      {/* Actions */}
      <View style={styles.editActions}>
        <Pressable
          style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
          onPress={onCancel}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            !canSave && styles.disabled,
            pressed && canSave && styles.btnPressed,
          ]}
          onPress={onSave}
          disabled={!canSave}
        >
          <Text style={styles.saveBtnText}>{canSave ? "Save changes" : "Save"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ── Meta Cell ── */

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCell}>
      <Text style={styles.metaCellLabel}>{label}</Text>
      <Text style={styles.metaCellValue}>{value}</Text>
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
    maxHeight: "85%",
    ...shadow.cardLarge,
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    right: spacing.md,
    top: 10,
  },
  closeBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },

  /* Type badge */
  badgeRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  /* Question */
  questionLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  questionText: {
    fontFamily: fontFamily.serif,
    fontSize: 18,
    lineHeight: 26,
    color: colors.text,
  },

  /* Answer */
  answerLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  answerText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    lineHeight: 22,
    color: colors.textSecondary,
  },

  /* Divider */
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },

  /* Meta grid */
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metaCell: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: "47%",
    flexGrow: 1,
    gap: 2,
  },
  metaCellLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  metaCellValue: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.sm,
    color: colors.text,
  },

  /* Info actions */
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: borderRadius.md,
  },
  btnPressed: {
    opacity: 0.7,
  },
  editBtn: {
    backgroundColor: colors.surfaceLight,
  },
  editBtnText: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  deleteBtn: {
    backgroundColor: "rgba(212, 86, 78, 0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212, 86, 78, 0.25)",
  },
  deleteBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.error,
  },

  /* Edit mode — tappable field cards */
  editingBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  editingBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  editFieldCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  editFieldChanged: {
    borderColor: colors.primary + "50",
  },
  editFieldError: {
    borderColor: colors.error + "60",
  },
  editFieldPressed: {
    backgroundColor: colors.surfaceLight,
  },
  editFieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editFieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.textMuted,
  },
  editFieldMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  changedDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  editFieldCount: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },
  editFieldText: {
    fontSize: fontSize.md,
    lineHeight: 22,
    color: colors.text,
  },
  editFieldTapHint: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
  },
  cancelBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.text,
  },
  disabled: {
    opacity: 0.4,
  },

  /* Field editor modal */
  fieldEditorWrap: {
    flex: 1,
    justifyContent: "flex-start",
  },
  fieldEditorBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  fieldEditorCard: {
    marginTop: 60,
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    ...shadow.cardLarge,
  },
  fieldEditorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  fieldEditorCancel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  fieldEditorLabelPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  fieldEditorLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  fieldEditorDone: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.primary,
  },
  fieldEditorDoneDisabled: {
    color: colors.textMuted,
  },
  fieldEditorInput: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontSize: 17,
    lineHeight: 26,
    color: colors.text,
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: "top",
  },
  fieldEditorFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  fieldEditorCountRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  fieldEditorCount: {
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  fieldEditorCountSep: {
    fontSize: 13,
    color: colors.textMuted,
    marginHorizontal: 1,
  },
  fieldEditorCountMax: {
    fontSize: 13,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  fieldEditorWarning: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.error,
  },
  fieldEditorHint: {
    fontSize: 12,
    fontWeight: "500",
  },
});
