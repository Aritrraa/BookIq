/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        brand: {
          50:  "#f0f4ff",
          100: "#e0e9ff",
          200: "#c0d2ff",
          300: "#93aeff",
          400: "#6080ff",
          500: "#4060f0",
          600: "#3048d8",
          700: "#2436b0",
          800: "#1e2d8a",
          900: "#1a256e",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease",
        "slide-up": "slideUp 0.3s ease",
        "pulse-slow": "pulse 3s infinite",
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
}
