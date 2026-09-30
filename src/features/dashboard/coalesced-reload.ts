/** Merge overlapping refresh requests without missing a later provider save. */
export function createCoalescedReload(
  load: () => Promise<void>,
): () => Promise<void> {
  let pending: Promise<void> | null = null;
  let dirty = false;
  return () => {
    dirty = true;
    if (pending) return pending;
    pending = (async () => {
      try {
        while (dirty) {
          dirty = false;
          await load();
        }
      } finally {
        pending = null;
      }
    })();
    return pending;
  };
}
