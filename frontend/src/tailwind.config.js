module.exports = {
  theme: {
    extend: {
      colors: {
        'blue-dark': '#1e40af',
        'teal-dark': '#0f766e',
        'blue-deep': '#1e3a8a',
        'blue-light-hover': '#3b82f6',
        'teal-light-hover': '#14b8a6',
        'blue-deep-hover': '#2563eb',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

module.exports = {
  theme: {
    extend: {
      animation: {
        'gradient-x': 'gradient-x 5s ease infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      }
    }
  }
}

module.exports = {
  theme: {
    extend: {
      keyframes: {
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        }
      },
      animation: {
        'shake': 'shake 0.3s ease-in-out',
      }
    }
  }
}