import tseslint from "typescript-eslint"

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "error",
    },
  },
  {
    files: ["test/**/*.ts", "**/*.spec.ts"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off", "@typescript-eslint/no-explicit-any": "off" },
  },
)
