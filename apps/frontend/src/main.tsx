import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/base.css';
import './styles/game.css';

const root = document.getElementById('root');
if (!root) throw new Error('Falta el contenedor principal de la aplicación.');

createRoot(root).render(<StrictMode><App /></StrictMode>);
