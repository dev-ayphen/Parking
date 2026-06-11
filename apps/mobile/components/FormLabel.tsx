import React from 'react';
import { Text, StyleSheet, TextProps } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface FormLabelProps extends TextProps {
  children: string;
  required?: boolean;
}

const FormLabel = React.forwardRef<Text, FormLabelProps>(
  ({ children, required = false, style, ...props }, ref) => {
    const theme = useTheme();

    return (
      <Text ref={ref} style={[styles.label, { color: theme.colors.textSecondary }, style]} {...props}>
        {children}
        {required ? (
          <Text style={[styles.asterisk, { color: theme.colors.error }]}> *</Text>
        ) : (
          <Text style={[styles.optional, { color: theme.colors.textMuted }]}> (Optional)</Text>
        )}
      </Text>
    );
  }
);

FormLabel.displayName = 'FormLabel';

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  asterisk: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 2,
  },
  optional: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 2,
  },
});

export default FormLabel;
