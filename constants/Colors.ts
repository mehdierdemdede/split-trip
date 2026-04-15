/**
 * SplitTrip — “gece rotası” paleti: mürdüm ana ton, sıcak kum zemin, altın vurgu.
 * Generic teal yerine ayırt edici, okunaklı light/dark çifti.
 */
export type AppColors = {
  text: string;
  textSecondary: string;
  textMuted: string;
  background: string;
  surface: string;
  surfaceSecondary: string;
  border: string;
  borderStrong: string;
  tint: string;
  tintSecondary: string;
  tabIconDefault: string;
  tabIconSelected: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBorder: string;
  success: string;
  chipBg: string;
  chipBgActive: string;
  chipBorder: string;
  inputBg: string;
  primaryButtonText: string;
  accentLine: string;
};

const light: AppColors = {
  text: '#17131f',
  textSecondary: '#4a4358',
  textMuted: '#7d7589',
  background: '#e6e1da',
  surface: '#fdfcfa',
  surfaceSecondary: '#f3efe8',
  border: '#d4cdc3',
  borderStrong: '#b8b0a4',
  tint: '#4c3f6b',
  tintSecondary: '#6b5b8c',
  tabIconDefault: '#a39aaf',
  tabIconSelected: '#4c3f6b',
  warning: '#a16207',
  warningBg: 'rgba(161, 98, 7, 0.12)',
  danger: '#b91c1c',
  dangerBorder: 'rgba(185, 28, 28, 0.4)',
  success: '#0f766e',
  chipBg: 'rgba(76, 63, 107, 0.08)',
  chipBgActive: 'rgba(76, 63, 107, 0.2)',
  chipBorder: 'rgba(76, 63, 107, 0.22)',
  inputBg: '#ffffff',
  primaryButtonText: '#ffffff',
  accentLine: '#c9a227',
};

const dark: AppColors = {
  text: '#f4f2f7',
  textSecondary: '#b8b0c8',
  textMuted: '#8a8299',
  background: '#0f0d14',
  surface: '#1a1724',
  surfaceSecondary: '#232030',
  border: '#322b42',
  borderStrong: '#4a405f',
  tint: '#a78bfa',
  tintSecondary: '#c4b5fd',
  tabIconDefault: '#6b6578',
  tabIconSelected: '#a78bfa',
  warning: '#fbbf24',
  warningBg: 'rgba(251, 191, 36, 0.12)',
  danger: '#f87171',
  dangerBorder: 'rgba(248, 113, 113, 0.45)',
  success: '#34d399',
  chipBg: 'rgba(167, 139, 250, 0.12)',
  chipBgActive: 'rgba(167, 139, 250, 0.28)',
  chipBorder: 'rgba(167, 139, 250, 0.35)',
  inputBg: '#1a1724',
  primaryButtonText: '#0f0d14',
  accentLine: '#d4a853',
};

/** @deprecated Eski API uyumu — yeni kodda AppColors kullanın */
export default {
  light: {
    ...light,
  },
  dark: {
    ...dark,
  },
} as const;
