import { isPresentiModule, PresentiModuleClasses } from "..";
import { observeObject } from "@presenti/utils";

export interface ModuleLoaderOptions {
  config: any;
  saveConfig(): Promise<any>;
}

export async function loadModules({ config: CONFIG, saveConfig }: ModuleLoaderOptions): Promise<PresentiModuleClasses> {
  const moduleNames = CONFIG.modules;
  const rootModule: PresentiModuleClasses = {
    Adapters: {},
    Entities: {},
    Configs: {},
    Outputs: {},
    OAuth: []
  }

  if (Object.keys(moduleNames).length === 0) return rootModule;

  for (let [name, config] of Object.entries(moduleNames).filter(([name]) => !name.startsWith("_"))) {
    if (!config) continue;
    try {
      const rawModule = require(name);
      if (!isPresentiModule(rawModule)) continue;
      for (let [adapterName, adapterClass] of Object.entries(rawModule.Adapters || {})) {
        rootModule.Adapters[`${name}.${adapterName}`] = adapterClass;
      }
      for (let [entityName, entityClass] of Object.entries(rawModule.Entities || {})) {
        rootModule.Entities![`${name}.${entityName}`] = entityClass;
      }
      for (let [outputName, outputClass] of Object.entries(rawModule.Outputs || {})) {
        rootModule.Outputs[`${name}.${outputName}`] = outputClass;
      }

      rootModule.OAuth = rootModule.OAuth!.concat(rawModule.OAuth || [])

      if (typeof config === "object" && config !== null) rootModule.Configs[name] = observeObject(config, () => saveConfig());
    } catch(e) {
      console.debug(`Skipping module ${name} with error`, e);
      continue;
    }
  }

  return rootModule;
}