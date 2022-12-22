const fs = require('fs');

module.exports = {
  hooks: {
    generateAssets: async () => {
      fs.writeFileSync(
        './src/build.json',
        JSON.stringify({
          buildType: process.env.BUILD_TYPE,
        }),
      );
    },
  },
  packagerConfig: {
    icon: 'images/icon',
    extraResource: [
      '../server/xwin-server-macos',
      '../server/prisma/schema.prisma',
      'node_modules/prisma',
      'node_modules/@prisma/engines/migration-engine-darwin',
      '../node_modules',
      'images/MenuBar.png',
      'images/MenuBar@2x.png',
    ],
    extendInfo: {
      LSUIElement: true,
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'electron',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    [
      '@electron-forge/plugin-webpack',
      {
        devContentSecurityPolicy:
          "default-src * self blob: data: gap:; style-src * self 'unsafe-inline' blob: data: gap:; script-src * 'self' 'unsafe-eval' 'unsafe-inline' blob: data: gap:; object-src * 'self' blob: data: gap:; img-src * self 'unsafe-inline' blob: data: gap:; connect-src self * 'unsafe-inline' blob: data: gap:; frame-src * self blob: data: gap:;",
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
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
      },
    ],
  ],
};
