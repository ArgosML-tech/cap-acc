'use strict';

const DEFAULT_RETRYABLE = [503, 429, 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'];

function isRetryable(err, on) {
  const triggers = on || DEFAULT_RETRYABLE;
  for (const trigger of triggers) {
    if (typeof trigger === 'number' && (err.status === trigger || err.statusCode === trigger)) return true;
    if (typeof trigger === 'string' && err.code === trigger) return true;
  }
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {() => Promise<any>} fn
 * @param {{ attempts?: number, delay?: number, factor?: number, on?: Array<number|string> }} [options]
 */
async function retry(fn, options = {}) {
  const { attempts = 3, delay = 500, factor = 2, on } = options;
  let lastErr;
  let wait = delay;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts && isRetryable(err, on)) {
        await sleep(wait);
        wait *= factor;
      } else if (!isRetryable(err, on)) {
        throw err;
      }
    }
  }

  throw lastErr;
}

module.exports = { retry };
