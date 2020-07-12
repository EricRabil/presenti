export function removeEmptyFields<T extends object>(object: T): Partial<T> {
  object = Object.assign({}, object);
  Object.keys(object).forEach(key => (object[key] === undefined || (typeof object[key] === "string" && object[key].length === 0)) && delete object[key]);
  return object;
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