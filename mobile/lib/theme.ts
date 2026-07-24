/**
 * Design tokens ported from src/styles/tokens.css.
 *
 * Color palette drawn from Indian pharmacy packaging: carton navy, blister foil,
 * prescription-pad paper. Deliberately not the stock medical teal.
 *
 * Every measured value (strength, pack size, unitPrice) uses the mono font.
 * Touch targets are always ≥44pt. Type never below 14pt.
 */

export const colors = {
  // Core palette
  ink: '#16233A',        // carton navy — text, dark surfaces
  ink70: '#56607A',      // secondary text
  ink40: '#9AA2B4',      // tertiary, placeholders
  paper: '#FBFAF7',      // page background
  paperCard: '#FFFFFF',  // card/modal background
  foil: '#C9CFD6',       // dividers, strip edges
  foilSoft: '#E9ECEF',   // soft dividers
  mint: '#0E8F6E',       // in stock, savings, verified
  mintSoft: '#E4F3ED',   // light mint background
  rx: '#B23A34',         // Schedule H — prescription flags ONLY, never discounts
  rxSoft: '#FAECEA',     // light rx background

  // Semantic
  text: '#16233A',
  textSecondary: '#56607A',
  textTertiary: '#9AA2B4',
  background: '#FBFAF7',
  surface: '#FFFFFF',
  border: '#E9ECEF',
  success: '#0E8F6E',
  warning: '#B23A34',
  error: '#B23A34',
};

export const typography = {
  // Font families (loaded via expo-font in _layout.tsx)
  // Make sure to preload these in the root layout using expo-font
  families: {
    display: 'BricolageGrotesque',  // Display — 800 weight
    body: 'PublicSans',              // Body text
    mono: 'MartianMono',             // Measured values: strength, pack size, price
  },

  // Type scale — converted from CSS clamp() to fixed pt values for RN
  // Reference: --step-N values adapted for mobile (typically smaller than web)
  sizes: {
    xs: 12,      // --step--1 equiv: 0.78–0.84rem → 12.5pt
    sm: 14,      // --step-0 equiv: 0.94–1rem → 14–16pt (never below 14pt)
    base: 16,    // body text
    lg: 18,      // --step-1 equiv: 1.18–1.35rem → 18–21.6pt
    xl: 24,      // --step-2 equiv: 1.48–1.9rem → 23.5–30pt
    '2xl': 32,   // --step-3 equiv: 1.85–2.7rem → 29.6–43.2pt
  },

  weights: {
    normal: '400' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  lineHeights: {
    tight: 1.1,
    normal: 1.55,
    relaxed: 1.75,
  },
};

export const spacing = {
  xs: 3,      // 0.375rem
  sm: 6,      // 0.75rem → 9.6pt
  md: 10,     // 1.25rem → 16pt
  lg: 16,     // 2rem
  xl: 28,     // 3.5rem
};

export const radius = {
  sm: 6,
  md: 10,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: '#16233A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  cardDeep: {
    shadowColor: '#16233A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 5,
  },
};

/**
 * Touch targets must be ≥44pt on mobile.
 * Use these for interactive elements: buttons, links, touchable areas.
 */
export const touchTargets = {
  small: 44,    // minimum accessible touch target
  medium: 48,
  large: 56,
};

/**
 * Theme object for easy consumption in components.
 * Example: `const { colors, spacing } = useTheme();`
 */
export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  touchTargets,
} as const;

export type Theme = typeof theme;
