/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'podcast-blue': '#2563eb',
        'podcast-purple': '#7c3aed',
        'italian-green': '#059669',
        'italian-red': '#dc2626',
      },
      fontFamily: {
        'italian': ['"Playfair Display"', 'serif'],
        'sans-italian': ['"Inter"', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'italian-flag': 'linear-gradient(to right, #009246 33%, #ffffff 33%, #ffffff 66%, #ce2b37 66%)',
      },
    },
  },
  plugins: [],
}