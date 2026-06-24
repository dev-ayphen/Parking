import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, Spacing } from '../../theme';

export type SessionStep = 'arrived' | 'check' | 'verify' | 'active' | 'done';

const STEPS: { key: SessionStep; label: string }[] = [
  { key: 'arrived', label: 'Arrive' },
  { key: 'check', label: 'Check' },
  { key: 'verify', label: 'Verify' },
  { key: 'active', label: 'Parked' },
  { key: 'done', label: 'Done' },
];

interface Props {
  /** The current step in the session flow. */
  current: SessionStep;
}

/**
 * Horizontal progress tracker for the parking session, like an Uber/Swiggy order
 * tracker. Shows the parker exactly where they are: Arrive → Check → Verify →
 * Parked → Done. Completed steps get a check, the current step is highlighted,
 * upcoming steps are muted.
 */
const SessionStepper: React.FC<Props> = ({ current }) => {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <View style={styles.wrap}>
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const isLast = i === STEPS.length - 1;
        return (
          <React.Fragment key={step.key}>
            <View style={styles.stepCol}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  active && styles.dotActive,
                ]}
              >
                {done ? (
                  <Check size={12} color={Colors.white} strokeWidth={3} />
                ) : (
                  <Text style={[styles.dotNum, active && styles.dotNumActive]}>{i + 1}</Text>
                )}
              </View>
              <Text
                style={[styles.label, (done || active) && styles.labelOn]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
            {!isLast && <View style={[styles.line, done && styles.lineDone]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const DOT = 26;

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.lg,
  },
  stepCol: { alignItems: 'center', width: 44 },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: Colors.surfaceBg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  dotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dotNum: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textMuted },
  dotNumActive: { color: Colors.white },
  label: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
    marginTop: 5,
  },
  labelOn: { color: Colors.textPrimary, fontWeight: FontWeight.bold },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginTop: DOT / 2 - 1,
    borderRadius: 1,
  },
  lineDone: { backgroundColor: Colors.success },
});

export default SessionStepper;
