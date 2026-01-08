/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'var(--color-border)', /* primary-15 */
        input: 'var(--color-input)', /* primary-15 */
        ring: 'var(--color-ring)', /* oxide-orange */
        background: 'var(--color-background)', /* off-white / dark-base */
        foreground: 'var(--color-foreground)', /* deep-charcoal / light-92 */
        primary: {
          DEFAULT: 'var(--color-primary)', /* warm-charcoal / graphite-gray */
          foreground: 'var(--color-primary-foreground)', /* white */
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)', /* graphite-gray / warm-charcoal */
          foreground: 'var(--color-secondary-foreground)', /* white */
        },
        accent: {
          DEFAULT: 'var(--color-accent)', /* oxide-orange / bright-oxide-orange */
          foreground: 'var(--color-accent-foreground)', /* white / dark-base */
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)', /* industrial-rust / light-rust */
          foreground: 'var(--color-destructive-foreground)', /* white */
        },
        success: {
          DEFAULT: 'var(--color-success)', /* deep-olive / light-olive */
          foreground: 'var(--color-success-foreground)', /* white */
        },
        warning: {
          DEFAULT: 'var(--color-warning)', /* copper-tone / light-copper */
          foreground: 'var(--color-warning-foreground)', /* white / dark-base */
        },
        error: {
          DEFAULT: 'var(--color-error)', /* industrial-rust / light-rust */
          foreground: 'var(--color-error-foreground)', /* white */
        },
        muted: {
          DEFAULT: 'var(--color-muted)', /* muted-sand / dark-elevated-2 */
          foreground: 'var(--color-muted-foreground)', /* medium-gray / medium-light-gray */
        },
        card: {
          DEFAULT: 'var(--color-card)', /* muted-sand / dark-elevated */
          foreground: 'var(--color-card-foreground)', /* deep-charcoal / light-92 */
        },
        popover: {
          DEFAULT: 'var(--color-popover)', /* muted-sand / dark-elevated */
          foreground: 'var(--color-popover-foreground)', /* deep-charcoal / light-92 */
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        caption: ['var(--font-caption)', 'sans-serif'],
        data: ['var(--font-data)', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.4' }],
        'sm': ['0.875rem', { lineHeight: '1.4' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.125rem', { lineHeight: '1.5' }],
        'xl': ['1.25rem', { lineHeight: '1.4' }],
        '2xl': ['1.5rem', { lineHeight: '1.3' }],
        '3xl': ['1.875rem', { lineHeight: '1.25' }],
        '4xl': ['2.25rem', { lineHeight: '1.2' }],
      },
      spacing: {
        'xs': 'var(--spacing-xs)', /* 6px */
        'sm': 'var(--spacing-sm)', /* 12px */
        'md': 'var(--spacing-md)', /* 18px */
        'lg': 'var(--spacing-lg)', /* 24px */
        'xl': 'var(--spacing-xl)', /* 32px */
        '2xl': 'var(--spacing-2xl)', /* 48px */
        '3xl': 'var(--spacing-3xl)', /* 64px */
        '4xl': 'var(--spacing-4xl)', /* 80px */
        '5xl': 'var(--spacing-5xl)', /* 96px */
      },
      borderRadius: {
        'sm': 'var(--radius-sm)', /* 6px */
        'md': 'var(--radius-md)', /* 10px */
        'lg': 'var(--radius-lg)', /* 14px */
        'xl': 'var(--radius-xl)', /* 18px */
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'DEFAULT': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'spring': 'cubic-bezier(0.34, 1.26, 0.64, 1)',
      },
      transitionDuration: {
        'smooth': '250ms',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-out': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'slide-in': 'slide-in 200ms ease-out',
        'slide-out': 'slide-out 200ms ease-in',
        'fade-in': 'fade-in 250ms ease-out',
      },
      zIndex: {
        'base': '0',
        'card': '1',
        'dropdown': '50',
        'navigation': '100',
        'notification': '150',
        'modal': '200',
        'toast': '300',
      },
    },
  },
  plugins: [],
}