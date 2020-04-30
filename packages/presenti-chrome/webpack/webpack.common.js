const webpack = require("webpack");
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const srcTypescriptDir = '../src/typescript/';

module.exports = {
    entry: {
        popup: path.join(__dirname, srcTypescriptDir + 'popup.ts'),
        options: path.join(__dirname, srcTypescriptDir + 'options.ts'),
        background: path.join(__dirname, srcTypescriptDir + 'background.ts'),
        content_script: path.join(__dirname, srcTypescriptDir + 'content_script.ts')
    },
    output: {
        path: path.join(__dirname, '../dist/js'),
        filename: '[name].js'
    },
    optimization: {
        splitChunks: {
            name: 'vendor',
            chunks: "initial"
        }
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    plugins: [
        // exclude locale files in moment
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        new CopyPlugin([
            { from: '.', to: '../' }
          ],
          {context: 'src/assets' }
        ),
    ]
};
