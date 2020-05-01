import { PresenceStruct, PresenceImage, PresenceText, isPresentiImage, isPresentiText } from "@presenti/utils";

export enum TransformationType {
  SET = "set", REPLACE = "replace", DELETE = "delete"
}

export interface PresenceTransformation {
  type: TransformationType;
  value?: string;
  property?: keyof PresenceStruct;
  match?: string;
}

interface DynamicTransformation extends PresenceTransformation {
  type: TransformationType;
  value: string;
  match: string;
  property: undefined;
}

interface PropertyTransformation extends PresenceTransformation {
  type: TransformationType;
  property: keyof PresenceStruct;
  value?: string;
  match?: string;
}

function isTransformation(obj: any): obj is PresenceTransformation {
  return typeof obj["type"] === "string"
      && (typeof obj["value"] === "string" || typeof obj["value"] === "undefined")
      && (typeof obj["property"] === "string" || typeof obj["property"] === "undefined")
      && (typeof obj["match"] === "string" || typeof obj["match"] === "undefined");
}

function isDynamicTransformation(obj: any): obj is DynamicTransformation {
  return typeof obj["type"] === "string"
      && typeof obj["value"] === "string"
      && typeof obj["match"] === "string"
      && typeof obj["property"] === "undefined";
}

function isPropertyTransformation(obj: any): obj is PropertyTransformation {
  return typeof obj["type"] === "string"
      && typeof obj["property"] === "string"
      && (typeof obj["value"] === "string" || typeof obj["value"] === "undefined")
      && (typeof obj["match"] === "string" || typeof obj["match"] === "undefined");
}

/**
 * Applies a transformation rule to a Presenti image
 * @param image image object
 * @param transformation transformation rule
 */
function applyTransformationToImage(image: PresenceImage, transformation: PresenceTransformation): PresenceImage {
  switch (transformation.type) {
    case TransformationType.REPLACE:
      if (transformation.match && transformation.value) {
        if (typeof image === "string") image = image.replace(transformation.match, transformation.value);
        else if (image !== null) image.src = image.src.replace(transformation.match, transformation.value);
      }
      break;
    case TransformationType.SET:
      if (transformation.value) {
        if (typeof image === "string") image = transformation.value;
        else if (image !== null) image.src = transformation.value;
      }
      break;
    case TransformationType.DELETE:
      image = null;
      break;
  }
  return image;
}

/**
 * Applies a transformation rule to a Presenti text object
 * @param text text object
 * @param transformation transformation rule
 */
function applyTransformationToText(text: PresenceText, transformation: PresenceTransformation): PresenceText {
  switch (transformation.type) {
    case TransformationType.REPLACE:
      if (transformation.match && transformation.value) {
        if (typeof text === "string") text = text.replace(transformation.match, transformation.value);
        else if (text !== null) text.text = text.text.replace(transformation.match, transformation.value);
      }
      break;
    case TransformationType.SET:
      if (transformation.value) {
        if (typeof text === "string") text = transformation.value;
        else if (text !== null) text.text = transformation.value;
      }
      break;
    case TransformationType.DELETE:
      text = null;
      break;
  }
  return text;
}

function createMatcher(match: string) {
  return function<T extends keyof PresenceStruct>(key: T, value: PresenceStruct[T]) {
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
  return function<T extends keyof PresenceStruct>(key: T, value: PresenceStruct[T]) {
    if (matchKey !== key) return false;
    return matcher(key, value);
  }
}

/**
 * Applies a transformation rule to a presence structure
 * @param presence presence structure
 * @param transformation transformation rule
 */
export function applyTransformation(presence: PresenceStruct, transformation: PresenceTransformation) {
  if (transformation.property && !presence[transformation.property]) return presence;
  const matcher = isDynamicTransformation(transformation) ? createMatcher(transformation.match) : isPropertyTransformation(transformation) ? createKeyedMatcher(transformation.property, transformation.match || '') : (key, value) => false;
  const transformTargets = Object.entries(presence).filter(([key, value]) => matcher(key as keyof PresenceStruct, value));
  for (let [key] of transformTargets) {
    if (isPresentiImage(presence[key])) presence[key] = applyTransformationToImage(presence[key], transformation);
    else if (isPresentiText(presence[key])) presence[key] = applyTransformationToText(presence[key], transformation);
    else if (typeof presence[key] !== "string") continue;
    
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
  }
  return presence;
}