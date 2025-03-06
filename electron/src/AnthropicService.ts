import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import { BrowserWindow } from 'electron';
import * as path from 'path';
import { isDebug } from './utility';
import { DEFAULT_EXPLAINER_PROMPT, processPromptTemplate } from './explainer-prompt';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Class to handle Anthropic API calls from the main process
export class AnthropicService {
  private anthropic: Anthropic;
  private apiKey: string;
  private customPrompt: string | null = null;
  private codeExplanationCache: Map<string, { explanation: string; prompt: string }> = new Map(); // Cache for explanations with prompt used
  private SERVER_URL = 'http://localhost:55688';

  constructor() {
    // Get API key from environment variable
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';

    if (isDebug) {
      console.log(
        'Anthropic API key status:',
        this.apiKey ? 'Found' : 'Missing',
      );
    }

    this.setupClient();
    this.loadSettings();
  }

  // Load settings from database
  private async loadSettings(): Promise<void> {
    try {
      const response = await fetch(`${this.SERVER_URL}/explainer-settings`);
      if (response.ok) {
        const settings = await response.json();

        if (settings) {
          // Update custom prompt if available
          if (settings.customPrompt !== undefined) {
            this.customPrompt = settings.customPrompt;
          }

          // Always update API key regardless of whether it's empty or not
          if (settings.apiKey !== undefined) {
            // This will update even if empty, allowing user to clear the API key
            this.apiKey = settings.apiKey;
            // Fall back to environment variable if empty
            if (this.apiKey === '') {
              this.apiKey = process.env.ANTHROPIC_API_KEY || '';
            }
            this.setupClient(); // Re-initialize client with updated API key
          }
        }
      }
    } catch (error) {
      console.error('Failed to load explainer settings:', error);
    }
  }

  // Clear the cache if it gets too large
  private manageCacheSize(): void {
    const MAX_CACHE_SIZE = 50; // Maximum number of entries
    if (this.codeExplanationCache.size > MAX_CACHE_SIZE) {
      // Convert to array and keep only the most recent entries
      const entries = Array.from(this.codeExplanationCache.entries());
      this.codeExplanationCache = new Map(entries.slice(-MAX_CACHE_SIZE / 2)); // Keep half
    }
  }
  
  // Clear all cache entries - useful when prompt template changes significantly
  public clearCache(): void {
    this.codeExplanationCache.clear();
    if (isDebug) {
      console.log('Explanation cache cleared');
    }
  }

  private setupClient(): void {
    if (this.apiKey === undefined) {
      console.error(
        'Anthropic API key not found. Please set ANTHROPIC_API_KEY environment variable.',
      );
      return;
    }

    this.anthropic = new Anthropic({
      apiKey: this.apiKey,
    });
  }

  /**
   * Explain code using Anthropic's Claude API with streaming response
   * @param code The code to explain
   * @param window The BrowserWindow to send updates to
   */
  public async explainCode(code: string, window: BrowserWindow): Promise<void> {
    // Always reload settings to get latest prompt and API key
    await this.loadSettings();
    
    if (!this.anthropic) {
      window.webContents.send(
        'explanation-error',
        'Anthropic client not initialized - API key missing',
      );
      return;
    }

    try {
      // Check if window is still valid
      if (!window || window.isDestroyed()) {
        console.error('Window is no longer valid');
        return;
      }

      // Start with empty explanation - this will reset the UI
      window.webContents.send('explanation-start');

      // Get the prompt template to use
      const promptTemplate = this.customPrompt || DEFAULT_EXPLAINER_PROMPT;
      
      // Process the prompt template by replacing {selected_text} with the actual code
      const prompt = processPromptTemplate(promptTemplate, code);

      // Check if we have this code in cache with the same prompt
      const cacheKey = code;
      const cachedItem = this.codeExplanationCache.get(cacheKey);
      
      if (cachedItem && cachedItem.prompt === promptTemplate) {
        if (isDebug) {
          console.log('Using cached explanation for code');
          if (cachedItem.language) {
            console.log('Using cached language detection:', cachedItem.language);
          }
        }

        // Send the cached explanation
        const cachedExplanation = cachedItem.explanation;

        // If we have cached language info, send it immediately
        if (cachedItem.language) {
          window.webContents.send('detected-language', cachedItem.language);
        }

        // Send the entire explanation at once instead of chunking
        // This avoids potential duplication issues with chunking
        window.webContents.send('explanation-chunk', cachedExplanation);

        // Signal completion with language info
        window.webContents.send('explanation-complete', { 
          language: cachedItem.language 
        });
        return;
      }

      // Accumulate the full explanation to save in cache
      let fullExplanation = '';

      // Create a streaming message
      const stream = await this.anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: true,
      });

      // Variables to track code block languages
      let detectedLanguage = '';
      let foundFirstCodeBlock = false;
      let accumulatedText = '';

      // Process the stream
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.text) {

          console.debug("debugging delta:", chunk.delta.text);

          // Accumulate for cache
          fullExplanation += chunk.delta.text;
          
          // Accumulate text to detect language from first code block
          if (!foundFirstCodeBlock) {
            accumulatedText += chunk.delta.text;
            
            // Check if this chunk contains a code block start with language
            const codeBlockMatch = accumulatedText.match(/```(\w+)/);
            if (codeBlockMatch && codeBlockMatch[1]) {
              detectedLanguage = codeBlockMatch[1].toLowerCase();
              foundFirstCodeBlock = true;
              
              if (isDebug) {
                console.log(`Detected language from code block: ${detectedLanguage}`);
              }
              
              // Send a special message to notify about detected language
              window.webContents.send('detected-language', detectedLanguage);
            }
          }

          // Send each chunk to the renderer process - but only if it's not empty
          if (chunk.delta.text.trim().length > 0) {
            window.webContents.send('explanation-chunk', chunk.delta.text);
          }
        }
      }

      console.debug("debugging final fullExplanation:", fullExplanation);
      
      // After streaming is complete, send the full explanation again
      // This ensures we have a clean, non-duplicated explanation in the UI
      window.webContents.send('explanation-chunk', fullExplanation);
      
      if (isDebug) {
        console.log("fullExplanation:", fullExplanation.substring(0, 200) + "...");
        if (detectedLanguage) {
          console.log("Detected language from code blocks:", detectedLanguage);
        }
      }

      // Store in cache with the prompt used
      this.codeExplanationCache.set(code, {
        explanation: fullExplanation,
        prompt: promptTemplate,
        language: detectedLanguage
      });
      this.manageCacheSize();

      // Signal completion with detected language (if any)
      window.webContents.send('explanation-complete', { language: detectedLanguage });
    } catch (error) {
      console.error('Error explaining code:', error);
      window.webContents.send(
        'explanation-error',
        this.apiKey ? 'Error generating explanation' : 'API key is missing',
      );
    }
  }
  
  /**
   * Handle chat messages in the Code Explainer by sending them to Claude API
   * @param message The user's chat message
   * @param window The BrowserWindow to send updates to
   * @param messageHistory The current message history from the UI
   */
  public async handleChatMessage(message: string, window: BrowserWindow, messageHistory: any[]): Promise<void> {
    // Always reload settings to get latest API key
    await this.loadSettings();
    
    if (!this.anthropic) {
      window.webContents.send(
        'chat-response-error',
        'Anthropic client not initialized - API key missing',
      );
      return;
    }

    try {
      // Check if window is still valid
      if (!window || window.isDestroyed()) {
        console.error('Window is no longer valid');
        return;
      }

      // Signal chat response starting
      window.webContents.send('chat-response-start');
      
      // Format the message history for Claude API
      // Filter out system messages and transform to Claude's format
      const formattedMessages = messageHistory
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));
      
      // Add the current message
      formattedMessages.push({
        role: 'user',
        content: message,
      });

      // Accumulate the full response to return
      let fullResponse = '';

      // Create a streaming chat message
      const stream = await this.anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000,
        messages: formattedMessages,
        stream: true,
      });

      // Process the stream
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.text) {
          // Accumulate full response
          fullResponse += chunk.delta.text;

          // Send each chunk to the renderer process - but only if it's not empty
          if (chunk.delta.text.trim().length > 0) {
            window.webContents.send('chat-response-chunk', chunk.delta.text);
          }
        }
      }

      // Signal completion
      window.webContents.send('chat-response-complete');
      
      // Send the full response for the UI to add to its state
      window.webContents.send('chat-response', fullResponse);
      
      if (isDebug) {
        console.log("Chat response sent. Length:", fullResponse.length);
      }
    } catch (error) {
      console.error('Error in chat response:', error);
      window.webContents.send(
        'chat-response-error',
        this.apiKey ? 'Error generating response' : 'API key is missing',
      );
    }
  }

  // Language detection is now handled by the LLM itself
}

export default new AnthropicService();
