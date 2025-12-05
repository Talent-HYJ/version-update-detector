import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import typescript from 'rollup-plugin-typescript2';

// 生产环境配置：移除 console 和压缩代码
const isProduction = process.env.NODE_ENV === 'production';

const terserConfig = {
  compress: {
    drop_console: true, // 移除所有 console 语句
    drop_debugger: true, // 移除 debugger 语句
    pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'] // 移除指定的 console 方法
  },
  format: {
    comments: false // 移除注释
  }
};

export default [
  // ES module build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        useTsconfigDeclarationDir: true
      }),
      ...(isProduction ? [terser(terserConfig)] : [])
    ]
  },
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        useTsconfigDeclarationDir: true
      }),
      ...(isProduction ? [terser(terserConfig)] : [])
    ]
  },
  // UMD build (minified)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'VersionUpdateDetector',
      sourcemap: true
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        useTsconfigDeclarationDir: true
      }),
      terser(terserConfig)
    ]
  }
];
