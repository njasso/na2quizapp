// tailwind.config.js (src/) — Fusionné
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#1e3a8a', secondary: '#2563eb', accent: '#4338ca',
        'blue-dark': '#1e40af', 'teal-dark': '#0f766e',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
      animation: {
        'gradient-x': 'gradient-x 5s ease infinite',
        shake: 'shake 0.3s ease-in-out',
      },
    },
  },
  plugins: [],
};
