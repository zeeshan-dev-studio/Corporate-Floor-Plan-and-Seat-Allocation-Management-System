/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cad: {
          dark: '#1e222b',
          canvas: '#181b22',
          panel: '#242933',
          border: '#333a48',
          accent: '#3b82f6',
          grid: '#2d3342',
        },
      },
    },
  },
  plugins: [],
};
