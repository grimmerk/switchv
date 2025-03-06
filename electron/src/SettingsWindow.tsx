import React, { useEffect, useState } from 'react';
import ExplainerSettingsForm from './ExplainerSettingsForm';
import ApiKeySettingsForm from './ApiKeySettingsForm';
import LeftClickSettingsForm from './LeftClickSettingsForm';
import * as ReactDOM from 'react-dom/client';

enum SettingsType {
  EXPLAINER = 'explainer',
  API_KEY = 'apiKey',
  LEFT_CLICK = 'leftClick',
}

// Styles for the main container
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#1a1a1a',
    color: '#f8f8f2',
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    boxSizing: 'border-box' as 'border-box',
  },
};

interface SettingsWindowProps {
  initialSettingsType?: SettingsType;
}

const SettingsWindow: React.FC<SettingsWindowProps> = ({ 
  initialSettingsType = SettingsType.EXPLAINER 
}) => {
  const [activeSettings, setActiveSettings] = useState<SettingsType>(initialSettingsType);

  const closeWindow = () => {
    window.close();
  };

  const renderSettingsForm = () => {
    switch (activeSettings) {
      case SettingsType.EXPLAINER:
        return <ExplainerSettingsForm onClose={closeWindow} />;
      case SettingsType.API_KEY:
        return <ApiKeySettingsForm onClose={closeWindow} />;
      case SettingsType.LEFT_CLICK:
        return <LeftClickSettingsForm onClose={closeWindow} />;
      default:
        return <div>Unknown settings type</div>;
    }
  };

  return (
    <div style={styles.container}>
      {renderSettingsForm()}
    </div>
  );
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Try to get the settings type from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const settingsType = urlParams.get('type') as SettingsType || SettingsType.EXPLAINER;
  
  const root = ReactDOM.createRoot(document.getElementById('settings-root'));
  root.render(<SettingsWindow initialSettingsType={settingsType} />);
  
  // Listen for IPC events to switch between settings types
  (window as any).electronAPI.onOpenExplainerSettings(() => {
    const root = ReactDOM.createRoot(document.getElementById('settings-root'));
    root.render(<SettingsWindow initialSettingsType={SettingsType.EXPLAINER} />);
  });
  
  (window as any).electronAPI.onOpenApiKeySettings(() => {
    const root = ReactDOM.createRoot(document.getElementById('settings-root'));
    root.render(<SettingsWindow initialSettingsType={SettingsType.API_KEY} />);
  });
  
  (window as any).electronAPI.onOpenLeftClickSettings(() => {
    const root = ReactDOM.createRoot(document.getElementById('settings-root'));
    root.render(<SettingsWindow initialSettingsType={SettingsType.LEFT_CLICK} />);
  });
});

export default SettingsWindow;