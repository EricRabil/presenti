"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function notFound(res) {
    res.writeStatus(404).render('error', { error: "The resource requested could not be found." });
}
exports.notFound = notFound;
function notFoundAPI(res) {
    res.writeStatus(404).json({ error: "Unknown endpoint." });
}
exports.notFoundAPI = notFoundAPI;
