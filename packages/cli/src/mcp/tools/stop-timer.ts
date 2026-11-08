import { stop } from '../../commands/timer';
import { defineTool } from '../tool';
import { time } from './fields';

/** `stop_timer`. */
export const stopTimerTool = defineTool({
  name: 'stop_timer',
  description: 'Stops the running entry now, or at an earlier time.',
  write: true,
  shape: { at: time('End, default now').optional() },
  run: (ctx, { at }) => stop(ctx, at),
});
