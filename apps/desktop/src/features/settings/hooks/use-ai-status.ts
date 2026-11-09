import { useCallback, useEffect, useState } from 'react';

import { aiApi, type AiStatus } from '../../../shared/bridge/ai-api';
import { runAction } from '../../../shared/lib/run-action';

/** The AI setup status, refreshed on mount, plus a runner that applies one setup step. */
export const useAiStatus = () => {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void runAction('Read AI setup', aiApi.status).then((next) => {
      if (next !== undefined) {
        setStatus(next);
      }
    });
  }, []);

  const run = useCallback(async (label: string, step: () => Promise<AiStatus>) => {
    setBusy(true);
    const next = await runAction(label, step);
    setBusy(false);
    if (next !== undefined) {
      setStatus(next);
    }
  }, []);

  return { status, busy, run };
};
