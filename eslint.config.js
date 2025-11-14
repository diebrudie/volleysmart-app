// eslint.config.js (root)
// Keep root quiet; each app/package owns its own config.
export default [
  {
    ignores: [
      "apps/**",
      "packages/**",
      "node_modules/**",
      "dist/**",
      "supabase/**",
    ],
  },
];
