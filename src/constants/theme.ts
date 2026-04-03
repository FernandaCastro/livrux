// Design system: colors, typography, spacing, and border radii for the Livrux app.
// Target audience: families with kids — warm, playful, and legible.

export const Colors = {
  // Brand
  primary: '#F5A623',       // warm gold — the Livrux coin color
  primaryLight: '#FFD580',
  primaryDark: '#C4800B',

  secondary: '#7B5EA7',     // playful purple
  secondaryLight: '#B09AC8',
  secondaryDark: '#5A3D85',

  accent: '#FF6B6B',        // coral — highlights and CTAs
  accentLight: '#FFA5A5',

  // Neutral
  background: '#FAFAF7',    // off-white — softer than pure white
  surface: '#FFFFFF',
  surfaceVariant: '#F0EDF8', // light purple tint for cards

  // Text
  textPrimary: '#2D2D2D',
  textSecondary: '#7A7A7A',
  textDisabled: '#BDBDBD',
  textOnPrimary: '#FFFFFF',

  // Feedback
  success: '#4CAF50',
  error: '#E53935',
  warning: '#FB8C00',
  info: '#1E88E5',

  // Borders and dividers
  border: '#E8E4F0',
  divider: '#F0EDF8',

  // Coin / Livrux brand
  coin: '#F5A623',
  coinShadow: '#C4800B',
} as const;

export const Fonts = {
  heading: 'FredokaOne_400Regular',
  body: 'Nunito_400Regular',
  bodySemiBold: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyExtraBold: 'Nunito_800ExtraBold',
} as const;

export const FontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 38,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#7B5EA7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#7B5EA7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#7B5EA7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;
