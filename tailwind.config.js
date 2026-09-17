/** @type {import('tailwindcss').Config} */

/**
 * Zia PDF runs on one semantic token set (see DESIGN.md / src/index.css):
 * white canvas, indigo accent, pale neutral borders, restrained radii.
 *
 * The legacy palettes below (blue / gray / zinc / emerald / amber / red / rose)
 * are remapped onto those tokens so the older tool screens inherit the system
 * instead of drifting from it. `blue` becomes the indigo ramp, `zinc` becomes
 * the navy ramp used by inverted panels, and the rest become semantic states.
 */
const alpha = (token) => `rgb(var(${token}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-primary)',
        surface: 'var(--bg-secondary)',
        elevated: 'var(--bg-elevated)',
        hover: 'var(--bg-hover)',
        subtle: 'var(--bg-subtle)',
        viewer: 'var(--bg-viewer)',
        glass: 'var(--bg-glass)',
        inverse: 'var(--bg-inverse)',
        'on-inverse': 'var(--fg-inverse)',
        ink: alpha('--ink-rgb'),
        muted: alpha('--muted-rgb'),
        line: alpha('--border-rgb'),
        'line-soft': 'var(--border-soft)',
        accent: alpha('--accent-rgb'),
        'accent-hover': alpha('--accent-hover-rgb'),
        'accent-strong': 'var(--accent-strong)',
        'accent-outline': 'var(--accent-outline)',
        'accent-soft': 'var(--accent-soft)',
        'accent-soft-strong': 'var(--accent-soft-strong)',

        success: alpha('--success-rgb'),
        'success-soft': 'var(--success-soft)',
        warning: alpha('--warning-rgb'),
        'warning-soft': 'var(--warning-soft)',
        danger: alpha('--danger-rgb'),
        'danger-soft': 'var(--danger-soft)',
        tertiary: 'var(--tertiary)',
        // `black` tracks the canvas, so legacy `dark:bg-black` insets stay navy.
        black: alpha('--black-rgb'),

        // ---------------------------------------------------------------
        // Legacy palette remap
        // ---------------------------------------------------------------
        blue: {
          50: 'var(--accent-soft)',
          100: 'var(--accent-soft-strong)',
          200: 'var(--accent-outline)',
          300: alpha('--accent-rgb'),
          400: alpha('--accent-rgb'),
          500: alpha('--accent-rgb'),
          600: alpha('--accent-hover-rgb'),
          700: 'var(--accent-strong)',
          800: alpha('--accent-rgb'),
          900: alpha('--accent-rgb'),
          950: alpha('--accent-rgb'),
        },
        gray: {
          50: 'var(--bg-hover)',
          100: 'var(--border-soft)',
          200: 'var(--border)',
          300: 'var(--fg-subtle)',
          400: 'var(--fg-subtle)',
          500: 'var(--fg-muted)',
          600: 'var(--fg-muted)',
          700: 'var(--fg-primary)',
          800: 'var(--fg-primary)',
          900: 'var(--fg-primary)',
          950: 'var(--fg-primary)',
        },
        zinc: {
          50: 'var(--bg-hover)',
          100: 'var(--navy-tint-bright)',
          200: 'var(--navy-tint-bright)',
          300: 'var(--navy-tint)',
          400: 'var(--navy-tint)',
          500: 'var(--navy-tint-dim)',
          600: 'var(--navy-tint-soft)',
          700: 'var(--navy-line)',
          800: 'var(--navy-raised)',
          900: alpha('--navy-rgb'),
          950: alpha('--navy-deep-rgb'),
        },
        emerald: {
          50: 'var(--success-soft)',
          100: alpha('--success-rgb'),
          200: alpha('--success-rgb'),
          300: alpha('--success-rgb'),
          400: alpha('--success-rgb'),
          500: alpha('--success-rgb'),
          600: alpha('--success-rgb'),
          700: alpha('--success-rgb'),
          800: alpha('--success-rgb'),
          900: alpha('--success-rgb'),
          950: alpha('--success-rgb'),
        },
        green: {
          500: alpha('--success-rgb'),
          600: alpha('--success-rgb'),
        },
        amber: {
          50: 'var(--warning-soft)',
          100: alpha('--warning-rgb'),
          200: alpha('--warning-rgb'),
          300: alpha('--warning-rgb'),
          400: alpha('--warning-rgb'),
          500: alpha('--warning-rgb'),
          600: alpha('--warning-rgb'),
          700: alpha('--warning-rgb'),
          800: alpha('--warning-rgb'),
          900: alpha('--warning-rgb'),
          950: alpha('--warning-rgb'),
        },
        red: {
          50: 'var(--danger-soft)',
          100: alpha('--danger-rgb'),
          200: alpha('--danger-rgb'),
          300: alpha('--danger-rgb'),
          400: alpha('--danger-rgb'),
          500: alpha('--danger-rgb'),
          600: alpha('--danger-rgb'),
          700: alpha('--danger-rgb'),
          800: alpha('--danger-rgb'),
          900: alpha('--danger-rgb'),
          950: alpha('--danger-rgb'),
        },
        rose: {
          50: 'var(--danger-soft)',
          100: alpha('--danger-rgb'),
          200: alpha('--danger-rgb'),
          300: alpha('--danger-rgb'),
          400: alpha('--danger-rgb'),
          500: alpha('--danger-rgb'),
          600: alpha('--danger-rgb'),
          700: alpha('--danger-rgb'),
          800: alpha('--danger-rgb'),
          900: alpha('--danger-rgb'),
          950: alpha('--danger-rgb'),
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        ui: 'var(--radius-sm)',
        panel: 'var(--radius-md)',
        card: 'var(--radius-md)',
        xl2: 'var(--radius-lg)',
      },
      boxShadow: {
        ambient: 'var(--shadow-ambient)',
        card: 'var(--shadow-card)',
        soft: 'var(--shadow-soft)',
        menu: 'var(--shadow-menu)',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        dialogIn: {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        }
      },
      animation: {
        'slide-in': 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.18s ease-out forwards',
        'dialog-in': 'dialogIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }
    },
  },
  plugins: [],
}
