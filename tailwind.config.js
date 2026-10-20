/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mars mission-control palette.
        mars: {
          red: '#c1440e', // Mars rust red — primary accent
          orange: '#e07a3f', // muted oxide orange
          dust: '#d9a066', // light regolith dust
          deep: '#7a2808', // deep crater shadow
        },
        space: {
          900: '#0a0a0f', // deep space background
          850: '#101017',
          800: '#16161f', // panel background
          700: '#1f1f2b', // raised panel
          600: '#2b2b3a', // borders / dividers
          500: '#3a3a4d',
        },
        accent: {
          blue: '#4a90d9', // restrained blue accent for info
          cyan: '#5fd0c8',
        },
        status: {
          ok: '#4caf72',
          warn: '#d9a93f',
          critical: '#d9533f',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)',
        glow: '0 0 20px rgba(193,68,14,0.25)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        // Very slow Ken Burns drift for the Mars backdrop.
        'backdrop-drift': {
          '0%': { transform: 'scale(1.08) translate3d(0, 0, 0)' },
          '50%': { transform: 'scale(1.14) translate3d(-1.5%, -1%, 0)' },
          '100%': { transform: 'scale(1.08) translate3d(0, 0, 0)' },
        },
        // Twinkling star-field overlay.
        twinkle: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.9' },
        },
        // Scanline sweep across the header.
        'scan-sweep': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '10%': { opacity: '0.6' },
          '90%': { opacity: '0.6' },
          '100%': { transform: 'translateX(300%)', opacity: '0' },
        },
        // Gentle float for the mission badge.
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        // Count-up/attention flash for changed values.
        'value-flash': {
          '0%': { color: '#e07a3f' },
          '100%': { color: 'inherit' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'fade-in-up': 'fade-in-up 0.5s ease-out both',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'backdrop-drift': 'backdrop-drift 48s ease-in-out infinite',
        twinkle: 'twinkle 4s ease-in-out infinite',
        'scan-sweep': 'scan-sweep 7s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
        'value-flash': 'value-flash 0.6s ease-out',
      },
    },
  },
  plugins: [],
};
