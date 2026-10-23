/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          primary: '#E87524',       // Primary orange
          dark: '#C85D16',          // Dark orange
          light: '#FFF4E8',         // Light orange background / highlight
          surface: '#FFFFFF',       // Surface white
          card: '#FFFFFF',          // Card background
          border: '#E6E3DF',        // Border neutral
          'border-subtle': '#F0EFEA',
          text: '#252525',          // Main text charcoal
          muted: '#626262',         // Secondary text
          bg: '#F7F7F5',            // Page background
          success: '#23834B',       // Success green
          warning: '#A96300',       // Warning amber
          danger: '#C62828',        // Error / Critical red
          critical: '#C62828',      // Error / Critical red
          info: '#526174',          // Neutral information
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'gov-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'gov-card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
        'gov-elevated': '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'gov-modal': '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
}
