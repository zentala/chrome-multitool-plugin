const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/popup.tsx',
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
    alias: {
      '@emotion/react': path.resolve(__dirname, 'node_modules/@emotion/react'),
      '@emotion/styled': path.resolve(__dirname, 'node_modules/@emotion/styled'),
      '@mui/material': path.resolve(__dirname, 'node_modules/@mui/material'),
    }
  },
  devtool: false,
  mode: 'development',
  optimization: {
    minimize: false,
    moduleIds: 'deterministic',
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
  plugins: [
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
      ],
    })
  ],
}; 