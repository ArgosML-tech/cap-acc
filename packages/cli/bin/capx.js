#!/usr/bin/env node
'use strict';

// Ensure UTF-8 output on Windows (Node >= 18)
if (process.platform === 'win32') {
  try {
    process.stdout.reconfigure({ encoding: 'utf8' });
    process.stderr.reconfigure({ encoding: 'utf8' });
  } catch (_) {
    // reconfigure not available — output may show garbled Unicode on legacy terminals
  }
}

require('../dist/index.js');
