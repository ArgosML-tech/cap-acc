'use strict';

function createMockPayload(id, data = {}) {
  return JSON.stringify({
    id,
    timestamp: new Date().toISOString(),
    ...data,
  });
}

module.exports = { createMockPayload };
