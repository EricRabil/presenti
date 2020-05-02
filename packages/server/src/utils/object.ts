import v8 from "v8";

/** Creates an object with a default value for all properties */
export function blackHat<T, U = any>(defaultValue: T): Record<keyof U, T> {
  const base = v8.serialize(defaultValue);
  return new Proxy({} as any as Record<keyof U, T>, {
    get<U extends Record<string, T>>(target: U, prop: keyof U, receiver: Function) {
      if (!target[prop]) Reflect.set(target, prop, v8.deserialize(base));

      return Reflect.get(target, prop, receiver);
    }
  });
}

export function observeObject<T extends object>(object: T, updated: () => any): T {
  return new Proxy(object, {
    get(target: T, prop: keyof T, receiver: Function) {
      if (target[prop] === null) return null;
      if (typeof target[prop] === "object") return observeObject(target[prop] as unknown as object, updated);
      return Reflect.get(target as any, prop, receiver);
    },
    set<U extends keyof T>(target: T, prop: U, value: T[U], receiver: Function) {
      const result = Reflect.set(target as any, prop, value, receiver);
      updated();
      return result;
    }
  });
}