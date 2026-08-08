"use client";

import { useCallback, useRef, useState } from "react";

export function useAsyncAction() {
  const [pending, setPending] = useState(false);
  const runningRef = useRef(false);

  const execute = useCallback(async (action: () => Promise<void>) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPending(true);
    try {
      await action();
    } finally {
      runningRef.current = false;
      setPending(false);
    }
  }, []);

  return { pending, execute };
}
