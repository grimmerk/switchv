import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';

// eslint-disable-next-line @typescript-eslint/no-var-requires
// const nodeExternals = require('webpack-node-externals');

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main.ts',
  // Put your normal webpack config below here
  module: {
    rules,
  },
  externals: {
    '@nestjs/microservices': '@nestjs/microservices',
    '@nestjs/websockets': '@nestjs/websockets',
    '@nestjs/websockets/socket-module': '@nestjs/websockets/socket-module',
    '@nestjs/microservices/microservices-module':
      '@nestjs/microservices/microservices-module',
  }, //[nodeExternals()],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
};
