'use strict';

async function streamToBuffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

module.exports = { streamToBuffer, bufferToBase64 };
