import { defineConfig } from 'tsdown';

// tsdown 打包配置：仅输出可执行的 ESM 入口文件。
export default defineConfig({
  banner: '#!/usr/bin/env node',
  clean: true,
  dts: false,
  entry: ['./src/index.ts'],
  format: ['esm'],
  outExtensions: () => ({ js: '.js' }),
  minify: false,
  outDir: 'dist',
  platform: 'node',
  sourcemap: false,
  target: 'node22.18',
});
