/* eslint-env node */
/* eslint-disable no-undef */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
    './node_modules/flowbite-react/**/*.js'
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // primary: {
        //   50: '#e0f2f4',
        //   100: '#b3dde2',
        //   200: '#80c8cf',
        //   300: '#4db2bb',
        //   400: '#269da8',
        //   500: '#003e4b', // <-- your base primary color
        //   600: '#003744',
        //   700: '#002f3b',
        //   800: '#002732',
        //   900: '#001b22',
        //   DEFAULT: '#003e4b',
        //   foreground: '#ffffff'
        // },
        // secondary: {
        //   50: '#e0f6f9',
        //   100: '#b3e8ef',
        //   200: '#80d9e5',
        //   300: '#4dcadb',
        //   400: '#26bfd4',
        //   500: '#01677e', // <-- your base secondary color
        //   600: '#015c72',
        //   700: '#014e60',
        //   800: '#01404e',
        //   900: '#002c35',
        //   DEFAULT: '#01677e',
        //   foreground: '#ffffff'
        // },
        indigo: {
          50: 'var(--color-indigo-50)',
          100: 'var(--color-indigo-100)',
          200: 'var(--color-indigo-200)',
          300: 'var(--color-indigo-300)',
          400: 'var(--color-indigo-400)',
          500: 'var(--color-indigo-500)',
          600: 'var(--color-indigo-600)',
          700: 'var(--color-indigo-700)',
          800: 'var(--color-indigo-800)',
          900: 'var(--color-indigo-900)',
          950: 'var(--color-indigo-950)'
        }
      }
    }
  },
  plugins: [
    require('flowbite/plugin'),
    require('flowbite-typography'),

  ],
};