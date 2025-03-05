import Anthropic from '@anthropic-ai/sdk';
import { BrowserWindow } from 'electron';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { isDebug } from './utility';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Class to handle Anthropic API calls from the main process
export class AnthropicService {
  private anthropic: Anthropic;
  private apiKey: string;
  private codeExplanationCache: Map<string, string> = new Map(); // Cache for explanations

  constructor() {
    // Get API key from environment variable
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    
    if (isDebug) {
      console.log('Anthropic API key status:', this.apiKey ? 'Found' : 'Missing');
    }
    
    this.setupClient();
  }
  
  // Clear the cache if it gets too large
  private manageCacheSize(): void {
    const MAX_CACHE_SIZE = 50; // Maximum number of entries
    if (this.codeExplanationCache.size > MAX_CACHE_SIZE) {
      // Convert to array, sort by last access, and take most recent ones
      const entries = Array.from(this.codeExplanationCache.entries());
      this.codeExplanationCache = new Map(entries.slice(-MAX_CACHE_SIZE/2)); // Keep half
    }
  }

  private setupClient(): void {
    if (!this.apiKey) {
      console.error('Anthropic API key not found. Please set ANTHROPIC_API_KEY environment variable.');
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
    if (!this.anthropic) {
      window.webContents.send('explanation-error', 'Anthropic client not initialized - API key missing');
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
      
      // Check if we have this code in cache
      if (this.codeExplanationCache.has(code)) {
        if (isDebug) {
          console.log('Using cached explanation for code');
        }
        
        // Send the cached explanation
        const cachedExplanation = this.codeExplanationCache.get(code);
        
        // Simulate streaming with chunks for better UX
        const chunkSize = 100;
        for (let i = 0; i < cachedExplanation.length; i += chunkSize) {
          const chunk = cachedExplanation.substring(i, i + chunkSize);
          window.webContents.send('explanation-chunk', chunk);
          
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Signal completion
        window.webContents.send('explanation-complete');
        return;
      }
      
      // Not in cache, detect language
      const language = this.detectLanguage(code);
      
      // Accumulate the full explanation to save in cache
      let fullExplanation = '';
      
      // Create a streaming message
      const stream = await this.anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Please explain this code in detail, covering what it does, how it works, and any important concepts. 

Format your explanation using Markdown with:
- Clear headings for major sections
- Bullet points for key points
- Code blocks with syntax highlighting for examples or specific parts (use \`\`\`${language} for code blocks)
- Bold or italic for emphasis when helpful

Be thorough but clear in your explanation.

\`\`\`${language}
${code}
\`\`\``,
          },
        ],
        stream: true,
      });

      // Process the stream
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.text) {
          // Accumulate for cache
          fullExplanation += chunk.delta.text;
          
          // Send each chunk to the renderer process
          window.webContents.send('explanation-chunk', chunk.delta.text);
        }
      }

      // Store in cache
      this.codeExplanationCache.set(code, fullExplanation);
      this.manageCacheSize();
      
      // Signal completion
      window.webContents.send('explanation-complete');
    } catch (error) {
      console.error('Error explaining code:', error);
      window.webContents.send('explanation-error', 'Error generating explanation');
    }
  }

  // Function to detect language from code - simple implementation
  private detectLanguage(code: string): string {
    if (code.includes('function') || code.includes('const') || code.includes('let') || code.includes('var')) {
      return 'javascript';
    }
    if (code.includes('interface') || code.includes('class') || code.includes('export type')) {
      return 'typescript';
    }
    if (code.includes('import React') || code.includes('useState') || code.includes('jsx')) {
      return 'jsx';
    }
    if (code.includes('def ') || code.includes('import ') && code.includes(':')) {
      return 'python';
    }
    if (code.includes('func ') || code.includes('package ')) {
      return 'go';
    }
    if (code.includes('public class') || code.includes('private class')) {
      return 'java';
    }
    if (code.includes('#include')) {
      return 'cpp';
    }
    return 'javascript'; // Default
  }
}

export default new AnthropicService();