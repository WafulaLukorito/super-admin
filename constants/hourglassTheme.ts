/**
 * Hourglass Brand Palette — Mint & Lime on Dark Charcoal
 * Rule of thumb: Mint = 80% (primary surfaces, active headers, controls),
 * Lime = 10% (sand, running timers, progress fills, CTA highlights),
 * Neutrals = 10% (near-black charcoal background & crisp typography).
 */
export const HourglassTheme = {
  // Brand Core
  mint: '#2ED3A3',
  mintDark: '#1E9E78',
  mintTint: '#102822',
  mintBorder: '#1F5E4C',

  lime: '#84E150',
  limeTint: '#1B2B14',
  limeBorder: '#3C6E23',

  // Dark Mode Hero Surfaces
  bg: '#141414',
  bgDeep: '#0E0E0E',
  surface: '#1E1E1E',
  surfaceElevated: '#262626',
  border: '#2C2C2C',
  borderSubtle: '#242424',

  // Typography
  text: '#FFFFFF',
  textSecondary: '#C8D3CF',
  textMuted: '#A8B5B0',
  textSubtle: '#6E7A75',
  textOnAccent: '#101A17',

  // Semantic States
  danger: '#F43F5E',
  dangerBg: '#2B1419',
  dangerBorder: '#7F1D1D',
  dangerTextLight: '#FDA4AF',

  warning: '#F59E0B',
  warningBg: '#292012',
  warningBorder: '#78350F',

  bedtime: '#818CF8',
  bedtimeBg: '#181730',
  bedtimeBorder: '#3730A3',
  bedtimeTextLight: '#C7D2FE',
} as const;
