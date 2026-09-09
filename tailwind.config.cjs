/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--surface-3) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        'line-strong': 'rgb(var(--line-strong) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-2': 'rgb(var(--ink-2) / <alpha-value>)',
        'ink-3': 'rgb(var(--ink-3) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        link: 'rgb(var(--link) / <alpha-value>)',
        'area-univ': 'rgb(var(--area-univ) / <alpha-value>)',
        'area-freelance': 'rgb(var(--area-freelance) / <alpha-value>)',
        'area-emprende': 'rgb(var(--area-emprende) / <alpha-value>)',
        'area-personal': 'rgb(var(--area-personal) / <alpha-value>)',
        'state-todo': 'rgb(var(--state-todo) / <alpha-value>)',
        'state-doing': 'rgb(var(--state-doing) / <alpha-value>)',
        'state-blocked': 'rgb(var(--state-blocked) / <alpha-value>)',
        'state-done': 'rgb(var(--state-done) / <alpha-value>)',
        'prio-high': 'rgb(var(--prio-high) / <alpha-value>)',
        'prio-medium': 'rgb(var(--prio-medium) / <alpha-value>)',
        'prio-low': 'rgb(var(--prio-low) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        hard: 'var(--shadow-hard)',
      },
      borderWidth: {
        hard: 'var(--border-hard)',
      },
      maxWidth: {
        doc: '48rem',
      },
    },
  },
  plugins: [],
}