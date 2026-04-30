/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      colors: {
        ink: {
          50: '#f7f7f8',
          100: '#eeeef1',
          200: '#d8d9df',
          300: '#b3b5bf',
          400: '#838695',
          500: '#5a5d6e',
          600: '#3f4252',
          700: '#2c2e3b',
          800: '#1d1f2a',
          900: '#13141c',
          950: '#0a0b12',
        },
        accent: {
          50: '#eef4ff',
          100: '#dde7ff',
          200: '#c0d2ff',
          300: '#94b2ff',
          400: '#6788ff',
          500: '#4361ff',
          600: '#2c3fef',
          700: '#2531c8',
          800: '#222da0',
          900: '#212c7e',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 17, 28, 0.04), 0 8px 24px rgba(15, 17, 28, 0.06)',
        glow: '0 0 0 1px rgba(67, 97, 255, 0.25), 0 8px 28px rgba(67, 97, 255, 0.18)',
      },
    },
  },
  plugins: [],
};
