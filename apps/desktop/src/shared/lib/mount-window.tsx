import '../styles/tokens.css';

import { type ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createTauriLogger } from '../adapters/logger';

/** Renders one window root into `#root` and records the start in the shared log. */
export const mountWindow = (name: string, root: ReactNode): void => {
  const logger = createTauriLogger();
  const container = document.getElementById('root');
  if (container === null) {
    logger.error('Root element missing', { window: name });
    return;
  }
  createRoot(container).render(<StrictMode>{root}</StrictMode>);
  logger.info('Window started', { window: name });
};
