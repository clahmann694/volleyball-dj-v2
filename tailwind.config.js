/** @type {import('tailwindcss').Config} */
export default {
  // hover:-Klassen nur auf Geraeten mit echtem Hover - sonst klebt der Zustand nach dem Tippen
  future: { hoverOnlyWhenSupported: true },
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Corporate Design VSG Kleinsteinbach (aus Logo und Vereins-App gesampelt)
        vsg: {
          cyan: '#009fe3',   // Logo
          blue: '#0089c8',   // Primaer-Buttons
          deep: '#0068a0',   // gedrueckt / dunkler Akzent
          ice: '#9bc3de',    // Sekundaertext auf Navy
          muted: '#8393a3',  // inaktiver Text
          red: '#e95055',
          green: '#16a94f',
          navy: {
            950: '#07101a',
            900: '#0b1a27',
            800: '#0d283a',
            700: '#113549',
            600: '#184660',
          },
        },
      },
    },
  },
  plugins: [],
}
