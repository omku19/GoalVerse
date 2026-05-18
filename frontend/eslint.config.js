export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.{js,jsx}", "*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: "readonly",
        CustomEvent: "readonly",
        document: "readonly",
        import: "readonly",
        localStorage: "readonly",
        window: "readonly",
      },
    },
    rules: {},
  },
];
