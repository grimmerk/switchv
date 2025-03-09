/** tip: https://github.com/electron/forge/issues/442#issuecomment-368736955 */
const { BUILD_TYPE } = require('./build.json');

export const isDebug = BUILD_TYPE !== 'prod';

// Define UI modes for AI Assistant window
export enum AIAssistantUIMode {
  // Split view with code on top and insight below
  INSIGHT_SPLIT = 'insight_split',
  
  // Chat interface with code and insight as first messages
  // The LLM has already been queried for an insight
  INSIGHT_CHAT = 'insight_chat',
  
  // Chat interface with source code as first message, but no insight requested yet
  // User needs to ask a question first
  INSIGHT_SOURCE_CHAT = 'insight_source_chat',
  
  // Smart chat interface with no code or insight
  SMART_CHAT = 'smart_chat'
}

// Legacy enum for backward compatibility during refactoring
// TODO: Remove once migration to AIAssistantUIMode is complete
export enum ExplainerUIMode {
  EXPLANATION_SPLIT = AIAssistantUIMode.INSIGHT_SPLIT,
  CHAT_WITH_EXPLANATION = AIAssistantUIMode.INSIGHT_CHAT,
  CHAT_WITH_CODE = AIAssistantUIMode.INSIGHT_SOURCE_CHAT,
  PURE_CHAT = AIAssistantUIMode.SMART_CHAT
}
