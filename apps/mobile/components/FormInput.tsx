import React, { forwardRef, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  TextInputProps,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface FormInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  required?: boolean;
  error?: string;
  leftElement?: React.ReactNode;
}

const FormInput = forwardRef<TextInput, FormInputProps>(
  (
    {
      label,
      required = false,
      error,
      leftElement,
      onFocus,
      onBlur,
      editable = true,
      ...textInputProps
    },
    ref
  ) => {
    // A multiline field (e.g. a full address) needs a TALLER box that grows with
    // the text and aligns content to the TOP — otherwise the fixed single-line
    // height clips the text and alignItems:'center' hides the first/last lines.
    const isMultiline = !!textInputProps.multiline;
    const rows = isMultiline ? (textInputProps.numberOfLines ?? 3) : 1;
    const theme = useTheme();
    const focusAnim = useRef(new Animated.Value(0)).current;

    const handleFocus = (e: any) => {
      if (editable) {
        Animated.timing(focusAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      Animated.timing(focusAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
      onBlur?.(e);
    };

    const borderColor = error
      ? theme.colors.error
      : focusAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [theme.colors.borderLight, theme.colors.primary],
        });

    const backgroundColor = error ? theme.colors.errorBg : theme.colors.inputBg;

    return (
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {label}
          {required && <Text style={[styles.asterisk, { color: theme.colors.error }]}> *</Text>}
        </Text>

        <Animated.View
          style={[
            styles.inputBox,
            isMultiline && {
              // Grow with content instead of clipping; ~22px per line + padding.
              height: undefined,
              minHeight: 22 * rows + 20,
              alignItems: 'stretch',
              paddingVertical: 10,
            },
            {
              borderColor,
              backgroundColor,
            },
          ]}
        >
          {leftElement}
          <TextInput
            ref={ref}
            style={[
              styles.textInput,
              { color: theme.colors.textPrimary },
              // Multiline text must flow from the TOP, not be vertically centered.
              isMultiline && { textAlignVertical: 'top', paddingTop: 0 },
            ]}
            placeholderTextColor={theme.colors.textMuted}
            editable={editable}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...textInputProps}
          />
        </Animated.View>

        {error && <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>}
      </View>
    );
  }
);

FormInput.displayName = 'FormInput';

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  asterisk: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 2,
  },
  inputBox: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  errorText: {
    marginTop: 4,
    marginLeft: 2,
    fontSize: 11,
    fontWeight: '500',
  },
});

export default FormInput;
