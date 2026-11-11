/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: {
          DEFAULT: '#111111',
          raised: '#171717',
          overlay: 'rgba(17, 17, 17, 0.95)',
        },
        primary: {
          DEFAULT: '#ffffff',
          foreground: '#0a0a0a',
        },
        secondary: '#a3a3a3',
        accent: '#d4d4d4',
        muted: '#737373',
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.16)',
          focus: 'rgba(255, 255, 255, 0.40)',
        },
        status: {
          success: '#4ade80',
          warning: '#fbbf24',
          danger: '#f87171',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
