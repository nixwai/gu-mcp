import { defineConfig } from 'tsdown';
import type { UserConfig } from 'tsdown';

// sharedConfig 保存两个入口共同使用的 Node ESM 打包规则。
const sharedConfig: UserConfig = {
  banner: '#!/usr/bin/env node',
  clean: true,
  dts: false,
  format: ['esm'],
  hash: false,
  outExtensions: () => ({ js: '.js' }),
  outputOptions: {
    codeSplitting: false,
  },
  minify: false,
  outDir: 'dist',
  platform: 'node',
  sourcemap: false,
  target: 'node22.18',
};

// tsdown 打包配置：分别输出 stdio 与 HTTP 两个独立可执行入口。
export default defineConfig([
  {
    ...sharedConfig,
    entry: {
      stdio: './src/entry/stdio.ts',
    },
  },
  {
    ...sharedConfig,
    entry: {
      http: './src/entry/http.ts',
    },
  },
]);
