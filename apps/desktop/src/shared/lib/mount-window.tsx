import '../styles/tokens.css';

import { MotionConfig } from 'motion/react';
import { type ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createLogger } from '../adapters/logger';
import { ErrorBoundary } from '../ui/error-boundary';
import { Toaster } from '../ui/toaster';
import { followAccent } from './accent';

/** Renders one window root into `#root` with an error boundary and a toaster. */
export const mountWindow = (name: string, root: ReactNode): void => {
  const logger = createLogger();
  const container = document.getElementById('root');
  if (container === null) {
    logger.error('Root element missing', { window: name });
    return;
  }
  const onError = (error: Error): void => {
    logger.error('Render failed', { window: name, error: error.stack ?? error.message });
  };
  followAccent(logger);
  createRoot(container).render(
    <StrictMode>
      <MotionConfig reducedMotion="user">
        <ErrorBoundary onError={onError}>
          {root}
          <Toaster />
        </ErrorBoundary>
      </MotionConfig>
    </StrictMode>,
  );
  logger.info('Window started', { window: name });
};
