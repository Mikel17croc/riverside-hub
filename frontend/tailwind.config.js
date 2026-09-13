/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        river: {
          50: '#f0f9f6',
          100: '#d9f0e6',
          500: '#1f8a63',
          600: '#187150',
          700: '#135b40',
          900: '#0b3626',
        },
      },
    },
  },
  plugins: [],
};
