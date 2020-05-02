if (!process.env.VUE_APP_EXISTS) {
  if (globalThis?.process?.release?.name) {
    if (typeof WebSocket === 'undefined') {
      let wsLib;
      try {
        wsLib = require('@clusterws/cws').WebSocket;
      } catch {
        wsLib = require('ws');
      }
      (global as any).WebSocket = wsLib;
    }
    
    if (typeof fetch === 'undefined') {
      (global as any).fetch = require("node-fetch");
    }
  }
}