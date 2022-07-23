import * as React from 'react';
import * as ReactDOM from 'react-dom';

import './index.css';
import App from './App';

function render() {
  // deprecated
  // ReactDOM.render(<h2>Hello from React!</h2>, document.getElementById('root'));

  /** react 18 new way */
  // @ts-ignore
  const root = ReactDOM.createRoot(
    document.getElementById('root')
  );
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

render();