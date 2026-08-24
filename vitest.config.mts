import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Unit tests. Node environment, no jsdom and no React Testing Library.
 *
 * Everything under `tests/unit` exercises server-side logic — validation,
 * the storage façade's byte checks, the rate limit's arithmetic, and the
 * read façade's PUBLISHED filter. None of it renders a component, so the
 * browser-shaped half of the usual Next.js Vitest setup is not installed.
 * Add it with the first component test, not before.
 *
 * Rendering coverage is Playwright's job (`tests/e2e`), which is the right
 * tool anyway: the pages here are async Server Components, which Vitest
 * cannot render — see node_modules/next/dist/docs/01-app/02-guides/testing.
 */
export default defineConfig({
  resolve: {
    /*
      Resolves the `@/*` alias from tsconfig.json, so tests import exactly
      the specifiers the application does. This is Vite's own support for
      it — the `vite-tsconfig-paths` plugin the Next.js guide recommends
      now prints a notice saying it is redundant, and npm reports it
      unmaintained. Fewer dependencies for the same behaviour.
    */
    tsconfigPaths: true,

    alias: {
      /*
        `server-only` throws by design anywhere outside a React Server
        Component, which would make every module under src/server and
        src/lib/storage.ts untestable. The package ships an empty build for
        exactly this, selected by the "react-server" export condition; this
        aliases straight to it rather than turning that condition on
        globally, which would also change how react and next resolve.
      */
      "server-only": fileURLToPath(new URL("node_modules/server-only/empty.js", import.meta.url)),
    },
  },

  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // Playwright owns tests/e2e and has its own runner.
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
