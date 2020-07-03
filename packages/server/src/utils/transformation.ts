import { PresenceStruct, PresenceImage, PresenceText, isPresentiImage, isPresentiText, TransformationType, DynamicTransformation, PropertyTransformation, PresenceTransformation } from "@presenti/utils";
import v8 from "v8";

function isDynamicTransformation(obj: any): obj is DynamicTransformation {
  return typeof obj["type"] === "string"
    && (obj["type"] === TransformationType.DELETE ? true : typeof obj["value"] === "string")
    && typeof obj["match"] === "string"
    && typeof obj["property"] === "undefined";
}

function isPropertyTransformation(obj: any): obj is PropertyTransformation {
  return typeof obj["type"] === "string"
    && typeof obj["property"] === "string"
    && (typeof obj["value"] === "string" || typeof obj["value"] === "undefined")
    && (typeof obj["match"] === "string" || typeof obj["match"] === "undefined");
}

export function isPresenceTransformation(obj: any): obj is PresenceTransformation {
  if (typeof obj !== "object" || obj === null) return false;
  return isDynamicTransformation(obj) || isPropertyTransformation(obj);
}

/**
 * Applies a transformation to a text-based object, which can either be of type "string", "object" with a property that has a value of type "string", or null
 * @param object the object/string/null to apply the transform to
 * @param property the property to apply to the transform to if the value is object
 * @param transformation transformation to apply
 */
function applyTransformationToTextBasedObject<T extends Record<string, any>>(object: T | string | null, property: keyof T, transformation: PresenceTransformation): T | string | null {
  switch (transformation.type) {
    case TransformationType.REPLACE:
      if (transformation.value) {
        if (typeof object === "string") object = object.replace(transformation.match || object, transformation.value);
        else if (object !== null) object[property] = object[property].replace(transformation.match || object[property], transformation.value);
      }
      break;
    case TransformationType.SET:
      if (transformation.value) {
        if (typeof object === "string") object = transformation.value;
        else if (object !== null) object[property] = transformation.value as any;
      }
      break;
    case TransformationType.DELETE:
      object = null;
      break;
  }
  return object;
}

/**
 * Applies a transformation rule to a Presenti image
 * @param image image object
 * @param transformation transformation rule
 */
function applyTransformationToImage(image: PresenceImage, transformation: PresenceTransformation): PresenceImage {
  return applyTransformationToTextBasedObject(image, "src", transformation);
}

/**
 * Applies a transformation rule to a Presenti text object
 * @param text text object
 * @param transformation transformation rule
 */
function applyTransformationToText(text: PresenceText, transformation: PresenceTransformation): PresenceText {
  return applyTransformationToTextBasedObject(text, "text", transformation);
}

function createMatcher(match: string) {
  return function <T extends keyof PresenceStruct>(key: T, value: PresenceStruct[T]) {
    if (typeof value === "string") return !!value.match(match);
    else if (isPresentiImage(value)) return !!value?.src.match(match);
    else if (isPresentiText(value)) return !!value?.text.match(match);
    else return false;
  }
}

/**
 * Creates a 
 * @param matchKey 
 * @param match 
 */
function createKeyedMatcher(matchKey: string, match: string) {
  const matcher = createMatcher(match);
  return function <T extends keyof PresenceStruct>(key: T, value: PresenceStruct[T]) {
    if (matchKey !== key) return false;
    return matcher(key, value);
  }
}

/**
 * Applies a transformation rule to a presence structure
 * @param presence presence structure
 * @param transformation transformation rule
 */
function applyTransformation(presence: PresenceStruct, transformation: PresenceTransformation) {
  if (transformation.property && !presence[transformation.property]) return presence;
  const matcher = isDynamicTransformation(transformation) ? createMatcher(transformation.match) : isPropertyTransformation(transformation) ? createKeyedMatcher(transformation.property, transformation.match || '') : (key, value) => false;
  const transformTargets = Object.entries(presence).filter(([key, value]) => matcher(key as keyof PresenceStruct, value));
  for (let [key] of transformTargets) {
    if (typeof presence[key] === 'string') {
      switch (transformation.type) {
        case TransformationType.REPLACE:
          if (transformation.match && transformation.value) {
            presence[key] = presence[key].replace(transformation.match, transformation.value);
          }
          break;
        case TransformationType.SET:
          if (transformation.value) {
            presence[key] = transformation.value;
          }
          break;
        case TransformationType.DELETE:
          presence[key] = null;
          break;
      }
      continue;
    }

    if (isPresentiImage(presence[key])) presence[key] = applyTransformationToImage(presence[key], transformation);
    else if (isPresentiText(presence[key])) presence[key] = applyTransformationToText(presence[key], transformation);
  }
  return presence;
}

/**
 * Applies a series of transformations to all provided presences and returns them
 * @param presences presences to transform
 * @param transformations transformation rules to apply
 */
export function applyTransformations(presence: PresenceStruct, transformations: PresenceTransformation[]) {
  /** linearly apply transformations from first to last */
  return transformations.reduce((presence, transformation) => (
    applyTransformation(presence, transformation)
    /** use a deep clone of the presence to not mutate the original data */
  ), v8.deserialize(v8.serialize(presence)) as PresenceStruct)
}