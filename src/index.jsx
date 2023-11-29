import React from 'react';
import ReactDOM from 'react-dom/client';
import { PockestProvider } from './contexts/PockestContext';
import { AppProvider } from './contexts/AppContext';
import App from './components/App';
import './index.css';
import postDiscord from './utils/postDiscord';

const APP_ID = 'PockestHelperExtension';
let mainEl = document.getElementById(APP_ID);
mainEl = document.createElement('div');
mainEl.id = APP_ID;
document.querySelector('body').appendChild(mainEl);
ReactDOM.createRoot(mainEl).render(
  <React.StrictMode>
    <PockestProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </PockestProvider>
  </React.StrictMode>,
);

(async () => {
  console.log(import.meta.env.APP_VERSION, import.meta.env.DISCORD_HOOK);
  await postDiscord('testing connection');
})();
