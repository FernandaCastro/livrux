// Design system: colors, typography, spacing, and border radii for the Livrux app.
// Target audience: families with kids — warm, playful, and legible.

export type ThemeId = 'classic' | 'noite' | 'indigo';

export const Colors = {
  // Brand — orange is the coin/reward accent; purple is the dominant brand color
  primary: '#F5A623',       // warm gold — the Livrux coin color
  primaryLight: '#FFD580',
  primaryDark: '#C4800B',

  secondary: '#7C3AED',     // vibrant electric purple — matches web
  secondary2: '#A855F7',    // lighter purple for accents
  secondaryLight: '#EDE9FE',
  secondaryDark: '#5B21B6',

  accent: '#FF7F3E',        // warm orange-red — highlights and CTAs
  accentLight: '#FFB38A',

  // Reader identity — dusty blue
  readerBlue: '#7A9CC8',        // hero background for reader screens
  readerBlueLight: '#D8E5F5',   // chips and surface accents

  // Friend identity — soft jade
  friendEmerald: '#5FAF8A',         // hero background for friend screens
  friendEmeraldLight: '#C4E8D8',    // chips and surface accents

  // Neutral
  background: '#FAFAF7',       // off-white — softer than pure white
  backgroundTinted: '#F5F0FF', // light purple tint for hero/auth sections
  surface: '#FFFFFF',
  surfaceVariant: '#EDE9FE',   // light purple tint for cards

  // Text
  textPrimary: '#1E1B4B',   // deep purple-blue — matches web
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  // Feedback
  success: '#22C55E',
  error: '#E53935',
  warning: '#FB8C00',
  info: '#1E88E5',

  // Borders and dividers
  border: '#E8E4F0',
  divider: '#EDE9FE',

  // Coin / Livrux brand
  coin: '#F5A623',
  coinShadow: '#C4800B',

  // Chip backgrounds — status badges on reader/friend cards.
  // Change here to retheme all chips at once.
  chipCoin: '#F5A623',    // 🪙 coin balance
  chipXp: '#B45309',      // ⭐ XP — amber
  chipBadge: '#2D6A4F',   // 🏅 badges — forest green
  chipBook: '#7C3AED',    // 📚 books
  chipFriend: '#5FAF8A',  // 👦👧 friends

  // Navigation bar background (translucent)
  navBackground: 'rgba(255,255,255,0.92)',

  // Background gradient — three stops for the page background
  backgroundGradient: ['#f0e6ff', '#fff7ed', '#fafaf7'] as [string, string, string],

  // Card gradient — two stops used by BookCard, BadgeCard, TransactionRow, etc.
  cardGradient: ['#FEFBFF', '#FFFAF4'] as [string, string],

  // Status bar style
  statusBarStyle: 'dark' as 'dark' | 'light',
} as const;

export type ColorPalette = {
  primary: string; primaryLight: string; primaryDark: string;
  secondary: string; secondary2: string; secondaryLight: string; secondaryDark: string;
  accent: string; accentLight: string;
  readerBlue: string; readerBlueLight: string;
  cardGradient: [string, string];
  friendEmerald: string; friendEmeraldLight: string;
  background: string; backgroundTinted: string; surface: string; surfaceVariant: string;
  textPrimary: string; textSecondary: string; textDisabled: string; textOnPrimary: string;
  success: string; error: string; warning: string; info: string;
  border: string; divider: string;
  coin: string; coinShadow: string;
  chipCoin: string; chipXp: string; chipBadge: string; chipBook: string; chipFriend: string;
  navBackground: string;
  backgroundGradient: [string, string, string];
  statusBarStyle: 'dark' | 'light';
};

export const noiteColors: ColorPalette = {
  primary: '#F5A623',
  primaryLight: '#FFD580',
  primaryDark: '#C4800B',
  secondary: '#818CF8',
  secondary2: '#A5B4FC',
  secondaryLight: '#1E2D5E',
  secondaryDark: '#6366F1',
  accent: '#38BDF8',
  accentLight: '#7DD3FC',
  readerBlue: '#38BDF8',
  readerBlueLight: '#1E3A5F',
  friendEmerald: '#34D399',
  friendEmeraldLight: '#064E3B',
  background: '#0F172A',
  backgroundTinted: '#1E1B4B',
  surface: '#1E293B',
  surfaceVariant: '#334155',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textDisabled: '#64748B',
  textOnPrimary: '#FFFFFF',
  success: '#22C55E',
  error: '#F87171',
  warning: '#FB8C00',
  info: '#38BDF8',
  border: '#334155',
  divider: '#1E293B',
  coin: '#F5A623',
  coinShadow: '#C4800B',
  chipCoin: '#F5A623',
  chipXp: '#B45309',
  chipBadge: '#2D6A4F',
  chipBook: '#6366F1',
  chipFriend: '#34D399',
  navBackground: 'rgba(15,23,42,0.95)',
  backgroundGradient: ['#0F172A', '#131f35', '#0F172A'],
  cardGradient: ['#1E293B', '#334155'],
  statusBarStyle: 'light',
};

export const indigoColors: ColorPalette = {
  primary: '#F5A623',
  primaryLight: '#FFD580',
  primaryDark: '#C4800B',
  secondary: '#4F46E5',
  secondary2: '#0EA5E9',       // sky blue — makes hero gradient go indigo → cyan
  secondaryLight: '#C7D2FE',   // indigo-200 — chips e placeholders com tint visível
  secondaryDark: '#3730A3',
  accent: '#0EA5E9',           // sky blue vivo
  accentLight: '#BAE6FD',
  readerBlue: '#6366F1',
  readerBlueLight: '#E0E7FF',
  friendEmerald: '#10B981',
  friendEmeraldLight: '#D1FAE5',
  background: '#F8FAFC',
  backgroundTinted: '#EEF2FF',
  surface: '#FFFFFF',
  surfaceVariant: '#DBEAFE',   // blue-100 — superfícies com tint azul
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textDisabled: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  success: '#22C55E',
  error: '#E53935',
  warning: '#FB8C00',
  info: '#1E88E5',
  border: '#E2E8F0',
  divider: '#EEF2FF',
  coin: '#F5A623',
  coinShadow: '#C4800B',
  chipCoin: '#F5A623',
  chipXp: '#B45309',
  chipBadge: '#2D6A4F',
  chipBook: '#4F46E5',
  chipFriend: '#10B981',
  navBackground: 'rgba(199,210,254,0.92)', // indigo-200 translúcido
  backgroundGradient: ['#818CF8', '#BFDBFE', '#F8FAFC'], // índigo → sky → branco
  cardGradient: ['#EFF6FF', '#DBEAFE'],    // sky-50 → blue-100
  statusBarStyle: 'dark',
};

export const themes: Record<ThemeId, ColorPalette> = {
  classic: { ...Colors, backgroundGradient: ['#f0e6ff', '#fff7ed', '#fafaf7'], cardGradient: ['#FEFBFF', '#FFFAF4'], navBackground: 'rgba(255,255,255,0.92)', statusBarStyle: 'dark' },
  noite: noiteColors,
  indigo: indigoColors,
};

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
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;
