module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1e3a8a',
        secondary: '#2563eb',
        accent: '#4338ca'
      },
      boxShadow: {
        'dashboard': '0 20px 25px -5px rgba(0, 0, 0, 0.05)'
      }
    },
  },
  plugins: [],
}