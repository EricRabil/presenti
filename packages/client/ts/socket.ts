if (typeof WebSocket === 'undefined' && global) {
  let wsLib;
  try {
    wsLib = require('@clusterws/cws').WebSocket;
  } catch {
    wsLib = require('ws');
  }
  (global as any).WebSocket = wsLib;
}

if (typeof fetch === 'undefined' && global) {
  (global as any).fetch = require("node-fetch");
}