"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const state_1 = require("../structs/state");
const remote_presence_utils_1 = require("remote-presence-utils");
const AdapterSupervisor_1 = require("../supervisors/AdapterSupervisor");
const utils_1 = require("../utils");
function truthful(data, key) {
    return data === true || !!((typeof data === "object") && (data !== null) && data[key]);
}
function arrCmp(arr1, arr2) {
    return (arr1.length === arr2.length) && (arr1.every((elm, idx) => arr2.indexOf(elm) === idx));
}
/**
 * This extension adds a color-rotation feature, implementing the "gradient" property in PresenceStructs
 *
 * It filters presences that opt-in to the gradient API, and then selects the presence with the highest-priority gradient
 *
 * There is typically an array of five colors, and it will be rotated at a pre-configured interval.
 * When the color shades change, an update is immediately sent with the first color from the new shade array, at a shorter transition time.
 */
class BackgroundState extends state_1.StateAdapter {
    constructor() {
        super();
        this.state = remote_presence_utils_1.AdapterState.READY;
        this.shades = {};
        this.rotationMap = {};
        this.states = {};
        this.rotationTimers = {};
    }
    async run() {
        this.state = remote_presence_utils_1.AdapterState.RUNNING;
    }
    /**
     * Returns the background state of a given scope
     * @param scope scope to query background state for
     */
    async data(scope, newSocket = false) {
        const { currentShade: color, same: sameShades } = (await this.shadesForScope(scope)) || {};
        if (!color)
            return {};
        // this will respawn the interval if it changed, or start the interval if this hasnt been watched yet.
        if (!sameShades)
            this.resetRotationTimer(scope);
        return {
            gradient: {
                color,
                transition: (sameShades && !newSocket) ? BackgroundState.TRANSITION_TIME : 2000
            }
        };
    }
    /**
     * Returns data regarding the color shades for a given scope
     * @param scope scope to query for gradient shades
     */
    async shadesForScope(scope) {
        const shades = await BackgroundState.shadeForPresence(await BackgroundState.gradientActivityForScope(scope));
        if (!shades) {
            delete this.shades[scope];
            delete this.rotationMap[scope];
            return;
        }
        const oldShades = this.shades[scope];
        var same = oldShades && shades && arrCmp(oldShades, shades);
        if (!same) {
            this.shades[scope] = shades;
            this.rotationMap[scope] = 0;
        }
        return { shades, currentShade: this.shades[scope][this.rotationMap[scope]], same };
    }
    /**
     * Re-schedules a color rotation, cancelling the previous one if scheduled
     * @param scope scope to re-schedule a rotation for
     */
    async resetRotationTimer(scope) {
        if (this.rotationTimers[scope])
            clearTimeout(this.rotationTimers[scope]);
        this.runRotationTimer(scope);
    }
    /**
     * Sets a timeout at a configured rate. Upon execution, the current color will increment and an update event will be emitted
     * @param scope scope to emit the update for
     */
    runRotationTimer(scope) {
        this.rotationTimers[scope] = setTimeout(() => {
            // end the interval loop if the rotationMap was cleared.
            if (typeof this.rotationMap[scope] !== "number")
                return;
            this.rotationMap[scope]++;
            // reset color loop if we are at the end
            if (this.rotationMap[scope] >= this.shades[scope].length)
                this.rotationMap[scope] = 0;
            this.emit('updated', scope);
            // re-schedule color rotation
            this.runRotationTimer(scope);
        }, BackgroundState.TRANSITION_TIME);
    }
    /**
     * Finds the presence with the highest-priority gradient selection
     * @param scope scope to look for presences within
     */
    static async gradientActivityForScope(scope) {
        const { presences } = await AdapterSupervisor_1.SharedAdapterSupervisor.scopedData(scope);
        const [activity] = presences
            .filter(activity => truthful(activity.gradient, "enabled"))
            .sort((a, b) => {
            var _a, _b;
            const aPriority = typeof a.gradient === 'boolean' ? 0 : (((_a = a.gradient) === null || _a === void 0 ? void 0 : _a.priority) || 0);
            const bPriority = typeof b.gradient === 'boolean' ? 0 : (((_b = b.gradient) === null || _b === void 0 ? void 0 : _b.priority) || 0);
            return bPriority - aPriority;
        });
        return activity;
    }
    /**
     * Returns an array of dominant colors from a presence's image
     * @param presence presence to pull colors for
     */
    static async shadeForPresence(presence) {
        var _a;
        // no-op if presence undefined or gradient disabled
        if (!presence || !presence.gradient)
            return;
        if (typeof presence.gradient === "object" && presence.gradient.enabled === false)
            return;
        const link = typeof presence.image === "string" ? presence.image : (_a = presence.image) === null || _a === void 0 ? void 0 : _a.src;
        if (!link)
            return;
        return this.shadeCache[link] = (this.shadeCache[link] || await utils_1.PresentiKit.generatePalette(link));
    }
}
exports.BackgroundState = BackgroundState;
/**
 * How long between color rotations
 */
BackgroundState.TRANSITION_TIME = 5000;
BackgroundState.shadeCache = {};
