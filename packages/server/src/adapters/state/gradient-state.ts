import { PresenceProvider, StateAdapter } from "@presenti/modules";
import { AdapterState, Events, PresenceStruct } from "@presenti/utils";
import { EventBus } from "../../event-bus";
import got from "got";
import splashy from "splashy";

/** Helper functions when creating Presenti-compatible structures */
namespace GradientKit {
  /**
   * Returns the base64 components of a string, or null if it is not a base64 string
   * @param data data to analyze
   */
  function testBase64(data: string) {
    const reg = /^data:image\/([\w+]+);base64,([\s\S]+)/;
    const match = data.match(reg);
  
    if (!match) {
      return null;
    }
  
    return Buffer.from(match[2], "base64");
  }

  /**
   * Generates a color palette for the given image URL
   * @param imageURL image URL to generate for
   */
  export async function generatePalette(imageURL: string): Promise<string[]> {
    const body = testBase64(imageURL) || await got(imageURL).buffer();
    const palette = await splashy(body);
    return palette;
  }
}

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

  constructor(public readonly provider: PresenceProvider) {
    super();

    EventBus.on(Events.PRESENCE_UPDATE, ({ scope }) => {
      this.emit("updated", scope);
    });
  }

  async run() {
    this.state = AdapterState.RUNNING;
  }

  _wasManagingTable: Record<string, boolean> = {};
  /**
   * Returns the background state of a given scope
   * @param scope scope to query background state for
   */
  async data(scope: string, newSocket: boolean = false) {
    const { currentShade: color, same: sameShades } = (await this.shadesForScope(scope)) || {};

    if (!color) {
      if (this._wasManagingTable[scope]) {
        this._wasManagingTable[scope] = false;
        return {
          gradient: {
            color: null,
            transition: GradientState.GREETINGS_TRANSITION,
            paused: true
          }
        }
      }

      return {};
    }

    this._wasManagingTable[scope] = true;

    // this will restart the interval if it changed, or start the interval if this hasnt been watched yet.
    if (!sameShades) this.resetRotationTimer(scope);

    var transition =  (sameShades && !newSocket) ? GradientState.TRANSITION_TIME : GradientState.GREETINGS_TRANSITION;

    return {
      gradient: {
        color,
        transition
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
  async shadesForScope(scope: string): Promise<{shades: string[], currentShade: string, same: boolean} | undefined> {
    const presence = await this.provider.presence(scope).then(presences => presences.find(presence => truthful(presence?.gradient, "enabled") && !presence.isPaused));
    if (!presence) return;

    const shades = await GradientState.shadeForPresence(presence);
    if (!shades) {
      this.shades[scope] = undefined!;
      this.rotationMap[scope] = undefined!;
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
   * Returns an array of dominant colors from a presence's image
   * @param presence presence to pull colors for
   */
  static async shadeForPresence(presence: PresenceStruct | undefined) {
    // no-op if presence undefined or gradient disabled
    if (!presence || !presence.gradient) return;
    if (typeof presence.gradient === "object" && presence.gradient.enabled === false) return;

    const link = typeof presence.image === "string" ? presence.image : presence.image?.src;
    if (!link) return;

    return this.shadeCache[link] = (this.shadeCache[link] || await GradientKit.generatePalette(link));
  }
}