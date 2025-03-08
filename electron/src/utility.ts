/** tip: https://github.com/electron/forge/issues/442#issuecomment-368736955 */
const { BUILD_TYPE } = require('./build.json');

export const isDebug = BUILD_TYPE !== 'prod';

// Define UI modes for explainer window
export enum ExplainerUIMode {
  // Split view with code on top and explanation below
  SPLIT = 'split',
  
  // Chat interface with code and explanation as first messages
  // The LLM has already been queried for an explanation
  CHAT_WITH_EXPLANATION = 'chat_with_explanation',
  
  // Chat interface with code as first message, but no explanation requested yet
  // User needs to ask a question first
  CHAT_WITH_CODE = 'chat_with_code',
  
  // Pure chat interface with no code or explanation
  PURE_CHAT = 'pure_chat'
}
