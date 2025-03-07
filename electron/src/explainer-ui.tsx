/**
 * explainer-ui.tsx
 * 
 * This component provides an enhanced version of the Code Explainer interface with:
 * 1. Advanced markdown rendering for Claude's responses (including code blocks)
 * 2. Better styling and layout for the explanation part
 * 3. Chat interface for continued conversation with Claude
 */

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { detectLanguage } from './language-detector';

// Styles for the Code Explainer UI
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#2d2d2d',
    color: '#f8f8f2',
    fontFamily: 'Arial, sans-serif',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 15px',
    backgroundColor: '#1a1a1a',
    borderBottom: '1px solid #3a3a3a',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold' as 'bold',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#f8f8f2',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 5px',
  },
  codeSection: {
    padding: '15px',
    borderBottom: '1px solid #3a3a3a',
    maxHeight: '30%', // Reduced from 40% to make room for chat
    overflow: 'auto',
  },
  divider: {
    height: '1px',
    backgroundColor: '#3a3a3a',
    margin: '0 15px',
  },
  explanationSection: {
    padding: '15px',
    flex: 1, // Takes available space
    overflow: 'auto',
    position: 'relative' as 'relative',
  },
  explanation: {
    margin: 0,
    lineHeight: '1.5',
    color: '#f8f8f2',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: '14px',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    color: '#a8a8a8',
  },
  loadingIndicator: {
    display: 'inline-block',
    width: '8px',
    height: '16px',
    backgroundColor: '#a8a8a8',
    marginLeft: '5px',
    animation: 'blink 1s step-end infinite',
  },
  // Chat interface styles
  chatContainer: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    height: 'calc(100% - 60px)', // Adjust for header
    backgroundColor: '#252525',
    flex: 1,
  },
  chatInputContainer: {
    borderTop: '1px solid #3a3a3a',
    padding: '15px',
    position: 'sticky' as 'sticky',
    bottom: 0,
    backgroundColor: '#252525',
    zIndex: 10,
    width: '100%',
    boxSizing: 'border-box' as 'border-box',
    marginTop: '10px',
  },
  chatInput: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#2d2d2d',
    border: '1px solid #3a3a3a',
    borderRadius: '4px',
    color: '#f8f8f2',
    padding: '10px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  sendButton: {
    backgroundColor: '#4a4a4a',
    border: 'none',
    borderRadius: '4px',
    color: '#f8f8f2',
    marginLeft: '10px',
    padding: '10px 15px',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap' as 'nowrap',
  },
  chatMessages: {
    padding: '15px 15px 20px 15px', // Added more padding at bottom
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column' as 'column',
    marginBottom: '10px', // Add margin to ensure content isn't cut off
  },
  messageContainer: {
    marginBottom: '15px',
    display: 'flex',
    flexDirection: 'column' as 'column',
    maxWidth: '100%',
  },
  userMessage: {
    alignSelf: 'flex-end' as 'flex-end',
    backgroundColor: '#3a3a3a',
    color: '#f8f8f2',
    padding: '8px 12px',
    borderRadius: '12px 12px 0 12px',
    maxWidth: '90%',
    width: 'fit-content' as 'fit-content',
    marginBottom: '5px',
    wordBreak: 'break-word' as 'break-word',
  },
  assistantMessage: {
    alignSelf: 'flex-start' as 'flex-start',
    backgroundColor: '#424242',
    color: '#f8f8f2',
    padding: '8px 12px',
    borderRadius: '12px 12px 12px 0',
    maxWidth: '98%', // Slightly smaller to ensure no content is cut off at the edge
    width: 'fit-content' as 'fit-content',
    marginBottom: '5px',
    wordBreak: 'break-word' as 'break-word',
    overflow: 'hidden' as 'hidden',
  },
  messageSender: {
    fontSize: '12px',
    color: '#a8a8a8',
    marginBottom: '5px',
  },
};

// Use @speed-highlight/core to detect programming language
// This will provide more accurate language detection for the input code display
const getDefaultLanguage = (code: string): string => {
  if (!code || code.trim().length === 0) {
    return 'javascript'; // Default for empty code
  }

  try {
    // detectLanguage returns language ID or null if not detected
    const detectedLang = detectLanguage(code);
    console.debug('Detected language:', detectedLang);

    // Map detected language to react-syntax-highlighter supported language
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'sh': 'bash',
      'html': 'html',
      'css': 'css',
      'sass': 'sass',
      'scss': 'scss',
      'md': 'markdown',
      'json': 'json',
      'yaml': 'yaml',
      'xml': 'xml',
      'sql': 'sql'
    };
    
    return detectedLang && langMap[detectedLang] ? langMap[detectedLang] : 'javascript';
  } catch (error) {
    console.error('Error detecting language:', error);
    return 'javascript'; // Fallback
  }
};

// Define a type for the message structure
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const ExplainerApp: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const explanationRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [showChat, setShowChat] = useState<boolean>(false);

  // Initial language detection for the input code using our detector
  const [inputLanguage, setInputLanguage] = useState<string>(detectLanguage(code));
  // State to track language detected by LLM in its response
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  
  // Update inputLanguage when code changes
  useEffect(() => {
    if (code && code.trim()) {
      const detected = detectLanguage(code);
      setInputLanguage(detected);
      console.log(`Local detection for input code: ${detected}`);
    }
  }, [code]);
  
  // Auto-scroll chat when messages change or loading state changes
  useEffect(() => {
    if (chatMessagesRef.current && messages.length > 0) {
      // Use setTimeout to ensure DOM is fully updated before scrolling
      setTimeout(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [messages, isLoading]);
  
  console.log('ExplainerApp rendering');

  // Set up listeners for all the events (once only)
  useEffect(() => {
    console.log('Setting up event listeners');

    // Handler for receiving code
    const handleCodeToExplain = (_event: any, receivedCode: string) => {
      console.log(
        'Received code to explain, length:',
        receivedCode?.length || 0,
      );
      setCode(receivedCode || '');
      
      // Reset chat when new code is received
      setMessages([]);
      setShowChat(false);
    };

    // Handler for explanation start
    const handleExplanationStart = () => {
      console.log('Explanation started');
      // Clear the explanation state completely
      setExplanation('');
      setIsLoading(true);
      setIsComplete(false);
      
      // Reset messages when a new explanation starts
      setMessages([]);
      setShowChat(false);
    };

    // Handler for explanation chunks
    const handleExplanationChunk = (_event: any, chunk: string) => {
      // If chunk is very large (full explanation), just set it directly
      // Otherwise append to existing explanation
      if (chunk.length > 1000) {
        setExplanation(chunk);
      } else {
        setExplanation((prev) => prev + chunk);
      }

      // Auto-scroll
      if (explanationRef.current) {
        explanationRef.current.scrollTop = explanationRef.current.scrollHeight;
      }
    };

    // Handler for explanation complete
    const handleExplanationComplete = () => {
      console.log('Explanation complete');
      setIsLoading(false);
      setIsComplete(true);
      
      // After explanation is complete, initialize messages for chat
      // but don't show them yet (they'll be visible when chat is toggled on)
      if (messages.length === 0 && code && explanation) {
        const initialMessages: Message[] = [
          { role: 'system', content: 'Initial code snippet and explanation for context' },
          { role: 'user', content: code },
          { role: 'assistant', content: explanation }
        ];
        setMessages(initialMessages);
      }
    };

    // Handler for explanation errors
    const handleExplanationError = (_event: any, error: string) => {
      console.error('Explanation error:', error);
      setExplanation((prev) => prev + '\n\nError: ' + error);
      setIsLoading(false);
    };

    // Handler for detected language from code blocks
    const handleDetectedLanguage = (_event: any, language: string) => {
      if (language) {
        console.log(`Language detected from code block: ${language}`);
        setDetectedLanguage(language);
        setInputLanguage(language); // Update the input display language too
      }
    };
    
    // Handler for chat response
    const handleChatResponse = (_event: any, responseText: string) => {
      // Add the assistant's response to the messages
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      setIsLoading(false);
    };
    
    // Handler for directly opening chat interface (without code)
    const handleOpenChatInterface = () => {
      console.log('Opening chat interface directly');
      // Clear any existing code/explanation
      setCode('');
      setExplanation('');
      // Show chat interface
      setShowChat(true);
      
      // Initialize with welcome message if no messages exist
      if (messages.length === 0) {
        setMessages([
          { 
            role: 'assistant', 
            content: "Hello! I'm Claude, an AI assistant. How can I help you with your code today?" 
          }
        ]);
      }
    };
    
    // Store all event handlers to remove them on cleanup
    const handlers = {
      'code-to-explain': handleCodeToExplain,
      'explanation-start': handleExplanationStart,
      'explanation-chunk': handleExplanationChunk,
      'explanation-complete': handleExplanationComplete,
      'explanation-error': handleExplanationError,
      'detected-language': handleDetectedLanguage,
      'chat-response': handleChatResponse,
      'open-chat-interface': handleOpenChatInterface
    };
    
    // Register all listeners if API is available
    if ((window as any).electronAPI) {
      (window as any).electronAPI.onCodeToExplain(handleCodeToExplain);
      (window as any).electronAPI.onExplanationStart(handleExplanationStart);
      (window as any).electronAPI.onExplanationChunk(handleExplanationChunk);
      (window as any).electronAPI.onExplanationComplete(handleExplanationComplete);
      (window as any).electronAPI.onExplanationError(handleExplanationError);
      (window as any).electronAPI.onDetectedLanguage(handleDetectedLanguage);
      
      // Chat-related event listeners
      if ((window as any).electronAPI.onChatResponse) {
        (window as any).electronAPI.onChatResponse(handleChatResponse);
      }
      
      // Open chat interface event listener
      if ((window as any).electronAPI.onOpenChatInterface) {
        (window as any).electronAPI.onOpenChatInterface(handleOpenChatInterface);
      }
    } else {
      console.error('electronAPI not available');
    }

    // Cleanup function to remove all event listeners
    return () => {
      if ((window as any).electronAPI) {
        console.log('Cleaning up event listeners');
        const ipcRenderer = require('electron').ipcRenderer;
        
        // Remove all listeners
        Object.entries(handlers).forEach(([channel, handler]) => {
          ipcRenderer.removeListener(channel, handler);
        });
      }
    };
    
    // Empty dependency array ensures this effect runs only once when component mounts
  }, []);

  const closeWindow = () => {
    window.close();
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    // Add user message to chat
    const userMessage: Message = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    
    // Send message to main process
    if ((window as any).electronAPI && (window as any).electronAPI.sendChatMessage) {
      (window as any).electronAPI.sendChatMessage(inputValue, messages);
      setIsLoading(true);
    } else {
      console.error('sendChatMessage not available');
    }
    
    // Clear input field
    setInputValue('');
    
    // Focus input after sending
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Toggle chat visibility
  const toggleChat = () => {
    setShowChat(prev => {
      const newState = !prev;
      // If showing chat for the first time and we have explanation, setup initial messages
      if (newState && messages.length === 0 && code && explanation) {
        // In unified chat view, add code and explanation as first messages
        const initialMessages: Message[] = [
          { role: 'system', content: 'Initial code snippet and explanation for context' },
          { role: 'user', content: code },
          { role: 'assistant', content: explanation }
        ];
        setMessages(initialMessages);
        
        // Ensure messages are scrolled to bottom
        setTimeout(() => {
          if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
          }
        }, 100);
      }
      return newState;
    });
  };

  // Render the markdown content
  const renderMarkdown = (content: string) => {
    return (
      <ReactMarkdown
        children={content}
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                language={match[1]}
                style={vscDarkPlus as any}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Style other markdown elements
          p: ({ children }) => (
            <p style={{ marginTop: '0.5em', marginBottom: '0.5em' }}>
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul style={{ paddingLeft: '20px' }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ paddingLeft: '20px' }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ margin: '0.2em 0' }}>{children}</li>
          ),
          h1: ({ children }) => (
            <h1 style={{ fontSize: '1.5em', marginTop: '0.8em', marginBottom: '0.5em' }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ fontSize: '1.3em', marginTop: '0.8em', marginBottom: '0.5em' }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ fontSize: '1.1em', marginTop: '0.8em', marginBottom: '0.5em' }}>
              {children}
            </h3>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{ borderLeft: '4px solid #444', paddingLeft: '10px', margin: '0.5em 0' }}>
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  // Calculate content height based on whether chat is visible
  const getCodeSectionStyle = () => {
    return { maxHeight: '40%' }; // Code section height (only visible in non-chat mode)
  };
  
  const getContentHeight = () => {
    return showChat ? { maxHeight: '30%' } : {}; // Reduce height if chat is shown
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Code Explainer</h2>
        <div>
          <button 
            style={{ ...styles.closeButton, marginRight: '5px' }} 
            onClick={toggleChat}
            title={showChat ? "Hide Chat" : "Show Chat"}
          >
            {showChat ? "↑" : "↓"}
          </button>
          <button style={styles.closeButton} onClick={closeWindow}>
            ✕
          </button>
        </div>
      </div>

      {!showChat&& (<div style={{...styles.codeSection, ...getCodeSectionStyle()}}>
        <SyntaxHighlighter
          language={inputLanguage}
          style={vscDarkPlus as any}
          customStyle={{
            background: '#1e1e1e',
            marginTop: 0,
            borderRadius: '4px',
            fontSize: '14px',
            lineHeight: '1.5',
            height: 'auto',
          }}
          showLineNumbers={true}
          wrapLines={true}
        >
          {code || '// Waiting for code...'}
        </SyntaxHighlighter>
      </div>)}

      {!showChat && <div style={styles.divider}></div>}

      {/* Only show explanation when chat is not active */}
      {!showChat && (
        <div style={{ ...styles.explanationSection, ...getContentHeight() }} ref={explanationRef}>
          <div style={styles.explanation}>
            <ReactMarkdown
              // Remove the LANGUAGE: line from display
              children={explanation.replace(/^LANGUAGE:\s*\w+\s*\n*/i, '')}
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      language={match[1]}
                      style={vscDarkPlus as any}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                // Style other markdown elements
                p: ({ children }) => (
                  <p style={{ marginTop: '0.5em', marginBottom: '0.5em' }}>
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul style={{ paddingLeft: '20px' }}>{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol style={{ paddingLeft: '20px' }}>{children}</ol>
                ),
                li: ({ children }) => (
                  <li style={{ margin: '0.2em 0' }}>{children}</li>
                ),
                h1: ({ children }) => (
                  <h1
                    style={{
                      fontSize: '1.5em',
                      marginTop: '0.8em',
                      marginBottom: '0.5em',
                    }}
                  >
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2
                    style={{
                      fontSize: '1.3em',
                      marginTop: '0.8em',
                      marginBottom: '0.5em',
                    }}
                  >
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3
                    style={{
                      fontSize: '1.1em',
                      marginTop: '0.8em',
                      marginBottom: '0.5em',
                    }}
                  >
                    {children}
                  </h3>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    style={{
                      borderLeft: '4px solid #444',
                      paddingLeft: '10px',
                      margin: '0.5em 0',
                    }}
                  >
                    {children}
                  </blockquote>
                ),
              }}
            >
              {explanation}
            </ReactMarkdown>

            {isLoading && (
              <div style={styles.loading}>
                <span>[Generating</span>
                <span style={styles.loadingIndicator}>▋</span>
                <span>]</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Chat section - completely replaces explanation section when active */}
      {showChat && (
        <div style={styles.chatContainer}>
          {/* Messages display */}
          <div style={styles.chatMessages} ref={chatMessagesRef}>
            {/* Show all messages including initial code and explanation as chat */}
            {messages.filter(msg => msg.role !== 'system').map((msg, index) => (
                <div key={index} style={styles.messageContainer}>
                  <div style={{ 
                    ...styles.messageSender, 
                    textAlign: msg.role === 'user' ? 'right' : 'left' 
                  } as any}>
                    {msg.role === 'user' ? 'You' : 'Claude'}
                  </div>
                  <div style={msg.role === 'user' ? styles.userMessage : styles.assistantMessage}>
                    {msg.role === 'user' ? (
                      // For user messages that contain the original code, use syntax highlighting
                      msg.content === code ? (
                        <SyntaxHighlighter
                          language={inputLanguage}
                          style={vscDarkPlus as any}
                          customStyle={{
                            background: 'transparent',
                            padding: 0,
                            margin: 0,
                            fontSize: '14px',
                            lineHeight: '1.5',
                          }}
                          showLineNumbers={true}
                          wrapLines={true}
                        >
                          {msg.content}
                        </SyntaxHighlighter>
                      ) : (
                        <div style={{whiteSpace: 'pre-wrap'}}>{msg.content}</div>
                      )
                    ) : (
                      renderMarkdown(msg.content)
                    )}
                  </div>
                </div>
              ))
            }
            
            {isLoading && (
              <div style={{ ...styles.messageContainer, alignItems: 'flex-start' }}>
                <div style={styles.messageSender}>Claude</div>
                <div style={{ ...styles.assistantMessage, display: 'flex' }}>
                  <span>Thinking</span>
                  <span style={styles.loadingIndicator}>▋</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Input area - now in a sticky container */}
          <div style={styles.chatInputContainer}>
            <div style={styles.chatInput}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Ask a follow-up question..."
                style={styles.textInput}
                disabled={isLoading}
              />
              <button 
                style={styles.sendButton} 
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  const root = ReactDOM.createRoot(document.getElementById('explainer-root'));
  root.render(<ExplainerApp />);

  console.log('ExplainerApp rendered');
});
