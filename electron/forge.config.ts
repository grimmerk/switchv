import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const fs = require('fs');

const config: ForgeConfig = {
  hooks: {
    generateAssets: async () => {
      fs.writeFileSync(
        './src/build.json',
        JSON.stringify({
          BUILD_TYPE: process.env.BUILD_TYPE,
        }),
      );
    },
  },
  packagerConfig: {
    appBundleId: 'com.lifeoverflow.switchv',
    icon: 'images/icon',
    extraResource: [
      '../server/SwitchV-server-macos',
      '../server/prisma/schema.prisma',
      'node_modules/prisma',
      'node_modules/@prisma/engines/migration-engine-darwin',
      'node_modules/@prisma/engines/introspection-engine-darwin',
      'node_modules/@prisma/engines/libquery_engine-darwin.dylib.node',
      'node_modules/@prisma/engines/prisma-fmt-darwin',
      '../node_modules',
      'images/MenuBar.png',
      'images/MenuBar@2x.png',
    ],
    extendInfo: {
      LSUIElement: true,
      LSMinimumSystemVersion: '12.0',
    },
    osxSign: {},
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin', 'mas']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new WebpackPlugin({
      devContentSecurityPolicy:
        "default-src * self blob: data: gap:; style-src * self 'unsafe-inline' blob: data: gap:; script-src * 'self' 'unsafe-eval' 'unsafe-inline' blob: data: gap:; object-src * 'self' blob: data: gap:; img-src * self 'unsafe-inline' blob: data: gap:; connect-src self * 'unsafe-inline' blob: data: gap:; frame-src * self blob: data: gap:;",
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/renderer.ts',
            name: 'main_window',
            preload: {
              js: './src/preload.ts',
            },
          },
        ],
      },
    }),
  ],
};

export default config;
