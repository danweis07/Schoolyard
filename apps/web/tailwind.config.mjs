/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // School-customizable colors backed by CSS custom properties
        // injected at runtime by BaseLayout.astro from school.config.json.
        primary: 'var(--sy-color-primary)',
        accent: 'var(--sy-color-accent)',
        surface: 'var(--sy-color-surface)',
        muted: 'var(--sy-color-muted)',
        border: 'var(--sy-color-border)',
        success: 'var(--sy-color-success)',
        warning: 'var(--sy-color-warning)',
        error: 'var(--sy-color-error)',
      },
      textColor: {
        base: 'var(--sy-color-text-base)',
        muted: 'var(--sy-color-text-muted)',
        inverse: 'var(--sy-color-text-inverse)',
      },
      fontFamily: {
        sans: ['var(--sy-font-family-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: 'var(--sy-radius-card)',
        button: 'var(--sy-radius-button)',
      },
      spacing: {
        section: 'var(--sy-spacing-section)',
        card: 'var(--sy-spacing-card)',
      },
    },
  },
  plugins: [],
}
