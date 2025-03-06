/**
 * explainer-ui.tsx
 * 
 * This component provides an enhanced version of the Code Explainer interface with:
 * 1. Advanced markdown rendering for Claude's responses (including code blocks)
 * 2. Better styling and layout for the explanation part
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
    maxHeight: '40%',
    overflow: 'auto',
  },
  divider: {
    height: '1px',
    backgroundColor: '#3a3a3a',
    margin: '0 15px',
  },
  explanationSection: {
    padding: '15px',
    flex: 1,
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

const ExplainerApp: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const explanationRef = useRef<HTMLDivElement>(null);

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
  
  // This effect is no longer needed as we now detect languages from code blocks directly
  // in the AnthropicService and send via 'detected-language' event

  console.log('ExplainerApp mounted');

  // Set up listeners for all the events
  useEffect(() => {
    console.log('Setting up event listeners');

    // Handler for receiving code
    const handleCodeToExplain = (_event: any, receivedCode: string) => {
      console.log(
        'Received code to explain, length:',
        receivedCode?.length || 0,
      );
      setCode(receivedCode || '');
    };

    // Handler for explanation start
    const handleExplanationStart = () => {
      console.log('Explanation started');
      setExplanation('');
      setIsLoading(true);
      setIsComplete(false);
    };

    // Handler for explanation chunks
    const handleExplanationChunk = (_event: any, chunk: string) => {
      setExplanation((prev) => prev + chunk);

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
    
    // Register all listeners if API is available
    if ((window as any).electronAPI) {
      (window as any).electronAPI.onCodeToExplain(handleCodeToExplain);
      (window as any).electronAPI.onExplanationStart(handleExplanationStart);
      (window as any).electronAPI.onExplanationChunk(handleExplanationChunk);
      (window as any).electronAPI.onExplanationComplete(handleExplanationComplete);
      (window as any).electronAPI.onExplanationError(handleExplanationError);
      (window as any).electronAPI.onDetectedLanguage(handleDetectedLanguage);
    } else {
      console.error('electronAPI not available');
    }

    // No cleanup needed as we want these listeners to persist
  }, []);

  const closeWindow = () => {
    window.close();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Code Explainer</h2>
        <button style={styles.closeButton} onClick={closeWindow}>
          ✕
        </button>
      </div>

      <div style={styles.codeSection}>
        <SyntaxHighlighter
          language={inputLanguage}
          style={vscDarkPlus as any}
          customStyle={{
            background: '#1e1e1e',
            marginTop: 0,
            borderRadius: '4px',
            fontSize: '14px',
            lineHeight: '1.5',
          }}
          showLineNumbers={true}
          wrapLines={true}
        >
          {code || '// Waiting for code...'}
        </SyntaxHighlighter>
      </div>

      <div style={styles.divider}></div>

      <div style={styles.explanationSection} ref={explanationRef}>
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
    </div>
  );
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  const root = ReactDOM.createRoot(document.getElementById('explainer-root'));
  root.render(<ExplainerApp />);

  console.log('ExplainerApp rendered');
});
