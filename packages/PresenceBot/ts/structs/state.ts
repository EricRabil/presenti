import { Evented, AdapterState } from "remote-presence-utils";

export declare interface StateAdapter {
  on(event: 'updated', listener: (id: string) => any): this;
  on(event: string, listener: Function): this;

  emit(event: 'updated', id: string): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;
}

export abstract class StateAdapter extends Evented {
  /**
   * Adapter state
   */
  abstract readonly state: AdapterState;

  /**
   * Initialize the adapter
   */
  abstract run(): Promise<void>;

  /**
   * Returns the state for a given scope
   * @param scope scope to query state
   * @param newSocket whether this data is being pulled for initial socket connection
   */
  abstract data(scope: string, newSocket?: boolean): Promise<object>;
  abstract datas(): Promise<Record<string, object>>;
}