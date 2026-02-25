/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#1a6a3c',
        'brand-dark': '#1a3c2e',
        'brand-accent': '#52b788',
        'text-main': '#1a2e22',
        'text-muted': '#6b8a7a',
        'text-soft': '#94a3a8',
        cream: { DEFAULT: '#F5F0E8', dark: '#EDE5D4' },
        ink: { DEFAULT: '#1A1612', light: '#2D2822', soft: '#3D3730' },
        sage: { DEFAULT: '#4A7C59', light: '#5E9B6E', dim: 'rgba(74,124,89,0.12)', soft: 'rgba(74,124,89,0.25)' },
        amber: { DEFAULT: '#C8842A', light: '#E09A40', dim: 'rgba(200,132,42,0.12)' },
        rust: { DEFAULT: '#B84C3A', dim: 'rgba(184,76,58,0.12)' },
        stone: { 50: '#FAF8F5', 100: '#F0EBE1', 200: '#DDD4C4', 300: '#C4B89A', 400: '#A89272', 500: '#8C7254', 600: '#6E5640', 700: '#523F2E', 800: '#3A2D20', 900: '#231A12' },
        // ── Design system tokens ─────────────────────────────────────
        primary: { DEFAULT: '#2563EB', hover: '#1D4ED8', dim: 'rgba(37,99,235,0.10)' },
        success: { DEFAULT: '#22C55E', dim: 'rgba(34,197,94,0.10)' },
        surface: '#F8FAFC',
        body: '#0F172A',
        muted: '#64748B',
        'forgot': { DEFAULT: '#F59E0B', hover: '#D97706' },
      },
      fontFamily: {
        fraunces: ['"Fraunces"', 'serif'],
        outfit: ['"Outfit"', 'sans-serif'],
        display: ['"Fraunces"', 'serif'],
        body: ['"Outfit"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease both',
        'fade-in': 'fadeIn 0.3s ease both',
        'slide-right': 'slideRight 0.35s ease both',
        shimmer: 'shimmer 1.8s infinite',
      },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideRight: { from: { opacity: 0, transform: 'translateX(-12px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      boxShadow: {
        card: '0 1px 3px rgba(26,22,18,0.08), 0 4px 16px rgba(26,22,18,0.06)',
        deep: '0 4px 24px rgba(26,22,18,0.14), 0 1px 4px rgba(26,22,18,0.08)',
        glow: '0 0 0 3px rgba(74,124,89,0.2)',
        'sage-glow': '0 8px 32px rgba(74,124,89,0.25)',
      },
    },
  },
  plugins: [],
};
