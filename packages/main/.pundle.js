const path = require('path');
const tsConfig = require('./tsconfig');
const mainTSConfig = require('../../tsconfig');

const extensions = ['js', 'jsx', 'ts', 'tsx'];

module.exports = {
  debug: true,
  // ^ Setting this to true sets "process.env.NODE_ENV" to "development" in processed js, it's set to "production" otherwise
  entry: ['./src/index.ts'],
  output: {
    bundlePath: './dist/bundle.js',
    sourceMap: true,
    sourceMapPath: './dist/bundle.js.map',
  },
  server: {
    port: 8080,
    hmrPath: '/bundle_hmr',
    hmrHost: 'http://localhost:8080',
    bundlePath: '/bundle.js',
    sourceMapPath: '/bundle.js.map',
    redirectNotFoundToIndex: true,
  },
  presets: [
    [
      require.resolve('pundle-preset-default'),
      {
        resolver: false,
        loader: false,
      }
    ],
    [
      require.resolve('pundle-preset-typescript'),
      {
        loader: {
          extensions,
        },
        resolver: {
          packageMains: ['typescript:main', 'module', 'browser', 'main'],
          extensions,
        },
        transformer: {
          extensions,
          config: {
            compilerOptions: Object.assign(
              {},
              mainTSConfig.compilerOptions,
              tsConfig.compilerOptions
            )
          }
        }
      }
    ],
  ],
};
