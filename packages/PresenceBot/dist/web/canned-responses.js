"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Renders a 404 error page */
function notFound(res) {
    res.writeStatus(404).render('error', { error: "The resource requested could not be found." });
}
exports.notFound = notFound;
/** Returns a 404 error response */
function notFoundAPI(res) {
    res.writeStatus(404).json({ error: "Unknown endpoint." });
}
exports.notFoundAPI = notFoundAPI;
