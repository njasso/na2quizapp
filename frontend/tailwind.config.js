// tailwind.config.js — Configuration unifiée (3 exports fusionnés en 1)
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:              '#1e3a8a',
        secondary:            '#2563eb',
        accent:               '#4338ca',
        'blue-dark':          '#1e40af',
        'teal-dark':          '#0f766e',
        'blue-deep':          '#1e3a8a',
        'blue-light-hover':   '#3b82f6',
        'teal-light-hover':   '#14b8a6',
        'blue-deep-hover':    '#2563eb',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
      boxShadow: {
        dashboard: '0 20px 25px -5px rgba(0,0,0,0.05)',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%':       { 'background-position': '100% 50%' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%':      { transform: 'translateX(-5px)' },
          '75%':      { transform: 'translateX(5px)' },
        },
      },
      animation: {
        'gradient-x': 'gradient-x 5s ease infinite',
        shake:         'shake 0.3s ease-in-out',
      },
    },
  },
  plugins: [],
};
