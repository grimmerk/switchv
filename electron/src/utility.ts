/** tip: https://github.com/electron/forge/issues/442#issuecomment-368736955 */
const { BUILD_TYPE } = require('./build.json');

export const isDebug = BUILD_TYPE !== 'prod';
