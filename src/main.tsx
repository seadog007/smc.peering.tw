import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './App.tsx';
import TopologyPage from './components/TopologyPage.tsx';
import 'driver.js/dist/driver.css';
import './index.css';

const queryClient = new QueryClient();

const normalizedPath = window.location.pathname.replace(/\/+$/, '');
const Root = normalizedPath === '/topology' ? TopologyPage : App;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  </React.StrictMode>,
);
