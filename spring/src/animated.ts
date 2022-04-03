import { defineHidden, is } from "./utils";

const $node: any = Symbol.for("Animated:node");

export const isAnimated = <T = any,>(value: any): value is Animated<T> =>
  !!value && value[$node] === value;

/** Get the owner's `Animated` node. */
export const getAnimated = <T = any,>(owner: any): Animated<T> | undefined =>
  owner && owner[$node];

/** Set the owner's `Animated` node. */
export const setAnimated = (owner: any, node: Animated) =>
  defineHidden(owner, $node, node);

/** Get every `AnimatedValue` in the owner's `Animated` node. */
export const getPayload = (owner: any): AnimatedValue[] | undefined =>
  owner && owner[$node] && owner[$node].getPayload();

export abstract class Animated<T = any> {
  /** The cache of animated values */
  protected payload?: Payload;

  constructor() {
    // This makes "isAnimated" return true.
    setAnimated(this, this);
  }

  /** Get the current value. Pass `true` for only animated values. */
  abstract getValue(animated?: boolean): T;

  /** Set the current value. Returns `true` if the value changed. */
  abstract setValue(value: T): boolean | void;

  /** Reset any animation state. */
  abstract reset(goal?: T): void;

  /** Get every `AnimatedValue` used by this node. */
  getPayload(): Payload {
    return this.payload || [];
  }
}

export type Payload = readonly AnimatedValue[];
/** An animated number or a native attribute value */
export class AnimatedValue<T = any> extends Animated {
  done = true;
  elapsedTime!: number;
  lastPosition!: number;
  lastVelocity?: number | null;
  v0?: number | null;
  durationProgress = 0;

  constructor(protected _value: T) {
    super();
    if (is.num(this._value)) {
      this.lastPosition = this._value;
    }
  }

  /** @internal */
  static create(value: any) {
    return new AnimatedValue(value);
  }

  getPayload(): Payload {
    return [this];
  }

  getValue() {
    return this._value;
  }

  setValue(value: T, step?: number) {
    if (is.num(value)) {
      this.lastPosition = value;
      if (step) {
        value = (Math.round(value / step) * step) as any;
        if (this.done) {
          this.lastPosition = value as any;
        }
      }
    }
    if (this._value === value) {
      return false;
    }
    this._value = value;
    return true;
  }

  reset() {
    const { done } = this;
    this.done = false;
    if (is.num(this._value)) {
      this.elapsedTime = 0;
      this.durationProgress = 0;
      this.lastPosition = this._value;
      if (done) this.lastVelocity = null;
      this.v0 = null;
    }
  }
}
