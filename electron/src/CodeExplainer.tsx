import React, { useState, useEffect, useRef } from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';

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
    borderRadius: '8px',
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
    whiteSpace: 'pre-wrap' as 'pre-wrap',
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
const detectLanguage = (code: string): string => {
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
};

const CodeExplainer: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const language = detectLanguage(code);
  const explanationRef = useRef<HTMLDivElement>(null);

  // Set up listeners for explanation events from main process
  const setupExplanationListeners = () => {
    console.log('CodeExplainer: Setting up explanation listeners');
    
    if (!(window as any).electronAPI) {
      console.error('CodeExplainer: electronAPI not available');
      return;
    }
    
    // Clear and initialize explanation when starting
    (window as any).electronAPI.onExplanationStart((_event: any) => {
      console.log('CodeExplainer: Explanation started');
      setExplanation('');
      setIsLoading(true);
      setIsComplete(false);
    });

    // Add text as it comes in from the stream
    (window as any).electronAPI.onExplanationChunk((_event: any, chunk: string) => {
      setExplanation((prev) => prev + chunk);
      
      // Auto-scroll to the bottom of the explanation
      if (explanationRef.current) {
        explanationRef.current.scrollTop = explanationRef.current.scrollHeight;
      }
    });

    // Mark as complete when done
    (window as any).electronAPI.onExplanationComplete((_event: any) => {
      setIsLoading(false);
      setIsComplete(true);
    });

    // Handle errors
    (window as any).electronAPI.onExplanationError((_event: any, errorMessage: string) => {
      console.error('Error explaining code:', errorMessage);
      setExplanation((prev) => prev + `\n\nError: ${errorMessage}`);
      setIsLoading(false);
    });
  };

  // Listen for code to explain from main process
  useEffect(() => {
    // Setup all the explanation listeners
    setupExplanationListeners();
    
    const handleCodeToExplain = (_event: any, receivedCode: string) => {
      console.log('CodeExplainer: Received new code to explain', receivedCode.substring(0, 50) + '...');
      
      // Reset state when receiving new code
      setIsLoading(true);
      setIsComplete(false);
      setExplanation('');
      
      // Set the new code
      setCode(receivedCode);
      // The explanation will be triggered by the main process
    };

    // Register event listener
    (window as any).electronAPI.onCodeToExplain(handleCodeToExplain);

    // Clean up
    return () => {
      // Not needed as Electron IPC doesn't provide a way to remove listeners directly
    };
  }, []);

  const closeWindow = () => {
    window.close();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Code Explainer</h2>
        <button style={styles.closeButton} onClick={closeWindow}>✕</button>
      </div>
      
      <div style={styles.codeSection}>
        <SyntaxHighlighter 
          language={language} 
          style={docco}
          customStyle={{ background: '#2a2a2a', marginTop: 0, borderRadius: '4px' }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
      
      <div style={styles.divider}></div>
      
      <div style={styles.explanationSection} ref={explanationRef}>
        <pre style={styles.explanation}>
          {explanation}
          {isLoading && (
            <div style={styles.loading}>
              <span>[Generating</span>
              <span style={styles.loadingIndicator}>▋</span>
              <span>]</span>
            </div>
          )}
        </pre>
      </div>
    </div>
  );
};

export default CodeExplainer;