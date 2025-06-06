/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'uptime-online': '#22c55e',
        'uptime-warning': '#eab308',
        'uptime-offline': '#ef4444',
      }
    },
  },
  plugins: [],
} 