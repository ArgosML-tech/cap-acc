'use strict';
const assert = require('assert');
const { retry } = require('../src/retry');

function makeErr(opts = {}) {
  const err = new Error(opts.message || 'fail');
  if (opts.status) err.status = opts.status;
  if (opts.code) err.code = opts.code;
  return err;
}

describe('retry', () => {
  it('returns result on first success', async () => {
    const result = await retry(() => Promise.resolve(42));
    assert.strictEqual(result, 42);
  });

  it('retries on retryable error and succeeds', async () => {
    let calls = 0;
    const result = await retry(
      () => {
        calls++;
        if (calls < 3) throw makeErr({ status: 503 });
        return Promise.resolve('ok');
      },
      { attempts: 3, delay: 1, factor: 1 }
    );
    assert.strictEqual(result, 'ok');
    assert.strictEqual(calls, 3);
  });

  it('throws after exhausting all attempts', async () => {
    let calls = 0;
    await assert.rejects(
      () => retry(
        () => { calls++; throw makeErr({ status: 503 }); },
        { attempts: 3, delay: 1, factor: 1 }
      ),
      /fail/
    );
    assert.strictEqual(calls, 3);
  });

  it('does not retry on non-retryable error', async () => {
    let calls = 0;
    await assert.rejects(
      () => retry(
        () => { calls++; throw makeErr({ status: 500 }); },
        { attempts: 3, delay: 1, on: [503] }
      )
    );
    assert.strictEqual(calls, 1);
  });

  it('retries on error code ETIMEDOUT', async () => {
    let calls = 0;
    await assert.rejects(
      () => retry(
        () => { calls++; throw makeErr({ code: 'ETIMEDOUT' }); },
        { attempts: 2, delay: 1, factor: 1 }
      )
    );
    assert.strictEqual(calls, 2);
  });

  it('respects custom on list', async () => {
    let calls = 0;
    await assert.rejects(
      () => retry(
        () => { calls++; throw makeErr({ status: 429 }); },
        { attempts: 3, delay: 1, on: [429] }
      )
    );
    assert.strictEqual(calls, 3);
  });
});
