import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 60px rgba(34, 197, 94, 0.18)',
        'glow-strong': '0 0 28px rgba(52, 211, 153, 0.45)',
      },
      keyframes: {
        pop: {
          '0%, 100%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.18)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.92) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(52, 211, 153, 0)' },
          '50%': { boxShadow: '0 0 26px 2px rgba(52, 211, 153, 0.4)' },
        },
        shine: {
          '0%': { transform: 'translateX(-130%) skewX(-12deg)' },
          '100%': { transform: 'translateX(230%) skewX(-12deg)' },
        },
        confetti: {
          '0%': { opacity: '1', transform: 'translateY(0) rotate(0deg)' },
          '100%': { opacity: '0', transform: 'translateY(240px) rotate(540deg)' },
        },
      },
      animation: {
        pop: 'pop 0.32s ease-out',
        'pop-in': 'pop-in 0.36s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-up': 'slide-up 0.3s ease-out',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        confetti: 'confetti 1.2s ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
