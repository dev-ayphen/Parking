import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import type { ColorsType } from '../theme';
import { FontSize, FontWeight, BorderRadius, Spacing } from '../theme';

interface ReportSubmittedProps {
  /** Headline, e.g. "Report Submitted" or "Incident Reported" */
  title?: string;
  /** Reference code, e.g. "ABU-00482" */
  reference: string;
  /** ISO timestamp of submission; defaults to now */
  submittedAt?: string;
}

/**
 * Structured post-submission confirmation card — used after abuse / incident
 * reports so the user sees a trustworthy "it went through" receipt with a
 * reference number and timestamp they can quote to support.
 */
export default function ReportSubmitted({
  title = 'Report Submitted',
  reference,
  submittedAt,
}: ReportSubmittedProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const date = submittedAt ? new Date(submittedAt) : new Date();
  const stamp = `${date.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })} • ${date.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })}`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <CheckCircle2 size={20} color={colors.success} strokeWidth={2.5} />
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Reference</Text>
        <Text style={styles.reference}>{reference}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Submitted</Text>
        <Text style={styles.value}>{stamp}</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  card: {
    backgroundColor: colors.successBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.success,
    padding: Spacing.screenH,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: colors.success,
  },
  field: {
    marginTop: Spacing.md,
  },
  label: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  reference: {
    fontSize: FontSize.xl,
    color: colors.textPrimary,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: FontSize.base,
    color: colors.textBody,
    fontWeight: FontWeight.semibold,
  },
});
