import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Kart / yükseltilmiş yüzey — hafif derinlik */
export const shadowCard: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#120a1f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
  },
  android: { elevation: 4 },
  default: {},
}) as ViewStyle;

export const shadowSoft: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#120a1f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
  default: {},
}) as ViewStyle;

export const displayTitle: TextStyle = {
  fontSize: 32,
  fontWeight: '800',
  letterSpacing: -0.8,
  lineHeight: 38,
};

export const sectionKicker: TextStyle = {
  fontSize: 11,
  fontWeight: '700',
  letterSpacing: 1.4,
  textTransform: 'uppercase' as const,
};
