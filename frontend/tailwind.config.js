/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "brand-green": "#426B1F",
        "card-bg": "#FAFAF5",
        "card-border": "#E6E6E6",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        newsreader: ["Newsreader", "serif"],
      },
    },
  },
  plugins: [],
};
