import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

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

// Function to detect language from code - simple implementation
/** TODO: remove the duplicate one here (explainer-ui), CodeExplainer, AnthropicServer */
const detectLanguage = (code: string): string => {
  if (
    code.includes('function') ||
    code.includes('const') ||
    code.includes('let') ||
    code.includes('var')
  ) {
    return 'javascript';
  }
  if (
    code.includes('interface') ||
    code.includes('class') ||
    code.includes('export type')
  ) {
    return 'typescript';
  }
  if (
    code.includes('import React') ||
    code.includes('useState') ||
    code.includes('jsx')
  ) {
    return 'jsx';
  }
  if (
    code.includes('def ') ||
    (code.includes('import ') && code.includes(':'))
  ) {
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
};

const ExplainerApp: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const explanationRef = useRef<HTMLDivElement>(null);

  // Compute syntax highlighting language
  const language = detectLanguage(code);

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

    // Register all listeners if API is available
    if ((window as any).electronAPI) {
      (window as any).electronAPI.onCodeToExplain(handleCodeToExplain);
      (window as any).electronAPI.onExplanationStart(handleExplanationStart);
      (window as any).electronAPI.onExplanationChunk(handleExplanationChunk);
      (window as any).electronAPI.onExplanationComplete(
        handleExplanationComplete,
      );
      (window as any).electronAPI.onExplanationError(handleExplanationError);
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
          language={language}
          style={vscDarkPlus}
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
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    language={match[1]}
                    style={vscDarkPlus}
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
