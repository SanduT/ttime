import { isLocalTime } from '@ttime/core';

import type { Prefs } from '../../../shared/bridge/settings-api';
import { Checkbox } from '../../../shared/ui/checkbox';
import { CommitInput } from '../../../shared/ui/commit-input';
import { Row } from './section';

type Props = {
  readonly prefs: Prefs;
  readonly save: (patch: Partial<Prefs>) => void;
};

const DEFAULT_AUTO_STOP = '18:00';

/** A whole number from `text`, or null. */
const countOf = (text: string): number | null => (/^\d{1,3}$/.test(text) ? Number(text) : null);

const Muted = ({ children }: { readonly children: string }) => (
  <span className="text-sm text-(--color-text-muted)">{children}</span>
);

/** Idle detection, the forgotten-timer reminder and auto-stop (PRD 6.5). 0 turns one off. */
export const MonitorRows = ({ prefs, save }: Props) => (
  <>
    <Row label="Idle detection">
      <Muted>Ask after</Muted>
      <CommitInput
        label="Idle minutes"
        className="w-14 text-center tabular-nums"
        value={String(prefs.idleMinutes)}
        onCommit={(text) => {
          const idleMinutes = countOf(text);
          if (idleMinutes !== null) {
            save({ idleMinutes });
          }
        }}
      />
      <Muted>minutes without input (0 is off)</Muted>
    </Row>
    <Row label="Long timers">
      <Muted>Remind every</Muted>
      <CommitInput
        label="Reminder hours"
        className="w-14 text-center tabular-nums"
        value={String(prefs.forgottenHours)}
        onCommit={(text) => {
          const forgottenHours = countOf(text);
          if (forgottenHours !== null) {
            save({ forgottenHours });
          }
        }}
      />
      <Muted>hours of running (0 is off)</Muted>
    </Row>
    <Row label="Auto-stop">
      <Checkbox
        label="Stop timers left running after"
        checked={prefs.autoStop !== null}
        onChange={(on) => {
          save({ autoStop: on ? DEFAULT_AUTO_STOP : null });
        }}
      />
      <CommitInput
        label="Auto-stop time"
        className="w-20 text-center tabular-nums"
        value={prefs.autoStop ?? DEFAULT_AUTO_STOP}
        onCommit={(text) => {
          if (isLocalTime(text)) {
            save({ autoStop: text });
          }
        }}
      />
    </Row>
  </>
);
