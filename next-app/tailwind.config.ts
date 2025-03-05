/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',    // For App Router
    './pages/**/*.{js,ts,jsx,tsx}',  // For Pages Router
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',    // If you have a src folder
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'), // DaisyUI plugin
  ],
  daisyui: {
    // optional: pick or customize themes
    // themes: ["light", "dark"], 
  },
};
