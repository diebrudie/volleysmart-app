
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

console.log('Application starting - main.tsx');

createRoot(document.getElementById("root")!).render(
  <App />
);
