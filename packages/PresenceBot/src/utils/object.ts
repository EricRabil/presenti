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