import { spacing } from './spacing';

/**
 * ScrollView content padding so the last item clears the custom `BottomTabBar`.
 * Without this (or with SafeAreaView `bottom` inset) you get a dead zone above the tab bar.
 */
export const scrollPaddingAboveMainTabBar =
  spacing.sm + 36 + spacing.xs + 12 + spacing.base + spacing.lg;
