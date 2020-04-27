import { ScopedPresenceAdapter } from "presenti/dist/structs/scoped-adapter";
import { Storage } from "../db/entities/Storage";

export abstract class StorageAdapter<T> extends ScopedPresenceAdapter {
  constructor(private identifier: string, private defaultStorage: any) {
    super();
  }

  async container(): Promise<Storage<T>> {
    let container = await Storage.findOne({ identifier: this.identifier });
    if (container) return container as Storage<T>;

    container = Storage.create({ identifier: this.identifier, data: this.defaultStorage || {} });
    container = await container.save();

    return container as Storage<T>;
  }
}