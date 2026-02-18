type HashInstance = {
  outputLen?: number;
  destroyed?: boolean;
  finished?: boolean;
};

const isBytes = (value: unknown): value is Uint8Array =>
  value instanceof Uint8Array;

const anumber = (value: unknown): void => {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error("positive integer expected");
  }
};

const bool = (value: unknown): void => {
  if (typeof value !== "boolean") {
    throw new Error("boolean expected");
  }
};

const bytes = (value: unknown, ...lengths: number[]): void => {
  if (!isBytes(value)) {
    throw new Error("Uint8Array expected");
  }
  if (lengths.length > 0 && !lengths.includes(value.length)) {
    throw new Error(`Uint8Array expected of length ${lengths.join(" or ")}`);
  }
};

const hash = (value: unknown): void => {
  if (typeof value !== "function" || typeof (value as { create?: unknown }).create !== "function") {
    throw new Error("hash constructor expected");
  }
};

const exists = (instance: HashInstance, checkFinished = true): void => {
  if (instance.destroyed) {
    throw new Error("Hash instance has been destroyed");
  }
  if (checkFinished && instance.finished) {
    throw new Error("Hash#digest() has already been called");
  }
};

const output = (out: unknown, instance: HashInstance): void => {
  bytes(out);
  if (typeof instance.outputLen === "number" && (out as Uint8Array).length < instance.outputLen) {
    throw new Error("digestInto() expects output buffer of adequate length");
  }
};

const assertCompat = {
  number: anumber,
  bool,
  bytes,
  hash,
  exists,
  output,
};

export default assertCompat;
export { anumber as number, bool, bytes, hash, exists, output };
