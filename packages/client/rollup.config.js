import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import resolve from 'rollup-plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.browser,
      format: 'iife',
      name: 'PresentiClient',
      globals: {
        '@clusterws/cws': 'cws',
        'ws': 'ws',
        'events': 'events'
      }
    }
  ],
  plugins: [
    replace({
      'process.env.VUE_APP_EXISTS': 'true'
    }),
    resolve({ 'jsnext:main': true, preferBuiltins: true }),
    commonjs({
      include: /node_modules/
    }),
    typescript({
      typescript: require('typescript')
    }),
    babel(),
    terser()
  ],
  watch: {
    clearScreen: false
  }
}