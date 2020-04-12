"use strict";
if (typeof WebSocket === 'undefined' && global) {
    let wsLib;
    try {
        wsLib = require('@clusterws/cws').WebSocket;
    }
    catch {
        wsLib = require('ws');
    }
    global.WebSocket = wsLib;
}
