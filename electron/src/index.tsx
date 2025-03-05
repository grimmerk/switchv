import * as React from 'react';
import { useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom';

import App from './App';
import CodeExplainer from './CodeExplainer';
import './index.css';

// Component to decide which UI to render
const RootComponent: React.FC = () => {
  const [isCodeExplainer, setIsCodeExplainer] = useState(false);
  const [receivedCode, setReceivedCode] = useState('');

  console.log('RootComponent rendering, isCodeExplainer:', isCodeExplainer);

  useEffect(() => {
    console.log('RootComponent useEffect running');

    // Check if we're in the Code Explainer window
    const checkForCodeExplainer = (_event: any, code: string) => {
      console.log('Code received via IPC, length:', code?.length || 0);

      if (code && code.trim().length > 0) {
        setReceivedCode(code);
        setIsCodeExplainer(true);
      }
    };

    // Listen for code to explain event - this is how main signals us
    if (
      (window as any).electronAPI &&
      (window as any).electronAPI.onCodeToExplain
    ) {
      console.log('Setting up onCodeToExplain listener');
      (window as any).electronAPI.onCodeToExplain(checkForCodeExplainer);
    } else {
      console.warn('electronAPI or onCodeToExplain not available');
    }

    // Log APIs available in window
    console.log(
      'Available APIs:',
      Object.keys((window as any).electronAPI || {}),
    );

    // The URL approach is not necessary anymore, but keeping for debugging
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode');
    console.log('URL mode parameter:', modeParam);

    if (modeParam === 'codeExplainer') {
      console.log('Setting code explainer mode from URL param');
      setIsCodeExplainer(true);
    }
  }, []);

  // Print which component we're rendering on each state change
  useEffect(() => {
    console.log('Mode changed to:', isCodeExplainer ? 'CodeExplainer' : 'App');

    // Disable App logging when in explainer mode
    if (isCodeExplainer) {
      // Create a no-op console for App component
      const originalConsole = console.log;
      console.log = function (...args) {
        // Only log if not from App.tsx
        const stack = new Error().stack || '';
        if (!stack.includes('App.tsx')) {
          originalConsole.apply(console, args);
        }
      };

      return () => {
        // Restore original console when unmounting
        console.log = originalConsole;
      };
    }
  }, [isCodeExplainer]);

  // Don't render both components - only render the active one
  // This prevents App component from initializing when we're in explainer mode
  if (isCodeExplainer) {
    return (
      <div className="code-explainer-container">
        <CodeExplainer />
      </div>
    );
  } else {
    return (
      <div className="app-container">
        <App />
      </div>
    );
  }
};

function render() {
  /** react 18 new way */
  // @ts-ignore
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    // this is only for helping to find not good react code when developing, after make sure the code is OK
    // we should remove it.
    // its side effect is it will trigger <App/> twice
    // <React.StrictMode>
    <RootComponent />,
    // </React.StrictMode>
  );
}

render();
