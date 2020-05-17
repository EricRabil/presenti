/**
 * Export der Komponente läuft über "rollup"
 * Das scheint die einzige Möglichkeit zu sein die funktioniert
 *
 * Weitere Infos:
 *      https://rollupjs.org/guide/en/
 *
 * Cheat-Sheet:
 *      https://devhints.io/rollup
 */
import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';
import commonjs from 'rollup-plugin-commonjs'; // Convert CommonJS modules to ES6
import vue from 'rollup-plugin-vue'; // Handle .vue SFC files
import resolve from '@rollup/plugin-node-resolve';
import del from 'rollup-plugin-delete'
import css from 'rollup-plugin-css-porter';
import sass from 'rollup-plugin-sass';
import postcss from 'rollup-plugin-postcss';
import { terser } from 'rollup-plugin-terser';

export default {
    input: 'src/index.ts', // our source file
    output: [
        {
            // Keep the bundle as an ES module file, suitable for other bundlers
            // and inclusion as a <script type=module> tag in modern browsers
            name: 'Renderer',
            file: 'lib/renderer.esm.js',
            format: 'esm', // the preferred format
            sourcemap: true,
        },
        {
            // Universal Module Definition, works as amd, cjs and iife all in one
            name: 'Renderer',
            file: 'lib/renderer.umd.js',
            format: 'umd',
            sourcemap: true,
            globals: {
                'vue-property-decorator': 'vuePropertyDecorator'
            }
        },
        {
            // A self-executing function, suitable for inclusion as a <script> tag.
            // (If you want to create a bundle for your application, you probably want to use this.)
            name: 'Renderer',
            file: 'lib/renderer.min.js',
            format: 'iife',
            sourcemap: true,
            globals: {
                'vue-property-decorator': 'vuePropertyDecorator'
            },
            // plugins: [terser()]
        },
        {
            // CommonJS, suitable for Node and other bundlers
            name: 'Renderer',
            file: 'lib/renderer.cjs.js',
            format: 'cjs',
            sourcemap: true,
        },
    ],

    external: [
        ...Object.keys(pkg.dependencies || {}),
        "tslib",
        "vue",
        // "vue-class-component",
        // "vue-property-decorator",
        "vuex",
        "vuex-class",
        "vuetify",
        "vuetify/lib"
    ],
    plugins: [
        postcss({
          extensions: ['.css']
        }),
        typescript({
            typescript: require('typescript'),
            objectHashIgnoreUnknownHack: true,
            module: 'esnext',
            tsconfig: "tsconfig.json",
            tsconfigOverride: { exclude: [ "node_modules" ] }
        }),
        commonjs(),

        // [Rollup Plugin Vue](https://rollup-plugin-vue.vuejs.org/)
        vue({
            css: true, // Dynamically inject css as a <style> tag
            compileTemplate: true, // Explicitly convert template to render function
            needMap: false
        }),
        sass(),
        css(),
        resolve({ 'jsnext:main': true, preferBuiltins: true }),
        // terser() // minifies generated bundles

        del({
            targets: 'lib/main.d.ts',
            hook: 'generateBundle'
        })
    ],
    watch: {
      clearScreen: false
    }
};