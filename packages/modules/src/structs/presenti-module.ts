import { PresenceAdapter, PresentiAPIClient, OAUTH_PLATFORM } from "@presenti/utils";
import { BaseEntity } from "typeorm";
import { NativePresenceAdapter } from "./adapters/adapter";
import { StateAdapter } from "./adapters/state-adapter";
import { PresenceOutput, PresenceProvider } from "./output";
import { TemplatedApp } from "uWebSockets.js";

type PresentiModuleStatic = {
  new(config: any, client: PresentiAPIClient): PresenceAdapter;
}

type PresentiOutputStatic = {
  new(provider: PresenceProvider, app: TemplatedApp, config: any): PresenceOutput;
}

export type BaseEntityStatic = {
  new(): BaseEntity;
}

export interface PresentiModuleClasses {
  Adapters: Record<string, PresentiModuleStatic>;
  Entities: Record<string, BaseEntityStatic>;
  Outputs: Record<string, PresentiOutputStatic>;
  Configs: Record<string, Record<string, any>>;
  OAuth: {
    asset: string;
    name: string;
    key: OAUTH_PLATFORM;
  }[];
}

type Constructor = Function & { prototype: any }
function cmp(obj: any, clazz: Constructor): obj is PresentiModuleStatic {
  return (obj !== null) && Object.create(obj.prototype) instanceof clazz;
}

export function isPresentiModule(obj: any): obj is PresentiModuleClasses {
  return ("Adapters" in obj ? Object.values(obj.Adapters).every(obj => cmp(obj, PresenceAdapter) || cmp(obj, NativePresenceAdapter) || cmp(obj, StateAdapter)) : true)
      && ("Entities" in obj ? Object.values(obj.Entities).every(obj => cmp(obj, BaseEntity)) : true)
      && ("Outputs" in obj ? Object.values(obj.Outputs).every(obj => cmp(obj, PresenceOutput)) : true)
      && ("OAuth" in obj ? typeof obj["OAuth"] === "object" ? Array.isArray(obj["OAuth"]) : false : true);
}