/** @type {import('tailwindcss').Config} */
const token = (name) => `oklch(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: { DEFAULT: token('surface'), secondary: token('surface-secondary') },
        border: { DEFAULT: token('border'), strong: token('border-strong') },
        fg: { DEFAULT: token('fg'), secondary: token('fg-secondary'), tertiary: token('fg-tertiary') },
        primary: {
          DEFAULT: token('primary'),
          hover: token('primary-hover'),
          subtle: token('primary-subtle'),
          'subtle-fg': token('primary-subtle-fg'),
        },
        success: { DEFAULT: token('success'), subtle: token('success-subtle') },
        warning: { DEFAULT: token('warning'), subtle: token('warning-subtle') },
        danger: { DEFAULT: token('danger'), hover: token('danger-hover'), subtle: token('danger-subtle') },
        info: { DEFAULT: token('info'), subtle: token('info-subtle') },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        display: ['clamp(2rem, 1.4rem + 2.4vw, 3rem)', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '650' }],
        h1: ['1.625rem', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '600' }],
        h2: ['1.125rem', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '600' }],
        h3: ['1rem', { lineHeight: '1.5', fontWeight: '600' }],
        body: ['0.875rem', { lineHeight: '1.55' }],
        'body-lg': ['1rem', { lineHeight: '1.7' }],
        small: ['0.8125rem', { lineHeight: '1.5' }],
        caption: ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
        label: ['0.8125rem', { lineHeight: '1.4', fontWeight: '500' }],
        brand: ['0.9375rem', { lineHeight: '1.3', fontWeight: '600' }],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        card: '0 1px 2px oklch(0.22 0.02 275 / 0.04)',
        popover: '0 8px 24px -6px oklch(0.22 0.03 275 / 0.16)',
        modal: '0 24px 48px -12px oklch(0.22 0.03 275 / 0.28)',
      },
      zIndex: {
        dropdown: '10',
        sticky: '20',
        overlay: '30',
        modal: '40',
        toast: '50',
        tooltip: '60',
      },
      maxWidth: {
        page: '1200px',
        reading: '52rem',
        prose: '70ch',
      },
      spacing: {
        nav: '56px',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.25, 1, 0.5, 1)',
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      keyframes: {
        'menu-in': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'menu-in': 'menu-in 140ms cubic-bezier(0.25, 1, 0.5, 1)',
      },
    },
  },
  plugins: [],
};
