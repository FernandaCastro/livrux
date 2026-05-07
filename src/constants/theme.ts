// Design system: colors, typography, spacing, and border radii for the Livrux app.
// Target audience: families with kids — warm, playful, and legible.

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
  textDisabled: '#BDBDBD',
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
