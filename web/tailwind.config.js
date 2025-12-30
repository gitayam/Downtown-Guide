/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Fayetteville Palette
        'dogwood': {
          50: '#FDF8F5',
          100: '#FCF1ED',
          200: '#F8D9E0',
          300: '#F2BDC9',
          400: '#E8A4B8',
          500: '#D47A94',
          600: '#B85A73',
          DEFAULT: '#E8A4B8',
        },
        'brick': {
          50: '#FAF5F4',
          100: '#F2E8E7',
          200: '#E5D1CF',
          300: '#D4B0AC',
          400: '#B98580',
          500: '#A65D57',
          600: '#8B4A45',
          700: '#6E3B38',
          DEFAULT: '#A65D57',
        },
        'capefear': {
          50: '#F0F5F3',
          100: '#E1EBE7',
          200: '#C3D7CF',
          300: '#94B8A8',
          400: '#5E9278',
          500: '#2D5A47',
          600: '#244A3A',
          700: '#1A3D2E',
          DEFAULT: '#2D5A47',
        },
        'liberty': {
          50: '#F2F5F8',
          100: '#E5EBF1',
          200: '#C7D4E3',
          300: '#9DB3CD',
          400: '#6A8AAF',
          500: '#1E3A5F',
          600: '#1A3250',
          700: '#152841',
          DEFAULT: '#1E3A5F',
        },
        // Neutrals
        'sand': '#F5E6D3',
        'stone': '#6B7B8A',
        'forest': '#1A3D2E',
      },
      fontFamily: {
        'display': ['Playfair Display', 'Georgia', 'serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
