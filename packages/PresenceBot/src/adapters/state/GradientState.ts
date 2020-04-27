import { StateAdapter } from "../../structs/state";
import { AdapterState, PresenceStruct } from "remote-presence-utils";
import { SharedAdapterSupervisor } from "../../supervisors/AdapterSupervisor";
import { PresentiKit } from "../../utils/renderer";

export interface BackgroundData {
  color: string;
  transition: number;
}

function truthful<T extends undefined | null | boolean | Record<string, string | number | null | undefined | boolean>>(data: T, key: T extends {} ? keyof T : undefined) {
  return data === true || !!((typeof data === "object") && (data !== null) && (data as any)[key]);
}

function arrCmp<T>(arr1: T[], arr2: T[]) {
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
export class GradientState extends StateAdapter {
  state: AdapterState = AdapterState.READY;
  shades: {
    [scope: string]: string[]
  } = {};
  rotationMap: {
    [scope: string]: number;
  } = {};
  rotationTimers: {
    [scope: string]: ReturnType<typeof setInterval>;
  } = {};

  /**
   * How long between color rotations
   */
  static readonly TRANSITION_TIME = 16000;
  static readonly GREETINGS_TRANSITION = 2000;
  static readonly TRANSITION_GAP = 500;
  static shadeCache: Record<string, string[]> = {};

  constructor() {
    super();
  }

  async run() {
    this.state = AdapterState.RUNNING;
  }

  _wasPausedTable: Record<string, boolean> = {};
  /**
   * Returns the background state of a given scope
   * @param scope scope to query background state for
   */
  async data(scope: string, newSocket: boolean = false) {
    const { currentShade: color, same: sameShades, presencePaused } = (await this.shadesForScope(scope)) || {};

    if (!color) return {};

    // this will respawn the interval if it changed, or start the interval if this hasnt been watched yet.
    if (!sameShades) this.resetRotationTimer(scope);

    var transition =  (sameShades && !newSocket) ? GradientState.TRANSITION_TIME : GradientState.GREETINGS_TRANSITION;

    const wasPaused = this._wasPausedTable[scope];
    if (!presencePaused && wasPaused) {
      transition = GradientState.GREETINGS_TRANSITION;
    }
    this._wasPausedTable[scope] = !!presencePaused;

    return {
      gradient: {
        color,
        transition,
        paused: presencePaused
      }
    };
  }

  async datas() {
    const states = Promise.all(Object.keys(this.rotationMap).map(async scope => ({ scope, state: await this.data(scope) })));
    return (await states).reduce((acc, {scope, state}) => Object.assign(acc, {[scope]: state}), {});
  }

  /**
   * Returns data regarding the color shades for a given scope
   * @param scope scope to query for gradient shades
   */
  async shadesForScope(scope: string): Promise<{shades: string[], currentShade: string, same: boolean, presencePaused: boolean} | undefined> {
    const presence = await GradientState.gradientActivityForScope(scope);
    const shades = await GradientState.shadeForPresence(presence);
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

    return { shades, currentShade: this.shades[scope][this.rotationMap[scope]], same, presencePaused: !!presence.isPaused };
  }

  /**
   * Re-schedules a color rotation, cancelling the previous one if scheduled
   * @param scope scope to re-schedule a rotation for
   */
  private async resetRotationTimer(scope: string) {
    if (this.rotationTimers[scope]) clearTimeout(this.rotationTimers[scope]);
    this.runRotationTimer(scope);
  }

  /**
   * Sets a timeout at a configured rate. Upon execution, the current color will increment and an update event will be emitted
   * @param scope scope to emit the update for
   */
  private runRotationTimer(scope: string) {
    this.rotationTimers[scope] = setTimeout(() => {
      // end the interval loop if the rotationMap was cleared.
      if (typeof this.rotationMap[scope] !== "number") return;

      this.rotationMap[scope]++;
      // reset color loop if we are at the end
      if (this.rotationMap[scope] >= this.shades[scope].length) this.rotationMap[scope] = 0;

      this.emit('updated', scope);
      // re-schedule color rotation
      this.runRotationTimer(scope);
    }, GradientState.TRANSITION_TIME + GradientState.TRANSITION_GAP);
  }

  /**
   * Finds the presence with the highest-priority gradient selection
   * @param scope scope to look for presences within
   */
  static async gradientActivityForScope(scope: string) {
    const { presences } = await SharedAdapterSupervisor.scopedData(scope);
    const [ activity ] = presences
      .filter(activity => truthful(activity.gradient, "enabled"))
      .sort((a, b) => {
        const aPriority: number = typeof a.gradient === 'boolean' ? 0 : (a.gradient?.priority || 0)
        const bPriority: number = typeof b.gradient === 'boolean' ? 0 : (b.gradient?.priority || 0)
        return bPriority - aPriority
      });
    return activity;
  }

  /**
   * Returns an array of dominant colors from a presence's image
   * @param presence presence to pull colors for
   */
  static async shadeForPresence(presence: PresenceStruct | undefined) {
    // no-op if presence undefined or gradient disabled
    if (!presence || !presence.gradient) return;
    if (typeof presence.gradient === "object" && presence.gradient.enabled === false) return;

    const link = typeof presence.image === "string" ? presence.image : presence.image?.src;
    if (!link) return;

    return this.shadeCache[link] = (this.shadeCache[link] || await PresentiKit.generatePalette(link));
  }
}