/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#f4f6f3',
          100: '#e5e9e3',
          200: '#ccd4c8',
          300: '#a8b5a0',  // Main Sage
          400: '#8a9a80',
          500: '#6d7d63',
          600: '#56644f',
          700: '#454f40',
          800: '#3a4137',
          900: '#32382f',
        },
        olive: {
          50: '#f5f6f4',
          100: '#e8eae5',
          200: '#d1d5cc',
          300: '#b0b6a5',
          400: '#7d8471',  // Main Olive
          500: '#6a7260',
          600: '#545b4c',
          700: '#444a3e',
          800: '#3a3f35',
          900: '#33372f',
        },
        terracotta: {
          50: '#faf8f5',
          100: '#f3efe8',
          200: '#e5ddd0',
          300: '#c4a484',  // Main Terracotta
          400: '#b8936e',
          500: '#a67e58',
          600: '#8f6848',
          700: '#76543d',
          800: '#624636',
          900: '#533d30',
        },
      },
    },
  },
  plugins: [],
}
