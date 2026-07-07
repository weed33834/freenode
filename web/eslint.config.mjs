import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintReact from "@eslint-react/eslint-plugin";
import nextPlugin from "@next/eslint-plugin-next";

export default defineConfig([
  { ignores: [".next/**", "dist/**", "node_modules/**", "next-env.d.ts", "next.config.mjs"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintReact.configs["recommended-typescript"],
  nextPlugin.configs.recommended,
  nextPlugin.configs["core-web-vitals"],
]);
