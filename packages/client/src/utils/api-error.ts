import { ErrorResponse } from "@presenti/utils/src";

export class PresentiError extends Error {
  constructor(private response: ErrorResponse) {
    super(`Failed to complete request: ${response.code} ${response.error}`);
    this.name = "PresentiError";
  }

  get fields() {
    return this.response.fields;
  }

  get code() {
    return this.response.code;
  }

  get error() {
    return this.response.error;
  }
}