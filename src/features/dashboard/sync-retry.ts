/** Initial attempt plus three silent retries for transient failures. */
export async function retrySync(
  attempt: () => Promise<'success' | 'retry' | 'stop'>,
  wait: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
): Promise<boolean> {
  for (let index = 0; index < 4; index += 1) {
    let result: 'success' | 'retry' | 'stop';
    try {
      result = await attempt();
    } catch {
      result = 'retry';
    }
    if (result === 'success') return true;
    if (result === 'stop') return false;
    if (index < 3) await wait(500 * 2 ** index);
  }
  return false;
}
