"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const got_1 = __importDefault(require("got"));
const splashy_1 = __importDefault(require("splashy"));
/** Helper functions when creating Presenti-compatible structures */
var PresentiKit;
(function (PresentiKit) {
    /**
     * Generates a color palette for the given image URL
     * @param imageURL image URL to generate for
     */
    async function generatePalette(imageURL) {
        const body = await got_1.default(imageURL).buffer();
        const palette = await splashy_1.default(body);
        return palette;
    }
    PresentiKit.generatePalette = generatePalette;
})(PresentiKit = exports.PresentiKit || (exports.PresentiKit = {}));
