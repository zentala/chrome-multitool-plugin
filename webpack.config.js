const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const webpack = require('webpack');

module.exports = {
  entry: {
    popup: './src/popup.tsx',
    background: './src/background/index.ts',
    bookmarkManager: './src/bookmarkManager.tsx',
    favouritesAllegro: './src/favouritesAllegro.tsx',
    allegroCartPageInjector: './src/injectors/allegroCart.ts',
    globalInjector: './src/injectors/global.ts',
    youtube: './src/injectors/youtube.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                noEmit: false,
              },
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  devtool: 'cheap-module-source-map',
  optimization: {
  },
  plugins: [
    new Dotenv(),
    new webpack.DefinePlugin({
      // Keep DefinePlugin for potential future use, but remove manual definitions handled by Dotenv
      // 'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
      // 'process.env.EXCHANGERATE_API_KEY': JSON.stringify(process.env.EXCHANGERATE_API_KEY)
    }),
    new HtmlWebpackPlugin({
      template: './public/popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
    }),
    new HtmlWebpackPlugin({
      template: './public/bookmarkManager.html',
      filename: 'bookmarkManager.html',
      chunks: ['bookmarkManager'],
    }),
    new HtmlWebpackPlugin({
      template: './public/favouritesAllegro.html',
      filename: 'favouritesAllegro.html',
      chunks: ['favouritesAllegro'],
    }),
    new CopyPlugin({
      patterns: [
        { from: "public/manifest.json", to: "manifest.json" },
        // { from: "public/icons", to: "icons" }, // Commenting out as public/icons doesn't exist yet
      ],
    })
  ],
}; 