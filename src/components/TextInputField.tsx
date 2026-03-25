import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

const TextInputField = ({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'none',
  maxLength,
  errorText,
  style,
  inputStyle,
  leftElement,
  rightElement,
  editable = true,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          errorText && styles.inputWrapperError,
          !editable && styles.inputWrapperDisabled,
        ]}
      >
        {leftElement && (
          <View style={styles.leftElement}>{leftElement}</View>
        )}

        <TextInput
          style={[styles.input, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {rightElement && (
          <View style={styles.rightElement}>{rightElement}</View>
        )}
      </View>

      {errorText ? (
        <Text style={styles.errorText}>{errorText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    letterSpacing: typography.letterSpacingWide,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    minHeight: 56,
  },
  inputWrapperFocused: {
    borderColor: colors.borderFocus,
    backgroundColor: '#F0F0FF',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: colors.error,
  },
  inputWrapperDisabled: {
    opacity: 0.6,
    backgroundColor: '#F3F4F6',
  },
  input: {
    flex: 1,
    fontSize: typography.fontSizeLG,
    color: colors.textPrimary,
    fontWeight: typography.fontWeightMedium,
    paddingVertical: spacing.md,
  },
  leftElement: {
    marginRight: spacing.sm,
  },
  rightElement: {
    marginLeft: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizeXS,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});

export default TextInputField;
