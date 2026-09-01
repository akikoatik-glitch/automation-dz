import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ],
        arabic: ['Tajawal', 'Cairo', 'Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        brand: {
          50: '#eefbf6',
          100: '#d5f5e8',
          200: '#adead3',
          300: '#77d9b8',
          400: '#3ec299',
          500: '#17a77f',
          600: '#0c8667',
          700: '#0c6b55',
          800: '#0d5545',
          900: '#0c463a',
          950: '#042822'
        },
        night: {
          900: '#0b1321',
          800: '#0f1a2c',
          700: '#16233a'
        },
        accent: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed'
        }
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.06)',
        glow: '0 0 0 1px rgba(23,167,127,.1), 0 8px 40px rgba(23,167,127,.18)',
        'glow-violet': '0 8px 40px rgba(139,92,246,.22)'
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(135deg,#0c8667 0%,#17a77f 45%,#0ea5e9 100%)',
        'brand-gradient-soft':
          'linear-gradient(135deg,rgba(12,134,103,.08) 0%,rgba(14,165,233,.08) 100%)',
        'hero-mesh':
          'radial-gradient(1200px 600px at 80% -10%, rgba(23,167,127,.35) 0%, transparent 55%), radial-gradient(900px 500px at -10% 20%, rgba(139,92,246,.22) 0%, transparent 50%), radial-gradient(700px 500px at 50% 120%, rgba(14,165,233,.18) 0%, transparent 55%)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'float-y': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        pulse: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '.5' }
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' }
        }
      },
      animation: {
        'fade-up': 'fade-up .5s ease both',
        'fade-in': 'fade-in .4s ease both',
        'float-y': 'float-y 5s ease-in-out infinite',
        'spin-slow': 'spin-slow 14s linear infinite',
        shimmer: 'shimmer 1.6s linear infinite'
      }
    }
  },
  plugins: []
};

export default config;