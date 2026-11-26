import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // SWC menggantikan esbuild supaya decorator metadata NestJS ikut ter-emit.
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    // Semua test berbagi satu database test; jalankan file secara berurutan.
    fileParallelism: false,
  },
});
