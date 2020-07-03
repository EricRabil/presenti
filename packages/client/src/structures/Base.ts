import { RemoteClient } from "../RemoteClient";

export abstract class Base {
  constructor(public client: RemoteClient) {

  }

  get ajax() {
    return this.client.ajax;
  }
}