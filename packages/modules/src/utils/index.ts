import { Module } from "../structs";
import { OAuthModuleDefinition } from "@presenti/utils";

export * from "./listener-storage";

export function oauthDefinitionsForModules(modules: Module[]) {
    return modules.map(module => module.constructor as Function & { OAuth: OAuthModuleDefinition[] })
        .map(({ OAuth }) => OAuth)
        .filter(OAuth => !!OAuth)
        .flatMap(OAuth => OAuth);
}