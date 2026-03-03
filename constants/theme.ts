/**
 * BudgetScout Brand Colors
 * #0b4c44 - Deep Forest Green (primary dark)
 * #64a668 - Mid Green (primary)
 * #a2dc90 - Light Mint Green (accent)
 * #ffffff - White
 */
import { Platform } from 'react-native';

export const BrandColors = {
  deepGreen: '#0b4c44',
  midGreen: '#64a668',
  mintGreen: '#a2dc90',
  white: '#ffffff',
  offWhite: '#f4faf4',
  lightGray: '#e8f5e9',
  muted: '#7a9e7e',
  darkText: '#0b2e29',
  errorRed: '#e53935',
  warningYellow: '#f9a825',
};

export const Colors = {
  light: {
    text: BrandColors.darkText,
    background: BrandColors.offWhite,
    tint: BrandColors.midGreen,
    icon: BrandColors.muted,
    tabIconDefault: BrandColors.muted,
    tabIconSelected: BrandColors.deepGreen,
    cardBackground: BrandColors.white,
    border: BrandColors.lightGray,
    headerBackground: BrandColors.deepGreen,
    headerText: BrandColors.white,
    saleCard: '#e8f5e9',
    saleBorder: BrandColors.mintGreen,
  },
  dark: {
    text: BrandColors.white,
    background: '#0a1f1c',
    tint: BrandColors.mintGreen,
    icon: BrandColors.muted,
    tabIconDefault: BrandColors.muted,
    tabIconSelected: BrandColors.mintGreen,
    cardBackground: '#122e29',
    border: '#1e4a42',
    headerBackground: '#071a17',
    headerText: BrandColors.white,
    saleCard: '#0f2e28',
    saleBorder: BrandColors.midGreen,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});