import { events } from './bindings';

/** What the Rust monitors report (a non-finite time arrives as null and is dropped) to the agent. Times are seconds since the Unix epoch. */
export type MonitorApi = {
  readonly onIdle: (handle: (since: number, returned: number) => void) => Promise<() => void>;
  readonly onForgotten: (
    handle: (hours: number, lastActivity: number) => void,
  ) => Promise<() => void>;
  readonly onAutoStop: (handle: (at: number) => void) => Promise<() => void>;
};

export const monitorApi: MonitorApi = {
  onIdle: (handle) =>
    events.monitorIdle.listen(({ payload: { since, returned } }) => {
      if (since !== null && returned !== null) {
        handle(since, returned);
      }
    }),
  onForgotten: (handle) =>
    events.monitorForgotten.listen(({ payload: { hours, lastActivity } }) => {
      if (lastActivity !== null) {
        handle(hours, lastActivity);
      }
    }),
  onAutoStop: (handle) =>
    events.monitorAutoStop.listen(({ payload: { at } }) => {
      if (at !== null) {
        handle(at);
      }
    }),
};
