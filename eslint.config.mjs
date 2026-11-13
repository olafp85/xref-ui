import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: [
            "dist/**",
            "webapp/libs/**",
            "webapp/localService/**",
            "webapp/test/**"
        ]
    },
    js.configs.recommended,
    {
        files: ["**/*.js", "**/*.mjs"],
        languageOptions: {
            globals: {
                ...globals.node
            }
        }
    },
    {
        files: ["webapp/**/*.ts"],
        extends: [tseslint.configs.recommendedTypeChecked],
        languageOptions: {
            globals: {
                ...globals.browser
            },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            }
        }
    },
    {
        rules: {
            "curly": "off",
            "linebreak-style": "off"
        }
    }
);
