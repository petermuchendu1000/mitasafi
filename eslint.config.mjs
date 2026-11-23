/**
 * ESLint configuration.
 *
 * WHY THIS FILE EXISTS
 *   Until now there was no ESLint config anywhere in this repository — no
 *   .eslintrc*, no eslint.config.*, no "eslintConfig" key in package.json —
 *   while package.json declared `"lint": "eslint ."`. ESLint 9 requires a flat
 *   config and refuses to run without one, so `npm run lint` exited 2 on every
 *   file, including files it had never opened. The lint gate was not failing;
 *   it had never run. Verified by pointing eslint at a file untouched for
 *   months and getting the same exit 2.
 *
 *   eslint-config-next was also pinned at 15.1.3 against Next 16.1.1. The v15
 *   package is eslintrc-style and would need a FlatCompat shim; v16 ships a
 *   real flat config and peers on eslint >=9. It was upgraded rather than
 *   shimmed, so the framework and its own lint rules agree on a major version.
 *
 * WHAT IS ENABLED
 *   eslint-config-next/core-web-vitals — the set `next lint` applied by default
 *   before Next 16 removed that command. Four flat configs: next,
 *   next/typescript, a shared base, and core-web-vitals.
 *
 *   Three TypeScript rules it does NOT enable are added below. They are not an
 *   opinion imposed on this codebase; the codebase already asked for them. A
 *   census of its own suppression comments found:
 *       108  eslint-disable @typescript-eslint/no-explicit-any
 *         3  eslint-disable @typescript-eslint/no-require-imports
 *   None of those rules was configured, so all 111 directives suppressed
 *   nothing and ESLint reported every one of them as an unused directive —
 *   111 of the first run's 136 warnings. Enabling the rules makes the existing
 *   comments mean what their authors intended and catches NEW occurrences,
 *   which is the opposite of relaxing a check. no-unused-vars is added for the
 *   same reason it is in typescript-eslint's own recommended set: it catches
 *   dead bindings and misspelled identifiers that tsc permits.
 *
 * WHAT THE FIRST REAL RUN FOUND (2026-11-22, 539 files)
 *   62 errors, 377 warnings, across 166 files. The errors are
 *   react-hooks/set-state-in-effect (36), react/no-unescaped-entities (17),
 *   react-hooks/refs (4), react-hooks/immutability (3), react-hooks/purity (2).
 *   The warnings are dominated by @typescript-eslint/no-unused-vars (306,
 *   spread over 131 files: 230 defined-never-used, 76 assigned-never-used) and
 *   @typescript-eslint/no-explicit-any (41 NOT already suppressed).
 *
 *   None of that is fixed here. This file makes the gate run; the backlog it
 *   exposes is a separate piece of work. `npm run lint` therefore exits 1 on
 *   the errors, which is the truthful result and must not be silenced by
 *   downgrading rules. Nothing in CI runs lint yet, deliberately: wiring it in
 *   while 62 errors stand would produce a permanently red workflow, and a
 *   permanently red workflow is one nobody reads.
 *
 *   eslint-config-prettier comes LAST and switches off the 178 stylistic rules
 *   that would argue with Prettier, which already runs in the pre-commit hook
 *   via lint-staged. Formatting is settled there; ESLint judges correctness.
 *   Order matters — anything after it could re-enable a rule Prettier owns.
 */

import next from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";

/**
 * Flat config resolves a rule's plugin from the SAME config object, not from a
 * global registry, so adding "@typescript-eslint/..." rules in a bare object
 * fails with "could not find plugin". Rather than import and register a second
 * copy of the plugin — two instances of the same plugin is its own class of
 * bug — reuse the instance eslint-config-next already loaded.
 */
const typescriptPlugins = next.find(
  (entry) => entry.plugins && entry.plugins["@typescript-eslint"],
)?.plugins;

if (!typescriptPlugins) {
  // Fail loudly. If a future eslint-config-next stops registering the plugin
  // under this name, silently dropping the three rules below would look like a
  // clean lint run rather than a reduced one.
  throw new Error(
    "eslint.config.mjs: eslint-config-next no longer registers an " +
      "'@typescript-eslint' plugin, so the project's TypeScript rules cannot " +
      "be attached. Re-point them before trusting a green lint run.",
  );
}

// Named rather than exported anonymously, because this config's own
// import/no-anonymous-default-export rule applies to this file too.
const config = [
  {
    // Build output and generated files. node_modules is already ignored by
    // flat config, so listing it would be noise.
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },

  ...next,

  {
    name: "mitasafi/typescript",
    // Same scope as next/typescript, which is where the plugin is registered.
    files: ["**/*.ts", "**/*.tsx"],
    plugins: typescriptPlugins,
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          // A leading underscore is the conventional "deliberately unused".
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Must stay last: it only turns rules OFF.
  { name: "prettier-compat", ...prettier },
];

export default config;
