const { tokens } = require('@schoolyard/tokens')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: tokens.color.primary,
        accent: tokens.color.accent,
        surface: tokens.color.surface,
        muted: tokens.color.muted,
        border: tokens.color.border,
        success: tokens.color.success,
        warning: tokens.color.warning,
        error: tokens.color.error,
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
}
