/**
 * Retrying the things worth retrying.
 *
 * School connections drop mid-request. A page of a script is a few hundred
 * kilobytes, and losing one to a blip means the teacher photographs it again --
 * so an upload is tried again before it is called a failure.
 *
 * Only transport failures and server-side trouble are retried. A validation
 * error, a permission error or a duplicate will fail exactly the same way next
 * time, and retrying those just makes the teacher wait longer to be told off.
 */

/** Errors that mean "the same request might work in a moment". */
const RETRYABLE_CODES = new Set([
  "NETWORK_ERROR",
  "BAD_RESPONSE",
  "HTTP_ERROR",
  "TIMEOUT",
  "SERVER_ERROR",
]);

/** How many goes in total: the first try plus two more. */
export const ATTEMPTS = 3;

/** First wait, doubling: 700ms, then 1400ms. */
export const BASE_DELAY = 700;

export function isRetryable(error) {
  if (!error) return false;
  if (error.code && RETRYABLE_CODES.has(error.code)) return true;
  // A 5xx is the server having a bad moment; a 4xx is the request being wrong.
  if (typeof error.status === "number") return error.status >= 500;
  // fetch() rejects with a TypeError when the network is the problem.
  return error.name === "TypeError";
}

/** Waits, so a retry is a pause rather than a hammering. */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run `attempt`, retrying a retryable failure with exponential backoff.
 *
 * `onRetry(attemptNumber, waitMs)` lets a screen say "trying again" rather
 * than looking stuck.
 *
 * @template T
 * @param {() => Promise<T>} attempt
 * @param {{ attempts?: number, baseDelay?: number, onRetry?: (n: number, wait: number) => void }} [options]
 * @returns {Promise<T>}
 */
export async function withRetry(attempt, options = {}) {
  const attempts = options.attempts || ATTEMPTS;
  const base = options.baseDelay === undefined ? BASE_DELAY : options.baseDelay;

  let lastError;
  for (let go = 1; go <= attempts; go += 1) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      const last = go === attempts;
      if (last || !isRetryable(error)) throw error;

      const wait = base * 2 ** (go - 1);
      if (options.onRetry) options.onRetry(go, wait);
      await delay(wait);
    }
  }
  throw lastError;
}

/** True when the browser believes it has no connection. */
export function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** Call `handler` when the connection comes back or goes away. */
export function onConnectionChange(handler) {
  const online = () => handler(true);
  const offline = () => handler(false);
  window.addEventListener("online", online);
  window.addEventListener("offline", offline);
  return () => {
    window.removeEventListener("online", online);
    window.removeEventListener("offline", offline);
  };
}
