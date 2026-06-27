/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'Times', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        xl: {
          forest: '#123b23',
          forestDeep: '#0d2b19',
          forestSoft: '#1d4c2b',
          moss: '#7ea84b',
          sage: '#acc86c',
          cream: '#f6f3ea',
          parchment: '#ede7d9',
          stone: '#c8c2b2',
          ink: '#1a1f16',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(126, 168, 75, 0.18), 0 30px 90px rgba(13, 43, 25, 0.18)',
      },
      backgroundImage: {
        'xl-hero':
          'radial-gradient(circle at 20% 20%, rgba(174, 200, 108, 0.24), transparent 24%), radial-gradient(circle at 80% 10%, rgba(255, 255, 255, 0.10), transparent 18%), linear-gradient(135deg, #0d2b19 0%, #123b23 48%, #154125 100%)',
        'xl-panel':
          'linear-gradient(180deg, rgba(246, 243, 234, 0.98), rgba(240, 236, 225, 0.96))',
      },
      letterSpacing: {
        wide2: '0.22em',
      },
    },
  },
  plugins: [],
};
