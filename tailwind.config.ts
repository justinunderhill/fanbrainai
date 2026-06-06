import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 60px rgba(34, 197, 94, 0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
