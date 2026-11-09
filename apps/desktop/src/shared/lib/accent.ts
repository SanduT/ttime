import type { Logger } from '@ttime/core';

import { type Accent, settingsApi } from '../bridge/settings-api';

/** Puts `accent` on the root element; the tokens switch on `data-accent`. */
export const setAccent = (accent: Accent): void => {
  document.documentElement.dataset['accent'] = accent;
};

/** Applies the saved accent and follows changes made in Settings. */
export const followAccent = (logger: Logger): void => {
  settingsApi
    .prefs()
    .then((prefs) => {
      setAccent(prefs.accent);
    })
    .catch((error: unknown) => {
      logger.warn('Could not read the accent', { error: String(error) });
    });
  void settingsApi.onAccentChanged(setAccent);
};
