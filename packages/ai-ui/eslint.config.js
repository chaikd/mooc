import js from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

// 与 console/eslint.config.js 保持一致，另加全局 ignores 与 TS 项目必需的规则豁免
export default defineConfig([
  { ignores: ["node_modules/**", "dist/**"] },
  { files: ["**/*.{js,mjs,cjs,ts,mts,jsx,tsx}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.{js,mjs,cjs,ts,mts,jsx,tsx}"], languageOptions: { globals: globals.browser } },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off'
    },
    settings: {
      react: {
        version: "detect"
      }
    },
  }
]);
