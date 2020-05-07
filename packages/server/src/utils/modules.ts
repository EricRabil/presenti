import { CONFIG, saveConfig } from "./config";
import { isPresentiModule, PresentiModuleClasses } from "@presenti/modules";
import { observeObject } from "./object";

export async function loadModules(): Promise<PresentiModuleClasses> {
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

      if (typeof config === "object") rootModule.Configs[name] = observeObject(config, () => saveConfig());
    } catch(e) {
      console.debug(`Skipping module ${name} with error`, e);
      continue;
    }
  }

  return rootModule;
}