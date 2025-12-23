import js from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: {...globals.browser, ...globals.node} } },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    // 此设置将应用于所有文件
    settings: {
      react: {
        version: "detect", // 自动从 node_modules 中检测 React 版本
        // 如果你明确知道版本，也可以直接写死，例如：version: "19.0.0"
      }
    }
  },
]);
