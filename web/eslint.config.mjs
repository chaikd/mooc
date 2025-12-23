import nextCoreWebVitals from "eslint-config-next/core-web-vitals.js";
import nextTypescript from "eslint-config-next/typescript.js";
import { defineConfig } from "eslint/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
    {
    // extends: [...nextCoreWebVitals, ...nextTypescript],
    ...nextCoreWebVitals,
    ...nextTypescript,
    rules: {
        "no-unused-vars": "error",
    },
}]);