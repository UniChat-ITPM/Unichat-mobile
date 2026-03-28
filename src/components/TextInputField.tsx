import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
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
  inputWrapperStyle,
  /** When set, keeps vertical space under the field stable when error shows/hides (helps Android keyboard). */
  errorSlotMinHeight,
  leftElement,
  rightElement,
  editable = true,
  onFocus,
  onBlur,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <View
      style={[styles.container, style]}
      collapsable={Platform.OS === 'android' ? false : undefined}
    >
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          errorText && styles.inputWrapperError,
          !editable && styles.inputWrapperDisabled,
          inputWrapperStyle,
        ]}
        collapsable={Platform.OS === 'android' ? false : undefined}
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
          underlineColorAndroid="transparent"
          blurOnSubmit={false}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {rightElement && (
          <View style={styles.rightElement}>{rightElement}</View>
        )}
      </View>

      {errorSlotMinHeight != null ? (
        <View style={[styles.errorSlot, { minHeight: errorSlotMinHeight }]}>
          {errorText ? (
            <Text style={styles.errorText}>{errorText}</Text>
          ) : null}
        </View>
      ) : errorText ? (
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
  errorSlot: {
    justifyContent: 'flex-start',
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizeXS,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});

export default TextInputField;
