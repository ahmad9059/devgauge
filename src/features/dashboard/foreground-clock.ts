export type ClockLifecycle = {
  subscribe: (listener: (active: boolean) => void) => () => void;
  isActive: () => boolean;
};

/** Minute ticks while visible; resume updates immediately without any I/O. */
export function startForegroundClock(
  update: (now: Date) => void,
  lifecycle: ClockLifecycle,
  now: () => Date = () => new Date(),
): () => void {
  let timer: ReturnType<typeof setInterval> | undefined;
  const stopTimer = () => {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
  };
  const setActive = (active: boolean) => {
    stopTimer();
    if (!active) return;
    update(now());
    timer = setInterval(() => update(now()), 60_000);
  };
  const unsubscribe = lifecycle.subscribe(setActive);
  setActive(lifecycle.isActive());
  return () => {
    stopTimer();
    unsubscribe();
  };
}
