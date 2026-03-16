/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#0a0a0d',
          secondary: '#13131a',
          card: 'rgba(19, 19, 26, 0.6)',
        },
        accent: {
          primary: '#7c3aed',
          secondary: '#ec4899',
          tertiary: '#3b82f6',
        },
        text: {
          primary: '#ffffff',
          secondary: '#9ea3b0',
          muted: '#6b6f7a',
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
