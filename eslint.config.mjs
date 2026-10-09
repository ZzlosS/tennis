import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["build/**", "node_modules/**", "public/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    // The code predates the linter: existing problems are warnings so CI stays
    // useful, and new code should still clear them.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
      "no-empty": "warn",
      "no-useless-escape": "warn",
      "prefer-const": "warn",
    },
  }
);
