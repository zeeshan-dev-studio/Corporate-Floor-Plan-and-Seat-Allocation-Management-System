/** @type {import('tailwindcss').Config} */
// Light, high-contrast theme. The component classes were written for a dark UI using the
// slate scale, so the scale is inverted here: slate-950 is white and slate-50 is near black.
// Accent shades are darkened so coloured text and white-on-colour buttons stay readable.
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#020617',
          100: '#020617',
          200: '#0b1220',
          300: '#162033',
          400: '#273449',
          500: '#3b4a60',
          600: '#52627a',
          700: '#a9b6c8',
          800: '#dbe3ee',
          900: '#f1f5f9',
          950: '#ffffff',
        },
        sky: { 300: '#0c4a6e', 400: '#0c4a6e', 500: '#075985', 600: '#0c4a6e' },
        emerald: { 300: '#064e3b', 400: '#064e3b', 500: '#065f46', 600: '#064e3b' },
        red: { 200: '#7f1d1d', 300: '#7f1d1d', 400: '#991b1b', 500: '#991b1b', 600: '#7f1d1d', 800: '#fecaca', 900: '#fee2e2', 950: '#fef2f2' },
        amber: { 200: '#78350f', 300: '#78350f', 400: '#92400e', 500: '#92400e', 600: '#78350f' },
        indigo: { 400: '#3730a3', 500: '#3730a3', 600: '#312e81' },
        cad: {
          dark: '#ffffff',
          canvas: '#ffffff',
          panel: '#f8fafc',
          border: '#94a3b8',
          accent: '#075985',
          grid: '#cbd5e1',
        },
      },
    },
  },
  plugins: [],
};
