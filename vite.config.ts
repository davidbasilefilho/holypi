import { defineConfig } from "vite-plus";

export default defineConfig({
  root: import.meta.dirname,
  test: {
    testTimeout: 20_000,
  },
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    plugins: ["oxc", "node", "import", "promise", "unicorn", "typescript"],
  },
  fmt: {
    jsdoc: true,
    sortImports: true,
    sortPackageJson: true,
  },
});
