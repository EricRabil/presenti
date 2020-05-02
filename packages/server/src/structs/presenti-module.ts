import { PresenceAdapter } from "@presenti/utils";
import { BaseEntity } from "typeorm";
import { NativePresenceAdapter } from "./adapter";
import RemoteClient from "@presenti/client";

type PresentiModuleStatic = {
  new(config: any, client: RemoteClient): PresenceAdapter;
}

export type BaseEntityStatic = {
  new(): BaseEntity;
}

export interface PresentiModuleClasses {
  Adapters: Record<string, PresentiModuleStatic>;
  Entities: Record<string, BaseEntityStatic>;
  Configs: Record<string, Record<string, any>>;
}

type Constructor = Function & { prototype: any }
function cmp(obj: any, clazz: Constructor): obj is PresentiModuleStatic {
  return (obj !== null) && Object.create(obj.prototype) instanceof clazz;
}

export function isPresentiModule(obj: any): obj is PresentiModuleClasses {
  return "Adapters" in obj && Object.values(obj.Adapters).every(obj => cmp(obj, PresenceAdapter) || cmp(obj, NativePresenceAdapter))
      && ("Entities" in obj ? Object.values(obj.Entities).every(obj => cmp(obj, BaseEntity)) : true);
}