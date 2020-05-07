export * from "./object";
export * from "./presence-magic";
export * from "./renderer";
export * from "./security";
export * from "./shell";
export * from "./logging";
export * from "./config";

export function debounce (fn: Function, wait = 1) {
  let timeout
  return function (...args) {
		if (timeout) return;
    timeout = setTimeout(() => {fn.call(null, ...args); timeout = null;}, wait)
  }
}