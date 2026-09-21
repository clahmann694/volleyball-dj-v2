/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          1: '#1c1c1e',
          2: '#2c2c2e',
          3: '#3a3a3c',
        },
      },
    },
  },
  plugins: [],
}
