import { defineConfig, globalIgnores } from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  globalIgnores(["dist/*", "node_modules/*", "src/lib/*", "es.config.mjs"]),
  {
    extends: compat.extends(
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended"
    ),

    plugins: {
      "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
      },

      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
    },

    rules: {
      "@typescript-eslint/no-explicit-any": "off",

      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],

      "no-restricted-globals": [
        "error",
        {
          name: "Symbol",
          message: "Symbol は使用禁止です。",
        },
        {
          name: "Promise",
          message: "Promise は使用禁止です。",
        },
      ],

      "no-restricted-properties": [
        "error",
        {
          object: "Object",
          property: "defineProperty",
          message: "Object.defineProperty は使用禁止です。",
        },
        {
          object: "Object",
          property: "defineProperties",
          message: "Object.defineProperties は使用禁止です。",
        },
        {
          object: "Object",
          property: "create",
          message: "Object.create は使用禁止です。",
        },
        {
          object: "Object",
          property: "getPrototypeOf",
          message: "Object.getPrototypeOf は使用禁止です。",
        },
        {
          object: "Object",
          property: "getOwnPropertyNames",
          message: "Object.getOwnPropertyNames は使用禁止です。",
        },
        {
          object: "Object",
          property: "isSealed",
          message: "Object.isSealed は使用禁止です。",
        },
        {
          object: "Object",
          property: "isFrozen",
          message: "Object.isFrozen は使用禁止です。",
        },
        {
          object: "Object",
          property: "isExtensible",
          message: "Object.isExtensible は使用禁止です。",
        },
        {
          object: "Object",
          property: "getOwnPropertyDescriptor",
          message: "Object.getOwnPropertyDescriptor は使用禁止です。",
        },
        {
          object: "Object",
          property: "seal",
          message: "Object.seal は使用禁止です。",
        },
        {
          object: "Object",
          property: "freeze",
          message: "Object.freeze は使用禁止です。",
        },
        {
          object: "Object",
          property: "preventExtensions",
          message: "Object.preventExtensions は使用禁止です。",
        },
      ],

      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='anchor']",
          message: "String.prototype.anchor は使用禁止です。",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='big']",
          message: "String.prototype.big は使用禁止です。",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='blink']",
          message: "String.prototype.blink は使用禁止です。",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='bold']",
          message: "String.prototype.bold は使用禁止です。",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='fixed']",
          message: "String.prototype.fixed は使用禁止です。",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='fontcolor']",
          message: "String.prototype.fontcolor は使用禁止です。",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='fontsize']",
          message: "String.prototype.fontsize は使用禁止です。",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='italics']",
          message: "String.prototype.italics は使用禁止です。",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='link']",
          message: "String.prototype.link は使用禁止です。",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='small']",
          message: "String.prototype.small は使用禁止です。",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='strike']",
          message: "String.prototype.strike は使用禁止です。",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='sub']",
          message: "String.prototype.sub は使用禁止です。",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='sup']",
          message: "String.prototype.sup は使用禁止です。",
        },
      ],
    },
  },
]);
