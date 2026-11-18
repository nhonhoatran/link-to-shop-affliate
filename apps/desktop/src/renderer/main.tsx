import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DesktopApp } from './desktop-app';
import './desktop-base.css';
import './desktop-layout.css';
import './desktop-review.css';

const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><DesktopApp api={window.desktop} /></StrictMode>);
