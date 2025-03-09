import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './index.css';
import SwitcherApp from './switcher-ui';

// Simple main window component - just renders the App
const RootComponent: React.FC = () => {
  return (
    <div className="app-container">
      <SwitcherApp />
    </div>
  );
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
