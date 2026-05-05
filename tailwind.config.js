/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: 'var(--semantic-primary-normal)',
          normal: 'var(--semantic-primary-normal)',
          strong: 'var(--semantic-primary-strong)',
          heavy: 'var(--semantic-primary-heavy)',
        },
        surface: {
          normal: 'var(--semantic-background-normal-normal)',
          alternative: 'var(--semantic-background-normal-alternative)',
          elevated: 'var(--semantic-background-elevated-normal)',
        },
        label: {
          normal: 'var(--semantic-label-normal)',
          neutral: 'var(--semantic-label-neutral)',
          alternative: 'var(--semantic-label-alternative)',
          assistive: 'var(--semantic-label-assistive)',
        },
        line: {
          neutral: 'var(--semantic-line-normal-neutral)',
          solid: 'var(--semantic-line-solid-normal)',
        },
        fill: {
          normal: 'var(--semantic-fill-normal)',
          strong: 'var(--semantic-fill-strong)',
          alternative: 'var(--semantic-fill-alternative)',
        },
        status: {
          positive: 'var(--semantic-status-positive)',
          cautionary: 'var(--semantic-status-cautionary)',
          negative: 'var(--semantic-status-negative)',
        },
      },
      borderRadius: {
        wds: 'var(--radius-xl)',
        'wds-sm': 'var(--radius-md)',
        'wds-lg': 'var(--radius-2xl)',
      },
      boxShadow: {
        wds: 'var(--shadow-medium)',
      },
    },
  },
  plugins: [],
}
